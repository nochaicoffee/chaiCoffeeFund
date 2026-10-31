/**
 * Reads a broker's trade file and adds its trades to the InvestmentTransactions tab.
 *
 *   npx tsx scripts/importTrades.ts --file <path> --broker "<name>"          (a dry run: prints what it would do)
 *   npx tsx scripts/importTrades.ts --file <path> --broker "<name>" --apply  (adds the trades that aren't there yet)
 *
 * Reads: an INDmoney trades report or a Groww order history or E*TRADE stock plan holdings (.xlsx), a US broker's Transaction History (.csv) and a FYERS
 * tradebook (.csv). The reading, the fee folding and the duplicate check are pure code in
 * src/lib/tradeImport (tested); this script only moves data. Like check-sheet it talks to the app's
 * own routes, because the Sheets code is `server-only`, so `npm run dev` must be running.
 *
 * Re-running a file adds nothing. Trades are added one at a time: concurrent writes to one tab race.
 */
import { readFile } from "fs/promises";
import { parseArgs } from "util";
import readXlsxFile from "read-excel-file/node";
import { computeHoldings, findOversells } from "../src/lib/aggregate/investments";
import { buildTransaction, datesNeedingRate, type NewInvestmentTransaction } from "../src/lib/tradeImport/build";
import { parseEtradeStockPlan } from "../src/lib/tradeImport/etradeStockPlan";
import { parseFyersTradebook } from "../src/lib/tradeImport/fyers";
import { parseManualTrades } from "../src/lib/tradeImport/manual";
import { parseGrowwOrders } from "../src/lib/tradeImport/groww";
import { parseIndmoneyReport } from "../src/lib/tradeImport/indmoney";
import { findLikelyCopies, planImport } from "../src/lib/tradeImport/plan";
import { ImportError, type ParseResult } from "../src/lib/tradeImport/types";
import { parseZerodhaTradebook } from "../src/lib/tradeImport/zerodha";
import { parseUsHistoryCsv } from "../src/lib/tradeImport/usHistoryCsv";
import { parseUsdInrOn, usdInrOnUrl } from "../src/lib/prices/usdInrParse";
import type { InvestmentTransaction } from "../src/lib/sheets/types";

const APP_URL = process.env.CHAI_COFFEE_FUND_URL ?? "http://localhost:3000";

async function readTrades(file: string): Promise<ParseResult> {
  if (file.toLowerCase().endsWith(".xlsx")) {
    const sheets = (await readXlsxFile(file)) as { sheet: string; data: unknown[][] }[];
    const byName = Object.fromEntries(sheets.map((s) => [s.sheet, s.data]));
    if (byName["ESPP"] && byName["Restricted Stock"]) return parseEtradeStockPlan(byName as never);
    const rows = sheets[0]?.data ?? [];
    return rows.some((row) => row[0] === "Stock name") ? parseGrowwOrders(rows as never) : parseIndmoneyReport(rows as never);
  }
  if (file.toLowerCase().endsWith(".json")) return parseManualTrades(JSON.parse(await readFile(file, "utf8")));
  const text = await readFile(file, "utf8");
  if (text.includes("Symbol name,")) return parseFyersTradebook(text);
  if (text.startsWith("symbol,isin,trade_date")) return parseZerodhaTradebook(text);
  if (text.includes("Transaction History,Header")) return parseUsHistoryCsv(text);
  throw new ImportError(`${file} isn't a file this script reads (INDmoney .xlsx, a Transaction History .csv or a FYERS tradebook .csv)`);
}

async function fetchRates(dates: string[]): Promise<Map<string, number>> {
  const rates = new Map<string, number>();
  await Promise.all(
    dates.map(async (date) => {
      const response = await fetch(usdInrOnUrl(date), { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Frankfurter answered ${response.status} for ${date}`);
      const parsed = parseUsdInrOn(await response.json(), date);
      if (!parsed.ok) throw new Error(`No usable USD to INR rate for ${date}: ${parsed.reason}`);
      rates.set(date, parsed.rate);
    }),
  );
  return rates;
}

async function storedTrades(): Promise<InvestmentTransaction[]> {
  const url = `${APP_URL}/api/investment-transactions`;
  const response = await fetch(url).catch((error: unknown) => {
    throw new Error(`Couldn't reach ${url}. Is \`npm run dev\` running? (${error instanceof Error ? error.message : String(error)})`);
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${url} answered ${response.status}: ${JSON.stringify(body)}`);
  return body as InvestmentTransaction[];
}

const money = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

async function main() {
  const { values } = parseArgs({ options: { file: { type: "string" }, broker: { type: "string" }, apply: { type: "boolean", default: false } } });
  if (!values.file || !values.broker) throw new Error('Usage: npx tsx scripts/importTrades.ts --file <path> --broker "<name>" [--apply]');

  const { trades, skipped } = await readTrades(values.file);
  console.log(`Read ${trades.length} trades from ${values.file}`);
  for (const line of skipped) console.log(`  left out on purpose: ${line.count} ${line.what}`);

  const rates = await fetchRates(datesNeedingRate(trades));
  const incoming = trades.map((trade) => buildTransaction(trade, values.broker!, (date) => rates.get(date)));
  const stored = await storedTrades();
  const { toAdd, alreadyThere } = planImport(incoming, stored);
  console.log(`${alreadyThere.length} already in the Sheet, ${toAdd.length} to add`);

  for (const t of toAdd) {
    console.log(`  ${t.tradeDate} ${t.tradeType.padEnd(4)} ${t.symbol.padEnd(10)} ${String(t.quantity).padStart(14)} @ ${String(t.price).padStart(9)}  total ${money(t.total).padStart(11)} ${t.currency}${t.fxRateToInr ? `  rate ${t.fxRateToInr}` : ""}`);
  }

  const copies = findLikelyCopies(toAdd, stored);
  if (copies.length > 0) {
    console.log("\nWARNING: these look like the same trade already stored under another broker (shares moved between brokers show up in both files). Adding both counts it twice:");
    for (const { incoming: n, stored: o } of copies) {
      console.log(`  ${n.tradeDate} ${n.tradeType} ${n.symbol} ${n.quantity} (${n.broker}, total ${money(n.total)})  ~  ${o.tradeDate} (${o.broker}, total ${money(o.total)})`);
    }
  }

  const after = [...stored, ...toAdd.map((t, i) => ({ ...t, id: `new-${i}` }))];
  console.log("\nHoldings after this import (all brokers together):");
  for (const h of computeHoldings(after).sort((a, b) => a.symbol.localeCompare(b.symbol))) {
    console.log(`  ${h.symbol.padEnd(10)} ${h.market}  ${String(Math.round(h.quantity * 1e6) / 1e6).padStart(14)}  cost ₹${money(h.totalCostInr)}`);
  }
  const oversells = findOversells(after);
  if (oversells.length > 0) {
    console.log("\nWARNING: sells of more than were held (a buy is missing from the files):");
    for (const o of oversells) console.log(`  ${o.tradeDate} ${o.symbol}: sold ${o.quantitySold}, held ${o.quantityHeld}`);
  }

  if (!values.apply) {
    console.log("\nDry run: nothing was written. Add --apply to write the trades above.");
    return;
  }
  let added = 0;
  for (const trade of toAdd as NewInvestmentTransaction[]) {
    const response = await fetch(`${APP_URL}/api/investment-transactions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(trade) });
    if (!response.ok) throw new Error(`Stopped after ${added} of ${toAdd.length}: ${response.status} ${await response.text()}`);
    added++;
  }
  console.log(`\nAdded ${added} trades.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof ImportError ? `Can't import: ${error.message}` : error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
