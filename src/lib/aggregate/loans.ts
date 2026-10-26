import { round2 } from "../schedule/generateInstallments";
import { prepaymentCharge, rebuildSchedule, type Rebuild } from "../schedule/prepayments";
import type { CardColor, Loan, LoanCategory, LoanInstallment, LoanPrepayment, LoanPrepaymentEffect, PrepaymentEffect } from "../sheets/types";
import { daysBetween } from "./cardSpend";
import { addMonthsUTC } from "./recurring";

export interface LoanSummary {
  loan: Loan;
  outstandingBalance: number;
  totalPaid: number;
  nextDueInstallment: LoanInstallment | null;
}

function installmentsForLoan(loanId: string, installments: LoanInstallment[]): LoanInstallment[] {
  return installments.filter((i) => i.loanId === loanId);
}

/**
 * What actually reached the account: the loan amount less the processing fee,
 * stamp duty and pre-EMI interest the bank takes out of the disbursal. The EMIs
 * are still on the full loan amount.
 */
export function netDisbursedAmount(loan: Pick<Loan, "principalAmount" | "processingFee" | "stampDuty" | "preEmiInterest">): number {
  return Math.round((loan.principalAmount - loan.processingFee - loan.stampDuty - loan.preEmiInterest) * 100) / 100;
}

/** Remaining principal: the sum of principalDue across installments not yet paid. */
export function outstandingBalance(loanId: string, installments: LoanInstallment[]): number {
  return installmentsForLoan(loanId, installments)
    .filter((i) => i.status === "Pending")
    .reduce((sum, i) => sum + i.principalDue, 0);
}

/** What's actually been paid so far, from the real amountPaid on each settled installment. */
export function totalPaid(loanId: string, installments: LoanInstallment[]): number {
  return installmentsForLoan(loanId, installments)
    .filter((i) => i.status === "Paid")
    .reduce((sum, i) => sum + (i.amountPaid ?? 0), 0);
}

export function nextDueInstallment(loanId: string, installments: LoanInstallment[]): LoanInstallment | null {
  const pending = installmentsForLoan(loanId, installments)
    .filter((i) => i.status === "Pending")
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  return pending[0] ?? null;
}

export function computeLoanSummaries(loans: Loan[], installments: LoanInstallment[]): LoanSummary[] {
  return loans.map((loan) => ({
    loan,
    outstandingBalance: outstandingBalance(loan.id, installments),
    totalPaid: totalPaid(loan.id, installments),
    nextDueInstallment: nextDueInstallment(loan.id, installments),
  }));
}

/** Sum of outstanding balances across active loans — the loan liability term in net worth. */
export function totalLoanOutstanding(loans: Loan[], installments: LoanInstallment[]): number {
  return loans
    .filter((l) => l.status === "Active")
    .reduce((sum, l) => sum + outstandingBalance(l.id, installments), 0);
}

/** This month's EMI total across active loans — feeds the "monthly obligations" tile. */
export function totalDueThisMonth(loans: Loan[], installments: LoanInstallment[], yearMonth: string): number {
  const activeLoanIds = new Set(loans.filter((l) => l.status === "Active").map((l) => l.id));
  return installments
    .filter((i) => activeLoanIds.has(i.loanId) && i.status === "Pending" && i.dueDate.startsWith(yearMonth))
    .reduce((sum, i) => sum + i.totalDue, 0);
}

// ---------- The Loans page (docs/design/loans.md) ----------

const CATEGORY_COLORS: Record<LoanCategory, CardColor> = { Home: "Sapphire", Auto: "Copper", Personal: "Violet", Other: "Teal" };

/** The loan's colour: its own, else its category's. */
export function loanColor(loan: Pick<Loan, "color" | "category">): CardColor {
  return loan.color ?? CATEGORY_COLORS[loan.category];
}

/** What a prepayment usually does on the loan: its own setting, else reduce the tenure. */
export function usualEffect(loan: Pick<Loan, "prepaymentEffect">): LoanPrepaymentEffect {
  return loan.prepaymentEffect ?? "Reduce-Tenure";
}

const sum = (values: number[]) => round2(values.reduce((total, v) => total + v, 0));
const byNumber = (a: LoanInstallment, b: LoanInstallment) => a.installmentNumber - b.installmentNumber;

/** Paid after its due date. Any day late counts (docs/design/loans.md, open decision 5). */
export function isLate(installment: Pick<LoanInstallment, "status" | "paidDate" | "dueDate">): boolean {
  return installment.status === "Paid" && !!installment.paidDate && installment.paidDate > installment.dueDate;
}

