import { describe, expect, it } from "vitest";
import { trendPoints, trendSummary } from "./cardTrend";
import { spendSummary } from "./cardSpend";
import { lastMonths } from "./period";
import { demoCardData } from "../demo/cardsDemo";

const TODAY = "2026-08-18";
const data = demoCardData(TODAY);
const THIS_YEAR = { kind: "year" as const, year: 2026 };

describe("trendPoints", () => {
  it("shows the page's period, one bar for every month so far in it: Jan to now for this year", () => {
    const points = trendPoints(data, TODAY, THIS_YEAR);
    expect(points[0].month).toBe("2026-01");
    expect(points.at(-1)?.month).toBe("2026-08");
    expect(points).toHaveLength(8);
  });

  it("shows all 12 months of a past year", () => {
    const points = trendPoints(data, TODAY, { kind: "year", year: 2025 });
    expect(points.map((p) => p.month)).toEqual(["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"]);
  });

  it("starts at the first statement for all time, however far back", () => {
    expect(trendPoints(data, TODAY, { kind: "all" })[0].month).toBe("2026-04");
    const old = { ...data, statements: [...data.statements, { ...data.statements[0], id: "old", statementDate: "2024-03-05", dueDate: "2024-03-25" }] };
    expect(trendPoints(old, TODAY, { kind: "all" })[0].month).toBe("2024-03");
    expect(trendPoints(old, TODAY, { kind: "all" }).at(-1)?.month).toBe("2026-08");
  });

  it("shows a range's months, and the last 3, 6 or 12 months up to this one (#113)", () => {
    expect(trendPoints(data, TODAY, { kind: "range", from: "2026-05", to: "2026-07" }).map((p) => p.month)).toEqual(["2026-05", "2026-06", "2026-07"]);
    expect(trendPoints(data, TODAY, lastMonths(3, TODAY)).map((p) => p.month)).toEqual(["2026-06", "2026-07", "2026-08"]);
    expect(trendPoints(data, TODAY, lastMonths(12, TODAY))).toHaveLength(12);
  });

  it("ignores orphaned or unreadable rows when finding all time's first month", () => {
    const orphan = { ...data, statements: [...data.statements, { ...data.statements[0], id: "orphan", cardId: "deleted-card", statementDate: "2022-01-05", dueDate: "2022-01-25" }] };
    expect(trendPoints(orphan, TODAY, { kind: "all" })[0].month).toBe("2026-04");
  });

  it("splits each month by card, and narrows to one card when selected", () => {
    const aug = trendPoints(data, TODAY, THIS_YEAR).at(-1);
    expect(aug).toEqual({ month: "2026-08", total: 50900, byCard: { "demo-regalia": 38500, "demo-amazon": 12400, "demo-gold": 0 }, hasStatements: true });
    expect(trendPoints(data, TODAY, THIS_YEAR, "demo-amazon").at(-1)).toEqual({ month: "2026-08", total: 12400, byCard: { "demo-amazon": 12400 }, hasStatements: true });
  });

  it("marks the months that have no statements, so the chart can draw them as no data", () => {
    const points = trendPoints(data, TODAY, THIS_YEAR);
    expect(points.filter((p) => !p.hasStatements).map((p) => p.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
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

describe("trendSummary", () => {
  it("averages over every month shown and finds the peak", () => {
    const summary = trendSummary(trendPoints(data, TODAY, lastMonths(3, TODAY)));
    expect(summary.average).toBeCloseTo((50100 + 57300 + 50900) / 3, 6);
    expect(summary.peak).toEqual({ month: "2026-07", amount: 57300 });
  });

  it("gives the same monthly average as the greeting for every kind of period, all cards or one", () => {
    for (const period of [THIS_YEAR, { kind: "year" as const, year: 2025 }, { kind: "all" as const }, lastMonths(6, TODAY), { kind: "range" as const, from: "2026-02", to: "2026-06" }]) {
      for (const cardId of [undefined, "demo-regalia"]) {
        expect(trendSummary(trendPoints(data, TODAY, period, cardId)).average).toBeCloseTo(spendSummary(data, period, TODAY, cardId).average, 6);
      }
    }
    expect(trendSummary(trendPoints(data, TODAY, THIS_YEAR)).average).toBeCloseTo(239700 / 8, 6);
  });

  it("has no peak when nothing was spent", () => {
    expect(trendSummary(trendPoints({ cards: [], statements: [] }, TODAY, THIS_YEAR)).peak).toBeNull();
    expect(trendSummary([]).average).toBe(0);
  });
});
