import { describe, expect, it } from "vitest";
import { trendPoints, trendWindow } from "./cardTrend";
import { demoCardData } from "../demo/cardsDemo";

const TODAY = "2026-08-18";
const data = demoCardData(TODAY);
const THIS_YEAR = { kind: "year" as const, year: 2026 };

describe("trendPoints", () => {
  it("runs a full year back to the current month, so 1Y always has 12 bars", () => {
    const points = trendPoints(data, TODAY, THIS_YEAR);
    expect(points[0].month).toBe("2025-09");
    expect(points.at(-1)?.month).toBe("2026-08");
    expect(points).toHaveLength(12);
  });

  it("starts at the first statement when that's more than a year back", () => {
    const old = { ...data, statements: [...data.statements, { ...data.statements[0], id: "old", statementDate: "2024-03-05", dueDate: "2024-03-25" }] };
    expect(trendPoints(old, TODAY, THIS_YEAR)[0].month).toBe("2024-03");
  });

  it("ends at December of a past year, so the chart follows the page's period", () => {
    const points = trendPoints(data, TODAY, { kind: "year", year: 2025 });
    expect(points.at(-1)?.month).toBe("2025-12");
    expect(points).toHaveLength(12);
  });

  it("ignores orphaned or unreadable rows when picking the first month", () => {
    const orphan = { ...data, statements: [...data.statements, { ...data.statements[0], id: "orphan", cardId: "deleted-card", statementDate: "2022-01-05", dueDate: "2022-01-25" }] };
    expect(trendPoints(orphan, TODAY, THIS_YEAR)[0].month).toBe("2025-09");
  });

  it("splits each month by card, and narrows to one card when selected", () => {
    const aug = trendPoints(data, TODAY, THIS_YEAR).at(-1);
    expect(aug).toEqual({ month: "2026-08", total: 50900, byCard: { "demo-regalia": 38500, "demo-amazon": 12400, "demo-gold": 0 }, hasStatements: true });
    expect(trendPoints(data, TODAY, THIS_YEAR, "demo-amazon").at(-1)).toEqual({ month: "2026-08", total: 12400, byCard: { "demo-amazon": 12400 }, hasStatements: true });
  });

  it("marks the months that have no statements, so the chart can draw them as no data", () => {
    const points = trendPoints(data, TODAY, THIS_YEAR);
    expect(points.filter((p) => !p.hasStatements).map((p) => p.month)).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"]);
    expect(points.filter((p) => p.hasStatements).map((p) => p.month)).toEqual(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]);
  });

  it("counts a month whose statements total ₹0 (or a credit balance) as having statements", () => {
    const zero = { ...data.statements[0], id: "zero", statementDate: "2026-02-05", dueDate: "2026-02-25", totalAmountDue: 0 };
    const credit = { ...data.statements[0], id: "credit", statementDate: "2026-03-05", dueDate: "2026-03-25", totalAmountDue: -1200 };
    const points = trendPoints({ ...data, statements: [...data.statements, zero, credit] }, TODAY, THIS_YEAR);
    expect(points.find((p) => p.month === "2026-02")).toMatchObject({ total: 0, hasStatements: true });
    expect(points.find((p) => p.month === "2026-03")).toMatchObject({ total: 0, hasStatements: true });
    expect(points.find((p) => p.month === "2026-01")).toMatchObject({ total: 0, hasStatements: false });
  });

  it("only counts the selected card's statements", () => {
    expect(trendPoints(data, TODAY, THIS_YEAR, "demo-gold").every((p) => !p.hasStatements)).toBe(true);
    const amazonOnly = { ...data, statements: data.statements.filter((s) => !(s.cardId === "demo-regalia" && s.statementDate.startsWith("2026-05"))) };
    expect(trendPoints(amazonOnly, TODAY, THIS_YEAR, "demo-regalia").find((p) => p.month === "2026-05")?.hasStatements).toBe(false);
    expect(trendPoints(amazonOnly, TODAY, THIS_YEAR).find((p) => p.month === "2026-05")?.hasStatements).toBe(true);
  });

  it("doesn't count a statement whose card no longer exists", () => {
    const orphan = { ...data.statements[0], id: "orphan", cardId: "deleted-card", statementDate: "2026-01-05", dueDate: "2026-01-25" };
    expect(trendPoints({ ...data, statements: [...data.statements, orphan] }, TODAY, THIS_YEAR).find((p) => p.month === "2026-01")?.hasStatements).toBe(false);
  });
});

describe("trendWindow", () => {
  const points = trendPoints(data, TODAY, THIS_YEAR);

  it("shows the last 3, 6 or 12 months, or all of them", () => {
    expect(trendWindow(points, "3M").points.map((p) => p.month)).toEqual(["2026-06", "2026-07", "2026-08"]);
    expect(trendWindow(points, "6M").points).toHaveLength(6);
    expect(trendWindow(points, "1Y").points).toHaveLength(12);
    expect(trendWindow(points, "All").points).toHaveLength(points.length);
  });

  it("averages over every month shown and finds the peak", () => {
    const w = trendWindow(points, "3M");
    expect(w.average).toBeCloseTo((50100 + 57300 + 50900) / 3, 6);
    expect(w.peak).toEqual({ month: "2026-07", amount: 57300 });
    expect(trendWindow(points, "1Y").average).toBeCloseTo(239700 / 12, 6);
  });

  it("has no peak when nothing was spent", () => {
    expect(trendWindow(trendPoints({ cards: [], statements: [] }, TODAY, THIS_YEAR), "1Y").peak).toBeNull();
  });
});
