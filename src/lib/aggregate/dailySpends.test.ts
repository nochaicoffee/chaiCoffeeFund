import { describe, expect, it } from "vitest";
import type { DailyBudget, DailySpend } from "../sheets/types";
import { budgetView, daysInMonth, diaryStart, limitFor, methodShare, monthRows, monthView, periodView, readMonth, shiftMonth, usualMonth } from "./dailySpends";

let n = 0;
const spend = (date: string, amount: number, method: DailySpend["method"], category?: string, note?: string): DailySpend => ({ id: `s${++n}`, date, amount, method, ...(category && { category }), ...(note && { note }) });
const nov = (d: number, ...rows: [number, DailySpend["method"], string?, string?][]) => rows.map(([a, m, c, note]) => spend(`2026-11-${String(d).padStart(2, "0")}`, a, m, c, note));

/** The same November the mockups draw (design/daily/generator/data.mjs): ₹20,982 to Wed 18, 17 of 18 days written. */
const NOV = [
  ...nov(1, [2400, "Card", "groceries"], [180, "UPI", "food"]),
  ...nov(2, [120, "UPI", "transport"], [340, "UPI", "food"]),
  ...nov(3, [90, "UPI", "transport"], [260, "UPI", "food"]),
  ...nov(4, [4999, "Card", "shopping"], [150, "UPI", "food"]),
  ...nov(5, [410, "UPI", "food"]),
  ...nov(6, [620, "UPI", "fun"], [280, "UPI", "food"]),
  ...nov(7, [1850, "Card", "bills"], [720, "UPI", "food"]),
  ...nov(8, [3200, "Card", "groceries"]),
  ...nov(9, [100, "UPI", "transport"]),
  ...nov(10, [310, "UPI", "food"]),
  ...nov(12, [899, "Card", "health"], [95, "UPI", "transport"]),
  ...nov(13, [540, "UPI", "food"]),
  ...nov(14, [1299, "Card", "shopping"], [480, "UPI", "fun"]),
  ...nov(15, [760, "UPI", "food"]),
  ...nov(16, [110, "UPI", "transport"]),
  ...nov(17, [420, "UPI", "food"], [200, "UPI", "other"]),
  ...nov(18, [150, "UPI", "food", "Tea"]),
];
const today = "2026-11-18";

describe("months", () => {
  it("steps across a year end, forwards and back", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
  });
  it("knows how long a month is, leap years included", () => {
    expect(daysInMonth("2026-11")).toBe(30);
    expect(daysInMonth("2028-02")).toBe(29);
  });
  it("reads only a real month from the address", () => {
    expect(readMonth("2026-11")).toBe("2026-11");
    expect(readMonth("2026-13")).toBeUndefined();
    expect(readMonth(undefined)).toBeUndefined();
  });
});

describe("monthView", () => {
  const view = monthView(NOV, "2026-11", today);

  it("adds up the month, split by UPI and card, and the parts always make the whole", () => {
    expect(view).toMatchObject({ total: 20982, upi: 6335, card: 14647, count: NOV.length });
    expect(view.upi + view.card).toBeCloseTo(view.total, 2);
  });
  it("sums in paise, so ten ₹0.10s are exactly ₹1", () => {
    const dimes = Array.from({ length: 10 }, () => spend("2026-11-02", 0.1, "UPI"));
    expect(monthView(dimes, "2026-11", today).total).toBe(1);
  });
  it("counts the days to today, the quiet ones, a day's average and the biggest day", () => {
    expect(view.elapsed).toBe(18);
    expect(view.daysCounted).toBe(18);
    expect(view.quietDays).toBe(1);
    expect(view.perDay).toBe(1165.67);
    expect(view.biggestDay).toEqual({ date: "2026-11-04", total: 5149 });
  });
  it("projects the month at the pace so far, the current month only", () => {
    expect(view.pace).toBe(34970);
    expect(monthView(NOV, "2026-10", today).pace).toBeNull();
  });
  it("lays the weeks out Monday first: the 1st is a Sunday, so the first week has six blanks and one day", () => {
    expect(view.weeks).toHaveLength(6);
    expect(view.weeks[0].cells.map((c) => c?.day ?? null)).toEqual([null, null, null, null, null, null, 1]);
    expect(view.weeks[0]).toMatchObject({ from: "2026-11-01", to: "2026-11-01", total: 2580 });
    expect(view.weeks.map((w) => w.total)).toEqual([2580, 13039, 4483, 880, 0, 0]);
    expect(view.weeks.filter((w) => w.inProgress).map((w) => w.from)).toEqual(["2026-11-16"]);
    expect(view.weeks.reduce((a, w) => a + w.total, 0)).toBe(view.total);
  });
  it("groups by category id, biggest first, the uncategorised last whatever they come to", () => {
    const withNone = [...NOV, spend("2026-11-18", 9999, "UPI")];
    const rows = monthView(withNone, "2026-11", today).categories;
    expect(rows.map((c) => [c.category, c.amount]).slice(0, 3)).toEqual([["shopping", 6298], ["groceries", 5600], ["food", 4520]]);
    expect(rows.at(-1)?.category).toBeNull();
    expect(rows.reduce((a, c) => a + c.share, 0)).toBeCloseTo(1, 6);
  });
  it("counts a past month in full and a month to come not at all", () => {
    const oct = monthView([...NOV, spend("2026-10-30", 500, "UPI")], "2026-10", today);
    expect(oct.elapsed).toBe(31);
    expect(oct.daysCounted).toBe(2);
    const dec = monthView(NOV, "2026-12", today);
    expect(dec).toMatchObject({ isFuture: true, elapsed: 0, daysCounted: 0, perDay: 0 });
  });
  it("starts the diary on its first spend: days before it are not quiet days, and the average is over the days kept", () => {
    const late = [spend("2026-11-15", 300, "UPI"), spend("2026-11-18", 100, "UPI")];
    const v = monthView(late, "2026-11", today);
    expect(diaryStart(late)).toBe("2026-11-15");
    expect(v.daysCounted).toBe(4);
    expect(v.quietDays).toBe(2);
    expect(v.perDay).toBe(100);
    expect(v.pace).toBe(1600);
    expect(v.days[9].kept).toBe(false);
  });
  it("has no pace, rather than NaN, when the only spend is dated after today", () => {
    const v = monthView([spend("2026-11-25", 500, "UPI")], "2026-11", today);
    expect(v).toMatchObject({ total: 500, daysCounted: 0, pace: null });
  });
  it("handles an empty diary without dividing by zero", () => {
    const v = monthView([], "2026-11", today);
    expect(v).toMatchObject({ total: 0, count: 0, daysCounted: 0, quietDays: 0, perDay: 0, pace: null, biggestDay: null, categories: [] });
  });
});

