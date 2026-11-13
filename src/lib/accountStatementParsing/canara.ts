import { orderRows, sameAmount, toPaise, type StatementRow } from "../aggregate/statementBalances";
import { isoFrom, last4Of, parseNamedMonthDate, parseRupees, tidyNarration } from "./readers";
import type { ParseResult } from "./types";

/**
 * Canara Bank's ePassbook (the PDF its app downloads), as pdf.js lays it out. Found against a real
 * passbook 2026-11-13:
 *   - "Statement for A/c XXXXXXXXX1234 between 01-Jan-2025 and 13-Nov-2026", the customer's details,
 *     the column heads ("Date   Particulars   Deposits   Withdrawals   Balance") and "Opening Balance   <amount>".
 *   - A row is "dd-mm-yyyy  <particulars>  Chq: <number, 0 or nothing>  <amount>  <balance>". The amount
 *     is one number, in the deposits or the withdrawals column, and pdf.js doesn't say which, so the
 *     direction is the balance's: it must have moved by exactly the amount, up or down.
 *   - Each page ends "page N" and the next repeats the column heads; the last row is followed by
 *     "Closing Balance   <amount>", which the rows must end on.
 */

const AMT = String.raw`[\d,]+\.\d{2}`;
const COLUMN_HEADS = /Date\s+Particulars\s+Deposits\s+Withdrawals\s+Balance/g;
const PAGE_END = /\bpage \d+\b/g;
// "Chq:" may be followed by a cheque number, a 0, or nothing before the amount: the digits are only a number when a space follows them.
const ROW = new RegExp(String.raw`(\d{2})-(\d{2})-(\d{4})\s+(.*?)\s*Chq:\s*(?:\d+(?=\s))?\s*(${AMT})\s+(${AMT})(?=\s|$)`, "g");

export function isCanaraStatement(text: string): boolean {
  return /Statement for A\/c\s+\S+\s+between/.test(text) && /CANARA/i.test(text);
}

export function parseCanara(text: string): ParseResult {
  const period = /Statement for A\/c\s+(\S+)\s+between\s+(\d{1,2}-[A-Za-z]{3}-\d{4})\s+and\s+(\d{1,2}-[A-Za-z]{3}-\d{4})/.exec(text);
  const periodStart = period && parseNamedMonthDate(period[2]);
  const periodEnd = period && parseNamedMonthDate(period[3]);
  if (!period || !periodStart || !periodEnd) return { ok: false, problem: "couldn't read the statement's period" };

  const opening = new RegExp(String.raw`Opening Balance\s+(${AMT})`).exec(text);
  const openingBalance = opening && parseRupees(opening[1]);
  if (!opening || openingBalance === null) return { ok: false, problem: "couldn't read the opening balance" };
  const closing = new RegExp(String.raw`Closing Balance\s+(${AMT})`).exec(text);
  const closingBalance = closing && parseRupees(closing[1]);
  if (!closing || closingBalance === null) return { ok: false, problem: "couldn't find the closing balance, so the statement may be cut short" };

  const body = text.slice(opening.index + opening[0].length, closing.index).replace(PAGE_END, " ").replace(COLUMN_HEADS, " ");
  const rows: StatementRow[] = [];
  let before = toPaise(openingBalance);
  for (const m of body.matchAll(ROW)) {
    const date = isoFrom(Number(m[3]), Number(m[2]), Number(m[1]));
    const printed = parseRupees(m[5]);
    const balance = parseRupees(m[6]);
    if (!date || printed === null || balance === null) return { ok: false, problem: "couldn't read a row's date or amount" };
    const moved = toPaise(balance) - before;
    // The printed amount has no direction: the balance gives it, and must have moved by exactly that much.
    if (Math.abs(moved) !== toPaise(printed)) return { ok: false, problem: `row ${rows.length + 1}'s balance doesn't follow from the one before it` };
    const narration = tidyNarration(m[4]);
    rows.push({ date, amount: moved / 100, balance, ...(narration && { narration }) });
    before = toPaise(balance);
  }
  if (rows.length === 0 && !sameAmount(openingBalance, closingBalance)) return { ok: false, problem: "couldn't read any rows" };

  const last4 = last4Of(period[1]);
  return {
    ok: true,
    parsed: {
      bank: "Canara",
      ...(last4 && { accountLast4: last4 }),
      statement: { periodStart, periodEnd, openingBalance, closingBalance, rows: orderRows(openingBalance, rows) },
    },
  };
}
