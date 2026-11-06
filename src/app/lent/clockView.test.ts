import { describe, expect, it } from "vitest";
import { clockView, PERIOD_COLOR, PERIODS } from "./clockView";
import { lentModel, type LentData } from "./views";
import type { IncomeEntry, IncomeSource, LentLoan, LentRepayment } from "@/lib/sheets/types";

const TODAY = "2026-11-06";
const a: LentLoan = { id: "a", borrowerName: "Friend", principalAmount: 650000, startDate: "2024-10-01", interestMode: "Accruing", interestRate: 12, status: "Active" };
const b: LentLoan = { id: "b", borrowerName: "Friend – ₹3L", principalAmount: 300000, startDate: "2025-11-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000, status: "Active", incomeSourceId: "sb" };
const c: LentLoan = { id: "c", borrowerName: "Friend – ₹1.82L", principalAmount: 182000, startDate: "2026-01-01", interestMode: "Paid-out", payoutFrequency: "Quarterly", payoutAmount: 18000, status: "Active", incomeSourceId: "sc" };
const sb: IncomeSource = { id: "sb", name: "B", alias: "B", category: "Investment", frequency: "Monthly", expectedAmount: 6000, status: "Active", scheduleDate: "2025-12-01" };
const sc: IncomeSource = { id: "sc", name: "C", alias: "C", category: "Investment", frequency: "Quarterly", expectedAmount: 18000, status: "Active", scheduleDate: "2026-04-01" };
let n = 0;
const got = (sourceId: string, expected: string, received: string, amount: number): IncomeEntry => ({ id: `e${++n}`, incomeSourceId: sourceId, expectedDate: expected, receivedDate: received, amount, status: "Received", tag: "Regular" });
const entries: IncomeEntry[] = [
  got("sb", "2025-12-01", "2025-12-01", 6000), got("sb", "2026-01-01", "2026-01-02", 6000), got("sb", "2026-03-01", "2026-03-10", 6000), got("sb", "2026-04-01", "2026-04-01", 6000),
  got("sb", "2026-05-01", "2026-05-02", 6000), got("sb", "2026-06-01", "2026-06-01", 6000), got("sb", "2026-07-01", "2026-07-01", 6000), got("sb", "2026-08-01", "2026-08-03", 6000),
  got("sb", "2026-09-01", "2026-09-01", 6000), got("sb", "2026-10-01", "2026-10-01", 6000),
  got("sc", "2026-04-01", "2026-04-01", 18000), got("sc", "2026-07-01", "2026-07-04", 18000), got("sc", "2026-10-01", "2026-10-01", 18000),
];
const data: LentData = { loans: [a, b, c], repayments: [], sources: [sb, sc], entries };
const pay = (id: string, lentLoanId: string, date: string, amount: number, kind: LentRepayment["kind"]): LentRepayment => ({ id, lentLoanId, date, amount, kind });

describe("clockView on his three loans", () => {
  const v = clockView(lentModel(data, TODAY))!;

  it("has the four periods, each with its own colour", () => {
    expect(PERIODS).toEqual(["day", "month", "year", "all"]);
    expect(Object.keys(v.periods)).toEqual([...PERIODS]);
    expect(PERIOD_COLOR).toEqual({ day: "amber", month: "teal", year: "indigo", all: "forest" });
  });
  it("earns about ₹608 a day, split ₹214, ₹197, ₹197", () => {
    const day = v.periods.day;
    expect(day.big).toBe("608");
    expect(day.unit).toBe("a day");
    expect(day.basis).toBe("at today's pace");
    expect(day.rows.map((r) => [r.name, r.amount, r.share])).toEqual([["Friend", "₹214", "35%"], ["Friend – ₹3L", "₹197", "32%"], ["Friend – ₹1.82L", "₹197", "32%"]]);
  });
  it("makes a year exactly 365 days of the day, and a month a twelfth of it", () => {
    expect(v.periods.year.big).toBe("2,22,000");
    expect(v.periods.month.big).toBe("18,500");
  });
  it("draws arcs that add to one for each period", () => {
    for (const p of PERIODS) expect(v.periods[p].arcs.reduce((t, x) => t + x.fraction, 0)).toBeCloseTo(1, 12);
  });
  it("has earned ₹2,89,693 all time: ₹1,63,693 piled up and ₹1,26,000 promised", () => {
    const all = v.periods.all;
    expect(all.big).toBe("2,89,693");
    expect(all.unit).toBe("earned so far");
    expect(all.basis).toBe("since Oct 2024");
    expect(all.rows.map((r) => r.amount)).toEqual(["₹1,63,693", "₹72,000", "₹54,000"]);
  });
  it("shows the pot growing ₹214 a day, ₹8.90 an hour, none paid, and the lumps", () => {
    expect(v.pot).toEqual({ title: "The 12% pot, ticking up", amount: "₹1,63,693", note: "+₹214 a day · about ₹8.90 an hour · none of it paid yet" });
    expect(v.lumps).toEqual({ title: "The payouts, in lumps", amount: "₹1,26,000 promised", note: "₹1,14,000 arrived · ₹12,000 not here" });
  });
});

describe("the chart", () => {
  const chart = clockView(lentModel(data, TODAY))!.chart;

  it("keeps every point inside 0 to 1, with the lines running left to right", () => {
    for (const line of chart.lines) {
      for (const [px, py] of line.points) {
        expect(px).toBeGreaterThanOrEqual(0);
        expect(px).toBeLessThanOrEqual(1);
        expect(py).toBeGreaterThanOrEqual(0);
        expect(py).toBeLessThanOrEqual(1);
      }
      const xs = line.points.map((p) => p[0]);
      expect([...xs].sort((p, q) => p - q)).toEqual(xs);
    }
  });
  it("never falls: each line only goes up", () => {
    for (const line of chart.lines) {
      const ys = line.points.map((p) => p[1]);
      expect([...ys].sort((p, q) => p - q)).toEqual(ys);
    }
  });
  it("ends each line on what it has earned: the 12% pile, ₹72,000 and ₹54,000, against the same scale", () => {
    const top = chart.yTicks.at(-1)!;
    expect(top.at).toBe(1);
    const last = chart.lines.map((l) => l.points.at(-1)![1]);
    expect(last[0]).toBeGreaterThan(last[1]);
    expect(last[1]).toBeGreaterThan(last[2]);
    expect(last[1] / last[2]).toBeCloseTo(72000 / 54000, 6);
  });
  it("steps up on each promised day for a payout loan, and only the 12% loan gets a projection", () => {
    const stepped = chart.lines[1].points;
    const risers = stepped.filter((p, i) => i > 0 && p[0] === stepped[i - 1][0] && p[1] > stepped[i - 1][1]);
    expect(risers).toHaveLength(12);
    expect(chart.lines[0].projection).toHaveLength(2);
    expect(chart.lines[1].projection).toBeUndefined();
  });
  it("marks the payout that never came and the one not here yet, inside the chart", () => {
    expect(chart.marks.map((m) => m.label)).toEqual(["never came", "not here yet"]);
    for (const m of chart.marks) {
      expect(m.x).toBeGreaterThan(0);
      expect(m.y).toBeGreaterThan(0);
    }
  });
  it("shades the picked period up to today, and all time from the first loan", () => {
    expect(chart.bands.all[0]).toBe(0);
    expect(chart.bands.all[1]).toBe(chart.today);
    expect(chart.bands.year[0]).toBeLessThan(chart.bands.month[0]);
    expect(chart.bands.month[0]).toBeLessThan(chart.bands.day[0]);
  });
  it("labels its ticks: rupee amounts up the side, the years along the bottom", () => {
    expect(chart.yTicks[0].label).toBe("₹0");
    expect(chart.yTicks.every((t, i) => i === 0 || t.label.startsWith("₹"))).toBe(true);
    expect(chart.xTicks.map((t) => t.label)).toEqual(["2025", "2026", "2027"]);
    expect(chart.label).toBe("Interest earned, adding up since Oct 2024");
  });
});

describe("clockView in the other cases", () => {
  it("is nothing when nothing was ever lent", () => {
    expect(clockView(lentModel({ loans: [], repayments: [], sources: [], entries: [] }, TODAY))).toBeNull();
  });
  it("falls to nothing a day when all the principal came back, but keeps the interest in all time and in the chart", () => {
    const back = [pay("r", "a", "2026-01-01", 650000, "Principal")];
    const v = clockView(lentModel({ loans: [a], repayments: back, sources: [], entries: [] }, TODAY))!;
    expect(v.periods.day.rows).toEqual([]);
    expect(v.periods.day.big).toBe("0");
    expect(v.periods.all.rows).toHaveLength(1);
    expect(v.chart.lines[0].projection).toBeUndefined();
  });
  it("starts a later Accruing loan's line at nothing on the day it was lent", () => {
    const late: LentLoan = { ...a, id: "late", borrowerName: "Late", startDate: "2026-09-17", principalAmount: 100000 };
    const v = clockView(lentModel({ loans: [a, late], repayments: [], sources: [], entries: [] }, TODAY))!;
    const line = v.chart.lines[1];
    expect(line.points[0][1]).toBe(0);
    expect(line.points[0][0]).toBeGreaterThan(0.5);
    expect(line.points[1][0]).toBeGreaterThan(line.points[0][0]);
  });
  it("says an unlinked payout loan adds nothing to all time, and says nothing when every payout loan is linked", () => {
    const unlinked: LentLoan = { ...b, incomeSourceId: undefined };
    expect(clockView(lentModel({ loans: [a, unlinked], repayments: [], sources: [], entries: [] }, TODAY))!.periods.all.note).toContain("no income source");
    expect(clockView(lentModel(data, TODAY))!.periods.all.note).not.toContain("no income source");
  });
  it("leaves out the pot and the lumps when there are none", () => {
    const v = clockView(lentModel({ loans: [b], repayments: [], sources: [sb], entries }, TODAY))!;
    expect(v.pot).toBeUndefined();
    expect(v.lumps).toBeDefined();
    const none = clockView(lentModel({ loans: [a], repayments: [], sources: [], entries: [] }, TODAY))!;
    expect(none.lumps).toBeUndefined();
  });
});
