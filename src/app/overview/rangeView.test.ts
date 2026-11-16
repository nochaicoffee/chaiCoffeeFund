import { describe, expect, it } from "vitest";
import { parsePeriodParam } from "@/lib/aggregate/period";
import type { Account, Card, GoalContribution, Loan, PolicyPayment, Statement, SubscriptionPayment } from "@/lib/sheets/types";
import { overviewModel, type OverviewData } from "./model";
import type { MonthlyView } from "./monthlyView";
import { incomeBySource, rangeFigures, tileRanges } from "./rangeView";
import { greetingView, netWorthView, summarySentence, tilesView } from "./views";

const account: Account = { id: "a1", name: "HDFC Salary", bank: "HDFC", accountType: "Savings", purpose: "Spending", startDate: "2026-01-01", status: "Active" };
const card: Card = { id: "c1", name: "Regalia", alias: "HDFC Regalia", issuer: "HDFC-Bank", cardType: "Cashback", creditLimit: 100000, statementDay: 1, dueDayBuffer: 19, status: "Active" };
const statement: Statement = { id: "st1", cardId: "c1", statementDate: "2026-10-28", dueDate: "2026-11-18", totalAmountDue: 30000, minimumAmountDue: 500, status: "Pending" };
const loan = { id: "l1", name: "Home Loan", lenderName: "SBI", category: "Home", repaymentStructure: "Standard-Emi", principalAmount: 200000, annualInterestRate: 9, tenureMonths: 3, paymentFrequency: "Monthly", processingFee: 0, disbursementDate: "2026-06-01", accountId: "a1", status: "Active", firstEmiDate: "2026-07-02", stampDuty: 0, preEmiInterest: 0 } as Loan;
const sub: SubscriptionPayment = { id: "sp1", subscriptionId: "s", paymentDate: "2026-10-05", amount: 499, status: "Paid" };
const goal: GoalContribution = { id: "gc1", goalId: "g", date: "2026-10-10", amount: 5000, kind: "Set-aside" };
const premium: PolicyPayment = { id: "pp1", policyId: "p", periodStart: "2026-10-01", years: 1, amount: 24600, paidOn: "2026-10-12", status: "Paid" };
const income = (id: string, date: string, amount: number, source = "sal") => ({ id, incomeSourceId: source, expectedDate: date, receivedDate: date, amount, status: "Received" as const, tag: "Regular" as const, accountId: "a1" });

const data: OverviewData = {
  accounts: [account], balanceSnapshots: [{ id: "s1", accountId: "a1", date: "2026-08-01", balance: 300000 }, { id: "s2", accountId: "a1", date: "2026-10-31", balance: 360000 }], unpriced: undefined, cards: [card], statements: [statement],
  subscriptions: [], subscriptionPayments: [sub], loans: [loan], loanInstallments: [], loanPrepayments: [], trades: [], instruments: [], closes: new Map(), pricesFailed: false,
  fixedDeposits: [], incomeEntries: [income("i1", "2026-09-01", 100000), income("i2", "2026-10-01", 150000), income("i3", "2026-10-15", 20000, "side"), income("i4", "2026-05-01", 999)],
  incomeSources: [{ id: "sal", name: "Salary" }, { id: "side", name: "Side work", alias: "Freelance" }] as OverviewData["incomeSources"],
  epf: { accounts: [], entries: [], rates: [], failed: false }, lent: { loans: [], repayments: [], failed: false },
  goals: { goals: [], contributions: [goal], failed: false }, insurance: { policies: [], payments: [premium], failed: false },
};

const TODAY = "2026-11-07";
const SEP_NOV = ["2026-09", "2026-10", "2026-11"];
const SEP_OCT = ["2026-09", "2026-10"];

/** What the widget would have worked out, as far as the page's glue needs it. */
function monthlyOf(totals: { income: number; invested?: number; emis?: number; cards?: number; spent?: number | null }): MonthlyView {
  const m = (key: string, total: number) => ({ meta: { key }, summary: { total, average: total / 2, months: 2, peak: null } });
  return {
    measures: [m("income", totals.income), m("invested", totals.invested ?? 0), m("emis", totals.emis ?? 0), m("cards", totals.cards ?? 0), m("cash", 0)],
    spent: { total: totals.spent ?? 0, months: totals.spent === null ? 0 : 2, parts: { card: 30000, emi: 0, subs: 499, ins: 0, big: 0, cash: 20000 } },
  } as unknown as MonthlyView;
}