describe("limitFor", () => {
  const budgets: DailyBudget[] = [
    { id: "b1", month: "2026-01", limit: 24000 },
    { id: "b2", month: "2026-07", limit: 26000 },
    { id: "b3", month: "2026-11", limit: 30000 },
  ];
  it("is the latest row at or before the month", () => {
    expect(limitFor(budgets, "2026-11")).toBe(30000);
    expect(limitFor(budgets, "2026-12")).toBe(30000);
    expect(limitFor(budgets, "2026-08")).toBe(26000);
    expect(limitFor(budgets, "2026-03")).toBe(24000);
  });
  it("is null before the first row, and with no rows", () => {
    expect(limitFor(budgets, "2025-12")).toBeNull();
    expect(limitFor([], "2026-11")).toBeNull();
  });
  it("doesn't depend on the order the rows are in", () => {
    expect(limitFor([...budgets].reverse(), "2026-08")).toBe(26000);
  });
});

describe("budgetView", () => {
  const view = monthView(NOV, "2026-11", today);
  const b = budgetView(view, 30000, today);
  it("is what's left, how much of the limit is used, and the pace", () => {
    expect(b).toMatchObject({ limit: 30000, left: 9018, expected: 18000, overPace: 2982, over: false, daysLeft: 12 });
    expect(b.used).toBeCloseTo(0.6994, 4);
  });
  it("shares what's left before today over the days to go counting today, less what's gone today", () => {
    // (30000 − 20832 spent before today) ÷ 13 days = 705; ₹150 gone today.
    expect(b.today).toEqual({ spent: 150, allowance: 705, left: 555 });
  });
  it("moves as he spends: ₹349 more today leaves ₹206, and the allowance itself doesn't move", () => {
    const more = budgetView(monthView([...NOV, spend("2026-11-18", 349, "UPI")], "2026-11", today), 30000, today);
    expect(more.today).toEqual({ spent: 499, allowance: 705, left: 206 });
    expect(more.left).toBe(8669);
  });
  it("puts today past its allowance, and the month over its limit, when it is", () => {
    const over = budgetView(monthView([...NOV, spend("2026-11-18", 9400, "Card", "shopping")], "2026-11", today), 30000, today);
    expect(over).toMatchObject({ left: -382, over: true });
    expect(over.today).toEqual({ spent: 9550, allowance: 705, left: -8845 });
  });
  it("gives the week in progress against a week's share of the limit (limit × 7 ÷ days)", () => {
    expect(b.week).toEqual({ from: "2026-11-16", to: "2026-11-22", spent: 880, share: 7000 });
  });
  it("has the plain figures only for a past month: no allowance, no week", () => {
    const past = budgetView(monthView([...NOV, spend("2026-10-12", 34510, "UPI")], "2026-10", today), 30000, today);
    expect(past).toMatchObject({ left: -4510, over: true, daysLeft: 0, today: null, week: null, expected: 30000 });
  });
  it("gives no allowance below zero when the limit was used up before today", () => {
    const early = [...NOV, spend("2026-11-10", 20000, "Card")];
    expect(budgetView(monthView(early, "2026-11", today), 30000, today).today?.allowance).toBe(0);
  });
});

