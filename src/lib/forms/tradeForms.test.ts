import { describe, expect, it } from "vitest";
import { deleteProblem, heldOn, readEsppForm, readTradeForm, readVestForm, type TradeFormContext } from "./tradeForms";
import type { InvestmentTransaction } from "../sheets/types";

const t = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2025-01-10", symbol: "NTAP", market: "US", currency: "USD", tradeType: "Buy", source: "Market", quantity: 10, price: 100, total: 1000, assetType: "Equity", broker: "E*TRADE", fxRateToInr: 85, ...o,
});
const ctx = (trades: InvestmentTransaction[] = []): TradeFormContext => ({
  instruments: [{ symbol: "NTAP", market: "US", name: "NetApp", assetType: "Equity" }, { symbol: "FSL", market: "IND", name: "Firstsource", assetType: "Equity" }],
  trades,
});
const TODAY = "2026-11-06";
const buy = { tradeType: "Buy", source: "Market", tradeDate: "2026-11-05", holding: "US:NTAP", quantity: "4", price: "170.5", total: "", fxRateToInr: "94.48", broker: "E*TRADE" };

describe("readTradeForm", () => {
  it("reads a buy, working the total out as quantity × price when it is left blank", () => {
    const r = readTradeForm(buy, ctx(), TODAY);
    expect(r).toEqual({ ok: true, input: { row: expect.objectContaining({ symbol: "NTAP", market: "US", currency: "USD", tradeType: "Buy", quantity: 4, price: 170.5, total: 682, fxRateToInr: 94.48, broker: "E*TRADE" }) } });
  });

  it("takes a typed total as it is, so fees stay in the cost", () => {
    const r = readTradeForm({ ...buy, total: "686.12" }, ctx(), TODAY);
    expect(r.ok && r.input.row.total).toBe(686.12);
  });

  it("keeps fractional shares and a price to four places", () => {
    const r = readTradeForm({ ...buy, quantity: "0.71651065", price: "123.9275" }, ctx(), TODAY);
    expect(r.ok && [r.input.row.quantity, r.input.row.price]).toEqual([0.71651065, 123.9275]);
  });

  it("needs no rate for an Indian holding and leaves it off", () => {
    const r = readTradeForm({ ...buy, holding: "IND:FSL", fxRateToInr: "" }, ctx(), TODAY);
    expect(r.ok && r.input.row).toMatchObject({ market: "IND", currency: "INR" });
    expect(r.ok && "fxRateToInr" in r.input.row).toBe(false);
  });

  it("needs the dollar rate for a US holding", () => {
    const r = readTradeForm({ ...buy, fxRateToInr: "" }, ctx(), TODAY);
    expect(r.ok === false && r.errors.fxRateToInr).toMatch(/dollar rate/);
  });

  it.each([
    ["a day that hasn't come", { tradeDate: "2026-11-07" }, "tradeDate"],
    ["no holding", { holding: "" }, "holding"],
    ["a holding that isn't an instrument", { holding: "US:ZZZZ" }, "holding"],
    ["zero shares", { quantity: "0" }, "quantity"],
    ["text for shares", { quantity: "lots" }, "quantity"],
    ["a negative price", { price: "-1" }, "price"],
    ["no broker", { broker: "" }, "broker"],
    ["an odd rate", { fxRateToInr: "9" }, "fxRateToInr"],
  ])("refuses %s", (_name, change, field) => {
    const r = readTradeForm({ ...buy, ...change }, ctx(), TODAY);
    expect(r.ok === false && Object.keys(r.errors)).toContain(field);
  });

  it("refuses a sell of more than was held that day, saying what was held", () => {
    const r = readTradeForm({ ...buy, tradeType: "Sell", quantity: "20" }, ctx([t({ quantity: 15, tradeDate: "2025-01-10" })]), TODAY);
    expect(r.ok === false && r.errors.quantity).toMatch(/You held 15 NetApp shares on Nov 5, 2026/);
  });

  it("allows a sell of exactly what was held", () => {
    expect(readTradeForm({ ...buy, tradeType: "Sell", quantity: "15" }, ctx([t({ quantity: 15 })]), TODAY).ok).toBe(true);
  });

  it("counts a buy made earlier the same day before the sell", () => {
    expect(readTradeForm({ ...buy, tradeType: "Sell", tradeDate: "2025-01-10", quantity: "10" }, ctx([t({ quantity: 10, tradeDate: "2025-01-10" })]), TODAY).ok).toBe(true);
  });

  it("does not count the trade being edited against itself: lowering a sell is fine", () => {
    const stored = [t({ id: "b", quantity: 40 }), t({ id: "s", tradeType: "Sell", tradeDate: "2025-02-01", quantity: 60 })];
    // The stored sell is already over (60 of 40). Editing it down to 40 fixes it.
    expect(readTradeForm({ ...buy, tradeType: "Sell", tradeDate: "2025-02-01", quantity: "40" }, ctx(stored), TODAY, "s").ok).toBe(true);
  });

  it("is not blocked by an oversell that was already there when the edit is about another trade", () => {
    const stored = [t({ id: "b", quantity: 40 }), t({ id: "s", tradeType: "Sell", tradeDate: "2025-02-01", quantity: 60 })];
    expect(readTradeForm({ ...buy, symbol: "FSL", holding: "IND:FSL", fxRateToInr: "" }, ctx(stored), TODAY).ok).toBe(true);
  });

  it("refuses an edit that moves a buy after the sell that depends on it", () => {
    const stored = [t({ id: "b", tradeDate: "2025-01-10", quantity: 10 }), t({ id: "s", tradeType: "Sell", tradeDate: "2025-02-01", quantity: 10 })];
    const r = readTradeForm({ ...buy, tradeDate: "2025-03-01", quantity: "10" }, ctx(stored), TODAY, "b");
    expect(r.ok === false && r.errors.quantity).toMatch(/You held/);
  });
});

