import { ImportError, readNumber, round6, type ParseResult, type ParsedTrade } from "./types";
import { INVESTMENT_ASSET_TYPES, type InvestmentAssetType } from "../sheets/types";

const SOURCES = ["Market", "RSU", "ESPP"] as const;

/**
 * Trades written by hand into a JSON list, for what no export gives: a broker's web page or a PDF
 * of it. Each item: `tradeDate`, `symbol`, `market` ("US" or "IND"), `tradeType`, `source`,
 * `assetType`, `quantity`, `price`, `amount` (quantity × price as the broker states it, before the
 * fee) and `fee` (what was charged on top; 0 if none). Checked like every other reader, so a typo
 * fails the import instead of reaching the Sheet.
 */
export function parseManualTrades(json: unknown): ParseResult {
  if (!Array.isArray(json)) throw new ImportError("A manual trades file should be a JSON list of trades");
  const trades = json.map((item, index): ParsedTrade => {
    const at = `Manual trade ${index + 1}`;
    if (typeof item !== "object" || item === null) throw new ImportError(`${at}: should be an object`);
    const t = item as Record<string, unknown>;
    if (typeof t.tradeDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(t.tradeDate)) throw new ImportError(`${at}: tradeDate should look like 2026-04-06`);
    if (typeof t.symbol !== "string" || t.symbol.trim() === "") throw new ImportError(`${at}: symbol is missing`);
    if (t.market !== "US" && t.market !== "IND") throw new ImportError(`${at}: market should be "US" or "IND"`);
    if (t.tradeType !== "Buy" && t.tradeType !== "Sell") throw new ImportError(`${at}: tradeType should be "Buy" or "Sell"`);
    if (!SOURCES.includes(t.source as (typeof SOURCES)[number])) throw new ImportError(`${at}: source should be ${SOURCES.join(", ")}`);
    if (!INVESTMENT_ASSET_TYPES.includes(t.assetType as InvestmentAssetType)) throw new ImportError(`${at}: assetType should be one of ${INVESTMENT_ASSET_TYPES.join(", ")}`);
    const quantity = readNumber(t.quantity, `${at}: quantity`);
    const price = readNumber(t.price, `${at}: price`);
    const amount = readNumber(t.amount, `${at}: amount`);
    const fee = readNumber(t.fee, `${at}: fee`);
    if (quantity <= 0 || amount < 0) throw new ImportError(`${at}: the quantity must be above zero and the amount not negative`);
    if (Math.abs(quantity * price - amount) > Math.max(0.05, amount * 0.002)) throw new ImportError(`${at}: quantity × price (${(quantity * price).toFixed(2)}) doesn't match the amount (${amount})`);
    return {
      tradeDate: t.tradeDate, symbol: t.symbol.trim().toUpperCase(), market: t.market, currency: t.market === "US" ? "USD" : "INR", tradeType: t.tradeType,
      source: t.source as ParsedTrade["source"], assetType: t.assetType as InvestmentAssetType, quantity, price, amount: round6(amount), fee: round6(fee),
    };
  });
  return { trades, skipped: [] };
}
