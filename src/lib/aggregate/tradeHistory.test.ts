import { describe, expect, it } from "vitest";
import type { InvestmentTransaction } from "../sheets/types";
import { financialYear, howItCameIn, tradeEntries, tradeTotals, vestCovers, withAccountNames } from "./tradeHistory";

const t = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2026-01-01", symbol: "XYZ", market: "IND", currency: "INR", tradeType: "Buy", source: "Market",
  quantity: 10, price: 100, total: 1000, assetType: "Equity", broker: "B", ...o,
});
const us = (o: Partial<InvestmentTransaction>) => t({ symbol: "NTAP", market: "US", currency: "USD", fxRateToInr: 90, ...o });

describe("financialYear", () => {
  it("starts on April 1", () => {
    expect(financialYear("2026-03-31")).toBe(2025);
    expect(financialYear("2026-04-01")).toBe(2026);
    expect(financialYear("2026-12-31")).toBe(2026);
    expect(financialYear("2027-01-15")).toBe(2026);
  });
});

describe("tradeEntries", () => {
  const rows = [
    us({ id: "vest", tradeDate: "2026-02-12", source: "RSU", quantity: 14, price: 100, total: 1400 }),
    us({ id: "cover", tradeDate: "2026-02-12", source: "RSU", tradeType: "Sell", quantity: 5, price: 100, total: 500 }),
    us({ id: "espp", tradeDate: "2026-05-15", source: "ESPP", quantity: 10, price: 80, total: 800, fxRateToInr: 91 }),
    us({ id: "sale", tradeDate: "2026-06-01", tradeType: "Sell", quantity: 4, price: 120, total: 480, fxRateToInr: 92 }),
    t({ id: "buy", tradeDate: "2026-06-01", quantity: 2, total: 200 }),
  ];
  const entries = tradeEntries(rows);

  it("makes a vest and its same-day sell-to-cover one entry, opened by the vest", () => {
    const vest = entries.find((e) => e.kind === "rsu")!;
    expect(vest).toMatchObject({ id: "vest", ids: ["vest", "cover"], quantity: 14, coverQuantity: 5, inInr: 126000, outInr: 45000 });
    expect(vest.after.quantityAfter).toBe(9);
    expect(entries.some((e) => e.id === "cover")).toBe(false);
  });

  it("sorts newest first, a sale above a buy on the same day", () => {
    expect(entries.map((e) => e.id)).toEqual(["sale", "buy", "espp", "vest"]);
  });

  it("counts an ESPP purchase as money in at what he paid and a sale as money out, with what it made at average cost", () => {
    expect(entries.find((e) => e.id === "espp")).toMatchObject({ kind: "espp", inInr: 72800, outInr: 0, gainInr: null });
    // 19 shares held cost ₹81,000 + ₹72,800 = ₹1,53,800; 4 sold take out 4/19 of it.
    const sale = entries.find((e) => e.id === "sale")!;
    expect(sale.kind).toBe("sell");
    expect(sale.outInr).toBeCloseTo(44160, 6);
    expect(sale.gainInr).toBeCloseTo(44160 - (153800 * 4) / 19, 6);
    expect(sale.after.quantityAfter).toBe(15);
  });

  it("leaves a sale of RSU shares on another day as a sale, not a cover", () => {
    const [e] = tradeEntries([us({ id: "v", source: "RSU", quantity: 10, total: 1000 }), us({ id: "s", tradeDate: "2026-04-06", source: "RSU", tradeType: "Sell", quantity: 3, total: 360 })]);
    expect(e).toMatchObject({ id: "s", kind: "sell", coverQuantity: 0 });
  });

  it("carries a sell of more than was held", () => {
    const [sale] = tradeEntries([t({ id: "b", quantity: 40, total: 4000 }), t({ id: "s", tradeDate: "2026-02-01", tradeType: "Sell", quantity: 60, total: 9000 })]);
    expect(sale).toMatchObject({ id: "s", oversoldBy: 20 });
    expect(sale.after.quantityAfter).toBe(0);
  });
});

