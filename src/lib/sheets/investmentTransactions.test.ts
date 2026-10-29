import { describe, expect, it } from "vitest";
import {
  checkInvestmentTransaction,
  createInvestmentTransactionSchema,
  investmentTransactionRowSchema,
  updateInvestmentTransactionSchema,
} from "./investmentTransactions";

const indBuy = {
  tradeDate: "2026-05-14",
  symbol: "INFY",
  market: "IND",
  currency: "INR",
  tradeType: "Buy",
  source: "Market",
  quantity: 10,
  price: 1500,
  total: 15_000,
  assetType: "Equity",
  broker: "Zerodha",
};

const usBuy = { ...indBuy, symbol: "NTAP", market: "US", currency: "USD", source: "RSU", price: 100, total: 1000, broker: "Schwab", fxRateToInr: 83.2 };

const problems = (input: unknown) => createInvestmentTransactionSchema.safeParse(input).error?.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) ?? [];

describe("createInvestmentTransactionSchema", () => {
  it("accepts an Indian trade with no rate, and a US trade with one", () => {
    expect(createInvestmentTransactionSchema.safeParse(indBuy).success).toBe(true);
    expect(createInvestmentTransactionSchema.safeParse(usBuy).success).toBe(true);
  });

  it("accepts fractional units, and a free bonus share at price 0", () => {
    expect(createInvestmentTransactionSchema.safeParse({ ...indBuy, quantity: 12.345, assetType: "Mutual-Fund" }).success).toBe(true);
    expect(createInvestmentTransactionSchema.safeParse({ ...indBuy, price: 0, total: 0 }).success).toBe(true);
  });

  it("needs a US trade's rate, and says why", () => {
    const noRate = { ...usBuy, fxRateToInr: undefined };
    expect(problems(noRate)).toEqual(["fxRateToInr: A US trade needs its USD→INR rate on the trade date"]);
  });

  it("refuses a rate on an Indian trade, which nothing would use", () => {
    expect(problems({ ...indBuy, fxRateToInr: 83 })).toEqual(["fxRateToInr: Only a US trade has an exchange rate: leave it blank for an IND trade"]);
  });

  it("refuses a currency that disagrees with the market, either way round", () => {
    expect(problems({ ...indBuy, currency: "USD" })).toEqual(["currency: An IND trade is in INR and a US trade is in USD"]);
    expect(problems({ ...usBuy, currency: "INR" })).toEqual(["currency: An IND trade is in INR and a US trade is in USD"]);
  });

  it("refuses a rate of zero, which would cost the shares at nothing", () => {
    expect(createInvestmentTransactionSchema.safeParse({ ...usBuy, fxRateToInr: 0 }).success).toBe(false);
  });

  it("refuses a quantity of zero or less", () => {
    expect(createInvestmentTransactionSchema.safeParse({ ...indBuy, quantity: 0 }).success).toBe(false);
    expect(createInvestmentTransactionSchema.safeParse({ ...indBuy, quantity: -5 }).success).toBe(false);
  });

  it("only takes an asset type from the fixed list, with its Sheet spelling", () => {
    expect(createInvestmentTransactionSchema.safeParse({ ...indBuy, assetType: "Debt-Fund" }).success).toBe(true);
    expect(createInvestmentTransactionSchema.safeParse({ ...indBuy, assetType: "India-Equity" }).success).toBe(false);
    expect(createInvestmentTransactionSchema.safeParse({ ...indBuy, assetType: "equity" }).success).toBe(false);
    expect(createInvestmentTransactionSchema.safeParse({ ...indBuy, assetType: "RSU" }).success).toBe(false);
  });
});

describe("investmentTransactionRowSchema", () => {
  it("reads a good row, and leaves out one that breaks a rule rather than costing it wrongly", () => {
    expect(investmentTransactionRowSchema.safeParse({ ...usBuy, id: "t1" }).success).toBe(true);
    expect(investmentTransactionRowSchema.safeParse({ ...indBuy, currency: "USD", id: "t2" }).success).toBe(false);
  });
});

describe("checkInvestmentTransaction", () => {
  it("passes a good row and names the first broken rule on a bad one", () => {
    expect(checkInvestmentTransaction({ ...usBuy, id: "t1" } as never)).toBeNull();
    expect(checkInvestmentTransaction({ ...usBuy, id: "t1", fxRateToInr: undefined } as never)).toBe("A US trade needs its USD→INR rate on the trade date");
  });

  it("catches what a partial update can't see: switching a row to US without a rate", () => {
    // An update of just { market: "US", currency: "USD" } is valid by itself, but merged over an Indian row it has no rate.
    expect(updateInvestmentTransactionSchema.safeParse({ market: "US", currency: "USD" }).success).toBe(true);
    expect(checkInvestmentTransaction({ ...indBuy, id: "t1", market: "US", currency: "USD" } as never)).toBe("A US trade needs its USD→INR rate on the trade date");
  });
});

describe("updateInvestmentTransactionSchema", () => {
  it("lets an update clear the rate, which switching a row back to IND needs", () => {
    expect(updateInvestmentTransactionSchema.safeParse({ market: "IND", currency: "INR", fxRateToInr: "" }).success).toBe(true);
    expect(updateInvestmentTransactionSchema.safeParse({ fxRateToInr: 0 }).success).toBe(false);
  });

  it("a cleared rate overrides the stored one as unset, so the merged row passes its whole-row check", () => {
    const patch = updateInvestmentTransactionSchema.parse({ market: "IND", currency: "INR", fxRateToInr: "" });
    expect(Object.hasOwn(patch, "fxRateToInr")).toBe(true);
    const merged = { ...usBuy, id: "t1", ...patch };
    expect(merged.fxRateToInr).toBeUndefined();
    expect(checkInvestmentTransaction(merged as never)).toBeNull();
  });

  it("leaves the stored rate alone when the update doesn't mention it", () => {
    expect(Object.hasOwn(updateInvestmentTransactionSchema.parse({ quantity: 5 }), "fxRateToInr")).toBe(false);
  });
});
