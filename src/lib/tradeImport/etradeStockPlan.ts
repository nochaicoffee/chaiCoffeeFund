import { bump, countSkipped, ImportError, readNumber, round6, type ParseResult, type ParsedTrade } from "./types";

type Cell = string | number | boolean | Date | null | undefined;
export type Sheets = Record<string, Cell[][]>;

const MONTHS: Record<string, string> = { JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12" };

/** "30-MAY-2025" → "2025-05-30". */
function readEspDate(raw: unknown, what: string): string {
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(String(raw ?? "").trim());
  const month = match ? MONTHS[match[2].toUpperCase()] : undefined;
  if (!match || !month) throw new ImportError(`${what}: can't read the date ${JSON.stringify(raw)}`);
  return `${match[3]}-${month}-${match[1].padStart(2, "0")}`;
}

/** "02/15/2025" → "2025-02-15". */
function readVestDate(raw: unknown, what: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(raw ?? "").trim());
  if (!match) throw new ImportError(`${what}: can't read the date ${JSON.stringify(raw)}`);
  return `${match[3]}-${match[1]}-${match[2]}`;
}

/** The sheet repeats some headings ('Sellable Qty.' three times), so columns are read by position and each position is checked against its heading. */
function columns(header: Cell[], expected: Record<string, number>, sheet: string): Record<string, number> {
  for (const [name, index] of Object.entries(expected)) {
    if (String(header[index] ?? "").trim() !== name) {
      throw new ImportError(`The '${sheet}' sheet has changed: column ${index + 1} should be '${name}' but is ${JSON.stringify(header[index])}`);
    }
  }
  return expected;
}

const ESPP_COLUMNS = { "Record Type": 0, Symbol: 1, "Purchase Date": 2, "Purchase Price": 3, "Purchased Qty.": 4, "Tax Collection Shares": 5, "Net Shares": 6, "Sellable Qty.": 7 };
const RSU_COLUMNS = {
  "Record Type": 0, Symbol: 1, "Grant Number": 11, "Vest Period": 18, "Vest Date": 19, "Vested Qty.": 25, "Shares Traded for taxes": 38, "Taxable Gain": 41,
};
const SELLABLE_COLUMN = { "Sellable Qty.": 32, "Est. Cost Basis (per share):": 35 };

/**
 * E*TRADE's "Stock Plan Holdings by Type" download: an ESPP sheet and a Restricted Stock sheet.
 * It is a snapshot of what is held, not a history, and that shapes what it can give:
 *
 * - **ESPP:** each purchase lot still held becomes a Buy with source ESPP at the price you paid.
 * - **RSU:** a vest whose shares are all still held becomes a Buy of the vested shares at the
 *   day's fair market value (the taxable gain ÷ shares vested) and a same-day Sell of the shares
 *   traded for tax (sell-to-cover), both source RSU (PRD Q12). The sell-to-cover is priced at the
 *   fair market value because the report doesn't give the price those shares sold at.
 * - A vest or purchase already sold in whole or part isn't loaded: the report has no sale date or
 *   price, and a Buy with no matching Sell would show shares you no longer hold. Those need the
 *   Gains & Losses and Benefit History downloads. Unvested shares aren't holdings and are left out.
 */
