import { daysBetween, monthOf, type MonthKey } from "./cardSpend";
import { isClosed, lastDayOfMonth, lastMonthsOfSpan, monthsBetween } from "./accounts";
import type { Account, BalanceSnapshot } from "../sheets/types";

/**
 * When each account's balance was read, month by month (docs/design/accounts.md, the
 * check-in calendar). A reading is a recorded balance; the grid is accounts by months, each
 * cell holding the readings of that month. It covers the last 12 months of the period, as the
 * charts cut a long period to their last months.
 *
 * - A month before the account existed, or after it was closed, is "none": it can't have been missed.
 * - A month with no reading is "missed", except the current one, which is "open" until the month is over.
 */

export const CHECK_IN_MONTHS = 12;

export type CheckInState = "read" | "missed" | "open" | "none";

export interface CheckInReading {
  id: string;
  date: string;
  balance: number;
}

export interface CheckInCell {
  month: MonthKey;
  state: CheckInState;
  readings: CheckInReading[];
}

export interface CheckInRow {
  account: Account;
  cells: CheckInCell[];
}

export interface CheckInGrid {
  months: MonthKey[];
  rows: CheckInRow[];
  /** Readings across the grid. */
  readings: number;
  /** Months with no reading, across the grid. */
  missed: number;
  /** The longest stretch between two readings of one account (or since its last, up to today, while it's open). */
  longestGap: { days: number; account: Account | null };
  /** The account read most often in the grid. */
  busiest: { account: Account | null; readings: number };
}

export function checkInGrid(accounts: Account[], snapshots: BalanceSnapshot[], span: { from: string; to: string }, today: string): CheckInGrid {
  const shown = lastMonthsOfSpan(span, CHECK_IN_MONTHS);
  const months = monthsBetween(shown.from, shown.to);
  const windowStart = `${months[0]}-01`;
  let readings = 0;
  let missed = 0;
  let longestGap: CheckInGrid["longestGap"] = { days: 0, account: null };
  let busiest: CheckInGrid["busiest"] = { account: null, readings: 0 };

  const rows = accounts.map((account): CheckInRow => {
    const mine = snapshots.filter((s) => s.accountId === account.id).sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
    const firstDate = mine[0]?.date;
    const start = firstDate && firstDate < account.startDate ? firstDate : account.startDate;
    const closedOn = isClosed(account) ? (mine.at(-1)?.date ?? null) : null;
    const cells = months.map((month): CheckInCell => {
      const inMonth = mine.filter((s) => monthOf(s.date) === month).map(({ id, date, balance }) => ({ id, date, balance }));
      const state: CheckInState =
        inMonth.length > 0 ? "read" : lastDayOfMonth(month) < start || (closedOn !== null && `${month}-01` > closedOn) ? "none" : month === monthOf(today) ? "open" : "missed";
      if (state === "missed") missed++;
      return { month, state, readings: inMonth };
    });
    const count = cells.reduce((n, c) => n + c.readings.length, 0);
    readings += count;
    if (count > busiest.readings) busiest = { account, readings: count };
    // Gaps between the readings inside the grid, and from the last one to today while the account is open.
    const inside = mine.map((s) => s.date).filter((d) => d >= windowStart && d <= shown.to);
    // An open account's last reading counts to the period's end; one with none in the window was unread for all of it (from when it began).
    const stops = !isClosed(account) ? (inside.length > 0 ? [...inside, shown.to] : start <= shown.to ? [start > windowStart ? start : windowStart, shown.to] : []) : inside;
    for (let i = 1; i < stops.length; i++) {
      const days = daysBetween(stops[i - 1], stops[i]);
      if (days > longestGap.days) longestGap = { days, account };
    }
    return { account, cells };
  });
  return { months, rows, readings, missed, longestGap, busiest };
}
