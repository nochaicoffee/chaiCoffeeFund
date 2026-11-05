import type { InvestmentAssetType } from "../sheets/types";

/**
 * Indian funds and ETFs by NSE symbol. An ISIN starting INF is a fund of some kind and a broker's
 * file doesn't say which, so one not listed here fails the import rather than being guessed as a
 * share (an `INE` ISIN is a company's own share).
 */
export const INDIAN_FUNDS: Record<string, InvestmentAssetType> = {
  NIFTYBEES: "ETF",
  GOLDCASE: "Gold",
};

/** The holding type of an Indian instrument from its ISIN and symbol, or a message saying what to add. */
export function indianAssetType(symbol: string, isin: string): InvestmentAssetType | undefined {
  if (isin.startsWith("INE")) return "Equity";
  return INDIAN_FUNDS[symbol];
}
