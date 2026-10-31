import type { InvestmentAssetType } from "../sheets/types";
import { indianAssetType } from "./indianFunds";
import { bump, countSkipped, ImportError, readNumber, round6, type ParseResult, type ParsedTrade } from "./types";

type Cell = string | number | boolean | Date | null | undefined;

const HEADER = ["Stock name", "Symbol", "ISIN", "Type", "Quantity", "Value", "Exchange", "Exchange Order Id", "Execution date and time", "Order status"];

/** "15-05-2026 03:30 PM" → "2026-05-15". */
function readDate(raw: unknown, what: string): string {
  const match = /^(\d{2})-(\d{2})-(\d{4})\b/.exec(String(raw ?? "").trim());
  if (!match) throw new ImportError(`${what}: can't read the date ${JSON.stringify(raw)}`);
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Groww's "Order history for stocks" spreadsheet. It has a quantity and a traded value but no
 * price column, so the price is value ÷ quantity, and no charges, so every `fee` is 0 and a trade
 * costs a little less here than it did. Shares transferred in from another broker are left out, since the broker they were bought at has the real trade. Pieces of one exchange order are joined into one trade.
 */
export function parseGrowwOrders(rows: Cell[][]): ParseResult {
  const headerAt = rows.findIndex((row) => row[0] === "Stock name");
  if (headerAt < 0) throw new ImportError("This isn't a Groww order history: there is no 'Stock name' header row");
  const found = rows[headerAt].slice(0, HEADER.length).map((cell) => String(cell ?? "").trim());
  if (found.join("|") !== HEADER.join("|")) throw new ImportError(`Groww's columns have changed: expected ${HEADER.join(", ")} but found ${found.join(", ")}`);

  const skipped = new Map<string, number>();
  const orders = new Map<string, { trade: ParsedTrade; quantity: number; amount: number }>();
  for (const row of rows.slice(headerAt + 1)) {
    if (row.every((cell) => cell === null || cell === undefined || String(cell).trim() === "")) continue;
    const [, symbolCell, isin, side, quantityCell, valueCell, exchange, orderId, when, status] = row;
    const symbol = String(symbolCell).trim().toUpperCase();
    const what = `Groww order for ${symbol} on ${String(when)}`;
    if (String(status).trim() !== "Executed") {
      bump(skipped, `${String(status).trim().toLowerCase()} orders`);
      continue;
    }
    // A real exchange order id is all digits. Shares moved in from another broker are listed as an
    // "order" with a made-up id like 664317_2026-05-15_DebtLS; the real purchase is in that broker's file.
    const id = String(orderId ?? "").trim();
    if (/^\d+_\d{4}-\d{2}-\d{2}_\w+$/.test(id)) {
      bump(skipped, "transfers in from another broker");
      continue;
    }
    if (!/^\d+$/.test(id)) throw new ImportError(`${what}: the exchange order id ${JSON.stringify(id)} is neither an exchange id nor the made-up id of a transfer-in, so it isn't guessed at`);
    if (exchange !== "NSE") throw new ImportError(`${what}: exchange ${JSON.stringify(exchange)}, and only NSE is read`);
    const tradeType = side === "BUY" ? "Buy" : side === "SELL" ? "Sell" : undefined;
    if (!tradeType) throw new ImportError(`${what}: the type should be BUY or SELL, not ${JSON.stringify(side)}`);
    const quantity = readNumber(quantityCell, `${what}: quantity`);
    const amount = readNumber(valueCell, `${what}: value`);
    if (quantity <= 0 || amount < 0) throw new ImportError(`${what}: the quantity must be above zero and the value not negative`);

    const isinText = String(isin).trim();
    const assetType: InvestmentAssetType | undefined = indianAssetType(symbol, isinText);
    if (!assetType) throw new ImportError(`${what}: ${symbol} (${isinText}) looks like a fund and isn't known as an ETF, gold fund or other. Add it to INDIAN_FUNDS in src/lib/tradeImport/indianFunds.ts`);

    const tradeDate = readDate(when, what);
    const key = [String(orderId), symbol, tradeType, tradeDate].join("|");
    const order = orders.get(key);
    if (order) {
      order.quantity += quantity;
      order.amount += amount;
      continue;
    }
    orders.set(key, {
      quantity,
      amount,
      trade: { tradeDate, symbol, market: "IND", currency: "INR", tradeType, source: "Market", assetType, quantity, price: 0, amount, fee: 0 },
    });
  }

  const trades = [...orders.values()].map(({ trade, quantity, amount }) => ({
    ...trade,
    quantity: round6(quantity),
    amount: round6(amount),
    price: Math.round((amount / quantity) * 10_000) / 10_000,
  }));
  return { trades, skipped: countSkipped(skipped) };
}
