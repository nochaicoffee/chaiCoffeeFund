import { balanceBefore, dayBefore, isBigDrop, lastDayOfMonth, sameDayBalance } from "./accounts";
import { monthOf } from "./cardSpend";
import type { Account, BalanceSnapshot, ReviewStatus } from "../sheets/types";

/**
 * Turning a bank statement (monthly, yearly or any range) into account balances.
 * Pure: the PDF is read and the Sheet written elsewhere, so every rule here can
 * be tested on fixtures.
 * - A statement is trusted only if its own numbers add up (`checkStatement`):
 *   opening plus each movement is the running balance, and the last one is the
 *   closing balance. If not, nothing from it is written.
 * - It gives a balance at the end of every month it has movements in, and one at
 *   its own end (`balancesFromStatement`). A month with none is left out:
 *   carrying the last balance forward (`balanceOn`) already gives the same.
 * - Against what's recorded (`reconcile`), each is created, already there, or
 *   differs from a balance recorded for the same day. The recorded balance wins:
 *   it is left as it is and the difference becomes a review (`planReviews`) that
 *   stays open, needing attention, until the statement's value is accepted or the
 *   recorded one kept. Nothing recorded is ever changed without that answer.
 * Money is compared in paise, so 0.1 + 0.2 style float noise is never a mismatch.
 */

export interface StatementRow {
  date: string;
  /** What it moved the balance by: money in is positive, money out negative. */
  amount: number;
  /** The balance after it, as the statement prints it. */
  balance: number;
}

export interface AccountStatement {
  /** The first and last day the statement covers. */
  periodStart: string;
  periodEnd: string;
  /** The balance at the start of periodStart's day, before its first movement. */
  openingBalance: number;
  closingBalance: number;
  /** Oldest first once through `orderRows`. */
  rows: StatementRow[];
  /**
   * Money the account holds that the rows' running balance doesn't show (Slice's round-up "atom" account),
   * which counts toward the account's balance. `constant` is whether it stayed put the whole statement:
   * only then is it known on the days between, so only then do month-ends include it.
   */
  held?: { opening: number; closing: number; constant: boolean };
}

export const toPaise = (rupees: number): number => Math.round(rupees * 100);

/** Same amount to the paisa. */
export const sameAmount = (a: number, b: number): boolean => toPaise(a) === toPaise(b);

/** Whether each row's balance follows from the one before it, starting at `opening`. Returns the first row that breaks, or null. */
function firstBrokenRow(opening: number, rows: StatementRow[]): number | null {
  let running = toPaise(opening);
  for (let i = 0; i < rows.length; i++) {
    running += toPaise(rows[i].amount);
    if (running !== toPaise(rows[i].balance)) return i;
    // Carry the printed balance, so one bad row is reported once, not on every row after it.
    running = toPaise(rows[i].balance);
  }
  return null;
}

/**
 * Rows oldest first. Banks print either order, and rows on one day have no time,
 * so the date can't say which: the running balance does. The rows as given are
 * kept when they chain from the opening balance, otherwise reversed if that chains.
 * Neither chaining leaves them as given, for `checkStatement` to report.
 */
export function orderRows(openingBalance: number, rows: StatementRow[]): StatementRow[] {
  if (firstBrokenRow(openingBalance, rows) === null) return rows;
  const reversed = [...rows].reverse();
  return firstBrokenRow(openingBalance, reversed) === null ? reversed : rows;
}

export type StatementCheck = { ok: true } | { ok: false; problem: string };

/** Says what doesn't add up, never the amounts. */
export function checkStatement(statement: AccountStatement): StatementCheck {
  const { periodStart, periodEnd, openingBalance, closingBalance, rows } = statement;
  if (periodStart > periodEnd) return { ok: false, problem: "the statement's period ends before it starts" };
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].date < periodStart || rows[i].date > periodEnd) return { ok: false, problem: `row ${i + 1} is dated outside the statement's period` };
    if (i > 0 && rows[i].date < rows[i - 1].date) return { ok: false, problem: `row ${i + 1} is dated before the row above it` };
  }
  const broken = firstBrokenRow(openingBalance, rows);
  if (broken !== null) return { ok: false, problem: `row ${broken + 1}'s balance doesn't follow from the one before it` };
  const last = rows.length > 0 ? rows[rows.length - 1].balance : openingBalance;
  if (!sameAmount(last, closingBalance)) return { ok: false, problem: "the last balance doesn't match the closing balance" };
  return { ok: true };
}

export type BalancePointKind = "opening" | "month-end" | "closing";

export interface BalancePoint {
  date: string;
  balance: number;
  kind: BalancePointKind;
}

/**
 * The balances a checked statement gives, oldest first: the opening balance (the
 * day before the period), the balance at the end of each month it has movements
 * in before the last one, and the closing balance on the period's last day.
 * A month ending on the period's own last day is the closing balance, listed once.
 * Money held outside the rows (`held`) is added to the opening and closing balance, and to
 * month-ends only when it didn't move; if it did, the days between aren't known, so there are none.
 */
export function balancesFromStatement(statement: AccountStatement): BalancePoint[] {
  const { periodStart, periodEnd, openingBalance, closingBalance, rows, held } = statement;
  const plus = (rupees: number, extra: number) => Math.round((rupees + extra) * 100) / 100;
  const points: BalancePoint[] = [{ date: dayBefore(periodStart), balance: plus(openingBalance, held?.opening ?? 0), kind: "opening" }];
  const lastRowOfMonth = new Map<string, StatementRow>();
  for (const row of rows) lastRowOfMonth.set(monthOf(row.date), row);
  for (const [month, row] of lastRowOfMonth) {
    const monthEnd = lastDayOfMonth(month);
    if (monthEnd >= periodEnd || (held && !held.constant)) continue;
    points.push({ date: monthEnd, balance: plus(row.balance, held?.opening ?? 0), kind: "month-end" });
  }
  points.push({ date: periodEnd, balance: plus(closingBalance, held?.closing ?? 0), kind: "closing" });
  return points.sort((a, b) => (a.date === b.date ? kindOrder(a.kind) - kindOrder(b.kind) : a.date < b.date ? -1 : 1));
}

