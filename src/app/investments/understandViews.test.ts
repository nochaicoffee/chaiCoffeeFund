import { describe, expect, it } from "vitest";
import { investmentOverview } from "@/lib/aggregate/investmentOverview";
import type { PricePoint } from "@/lib/prices/history";
import type { Instrument, InvestmentTransaction } from "@/lib/sheets/types";
import { gainView, niceAxis, niceStep, weightView } from "./understandViews";

const trade = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2024-01-02", symbol: "AAA", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 100, price: 100, total: 10000, assetType: "Equity", broker: "B", ...o,
});
const inst = (o: Partial<Instrument>): Instrument => ({ id: "i", symbol: "AAA", market: "IND", name: "Alpha Ltd", assetType: "Equity", priceTicker: "AAA.NS", ...o });
const days = (n: number, f: (i: number) => number): PricePoint[] => Array.from({ length: n }, (_, i) => ({ date: new Date(Date.parse("2024-01-02T00:00:00Z") + i * 86_400_000).toISOString().slice(0, 10), close: f(i) }));
// AAA: 100 → 150 (+50%). BBB (US): bought at 10 dollars and 80 a dollar, now 12 at 90 (+35%: price +20%, rupee +12.5% on the rest). LOS: 100 → 50 (−50%).
const closes = new Map<string, PricePoint[]>([["AAA.NS", days(731, () => 150)], ["BBB", days(731, () => 12)], ["LOS.NS", days(731, () => 50)], ["USDINR", days(731, () => 90)]]);
const trades = [
  trade({}),
  trade({ id: "u", symbol: "BBB", market: "US", currency: "USD", quantity: 10, price: 10, total: 100, fxRateToInr: 80 }),
  trade({ id: "l", symbol: "LOS", quantity: 100, price: 100, total: 10000 }),
];
const instruments = [inst({}), inst({ id: "j", symbol: "BBB", market: "US", name: "Beta Inc", priceTicker: "BBB" }), inst({ id: "k", symbol: "LOS", name: "Loser Ltd", priceTicker: "LOS.NS" })];
const overview = investmentOverview({ trades, instruments, closes, today: "2026-01-01" });

describe("niceAxis", () => {
  it("picks a tidy step and pads half a step so a bubble at the edge isn't cut", () => {
    expect(niceStep(0.6)).toBe(0.2);
    const a = niceAxis(-0.5, 0.5);
    expect(a.min).toBeLessThan(-0.5);
    expect(a.max).toBeGreaterThan(0.5);
    expect(a.ticks).toContain(0);
    expect(a.ticks.every((t) => t >= a.min && t <= a.max)).toBe(true);
  });

  it("keeps the top tick however the steps add up", () => {
    const a = niceAxis(0, 0.3);
    expect(a.ticks).toHaveLength(4);
    expect(a.ticks[3]).toBeCloseTo(0.3, 12);
  });

  it("copes with everything at one value", () => {
    const a = niceAxis(0, 0);
    expect(a.max).toBeGreaterThan(a.min);
    expect(a.ticks.length).toBeGreaterThan(0);
  });
});

