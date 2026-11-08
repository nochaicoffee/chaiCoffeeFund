import { describe, expect, it } from "vitest";
import { computeHoldings, findOversells, holdingsAt, realisedGains, totalCostBasisInr, totalRealisedGainInr, tradeSteps, valueHolding } from "./investments";
import type { InvestmentTransaction } from "../sheets/types";

const tx = (overrides: Partial<InvestmentTransaction> = {}): InvestmentTransaction => ({
  id: "tx-1",
  tradeDate: "2026-01-01",
  symbol: "NTAP",
  market: "IND",
  currency: "INR",
  tradeType: "Buy",
  source: "Market",
  quantity: 10,
  price: 100,
  total: 1000,
  assetType: "Equity",
  broker: "Test Broker",
  ...overrides,
});

describe("computeHoldings", () => {
  it("accumulates quantity and cost across multiple buys", () => {
    const [holding] = computeHoldings([
      tx({ id: "t1", quantity: 10, total: 1000 }),
      tx({ id: "t2", quantity: 20, total: 2400 }),
    ]);
    expect(holding.quantity).toBe(30);
    expect(holding.totalCostInr).toBe(3400);
    expect(holding.avgCostInr).toBeCloseTo(113.33, 2);
  });

  it("removes cost proportionally on a sell, leaving avg cost unchanged (weighted-average method)", () => {
    const [holding] = computeHoldings([
      tx({ id: "t1", tradeType: "Buy", quantity: 100, total: 10000, tradeDate: "2026-01-01" }),
      tx({ id: "t2", tradeType: "Sell", quantity: 40, total: 5000, tradeDate: "2026-02-01" }),
    ]);
    expect(holding.quantity).toBe(60);
    // 40% of the position sold -> 40% of cost basis removed, regardless of sale price.
    expect(holding.totalCostInr).toBeCloseTo(6000, 5);
    expect(holding.avgCostInr).toBeCloseTo(100, 5);
  });

  it("drops a position entirely once fully sold", () => {
    const holdings = computeHoldings([
      tx({ id: "t1", tradeType: "Buy", quantity: 10, total: 1000, tradeDate: "2026-01-01" }),
      tx({ id: "t2", tradeType: "Sell", quantity: 10, total: 1500, tradeDate: "2026-02-01" }),
    ]);
    expect(holdings).toHaveLength(0);
  });

  it("keeps IND and US holdings of a differently-scoped symbol separate", () => {
    const holdings = computeHoldings([
      tx({ id: "t1", market: "IND", symbol: "AAA", quantity: 10, total: 1000 }),
      tx({ id: "t2", market: "US", symbol: "AAA", quantity: 5, total: 500, currency: "USD", fxRateToInr: 83 }),
    ]);
    expect(holdings).toHaveLength(2);
  });

  it("converts a US buy's cost to INR using that transaction's own frozen fxRateToInr", () => {
    const [holding] = computeHoldings([
      tx({ market: "US", currency: "USD", quantity: 10, total: 1205, fxRateToInr: 83.2 }),
    ]);
    expect(holding.totalCostInr).toBeCloseTo(1205 * 83.2, 2);
  });
});

describe("computeHoldings on same-day trades", () => {
  // A vest and its sell-to-cover land on one date, so which was typed first must not matter.
  const vest = tx({ id: "vest", market: "US", currency: "USD", source: "RSU", tradeType: "Buy", quantity: 50, total: 5000, fxRateToInr: 80, tradeDate: "2026-03-01" });
  const sellToCover = tx({ id: "cover", market: "US", currency: "USD", tradeType: "Sell", quantity: 20, total: 2000, fxRateToInr: 80, tradeDate: "2026-03-01" });

  it("counts the buy first when a new position's vest and sell-to-cover are on the same day", () => {
    const [holding] = computeHoldings([vest, sellToCover]);
    expect(holding.quantity).toBe(30);
    expect(holding.totalCostInr).toBeCloseTo(240_000, 5);
    expect(holding.avgCostInr).toBeCloseTo(8000, 5);
  });

  it("gives the same holding whichever order the two rows were entered in", () => {
    expect(computeHoldings([sellToCover, vest])).toEqual(computeHoldings([vest, sellToCover]));
  });

  it("gives the same holding on top of an earlier position bought at a different price", () => {
    const earlier = tx({ id: "old", market: "US", currency: "USD", quantity: 100, total: 5000, fxRateToInr: 60, tradeDate: "2026-01-01" });
    const [forward] = computeHoldings([earlier, vest, sellToCover]);
    const [backward] = computeHoldings([sellToCover, vest, earlier]);
    expect(backward).toEqual(forward);
    // 100 @ ₹3,000 + 50 @ ₹8,000 = ₹7,00,000 over 150 shares; selling 20 takes 20/150 of it.
    expect(forward.quantity).toBe(130);
    expect(forward.totalCostInr).toBeCloseTo(700_000 * (130 / 150), 5);
  });
});

