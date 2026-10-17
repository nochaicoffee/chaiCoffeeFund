import { describe, expect, it } from "vitest";
import { isPastPeriod, lastMonths, monthRangePeriod, monthSpanName, parsePeriodParam, periodLabel, periodName, periodParam, periodPhrase, withinOneYear } from "./period";
import { periodHasMonth, type SpendPeriod } from "./cardSpend";

const TODAY = "2026-10-20";
const range = (from: string, to: string): SpendPeriod => ({ kind: "range", from, to });

describe("lastMonths", () => {
  it("counts this month as the last of them", () => {
    expect(lastMonths(3, TODAY)).toEqual({ kind: "range", from: "2026-08", to: "2026-10", last: 3 });
    expect(lastMonths(6, TODAY)).toEqual({ kind: "range", from: "2026-05", to: "2026-10", last: 6 });
    expect(lastMonths(12, TODAY)).toEqual({ kind: "range", from: "2025-11", to: "2026-10", last: 12 });
    expect(lastMonths(3, "2026-01-05")).toEqual({ kind: "range", from: "2025-11", to: "2026-01", last: 3 });
  });
});

describe("monthRangePeriod", () => {
  it("puts the ends in order, whichever was picked first", () => {
    expect(monthRangePeriod("2026-08", "2026-03", TODAY)).toEqual(range("2026-03", "2026-08"));
  });

  it("stops at this month, and is nothing when it's all still to come", () => {
    expect(monthRangePeriod("2026-09", "2027-02", TODAY)).toEqual(range("2026-09", "2026-10"));
    expect(monthRangePeriod("2026-11", "2027-02", TODAY)).toBeNull();
  });
});

describe("parsePeriodParam and periodParam", () => {
  it("defaults to this year, and leaves it out of links", () => {
    expect(parsePeriodParam(undefined, TODAY)).toEqual({ kind: "year", year: 2026 });
    expect(periodParam({ kind: "year", year: 2026 }, TODAY)).toBeUndefined();
  });

  it("reads and writes the years and all time as before", () => {
    expect(parsePeriodParam("2025", TODAY)).toEqual({ kind: "year", year: 2025 });
    expect(parsePeriodParam("all", TODAY)).toEqual({ kind: "all" });
    expect(periodParam({ kind: "year", year: 2025 }, TODAY)).toBe("2025");
    expect(periodParam({ kind: "all" }, TODAY)).toBe("all");
  });

  it("keeps a quick range as the last n months, so an old link still means the latest months", () => {
    expect(parsePeriodParam("last-6m", TODAY)).toEqual(lastMonths(6, TODAY));
    expect(parsePeriodParam("last-6m", "2027-03-01")).toEqual({ kind: "range", from: "2026-10", to: "2027-03", last: 6 });
    expect(periodParam(lastMonths(12, TODAY), TODAY)).toBe("last-12m");
  });

  it("reads a range of months, in either order, ending no later than this month", () => {
    expect(parsePeriodParam("2026-03..2026-08", TODAY)).toEqual(range("2026-03", "2026-08"));
    expect(parsePeriodParam("2026-08..2026-03", TODAY)).toEqual(range("2026-03", "2026-08"));
    expect(parsePeriodParam("2026-09..2027-01", TODAY)).toEqual(range("2026-09", "2026-10"));
    expect(periodParam(range("2025-11", "2026-02"), TODAY)).toBe("2025-11..2026-02");
  });

  it("falls back to this year for anything it can't read", () => {
    for (const value of ["nonsense", "last-5m", "last-6", "2026-13..2026-08", "2026-3..2026-08", "2026-03..2026-04..2026-05", "2027-01..2027-03", ""]) {
      expect(parsePeriodParam(value, TODAY)).toEqual({ kind: "year", year: 2026 });
    }
  });

  it("round-trips every kind of period", () => {
    for (const period of [{ kind: "all" } as const, { kind: "year", year: 2024 } as const, lastMonths(3, TODAY), range("2026-02", "2026-02"), range("2024-12", "2026-01")]) {
      expect(parsePeriodParam(periodParam(period, TODAY), TODAY)).toEqual(period);
    }
  });
});

