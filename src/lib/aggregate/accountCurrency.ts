import type { Account, BalanceSnapshot } from "../sheets/types";

/**
 * The one place a dollar balance becomes rupees (ADR 0012).
 *
 * A balance is kept in its account's own currency. Everything that adds balances up
 * (lib/aggregate/accounts.ts, netWorth.ts, accountFlows.ts, the Accounts, Goals and
 * Overview loaders) assumes rupees, so the loaders call `inRupees` right after reading the
 * Sheet and the rest never learns about currencies. A dollar account is counted at today's
 * rate and nowhere else: a past balance too, so a history carries no rate, and the change
 * between two balances is the dollar change times today's rate (the rate's move alone is
 * not a deposit and is not a gain).
 *
 * With no rate (PRD Q14) a dollar account is left out of the totals and handed back in
 * `unpriced`, so the page can say so; it is never counted as ₹0 or at an invented rate.
 */

/** A balance snapshot in rupees. A dollar account's also carries the dollars as typed. */
export interface RupeeSnapshot extends BalanceSnapshot {
  native?: number;
}

export interface InRupees {
  /** The accounts that are counted: every rupee account, and the dollar ones when there was a rate. */
  accounts: Account[];
  /** Their snapshots, `balance` in rupees. */
  snapshots: RupeeSnapshot[];
  /** Dollar accounts left out because there was no rate, with their snapshots still in dollars. */
  unpriced: { account: Account; snapshots: BalanceSnapshot[] }[];
}

export const isDollarAccount = (account: Pick<Account, "currency">): boolean => account.currency === "USD";

/** Whether any account needs today's rate, so nothing is fetched when none does. */
export const needsRate = (accounts: Account[]): boolean => accounts.some(isDollarAccount);

/** Paise, so a converted balance is a clean figure and the same wherever it is summed. */
const toPaise = (rupees: number): number => Math.round(rupees * 100) / 100;

/** `usdInr` is today's rate, or null when it couldn't be had. A rate that isn't a positive, finite number counts as none, so a bad rate can never turn dollars into ₹0. */
export function inRupees(accounts: Account[], snapshots: BalanceSnapshot[], usdInr: number | null): InRupees {
  const dollar = new Set(accounts.filter(isDollarAccount).map((a) => a.id));
  if (dollar.size === 0) return { accounts, snapshots, unpriced: [] };
  if (usdInr === null || !Number.isFinite(usdInr) || usdInr <= 0) {
    return {
      accounts: accounts.filter((a) => !dollar.has(a.id)),
      snapshots: snapshots.filter((s) => !dollar.has(s.accountId)),
      unpriced: accounts.filter((a) => dollar.has(a.id)).map((account) => ({ account, snapshots: snapshots.filter((s) => s.accountId === account.id) })),
    };
  }
  return {
    accounts,
    snapshots: snapshots.map((s) => (dollar.has(s.accountId) ? { ...s, balance: toPaise(s.balance * usdInr), native: s.balance } : s)),
    unpriced: [],
  };
}
