import { describe, expect, it } from "vitest";
import { bridgeSteps, cameInBySource, comingUp, everythingElse, flows, monthlyFlows, monthsIn, moneyItems, type AccountsData } from "./accountFlows";

const empty: AccountsData = {
  accounts: [
    { id: "sbi", name: "SBI", bank: "SBI", accountType: "Savings", purpose: "Spending", startDate: "2020-01-01", status: "Active" },
    { id: "hdfc", name: "HDFC", bank: "HDFC", accountType: "Savings", purpose: "Emergency-Fund", startDate: "2020-01-01", status: "Active" },
    { id: "zerodha", name: "Zerodha", bank: "Zerodha", accountType: "Brokerage", purpose: "Investment", startDate: "2020-01-01", status: "Active" },
  ],
  snapshots: [],
  cards: [{ id: "c1", name: "Millennia", alias: "Millennia", issuer: "HDFC-Bank", cardType: "Cashback", creditLimit: 100000, statementDay: 6, dueDayBuffer: 20, status: "Active", defaultPaidFromAccountId: "sbi" }],
  statements: [],
  subscriptions: [],
  subscriptionPayments: [],
  loans: [],
  installments: [],
  trades: [],
  incomeSources: [{ id: "salary", name: "Salary", alias: "NetApp", category: "Salary", frequency: "Monthly", expectedAmount: 200_000, status: "Active" }],
  incomeEntries: [],
};

const data = (patch: Partial<AccountsData>): AccountsData => ({ ...empty, ...patch });

const snap = (accountId: string, date: string, balance: number) => ({ id: `${accountId}-${date}`, accountId, date, balance });

