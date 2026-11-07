import { describe, expect, it } from "vitest";
import { cashLine, insightCounts, insights } from "./insights";
import type { OverviewEvent } from "./events";
import { overviewModel, type OverviewData } from "./model";
import { generateInstallments } from "@/lib/schedule/generateInstallments";
import type { Account, FixedDeposit, IncomeSource, Instrument, InvestmentTransaction, LentLoan, Loan, Subscription } from "@/lib/sheets/types";

const TODAY = "2026-11-07";
const acct = (id: string, accountType: Account["accountType"] = "Savings"): Account => ({ id, name: id, bank: "B", accountType, purpose: "Spending", startDate: "2026-01-01", status: "Active" });
const loan: Loan = { id: "l1", name: "Car Loan", lenderName: "HDFC", category: "Auto", repaymentStructure: "Standard-Emi", principalAmount: 600000, annualInterestRate: 9.4, tenureMonths: 36, paymentFrequency: "Monthly", processingFee: 0, disbursementDate: "2026-06-01", accountId: "a1", status: "Active", firstEmiDate: "2026-07-02", stampDuty: 0, preEmiInterest: 0 } as Loan;
const installments = generateInstallments(loan).map((r, i) => ({ ...r, loanId: "l1", id: `i${i}`, status: i < 4 ? ("Paid" as const) : ("Pending" as const) }));
const fd: FixedDeposit = { id: "f1", name: "ICICI FD", principalAmount: 150000, interestRate: 7, compoundingType: "Cumulative", startDate: "2025-11-03", maturityDate: "2026-11-03", maturityAmount: 160500, status: "Active" };
const trade = (symbol: string, qty: number, source: InvestmentTransaction["source"] = "Market"): InvestmentTransaction => ({ id: symbol, tradeDate: "2026-02-01", symbol, market: "IND", currency: "INR", tradeType: "Buy", source, quantity: qty, price: 100, total: qty * 100, assetType: "Equity", broker: "B" });
const inst = (symbol: string): Instrument => ({ symbol, market: "IND", name: symbol, priceTicker: `${symbol}.NS`, assetType: "Equity" }) as unknown as Instrument;
const sub = (id: string, amount: number): Subscription => ({ id, name: id, alias: id, category: "Software", amount, billingCycle: "Monthly", billingAnchorDate: "2026-01-09", startDate: "2026-01-09", status: "Active" });
const lent = (id: string, name: string, principal: number): LentLoan => ({ id, borrowerName: name, principalAmount: principal, startDate: "2026-01-01", interestMode: "Accruing", interestRate: 12, status: "Active" });
const income: IncomeSource = { id: "s", name: "Salary", alias: "", category: "Salary", frequency: "Monthly", expectedAmount: 200000, scheduleDate: "2026-11-30", status: "Active" } as unknown as IncomeSource;

const data = (over: Partial<OverviewData> = {}): OverviewData => ({
  accounts: [acct("a1"), acct("b1", "Brokerage")], balanceSnapshots: [{ id: "s1", accountId: "a1", date: "2026-11-01", balance: 300000 }, { id: "s2", accountId: "b1", date: "2026-11-01", balance: 120000 }], unpriced: undefined, cards: [], statements: [],
  subscriptions: [sub("a", 800), sub("b", 500), sub("c", 400), sub("d", 100)], subscriptionPayments: [], loans: [loan], loanInstallments: installments, loanPrepayments: [],
  trades: [trade("AAA", 600), trade("BBB", 200), trade("CCC", 200)], instruments: [inst("AAA"), inst("BBB"), inst("CCC")], closes: new Map(), pricesFailed: false,
  fixedDeposits: [fd], incomeEntries: [], incomeSources: [income], epf: { accounts: [], entries: [], rates: [], failed: false }, lent: { loans: [lent("x", "Friend", 300000), lent("y", "Cousin", 100000)], repayments: [], failed: false },
  goals: { goals: [], contributions: [], failed: false }, insurance: { policies: [], payments: [], failed: false }, ...over,
});
const ev = (date: string, amount: number, over: Partial<OverviewEvent> = {}): OverviewEvent => ({ id: `${date}${amount}`, date, label: "x", sub: "", amount, kind: "emi", page: "loans", cash: true, ...over });
const model = overviewModel(data(), TODAY);

