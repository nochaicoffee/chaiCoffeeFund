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

  it("gives the stage a worth and cost for every day from the first trade to today", () => {
    expect(o.series[0]).toEqual({ date: "2024-01-02", value: 24000, cost: 18000, flow: 18000 }); // AAA 100 x 150, BBB 10 x $10 x 90
    expect(o.series.at(-1)).toMatchObject({ date: "2026-01-01", cost: 18000 });
    expect(o.series).toHaveLength(731);
    expect(o.series.slice(1).every((d) => d.flow === 0)).toBe(true); // both buys were on the first day
    expect(o.usdInr).toBe(90);
    expect(o.series.at(-1)!.value).toBe(Math.round(o.valueInr));
  });

  it("gives the Race a line for him, Nifty, the S&P and a deposit on the same days as the stage", () => {
    expect(o.race.map((l) => l.key)).toEqual(["you", "nifty", "sp500", "deposit"]);
    for (const l of o.race) expect(l.values).toHaveLength(o.series.length);
    expect(o.race[0].values[0]).toBe(1);
  });

  it("gives a lens for each holding, in the same order, each pricing itself from its own line", () => {
    expect(o.lenses.map((l) => l.symbol)).toEqual(o.holdings.map((h) => h.symbol));
    expect(o.lenses[0]).toMatchObject({ symbol: "AAA", quantity: 100, price: 150, currency: "INR" });
    expect(o.lenses[1]).toMatchObject({ symbol: "BBB", currency: "USD" });
  });

  it("has no series with no trades", () => {
    expect(investmentOverview({ trades: [], instruments, closes, today: "2026-01-01" }).series).toEqual([]);
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

describe("investmentOverview: the totals behind the Returns row", () => {
  const trades = [
    trade({}), // 100 AAA at 100 = 10,000
    trade({ id: "u", symbol: "BBB", market: "US", currency: "USD", quantity: 10, price: 10, total: 100, fxRateToInr: 80 }), // 8,000
    trade({ id: "s1", tradeType: "Sell", tradeDate: "2024-06-01", quantity: 10, total: 1500 }), // cost 1,000: made 500
    trade({ id: "v", symbol: "BBB", market: "US", currency: "USD", source: "RSU", tradeDate: "2024-07-01", quantity: 4, price: 20, total: 80, fxRateToInr: 85 }), // 6,800 bought
    trade({ id: "v2", symbol: "BBB", market: "US", currency: "USD", source: "RSU", tradeType: "Sell", tradeDate: "2024-07-01", quantity: 1, price: 20, total: 20, fxRateToInr: 85 }), // sold to cover
  ];
  const instruments = [inst({}), inst({ id: "j", symbol: "BBB", market: "US", name: "Beta Inc", priceTicker: "BBB" })];
  const o = investmentOverview({ trades, instruments, closes, today: "2026-01-01" });

  it("adds up every buy, a vest at its fair value, and no sale", () => {
    expect(o.moneyBoughtInr).toBe(10_000 + 8_000 + 6_800);
  });

  it("counts the sales, what the cover sale made, and each holding's part, biggest first", () => {
    expect(o.realised.sales).toBe(2);
    expect(o.realised.bySymbol.map((s) => s.symbol)).toEqual(expect.arrayContaining(["AAA", "BBB"]));
    expect(o.realised.bySymbol.map((s) => s.name)).toContain("Alpha Ltd");
    expect(o.realised.bySymbol.reduce((sum, s) => sum + s.gainInr, 0)).toBeCloseTo(o.realisedInr, 6);
    const [first, second] = o.realised.bySymbol;
    expect(Math.abs(first.gainInr)).toBeGreaterThanOrEqual(Math.abs(second.gainInr));
    expect(o.realised.coverInr).toBeCloseTo(o.realised.bySymbol.find((s) => s.symbol === "BBB")!.gainInr, 6); // BBB's only sale is the cover sale
  });

  it("says what the rupee did to the US holdings, and nothing for India", () => {
    const bbb = o.lenses.find((l) => l.symbol === "BBB")!;
    expect(o.rupeeGainInr).toBeCloseTo(bbb.split!.rupeePartInr, 6);
    expect(o.rupeeGainInr).not.toBe(0);
  });
});
