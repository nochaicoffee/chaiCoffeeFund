import { daysBetween, monthOf, type SpendPeriod } from "./cardSpend";
import type { Account, AccountPurpose, BalanceSnapshot, CardColor } from "../sheets/types";

/**
 * Bank account math behind the Accounts page (docs/design/accounts.md, decisions
 * confirmed 2026-10-22 as the mockups show them):
 * - A total on a date counts each account at its latest balance on or before
 *   that date, and nothing before its first (decision 1). A balance is carried
 *   forward until the next one; two balances on one day, the later row wins.
 * - An account is stale when its latest balance is more than 30 days old, and
 *   still counts in the total (decision 3).
 * - Closing an account is a ₹0 balance on the day plus Inactive (decision 5), so
 *   a closed account's history stays and its total drops to zero from then.
 * All dates are ISO strings; `today` comes from todayIso().
 */

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

// --- Carrying a balance forward (decision 1) ---

/** An account's balance on a date: its latest on or before it, later row winning a tie. Null before its first. */
export function balanceOn(snapshots: BalanceSnapshot[], accountId: string, date: string): BalanceSnapshot | null {
  let found: BalanceSnapshot | null = null;
  for (const snapshot of snapshots) {
    if (snapshot.accountId !== accountId || snapshot.date > date) continue;
    if (!found || snapshot.date >= found.date) found = snapshot;
  }
  return found;
}

/** What every account held on a date, carried forward, in the accounts' order. Accounts with no balance yet are left out. */
export function balancesOn(accounts: Account[], snapshots: BalanceSnapshot[], date: string): { account: Account; balance: number; date: string }[] {
  const held: { account: Account; balance: number; date: string }[] = [];
  for (const account of accounts) {
    const snapshot = balanceOn(snapshots, account.id, date);
    if (snapshot) held.push({ account, balance: snapshot.balance, date: snapshot.date });
  }
  return held;
}

/**
 * The total on a date: every account at its carried balance (a step on one account moves
 * it by exactly that step). Closed accounts count too, at the ₹0 they were closed with.
 */
export function totalOn(accounts: Account[], snapshots: BalanceSnapshot[], date: string): number {
  return balancesOn(accounts, snapshots, date).reduce((sum, held) => sum + held.balance, 0);
}

export interface BalanceTrendPoint {
  date: string;
  total: number;
}

/** The total on each date given, in order. */
export function totalSeries(accounts: Account[], snapshots: BalanceSnapshot[], dates: string[]): BalanceTrendPoint[] {
  return dates.map((date) => ({ date, total: totalOn(accounts, snapshots, date) }));
}

/**
 * The total on each date any active account was read, carrying the others forward.
 * (It used to add up only the balances sharing an exact date, which undercounted
 * every day only some accounts were updated.)
 */
export function balanceTrend(accounts: Account[], snapshots: BalanceSnapshot[]): BalanceTrendPoint[] {
  const active = accounts.filter((a) => a.status === "Active");
  const ids = new Set(active.map((a) => a.id));
  const dates = [...new Set(snapshots.filter((s) => ids.has(s.accountId)).map((s) => s.date))].sort();
  return totalSeries(active, snapshots, dates);
}

/** The Mondays-to-today style week steps for the line: every 7 days from `from`, then `to` itself. */
export function weeklyDates(from: string, to: string): string[] {
  if (from > to) return [];
  const dates: string[] = [];
  const start = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  for (let t = start; ; t += 7 * 86_400_000) {
    const iso = new Date(t).toISOString().slice(0, 10);
    if (iso >= to) break;
    dates.push(iso);
  }
  dates.push(to);
  return dates;
}

/** The first and last day a period covers, as of today. All time starts at the first balance (or today when there is none). */
export function periodSpan(period: SpendPeriod, today: string, firstBalanceDate: string | null): { from: string; to: string } {
  const lastDayOf = (month: string) => {
    const [y, m] = month.split("-").map(Number);
    return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  };
  const clamp = (iso: string) => (iso > today ? today : iso);
  if (period.kind === "all") return { from: firstBalanceDate ?? today, to: today };
  if (period.kind === "year") return { from: `${period.year}-01-01`, to: clamp(`${period.year}-12-31`) };
  return { from: `${period.from}-01`, to: clamp(lastDayOf(period.to)) };
}

