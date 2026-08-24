import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { InvestmentTransaction } from "./types";

export const investmentTransactionsRepository = createRepository<InvestmentTransaction>({
  sheetName: "InvestmentTransactions",
  columns: [
    "id",
    "tradeDate",
    "symbol",
    "market",
    "currency",
    "tradeType",
    "source",
    "quantity",
    "price",
    "total",
    "assetType",
    "broker",
    "settlementAccountId",
    "fxRateToInr",
  ],
  dateColumns: ["tradeDate"],
});

export const createInvestmentTransactionSchema = z
  .object({
    tradeDate: isoDate,
    symbol: nonEmptyString,
    market: z.enum(["IND", "US"]),
    currency: z.enum(["INR", "USD"]),
    tradeType: z.enum(["Buy", "Sell"]),
    source: z.enum(["Market", "RSU", "ESPP"]),
    quantity: nonNegativeNumber,
    price: nonNegativeNumber,
    total: nonNegativeNumber,
    assetType: nonEmptyString,
    broker: nonEmptyString,
    settlementAccountId: nonEmptyString.optional(),
    fxRateToInr: nonNegativeNumber.optional(),
  })
  .refine((data) => data.market !== "US" || data.fxRateToInr !== undefined, {
    message: "fxRateToInr is required for US-market transactions",
    path: ["fxRateToInr"],
  });

export const updateInvestmentTransactionSchema = z.object({
  tradeDate: isoDate.optional(),
  symbol: nonEmptyString.optional(),
  market: z.enum(["IND", "US"]).optional(),
  currency: z.enum(["INR", "USD"]).optional(),
  tradeType: z.enum(["Buy", "Sell"]).optional(),
  source: z.enum(["Market", "RSU", "ESPP"]).optional(),
  quantity: nonNegativeNumber.optional(),
  price: nonNegativeNumber.optional(),
  total: nonNegativeNumber.optional(),
  assetType: nonEmptyString.optional(),
  broker: nonEmptyString.optional(),
  settlementAccountId: nonEmptyString.optional(),
  fxRateToInr: nonNegativeNumber.optional(),
});
