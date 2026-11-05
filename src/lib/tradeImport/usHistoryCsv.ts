import { parseCsv } from "./csv";
import { bump, countSkipped, ImportError, readNumber, round6, usAssetType, type ParseResult, type ParsedTrade } from "./types";

/**
 * A US broker's "Transaction History" CSV (the layout with `Statement,Header,…` and
 * `Transaction History,Data,…` lines, as Interactive Brokers exports it). Buys and sells become
 * trades; deposits, dividends and tax withholding are left out and counted, since they are cash
 * and income, not trades.
 *
 * Each row carries a gross amount and a commission (negative: charged, positive: a rebate), and
 * the reader checks the net amount against them, so a misread sign fails the import.
 */
export function parseUsHistoryCsv(text: string): ParseResult {
  const lines = parseCsv(text).filter((row) => row[0] === "Transaction History");
  const header = lines.find((row) => row[1] === "Header");
  if (!header) throw new ImportError("This isn't a Transaction History export: there is no 'Transaction History,Header' line");
  const columns = header.slice(2).map((name) => name.trim());
  const at = (name: string) => {
    const index = columns.indexOf(name);
    if (index < 0) throw new ImportError(`The Transaction History export has no '${name}' column`);
    return index + 2;
  };
  const [date, type, symbolAt, quantity, price, currency, gross, commission, net] = [
    "Date", "Transaction Type", "Symbol", "Quantity", "Price", "Price Currency", "Gross Amount", "Commission", "Net Amount",
  ].map(at);

  const trades: ParsedTrade[] = [];
  const skipped = new Map<string, number>();
  for (const row of lines.filter((r) => r[1] === "Data")) {
    if (row.length < columns.length + 2) throw new ImportError(`A Transaction History line is cut short: ${row.length} fields, ${columns.length + 2} expected`);
    const kind = row[type];
    if (kind !== "Buy" && kind !== "Sell") {
      bump(skipped, `${kind.toLowerCase()} lines`);
      continue;
    }
    const what = `${kind} of ${row[symbolAt]} on ${row[date]}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row[date])) throw new ImportError(`${what}: the date should look like 2026-10-30`);
    if (row[currency] !== "USD") throw new ImportError(`${what}: priced in ${JSON.stringify(row[currency])}, and only USD is read`);
    const signedQty = readNumber(row[quantity], `${what}: quantity`);
    if ((kind === "Buy") !== signedQty > 0) throw new ImportError(`${what}: a ${kind} should have a ${kind === "Buy" ? "positive" : "negative"} quantity, but it is ${signedQty}`);
    const qty = Math.abs(signedQty);
    const px = readNumber(row[price], `${what}: price`);
    const grossAmount = Math.abs(readNumber(row[gross], `${what}: gross amount`));
    const fee = -readNumber(row[commission], `${what}: commission`);
    const netAmount = Math.abs(readNumber(row[net], `${what}: net amount`));
    if (qty <= 0) throw new ImportError(`${what}: the quantity must be above zero`);
    const expectedNet = kind === "Buy" ? grossAmount + fee : grossAmount - fee;
    if (Math.abs(expectedNet - netAmount) > 1e-6) {
      throw new ImportError(`${what}: gross ${grossAmount} with fee ${fee} should net ${expectedNet}, but the file says ${netAmount}`);
    }
    const symbol = row[symbolAt].trim().toUpperCase();
    trades.push({ tradeDate: row[date], symbol, market: "US", currency: "USD", tradeType: kind, source: "Market", assetType: usAssetType(symbol), quantity: qty, price: px, amount: round6(grossAmount), fee: round6(fee) });
  }
  return { trades, skipped: countSkipped(skipped) };
}
