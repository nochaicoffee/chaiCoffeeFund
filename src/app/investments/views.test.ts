import { describe, expect, it } from "vitest";
import { investmentOverview } from "@/lib/aggregate/investmentOverview";
import type { PricePoint } from "@/lib/prices/history";
import type { Instrument, InvestmentTransaction } from "@/lib/sheets/types";
import { greetingView, holdingsView, pct, recentTradesView, returnsView, summarySentence } from "./views";

const trade = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2024-01-02", symbol: "AAA", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 100, price: 100, total: 10000, assetType: "Equity", broker: "B", ...o,
});
const inst = (o: Partial<Instrument>): Instrument => ({ id: "i", symbol: "AAA", market: "IND", name: "Alpha Ltd", assetType: "Equity", priceTicker: "AAA.NS", ...o });
const days = (from: string, n: number, f: (i: number) => number): PricePoint[] =>
  Array.from({ length: n }, (_, i) => ({ date: new Date(Date.parse(`${from}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10), close: f(i) }));
const closes = new Map<string, PricePoint[]>([
  ["AAA.NS", days("2024-01-02", 731, (i) => 100 + i * 0.1)],
  ["BBB", days("2024-01-02", 731, () => 10)],
  ["USDINR", days("2024-01-02", 731, () => 90)],
  ["^NSEI", days("2024-01-02", 731, (i) => 100 + i * 0.01)],
  ["^GSPC", days("2024-01-02", 731, () => 100)],
]);
const trades = [trade({}), trade({ id: "u", symbol: "BBB", market: "US", currency: "USD", quantity: 10, price: 10, total: 100, fxRateToInr: 80 }), trade({ id: "s", tradeType: "Sell", tradeDate: "2025-06-01", quantity: 10, total: 1500 })];
const instruments = [inst({}), inst({ id: "j", symbol: "BBB", market: "US", name: "Beta Inc", priceTicker: "BBB" })];
const o = investmentOverview({ trades, instruments, closes, today: "2026-01-01" });
const text = (parts: { text: string }[]) => parts.map((p) => p.text).join("");

describe("summarySentence and greetingView", () => {
  const parts = summarySentence(o);
  const cards = greetingView(o);

  it("reads as one sentence with the worth, the gain, the biggest holding and the yearly return in bold", () => {
    expect(text(parts)).toMatch(/^Your 2 holdings are worth ₹[\d,.]+(L|Cr)?, up ₹[\d,.]+(L|Cr)? \(\d+\.\d%\) on what they cost\. Alpha Ltd is \d+\.\d% of it\. Over 2\.0 years your money has earned \d+\.\d% a year/);
    expect(parts.filter((p) => p.strong).length).toBeGreaterThanOrEqual(5);
  });

  it("gives every figure that points a card, and no card is left without a figure (the sentence and the cards agree)", () => {
    const pointed = new Set(parts.filter((p) => p.point).map((p) => p.point));
    for (const point of pointed) expect(cards[point as keyof typeof cards], `a card for ${point}`).toBeDefined();
    for (const key of Object.keys(cards)) expect(pointed.has(key), `a figure for ${key}`).toBe(true);
  });

  it("makes the worth card a list that adds up to the whole", () => {
    const worth = cards.worth!;
    expect(worth.rows.map((r) => r.name)).toEqual(["Alpha Ltd", "Beta Inc"]);
    expect(worth.rows.reduce((s, r) => s + (r.fraction ?? 0), 0)).toBeCloseTo(1, 9);
  });

  it("says nothing it can't back with a card: with no trades there is one plain sentence and no cards", () => {
    const empty = investmentOverview({ trades: [], instruments, closes, today: "2026-01-01" });
    expect(summarySentence(empty)).toEqual([expect.objectContaining({ text: expect.stringMatching(/^Nothing here yet/) })]);
    expect(greetingView(empty)).toEqual({});
  });

  it("says too early, with no yearly figure, under a year of history", () => {
    const young = investmentOverview({ trades: [trade({ tradeDate: "2025-10-01" })], instruments, closes, today: "2026-01-01" });
    expect(text(summarySentence(young))).toMatch(/too early for a yearly return/);
    expect(greetingView(young).yearly).toBeUndefined();
  });

  it("says when prices are older than today", () => {
    const old = investmentOverview({ trades, instruments, closes, today: "2026-01-05" });
    expect(text(summarySentence(old))).toMatch(/Prices are from Jan 1\./);
  });

  it("names a holding counted at cost for want of a price", () => {
    const naked = investmentOverview({ trades, instruments: [inst({})], closes, today: "2026-01-01" });
    expect(text(summarySentence(naked))).toMatch(/1 holding has no price and is counted at cost/);
  });
});

describe("returnsView", () => {
  it("gives six cards, with the sign of each gap and a loss in the loss tone", () => {
    const cards = returnsView(o);
    expect(cards.map((c) => c.key)).toEqual(["xirr", "twr", "fall", "nifty", "sp", "realised"]);
    expect(cards.find((c) => c.key === "xirr")!.value).toMatch(/^\+\d+\.\d%$/);
    expect(cards.find((c) => c.key === "realised")!.value).toMatch(/^\+₹/);
  });

  it("says Too early instead of a number under a year", () => {
    const young = investmentOverview({ trades: [trade({ tradeDate: "2025-10-01" })], instruments, closes, today: "2026-01-01" });
    expect(returnsView(young).find((c) => c.key === "xirr")).toMatchObject({ value: "Too early", tone: "plain" });
  });

  it("is empty with nothing held", () => {
    expect(returnsView(investmentOverview({ trades: [], instruments, closes, today: "2026-01-01" }))).toEqual([]);
  });
});

describe("holdingsView", () => {
  const rows = holdingsView(o);

  it("shows each holding in its own currency, biggest first, with its share and gain", () => {
    expect(rows.map((r) => r.name)).toEqual(["Alpha Ltd", "Beta Inc"]);
    expect(rows[1]).toMatchObject({ sub: "BBB · US", price: "$10.00", quantity: "10" });
    expect(rows[0].worth).toMatch(/^₹/);
    expect(rows[0].gainTone).toBe("gain");
  });

  it("says 'No price' and 'counted at cost' for a holding with none", () => {
    const naked = holdingsView(investmentOverview({ trades, instruments: [inst({})], closes, today: "2026-01-01" }));
    expect(naked.find((r) => r.name === "BBB")).toMatchObject({ price: "No price", priceNote: "counted at cost" });
  });
});

describe("recentTradesView", () => {
  it("lists the newest first with a plain name for what each was", () => {
    const rows = recentTradesView([...trades, trade({ id: "v", symbol: "BBB", market: "US", currency: "USD", source: "RSU", tradeDate: "2025-12-01", quantity: 2, price: 11, total: 22, fxRateToInr: 85 })], instruments);
    expect(rows[0]).toMatchObject({ kind: "RSU vest", name: "Beta Inc", detail: "2 × $11.00", total: "$22.00" });
    expect(rows.find((r) => r.id === "s")!.kind).toBe("Sold");
  });

  it("keeps a day's sell above its buy and limits the list", () => {
    const rows = recentTradesView([trade({ id: "b", tradeDate: "2025-01-01" }), trade({ id: "s", tradeDate: "2025-01-01", tradeType: "Sell" })], instruments, 1);
    expect(rows.map((r) => r.id)).toEqual(["s"]);
  });
});

describe("pct", () => {
  it("formats a fraction with a typographic minus and an optional plus", () => {
    expect(pct(0.1234)).toBe("12.3%");
    expect(pct(-0.05)).toBe("−5.0%");
    expect(pct(0.05, 0, true)).toBe("+5%");
  });
});
