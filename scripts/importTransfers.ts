/**
 * Reads a broker's ledger (its funds statement) and adds the money moved between his bank and that broker to the Transfers tab.
 *
 *   npx tsx scripts/importTransfers.ts --file <path> --broker "<account name>"                        (a dry run: prints the plan)
 *   npx tsx scripts/importTransfers.ts --file <path> --broker "<account name>" --default-bank "<name>"  (lines naming no bank come from/go to it)
 *   npx tsx scripts/importTransfers.ts ... --bank 7833="<account name>"                                 (a payout's last four → an account)
 *   npx tsx scripts/importTransfers.ts ... --apply                                                      (adds what isn't there yet)
 *
 * Reads Zerodha's ledger (.csv), FYERS's ledger report (.csv, one per year; pass --file again for each) and Groww's client fund
 * ledger (.xlsx). The reading and the planning are pure code in src/lib/transferImport (tested). Like importTrades it talks to the
 * app's own routes, so `npm run dev` must be running. Re-running adds nothing; transfers are added one at a time.
 */
import { readFile } from "fs/promises";
import { parseArgs } from "util";
import readXlsxFile from "read-excel-file/node";
import { parseFyersLedger, parseGrowwLedger, parseZerodhaLedger, type LedgerTransfer } from "../src/lib/transferImport/ledgers";
import { planTransfers } from "../src/lib/transferImport/plan";
import type { Account, Transfer } from "../src/lib/sheets/types";

const APP_URL = process.env.CHAI_COFFEE_FUND_URL ?? "http://localhost:3000";

async function readLedger(file: string): Promise<LedgerTransfer[]> {
  if (file.toLowerCase().endsWith(".xlsx")) {
    const sheets = (await readXlsxFile(file)) as { sheet: string; data: unknown[][] }[];
    return parseGrowwLedger((sheets[0]?.data ?? []) as never);
  }
  const text = await readFile(file, "utf8");
  if (text.includes("Report Title,Ledger report")) return parseFyersLedger(text);
  return parseZerodhaLedger(text);
}

async function get<T>(path: string): Promise<T[]> {
  const response = await fetch(`${APP_URL}/api/${path}`);
  if (!response.ok) throw new Error(`GET /api/${path} answered ${response.status}. Is \`npm run dev\` running?`);
  const body = await response.json();
  return Array.isArray(body) ? body : body.records;
}

const money = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

async function main() {
  const { values } = parseArgs({ options: { file: { type: "string", multiple: true }, broker: { type: "string" }, "default-bank": { type: "string" }, bank: { type: "string", multiple: true }, apply: { type: "boolean" } } });
  if (!values.file?.length || !values.broker) throw new Error("Pass --file <ledger> (once or more) and --broker \"<brokerage account name>\"");
  const accounts = await get<Account>("accounts");
  const find = (name: string) => {
    const found = accounts.find((a) => a.id === name || a.name.toLowerCase() === name.toLowerCase());
    if (!found) throw new Error(`No account called "${name}". Accounts: ${accounts.map((a) => a.name).join(", ")}`);
    return found;
  };
  const broker = find(values.broker);
  if (broker.accountType !== "Brokerage") throw new Error(`${broker.name} isn't a Brokerage account`);
  const banksByLast4 = Object.fromEntries((values.bank ?? []).map((pair) => {
    const [last4, name] = pair.split("=");
    return [last4, find(name).id];
  }));
  const lines = (await Promise.all(values.file.map(readLedger))).flat().sort((a, b) => (a.date < b.date ? -1 : 1));
  const existing = await get<Transfer>("transfers");
  const plan = planTransfers(lines, { brokerId: broker.id, accounts, existing, banksByLast4, defaultBankId: values["default-bank"] ? find(values["default-bank"]).id : undefined });

  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  console.log(`${broker.name}: ${lines.length} transfers in the ledger, ${plan.add.length} to add, ${plan.already} already recorded, ${plan.unresolved.length} waiting on a bank account.\n`);
  for (const t of plan.add) console.log(`  ${t.date}  ${nameOf(t.fromAccountId).padEnd(22)} → ${nameOf(t.toAccountId).padEnd(22)} ${money(t.amount)}`);
  if (plan.unresolved.length > 0) {
    console.log("\nWaiting on a bank account (say which with --bank <last4>=\"<name>\" or --default-bank):");
    for (const u of plan.unresolved) console.log(`  ${u.date}  ${u.direction === "in" ? "into" : "out of"} ${broker.name}  ${money(u.amount)}  ${u.bank ? `names ${u.bank.name} …${u.bank.last4}` : "names no bank"}`);
  }
  const byYear = new Map<string, { in: number; out: number }>();
  for (const l of lines) {
    const y = byYear.get(l.date.slice(0, 4)) ?? { in: 0, out: 0 };
    y[l.direction] += l.amount;
    byYear.set(l.date.slice(0, 4), y);
  }
  console.log("\nBy year (sent to the broker · back to the bank · net):");
  for (const [year, y] of [...byYear].sort()) console.log(`  ${year}  ${money(y.in)} · ${money(y.out)} · ${money(y.in - y.out)}`);

  if (!values.apply) return console.log("\nA dry run: nothing was written. Add --apply to add them.");
  if (plan.unresolved.length > 0) throw new Error("Some transfers don't have a bank account yet, so nothing was written. Answer them first.");
  for (const t of plan.add) {
    const response = await fetch(`${APP_URL}/api/transfers`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(t) });
    if (!response.ok) throw new Error(`Adding ${t.reference} failed (${response.status}): ${await response.text()}`);
  }
  console.log(`\nAdded ${plan.add.length} transfers.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
