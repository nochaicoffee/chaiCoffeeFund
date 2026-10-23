import { orderRows, type StatementRow } from "../aggregate/statementBalances";
import { last4Of, parseNamedMonthDate, parseRupees } from "./readers";
import type { ParseResult } from "./types";

/**
 * slice small finance bank's savings statement, as pdf.js lays it out: one run of text with
 * no line breaks (see "Reading statement PDFs" in docs/system-design.md).
 *   - The monthly statement is the same table with a "Statement overview" ahead of the summary, a grievance line
 *     after the support line in the footer (which, left in, glued a page's last row to the next page's first), and
 *     a closing "Round ups atom" section for the round-up account, which is not read: a statement whose rows
 *     don't chain (an atom section with movements would break it) is refused, not written.
 *   - Every page starts with "02 Aug '25 - 23 Oct '26  1/22": the statement's period and the
 *     page number. It and "Need help? … slice small finance bank" are taken out first, since
 *     the header begins with a date and would be read as the start of a row.
 *   - The summary is five labels, "+ + - =", then five amounts in the labels' order:
 *     opening, credits, interest, debits, closing.
 *   - A row is "21 Aug '25  details  ref  ±₹amount  ₹balance". A debit's amount has a leading
 *     "-"; amounts print with as many decimals as they need, so ₹500 and ₹99.9 both occur.
 * What it reads is checked by lib/aggregate/statementBalances.ts (checkStatement) before
 * anything is written, so a wrong column would show as a balance that doesn't follow.
 */

const DATE = String.raw`\d{1,2} [A-Z][a-z]{2} '\d{2}`;
// A debit's minus: "-₹500" in newer statements. The January 2026 one was made with a font whose hyphen
// pdf.js extracts as a digit (the "-" in "UPI-Debit-…" and "31-Dec-2025" too), so a debit reads "9₹500" there.
// A credit and every balance have a space before the ₹, so any single character stuck to it is the sign.
const AMOUNT = String.raw`[-\d]?₹[\d,]+(?:\.\d+)?`;

const PAGE_HEADER = new RegExp(String.raw`(${DATE}) - (${DATE})\s+\d+\/\d+`, "g");
const FOOTER = /Need help\? Contact our support team at \S+ or \+[\d-]+(?:\s+slice small finance bank)?(?:\s+For grievance redressal, contact .*? or email \S+)?/g;
const GENERATED = new RegExp(String.raw`Generated on ${DATE}`, "g");
const SUMMARY = new RegExp(
  String.raw`Opening balance\s+Total credits\s+Interest earned\s+Total debits\s+Closing balance\s+\+\s+\+\s+-\s+=\s+(${AMOUNT})\s+(${AMOUNT})\s+(${AMOUNT})\s+(${AMOUNT})\s+(${AMOUNT})`,
);
const ROW = new RegExp(String.raw`(${DATE})\s+(.+?)\s+(${AMOUNT})\s+(${AMOUNT})(?=\s|$)`, "g");

/** An amount token as printed: a character stuck to the ₹ makes it a debit. */
function sliceAmount(token: string): number | null {
  const rupees = parseRupees(token.slice(token.indexOf("₹")));
  return rupees === null ? null : /^[-\d]₹/.test(token) ? -rupees : rupees;
}

const ATOM = new RegExp(
  String.raw`Round ups atom\s+Opening balance\s+Total credits\s+Interest earned\s+Total debits\s+Closing balance\s+\+\s+\+\s+-\s+=\s+(${AMOUNT})\s+(${AMOUNT})\s+(${AMOUNT})\s+(${AMOUNT})\s+(${AMOUNT})`,
);
const TOTAL_WITH_ATOMS = new RegExp(String.raw`Total closing balance \(incl\. atoms\)\s+(${AMOUNT})`);

export function isSliceStatement(text: string): boolean {
  return /slice small finance bank/i.test(text) || /help@slice\.bank\.in/i.test(text);
}

export function parseSlice(text: string): ParseResult {
  const headers = [...text.matchAll(PAGE_HEADER)];
  if (headers.length === 0) return { ok: false, problem: "couldn't read the statement's period" };
  const periodStart = parseNamedMonthDate(headers[0][1]);
  const periodEnd = parseNamedMonthDate(headers[0][2]);
  if (!periodStart || !periodEnd) return { ok: false, problem: "couldn't read the statement's period" };

  const summary = SUMMARY.exec(text);
  if (!summary) return { ok: false, problem: "couldn't find the account summary" };
  const opening = sliceAmount(summary[1]);
  const closing = sliceAmount(summary[5]);
  if (opening === null) return { ok: false, problem: "couldn't read the opening balance" };
  if (closing === null) return { ok: false, problem: "couldn't read the closing balance" };

  // The monthly statement also reports the round-up (atom) account, whose money is part of the balance the
  // range statements print. Its opening and closing balance come from its own summary.
  let held: { opening: number; closing: number; constant: boolean } | undefined;
  const atom = ATOM.exec(text);
  if (atom) {
    const [aOpen, aCredits, aInterest, aDebits, aClose] = [1, 2, 3, 4, 5].map((i) => sliceAmount(atom[i]));
    if ([aOpen, aCredits, aInterest, aDebits, aClose].includes(null)) return { ok: false, problem: "couldn't read the round-up account's balances" };
    held = { opening: aOpen!, closing: aClose!, constant: aCredits === 0 && aInterest === 0 && aDebits === 0 && aOpen === aClose };
  }

  const accountNumber = /A\/C number\s+(\d+)/.exec(text)?.[1];
  const body = text.slice((summary.index ?? 0) + summary[0].length).replace(PAGE_HEADER, " ").replace(FOOTER, " ").replace(GENERATED, " ");

  const rows: StatementRow[] = [];
  for (const m of body.matchAll(ROW)) {
    const date = parseNamedMonthDate(m[1]);
    const amount = sliceAmount(m[3]);
    const balance = sliceAmount(m[4]);
    if (!date || amount === null || balance === null) return { ok: false, problem: "couldn't read a row's date or amount" };
    rows.push({ date, amount, balance });
  }

  // The overview prints the total with atoms, which the two accounts' closing balances must add up to.
  const total = TOTAL_WITH_ATOMS.exec(text);
  const lastBalance = rows.length > 0 ? orderRows(opening, rows).at(-1)!.balance : opening;
  if (total && held) {
    const printed = sliceAmount(total[1]);
    if (printed === null || Math.round((lastBalance + held.closing) * 100) !== Math.round(printed * 100)) {
      return { ok: false, problem: "the savings and round-up balances don't add up to the total the statement prints" };
    }
  }

  return {
    ok: true,
    parsed: {
      bank: "Slice",
      ...(accountNumber && last4Of(accountNumber) && { accountLast4: last4Of(accountNumber) }),
      statement: { periodStart, periodEnd, openingBalance: opening, closingBalance: closing, rows: orderRows(opening, rows), ...(held && { held }) },
    },
  };
}
