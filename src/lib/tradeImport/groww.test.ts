import { describe, expect, it } from "vitest";
import { parseGrowwOrders } from "./groww";

const header = ["Stock name", "Symbol", "ISIN", "Type", "Quantity", "Value", "Exchange", "Exchange Order Id", "Execution date and time", "Order status"];
const order = (symbol: string, isin: string, type: string, qty: number, value: number, id: string, when = "15-05-2026 03:30 PM", status = "Executed", exchange = "NSE") => [
  `${symbol} name`, symbol, isin, type, qty, value, exchange, id, when, status,
];
const sheet = (...rows: unknown[][]) => [["Name", "Someone"], [null], ["Order history for stocks"], [null], header, ...rows] as never;

describe("parseGrowwOrders", () => {
  it("reads a buy: the price is value ÷ quantity and there is no fee", () => {
    const { trades } = parseGrowwOrders(sheet(order("GROWW", "INE0HOQ01053", "BUY", 7, 1332.1, "1001", "02-06-2026 03:04 PM")));
    expect(trades).toEqual([
      { tradeDate: "2026-06-02", symbol: "GROWW", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", assetType: "Equity", quantity: 7, price: 190.3, amount: 1332.1, fee: 0 },
    ]);
  });

  it("types a known ETF and gold fund, and a share by its INE ISIN", () => {
    const { trades } = parseGrowwOrders(
      sheet(order("NIFTYBEES", "INF204KB14I2", "BUY", 200, 54216, "1001"), order("GOLDCASE", "INF0R8F01042", "SELL", 6289, 140433.37, "1002")),
    );
    expect(trades.map((t) => [t.symbol, t.assetType, t.tradeType])).toEqual([["NIFTYBEES", "ETF", "Buy"], ["GOLDCASE", "Gold", "Sell"]]);
  });

  it("fails on a fund it doesn't know, naming it, rather than calling it a share", () => {
    expect(() => parseGrowwOrders(sheet(order("NEWETF", "INF000000001", "BUY", 1, 100, "1001")))).toThrow(/NEWETF.*INDIAN_FUNDS/);
  });

  it("joins the pieces of one exchange order", () => {
    const { trades } = parseGrowwOrders(sheet(order("GROWW", "INE0HOQ01053", "BUY", 3, 600, "1001"), order("GROWW", "INE0HOQ01053", "BUY", 4, 800, "1001")));
    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({ quantity: 7, amount: 1400, price: 200 });
  });

  it("leaves out shares transferred in from another broker, which carry a made-up order id", () => {
    const { trades, skipped } = parseGrowwOrders(sheet(order("GOLDCASE", "INF0R8F01042", "BUY", 1210, 30044.3, "664317_2026-05-15_DebtLS")));
    expect(trades).toEqual([]);
    expect(skipped).toEqual([{ what: "transfers in from another broker", count: 1 }]);
  });

  it("leaves out an order that was not executed, and says so", () => {
    const { trades, skipped } = parseGrowwOrders(sheet(order("GROWW", "INE0HOQ01053", "BUY", 1, 100, "1001", "02-06-2026 03:04 PM", "Rejected")));
    expect(trades).toEqual([]);
    expect(skipped).toEqual([{ what: "rejected orders", count: 1 }]);
  });

  it("fails on another exchange, a bad side, or a file that isn't this one", () => {
    expect(() => parseGrowwOrders(sheet(order("GROWW", "INE0HOQ01053", "BUY", 1, 100, "1001", undefined, undefined, "BSE")))).toThrow(/NSE/);
    expect(() => parseGrowwOrders(sheet(order("GROWW", "INE0HOQ01053", "HOLD", 1, 100, "1001")))).toThrow(/BUY or SELL/);
    expect(() => parseGrowwOrders([["hello"]])).toThrow(/Stock name/);
  });
});

describe("parseGrowwOrders order ids", () => {
  it("fails on an id that is neither digits nor the transfer-in pattern, instead of dropping the buy", () => {
    expect(() => parseGrowwOrders(sheet(order("GROWW", "INE0HOQ01053", "BUY", 1, 100, "ABC-123")))).toThrow(/neither an exchange id/);
  });
});
