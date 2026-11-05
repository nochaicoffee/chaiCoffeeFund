import { describe, expect, it } from "vitest";
import { earnedOn, evenDates, interestSeries, lentClock, missedMarks } from "./lentClock";
import { interestAccrued } from "./lentOut";
import { lentPromises, type LentPromises } from "./lentPromises";
import type { IncomeEntry, IncomeSource, LentLoan, LentRepayment } from "../sheets/types";

const TODAY = "2026-11-06";
const a: LentLoan = { id: "a", borrowerName: "Friend", principalAmount: 650000, startDate: "2024-10-01", interestMode: "Accruing", interestRate: 12, status: "Active" };
const b: LentLoan = { id: "b", borrowerName: "Friend – ₹3L", principalAmount: 300000, startDate: "2025-11-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000, status: "Active" };
const c: LentLoan = { id: "c", borrowerName: "Friend – ₹1.82L", principalAmount: 182000, startDate: "2026-01-01", interestMode: "Paid-out", payoutFrequency: "Quarterly", payoutAmount: 18000, status: "Active" };
const sb: IncomeSource = { id: "sb", name: "B", alias: "B", category: "Investment", frequency: "Monthly", expectedAmount: 6000, status: "Active", scheduleDate: "2025-12-01" };
const sc: IncomeSource = { id: "sc", name: "C", alias: "C", category: "Investment", frequency: "Quarterly", expectedAmount: 18000, status: "Active", scheduleDate: "2026-04-01" };
let n = 0;
const got = (sourceId: string, expected: string, received: string, amount: number): IncomeEntry => ({ id: `e${++n}`, incomeSourceId: sourceId, expectedDate: expected, receivedDate: received, amount, status: "Received", tag: "Regular" });
/** The mockups' sample: ₹3L pays 10 of 12 months (Feb never came, Nov 5 days over); ₹1.82L pays all three quarters. */
const entries: IncomeEntry[] = [
  got("sb", "2025-12-01", "2025-12-01", 6000), got("sb", "2026-01-01", "2026-01-02", 6000), got("sb", "2026-03-01", "2026-03-10", 6000), got("sb", "2026-04-01", "2026-04-01", 6000),
  got("sb", "2026-05-01", "2026-05-02", 6000), got("sb", "2026-06-01", "2026-06-01", 6000), got("sb", "2026-07-01", "2026-07-01", 6000), got("sb", "2026-08-01", "2026-08-03", 6000),
  got("sb", "2026-09-01", "2026-09-01", 6000), got("sb", "2026-10-01", "2026-10-01", 6000),
  got("sc", "2026-04-01", "2026-04-01", 18000), got("sc", "2026-07-01", "2026-07-04", 18000), got("sc", "2026-10-01", "2026-10-01", 18000),
];
const promises: Record<string, LentPromises> = { b: lentPromises(b, sb, entries, TODAY), c: lentPromises(c, sc, entries, TODAY) };
const pay = (id: string, lentLoanId: string, date: string, amount: number, kind: LentRepayment["kind"]): LentRepayment => ({ id, lentLoanId, date, amount, kind });

describe("lentClock: at today's pace", () => {
  const clock = lentClock([a, b, c], [], promises, TODAY);

  it("earns about ₹608 a day, split ₹213.70, ₹197.26 and ₹197.26 (35%, 32%, 32%)", () => {
    expect(clock.pace.day).toBeCloseTo(608.2, 1);
    expect(clock.loans.map((x) => Math.round(x.share * 100))).toEqual([35, 32, 32]);
    expect(clock.loans.reduce((t, x) => t + x.share, 0)).toBeCloseTo(1, 12);
  });
  it("makes a year exactly 365 days of it, and a month a twelfth of a year", () => {
    expect(clock.pace.year).toBeCloseTo(clock.pace.day * 365, 6);
    expect(clock.pace.month).toBeCloseTo(clock.pace.year / 12, 9);
    expect(clock.pace.year).toBeCloseTo(78000 + 72000 + 72000, 6);
  });
  it("falls from the day part of the principal comes back", () => {
    const after = lentClock([a, b, c], [pay("r", "a", "2026-01-01", 325000, "Principal")], promises, TODAY);
    expect(after.pace.day).toBeCloseTo(608.2 - 213.7 / 2, 1);
  });
});

describe("lentClock: all time", () => {
  const clock = lentClock([a, b, c], [], promises, TODAY);

  it("has earned ₹2,89,693: ₹1,63,693 piled up on the 12% loan and ₹1,26,000 promised by the payout loans", () => {
    expect(clock.allTime.earned).toBeCloseTo(163693.15 + 126000, 1);
    expect(clock.loans.find((x) => x.loan.id === "a")?.earned).toBeCloseTo(interestAccrued(a, [], TODAY), 9);
  });
  it("has received ₹1,14,000, so ₹1,75,693 isn't here yet", () => {
    expect(clock.allTime.received).toBe(114000);
    expect(clock.allTime.notYet).toBeCloseTo(163693.15 + 12000, 1);
  });
  it("adds the interest a borrower has paid on an Accruing loan to what reached him", () => {
    const paid = lentClock([a], [pay("r", "a", "2026-06-01", 40000, "Interest")], {}, TODAY);
    expect(paid.allTime.received).toBe(40000);
    expect(paid.allTime.notYet).toBeCloseTo(interestAccrued(a, [], TODAY) - 40000, 6);
  });
  it("counts a repaid loan's interest in all time, though it earns nothing a day", () => {
    const repaid: LentLoan = { ...a, status: "Repaid", closedDate: "2025-10-01" };
    const r = lentClock([repaid], [], {}, TODAY);
    expect(r.allTime.earned).toBeCloseTo(78000, 6);
    expect(r.pace.day).toBe(0);
    expect(r.loans).toEqual([]);
  });
});

describe("lentClock: the pot and the lumps", () => {
  const clock = lentClock([a, b, c], [], promises, TODAY);
  it("has ₹1,63,693 piled up unpaid on the 12% loan, growing ₹213.70 a day, ₹8.90 an hour", () => {
    expect(clock.pot.owed).toBeCloseTo(163693.15, 1);
    expect(clock.pot.perDay).toBeCloseTo(213.7, 2);
    expect(clock.pot.perHour).toBeCloseTo(8.9, 2);
  });
  it("has promised ₹1,26,000 in lumps, ₹1,14,000 arrived, ₹12,000 not here (₹6,000 missing, ₹6,000 overdue)", () => {
    expect(clock.lumps).toEqual({ promised: 126000, arrived: 114000, missing: 6000, overdue: 6000, notHere: 12000 });
  });
  it("leaves a payout loan with no income source out of the lumps: nothing promised, nothing missing", () => {
    const r = lentClock([b], [], {}, TODAY);
    expect(r.lumps).toEqual({ promised: 0, arrived: 0, missing: 0, overdue: 0, notHere: 0 });
    expect(r.allTime.earned).toBe(0);
  });
});

describe("the chart of interest adding up", () => {
  const dates = evenDates("2024-10-01", TODAY, 30);
  const series = interestSeries([a, b, c], [], promises, dates);

  it("spans the days asked, both ends included, in order", () => {
    expect(dates[0]).toBe("2024-10-01");
    expect(dates.at(-1)).toBe(TODAY);
    expect([...dates].sort()).toEqual(dates);
  });
  it("starts at nothing and never falls", () => {
    expect(series[0].total).toBe(0);
    for (let i = 1; i < series.length; i++) expect(series[i].total).toBeGreaterThanOrEqual(series[i - 1].total);
  });
  it("ends on all time: the last point is what the clock says has been earned", () => {
    expect(series.at(-1)?.total).toBeCloseTo(lentClock([a, b, c], [], promises, TODAY).allTime.earned, 6);
  });
  it("follows the 12% loan as a straight line, and the payout loans in steps on their days", () => {
    expect(earnedOn(a, [], undefined, "2025-10-01")).toBeCloseTo(78000, 6);
    expect(earnedOn(b, [], promises.b, "2025-12-01")).toBe(6000);
    expect(earnedOn(b, [], promises.b, "2025-12-31")).toBe(6000);
    expect(earnedOn(b, [], promises.b, "2026-01-01")).toBe(12000);
    expect(earnedOn(b, [], promises.b, "2025-11-30")).toBe(0);
  });
  it("splits each point by loan, adding to the total", () => {
    for (const p of series) expect(Object.values(p.byLoan).reduce((t, v) => t + v, 0)).toBeCloseTo(p.total, 9);
  });
});

describe("evenDates", () => {
  it("never repeats a day when asked for more points than there are days", () => {
    expect(evenDates("2026-01-01", "2026-01-03", 10)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });
  it("gives two points at least", () => {
    expect(evenDates("2026-01-01", "2026-02-01", 1)).toEqual(["2026-01-01", "2026-02-01"]);
  });
});

describe("missedMarks", () => {
  it("marks the payout that never came and the one that isn't here yet, oldest first", () => {
    expect(missedMarks(promises)).toEqual([
      { loanId: "b", date: "2026-02-01", amount: 6000, kind: "Missing" },
      { loanId: "b", date: "2026-11-01", amount: 6000, kind: "Overdue" },
    ]);
  });
});

describe("review fixes", () => {
  it("leaves a loan whose principal has all come back out of the dial, but keeps its interest in all time", () => {
    const allBack = [pay("r", "a", "2026-01-01", 650000, "Principal")];
    const r = lentClock([a, b, c], allBack, promises, TODAY);
    expect(r.loans.map((x) => x.loan.id)).toEqual(["b", "c"]);
    expect(r.loans.reduce((t, x) => t + x.share, 0)).toBeCloseTo(1, 12);
    expect(r.allTime.earned).toBeCloseTo(interestAccrued(a, allBack, TODAY) + 126000, 6);
  });
  it("gives one day when the end is not after the start", () => {
    expect(evenDates("2026-01-01", "2026-01-01", 5)).toEqual(["2026-01-01"]);
    expect(evenDates("2026-02-01", "2026-01-01", 5)).toEqual(["2026-02-01"]);
  });
});

