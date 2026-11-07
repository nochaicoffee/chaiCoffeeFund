import { describe, expect, it } from "vitest";
import { moneyIn } from "./moneyIn";
import type { Instrument, InvestmentTransaction } from "../sheets/types";

const trade = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2025-03-10", symbol: "AAA", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 10, price: 100, total: 1000, assetType: "Equity", broker: "B", ...o,
});
const instruments: Instrument[] = [
  { id: "i", symbol: "AAA", market: "IND", name: "Alpha Ltd", assetType: "Equity", priceTicker: "AAA.NS" },
  { id: "j", symbol: "BBB", market: "US", name: "Beta Inc", assetType: "Equity", priceTicker: "BBB" },
];
const TODAY = "2026-02-15";
const cell = (m: ReturnType<typeof moneyIn>, key: string) => m.years.flatMap((y) => y.months).find((c) => c.key === key)!;

describe("moneyIn", () => {
  const trades = [
    trade({}), // Mar 2025: 1,000 of his own
    trade({ id: "b", tradeDate: "2025-03-20", total: 3000 }), // Mar 2025: 3,000 more
    trade({ id: "e", tradeDate: "2025-05-02", symbol: "BBB", market: "US", currency: "USD", source: "ESPP", total: 10, fxRateToInr: 90 }), // 900
    trade({ id: "v1", tradeDate: "2025-05-20", symbol: "BBB", market: "US", currency: "USD", source: "RSU", total: 20, fxRateToInr: 90 }), // 1,800 vested
    trade({ id: "v2", tradeDate: "2025-05-20", symbol: "BBB", market: "US", currency: "USD", source: "RSU", tradeType: "Sell", total: 5, fxRateToInr: 90 }), // sold to cover: not a sale here
    trade({ id: "s", tradeDate: "2025-08-01", tradeType: "Sell", total: 500 }), // a sale, no buy
  ];
  const m = moneyIn(trades, instruments, TODAY);

  it("runs from the year of his first trade to this year, twelve months each", () => {
    expect(m.years.map((y) => y.year)).toEqual([2025, 2026]);
    expect(m.years.every((y) => y.months.length === 12)).toBe(true);
  });

  it("adds a month's buys, and colours it by the source that put in the most", () => {
    expect(cell(m, "2025-03")).toMatchObject({ state: "on", buyInr: 4000, dominant: "Market", sold: false });
    expect(cell(m, "2025-05")).toMatchObject({ buyInr: 2700, dominant: "RSU" }); // 1,800 of vest against 900 of ESPP
  });

  it("scales the colour by the square root against the biggest month, from 0.28", () => {
    expect(cell(m, "2025-03").strength).toBeCloseTo(1, 9);
    expect(cell(m, "2025-05").strength).toBeCloseTo(0.28 + 0.72 * Math.sqrt(2700 / 4000), 9);
  });

  it("lists each buy, an ESPP purchase as one, a vest's trades together and a sale as money out", () => {
    expect(cell(m, "2025-05").items).toEqual([{ label: "Beta Inc (ESPP)", amountInr: 900 }, { label: "Beta Inc RSU vest", amountInr: 1800 }]);
    expect(cell(m, "2025-08").items).toEqual([{ label: "Sold Alpha Ltd", amountInr: -500 }]);
  });

  it("puts two buys of the same holding in a month on one line, so a hover card never lists a name twice", () => {
    const twice = moneyIn([trade({}), trade({ id: "b", tradeDate: "2025-03-20", total: 3000 }), trade({ id: "s1", tradeDate: "2025-03-21", tradeType: "Sell", total: 100 }), trade({ id: "s2", tradeDate: "2025-03-22", tradeType: "Sell", total: 200 })], instruments, TODAY);
    expect(cell(twice, "2025-03").items).toEqual([{ label: "Alpha Ltd", amountInr: 4000 }, { label: "Sold Alpha Ltd", amountInr: -300 }]);
  });

  it("marks a month he sold, not one where only shares were sold to cover tax at a vest", () => {
    expect(cell(m, "2025-08")).toMatchObject({ state: "on", sold: true, buyInr: 0, dominant: null, strength: 0 });
    expect(cell(m, "2025-05").sold).toBe(false);
  });

  it("leaves a month with nothing empty, and a month after today as the future", () => {
    expect(cell(m, "2025-04").state).toBe("empty");
    expect(cell(m, "2026-02").state).toBe("empty");
    expect(cell(m, "2026-03").state).toBe("future");
  });

  it("counts the months he bought in, of the months since his first trade, and totals each year", () => {
    expect(m.monthsWithBuy).toBe(2); // March and May; August was only a sale
    expect(m.monthsSinceFirst).toBe(12); // Mar 2025 to Feb 2026
    expect(m.years[0].buyInr).toBe(4000 + 2700);
    expect(m.biggestYearInr).toBe(6700);
  });

  it("ignores a trade dated after today, and is empty with no trades", () => {
    expect(moneyIn([trade({ tradeDate: "2026-06-01" })], instruments, TODAY).years).toEqual([]);
    expect(moneyIn([], instruments, TODAY)).toEqual({ years: [], monthsWithBuy: 0, monthsSinceFirst: 0, biggestYearInr: 0 });
  });
});
