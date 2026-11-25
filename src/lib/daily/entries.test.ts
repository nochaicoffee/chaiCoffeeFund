import { describe, expect, it } from "vitest";
import type { DailySpend, DailySpendMethod } from "../sheets/types";
import { entryTotals, filterSpends, groupByMonthAndDay, monthsWithSpends, NO_FILTERS, sortSpends } from "./entries";

let n = 0;
const spend = (date: string, amount: number, method: DailySpendMethod, category?: string, note?: string): DailySpend => ({ id: `s${++n}`, date, amount, method, ...(category && { category }), ...(note && { note }) });
const names: Record<string, string> = { food: "Food", fuel: "Fuel", bills: "Bills" };
const nameOf = (c: string | undefined) => (c ? (names[c] ?? "Unknown") : "No category");
const methodName = (m: DailySpendMethod) => (m === "Card" ? "Credit card" : m);

const list = [
  spend("2026-11-02", 340, "UPI", "food", "Lunch"),
  spend("2026-11-02", 3506, "Card", "fuel", "Car fuel"),
  spend("2026-11-18", 150, "UPI", "food", "Tea"),
  spend("2026-11-18", 1299, "Cash", undefined, "Books"),
  spend("2026-10-30", 560, "UPI", "food", "Dinner"),
  spend("2026-10-12", 1850, "Card", "bills"),
];
const run = (f: Partial<typeof NO_FILTERS>) => filterSpends(list, { ...NO_FILTERS, ...f }, nameOf, methodName).map((s) => s.note ?? s.category);

describe("filterSpends", () => {
  it("keeps everything with no filters", () => {
    expect(run({})).toHaveLength(6);
  });
  it("filters by period (a month or a year), category (one, or none), method and a smallest amount", () => {
    expect(run({ period: "2026-10" })).toEqual(["Dinner", "bills"]);
    expect(run({ period: "2026" })).toHaveLength(6);
    expect(run({ period: "2025" })).toEqual([]);
    expect(run({ category: "food" })).toEqual(["Lunch", "Tea", "Dinner"]);
    expect(run({ category: "none" })).toEqual(["Books"]);
    expect(run({ method: "Cash" })).toEqual(["Books"]);
    expect(run({ min: 1000 })).toEqual(["Car fuel", "Books", "bills"]);
    expect(run({ min: 1299 })).toEqual(["Car fuel", "Books", "bills"]);
  });
  it("searches the note, the category's name, how it was paid and the amount, every word having to match", () => {
    expect(run({ query: "tea" })).toEqual(["Tea"]);
    expect(run({ query: "FUEL" })).toEqual(["Car fuel"]);
    expect(run({ query: "credit" })).toEqual(["Car fuel", "bills"]);
    expect(run({ query: "1299" })).toEqual(["Books"]);
    expect(run({ query: "1,299" })).toEqual(["Books"]);
    expect(run({ query: "no category" })).toEqual(["Books"]);
    expect(run({ query: "food lunch" })).toEqual(["Lunch"]);
    expect(run({ query: "food biryani" })).toEqual([]);
  });
  it("combines the filters", () => {
    expect(run({ category: "food", period: "2026-11", min: 200 })).toEqual(["Lunch"]);
  });
});

describe("sortSpends and groupByMonthAndDay", () => {
  it("lists newest first with the later-added first inside a day, or oldest first", () => {
    expect(sortSpends(list, "newest").map((s) => s.note ?? s.category)).toEqual(["Books", "Tea", "Car fuel", "Lunch", "Dinner", "bills"]);
    expect(sortSpends(list, "oldest").map((s) => s.note ?? s.category)).toEqual(["bills", "Dinner", "Car fuel", "Lunch", "Books", "Tea"]);
  });
  it("lists by amount, the later day first when two are equal", () => {
    expect(sortSpends(list, "biggest").map((s) => s.amount)).toEqual([3506, 1850, 1299, 560, 340, 150]);
    expect(sortSpends(list, "smallest").map((s) => s.amount)).toEqual([150, 340, 560, 1299, 1850, 3506]);
    const tie = [spend("2026-11-01", 100, "UPI"), spend("2026-11-05", 100, "UPI")];
    expect(sortSpends(tie, "biggest").map((s) => s.date)).toEqual(["2026-11-05", "2026-11-01"]);
  });
  it("groups into months and days with totals that add up", () => {
    const groups = groupByMonthAndDay(sortSpends(list, "newest"));
    expect(groups.map((g) => [g.month, g.count, g.total])).toEqual([["2026-11", 4, 5295], ["2026-10", 2, 2410]]);
    expect(groups[0].days.map((d) => [d.date, d.total])).toEqual([["2026-11-18", 1449], ["2026-11-02", 3846]]);
  });
  it("adds in paise", () => {
    const g = groupByMonthAndDay([spend("2026-11-01", 0.1, "UPI"), spend("2026-11-01", 0.2, "UPI")]);
    expect(g[0].days[0].total).toBe(0.3);
  });
  it("is empty for nothing", () => {
    expect(groupByMonthAndDay([])).toEqual([]);
  });
});

describe("entryTotals and monthsWithSpends", () => {
  it("works out the count, total, average, biggest and top category", () => {
    const t = entryTotals(list);
    expect(t).toMatchObject({ count: 6, total: 7705, average: 1284 });
    expect(t.biggest?.amount).toBe(3506);
    expect(t.top).toMatchObject({ category: "fuel", amount: 3506 });
    expect(t.top?.share).toBeCloseTo(3506 / 7705, 5);
  });
  it("counts the spends with no category as a category of their own, and is empty for none", () => {
    expect(entryTotals([spend("2026-11-01", 500, "UPI"), spend("2026-11-02", 100, "UPI", "food")]).top).toMatchObject({ category: undefined, amount: 500 });
    expect(entryTotals([])).toEqual({ count: 0, total: 0, average: 0, biggest: null, top: null });
  });
  it("lists the months with a spend, newest first", () => {
    expect(monthsWithSpends(list)).toEqual([{ month: "2026-11", total: 5295 }, { month: "2026-10", total: 2410 }]);
  });
});