describe("cashLine", () => {
  it("applies each dated cash event day by day to the spending accounts only, and finds the lowest day", () => {
    const l = cashLine(model, [ev("2026-11-10", -100000), ev("2026-11-20", -150000), ev("2026-11-30", 248000), ev("2026-11-12", 5, { cash: false })])!;
    expect(l.start).toBe(300000); // the broker's 1,20,000 is left out
    expect(l.points).toHaveLength(31);
    expect(l.lowest).toEqual({ value: 50000, index: 13 });
    expect(l.points.at(-1)).toBe(298000);
    expect(l.nextIncome?.date).toBe("2026-11-30");
  });
  it("is nothing without a spending account or without dated cash events", () => {
    expect(cashLine(model, [])).toBeNull();
    expect(cashLine(model, [ev("2026-11-10", -1, { cash: false })])).toBeNull();
  });
});

describe("insights", () => {
  const list = insights(model, [ev("2026-11-10", -100000), ev("2026-11-30", 248000)]);
  const by = (k: string) => list.find((i) => i.key === k);
  it("gives each of the eight when its data is there", () => {
    expect(list.map((i) => i.key)).toEqual(["cash-dip", "prepay", "concentration", "idle-cash", "spoken-for", "borrower", "subscriptions", "loan-ends"]);
  });
  it("the matured deposit against the loan: interest saved is what the schedule loses, the card compares it with the deposit", () => {
    const p = by("prepay")!;
    expect(p.title).toContain("ICICI FD");
    expect(p.title).toContain("Car Loan");
    expect(p.vis.kind).toBe("bars");
    if (p.vis.kind === "bars") expect(p.vis.rows[0].value).toBeGreaterThan(p.vis.rows[1].value); // interest falls
    expect(p.how.join(" ")).toContain("rebuilds the schedule");
  });
  it("concentration is the biggest holding's share of the investments", () => {
    expect(by("concentration")!.title).toContain("60%");
    const employer = overviewModel(data({ trades: [trade("AAA", 600, "RSU"), trade("BBB", 400)] }), TODAY);
    expect(insights(employer, [])[0].title).toBeDefined();
  });
  it("idle cash is the brokers' balance over holdings plus that cash, starred from a tenth", () => {
    const c = by("idle-cash")!;
    expect(c.title).toContain("₹1.2L");
    expect(c.star).toBe(true); // 1,20,000 of 2,20,000 held: well over a tenth
  });
  it("a month spoken for adds the EMIs to the premiums over the usual monthly income", () => {
    const s = by("spoken-for")!;
    expect(s.title).toMatch(/^\d+% of every month's income/);
  });
  it("one borrower's share of what is lent, starred when it is more than half", () => {
    const b = by("borrower")!;
    expect(b.title).toContain("Friend");
    expect(b.star).toBe(true);
    expect(b.title).toMatch(/7\d%/);
  });
  it("subscriptions cost a year is twelve months, and the top three's part of it", () => {
    const s = by("subscriptions")!;
    expect(s.title).toContain("₹21.6k"); // 1,800 a month
    expect(s.body).toContain("Three of them are 94%");
  });
  it("when a loan ends is its last installment still to pay, with the interest left", () => {
    const e = by("loan-ends")!;
    expect(e.title).toContain("Car Loan ends");
    expect(e.vis.kind === "bars" && e.vis.rows[0].value).toBe(installments.filter((i) => i.status === "Pending").length);
  });
  it("leaves out what has nothing to say, and counts what is left", () => {
    const bare = insights(overviewModel(data({ loans: [], loanInstallments: [], fixedDeposits: [], lent: { loans: [lent("x", "Friend", 1)], repayments: [], failed: false }, subscriptions: [], trades: [], incomeSources: [] }), TODAY), []);
    expect(bare.map((i) => i.key)).toEqual(["idle-cash"]);
    expect(insights(overviewModel(data({ accounts: [], balanceSnapshots: [], trades: [], loans: [], loanInstallments: [], fixedDeposits: [], lent: { loans: [], repayments: [], failed: false }, subscriptions: [], incomeSources: [] }), TODAY), [])).toEqual([]);
  });
  it("counts the cards under each tag", () => {
    const c = insightCounts(list);
    expect(c.all).toBe(8);
    expect(c.debt).toBe(2);
    expect(c.risk).toBe(2);
    expect(c.habits).toBe(2);
    expect(c.cash).toBe(1);
    expect(c.growth).toBe(1);
  });
});