describe("moneyItems: what counts as going out of an account", () => {
  const d = data({
    statements: [
      { id: "s1", cardId: "c1", statementDate: "2026-09-06", dueDate: "2026-09-26", totalAmountDue: 30_000, minimumAmountDue: 1500, status: "Paid", amountPaid: 30_000, paidFromAccountId: "sbi", paidDate: "2026-09-25" },
      { id: "s2", cardId: "c1", statementDate: "2026-10-06", dueDate: "2026-10-26", totalAmountDue: 9_999, minimumAmountDue: 500, status: "Paid", amountPaid: 9_999, paidFromCardId: "other", paidDate: "2026-10-20" },
    ],
    subscriptions: [
      { id: "sub-a", name: "Gym", alias: "Gym", category: "Fitness", amount: 1000, billingCycle: "Monthly", billingAnchorDate: "2026-01-10", startDate: "2026-01-10", status: "Active", defaultPaidFromAccountId: "sbi" },
      { id: "sub-c", name: "Netflix", alias: "Netflix", category: "Streaming", amount: 649, billingCycle: "Monthly", billingAnchorDate: "2026-01-12", startDate: "2026-01-12", status: "Active", defaultPaidFromCardId: "c1" },
    ],
    subscriptionPayments: [
      // Charged to nothing, but the subscription's usual place is SBI: SBI's.
      { id: "p1", subscriptionId: "sub-a", paymentDate: "2026-09-10", amount: 1000, status: "Paid" },
      // Charged to a card: inside that card's bill, never SBI's.
      { id: "p2", subscriptionId: "sub-c", paymentDate: "2026-09-12", amount: 649, status: "Paid", paidFromCardId: "c1" },
      // Skipped renewal: nothing charged.
      { id: "p3", subscriptionId: "sub-a", paymentDate: "2026-08-10", amount: 0, status: "Skipped" },
    ],
    loans: [{ id: "l1", name: "Personal loan", lenderName: "HDFC", category: "Personal", repaymentStructure: "Standard-Emi", principalAmount: 500000, annualInterestRate: 11, tenureMonths: 36, paymentFrequency: "Monthly", processingFee: 0, disbursementDate: "2026-01-01", accountId: "sbi", status: "Active", firstEmiDate: "2026-02-01", stampDuty: 0, preEmiInterest: 0 }],
    installments: [
      { id: "i1", loanId: "l1", installmentNumber: 1, dueDate: "2026-09-05", openingBalance: 500000, principalDue: 12000, interestDue: 4583, totalDue: 16_583, status: "Paid", amountPaid: 16_583, paidDate: "2026-09-05", paidFromAccountId: "sbi" },
      { id: "i2", loanId: "l1", installmentNumber: 2, dueDate: "2026-10-05", openingBalance: 488000, principalDue: 12100, interestDue: 4473, totalDue: 16_583, status: "Paid", amountPaid: 16_583, paidDate: "2026-10-05", paidFromCardId: "c1" },
    ],
    // Bank to broker is invested, broker to bank is taken back, bank to bank is neither.
    transfers: [
      { id: "x1", date: "2026-09-15", fromAccountId: "sbi", toAccountId: "zerodha", amount: 23_300 },
      { id: "x2", date: "2026-09-17", fromAccountId: "zerodha", toAccountId: "sbi", amount: 1_500 },
      { id: "x3", date: "2026-09-18", fromAccountId: "sbi", toAccountId: "hdfc", amount: 50_000 },
    ],
    trades: [
      { id: "t1", tradeDate: "2026-09-15", symbol: "INFY", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 10, price: 1500, total: 15_000, assetType: "Equity", broker: "Zerodha", settlementAccountId: "sbi" },
      { id: "t2", tradeDate: "2026-09-16", symbol: "NTAP", market: "US", currency: "USD", tradeType: "Buy", source: "Market", quantity: 1, price: 100, total: 100, assetType: "Equity", broker: "Schwab", settlementAccountId: "sbi", fxRateToInr: 83 },
      { id: "t3", tradeDate: "2026-09-17", symbol: "INFY", market: "IND", currency: "INR", tradeType: "Sell", source: "Market", quantity: 1, price: 1500, total: 1_500, assetType: "Equity", broker: "Zerodha", settlementAccountId: "sbi" },
    ],
    incomeEntries: [
      { id: "e1", incomeSourceId: "salary", expectedDate: "2026-09-30", receivedDate: "2026-09-30", amount: 200_000, status: "Received", accountId: "sbi", tag: "Regular" },
      { id: "e2", incomeSourceId: "salary", expectedDate: "2026-10-31", amount: 200_000, status: "Pending", accountId: "sbi", tag: "Regular" },
    ],
  });
  const items = moneyItems(d, "2026-09-01", "2026-10-31");

  it("takes card bills paid from the account, subscriptions charged there, EMIs and buys", () => {
    const f = flows(items, "sbi");
    expect(f.out["Card bills"]).toBe(30_000);
    expect(f.out.Subscriptions).toBe(1000);
    expect(f.out.EMIs).toBe(16_583);
    expect(f.out.Investments).toBe(23_300);
  });

  it("counts money sent to and back from brokers, never trades (they happen inside the broker) or a bank-to-bank move", () => {
    expect(items.filter((i) => i.kind === "Investments" || i.kind === "Taken back").map((i) => [i.kind, i.accountId, i.amount])).toEqual([
      ["Investments", "sbi", 23_300],
      ["Taken back", "sbi", 1_500],
    ]);
    const f = flows(items, "sbi");
    expect([f.sent, f.takenBack, f.invested]).toEqual([23_300, 1_500, 21_800]);
    // Nothing is counted on the broker's own side, so all accounts together don't count it twice.
    expect(flows(items, null).invested).toBe(21_800);
  });

  it("goes negative when more came back than was sent, and counts what a US broker sent back in rupees", () => {
    const back = moneyItems({ ...d, accounts: [...d.accounts, { id: "ibkr", name: "IBKR", bank: "IBKR", accountType: "Brokerage", purpose: "Investment", startDate: "2020-01-01", status: "Active", currency: "USD" }], transfers: [
      { id: "y1", date: "2026-09-20", fromAccountId: "sbi", toAccountId: "zerodha", amount: 100_000 },
      { id: "y2", date: "2026-09-21", fromAccountId: "zerodha", toAccountId: "sbi", amount: 259_048 },
      { id: "y3", date: "2026-09-22", fromAccountId: "ibkr", toAccountId: "sbi", amount: 1_000, receivedAmount: 90_000 },
    ] }, "2026-09-01", "2026-10-31");
    const f = flows(back, "sbi");
    expect(f.takenBack).toBe(259_048 + 90_000);
    expect(f.invested).toBe(100_000 - 349_048);
    expect(f.leftBank).toBe(f.expenses + 100_000);
  });

  it("never counts dollars back as rupees, and still counts a transfer to a dollar broker left out of the totals", () => {
    const ibkr = { id: "ibkr", name: "IBKR", bank: "IBKR", accountType: "Brokerage" as const, purpose: "Investment" as const, startDate: "2020-01-01", status: "Active" as const, currency: "USD" as const };
    const items2 = moneyItems({ ...d, unpriced: { accounts: [{ id: "ibkr", name: "IBKR", dollars: 10, account: ibkr, snapshots: [] }], reason: "no rate" }, transfers: [
      { id: "z1", date: "2026-09-20", fromAccountId: "sbi", toAccountId: "ibkr", amount: 50_000 },
      { id: "z2", date: "2026-09-21", fromAccountId: "ibkr", toAccountId: "sbi", amount: 1_000 },
    ] }, "2026-09-01", "2026-10-31").filter((i) => i.kind === "Investments" || i.kind === "Taken back");
    expect(items2.map((i) => [i.kind, i.amount])).toEqual([["Investments", 50_000]]);
  });

  it("leaves out what's charged to a card, because that card's bill already holds it", () => {
    const all = items.filter((i) => i.kind === "Subscriptions" || i.kind === "EMIs" || i.kind === "Card bills");
    expect(all.map((i) => i.amount).sort((a, b) => a - b)).toEqual([1000, 16_583, 30_000]);
  });

  it("counts income received, not pending, and money back from a broker as taken back, not as came in", () => {
    const f = flows(items, "sbi");
    expect(f.cameIn).toBe(200_000);
    expect(f.takenBack).toBe(1_500);
  });

  it("works saved as came in − expenses, so investing counts as saved (decision 19)", () => {
    const f = flows(items, "sbi");
    expect(f.expenses).toBe(30_000 + 1000 + 16_583);
    expect(f.saved).toBe(200_000 - f.expenses);
    expect(f.keptInBank).toBe(f.saved - f.invested);
    // ₹23,300 sent to the broker, ₹1,500 back.
    expect(f.invested).toBe(21_800);
  });

  it("is zero for an account nothing went through, and sums all accounts with null", () => {
    expect(flows(items, "hdfc").cameIn).toBe(0);
    expect(flows(items, null).expenses).toBe(flows(items, "sbi").expenses);
  });

  it("splits by month, and by what the money came from", () => {
    const months = monthlyFlows(items, "sbi", monthsIn("2026-09-01", "2026-10-31"));
    expect(months.map((m) => m.month)).toEqual(["2026-09", "2026-10"]);
    expect(months[0].flows.cameIn).toBe(200_000);
    expect(months[1].flows.cameIn).toBe(0);
    expect(cameInBySource(d, "2026-09-01", "2026-10-31", null)).toEqual([{ source: "NetApp", amount: 200_000 }]);
  });

  it("only counts a day inside the span, ends included", () => {
    expect(moneyItems(d, "2026-09-25", "2026-09-25").map((i) => i.kind)).toEqual(["Card bills"]);
    expect(moneyItems(d, "2026-09-26", "2026-09-30").map((i) => i.kind)).toEqual(["Came in"]);
  });
});