const period = parsePeriodParam("2026-09..2026-11", TODAY);
const past = parsePeriodParam("2026-09..2026-10", TODAY);
const model = overviewModel(data, TODAY, SEP_NOV);
const pastModel = overviewModel(data, TODAY, SEP_OCT);

describe("rangeFigures", () => {
  const r = rangeFigures(model, monthlyOf({ income: 270000, invested: 40000, emis: 10000, cards: 30000, spent: 90000 }), period, TODAY);
  it("takes the five measures' totals from the widget, so the page and the widget agree", () => {
    expect(r).toMatchObject({ cameIn: 270000, invested: 40000, emis: 10000, cards: 30000, spent: 90000, spentMonths: 2, spentAverage: 45000 });
    expect(r.incomeAverage).toBe(135000);
  });
  it("adds what was paid or put aside inside the period", () => {
    expect(r).toMatchObject({ subsPaid: 499, goalsAdded: 5000, premiums: 24600 });
  });
  it("words the period as the other dashboards do, and says whether it runs to today", () => {
    expect(r.includesToday).toBe(true);
    expect(rangeFigures(pastModel, monthlyOf({ income: 1 }), past, TODAY).includesToday).toBe(false);
    expect(r.when).toBe("in Sep – Nov 2026");
  });
  it("has no spent figure when no month has ended", () => {
    expect(rangeFigures(model, monthlyOf({ income: 0, spent: null }), period, TODAY)).toMatchObject({ spent: null, spentAverage: null });
  });
  it("leaves out what happened outside the period", () => {
    expect(rangeFigures(overviewModel(data, TODAY, ["2026-05"]), monthlyOf({ income: 0 }), parsePeriodParam("2026-05..2026-05", TODAY), TODAY)).toMatchObject({ subsPaid: 0, goalsAdded: 0, premiums: 0 });
  });
});

describe("incomeBySource", () => {
  it("adds what was received in the period by source, largest first, and names the source by its alias", () => {
    const r = rangeFigures(model, monthlyOf({ income: 270000 }), period, TODAY);
    expect(incomeBySource(model, r)).toEqual([{ id: "sal", name: "Salary", amount: 250000 }, { id: "side", name: "Freelance", amount: 20000 }]);
  });
});

describe("tileRanges", () => {
  const r = rangeFigures(model, monthlyOf({ income: 270000, invested: 40000, emis: 10000, cards: 30000, spent: 90000 }), period, TODAY);
  const t = tileRanges(model, r);
  it("says how each balance moved, and keeps its headline while the period runs to today", () => {
    expect(t.accounts?.sub).toMatch(/^up ₹/);
    expect(t.accounts?.sub).toContain("in Sep – Nov 2026");
    expect(t.accounts?.value).toBeUndefined();
  });
  it("turns Income and Spent into the period's totals, with a hover card for each", () => {
    expect(t.income).toMatchObject({ per: "", sub: expect.stringContaining("a month") });
    expect(t.income?.card?.rows.map((x) => x.name)).toEqual(["Salary", "Freelance"]);
    expect(t.spent?.card?.rows.map((x) => x.name)).toContain("Card bills");
    expect(t.spent?.sub).toContain("avg");
  });
  it("words what was paid or added", () => {
    expect(t.cards?.sub).toContain("paid in bills");
    expect(t.loans?.sub).toContain("in EMIs");
    expect(t.subs?.sub).toContain("paid");
    expect(t.goals?.sub).toContain("added");
    expect(t.ins?.sub).toContain("in premiums");
  });
  it("leaves Spent alone when no month has ended, and Due this month always", () => {
    const none = tileRanges(model, rangeFigures(model, monthlyOf({ income: 0, spent: null }), period, TODAY));
    expect(none.spent).toBeUndefined();
    expect(t.due).toBeUndefined();
  });
  it("shows a balance as it stood at the end of a period that is over", () => {
    const pr = rangeFigures(pastModel, monthlyOf({ income: 1 }), past, TODAY);
    const pt = tileRanges(pastModel, pr);
    expect(pt.accounts?.value).toBeDefined();
    expect(pt.loans?.value).toBeDefined();
  });
  it("shows nothing owed as ₹0, not −₹0", () => {
    const pr = rangeFigures(overviewModel({ ...data, statements: [], loans: [] }, TODAY, SEP_OCT), monthlyOf({ income: 1 }), past, TODAY);
    const pt = tileRanges(overviewModel({ ...data, statements: [], loans: [] }, TODAY, SEP_OCT), pr);
    expect(pt.cards?.value).toBe("₹0");
    expect(pt.loans?.value).toBe("₹0");
  });
});

