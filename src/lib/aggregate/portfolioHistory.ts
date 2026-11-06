import type { InvestmentTransaction } from "../sheets/types";
import { priceOnOrBefore, type PricePoint } from "../prices/history";
import { holdingsAt, totalInInr } from "./investments";

/** The saved closes and what is needed to read them: which ticker prices a holding, and USD to INR. */
export interface PriceBook {
  /** Closes by ticker, oldest first (lib/prices/series.ts). */
  closes: ReadonlyMap<string, PricePoint[]>;
  /** The ticker that prices a holding, from its Instruments row, or undefined when it has none. */
  tickerFor: (symbol: string, market: "IND" | "US") => string | undefined;
  /** USD to INR by day, oldest first. */
  usdInr: PricePoint[];
}

export interface DayPoint {
  /** An ISO day. */
  date: string;
  /** What he held that day was worth, in rupees. A holding with no price that day counts at its cost. */
  valueInr: number;
  /** What the shares held cost him, in rupees (the weighted-average cost, fees in). */
  costInr: number;
  /** Money put in that day, less money taken out, in rupees (a buy is in, a sell is out). */
  netFlowInr: number;
  /** Symbols held that day with no price to value them, so counted at cost. */
  unpriced: string[];
  /** Symbols valued at a close more than `STALE_AFTER_DAYS` old: a delisted or untracked ticker, or a source that stopped. They still count, at that old close. */
  stale: string[];
}

/** A weekend and a holiday or two is normal; more than a week without a close isn't. */
export const STALE_AFTER_DAYS = 7;

const dayMs = 86_400_000;
const addDay = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) + dayMs).toISOString().slice(0, 10);

/**
 * The portfolio day by day from `from` to `to`, every calendar day: what was held (`holdingsAt`),
 * valued at the latest close on or before the day, a US holding at that day's USD to INR. A
 * weekend carries Friday's close, so the series has no gaps. A holding that has no price yet, or
 * no Instruments row, is counted at its cost and listed in `unpriced`: the page says so instead of
 * showing it as worth nothing. Never a price from after the day.
 */
export function portfolioHistory(trades: InvestmentTransaction[], book: PriceBook, from: string, to: string): DayPoint[] {
  const flowByDay = new Map<string, number>();
  for (const t of trades) flowByDay.set(t.tradeDate, (flowByDay.get(t.tradeDate) ?? 0) + (t.tradeType === "Buy" ? totalInInr(t) : -totalInInr(t)));

  const points: DayPoint[] = [];
  for (let day = from; day <= to; day = addDay(day)) {
    const fx = priceOnOrBefore(book.usdInr, day)?.close;
    let valueInr = 0;
    let costInr = 0;
    const unpriced: string[] = [];
    const stale: string[] = [];
    for (const holding of holdingsAt(trades, day)) {
      costInr += holding.totalCostInr;
      const ticker = book.tickerFor(holding.symbol, holding.market);
      const price = ticker ? priceOnOrBefore(book.closes.get(ticker) ?? [], day) : null;
      if (!price || (holding.market === "US" && fx === undefined)) {
        valueInr += holding.totalCostInr;
        unpriced.push(holding.symbol);
        continue;
      }
      if (price.ageDays > STALE_AFTER_DAYS) stale.push(holding.symbol);
      valueInr += holding.quantity * price.close * (holding.market === "US" ? fx! : 1);
    }
    points.push({ date: day, valueInr, costInr, netFlowInr: flowByDay.get(day) ?? 0, unpriced, stale });
  }
  return points;
}

export interface Returns {
  /** The time-weighted index, 1 on the first day with something held. Same length as the points. */
  index: number[];
  /** The whole period's time-weighted return as a fraction: index at the end less 1. */
  totalReturn: number | null;
  /** The same as a yearly rate, or null under a year of days (too early). */
  yearlyRate: number | null;
  /** The deepest peak-to-trough fall of the index, as a positive fraction (0.25 is a 25% fall), with its days. */
  deepestFall: { fraction: number; from: string; to: string } | null;
  days: number;
  /** The first day something was held: the day the index starts, and the day to measure an index from so the two cover the same days. Null when nothing was ever held. */
  startDate: string | null;
}

/**
 * The time-weighted return: each day's return is the day's change in value less what was put in
 * or taken out that day, over yesterday's value, and the days are chained. So money added later
 * can't flatter the return or hide a fall. A day that follows a day with nothing held carries the
 * index on as it was (nothing was at risk in between), starting at 1 on the first day anything is held. A trade's money is taken to arrive at the end of its day, so the day's return
 * is measured on what was held before it.
 */
export function timeWeightedReturns(points: DayPoint[]): Returns {
  const index: number[] = [];
  let level = 1;
  let startedAt = -1;
  for (let i = 0; i < points.length; i++) {
    const prev = i > 0 ? points[i - 1].valueInr : 0;
    const today = points[i];
    if (prev > 0) level *= (today.valueInr - today.netFlowInr) / prev;
    else if (today.valueInr > 0 && startedAt < 0) startedAt = i;
    index.push(startedAt < 0 ? 1 : level);
  }
  const days = startedAt < 0 ? 0 : points.length - 1 - startedAt;
  if (startedAt < 0) return { index, totalReturn: null, yearlyRate: null, deepestFall: null, days: 0, startDate: null };

  const base = index[startedAt];
  const totalReturn = index[points.length - 1] / base - 1;
  const yearlyRate = days >= 365 ? Math.pow(index[points.length - 1] / base, 365 / days) - 1 : null;

  let peak = index[startedAt];
  let peakDay = points[startedAt].date;
  let fall: { fraction: number; from: string; to: string } | null = null;
  for (let i = startedAt; i < points.length; i++) {
    if (index[i] > peak) {
      peak = index[i];
      peakDay = points[i].date;
    }
    const drop = (peak - index[i]) / peak;
    if (drop > 0 && (!fall || drop > fall.fraction)) fall = { fraction: drop, from: peakDay, to: points[i].date };
  }
  return { index, totalReturn, yearlyRate, deepestFall: fall, days, startDate: points[startedAt].date };
}

/**
 * An index's yearly rate over the same days as the portfolio (`from` to `to`), from its closes: the
 * last close on or before each end, as (end ÷ start) over the years between. `inRupees` converts a
 * dollar index (the S&P 500) at each end's USD to INR, so it is the S&P in rupees. Null when an end
 * has no close or the span is under a year.
 */
export function indexYearlyRate(closes: PricePoint[], from: string, to: string, inRupees?: PricePoint[]): number | null {
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / dayMs;
  if (days < 365) return null;
  const start = priceOnOrBefore(closes, from);
  const end = priceOnOrBefore(closes, to);
  if (!start || !end) return null;
  let startValue = start.close;
  let endValue = end.close;
  if (inRupees) {
    const fxStart = priceOnOrBefore(inRupees, from);
    const fxEnd = priceOnOrBefore(inRupees, to);
    if (!fxStart || !fxEnd) return null;
    startValue *= fxStart.close;
    endValue *= fxEnd.close;
  }
  return Math.pow(endValue / startValue, 365 / days) - 1;
}

/** Ahead (positive) or behind (negative) an index, in points of yearly return: the portfolio's less the index's. Null when either is. */
export function gapToIndex(portfolioYearly: number | null, indexYearly: number | null): number | null {
  return portfolioYearly === null || indexYearly === null ? null : portfolioYearly - indexYearly;
}
