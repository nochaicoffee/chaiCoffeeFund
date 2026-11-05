import { parseCsv } from "./csv";
import { ImportError, readNumber, round6, type ParseResult, type ParsedTrade } from "./types";
import { INDIAN_FUNDS } from "./indianFunds";

/**
 * FYERS names the same company differently on different days (`NIP IND ETF NIFTY BEES` and
 * `NIPPON INDIA ETF NIFTY BEES`, `JIOFIN` and `Jio Financial Services Limited`) and its "Symbol
 * code" column repeats the name, so there is no ticker in the file. These are the NSE tickers for
 * the names seen so far. A name that isn't here fails the import and says so: guessing a ticker
 * would split one holding in two, or merge two companies into one.
 */
export const FYERS_SYMBOLS: Record<string, string> = {
  "HDFC ASSET MANAGEMENT COMPANY": "HDFCAMC",
  "HDFC AMC LIMITED": "HDFCAMC",
  "NIP IND ETF NIFTY BEES": "NIFTYBEES",
  "NIPPON INDIA ETF NIFTY BEES": "NIFTYBEES",
  "JIO FINANCIAL SERVICES LIMITED": "JIOFIN",
  JIOFIN: "JIOFIN",
  "IDFC FIRST BANK LIMITED": "IDFCFIRSTB",
  IDFCFIRSTB: "IDFCFIRSTB",
  "GREENPANEL INDUSTRIES LTD": "GREENPANEL",
  "FIRSTSOURCE SOLU. LTD.": "FSL",
  "PVR INOX LIMITED": "PVRINOX",
  "RUSHIL DECOR LIMITED": "RUSHIL",
  "TARSONS PRODUCTS LIMITED": "TARSONS",
};

const MONTHS: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

/** "18 Oct 2024, 03:27:34 PM" → "2024-10-18" (the day on FYERS's own clock, which is India's). */
function readDate(raw: string, what: string): string {
  const match = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})\b/.exec(raw.trim());
  if (!match || !MONTHS[match[2]]) throw new ImportError(`${what}: can't read the date ${JSON.stringify(raw)}`);
  return `${match[3]}-${MONTHS[match[2]]}-${match[1].padStart(2, "0")}`;
}

/** Excel-safe text cells arrive as ="1100000055192064"; the digits are the order. */
function readOrderId(raw: string): string {
  return raw.replace(/[^0-9A-Za-z]/g, "");
}

/**
 * FYERS's "Tradebook report" CSV. One order is often filled in many pieces at slightly different
 * prices, each piece its own line; they are joined back into one trade per order (same order,
 * company and side) with the true average price, so 30 lines for one Greenpanel purchase are one
 * row in the Sheet.
 *
 * The tradebook states no charges (brokerage, STT, stamp duty), so every `fee` here is 0: the
 * cost of a trade is its value, a little under what it really cost. Delivery equity only: an
 * intraday or derivatives line fails the import, since those aren't holdings.
 */
export function parseFyersTradebook(text: string): ParseResult {
  const rows = parseCsv(text);
  const headerAt = rows.findIndex((row) => row[0] === "Symbol name");
  if (headerAt < 0) throw new ImportError("This isn't a FYERS tradebook: there is no 'Symbol name' header row");
  const columns = rows[headerAt].map((name) => name.trim());
  const at = (name: string) => {
    const index = columns.indexOf(name);
    if (index < 0) throw new ImportError(`The FYERS tradebook has no '${name}' column`);
    return index;
  };
  const [name, when, side, product, qty, price, value, segment, omsOrder] = [
    "Symbol name", "Date & time", "Side", "Product type", "Qty", "Traded price", "Total value", "Segment", "OMS order ID",
  ].map(at);

  const orders = new Map<string, { trade: ParsedTrade; quantity: number; amount: number }>();
  for (const row of rows.slice(headerAt + 1)) {
    if (row.every((cell) => cell.trim() === "")) continue;
    if (row.length < columns.length) throw new ImportError(`FYERS line for ${row[0]} is cut short: ${row.length} fields, ${columns.length} expected`);
    const what = `FYERS line for ${row[name]} on ${row[when]}`;
    if (row[segment] !== "Equity") throw new ImportError(`${what}: segment ${JSON.stringify(row[segment])}, and only Equity is read`);
    if (row[product] !== "Delivery") throw new ImportError(`${what}: product ${JSON.stringify(row[product])}, and only Delivery trades are holdings`);
    const ticker = FYERS_SYMBOLS[row[name].trim().replace(/\s+/g, " ").toUpperCase()];
    const known = ticker ? { symbol: ticker, assetType: INDIAN_FUNDS[ticker] ?? ("Equity" as const) } : undefined;
    if (!known) throw new ImportError(`${what}: no NSE ticker is known for ${JSON.stringify(row[name])}. Add it to FYERS_SYMBOLS in src/lib/tradeImport/fyers.ts`);
    const tradeType = row[side] === "BUY" ? "Buy" : row[side] === "SELL" ? "Sell" : undefined;
    if (!tradeType) throw new ImportError(`${what}: the side should be BUY or SELL, not ${JSON.stringify(row[side])}`);
    const quantity = readNumber(row[qty], `${what}: quantity`);
    const amount = readNumber(row[value], `${what}: total value`);
    const piecePrice = readNumber(row[price], `${what}: price`);
    if (quantity <= 0) throw new ImportError(`${what}: the quantity must be above zero`);
    if (Math.abs(quantity * piecePrice - amount) > 0.011) throw new ImportError(`${what}: quantity × price (${(quantity * piecePrice).toFixed(2)}) doesn't match the total value (${amount})`);

    const tradeDate = readDate(row[when], what);
    if (readOrderId(row[omsOrder] ?? "") === "") throw new ImportError(`${what}: no OMS order ID, so its pieces can't be joined safely`);
    const key = [readOrderId(row[omsOrder]), known.symbol, tradeType, tradeDate].join("|");
    const order = orders.get(key);
    if (order) {
      order.quantity += quantity;
      order.amount += amount;
      continue;
    }
    orders.set(key, {
      quantity,
      amount,
      trade: { tradeDate, symbol: known.symbol, market: "IND", currency: "INR", tradeType, source: "Market", assetType: known.assetType, quantity, price: piecePrice, amount, fee: 0 },
    });
  }

  const trades = [...orders.values()].map(({ trade, quantity, amount }) => ({
    ...trade,
    quantity: round6(quantity),
    amount: round6(amount),
    price: Math.round((amount / quantity) * 10_000) / 10_000,
  }));
  return { trades, skipped: [] };
}
