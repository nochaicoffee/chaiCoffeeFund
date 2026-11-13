import { orderRows, toPaise, type StatementRow } from "../aggregate/statementBalances";
import { last4Of, parseRupees, parseSlashDate, tidyNarration } from "./readers";
import type { ParseResult } from "./types";

/**
 * SBI's account statement (the PDF YONO and WhatsApp Banking send), as pdf.js lays it out. Found against a real
 * statement 2026-11-13:
 *   - "Statement of <name> (A/c-xxxxxxxxxxxxxx123) between 01/12/2025 to 01/11/2026", the account details,
 *     "Balance as on dd-mm-yyyy : <amount>" (today's balance, not the period's), and the column heads
 *     ("Txn Date   Value Date   Description   Debit   Credit   Balance").
 *   - A row is "dd/mm/yyyy  dd/mm/yyyy  <description, sometimes none>  <amount>  <balance>". The empty debit or
 *     credit column isn't printed, so the direction is the balance's: it must have moved by exactly the amount.
 *   - It prints no opening balance. The first row's amount either took the balance down to its own (a debit)
 *     or up to it (a credit). Only one of the two leaves a balance that isn't negative, or the description says
 *     which ("UPI/CR/…", "UPI/DR/…"); when neither settles it, the statement isn't read.
 *   - Each page repeats the statement line and the column heads; the last says "End of Statement".
 * The account number shows only its last 3 digits, so it gives no last 4.
 */

const DATE = String.raw`\d{2}\/\d{2}\/\d{4}`;
const AMT = String.raw`\d[\d,]*\.\d{2}`;
const HEADER = /Statement of .*?\(A\/c-[x\d]+\) between \d{2}\/\d{2}\/\d{4} to \d{2}\/\d{2}\/\d{4}/g;
const COLUMN_HEADS = /Txn Date\s+Value Date\s+Description\s+Debit\s+Credit\s+Balance/g;
const ROW = new RegExp(String.raw`(${DATE})\s+${DATE}\s+(.*?)\s*(${AMT})\s+(${AMT})(?=\s|$)`, "g");

export function isSbiStatement(text: string): boolean {
  return /State Bank of India/i.test(text) && /\(A\/c-[x\d]+\) between/.test(text);
}

/** "UPI/CR/…" or "UPI/DR/…": which way the description says money went, when it says. */
function directionOf(narration: string): 1 | -1 | null {
  if (/\/CR\//.test(narration)) return 1;
  if (/\/DR\//.test(narration)) return -1;
  return null;
}

export function parseSbi(text: string): ParseResult {
  const period = /\(A\/c-([x\d]+)\) between (\d{2}\/\d{2}\/\d{4}) to (\d{2}\/\d{2}\/\d{4})/.exec(text);
  const periodStart = period && parseSlashDate(period[2]);
  const periodEnd = period && parseSlashDate(period[3]);
  if (!period || !periodStart || !periodEnd) return { ok: false, problem: "couldn't read the statement's period" };
  if (!/End of Statement/i.test(text)) return { ok: false, problem: "couldn't find the end of the statement, so it may be cut short" };

  const heads = COLUMN_HEADS.exec(text);
  COLUMN_HEADS.lastIndex = 0;
  if (!heads) return { ok: false, problem: "couldn't find the column heads" };
  const body = text.slice(heads.index).replace(HEADER, " ").replace(COLUMN_HEADS, " ").replace(/\*{2,}[^*]*\*{2,}/g, " ");

  const read: { date: string; printed: number; balance: number; narration: string }[] = [];
  for (const m of body.matchAll(ROW)) {
    const date = parseSlashDate(m[1]);
    const printed = parseRupees(m[3]);
    const balance = parseRupees(m[4]);
    if (!date || printed === null || balance === null) return { ok: false, problem: "couldn't read a row's date or amount" };
    read.push({ date, printed, balance, narration: tidyNarration(m[2]) });
  }
  if (read.length === 0) return { ok: false, problem: "couldn't read any rows, so the opening balance isn't known" };

  // The opening balance: the first row's balance, less the amount if it was a credit or plus it if a debit.
  const first = read[0];
  const asDebit = toPaise(first.balance) + toPaise(first.printed);
  const asCredit = toPaise(first.balance) - toPaise(first.printed);
  const said = directionOf(first.narration);
  const openingPaise = said === 1 ? asCredit : said === -1 || asCredit < 0 ? asDebit : null;
  if (openingPaise === null || openingPaise < 0) return { ok: false, problem: "couldn't tell the opening balance: the first row doesn't say whether it was a debit or a credit" };

  const rows: StatementRow[] = [];
  let before = openingPaise;
  for (const r of read) {
    const moved = toPaise(r.balance) - before;
    if (Math.abs(moved) !== toPaise(r.printed)) return { ok: false, problem: `row ${rows.length + 1}'s balance doesn't follow from the one before it` };
    rows.push({ date: r.date, amount: moved / 100, balance: r.balance, ...(r.narration && { narration: r.narration }) });
    before = toPaise(r.balance);
  }
  const openingBalance = openingPaise / 100;
  const closingBalance = rows[rows.length - 1].balance;
  const last4 = last4Of(period[1].replace(/x/gi, ""));
  return {
    ok: true,
    parsed: {
      bank: "SBI",
      ...(last4 && { accountLast4: last4 }),
      statement: { periodStart, periodEnd, openingBalance, closingBalance, rows: orderRows(openingBalance, rows) },
    },
  };
}
