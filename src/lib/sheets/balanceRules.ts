import type { BalanceSnapshot } from "./types";

/**
 * One balance per account and day. The Accounts page replaces a balance saved again for the same day;
 * a route can't replace, so it refuses a second one instead and names the row to update.
 * `ignoreId` is the row being changed, so an update doesn't conflict with itself.
 */
export function balanceDayConflict(
  rows: Pick<BalanceSnapshot, "id" | "accountId" | "date">[],
  candidate: Pick<BalanceSnapshot, "accountId" | "date">,
  ignoreId?: string,
): string | null {
  const clash = rows.find((row) => row.id !== ignoreId && row.accountId === candidate.accountId && row.date === candidate.date);
  return clash ? `That account already has a balance for ${candidate.date} (id ${clash.id}). Update that one instead of adding another.` : null;
}
