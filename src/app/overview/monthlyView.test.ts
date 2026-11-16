import { describe, expect, it } from "vitest";
import type { ExpenseData } from "@/lib/aggregate/expenses";
import { parsePeriodParam } from "@/lib/aggregate/period";
import type { Account, BalanceSnapshot, Statement, Transfer } from "@/lib/sheets/types";
import { formatInrCompact } from "@/lib/format/money";
import { columnLabel, earliestFlowMonth, FLOW_META, menuYears, monthlyView, ordinal, periodMenu, periodMenuValue, rangePickerStart } from "./monthlyView";

// Mid-November 2026: October is the last month that has ended, November is in progress.
const TODAY = "2026-11-16";

const account = (id: string, over: Partial<Account> = {}): Account => ({ id, name: id, bank: "B", accountType: "Savings", purpose: "Spending", startDate: "2020-01-01", status: "Active", ...over });
const bal = (accountId: string, date: string, balance: number): BalanceSnapshot => ({ id: `${accountId}@${date}`, accountId, date, balance });
const income = (date: string, amount: number) => ({ id: `i${date}`, incomeSourceId: "sal", expectedDate: date, receivedDate: date, amount, status: "Received" as const, tag: "Regular" as const, accountId: "hdfc" });
const statement = (over: Partial<Statement>): Statement => ({ id: "s1", cardId: "c1", statementDate: "2026-09-20", dueDate: "2026-10-08", totalAmountDue: 30000, minimumAmountDue: 1500, status: "Paid", amountPaid: 30000, paidDate: "2026-10-05", paidFromAccountId: "hdfc", ...over });
const transfer = (over: Partial<Transfer>): Transfer => ({ id: `t${over.date}`, date: "2026-10-10", fromAccountId: "hdfc", toAccountId: "ind", amount: 1000, ...over });

function data(over: Partial<ExpenseData> = {}): ExpenseData {
  return {
    accounts: [account("hdfc"), account("ind", { accountType: "Brokerage" })],
    snapshots: [bal("hdfc", "2026-08-31", 100000), bal("hdfc", "2026-09-30", 100000), bal("hdfc", "2026-10-31", 100000)],
    usdInr: [],
    usdInrToday: 88,
    incomeEntries: [income("2026-09-01", 150000), income("2026-10-01", 200000), income("2026-11-01", 5000)],
    incomeSources: [],
    cards: [],
    statements: [statement({})],
    subscriptions: [],
    subscriptionPayments: [],
    loans: [],
    installments: [],
    prepayments: [],
    policies: [],
    policyPayments: [],
    transfers: [transfer({ date: "2026-10-10", amount: 40000 })],
    fixedDeposits: [],
    lentLoans: [],
    lentRepayments: [],
    bigSpends: [],
    goals: [],
    ...over,
  } as ExpenseData;
}

const measure = (view: ReturnType<typeof monthlyView>, key: string) => view.measures.find((m) => m.meta.key === key)!;

