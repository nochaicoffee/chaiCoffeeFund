import { describe, expect, it } from "vitest";
import { overviewModel, type OverviewData } from "./model";
import { greetingView, monthFigures, netWorthView, summarySentence, tilesView } from "./views";
import type { OverviewWarning } from "./warnings";
import type { Account, Card, Instrument, InvestmentTransaction, Loan, LoanInstallment, Statement } from "@/lib/sheets/types";

const account: Account = { id: "a1", name: "HDFC Salary", bank: "HDFC", accountType: "Savings", purpose: "Spending", startDate: "2026-01-01", status: "Active" };
const card: Card = { id: "c1", name: "Regalia", alias: "HDFC Regalia", issuer: "HDFC-Bank", cardType: "Cashback", creditLimit: 100000, statementDay: 1, dueDayBuffer: 19, status: "Active" };
const statement: Statement = { id: "st1", cardId: "c1", statementDate: "2026-10-28", dueDate: "2026-11-18", totalAmountDue: 30000, minimumAmountDue: 500, status: "Pending" };
const loan = { id: "l1", name: "Home Loan", lenderName: "SBI", category: "Home", repaymentStructure: "Standard-Emi", principalAmount: 200000, annualInterestRate: 9, tenureMonths: 3, paymentFrequency: "Monthly", processingFee: 0, disbursementDate: "2026-06-01", accountId: "a1", status: "Active", firstEmiDate: "2026-07-02", stampDuty: 0, preEmiInterest: 0 } as Loan;
const installments: LoanInstallment[] = [
  { id: "i1", loanId: "l1", installmentNumber: 1, dueDate: "2026-11-02", openingBalance: 200000, principalDue: 100000, interestDue: 0, totalDue: 31200, status: "Paid", paidDate: "2026-11-02", amountPaid: 31200 },
  { id: "i2", loanId: "l1", installmentNumber: 2, dueDate: "2026-12-02", openingBalance: 100000, principalDue: 100000, interestDue: 0, totalDue: 31200, status: "Pending" },
];
const trade: InvestmentTransaction = { id: "t1", tradeDate: "2026-08-10", symbol: "AAA", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 10, price: 1000, total: 10000, assetType: "Equity", broker: "B" };
const instrument = { symbol: "AAA", market: "IND", name: "AAA", priceTicker: "AAA.NS", assetType: "Equity" } as unknown as Instrument;
const data: OverviewData = {
  accounts: [account], balanceSnapshots: [{ id: "s1", accountId: "a1", date: "2026-08-01", balance: 300000 }], unpriced: undefined, cards: [card], statements: [statement], subscriptions: [], subscriptionPayments: [],
  loans: [loan], loanInstallments: installments, loanPrepayments: [], trades: [trade], instruments: [instrument], closes: new Map([["AAA.NS", [{ date: "2026-08-10", close: 1000 }, { date: "2026-11-05", close: 1500 }]]]), pricesFailed: false,
  fixedDeposits: [], incomeEntries: [], incomeSources: [], epf: { accounts: [], entries: [], rates: [], failed: false }, lent: { loans: [], repayments: [], failed: false }, goals: { goals: [], contributions: [], failed: false }, insurance: { policies: [], payments: [], failed: false },
};
const TODAY = "2026-11-07";
const model = overviewModel(data, TODAY);
const warning = (tone: OverviewWarning["tone"], page: OverviewWarning["page"]): OverviewWarning => ({ id: `${tone}${page}`, tone, page, text: "t", detail: "d", act: "a", href: "/", date: null });

describe("monthFigures", () => {
  it("still to pay is the card bill and the next EMI; paid is the EMI paid this month; due is both", () => {
    const f = monthFigures(model);
    expect(f.paid).toBe(31200);
    expect(f.stillToPay).toBe(30000); // the December EMI is not this month's
    expect(f.due).toBe(61200);
  });
});