describe("Borrowed: a loan paid into an account", () => {
  const loan = { id: "l1", name: "Personal loan", lenderName: "HDFC", category: "Personal", repaymentStructure: "Standard-Emi", annualInterestRate: 9.99, tenureMonths: 12, paymentFrequency: "Monthly", status: "Active", firstEmiDate: "2026-08-07" } as const;
  // His HDFC loan: ₹11,10,000 less the ₹7,669 fee, ₹500 stamp duty and ₹911 gap interest = ₹11,00,920 reached the account.
  const hdfcLoan = { ...loan, principalAmount: 1_110_000, processingFee: 7_669, stampDuty: 500, preEmiInterest: 911, disbursementDate: "2026-07-04", accountId: "hdfc" };
  const d = data({
    loans: [hdfcLoan, { ...loan, id: "car", name: "Car loan", principalAmount: 800_000, processingFee: 0, stampDuty: 0, preEmiInterest: 0, disbursementDate: "2026-07-10", disbursedTo: "Seller" }],
    transfers: [{ id: "x1", date: "2026-07-21", fromAccountId: "hdfc", toAccountId: "zerodha", amount: 1_100_920 }],
    incomeEntries: [{ id: "e1", incomeSourceId: "salary", expectedDate: "2026-07-31", receivedDate: "2026-07-31", amount: 200_000, status: "Received", accountId: "hdfc", tag: "Regular" }],
  });
  const items = moneyItems(d, "2026-07-01", "2026-07-31");
  const f = flows(items, "hdfc");

  it("counts what reached the account, after the bank's fees, on the disbursement day", () => {
    expect(items.filter((i) => i.kind === "Borrowed")).toEqual([{ kind: "Borrowed", date: "2026-07-04", amount: 1_100_920, accountId: "hdfc", label: "Personal loan" }]);
    expect(f.borrowed).toBe(1_100_920);
  });

  it("is neither income nor saved, but is money the bank held, so kept in the bank counts it", () => {
    expect(f.cameIn).toBe(200_000);
    expect(f.saved).toBe(200_000);
    expect(f.invested).toBe(1_100_920);
    // Borrowed and sent straight on to a broker: the salary is what stayed.
    expect(f.keptInBank).toBe(200_000);
  });

  it("counts in the all-accounts total and in its own month only", () => {
    expect(flows(items, null).borrowed).toBe(1_100_920);
    expect(flows(items, "sbi").borrowed).toBe(0);
    const months = monthlyFlows(moneyItems(d, "2026-06-01", "2026-08-31"), null, monthsIn("2026-06-01", "2026-08-31"));
    expect(months.map((m) => m.flows.borrowed)).toEqual([0, 1_100_920, 0]);
  });

  it("leaves out a loan paid into an account that isn't listed", () => {
    const stray = data({ ...d, loans: [{ ...hdfcLoan, accountId: "gone" }] });
    expect(moneyItems(stray, "2026-07-01", "2026-07-31").some((i) => i.kind === "Borrowed")).toBe(false);
  });

  it("leaves out a loan paid to a seller, and one outside the span", () => {
    expect(items.some((i) => i.label === "Car loan")).toBe(false);
    expect(moneyItems(d, "2026-08-01", "2026-08-31").some((i) => i.kind === "Borrowed")).toBe(false);
  });

  it("explains the balance it added, and shows as its own step on the bridge", () => {
    const withBalances = data({ ...d, snapshots: [snap("hdfc", "2026-06-30", 50_000), snap("hdfc", "2026-07-31", 250_000)] });
    const span = { from: "2026-07-01", to: "2026-07-31" };
    const its = moneyItems(withBalances, span.from, span.to);
    expect(everythingElse(withBalances, its, "hdfc", span.from, span.to).unexplained).toBe(0);
    expect(bridgeSteps(withBalances, its, "hdfc", span).find((s) => s.label === "Borrowed")?.amount).toBe(1_100_920);
  });
});