describe("readTradeForm, which shares a sale took", () => {
  const sell = { ...buy, tradeType: "Sell" };

  it("keeps the source a sale took, and leaves it off when none is marked", () => {
    const marked = readTradeForm({ ...sell, soldFrom: "ESPP" }, ctx([t({ id: "b1", quantity: 10 })]), TODAY);
    expect(marked.ok && marked.input.row.soldFrom).toBe("ESPP");
    const blank = readTradeForm({ ...sell, soldFrom: "" }, ctx([t({ id: "b1", quantity: 10 })]), TODAY);
    expect(blank.ok && "soldFrom" in blank.input.row).toBe(false);
  });

  it("drops it from a buy, which has no shares to take", () => {
    const r = readTradeForm({ ...buy, soldFrom: "RSU" }, ctx(), TODAY);
    expect(r.ok && "soldFrom" in r.input.row).toBe(false);
  });

  it("refuses a source that isn't one of the three", () => {
    const r = readTradeForm({ ...sell, soldFrom: "Gift" }, ctx([t({ id: "b1", quantity: 10 })]), TODAY);
    expect(r.ok === false && r.errors.soldFrom).toMatch(/Choose which shares/);
  });
});

describe("readTradeForm, paid from a cash account", () => {
  const withCash = { ...ctx(), cashAccountIds: ["ibkr", "zerodha"] };

  it("keeps the cash account the trade was paid from, and leaves it off when none is picked", () => {
    const paid = readTradeForm({ ...buy, settlementAccountId: "ibkr" }, withCash, TODAY);
    expect(paid.ok && paid.input.row.settlementAccountId).toBe("ibkr");
    const none = readTradeForm({ ...buy, settlementAccountId: "" }, withCash, TODAY);
    expect(none.ok && "settlementAccountId" in none.input.row).toBe(false);
    const missing = readTradeForm(buy, withCash, TODAY);
    expect(missing.ok && "settlementAccountId" in missing.input.row).toBe(false);
  });

  it("refuses an account that isn't a broker cash account", () => {
    const r = readTradeForm({ ...buy, settlementAccountId: "hdfc-savings" }, withCash, TODAY);
    expect(r.ok === false && r.errors.settlementAccountId).toMatch(/broker cash account/);
  });

  it("lets an edit keep the account the trade was saved with, whatever it has become, but refuses a new one off the list", () => {
    const saved = t({ id: "old", settlementAccountId: "hdfc-savings" });
    const keep = readTradeForm({ ...buy, settlementAccountId: "hdfc-savings" }, { ...withCash, trades: [saved] }, TODAY, "old");
    expect(keep.ok && keep.input.row.settlementAccountId).toBe("hdfc-savings");
    const other = readTradeForm({ ...buy, settlementAccountId: "other-bank" }, { ...withCash, trades: [saved] }, TODAY, "old");
    expect(other.ok).toBe(false);
    const adding = readTradeForm({ ...buy, settlementAccountId: "hdfc-savings" }, { ...withCash, trades: [saved] }, TODAY);
    expect(adding.ok).toBe(false);
  });

  it("takes any account when the form wasn't told which are cash accounts", () => {
    expect(readTradeForm({ ...buy, settlementAccountId: "anything" }, ctx(), TODAY).ok).toBe(true);
  });
});

