import type { InvestmentAssetType, InvestmentCurrency, InvestmentMarket, InvestmentSource, TradeType } from "../sheets/types";

/**
 * One trade as a broker's file states it, before the fee is folded in and before it has a
 * USD→INR rate. `amount` is quantity × price as the broker reports it (always positive) and
 * `fee` is what the broker charged on top of it (positive is a cost, negative a rebate).
 */
export interface ParsedTrade {
  tradeDate: string;
  symbol: string;
  market: InvestmentMarket;
  currency: InvestmentCurrency;
  tradeType: TradeType;
  source: InvestmentSource;
  assetType: InvestmentAssetType;
  quantity: number;
  price: number;
  amount: number;
  fee: number;
}

/** Lines the reader looked at and left out on purpose (deposits, dividends, rejected orders), so a person can see nothing was lost quietly. */
export interface SkippedLines {
  what: string;
  count: number;
}

export interface ParseResult {
  trades: ParsedTrade[];
  skipped: SkippedLines[];
}

/** A file this reader can't trust: the message is plain language for whoever ran the import. */
export class ImportError extends Error {}

export function countSkipped(counts: Map<string, number>): SkippedLines[] {
  return [...counts].map(([what, count]) => ({ what, count }));
}

export function bump(counts: Map<string, number>, what: string): void {
  counts.set(what, (counts.get(what) ?? 0) + 1);
}

/** A number in a broker's file: "1,084.95" is fine, "-" and blanks are not. */
export function readNumber(raw: unknown, what: string): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/,/g, "").trim();
    if (cleaned !== "" && Number.isFinite(Number(cleaned))) return Number(cleaned);
  }
  throw new ImportError(`${what} should be a number, but it is ${JSON.stringify(raw)}`);
}

/** Money in floats leaves dust (964.7280450000001); six places is far finer than any broker's paise or cents. */
export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

const US_ETFS = new Set(["VOO", "VTI", "SPY", "QQQ", "IVV", "VT", "VEA", "VWO", "SCHD", "SCHG", "VGT", "XLK", "ARKK", "SMH", "SOXX"]);

/** A US ticker is a stock unless it is a well-known fund; a fund this list misses can be corrected on the row. */
export function usAssetType(symbol: string): InvestmentAssetType {
  return US_ETFS.has(symbol) ? "ETF" : "Equity";
}
