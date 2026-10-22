import { balanceOn, isClosed, isStale, periodSpan } from "./accounts";
import { daysBetween, type SpendPeriod } from "./cardSpend";
import type { Account, AccountPurpose, BalanceSnapshot } from "../sheets/types";

/**
 * The Balance history page's list (docs/design/accounts.md, Round 17, layout H1): every recorded
 * balance with what it moved from the one before it and how long since, filtered, sorted, grouped
 * by month and paged. Pure, so it's tested against fixture data.
 *
 * - A balance's change is measured against the account's previous balance, even one from before the
 *   period, so the first row of a period isn't shown as a first balance. Only an account's very
 *   first balance is "first".
 * - "Closing" is a closed account's last balance, which is ₹0 (closing writes one, decision 5).
 * - A month's net is the sum of its changes; first balances move nothing, so they add nothing.
 * - A balance counts in a period by its own date.
 */

export interface HistoryEntry {
  id: string;
  account: Account;
  date: string;
  balance: number;
  previous: number | null;
  /** Balance less the previous one; null for an account's first. */
  delta: number | null;
  /** Whole days since the previous balance. */
  gapDays: number | null;
  first: boolean;
  closing: boolean;
}

/** Every balance of every account, each with its change from the one before. Balances of an account that's gone are left out. */
export function historyEntries(accounts: Account[], snapshots: BalanceSnapshot[]): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  for (const account of accounts) {
    // Stable on equal dates, so two for one day keep the Sheet's order.
    const own = snapshots.map((s, index) => ({ s, index })).filter(({ s }) => s.accountId === account.id).sort((a, b) => (a.s.date === b.s.date ? a.index - b.index : a.s.date < b.s.date ? -1 : 1)).map(({ s }) => s);
    own.forEach((s, i) => {
      const before = own[i - 1];
      entries.push({
        id: s.id,
        account,
        date: s.date,
        balance: s.balance,
        previous: before ? before.balance : null,
        delta: before ? s.balance - before.balance : null,
        gapDays: before ? daysBetween(before.date, s.date) : null,
        first: i === 0,
        closing: isClosed(account) && s.balance === 0 && i === own.length - 1,
      });
    });
  }
  return entries;
}

export const HISTORY_STATUSES = ["all", "rises", "falls", "first"] as const;
export type HistoryStatus = (typeof HISTORY_STATUSES)[number];
export type HistorySort = "newest" | "oldest" | "biggest";

export interface HistoryQuery {
  period: SpendPeriod;
  status: HistoryStatus;
  accountId?: string;
  purpose?: AccountPurpose;
  search?: string;
  sort: HistorySort;
}

const digits = (text: string) => text.replace(/[^\d]/g, "");

/** Whether a search matches an entry: the account's name, bank or last 4 (any case), or an amount, as digits, in its balance or its change. */
function matches(entry: HistoryEntry, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (q === "") return true;
  const { account } = entry;
  if (account.name.toLowerCase().includes(q) || account.bank.toLowerCase().includes(q) || (account.last4 ?? "") === q) return true;
  const wanted = digits(q);
  if (wanted === "" || !/^[\d,.₹\s]+$/.test(q)) return false;
  return String(Math.round(Math.abs(entry.balance))).includes(wanted) || (entry.delta !== null && String(Math.round(Math.abs(entry.delta))).includes(wanted));
}

/** The entries in the period (by their own date), then the account and purpose, then the search: what the status counts are over. */
export function scopeEntries(entries: HistoryEntry[], query: Pick<HistoryQuery, "period" | "accountId" | "purpose" | "search">, today: string): HistoryEntry[] {
  const first = entries.map((e) => e.date).sort()[0] ?? null;
  const span = periodSpan(query.period, today, first);
  return entries.filter((e) => e.date >= span.from && e.date <= span.to && (!query.accountId || e.account.id === query.accountId) && (!query.purpose || e.account.purpose === query.purpose) && matches(e, query.search ?? ""));
}

export function matchesStatus(entry: HistoryEntry, status: HistoryStatus): boolean {
  if (status === "rises") return entry.delta !== null && entry.delta > 0;
  if (status === "falls") return entry.delta !== null && entry.delta < 0;
  if (status === "first") return entry.first || entry.closing;
  return true;
}