describe("tradeTotals", () => {
  it("adds money in and out, what sales made, and counts sales apart from sell-to-covers", () => {
    const entries = tradeEntries([
      us({ id: "vest", source: "RSU", quantity: 14, total: 1400 }),
      us({ id: "cover", source: "RSU", tradeType: "Sell", quantity: 5, total: 600 }),
      t({ id: "b", tradeDate: "2026-02-01", quantity: 10, total: 1000 }),
      t({ id: "s", tradeDate: "2026-03-01", tradeType: "Sell", quantity: 5, total: 800 }),
    ]);
    const totals = tradeTotals(entries);
    expect(totals).toMatchObject({ inInr: 127000, outInr: 54800, netInr: 72200, trades: 3, sales: 1, covers: 1 });
    // Cover: ₹54,000 against 5 × ₹9,000 = ₹45,000 → ₹9,000. Sale: ₹800 against 5 × ₹100 → ₹300.
    expect(totals.gainInr).toBeCloseTo(9300, 6);
  });
});

describe("howItCameIn", () => {
  it("splits the shares by how they came, with what a share cost each way in rupees on the day", () => {
    const came = howItCameIn([
      us({ id: "e1", source: "ESPP", quantity: 10, total: 800, fxRateToInr: 90 }),
      us({ id: "e2", source: "ESPP", quantity: 10, total: 1000, fxRateToInr: 90 }),
      us({ id: "v", source: "RSU", quantity: 14, total: 1400, fxRateToInr: 90 }),
      us({ id: "c", source: "RSU", tradeType: "Sell", quantity: 5, total: 500 }),
    ]);
    expect(came.sources).toEqual([
      { source: "ESPP", quantity: 20, avgCostInr: 8100 },
      { source: "RSU", quantity: 14, avgCostInr: 9000 },
    ]);
    expect(came.sold).toBe(5);
  });
});

describe("two grants vesting on one day", () => {
  const rows = [
    us({ id: "v1", tradeDate: "2027-02-15", source: "RSU", quantity: 57, total: 5700 }),
    us({ id: "v2", tradeDate: "2027-02-15", source: "RSU", quantity: 9, total: 900 }),
    us({ id: "c1", tradeDate: "2027-02-15", source: "RSU", tradeType: "Sell", quantity: 18, total: 1800 }),
    us({ id: "c2", tradeDate: "2027-02-15", source: "RSU", tradeType: "Sell", quantity: 3, total: 300 }),
  ];
  it("pairs each vest with its own cover", () => {
    const pairs = vestCovers(rows);
    expect(pairs.get("v1")?.id).toBe("c1");
    expect(pairs.get("v2")?.id).toBe("c2");
  });
  it("shows the day's end on both rows, never a state in between", () => {
    const entries = tradeEntries(rows);
    expect(entries.map((e) => [e.id, e.coverQuantity, e.after.quantityAfter])).toEqual([
      ["v1", 18, 45],
      ["v2", 3, 45],
    ]);
  });
});

describe("a buy and a vest on the same day", () => {
  it("shows the day's end whichever comes first in the list", () => {
    const entries = tradeEntries([
      us({ id: "b", tradeDate: "2026-05-15", quantity: 5, total: 500 }),
      us({ id: "v", tradeDate: "2026-05-15", source: "RSU", quantity: 14, total: 1400 }),
      us({ id: "c", tradeDate: "2026-05-15", source: "RSU", tradeType: "Sell", quantity: 5, total: 500 }),
    ]);
    expect(entries.every((e) => e.after.quantityAfter === 14)).toBe(true);
  });
});

describe("withAccountNames", () => {
  it("names a linked trade by its account as it is now, and leaves an unlinked one as saved", () => {
    const [linked, loose] = withAccountNames([us({ id: "a", broker: "INDmoney (DriveWealth)", settlementAccountId: "acc" }), us({ id: "b", broker: "Old name" })], [{ id: "acc", name: "IND Money - Prathik" }]);
    expect(linked.broker).toBe("IND Money - Prathik");
    expect(loose.broker).toBe("Old name");
  });
});
