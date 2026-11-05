import { describe, expect, it } from "vitest";
import { computeHoldings } from "./investments";
import { dayChange, rupeeSplit } from "./investmentValue";
import type { InvestmentTransaction } from "../sheets/types";

const trade = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2025-01-01", symbol: "NTAP", market: "US", currency: "USD", tradeType: "Buy", source: "Market",
  quantity: 1, price: 100, total: 100, assetType: "Equity", broker: "E*TRADE", fxRateToInr: 85, ...o,
});
const holdingOf = (...t: InvestmentTransaction[]) => computeHoldings(t)[0];

describe("rupeeSplit", () => {
  it("splits a US gain into price at the rate paid and the rupee on today's value", () => {
    // 10 shares for $1,000 at 80: cost ₹80,000. Now $120 a share at 90: worth $1,200 = ₹1,08,000.
    const split = rupeeSplit(holdingOf(trade({ quantity: 10, price: 100, total: 1000, fxRateToInr: 80 })), 120, 90);
    expect(split.valueInr).toBe(108000);
    expect(split.gainInr).toBe(28000);
    expect(split.avgRateInr).toBe(80);
    expect(split.pricePartInr).toBe(16000); // $200 more than it cost, at the 80 he paid
    expect(split.rupeePartInr).toBe(12000); // $1,200 worth × (90 − 80)
  });

  it("adds up to the gain exactly, for gains, losses, a falling dollar and several buys at different rates", () => {
    const holding = holdingOf(
      trade({ id: "a", quantity: 10, total: 1000, fxRateToInr: 80 }),
      trade({ id: "b", tradeDate: "2025-06-01", quantity: 5, total: 700.55, fxRateToInr: 87.35 }),
    );
    for (const [price, fx] of [[150, 92], [60, 92], [150, 78], [60, 78], [140, 87.35], [0, 90]] as const) {
      const split = rupeeSplit(holding, price, fx);
      expect(split.pricePartInr + split.rupeePartInr).toBeCloseTo(split.gainInr, 9);
    }
  });

  it("averages the rate paid by dollars, not by trades", () => {
    const holding = holdingOf(
      trade({ id: "a", quantity: 1, total: 100, fxRateToInr: 80 }),
      trade({ id: "b", tradeDate: "2025-02-01", quantity: 3, total: 300, fxRateToInr: 90 }),
    );
    // ₹8,000 + ₹27,000 for $400: 87.5 a dollar, not the 85 a plain average of the two rates gives.
    expect(rupeeSplit(holding, 100, 90).avgRateInr).toBe(87.5);
  });

  it("is all price for an Indian holding", () => {
    const holding = holdingOf(trade({ market: "IND", currency: "INR", quantity: 100, price: 100, total: 10000, fxRateToInr: undefined }));
    const split = rupeeSplit(holding, 130, 94);
    expect(split).toMatchObject({ valueInr: 13000, gainInr: 3000, pricePartInr: 3000, rupeePartInr: 0, avgRateInr: 1 });
  });

  it("is all rupee when the price hasn't moved and the dollar has", () => {
    const split = rupeeSplit(holdingOf(trade({ quantity: 10, total: 1000, fxRateToInr: 80 })), 100, 90);
    expect(split.pricePartInr).toBe(0);
    expect(split.rupeePartInr).toBe(10000);
  });

  it("treats shares that cost nothing as all price, with no rate paid", () => {
    const split = rupeeSplit(holdingOf(trade({ quantity: 10, price: 0, total: 0, fxRateToInr: 80 })), 10, 90);
    expect(split.gainInr).toBe(9000);
    expect(split.pricePartInr + split.rupeePartInr).toBeCloseTo(9000, 9);
    expect(split.rupeePartInr).toBe(0);
  });

  it("keeps the native cost and the average rate right after a part sale", () => {
    const holding = holdingOf(
      trade({ id: "a", quantity: 10, total: 1000, fxRateToInr: 80 }),
      trade({ id: "s", tradeDate: "2025-03-01", tradeType: "Sell", quantity: 4, total: 500, fxRateToInr: 95 }),
    );
    expect(holding.totalCostNative).toBeCloseTo(600, 9);
    expect(rupeeSplit(holding, 100, 90).avgRateInr).toBeCloseTo(80, 9);
  });
});

describe("dayChange", () => {
  it("includes the rupee's move for a US holding, and the two parts add up to the change", () => {
    // 10 shares, $100 → $102, the dollar ₹90 → ₹91.
    const day = dayChange({ market: "US", quantityAtPrevClose: 10, priceToday: 102, pricePrevClose: 100, fxToday: 91, fxPrevClose: 90 });
    expect(day.prevValueInr).toBe(90000);
    expect(day.changeInr).toBe(2820); // 92,820 now less 90,000
    expect(day.pricePartInr).toBe(1800); // $20 at the old 90
    expect(day.rupeePartInr).toBe(1020); // $1,020 worth × the rupee's ₹1
    expect(day.pricePartInr + day.rupeePartInr).toBe(day.changeInr);
    expect(day.changeFraction).toBeCloseTo(0.0313333, 6);
  });

  it("moves with the price alone for an Indian holding, whatever rates it is given", () => {
    const day = dayChange({ market: "IND", quantityAtPrevClose: 50, priceToday: 105, pricePrevClose: 100, fxToday: 99, fxPrevClose: 10 });
    expect(day).toMatchObject({ prevValueInr: 5000, changeInr: 250, pricePartInr: 250, rupeePartInr: 0 });
  });

  it("is a fall when the price falls and the dollar rises, if the price falls more", () => {
    const day = dayChange({ market: "US", quantityAtPrevClose: 10, priceToday: 95, pricePrevClose: 100, fxToday: 90.5, fxPrevClose: 90 });
    expect(day.changeInr).toBeCloseTo(10 * 95 * 90.5 - 90000, 9);
    expect(day.changeInr).toBeLessThan(0);
    expect(day.pricePartInr + day.rupeePartInr).toBeCloseTo(day.changeInr, 9);
  });

  it("has no fraction when nothing was held at the previous close", () => {
    const day = dayChange({ market: "US", quantityAtPrevClose: 0, priceToday: 100, pricePrevClose: 99, fxToday: 90, fxPrevClose: 90 });
    expect(day).toMatchObject({ prevValueInr: 0, changeInr: 0, changeFraction: null });
  });
});
