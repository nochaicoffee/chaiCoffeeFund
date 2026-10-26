import { daysBetween } from "../aggregate/cardSpend";
import { addMonthsUTC } from "../aggregate/recurring";
import type { Loan, LoanInstallment, PrepaymentEffect } from "../sheets/types";
import { generateInstallments, round2, standardEmi } from "./generateInstallments";

/**
 * Rebuilding a loan's schedule after a prepayment (system-design.md, Loan, "Prepayments"). One function serves every
 * effect: the installments after the prepayment are replaced, starting from the principal they still owed less the
 * prepayment, and the ones before it never change. Installment numbers carry on, and due dates still count from
 * `firstEmiDate`, so the day of the month doesn't move.
 *
 * The interest in the month of a prepayment is a proposed rule, to check against the first real bank letter: a
 * normal month on the new balance, plus actual/365 interest on the prepaid amount for the days since the last EMI
 * (the HDFC agreement charges interest on the daily balance, and its pre-EMI interest matched actual/365).
 */

type Row = Omit<LoanInstallment, "id">;

export interface PrepaymentEvent {
  date: string;
  /** The principal it pays off. For Close it's the whole of what's left, whatever is passed. */
  amount: number;
  effect: PrepaymentEffect;
  /** The bank's revised EMI and number of EMIs left, from its letter. They win over the app's own figures. */
  bankEmi?: number;
  bankInstallments?: number;
  /**
   * The installment it comes after. An EMI paid over sets it to that EMI's number, so an EMI paid early still keeps its
   * own amount; otherwise it's the last installment due on or before the date.
   */
  afterInstallment?: number;
}

export interface Rebuild {
  /** The installment number the prepayment comes after (0 before the first EMI). */
  afterInstallment: number;
  /** The installments replaced (every one after it), and what replaces them. */
  removed: Row[];
  added: Row[];
  /** What the replaced installments still owed, before and after the prepayment. */
  balanceBefore: number;
  balanceAfter: number;
  /** The principal it pays off: the amount, or everything left when it closes the loan. */
  amount: number;
  /** Days since the last EMI, and the interest on the prepaid amount for them (in the first new installment). */
  days: number;
  dayInterest: number;
  emiBefore: number;
  /** The EMI from here on; 0 when it closes the loan. */
  emiAfter: number;
  /** It pays off everything left: the loan closes. */
  closes: boolean;
  /** Interest of the replaced installments less that of the new ones. */
  interestSaved: number;
}

/** Interest on `amount` for `days` days, actual/365, to the whole rupee. */
export function dayInterest(amount: number, annualInterestRate: number, days: number): number {
  return Math.round((amount * annualInterestRate * days) / 36500);
}

const sumOf = (rows: Row[], key: "principalDue" | "interestDue") => round2(rows.reduce((total, row) => total + row[key], 0));

/** The installment number a prepayment on `date` comes after: the last one due on or before it. */
export function installmentBefore(rows: Pick<Row, "installmentNumber" | "dueDate">[], date: string): number {
  return rows.filter((row) => row.dueDate <= date).reduce((n, row) => Math.max(n, row.installmentNumber), 0);
}

export function rebuildSchedule(loan: Pick<Loan, "annualInterestRate" | "firstEmiDate">, rows: Row[], event: PrepaymentEvent): Rebuild {
  const sorted = [...rows].sort((a, b) => a.installmentNumber - b.installmentNumber);
  const after = event.afterInstallment ?? installmentBefore(sorted, event.date);
  const removed = sorted.filter((row) => row.installmentNumber > after);
  if (removed.length === 0) throw new Error("Nothing is left to prepay on this loan");

  const balanceBefore = round2(removed[0].openingBalance);
  const lastDue = sorted.find((row) => row.installmentNumber === after)?.dueDate ?? addMonthsUTC(loan.firstEmiDate, -1);
  const days = Math.max(0, daysBetween(lastDue, event.date));
  const closes = event.effect === "Close" || event.amount >= balanceBefore - 0.5;
  const amount = closes ? balanceBefore : round2(event.amount);
  const extra = dayInterest(amount, loan.annualInterestRate, days);
  // Every installment but the last is the EMI; with only the last left, it is.
  const emiBefore = removed[0].totalDue;
  const balanceAfter = closes ? 0 : round2(balanceBefore - amount);
  const removedInterest = sumOf(removed, "interestDue");
  const base = { afterInstallment: after, removed, balanceBefore, balanceAfter, amount, days, dayInterest: extra, emiBefore };
  // A foreclosure's interest for the odd days is paid with it, so nothing is saved on those days.
  if (closes) return { ...base, added: [], emiAfter: 0, closes: true, interestSaved: round2(removedInterest - extra) };

  const monthlyRate = loan.annualInterestRate / 12 / 100;
  const count = event.bankInstallments ?? (event.effect === "Reduce-Emi" ? removed.length : undefined);
  const emi = event.bankEmi ?? (event.effect === "Reduce-Emi" ? standardEmi(balanceAfter, loan.annualInterestRate, count!) : emiBefore);
  const added: Row[] = [];
  let openingBalance = balanceAfter;
  for (let k = 0; openingBalance > 0; k++) {
    if (k >= 1200) throw new Error("The EMI never repays the loan");
    const interestDue = Math.round(openingBalance * monthlyRate) + (k === 0 ? extra : 0);
    // A fixed count ends on its last; a fixed EMI ends when the EMI covers what's left.
    const isLast = count !== undefined ? k === count - 1 : emi - interestDue >= openingBalance;
    const principalDue = isLast ? openingBalance : round2(emi - interestDue);
    if (principalDue <= 0) throw new Error("The EMI doesn't cover the interest, so the loan would never be repaid");
    const installmentNumber = after + 1 + k;
    added.push({
      loanId: removed[0].loanId,
      installmentNumber,
      dueDate: addMonthsUTC(loan.firstEmiDate, installmentNumber - 1),
      openingBalance,
      principalDue,
      interestDue,
      totalDue: round2(principalDue + interestDue),
      status: "Pending",
    });
    openingBalance = round2(openingBalance - principalDue);
  }
  return { ...base, added, emiAfter: added[0].totalDue, closes: false, interestSaved: round2(removedInterest - sumOf(added, "interestDue")) };
}