describe("Lent out and paid back", () => {
  const loan = { borrowerName: "Hotel Sonali Jan", principalAmount: 182_000, startDate: "2026-01-01", interestMode: "Paid-out", payoutFrequency: "Quarterly", payoutAmount: 18_000, status: "Active" } as const;
  const d = data({
    snapshots: [snap("hdfc", "2025-12-31", 200_000), snap("hdfc", "2026-03-31", 268_000)],
    lentLoans: [
      { ...loan, id: "j", paidFromAccountId: "hdfc" },
      // No account named, and one naming an account that isn't listed: neither is counted.
      { ...loan, id: "n", borrowerName: "Ranjith" },
      { ...loan, id: "g", borrowerName: "Gone", paidFromAccountId: "gone" },
    ],
    lentRepayments: [
      { id: "r1", lentLoanId: "j", date: "2026-03-01", amount: 50_000, kind: "Principal" },
      { id: "r2", lentLoanId: "n", date: "2026-03-01", amount: 9_999, kind: "Principal" },
    ],
    incomeEntries: [{ id: "e1", incomeSourceId: "salary", expectedDate: "2026-02-28", receivedDate: "2026-02-28", amount: 200_000, status: "Received", accountId: "hdfc", tag: "Regular" }],
  });
  const span = { from: "2026-01-01", to: "2026-03-31" };
  const items = moneyItems(d, span.from, span.to);
  const f = flows(items, "hdfc");

  it("counts the money lent on the day it left its account, and what came back into that account", () => {
    expect(items.filter((i) => i.kind === "Lent out")).toEqual([{ kind: "Lent out", date: "2026-01-01", amount: 182_000, accountId: "hdfc", label: "Hotel Sonali Jan" }]);
    expect(items.filter((i) => i.kind === "Paid back")).toEqual([{ kind: "Paid back", date: "2026-03-01", amount: 50_000, accountId: "hdfc", label: "Hotel Sonali Jan" }]);
    expect(f.lentOut).toBe(182_000);
    expect(f.paidBack).toBe(50_000);
    expect(f.lent).toBe(132_000);
  });

  it("isn't spending: saved stays came in less expenses, and kept in the bank takes the lending out", () => {
    expect(f.expenses).toBe(0);
    expect(f.saved).toBe(200_000);
    expect(f.keptInBank).toBe(200_000 - 132_000);
    expect(f.leftBank).toBe(182_000);
    expect(flows(items, null).lent).toBe(132_000);
  });

  it("explains the balance it moved, and shows both on the bridge", () => {
    // 2,00,000 + 2,00,000 salary − 1,82,000 lent + 50,000 back = 2,68,000: nothing left over.
    expect(everythingElse(d, items, "hdfc", span.from, span.to).unexplained).toBe(0);
    const steps = bridgeSteps(d, items, "hdfc", span);
    expect(steps.find((s) => s.label === "Lent out")?.amount).toBe(-182_000);
    expect(steps.find((s) => s.label === "Paid back")?.amount).toBe(50_000);
  });

  it("only counts a loan lent inside the span, but counts repayments on one lent before it", () => {
    const later = moneyItems(d, "2026-02-01", "2026-03-31");
    expect(later.some((i) => i.kind === "Lent out")).toBe(false);
    expect(later.filter((i) => i.kind === "Paid back").map((i) => i.amount)).toEqual([50_000]);
  });

  it("counts the principal still out as paid back on the day a loan is marked repaid", () => {
    const repaid = data({ ...d, lentLoans: [{ ...loan, id: "j", paidFromAccountId: "hdfc", status: "Repaid", closedDate: "2026-06-30" }] });
    const back = moneyItems(repaid, "2026-04-01", "2026-06-30").filter((i) => i.kind === "Paid back");
    // 1,82,000 lent, 50,000 of it back in March: 1,32,000 on the closing day.
    expect(back).toEqual([{ kind: "Paid back", date: "2026-06-30", amount: 132_000, accountId: "hdfc", label: "Hotel Sonali Jan" }]);
    expect(flows(moneyItems(repaid, "2026-01-01", "2026-06-30"), "hdfc").lent).toBe(0);
  });
});

