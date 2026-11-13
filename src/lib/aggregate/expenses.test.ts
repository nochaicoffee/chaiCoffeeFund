import { describe, expect, it } from "vitest";
import { disbursedAmount, expenseMonths, monthExpenses, placeBigSpends, totalsOf, usualParts, usualSpent, type ExpenseData } from "./expenses";
import type { Account, BalanceSnapshot, BigSpend, Goal, Statement, Transfer } from "../sheets/types";

const account = (id: string, over: Partial<Account> = {}): Account => ({ id, name: id, bank: "B", accountType: "Savings", purpose: "Spending", startDate: "2020-01-01", status: "Active", ...over });
const bal = (accountId: string, date: string, balance: number): BalanceSnapshot => ({ id: `${accountId}@${date}`, accountId, date, balance });
const transfer = (over: Partial<Transfer>): Transfer => ({ id: Math.random().toString(36), date: "2026-11-10", fromAccountId: "hdfc", toAccountId: "ind", amount: 1000, ...over });
const statement = (over: Partial<Statement>): Statement => ({ id: "s1", cardId: "c1", statementDate: "2026-10-20", dueDate: "2026-11-08", totalAmountDue: 30000, minimumAmountDue: 1500, status: "Paid", amountPaid: 30000, paidDate: "2026-11-05", paidFromAccountId: "hdfc", ...over });

function data(over: Partial<ExpenseData> = {}): ExpenseData {
  return {
    accounts: [account("hdfc"), account("ind", { name: "IND", accountType: "Brokerage" }), account("ibkr", { accountType: "Brokerage", currency: "USD" })],
    snapshots: [bal("hdfc", "2026-10-31", 100000), bal("hdfc", "2026-11-30", 120000)],
    usdInr: [],
    usdInrToday: 88,
    incomeEntries: [{ id: "i1", incomeSourceId: "sal", expectedDate: "2026-11-01", receivedDate: "2026-11-01", amount: 200000, status: "Received", tag: "Regular", accountId: "hdfc" }],
    incomeSources: [],
    cards: [{ id: "c1", name: "Regalia", alias: "HDFC Regalia", issuer: "HDFC-Bank", cardType: "Reward-Points", creditLimit: 500000, statementDay: 20, dueDayBuffer: 19, status: "Active" }],
    statements: [],
    subscriptions: [],
    subscriptionPayments: [],
    loans: [],
    installments: [],
    prepayments: [],
    policies: [],
    policyPayments: [],
    transfers: [],
    fixedDeposits: [],
    lentLoans: [],
    lentRepayments: [],
    bigSpends: [],
    goals: [],
    ...over,
  } as ExpenseData;
}

const TODAY = "2026-12-09";