describe("weightView", () => {
  const view = weightView(overview)!;

  it("puts each holding where its return and its share say, inside the plot, biggest bubble first", () => {
    expect(view.bubbles).toHaveLength(3);
    for (const b of view.bubbles) for (const v of [b.x, b.y]) { expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(1); }
    expect(view.bubbles.map((b) => b.size)).toEqual([...view.bubbles.map((b) => b.size)].sort((a, b) => b - a));
    expect(view.bubbles[0].size).toBe(1);
    const aaa = view.bubbles.find((b) => b.symbol === "AAA")!;
    const los = view.bubbles.find((b) => b.symbol === "LOS")!;
    expect(aaa.x).toBeGreaterThan(los.x);
  });

  it("words what a bubble says, with its sign", () => {
    const los = view.bubbles.find((b) => b.symbol === "LOS")!;
    expect(los.ret).toBe("−50% on what it cost");
    expect(los.retTone).toBe("loss");
    expect(view.bubbles.find((b) => b.symbol === "AAA")!.ret).toBe("+50% on what it cost");
  });

  it("draws the line for a return of nothing between the losers and the gainers", () => {
    expect(view.zeroAt).not.toBeNull();
    const los = view.bubbles.find((b) => b.symbol === "LOS")!;
    const aaa = view.bubbles.find((b) => b.symbol === "AAA")!;
    expect(los.x).toBeLessThan(view.zeroAt!);
    expect(aaa.x).toBeGreaterThan(view.zeroAt!);
  });

  it("leaves out a holding with no price, which is counted at cost and has no return to show", () => {
    const noPrice = weightView(investmentOverview({ trades, instruments, closes: new Map([...closes].filter(([k]) => k !== "LOS.NS")), today: "2026-01-01" }))!;
    expect(noPrice.bubbles.map((b) => b.symbol)).not.toContain("LOS");
    expect(noPrice.leftOut).toEqual(["LOS"]);
  });

  it("has nothing with no holdings", () => {
    expect(weightView(investmentOverview({ trades: [], instruments, closes, today: "2026-01-01" }))).toBeNull();
  });
});

describe("gainView", () => {
  const view = gainView(overview)!;

  it("lists the biggest gain first and ends with the loser", () => {
    expect(view.rows.map((r) => r.symbol)).toEqual(["AAA", "BBB", "LOS"]);
  });

  it("splits a dollar holding's gain into the price and the rupee, and counts an Indian one all as price", () => {
    const bbb = view.rows.find((r) => r.symbol === "BBB")!;
    // 10 shares: the price part is (12 − 10) × 10 dollars at the ₹80 he paid, ₹1,600; the rupee part is 120 dollars × (90 − 80), ₹1,200; ₹2,800 in all.
    expect(bbb.priceText).toBe("+₹1,600");
    expect(bbb.rupeeText).toBe("+₹1,200");
    expect(bbb.gain).toBe("+₹2,800");
    const aaa = view.rows.find((r) => r.symbol === "AAA")!;
    expect(aaa.rupeeBar).toBe(0);
    expect(aaa.priceBar).toBe(1);
  });

  it("gives a holding that gained its share of the whole gain, and says a loser lost", () => {
    expect(view.rows.find((r) => r.symbol === "LOS")!.share).toBe("a loss");
    expect(view.rows.find((r) => r.symbol === "AAA")!.share).toMatch(/^\d+% of the gain$/);
  });

  it("doesn't call a winner's gain nothing when the whole is down", () => {
    const down = gainView(investmentOverview({ trades, instruments, closes: new Map([...closes, ["LOS.NS", days(731, () => 1)]]), today: "2026-01-01" }))!;
    expect(down.rows.find((r) => r.symbol === "AAA")!.share).toBe("gained, but the whole is down");
  });

  it("says what the rupee did to the whole, and is silent when it did nothing", () => {
    expect(view.rupeeNote).toMatch(/the rupee's/);
    const indian = gainView(investmentOverview({ trades: [trades[0]], instruments, closes, today: "2026-01-01" }))!;
    expect(indian.rupeeNote).toBeNull();
  });

  it("says why the shares run past the whole only when a loser makes them", () => {
    // AAA gained ₹5,000 and BBB ₹2,800 while LOS lost ₹5,000: the whole is ₹2,800, so the winners' shares add up to far more than it.
    expect(view.sharesNote).toMatch(/more than the whole/);
    const noLoser = gainView(investmentOverview({ trades: trades.slice(0, 2), instruments, closes, today: "2026-01-01" }))!;
    expect(noLoser.sharesNote).toBeNull();
  });

  it("has nothing with no holdings", () => {
    expect(gainView(investmentOverview({ trades: [], instruments, closes, today: "2026-01-01" }))).toBeNull();
  });
});