describe("everythingElse: the change the records don't explain (decision 2)", () => {
  const base = data({
    snapshots: [snap("sbi", "2026-08-31", 100_000), snap("sbi", "2026-09-30", 150_000)],
    incomeEntries: [{ id: "e1", incomeSourceId: "salary", expectedDate: "2026-09-30", receivedDate: "2026-09-30", amount: 80_000, status: "Received", accountId: "sbi", tag: "Regular" }],
    statements: [{ id: "s1", cardId: "c1", statementDate: "2026-09-06", dueDate: "2026-09-26", totalAmountDue: 20_000, minimumAmountDue: 1000, status: "Paid", amountPaid: 20_000, paidFromAccountId: "sbi", paidDate: "2026-09-25" }],
  });
  it("is the balance change less what the records say came in and went out", () => {
    const items = moneyItems(base, "2026-09-01", "2026-09-30");
    const r = everythingElse(base, items, "sbi", "2026-09-01", "2026-09-30");
    expect(r.change).toBe(50_000);
    expect(r.explained).toBe(60_000);
    expect(r.unexplained).toBe(-10_000);
    // The three add back to the change exactly.
    expect(r.explained + r.unexplained).toBe(r.change);
  });
  it("doesn't take an account's opening balance for money coming in", () => {
    const opened = data({ snapshots: [snap("sbi", "2026-09-10", 70_000), snap("sbi", "2026-09-30", 75_000)] });
    expect(everythingElse(opened, [], "sbi", "2026-09-01", "2026-09-30").change).toBe(5_000);
  });
  it("is 0 for an account with no balance yet", () => {
    expect(everythingElse(empty, [], "sbi", "2026-09-01", "2026-09-30")).toEqual({ change: 0, explained: 0, unexplained: 0 });
  });
});

