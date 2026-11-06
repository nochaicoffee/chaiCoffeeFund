import { describe, expect, it } from "vitest";
import { gapToIndex, indexYearlyRate, portfolioHistory, timeWeightedReturns, type DayPoint, type PriceBook } from "./portfolioHistory";
import type { PricePoint } from "../prices/history";
import type { InvestmentTransaction } from "../sheets/types";

const day = (n: number, from = "2025-01-01") => new Date(Date.parse(`${from}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const trade = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2025-01-01", symbol: "XYZ", market: "IND", currency: "INR", tradeType: "Buy", source: "Market",
  quantity: 10, price: 100, total: 1000, assetType: "Equity", broker: "B", ...o,
});
const book = (closes: Record<string, PricePoint[]>, usdInr: PricePoint[] = []): PriceBook => ({
  closes: new Map(Object.entries(closes)),
  tickerFor: (symbol) => (symbol in closes ? symbol : undefined),
  usdInr,
});
const pt = (date: string, valueInr: number, netFlowInr = 0): DayPoint => ({ date, valueInr, costInr: 0, netFlowInr, unpriced: [], stale: [] });

describe("portfolioHistory", () => {
  it("values what was held each day at that day's close, carrying Friday over a weekend", () => {
    // 2025-01-03 is a Friday: closes on Friday and the Monday after.
    const closes = { XYZ: [{ date: "2025-01-03", close: 110 }, { date: "2025-01-06", close: 120 }] };
    const points = portfolioHistory([trade({ tradeDate: "2025-01-03" })], book(closes), "2025-01-03", "2025-01-06");
    expect(points.map((p) => [p.date, p.valueInr])).toEqual([["2025-01-03", 1100], ["2025-01-04", 1100], ["2025-01-05", 1100], ["2025-01-06", 1200]]);
  });

  it("values a US holding at the day's USD to INR", () => {
    const us = trade({ market: "US", currency: "USD", total: 1000, quantity: 10, fxRateToInr: 80 });
    const points = portfolioHistory([us], book({ XYZ: [{ date: "2025-01-01", close: 100 }] }, [{ date: "2025-01-01", close: 80 }, { date: "2025-01-02", close: 90 }]), "2025-01-01", "2025-01-02");
    expect(points.map((p) => p.valueInr)).toEqual([80000, 90000]);
    expect(points[0].costInr).toBe(80000);
  });

  it("counts a holding with no price at its cost and says so, rather than as worth nothing", () => {
    const points = portfolioHistory([trade({ symbol: "NOPRICE" })], book({}), "2025-01-01", "2025-01-02");
    expect(points[0]).toMatchObject({ valueInr: 1000, unpriced: ["NOPRICE"] });
  });

  it("counts a holding at cost on days before its first price, never using a price from after the day", () => {
    const points = portfolioHistory([trade({})], book({ XYZ: [{ date: "2025-01-03", close: 150 }] }), "2025-01-01", "2025-01-03");
    expect(points.map((p) => p.valueInr)).toEqual([1000, 1000, 1500]);
    expect(points[0].unpriced).toEqual(["XYZ"]);
  });

  it("records the day's net money in: a buy in, a sell out", () => {
    const rows = [trade({ id: "b" }), trade({ id: "s", tradeDate: "2025-01-02", tradeType: "Sell", quantity: 5, total: 600 })];
    const points = portfolioHistory(rows, book({ XYZ: [{ date: "2025-01-01", close: 100 }] }), "2025-01-01", "2025-01-02");
    expect(points.map((p) => p.netFlowInr)).toEqual([1000, -600]);
  });

  it("flags a holding valued at a close more than a week old, which still counts at that close", () => {
    const points = portfolioHistory([trade({})], book({ XYZ: [{ date: "2025-01-01", close: 100 }] }), "2025-01-01", "2025-01-12");
    expect(points[7].stale).toEqual([]); // 7 days old is fine
    expect(points[8].stale).toEqual(["XYZ"]);
    expect(points[11].valueInr).toBe(1000);
  });

  it("counts a US holding at cost while there is no USD to INR yet", () => {
    const us = trade({ market: "US", currency: "USD", fxRateToInr: 80 });
    const points = portfolioHistory([us], book({ XYZ: [{ date: "2025-01-01", close: 100 }] }, []), "2025-01-01", "2025-01-01");
    expect(points[0]).toMatchObject({ valueInr: 80000, unpriced: ["XYZ"] });
  });

  it("is nothing held before the first trade", () => {
    const points = portfolioHistory([trade({ tradeDate: "2025-01-05" })], book({ XYZ: [{ date: "2025-01-01", close: 100 }] }), "2025-01-01", "2025-01-03");
    expect(points.every((p) => p.valueInr === 0)).toBe(true);
  });
});

describe("timeWeightedReturns", () => {
  it("chains each day's return: +10% then -5% is +4.5%", () => {
    const r = timeWeightedReturns([pt("2025-01-01", 100), pt("2025-01-02", 110), pt("2025-01-03", 104.5)]);
    expect(r.index[2]).toBeCloseTo(1.045, 12);
    expect(r.totalReturn).toBeCloseTo(0.045, 12);
  });

  it("is not flattered by money added later: a deposit that doubles the value with no price move is a return of zero", () => {
    const r = timeWeightedReturns([pt("2025-01-01", 100), pt("2025-01-02", 100), pt("2025-01-03", 200, 100), pt("2025-01-04", 200)]);
    expect(r.totalReturn).toBeCloseTo(0, 12);
  });

  it("does not hide a fall behind money added: value flat at 200 after a 100 deposit and a 50% price fall is -50%", () => {
    // Day 2: 100 held, 100 added, then the price halves: the 200 that day-end is 100 added + 100 left of the original... measured on yesterday's 100: 200 - 100 = 100 over 100 is flat; day 3 halves.
    const r = timeWeightedReturns([pt("2025-01-01", 100), pt("2025-01-02", 200, 100), pt("2025-01-03", 100)]);
    expect(r.index[2]).toBeCloseTo(0.5, 12);
  });

  it("gives the deepest fall of the index, peak to trough, with its days", () => {
    const r = timeWeightedReturns([pt("2025-01-01", 100), pt("2025-01-02", 120), pt("2025-01-03", 90), pt("2025-01-04", 110)]);
    expect(r.deepestFall?.fraction).toBeCloseTo(0.25, 12);
    expect(r.deepestFall).toMatchObject({ from: "2025-01-02", to: "2025-01-03" });
  });

  it("has no fall when the value only rises", () => {
    expect(timeWeightedReturns([pt("2025-01-01", 100), pt("2025-01-02", 101)]).deepestFall).toBeNull();
  });

  it("gives a yearly rate only after a year of days: 10% over 365 days is 10% a year", () => {
    const points = Array.from({ length: 366 }, (_, i) => pt(day(i), 100 * Math.pow(1.1, i / 365)));
    const r = timeWeightedReturns(points);
    expect(r.days).toBe(365);
    expect(r.yearlyRate).toBeCloseTo(0.1, 9);
    expect(timeWeightedReturns(points.slice(0, 200)).yearlyRate).toBeNull();
  });

  it("starts at 1 on the first day something is held and ignores the empty days before", () => {
    const r = timeWeightedReturns([pt("2025-01-01", 0), pt("2025-01-02", 0), pt("2025-01-03", 100, 100), pt("2025-01-04", 110)]);
    expect(r.index).toEqual([1, 1, 1, expect.closeTo(1.1, 12)]);
    expect(r.days).toBe(1);
  });

  it("restarts after a position is sold out and a new one bought", () => {
    const r = timeWeightedReturns([pt("2025-01-01", 100), pt("2025-01-02", 0, -110), pt("2025-01-03", 50, 50), pt("2025-01-04", 55)]);
    // The day after the new purchase is +10% on that purchase, whatever the first position did.
    expect(r.index[3] / r.index[2]).toBeCloseTo(1.1, 12);
  });

  it("says the day the index starts, so an index can be measured over the same days", () => {
    expect(timeWeightedReturns([pt("2025-01-01", 0), pt("2025-01-02", 100, 100), pt("2025-01-03", 101)]).startDate).toBe("2025-01-02");
  });

  it("has no return for a portfolio that never held anything", () => {
    expect(timeWeightedReturns([pt("2025-01-01", 0), pt("2025-01-02", 0)])).toMatchObject({ totalReturn: null, yearlyRate: null, deepestFall: null, days: 0, startDate: null });
  });
});

describe("indexYearlyRate and gapToIndex", () => {
  const nifty = [{ date: "2024-01-01", close: 100 }, { date: "2026-01-01", close: 121 }];

  it("is the index's yearly rate between the two days: 100 to 121 over two years is 10%", () => {
    expect(indexYearlyRate(nifty, "2024-01-01", "2026-01-01")).toBeCloseTo(Math.pow(1.21, 365 / 731) - 1, 9);
  });

  it("converts a dollar index at each end's rate to get it in rupees", () => {
    const sp = [{ date: "2024-01-01", close: 100 }, { date: "2025-01-01", close: 110 }];
    const fx = [{ date: "2024-01-01", close: 80 }, { date: "2025-01-01", close: 88 }];
    // 100 x 80 = 8,000 to 110 x 88 = 9,680 in 366 days.
    expect(indexYearlyRate(sp, "2024-01-01", "2025-01-01", fx)).toBeCloseTo(Math.pow(9680 / 8000, 365 / 366) - 1, 9);
  });

  it("is null under a year, or when an end has no close", () => {
    expect(indexYearlyRate(nifty, "2025-06-01", "2025-12-01")).toBeNull();
    expect(indexYearlyRate(nifty, "2023-01-01", "2026-01-01")).toBeNull();
  });

  it("is the portfolio's less the index's, and null if either is", () => {
    expect(gapToIndex(0.162, 0.086)).toBeCloseTo(0.076, 12);
    expect(gapToIndex(null, 0.08)).toBeNull();
    expect(gapToIndex(0.1, null)).toBeNull();
  });
});