export function parseEtradeStockPlan(sheets: Sheets): ParseResult {
  const espp = sheets["ESPP"];
  const rsu = sheets["Restricted Stock"];
  if (!espp || !rsu) throw new ImportError("This isn't E*TRADE's Stock Plan Holdings by Type: it needs an 'ESPP' and a 'Restricted Stock' sheet");

  const trades: ParsedTrade[] = [];
  const skipped = new Map<string, number>();

  const e = columns(espp[0], ESPP_COLUMNS, "ESPP");
  for (const row of espp.slice(1)) {
    if (row[e["Record Type"]] !== "Purchase") continue;
    const what = `ESPP purchase on ${String(row[e["Purchase Date"]])}`;
    const quantity = readNumber(row[e["Purchased Qty."]], `${what}: purchased quantity`);
    const price = readNumber(row[e["Purchase Price"]], `${what}: purchase price`);
    const net = readNumber(row[e["Net Shares"]], `${what}: net shares`);
    const sellable = readNumber(row[e["Sellable Qty."]], `${what}: sellable quantity`);
    if (readNumber(row[e["Tax Collection Shares"]], `${what}: tax collection shares`) !== 0 || net !== quantity || sellable !== quantity) {
      bump(skipped, "ESPP purchases not wholly held (part sold or held back for tax)");
      continue;
    }
    trades.push({
      tradeDate: readEspDate(row[e["Purchase Date"]], what), symbol: String(row[e.Symbol]).trim().toUpperCase(), market: "US", currency: "USD", tradeType: "Buy", source: "ESPP",
      assetType: "Equity", quantity, price, amount: round6(quantity * price), fee: 0,
    });
  }

  const r = columns(rsu[0], RSU_COLUMNS, "Restricted Stock");
  const s = columns(rsu[0], SELLABLE_COLUMN, "Restricted Stock");
  const grants = new Map<string, string>();
  const withholding = new Map<string, number>();
  const sellable = new Map<string, { quantity: number; costBasis: number }>();
  for (const row of rsu.slice(1)) {
    const key = `${String(row[r["Grant Number"]])}/${String(row[r["Vest Period"]])}`;
    if (row[r["Record Type"]] === "Grant") grants.set(String(row[r["Grant Number"]]), String(row[r.Symbol]).trim().toUpperCase());
    if (row[r["Record Type"]] === "Tax Withholding") withholding.set(key, readNumber(row[r["Taxable Gain"]], `Taxable gain for ${key}`));
    if (row[r["Record Type"]] === "Sellable Shares") {
      sellable.set(key, { quantity: readNumber(row[s["Sellable Qty."]], `Sellable quantity for ${key}`), costBasis: readNumber(row[s["Est. Cost Basis (per share):"]], `Cost basis for ${key}`) });
    }
  }

  for (const row of rsu.slice(1)) {
    if (row[r["Record Type"]] !== "Vest Schedule") continue;
    const grant = String(row[r["Grant Number"]]);
    const key = `${grant}/${String(row[r["Vest Period"]])}`;
    const vested = row[r["Vested Qty."]] === null || row[r["Vested Qty."]] === undefined || row[r["Vested Qty."]] === "" ? 0 : readNumber(row[r["Vested Qty."]], `Vested quantity for ${key}`);
    if (vested === 0) {
      bump(skipped, "unvested RSU periods");
      continue;
    }
    const what = `RSU vest ${key}`;
    const symbol = grants.get(grant);
    if (!symbol) throw new ImportError(`${what}: no Grant line for ${grant}`);
    const traded = readNumber(row[r["Shares Traded for taxes"]], `${what}: shares traded for taxes`);
    const net = vested - traded;
    const held = sellable.get(key)?.quantity ?? 0;
    if (held !== net) {
      bump(skipped, "RSU vests already sold in whole or part (sales aren't in this report)");
      continue;
    }
    const gain = withholding.get(key);
    if (gain === undefined) throw new ImportError(`${what}: no Tax Withholding line, so the fair market value can't be worked out`);
    const fairValue = Math.round((gain / vested) * 10_000) / 10_000;
    const basis = sellable.get(key)!.costBasis;
    if (Math.abs(fairValue - basis) > 0.01) throw new ImportError(`${what}: the fair market value from the taxable gain (${fairValue}) disagrees with the report's cost basis (${basis})`);
    const tradeDate = readVestDate(row[r["Vest Date"]], what);
    const base = { tradeDate, symbol, market: "US", currency: "USD", source: "RSU", assetType: "Equity", price: fairValue, fee: 0 } as const;
    trades.push({ ...base, tradeType: "Buy", quantity: vested, amount: round6(vested * fairValue) });
    if (traded > 0) trades.push({ ...base, tradeType: "Sell", quantity: traded, amount: round6(traded * fairValue) });
  }
  return { trades, skipped: countSkipped(skipped) };
}
