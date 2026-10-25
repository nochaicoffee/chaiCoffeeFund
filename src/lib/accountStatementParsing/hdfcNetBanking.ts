import { orderRows, sameAmount, toPaise, type StatementRow } from "../aggregate/statementBalances";
import { last4Of, parseRupees, parseSlashDate, tidyNarration } from "./readers";
import type { ParseResult } from "./types";

/**
 * HDFC Bank's account statement from NetBanking (a yearly or custom-range one, as opposed to the monthly
 * "Combined Email Statement" in hdfc.ts), as pdf.js lays it out. Found on real statements 2026-10-24.
 *   - Every page opens with the same header block: "Statement From : dd/mm/yy TO : dd/mm/yy" (two-digit
 *     years), then the account's details, ending "Expected AMB : 0.00". The account number is the 9-18 digit
 *     value just before the account's open date and "Account Open". The block begins with a date-shaped open
 *     date ("dd/mm/yyyy :"), so it is cut out before rows are read or it would be taken for a row's start.
 *   - Rows are "dd/mm/yyyy  narration  [chq / ref no]  dd/mm/yyyy (value date)  withdrawal  deposit  closing", listed
 *     by value date, which is the date a row is read with.
 *     The narration wraps with stray spaces and the reference is sometimes absent (interest), so a row is read
 *     from its dates and its three amounts. One of withdrawal and deposit is 0.00.
 *   - The end has "Closing Balance <amount> Opening Balance <amount> **END OF STATEMENT**", and debit and
 *     credit totals whose labels pdf.js scrambles: they are only checked as a pair against the rows' sums.
 * An account opened inside the period starts at 0.00 and its first row is the opening deposit.
 */

const AMT = String.raw`[\d,]+\.\d{2}`;
// A closing balance can be negative ("-4,271.20": an ACH debit before its reversal), a withdrawal or deposit never.
const BAL = String.raw`-?[\d,]+\.\d{2}`;
const DATE = String.raw`\d{2}\/\d{2}\/\d{4}`;
const HEADER = /Statement\s+From\s*:\s*(\d{2}\/\d{2}\/\d{2,4})\s+TO\s*:\s*(\d{2}\/\d{2}\/\d{2,4})[^]*?Expected AMB\s*:\s*[\d,.]+/g;
const ACCOUNT_NUMBER = /(\d{9,18})\s*:\s*\d{2}\/\d{2}\/\d{4}\s*:\s*Account\s+Open/;
const ROW = new RegExp(String.raw`(${DATE})\s+(.+?)\s+(${DATE})\s+(${AMT})\s+(${AMT})\s+(${BAL})(?=\s|$)`, "g");
const SUMMARY = new RegExp(String.raw`Count\s+\d+\s+Debits\s+(${AMT})\s+(?:Dr\s+)?Count\s+\d+\s+Credits\s+(${AMT})\s+Closing Balance\s+(${BAL})\s+Opening Balance\s+(${BAL})`);

export function isHdfcNetBankingStatement(text: string): boolean {
  return /Date\s+Narration\s+Chq\.\s*\/\s*Ref No\.\s+Value Date\s+Withdrawal Amount\s+Deposit Amount\s+Closing Balance/.test(text) && /STATEMENT SUMMARY/.test(text) && /HDFC/i.test(text);
}

export function parseHdfcNetBanking(text: string): ParseResult {
  const header = [...text.matchAll(HEADER)][0];
  if (!header) return { ok: false, problem: "couldn't read the statement's period" };
  const periodStart = parseSlashDate(header[1]);
  const periodEnd = parseSlashDate(header[2]);
  if (!periodStart || !periodEnd) return { ok: false, problem: "couldn't read the statement's period" };

  const summary = SUMMARY.exec(text);
  if (!summary) return { ok: false, problem: "couldn't find the statement's summary, so it may be cut short" };
  const [debits, credits, closing, opening] = [1, 2, 3, 4].map((i) => parseRupees(summary[i]));
  if (closing === null || opening === null || debits === null || credits === null) return { ok: false, problem: "couldn't read the summary's balances" };

  const accountNumber = ACCOUNT_NUMBER.exec(text)?.[1];
  const body = text.replace(HEADER, " ").replace(/Page\s+\d+\s+of\s+\d+/g, " ").replace(/Date\s+Narration\s+Chq\.\s*\/\s*Ref No\.\s+Value Date\s+Withdrawal Amount\s+Deposit Amount\s+Closing Balance\*?/g, " ");
  const end = body.search(/\*\*\s*END\s+OF\s+STATEMENT/);
  const rows: StatementRow[] = [];
  let withdrawn = 0;
  let deposited = 0;
  for (const m of (end >= 0 ? body.slice(0, end) : body).matchAll(ROW)) {
    // The value date, not the posting date: a statement lists a row under the period its value date falls in (a
    // card payment posted 31 Dec and valued 1 Jan opens the next year's statement; the quarter's interest, posted
    // on the 1st and valued the day before, closes the one before), and its closing balance counts it there.
    const date = parseSlashDate(m[3]);
    const out = parseRupees(m[4]);
    const inn = parseRupees(m[5]);
    const balance = parseRupees(m[6]);
    if (!date || out === null || inn === null || balance === null) return { ok: false, problem: "couldn't read a row's date or amount" };
    withdrawn += toPaise(out);
    deposited += toPaise(inn);
    rows.push({ date, amount: (toPaise(inn) - toPaise(out)) / 100, balance, narration: tidyNarration(m[2]) });
  }

  // The debit and credit totals must be the rows' two sums, whichever way round their labels came out.
  const sums = [withdrawn / 100, deposited / 100];
  const printed = [debits, credits];
  const paired = (sameAmount(sums[0], printed[0]) && sameAmount(sums[1], printed[1])) || (sameAmount(sums[0], printed[1]) && sameAmount(sums[1], printed[0]));
  if (!paired) return { ok: false, problem: "the rows don't add up to the statement's debit and credit totals" };

  const ordered = orderRows(opening, rows);
  const accountLast4 = accountNumber && last4Of(accountNumber);
  return {
    ok: true,
    parsed: {
      bank: "HDFC",
      ...(accountLast4 && { accountLast4 }),
      statement: { periodStart, periodEnd, openingBalance: opening, closingBalance: closing, rows: ordered },
    },
  };
}
