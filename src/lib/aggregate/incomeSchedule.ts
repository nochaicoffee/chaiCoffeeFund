import type { IncomeEntry, IncomeFrequency, IncomeSource } from "../sheets/types";
import { daysBetween } from "./cardSpend";
import { addMonthsUTC } from "./recurring";
import { addDays } from "./subscriptionRenewals";

/**
 * Pending and upcoming income, worked out from each source's schedule and never stored (PRD §8, F-IN-01/02).
 * An IncomeEntries row is only written once money has landed; everything still to come is computed here.
 *
 * Rules (confirmed by Prathik 2026-10-24):
 * - A source's schedule counts from its `scheduleDate` both ways, in steps of its frequency. A one-time source's
 *   only date is its `scheduleDate`.
 * - A scheduled date is **received** by an entry for that source, tagged Regular, whose expected date is that
 *   scheduled date or nearer to it than to any other, within half a cycle (an entry saying "expected Sep 30" receives
 *   the Oct 1 salary). A Bonus or Other entry never fills in a regular payment.
 * - **Pending**: a scheduled date of an active source that has passed (from the day after) and isn't received,
 *   and that falls after the source's latest received regular payment. A source with nothing received yet counts
 *   from its `scheduleDate`. Older gaps are history, never pending.
 * - **Upcoming**: a scheduled date of an active source from today on, not already received, at its usual amount.
 * - **Late**: received more than 3 days after it was expected.
 */

export const LATE_AFTER_DAYS = 3;

const STEP_MONTHS: Record<Exclude<IncomeFrequency, "One-Time">, number> = { Monthly: 1, Quarterly: 3, Yearly: 12 };
/** How far an entry's expected date can be from a scheduled date and still receive it: half a cycle. */
const MATCH_DAYS: Record<IncomeFrequency, number> = { Monthly: 15, Quarterly: 45, Yearly: 182, "One-Time": 182 };

export interface ExpectedPayment {
  sourceId: string;
  expectedDate: string;
  /** The source's usual amount: what it's expected to pay, not what it paid. */
  amount: number;
}

export interface PendingPayment extends ExpectedPayment {
  /** Days since it was expected; at least 1. */
  daysLate: number;
}

/** Days between when it was expected and when it landed: negative if early. Undefined until received. */
export function daysAfterExpected(entry: IncomeEntry): number | undefined {
  return entry.receivedDate ? daysBetween(entry.expectedDate, entry.receivedDate) : undefined;
}

/** Received more than 3 days after it was expected. */
export function isLate(entry: IncomeEntry): boolean {
  const days = daysAfterExpected(entry);
  return days !== undefined && days > LATE_AFTER_DAYS;
}

/**
 * Every scheduled date of a source from `from` to `to`, both inclusive, oldest first. Each date counts from the
 * schedule date itself (as `nextOccurrence` does), so a schedule on the 31st comes back to the 31st after a short month.
 */
export function scheduledDates(source: Pick<IncomeSource, "frequency" | "scheduleDate">, from: string, to: string): string[] {
  const anchor = source.scheduleDate;
  if (!anchor || from > to) return [];
  if (source.frequency === "One-Time") return anchor >= from && anchor <= to ? [anchor] : [];
  const step = STEP_MONTHS[source.frequency];
  // Start a step before `from` (whole months apart, rounded down) and walk forward.
  const monthsApart = (Number(from.slice(0, 4)) - Number(anchor.slice(0, 4))) * 12 + (Number(from.slice(5, 7)) - Number(anchor.slice(5, 7)));
  let i = Math.floor(monthsApart / step) - 1;
  const dates: string[] = [];
  for (let guard = 0; guard < 10_000; guard++, i++) {
    const date = addMonthsUTC(anchor, i * step);
    if (date > to) break;
    if (date >= from) dates.push(date);
  }
  return dates;
}

const isReceived = (e: IncomeEntry) => e.status === "Received" && !!e.receivedDate;

/**
 * The scheduled dates a source's regular payments have been received for: each Regular entry receives the scheduled
 * date nearest its expected date, within half a cycle. An entry with none that near receives its own expected date,
 * so it still marks how far the source has been paid.
 */
