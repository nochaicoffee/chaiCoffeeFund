import { describe, expect, it } from "vitest";
import { holdingLens } from "./holdingLens";
import type { InvestmentTransaction } from "../sheets/types";
import type { PricePoint } from "../prices/history";

const trade = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2024-01-02", symbol: "AAA", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 100, price: 100, total: 10000, assetType: "Equity", broker: "B", ...o,
});
const days = (from: string, n: number, f: (i: number) => number): PricePoint[] =>
  Array.from({ length: n }, (_, i) => ({ date: new Date(Date.parse(`${from}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10), close: f(i) }));
const instrument = { symbol: "AAA", market: "IND" as const, name: "Alpha Ltd", priceTicker: "AAA.NS" };
const closes = new Map([["AAA.NS", days("2023-12-26", 800, (i) => 100 + i * 0.1)]]);

describe("holdingLens", () => {
  const rows = [trade({}), trade({ id: "b2", tradeDate: "2024-06-01", quantity: 100, price: 150, total: 15000 }), trade({ id: "s", tradeDate: "2025-01-01", tradeType: "Sell", quantity: 50, total: 8000 }), trade({ symbol: "OTHER", id: "o" })];
  const lens = holdingLens({ trades: rows, instrument, closes, usdInr: [], today: "2026-01-01" });

  it("draws the price from the day of his first trade, with what he paid a share from then on", () => {
    expect(lens.points[0]).toMatchObject({ date: "2024-01-02", avgCost: 100 });
    expect(lens.points.every((p) => p.date >= "2024-01-02")).toBe(true);
    // After the second buy: 25,000 for 200 shares is 125 a share. A part sale leaves it unchanged.
    expect(lens.points.find((p) => p.date === "2024-06-02")!.avgCost).toBe(125);
    expect(lens.points.find((p) => p.date === "2025-01-02")!.avgCost).toBe(125);
  });

  it("marks every trade of his on this holding and none of another's", () => {
    expect(lens.markers.map((m) => [m.date, m.tradeType, m.quantity])).toEqual([["2024-01-02", "Buy", 100], ["2024-06-01", "Buy", 100], ["2025-01-01", "Sell", 50]]);
  });

  it("works out the stats of this holding alone", () => {
    expect(lens.quantity).toBe(150);
    expect(lens.avgCost).toBe(125);
    expect(lens.costInr).toBe(18750);
    const today = closes.get("AAA.NS")!.find((p) => p.date === "2026-01-01")!.close;
    expect(lens.price).toBe(today);
    expect(lens.valueInr).toBeCloseTo(150 * today, 6);
    expect(lens.gainInr).toBeCloseTo(lens.valueInr - 18750, 6);
    expect(lens.realisedInr).toBe(8000 - 12500 * 0.5 * 1); // 50 of 200 shares at 125 = 6,250 of cost
    expect(lens.xirr.tooEarly).toBe(false);
    expect(lens.priceCagr).not.toBeNull();
  });

  it("uses the market price the day he first bought for the price's growth, not what he paid", () => {
    const esppFirst = holdingLens({ trades: [trade({ source: "ESPP", price: 50, total: 5000 })], instrument, closes, usdInr: [], today: "2026-01-01" });
    expect(esppFirst.priceCagr).toBeCloseTo(Math.pow(esppFirst.price! / (100 + 7 * 0.1), 365 / 730) - 1, 6);
  });

  it("is a US holding in dollars, with the gain split into price and rupee", () => {
    const us = holdingLens({
      trades: [trade({ market: "US", currency: "USD", quantity: 10, price: 100, total: 1000, fxRateToInr: 80 })],
      instrument: { ...instrument, market: "US" }, closes, usdInr: days("2023-12-26", 800, () => 90), today: "2026-01-01",
    });
    expect(us.currency).toBe("USD");
    expect(us.avgCost).toBe(100);
    expect(us.split).not.toBeNull();
    expect(us.split!.pricePartInr + us.split!.rupeePartInr).toBeCloseTo(us.gainInr, 6);
  });

  it("counts a holding with no price at its cost, with an empty line", () => {
    const naked = holdingLens({ trades: rows, instrument: { ...instrument, priceTicker: "NOPE" }, closes, usdInr: [], today: "2026-01-01" });
    expect(naked).toMatchObject({ price: null, valueInr: 18750, points: [] });
  });

  it("has no average cost, and nothing held, once everything is sold", () => {
    const sold = holdingLens({ trades: [trade({}), trade({ id: "s", tradeDate: "2025-01-01", tradeType: "Sell", total: 12000 })], instrument, closes, usdInr: [], today: "2026-01-01" });
    expect(sold).toMatchObject({ quantity: 0, avgCost: null, valueInr: 0, realisedInr: 2000 });
    expect(sold.points.find((p) => p.date === "2025-06-01")!.avgCost).toBeNull();
  });
});
