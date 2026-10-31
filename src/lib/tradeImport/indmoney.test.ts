import { describe, expect, it } from "vitest";
import { parseIndmoneyReport } from "./indmoney";
import { ImportError } from "./types";

const header = ["Trade Date", "Ticker", "Side", "Quantity", "($) Price", "($) Amount", "($) Commission", "Status"];

function report(trades: (string | number)[][], totals?: { trades?: number; buy?: number; sell?: number; commission?: number }) {
  const buy = trades.filter((t) => t[2] === "Buy").reduce((s, t) => s + Number(t[5]), 0);
  const sell = trades.filter((t) => t[2] === "Sell").reduce((s, t) => s + Number(t[5]), 0);
  const commission = trades.reduce((s, t) => s + Number(t[6]), 0);
  return [
    ["Account Number", "DRIVEWEALTH: TEST"],
    ["Total Trades", totals?.trades ?? trades.length],
    ["Total Buy Amount ($)", totals?.buy ?? buy],
    ["Total Sell Amount ($)", totals?.sell ?? sell],
    ["Total Commission ($)", totals?.commission ?? commission],
    [null],
    [null],
    header,
    ...trades,
    [null],
    ["Disclaimer:-"],
    ["* anything"],
  ];
}

describe("parseIndmoneyReport", () => {
  it("reads buys and sells with their fee kept apart from the amount", () => {
    const { trades } = parseIndmoneyReport(
      report([
        ["2026-10-30", "INTC", "Buy", 27, 65.8, 1776.6, 5.33, "FILLED"],
        ["2026-08-07", "PUBM", "Sell", 298, 17.5, 5214.17, 15.59, "FILLED"],
      ]),
    );
    expect(trades[0]).toMatchObject({ tradeDate: "2026-10-30", symbol: "INTC", market: "US", currency: "USD", tradeType: "Buy", quantity: 27, amount: 1776.6, fee: 5.33 });
    // A rounded price is fine: INDmoney rounds to the cent and not the amount.
    expect(trades[1]).toMatchObject({ tradeType: "Sell", amount: 5214.17, fee: 15.59 });
  });

  it("leaves out an order that did not fill, and says so", () => {
    const rows = report([["2026-10-30", "INTC", "Buy", 1, 10, 10, 0, "FILLED"]]);
    rows.splice(9, 0, ["2026-10-31", "INTC", "Buy", 1, 10, 10, 0, "CANCELLED"]);
    const { trades, skipped } = parseIndmoneyReport(rows);
    expect(trades).toHaveLength(1);
    expect(skipped).toEqual([{ what: "cancelled orders", count: 1 }]);
  });

  it("fails when the rows don't add up to the report's own totals (a row went missing)", () => {
    const rows = report([["2026-10-30", "INTC", "Buy", 1, 10, 10, 0, "FILLED"]], { buy: 510 });
    expect(() => parseIndmoneyReport(rows)).toThrow(/Total Buy Amount/);
  });

  it("fails when a trade's quantity × price is nowhere near its amount", () => {
    expect(() => parseIndmoneyReport(report([["2026-10-30", "INTC", "Buy", 10, 10, 50, 0, "FILLED"]]))).toThrow(ImportError);
  });

  it("fails on a file that isn't a trades report", () => {
    expect(() => parseIndmoneyReport([["hello"]])).toThrow(/Trade Date/);
  });

  it("fails when the columns have moved", () => {
    const rows = report([]);
    rows[7] = ["Trade Date", "Symbol", "Side"];
    expect(() => parseIndmoneyReport(rows)).toThrow(/columns have changed/);
  });
});
