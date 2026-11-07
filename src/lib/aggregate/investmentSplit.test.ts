import { describe, expect, it } from "vitest";
import { assetClassOf, kindOf, splitHoldings, type SplitHolding } from "./investmentSplit";

const h = (o: Partial<SplitHolding>): SplitHolding => ({ symbol: "AAA", market: "IND", name: "Alpha", assetType: "Equity", valueInr: 100, costInr: 80, ...o });
const holdings = [
  h({ symbol: "AAA", valueInr: 600, costInr: 500 }),
  h({ symbol: "BBB", market: "US", name: "Beta", valueInr: 300, costInr: 200 }),
  h({ symbol: "ETF1", assetType: "ETF", name: "Index fund", valueInr: 60, costInr: 60 }),
  h({ symbol: "GLD", assetType: "Gold", name: "Gold fund", valueInr: 30, costInr: 40 }),
  h({ symbol: "DBT", assetType: "Debt-Fund", name: "Debt fund", valueInr: 10, costInr: 10 }),
];

describe("splitHoldings", () => {
  it("slices add up to the whole, biggest first, whichever way it is cut", () => {
    for (const by of ["assetClass", "market", "kind", "holding"] as const) {
      const slices = splitHoldings(holdings, by);
      expect(slices.reduce((s, x) => s + x.fraction, 0)).toBeCloseTo(1, 12);
      expect(slices.reduce((s, x) => s + x.valueInr, 0)).toBe(1000);
      expect([...slices].sort((a, b) => b.valueInr - a.valueInr)).toEqual(slices);
    }
  });

  it("counts an ETF as equity, a debt fund as debt and gold as gold", () => {
    const slices = splitHoldings(holdings, "assetClass");
    expect(slices.map((s) => [s.label, s.valueInr])).toEqual([["Equity", 960], ["Gold", 30], ["Debt", 10]]);
    expect(slices[0].members.map((m) => m.symbol)).toEqual(["AAA", "BBB", "ETF1"]);
    expect(assetClassOf("Mutual-Fund")).toBe("Equity");
    expect(assetClassOf("Other")).toBe("Other");
  });

  it("cuts by market, and by single companies against funds", () => {
    expect(splitHoldings(holdings, "market").map((s) => [s.label, s.valueInr])).toEqual([["India", 700], ["United States", 300]]);
    expect(splitHoldings(holdings, "kind").map((s) => [s.label, s.valueInr])).toEqual([["Single companies", 900], ["Funds", 100]]);
    expect(kindOf("ETF")).toBe("Funds");
  });

  it("gives a slice its gain on what it cost, and its members' shares of it add up to 1", () => {
    const equity = splitHoldings(holdings, "assetClass")[0];
    expect(equity.gainFraction).toBeCloseTo(960 / 760 - 1, 12);
    expect(equity.members.reduce((s, m) => s + m.fractionOfSlice, 0)).toBeCloseTo(1, 12);
    expect(splitHoldings(holdings, "assetClass")[1].gainFraction).toBeCloseTo(30 / 40 - 1, 12);
  });

  it("keeps the same symbol in two markets apart when each holding is its own slice", () => {
    const slices = splitHoldings([h({ symbol: "X", market: "IND", valueInr: 10 }), h({ symbol: "X", market: "US", valueInr: 20 })], "holding");
    expect(slices.map((s) => s.key)).toEqual(["US:X", "IND:X"]);
  });

  it("leaves out a holding worth nothing, and gives nothing for no holdings or a worthless whole, never NaN", () => {
    expect(splitHoldings([h({ valueInr: 0 }), h({ symbol: "B", valueInr: Number.NaN })], "market")).toEqual([]);
    expect(splitHoldings([], "market")).toEqual([]);
    const free = splitHoldings([h({ valueInr: 50, costInr: 0 })], "market");
    expect(free[0].gainFraction).toBeNull();
  });
});
