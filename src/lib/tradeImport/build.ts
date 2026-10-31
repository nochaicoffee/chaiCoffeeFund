import type { InvestmentTransaction } from "../sheets/types";
import { round6, type ParsedTrade } from "./types";

/** What the app's create route takes: a trade without its id. */
export type NewInvestmentTransaction = Omit<InvestmentTransaction, "id">;

/**
 * A trade as the Sheet stores it. The fee is folded into `total` (decided 2026-11-05): a buy costs
 * its amount plus the fee, a sell brings in its amount minus the fee, so cost and gain are what
 * happened to the money. `price` stays the price the broker quoted, so quantity × price is the
 * trade without its fee and `total` the trade with it.
 *
 * A US trade needs the USD→INR rate of its day (`rateOn`), which is captured here once (ADR 0003).
 */
export function buildTransaction(trade: ParsedTrade, broker: string, rateOn: (date: string) => number | undefined): NewInvestmentTransaction {
  const total = round6(trade.tradeType === "Buy" ? trade.amount + trade.fee : trade.amount - trade.fee);
  const base: NewInvestmentTransaction = {
    tradeDate: trade.tradeDate,
    symbol: trade.symbol,
    market: trade.market,
    currency: trade.currency,
    tradeType: trade.tradeType,
    source: trade.source,
    quantity: trade.quantity,
    price: trade.price,
    total,
    assetType: trade.assetType,
    broker,
  };
  if (trade.market === "IND") return base;
  const rate = rateOn(trade.tradeDate);
  if (rate === undefined) throw new Error(`No USD to INR rate for ${trade.tradeDate}`);
  return { ...base, fxRateToInr: rate };
}

/** The dates a set of trades needs a rate for, each once. */
export function datesNeedingRate(trades: ParsedTrade[]): string[] {
  return [...new Set(trades.filter((t) => t.market === "US").map((t) => t.tradeDate))].sort();
}
