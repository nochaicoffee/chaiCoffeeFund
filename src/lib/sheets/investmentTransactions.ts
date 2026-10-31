import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, clearableToUnset, isoDate, nonEmptyString, nonNegativeNumber, positiveNumber, rowRules } from "./validation";
import { INVESTMENT_ASSET_TYPES, type InvestmentTransaction } from "./types";

/** A trade's fields. The repository reads column types from a plain object, so the rules across fields are added below. */
const investmentTransactionFields = z.object({
  tradeDate: isoDate,
  symbol: nonEmptyString,
  market: z.enum(["IND", "US"]),
  currency: z.enum(["INR", "USD"]),
  tradeType: z.enum(["Buy", "Sell"]),
  source: z.enum(["Market", "RSU", "ESPP"]),
  /** Shares or fund units: fractions are fine, zero and below aren't. */
  quantity: positiveNumber,
  /** Zero is allowed: shares that cost nothing (a bonus issue) are a real trade. */
  price: nonNegativeNumber,
  total: nonNegativeNumber,
  assetType: z.enum(INVESTMENT_ASSET_TYPES),
  broker: nonEmptyString,
  settlementAccountId: nonEmptyString.optional(),
  fxRateToInr: positiveNumber.optional(),
});

const CURRENCY_OF_MARKET = { IND: "INR", US: "USD" } as const;

const tradeRules = rowRules<Pick<InvestmentTransaction, "market" | "currency" | "fxRateToInr">>([
  {
    // `currency` is derivable from `market`, so a row that disagrees would be costed in the wrong money.
    path: "currency",
    message: "An IND trade is in INR and a US trade is in USD",
    broken: (row) => row.currency !== CURRENCY_OF_MARKET[row.market],
  },
  {
    // A US trade needs its USD→INR rate on the trade date, captured once (ADR 0003).
    path: "fxRateToInr",
    message: "A US trade needs its USD→INR rate on the trade date",
    broken: (row) => row.market === "US" && row.fxRateToInr === undefined,
  },
  {
    path: "fxRateToInr",
    message: "Only a US trade has an exchange rate: leave it blank for an IND trade",
    broken: (row) => row.market === "IND" && row.fxRateToInr !== undefined,
  },
]);

/** The same rules on a whole row, which the repository runs on each new row and on the row after an update is merged over the stored one. */
export const checkInvestmentTransaction = tradeRules.check;

export const createInvestmentTransactionSchema = investmentTransactionFields.superRefine(tradeRules.refine);

/**
 * A partial update, merged over the stored row. "" clears an optional field, which an update
 * from IND to US (or back) needs: the rate has to be set or blanked with the market.
 */
export const updateInvestmentTransactionSchema = investmentTransactionFields.partial().extend({
  settlementAccountId: clearable(nonEmptyString).optional(),
  fxRateToInr: clearableToUnset(positiveNumber).optional(),
});

/** A row as read back from the Sheet: a valid create, plus its id. */
export const investmentTransactionRowSchema = investmentTransactionFields.extend({ id: nonEmptyString }).superRefine(tradeRules.refine);

/** The InvestmentTransactions tab's columns, in order. */
export const INVESTMENT_TRANSACTION_COLUMNS: (keyof InvestmentTransaction)[] = [
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
];

export const investmentTransactionsRepository = createRepository<InvestmentTransaction>({
  sheetName: "InvestmentTransactions",
  columns: INVESTMENT_TRANSACTION_COLUMNS,
  dateColumns: ["tradeDate"],
  schema: investmentTransactionRowSchema,
  check: checkInvestmentTransaction,
});