describe("monthExpenses: the pool", () => {
  it("spent is came in less what was kept, and came in = invested + lent out + kept + spent", () => {
    const d = data({ transfers: [transfer({ amount: 50000 })], lentLoans: [{ id: "l", borrowerName: "A", principalAmount: 10000, startDate: "2026-11-03", interestMode: "Accruing", interestRate: 10, status: "Active" }] });
    const m = monthExpenses(d, "2026-11", TODAY);
    expect(m.status).toBe("done");
    expect(m.kept).toBe(20000);
    expect(m.spent).toBe(200000 - 50000 - 10000 - 20000);
    expect(m.cameIn + m.borrowed + m.cameBack).toBeCloseTo(m.invested + m.lentOut + (m.kept ?? 0) + (m.spent ?? 0), 6);
  });

  it("splits spent into the records' parts, and cash and UPI is exactly the rest", () => {
    const d = data({
      statements: [statement({})],
      subscriptions: [{ id: "sub", name: "ACT", alias: "ACT Fibernet", category: "Utilities", amount: 584, billingCycle: "Monthly", billingAnchorDate: "2026-01-02", startDate: "2026-01-02", status: "Active" }],
      subscriptionPayments: [{ id: "p", subscriptionId: "sub", paymentDate: "2026-11-02", amount: 584, status: "Paid", paidFromAccountId: "hdfc" }],
      policies: [{ id: "pol", name: "Health", insurer: "X" } as never],
      policyPayments: [{ id: "pp", policyId: "pol", periodStart: "2026-11-15", years: 1, amount: 12000, status: "Paid" }],
    });
    const m = monthExpenses(d, "2026-11", TODAY);
    expect(m.parts).toMatchObject({ card: 30000, subs: 584, ins: 12000 });
    expect(m.parts.cash).toBeCloseTo((m.spent ?? 0) - 30000 - 584 - 12000, 6);
    expect(m.parts.card + m.parts.emi + m.parts.subs + m.parts.ins + m.parts.cash).toBeCloseTo(m.spent ?? NaN, 6);
    expect(m.payments.reduce((t, p) => t + p.amount, 0)).toBeCloseTo(m.spent ?? NaN, 6);
    expect(m.payments.at(-1)).toMatchObject({ part: "cash", date: "2026-11-30" });
  });

  it("leaves out what a card paid: a bill paid by card, a subscription on a card, an EMI on a card", () => {
    const d = data({
      statements: [statement({ paidFromAccountId: undefined, paidFromCardId: "c2" })],
      subscriptions: [{ id: "sub", name: "N", alias: "Netflix", category: "Streaming", amount: 649, billingCycle: "Monthly", billingAnchorDate: "2026-01-05", startDate: "2026-01-05", status: "Active", defaultPaidFromCardId: "c1" }],
      subscriptionPayments: [{ id: "p", subscriptionId: "sub", paymentDate: "2026-11-05", amount: 649, status: "Paid" }],
      installments: [{ id: "e", loanId: "ln", installmentNumber: 1, dueDate: "2026-11-07", openingBalance: 1, principalDue: 1, interestDue: 1, totalDue: 22450, status: "Paid", paidDate: "2026-11-07", paidFromCardId: "c1" }],
    });
    expect(monthExpenses(d, "2026-11", TODAY).explained).toBe(0);
  });

  it("counts an EMI in full and a manual prepayment with its charge, but not the part of an EMI above the EMI twice", () => {
    const d = data({
      loans: [{ id: "ln", name: "HDFC Car Loan" } as never],
      installments: [{ id: "e", loanId: "ln", installmentNumber: 3, dueDate: "2026-11-07", openingBalance: 1, principalDue: 1, interestDue: 1, totalDue: 22450, status: "Paid", amountPaid: 32450, paidDate: "2026-11-07" }],
      prepayments: [
        { id: "x", loanId: "ln", date: "2026-11-07", amount: 10000, charge: 0, effect: "Reduce-Tenure", source: "Excess-Emi", installmentId: "e" },
        { id: "m", loanId: "ln", date: "2026-11-20", amount: 50000, charge: 2360, effect: "Reduce-Tenure", source: "Manual" },
      ],
    });
    expect(monthExpenses(d, "2026-11", TODAY).parts.emi).toBe(32450 + 52360);
  });

  it("never reads a broker's balance: the pool is the bank accounts, so what a broker holds or its rate moving is neither spent nor kept", () => {
    const d = data({
      snapshots: [bal("hdfc", "2026-10-31", 100000), bal("hdfc", "2026-11-30", 100000), bal("ibkr", "2026-10-31", 1000), bal("ibkr", "2026-11-30", 5000)],
      usdInr: [{ date: "2026-10-31", close: 84 }, { date: "2026-11-30", close: 90 }],
      incomeEntries: [],
    });
    const m = monthExpenses(d, "2026-11", TODAY);
    expect(m.kept).toBe(0);
    expect(m.spent).toBe(0);
    expect(m.poolEnd).toBe(100000);
    expect(m.accounts.map((a) => a.account.id)).toEqual(["hdfc"]);
  });

  it("measures a dollar bank account's change in dollars, turned into rupees at the month's rate", () => {
    const d = data({
      accounts: [account("usd", { currency: "USD" })],
      snapshots: [bal("usd", "2026-10-31", 1000), bal("usd", "2026-11-30", 1500)],
      usdInr: [{ date: "2026-11-28", close: 90 }],
      incomeEntries: [],
    });
    expect(monthExpenses(d, "2026-11", TODAY).kept).toBe(45000);
  });

  it("counts only transfers between a bank and a broker: sent leaves the pool, back enters it, bank to bank and broker to broker never count", () => {
    const d = data({
      transfers: [
        transfer({ amount: 70000 }),
        transfer({ fromAccountId: "ind", toAccountId: "hdfc", amount: 500, receivedAmount: 44000 }),
        transfer({ fromAccountId: "ind", toAccountId: "ibkr", amount: 5000, receivedAmount: 55 }),
        transfer({ date: "2026-12-02", amount: 9999 }),
      ],
      accounts: [account("hdfc"), account("sbi"), account("ind", { accountType: "Brokerage" }), account("ibkr", { accountType: "Brokerage", currency: "USD" })],
    });
    const m = monthExpenses({ ...d, transfers: [...d.transfers, transfer({ fromAccountId: "hdfc", toAccountId: "sbi", amount: 12345 })] }, "2026-11", TODAY);
    expect(m.bought).toBe(70000);
    expect(m.sold).toBe(44000);
    expect(m.invested).toBe(26000);
  });

  it("counts a new deposit as bought, a closed one's payout and money lent coming back as came back, and a disbursal as borrowed", () => {
    const loan = { id: "ln", name: "Car", principalAmount: 1000000, processingFee: 5000, stampDuty: 500, preEmiInterest: 1500, disbursementDate: "2026-11-02", accountId: "hdfc" } as never;
    const d = data({
      fixedDeposits: [
        { id: "f1", name: "New", principalAmount: 100000, interestRate: 7, compoundingType: "Cumulative", startDate: "2026-11-10", maturityDate: "2027-11-10", status: "Active" },
        { id: "f2", name: "Old", principalAmount: 50000, interestRate: 7, compoundingType: "Cumulative", startDate: "2025-11-10", maturityDate: "2026-11-10", status: "Closed", closedDate: "2026-11-10", receivedAmount: 53500, closeKind: "Matured" },
      ],
      lentRepayments: [{ id: "r1", lentLoanId: "l", date: "2026-11-12", amount: 20000, kind: "Principal" }, { id: "r2", lentLoanId: "l", date: "2026-11-12", amount: 1000, kind: "Interest" }],
      loans: [loan],
    });
    const m = monthExpenses(d, "2026-11", TODAY);
    expect(m.bought).toBe(100000);
    expect(m.cameBack).toBe(53500 + 21000);
    expect(m.borrowed).toBe(disbursedAmount(loan));
    expect(m.borrowed).toBe(993000);
  });
});

