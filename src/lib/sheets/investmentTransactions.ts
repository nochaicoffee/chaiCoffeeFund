import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { InvestmentTransaction } from "./types";

const investmentTransactionFields = z.object({
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
});

/** A US-market trade needs its USD→INR rate, captured once on the trade date. */
function requireFxRateForUs<T extends z.ZodType<{ market: string; fxRateToInr?: number }>>(schema: T): T {
  return schema.refine((data) => data.market !== "US" || data.fxRateToInr !== undefined, {
    message: "fxRateToInr is required for US-market transactions",
    path: ["fxRateToInr"],
  }) as T;
}

export const createInvestmentTransactionSchema = requireFxRateForUs(investmentTransactionFields);

export const updateInvestmentTransactionSchema = investmentTransactionFields.partial();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const investmentTransactionRowSchema = requireFxRateForUs(investmentTransactionFields.extend({ id: nonEmptyString }));

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
  schema: investmentTransactionRowSchema,
});