const kindOrder = (kind: BalancePointKind): number => (kind === "opening" ? 0 : kind === "month-end" ? 1 : 2);

export type SkipReason = "closed-account" | "period-in-future" | "before-account-opened";

/** Whether a statement can be applied to this account at all, and the reason if not. */
export function statementSkipReason(account: Pick<Account, "status" | "startDate">, statement: Pick<AccountStatement, "periodEnd">, today: string): SkipReason | null {
  if (account.status === "Inactive") return "closed-account";
  if (statement.periodEnd > today) return "period-in-future";
  if (statement.periodEnd < account.startDate) return "before-account-opened";
  return null;
}

export type ReconcileAction =
  | { type: "create"; date: string; balance: number; kind: BalancePointKind; bigDrop: boolean }
  | { type: "unchanged"; date: string; balance: number; kind: BalancePointKind; snapshotId: string }
  /** The statement says something different from the balance recorded for the day. The recorded one stays; `balance` is the statement's. */
  | { type: "mismatch"; date: string; balance: number; kind: BalancePointKind; snapshotId: string; recordedBalance: number; bigDrop: boolean };

/**
 * What to do with each balance a statement gives, against the balances recorded.
 * Points are handled oldest first and count the ones before them, so a "big drop" is measured
 * against what the statement itself just said. The opening balance is only ever
 * created when the account has nothing before that day; a balance recorded for that very day is
 * compared like any other, so two statements that disagree about a shared day (a monthly inside a
 * custom range) are a mismatch. Running it again once the creates are applied gives `unchanged`
 * for them and the same mismatches (see `planReviews`).
 */
export function reconcile(existing: BalanceSnapshot[], accountId: string, points: BalancePoint[], accountStartDate?: string): ReconcileAction[] {
  const working = [...existing];
  const actions: ReconcileAction[] = [];
  let seq = 0;
  for (const point of points) {
    // A balance from before the account was opened would be a balance of an account that wasn't there.
    if (accountStartDate && point.date < accountStartDate) continue;
    const sameDay = sameDayBalance(working, accountId, point.date);
    // An opening balance with something earlier recorded is carried from it: nothing to add.
    // One recorded for that very day is compared like any other (usually the previous statement's closing).
    if (point.kind === "opening" && !sameDay && working.some((s) => s.accountId === accountId && s.date < point.date)) continue;
    if (sameDay && sameAmount(sameDay.balance, point.balance)) {
      actions.push({ type: "unchanged", date: point.date, balance: point.balance, kind: point.kind, snapshotId: sameDay.id });
      continue;
    }
    const before = balanceBefore(working, accountId, point.date);
    const bigDrop = isBigDrop(before?.balance ?? null, point.balance);
    if (sameDay) {
      // The recorded balance stays in `working` too, so later points are measured against what's really there.
      actions.push({ type: "mismatch", date: point.date, balance: point.balance, kind: point.kind, snapshotId: sameDay.id, recordedBalance: sameDay.balance, bigDrop });
    } else {
      actions.push({ type: "create", date: point.date, balance: point.balance, kind: point.kind, bigDrop });
      working.push({ id: `pending-${seq++}`, accountId, date: point.date, balance: point.balance });
    }
  }
  return actions;
}

// --- Reviews: a mismatch waits for an answer ---

/** What a review row holds that planning needs: which balance it is about, and what the statement said. */
export interface ReviewRecord {
  id: string;
  accountId: string;
  date: string;
  statementBalance: number;
  status: ReviewStatus;
}

export type MismatchAction = Extract<ReconcileAction, { type: "mismatch" }>;

/**
 * Which mismatches need a new review, and which open reviews they replace.
 * - The same statement value for the same account and day, already reviewed in any state, is
 *   not raised again: Open is already waiting, Kept was answered, and Accepted means the
 *   recorded balance now matches. So syncing the same statement twice adds nothing.
 * - A different statement value for a day with an Open review (say a corrected statement) replaces it:
 *   the old review is marked Superseded, so a day never has two questions open.
 */
export function planReviews(actions: ReconcileAction[], accountId: string, reviews: ReviewRecord[]): { create: MismatchAction[]; supersede: string[] } {
  const create: MismatchAction[] = [];
  const supersede: string[] = [];
  for (const action of actions) {
    if (action.type !== "mismatch") continue;
    const forDay = reviews.filter((r) => r.accountId === accountId && r.date === action.date);
    if (forDay.some((r) => r.status !== "Superseded" && sameAmount(r.statementBalance, action.balance))) continue;
    create.push(action);
    for (const r of forDay) if (r.status === "Open") supersede.push(r.id);
  }
  return { create, supersede };
}

/** What answering a review does to the recorded balance: accepting writes the statement's value, keeping changes nothing. */
export function resolution(review: Pick<ReviewRecord, "statementBalance">, choice: "accept" | "keep"): { status: "Accepted" | "Kept"; setBalance: number | null } {
  return choice === "accept" ? { status: "Accepted", setBalance: review.statementBalance } : { status: "Kept", setBalance: null };
}
