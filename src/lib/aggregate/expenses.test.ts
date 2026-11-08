import { describe, expect, it } from "vitest";
import { disbursedAmount, expenseMonths, monthExpenses, placeBigSpends, totalsOf, usualParts, usualSpent, type ExpenseData } from "./expenses";
import type { Account, BalanceSnapshot, BigSpend, InvestmentTransaction, Statement } from "../sheets/types";

const account = (id: string, over: Partial<Account> = {}): Account => ({ id, name: id, bank: "B", accountType: "Savings", purpose: "Spending", startDate: "2020-01-01", status: "Active", ...over });
const bal = (accountId: string, date: string, balance: number): BalanceSnapshot => ({ id: `${accountId}@${date}`, accountId, date, balance });
const trade = (over: Partial<InvestmentTransaction>): InvestmentTransaction => ({ id: Math.random().toString(36), tradeDate: "2026-11-10", symbol: "NIFTYBEES", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 1, price: 1000, total: 1000, assetType: "ETF", broker: "Zerodha", ...over });
const statement = (over: Partial<Statement>): Statement => ({ id: "s1", cardId: "c1", statementDate: "2026-10-20", dueDate: "2026-11-08", totalAmountDue: 30000, minimumAmountDue: 1500, status: "Paid", amountPaid: 30000, paidDate: "2026-11-05", paidFromAccountId: "hdfc", ...over });

function data(over: Partial<ExpenseData> = {}): ExpenseData {
  return {
    accounts: [account("hdfc")],
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
    trades: [],
    fixedDeposits: [],
    lentLoans: [],
    lentRepayments: [],
    bigSpends: [],
    ...over,
  } as ExpenseData;
}

const TODAY = "2026-12-09";

describe("monthExpenses: the pool", () => {
  it("spent is came in less what was kept, and came in = invested + lent out + kept + spent", () => {
    const d = data({ trades: [trade({ total: 50000 })], lentLoans: [{ id: "l", borrowerName: "A", principalAmount: 10000, startDate: "2026-11-03", interestMode: "Accruing", interestRate: 10, status: "Active" }] });
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

  it("measures a dollar account's change in dollars, so the rate moving on idle dollars is neither spent nor kept", () => {
    const d = data({
      accounts: [account("hdfc"), account("ibkr", { accountType: "Brokerage", currency: "USD" })],
      snapshots: [bal("hdfc", "2026-10-31", 100000), bal("hdfc", "2026-11-30", 100000), bal("ibkr", "2026-10-31", 1000), bal("ibkr", "2026-11-30", 1000)],
      usdInr: [{ date: "2026-10-31", close: 84 }, { date: "2026-11-30", close: 90 }],
      incomeEntries: [],
    });
    const m = monthExpenses(d, "2026-11", TODAY);
    expect(m.kept).toBe(0);
    expect(m.spent).toBe(0);
    expect(m.poolEnd).toBe(100000 + 90000);
  });

  it("turns a dollar change into rupees at the month's rate", () => {
    const d = data({
      accounts: [account("ibkr", { accountType: "Brokerage", currency: "USD" })],
      snapshots: [bal("ibkr", "2026-10-31", 1000), bal("ibkr", "2026-11-30", 1500)],
      usdInr: [{ date: "2026-11-28", close: 90 }],
      incomeEntries: [],
    });
    expect(monthExpenses(d, "2026-11", TODAY).kept).toBe(45000);
  });

  it("leaves out RSU vests, ESPP purchases and the sell-to-cover, and counts a later sale of those shares", () => {
    const d = data({
      trades: [
        trade({ source: "RSU", symbol: "NTAP", market: "US", currency: "USD", total: 5000, fxRateToInr: 88, tradeDate: "2026-11-15" }),
        trade({ source: "RSU", symbol: "NTAP", market: "US", currency: "USD", tradeType: "Sell", total: 1500, fxRateToInr: 88, tradeDate: "2026-11-15" }),
        trade({ source: "ESPP", symbol: "NTAP", market: "US", currency: "USD", total: 1200, fxRateToInr: 88, tradeDate: "2026-11-28" }),
        trade({ source: "Market", symbol: "NTAP", market: "US", currency: "USD", tradeType: "Sell", soldFrom: "RSU", total: 1000, fxRateToInr: 88, tradeDate: "2026-11-20" }),
      ],
    });
    const m = monthExpenses(d, "2026-11", TODAY);
    expect(m.bought).toBe(0);
    expect(m.sold).toBe(88000);
    expect(m.invested).toBe(-88000);
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

  it("can't work out a month with a US trade it has no rate for, rather than counting it as ₹0", () => {
    const m = monthExpenses(data({ usdInrToday: null, trades: [trade({ market: "US", currency: "USD", symbol: "VOO", total: 500 })] }), "2026-11", TODAY);
    expect(m.status).toBe("unknown");
    expect(m.reason).toContain("VOO");
  });

  it("can't work out a month whose start has no broker cash, and names the account", () => {
    const d = data({ accounts: [account("hdfc"), account("ind", { name: "IND Money", accountType: "Brokerage", currency: "USD" })], snapshots: [bal("hdfc", "2026-09-30", 1), bal("hdfc", "2026-10-31", 2), bal("ind", "2026-10-31", 100)] });
    const oct = monthExpenses(d, "2026-10", TODAY);
    expect(oct.status).toBe("unknown");
    expect(oct.reason).toContain("IND Money");
    expect(oct.spent).toBeNull();
    expect(oct.cameIn).toBe(0);
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

  it("points out a broker balance carried from before the month began, and not a bank's", () => {
    const d = data({
      accounts: [account("hdfc"), account("ibkr", { accountType: "Brokerage" })],
      snapshots: [bal("hdfc", "2026-10-31", 1), bal("hdfc", "2026-12-31", 1), bal("ibkr", "2026-10-31", 5)],
    });
    const dec = monthExpenses(d, "2026-12", "2027-01-05");
    expect(dec.accounts.find((a) => a.account.id === "ibkr")?.carriedFrom).toBe("2026-10-31");
    expect(dec.accounts.find((a) => a.account.id === "hdfc")?.carriedFrom).toBeUndefined();
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

  it("puts a bank purchase in its own month, inside cash and UPI", () => {
    expect(placeBigSpends([spend({ paidFromAccountId: "hdfc" })], [])[0]).toMatchObject({ month: "2026-10", part: "cash" });
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
