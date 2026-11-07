import { describe, expect, it } from "vitest";
import { computeNetWorth } from "./netWorth";
import { cardsOwedOn, loanOwedOn, monthEndDates, worthChange, worthOn, worthSeries, type WorthInputs } from "./netWorthOn";
import type { Account, BalanceSnapshot, Card, FixedDeposit, LentLoan, Loan, LoanInstallment, LoanPrepayment, Statement } from "../sheets/types";

const account: Account = { id: "a1", name: "A", bank: "B", accountType: "Savings", purpose: "Spending", startDate: "2026-01-01", status: "Active" };
const snaps: BalanceSnapshot[] = [
  { id: "s1", accountId: "a1", date: "2026-05-10", balance: 100000 },
  { id: "s2", accountId: "a1", date: "2026-09-10", balance: 160000 },
];
const card: Card = { id: "c1", name: "C", alias: "C", issuer: "Other", cardType: "Cashback", creditLimit: 100000, statementDay: 1, dueDayBuffer: 19, status: "Active" };
const statements: Statement[] = [
  { id: "st1", cardId: "c1", statementDate: "2026-06-01", dueDate: "2026-06-20", totalAmountDue: 20000, minimumAmountDue: 500, status: "Paid", amountPaid: 20000, paidDate: "2026-06-18" },
  { id: "st2", cardId: "c1", statementDate: "2026-10-01", dueDate: "2026-10-20", totalAmountDue: 30000, minimumAmountDue: 500, status: "Pending" },
];
const loan = (over: Partial<Loan> = {}): Loan => ({ id: "l1", name: "Home", lenderName: "Bank", category: "Home", repaymentStructure: "Standard-Emi", principalAmount: 300000, annualInterestRate: 9, tenureMonths: 3, paymentFrequency: "Monthly", processingFee: 0, disbursementDate: "2026-06-01", accountId: "a1", status: "Active", firstEmiDate: "2026-07-02", stampDuty: 0, preEmiInterest: 0, ...over }) as Loan;
const inst = (n: number, due: string, principal: number, status: "Paid" | "Pending", paidDate?: string): LoanInstallment => ({ id: `i${n}`, loanId: "l1", installmentNumber: n, dueDate: due, openingBalance: 0, principalDue: principal, interestDue: 0, totalDue: principal, status, paidDate });
const installments = [inst(1, "2026-07-02", 100000, "Paid", "2026-07-02"), inst(2, "2026-08-02", 100000, "Paid", "2026-08-03"), inst(3, "2026-09-02", 100000, "Pending")];
const fd: FixedDeposit = { id: "f1", name: "FD", principalAmount: 50000, interestRate: 7, compoundingType: "Cumulative", startDate: "2026-04-01", maturityDate: "2027-04-01", maturityAmount: 53500, status: "Active" };
const lent: LentLoan = { id: "ll1", borrowerName: "Friend", principalAmount: 20000, startDate: "2026-07-01", interestMode: "Accruing", interestRate: 12, status: "Active" };

const inputs = (over: Partial<WorthInputs> = {}): WorthInputs => ({
  accounts: [account], balanceSnapshots: snaps, cards: [card], statements, loans: [loan()], loanInstallments: installments, fixedDeposits: [fd], epfEntries: [], lentLoans: [lent], lentRepayments: [],
  investmentsOn: (date) => (date >= "2026-03-01" ? 40000 : null), ...over,
});

describe("cardsOwedOn", () => {
  it("counts a statement from its statement day until the day it was paid", () => {
    expect(cardsOwedOn(statements, "2026-05-31")).toBe(0);
    expect(cardsOwedOn(statements, "2026-06-10")).toBe(20000); // issued, not yet paid
    expect(cardsOwedOn(statements, "2026-06-18")).toBe(0); // paid that day
    expect(cardsOwedOn(statements, "2026-10-05")).toBe(30000);
  });
});

describe("loanOwedOn", () => {
  const prepayment: LoanPrepayment = { id: "p1", loanId: "l1", date: "2026-08-20", amount: 50000, charge: 0, effect: "Reduce-Tenure", source: "Manual" };
  it("is the principal of every installment not yet paid that day", () => {
    expect(loanOwedOn(loan(), installments, [], "2026-05-31")).toBe(0); // before the loan began
    expect(loanOwedOn(loan(), installments, [], "2026-06-15")).toBe(300000);
    expect(loanOwedOn(loan(), installments, [], "2026-07-02")).toBe(200000); // paid that day
    expect(loanOwedOn(loan(), installments, [], "2026-08-02")).toBe(200000); // paid on the 3rd, so still owed on the 2nd
    expect(loanOwedOn(loan(), installments, [], "2026-08-03")).toBe(100000);
  });
  it("adds back what was prepaid after the day, since the later schedule no longer holds it", () => {
    expect(loanOwedOn(loan(), installments, [prepayment], "2026-08-10")).toBe(100000 + 50000); // the last installment, and what was prepaid on the 20th
    expect(loanOwedOn(loan(), installments, [prepayment], "2026-08-21")).toBe(100000);
  });
});