describe("comingUp (decision 14)", () => {
  const today = "2026-10-21";
  const d = data({
    snapshots: [snap("sbi", "2026-10-20", 10_000)],
    loans: [{ id: "l1", name: "Personal loan", lenderName: "HDFC", category: "Personal", repaymentStructure: "Standard-Emi", principalAmount: 500000, annualInterestRate: 11, tenureMonths: 36, paymentFrequency: "Monthly", processingFee: 0, disbursementDate: "2026-01-01", accountId: "sbi", status: "Active", firstEmiDate: "2026-02-01", stampDuty: 0, preEmiInterest: 0 }],
    installments: [
      { id: "i3", loanId: "l1", installmentNumber: 3, dueDate: "2026-11-05", openingBalance: 475000, principalDue: 12200, interestDue: 4383, totalDue: 16_583, status: "Pending" },
      { id: "i4", loanId: "l1", installmentNumber: 4, dueDate: "2027-03-05", openingBalance: 470000, principalDue: 12200, interestDue: 4383, totalDue: 16_583, status: "Pending" },
    ],
    statements: [{ id: "s1", cardId: "c1", statementDate: "2026-10-06", dueDate: "2026-10-26", totalAmountDue: 30_000, minimumAmountDue: 1500, status: "Pending" }],
    incomeEntries: [{ id: "e0", incomeSourceId: "salary", expectedDate: "2026-09-30", receivedDate: "2026-09-30", amount: 200_000, status: "Received", accountId: "hdfc", tag: "Regular" }],
  });
  const items = comingUp(d, null, today);

  it("lists an EMI inside the window, and warns when the account can't cover it", () => {
    const emi = items.filter((i) => i.kind === "EMI");
    expect(emi.map((i) => i.date)).toEqual(["2026-11-05"]);
    expect(emi[0].short).toBe(true);
  });

  it("doesn't warn when the account holds enough", () => {
    const rich = { ...d, snapshots: [snap("sbi", "2026-10-20", 20_000)] };
    expect(comingUp(rich, "sbi", today).find((i) => i.kind === "EMI")?.short).toBe(false);
  });

  it("doesn't warn when the account has no balance recorded", () => {
    const unknown = { ...d, snapshots: [] };
    expect(comingUp(unknown, "sbi", today).find((i) => i.kind === "EMI")?.short).toBe(false);
  });

  it("takes a billed statement as billed, then the next bill as about the last one", () => {
    const bills = items.filter((i) => i.kind === "Card bill");
    expect(bills[0]).toMatchObject({ date: "2026-10-26", amount: 30_000, about: false, accountId: "sbi" });
    expect(bills[1]).toMatchObject({ date: "2026-11-26", amount: 30_000, about: true });
  });

  it("projects the monthly salary into the account its last one landed in, once a month", () => {
    const salary = items.filter((i) => i.kind === "Salary");
    expect(salary).toEqual([expect.objectContaining({ date: "2026-10-30", amount: 200_000, accountId: "hdfc" })]);
  });

  it("doesn't project a salary the month already has an entry for", () => {
    const entered = { ...d, incomeEntries: [...d.incomeEntries, { id: "e1", incomeSourceId: "salary", expectedDate: "2026-10-31", amount: 205_000, status: "Pending" as const, accountId: "hdfc", tag: "Regular" as const }] };
    const salary = comingUp(entered, null, today).filter((i) => i.kind === "Salary");
    expect(salary.map((i) => i.amount)).toEqual([205_000]);
  });

  it("follows one account, soonest first", () => {
    const sbi = comingUp(d, "sbi", today);
    expect(sbi.every((i) => i.accountId === "sbi")).toBe(true);
    expect(sbi.map((i) => i.date)).toEqual([...sbi.map((i) => i.date)].sort());
  });
});

describe("bridgeSteps", () => {
  const d = data({
    snapshots: [snap("sbi", "2025-12-31", 100_000), snap("sbi", "2026-06-30", 130_000), snap("hdfc", "2026-03-01", 50_000), snap("hdfc", "2026-06-30", 60_000)],
    incomeEntries: [{ id: "e1", incomeSourceId: "salary", expectedDate: "2026-04-30", receivedDate: "2026-04-30", amount: 40_000, status: "Received", accountId: "sbi", tag: "Regular" }],
  });
  const span = { from: "2026-01-01", to: "2026-06-30" };
  const steps = bridgeSteps(d, moneyItems(d, span.from, span.to), null, span);

  it("starts on what was held the day before, ends on what's held at the end, and the steps add up between", () => {
    expect(steps[0]).toMatchObject({ label: "Start", amount: 100_000 });
    expect(steps.at(-1)).toMatchObject({ label: "Now", amount: 190_000 });
    const moved = steps.slice(1, -1).reduce((t, s) => t + s.amount, 0);
    expect(100_000 + moved).toBe(190_000);
  });

  it("shows an account first read inside the span as its own step, not as money coming in", () => {
    expect(steps.find((s) => s.label === "Accounts opened")?.amount).toBe(50_000);
    expect(steps.find((s) => s.label === "Came in")?.amount).toBe(40_000);
    // SBI +30,000 and HDFC +10,000 since its first balance: 40,000 explained by income, 0 left over.
    expect(steps.find((s) => s.label === "Everything else")).toBeUndefined();
  });
});