/** The EMI as it stands: the next pending installment's, unless that's the last (which only repays what's left). */
export function currentEmi(installments: LoanInstallment[]): number {
  const sorted = [...installments].sort(byNumber);
  const pending = sorted.filter((i) => i.status === "Pending");
  const regular = pending.find((i) => i.installmentNumber !== sorted.at(-1)?.installmentNumber);
  return (regular ?? pending[0] ?? sorted[0])?.totalDue ?? 0;
}

export interface LoanFacts {
  loan: Loan;
  /** Its installments, in order. */
  installments: LoanInstallment[];
  prepayments: LoanPrepayment[];
  count: number;
  paidCount: number;
  /** Pending installments. */
  left: number;
  emi: number;
  /** Principal of every installment not yet paid. */
  outstanding: number;
  /** The loan amount less what's still owed: EMIs' principal and prepayments. */
  principalRepaid: number;
  /** Principal repaid over principal borrowed. */
  repaidShare: number;
  /** Installments paid over installments in the loan: how far through its term it is. */
  termShare: number;
  interestPaid: number;
  interestLeft: number;
  /** All the schedule's interest, paid and to come (pre-EMI interest is apart). */
  interestTotal: number;
  /** Processing fee, stamp duty and prepayment charges. */
  charges: number;
  prepaid: number;
  prepaymentCharges: number;
  /** What's actually been paid on EMIs, with any overdue charges. */
  totalPaid: number;
  lateCount: number;
  lateCharges: number;
  next: LoanInstallment | null;
  /** The last installment's due date. */
  end: string;
}

export function loanFacts(loan: Loan, allInstallments: LoanInstallment[], allPrepayments: LoanPrepayment[]): LoanFacts {
  const installments = allInstallments.filter((i) => i.loanId === loan.id).sort(byNumber);
  const prepayments = allPrepayments.filter((p) => p.loanId === loan.id).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const paid = installments.filter((i) => i.status === "Paid");
  const pending = installments.filter((i) => i.status === "Pending");
  const outstanding = sum(pending.map((i) => i.principalDue));
  const principalRepaid = round2(loan.principalAmount - outstanding);
  const interestTotal = sum(installments.map((i) => i.interestDue));
  const prepaymentCharges = sum(prepayments.map((p) => p.charge));
  return {
    loan,
    installments,
    prepayments,
    count: installments.length,
    paidCount: paid.length,
    left: pending.length,
    emi: currentEmi(installments),
    outstanding,
    principalRepaid,
    repaidShare: loan.principalAmount > 0 ? principalRepaid / loan.principalAmount : 0,
    termShare: installments.length > 0 ? paid.length / installments.length : 0,
    interestPaid: sum(paid.map((i) => i.interestDue)),
    interestLeft: sum(pending.map((i) => i.interestDue)),
    interestTotal,
    charges: round2(loan.processingFee + loan.stampDuty + prepaymentCharges),
    prepaid: sum(prepayments.map((p) => p.amount)),
    prepaymentCharges,
    totalPaid: sum(paid.map((i) => i.amountPaid ?? i.totalDue)),
    lateCount: paid.filter(isLate).length,
    lateCharges: sum(paid.map((i) => i.overdueCharge ?? 0)),
    next: pending[0] ?? null,
    end: installments.at(-1)?.dueDate ?? loan.firstEmiDate,
  };
}

export interface BookFacts {
  /** The active loans' facts. */
  loans: LoanFacts[];
  owed: number;
  borrowed: number;
  principalRepaid: number;
  repaidShare: number;
  emi: number;
  interestPaid: number;
  interestLeft: number;
  interestTotal: number;
  preEmiInterest: number;
  charges: number;
  /** What reached the accounts: each loan less its fee, stamp duty and pre-EMI interest. */
  netDisbursed: number;
  /** The last due date across them: debt-free. Null with none. */
  debtFree: string | null;
  /** The earliest pending installment across them. */
  next: LoanInstallment | null;
  lateCount: number;
  lateCharges: number;
}

