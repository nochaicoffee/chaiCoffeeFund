import type { IncomeEntry, IncomeSource } from "../sheets/types";
import { daysBetween } from "./cardSpend";
import { nearestScheduledDate } from "./incomeSchedule";
import { toPaise, type StatementRow } from "./statementBalances";

/**
 * Income read from a bank statement (#187, PRD §8): the NetApp salary, and any other source given a statement
 * text, comes in from the account statements the sync already reads, instead of being typed in. Pure: given one
 * statement's rows, the account it's for, the sources and the entries so far, which entries to create.
 *
 * Rules (confirmed by Prathik 2026-10-24/25):
 * - A deposit is an active source's when its narration contains the source's `statementMatch`, ignoring case and spaces
 *   (pdf.js wraps a narration with stray spaces, "NET APP"). The longest match wins if two sources match. A source
 *   with an `accountId` only takes deposits into that account.
 * - It's always tagged Regular: a bonus is retagged by hand.
 * - Its expected date is the source's scheduled date nearest the day it landed (within half a cycle), so a salary
 *   that lands on Sep 30 receives the Oct 1 payday; else the day it landed.
 * - It's never added twice: not when the same statement line was read before (`statementRef`), and not when the
 *   source already had an entry of the same amount within 3 days before this statement, which is the same money
 *   read from another statement (a monthly one dates rows by posting, a yearly one by value date) or typed in by
 *   hand. Two lines in one statement are two payments, however alike.
 */

/** Two entries this close, same source and amount, are the same payment. */
const SAME_PAYMENT_DAYS = 3;

const squash = (text: string) => text.replace(/\s+/g, "").toUpperCase();

/**
 * The same statement line, whichever email or statement it's read from: the account, the day, the amount, and
 * which of that day's same-amount lines it is (1 for the first), since a monthly and a yearly statement list them alike.
 */
export const statementRef = (accountId: string, row: Pick<StatementRow, "date" | "amount">, nth = 1) => `${accountId}:${row.date}:${toPaise(row.amount)}:${nth}`;

export function matchSource(narration: string, accountId: string, sources: IncomeSource[]): IncomeSource | undefined {
  const text = squash(narration);
  return sources
    .filter((s) => s.status === "Active" && s.statementMatch && squash(s.statementMatch) !== "" && text.includes(squash(s.statementMatch)) && (!s.accountId || s.accountId === accountId))
    .sort((a, b) => squash(b.statementMatch!).length - squash(a.statementMatch!).length)[0];
}

const samePayment = (a: Pick<IncomeEntry, "incomeSourceId" | "amount" | "receivedDate">, b: Pick<IncomeEntry, "incomeSourceId" | "amount" | "receivedDate">) =>
  a.incomeSourceId === b.incomeSourceId && toPaise(a.amount) === toPaise(b.amount) && !!a.receivedDate && !!b.receivedDate && Math.abs(daysBetween(a.receivedDate, b.receivedDate)) <= SAME_PAYMENT_DAYS;

/** The entries one statement adds, in its rows' order. `entries` should include any planned earlier in the same sync. */
export function incomeFromStatement(rows: StatementRow[], accountId: string, sources: IncomeSource[], entries: Pick<IncomeEntry, "incomeSourceId" | "amount" | "receivedDate" | "statementRef">[]): Omit<IncomeEntry, "id">[] {
  const refs = new Set(entries.map((e) => e.statementRef).filter(Boolean));
  const seen = new Map<string, number>();
  const out: Omit<IncomeEntry, "id">[] = [];
  for (const row of rows) {
    if (row.amount <= 0 || !row.narration) continue;
    const source = matchSource(row.narration, accountId, sources);
    if (!source) continue;
    const key = `${row.date}:${toPaise(row.amount)}`;
    const nth = (seen.get(key) ?? 0) + 1;
    seen.set(key, nth);
    const ref = statementRef(accountId, row, nth);
    const entry: Omit<IncomeEntry, "id"> = {
      incomeSourceId: source.id,
      expectedDate: nearestScheduledDate(source, row.date) ?? row.date,
      receivedDate: row.date,
      amount: row.amount,
      status: "Received",
      accountId,
      tag: "Regular",
      origin: "Statement",
      statementRef: ref,
    };
    // Two of this statement's own lines are two payments, so only what was there before it is looked at; and an
    // earlier statement's line on the same day is judged by its ref alone (the nth same-amount line that day).
    if (refs.has(ref) || entries.some((k) => !k.statementRef?.startsWith(`${accountId}:${row.date}:`) && samePayment(k, entry))) continue;
    out.push(entry);
    refs.add(ref);
  }
  return out;
}