describe("monthEndDates", () => {
  it("lists month ends oldest first and ends on today, not on the month's last day", () => {
    expect(monthEndDates("2026-11-07", 3)).toEqual(["2026-09-30", "2026-10-31", "2026-11-07"]);
    expect(monthEndDates("2026-02-10", 3)).toEqual(["2025-12-31", "2026-01-31", "2026-02-10"]);
  });
});

describe("worthOn", () => {
  it("owned less owed is net worth, and each part reads the record as it stood", () => {
    const w = worthOn(inputs(), "2026-09-15");
    expect(w.bank).toBe(160000);
    expect(w.investments).toBe(40000);
    expect(w.cards).toBe(0);
    expect(w.loanTotal).toBe(100000);
    expect(w.owned).toBe(w.bank + (w.investments ?? 0) + w.fixedIncome + w.lentOut);
    expect(w.owed).toBe(w.cards + w.loanTotal);
    expect(w.net).toBe(w.owned - w.owed);
  });
  it("leaves out what had not begun and what was already closed", () => {
    const early = worthOn(inputs(), "2026-03-15");
    expect(early.fixedDeposits).toBe(0); // the deposit starts in April
    expect(early.lentOut).toBe(0);
    expect(early.loanTotal).toBe(0);
    const closed = worthOn(inputs({ fixedDeposits: [{ ...fd, status: "Closed", closedDate: "2026-08-01" }] }), "2026-09-15");
    expect(closed.fixedDeposits).toBe(0);
    expect(worthOn(inputs({ fixedDeposits: [{ ...fd, status: "Closed", closedDate: "2026-08-01" }] }), "2026-07-15").fixedDeposits).toBeGreaterThan(50000);
  });
  it("matches computeNetWorth for today when investments are given the same", () => {
    const today = "2026-10-15";
    const base = computeNetWorth({ accounts: [account], balanceSnapshots: snaps, cards: [card], statements, loans: [loan()], loanInstallments: installments, investmentTransactions: [], fixedDeposits: [fd], lentLoans: [lent], lentRepayments: [], asOfDate: today });
    const w = worthOn(inputs({ investmentsOn: () => 0 }), today);
    expect(w.net).toBeCloseTo(base.netWorth, 2);
  });
});

describe("a closed loan", () => {
  it("owes nothing in a past month if it was closed by prepayment with installments left Pending", () => {
    const closed = loan({ status: "Closed" });
    expect(loanOwedOn(closed, [inst(1, "2026-07-02", 100000, "Paid", "2026-07-02"), inst(3, "2026-09-02", 100000, "Pending")], [], "2026-08-15")).toBe(0);
  });
});

describe("worthSeries and worthChange", () => {
  it("drops months before there is anything, rather than drawing them as zero", () => {
    const s = worthSeries(inputs(), "2026-11-07", 13);
    expect(s.at(-1)?.month).toBe("2026-11");
    expect(s[0].month >= "2026-05").toBe(true); // the first bank balance is read in May
    expect(s.every((p) => p.bank > 0)).toBe(true);
  });
  it("changes against last month and against the earliest month when under a year", () => {
    const c = worthChange([{ month: "2026-08", net: 100 }, { month: "2026-09", net: 110 }, { month: "2026-10", net: 150 }]);
    expect(c.month).toEqual({ from: "2026-09", amount: 40, fraction: 40 / 110 });
    expect(c.year).toEqual({ from: "2026-08", amount: 50, fraction: 0.5, fullYear: false });
  });
  it("uses a full year back when there are thirteen months, and says nothing with one point", () => {
    const series = Array.from({ length: 13 }, (_, i) => ({ month: `m${i}`, net: 100 + i * 10 }));
    expect(worthChange(series).year).toMatchObject({ from: "m0", amount: 120, fullYear: true });
    expect(worthChange([{ month: "m", net: 5 }])).toEqual({ month: null, year: null });
  });
  it("gives no fraction against a month that was not positive", () => {
    expect(worthChange([{ month: "a", net: 0 }, { month: "b", net: 10 }]).month?.fraction).toBeNull();
  });
});
