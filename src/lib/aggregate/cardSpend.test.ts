import { describe, expect, it } from "vitest";
import {
  addMonths,
  allCardsUtilization,
  cardDetails,
  daysBetween,
  heatLevel,
  heatmapPeak,
  heatmapYearTotals,
  heatmapRows,
  monthOverMonth,
  monthRange,
  monthsSoFar,
  pendingStatements,
  pendingSummary,
  percentChange,
  recentStatements,
  spendRange,
  spendSeries,
  spendSummary,
  statementCounts,
  statementYears,
  tileCards,
} from "./cardSpend";
import { computeCardSummaries } from "./cards";
import type { Card, Statement } from "../sheets/types";

const card = (overrides: Partial<Card>): Card => ({
  id: "card",
  name: "Card",
  alias: "C",
  issuer: "Bank",
  creditLimit: 100000,
  statementAnchorDate: "2026-01-05",
  dueAnchorDate: "2026-01-25",
  status: "Active",
  ...overrides,
});

let nextId = 0;
const statement = (overrides: Partial<Statement>): Statement => ({
  id: `s${nextId++}`,
  cardId: "card",
  statementDate: "2026-01-05",
  dueDate: "2026-01-25",
  totalAmountDue: 1000,
  minimumAmountDue: 100,
  status: "Paid",
  ...overrides,
});

/**
 * The finalized Cards board (design/dashboards/CardsListLight.dc.html):
 * Regalia Gold, Amazon Pay and a Gold Card with no balance, statements Apr–Aug 2026,
 * viewed on 18 Aug 2026 (the board shows Aug 23 as "in 5d").
 */
const TODAY = "2026-08-18";
const regalia = card({ id: "regalia", name: "Regalia Gold", creditLimit: 120000 });
const amazon = card({ id: "amazon", name: "Amazon Pay", creditLimit: 80000 });
const gold = card({ id: "gold", name: "Gold Card", creditLimit: 200000 });
const CARDS = [regalia, amazon, gold];
const month = (m: string, regaliaAmount: number, amazonAmount: number, status: Statement["status"] = "Paid") => [
  statement({ cardId: "regalia", statementDate: `2026-${m}-05`, dueDate: `2026-${m}-25`, totalAmountDue: regaliaAmount, status }),
  statement({ cardId: "amazon", statementDate: `2026-${m}-03`, dueDate: `2026-${m}-23`, totalAmountDue: amazonAmount, status }),
];
const DESIGN_STATEMENTS = [
  ...month("04", 29600, 11400),
  ...month("05", 28100, 12300),
  ...month("06", 35600, 14500),
  ...month("07", 42100, 15200),
  ...month("08", 38500, 12400, "Pending"),
];
const DESIGN = { cards: CARDS, statements: DESIGN_STATEMENTS };

/** Wraps bare statements with a card for every card id they use. */
const withCards = (statements: Statement[], extra: Card[] = []) => ({
  cards: [...new Set(statements.map((s) => s.cardId))].map((id) => card({ id })).concat(extra),
  statements,
});

