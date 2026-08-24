import type { Account, BalanceSnapshot } from "../sheets/types";

export interface AccountBalance {
  account: Account;
  latestBalance: number | null;
  latestDate: string | null;
  previousBalance: number | null;
  monthOverMonthChange: number | null;
}

function latestTwoSnapshots(snapshots: BalanceSnapshot[]): [BalanceSnapshot | null, BalanceSnapshot | null] {
  const sorted = [...snapshots].sort((a, b) => (a.date < b.date ? 1 : -1));
  return [sorted[0] ?? null, sorted[1] ?? null];
}

/** One balance per account, using its most recent point-in-time BalanceSnapshot. */
export function computeAccountBalances(accounts: Account[], snapshots: BalanceSnapshot[]): AccountBalance[] {
  return accounts.map((account) => {
    const accountSnapshots = snapshots.filter((s) => s.accountId === account.id);
    const [latest, previous] = latestTwoSnapshots(accountSnapshots);
    return {
      account,
      latestBalance: latest?.balance ?? null,
      latestDate: latest?.date ?? null,
      previousBalance: previous?.balance ?? null,
      monthOverMonthChange: latest && previous ? latest.balance - previous.balance : null,
    };
  });
}

/** Sum of every active account's latest balance — the "bank balances" term in net worth. */
export function totalAccountBalance(accounts: Account[], snapshots: BalanceSnapshot[]): number {
  return computeAccountBalances(accounts, snapshots)
    .filter((b) => b.account.status === "Active")
    .reduce((sum, b) => sum + (b.latestBalance ?? 0), 0);
}

export interface BalanceTrendPoint {
  date: string;
  total: number;
}

/**
 * Total balance across active accounts, by date — groups snapshots that
 * share an exact date string. Assumes accounts get snapshotted together
 * (e.g. once a month for everything), which is how the real data looks;
 * if accounts are ever snapshotted on different days, this undercounts
 * days where only some accounts have a reading, rather than interpolating.
 */
export function balanceTrend(accounts: Account[], snapshots: BalanceSnapshot[]): BalanceTrendPoint[] {
  const activeIds = new Set(accounts.filter((a) => a.status === "Active").map((a) => a.id));
  const byDate = new Map<string, number>();
  for (const snapshot of snapshots) {
    if (!activeIds.has(snapshot.accountId)) continue;
    byDate.set(snapshot.date, (byDate.get(snapshot.date) ?? 0) + snapshot.balance);
  }
  return [...byDate.entries()]
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
