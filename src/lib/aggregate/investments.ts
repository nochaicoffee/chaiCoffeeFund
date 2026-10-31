import type { InvestmentAssetType, InvestmentMarket, InvestmentTransaction } from "../sheets/types";

export interface Holding {
  symbol: string;
  market: InvestmentMarket;
  assetType: InvestmentAssetType;
  quantity: number;
  /** Weighted-average cost basis, in INR, of currently held shares. */
  avgCostInr: number;
  /** Total cost basis, in INR, of currently held shares (avgCostInr × quantity). */
  totalCostInr: number;
}

export interface HoldingValue extends Holding {
  currentValueInr: number;
  gainLossInr: number;
}

/** A sell of more than was held at the time: almost certainly a missing buy or a typo. */
export interface Oversell {
  transactionId: string;
  symbol: string;
  market: InvestmentMarket;
  tradeDate: string;
  /** What the sell asked for. */
  quantitySold: number;
  /** What was held just before it. */
  quantityHeld: number;
}

/**
 * Fractional units (mutual funds, fractional shares) leave float dust: 10.1 + 20.2 − 30.3 is
 * 5e-15, not 0. A quantity this small is nothing, so a position sold down to it is sold out.
 */
const QUANTITY_EPSILON = 1e-9;

function costInInr(transaction: InvestmentTransaction): number {
  if (transaction.market === "IND") return transaction.total;
  // US: the transaction's own frozen fxRateToInr, never a live rate — see
  // the plan's cost-basis-vs-current-value FX split.
  return transaction.total * (transaction.fxRateToInr ?? 0);
}

/**
 * Oldest first. Trades on the same day put the Buy first: a vest and its sell-to-cover land on
 * one date, and a sell can't come before the shares it sells. Sorting on the date alone left
 * same-day trades in the order they were typed, so the cost depended on it.
 */
function inTradeOrder(group: InvestmentTransaction[]): InvestmentTransaction[] {
  const rank = (transaction: InvestmentTransaction) => (transaction.tradeType === "Buy" ? 0 : 1);
  return [...group].sort((a, b) => (a.tradeDate < b.tradeDate ? -1 : a.tradeDate > b.tradeDate ? 1 : rank(a) - rank(b)));
}

function groupByPosition(transactions: InvestmentTransaction[]): InvestmentTransaction[][] {
  const groups = new Map<string, InvestmentTransaction[]>();
  for (const transaction of transactions) {
    const key = `${transaction.market}:${transaction.symbol}`;
    const group = groups.get(key) ?? [];
    group.push(transaction);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/**
 * Folds one position's trades, oldest first, with weighted-average cost: a Sell removes cost
 * proportional to the fraction of the position sold, leaving the remaining shares' average
 * cost unchanged. A sell of more than is held sells what there is, so a later buy starts clean
 * instead of from a negative quantity, and is reported as an oversell.
 */
function foldPosition(group: InvestmentTransaction[]) {
  let quantity = 0;
  let totalCostInr = 0;
  const oversells: Oversell[] = [];

  const ordered = inTradeOrder(group);
  for (const transaction of ordered) {
    if (transaction.tradeType === "Buy") {
      quantity += transaction.quantity;
      totalCostInr += costInInr(transaction);
      continue;
    }
    if (transaction.quantity > quantity + QUANTITY_EPSILON) {
      oversells.push({
        transactionId: transaction.id,
        symbol: transaction.symbol,
        market: transaction.market,
        tradeDate: transaction.tradeDate,
        quantitySold: transaction.quantity,
        quantityHeld: quantity,
      });
    }
    const sold = Math.min(transaction.quantity, quantity);
    totalCostInr -= quantity > 0 ? totalCostInr * (sold / quantity) : 0;
    quantity -= sold;
    if (quantity < QUANTITY_EPSILON) {
      quantity = 0;
      totalCostInr = 0;
    }
  }
  return { quantity, totalCostInr, oversells, first: ordered[0] };
}

/**
 * Folds a transaction log into current holdings. This is where positions live — never as
 * their own stored rows, so there's nothing to drift out of sync the way the old sheet's
 * Positions tabs did.
 */
export function computeHoldings(transactions: InvestmentTransaction[]): Holding[] {
  const holdings: Holding[] = [];
  for (const group of groupByPosition(transactions)) {
    const { quantity, totalCostInr, first } = foldPosition(group);
    if (quantity > 0) {
      const { symbol, market, assetType } = first;
      holdings.push({ symbol, market, assetType, quantity, avgCostInr: totalCostInr / quantity, totalCostInr });
    }
  }
  return holdings;
}

/**
 * Every sell that asked for more than was held. `computeHoldings` clamps these rather than
 * failing, so a page shows them as something to fix instead of a position quietly missing.
 */
export function findOversells(transactions: InvestmentTransaction[]): Oversell[] {
  return groupByPosition(transactions).flatMap((group) => foldPosition(group).oversells);
}

/**
 * Combines a holding with a live price/FX rate to get current value — kept
 * as a separate step (not folded into computeHoldings) because it depends
 * on live data, unlike cost basis which is a pure function of the log.
 */
export function valueHolding(holding: Holding, currentPriceNative: number, currentFxRateToInr: number): HoldingValue {
  const currentValueInr =
    holding.market === "IND" ? currentPriceNative * holding.quantity : currentPriceNative * currentFxRateToInr * holding.quantity;
  return { ...holding, currentValueInr, gainLossInr: currentValueInr - holding.totalCostInr };
}

/** Total cost basis across all current holdings, in INR — usable as a stand-in for value before live prices are wired up. */
export function totalCostBasisInr(transactions: InvestmentTransaction[]): number {
  return computeHoldings(transactions).reduce((sum, h) => sum + h.totalCostInr, 0);
}