describe("monthRows and usualMonth", () => {
  const spends = [spend("2026-11-02", 300, "UPI"), spend("2026-10-02", 1000, "Card"), spend("2026-10-09", 500, "UPI"), spend("2026-08-15", 200, "UPI")];
  it("lists the months newest first, with ₹0 months as rows so a gap shows", () => {
    const rows = monthRows(spends, "2026-11-18", "2026-11", 4);
    expect(rows.map((r) => [r.month, r.total])).toEqual([["2026-11", 300], ["2026-10", 1500], ["2026-09", 0], ["2026-08", 200]]);
  });
  it("averages the earlier months that have spends, leaving out this month and empty ones", () => {
    expect(usualMonth(spends, "2026-11-18")).toEqual({ total: 850, upi: 350, card: 500 });
    expect(usualMonth([spend("2026-11-02", 300, "UPI")], "2026-11-18")).toBeNull();
  });
  it("gives a method's share of a month", () => {
    expect(methodShare({ total: 400, upi: 100, card: 300 }, "Card")).toBe(0.75);
    expect(methodShare({ total: 0, upi: 0, card: 0 }, "UPI")).toBe(0);
  });
});

describe("periodView", () => {
  // A diary kept since January: a spend a day on the 1st and 2nd of Jan to Oct (₹1,200 and ₹2,000 on a card), plus the November above.
  const early: DailySpend[] = [];
  for (let m = 1; m <= 10; m++) {
    const key = `2026-${String(m).padStart(2, "0")}`;
    early.push(spend(`${key}-01`, 1200, "UPI", "food"), spend(`${key}-02`, 2000, "Card", "shopping"));
  }
  early.push(spend("2026-03-05", 14999, "Card", "shopping", "Sofa"), spend("2026-09-10", 7800, "Card", "transport", "Flights home"));
  const all = [...early, ...NOV];
  // ₹15,000 in the earlier months (March, with the sofa, goes over it) and ₹30,000 for November.
  const limits = (month: string) => (month === "2026-11" ? 30000 : month >= "2026-01" ? 15000 : null);
  const year = periodView(all, "year", "2026", today, limits);

  it("covers twelve months, the ones to come as empty rows", () => {
    expect(year.months).toHaveLength(12);
    expect(year.months[11]).toMatchObject({ month: "2026-12", empty: true, isFuture: true, total: 0 });
    expect(year.months[0]).toMatchObject({ month: "2026-01", total: 3200 });
  });
  it("totals the year, split by method, and merges the months' categories", () => {
    expect(year.total).toBeCloseTo(32000 + 14999 + 7800 + 20982, 2);
    expect(year.upi + year.card).toBeCloseTo(year.total, 2);
    expect(year.categories[0].category).toBe("shopping");
    expect(year.categories.reduce((a, c) => a + c.share, 0)).toBeCloseTo(1, 6);
  });
  it("averages the completed months, leaving the month in progress out", () => {
    expect(year.completed).toBe(10);
    expect(year.average).toBe(Math.round((32000 + 14999 + 7800) / 10));
  });
  it("counts the completed months inside their limit, and names the ones that went over", () => {
    expect(year.withLimit).toBe(10);
    expect(year.inside).toBe(9);
    expect(year.overMonths).toEqual([{ month: "2026-03", total: 18199, limit: 15000 }]);
  });
  it("finds the three biggest single spends, biggest first", () => {
    expect(year.biggest.map((b) => [b.amount, b.note])).toEqual([[14999, "Sofa"], [7800, "Flights home"], [4999, undefined]]);
  });
  it("counts quiet days only from the diary's first day, and the run now under the daily allowance", () => {
    expect(year.quiet).toBeGreaterThan(0);
    // January 1 is the diary's first day, so January's 29 other days, and every day to November 18, are counted.
    expect(year.months[0].quiet).toBe(29);
    expect(year.currentRun).toBe(4);
  });
  it("has no run, and no months inside the limit, when no month has a limit", () => {
    const none = periodView(all, "year", "2026", today, () => null);
    expect(none).toMatchObject({ withLimit: 0, inside: 0, longestRun: null, currentRun: null });
  });
  it("reads the same things over one month, with the days under the allowance", () => {
    const month = periodView(all, "month", "2026-11", today, limits);
    expect(month.months).toHaveLength(1);
    expect(month).toMatchObject({ total: 20982, quiet: 1, currentRun: 4 });
    expect(month.daysUnder).toEqual({ under: 13, of: 18 });
    expect(month.categories[0].category).toBe("shopping");
    expect(month.biggest[0]).toMatchObject({ amount: 4999, category: "shopping" });
  });
  it("doesn't count a month the diary began partway through as a completed month", () => {
    const partial = [spend("2026-10-15", 9000, "UPI"), ...NOV];
    const p = periodView(partial, "year", "2026", today, () => 30000);
    expect(p).toMatchObject({ completed: 0, average: null, withLimit: 0, inside: 0 });
    expect(p.total).toBe(29982);
  });
  it("is empty and safe for a year with no diary in it", () => {
    const e = periodView(all, "year", "2025", today, limits);
    expect(e).toMatchObject({ total: 0, count: 0, average: null, completed: 0, categories: [], biggest: [], quiet: 0 });
  });
});
