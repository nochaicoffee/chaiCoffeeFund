import { describe, expect, it } from "vitest";
import { againstLastYear, financialYear, financialYearOf, incomeByMonth, payChanges, receivedMonthlyAverage, sameDayLastYear } from "./incomeYear";
import type { IncomeEntry, IncomeSource } from "../sheets/types";

let n = 0;
const got = (receivedDate: string, amount: number, o: Partial<IncomeEntry> = {}): IncomeEntry => ({
  id: `e${n++}`,
  incomeSourceId: "sal",
  expectedDate: receivedDate,
  receivedDate,
  amount,
  status: "Received",
  tag: "Regular",
  ...o,
});

const salary: IncomeSource = { id: "sal", name: "NetApp Salary", alias: "Salary", category: "Salary", frequency: "Monthly", expectedAmount: 100000, status: "Active", scheduleDate: "2026-01-01" };

describe("incomeByMonth", () => {
  it("counts a payment in the month it landed, not the month it was expected", () => {
    const months = incomeByMonth([got("2026-04-02", 100000, { expectedDate: "2026-03-31" })], 2026);
    expect(months[2].total).toBe(0);
    expect(months[3].total).toBe(100000);
  });

  it("splits each month by source and tag, and the parts add up to the month", () => {
    const months = incomeByMonth([got("2026-03-01", 100000), got("2026-03-28", 60000, { tag: "Bonus" }), got("2026-03-05", 18400, { incomeSourceId: "fd" })], 2026);
    const march = months[2];
    expect(march.total).toBe(178400);
    expect(march.bySource).toEqual({ sal: 160000, fd: 18400 });
    expect(march.byTag).toEqual({ Regular: 118400, Bonus: 60000, Other: 0 });
    expect(Object.values(march.bySource).reduce((a, b) => a + b, 0)).toBe(march.total);
  });

  it("never counts what hasn't landed", () => {
    const pending: IncomeEntry = { id: "p", incomeSourceId: "sal", expectedDate: "2026-05-01", amount: 1, status: "Pending", tag: "Regular" };
    expect(incomeByMonth([pending], 2026).every((m) => m.total === 0)).toBe(true);
  });
});

describe("receivedMonthlyAverage", () => {
  it("divides the year so far by the months so far, this one included", () => {
    expect(receivedMonthlyAverage([got("2026-01-01", 100000), got("2026-10-01", 150000), got("2025-12-01", 999999)], "2026-10-24")).toBe(25000);
  });
});

describe("againstLastYear", () => {
  it("compares Jan 1 to today with Jan 1 to the same day last year", () => {
    const r = againstLastYear([got("2026-10-24", 100), got("2026-10-25", 5), got("2025-10-24", 80), got("2025-10-25", 1000)], "2026-10-24");
    expect(r).toEqual({ thisYear: 100, lastYear: 80, change: 20, ratio: 0.25 });
  });

  it("has no ratio when nothing landed last year", () => {
    expect(againstLastYear([got("2026-02-01", 100)], "2026-10-24").ratio).toBeUndefined();
  });

  it("maps Feb 29 to Feb 28", () => {
    expect(sameDayLastYear("2028-02-29")).toBe("2027-02-28");
    expect(sameDayLastYear("2026-10-24")).toBe("2025-10-24");
  });
});

describe("financialYear", () => {
  it("runs April to March", () => {
    expect(financialYearOf("2026-10-24")).toEqual({ start: "2026-04-01", end: "2027-03-31", name: "FY 2026-27" });
    expect(financialYearOf("2026-03-31")).toEqual({ start: "2025-04-01", end: "2026-03-31", name: "FY 2025-26" });
    expect(financialYearOf("2099-04-01").name).toBe("FY 2099-00");
  });

  it("projects received + pending + the schedule to Mar 31 at the usual amount, no bonus", () => {
    // Apr to Sep received (6 × 1L) plus a bonus; Oct 1 missed (pending); Nov to Mar expected (5 × 1L).
    const entries = ["04", "05", "06", "07", "08", "09"].map((m) => got(`2026-${m}-01`, 100000));
    entries.push(got("2026-06-15", 50000, { tag: "Bonus", expectedDate: "2026-06-15" }));
    entries.push(got("2025-05-01", 90000), got("2025-11-01", 90000));
    const fy = financialYear([salary], entries, "2026-10-24");
    expect(fy.received).toBe(650000);
    expect(fy.pending).toBe(100000);
    expect(fy.expected).toBe(500000);
    expect(fy.projected).toBe(fy.received + fy.pending + fy.expected);
    expect(fy.lastYear).toEqual({ name: "FY 2025-26", total: 180000, sameDay: 90000 });
  });
});

describe("payChanges", () => {
  it("lists payments 2% or more off the one before from the same source and tag, newest first", () => {
    const entries = [
      got("2026-01-01", 125000),
      got("2026-02-01", 126000), // +0.8%: ignored
      got("2026-04-01", 138500), // +9.9% on 126000
      got("2026-03-20", 160000, { tag: "Bonus" }), // first bonus: nothing before it in its own tag
      got("2026-05-01", 138500),
    ];
    const changes = payChanges(entries);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ sourceId: "sal", tag: "Regular", from: 126000, to: 138500, change: 12500 });
    expect(changes[0].ratio).toBeCloseTo(0.0992, 4);
  });

  it("catches a drop exactly at 2%", () => {
    expect(payChanges([got("2026-01-10", 5000, { incomeSourceId: "div" }), got("2026-04-10", 4900, { incomeSourceId: "div" })])[0].ratio).toBeCloseTo(-0.02);
  });
});