describe("periodName and periodLabel", () => {
  it("names a range by its months, with the year once when it's one year", () => {
    expect(monthSpanName("2026-03", "2026-08")).toBe("Mar – Aug 2026");
    expect(monthSpanName("2025-11", "2026-02")).toBe("Nov 2025 – Feb 2026");
    expect(monthSpanName("2026-03", "2026-03")).toBe("Mar 2026");
  });

  it("names every kind for the pill, and lowercases the words for use inside a label", () => {
    const cases: [SpendPeriod, string, string][] = [
      [{ kind: "year", year: 2026 }, "This year", "this year"],
      [{ kind: "year", year: 2025 }, "2025", "2025"],
      [{ kind: "all" }, "All time", "all time"],
      [lastMonths(6, TODAY), "Last 6 months", "last 6 months"],
      [range("2026-03", "2026-08"), "Mar – Aug 2026", "Mar – Aug 2026"],
    ];
    for (const [period, name, label] of cases) {
      expect(periodName(period, TODAY)).toBe(name);
      expect(periodLabel(period, TODAY)).toBe(label);
    }
  });
});

describe("periodPhrase", () => {
  it("words the years and all time as the summary always has", () => {
    expect(periodPhrase({ kind: "year", year: 2026 }, TODAY)).toBe("so far in 2026");
    expect(periodPhrase({ kind: "year", year: 2025 }, TODAY)).toBe("in 2025");
    expect(periodPhrase({ kind: "all" }, TODAY, "2025-01")).toBe("since January 2025");
    expect(periodPhrase({ kind: "all" }, TODAY)).toBe("so far");
  });

  it("words the quick ranges and custom ranges", () => {
    expect(periodPhrase(lastMonths(6, TODAY), TODAY)).toBe("in the last 6 months");
    expect(periodPhrase(range("2026-03", "2026-03"), TODAY)).toBe("in March 2026");
    expect(periodPhrase(range("2026-03", "2026-10"), TODAY)).toBe("since March 2026");
    expect(periodPhrase(range("2026-03", "2026-08"), TODAY)).toBe("from March to August 2026");
    expect(periodPhrase(range("2025-11", "2026-02"), TODAY)).toBe("from November 2025 to February 2026");
  });
});

describe("isPastPeriod, withinOneYear and periodHasMonth", () => {
  it("is past for a past year or a range that ended before this month", () => {
    expect(isPastPeriod({ kind: "year", year: 2025 }, TODAY)).toBe(true);
    expect(isPastPeriod({ kind: "year", year: 2026 }, TODAY)).toBe(false);
    expect(isPastPeriod({ kind: "all" }, TODAY)).toBe(false);
    expect(isPastPeriod(range("2026-03", "2026-09"), TODAY)).toBe(true);
    expect(isPastPeriod(range("2026-03", "2026-10"), TODAY)).toBe(false);
  });

  it("is within one year for a year or a range inside one", () => {
    expect(withinOneYear({ kind: "year", year: 2025 })).toBe(true);
    expect(withinOneYear({ kind: "all" })).toBe(false);
    expect(withinOneYear(lastMonths(6, TODAY))).toBe(true);
    expect(withinOneYear(lastMonths(12, TODAY))).toBe(false);
  });

  it("includes a range's first and last months", () => {
    const p = range("2026-03", "2026-08");
    expect(["2026-02", "2026-03", "2026-08", "2026-09"].map((m) => periodHasMonth(p, m))).toEqual([false, true, true, false]);
    expect(periodHasMonth({ kind: "year", year: 2026 }, "2026-12")).toBe(true);
    expect(periodHasMonth({ kind: "year", year: 2026 }, "2025-12")).toBe(false);
    expect(periodHasMonth({ kind: "all" }, "1999-01")).toBe(true);
  });
});