describe("computeHoldings on fractional units", () => {
  it("drops a fund sold down to float dust instead of keeping a ghost holding", () => {
    const holdings = computeHoldings([
      // 0.1 + 0.2 − 0.3 is 5.6e-17 in floating point, not 0.
      tx({ id: "t1", quantity: 0.1, total: 10, tradeDate: "2026-01-01" }),
      tx({ id: "t2", quantity: 0.2, total: 20, tradeDate: "2026-02-01" }),
      tx({ id: "t3", tradeType: "Sell", quantity: 0.3, total: 36, tradeDate: "2026-03-01" }),
    ]);
    expect(holdings).toHaveLength(0);
  });
});

describe("computeHoldings on a sell of more than was held", () => {
  const bought = tx({ id: "b1", quantity: 100, total: 10_000, tradeDate: "2026-01-01" });
  const oversell = tx({ id: "s1", tradeType: "Sell", quantity: 150, total: 18_000, tradeDate: "2026-02-01" });

  it("sells what there was, so a later buy starts clean instead of from a negative quantity", () => {
    const [holding] = computeHoldings([bought, oversell, tx({ id: "b2", quantity: 30, total: 4500, tradeDate: "2026-03-01" })]);
    expect(holding.quantity).toBe(30);
    expect(holding.totalCostInr).toBe(4500);
  });

  it("is reported by findOversells, with what was asked for and what was held", () => {
    expect(findOversells([bought, oversell])).toEqual([
      { transactionId: "s1", symbol: "NTAP", market: "IND", tradeDate: "2026-02-01", quantitySold: 150, quantityHeld: 100 },
    ]);
  });

  it("reports nothing for a sell of exactly what was held, or for a log that never oversells", () => {
    const exact = tx({ id: "s2", tradeType: "Sell", quantity: 100, total: 12_000, tradeDate: "2026-02-01" });
    expect(findOversells([bought, exact])).toEqual([]);
    expect(findOversells([])).toEqual([]);
  });

  it("reports a sell with nothing bought before it, and keeps each symbol's trades apart", () => {
    const other = tx({ id: "o1", symbol: "OTHER", quantity: 500, total: 1, tradeDate: "2025-01-01" });
    const found = findOversells([other, tx({ id: "s3", tradeType: "Sell", quantity: 5, total: 600, tradeDate: "2026-02-01" })]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ transactionId: "s3", quantityHeld: 0 });
  });
});

describe("valueHolding", () => {
  it("values an IND holding directly in INR, no FX involved", () => {
    const holding = computeHoldings([tx({ quantity: 10, total: 1000 })])[0];
    const valued = valueHolding(holding, 150, 1);
    expect(valued.currentValueInr).toBe(1500);
    expect(valued.gainLossInr).toBe(500);
  });

  it("values a US holding using today's live FX rate, not the historical one baked into cost basis", () => {
    const holding = computeHoldings([
      tx({ market: "US", currency: "USD", quantity: 10, total: 1000, fxRateToInr: 80 }),
    ])[0];
    // Cost basis is locked in at the trade's rate (1000 × 80 = 80,000); current value uses today's 85 instead.
    const valued = valueHolding(holding, 120, 85);
    expect(valued.currentValueInr).toBeCloseTo(120 * 85 * 10, 5);
  });
});

describe("totalCostBasisInr", () => {
  it("sums cost basis across all current holdings", () => {
    const transactions = [
      tx({ id: "t1", market: "IND", symbol: "AAA", quantity: 10, total: 1000 }),
      tx({ id: "t2", market: "US", symbol: "BBB", quantity: 5, total: 500, currency: "USD", fxRateToInr: 83 }),
    ];
    expect(totalCostBasisInr(transactions)).toBeCloseTo(1000 + 500 * 83, 2);
  });
});