describe("the finalized design's numbers", () => {
  const year = spendSummary(DESIGN, { kind: "year", year: 2026 }, TODAY);

  it("totals the year's statement totals", () => {
    expect(year.total).toBe(239700);
  });

  it("averages over every month so far (Jan–Aug), the confirmed definition, not the 5 months with statements", () => {
    expect(year.months.map((m) => m.month)).toEqual(monthRange("2026-01", "2026-08"));
    expect(year.average).toBeCloseTo(239700 / 8, 6);
  });

  it("finds July as the highest month and May as the lowest, among months with statements", () => {
    expect(year.highest).toEqual({ month: "2026-07", amount: 57300 });
    expect(year.lowest).toEqual({ month: "2026-05", amount: 40400 });
    expect(year.monthsWithStatements).toBe(5);
  });

  it("compares August with July", () => {
    const change = monthOverMonth(DESIGN, TODAY);
    expect(change).toMatchObject({ current: 50900, previous: 57300, change: -6400 });
    expect(change.percent).toBeCloseTo(-6400 / 57300, 6);
  });

  it("counts both pending bills and the next due date", () => {
    expect(pendingSummary(DESIGN, TODAY)).toEqual({ count: 2, total: 50900, nextDueDate: "2026-08-23" });
    expect(pendingStatements(DESIGN, TODAY).map((d) => [d.statement.cardId, d.daysUntilDue])).toEqual([
      ["amazon", 5],
      ["regalia", 7],
    ]);
  });

  it("computes All Cards utilization from totals: ₹50,900 of ₹4,00,000", () => {
    expect(allCardsUtilization(DESIGN)).toEqual({ outstanding: 50900, activeOutstanding: 50900, limit: 400000, utilization: 50900 / 400000 });
  });

  it("matches the per-card utilization on the tiles", () => {
    const summaries = computeCardSummaries(CARDS, DESIGN_STATEMENTS, TODAY);
    expect(summaries.find((s) => s.card.id === "regalia")?.utilization).toBeCloseTo(0.3208, 4);
    expect(summaries.find((s) => s.card.id === "amazon")?.utilization).toBeCloseTo(0.155, 4);
    expect(summaries.find((s) => s.card.id === "gold")?.utilization).toBe(0);
  });

  it("filters to one card", () => {
    const regaliaYear = spendSummary(DESIGN, { kind: "year", year: 2026 }, TODAY, "regalia");
    expect(regaliaYear.total).toBe(29600 + 28100 + 35600 + 42100 + 38500);
    expect(regaliaYear.highest).toEqual({ month: "2026-07", amount: 42100 });
  });
});

