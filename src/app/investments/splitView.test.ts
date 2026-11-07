import { describe, expect, it } from "vitest";
import { investmentOverview } from "@/lib/aggregate/investmentOverview";
import type { PricePoint } from "@/lib/prices/history";
import type { Instrument, InvestmentTransaction } from "@/lib/sheets/types";
import { drawnLength, spinTo, splitView } from "./splitView";

const trade = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2024-01-02", symbol: "AAA", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 100, price: 100, total: 10000, assetType: "Equity", broker: "B", ...o,
});
const inst = (o: Partial<Instrument>): Instrument => ({ id: "i", symbol: "AAA", market: "IND", name: "Alpha Ltd", assetType: "Equity", priceTicker: "AAA.NS", ...o });
const days = (n: number, f: (i: number) => number): PricePoint[] => Array.from({ length: n }, (_, i) => ({ date: new Date(Date.parse("2024-01-02T00:00:00Z") + i * 86_400_000).toISOString().slice(0, 10), close: f(i) }));
const closes = new Map<string, PricePoint[]>([["AAA.NS", days(731, () => 100)], ["GLD.NS", days(731, () => 50)], ["BBB", days(731, () => 10)], ["USDINR", days(731, () => 90)]]);
const trades = [trade({}), trade({ id: "g", symbol: "GLD", assetType: "Gold", quantity: 100, price: 40, total: 4000 }), trade({ id: "u", symbol: "BBB", market: "US", currency: "USD", quantity: 10, price: 10, total: 100, fxRateToInr: 80 })];
const instruments = [inst({}), inst({ id: "g", symbol: "GLD", name: "Gold fund", assetType: "Gold", priceTicker: "GLD.NS" }), inst({ id: "j", symbol: "BBB", market: "US", name: "Beta Inc", priceTicker: "BBB" })];
const overview = investmentOverview({ trades, instruments, closes, today: "2026-01-01" });

describe("splitView", () => {
  const view = splitView(overview)!;

  it("cuts the holdings four ways, each adding up to the whole, with the wheel's slices following on from one another", () => {
    expect(view.dimensions.map((d) => d.label)).toEqual(["Asset class", "Market", "Company or fund", "Holding"]);
    for (const d of view.dimensions) {
      expect(d.slices.reduce((s, x) => s + x.fraction, 0)).toBeCloseTo(1, 12);
      d.slices.forEach((s, i) => expect(s.start).toBeCloseTo(d.slices.slice(0, i).reduce((sum, x) => sum + x.fraction, 0), 12));
    }
  });

  it("words each slice and each holding in it: its worth, its share and its gain with a sign", () => {
    const equity = view.dimensions[0].slices.find((s) => s.label === "Equity")!;
    expect(equity.value).toMatch(/^₹/);
    expect(equity.percent).toMatch(/^\d+(\.\d)?%$/);
    expect(equity.gain).toMatch(/^[+−]\d+%$/);
    expect(equity.members.map((m) => m.symbol)).toEqual(["AAA", "BBB"]);
    expect(equity.members.reduce((s, m) => s + m.fraction, 0)).toBeCloseTo(1, 12);
  });

  it("gives a share under 10% a decimal, so a small slice doesn't round to nothing", () => {
    const small = splitView(investmentOverview({ trades: [...trades, trade({ id: "s", symbol: "TNY", quantity: 10, price: 100, total: 1000 })], instruments: [...instruments, inst({ id: "k", symbol: "TNY", name: "Tiny", priceTicker: "TNY.NS" })], closes: new Map([...closes, ["TNY.NS", days(731, () => 100)]]), today: "2026-01-01" }))!;
    const tiny = small.dimensions[3].slices.find((s) => s.label === "TNY")!;
    expect(tiny.fraction).toBeLessThan(0.1);
    expect(tiny.percent).toMatch(/^\d\.\d%$/);
    expect(view.dimensions[3].slices[0].percent).toMatch(/^\d\d%$/);
  });

  it("has no card with nothing held", () => {
    expect(splitView(investmentOverview({ trades: [], instruments, closes, today: "2026-01-01" }))).toBeNull();
  });
});

describe("the wheel's turning and drawing", () => {
  it("turns a slice's middle to the top: the first of a half-and-half wheel by a quarter back, the second by three quarters", () => {
    expect(spinTo(0, 0.5)).toBe(-90);
    expect(spinTo(0.5, 0.5)).toBe(-270);
    expect(spinTo(0, 1)).toBe(-180);
  });

  it("leaves a gap between slices but keeps a thin one on the wheel", () => {
    expect(drawnLength(0.5, 0.004)).toBeCloseTo(0.496, 12);
    expect(drawnLength(0.001, 0.004)).toBeGreaterThan(0);
    expect(drawnLength(0.001, 0.004)).toBeLessThanOrEqual(0.001);
  });
});
