import { describe, expect, it } from "vitest";
import { computeHoldings, findOversells, totalCostBasisInr, valueHolding } from "./investments";
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