/** The installments after applying a rebuild: the ones before the prepayment, then the new ones. */
export function applyRebuild(rows: Row[], rebuild: Rebuild): Row[] {
  return [...rows.filter((row) => row.installmentNumber <= rebuild.afterInstallment), ...rebuild.added].sort((a, b) => a.installmentNumber - b.installmentNumber);
}

/**
 * A loan's whole schedule from its terms and its prepayments, in date order: what the stored installments should be.
 * Undoing or deleting a prepayment is this without it, so a loan's schedule never depends on the order things were
 * entered in.
 */
export function scheduleWithPrepayments(loan: Omit<Loan, "id">, prepayments: PrepaymentEvent[]): Row[] {
  const events = [...prepayments].sort((a, b) => (a.date === b.date ? (a.afterInstallment ?? 0) - (b.afterInstallment ?? 0) : a.date < b.date ? -1 : 1));
  let rows = generateInstallments(loan);
  for (const event of events) {
    if (!rows.some((row) => row.installmentNumber > (event.afterInstallment ?? installmentBefore(rows, event.date)))) break;
    rows = applyRebuild(rows, rebuildSchedule(loan, rows, event));
  }
  return rows;
}

export interface SchedulePlan {
  /** New installment numbers to write. */
  create: Row[];
  /** Pending installments whose figures change, kept under their own id. */
  update: { id: string; patch: Pick<Row, "dueDate" | "openingBalance" | "principalDue" | "interestDue" | "totalDue"> }[];
  /** Pending installments the new schedule doesn't have. */
  remove: string[];
}

const same = (a: number, b: number) => Math.abs(a - b) < 0.005;

/**
 * What to write to bring a loan's stored installments to `target`. A paid installment is never touched, even if the
 * target disagrees with it; only pending ones change, keeping their ids.
 */
export function planSchedule(stored: LoanInstallment[], target: Row[]): SchedulePlan {
  const byNumber = new Map(stored.map((row) => [row.installmentNumber, row]));
  const wanted = new Set(target.map((row) => row.installmentNumber));
  const plan: SchedulePlan = { create: [], update: [], remove: [] };
  for (const row of target) {
    const current = byNumber.get(row.installmentNumber);
    if (!current) plan.create.push(row);
    else if (current.status === "Pending") {
      const changed = current.dueDate !== row.dueDate || !same(current.openingBalance, row.openingBalance) || !same(current.principalDue, row.principalDue) || !same(current.interestDue, row.interestDue) || !same(current.totalDue, row.totalDue);
      if (changed) plan.update.push({ id: current.id, patch: { dueDate: row.dueDate, openingBalance: row.openingBalance, principalDue: row.principalDue, interestDue: row.interestDue, totalDue: row.totalDue } });
    }
  }
  for (const row of stored) if (row.status === "Pending" && !wanted.has(row.installmentNumber)) plan.remove.push(row.id);
  return plan;
}

/** The bank's charge on a prepayment: its percentage plus 18% GST, to the whole rupee. 0 when the loan has none. */
export function prepaymentCharge(loan: Pick<Loan, "prepaymentChargePercent">, amount: number): number {
  return loan.prepaymentChargePercent ? Math.round((amount * loan.prepaymentChargePercent * 1.18) / 100) : 0;
}
