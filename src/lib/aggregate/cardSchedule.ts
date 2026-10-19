import type { Card } from "../sheets/types";

/**
 * A card's billing schedule, from its statement day (1–31) and due-day buffer
 * (#75). Each statement's real due date comes from its PDF; this only predicts
 * the next statement and due date, and prefills Add statement. A statement day
 * past the end of a short month falls on that month's last day, and comes back
 * to its own day the month after: a card billed on the 31st is billed on 28 Feb,
 * then 31 Mar.
 */

export type CardSchedule = Pick<Card, "statementDay" | "dueDayBuffer">;

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function isoDate(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

/** The statement date in the month `offset` months from `date`'s month (0 = the same month). */
function statementDateInMonth(date: string, statementDay: number, offset: number): string {
  const first = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1 + offset, 1));
  const year = first.getUTCFullYear();
  const monthIndex = first.getUTCMonth();
  return isoDate(year, monthIndex, Math.min(statementDay, daysInMonth(year, monthIndex)));
}

/** The first statement date on or after `today`: this month's, or next month's once it has passed. */
export function nextStatementDate(card: CardSchedule, today: string): string {
  const thisMonth = statementDateInMonth(today, card.statementDay, 0);
  return thisMonth >= today ? thisMonth : statementDateInMonth(today, card.statementDay, 1);
}

/** The most recent statement date on or before `today`: this month's once it has come, otherwise last month's. */
export function latestStatementDate(card: CardSchedule, today: string): string {
  const thisMonth = statementDateInMonth(today, card.statementDay, 0);
  return thisMonth <= today ? thisMonth : statementDateInMonth(today, card.statementDay, -1);
}

/** The due date for a statement: `dueDayBuffer` days after it. */
export function dueDateFor(card: CardSchedule, statementDate: string): string {
  const date = new Date(`${statementDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + card.dueDayBuffer);
  return date.toISOString().slice(0, 10);
}
