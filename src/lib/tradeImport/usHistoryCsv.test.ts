import { describe, expect, it } from "vitest";
import { parseUsHistoryCsv } from "./usHistoryCsv";

const head = [
  "Statement,Header,Field Name,Field Value",
  'Statement,Data,Period,"April 6, 2026 - November 4, 2026"',
  "Transaction History,Header,Date,Account,Description,Transaction Type,Symbol,Quantity,Price,Price Currency,Gross Amount ,Commission,Net Amount",
];

const csv = (...lines: string[]) => [...head, ...lines].join("\n");

describe("parseUsHistoryCsv", () => {
  it("reads a buy with its commission as a fee", () => {
    const { trades } = parseUsHistoryCsv(csv("Transaction History,Data,2026-10-30,U***1,INTEL CORP,Buy,INTC,15.0,64.315,USD,-964.725,-0.35330225,-965.07830225"));
    expect(trades).toEqual([
      { tradeDate: "2026-10-30", symbol: "INTC", market: "US", currency: "USD", tradeType: "Buy", source: "Market", assetType: "Equity", quantity: 15, price: 64.315, amount: 964.725, fee: 0.353302 },
    ]);
  });

  it("reads a sell: negative quantity becomes a positive one, and the fee comes off what came in", () => {
    const { trades } = parseUsHistoryCsv(csv("Transaction History,Data,2026-08-07,U***1,PUBMATIC,Sell,PUBM,-85.0,17.32,USD,1472.2,-0.30391457,1471.89608543"));
    expect(trades[0]).toMatchObject({ tradeType: "Sell", quantity: 85, amount: 1472.2, fee: 0.303915 });
  });

  it("reads a commission rebate as a negative fee", () => {
    const { trades } = parseUsHistoryCsv(csv("Transaction History,Data,2026-08-25,U***1,INTEL CORP,Buy,INTC,7.0,88.78,USD,-621.46,0.007679,-621.452321"));
    expect(trades[0].fee).toBeCloseTo(-0.007679, 6);
  });

  it("keeps two identical fills as two trades", () => {
    const line = "Transaction History,Data,2026-10-30,U***1,INTEL CORP,Buy,INTC,15.0,64.315,USD,-964.725,-0.003045,-964.7280450000001";
    expect(parseUsHistoryCsv(csv(line, line)).trades).toHaveLength(2);
  });

  it("leaves out deposits, dividends and tax, and counts them", () => {
    const { trades, skipped } = parseUsHistoryCsv(
      csv(
        "Transaction History,Data,2026-10-01,U***1,NVDA Cash Dividend,Dividend,NVDA,-,-,-,0.5,-,0.5",
        "Transaction History,Data,2026-10-01,U***1,NVDA Tax,Foreign Tax Withholding,NVDA,-,-,-,-0.13,-,-0.13",
        "Transaction History,Data,2026-04-06,U***1,Electronic Fund Transfer,Deposit,-,-,-,-,100.0,-,100.0",
      ),
    );
    expect(trades).toEqual([]);
    expect(skipped).toEqual([
      { what: "dividend lines", count: 1 },
      { what: "foreign tax withholding lines", count: 1 },
      { what: "deposit lines", count: 1 },
    ]);
  });

  it("fails when the net amount disagrees with gross and commission (a sign misread)", () => {
    expect(() => parseUsHistoryCsv(csv("Transaction History,Data,2026-10-30,U***1,INTEL CORP,Buy,INTC,15.0,64.315,USD,-964.725,-0.35,-964.0"))).toThrow(/should net/);
  });

  it("fails on a trade priced in another currency", () => {
    expect(() => parseUsHistoryCsv(csv("Transaction History,Data,2026-10-30,U***1,SAP,Buy,SAP,1.0,100,EUR,-100,-0.35,-100.35"))).toThrow(/only USD/);
  });

  it("fails on a file that isn't this export", () => {
    expect(() => parseUsHistoryCsv("a,b\n1,2")).toThrow(/Transaction History/);
  });
});

describe("parseUsHistoryCsv quantity sign and short lines", () => {
  it("fails on a Buy with a negative quantity or a Sell with a positive one", () => {
    expect(() => parseUsHistoryCsv(csv("Transaction History,Data,2026-10-30,U***1,X,Buy,INTC,-15.0,64.315,USD,-964.725,-0.35,-965.075"))).toThrow(/positive quantity/);
    expect(() => parseUsHistoryCsv(csv("Transaction History,Data,2026-08-07,U***1,X,Sell,PUBM,85.0,17.32,USD,1472.2,-0.3,1471.9"))).toThrow(/negative quantity/);
  });

  it("fails on a line cut short", () => {
    expect(() => parseUsHistoryCsv(csv("Transaction History,Data,2026-10-30,U***1"))).toThrow(/cut short/);
  });
});
