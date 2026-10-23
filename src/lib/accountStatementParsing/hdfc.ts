import { orderRows, sameAmount, type StatementRow } from "../aggregate/statementBalances";
import { last4Of, parseRupees, parseSlashDate } from "./readers";
import type { ParseResult } from "./types";

/**
 * HDFC Bank's "Combined Email Statement", as pdf.js lays it out. The first page is an account
 * relationship summary (every account's balance), which isn't read. Then each account has one or
 * more pages, each opening with the same details block:
 *   "Customer ID  Account Number  Joint Holders … Opening Balance  Limit : <customer id> : <account
 *    number> : dd/mm/yyyy To dd/mm/yyyy : INR : … : <branch> : HDFC0000000 : <MICR> : <opening> : …"
 * and then, on pages with movements, the table "Txn Date  Narration  Withdrawals  Deposits  Closing
 * Balance" whose rows are "dd/mm/yyyy  narration … Value Dt dd/mm/yyyy [Ref …]  <withdrawn>  <deposited>
 * <balance>" (one of the first two is 0.00). A row posted after the period's end but valued within it
 * (September's interest, posted 1 Oct, valued 30 Sep) is in the closing balance, and counts on the last day. The last page of an account has a SUMMARY: four amounts
 * (closing, credits, debits, opening, in an order not relied on) then the labels.
 * A PDF holding several accounts gives one statement for each, told apart by account number.
 */

const HEADER = /Customer ID\s+Account Number\s+Joint Holders/g;
const FIELDS = /Limit\s*:\s*(\d{6,12})\s*:\s*(\d{9,18})\s*:\s*(\d{2}\/\d{2}\/\d{4}) To (\d{2}\/\d{2}\/\d{4})/;
const OPENING = /HDFC\d{7}\s*:\s*\d{9}\s*:\s*(-?[\d,]+\.\d{2})/;
const TABLE = /Txn Date\s+Narration\s+Withdrawals\s+Deposits\s+Closing Balance/;
const AMT = String.raw`[\d,]+\.\d{2}`;
const ROW = new RegExp(String.raw`(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+Value Dt (\d{2}\/\d{2}\/\d{4})(?:\s+Ref \S+)?\s+(${AMT})\s+(${AMT})\s+(${AMT})`, "g");
const SUMMARY = new RegExp(String.raw`((?:${AMT}\s+){4})Closing Balance\s+Credit Amount\s+Debit Amount\s+Opening Balance\s+SUMMARY`);

export function isHdfcStatement(text: string): boolean {
  return /Customer ID\s+Account Number\s+Joint Holders/.test(text) && /Txn Date\s+Narration\s+Withdrawals\s+Deposits/.test(text) && /HDFC/i.test(text);
}

interface AccountParts {
  number: string;
  periodStart: string;
  periodEnd: string;
  opening: number | null;
  rows: StatementRow[];
  summary: number[] | null;
  problem?: string;
}

export function parseHdfc(text: string): ParseResult[] {
  const starts = [...text.matchAll(HEADER)].map((m) => m.index!);
  if (starts.length === 0) return [{ ok: false, problem: "couldn't find the account details" }];

  const accounts = new Map<string, AccountParts>();
  for (const [i, start] of starts.entries()) {
    const page = text.slice(start, starts[i + 1] ?? text.length);
    const fields = FIELDS.exec(page);
    if (!fields) return [{ ok: false, problem: "couldn't read an account's number and period" }];
    const periodStart = parseSlashDate(fields[3]);
    const periodEnd = parseSlashDate(fields[4]);
    if (!periodStart || !periodEnd) return [{ ok: false, problem: "couldn't read the statement's period" }];

    let account = accounts.get(fields[2]);
    if (!account) {
      const opening = OPENING.exec(page);
      account = { number: fields[2], periodStart, periodEnd, opening: opening ? parseRupees(opening[1]) : null, rows: [], summary: null };
      accounts.set(fields[2], account);
    }
    const table = TABLE.exec(page);
    if (table) {
      for (const m of page.slice(table.index + table[0].length).matchAll(ROW)) {
        const date = parseSlashDate(m[1]);
        const valueDate = parseSlashDate(m[3]);
        const withdrawn = parseRupees(m[4]);
        const deposited = parseRupees(m[5]);
        const balance = parseRupees(m[6]);
        if (!date || !valueDate || withdrawn === null || deposited === null || balance === null) {
          account.problem = "couldn't read a row's date or amount";
          break;
        }
        // The quarter's interest is posted the day after the period ends but valued on its last day, and
        // the closing balance includes it: it counts on the last day.
        const counted = date > periodEnd && valueDate <= periodEnd ? periodEnd : date;
        account.rows.push({ date: counted, amount: Math.round((deposited - withdrawn) * 100) / 100, balance });
      }
    }
    const summary = SUMMARY.exec(page);
    if (summary) account.summary = summary[1].trim().split(/\s+/).map((a) => parseRupees(a) ?? NaN);
  }

  return [...accounts.values()].map((account): ParseResult => {
    if (account.problem) return { ok: false, problem: account.problem };
    if (account.opening === null) return { ok: false, problem: "couldn't read the opening balance" };
    if (!account.summary) return { ok: false, problem: "couldn't find the statement's summary, so it may be cut short" };
    const rows = orderRows(account.opening, account.rows);
    const closing = rows.length > 0 ? rows[rows.length - 1].balance : account.opening;
    // The summary's four amounts are the opening and closing balance and the credits and debits;
    // which is which isn't relied on, only that the two balances the rows give are among them.
    const printed = account.summary;
    if (!printed.some((p) => sameAmount(p, closing)) || !printed.some((p) => sameAmount(p, account.opening!))) {
      return { ok: false, problem: "the summary's balances don't match the transactions" };
    }
    const accountLast4 = last4Of(account.number);
    return {
      ok: true,
      parsed: {
        bank: "HDFC",
        ...(accountLast4 && { accountLast4 }),
        statement: { periodStart: account.periodStart, periodEnd: account.periodEnd, openingBalance: account.opening, closingBalance: closing, rows },
      },
    };
  });
}
