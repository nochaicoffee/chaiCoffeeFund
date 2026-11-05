import { describe, expect, it } from "vitest";
import { investmentFlows, priceCagr, xirr, yearlyReturn, type CashFlow } from "./investmentReturns";
import type { InvestmentTransaction } from "../sheets/types";

const day = (n: number) => new Date(Date.UTC(2024, 0, 1) + n * 86_400_000).toISOString().slice(0, 10); // 2024-01-01 + n days
const flow = (n: number, amount: number): CashFlow => ({ date: day(n), amount });

describe("xirr", () => {
  it("is 10% for 1,000 that becomes 1,100 in a 365-day year", () => {
    expect(xirr([flow(0, -1000), flow(365, 1100)])).toBeCloseTo(0.1, 9);
  });

  it("is 10% a year for 1,000 that becomes 1,210 in two years", () => {
    expect(xirr([flow(0, -1000), flow(730, 1210)])).toBeCloseTo(0.1, 9);
  });

  it("solves several flows: 1,000 in, 1,000 more a year later, 2,310 out after two years is 10%", () => {
    // x² + x = 2.31 with x = 1 + r gives x = 1.1.
    expect(xirr([flow(0, -1000), flow(365, -1000), flow(730, 2310)])).toBeCloseTo(0.1, 9);
  });

  it("is zero when the money comes back unchanged", () => {
    expect(xirr([flow(0, -100), flow(200, 100)])).toBeCloseTo(0, 9);
  });

  it("is negative for a loss", () => {
    expect(xirr([flow(0, -1000), flow(365, 900)])).toBeCloseTo(-0.1, 9);
  });

  it("does not depend on the order the flows are given in", () => {
    expect(xirr([flow(730, 1210), flow(0, -1000)])).toBeCloseTo(0.1, 9);
  });

  it("makes the flows worth nothing at the rate it finds", () => {
    const flows = [flow(0, -5000), flow(40, -2500), flow(200, 1200), flow(500, -800), flow(900, 9800)];
    const rate = xirr(flows)!;
    const npv = flows.reduce((sum, f, i) => sum + f.amount * Math.pow(1 + rate, -[0, 40, 200, 500, 900][i] / 365), 0);
    expect(Math.abs(npv)).toBeLessThan(1e-6);
  });

  it("finds a very high rate too (a 5x in 100 days)", () => {
    expect(xirr([flow(0, -100), flow(100, 500)])).toBeCloseTo(Math.pow(5, 365 / 100) - 1, 6);
  });

  it("is null when the money only went one way, or there is one flow, or nothing", () => {
    expect(xirr([flow(0, -100), flow(30, -50)])).toBeNull();
    expect(xirr([flow(0, 100), flow(30, 50)])).toBeNull();
    expect(xirr([flow(0, -100)])).toBeNull();
    expect(xirr([])).toBeNull();
  });

  it("is null when every flow is on one day", () => {
    expect(xirr([flow(5, -100), flow(5, 120)])).toBeNull();
  });

  it("refuses a flow with a date that isn't an ISO day", () => {
    expect(() => xirr([{ date: "1/1/2024", amount: -1 }, flow(10, 2)])).toThrow(RangeError);
  });
});

const trade = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2024-01-01", symbol: "NTAP", market: "US", currency: "USD", tradeType: "Buy", source: "Market",
  quantity: 1, price: 100, total: 100, assetType: "Equity", broker: "E*TRADE", fxRateToInr: 80, ...o,
});

describe("investmentFlows (PRD Q12)", () => {
  it("counts an ESPP purchase as money in at the price he paid, in rupees at its own rate", () => {
    expect(investmentFlows([trade({ source: "ESPP", quantity: 10, price: 85, total: 850, fxRateToInr: 80 })])).toEqual([{ date: "2024-01-01", amount: -68000 }]);
  });

  it("counts an RSU vest as money in at fair value and its same-day sell-to-cover as money out, so what is kept stays in at fair value", () => {
    const flows = investmentFlows([
      trade({ id: "v", source: "RSU", quantity: 56, price: 118.5, total: 6636, fxRateToInr: 86.67 }),
      trade({ id: "c", source: "RSU", tradeType: "Sell", quantity: 17, price: 118.5, total: 2014.5, fxRateToInr: 86.67 }),
    ]);
    expect(flows.reduce((sum, f) => sum + f.amount, 0)).toBeCloseTo(-39 * 118.5 * 86.67, 6);
  });

  it("counts a sell as money out at its total, fees already out of it", () => {
    expect(investmentFlows([trade({ tradeType: "Sell", total: 995, fxRateToInr: undefined, market: "IND", currency: "INR" })])).toEqual([{ date: "2024-01-01", amount: 995 }]);
  });

  it("can be limited to one holding and to a day", () => {
    const rows = [trade({ id: "a" }), trade({ id: "b", symbol: "INTC" }), trade({ id: "c", tradeDate: "2025-01-01" })];
    expect(investmentFlows(rows, { symbol: "NTAP", asOf: "2024-06-01" })).toHaveLength(1);
    expect(investmentFlows(rows, { asOf: "2030-01-01" })).toHaveLength(3);
    expect(() => investmentFlows(rows, { asOf: "2030-1-1" })).toThrow(RangeError);
  });
});