/** What the period's first day is carried from: the day before it, so a change is "since the balance before". */
export function dayBefore(iso: string): string {
  const t = Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) - 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * How much the total moved from `from` to today: each account's balance today minus the one
 * carried on `from` (Dec 31 for "since Jan 1"). An account first read after `from` counts from
 * its first balance, since opening an account isn't money coming in (as in everythingElse).
 */
export function changeSince(accounts: Account[], snapshots: BalanceSnapshot[], from: string, today: string): number {
  let change = 0;
  for (const account of accounts) {
    const end = balanceOn(snapshots, account.id, today);
    if (!end) continue;
    const before = balanceOn(snapshots, account.id, from);
    if (before) {
      change += end.balance - before.balance;
      continue;
    }
    const first = snapshots.filter((s) => s.accountId === account.id).reduce<BalanceSnapshot | null>((best, s) => (best === null || s.date < best.date ? s : best), null);
    if (first) change += end.balance - first.balance;
  }
  return change;
}

/** The highest total on any of the dates, and when. Null with no dates. */
export function highPoint(series: BalanceTrendPoint[]): BalanceTrendPoint | null {
  return series.reduce<BalanceTrendPoint | null>((best, point) => (best === null || point.total > best.total ? point : best), null);
}

/** Each account's share of what's held on a date, biggest first. Balances of ₹0 or less take no share. */
export function sharesOfTotal(accounts: Account[], snapshots: BalanceSnapshot[], date: string): { account: Account; balance: number; share: number }[] {
  const held = balancesOn(accounts, snapshots, date).filter((h) => h.balance > 0);
  const total = held.reduce((sum, h) => sum + h.balance, 0);
  return held.map((h) => ({ account: h.account, balance: h.balance, share: total > 0 ? h.balance / total : 0 })).sort((a, b) => b.balance - a.balance);
}

// --- Stale, closed, colour ---

/** A balance older than this many days is stale (decision 3: one missed monthly check-in). */
export const STALE_DAYS = 30;

/** Whole days since an account's latest balance, or null when it has none. */
export function daysSinceBalance(snapshots: BalanceSnapshot[], accountId: string, today: string): number | null {
  const latest = balanceOn(snapshots, accountId, today);
  return latest ? daysBetween(latest.date, today) : null;
}

/** An active account whose latest balance is more than 30 days old. An account with no balance yet isn't stale: it has none to read. */
export function isStale(account: Account, snapshots: BalanceSnapshot[], today: string): boolean {
  if (account.status !== "Active") return false;
  const days = daysSinceBalance(snapshots, account.id, today);
  return days !== null && days > STALE_DAYS;
}

/** Closed is Inactive (decision 5): its history stays, and its totals drop to zero. */
export const isClosed = (account: Account): boolean => account.status === "Inactive";

/** The colour an account without one of its own shows: its purpose's, from the Cards tiles' six. */
export const PURPOSE_COLORS: Record<AccountPurpose, CardColor> = {
  Spending: "Sapphire",
  Investment: "Violet",
  "Emergency-Fund": "Teal",
  "Loan-Payments": "Copper",
};

export function accountColor(account: Pick<Account, "color" | "purpose">): CardColor {
  return account.color ?? PURPOSE_COLORS[account.purpose];
}

// --- Saving a balance (decisions 7 and 8) ---

/** The balance already recorded for this account on this day, which a new one replaces (decision 7). The later row, when the Sheet holds two. */
export function sameDayBalance(snapshots: BalanceSnapshot[], accountId: string, date: string): BalanceSnapshot | null {
  let found: BalanceSnapshot | null = null;
  for (const snapshot of snapshots) if (snapshot.accountId === accountId && snapshot.date === date) found = snapshot;
  return found;
}

/** A new balance more than a fifth below the last one asks you to check it (decision 8). It never blocks a save. */
export const BIG_DROP = 0.2;

export function isBigDrop(previous: number | null, next: number): boolean {
  return previous !== null && previous > 0 && next < previous * (1 - BIG_DROP);
}

/** The account's balance before a new one on `date`: the latest strictly earlier, so a same-day replacement is compared with what came before it. */
export function balanceBefore(snapshots: BalanceSnapshot[], accountId: string, date: string): BalanceSnapshot | null {
  return balanceOn(snapshots, accountId, dayBefore(date));
}

/** The month a balance was read in, for "updated this month". */
export const readMonth = (snapshot: Pick<BalanceSnapshot, "date">): string => monthOf(snapshot.date);
