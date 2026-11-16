import { describe, expect, it } from "vitest";
import type { MonthKey, SpendPeriod } from "./cardSpend";
import type { MonthExpenses } from "./expenses";
import { flowAmount, flowAmounts, flowHeat, flowRow, latestFigure, monthsSoFarIn, shownColumns, showsTogether, spanToLoad } from "./monthlyFlows";

// "Today" is mid-November 2026: October is the last month that has ended, November is in progress.
const TODAY = "2026-11-16";

const month = (key: MonthKey, over: { cameIn?: number; invested?: number; emi?: number; card?: number; cash?: number; status?: MonthExpenses["status"] } = {}): MonthExpenses =>
  ({ month: key, status: over.status ?? "done", cameIn: over.cameIn ?? 0, invested: over.invested ?? 0, parts: { card: over.card ?? 0, emi: over.emi ?? 0, subs: 0, ins: 0, big: 0, cash: over.cash ?? 0 } }) as MonthExpenses;

const year = (y: number): SpendPeriod => ({ kind: "year", year: y });
const range = (from: MonthKey, to: MonthKey, last?: 3 | 6 | 12): SpendPeriod => ({ kind: "range", from, to, last });

describe("flowAmount: what each measure reads from a month", () => {
  const m = month("2026-10", { cameIn: 183526, invested: 45000, emi: 22450, card: 75655, cash: 29800 });
  it("reads the five measures the Expenses page works out", () => {
    expect(flowAmount(m, "income")).toBe(183526);
    expect(flowAmount(m, "invested")).toBe(45000);
    expect(flowAmount(m, "emis")).toBe(22450);
    expect(flowAmount(m, "cards")).toBe(75655);
    expect(flowAmount(m, "cash")).toBe(29800);
  });
  it("shows nothing for a month where nothing happened", () => {
    expect(flowAmount(month("2026-09"), "income")).toBeNull();
    expect(flowAmount(month("2026-09"), "emis")).toBeNull();
  });
  it("shows nothing for a month that took more out of investing than it put in", () => {
    expect(flowAmount(month("2026-09", { invested: -12000 }), "invested")).toBeNull();
  });
  it("has no cash and UPI until the month has ended, and none that can't be worked out, however much has been paid so far", () => {
    expect(flowAmount(month("2026-11", { status: "progress", cash: 0, card: 5000 }), "cash")).toBeNull();
    expect(flowAmount(month("2026-11", { status: "progress", cash: 9000 }), "cash")).toBeNull();
    expect(flowAmount(month("2026-08", { status: "unknown", cash: 9000 }), "cash")).toBeNull();
    expect(flowAmount(month("2026-11", { status: "progress", card: 5000 }), "cards")).toBe(5000);
  });
  it("shows nothing for cash and UPI below zero: a transfer isn't recorded yet", () => {
    expect(flowAmount(month("2026-07", { cash: -20000 }), "cash")).toBeNull();
  });
});

describe("flowAmounts", () => {
  it("keeps only the months with a figure, for each measure", () => {
    const out = flowAmounts([month("2026-09", { cameIn: 100 }), month("2026-10", { cameIn: 200, emi: 50 })]);
    expect([...out.income]).toEqual([["2026-09", 100], ["2026-10", 200]]);
    expect([...out.emis]).toEqual([["2026-10", 50]]);
    expect(out.cards.size).toBe(0);
  });
});

describe("which months a period shows, and whether the five sit together", () => {
  it("loads exactly the months so far: a year stops at this month, a range at its end or this month, all time starts at the first", () => {
    expect(spanToLoad(year(2026), TODAY, "2025-04")).toEqual({ from: "2026-01", to: "2026-11" });
    expect(spanToLoad(year(2025), TODAY, "2025-04")).toEqual({ from: "2025-01", to: "2025-12" });
    expect(spanToLoad(range("2026-03", "2026-08"), TODAY, "2025-04")).toEqual({ from: "2026-03", to: "2026-08" });
    expect(spanToLoad({ kind: "all" }, TODAY, "2025-04")).toEqual({ from: "2025-04", to: "2026-11" });
  });
  it("draws a year as its twelve months (the ones to come included) and a range as its own months", () => {
    expect(shownColumns(year(2026), TODAY, "2025-04")).toHaveLength(12);
    expect(shownColumns(range("2026-03", "2026-05"), TODAY, "2025-04")).toEqual(["2026-03", "2026-04", "2026-05"]);
  });
  it("shows the five together for a year and for any range of up to twelve months", () => {
    expect(showsTogether(year(2026), TODAY, "2025-04")).toBe(true);
    expect(showsTogether(range("2025-12", "2026-11", 12), TODAY, "2025-04")).toBe(true);
    expect(showsTogether(range("2026-06", "2026-08"), TODAY, "2025-04")).toBe(true);
  });
  it("moves them onto buttons past twelve months", () => {
    expect(showsTogether(range("2025-05", "2026-11"), TODAY, "2025-04")).toBe(false);
    expect(showsTogether({ kind: "all" }, TODAY, "2025-04")).toBe(false);
  });
  it("lets all time sit together while it is still twelve months or fewer", () => {
    expect(showsTogether({ kind: "all" }, TODAY, "2026-04")).toBe(true);
  });
  it("counts the months so far in a period", () => {
    expect(monthsSoFarIn(year(2026), TODAY, "2025-04")).toHaveLength(11);
    expect(monthsSoFarIn(year(2027), TODAY, "2025-04")).toEqual([]);
  });
});