/** The sums across active loans (closed ones are done: nothing owed, nothing to come). */
export function bookFacts(facts: LoanFacts[]): BookFacts {
  const active = facts.filter((f) => f.loan.status === "Active");
  const borrowed = sum(active.map((f) => f.loan.principalAmount));
  const owed = sum(active.map((f) => f.outstanding));
  const nexts = active.map((f) => f.next).filter((n): n is LoanInstallment => n !== null).sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
  return {
    loans: active,
    owed,
    borrowed,
    principalRepaid: round2(borrowed - owed),
    repaidShare: borrowed > 0 ? (borrowed - owed) / borrowed : 0,
    emi: sum(active.map((f) => f.emi)),
    interestPaid: sum(active.map((f) => f.interestPaid)),
    interestLeft: sum(active.map((f) => f.interestLeft)),
    interestTotal: sum(active.map((f) => f.interestTotal)),
    preEmiInterest: sum(active.map((f) => f.loan.preEmiInterest)),
    charges: sum(active.map((f) => f.charges)),
    netDisbursed: sum(active.map((f) => netDisbursedAmount(f.loan))),
    debtFree: active.length > 0 ? active.map((f) => f.end).sort().at(-1)! : null,
    next: nexts[0] ?? null,
    lateCount: active.reduce((n, f) => n + f.lateCount, 0),
    lateCharges: sum(active.map((f) => f.lateCharges)),
  };
}

/** Whole months from `from` to `to` (a month counts once its day is reached), then the days left over. */
export function timeUntil(from: string, to: string): { years: number; months: number; days: number; totalMonths: number } {
  let months = 0;
  while (addMonthsUTC(from, months + 1) <= to) months++;
  return { years: Math.floor(months / 12), months: months % 12, days: Math.max(0, daysBetween(addMonthsUTC(from, months), to)), totalMonths: months };
}

/** What's due in each month (`YYYY-MM`), principal and interest, from the installments given. */
export function splitByMonth(installments: LoanInstallment[]): Map<string, { principal: number; interest: number }> {
  const months = new Map<string, { principal: number; interest: number }>();
  for (const i of installments) {
    const key = i.dueDate.slice(0, 7);
    const m = months.get(key) ?? { principal: 0, interest: 0 };
    months.set(key, { principal: round2(m.principal + i.principalDue), interest: round2(m.interest + i.interestDue) });
  }
  return months;
}

// ---------- EMI load: the share of salary that goes to EMIs (a proposed figure; the zones are placeholders) ----------

export type LoadZone = "Comfortable" | "Stretched" | "Heavy";

/** Under 30% is comfortable, 30 to 40% stretched, over 40% heavy (placeholders, docs/design/loans.md). */
export function loadZone(share: number): LoadZone {
  return share < 0.3 ? "Comfortable" : share <= 0.4 ? "Stretched" : "Heavy";
}

// ---------- Prepayments: a what-if, and the bank's limits ----------

export interface WhatIf extends Rebuild {
  charge: number;
  /** What leaves today: the principal, the odd days' interest when it closes the loan, and the charge as its own debit. */
  payToday: number;
  /** The last due date after it (the prepayment's own date when it closes the loan). */
  end: string;
  endBefore: string;
}

/** A prepayment of `amount` on `date` with `effect`, on the stored schedule: what it would change. An estimate (see rebuildSchedule). */
export function whatIfPrepayment(loan: Loan, installments: LoanInstallment[], amount: number, effect: PrepaymentEffect, date: string): WhatIf {
  const rows = installments.filter((i) => i.loanId === loan.id);
  const rebuild = rebuildSchedule(loan, rows, { date, amount, effect });
  const charge = prepaymentCharge(loan, rebuild.amount);
  return {
    ...rebuild,
    charge,
    payToday: round2(rebuild.amount + (rebuild.closes ? rebuild.dayInterest : 0) + charge),
    end: rebuild.added.at(-1)?.dueDate ?? date,
    endBefore: rebuild.removed.at(-1)?.dueDate ?? date,
  };
}

export interface LimitCheck {
  rule: string;
  ok: boolean;
  /** Why it's broken, in plain words. */
  note?: string;
}

/** The financial year (April to March) a date is in, as the year it starts. */
export function financialYear(date: string): number {
  const year = Number(date.slice(0, 4));
  return Number(date.slice(5, 7)) >= 4 ? year : year - 1;
}

/**
 * The loan's own limits on a part-payment, checked for one on `date` of `amount`: warnings, never blocks (the app
 * records what actually happened). Only the limits the loan has are checked. A foreclosure isn't a part-payment.
 */