describe("holdingsAt", () => {
  // The shape of a real NetApp history: an ESPP lot, an RSU vest with its sell-to-cover the same day, then both sold.
  const us = (overrides: Partial<InvestmentTransaction>): InvestmentTransaction => ({
    id: "t", tradeDate: "2025-01-01", symbol: "NTAP", market: "US", currency: "USD", tradeType: "Buy", source: "Market",
    quantity: 1, price: 100, total: 100, assetType: "Equity", broker: "E*TRADE", fxRateToInr: 85, ...overrides,
  });
  const log = [
    us({ id: "espp", tradeDate: "2024-11-29", source: "ESPP", quantity: 13, price: 101.116, total: 1314.508, fxRateToInr: 84.57 }),
    us({ id: "vest", tradeDate: "2025-02-15", source: "RSU", quantity: 56, price: 118.5, total: 6636, fxRateToInr: 86.67 }),
    us({ id: "cover", tradeDate: "2025-02-15", source: "RSU", tradeType: "Sell", quantity: 17, price: 118.5, total: 2014.5, fxRateToInr: 86.67 }),
    us({ id: "sell-rsu", tradeDate: "2026-04-06", source: "RSU", tradeType: "Sell", quantity: 39, price: 103.1651, total: 4023.35, fxRateToInr: 93.1 }),
    us({ id: "sell-espp", tradeDate: "2026-04-06", source: "ESPP", tradeType: "Sell", quantity: 13, price: 103.02, total: 1339.23, fxRateToInr: 93.1 }),
  ];
  const ntap = (day: string) => holdingsAt(log, day).find((h) => h.symbol === "NTAP");

  it("holds nothing before the first trade", () => {
    expect(holdingsAt(log, "2024-11-28")).toEqual([]);
  });

  it("counts a trade made on the day itself", () => {
    expect(ntap("2024-11-29")?.quantity).toBe(13);
  });

  it("leaves a later trade out: the day before the vest is the ESPP lot alone", () => {
    expect(ntap("2025-02-14")?.quantity).toBe(13);
  });

  it("counts a vest and its same-day sell-to-cover together, with the cost left after the sale", () => {
    const held = ntap("2025-02-15");
    expect(held?.quantity).toBe(52);
    // 17 of the 69 shares leave, taking 17/69 of the cost with them; what is kept is costed at what it cost.
    const bought = 1314.508 * 84.57 + 6636 * 86.67;
    expect(held?.totalCostInr).toBeCloseTo(bought * (52 / 69), 6);
    expect(held?.avgCostInr).toBeCloseTo((bought * (52 / 69)) / 52, 6);
  });

  it("is sold out, and so holds nothing, once the last shares go", () => {
    expect(ntap("2026-04-05")?.quantity).toBe(52);
    expect(ntap("2026-04-06")).toBeUndefined();
  });

  it("is today's holdings when asked for a day after the last trade", () => {
    expect(holdingsAt(log, "2030-01-01")).toEqual(computeHoldings(log));
  });

  it("does not depend on the order the trades are listed in", () => {
    expect(holdingsAt([...log].reverse(), "2025-02-15")).toEqual(holdingsAt(log, "2025-02-15"));
  });

  it("keeps a past day's cost at the rates paid, whatever a later trade did", () => {
    const later = [...log, us({ id: "more", tradeDate: "2026-09-01", quantity: 100, price: 200, total: 20000, fxRateToInr: 120 })];
    expect(holdingsAt(later, "2025-02-15")).toEqual(holdingsAt(log, "2025-02-15"));
  });

  it("refuses a day that isn't an ISO day, instead of comparing it as text", () => {
    expect(() => holdingsAt(log, "2026-4-5")).toThrow(RangeError);
    expect(() => holdingsAt(log, "")).toThrow(RangeError);
  });
});

