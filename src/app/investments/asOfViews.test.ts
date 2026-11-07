import { describe, expect, it } from "vitest";
import { investmentOverview } from "@/lib/aggregate/investmentOverview";
import type { PricePoint } from "@/lib/prices/history";
import type { Instrument, InvestmentTransaction } from "@/lib/sheets/types";
import { asOfViews } from "./asOfViews";
import { holdingsView, returnsView } from "./views";

const trade = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2023-12-01", symbol: "AAA", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 100, price: 100, total: 10000, assetType: "Equity", broker: "B", ...o,
});
const inst = (o: Partial<Instrument>): Instrument => ({ id: "i", symbol: "AAA", market: "IND", name: "Alpha Ltd", assetType: "Equity", priceTicker: "AAA.NS", ...o });
const days = (n: number, f: (i: number) => number): PricePoint[] => Array.from({ length: n }, (_, i) => ({ date: new Date(Date.parse("2023-12-01T00:00:00Z") + i * 86_400_000).toISOString().slice(0, 10), close: f(i) }));
// AAA climbs ₹1 a day from 100. BBB is bought mid-2024 and sold in October 2025; CCC is bought late.
const closes = new Map<string, PricePoint[]>([["AAA.NS", days(900, (i) => 100 + i)], ["BBB.NS", days(900, () => 50)], ["CCC.NS", days(900, () => 10)]]);
const trades = [
  trade({}),
  trade({ id: "b1", symbol: "BBB", tradeDate: "2024-06-01", price: 50, total: 5000 }),
  trade({ id: "b2", symbol: "BBB", tradeDate: "2025-10-01", tradeType: "Sell", price: 50, total: 5000 }),
  trade({ id: "c1", symbol: "CCC", tradeDate: "2025-11-01", price: 10, total: 1000 }),
];
const instruments = [inst({}), inst({ id: "b", symbol: "BBB", name: "Beta", priceTicker: "BBB.NS" }), inst({ id: "c", symbol: "CCC", name: "Gamma", priceTicker: "CCC.NS" })];
const today = "2026-05-08";
const input = { trades, instruments, closes, today };
const now = investmentOverview(input);
const views = asOfViews(input, now);

describe("asOfViews", () => {
  it("offers the same days the stage offers, each worked out for its own date, today left out", () => {
    expect(Object.keys(views)).toEqual(["1m", "6m", "1y", "2y"]);
    for (const v of Object.values(views)) expect(v.date < today).toBe(true);
    expect(views["1m"].date > views["6m"].date).toBe(true);
  });

  it("leaves out a holding he hadn't bought yet, and keeps one he has since sold", () => {
    expect(views["1y"].holdings.map((r) => r.key)).toEqual(["IND:AAA", "IND:BBB"]);
    expect(views["1m"].holdings.map((r) => r.key)).toEqual(["IND:AAA", "IND:CCC"]);
    expect(views["2y"].holdings.map((r) => r.key)).toEqual(["IND:AAA"]);
  });

  it("says how each price has moved since, and that a sold holding was sold", () => {
    const aaa = views["1y"].holdings.find((r) => r.key === "IND:AAA")!;
    const bbb = views["1y"].holdings.find((r) => r.key === "IND:BBB")!;
    expect(aaa.day).toMatch(/^▲ \d/);
    expect(aaa.dayTone).toBe("gain");
    expect(aaa.dayInr).toBeUndefined();
    expect(bbb.day).toBe("Sold since");
  });

  it("measures the move since against that day's price and today's: a price that hasn't moved is flat", () => {
    const flat = holdingsView(investmentOverview({ ...input, today: "2025-12-01" }), now).find((r) => r.key === "IND:CCC")!;
    expect(flat.dayTone).toBe("plain");
  });

  it("keeps a holding's colour the one it has today, and gives one sold since a colour no held holding uses", () => {
    const todays = holdingsView(now);
    const rows = views["1y"].holdings;
    expect(rows.find((r) => r.key === "IND:AAA")!.colorKey).toBe(todays.find((t) => t.key === "IND:AAA")!.colorKey);
    const sold = rows.find((r) => r.key === "IND:BBB")!;
    expect(todays.map((t) => t.colorKey)).not.toContain(sold.colorKey);
  });

  it("gives returns for that day, not today's", () => {
    expect(views["1y"].returns.length).toBeGreaterThan(0);
    expect(views["1y"].returns.map((c) => c.value)).not.toEqual(returnsView(now).map((c) => c.value));
  });
});
