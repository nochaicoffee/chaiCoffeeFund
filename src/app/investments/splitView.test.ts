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

  it("gives each holding what the treemap needs: its rupees, its colour on the rest of the page, and its gain", () => {
    const equity = view.dimensions[0].slices.find((s) => s.label === "Equity")!;
    const aaa = equity.members.find((m) => m.symbol === "AAA")!;
    expect(aaa.valueInr).toBeGreaterThan(0);
    expect(aaa.costInr).toBeGreaterThan(0);
    expect(aaa.gain).toMatch(/^[+−]?\d+%$/);
    // The same colour in every cut, as on the holdings table.
    const everywhere = view.dimensions.flatMap((d) => d.slices.flatMap((s) => s.members.filter((m) => m.symbol === "AAA").map((m) => m.colorKey)));
    expect(new Set(everywhere).size).toBe(1);
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

describe("splitView, how it came in", () => {
  const us = (o: Partial<InvestmentTransaction>) => trade({ symbol: "BBB", market: "US", currency: "USD", price: 10, total: 100, fxRateToInr: 80, ...o });
  // BBB: 60 shares by RSU vest, 30 by ESPP, 10 by cash, bought through 2024; AAA (India) all cash.
  const mixed = [
    trade({}),
    us({ id: "r", source: "RSU", quantity: 60, total: 600 }),
    us({ id: "e", source: "ESPP", quantity: 30, total: 300 }),
    us({ id: "m", source: "Market", quantity: 10, total: 100 }),
  ];
  const mixedView = (extra: InvestmentTransaction[] = []) => splitView(investmentOverview({ trades: [...mixed, ...extra], instruments, closes, today: "2026-01-01" }), [...mixed, ...extra])!;
  const source = (v: ReturnType<typeof mixedView>) => v.dimensions.find((d) => d.key === "source")!;

  it("cuts what he holds by cash, ESPP purchases and RSU vests, adding up to the whole, in the colours Money in uses", () => {
    const d = source(mixedView());
    expect(d.label).toBe("How it came in");
    expect(d.slices.map((s) => s.label).sort()).toEqual(["Cash", "ESPP purchases", "RSU vests"]);
    expect(d.slices.reduce((sum, s) => sum + s.fraction, 0)).toBeCloseTo(1, 12);
    expect(Object.fromEntries(d.slices.map((s) => [s.label, s.colour]))).toEqual({ Cash: "teal", "ESPP purchases": "violet", "RSU vests": "sapphire" });
  });

  it("splits one holding across the sources in proportion to the shares left from each, and puts a cash-only holding wholly in cash", () => {
    const d = source(mixedView());
    const rsu = d.slices.find((s) => s.label === "RSU vests")!;
    const esppSlice = d.slices.find((s) => s.label === "ESPP purchases")!;
    expect(rsu.members.map((m) => m.symbol)).toEqual(["BBB"]);
    // 60 shares by RSU and 30 by ESPP: twice as much in RSU.
    const bbb = (label: string) => d.slices.find((s) => s.label === label)!.members.find((m) => m.symbol === "BBB")!.valueInr;
    expect(bbb("RSU vests") / bbb("ESPP purchases")).toBeCloseTo(2, 9);
    expect(esppSlice.members.map((m) => m.symbol)).toEqual(["BBB"]);
    expect(d.slices.find((s) => s.label === "Cash")!.members.map((m) => m.symbol).sort()).toEqual(["AAA", "BBB"]);
  });

  it("takes a marked sale from the source it names, and shows no gain for a source", () => {
    const marked = source(mixedView([us({ id: "s", tradeType: "Sell", tradeDate: "2025-06-01", quantity: 10, soldFrom: "ESPP", price: 12, total: 120 })]));
    const bbb = (label: string) => marked.slices.find((s) => s.label === label)?.members.find((m) => m.symbol === "BBB")?.valueInr ?? 0;
    // 10 of the ESPP shares went: 60 RSU, 20 ESPP, 10 cash.
    expect(bbb("RSU vests") / bbb("ESPP purchases")).toBeCloseTo(3, 9);
    expect(marked.slices.every((s) => s.gain === "")).toBe(true);
    expect(marked.note).toBeUndefined();
  });

  it("says which sales it had to count in proportion, and why", () => {
    const note = source(mixedView([us({ id: "s", tradeType: "Sell", tradeDate: "2025-06-01", quantity: 10, price: 12, total: 120 })])).note;
    expect(note).toMatch(/1 sale of Beta Inc isn't marked with which shares it took, so it is counted in proportion/);
  });

  it("says it in the plural for several sales, and names a holding the log couldn't trace", () => {
    const two = [us({ id: "s1", tradeType: "Sell", tradeDate: "2025-06-01", quantity: 5, price: 12, total: 60 }), us({ id: "s2", tradeType: "Sell", tradeDate: "2025-07-01", quantity: 5, price: 12, total: 60 })];
    expect(source(mixedView(two)).note).toMatch(/2 sales of Beta Inc aren't marked with which shares they took, so they are counted in proportion/);
    // A holding sold down to nothing in the log but still held (a buy missing) can't be traced.
    const bare = investmentOverview({ trades: mixed, instruments, closes, today: "2026-01-01" });
    const view = splitView(bare, [...mixed.filter((x) => x.symbol !== "BBB"), trade({ id: "ae", source: "ESPP", quantity: 5 })])!;
    expect(view.dimensions.find((d) => d.key === "source")?.note ?? "").toMatch(/Beta Inc couldn't be traced through your trades, so it is counted as cash/);
  });

  it("is left out when everything came in one way, since that is no cut", () => {
    const only = splitView(overview)!;
    expect(only.dimensions.map((d) => d.key)).not.toContain("source");
  });
});