describe("summarySentence and greetingView", () => {
  const parts = summarySentence(model, [warning("red", "loans"), warning("amber", "goals")]);
  it("says what you're worth, how it moved, what's left to pay and what to keep in mind, each figure pointing", () => {
    const text = parts.map((p) => p.text).join("");
    expect(text).toContain("You're worth ₹");
    expect(text).toContain("is still to pay this month");
    expect(text).toContain("2 things");
    expect(text).toContain("1 of them today");
    expect(parts.filter((p) => p.point).map((p) => p.point)).toEqual(expect.arrayContaining(["net", "left", "look"]));
  });
  it("every figure that points has a card behind it, and one with nothing behind it has none", () => {
    const cards = greetingView(model, [warning("red", "loans")]);
    for (const p of parts.filter((x) => x.point)) expect(cards[p.point as keyof typeof cards], p.point).toBeDefined();
    expect(greetingView(model, []).look).toBeUndefined();
    expect(summarySentence(model, []).map((p) => p.text).join("")).toContain("nothing needs a look");
  });
  it("says nothing is left to pay when nothing is", () => {
    const paid = overviewModel({ ...data, statements: [], loanInstallments: [{ ...installments[0] }] }, TODAY);
    expect(summarySentence(paid, []).map((p) => p.text).join("")).toContain("Nothing is left to pay this month");
  });
});

describe("netWorthView", () => {
  it("has a month for each point, the last being today's net worth as the sentence says it", () => {
    const view = netWorthView(model)!;
    expect(view.months.at(-1)).toMatchObject({ today: true, full: "today", net: model.worth.netWorth });
    expect(view.months.every((m) => m.net > 0 || m.owned > 0)).toBe(true);
    expect(view.months[0].vsPrev).toBeNull();
    expect(view.months[0].sinceFirst).toBeNull();
    expect(view.months.at(-1)!.vsPrev).not.toBeNull();
  });
  it("lists what it is made of: each type that has money, the loans by name", () => {
    const names = netWorthView(model)!.months.at(-1)!.chips.map((c) => c.name);
    expect(names).toEqual(["Bank and brokers", "Investments", "Home Loan", "Card bills"]);
  });
  it("is nothing when there is no month with anything owned, and says when prices were missing", () => {
    expect(netWorthView(overviewModel({ ...data, accounts: [], balanceSnapshots: [], trades: [] }, TODAY))).toBeNull();
    expect(netWorthView(overviewModel({ ...data, closes: new Map(), pricesFailed: true }, TODAY))!.note).toContain("cost");
  });
});

describe("tilesView", () => {
  const tiles = tilesView(model, [warning("red", "loans"), warning("amber", "loans")]);
  it("has twelve tiles in order, the pages then Due this month and Spent", () => {
    expect(tiles.map((t) => t.key)).toEqual(["accounts", "invest", "fixed", "lent", "cards", "loans", "income", "subs", "goals", "ins", "due", "spent"]);
    expect(new Set(tiles.map((t) => t.group))).toEqual(new Set(["Assets", "Debts", "Cash flow", "Plans and cover", "This month"]));
  });
  it("shows investments at market value and debts as owed", () => {
    expect(tiles.find((t) => t.key === "invest")!.card.total).toBe("₹15,000");
    expect(tiles.find((t) => t.key === "cards")!).toMatchObject({ owe: true, tag: "you owe" });
    expect(tiles.find((t) => t.key === "loans")!.value.startsWith("−")).toBe(true);
  });
  it("carries a dot for each warning its page has, and links each tile to its page", () => {
    expect(tiles.find((t) => t.key === "loans")!.flags).toEqual(["red", "amber"]);
    expect(tiles.find((t) => t.key === "cards")!.flags).toEqual([]);
    expect(tiles.find((t) => t.key === "goals")!.href).toBe("/goals");
  });
  it("Due this month is what is still to pay plus what is paid, and says how much is left", () => {
    expect(tiles.find((t) => t.key === "due")!.card.total).toBe("₹61,200");
    expect(tiles.find((t) => t.key === "due")!.card.rows).toContainEqual({ name: "Still to pay", amount: "₹30,000" });
    expect(tiles.find((t) => t.key === "due")!.sub).toContain("50% paid");
  });
  it("Spent opens Expenses with its own words, and says so when they couldn't be read", () => {
    const spent = { value: "₹1.3L", tag: "in Oct", sub: "₹29.8k cash and UPI", card: { title: "Spent in October 2026", total: "₹1,30,878", rows: [] } };
    expect(tilesView(model, [], spent).find((t) => t.key === "spent")).toMatchObject({ href: "/expenses", value: "₹1.3L", group: "This month" });
    expect(tiles.find((t) => t.key === "spent")).toMatchObject({ value: "—", sub: "couldn't be read" });
  });
});
