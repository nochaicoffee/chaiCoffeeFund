import { describe, expect, it } from "vitest";
import { parseEtradeStockPlan, type Sheets } from "./etradeStockPlan";

const esppHeader = ["Record Type", "Symbol", "Purchase Date", "Purchase Price", "Purchased Qty.", "Tax Collection Shares", "Net Shares", "Sellable Qty."];
const rsuHeader: (string | null)[] = Array(62).fill(null);
Object.entries({ 0: "Record Type", 1: "Symbol", 11: "Grant Number", 18: "Vest Period", 19: "Vest Date", 25: "Vested Qty.", 32: "Sellable Qty.", 35: "Est. Cost Basis (per share):", 38: "Shares Traded for taxes", 41: "Taxable Gain" }).forEach(([i, n]) => (rsuHeader[Number(i)] = n));

const rsuRow = (cells: Record<number, string | number>) => {
  const row: (string | number | null)[] = Array(62).fill(null);
  for (const [i, v] of Object.entries(cells)) row[Number(i)] = v;
  return row;
};
const grant = rsuRow({ 0: "Grant", 1: "NTAP", 11: "RS1" });
const vest = (period: number, date: string, vested: number, traded: number) => rsuRow({ 0: "Vest Schedule", 11: "RS1", 18: period, 19: date, 25: vested, 38: traded });
const tax = (period: number, gain: number) => rsuRow({ 0: "Tax Withholding", 11: "RS1", 18: period, 41: gain });
const held = (period: number, qty: number, basis: number) => rsuRow({ 0: "Sellable Shares", 11: "RS1", 18: period, 32: qty, 35: basis });

const sheets = (espp: unknown[][], rsu: unknown[][]) => ({ ESPP: [esppHeader, ...espp], "Restricted Stock": [rsuHeader, ...rsu] }) as unknown as Sheets;

describe("parseEtradeStockPlan", () => {
  it("reads a held ESPP lot as a Buy at the price paid", () => {
    const { trades } = parseEtradeStockPlan(sheets([["Purchase", "NTAP", "30-MAY-2025", 84.286, 14, 0, 14, 14]], [grant]));
    expect(trades).toEqual([
      { tradeDate: "2025-05-30", symbol: "NTAP", market: "US", currency: "USD", tradeType: "Buy", source: "ESPP", assetType: "Equity", quantity: 14, price: 84.286, amount: 1180.004, fee: 0 },
    ]);
  });

  it("reads a held RSU vest as a Buy of what vested and a same-day Sell of the shares traded for tax", () => {
    const { trades } = parseEtradeStockPlan(sheets([], [grant, vest(2, "02/15/2026", 57, 18), tax(2, 5598.54), held(2, 39, 98.22)]));
    expect(trades).toHaveLength(2);
    expect(trades[0]).toMatchObject({ tradeDate: "2026-02-15", tradeType: "Buy", source: "RSU", quantity: 57, price: 98.22, amount: 5598.54 });
    expect(trades[1]).toMatchObject({ tradeDate: "2026-02-15", tradeType: "Sell", source: "RSU", quantity: 18, price: 98.22, amount: 1767.96 });
  });

  it("doesn't load a vest already sold, or an unvested period, and says so", () => {
    const { trades, skipped } = parseEtradeStockPlan(
      sheets([], [grant, vest(1, "02/15/2025", 56, 17), tax(1, 6636), held(1, 0, 118.5), rsuRow({ 0: "Vest Schedule", 11: "RS1", 18: 3, 19: "02/15/2027", 21: 57 })]),
    );
    expect(trades).toEqual([]);
    expect(skipped).toEqual([
      { what: "RSU vests already sold in whole or part (sales aren't in this report)", count: 1 },
      { what: "unvested RSU periods", count: 1 },
    ]);
  });

  it("fails when the fair market value from the tax line disagrees with the report's cost basis", () => {
    expect(() => parseEtradeStockPlan(sheets([], [grant, vest(2, "02/15/2026", 57, 18), tax(2, 5598.54), held(2, 39, 90)]))).toThrow(/disagrees/);
  });

  it("doesn't load an ESPP lot that is not wholly held", () => {
    const { trades, skipped } = parseEtradeStockPlan(sheets([["Purchase", "NTAP", "30-MAY-2025", 84.286, 14, 0, 14, 10]], [grant]));
    expect(trades).toEqual([]);
    expect(skipped[0].count).toBe(1);
  });

  it("fails when a column has moved, or the sheets are missing", () => {
    const moved = sheets([], []);
    (moved["ESPP"][0] as unknown[])[3] = "Price";
    expect(() => parseEtradeStockPlan(moved)).toThrow(/has changed/);
    expect(() => parseEtradeStockPlan({ ESPP: [] })).toThrow(/Restricted Stock/);
  });
});