describe("readVestForm", () => {
  const vest = { tradeDate: "2026-11-05", holding: "US:NTAP", sharesVested: "14", fairValue: "118.4", sharesSold: "5", soldAt: "", fxRateToInr: "94.48", broker: "E*TRADE" };

  it("makes two trades on the vest day: the vest in at fair value and the sell-to-cover out at the same value", () => {
    const r = readVestForm(vest, ctx(), TODAY);
    expect(r.ok && r.input.vest).toMatchObject({ tradeType: "Buy", source: "RSU", quantity: 14, price: 118.4, total: 1657.6, tradeDate: "2026-11-05", fxRateToInr: 94.48 });
    expect(r.ok && r.input.cover).toMatchObject({ tradeType: "Sell", source: "RSU", quantity: 5, price: 118.4, total: 592, tradeDate: "2026-11-05" });
  });

  it("sells at its own price when one is given", () => {
    const r = readVestForm({ ...vest, soldAt: "121.79" }, ctx(), TODAY);
    expect(r.ok && r.input.cover).toMatchObject({ price: 121.79, total: 608.95 });
  });

  it("is one trade when nothing was sold for tax", () => {
    const r = readVestForm({ ...vest, sharesSold: "" }, ctx(), TODAY);
    expect(r.ok && r.input.cover).toBeUndefined();
  });

  it("refuses more shares sold for tax than vested", () => {
    const r = readVestForm({ ...vest, sharesSold: "15" }, ctx(), TODAY);
    expect(r.ok === false && r.errors.sharesSold).toMatch(/More shares were sold/);
  });

  it("needs the fair value and the vest day", () => {
    const r = readVestForm({ ...vest, fairValue: "", tradeDate: "" }, ctx(), TODAY);
    expect(r.ok === false && Object.keys(r.errors)).toEqual(expect.arrayContaining(["fairValue", "tradeDate"]));
  });

  it("does not count the two trades being edited twice", () => {
    const stored = [t({ id: "v", source: "RSU", tradeDate: "2026-11-05", quantity: 14 }), t({ id: "c", source: "RSU", tradeType: "Sell", tradeDate: "2026-11-05", quantity: 5 })];
    expect(readVestForm({ ...vest, sharesSold: "6" }, ctx(stored), TODAY, ["v", "c"]).ok).toBe(true);
  });
});

describe("readEsppForm", () => {
  it("is one Buy at the price he paid, with the total worked out", () => {
    const r = readEsppForm({ tradeDate: "2026-05-29", holding: "US:NTAP", quantity: "15", price: "83.9545", fxRateToInr: "95", broker: "E*TRADE" }, ctx(), TODAY);
    expect(r.ok && r.input).toMatchObject({ tradeType: "Buy", source: "ESPP", quantity: 15, price: 83.9545, total: 1259.3175, fxRateToInr: 95 });
  });

  it("needs the price paid", () => {
    const r = readEsppForm({ tradeDate: "2026-05-29", holding: "US:NTAP", quantity: "15", price: "", fxRateToInr: "95", broker: "E*TRADE" }, ctx(), TODAY);
    expect(r.ok === false && r.errors.price).toMatch(/price you paid/);
  });
});

describe("deleteProblem and heldOn", () => {
  const stored = [t({ id: "b", quantity: 10 }), t({ id: "s", tradeType: "Sell", tradeDate: "2025-02-01", quantity: 10 })];

  it("refuses deleting a buy a later sell depends on, and allows deleting the sell", () => {
    expect(deleteProblem(ctx(stored), ["b"])).toMatch(/You held 0 NetApp shares/);
    expect(deleteProblem(ctx(stored), ["s"])).toBeNull();
  });

  it("allows deleting a vest and its sell-to-cover together", () => {
    const vest = [t({ id: "v", source: "RSU", quantity: 14 }), t({ id: "c", source: "RSU", tradeType: "Sell", quantity: 5 })];
    expect(deleteProblem(ctx(vest), ["v", "c"])).toBeNull();
  });

  it("says what was held on a day", () => {
    expect(heldOn(stored, "US", "NTAP", "2025-01-15")).toBe(10);
    expect(heldOn(stored, "US", "NTAP", "2025-02-01")).toBe(0);
  });
});
