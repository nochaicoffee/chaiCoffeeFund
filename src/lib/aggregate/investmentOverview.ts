import type { Instrument, InvestmentAssetType, InvestmentMarket, InvestmentTransaction } from "../sheets/types";
import { priceOnOrBefore, type PricePoint } from "../prices/history";
import { USD_INR_TICKER } from "../prices/refreshPlan";
import { holdingLens, type HoldingLens } from "./holdingLens";
import { computeHoldings, holdingsAt, totalRealisedGainInr } from "./investments";
import { dayChange } from "./investmentValue";
import { yearlyReturn, type YearlyReturn } from "./investmentReturns";
import { gapToIndex, indexYearlyRate, portfolioHistory, timeWeightedReturns, type PriceBook, type Returns } from "./portfolioHistory";

export interface HoldingRow {
  symbol: string;
  market: InvestmentMarket;
  name: string;
  assetType: InvestmentAssetType;
  quantity: number;
  /** The latest close in the holding's own currency, or null when it has no price (then it is counted at cost). */
  price: number | null;
  /** The day that close is from. */
  priceDate: string | null;
  /** True when that close is more than a week old. */
  stale: boolean;
  valueInr: number;
  costInr: number;
  gainInr: number;
  /** Gain as a fraction of cost; null when the cost is nothing. */
  gainFraction: number | null;
  /** This holding's share of everything held, 0 to 1. */
  share: number;
  /** The last day's move in rupees (the rupee's move included for a US holding), or null when it can't be told. */
  dayChangeInr: number | null;
}

export interface Overview {
  today: string;
  holdings: HoldingRow[];
  valueInr: number;
  costInr: number;
  gainInr: number;
  gainFraction: number | null;
  dayChangeInr: number | null;
  /** What sales have made, in rupees, beside the gain and never inside it. */
  realisedInr: number;
  /** The yearly return on his money (XIRR); "too early" under a year. */
  xirr: YearlyReturn;
  /** Time-weighted: the portfolio's yearly rate (null under a year), the deepest fall and the day it started. */
  twr: Returns;
  niftyYearly: number | null;
  sp500Yearly: number | null;
  gapToNifty: number | null;
  gapToSp500: number | null;
  /** The newest close among the holdings' prices: "prices from …". */
  pricesFrom: string | null;
  /** Holdings counted at cost for want of a price. */
  unpriced: string[];
  /** Every day from his first trade to today: what he held was worth, and what it cost him (the stage draws these). */
  series: { date: string; value: number; cost: number }[];
  /** Each holding on its own, in the same order as `holdings`: its price line, his trades on it and its stats (the lens). */
  lenses: HoldingLens[];
}

export interface OverviewInput {
  trades: InvestmentTransaction[];
  instruments: Instrument[];
  /** Saved closes by ticker, oldest first (lib/prices/series.ts). */
  closes: ReadonlyMap<string, PricePoint[]>;
  today: string;
}

const STALE_DAYS = 7;

/** Everything the Investments page shows, worked out from the trades and the saved prices. Pure. */
export function investmentOverview({ trades, instruments, closes, today }: OverviewInput): Overview {
  const tickerOf = new Map(instruments.map((i) => [`${i.market}:${i.symbol}`, i]));
  const usdInr = closes.get(USD_INR_TICKER) ?? [];
  const fxToday = priceOnOrBefore(usdInr, today)?.close;
  const book: PriceBook = { closes, tickerFor: (symbol, market) => tickerOf.get(`${market}:${symbol}`)?.priceTicker, usdInr };

  const held = computeHoldings(trades.filter((t) => t.tradeDate <= today));
  const rows: HoldingRow[] = held.map((h) => {
    const instrument = tickerOf.get(`${h.market}:${h.symbol}`);
    const series = instrument ? closes.get(instrument.priceTicker) ?? [] : [];
    const price = priceOnOrBefore(series, today);
    const priced = price !== null && (h.market === "IND" || fxToday !== undefined);
    const valueInr = priced ? h.quantity * price.close * (h.market === "US" ? fxToday! : 1) : h.totalCostInr;

    let change: number | null = null;
    if (priced) {
      // The move from the close before the latest one, with each day's own rate, on the shares held then.
      const lastIndex = series.findIndex((p) => p.date === price.date);
      const previous = lastIndex > 0 ? series[lastIndex - 1] : undefined;
      const fxPrev = previous ? priceOnOrBefore(usdInr, previous.date)?.close : undefined;
      if (previous && (h.market === "IND" || fxPrev !== undefined)) {
        const quantityThen = holdingsAt(trades, previous.date).find((x) => x.symbol === h.symbol && x.market === h.market)?.quantity ?? 0;
        change = dayChange({ market: h.market, quantityAtPrevClose: quantityThen, priceToday: price.close, pricePrevClose: previous.close, fxToday: fxToday ?? 1, fxPrevClose: fxPrev ?? 1 }).changeInr;
      }
    }
    return {
      symbol: h.symbol, market: h.market, name: instrument?.name ?? h.symbol, assetType: h.assetType, quantity: h.quantity,
      price: priced ? price.close : null, priceDate: priced ? price.date : null, stale: priced ? price.ageDays > STALE_DAYS : false,
      valueInr, costInr: h.totalCostInr, gainInr: valueInr - h.totalCostInr, gainFraction: h.totalCostInr > 0 ? (valueInr - h.totalCostInr) / h.totalCostInr : null,
      share: 0, dayChangeInr: change,
    };
  });

  const valueInr = rows.reduce((s, r) => s + r.valueInr, 0);
  const costInr = rows.reduce((s, r) => s + r.costInr, 0);
  for (const r of rows) r.share = valueInr > 0 ? r.valueInr / valueInr : 0;
  rows.sort((a, b) => b.valueInr - a.valueInr);
  const changes = rows.map((r) => r.dayChangeInr);
  const dayChangeInr = changes.length > 0 && changes.every((c) => c !== null) ? changes.reduce<number>((s, c) => s + (c as number), 0) : null;

  const firstTrade = trades.reduce<string | null>((min, t) => (min === null || t.tradeDate < min ? t.tradeDate : min), null);
  const history = firstTrade ? portfolioHistory(trades, book, firstTrade, today) : [];
  const twr = timeWeightedReturns(history);
  const niftyYearly = twr.startDate ? indexYearlyRate(closes.get("^NSEI") ?? [], twr.startDate, today) : null;
  const sp500Yearly = twr.startDate ? indexYearlyRate(closes.get("^GSPC") ?? [], twr.startDate, today, usdInr) : null;

  const dates = rows.map((r) => r.priceDate).filter((d): d is string => d !== null);
  return {
    today, holdings: rows, valueInr, costInr, gainInr: valueInr - costInr, gainFraction: costInr > 0 ? (valueInr - costInr) / costInr : null, dayChangeInr,
    realisedInr: totalRealisedGainInr(trades, today), xirr: yearlyReturn(trades, valueInr, today), twr, niftyYearly, sp500Yearly,
    gapToNifty: gapToIndex(twr.yearlyRate, niftyYearly), gapToSp500: gapToIndex(twr.yearlyRate, sp500Yearly),
    pricesFrom: dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null,
    unpriced: rows.filter((r) => r.price === null).map((r) => r.symbol),
    lenses: rows.map((r) => holdingLens({ trades, instrument: tickerOf.get(`${r.market}:${r.symbol}`) ?? { symbol: r.symbol, market: r.market, name: r.name, priceTicker: "" }, closes, usdInr, today })),
    series: history.map((d) => ({ date: d.date, value: Math.round(d.valueInr), cost: Math.round(d.costInr) })),
  };
}