export function statusCounts(scoped: HistoryEntry[]): Record<HistoryStatus, number> {
  return { all: scoped.length, rises: scoped.filter((e) => matchesStatus(e, "rises")).length, falls: scoped.filter((e) => matchesStatus(e, "falls")).length, first: scoped.filter((e) => matchesStatus(e, "first")).length };
}

const byDateThenName = (dir: 1 | -1) => (a: HistoryEntry, b: HistoryEntry) => (a.date === b.date ? a.account.name.localeCompare(b.account.name) : a.date < b.date ? -dir : dir);

/** The list as asked: the status, then the order. "Biggest" is the largest move either way first, first balances last. */
export function listEntries(scoped: HistoryEntry[], status: HistoryStatus, sort: HistorySort): HistoryEntry[] {
  const list = scoped.filter((e) => matchesStatus(e, status));
  if (sort === "oldest") return list.sort(byDateThenName(1));
  const size = (e: HistoryEntry) => (e.delta === null ? -1 : Math.abs(e.delta));
  if (sort === "biggest") return list.sort((a, b) => size(b) - size(a) || byDateThenName(-1)(a, b));
  return list.sort(byDateThenName(-1));
}

export interface HistoryGroup {
  /** "2026-10", or "biggest" for the ungrouped list. */
  key: string;
  entries: HistoryEntry[];
  /** The sum of its changes. */
  net: number;
}

/** Consecutive entries of one month together, in the list's order. "Biggest" has no months: one group. */
export function monthGroups(list: HistoryEntry[], sort: HistorySort): HistoryGroup[] {
  const net = (entries: HistoryEntry[]) => entries.reduce((t, e) => t + (e.delta ?? 0), 0);
  if (sort === "biggest") return list.length ? [{ key: "biggest", entries: list, net: net(list) }] : [];
  const groups: HistoryGroup[] = [];
  for (const entry of list) {
    const key = entry.date.slice(0, 7);
    const last = groups.at(-1);
    if (last?.key === key) last.entries.push(entry);
    else groups.push({ key, entries: [entry], net: 0 });
  }
  return groups.map((g) => ({ ...g, net: net(g.entries) }));
}

export const PAGE_SIZE = 12;

export interface Paged<T> {
  items: T[];
  page: number;
  pages: number;
  /** 1-based first and last row shown, 0 when empty. */
  from: number;
  to: number;
  total: number;
}

/** One page of a list, the page number clamped to a real one. */
export function paginate<T>(list: T[], page: number, size = PAGE_SIZE): Paged<T> {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const at = Math.min(Math.max(1, page), pages);
  const items = list.slice((at - 1) * size, at * size);
  return { items, page: at, pages, from: items.length ? (at - 1) * size + 1 : 0, to: (at - 1) * size + items.length, total: list.length };
}

export interface HistorySummary {
  recorded: number;
  rises: number;
  falls: number;
  /** First balances, closing ones and ones that didn't change. */
  other: number;
  /** The largest move in either direction, if any entry has a change. */
  biggest: HistoryEntry | null;
  /** Active accounts whose latest balance is over 30 days old (today, whatever the period). */
  stale: Account[];
  /** Mean days between a balance and the one before it, rounded; null when no entry has one. */
  averageGap: number | null;
}

/** The tiles and sentence: over the entries in the period (and its account and purpose), except what's stale, which is as of today. */
export function historySummary(scoped: HistoryEntry[], accounts: Account[], snapshots: BalanceSnapshot[], today: string): HistorySummary {
  const stats = statusCounts(scoped);
  const moves = scoped.filter((e) => e.delta !== null && e.delta !== 0);
  const biggest = moves.reduce<HistoryEntry | null>((best, e) => (best === null || Math.abs(e.delta!) > Math.abs(best.delta!) ? e : best), null);
  const gaps = scoped.map((e) => e.gapDays).filter((g): g is number => g !== null);
  return {
    recorded: scoped.length,
    rises: stats.rises,
    falls: stats.falls,
    other: scoped.length - stats.rises - stats.falls,
    biggest,
    stale: accounts.filter((a) => isStale(a, snapshots, today) && balanceOn(snapshots, a.id, today) !== null),
    averageGap: gaps.length ? Math.round(gaps.reduce((t, g) => t + g, 0) / gaps.length) : null,
  };
}