describe("monthExpenses: when a month can be worked out", () => {
  it("leaves out a disbursal that went to an account the app doesn't have", () => {
    const loan = { id: "ln", name: "Car", principalAmount: 1000000, processingFee: 0, stampDuty: 0, preEmiInterest: 0, disbursementDate: "2026-11-02", accountId: "dealer" } as never;
    expect(monthExpenses(data({ loans: [loan] }), "2026-11", TODAY).borrowed).toBe(0);
  });

  it("leaves out a disbursal paid straight to the seller, even with an account on the loan", () => {
    const base = { id: "ln", name: "Car", principalAmount: 1000000, processingFee: 0, stampDuty: 0, preEmiInterest: 0, disbursementDate: "2026-11-02", accountId: "hdfc" };
    expect(monthExpenses(data({ loans: [{ ...base, disbursedTo: "Seller" } as never] }), "2026-11", TODAY).borrowed).toBe(0);
    expect(monthExpenses(data({ loans: [{ ...base, accountId: undefined, disbursedTo: "Seller" } as never] }), "2026-11", TODAY).borrowed).toBe(0);
    expect(monthExpenses(data({ loans: [{ ...base, disbursedTo: "Account" } as never] }), "2026-11", TODAY).borrowed).toBe(1000000);
  });

  it("can't work out a month with a dollar bank account and no rate, rather than counting it as ₹0", () => {
    const m = monthExpenses(data({ usdInrToday: null, accounts: [account("hdfc"), account("usd", { currency: "USD" })] }), "2026-11", TODAY);
    expect(m.status).toBe("unknown");
    expect(m.reason).toContain("USD to INR");
  });

  it("works out a month although a broker has no balance on record: its cash is met through transfers", () => {
    const d = data({ accounts: [account("hdfc"), account("ind", { name: "IND Money", accountType: "Brokerage", currency: "USD" })], snapshots: [bal("hdfc", "2026-09-30", 1), bal("hdfc", "2026-10-31", 2)] });
    const oct = monthExpenses(d, "2026-10", TODAY);
    expect(oct.status).toBe("done");
    expect(oct.kept).toBe(1);
  });

  it("holds a savings account with no balance yet flat at its first, and counts one not yet opened as ₹0", () => {
    const d = data({
      accounts: [account("hdfc"), account("sbi", { startDate: "2019-01-01" }), account("new", { startDate: "2026-11-15" })],
      snapshots: [bal("hdfc", "2026-10-31", 100000), bal("hdfc", "2026-11-30", 100000), bal("sbi", "2026-11-05", 4999), bal("new", "2026-11-20", 3000)],
      incomeEntries: [],
    });
    const m = monthExpenses(d, "2026-11", TODAY);
    expect(m.status).toBe("done");
    expect(m.kept).toBe(3000);
  });

  it("shows the month in progress as recorded so far, without spent", () => {
    const m = monthExpenses(data({ statements: [statement({})] }), "2026-11", "2026-11-09");
    expect(m.status).toBe("progress");
    expect(m.spent).toBeNull();
    expect(m.parts.card).toBe(30000);
    expect(m.parts.cash).toBe(0);
  });

});

