import type { IncomeEntry, IncomeSource, IncomeTag } from "../sheets/types";
import type { MonthKey } from "./cardSpend";
import { pendingPayments, sumAmounts, upcomingPayments } from "./incomeSchedule";

/**
 * Income over time (PRD §8, F-IN-01/02). Money counts on the day it **landed** (`receivedDate`), never the day it
 * was expected; pending and expected payments are shown but never counted. RSU vests and ESPP purchases never
 * appear here: they're investments, not IncomeEntries.
 */

const received = (entries: IncomeEntry[]) => entries.filter((e): e is IncomeEntry & { receivedDate: string } => e.status === "Received" && !!e.receivedDate);

/** Received entries that landed between `from` and `to`, both inclusive. */
export function receivedBetween(entries: IncomeEntry[], from: string, to: string): IncomeEntry[] {
  return received(entries).filter((e) => e.receivedDate >= from && e.receivedDate <= to);
}

export const totalReceivedBetween = (entries: IncomeEntry[], from: string, to: string): number => sumAmounts(receivedBetween(entries, from, to));

export const yearMonths = (year: number): MonthKey[] => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);

export interface IncomeMonth {
  month: MonthKey;
  total: number;
  bySource: Record<string, number>;
  byTag: Record<IncomeTag, number>;
}

/** The twelve months of a year, each with what landed in it, by source and by tag. */
export function incomeByMonth(entries: IncomeEntry[], year: number): IncomeMonth[] {
  const months = yearMonths(year).map((month) => ({ month, total: 0, bySource: {} as Record<string, number>, byTag: { Regular: 0, Bonus: 0, Other: 0 } }));
  for (const e of received(entries)) {
    if (Number(e.receivedDate.slice(0, 4)) !== year) continue;
    const m = months[Number(e.receivedDate.slice(5, 7)) - 1];
    m.total += e.amount;
    m.bySource[e.incomeSourceId] = (m.bySource[e.incomeSourceId] ?? 0) + e.amount;
    m.byTag[e.tag] += e.amount;
  }
  return months;
}

/** How many months of `today`'s year have started, this one included (October → 10). */
export const monthsSoFar = (today: string): number => Number(today.slice(5, 7));

/** The greeting's "about … a month": what landed this year so far ÷ the months so far, this one included. */
export function receivedMonthlyAverage(entries: IncomeEntry[], today: string): number {
  return totalReceivedBetween(entries, `${today.slice(0, 4)}-01-01`, today) / monthsSoFar(today);
}

/** The same day a year earlier; Feb 29 becomes Feb 28. */
export function sameDayLastYear(today: string): string {
  const year = Number(today.slice(0, 4)) - 1;
  const md = today.slice(5);
  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return `${year}-${md === "02-29" && !isLeap(year) ? "02-28" : md}`;
}

export interface AgainstLastYear {
  thisYear: number;
  lastYear: number;
  change: number;
  /** change ÷ last year; undefined when nothing landed last year. */
  ratio?: number;
}

/** Jan 1 to today, against Jan 1 to the same day last year. */
export function againstLastYear(entries: IncomeEntry[], today: string): AgainstLastYear {
  const thisYear = totalReceivedBetween(entries, `${today.slice(0, 4)}-01-01`, today);
  const then = sameDayLastYear(today);
  const lastYear = totalReceivedBetween(entries, `${then.slice(0, 4)}-01-01`, then);
  return { thisYear, lastYear, change: thisYear - lastYear, ratio: lastYear ? (thisYear - lastYear) / lastYear : undefined };
}

export interface FinancialYear {
  /** "FY 2026-27". */
  name: string;
  start: string;
  end: string;
  received: number;
  pending: number;
  /** Each active source's schedule from today to Mar 31, at its usual amount, no bonus assumed. */
  expected: number;
  /** received + pending + expected. */
  projected: number;
  lastYear: { name: string; total: number; sameDay: number };
}

/** India's financial year, April to March, that `today` falls in. */
export function financialYearOf(today: string): { start: string; end: string; name: string } {
  const y = Number(today.slice(0, 4));
  const startYear = Number(today.slice(5, 7)) >= 4 ? y : y - 1;
  return { start: `${startYear}-04-01`, end: `${startYear + 1}-03-31`, name: `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}` };
}

export function financialYear(sources: IncomeSource[], entries: IncomeEntry[], today: string): FinancialYear {
  const fy = financialYearOf(today);
  const prev = financialYearOf(`${Number(fy.start.slice(0, 4)) - 1}-06-01`);
  const receivedSoFar = totalReceivedBetween(entries, fy.start, today);
  const pending = sumAmounts(pendingPayments(sources, entries, today).filter((p) => p.expectedDate >= fy.start));
  const expected = sumAmounts(upcomingPayments(sources, entries, today, fy.end));
  return {
    ...fy,
    received: receivedSoFar,
    pending,
    expected,
    projected: receivedSoFar + pending + expected,
    lastYear: { name: prev.name, total: totalReceivedBetween(entries, prev.start, prev.end), sameDay: totalReceivedBetween(entries, prev.start, sameDayLastYear(today)) },
  };
}

/** Changes under this share of the payment before are ignored (Subscriptions' rule). */
export const PAY_CHANGE_THRESHOLD = 0.02;

export interface PayChange {
  sourceId: string;
  tag: IncomeTag;
  /** The later payment. */
  entryId: string;
  receivedDate: string;
  from: number;
  to: number;
  change: number;
  ratio: number;
}

/** Each payment 2% or more off the one before it from the same source and tag, newest first. */
export function payChanges(entries: IncomeEntry[]): PayChange[] {
  const groups = new Map<string, (IncomeEntry & { receivedDate: string })[]>();
  for (const e of received(entries)) {
    const key = `${e.incomeSourceId}\u0000${e.tag}`;
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }
  const out: PayChange[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.receivedDate.localeCompare(b.receivedDate) || a.expectedDate.localeCompare(b.expectedDate));
    for (let i = 1; i < list.length; i++) {
      const before = list[i - 1].amount, now = list[i];
      if (before <= 0) continue;
      const ratio = (now.amount - before) / before;
      if (Math.abs(ratio) >= PAY_CHANGE_THRESHOLD) out.push({ sourceId: now.incomeSourceId, tag: now.tag, entryId: now.id, receivedDate: now.receivedDate, from: before, to: now.amount, change: now.amount - before, ratio });
    }
  }
  return out.sort((a, b) => b.receivedDate.localeCompare(a.receivedDate));
}

/**
 * Received adding up through the year shown, then from this month on what's still expected on top: payments owed
 * (counted this month, since they haven't landed) and each schedule to December at its usual amount, no bonus.
 * One value per month, null before this month; it ends on the year's projected total.
 */
export function projectedThroughYear(sources: IncomeSource[], entries: IncomeEntry[], today: string): (number | null)[] {
  const year = Number(today.slice(0, 4));
  const now = Number(today.slice(5, 7)) - 1;
  const received = totalReceivedBetween(entries, `${year}-01-01`, today);
  const pending = pendingPayments(sources, entries, today).filter((p) => p.expectedDate.startsWith(String(year)));
  const upcoming = upcomingPayments(sources, entries, today, `${year}-12-31`);
  const months = yearMonths(year);
  const owedEarlier = sumAmounts(pending.filter((p) => p.expectedDate < `${months[now]}-01`));
  let running = received;
  return months.map((month, i) => {
    if (i < now) return null;
    running += (i === now ? owedEarlier : 0) + sumAmounts([...pending, ...upcoming].filter((p) => p.expectedDate.startsWith(month)));
    return running;
  });
}