describe("monthlyView", () => {
  it("shows this year's five together, a column for each of its twelve months", () => {
    const view = monthlyView(data(), parsePeriodParam(undefined, TODAY), TODAY);
    expect(view.together).toBe(true);
    expect(view.columns).toHaveLength(12);
    expect(view.measures.map((m) => m.meta.key)).toEqual(["income", "invested", "emis", "cards", "cash"]);
    expect(view.empty).toBe(false);
  });

  it("reads each measure from the Expenses months: income received, cards paid, invested, and nothing for EMIs", () => {
    const view = monthlyView(data(), parsePeriodParam(undefined, TODAY), TODAY);
    const oct = (key: string) => measure(view, key).row.find((c) => c.month === "2026-10")!;
    expect(oct("income").amount).toBe(200000);
    expect(oct("cards").amount).toBe(30000);
    expect(oct("invested").amount).toBe(40000);
    expect(oct("emis").amount).toBeNull();
  });

  it("makes the headline the latest month so far, saying so while it is in progress", () => {
    const view = monthlyView(data(), parsePeriodParam(undefined, TODAY), TODAY);
    expect(measure(view, "income")).toMatchObject({ headline: formatInrCompact(5000), headlineNote: "November so far" });
    expect(measure(view, "emis")).toMatchObject({ headline: "–" });
    const past = monthlyView(data(), parsePeriodParam("2026-08..2026-10", TODAY), TODAY);
    expect(measure(past, "income")).toMatchObject({ headline: formatInrCompact(200000), headlineNote: "October" });
  });

  it("works out cash and UPI only for months that have ended", () => {
    const view = monthlyView(data(), parsePeriodParam(undefined, TODAY), TODAY);
    const cash = measure(view, "cash").row;
    expect(cash.find((c) => c.month === "2026-11")!.amount).toBeNull();
    // October: 200,000 came in, 40,000 went to the broker and the bank ended where it began, so 160,000 was spent, 30,000 of it card bills.
    expect(cash.find((c) => c.month === "2026-10")!.amount).toBe(130000);
  });

  it("moves the five onto buttons past twelve months, with no side-by-side row", () => {
    // Records from January 2025 make all time twenty-three months long.
    const view = monthlyView(data({ incomeEntries: [income("2025-01-01", 100000), income("2026-10-01", 200000)] }), parsePeriodParam("all", TODAY), TODAY);
    expect(view.together).toBe(false);
    expect(view.columns).toEqual([]);
    expect(measure(view, "income").row).toEqual([]);
    expect(measure(view, "income").focus.rows.length).toBeGreaterThan(0);
  });

  it("starts all time for each measure where that measure's own records do", () => {
    const view = monthlyView(data({ incomeEntries: [income("2024-03-01", 90000), income("2026-10-01", 200000)], statements: [statement({})] }), parsePeriodParam("all", TODAY), TODAY);
    expect(measure(view, "income").focus.rows.map((r) => r.year)).toEqual([2024, 2025, 2026]);
    expect(measure(view, "cards").focus.rows.map((r) => r.year)).toEqual([2026]);
  });

  it("keeps a measure's totals for the period it was asked about", () => {
    const view = monthlyView(data(), parsePeriodParam("2026-09..2026-10", TODAY), TODAY);
    expect(measure(view, "income").summary).toMatchObject({ total: 350000, average: 175000, months: 2 });
    expect(measure(view, "income").summary.peak).toEqual({ month: "2026-10", amount: 200000 });
  });

  it("says when there is nothing in the period for any measure", () => {
    const view = monthlyView(data(), parsePeriodParam("2024", TODAY), TODAY);
    expect(view.empty).toBe(true);
    expect(view.together).toBe(true);
  });

  it("names the period as the other dashboards do", () => {
    expect(monthlyView(data(), parsePeriodParam(undefined, TODAY), TODAY).periodName).toBe("This year");
    expect(monthlyView(data(), parsePeriodParam("last-6m", TODAY), TODAY).periodName).toBe("Last 6 months");
    expect(monthlyView(data(), parsePeriodParam("all", TODAY), TODAY).periodLabel).toBe("all time");
  });

  it("gives each measure a colour and a page", () => {
    expect(FLOW_META.cards).toMatchObject({ href: "/cards", colorKey: "ruby" });
    expect(FLOW_META.cash.href).toBe("/expenses");
  });
});

