import { describe, expect, it } from "vitest";
import type { InvestmentTransaction } from "@/lib/sheets/types";
import { editTarget, tradeFormsData } from "./tradeFormsData";

const t = (o: Partial<InvestmentTransaction>): InvestmentTransaction => ({
  id: "t", tradeDate: "2025-02-15", symbol: "NTAP", market: "US", currency: "USD", tradeType: "Buy", source: "Market", quantity: 1, price: 1, total: 1, assetType: "Equity", broker: "E*TRADE", fxRateToInr: 85, ...o,
});
const trades = [
  t({ id: "vest", source: "RSU" }),
  t({ id: "cover", source: "RSU", tradeType: "Sell" }),
  t({ id: "lone", source: "RSU", tradeDate: "2025-08-15" }),
  t({ id: "espp", source: "ESPP", tradeDate: "2025-05-30" }),
  t({ id: "esppsell", source: "ESPP", tradeType: "Sell", tradeDate: "2026-04-06" }),
  t({ id: "mkt", broker: "Groww" }),
];

describe("editTarget", () => {
  it("opens an RSU vest with its sell-to-cover from either of the two trades", () => {
    expect(editTarget(trades, "vest")).toEqual({ kind: "vest", ids: ["vest", "cover"], vest: "vest", cover: "cover" });
    expect(editTarget(trades, "cover")).toEqual({ kind: "vest", ids: ["vest", "cover"], vest: "vest", cover: "cover" });
  });

  it("opens a vest with nothing sold for tax on its own", () => {
    expect(editTarget(trades, "lone")).toEqual({ kind: "vest", ids: ["lone"], vest: "lone" });
  });

  it("opens an ESPP purchase in the ESPP form, and an ESPP sale and a market trade in the trade form", () => {
    expect(editTarget(trades, "espp")).toEqual({ kind: "espp", ids: ["espp"] });
    expect(editTarget(trades, "esppsell")).toEqual({ kind: "trade", ids: ["esppsell"] });
    expect(editTarget(trades, "mkt")).toEqual({ kind: "trade", ids: ["mkt"] });
  });

  it("is null for a trade that isn't there", () => {
    expect(editTarget(trades, "nope")).toBeNull();
  });
});

describe("tradeFormsData", () => {
  it("lists the holdings by name and the brokers already used, sorted", () => {
    const data = tradeFormsData(trades, [{ id: "1", symbol: "NTAP", market: "US", name: "NetApp", assetType: "Equity", priceTicker: "NTAP" }, { id: "2", symbol: "AMD", market: "US", name: "Advanced Micro", assetType: "Equity", priceTicker: "AMD" }], "2026-11-06");
    expect(data.instruments.map((i) => i.name)).toEqual(["Advanced Micro", "NetApp"]);
    expect(data.brokers).toEqual(["E*TRADE", "Groww"]);
    expect(data.today).toBe("2026-11-06");
  });
});