describe("the page over a period", () => {
  const r = rangeFigures(model, monthlyOf({ income: 270000, spent: 90000 }), period, TODAY);
  const text = (parts: { text: string }[]) => parts.map((p) => p.text).join("");

  it("reads the greeting over the period: what came in and went out, what you're worth, how it moved since it began", () => {
    const parts = summarySentence(model, [], r);
    expect(text(parts)).toMatch(/^Since September 2026 you took in .* and, by the end of October 2026, spent .*, and you're worth ₹.*, up ₹.* since the end of August 2026/);
    expect(parts.filter((p) => p.point).map((p) => p.point)).toEqual(["in", "out", "net", "change", "left"]);
    expect(text(parts)).toContain("is still to pay this month");
  });
  it("says where spent stops only when the period includes the month in progress", () => {
    expect(text(summarySentence(model, [], r))).toContain("by the end of October 2026, spent");
    const pr = rangeFigures(pastModel, monthlyOf({ income: 1000, spent: 500 }), past, TODAY);
    expect(pr.spentThrough).toBeNull();
    expect(text(summarySentence(pastModel, [], pr))).toContain(" and spent ");
    expect(r.spentThrough).toBe("2026-10");
  });
  it("says it ended worth, not is worth, when the period is over", () => {
    const pr = rangeFigures(pastModel, monthlyOf({ income: 1000, spent: 500 }), past, TODAY);
    expect(text(summarySentence(pastModel, [], pr))).toContain("and you ended worth ₹");
  });
  it("leaves out what it can't say: no spent figure, nothing came in", () => {
    const nothing = rangeFigures(model, monthlyOf({ income: 0, spent: null }), period, TODAY);
    expect(text(summarySentence(model, [], nothing))).toMatch(/^You're worth ₹/);
    const noSpent = rangeFigures(model, monthlyOf({ income: 5000, spent: null }), period, TODAY);
    expect(text(summarySentence(model, [], noSpent))).not.toContain("spent");
  });
  it("keeps the old sentence without a period", () => {
    expect(text(summarySentence(model, []))).toContain("on last month");
  });
  it("gives the new figures a card, and drops the old month and year ones", () => {
    const cards = greetingView(model, [], r);
    expect(Object.keys(cards)).toEqual(expect.arrayContaining(["net", "change", "in", "out"]));
    expect(cards.month).toBeUndefined();
    expect(cards.year).toBeUndefined();
    expect(cards.out?.rows.map((x) => x.name)).toContain("Card bills");
  });
  it("shows net worth at the end of a period that is over, not today", () => {
    const view = netWorthView(pastModel)!;
    expect(view.months.at(-1)?.today).toBe(false);
    expect(view.months.at(-1)?.full).toBe("October 2026");
    expect(netWorthView(model)!.months.at(-1)?.today).toBe(true);
  });
  it("puts the period on the tiles", () => {
    const tiles = tilesView(model, [], null, r);
    const income = tiles.find((x) => x.key === "income")!;
    expect(income.sub).toContain("avg");
    expect(income.tag).toBe("Sep – Nov 2026");
    expect(tiles.find((x) => x.key === "due")!.sub).toBe(tilesView(model, []).find((x) => x.key === "due")!.sub);
  });
});
