import type { NewInvestmentTransaction } from "./build";

/** What makes two trades the same trade: a re-read file must add nothing. Total is to four places (the Sheet keeps what was written), so two fills that differ by a fraction of a cent stay two trades. */
export function tradeKey(trade: NewInvestmentTransaction): string {
  return [trade.broker, trade.tradeDate, trade.symbol, trade.market, trade.tradeType, trade.quantity.toFixed(6), trade.total.toFixed(4)].join("|");
}

/**
 * Splits incoming trades into the ones to add and the ones already stored. Counted, not just
 * looked up: two real fills can be identical, and then having one stored means one is still to add.
 */
export function planImport(incoming: NewInvestmentTransaction[], stored: NewInvestmentTransaction[]) {
  const available = new Map<string, number>();
  for (const trade of stored) available.set(tradeKey(trade), (available.get(tradeKey(trade)) ?? 0) + 1);
  const toAdd: NewInvestmentTransaction[] = [];
  const alreadyThere: NewInvestmentTransaction[] = [];
  for (const trade of incoming) {
    const key = tradeKey(trade);
    const left = available.get(key) ?? 0;
    if (left > 0) {
      available.set(key, left - 1);
      alreadyThere.push(trade);
    } else toAdd.push(trade);
  }
  return { toAdd, alreadyThere };
}

/** A trade that may be the same real trade as one stored under another broker. */
export interface LikelyCopy {
  incoming: NewInvestmentTransaction;
  stored: NewInvestmentTransaction;
}

const COPY_WINDOW_DAYS = 5;
const COPY_VALUE_TOLERANCE = 0.01;

const daysApart = (a: string, b: string) => Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;

/**
 * Shares moved from one broker to another (an off-market transfer) show up as an order in the
 * receiving broker's history, so the same purchase can arrive in two files and be counted twice.
 * This finds incoming trades with the same symbol, side and quantity as a stored trade of
 * another broker, within a few days and about the same value. It only warns: two real trades can
 * match, and which of the two to keep is a person's call.
 */
export function findLikelyCopies(incoming: NewInvestmentTransaction[], stored: NewInvestmentTransaction[]): LikelyCopy[] {
  const copies: LikelyCopy[] = [];
  for (const trade of incoming) {
    const match = stored.find(
      (other) =>
        other.broker !== trade.broker &&
        other.symbol === trade.symbol &&
        other.market === trade.market &&
        other.tradeType === trade.tradeType &&
        Math.abs(other.quantity - trade.quantity) < 1e-6 &&
        daysApart(other.tradeDate, trade.tradeDate) <= COPY_WINDOW_DAYS &&
        Math.abs(other.total - trade.total) <= trade.total * COPY_VALUE_TOLERANCE,
    );
    if (match) copies.push({ incoming: trade, stored: match });
  }
  return copies;
}
