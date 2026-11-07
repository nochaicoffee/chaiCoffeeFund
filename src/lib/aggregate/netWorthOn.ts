import type { Account, BalanceSnapshot, Card, EpfEntry, FixedDeposit, LentLoan, LentRepayment, Loan, LoanInstallment, LoanPrepayment, Statement } from "../sheets/types";
import { totalOn } from "./accounts";
import { remainingDue } from "./cardSpend";
import { epfBalance } from "./epf";
import { estimatedCurrentValue } from "./fixedDeposits";
import { totalLentOut } from "./lentOut";

/**
 * Net worth on a past date, rebuilt from the records the app already keeps (docs/design/overview.md, F-OV-05; no snapshot log yet, F-OV-07).
 * It reads each record as it stood on the day: a balance carried forward, a statement not yet paid, an installment not yet paid, a deposit not
 * yet closed, a loan not yet repaid. Where a record can't say what it was (a statement part-paid since), it is counted at its full amount, so
 * past months err toward owing a little more, never less.
 */

export interface WorthLoan {
  id: string;
  name: string;
  category: Loan["category"];
  amount: number;
}

export interface WorthOn {
  date: string;
  /** What he held in his accounts (a dollar account at the rate the caller passed in, which is today's). */
  bank: number;
  /** What the holdings were worth that day, or null when the caller has no price history to say. */
  investments: number | null;
  /** Fixed deposits at their estimated value plus EPF at the passbook figure. */
  fixedIncome: number;
  fixedDeposits: number;
  epf: number;
  lentOut: number;
  cards: number;
  loans: WorthLoan[];
  loanTotal: number;
  owned: number;
  owed: number;
  net: number;
}

export interface WorthInputs {
  accounts: Account[];
  balanceSnapshots: BalanceSnapshot[];
  cards: Card[];
  statements: Statement[];
  loans: Loan[];
  loanInstallments: LoanInstallment[];
  loanPrepayments?: LoanPrepayment[];
  fixedDeposits: FixedDeposit[];
  epfEntries: EpfEntry[];
  lentLoans: LentLoan[];
  lentRepayments: LentRepayment[];
  /** What the holdings were worth on a day, in rupees, or null when there is no price history for it. Today's is what the Investments page shows. */
  investmentsOn: (date: string) => number | null;
}

/** What a card still owed on a date: a statement counts from its statement date until the day it was paid. */
export function cardsOwedOn(statements: Statement[], date: string): number {
  return statements
    .filter((s) => s.statementDate <= date)
    .reduce((sum, s) => {
      if (s.status === "Pending") return sum + remainingDue(s);
      // A paid statement was owed until its paid day (full amount: what was part-paid before is not recorded).
      return s.paidDate && s.paidDate > date ? sum + Math.max(0, s.totalAmountDue) : sum;
    }, 0);
}

/** What was left to pay on a loan on a date: the principal of every installment not yet paid that day, plus anything prepaid after it. 0 before the loan began. */
export function loanOwedOn(loan: Loan, installments: LoanInstallment[], prepayments: LoanPrepayment[], date: string): number {
  if (loan.disbursementDate > date) return 0;
  const unpaid = installments
    .filter((i) => i.loanId === loan.id)
    // A closed loan owes nothing today (net worth counts active loans only), so what is still Pending on it was prepaid or waived: only what was paid after the day was owed then.
    .filter((i) => (i.status === "Pending" && loan.status !== "Closed") || (i.paidDate !== undefined && i.paidDate > date))
    .reduce((sum, i) => sum + i.principalDue, 0);
  const prepaidLater = prepayments.filter((p) => p.loanId === loan.id && p.date > date).reduce((sum, p) => sum + p.amount, 0);
  return unpaid + prepaidLater;
}

/** Everything he owned and owed on a date, and what was left. */
export function worthOn(inputs: WorthInputs, date: string): WorthOn {
  const bank = totalOn(inputs.accounts, inputs.balanceSnapshots, date);
  const investments = inputs.investmentsOn(date);
  const fixedDeposits = inputs.fixedDeposits
    .filter((fd) => fd.startDate <= date && !(fd.status === "Closed" && fd.closedDate !== undefined && fd.closedDate <= date))
    .reduce((sum, fd) => sum + estimatedCurrentValue(fd, date), 0);
  const entries = inputs.epfEntries.filter((e) => e.date <= date);
  const epf = [...new Set(entries.map((e) => e.epfAccountId))].reduce((sum, id) => sum + epfBalance(entries.filter((e) => e.epfAccountId === id), date).total, 0);
  const lentOut = totalLentOut(inputs.lentLoans, inputs.lentRepayments, date);
  const cards = cardsOwedOn(inputs.statements, date);
  const loans: WorthLoan[] = inputs.loans
    .map((loan) => ({ id: loan.id, name: loan.name, category: loan.category, amount: loanOwedOn(loan, inputs.loanInstallments, inputs.loanPrepayments ?? [], date) }))
    .filter((l) => l.amount > 0);
  const loanTotal = loans.reduce((sum, l) => sum + l.amount, 0);
  const fixedIncome = fixedDeposits + epf;
  const owned = bank + (investments ?? 0) + fixedIncome + lentOut;
  const owed = cards + loanTotal;
  return { date, bank, investments, fixedIncome, fixedDeposits, epf, lentOut, cards, loans, loanTotal, owned, owed, net: owned - owed };
}

/** The last day of each of the `count` months ending with the month of `today`; the current month ends on `today`, not later. */
export function monthEndDates(today: string, count: number): string[] {
  const out: string[] = [];
  let year = Number(today.slice(0, 4));
  let month = Number(today.slice(5, 7));
  for (let i = 0; i < count; i++) {
    const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    out.unshift(i === 0 && last > today ? today : last);
    month -= 1;
    if (month === 0) { month = 12; year -= 1; }
  }
  return out;
}

export interface WorthSeriesPoint extends WorthOn {
  /** "2026-11". */
  month: string;
}

/**
 * Net worth at each of the last `count` month-ends (the last is today). A month before his first bank balance was read is left out rather than drawn as a debt with nothing against it: a trend never starts at what it didn't know.
 */
export function worthSeries(inputs: WorthInputs, today: string, count = 13): WorthSeriesPoint[] {
  return monthEndDates(today, count)
    .map((date) => ({ ...worthOn(inputs, date), month: date.slice(0, 7) }))
    .filter((p) => p.bank > 0);
}

export interface WorthChange {
  /** Against the end of the month before this one; null when that month isn't in the series. */
  month: { from: string; amount: number; fraction: number | null } | null;
  /** Against twelve months back, or the earliest month the series has when it has less than a year; null with one point. */
  year: { from: string; amount: number; fraction: number | null; fullYear: boolean } | null;
}

/** How net worth moved: against last month's end, and against a year back (or as far back as the series goes). */
export function worthChange(series: Pick<WorthSeriesPoint, "month" | "net">[]): WorthChange {
  const now = series.at(-1);
  if (!now || series.length < 2) return { month: null, year: null };
  const prev = series.at(-2)!;
  const yearBack = series.length >= 13 ? series.at(-13)! : series[0];
  const frac = (from: number, to: number) => (from > 0 ? (to - from) / from : null);
  return {
    month: { from: prev.month, amount: now.net - prev.net, fraction: frac(prev.net, now.net) },
    year: { from: yearBack.month, amount: now.net - yearBack.net, fraction: frac(yearBack.net, now.net), fullYear: series.length >= 13 },
  };
}
