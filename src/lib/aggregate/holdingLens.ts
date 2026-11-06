import type { Instrument, InvestmentTransaction } from "../sheets/types";
import { priceOnOrBefore, type PricePoint } from "../prices/history";
import { priceCagr, yearlyReturn, type YearlyReturn } from "./investmentReturns";
import { holdingsAt, realisedGains } from "./investments";
import { rupeeSplit, type RupeeSplit } from "./investmentValue";

/** One close of a holding with what he paid per share that day (null before his first buy, and after he sold it all). */
export interface LensPoint {
  date: string;
  price: number;
  avgCost: number | null;
}

export interface LensMarker {
  tradeId: string;
  date: string;
  tradeType: "Buy" | "Sell";
  source: "Market" | "RSU" | "ESPP";
  quantity: number;
  price: number;
}

export interface HoldingLens {
  key: string;
  symbol: string;
  market: "IND" | "US";
  name: string;
  /** The holding's own currency. */
  currency: "INR" | "USD";
  points: LensPoint[];
  markers: LensMarker[];
  quantity: number;
  /** What he paid a share on average, fees included, in the holding's currency; null when nothing is held. */
  avgCost: number | null;
  price: number | null;
  valueInr: number;
  costInr: number;
  gainInr: number;
  gainFraction: number | null;
  /** For a US holding, the gain split into the share price and the rupee. */
  split: RupeeSplit | null;
  /** His yearly return on this holding alone (XIRR), or "too early". */
  xirr: YearlyReturn;
  /** The price's growth a year from his first buy, null under a year. */
  priceCagr: number | null;
  /** What sales of it have made, in rupees. */
  realisedInr: number;
  firstBuy: string | null;
}

export interface LensInput {
  trades: InvestmentTransaction[];
  instrument: Pick<Instrument, "symbol" | "market" | "name" | "priceTicker">;
  closes: ReadonlyMap<string, PricePoint[]>;
  usdInr: PricePoint[];
  today: string;
}

/**
 * One holding on its own (docs/design/investments.md, the lens): its price day by day from a week before he first bought it, what he
 * paid a share on each day, every trade of his on it, and the stats that belong to it alone. Pure.
 */
export function holdingLens({ trades, instrument, closes, usdInr, today }: LensInput): HoldingLens {
  const { symbol, market } = instrument;
  const own = trades.filter((t) => t.symbol === symbol && t.market === market && t.tradeDate <= today);
  const firstBuy = own.filter((t) => t.tradeType === "Buy").map((t) => t.tradeDate).sort()[0] ?? null;
  const series = closes.get(instrument.priceTicker) ?? [];
  const from = own.length > 0 ? own.map((t) => t.tradeDate).sort()[0] : today;

  const points: LensPoint[] = series
    .filter((p) => p.date >= from && p.date <= today)
    .map((p) => {
      const held = holdingsAt(own, p.date)[0];
      return { date: p.date, price: p.close, avgCost: held && held.quantity > 0 ? held.totalCostNative / held.quantity : null };
    });

  const now = holdingsAt(own, today)[0];
  const latest = priceOnOrBefore(series, today);
  const fx = market === "US" ? priceOnOrBefore(usdInr, today)?.close : 1;
  const priced = Boolean(now && latest && fx !== undefined);
  const split = now && priced && market === "US" ? rupeeSplit(now, latest!.close, fx!) : null;
  const valueInr = now ? (priced ? now.quantity * latest!.close * fx! : now.totalCostInr) : 0;
  const costInr = now?.totalCostInr ?? 0;
  // Growth of the price itself: from the market price the day he first bought (an ESPP purchase's own price is discounted, so isn't a market price).
  const firstMarket = firstBuy ? priceOnOrBefore(series, firstBuy) : null;

  return {
    key: `${market}:${symbol}`, symbol, market, name: instrument.name, currency: market === "US" ? "USD" : "INR", points,
    markers: own.map((t) => ({ tradeId: t.id, date: t.tradeDate, tradeType: t.tradeType, source: t.source, quantity: t.quantity, price: t.price })),
    quantity: now?.quantity ?? 0,
    avgCost: now && now.quantity > 0 ? now.totalCostNative / now.quantity : null,
    price: priced ? latest!.close : null,
    valueInr, costInr, gainInr: valueInr - costInr, gainFraction: costInr > 0 ? (valueInr - costInr) / costInr : null,
    split,
    xirr: yearlyReturn(own, valueInr, today),
    priceCagr: firstBuy && firstMarket && latest ? priceCagr(firstMarket.close, latest.close, firstBuy, today) : null,
    realisedInr: realisedGains(own, today).reduce((s, x) => s + x.gainInr, 0),
    firstBuy,
  };
}
