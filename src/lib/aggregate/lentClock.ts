import { addDays } from "./subscriptionRenewals";
import { daysBetween } from "./cardSpend";
import { dailyEarnings, interestAccrued, summariseLentLoan } from "./lentOut";
import type { LentPromises } from "./lentPromises";
import type { LentLoan, LentRepayment } from "../sheets/types";

/**
 * The interest clock: what the lent money earns, and how it adds up (docs/design/lent-out.md, task A4). Pure and never stored.
 *
 * - A day, a month and a year are **at today's pace** (what the principal still out earns): a month is a twelfth of a year, a year is 365 days.
 * - **All time** is what has really come due. An Accruing loan's interest is what has piled up (`interestAccrued`). A Paid-out loan's is what it has
 *   promised so far (`LentPromises.promised`: every payout due, so a missing one is in "earned" and out of "received"). `received` is what has reached
 *   him (interest paid on an Accruing loan, payouts that arrived on a Paid-out one); `notYet` is the difference. A missing payout is also a mark on the
 *   chart. None of it is added to what a borrower owes (ADR 0014).
 * - The payouts come from `lentPromises`, one result per Paid-out loan, keyed by the loan's id. A loan with none is not linked and has earned nothing yet.
 */

export interface ClockLoan {
  loan: LentLoan;
  /** What it earns a day (`dailyEarnings`). */
  perDay: number;
  /** Its part of the daily earnings, 0 to 1. */
  share: number;
  /** Interest come due so far, and what of it reached him. */
  earned: number;
  received: number;
}

export interface LentClock {
  /** Earnings at today's pace. */
  pace: { day: number; month: number; year: number };
  /** Loans still earning something, earning most first. A loan marked Active whose principal has all come back earns nothing and isn't drawn. */
  loans: ClockLoan[];
  /** Over every loan, repaid ones too: it is what has really come due. */
  allTime: { earned: number; received: number; notYet: number };
  /** The loans whose interest builds up and is paid with the principal: what has piled up unpaid, and how fast it grows. */
  pot: { owed: number; perDay: number; perHour: number };
  /** The payout loans' promises added up. `notHere` is overdue plus missing. */
  lumps: { promised: number; arrived: number; missing: number; overdue: number; notHere: number };
}

const NO_PROMISES: Pick<LentPromises, "promised" | "arrived" | "missing" | "overdue" | "notHere"> = { promised: 0, arrived: 0, missing: 0, overdue: 0, notHere: 0 };

export function lentClock(loans: LentLoan[], repayments: LentRepayment[], promises: Record<string, LentPromises>, asOfDate: string): LentClock {
  const earnedOf = (loan: LentLoan) => (loan.interestMode === "Accruing" ? interestAccrued(loan, repayments, asOfDate) : (promises[loan.id] ?? NO_PROMISES).promised);
  const receivedOf = (loan: LentLoan) => (loan.interestMode === "Accruing" ? summariseLentLoan(loan, repayments, asOfDate).interestPaid : (promises[loan.id] ?? NO_PROMISES).arrived);

  const out = loans.filter((l) => l.status !== "Repaid");
  const perDay = out.reduce((t, l) => t + dailyEarnings(l, repayments, asOfDate), 0);
  const rows: ClockLoan[] = out
    .filter((l) => dailyEarnings(l, repayments, asOfDate) > 0)
    .map((loan) => {
      const d = dailyEarnings(loan, repayments, asOfDate);
      return { loan, perDay: d, share: perDay > 0 ? d / perDay : 0, earned: earnedOf(loan), received: receivedOf(loan) };
    })
    .sort((a, b) => b.perDay - a.perDay || a.loan.id.localeCompare(b.loan.id));

  const earned = loans.reduce((t, l) => t + earnedOf(l), 0);
  const received = loans.reduce((t, l) => t + receivedOf(l), 0);

  const accruing = out.filter((l) => l.interestMode === "Accruing");
  const potPerDay = accruing.reduce((t, l) => t + dailyEarnings(l, repayments, asOfDate), 0);

  const payout = loans.filter((l) => l.interestMode === "Paid-out").map((l) => promises[l.id] ?? NO_PROMISES);
  const sum = (key: keyof typeof NO_PROMISES) => payout.reduce((t, p) => t + p[key], 0);

  return {
    pace: { day: perDay, month: (perDay * 365) / 12, year: perDay * 365 },
    loans: rows,
    allTime: { earned, received, notYet: earned - received },
    pot: { owed: accruing.reduce((t, l) => t + summariseLentLoan(l, repayments, asOfDate).interestOwed, 0), perDay: potPerDay, perHour: potPerDay / 24 },
    lumps: { promised: sum("promised"), arrived: sum("arrived"), missing: sum("missing"), overdue: sum("overdue"), notHere: sum("notHere") },
  };
}

/** Interest come due on `date`: an Accruing loan's pile; a Paid-out loan's payouts promised by then, a Waiting one not yet. */
export function earnedOn(loan: LentLoan, repayments: LentRepayment[], promises: LentPromises | undefined, date: string): number {
  if (loan.interestMode === "Accruing") return interestAccrued(loan, repayments, date);
  return (promises?.promises ?? []).filter((p) => p.date <= date && p.verdict !== "Waiting").reduce((t, p) => t + p.amount, 0);
}

export interface ClockPoint {
  date: string;
  total: number;
  byLoan: Record<string, number>;
}

/** Evenly spaced days from `from` to `to`, both included (at least two); just `from` when `to` is not after it. */
export function evenDates(from: string, to: string, count: number): string[] {
  if (to <= from) return [from];
  const n = Math.max(2, Math.floor(count));
  const span = daysBetween(from, to);
  const dates = Array.from({ length: n }, (_, i) => addDays(from, Math.round((span * i) / (n - 1))));
  return dates.filter((d, i) => i === 0 || d !== dates[i - 1]);
}

/** The chart of interest adding up: for each date, what each loan had come due by then and all of it together. */
export function interestSeries(loans: LentLoan[], repayments: LentRepayment[], promises: Record<string, LentPromises>, dates: string[]): ClockPoint[] {
  return dates.map((date) => {
    const byLoan: Record<string, number> = {};
    let total = 0;
    for (const loan of loans) {
      const v = earnedOn(loan, repayments, promises[loan.id], date);
      byLoan[loan.id] = v;
      total += v;
    }
    return { date, total, byLoan };
  });
}

export interface MissedMark {
  loanId: string;
  date: string;
  amount: number;
  /** A payout that never came (Missing), or one that hasn't yet but is within its overdue stretch. */
  kind: "Missing" | "Overdue";
}

/** The payouts that are not here, to mark on the chart: a red cross each. */
export function missedMarks(promises: Record<string, LentPromises>): MissedMark[] {
  const marks: MissedMark[] = [];
  for (const [loanId, p] of Object.entries(promises)) {
    for (const promise of p.promises) if (promise.verdict === "Missing" || promise.verdict === "Overdue") marks.push({ loanId, date: promise.date, amount: promise.amount, kind: promise.verdict });
  }
  return marks.sort((a, b) => a.date.localeCompare(b.date) || a.loanId.localeCompare(b.loanId));
}
