import { describe, expect, it } from "vitest";
import { investmentOverview } from "@/lib/aggregate/investmentOverview";
import type { PricePoint } from "@/lib/prices/history";
import type { Instrument, InvestmentTransaction } from "@/lib/sheets/types";
import { growthView, tidyStep, whatIfView } from "./scenarioViews";

const trade = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2024-01-02", symbol: "AAA", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 100, price: 100, total: 10000, assetType: "Equity", broker: "B", ...o,
});
const inst = (o: Partial<Instrument>): Instrument => ({ id: "i", symbol: "AAA", market: "IND", name: "Alpha Ltd", assetType: "Equity", priceTicker: "AAA.NS", ...o });
const days = (n: number, f: (i: number) => number): PricePoint[] => Array.from({ length: n }, (_, i) => ({ date: new Date(Date.parse("2024-01-02T00:00:00Z") + i * 86_400_000).toISOString().slice(0, 10), close: f(i) }));
const closes = new Map<string, PricePoint[]>([["AAA.NS", days(731, () => 150)], ["BBB", days(731, () => 12)], ["USDINR", days(731, () => 90)]]);
const trades = [trade({}), trade({ id: "u", symbol: "BBB", market: "US", currency: "USD", quantity: 10, price: 10, total: 100, fxRateToInr: 80, source: "RSU" })];
const instruments = [inst({}), inst({ id: "j", symbol: "BBB", market: "US", name: "Beta Inc", priceTicker: "BBB" })];
const overview = investmentOverview({ trades, instruments, closes, today: "2026-01-01" });

describe("whatIfView", () => {
  const view = whatIfView(overview)!;

  it("offers only the shocks that touch something he holds", () => {
    // He holds one Indian equity and one US share from a plan: no gold, so no gold shock.
    expect(view.scenarios.map((s) => s.key)).toEqual(["usdn", "usup", "us20", "in20", "emp30", "eq15"]);
  });

  it("names the employer's shock after the company when his plans are in one", () => {
    expect(view.scenarios.find((s) => s.key === "emp30")!.label).toBe("Beta Inc −30%");
  });

  it("words a shock: the new worth, the change with its sign and percent, how much of the gain it takes and what is still left", () => {
    const us20 = view.scenarios.find((s) => s.key === "us20")!;
    // Worth now: 15,000 (India) + 10 × 12 × 90 = 10,800 (US) = 25,800; US −20% takes 2,160.
    expect(us20.total).toBe("₹23,640");
    expect(us20.change).toBe("−₹2,160 · −8.4% from today");
    expect(us20.changeTone).toBe("loss");
    expect(us20.ofGain).toMatch(/^takes \d+% of today's gain$/);
    expect(view.scenarios.find((s) => s.key === "usup")!.ofGain).toMatch(/^adds \d+% to today's gain$/);
    expect(us20.still).toMatch(/^you'd be (up|down) ₹/);
  });

  it("lists the biggest fall first, with an untouched holding as no change and the bars measured against the biggest move", () => {
    const us20 = view.scenarios.find((s) => s.key === "us20")!;
    expect(us20.rows.map((r) => r.symbol)).toEqual(["BBB", "AAA"]);
    expect(us20.rows[0].bar).toBe(-1);
    expect(us20.rows[1]).toMatchObject({ change: "no change", bar: 0, changeTone: "plain" });
  });

  it("gives today's worth and each holding's share", () => {
    expect(view.today.total).toBe("₹25,800");
    expect(view.today.rows).toHaveLength(2);
  });

  it("has nothing when no shock touches what he holds", () => {
    const other = investmentOverview({ trades: [trade({ symbol: "ZZZ", assetType: "Other" })], instruments: [inst({ id: "z", symbol: "ZZZ", assetType: "Other", priceTicker: "ZZZ.NS" })], closes: new Map([["ZZZ.NS", days(731, () => 100)], ["USDINR", days(731, () => 90)]]), today: "2026-01-01" });
    expect(whatIfView(other)).toBeNull();
  });

  it("has nothing with nothing held", () => {
    expect(whatIfView(investmentOverview({ trades: [], instruments, closes, today: "2026-01-01" }))).toBeNull();
  });
});

describe("growthView", () => {
  const view = growthView(overview)!;

  it("has the three returns, each with the three lines, and starts from today's worth", () => {
    expect(view.rates.map((r) => r.label)).toEqual(["6% a year", "9% a year", "12% a year"]);
    for (const r of view.rates) expect(r.lines.map((l) => l.key)).toEqual(["0", "25", "50"]);
    expect(view.start).toBe("₹25,800");
  });

  it("draws every line from the same start to the end, inside the axis, and ends higher with more added", () => {
    for (const r of view.rates) {
      for (const l of r.lines) {
        expect(l.points[0]).toEqual({ x: 0, y: expect.any(Number) });
        expect(l.points.at(-1)!.x).toBe(1);
        expect(l.points.every((p) => p.y >= 0 && p.y <= 1)).toBe(true);
      }
      expect(r.lines[2].endY).toBeGreaterThan(r.lines[1].endY);
      expect(r.lines[1].endY).toBeGreaterThan(r.lines[0].endY);
    }
  });

  it("draws the biggest monthly amount thicker", () => {
    expect(view.rates[0].lines.map((l) => l.bold)).toEqual([false, false, true]);
  });

  it("says what he'd add over the ten years, and nothing for the line that adds nothing", () => {
    const [none, small, big] = view.rates[0].lines;
    expect(none.added).toBeNull();
    expect(small.added).toBe("of which you add ₹30.00L");
    expect(big.added).toBe("of which you add ₹60.00L");
  });

  it("labels the years from this year, and the axis ticks run from nothing to the top", () => {
    expect(view.years.map((y) => y.label)).toEqual(["Today", "2028", "2030", "2032", "2034", "2036"]);
    const ticks = view.rates[0].yTicks;
    expect(ticks[0]).toEqual({ at: 0, label: "0" });
    expect(ticks.at(-1)!.at).toBe(1);
  });

  it("has nothing with nothing held", () => {
    expect(growthView(investmentOverview({ trades: [], instruments, closes, today: "2026-01-01" }))).toBeNull();
  });
});

describe("tidyStep", () => {
  it("rounds up to 1, 2, 2.5, 5 or 10 times a power of ten", () => {
    expect(tidyStep(0.7)).toBe(1);
    expect(tidyStep(1.1)).toBe(2);
    expect(tidyStep(2.2)).toBe(2.5);
    expect(tidyStep(3)).toBe(5);
    expect(tidyStep(7)).toBe(10);
    expect(tidyStep(120_000)).toBe(200_000);
  });
});
