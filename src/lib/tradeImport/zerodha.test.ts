import { describe, expect, it } from "vitest";
import { parseZerodhaTradebook } from "./zerodha";

const head = "symbol,isin,trade_date,exchange,segment,series,trade_type,auction,quantity,price,trade_id,order_id,order_execution_time";
const line = (symbol: string, isin: string, date: string, type: string, qty: number, price: number, order: string, extra: { segment?: string; exchange?: string; auction?: string } = {}) =>
  `${symbol},${isin},${date},${extra.exchange ?? "NSE"},${extra.segment ?? "EQ"},EQ,${type},${extra.auction ?? "false"},${qty.toFixed(6)},${price.toFixed(6)},1,${order},${date}T09:48:47`;
const csv = (...lines: string[]) => [head, ...lines, ""].join("\n");

describe("parseZerodhaTradebook", () => {
  it("joins the pieces of one order and rounds a 32-bit float price", () => {
    const { trades } = parseZerodhaTradebook(
      csv(line("NIFTYBEES", "INF204KB14I2", "2026-06-01", "buy", 159, 267.019989, "o1"), line("NIFTYBEES", "INF204KB14I2", "2026-06-01", "buy", 41, 267.019989, "o1")),
    );
    expect(trades).toEqual([
      { tradeDate: "2026-06-01", symbol: "NIFTYBEES", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", assetType: "ETF", quantity: 200, price: 267.02, amount: 53404, fee: 0 },
    ]);
  });

  it("reads a gold fund and a sell", () => {
    const { trades } = parseZerodhaTradebook(csv(line("GOLDCASE", "INF0R8F01042", "2026-05-13", "sell", 10, 24.83, "o1")));
    expect(trades[0]).toMatchObject({ assetType: "Gold", tradeType: "Sell", amount: 248.3 });
  });

  it("types a share by its INE ISIN, and fails on an unknown fund", () => {
    expect(parseZerodhaTradebook(csv(line("GROWW", "INE0HOQ01053", "2026-06-02", "buy", 7, 190.3, "o1"))).trades[0].assetType).toBe("Equity");
    expect(() => parseZerodhaTradebook(csv(line("NEWETF", "INF000000001", "2026-06-02", "buy", 1, 10, "o1")))).toThrow(/INDIAN_FUNDS/);
  });

  it("fails on another segment, exchange or an auction, and on a file that isn't this one", () => {
    expect(() => parseZerodhaTradebook(csv(line("X", "INE1", "2026-06-02", "buy", 1, 10, "o", { segment: "FO" })))).toThrow(/EQ/);
    expect(() => parseZerodhaTradebook(csv(line("X", "INE1", "2026-06-02", "buy", 1, 10, "o", { exchange: "BSE" })))).toThrow(/NSE/);
    expect(() => parseZerodhaTradebook(csv(line("X", "INE1", "2026-06-02", "buy", 1, 10, "o", { auction: "true" })))).toThrow(/auction/);
    expect(() => parseZerodhaTradebook("a,b\n1,2")).toThrow(/Zerodha/);
  });
});