describe("months", () => {
  it("adds months across year boundaries", () => {
    expect(addMonths("2025-12", 1)).toBe("2026-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-03", -15)).toBe("2024-12");
  });

  it("builds inclusive ranges, empty when reversed", () => {
    expect(monthRange("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(monthRange("2026-03", "2026-02")).toEqual([]);
  });

  it("counts days between dates, negative when overdue", () => {
    expect(daysBetween("2026-08-18", "2026-08-25")).toBe(7);
    expect(daysBetween("2026-08-28", "2026-09-02")).toBe(5);
    expect(daysBetween("2026-08-18", "2026-08-15")).toBe(-3);
  });
});

describe("monthsSoFar", () => {
  const statements = [statement({ statementDate: "2025-11-05" })];

  it("runs January to the current month for this year", () => {
    expect(monthsSoFar({ kind: "year", year: 2026 }, "2026-03-10", withCards(statements))).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("uses all 12 months for a past year, and none for a future year", () => {
    expect(monthsSoFar({ kind: "year", year: 2025 }, "2026-03-10", withCards(statements))).toHaveLength(12);
    expect(monthsSoFar({ kind: "year", year: 2027 }, "2026-03-10", withCards(statements))).toEqual([]);
  });

  it("runs from the first statement's month to now for all time", () => {
    expect(monthsSoFar({ kind: "all" }, "2026-02-01", withCards(statements))).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(monthsSoFar({ kind: "all" }, "2026-02-01", withCards([]))).toEqual([]);
  });

  it("uses that card's own first statement when filtered", () => {
    const two = [statement({ cardId: "a", statementDate: "2025-06-05" }), statement({ cardId: "b", statementDate: "2026-01-05" })];
    expect(monthsSoFar({ kind: "all" }, "2026-02-01", withCards(two), "b")).toEqual(["2026-01", "2026-02"]);
  });
});

describe("spendSummary edge cases", () => {
  it("is all zeros and nulls with no statements", () => {
    const summary = spendSummary(withCards([]), { kind: "year", year: 2026 }, "2026-08-18");
    expect(summary).toMatchObject({ total: 0, average: 0, highest: null, lowest: null, monthsWithStatements: 0 });
    expect(summary.months).toHaveLength(8);
  });

  it("is empty for all time before any statement exists", () => {
    expect(spendSummary(withCards([]), { kind: "all" }, "2026-08-18")).toMatchObject({ months: [], total: 0, average: 0 });
  });

  it("adds every statement dated in the same month, across cards", () => {
    const sameMonth = [
      statement({ cardId: "a", statementDate: "2026-02-03", totalAmountDue: 1000 }),
      statement({ cardId: "b", statementDate: "2026-02-28", totalAmountDue: 2500 }),
    ];
    expect(spendSummary(withCards(sameMonth), { kind: "year", year: 2026 }, "2026-02-28").months).toEqual([
      { month: "2026-01", amount: 0 },
      { month: "2026-02", amount: 3500 },
    ]);
  });

  it("gives ties to the earlier month", () => {
    const tied = [statement({ statementDate: "2026-02-05", totalAmountDue: 500 }), statement({ statementDate: "2026-04-05", totalAmountDue: 500 })];
    const summary = spendSummary(withCards(tied), { kind: "year", year: 2026 }, "2026-05-01");
    expect(summary.highest?.month).toBe("2026-02");
    expect(summary.lowest?.month).toBe("2026-02");
  });

  it("leaves out statements dated after the current month", () => {
    const future = [statement({ statementDate: "2026-09-05", totalAmountDue: 999 })];
    expect(spendSummary(withCards(future), { kind: "year", year: 2026 }, "2026-08-18").total).toBe(0);
  });

  it("averages a past year over 12 months", () => {
    const past = [statement({ statementDate: "2025-03-05", totalAmountDue: 12000 })];
    expect(spendSummary(withCards(past), { kind: "year", year: 2025 }, "2026-08-18").average).toBe(1000);
  });
});

describe("monthOverMonth", () => {
  it("compares January with the previous December", () => {
    const statements = [statement({ statementDate: "2025-12-05", totalAmountDue: 2000 }), statement({ statementDate: "2026-01-05", totalAmountDue: 3000 })];
    expect(monthOverMonth(withCards(statements), "2026-01-20")).toEqual({ current: 3000, previous: 2000, change: 1000, percent: 0.5 });
  });

  it("has no percentage when last month had no spend", () => {
    expect(monthOverMonth(withCards([statement({ statementDate: "2026-01-05" })]), "2026-01-20").percent).toBeNull();
  });
});

describe("pending", () => {
  it("counts only what's left on partly paid bills", () => {
    const partial = [statement({ status: "Pending", totalAmountDue: 10000, amountPaid: 4000, dueDate: "2026-08-30" })];
    expect(pendingSummary(withCards(partial), "2026-08-18")).toEqual({ count: 1, total: 6000, nextDueDate: "2026-08-30" });
  });

  it("never counts an overpaid pending bill as negative", () => {
    const over = [statement({ status: "Pending", totalAmountDue: 1000, amountPaid: 1500 })];
    expect(pendingStatements(withCards(over), "2026-01-01")[0].remaining).toBe(0);
  });

  it("ignores paid statements and keeps pending bills on closed cards", () => {
    const data = {
      cards: [card({ id: "card" }), card({ id: "closed-card", status: "Closed" })],
      statements: [statement({ status: "Paid" }), statement({ cardId: "closed-card", status: "Pending", dueDate: "2026-02-10" })],
    };
    expect(pendingSummary(data, "2026-02-01")).toEqual({ count: 1, total: 1000, nextDueDate: "2026-02-10" });
  });

  it("has no next due date when nothing is pending", () => {
    expect(pendingSummary(withCards([statement({ status: "Paid" })]), "2026-02-01")).toEqual({ count: 0, total: 0, nextDueDate: null });
  });
});

describe("allCardsUtilization", () => {
  it("counts a closed card's unpaid bill as outstanding, but not in utilization", () => {
    const data = {
      cards: [card({ id: "a", creditLimit: 100000 }), card({ id: "b", creditLimit: 100000, status: "Closed" })],
      statements: [
        statement({ cardId: "a", status: "Pending", totalAmountDue: 10000 }),
        statement({ cardId: "b", status: "Pending", totalAmountDue: 50000 }),
      ],
    };
    expect(allCardsUtilization(data)).toEqual({ outstanding: 60000, activeOutstanding: 10000, limit: 100000, utilization: 0.1 });
  });

  it("always matches the pending total", () => {
    const data = {
      cards: [card({ id: "a" }), card({ id: "b", status: "Closed" })],
      statements: [
        statement({ cardId: "a", status: "Pending", totalAmountDue: 10000, amountPaid: 2500 }),
        statement({ cardId: "a", status: "Pending", totalAmountDue: 1000, amountPaid: 1800 }),
        statement({ cardId: "b", status: "Pending", totalAmountDue: 4000 }),
      ],
    };
    expect(allCardsUtilization(data).outstanding).toBe(pendingSummary(data, "2026-01-01").total);
    expect(pendingSummary(data, "2026-01-01").total).toBe(7500 + 0 + 4000);
  });

  it("is null without any active credit limit", () => {
    expect(allCardsUtilization({ cards: [], statements: [] }).utilization).toBeNull();
  });
});

describe("heatmap", () => {
  it("shades relative to the largest month, from 1 to 5", () => {
    expect(heatLevel(57300, 57300)).toBe(5);
    expect(heatLevel(40400, 57300)).toBe(4);
    expect(heatLevel(1, 57300)).toBe(1);
    expect(heatLevel(0, 57300)).toBe(1);
    expect(heatLevel(100, 0)).toBe(1);
  });

  it("marks months without statements and months still to come", () => {
    const [row] = heatmapRows(DESIGN, { kind: "year", year: 2026 }, TODAY);
    expect(row.year).toBe(2026);
    expect(row.cells.map((c) => c.state)).toEqual([
      "no-data", "no-data", "no-data", "data", "data", "data", "data", "data",
      "upcoming", "upcoming", "upcoming", "upcoming",
    ]);
    expect(row.cells[6]).toEqual({ month: "2026-07", amount: 57300, state: "data", level: 5 });
  });

  it("shows one row per year for all time", () => {
    const statements = [statement({ statementDate: "2024-11-05" }), statement({ statementDate: "2026-02-05" })];
    expect(heatmapRows(withCards(statements), { kind: "all" }, "2026-03-01").map((r) => r.year)).toEqual([2024, 2025, 2026]);
    expect(heatmapRows(withCards([]), { kind: "all" }, "2026-03-01")).toEqual([]);
  });
});

describe("spendSeries", () => {
  it("splits each month by card, and the split adds up to the total", () => {
    const series = spendSeries(DESIGN, ["2026-07", "2026-08"]);
    expect(series).toEqual([
      { month: "2026-07", total: 57300, byCard: { regalia: 42100, amazon: 15200, gold: 0 } },
      { month: "2026-08", total: 50900, byCard: { regalia: 38500, amazon: 12400, gold: 0 } },
    ]);
  });
});

describe("percentChange", () => {
  it("is relative to the base, and null without one", () => {
    expect(percentChange(53100, 50000)).toBeCloseTo(0.062, 6);
    expect(percentChange(10, 0)).toBeNull();
  });
});

describe("rules decided 2026-10-17", () => {
  it("counts a credit balance as ₹0 spend, since the next statement already nets it", () => {
    const data = withCards([
      statement({ statementDate: "2026-03-05", totalAmountDue: -1200 }),
      statement({ statementDate: "2026-04-05", totalAmountDue: 8800 }),
    ]);
    const summary = spendSummary(data, { kind: "year", year: 2026 }, "2026-04-20");
    expect(summary.total).toBe(8800);
    expect(summary.lowest).toEqual({ month: "2026-03", amount: 0 });
  });

  it("leaves out statements whose card no longer exists", () => {
    const data = { cards: [card({ id: "kept" })], statements: [statement({ cardId: "kept", totalAmountDue: 500 }), statement({ cardId: "gone", totalAmountDue: 9000, status: "Pending" })] };
    expect(spendSummary(data, { kind: "year", year: 2026 }, "2026-01-20").total).toBe(500);
    expect(pendingSummary(data, "2026-01-20").count).toBe(0);
  });

  it("splits the chart across every card, closed ones included, so the split adds up", () => {
    const data = {
      cards: [card({ id: "open" }), card({ id: "closed", status: "Closed" })],
      statements: [statement({ cardId: "open", totalAmountDue: 3000 }), statement({ cardId: "closed", totalAmountDue: 8000 })],
    };
    const [point] = spendSeries(data, ["2026-01"]);
    expect(point).toEqual({ month: "2026-01", total: 11000, byCard: { open: 3000, closed: 8000 } });
    expect(point.total).toBe(spendSummary(data, { kind: "year", year: 2026 }, "2026-01-20").total);
  });
});

describe("rows read from the Sheet", () => {
  // Blank cells come back as "", and text cells as strings, despite the types.
  const raw = (overrides: Record<string, unknown>) => statement(overrides as Partial<Statement>);

  it("skips a statement with a blank total instead of joining text", () => {
    const data = withCards([raw({ totalAmountDue: "" }), raw({ totalAmountDue: 12400 })]);
    expect(spendSummary(data, { kind: "year", year: 2026 }, "2026-01-20").total).toBe(12400);
  });

  it("reads a total stored as text", () => {
    const data = withCards([raw({ totalAmountDue: "12400" })]);
    expect(spendSummary(data, { kind: "year", year: 2026 }, "2026-01-20").total).toBe(12400);
  });

  it("skips a statement with a blank or malformed date", () => {
    const data = withCards([raw({ statementDate: "" }), raw({ statementDate: "5/1/2026" }), raw({ statementDate: "2026-01-05", totalAmountDue: 700 })]);
    expect(monthsSoFar({ kind: "all" }, "2026-02-01", data)).toEqual(["2026-01", "2026-02"]);
    expect(spendSummary(data, { kind: "all" }, "2026-02-01").total).toBe(700);
  });

  it("treats a blank amount paid as nothing paid", () => {
    const data = withCards([raw({ status: "Pending", totalAmountDue: 5000, amountPaid: "" })]);
    expect(pendingSummary(data, "2026-01-01").total).toBe(5000);
  });
});

describe("statementYears", () => {
  it("lists years with statements, newest first, plus this year", () => {
    const data = withCards([statement({ statementDate: "2024-03-05" }), statement({ statementDate: "2025-07-05" })]);
    expect(statementYears(data, "2026-01-10")).toEqual([2026, 2025, 2024]);
    expect(statementYears(withCards([]), "2026-01-10")).toEqual([2026]);
  });
});

describe("tileCards", () => {
  it("matches the design's tiles", () => {
    const tiles = tileCards(DESIGN, TODAY);
    expect(tiles.map((t) => [t.card.id, t.outstanding, t.nextDue?.daysUntilDue ?? null])).toEqual([
      ["regalia", 38500, 7],
      ["amazon", 12400, 5],
      ["gold", 0, null],
    ]);
    expect(tiles[0].utilization).toBeCloseTo(0.3208, 4);
  });

  it("shows a closed card only while it still has a bill to pay", () => {
    const owing = {
      cards: [card({ id: "open" }), card({ id: "closed-owing", status: "Closed" }), card({ id: "closed-done", status: "Closed" })],
      statements: [statement({ cardId: "closed-owing", status: "Pending" }), statement({ cardId: "closed-done", status: "Paid" })],
    };
    expect(tileCards(owing, "2026-01-10").map((t) => t.card.id)).toEqual(["open", "closed-owing"]);
  });

  it("knows when each card's next statement is due", () => {
    const [tile] = tileCards({ cards: [card({ id: "c", statementAnchorDate: "2026-01-05" })], statements: [] }, "2026-10-17");
    expect(tile.nextStatementDate).toBe("2026-11-05");
  });
});

describe("heatmapPeak", () => {
  it("marks the single highest month across every row shown", () => {
    expect(heatmapPeak(heatmapRows(DESIGN, { kind: "year", year: 2026 }, TODAY))).toEqual({ month: "2026-07", amount: 57300 });
    const multiYear = withCards([statement({ statementDate: "2025-03-05", totalAmountDue: 9000 }), statement({ statementDate: "2026-02-05", totalAmountDue: 4000 })]);
    expect(heatmapPeak(heatmapRows(multiYear, { kind: "all" }, "2026-03-01"))).toEqual({ month: "2025-03", amount: 9000 });
  });

  it("is null when nothing has statements", () => {
    expect(heatmapPeak(heatmapRows(withCards([]), { kind: "year", year: 2026 }, TODAY))).toBeNull();
  });
});

describe("heatmapYearTotals", () => {
  it("gives each row its year's total and every-month-so-far average", () => {
    const rows = heatmapRows(DESIGN, { kind: "year", year: 2026 }, TODAY);
    expect(heatmapYearTotals(DESIGN, rows, TODAY)).toEqual([{ year: 2026, total: 239700, months: 8, average: 239700 / 8 }]);
  });

  it("follows the selected card", () => {
    const rows = heatmapRows(DESIGN, { kind: "year", year: 2026 }, TODAY, "amazon");
    expect(heatmapYearTotals(DESIGN, rows, TODAY, "amazon")[0].total).toBe(11400 + 12300 + 14500 + 15200 + 12400);
  });
});

describe("cardDetails", () => {
  const thisYear = { kind: "year" as const, year: 2026 };

  it("matches the design's All Cards details card", () => {
    const d = cardDetails(DESIGN, thisYear, TODAY);
    expect(d).toMatchObject({ outstanding: 50900, limit: 400000, available: 349100, total: 239700 });
    expect(d.utilization).toBeCloseTo(0.12725, 6);
    expect(d.highest).toEqual({ month: "2026-07", amount: 57300 });
    expect(d.lowest).toEqual({ month: "2026-05", amount: 40400 });
    expect(d.due.map((i) => [i.statement.cardId, i.remaining])).toEqual([["amazon", 12400], ["regalia", 38500]]);
    // The confirmed average is ÷ 8 months, so the marker sits at 29,962.5 of 4,00,000.
    expect(d.averageOnLimit).toBeCloseTo(239700 / 8 / 400000, 6);
  });

  it("uses one card's own balance and limit when selected", () => {
    const d = cardDetails(DESIGN, thisYear, TODAY, "regalia");
    expect(d).toMatchObject({ outstanding: 38500, limit: 120000, available: 81500 });
    expect(d.due).toHaveLength(1);
  });

  it("counts a closed card's unpaid bill as outstanding, but not against the active limit", () => {
    const data = {
      cards: [card({ id: "a", creditLimit: 100000 }), card({ id: "b", creditLimit: 50000, status: "Closed" })],
      statements: [statement({ cardId: "a", status: "Pending", totalAmountDue: 10000 }), statement({ cardId: "b", status: "Pending", totalAmountDue: 5000 })],
    };
    expect(cardDetails(data, thisYear, "2026-01-20")).toMatchObject({ outstanding: 15000, limit: 100000, utilization: 0.1, available: 90000 });
  });

  it("has no utilization or average marker without a limit", () => {
    const d = cardDetails({ cards: [], statements: [] }, thisYear, TODAY);
    expect(d.utilization).toBeNull();
    expect(d.averageOnLimit).toBeNull();
    expect(d.available).toBe(0);
  });
});

describe("recentStatements and statementCounts", () => {
  it("lists the newest statements first", () => {
    expect(recentStatements(DESIGN, { kind: "all" }, 3).map((s) => [s.cardId, s.statementDate])).toEqual([
      ["regalia", "2026-08-05"],
      ["amazon", "2026-08-03"],
      ["regalia", "2026-07-05"],
    ]);
    expect(recentStatements(DESIGN, { kind: "all" }, 5, "amazon")).toHaveLength(5);
    expect(recentStatements(DESIGN, { kind: "year", year: 2025 }, 5)).toEqual([]);
  });

  it("counts pending, closed and paid-in-full statements in the period", () => {
    const data = withCards([
      statement({ status: "Paid", totalAmountDue: 1000, amountPaid: 1000 }),
      statement({ status: "Paid", totalAmountDue: 1000, amountPaid: 400 }),
      statement({ status: "Pending", totalAmountDue: 1000 }),
    ]);
    expect(statementCounts(data, { kind: "all" })).toEqual({ pending: 1, closed: 2, inFull: 1 });
    expect(statementCounts(data, { kind: "year", year: 2025 })).toEqual({ pending: 0, closed: 0, inFull: 0 });
  });
});

describe("spendRange", () => {
  it("shows where the current month sits in the design's year", () => {
    const range = spendRange(DESIGN, { kind: "year", year: 2026 }, TODAY);
    expect(range.rows).toHaveLength(1);
    expect(range.rows[0].months.map((m) => m.month)).toEqual(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]);
    expect(range.rows[0].highest).toEqual({ month: "2026-07", amount: 57300 });
    expect(range.rows[0].lowest).toEqual({ month: "2026-05", amount: 40400 });
    expect(range.current).toEqual({ month: "2026-08", amount: 50900 });
    expect(range.currentVsAverage).toBeCloseTo(50900 / (239700 / 8) - 1, 6);
    // Spans the months and the ₹29,962.50 average, rounded out to ₹10,000s.
    expect([range.scaleMin, range.scaleMax]).toEqual([20000, 60000]);
    expect(range.ticks).toEqual([20000, 30000, 40000, 50000, 60000]);
    expect(range.highest).toEqual({ month: "2026-07", amount: 57300 });
    expect(range.lowest).toEqual({ month: "2026-05", amount: 40400 });
  });

  it("keeps the axis to a handful of labels for large amounts", () => {
    const big = withCards([
      statement({ statementDate: "2026-01-05", totalAmountDue: 150000 }),
      statement({ statementDate: "2026-02-05", totalAmountDue: 480000 }),
    ]);
    const range = spendRange(big, { kind: "year", year: 2026 }, "2026-02-20");
    expect(range.ticks.length).toBeLessThanOrEqual(7);
    expect(range.ticks[0]).toBeLessThanOrEqual(150000);
    expect(range.ticks.at(-1)).toBeGreaterThanOrEqual(480000);
  });

  it("has no current month when the period is another year", () => {
    const range = spendRange(DESIGN, { kind: "year", year: 2025 }, TODAY);
    expect(range.current).toBeNull();
    expect(range.currentVsAverage).toBeNull();
  });

  it("gives one row per year with statements for all time, newest first", () => {
    const data = withCards([statement({ statementDate: "2024-05-05", totalAmountDue: 20000 }), statement({ statementDate: "2026-01-05", totalAmountDue: 30000 })]);
    expect(spendRange(data, { kind: "all" }, "2026-01-20").rows.map((r) => r.year)).toEqual([2026, 2024]);
  });

  it("has no current month until it has statements", () => {
    const range = spendRange(DESIGN, { kind: "year", year: 2026 }, "2026-09-02");
    expect(range.current).toBeNull();
    expect(range.currentVsAverage).toBeNull();
  });

  it("still gives a usable scale with one value or none", () => {
    const one = spendRange(withCards([statement({ statementDate: "2026-01-05", totalAmountDue: 30000 })]), { kind: "year", year: 2026 }, "2026-01-20");
    expect(one.scaleMax).toBeGreaterThan(one.scaleMin);
    const none = spendRange(withCards([]), { kind: "year", year: 2026 }, "2026-01-20");
    expect([none.scaleMin, none.scaleMax]).toEqual([0, 10000]);
  });
});
