import { describe, expect, it } from "vitest";
import { sourceMix } from "./sourceMix";

type T = Parameters<typeof sourceMix>[0][number];
const t = (o: Partial<T>): T => ({ market: "US", symbol: "NTAP", tradeDate: "2025-01-01", tradeType: "Buy", source: "Market", quantity: 10, soldFrom: undefined, ...o });
const pools = (trades: T[], today = "2026-01-01") => sourceMix(trades, today).get("US:NTAP")!;
// 60 RSU, 30 ESPP and 10 bought with cash: 100 shares.
const book = [t({ source: "RSU", quantity: 60 }), t({ source: "ESPP", quantity: 30 }), t({ source: "Market", quantity: 10 })];

describe("sourceMix", () => {
  it("adds each buy to its source", () => {
    expect(pools(book).pools).toEqual({ Market: 10, ESPP: 30, RSU: 60 });
  });

  it("takes a marked sale from the shares he said, the rest untouched", () => {
    const h = pools([...book, t({ tradeDate: "2025-06-01", tradeType: "Sell", quantity: 10, soldFrom: "Market" }), t({ tradeDate: "2025-06-02", tradeType: "Sell", quantity: 10, soldFrom: "ESPP" })]);
    expect(h.pools).toEqual({ Market: 0, ESPP: 20, RSU: 60 });
    expect(h.unmarkedSales).toBe(0);
  });

  it("takes an ESPP sale, or an RSU sell-to-cover, from its own source with nothing marked", () => {
    const h = pools([...book, t({ tradeDate: "2025-06-01", tradeType: "Sell", source: "ESPP", quantity: 5 }), t({ tradeDate: "2025-06-02", tradeType: "Sell", source: "RSU", quantity: 6 })]);
    expect(h.pools).toEqual({ Market: 10, ESPP: 25, RSU: 54 });
    expect(h.unmarkedSales).toBe(0);
  });

  it("counts a sale he hasn't marked in proportion, and says there was one to guess at", () => {
    const h = pools([...book, t({ tradeDate: "2025-06-01", tradeType: "Sell", quantity: 20 })]);
    // 20 of 100: a fifth of each pool goes.
    expect(h.pools.Market).toBeCloseTo(8, 9);
    expect(h.pools.ESPP).toBeCloseTo(24, 9);
    expect(h.pools.RSU).toBeCloseTo(48, 9);
    expect(h.unmarkedSales).toBe(1);
  });

  it("doesn't call it a guess when only one source was held", () => {
    const h = pools([t({ quantity: 10 }), t({ tradeDate: "2025-02-01", tradeType: "Sell", quantity: 4 })]);
    expect(h.pools).toEqual({ Market: 6, ESPP: 0, RSU: 0 });
    expect(h.unmarkedSales).toBe(0);
  });

  it("takes what a marked sale can't cover from its source out of the others in proportion", () => {
    const h = pools([...book, t({ tradeDate: "2025-06-01", tradeType: "Sell", quantity: 30, soldFrom: "Market" })]);
    // 10 from cash, the other 20 of the remaining 90 (30 ESPP, 60 RSU) in proportion.
    expect(h.pools.Market).toBe(0);
    expect(h.pools.ESPP).toBeCloseTo(30 - 20 * (30 / 90), 9);
    expect(h.pools.RSU).toBeCloseTo(60 - 20 * (60 / 90), 9);
  });

  it("never goes below zero when more is sold than was held", () => {
    const h = pools([t({ quantity: 5 }), t({ tradeDate: "2025-02-01", tradeType: "Sell", quantity: 9 })]);
    expect(h.pools).toEqual({ Market: 0, ESPP: 0, RSU: 0 });
  });

  it("runs in date order, buys before sells on one day, and leaves out what is after today", () => {
    const sameDay = pools([t({ tradeType: "Sell", quantity: 5, soldFrom: "Market" }), t({ quantity: 10 })]);
    expect(sameDay.pools.Market).toBe(5);
    expect(pools([...book, t({ tradeDate: "2027-01-01", source: "Market", quantity: 100 })]).pools.Market).toBe(10);
  });

  it("keeps each holding on its own, by market and symbol", () => {
    const m = sourceMix([t({}), t({ symbol: "ZS", quantity: 3 }), t({ market: "IND", quantity: 7 })], "2026-01-01");
    expect([...m.keys()].sort()).toEqual(["IND:NTAP", "US:NTAP", "US:ZS"]);
    expect(m.get("US:ZS")!.pools.Market).toBe(3);
  });
});
