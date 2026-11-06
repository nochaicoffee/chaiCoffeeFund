import type { IncomeEntry, IncomeSource, LentLoan, RecurrenceCycle } from "../sheets/types";
import { daysBetween } from "./cardSpend";
import { LATE_AFTER_DAYS, MATCH_DAYS, nearestScheduledDate, receivedScheduledDates, scheduledDates } from "./incomeSchedule";
import { addMonthsUTC } from "./recurring";
import { addDays } from "./subscriptionRenewals";

/**
 * What a Paid-out lent loan promised and what arrived (docs/design/lent-out.md, task A2; ADR 0014).
 *
 * A Paid-out loan's interest arrives as Income: the loan keeps its income source's id, and whether a payout came is read from
 * that source's entries with the Income page's own rules (`scheduledDates` and `nearestScheduledDate`), so the Lent page and the
 * Income page can never disagree about whether a payout arrived. Nothing here is stored.
 *
 * Each promised day has one verdict:
 * - **On time**: it arrived on the day, early, or within `LATE_AFTER_DAYS` (3) after it.
 * - **Paid late**: it arrived more than 3 days after.
 * - **Overdue**: not here yet, and at most `MISSING_AFTER_DAYS` days past the day.
 * - **Missing**: not here, and more than that past the day.
 * - **Waiting**: the day is today or still to come, and it has not arrived.
 *
 * A payout is promised from **one period after the day the money was lent** (a loan lent on 1 Nov 2025 pays first on 1 Dec 2025),
 * whatever the income source's own schedule says about earlier days.
 */

/**
 * How many days past a payout's day it is still "Overdue" and not yet "Missing". Monthly is 14 (Prathik's answer, 2026-11-06).
 * Quarterly and yearly follow the half-cycle window in which Income still receives a late payment (`MATCH_DAYS` in
 * incomeSchedule.ts), so a payout is never called missing while Income would still match it.
 */
export const MISSING_AFTER_DAYS: Record<RecurrenceCycle, number> = { Monthly: 14, Quarterly: MATCH_DAYS.Quarterly, Yearly: MATCH_DAYS.Yearly };

const STEP_MONTHS: Record<RecurrenceCycle, number> = { Monthly: 1, Quarterly: 3, Yearly: 12 };

export type PayoutVerdict = "On time" | "Paid late" | "Overdue" | "Missing" | "Waiting";

export interface LentPromise {
  /** The day it was promised. */
  date: string;
  /** What arrived, or the income source's usual amount when nothing has. */
  amount: number;
  verdict: PayoutVerdict;
  /** The day it arrived. Only on On time and Paid late. */
  receivedDate?: string;
  /** Days after its day: how late it arrived, or how long it has been overdue or missing. Negative when it came early. */
  daysAfter?: number;
}

export interface LentPromises {
  /** False when the loan has no income source to read, or isn't a Paid-out loan: nothing is promised, and nothing is called missing. */
  linked: boolean;
  /** Every payout promised so far (today included), oldest first. */
  promises: LentPromise[];
  /** Due so far: everything promised that isn't Waiting. */
  promised: number;
  /** What arrived, on time or late. */
  arrived: number;
  /** Past the overdue stretch and still not here. */
  missing: number;
  /** Not here yet, within the overdue stretch. */
  overdue: number;
  /** Overdue plus missing: what the page flags as "not here". It is never added to what the borrower owes. */
  notHere: number;
  /** The next payout still to come (its day after today, or today's if it hasn't arrived). */
  next?: { date: string; amount: number; inDays: number };
}

const NONE: LentPromises = { linked: false, promises: [], promised: 0, arrived: 0, missing: 0, overdue: 0, notHere: 0 };

/** The day of a Paid-out loan's first payout: one period after the day it was lent. */
export function firstPayoutDate(loan: Pick<LentLoan, "startDate" | "payoutFrequency">): string | undefined {
  return loan.payoutFrequency ? addMonthsUTC(loan.startDate, STEP_MONTHS[loan.payoutFrequency]) : undefined;
}

