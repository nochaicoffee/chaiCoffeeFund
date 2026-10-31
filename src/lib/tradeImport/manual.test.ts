import { describe, expect, it } from "vitest";
import { parseManualTrades } from "./manual";

const good = { tradeDate: "2026-04-06", symbol: "ntap", market: "US", tradeType: "Sell", source: "ESPP", assetType: "Equity", quantity: 13, price: 103.02, amount: 1339.26, fee: 0.03 };

describe("parseManualTrades", () => {
  it("reads a trade, upper-casing the symbol and setting the currency from the market", () => {
    expect(parseManualTrades([good]).trades).toEqual([{ ...good, symbol: "NTAP", currency: "USD" }]);
  });

  it("sets INR for an Indian trade", () => {
    expect(parseManualTrades([{ ...good, market: "IND" }]).trades[0].currency).toBe("INR");
  });

  it.each([
    ["a list that isn't one", { good: 1 }, /JSON list/],
    ["a bad date", [{ ...good, tradeDate: "06/04/2026" }], /tradeDate/],
    ["a bad market", [{ ...good, market: "UK" }], /market/],
    ["a bad side", [{ ...good, tradeType: "Hold" }], /tradeType/],
    ["a bad source", [{ ...good, source: "Gift" }], /source/],
    ["a bad asset type", [{ ...good, assetType: "Bond" }], /assetType/],
    ["a zero quantity", [{ ...good, quantity: 0, amount: 0 }], /above zero/],
    ["an amount that isn't quantity × price", [{ ...good, amount: 5000 }], /doesn't match/],
    ["a missing fee", [{ ...good, fee: undefined }], /fee/],
  ])("fails on %s", (_name, input, message) => {
    expect(() => parseManualTrades(input)).toThrow(message);
  });
});