describe("realisedGains", () => {
  const t = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
    id: "t", tradeDate: "2026-01-01", symbol: "XYZ", market: "IND", currency: "INR", tradeType: "Buy", source: "Market",
    quantity: 100, price: 100, total: 10000, assetType: "Equity", broker: "B", ...o,
  });

  it("is the proceeds less the cost of the shares sold, at the average cost", () => {
    const [sale] = realisedGains([t({ id: "b" }), t({ id: "s", tradeDate: "2026-02-01", tradeType: "Sell", quantity: 40, total: 5000 })]);
    expect(sale).toMatchObject({ quantity: 40, proceedsInr: 5000, costRemovedInr: 4000, gainInr: 1000 });
  });

  it("never moves the average cost of what is left", () => {
    const rows = [t({ id: "b" }), t({ id: "s", tradeDate: "2026-02-01", tradeType: "Sell", quantity: 40, total: 9000 })];
    const [holding] = computeHoldings(rows);
    expect(holding.avgCostInr).toBeCloseTo(100, 9);
    expect(holding.totalCostInr).toBeCloseTo(6000, 9);
  });

  it("uses the sale day's rate for proceeds and the rates paid for cost, so the rupee is in the gain", () => {
    // 10 shares for $1,000 at 80: cost ₹80,000. Four sold for $500 at 90: ₹45,000 in, ₹32,000 of cost out.
    const [sale] = realisedGains([
      t({ id: "b", market: "US", currency: "USD", quantity: 10, price: 100, total: 1000, fxRateToInr: 80 }),
      t({ id: "s", tradeDate: "2026-02-01", market: "US", currency: "USD", tradeType: "Sell", quantity: 4, price: 125, total: 500, fxRateToInr: 90 }),
    ]);
    expect(sale).toMatchObject({ proceedsInr: 45000, costRemovedInr: 32000, gainInr: 13000 });
  });

  it("has the sale's fees already out of its proceeds, since a sell's total is net of them", () => {
    const [sale] = realisedGains([t({ id: "b" }), t({ id: "s", tradeDate: "2026-02-01", tradeType: "Sell", quantity: 100, price: 120, total: 11990 })]);
    expect(sale.gainInr).toBe(1990); // 12,000 less a 10 fee, less the 10,000 cost
  });

  it("counts a loss as negative", () => {
    expect(totalRealisedGainInr([t({ id: "b" }), t({ id: "s", tradeDate: "2026-02-01", tradeType: "Sell", quantity: 100, total: 8000 })])).toBe(-2000);
  });

  it("lists every sale oldest first, across holdings, and sums them", () => {
    const rows = [
      t({ id: "b1", symbol: "AAA" }),
      t({ id: "b2", symbol: "BBB", total: 20000 }),
      t({ id: "s2", symbol: "BBB", tradeDate: "2026-03-01", tradeType: "Sell", quantity: 100, total: 25000 }),
      t({ id: "s1", symbol: "AAA", tradeDate: "2026-02-01", tradeType: "Sell", quantity: 100, total: 11000 }),
    ];
    expect(realisedGains(rows).map((s) => [s.symbol, s.gainInr])).toEqual([["AAA", 1000], ["BBB", 5000]]);
    expect(totalRealisedGainInr(rows)).toBe(6000);
  });

  it("matches only the shares that were held when a sell asks for more", () => {
    const [sale] = realisedGains([t({ id: "b", quantity: 6, total: 600 }), t({ id: "s", tradeDate: "2026-02-01", tradeType: "Sell", quantity: 10, total: 1000 })]);
    expect(sale).toMatchObject({ quantity: 6, proceedsInr: 600, costRemovedInr: 600, gainInr: 0 });
  });

  it("is nothing before a first sale", () => {
    expect(realisedGains([t({ id: "b" })])).toEqual([]);
  });

  it("works on a NetApp-shaped history: the sell-to-cover and both later sales", () => {
    const us = (o: Partial<InvestmentTransaction>) => t({ market: "US", currency: "USD", symbol: "NTAP", ...o });
    const rows = [
      us({ id: "espp", tradeDate: "2024-11-29", source: "ESPP", quantity: 13, total: 1314.508, fxRateToInr: 84.57 }),
      us({ id: "vest", tradeDate: "2025-02-15", source: "RSU", quantity: 56, total: 6636, fxRateToInr: 86.67 }),
      us({ id: "cover", tradeDate: "2025-02-15", source: "RSU", tradeType: "Sell", quantity: 17, total: 2014.5, fxRateToInr: 86.67 }),
      us({ id: "sell-all", tradeDate: "2026-04-06", tradeType: "Sell", quantity: 52, total: 5362.58, fxRateToInr: 93.1 }),
    ];
    const bought = 1314.508 * 84.57 + 6636 * 86.67;
    const [cover, rest] = realisedGains(rows);
    expect(cover.costRemovedInr).toBeCloseTo(bought * (17 / 69), 6);
    expect(cover.gainInr).toBeCloseTo(2014.5 * 86.67 - bought * (17 / 69), 6);
    expect(rest.costRemovedInr).toBeCloseTo(bought * (52 / 69), 6); // everything that is left
    expect(cover.costRemovedInr + rest.costRemovedInr).toBeCloseTo(bought, 6);
    // Whole history: money in less money out, in rupees.
    expect(totalRealisedGainInr(rows)).toBeCloseTo(2014.5 * 86.67 + 5362.58 * 93.1 - bought, 6);
  });

  it("can be asked as of a past day: later sales are left out, and a bad day is refused", () => {
    const rows = [t({ id: "b" }), t({ id: "s1", tradeDate: "2026-02-01", tradeType: "Sell", quantity: 40, total: 5000 }), t({ id: "s2", tradeDate: "2026-03-01", tradeType: "Sell", quantity: 60, total: 9000 })];
    expect(totalRealisedGainInr(rows, "2026-01-31")).toBe(0);
    expect(totalRealisedGainInr(rows, "2026-02-01")).toBe(1000);
    expect(totalRealisedGainInr(rows, "2026-03-01")).toBe(1000 + 3000);
    expect(totalRealisedGainInr(rows)).toBe(4000);
    expect(() => realisedGains(rows, "2026-2-1")).toThrow(RangeError);
  });
});

