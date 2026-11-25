import { describe, expect, it } from "vitest";
import type { DailyCategoryLimit, DailySpend } from "../sheets/types";
import { categoryLimitFor, categoryLimitRows, givenOut, limitState, needsLook } from "./dailyCategoryLimits";

let n = 0;
const spend = (date: string, amount: number, category?: string): DailySpend => ({ id: `s${++n}`, date, amount, method: "UPI", ...(category && { category }) });
const limit = (category: string, month: string, amount: number): DailyCategoryLimit => ({ id: `l${++n}`, category, month, limit: amount });

describe("categoryLimitFor", () => {
  const rows = [limit("food", "2026-09", 5000), limit("food", "2026-11", 6000), limit("fun", "2026-10", 1500), limit("fun", "2026-11", 0)];
  it("uses the latest row at or before the month, for that category only", () => {
    expect(categoryLimitFor(rows, "food", "2026-10")).toBe(5000);
    expect(categoryLimitFor(rows, "food", "2026-11")).toBe(6000);
    expect(categoryLimitFor(rows, "food", "2027-03")).toBe(6000);
    expect(categoryLimitFor(rows, "bills", "2026-11")).toBeNull();
  });
  it("has none before its first row, and none once a row says 0", () => {
    expect(categoryLimitFor(rows, "food", "2026-08")).toBeNull();
    expect(categoryLimitFor(rows, "fun", "2026-10")).toBe(1500);
    expect(categoryLimitFor(rows, "fun", "2026-11")).toBeNull();
  });
});

describe("limitState", () => {
  it("is none without a limit, ok under 80%, near from 80% up to the limit, over past it", () => {
    expect(limitState(5000, null)).toBe("none");
    expect(limitState(3999.99, 5000)).toBe("ok");
    expect(limitState(4000, 5000)).toBe("near");
    expect(limitState(5000, 5000)).toBe("near");
    expect(limitState(5000.01, 5000)).toBe("over");
  });
  it("adds in paise, so ₹0.10s don't tip it", () => {
    expect(limitState(0.1 + 0.2, 0.3)).toBe("near");
  });
});

describe("categoryLimitRows", () => {
  const spends = [
    spend("2026-11-02", 3000, "food"),
    spend("2026-11-10", 1500.5, "food"),
    spend("2026-11-12", 6200, "shopping"),
    spend("2026-11-15", 400),
    spend("2026-11-16", 90, "gone"),
    spend("2026-10-05", 2000, "food"),
    spend("2026-10-20", 900, "food"),
    spend("2026-10-12", 1000, "shopping"),
  ];
  const limits = [limit("food", "2026-10", 6000), limit("shopping", "2026-11", 5000), limit("bills", "2026-11", 3000)];
  const rows = categoryLimitRows(spends, limits, "2026-11", "2026-11-18", ["food", "shopping", "bills"]);
  it("lists a category with a limit even with nothing spent, biggest spend first, the spends with no category last", () => {
    expect(rows.map((r) => r.category)).toEqual(["shopping", "food", "bills", null]);
  });
  it("works out spent, used, left and the state against each limit", () => {
    expect(rows[0]).toMatchObject({ category: "shopping", spent: 6200, limit: 5000, left: -1200, state: "over" });
    expect(rows[0].used).toBeCloseTo(1.24, 5);
    expect(rows[1]).toMatchObject({ category: "food", spent: 4500.5, limit: 6000, left: 1499.5, state: "ok" });
    expect(rows[2]).toMatchObject({ category: "bills", spent: 0, limit: 3000, state: "ok", left: 3000 });
  });
  it("puts an unknown category with the spends that have none, and gives it no limit", () => {
    expect(rows[3]).toMatchObject({ category: null, spent: 490, limit: null, used: null, left: null, state: "none" });
  });
  it("sets this month against the last up to the same day, not the whole of it", () => {
    // Food last month by the 18th: the 5th only (the 20th is after the 18th).
    expect(rows[1].previous).toBe(2000);
    expect(rows[0].previous).toBe(1000);
  });
  it("sets a month that is over against the whole of the one before", () => {
    const past = categoryLimitRows(spends, limits, "2026-11", "2026-12-20", ["food"]);
    expect(past[0].previous).toBe(2900);
  });
  it("leaves out a category with neither a limit nor spending", () => {
    expect(categoryLimitRows([], [], "2026-11", "2026-11-18", ["food", "fun"])).toEqual([]);
  });
});

describe("needsLook and givenOut", () => {
  const spends = [spend("2026-11-02", 6200, "shopping"), spend("2026-11-03", 4800, "food"), spend("2026-11-04", 100, "fun")];
  const limits = [limit("shopping", "2026-11", 5000), limit("food", "2026-11", 6000), limit("fun", "2026-11", 1000)];
  const rows = categoryLimitRows(spends, limits, "2026-11", "2026-11-18", ["shopping", "food", "fun"]);
  it("lists the over and the near ones, the furthest along first", () => {
    expect(needsLook(rows).map((r) => [r.category, r.state])).toEqual([["shopping", "over"], ["food", "near"]]);
  });
  it("adds up the limits given out", () => {
    expect(givenOut(rows)).toBe(12000);
    expect(givenOut([])).toBe(0);
  });
});