describe("flowHeat: one measure's heatmap", () => {
  const amounts = new Map<MonthKey, number>([["2026-01", 100], ["2026-02", 500], ["2026-03", 300], ["2026-10", 100], ["2026-11", 50]]);

  it("draws a row per year, shaded against the largest month, with months to come left empty", () => {
    const { rows } = flowHeat(amounts, year(2026), TODAY, "2025-04");
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row.cells).toHaveLength(12);
    expect(row.cells[1]).toMatchObject({ state: "data", amount: 500, level: 5 });
    expect(row.cells[0]).toMatchObject({ state: "data", amount: 100, level: 1 });
    expect(row.cells[3]).toMatchObject({ state: "no-data", amount: null });
    expect(row.cells[11]).toMatchObject({ state: "upcoming" });
  });

  it("leaves a range's other months in its years blank, and shades only against the range", () => {
    const { rows } = flowHeat(amounts, range("2026-01", "2026-03"), TODAY, "2025-04");
    expect(rows[0].cells[0].state).toBe("data");
    expect(rows[0].cells[3].state).toBe("outside");
    expect(rows[0].cells[9].state).toBe("outside");
    expect(rows[0].cells[1].level).toBe(5);
  });

  it("draws a row for every year a range crosses", () => {
    const { rows, yearTotals } = flowHeat(new Map([["2025-12", 40], ["2026-01", 80]]), range("2025-11", "2026-02"), TODAY, "2025-04");
    expect(rows.map((r) => r.year)).toEqual([2025, 2026]);
    expect(yearTotals.map((y) => [y.year, y.total, y.months])).toEqual([[2025, 40, 2], [2026, 80, 2]]);
  });

  it("totals the months so far and takes a usual month over the months that have ended, not the one in progress", () => {
    const heat = flowHeat(amounts, year(2026), TODAY, "2025-04");
    expect(heat.total).toBe(1050);
    // January to October have ended: 1000 over 10 months.
    expect(heat.averagedOver).toBe(10);
    expect(heat.average).toBe(100);
    expect(heat.yearTotals).toEqual([{ year: 2026, total: 1050, months: 10, average: 100 }]);
  });

  it("lets the month in progress stand in for a usual month when nothing has ended yet", () => {
    const heat = flowHeat(new Map([["2026-11", 60]]), range("2026-11", "2026-11"), TODAY, "2026-11");
    expect(heat.averagedOver).toBe(1);
    expect(heat.average).toBe(60);
  });

  it("marks the peak, the earliest month winning a tie, and none when nothing has a figure", () => {
    expect(flowHeat(amounts, year(2026), TODAY, "2025-04").peak).toEqual({ month: "2026-02", amount: 500 });
    expect(flowHeat(new Map([["2026-03", 9], ["2026-05", 9]]), year(2026), TODAY, "2025-04").peak).toEqual({ month: "2026-03", amount: 9 });
    expect(flowHeat(new Map(), year(2026), TODAY, "2025-04").peak).toBeNull();
  });

  it("draws all time from the first month's year to this one", () => {
    const { rows } = flowHeat(new Map([["2025-04", 10]]), { kind: "all" }, TODAY, "2025-04");
    expect(rows.map((r) => r.year)).toEqual([2025, 2026]);
    expect(rows[0].cells[0].state).toBe("no-data");
  });

  it("takes a first year's row from the period's first month, not from January", () => {
    const heat = flowHeat(new Map([["2025-08", 40], ["2025-09", 80]]), { kind: "all" }, TODAY, "2025-08");
    // August to December 2025 is five months, not twelve.
    expect(heat.yearTotals[0]).toEqual({ year: 2025, total: 120, months: 5, average: 24 });
    expect(heat.yearTotals[1].months).toBe(10);
  });

  it("draws a future year as months to come, with no peak and a zero total", () => {
    const heat = flowHeat(new Map(), year(2027), TODAY, "2025-04");
    expect(heat.rows[0].cells.every((c) => c.state === "upcoming")).toBe(true);
    expect(heat.total).toBe(0);
    expect(heat.yearTotals[0].average).toBe(0);
  });
});

describe("flowRow: one measure over the months drawn side by side", () => {
  it("shades the months against the largest of them, and marks no data and months to come", () => {
    const cells = flowRow(new Map([["2026-10", 200], ["2026-09", 50]]), ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12"], TODAY);
    expect(cells.map((c) => c.state)).toEqual(["no-data", "data", "data", "no-data", "upcoming"]);
    expect(cells[2].level).toBe(5);
    expect(cells[1].level).toBe(2);
  });
});

describe("latestFigure", () => {
  const amounts = new Map<MonthKey, number>([["2026-09", 70], ["2026-10", 100], ["2026-11", 30]]);
  it("takes the latest month so far as the button's headline, and says when it is still in progress", () => {
    expect(latestFigure(amounts, year(2026), TODAY, "2025-04")).toEqual({ month: "2026-11", amount: 30, inProgress: true });
    expect(latestFigure(amounts, range("2026-06", "2026-10"), TODAY, "2025-04")).toEqual({ month: "2026-10", amount: 100, inProgress: false });
    expect(latestFigure(amounts, year(2027), TODAY, "2025-04")).toBeNull();
  });
});
