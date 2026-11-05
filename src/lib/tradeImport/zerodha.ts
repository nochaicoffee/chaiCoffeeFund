import { parseCsv } from "./csv";
import { indianAssetType } from "./indianFunds";
import { ImportError, readNumber, round6, type ParseResult, type ParsedTrade } from "./types";

/**
 * Zerodha's "Tradebook" CSV (Console, equity). One line per exchange fill, and one order often
 * fills in pieces, so pieces of one order are joined into one trade at the average price. Prices
 * come as 32-bit floats (271.089996 for 271.09), so they are rounded to four places.
 *
 * It states no charges, so every `fee` is 0 and a trade costs a little less here than it did. It
 * has no date range either, so a file can't say what it leaves out: check the range you exported.
 */
export function parseZerodhaTradebook(text: string): ParseResult {
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim() !== ""));
  const header = rows[0]?.map((name) => name.trim());
  if (!header || header[0] !== "symbol" || !header.includes("trade_date") || !header.includes("order_id")) {
    throw new ImportError("This isn't a Zerodha tradebook: its first line should start 'symbol,isin,trade_date'");
  }
  const at = (name: string) => {
    const index = header.indexOf(name);
    if (index < 0) throw new ImportError(`The Zerodha tradebook has no '${name}' column`);
    return index;
  };
  const [symbolAt, isinAt, dateAt, exchangeAt, segmentAt, typeAt, auctionAt, qtyAt, priceAt, orderAt] = [
    "symbol", "isin", "trade_date", "exchange", "segment", "trade_type", "auction", "quantity", "price", "order_id",
  ].map(at);

  const orders = new Map<string, { trade: ParsedTrade; quantity: number; amount: number }>();
  for (const row of rows.slice(1)) {
    if (row.length < header.length) throw new ImportError(`Zerodha line for ${row[0]} is cut short: ${row.length} fields, ${header.length} expected`);
    const symbol = row[symbolAt].trim().toUpperCase();
    const what = `Zerodha line for ${symbol} on ${row[dateAt]}`;
    if (row[segmentAt] !== "EQ") throw new ImportError(`${what}: segment ${JSON.stringify(row[segmentAt])}, and only EQ is read`);
    if (row[exchangeAt] !== "NSE") throw new ImportError(`${what}: exchange ${JSON.stringify(row[exchangeAt])}, and only NSE is read`);
    if (row[auctionAt] === "true") throw new ImportError(`${what}: an auction trade, which this reader doesn't handle`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row[dateAt])) throw new ImportError(`${what}: the date should look like 2026-05-13`);
    const tradeType = row[typeAt] === "buy" ? "Buy" : row[typeAt] === "sell" ? "Sell" : undefined;
    if (!tradeType) throw new ImportError(`${what}: the trade type should be buy or sell, not ${JSON.stringify(row[typeAt])}`);
    const quantity = readNumber(row[qtyAt], `${what}: quantity`);
    const price = Math.round(readNumber(row[priceAt], `${what}: price`) * 10_000) / 10_000;
    if (quantity <= 0) throw new ImportError(`${what}: the quantity must be above zero`);
    const assetType = indianAssetType(symbol, row[isinAt].trim());
    if (!assetType) throw new ImportError(`${what}: ${symbol} (${row[isinAt]}) looks like a fund and isn't known as an ETF, gold fund or other. Add it to INDIAN_FUNDS in src/lib/tradeImport/indianFunds.ts`);

    const amount = quantity * price;
    const key = [row[orderAt], symbol, tradeType, row[dateAt]].join("|");
    const order = orders.get(key);
    if (order) {
      order.quantity += quantity;
      order.amount += amount;
      continue;
    }
    orders.set(key, { quantity, amount, trade: { tradeDate: row[dateAt], symbol, market: "IND", currency: "INR", tradeType, source: "Market", assetType, quantity, price, amount, fee: 0 } });
  }

  const trades = [...orders.values()].map(({ trade, quantity, amount }) => ({
    ...trade,
    quantity: round6(quantity),
    amount: round6(amount),
    price: Math.round((amount / quantity) * 10_000) / 10_000,
  }));
  return { trades, skipped: [] };
}
