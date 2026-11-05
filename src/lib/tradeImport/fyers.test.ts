import { describe, expect, it } from "vitest";
import { parseFyersTradebook } from "./fyers";

const head = [
  "Report Title,Tradebook report",
  "Client ID,TEST",
  "",
  "Symbol name,Symbol code,Date & time,Side,Product type,Qty,Traded price,Total value,Segment,Exchange order ID,OMS order ID",
];
const line = (name: string, when: string, side: string, qty: number, price: number, order: string, extra: { product?: string; segment?: string } = {}) => {
  const value = (qty * price).toFixed(2);
  const money = (n: string) => `"${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}"`;
  return `${name},${name},"${when}",${side},${extra.product ?? "Delivery"},${qty.toFixed(2)},${money(price.toFixed(2))},${money(value)},${extra.segment ?? "Equity"},"=""1""","=""${order}"""`;
};
const csv = (...lines: string[]) => [...head, ...lines].join("\n");

describe("parseFyersTradebook", () => {
  it("joins the pieces of one order into one trade at the average price", () => {
    const { trades } = parseFyersTradebook(
      csv(
        line("GREENPANEL INDUSTRIES LTD", "05 Aug 2024, 10:36:00 AM", "BUY", 1, 350.15, "ord1"),
        line("GREENPANEL INDUSTRIES LTD", "05 Aug 2024, 10:36:00 AM", "BUY", 3, 350.3, "ord1"),
        line("GREENPANEL INDUSTRIES LTD", "05 Aug 2024, 10:36:00 AM", "BUY", 6, 350.1, "ord1"),
      ),
    );
    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({ tradeDate: "2024-08-05", symbol: "GREENPANEL", market: "IND", currency: "INR", tradeType: "Buy", quantity: 10, amount: 3501.65, price: 350.165, fee: 0 });
  });

  it("keeps two different orders on one day as two trades", () => {
    const { trades } = parseFyersTradebook(
      csv(line("PVR INOX LIMITED", "05 Aug 2024, 12:25:03 PM", "BUY", 7, 1421.25, "a"), line("PVR INOX LIMITED", "05 Aug 2024, 01:25:03 PM", "BUY", 1, 1400, "b")),
    );
    expect(trades.map((t) => t.quantity)).toEqual([7, 1]);
  });

  it("gives one company's different spellings one ticker, and an ETF its type", () => {
    const { trades } = parseFyersTradebook(
      csv(line("NIP IND ETF NIFTY BEES", "04 Jun 2024, 12:20:53 PM", "BUY", 60, 247.7, "a"), line("NIPPON INDIA ETF NIFTY BEES", "03 Oct 2024, 11:59:45 AM", "BUY", 88, 283.88, "b")),
    );
    expect(trades.map((t) => [t.symbol, t.assetType])).toEqual([["NIFTYBEES", "ETF"], ["NIFTYBEES", "ETF"]]);
  });

  it("fails on a company it has no ticker for, naming it", () => {
    expect(() => parseFyersTradebook(csv(line("SOME NEW COMPANY LTD", "05 Aug 2024, 10:36:00 AM", "BUY", 1, 100, "a")))).toThrow(/SOME NEW COMPANY LTD.*FYERS_SYMBOLS/);
  });

  it("fails on a trade that isn't delivery equity", () => {
    expect(() => parseFyersTradebook(csv(line("PVR INOX LIMITED", "05 Aug 2024, 10:36:00 AM", "BUY", 1, 100, "a", { product: "Intraday" })))).toThrow(/Delivery/);
    expect(() => parseFyersTradebook(csv(line("PVR INOX LIMITED", "05 Aug 2024, 10:36:00 AM", "BUY", 1, 100, "a", { segment: "Derivatives" })))).toThrow(/Equity/);
  });

  it("fails on a file that isn't a tradebook", () => {
    expect(() => parseFyersTradebook("a,b\n1,2")).toThrow(/Symbol name/);
  });
});

describe("parseFyersTradebook order id", () => {
  it("fails on a line with no OMS order ID", () => {
    expect(() => parseFyersTradebook(csv(line("PVR INOX LIMITED", "05 Aug 2024, 10:36:00 AM", "BUY", 1, 100, "")))).toThrow(/OMS order ID/);
  });
});
