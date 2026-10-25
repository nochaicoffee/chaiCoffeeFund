import { describe, expect, it } from "vitest";
import { bridgeSteps, cameInBySource, comingUp, everythingElse, flows, monthlyFlows, monthsIn, moneyItems, type AccountsData } from "./accountFlows";

const empty: AccountsData = {
  accounts: [
    { id: "sbi", name: "SBI", bank: "SBI", accountType: "Savings", purpose: "Spending", startDate: "2020-01-01", status: "Active" },
    { id: "hdfc", name: "HDFC", bank: "HDFC", accountType: "Savings", purpose: "Emergency-Fund", startDate: "2020-01-01", status: "Active" },
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
    expect(f.out.Investments).toBe(15_000 + 100 * 83);
  });

  it("leaves out what's charged to a card, because that card's bill already holds it", () => {
    const all = items.filter((i) => i.kind === "Subscriptions" || i.kind === "EMIs" || i.kind === "Card bills");
    expect(all.map((i) => i.amount).sort((a, b) => a - b)).toEqual([1000, 16_583, 30_000]);
  });

  it("counts income received, not pending, and a sale as sold, not as came in", () => {
    const f = flows(items, "sbi");
    expect(f.cameIn).toBe(200_000);
    expect(f.sold).toBe(1_500);
  });

  it("works saved as came in − expenses, so investing counts as saved (decision 19)", () => {
    const f = flows(items, "sbi");
    expect(f.expenses).toBe(30_000 + 1000 + 16_583);
    expect(f.saved).toBe(200_000 - f.expenses);
    expect(f.keptInBank).toBe(f.saved - f.invested);
    expect(f.invested).toBe(23_300);
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