describe("yearlyReturn", () => {
  it("is the XIRR with what the trades are worth now as the last flow", () => {
    // ₹1,00,000 bought a year ago, worth ₹1,10,000 on 2025-01-01 (366 days: 2024 is a leap year).
    const result = yearlyReturn([trade({ market: "IND", currency: "INR", total: 100000, fxRateToInr: undefined })], 110000, "2025-01-01");
    expect(result.tooEarly).toBe(false);
    expect(result.rate).toBeCloseTo(Math.pow(1.1, 365 / 366) - 1, 9);
  });

  it("says too early under a year, and gives no rate", () => {
    expect(yearlyReturn([trade({ total: 100 })], 103, "2024-12-30")).toMatchObject({ rate: null, tooEarly: true });
  });

  it("has nothing to say about no trades", () => {
    expect(yearlyReturn([], 0, "2025-01-01")).toEqual({ rate: null, tooEarly: false, days: 0 });
  });

  it("ignores trades after the day asked", () => {
    const rows = [trade({ id: "a", market: "IND", currency: "INR", total: 1000, fxRateToInr: undefined }), trade({ id: "b", tradeDate: "2026-06-01", market: "IND", currency: "INR", total: 5000, fxRateToInr: undefined })];
    expect(yearlyReturn(rows, 1100, "2025-01-01").rate).toBeCloseTo(Math.pow(1.1, 365 / 366) - 1, 9);
  });

  it("gives a rate for a position that is fully sold (nothing worth at the end)", () => {
    const rows = [
      trade({ id: "a", market: "IND", currency: "INR", total: 1000, fxRateToInr: undefined }),
      trade({ id: "b", tradeType: "Sell", tradeDate: "2025-01-01", market: "IND", currency: "INR", total: 1100, fxRateToInr: undefined }),
    ];
    expect(yearlyReturn(rows, 0, "2025-01-01").rate).toBeCloseTo(Math.pow(1.1, 365 / 366) - 1, 9);
  });
});

describe("priceCagr", () => {
  it("is the price's growth a year, in its own currency", () => {
    expect(priceCagr(100, 121, "2022-01-01", "2024-01-01")).toBeCloseTo(Math.pow(1.21, 365 / 730) - 1, 9);
  });

  it("is null under a year, or for a price of zero", () => {
    expect(priceCagr(100, 110, "2024-01-01", "2024-06-01")).toBeNull();
    expect(priceCagr(0, 110, "2020-01-01", "2024-01-01")).toBeNull();
    expect(priceCagr(100, 0, "2020-01-01", "2024-01-01")).toBeNull();
  });
});

describe("yearlyReturn on a position that is all sold", () => {
  const row = (o: Partial<InvestmentTransaction>) => trade({ market: "IND", currency: "INR", fxRateToInr: undefined, ...o });

  it("is too early when it was held under a year, however long ago it was sold", () => {
    const rows = [row({ id: "a", tradeDate: "2022-01-01", total: 1000 }), row({ id: "b", tradeDate: "2022-04-01", tradeType: "Sell", total: 1200 })];
    expect(yearlyReturn(rows, 0, "2026-01-01")).toMatchObject({ rate: null, tooEarly: true, days: 90 });
  });

  it("gives a rate when it was held a year or more before it was sold", () => {
    const rows = [row({ id: "a", tradeDate: "2022-01-01", total: 1000 }), row({ id: "b", tradeDate: "2023-01-01", tradeType: "Sell", total: 1100 })];
    expect(yearlyReturn(rows, 0, "2026-01-01").rate).toBeCloseTo(0.1, 9);
  });

  it("refuses a negative or non-finite value", () => {
    expect(() => yearlyReturn([row({})], -1, "2026-01-01")).toThrow(RangeError);
    expect(() => yearlyReturn([row({})], Number.NaN, "2026-01-01")).toThrow(RangeError);
  });
});
