import { daysBetween } from "./cardSpend";
import type { LentLoan, LentRepayment, RecurrenceCycle } from "../sheets/types";

const PERIODS_PER_YEAR: Record<RecurrenceCycle, number> = { Monthly: 12, Quarterly: 4, Yearly: 1 };

/**
 * The loan's yearly simple-interest rate in percent. An Accruing loan states it. A Paid-out loan is
 * known by what it pays, so its rate is that amount a year over the principal: ₹6,000 a month on
 * ₹3,00,000 is 24%, ₹18,000 a quarter on ₹1,82,000 is about 39.6%.
 */
export function annualRatePercent(loan: LentLoan): number {
  if (loan.interestMode === "Accruing") return loan.interestRate ?? 0;
  if (loan.payoutAmount === undefined || loan.payoutFrequency === undefined) return 0;
  return ((loan.payoutAmount * PERIODS_PER_YEAR[loan.payoutFrequency]) / loan.principalAmount) * 100;
}

function repaymentsOf(loan: LentLoan, repayments: LentRepayment[], asOfDate: string): LentRepayment[] {
  return repayments.filter((r) => r.lentLoanId === loan.id && r.date <= asOfDate);
}

/** The day interest stops: the day a repaid loan closed, else the day asked about. A repaid loan with no closing day stops at the day asked about. */
function accrualEnd(loan: LentLoan, asOfDate: string): string {
  return loan.status === "Repaid" && loan.closedDate && loan.closedDate < asOfDate ? loan.closedDate : asOfDate;
}

/** How much of the principal is still with the borrower on `asOfDate`. A loan marked Repaid is nothing from its closing day on, and counts as usual before it. */
export function principalOutstanding(loan: LentLoan, repayments: LentRepayment[], asOfDate: string): number {
  if (asOfDate < loan.startDate) return 0;
  if (loan.status === "Repaid" && (!loan.closedDate || asOfDate >= loan.closedDate)) return 0;
  const paid = repaymentsOf(loan, repayments, asOfDate)
    .filter((r) => r.kind === "Principal")
    .reduce((total, r) => total + r.amount, 0);
  return Math.max(0, loan.principalAmount - paid);
}

/**
 * Simple interest earned so far on an Accruing loan, never compounded: for each stretch of days the
 * principal still out, `principal × rate × days / 365`. Principal paid back stops earning from the day
 * it is paid. A Paid-out loan accrues nothing here: its interest arrives as income on its schedule.
 */
export function interestAccrued(loan: LentLoan, repayments: LentRepayment[], asOfDate: string): number {
  if (loan.interestMode !== "Accruing") return 0;
  const end = accrualEnd(loan, asOfDate);
  if (end <= loan.startDate) return 0;
  const rate = (loan.interestRate ?? 0) / 100;

  const principalPaid = repaymentsOf(loan, repayments, end)
    .filter((r) => r.kind === "Principal")
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let outstanding = loan.principalAmount;
  let from = loan.startDate;
  let interest = 0;
  for (const payment of principalPaid) {
    const to = payment.date < loan.startDate ? loan.startDate : payment.date;
    interest += (outstanding * rate * daysBetween(from, to)) / 365;
    outstanding = Math.max(0, outstanding - payment.amount);
    from = to;
  }
  interest += (outstanding * rate * daysBetween(from, end)) / 365;
  return interest;
}

/** Interest an Accruing loan's borrower has already paid, as recorded. */
export function interestPaid(loan: LentLoan, repayments: LentRepayment[], asOfDate: string): number {
  return repaymentsOf(loan, repayments, asOfDate)
    .filter((r) => r.kind === "Interest")
    .reduce((total, r) => total + r.amount, 0);
}

/**
 * What the principal still out earns in a day at the loan's rate: `principal still out × rate ÷ 365`. A Paid-out loan's rate is worked
 * out from what it pays, so this is its payout spread over the days. Zero once the loan is repaid, and from the day principal comes back
 * it falls with it.
 */
export function dailyEarnings(loan: LentLoan, repayments: LentRepayment[], asOfDate: string): number {
  return (principalOutstanding(loan, repayments, asOfDate) * annualRatePercent(loan)) / 100 / 365;
}

export interface LentLoanSummary {
  loan: LentLoan;
  annualRatePercent: number;
  principalOutstanding: number;
  interestAccrued: number;
  interestPaid: number;
  /** Accrued interest not yet paid: never below zero, so an overpayment doesn't turn into a debt. */
  interestOwed: number;
  /** Principal still out plus the interest still owed: what the borrower would hand over today. 0 for a repaid loan. */
  owedToday: number;
}

export function summariseLentLoan(loan: LentLoan, repayments: LentRepayment[], asOfDate: string): LentLoanSummary {
  const outstanding = principalOutstanding(loan, repayments, asOfDate);
  const accrued = interestAccrued(loan, repayments, asOfDate);
  const paid = interestPaid(loan, repayments, asOfDate);
  // From its closing day a repaid loan owes nothing, whatever its rows say.
  const closed = loan.status === "Repaid" && (!loan.closedDate || asOfDate >= loan.closedDate);
  const owed = closed ? 0 : Math.max(0, accrued - paid);
  return {
    loan,
    annualRatePercent: annualRatePercent(loan),
    principalOutstanding: outstanding,
    interestAccrued: accrued,
    interestPaid: paid,
    interestOwed: owed,
    owedToday: outstanding + owed,
  };
}

/** Everything the borrowers still owe: principal out plus interest owed, across every loan. */
export function totalLentOut(loans: LentLoan[], repayments: LentRepayment[], asOfDate: string): number {
  return loans.reduce((total, loan) => total + summariseLentLoan(loan, repayments, asOfDate).owedToday, 0);
}
