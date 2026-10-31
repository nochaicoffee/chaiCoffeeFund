import { describe, expect, it } from "vitest";
import { buildTransaction, datesNeedingRate } from "./build";
import { findLikelyCopies, planImport, tradeKey } from "./plan";
import type { ParsedTrade } from "./types";

const us = (overrides: Partial<ParsedTrade> = {}): ParsedTrade => ({
  tradeDate: "2026-10-30", symbol: "INTC", market: "US", currency: "USD", tradeType: "Buy", source: "Market", assetType: "Equity",
  quantity: 27, price: 65.8, amount: 1776.6, fee: 5.33, ...overrides,
});

describe("buildTransaction", () => {
  it("adds the fee to a buy's cost", () => {
    expect(buildTransaction(us(), "INDmoney", () => 94.95).total).toBeCloseTo(1781.93, 6);
  });

  it("takes the fee off what a sell brings in", () => {
    expect(buildTransaction(us({ tradeType: "Sell", amount: 5214.17, fee: 15.59 }), "INDmoney", () => 94.95).total).toBeCloseTo(5198.58, 6);
  });

  it("a rebate lowers a buy's cost", () => {
    expect(buildTransaction(us({ amount: 100, fee: -0.01 }), "IB", () => 94.95).total).toBeCloseTo(99.99, 6);
  });

  it("keeps the quoted price, so quantity × price is the trade without its fee", () => {
    const row = buildTransaction(us(), "INDmoney", () => 94.95);
    expect(row.price).toBe(65.8);
    expect(row.quantity * row.price).toBeCloseTo(1776.6, 6);
  });

  it("stamps a US trade with the rate of its day and an Indian one with none", () => {
    expect(buildTransaction(us(), "INDmoney", () => 94.95).fxRateToInr).toBe(94.95);
    const indian: ParsedTrade = { ...us(), market: "IND", currency: "INR", fee: 0 };
    expect("fxRateToInr" in buildTransaction(indian, "FYERS", () => 94.95)).toBe(false);
  });

  it("fails rather than store a US trade with no rate", () => {
    expect(() => buildTransaction(us(), "INDmoney", () => undefined)).toThrow(/rate/);
  });

  it("rounds away float dust", () => {
    expect(buildTransaction(us({ amount: 964.725, fee: 0.35330225 }), "IB", () => 90).total).toBe(965.078302);
  });

  it("asks for each US trade date's rate once", () => {
    expect(datesNeedingRate([us(), us(), us({ tradeDate: "2026-08-07" }), { ...us(), market: "IND", currency: "INR", tradeDate: "2020-01-01" }])).toEqual(["2026-08-07", "2026-10-30"]);
  });
});

describe("planImport", () => {
  const row = (overrides = {}) => buildTransaction(us(overrides), "INDmoney", () => 94.95);

  it("adds nothing when every trade is already stored", () => {
    const plan = planImport([row()], [row()]);
    expect(plan.toAdd).toEqual([]);
    expect(plan.alreadyThere).toHaveLength(1);
  });

  it("counts identical fills: one stored means one more is still to add", () => {
    expect(planImport([row(), row()], [row()]).toAdd).toHaveLength(1);
  });

  it("a different broker's identical trade is a different trade", () => {
    const other = { ...row(), broker: "Interactive Brokers" };
    expect(tradeKey(other)).not.toBe(tradeKey(row()));
    expect(planImport([other], [row()]).toAdd).toHaveLength(1);
  });
});

describe("findLikelyCopies", () => {
  const row = (overrides = {}) => ({ ...buildTransaction(us(overrides), "Groww", () => 94.95) });

  it("flags the same purchase under another broker a couple of days apart", () => {
    const stored = row({ tradeDate: "2026-05-15" });
    const incoming = { ...row({ tradeDate: "2026-05-13" }), broker: "Zerodha" };
    expect(findLikelyCopies([incoming], [stored])).toEqual([{ incoming, stored }]);
  });

  it("doesn't flag the same broker, another side, another size or a far-off day", () => {
    const stored = row();
    expect(findLikelyCopies([row()], [stored])).toEqual([]);
    expect(findLikelyCopies([{ ...row({ tradeType: "Sell" }), broker: "Z" }], [stored])).toEqual([]);
    expect(findLikelyCopies([{ ...row({ quantity: 28 }), broker: "Z" }], [stored])).toEqual([]);
    expect(findLikelyCopies([{ ...row({ tradeDate: "2026-12-01" }), broker: "Z" }], [stored])).toEqual([]);
  });
});
