import type { InvestmentMarket, InvestmentTransaction } from "../sheets/types";

export interface Holding {
  symbol: string;
  market: InvestmentMarket;
  assetType: string;
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

function costInInr(transaction: InvestmentTransaction): number {
  if (transaction.market === "IND") return transaction.total;
  // US: the transaction's own frozen fxRateToInr, never a live rate — see
  // the plan's cost-basis-vs-current-value FX split.
  return transaction.total * (transaction.fxRateToInr ?? 0);
}

/**
 * Folds a transaction log into current holdings using weighted-average
 * cost: a Sell removes cost proportional to the fraction of the position
 * sold, leaving the remaining shares' average cost unchanged. This is
 * where positions live — never as their own stored rows, so there's
 * nothing to drift out of sync the way the old sheet's Positions tabs did.
 */
export function computeHoldings(transactions: InvestmentTransaction[]): Holding[] {
  const groups = new Map<string, InvestmentTransaction[]>();
  for (const transaction of transactions) {
    const key = `${transaction.market}:${transaction.symbol}`;
    const group = groups.get(key) ?? [];
    group.push(transaction);
    groups.set(key, group);
  }

  const holdings: Holding[] = [];
  for (const [, group] of groups) {
    const sorted = [...group].sort((a, b) => (a.tradeDate < b.tradeDate ? -1 : 1));
    let quantity = 0;
    let totalCostInr = 0;

    for (const transaction of sorted) {
      if (transaction.tradeType === "Buy") {
        quantity += transaction.quantity;
        totalCostInr += costInInr(transaction);
      } else {
        const fractionSold = quantity > 0 ? transaction.quantity / quantity : 0;
        totalCostInr -= totalCostInr * fractionSold;
        quantity -= transaction.quantity;
      }
    }

    if (quantity > 0) {
      const [{ symbol, market, assetType }] = sorted;
      holdings.push({ symbol, market, assetType, quantity, avgCostInr: totalCostInr / quantity, totalCostInr });
    }
  }
  return holdings;
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