export function lentPromises(loan: LentLoan, source: IncomeSource | undefined, entries: IncomeEntry[], today: string): LentPromises {
  const first = firstPayoutDate(loan);
  if (loan.interestMode !== "Paid-out" || !loan.payoutFrequency || !first || !source?.scheduleDate) return NONE;

  // A repaid loan promises nothing after its closing day.
  const until = loan.status === "Repaid" && loan.closedDate && loan.closedDate < today ? loan.closedDate : today;

  // The regular payments received, each filed under the scheduled day nearest its expected day (as Income does). One day takes the first.
  const arrivedOn = new Map<string, IncomeEntry>();
  const received = entries
    .filter((e) => e.incomeSourceId === source.id && e.tag === "Regular" && e.status === "Received" && !!e.receivedDate)
    .sort((a, b) => (a.receivedDate as string).localeCompare(b.receivedDate as string));
  for (const e of received) {
    const day = nearestScheduledDate(source, e.expectedDate) ?? e.expectedDate;
    if (!arrivedOn.has(day)) arrivedOn.set(day, e);
  }

  const missingAfter = MISSING_AFTER_DAYS[loan.payoutFrequency];
  const promises: LentPromise[] = scheduledDates(source, first, until).map((date): LentPromise => {
    const entry = arrivedOn.get(date);
    if (entry?.receivedDate) {
      const daysAfter = daysBetween(date, entry.receivedDate);
      return { date, amount: entry.amount, verdict: daysAfter > LATE_AFTER_DAYS ? "Paid late" : "On time", receivedDate: entry.receivedDate, daysAfter };
    }
    const daysAfter = daysBetween(date, today);
    if (daysAfter <= 0) return { date, amount: source.expectedAmount, verdict: "Waiting" };
    return { date, amount: source.expectedAmount, verdict: daysAfter > missingAfter ? "Missing" : "Overdue", daysAfter };
  });

  const total = (verdicts: PayoutVerdict[]) => promises.filter((p) => verdicts.includes(p.verdict)).reduce((t, p) => t + p.amount, 0);
  const missing = total(["Missing"]);
  const overdue = total(["Overdue"]);
  const upcoming = scheduledDates(source, today, addMonthsUTC(addDays(today, 1), 13)).filter((d) => d >= first && !arrivedOn.has(d));
  const nextDate = loan.status === "Repaid" ? undefined : upcoming[0];

  return {
    linked: true,
    promises,
    promised: total(["On time", "Paid late", "Overdue", "Missing"]),
    arrived: total(["On time", "Paid late"]),
    missing,
    overdue,
    notHere: missing + overdue,
    next: nextDate ? { date: nextDate, amount: source.expectedAmount, inDays: daysBetween(today, nextDate) } : undefined,
  };
}

export interface UpcomingPayout {
  date: string;
  amount: number;
  /** Days from today: 0 for today's, which hasn't arrived. */
  inDays: number;
}

/**
 * The payouts of a linked Paid-out loan still to come: each day from today (today's included while it hasn't arrived) to `until`, from its
 * first payout on, that Income hasn't received. A repaid loan has none. Uses the income source's own schedule and matching, as `lentPromises` does.
 */
export function upcomingPayouts(loan: LentLoan, source: IncomeSource | undefined, entries: IncomeEntry[], today: string, until: string): UpcomingPayout[] {
  const first = firstPayoutDate(loan);
  if (loan.interestMode !== "Paid-out" || loan.status === "Repaid" || !first || !source?.scheduleDate) return [];
  const received = receivedScheduledDates(source, entries);
  return scheduledDates(source, today > first ? today : first, until)
    .filter((date) => !received.has(date))
    .map((date) => ({ date, amount: source.expectedAmount, inDays: daysBetween(today, date) }));
}
