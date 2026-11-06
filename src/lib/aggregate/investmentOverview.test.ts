import { describe, expect, it } from "vitest";
import { investmentOverview } from "./investmentOverview";
import type { Instrument, InvestmentTransaction } from "../sheets/types";
import type { PricePoint } from "../prices/history";

const trade = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2024-01-02", symbol: "AAA", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 100, price: 100, total: 10000, assetType: "Equity", broker: "B", ...o,
});
const inst = (o: Partial<Instrument>): Instrument => ({ id: "i", symbol: "AAA", market: "IND", name: "Alpha Ltd", assetType: "Equity", priceTicker: "AAA.NS", ...o });
const days = (from: string, n: number, f: (i: number) => number): PricePoint[] =>
  Array.from({ length: n }, (_, i) => ({ date: new Date(Date.parse(`${from}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10), close: f(i) }));

// 2024-01-02 to 2026-01-01 is 731 days.
const closes = new Map<string, PricePoint[]>([
  ["AAA.NS", days("2024-01-02", 731, () => 150)],
  ["BBB", days("2024-01-02", 731, (i) => 10 + i * 0.001)],
  ["USDINR", days("2024-01-02", 731, () => 90)],
  ["^NSEI", days("2024-01-02", 731, (i) => 100 + i * 0.05)],
  ["^GSPC", days("2024-01-02", 731, () => 100)],
]);

describe("investmentOverview", () => {
  const trades = [trade({}), trade({ id: "u", symbol: "BBB", market: "US", currency: "USD", quantity: 10, price: 10, total: 100, fxRateToInr: 80 })];
  const instruments = [inst({}), inst({ id: "j", symbol: "BBB", market: "US", name: "Beta Inc", priceTicker: "BBB" })];
  const o = investmentOverview({ trades, instruments, closes, today: "2026-01-01" });

  it("values each holding at its latest close, a US one at today's USD to INR, biggest first", () => {
    expect(o.holdings.map((h) => h.symbol)).toEqual(["AAA", "BBB"]);
    expect(o.holdings[0]).toMatchObject({ name: "Alpha Ltd", price: 150, valueInr: 15000, costInr: 10000, gainInr: 5000, gainFraction: 0.5 });
    const b = o.holdings[1];
    expect(b.valueInr).toBeCloseTo(10 * (10 + 730 * 0.001) * 90, 6);
    expect(b.costInr).toBe(8000);
  });

  it("adds up: worth, cost, gain and each share of the whole", () => {
    expect(o.valueInr).toBeCloseTo(o.holdings[0].valueInr + o.holdings[1].valueInr, 9);
    expect(o.costInr).toBe(18000);
    expect(o.gainInr).toBeCloseTo(o.valueInr - 18000, 9);
    expect(o.holdings.reduce((s, h) => s + h.share, 0)).toBeCloseTo(1, 12);
  });

  it("gives the last day's move: nothing for a flat price, the price and rupee for a rising one", () => {
    expect(o.holdings[0].dayChangeInr).toBe(0);
    expect(o.holdings[1].dayChangeInr).toBeCloseTo(10 * 0.001 * 90, 6);
    expect(o.dayChangeInr).toBeCloseTo(10 * 0.001 * 90, 6);
  });

  it("says prices are from the newest close, and nothing is unpriced", () => {
    expect(o.pricesFrom).toBe("2026-01-01");
    expect(o.unpriced).toEqual([]);
  });

  it("gives a yearly return and time-weighted figures after a year, and the gap to Nifty over the same days", () => {
    expect(o.xirr.tooEarly).toBe(false);
    expect(o.xirr.rate).toBeGreaterThan(0);
    expect(o.twr.yearlyRate).not.toBeNull();
    expect(o.niftyYearly).not.toBeNull();
    expect(o.gapToNifty).toBeCloseTo(o.twr.yearlyRate! - o.niftyYearly!, 12);
    expect(o.sp500Yearly).toBeCloseTo(0, 9); // the index and the dollar are both flat in this sample
  });

  it("counts a holding with no instrument at cost and names it", () => {
    const naked = investmentOverview({ trades, instruments: [inst({})], closes, today: "2026-01-01" });
    const b = naked.holdings.find((h) => h.symbol === "BBB")!;
    expect(b).toMatchObject({ price: null, valueInr: 8000, name: "BBB" });
    expect(naked.unpriced).toEqual(["BBB"]);
    expect(naked.dayChangeInr).toBeNull();
  });

  it("flags a price more than a week old but still uses it", () => {
    const old = new Map(closes);
    old.set("AAA.NS", days("2024-01-02", 700, () => 150)); // ends 2025-12-02
    const h = investmentOverview({ trades, instruments, closes: old, today: "2026-01-01" }).holdings.find((x) => x.symbol === "AAA")!;
    expect(h).toMatchObject({ stale: true, price: 150, priceDate: "2025-12-01" });
  });

  it("counts what sales made apart from the gain", () => {
    const sold = [...trades, trade({ id: "s", tradeType: "Sell", tradeDate: "2025-06-01", quantity: 40, total: 6000 })];
    const s = investmentOverview({ trades: sold, instruments, closes, today: "2026-01-01" });
    expect(s.realisedInr).toBe(2000);
    expect(s.holdings.find((h) => h.symbol === "AAA")!.quantity).toBe(60);
  });

  it("is empty and calm with no trades", () => {
    const e = investmentOverview({ trades: [], instruments, closes, today: "2026-01-01" });
    expect(e).toMatchObject({ holdings: [], valueInr: 0, costInr: 0, gainFraction: null, realisedInr: 0, pricesFrom: null });
    expect(e.xirr).toEqual({ rate: null, tooEarly: false, days: 0 });
  });
});
