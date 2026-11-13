/**
 * Adds the balances in a bank statement PDF you downloaded, for a bank whose statements don't come by email
 * (Canara's ePassbook, an SBI statement; HDFC, Jupiter and Slice PDFs work too).
 *
 *   npx tsx scripts/importAccountStatement.ts --file <path.pdf>            (a dry run: prints what it would add)
 *   npx tsx scripts/importAccountStatement.ts --file <path.pdf> --apply    (adds it)
 *
 * The PDF is opened with the passwords saved on the accounts (Edit account), read by the same parsers the Gmail
 * sync uses (src/lib/accountStatementParsing), and matched to the account by bank and last 4. A balance the Sheet
 * already has is left alone, and one that disagrees opens a review instead of being changed. Running it again on
 * the same file adds nothing. It talks to the app's own route, so `npm run dev` must be running.
 */
import { readFile } from "fs/promises";
import { basename } from "path";
import { parseArgs } from "util";
import type { EmailOutcome } from "../src/lib/accountStatementIngestion/types";

const APP_URL = process.env.CHAI_COFFEE_FUND_URL ?? "http://localhost:3000";

async function main() {
  const { values } = parseArgs({ options: { file: { type: "string" }, apply: { type: "boolean" } } });
  if (!values.file) throw new Error("Pass --file <statement.pdf>");
  const bytes = await readFile(values.file);
  const query = new URLSearchParams({ name: basename(values.file), ...(!values.apply && { dryRun: "1" }) });
  const response = await fetch(`${APP_URL}/api/account-statements/file?${query}`, { method: "POST", headers: { "content-type": "application/pdf" }, body: bytes });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`The import answered ${response.status}: ${body?.error ?? "no reason given"}. Is \`npm run dev\` running?`);
  const result = body as EmailOutcome & { dryRun: boolean };
  if (result.statements.length === 0) return console.log(`Skipped: ${result.reason}`);
  for (const s of result.statements) {
    const who = s.accountName ?? s.bank ?? "A statement";
    if (s.result === "skipped") {
      console.log(`${who}: skipped, ${s.reason}`);
      continue;
    }
    console.log(`${who}, ${s.periodStart} to ${s.periodEnd}: ${s.created} balance(s) ${result.dryRun ? "to add" : "added"}, ${s.unchanged} already recorded${s.income ? `, ${s.income} income entr${s.income === 1 ? "y" : "ies"}` : ""}.`);
    for (const r of s.reviews) console.log(`  ${r.date}: recorded ₹${r.recordedBalance}, the statement says ₹${r.statementBalance}. Left as recorded; it's waiting for you under Accounts.`);
    for (const n of s.notes) console.log(`  ${n}`);
  }
  if (result.dryRun) console.log("\nA dry run: nothing was written. Add --apply to add it.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
