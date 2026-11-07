import type { Instrument, InvestmentAssetType, InvestmentMarket, InvestmentTransaction } from "../sheets/types";
import { priceOnOrBefore, sourceFor, type PricePoint } from "../prices/history";
import { USD_INR_TICKER } from "../prices/refreshPlan";
import { holdingLens, type HoldingLens } from "./holdingLens";
import { raceLines, type RaceLine } from "./raceLines";
import { computeHoldings, holdingsAt, realisedGains, totalInInr } from "./investments";
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
  /** What he paid a share on average, in the holding's own currency, fees in. Null when he holds none. */
  avgCostNative: number | null;
  /** For a US holding, the rupees to a dollar he paid on average (cost in rupees over cost in dollars); null for an Indian one. */
  avgRateInr: number | null;
  /** The day of his first trade in it. */
  since: string;
  /** Which kinds of share plan trades are in it: an RSU vest, an ESPP purchase. */
  plans: ("RSU" | "ESPP")[];
  /** Where its price comes from, or null when it has no price. */
  priceSource: "Yahoo" | "AMFI" | null;
  /** What it is worth in its own currency (dollars for a US holding): quantity times the price. Null with no price. */
  valueNative: number | null;
  /** The last close against the one before it, as a fraction, in its own currency (the rupee's move not in it). Null when it can't be told. */
  dayFraction: number | null;
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
  /** Every buy, in rupees (an RSU vest at its fair value, fees in): the "money bought" a total return is counted on. */
  moneyBoughtInr: number;
  /** What the rupee has done to the US holdings still held, in rupees: the part of `gainInr` that is not the share price. */
  rupeeGainInr: number;
  /** What the sales made, and from where: how many, what the shares sold to cover tax at a vest made, and each holding's part (biggest first). */
  realised: { sales: number; coverInr: number; bySymbol: { symbol: string; market: InvestmentMarket; name: string; gainInr: number }[] };
  /** The yearly return on his money (XIRR); "too early" under a year. */
  xirr: YearlyReturn;
  /** Time-weighted: the portfolio's yearly rate (null under a year), the deepest fall and the day it started. */
  twr: Returns;
  /** Today's USD to INR (the latest saved), or null when none is saved. */
  usdInr: number | null;
  niftyYearly: number | null;
  sp500Yearly: number | null;
  gapToNifty: number | null;
  gapToSp500: number | null;
  /** The newest close among the holdings' prices: "prices from …". */
  pricesFrom: string | null;
  /** Holdings counted at cost for want of a price. */
  unpriced: string[];
  /** Every day from his first trade to today: what he held was worth, and what it cost him (the stage draws these). */
  series: { date: string; value: number; cost: number; /** Money put in that day, less money taken out (a buy is in, a sell is out), in rupees: the stage's "money added" bars. */ flow: number }[];
  /** The lines the Race draws, one value a day on the same days as `series`: him, Nifty 50, the S&P in rupees and a deposit. */
  race: RaceLine[];
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
    let dayFraction: number | null = null;
    if (priced) {
      // The move from the close before the latest one, with each day's own rate, on the shares held then.
      const lastIndex = series.findIndex((p) => p.date === price.date);
      const previous = lastIndex > 0 ? series[lastIndex - 1] : undefined;
      const fxPrev = previous ? priceOnOrBefore(usdInr, previous.date)?.close : undefined;
      if (previous && previous.close > 0) dayFraction = price.close / previous.close - 1;
      if (previous && (h.market === "IND" || fxPrev !== undefined)) {
        const quantityThen = holdingsAt(trades, previous.date).find((x) => x.symbol === h.symbol && x.market === h.market)?.quantity ?? 0;
        change = dayChange({ market: h.market, quantityAtPrevClose: quantityThen, priceToday: price.close, pricePrevClose: previous.close, fxToday: fxToday ?? 1, fxPrevClose: fxPrev ?? 1 }).changeInr;
      }
    }
    const own = trades.filter((t) => t.symbol === h.symbol && t.market === h.market && t.tradeDate <= today);
    return {
      avgCostNative: h.quantity > 0 ? h.totalCostNative / h.quantity : null,
      avgRateInr: h.market === "US" && h.totalCostNative > 0 ? h.totalCostInr / h.totalCostNative : null,
      since: own.reduce((min, t) => (t.tradeDate < min ? t.tradeDate : min), own[0]?.tradeDate ?? today),
      plans: (["RSU", "ESPP"] as const).filter((plan) => own.some((t) => t.source === plan)),
      priceSource: instrument?.priceTicker ? (sourceFor(instrument.priceTicker).kind === "amfi" ? "AMFI" : "Yahoo") : null,
      valueNative: priced ? h.quantity * price.close : null,
      dayFraction,
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

  const lensList = rows.map((r) => holdingLens({ trades, instrument: tickerOf.get(`${r.market}:${r.symbol}`) ?? { symbol: r.symbol, market: r.market, name: r.name, priceTicker: "" }, closes, usdInr, today }));
  const sales = realisedGains(trades, today);
  const sourceOf = new Map(trades.map((t) => [t.id, t.source]));
  const bySymbol = new Map<string, { symbol: string; market: InvestmentMarket; name: string; gainInr: number }>();
  for (const sale of sales) {
    const key = `${sale.market}:${sale.symbol}`;
    const entry = bySymbol.get(key) ?? { symbol: sale.symbol, market: sale.market, name: tickerOf.get(key)?.name ?? sale.symbol, gainInr: 0 };
    entry.gainInr += sale.gainInr;
    bySymbol.set(key, entry);
  }
  const dates = rows.map((r) => r.priceDate).filter((d): d is string => d !== null);
  return {
    today, holdings: rows, valueInr, costInr, gainInr: valueInr - costInr, gainFraction: costInr > 0 ? (valueInr - costInr) / costInr : null, dayChangeInr,
    realisedInr: sales.reduce((sum, sale) => sum + sale.gainInr, 0), moneyBoughtInr: trades.filter((t) => t.tradeType === "Buy" && t.tradeDate <= today).reduce((sum, t) => sum + totalInInr(t), 0),
    rupeeGainInr: lensList.reduce((sum, l) => sum + (l.split?.rupeePartInr ?? 0), 0),
    realised: { sales: sales.length, coverInr: sales.filter((sale) => sourceOf.get(sale.transactionId) === "RSU").reduce((sum, sale) => sum + sale.gainInr, 0), bySymbol: [...bySymbol.values()].sort((a, b) => Math.abs(b.gainInr) - Math.abs(a.gainInr)) },
    xirr: yearlyReturn(trades, valueInr, today), twr, usdInr: fxToday ?? null, niftyYearly, sp500Yearly,
    gapToNifty: gapToIndex(twr.yearlyRate, niftyYearly), gapToSp500: gapToIndex(twr.yearlyRate, sp500Yearly),
    pricesFrom: dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null,
    unpriced: rows.filter((r) => r.price === null).map((r) => r.symbol),
    lenses: lensList,
    race: raceLines({ dates: history.map((d) => d.date), youIndex: twr.index, closes }),
    series: history.map((d) => ({ date: d.date, value: Math.round(d.valueInr), cost: Math.round(d.costInr), flow: Math.round(d.netFlowInr) })),
  };
}

