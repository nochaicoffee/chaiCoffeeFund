import { describe, expect, it } from "vitest";
import { priceDrift, refreshJobs, snapshotsToAdd, yahooRangeFor, USD_INR_TICKER, type TickerJob } from "./refreshPlan";
import type { Instrument, InvestmentTransaction } from "../sheets/types";

const inst = (o: Partial<Instrument>): Instrument => ({ id: "i", symbol: "NTAP", market: "US", name: "NetApp", assetType: "Equity", priceTicker: "NTAP", ...o });
const trade = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2025-01-10", symbol: "NTAP", market: "US", currency: "USD", tradeType: "Buy", source: "Market", quantity: 1, price: 1, total: 1, assetType: "Equity", broker: "B", fxRateToInr: 85, ...o,
});

describe("refreshJobs", () => {
  const jobs = refreshJobs(
    [inst({}), inst({ id: "j", symbol: "NIFTYBEES", market: "IND", priceTicker: "NIFTYBEES.NS" }), inst({ id: "k", symbol: "OLDFUND", market: "IND", assetType: "Mutual-Fund", priceTicker: "135762" })],
    [trade({ tradeDate: "2025-03-20" }), trade({ id: "t2", tradeDate: "2025-01-10" }), trade({ id: "t3", symbol: "NIFTYBEES", market: "IND", tradeDate: "2024-06-04" })],
    "2026-11-05",
  );
  const job = (ticker: string) => jobs.find((j) => j.ticker === ticker)!;

  it("keeps each instrument from a week before its first trade, in its market's currency", () => {
    expect(job("NTAP")).toEqual({ ticker: "NTAP", source: "Yahoo", currency: "USD", from: "2025-01-03" });
    expect(job("NIFTYBEES.NS")).toEqual({ ticker: "NIFTYBEES.NS", source: "Yahoo", currency: "INR", from: "2024-05-28" });
  });

  it("reads a fund by its AMFI code", () => {
    expect(job("135762").source).toBe("AMFI");
  });

  it("keeps a year back for an instrument he has never traded", () => {
    expect(job("135762").from).toBe("2025-11-05");
  });

  it("keeps both indices and USD to INR from a week before his first trade of all", () => {
    expect(job("^NSEI")).toMatchObject({ source: "Yahoo", currency: "INR", from: "2024-05-28" });
    expect(job("^GSPC")).toMatchObject({ source: "Yahoo", currency: "USD", from: "2024-05-28" });
    expect(job(USD_INR_TICKER)).toMatchObject({ source: "Frankfurter", currency: "INR", from: "2024-05-28" });
  });

  it("makes one job for a ticker two instruments share, from the earlier day", () => {
    const shared = refreshJobs([inst({}), inst({ id: "x", market: "IND", symbol: "NTAPIN" })].map((i) => ({ ...i, priceTicker: "SAME" })), [trade({ tradeDate: "2025-05-01" }), trade({ id: "t2", symbol: "NTAPIN", market: "IND", tradeDate: "2025-01-01" })], "2026-11-05");
    expect(shared.filter((j) => j.ticker === "SAME")).toHaveLength(1);
    expect(shared.find((j) => j.ticker === "SAME")!.from).toBe("2024-12-25");
  });
});

describe("yahooRangeFor", () => {
  it("picks the smallest range that reaches back far enough", () => {
    expect(yahooRangeFor("2026-10-20", "2026-11-05")).toBe("1mo");
    expect(yahooRangeFor("2026-08-01", "2026-11-05")).toBe("6mo");
    expect(yahooRangeFor("2025-12-01", "2026-11-05")).toBe("1y");
    expect(yahooRangeFor("2024-05-28", "2026-11-05")).toBe("5y");
    expect(yahooRangeFor("2010-01-01", "2026-11-05")).toBe("max");
  });
});

describe("snapshotsToAdd", () => {
  const job: TickerJob = { ticker: "NTAP", source: "Yahoo", currency: "USD", from: "2026-11-02" };
  const fetched = [{ date: "2026-10-30", close: 1 }, { date: "2026-11-02", close: 2 }, { date: "2026-11-03", close: 3 }, { date: "2026-11-04", close: 4 }];

  it("adds the fetched days from the first day wanted that aren't saved", () => {
    expect(snapshotsToAdd(job, fetched, new Set(["2026-11-03"]))).toEqual([
      { date: "2026-11-02", ticker: "NTAP", close: 2, currency: "USD", source: "Yahoo" },
      { date: "2026-11-04", ticker: "NTAP", close: 4, currency: "USD", source: "Yahoo" },
    ]);
  });

  it("never overwrites a saved day, even when the source now says something else", () => {
    expect(snapshotsToAdd(job, [{ date: "2026-11-02", close: 999 }], new Set(["2026-11-02"]))).toEqual([]);
  });

  it("adds nothing when everything is saved, so running twice is harmless", () => {
    expect(snapshotsToAdd(job, fetched, new Set(["2026-11-02", "2026-11-03", "2026-11-04"]))).toEqual([]);
  });
});

describe("priceDrift", () => {
  const saved = new Map([["2026-11-02", 100], ["2026-11-03", 102]]);

  it("finds nothing when the source agrees with what was saved, to within rounding", () => {
    expect(priceDrift([{ date: "2026-11-02", close: 100.0004 }, { date: "2026-11-03", close: 102 }], saved)).toEqual({ days: 0, worst: 0, firstDay: null });
  });

  it("flags a stretch of days the source now prices differently, as after a 10-for-1 split", () => {
    const drift = priceDrift([{ date: "2026-11-02", close: 10 }, { date: "2026-11-03", close: 10.2 }], saved);
    expect(drift.days).toBe(2);
    expect(drift.firstDay).toBe("2026-11-02");
    expect(drift.worst).toBeCloseTo(0.9, 9);
  });

  it("ignores days that weren't saved", () => {
    expect(priceDrift([{ date: "2026-11-04", close: 999 }], saved).days).toBe(0);
  });
});
