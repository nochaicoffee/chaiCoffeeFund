import { describe, expect, it } from "vitest";
import { computeHoldings, totalCostBasisInr, valueHolding } from "./investments";
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
  assetType: "India-Equity",
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
    // Cost basis locked in at fxRateToInr=80 (800 -> wait total=1000 so cost=80000), current value uses fx=85 instead.
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
