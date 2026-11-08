import { describe, expect, it } from "vitest";
import type { HoldingRow } from "@/lib/aggregate/investmentOverview";
import { tradeEntries } from "@/lib/aggregate/tradeHistory";
import type { Instrument, InvestmentTransaction } from "@/lib/sheets/types";
import { bookView, findHolding, holdingRefs, listSentence, monthNote, tradesListView } from "./tradesView";

const t = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2026-01-01", symbol: "INFY", market: "IND", currency: "INR", tradeType: "Buy", source: "Market",
  quantity: 10, price: 100, total: 1000, assetType: "Equity", broker: "Zerodha", ...o,
});
const us = (o: Partial<InvestmentTransaction>) => t({ symbol: "NTAP", market: "US", currency: "USD", broker: "E*TRADE", fxRateToInr: 90, ...o });

const trades = [
  us({ id: "vest", tradeDate: "2025-02-12", source: "RSU", quantity: 14, price: 100, total: 1400 }),
  us({ id: "cover", tradeDate: "2025-02-12", source: "RSU", tradeType: "Sell", quantity: 5, price: 100, total: 500 }),
  us({ id: "espp", tradeDate: "2025-05-30", source: "ESPP", quantity: 10, price: 80, total: 800 }),
  t({ id: "i1", tradeDate: "2024-03-31", quantity: 10, total: 1000 }),
  t({ id: "i2", tradeDate: "2025-06-17", tradeType: "Sell", quantity: 10, price: 150, total: 1500 }),
];
const instruments: Instrument[] = [
  { id: "a", symbol: "NTAP", market: "US", name: "NetApp", assetType: "Equity", priceTicker: "NTAP" },
  { id: "b", symbol: "INFY", market: "IND", name: "Infosys", assetType: "Equity", priceTicker: "INFY.NS" },
];
const entries = tradeEntries(trades);
const ntapHeld = { symbol: "NTAP", market: "US", quantity: 19, price: 110, valueInr: 19 * 110 * 90 } as HoldingRow;

describe("holdingRefs", () => {
  const refs = holdingRefs(entries, instruments, [ntapHeld]);
  it("lists what he holds first, then what he sold out of, with names and counts", () => {
    expect(refs.map((r) => [r.id, r.name, r.count, r.soldOut])).toEqual([
      ["NTAP", "NetApp", 2, false],
      ["INFY", "Infosys", 2, true],
    ]);
  });
  it("finds a holding by symbol, by market and symbol, in any case", () => {
    expect(findHolding(refs, "ntap")?.name).toBe("NetApp");
    expect(findHolding(refs, "US:NTAP")?.name).toBe("NetApp");
    expect(findHolding(refs, "TCS")).toBeUndefined();
  });
});

describe("tradesListView", () => {
  const refs = holdingRefs(entries, instruments, [ntapHeld]);
  const view = tradesListView(entries, refs);
  it("gives one row a vest with its cover, newest first, with financial years", () => {
    expect(view.rows.map((r) => [r.id, r.kind, r.fy])).toEqual([
      ["i2", "sell", 2025],
      ["espp", "espp", 2025],
      ["vest", "rsu", 2024],
      ["i1", "buy", 2023],
    ]);
    expect(view.rows.find((r) => r.id === "vest")!.detail).toBe("14 vested at $100.00 · 5 sold to cover tax · 9 kept");
  });
  it("shows a US trade in dollars with its rupees, and what a sale made", () => {
    const espp = view.rows.find((r) => r.id === "espp")!;
    expect([espp.amount, espp.amountInr]).toEqual(["$800.00", "₹72,000"]);
    expect(view.rows.find((r) => r.id === "i2")!.made).toEqual({ text: "+₹500", tone: "up" });
  });
  it("adds up a month's line from the rows it is given", () => {
    expect(monthNote(view.rows.filter((r) => r.month === "2025-06"))).toBe("out ₹1,500");
    expect(monthNote(view.rows.filter((r) => r.month === "2025-02"))).toBe("in ₹1,26,000 · out ₹45,000");
  });
  it("has tiles for every year and for each financial year", () => {
    expect(Object.keys(view.tiles).sort()).toEqual(["", "2023", "2024", "2025"]);
    expect(view.tiles["2023"].map((x) => x.value)).toEqual(["₹1,000", "₹0", "₹1,000", "—"]);
    expect(view.tiles[""][3]).toMatchObject({ caption: "1 sale and 1 sell-to-cover, at average cost", tone: "up" });
  });
  it("writes the sentence from the same totals", () => {
    expect(listSentence(entries).map((p) => p.text).join("")).toBe("4 trades since Mar 31, 2024 across 2 brokers. You've put in ₹1.99L and taken out ₹46,500, making +₹500 on what you sold.");
  });
});

describe("bookView", () => {
  const refs = holdingRefs(entries, instruments, [ntapHeld]);
  const book = bookView(trades, entries, refs[0], ntapHeld, "2026-11-08");
  it("gives shares and average cost after each trade, and how a buy moved the average", () => {
    // Vest: 14 at ₹9,000, 5 sold → 9 at ₹9,000. ESPP: 10 at ₹7,200 → 19 at (81,000 + 72,000) / 19 = ₹8,052.63.
    expect(book.rows.map((r) => [r.heldAfter, r.avgAfter])).toEqual([
      ["19", "₹8,052.63"],
      ["9", "₹9,000.00"],
    ]);
    expect(book.rows[0].avgMove).toEqual({ text: "▼ ₹947.37", tone: "fall" });
    expect(book.rows[1]).toMatchObject({ shares: "+14", coverShares: "−5", avgMove: { text: "first trade", tone: "quiet" } });
  });
  it("splits how the shares came in and prices a share today in rupees", () => {
    expect(book.cameIn).toEqual([{ label: "ESPP", quantity: "10", source: "ESPP" }, { label: "RSU vested", quantity: "14", source: "RSU" }]);
    expect(book.heldToday).toBe("19 of 24");
    expect(book.priceToday).toBe("₹9,900.00");
    expect(book.average).toBe("₹8,052.63");
  });
  it("says when a holding is sold out, and keeps its book", () => {
    const sold = bookView(trades, entries, refs[1], undefined, "2026-11-08");
    expect(sold.tags).toEqual(["Sold out"]);
    expect(sold.figures[0]).toEqual({ label: "You hold", value: "0", note: "sold out on Jun 17, 2025" });
    expect(sold.figures[1]).toMatchObject({ value: "—", note: "was ₹100.00 before the sale" });
    expect(sold.rows[0].avgMove).toBeUndefined();
    expect(sold.average).toBeUndefined();
  });
});
