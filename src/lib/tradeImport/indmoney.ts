import { bump, countSkipped, ImportError, readNumber, usAssetType, type ParseResult, type ParsedTrade } from "./types";

type Cell = string | number | boolean | Date | null | undefined;

const HEADER = ["Trade Date", "Ticker", "Side", "Quantity", "($) Price", "($) Amount", "($) Commission", "Status"];

/** The report's own totals are in dollars and "may mismatch by up to $0.1 on rounding", so a cent-level check would cry wolf; a missing row is far bigger. */
const TOTAL_TOLERANCE = 0.5;

function label(rows: Cell[][], name: string): Cell {
  return rows.find((row) => row[0] === name)?.[1];
}

/**
 * INDmoney's "Trades Report" spreadsheet (one per US account it opens for you: DriveWealth,
 * Alpaca): a block of totals, then a header row, then one row per fill. Rows are the sheet's
 * cells as a spreadsheet reader returns them.
 *
 * `amount` there is quantity × price with no fee in it; `($) Commission` is INDmoney's charge on
 * top (about 0.3% from mid 2026, nothing before). The reader checks its trades against the
 * report's own totals, so a row lost on the way fails the import instead of passing quietly.
 */
export function parseIndmoneyReport(rows: Cell[][]): ParseResult {
  const headerAt = rows.findIndex((row) => row[0] === "Trade Date");
  if (headerAt < 0) throw new ImportError("This isn't an INDmoney trades report: there is no 'Trade Date' header row");
  const found = rows[headerAt].slice(0, HEADER.length).map((cell) => String(cell ?? "").trim());
  if (found.join("|") !== HEADER.join("|")) throw new ImportError(`INDmoney's columns have changed: expected ${HEADER.join(", ")} but found ${found.join(", ")}`);

  const trades: ParsedTrade[] = [];
  const skipped = new Map<string, number>();
  for (const row of rows.slice(headerAt + 1)) {
    const [date, ticker, side, quantity, price, amount, commission, status] = row;
    if (date === null || date === undefined || String(date).trim() === "" || /^Disclaimer/.test(String(date))) break;
    const at = `INDmoney row for ${String(ticker)} on ${String(date)}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new ImportError(`${at}: the date should look like 2026-10-30`);
    if (String(status).toUpperCase() !== "FILLED") {
      bump(skipped, `${String(status).toLowerCase()} orders`);
      continue;
    }
    if (side !== "Buy" && side !== "Sell") throw new ImportError(`${at}: the side should be Buy or Sell, not ${JSON.stringify(side)}`);
    const qty = readNumber(quantity, `${at}: quantity`);
    const px = readNumber(price, `${at}: price`);
    const amt = readNumber(amount, `${at}: amount`);
    const fee = readNumber(commission, `${at}: commission`);
    if (qty <= 0 || amt < 0) throw new ImportError(`${at}: the quantity must be above zero and the amount not negative`);
    // Prices are rounded to the cent, amounts are not, so allow a small gap, but not a different trade.
    if (Math.abs(qty * px - amt) > Math.max(0.05, amt * 0.002)) throw new ImportError(`${at}: quantity × price (${(qty * px).toFixed(2)}) doesn't match the amount (${amt})`);
    const symbol = String(ticker).trim().toUpperCase();
    trades.push({ tradeDate: String(date), symbol, market: "US", currency: "USD", tradeType: side, source: "Market", assetType: usAssetType(symbol), quantity: qty, price: px, amount: amt, fee });
  }

  const stated = (name: string) => readNumber(label(rows, name), `The report's '${name}'`);
  const sum = (pick: (t: ParsedTrade) => number, kind?: "Buy" | "Sell") => trades.filter((t) => !kind || t.tradeType === kind).reduce((s, t) => s + pick(t), 0);
  const checks: [string, number, number][] = [
    ["Total Trades", trades.length, stated("Total Trades")],
    ["Total Buy Amount ($)", sum((t) => t.amount, "Buy"), stated("Total Buy Amount ($)")],
    ["Total Sell Amount ($)", sum((t) => t.amount, "Sell"), stated("Total Sell Amount ($)")],
    ["Total Commission ($)", sum((t) => t.fee), stated("Total Commission ($)")],
  ];
  for (const [name, mine, theirs] of checks) {
    if (Math.abs(mine - theirs) > (name === "Total Trades" ? 0 : TOTAL_TOLERANCE)) {
      throw new ImportError(`The report says '${name}' is ${theirs} but its rows add up to ${mine.toFixed(2)}: a row is missing or was misread`);
    }
  }
  return { trades, skipped: countSkipped(skipped) };
}