export function prepaymentLimits(facts: Pick<LoanFacts, "loan" | "paidCount" | "outstanding" | "prepayments">, date: string, amount: number, exceptId?: string): LimitCheck[] {
  const { loan } = facts;
  const others = facts.prepayments.filter((p) => p.id !== exceptId && p.effect !== "Close");
  const checks: LimitCheck[] = [];
  if (loan.prepaymentAfterEmis !== undefined) {
    const n = loan.prepaymentAfterEmis;
    checks.push({ rule: n === 1 ? "After the first EMI" : `After ${n} EMIs`, ok: facts.paidCount >= n, note: `${facts.paidCount} paid so far` });
  }
  if (loan.prepaymentMaxPercent !== undefined) {
    const most = round2((facts.outstanding * loan.prepaymentMaxPercent) / 100);
    checks.push({ rule: `At most ${loan.prepaymentMaxPercent}% of what's left`, ok: amount <= most + 0.5, note: `₹${Math.round(most).toLocaleString("en-IN")} here` });
  }
  if (loan.prepaymentsPerYear !== undefined) {
    const fy = financialYear(date);
    const used = others.filter((p) => financialYear(p.date) === fy).length;
    checks.push({ rule: loan.prepaymentsPerYear === 1 ? "Once a financial year" : `${loan.prepaymentsPerYear} times a financial year`, ok: used < loan.prepaymentsPerYear, note: `${used} so far this year` });
  }
  if (loan.prepaymentsInLoan !== undefined) {
    checks.push({ rule: loan.prepaymentsInLoan === 2 ? "Twice in the loan's life" : `${loan.prepaymentsInLoan} times in the loan's life`, ok: others.length < loan.prepaymentsInLoan, note: `${others.length} so far` });
  }
  return checks;
}

/**
 * Marking an EMI paid with `amountPaid`: the EMI keeps its own amount, and anything at least ₹1 above it and its overdue
 * charge is a prepayment (system-design.md: totalDue is to the paisa, the bank debits whole rupees).
 */
export function excessOverEmi(installment: Pick<LoanInstallment, "totalDue">, amountPaid: number, overdueCharge = 0): number {
  const excess = round2(amountPaid - installment.totalDue - overdueCharge);
  return excess >= 1 ? excess : 0;
}

/**
 * Why a paid EMI's payment can't be corrected to `amountPaid`, or null. Editing never makes or removes a prepayment (the
 * rest of the schedule was built on what was saved), so the amount has to stay the EMI and its overdue charge, within a
 * rupee: extra goes in with Add prepayment. An amount and charge left as they were saved are never refused, so a date
 * or place can still be corrected on an EMI that was recorded at a different amount.
 */
export function editPaymentProblem(installment: Pick<LoanInstallment, "totalDue" | "amountPaid" | "overdueCharge">, amountPaid: number, overdueCharge = 0): string | null {
  if (installment.amountPaid === amountPaid && (installment.overdueCharge ?? 0) === overdueCharge) return null;
  const owed = round2(installment.totalDue + overdueCharge);
  const rupees = `₹${Math.round(owed).toLocaleString("en-IN")}`;
  if (amountPaid < owed - 1) return `That's less than the EMI${overdueCharge ? " and its charge" : ""} (${rupees}). Part-payments aren't tracked yet`;
  if (excessOverEmi(installment, amountPaid, overdueCharge)) return `That's more than the EMI${overdueCharge ? " and its charge" : ""} (${rupees}). To record extra, use Add prepayment`;
  return null;
}

/**
 * Why an EMI can't be marked paid with `amountPaid`, or null. Part-payments aren't tracked yet (system-design.md,
 * Loan, "Still open"), so less than the EMI and its charge is refused rather than counted as the whole EMI. An amount
 * over it becomes a prepayment, which can't rebuild the EMIs when a later one is already paid, and can't be more than
 * everything left.
 */
export function markPaidProblem(installment: LoanInstallment, loanInstallments: LoanInstallment[], amountPaid: number, overdueCharge = 0): string | null {
  const owed = round2(installment.totalDue + overdueCharge);
  if (amountPaid < owed - 1) return `That's less than the EMI${overdueCharge ? " and its charge" : ""} (₹${Math.round(owed).toLocaleString("en-IN")}). Part-payments aren't tracked yet: mark it paid once all of it has gone`;
  const excess = excessOverEmi(installment, amountPaid, overdueCharge);
  if (!excess) return null;
  const later = loanInstallments.filter((i) => i.loanId === installment.loanId && i.installmentNumber > installment.installmentNumber);
  const paidLater = later.find((i) => i.status === "Paid");
  if (paidLater) return `EMI ${paidLater.installmentNumber} is already paid, so the extra can't go into the EMIs from here. Enter this EMI's own amount, and add the extra with Add prepayment`;
  const left = sum(later.map((i) => i.principalDue));
  if (excess > left + 0.5) return `That's ₹${Math.round(excess - left).toLocaleString("en-IN")} more than the EMI and everything left on the loan (₹${Math.round(owed + left).toLocaleString("en-IN")} in all). Enter what the bank kept`;
  return null;
}
