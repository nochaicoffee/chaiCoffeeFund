import { describe, expect, it } from "vitest";
import { investmentOverview } from "@/lib/aggregate/investmentOverview";
import type { PricePoint } from "@/lib/prices/history";
import type { Instrument, InvestmentTarget, InvestmentTransaction } from "@/lib/sheets/types";
import { limitViews, targetsView } from "./targetViews";

const trade = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2024-01-02", symbol: "AAA", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 100, price: 100, total: 10000, assetType: "Equity", broker: "B", ...o,
});
const inst = (o: Partial<Instrument>): Instrument => ({ id: "i", symbol: "AAA", market: "IND", name: "Alpha Ltd", assetType: "Equity", priceTicker: "AAA.NS", ...o });
const days = (n: number, f: (i: number) => number): PricePoint[] => Array.from({ length: n }, (_, i) => ({ date: new Date(Date.parse("2024-01-02T00:00:00Z") + i * 86_400_000).toISOString().slice(0, 10), close: f(i) }));
// India equity ₹10,000 (100 × 100), US equity 10 × $10 at ₹80 = ₹8,000, gold ₹2,000: ₹20,000 in all.
const closes = new Map<string, PricePoint[]>([["AAA.NS", days(731, () => 100)], ["BBB", days(731, () => 10)], ["GLD.NS", days(731, () => 20)], ["USDINR", days(731, () => 80)]]);
const trades = [trade({}), trade({ id: "u", symbol: "BBB", market: "US", currency: "USD", quantity: 10, price: 10, total: 100, fxRateToInr: 80 }), trade({ id: "g", symbol: "GLD", assetType: "Gold", quantity: 100, price: 20, total: 2000 })];
const instruments = [inst({}), inst({ id: "j", symbol: "BBB", market: "US", name: "Beta Inc", priceTicker: "BBB" }), inst({ id: "k", symbol: "GLD", name: "Gold fund", assetType: "Gold", priceTicker: "GLD.NS" })];
const o = investmentOverview({ trades, instruments, closes, today: "2026-01-01" });
const row = (kind: "Target" | "Limit", name: InvestmentTarget["name"], percent: number): InvestmentTarget => ({ id: name, kind, name, percent });

describe("targetsView", () => {
  it("shows the four buckets with today's share and worth, and no target, drift or new money when none is set", () => {
    const v = targetsView(o, [])!;
    expect(v.anySet).toBe(false);
    expect(v.rows.map((r) => [r.label, r.shareText, r.target, r.drift])).toEqual([["India equity", "50%", null, null], ["US equity", "40%", null, null], ["Debt", "0.0%", null, null], ["Gold", "10%", null, null]]);
    expect(v.moves).toEqual([]);
    expect(v.newMoney).toEqual([]);
  });

  it("says how far each is from its target in rupees, and what it would take to land on them", () => {
    const v = targetsView(o, [row("Target", "India-Equity", 40), row("Target", "US-Equity", 40), row("Target", "Debt", 10), row("Target", "Gold", 10)])!;
    expect(v.rows.map((r) => r.drift)).toEqual(["₹2,000 above", "on target", "₹2,000 below", "on target"]);
    expect(v.moves).toEqual([{ bucket: "India-Equity", label: "India equity", text: "Sell ₹2,000", sell: true }, { bucket: "Debt", label: "Debt", text: "Buy ₹2,000", sell: false }]);
    expect(v.sumNote).toBeNull();
  });

  it("words a target as he typed it, with no float noise, and gives each amount a short chip label", () => {
    const v = targetsView(o, [row("Target", "India-Equity", 7), row("Target", "US-Equity", 14), row("Target", "Gold", 7.5)])!;
    expect(v.rows.map((r) => r.targetText)).toEqual(["7% target", "14% target", null, "7.5% target"]);
    expect(v.newMoney.map((n) => n.short)).toEqual(["₹50k", "₹1L", "₹2L", "₹5L"]);
  });

  it("sends new money first to what is below target, then by weight, and shows the shares after, adding up to the whole", () => {
    const v = targetsView(o, [row("Target", "India-Equity", 40), row("Target", "US-Equity", 40), row("Target", "Debt", 10), row("Target", "Gold", 10)])!;
    expect(v.newMoney.map((n) => n.label)).toEqual(["₹50,000", "₹1,00,000", "₹2,00,000", "₹5,00,000"]);
    const first = v.newMoney[0];
    // Debt is ₹2,000 short, so it takes that first; the other ₹48,000 goes by weight (40, 40, 10, 10).
    expect(first.rows.map((r) => r.add)).toEqual(["+₹19,200", "+₹19,200", "+₹6,800", "+₹4,800"]);
    expect(first.rows.reduce((s, r) => s + r.after, 0)).toBeCloseTo(1, 9);
  });

  it("says when the targets don't add up to everything", () => {
    expect(targetsView(o, [row("Target", "Gold", 10)])!.sumNote).toMatch(/add up to 10%/);
  });

  it("is null with nothing held", () => {
    expect(targetsView(investmentOverview({ trades: [], instruments, closes, today: "2026-01-01" }), [])).toBeNull();
  });
});

describe("limitViews", () => {
  it("is empty when none is set", () => {
    expect(limitViews(o, [])).toEqual([]);
  });

  it("words each limit he has set, with a chip for within and for how far past", () => {
    const v = limitViews(o, [row("Limit", "One-Holding", 30), row("Limit", "Dollars", 70), row("Limit", "Debt-Floor", 5)]);
    expect(v.map((l) => l.label)).toEqual(["One holding at most 30%", "Dollars at most 70%", "Debt at least 5%"]);
    expect(v.map((l) => l.chip)).toEqual(["Over by 20.0 pts", "Within", "Under by 5.0 pts"]);
    expect(v.map((l) => l.breached)).toEqual([true, false, true]);
    expect(v[0]).toMatchObject({ now: 0.5, limit: 0.3 });
  });
});