export function receivedScheduledDates(source: IncomeSource, entries: IncomeEntry[]): Set<string> {
  const out = new Set<string>();
  for (const e of entries) {
    if (e.incomeSourceId !== source.id || e.tag !== "Regular" || !isReceived(e)) continue;
    out.add(nearestScheduledDate(source, e.expectedDate) ?? e.expectedDate);
  }
  return out;
}

/** The source's scheduled date nearest `date`, within half a cycle; the earlier on a tie. Undefined when none is that near. */
export function nearestScheduledDate(source: Pick<IncomeSource, "frequency" | "scheduleDate">, date: string): string | undefined {
  const window = MATCH_DAYS[source.frequency];
  return scheduledDates(source, addDays(date, -window), addDays(date, window)).sort((a, b) => Math.abs(daysBetween(a, date)) - Math.abs(daysBetween(b, date)) || a.localeCompare(b))[0];
}

/** Pending payments across active sources, oldest first. */
export function pendingPayments(sources: IncomeSource[], entries: IncomeEntry[], today: string): PendingPayment[] {
  const out: PendingPayment[] = [];
  for (const s of sources) {
    if (s.status !== "Active" || !s.scheduleDate) continue;
    const received = receivedScheduledDates(s, entries);
    const latest = [...received].sort().at(-1);
    // After the latest received regular payment, or from the schedule date when there's none.
    const from = latest ? addDays(latest, 1) : s.scheduleDate;
    for (const date of scheduledDates(s, from, addDays(today, -1))) {
      if (!received.has(date)) out.push({ sourceId: s.id, expectedDate: date, amount: s.expectedAmount, daysLate: daysBetween(date, today) });
    }
  }
  return out.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate) || a.sourceId.localeCompare(b.sourceId));
}

/** Upcoming payments across active sources from today to `until`, both inclusive, soonest first. */
export function upcomingPayments(sources: IncomeSource[], entries: IncomeEntry[], today: string, until: string): ExpectedPayment[] {
  const out: ExpectedPayment[] = [];
  for (const s of sources) {
    if (s.status !== "Active" || !s.scheduleDate) continue;
    const received = receivedScheduledDates(s, entries);
    for (const date of scheduledDates(s, today, until)) {
      if (!received.has(date)) out.push({ sourceId: s.id, expectedDate: date, amount: s.expectedAmount });
    }
  }
  return out.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate) || a.sourceId.localeCompare(b.sourceId));
}

/** A source's next payment: its oldest pending one, else its next upcoming one within a year and a day. */
export function nextPayment(source: IncomeSource, entries: IncomeEntry[], today: string): (ExpectedPayment & { pending: boolean }) | undefined {
  const pending = pendingPayments([source], entries, today)[0];
  if (pending) return { ...pending, pending: true };
  const upcoming = upcomingPayments([source], entries, today, addMonthsUTC(addDays(today, 1), 12))[0];
  return upcoming && { ...upcoming, pending: false };
}

export const sumAmounts = (payments: { amount: number }[]): number => payments.reduce((t, p) => t + p.amount, 0);

export interface OnTimeSummary {
  /** Regular and one-off payments received; bonuses don't have a fixed day, so they're left out. */
  count: number;
  onTime: number;
  /** How many days after expected they landed, on average; an early one counts as on the day. */
  averageDaysAfter: number;
}

/** How often payments land on time (within 3 days of expected), for the cover's On time figure. */
export function onTimeSummary(entries: IncomeEntry[]): OnTimeSummary {
  const landed = entries.filter((e) => isReceived(e) && e.tag !== "Bonus");
  if (landed.length === 0) return { count: 0, onTime: 0, averageDaysAfter: 0 };
  return {
    count: landed.length,
    onTime: landed.filter((e) => !isLate(e)).length,
    averageDaysAfter: landed.reduce((t, e) => t + Math.max(0, daysAfterExpected(e) ?? 0), 0) / landed.length,
  };
}
