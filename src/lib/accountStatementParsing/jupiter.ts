import { orderRows, sameAmount, toPaise, type StatementRow } from "../aggregate/statementBalances";
import { last4Of, parseNamedMonthDate, parseRupees, parseSlashDate } from "./readers";
import type { ParseResult } from "./types";

/**
 * Jupiter's savings statement, issued by Federal Bank, as pdf.js lays it out.
 *   - A details block ("Account Number  …"), then "STATEMENT OF ACCOUNT PERIOD :  10-FEB-2022 to 23-OCT-2026",
 *     the column heads, and "Opening Balance  <amount>".
 *   - A row is "dd/mm/yyyy  dd/mm/yyyy  particulars  TFR  <amount>  <balance>  Dr|Cr". The amount is
 *     one number, in the withdrawals or the deposits column, and pdf.js doesn't say which. The
 *     Dr/Cr is the transaction's (Dr a withdrawal, Cr a deposit: a UPI payment out reads Dr with a
 *     positive balance after it), found against the real statement 2026-10-23, not the balance's.
 *     The balance is always printed unsigned. Each row is then checked: the balance must be the one
 *     before, plus or minus the amount.
 *   - Each page repeats the column heads and ends with a Federal Bank footer; the last has
 *     "GRAND TOTAL  <withdrawals>  <deposits>", which the rows are checked against.
 * Amounts have no thousands separators here.
 */

const DATE = String.raw`\d{2}\/\d{2}\/\d{4}`;
const AMT = String.raw`[\d,]+\.\d{2}`;
const PAGE_TOP = /\S*\*\S+ Phone Banking[^\n]*?www\.federal\.co\.in/g;
const COLUMN_HEADS = /Date\s+Value Date\s+Particulars\s+Tran Type\s+Cheque Details\s+Withdrawals\s+Deposits\s+Balance\s+Dr\/Cr/g;
const PAGE_FOOT = /Page \d+ of \d+ The Federal Bank Ltd\.[^]*?Website: www\.federal\.co\.in/g;
const ROW = new RegExp(String.raw`(${DATE})\s+${DATE}\s+(.+?)\s+(${AMT})\s+(${AMT})\s+(Dr|Cr)(?=\s|$)`, "g");

export function isJupiterStatement(text: string): boolean {
  return /STATEMENT OF ACCOUNT PERIOD/.test(text) && /Federal Bank/i.test(text);
}

export function parseJupiter(text: string): ParseResult {
  const period = /STATEMENT OF ACCOUNT PERIOD\s*:\s*(\d{1,2}-[A-Za-z]{3}-\d{4}) to (\d{1,2}-[A-Za-z]{3}-\d{4})/.exec(text);
  const periodStart = period && parseNamedMonthDate(period[1]);
  const periodEnd = period && parseNamedMonthDate(period[2]);
  if (!periodStart || !periodEnd) return { ok: false, problem: "couldn't read the statement's period" };

  const opening = new RegExp(String.raw`Dr\/Cr\s+Opening Balance\s+(${AMT})(?:\s+(Dr|Cr))?`).exec(text);
  if (!opening) return { ok: false, problem: "couldn't read the opening balance" };
  const openingBalance = parseRupees(opening[2] ? `${opening[1]} ${opening[2]}` : opening[1]);
  if (openingBalance === null) return { ok: false, problem: "couldn't read the opening balance" };

  const total = new RegExp(String.raw`GRAND TOTAL\s+(${AMT})\s+(${AMT})`).exec(text);
  if (!total) return { ok: false, problem: "couldn't find the grand total, so the statement may be cut short" };

  const body = text.slice((opening.index ?? 0) + opening[0].length).replace(PAGE_TOP, " ").replace(COLUMN_HEADS, " ").replace(PAGE_FOOT, " ");
  const rows: StatementRow[] = [];
  let before = toPaise(openingBalance);
  let withdrawn = 0;
  let deposited = 0;
  for (const m of body.matchAll(ROW)) {
    const date = parseSlashDate(m[1]);
    const printed = parseRupees(m[3]);
    const balance = parseRupees(m[4]);
    if (!date || printed === null || balance === null) return { ok: false, problem: "couldn't read a row's date or amount" };
    const change = m[5] === "Cr" ? toPaise(printed) : -toPaise(printed);
    // Dr/Cr says which way it went, and the balance must have moved by exactly that.
    if (before + change !== toPaise(balance)) return { ok: false, problem: `row ${rows.length + 1}'s balance doesn't follow from the one before it` };
    if (change > 0) deposited += change;
    else withdrawn -= change;
    rows.push({ date, amount: change / 100, balance });
    before = toPaise(balance);
  }

  const accountNumber = /Account Number\s+(\d+)/.exec(text)?.[1];
  const ordered = orderRows(openingBalance, rows);
  const closing = ordered.length > 0 ? ordered[ordered.length - 1].balance : openingBalance;
  // The grand total is what the whole statement withdrew and deposited; the rows must add up to it.
  if (!sameAmount(withdrawn / 100, parseRupees(total[1])!) || !sameAmount(deposited / 100, parseRupees(total[2])!)) {
    return { ok: false, problem: "the rows don't add up to the statement's grand total" };
  }
  return {
    ok: true,
    parsed: {
      bank: "Jupiter",
      ...(accountNumber && last4Of(accountNumber) && { accountLast4: last4Of(accountNumber) }),
      statement: { periodStart, periodEnd, openingBalance, closingBalance: closing, rows: ordered },
    },
  };
}
