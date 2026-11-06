import type { Instrument, InvestmentTransaction, PriceSnapshot, PriceSource } from "../sheets/types";
import { sourceFor, type PricePoint, type YahooRange } from "./history";

/** What the daily refresh is asked to keep: a ticker, where it comes from and from which day it is wanted. */
export interface TickerJob {
  ticker: string;
  source: PriceSource;
  currency: "INR" | "USD";
  /** The first day wanted (an ISO day). Earlier saved days are never touched. */
  from: string;
}

/** The two indices the Race and the gap to the index use, and USD to INR, kept beside his holdings. */
export const USD_INR_TICKER = "USDINR";
const BENCHMARKS: { ticker: string; currency: "INR" | "USD" }[] = [
  { ticker: "^NSEI", currency: "INR" },
  { ticker: "^GSPC", currency: "USD" },
];

/** A week before the first trade, so the first day has a price on or before it even after a weekend or holiday. */
const LEAD_DAYS = 7;
/** An instrument he has never traded is kept for a year back. */
const UNTRADED_DAYS = 365;

function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Every ticker to keep up to date: each instrument (from a week before its first trade), the two
 * indices and USD to INR (from a week before his first trade of all). An instrument's source is
 * Yahoo, or AMFI when its ticker is an all-digit scheme code.
 */
export function refreshJobs(instruments: Instrument[], trades: InvestmentTransaction[], today: string): TickerJob[] {
  const firstTradeBySymbol = new Map<string, string>();
  let firstTrade: string | null = null;
  for (const t of trades) {
    const key = `${t.market}:${t.symbol}`;
    const known = firstTradeBySymbol.get(key);
    if (known === undefined || t.tradeDate < known) firstTradeBySymbol.set(key, t.tradeDate);
    if (firstTrade === null || t.tradeDate < firstTrade) firstTrade = t.tradeDate;
  }
  const overall = addDays(firstTrade ?? addDays(today, -UNTRADED_DAYS), -LEAD_DAYS);
  const jobs: TickerJob[] = [];
  for (const instrument of instruments) {
    const first = firstTradeBySymbol.get(`${instrument.market}:${instrument.symbol}`);
    jobs.push({
      ticker: instrument.priceTicker,
      source: sourceFor(instrument.priceTicker).kind === "amfi" ? "AMFI" : "Yahoo",
      currency: instrument.market === "US" ? "USD" : "INR",
      from: first ? addDays(first, -LEAD_DAYS) : addDays(today, -UNTRADED_DAYS),
    });
  }
  for (const b of BENCHMARKS) jobs.push({ ticker: b.ticker, source: "Yahoo", currency: b.currency, from: overall });
  jobs.push({ ticker: USD_INR_TICKER, source: "Frankfurter", currency: "INR", from: overall });
  // Two instruments could share a ticker (a fund held in two markets): one job per ticker, from the earliest day.
  const byTicker = new Map<string, TickerJob>();
  for (const job of jobs) {
    const known = byTicker.get(job.ticker);
    if (!known || job.from < known.from) byTicker.set(job.ticker, job);
  }
  return [...byTicker.values()];
}

/** The smallest Yahoo range that reaches back to `from`. */
export function yahooRangeFor(from: string, today: string): YahooRange {
  const days = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  const steps: [number, YahooRange][] = [[27, "1mo"], [85, "3mo"], [170, "6mo"], [360, "1y"], [725, "2y"], [1820, "5y"], [3640, "10y"]];
  return steps.find(([limit]) => days <= limit)?.[1] ?? "max";
}

export type NewSnapshot = Omit<PriceSnapshot, "id">;

/**
 * The closes to save for a job: the fetched days from `job.from` on that aren't saved yet. A saved
 * day is never overwritten, even if the source now says something else: Yahoo adjusts old prices for
 * later splits, so rewriting history would mix two scales, and a close saved is a record.
 */
export function snapshotsToAdd(job: TickerJob, fetched: PricePoint[], savedDates: ReadonlySet<string>): NewSnapshot[] {
  return fetched
    .filter((point) => point.date >= job.from && !savedDates.has(point.date))
    .map((point) => ({ date: point.date, ticker: job.ticker, close: point.close, currency: job.currency, source: job.source }));
}

/** A fetched close that differs from the one saved for the same day by more than this fraction. */
export const DRIFT_TOLERANCE = 0.005;

export interface PriceDrift {
  /** Days present in both whose closes differ by more than the tolerance. */
  days: number;
  /** The largest difference, as a fraction of the saved close. */
  worst: number;
  /** The first such day, so the report can name one. */
  firstDay: string | null;
}

/**
 * Compares what the source says now with what was saved on the same days. They should agree to the
 * cent; a stretch of days that doesn't is almost always a share split or bonus, which Yahoo applies
 * to its whole history after the fact. A saved day is never rewritten, so this only warns: the
 * saved prices are as they were then, and the trades before the split are in the shares held then.
 */
export function priceDrift(fetched: PricePoint[], saved: ReadonlyMap<string, number>): PriceDrift {
  let days = 0;
  let worst = 0;
  let firstDay: string | null = null;
  for (const point of fetched) {
    const was = saved.get(point.date);
    if (was === undefined || was <= 0) continue;
    const diff = Math.abs(point.close - was) / was;
    if (diff <= DRIFT_TOLERANCE) continue;
    days++;
    worst = Math.max(worst, diff);
    firstDay ??= point.date;
  }
  return { days, worst, firstDay };
}