describe("tradeSteps", () => {
  it("gives shares and average cost after each trade: a buy moves the average, a sale never does", () => {
    // 10 at ₹100, then 10 at ₹200: average ₹150. Sell 5 for ₹1,000: cost out 5 × 150 = 750, made 250, average still ₹150.
    const steps = tradeSteps([
      tx({ id: "b1" }),
      tx({ id: "b2", tradeDate: "2026-02-01", price: 200, total: 2000 }),
      tx({ id: "s1", tradeDate: "2026-03-01", tradeType: "Sell", quantity: 5, price: 200, total: 1000 }),
    ]);
    expect(steps.get("b1")).toMatchObject({ quantityAfter: 10, avgCostInrAfter: 100, gainInr: null, oversoldBy: 0 });
    expect(steps.get("b2")).toMatchObject({ quantityAfter: 20, avgCostInrAfter: 150, gainInr: null });
    expect(steps.get("s1")!.quantityAfter).toBe(15);
    expect(steps.get("s1")!.avgCostInrAfter).toBeCloseTo(150, 9);
    expect(steps.get("s1")!.gainInr).toBeCloseTo(250, 9);
  });

  it("puts a vest before its sell-to-cover on the same day, whatever order they were typed", () => {
    const steps = tradeSteps([
      tx({ id: "cover", market: "US", currency: "USD", tradeType: "Sell", source: "RSU", quantity: 5, price: 100, total: 500, fxRateToInr: 90 }),
      tx({ id: "vest", market: "US", currency: "USD", source: "RSU", quantity: 14, price: 100, total: 1400, fxRateToInr: 90 }),
    ]);
    expect(steps.get("vest")!.quantityAfter).toBe(14);
    expect(steps.get("cover")!.quantityAfter).toBe(9);
    // Sold at the value it vested at, so the sell-to-cover makes nothing.
    expect(steps.get("cover")!.gainInr).toBeCloseTo(0, 9);
    expect(steps.get("cover")!.avgCostInrAfter).toBeCloseTo(9000, 9);
    expect(steps.get("cover")!.avgCostNativeAfter).toBeCloseTo(100, 9);
  });

  it("marks a sell of more than was held, holds nothing after it, and a later buy starts clean", () => {
    const steps = tradeSteps([
      tx({ id: "b1", quantity: 40, total: 4000 }),
      tx({ id: "s1", tradeDate: "2026-02-01", tradeType: "Sell", quantity: 60, total: 9000 }),
      tx({ id: "b2", tradeDate: "2026-03-01", quantity: 10, price: 300, total: 3000 }),
    ]);
    expect(steps.get("s1")).toMatchObject({ quantityAfter: 0, avgCostInrAfter: 0, oversoldBy: 20 });
    // Only the 40 held count: they brought in 40/60 of ₹9,000 = ₹6,000 against ₹4,000 of cost.
    expect(steps.get("s1")!.gainInr).toBeCloseTo(2000, 9);
    expect(steps.get("b2")).toMatchObject({ quantityAfter: 10, avgCostInrAfter: 300 });
  });

  it("agrees with computeHoldings on where each position ends", () => {
    const rows = [tx({ id: "a" }), tx({ id: "b", tradeDate: "2026-02-01", quantity: 3, total: 450 }), tx({ id: "c", symbol: "INFY", quantity: 2, total: 300 })];
    const steps = tradeSteps(rows);
    for (const h of computeHoldings(rows)) {
      const last = rows.filter((r) => r.symbol === h.symbol).at(-1)!;
      expect(steps.get(last.id)!.quantityAfter).toBe(h.quantity);
      expect(steps.get(last.id)!.avgCostInrAfter).toBeCloseTo(h.avgCostInr, 9);
    }
  });
});