describe("the card over a month", () => {
  const view = monthlyView(data(), parsePeriodParam(undefined, TODAY), TODAY);
  const tip = (key: string, month: string) => measure(view, key).tips[month];

  it("has a card only for a month with a figure", () => {
    expect(tip("income", "2026-10")).toBeDefined();
    expect(tip("income", "2026-08")).toBeUndefined();
    expect(tip("emis", "2026-10")).toBeUndefined();
  });
  it("gives the figure, what it is made of and where it stands", () => {
    const t = tip("income", "2026-10");
    expect(t.total).toBe("₹2,00,000");
    expect(t.rows).toEqual([{ name: "Income", amount: "₹2,00,000" }]);
    expect(t.tag).toBe("Peak");
    expect(t.rank).toBe("1st highest of 2");
  });
  it("compares with a usual month of the period, and says whether that is good news for the measure", () => {
    // Over September and October income was 1.5L and 2L: a usual month is 1.75L, so October is above (good news) and September below (bad).
    const two = monthlyView(data(), parsePeriodParam("2026-09..2026-10", TODAY), TODAY);
    const t = (month: string) => measure(two, "income").tips[month];
    expect(t("2026-10").versus).toMatchObject({ tone: "good" });
    expect(t("2026-10").versus?.text).toContain("above a usual month of ₹1,75,000");
    expect(t("2026-09").versus).toMatchObject({ tone: "bad" });
  });
  it("counts a usual month over the months that have ended, so a year with few records reads low", () => {
    expect(tip("income", "2026-10").versus?.text).toContain("a usual month of ₹35,000");
  });
  it("lists the card bill paid, and the money sent to the broker", () => {
    expect(tip("cards", "2026-10").rows.map((r) => r.amount)).toEqual(["₹30,000"]);
    expect(tip("invested", "2026-10").rows).toEqual([{ name: "Sent to brokers and new deposits", amount: "₹40,000" }]);
  });
  it("shows what cash and UPI is the rest of", () => {
    const t = tip("cash", "2026-10");
    expect(t.rows.map((r) => r.name)).toEqual(["Spent in all", "Explained by records"]);
    expect(t.foot).toContain("no record explains");
  });
  it("gives the month in progress no comparison or rank, and says it is only so far, never calling it the peak", () => {
    // November's 5,000 is the lowest, but give it a larger one: it must still read "This month", not "Peak".
    const big = monthlyView(data({ incomeEntries: [income("2026-09-01", 100), income("2026-11-01", 900000)] }), parsePeriodParam(undefined, TODAY), TODAY);
    expect(measure(big, "income").tips["2026-11"].tag).toBe("This month");
    const t = tip("income", "2026-11");
    expect(t).toMatchObject({ tag: "This month", versus: null, rank: null });
    expect(t.foot).toContain("isn't over");
  });
});

describe("ordinal", () => {
  it("says 1st, 2nd, 3rd, 4th, and 11th to 13th as th", () => {
    expect([1, 2, 3, 4, 10, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "10th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th"]);
  });
});

describe("earliestFlowMonth", () => {
  it("is the first month any of the records the five read begin, never after this month", () => {
    expect(earliestFlowMonth(data(), TODAY)).toBe("2026-09");
    expect(earliestFlowMonth(data({ incomeEntries: [], statements: [], transfers: [] }), TODAY)).toBe("2026-11");
  });
});

describe("column labels", () => {
  it("adds the year where it changes", () => {
    expect(columnLabel("2025-11", 0)).toBe("Nov ’25");
    expect(columnLabel("2025-12", 1)).toBe("Dec");
    expect(columnLabel("2026-01", 2)).toBe("Jan ’26");
  });
});

describe("the period menu", () => {
  it("offers the last 3, 6 and 12 months, the years, all time and a custom range, as Cards does", () => {
    const menu = periodMenu(parsePeriodParam(undefined, TODAY), TODAY, "2025-04");
    expect(menu.map((o) => o.label)).toEqual(["Last 3 months", "Last 6 months", "Last 12 months", "This year", "2025", "All time", "Custom range…"]);
    expect(menu.map((o) => o.value)).toEqual(["last-3m", "last-6m", "last-12m", "", "2025", "all", "custom"]);
  });
  it("adds a year being shown that has no records, newest first", () => {
    expect(menuYears("2026-04", parsePeriodParam("2024", TODAY), TODAY)).toEqual([2026, 2024]);
  });
  it("shows a custom range as its own chosen option", () => {
    const period = parsePeriodParam("2026-03..2026-08", TODAY);
    expect(periodMenuValue(period, TODAY)).toBe("custom");
    expect(periodMenu(period, TODAY, "2025-04").at(-1)).toMatchObject({ label: "Custom range", meta: "Mar – Aug 2026" });
    expect(periodMenuValue(parsePeriodParam("last-6m", TODAY), TODAY)).toBe("last-6m");
  });
  it("opens the month picker on the months shown, and offers back to January of the first year", () => {
    expect(rangePickerStart(parsePeriodParam("2026-03..2026-08", TODAY), TODAY, "2025-04")).toEqual({ from: "2026-03", to: "2026-08", earliest: "2025-01" });
    expect(rangePickerStart(parsePeriodParam("2027", TODAY), TODAY, "2025-04")).toEqual({ from: "2026-06", to: "2026-11", earliest: "2025-01" });
  });
});