describe("big spends from an account, and goals marked bought", () => {
  const goal = (over: Partial<Goal>): Goal => ({ id: "g1", name: "Alloy Wheels", category: "Vehicle", necessity: "Want", scale: "Small", amount: 37000, startDate: "2026-01-01", status: "Done", doneOn: "2026-11-12", actualCost: 37000, paidFromAccountId: "hdfc", ...over }) as Goal;

  it("takes a big spend and a goal bought from an account out of cash and UPI, as their own part, without changing what was spent", () => {
    const plain = monthExpenses(data(), "2026-11", TODAY);
    const m = monthExpenses(data({ goals: [goal({})], bigSpends: [{ id: "b", date: "2026-11-03", amount: 18000, name: "Honda service", category: "Vehicle", paidFromAccountId: "hdfc" }] }), "2026-11", TODAY);
    expect(m.spent).toBe(plain.spent);
    expect(m.parts.big).toBe(55000);
    expect(m.parts.cash).toBe(plain.parts.cash - 55000);
    expect(m.payments.filter((p) => p.part === "big").map((p) => p.label).sort()).toEqual(["Alloy Wheels", "Honda service"]);
  });

  it("leaves out a goal not bought yet, or one charged to a card (its bill holds it)", () => {
    const m = monthExpenses(data({ goals: [goal({ status: "Active", doneOn: undefined, actualCost: undefined }), goal({ id: "g2", paidFromAccountId: undefined, paidFromCardId: "c1" })] }), "2026-11", TODAY);
    expect(m.parts.big).toBe(0);
  });
});

describe("placeBigSpends", () => {
  const spend = (over: Partial<BigSpend>): BigSpend => ({ id: "b", date: "2026-10-03", amount: 18600, name: "Flights", category: "Travel", ...over });

  it("puts a card purchase in the month its bill is paid, and keeps it waiting until then", () => {
    const statements = [statement({ id: "oct", statementDate: "2026-10-20", paidDate: "2026-11-05" }), statement({ id: "nov", statementDate: "2026-11-20", status: "Pending", paidDate: undefined })];
    const placed = placeBigSpends([spend({ id: "a", paidFromCardId: "c1" }), spend({ id: "w", date: "2026-10-25", paidFromCardId: "c1" }), spend({ id: "n", date: "2026-12-01", paidFromCardId: "c1" })], statements);
    expect(placed.find((p) => p.spend.id === "a")).toMatchObject({ month: "2026-11", part: "card", statementId: "oct" });
    expect(placed.find((p) => p.spend.id === "w")).toMatchObject({ month: null, statementId: "nov" });
    expect(placed.find((p) => p.spend.id === "n")).toMatchObject({ month: null, statementId: undefined });
  });

  it("doesn't place a card purchase whose bill was paid from another card in card bills", () => {
    const placed = placeBigSpends([spend({ paidFromCardId: "c1" })], [statement({ paidFromAccountId: undefined, paidFromCardId: "c2" })]);
    expect(placed[0].month).toBeNull();
  });

  it("puts a bank purchase in its own month as a payment of its own, and one naming no account inside cash and UPI", () => {
    expect(placeBigSpends([spend({ paidFromAccountId: "hdfc" })], [])[0]).toMatchObject({ month: "2026-10", part: "big" });
    expect(placeBigSpends([spend({ paidFromCardId: undefined })], [])[0]).toMatchObject({ month: "2026-10", part: "cash" });
  });

  it("never adds a big spend to what was spent", () => {
    const base = monthExpenses(data(), "2026-11", TODAY);
    const withSpend = monthExpenses(data({ bigSpends: [spend({ date: "2026-11-04", amount: 90000, paidFromAccountId: "hdfc" })] }), "2026-11", TODAY);
    expect(withSpend.spent).toBe(base.spent);
    expect(withSpend.bigSpends).toHaveLength(1);
  });
});

describe("a usual month", () => {
  it("averages only the months worked out", () => {
    const d = data({ snapshots: [bal("hdfc", "2026-10-31", 0), bal("hdfc", "2026-11-30", 100000), bal("hdfc", "2026-12-31", 150000)], incomeEntries: [{ id: "i", incomeSourceId: "s", expectedDate: "2026-11-01", receivedDate: "2026-11-01", amount: 200000, status: "Received", tag: "Regular" }, { id: "j", incomeSourceId: "s", expectedDate: "2026-12-01", receivedDate: "2026-12-01", amount: 200000, status: "Received", tag: "Regular" }] });
    const months = expenseMonths(d, "2026-11", "2027-01", "2027-01-09");
    expect(months.map((m) => m.status)).toEqual(["done", "done", "progress"]);
    expect(usualSpent(months)).toBe((100000 + 150000) / 2);
    expect(usualParts(months)?.cash).toBe(125000);
    expect(usualSpent(months.slice(2))).toBeNull();
    const totals = totalsOf(months);
    expect(totals.months).toBe(2);
    expect(totals.spent).toBe(250000);
    expect(totals.cameIn).toBe(totals.invested + totals.lentOut + totals.kept + totals.spent);
  });
});
