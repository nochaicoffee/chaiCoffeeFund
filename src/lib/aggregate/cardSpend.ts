import { ISO_DATE_PATTERN } from "../format/date";
import type { Card, Statement } from "../sheets/types";

/**
 * Card spending math behind the Cards dashboard. Definitions are PRD §8
 * ("How the numbers are defined", confirmed 2026-10-17):
 * - A month's spend is the sum of statement totals whose statement date falls
 *   in that month. A credit balance (negative total) counts as ₹0, because it
 *   already lowers the next statement's total.
 * - The monthly average is the period total ÷ every month so far in the period.
 * - Highest and lowest month only look at months that have statements.
 * - Outstanding is what's still due on pending bills (total − paid, never below
 *   ₹0), on every card including closed ones. Utilization uses active cards only.
 * - Statements whose card no longer exists, or with an unreadable date or
 *   amount, are left out of everything.
 * All dates are ISO strings (YYYY-MM-DD); `today` comes from todayIso().
 */

/** A calendar month as "YYYY-MM". */
export type MonthKey = string;

export type SpendPeriod = { kind: "year"; year: number } | { kind: "all" };

/** The cards and their statements, as read from the Sheet. */
export interface CardData {
  cards: Card[];
  statements: Statement[];
}

export interface MonthAmount {
  month: MonthKey;
  amount: number;
}

/**
 * A Sheet cell as a number, or null when it's blank or not a number. Blank cells
 * arrive as "" and text cells as strings, and Number("") would silently be 0.
 */
function toAmount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * The statements every function works from: on a card that exists, with readable
 * dates and total, and with amounts as real numbers (a blank amount paid is 0).
 */
function usableStatements({ cards, statements }: CardData, cardId?: string): Statement[] {
  const cardIds = new Set(cards.map((c) => c.id));
  const usable: Statement[] = [];
  for (const s of statements) {
    if (!cardIds.has(s.cardId) || (cardId !== undefined && s.cardId !== cardId)) continue;
    if (!ISO_DATE_PATTERN.test(String(s.statementDate)) || !ISO_DATE_PATTERN.test(String(s.dueDate))) continue;
    const totalAmountDue = toAmount(s.totalAmountDue);
    if (totalAmountDue === null) continue;
    usable.push({ ...s, totalAmountDue, amountPaid: toAmount(s.amountPaid) ?? 0 });
  }
  return usable;
}

/** A statement's contribution to spend: its total, with a credit balance counted as ₹0. */
function spendOf(statement: Statement): number {
  return Math.max(0, statement.totalAmountDue);
}

/** What's still due on a statement: total minus anything paid, never below ₹0. Blank amounts count as ₹0. */
export function remainingDue(statement: Statement): number {
  return Math.max(0, (toAmount(statement.totalAmountDue) ?? 0) - (toAmount(statement.amountPaid) ?? 0));
}

export function monthOf(isoDate: string): MonthKey {
  return isoDate.slice(0, 7);
}

export function addMonths(month: MonthKey, count: number): MonthKey {
  const [year, m] = month.split("-").map(Number);
  const index = year * 12 + (m - 1) + count;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Every month from `from` to `to`, inclusive. Empty when `from` is after `to`. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const months: MonthKey[] = [];
  for (let month = from; month <= to; month = addMonths(month, 1)) months.push(month);
  return months;
}

/** Whole days from one ISO date to another; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const utc = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/** (value − base) ÷ base, or null when there's no base to compare against. */
export function percentChange(value: number, base: number): number | null {
  return base === 0 ? null : (value - base) / base;
}

function spendByMonth(statements: Statement[]): Map<MonthKey, number> {
  const spend = new Map<MonthKey, number>();
  for (const s of statements) {
    const month = monthOf(s.statementDate);
    spend.set(month, (spend.get(month) ?? 0) + spendOf(s));
  }
  return spend;
}

/** Spend per statement-date month, for all cards or one card. Only months with statements appear. */
export function monthlySpend(data: CardData, cardId?: string): Map<MonthKey, number> {
  return spendByMonth(usableStatements(data, cardId));
}

function monthsSoFarFor(period: SpendPeriod, today: string, statements: Statement[]): MonthKey[] {
  const current = monthOf(today);
  if (period.kind === "year") {
    const last = `${period.year}-12` < current ? `${period.year}-12` : current;
    return monthRange(`${period.year}-01`, last);
  }
  if (statements.length === 0) return [];
  const first = statements.map((s) => monthOf(s.statementDate)).reduce((a, b) => (a < b ? a : b));
  return monthRange(first, current);
}

/**
 * Every month so far in the period: Jan to the current month for this year, all
 * 12 for a past year, none for a future year, and from the first statement's
 * month to the current month for all time.
 */
export function monthsSoFar(period: SpendPeriod, today: string, data: CardData, cardId?: string): MonthKey[] {
  return monthsSoFarFor(period, today, usableStatements(data, cardId));
}

export interface SpendSummary {
  /** Every month so far in the period, with 0 for months that have no statements. */
  months: MonthAmount[];
  total: number;
  /** total ÷ every month so far (0 when the period has no months yet). */
  average: number;
  /** Highest and lowest among months that have at least one statement; earliest wins a tie. */
  highest: MonthAmount | null;
  lowest: MonthAmount | null;
  monthsWithStatements: number;
}

export function spendSummary(data: CardData, period: SpendPeriod, today: string, cardId?: string): SpendSummary {
  const statements = usableStatements(data, cardId);
  const spend = spendByMonth(statements);
  const months = monthsSoFarFor(period, today, statements).map((month) => ({ month, amount: spend.get(month) ?? 0 }));
  const withStatements = months.filter((m) => spend.has(m.month));
  const total = months.reduce((sum, m) => sum + m.amount, 0);
  return {
    months,
    total,
    average: months.length === 0 ? 0 : total / months.length,
    highest: withStatements.reduce<MonthAmount | null>((best, m) => (best === null || m.amount > best.amount ? m : best), null),
    lowest: withStatements.reduce<MonthAmount | null>((best, m) => (best === null || m.amount < best.amount ? m : best), null),
    monthsWithStatements: withStatements.length,
  };
}

export interface MonthChange {
  current: number;
  previous: number;
  /** current − previous */
  change: number;
  /** change ÷ previous, null when last month had no spend. */
  percent: number | null;
}

/** This calendar month's spend against last month's. */
export function monthOverMonth(data: CardData, today: string, cardId?: string): MonthChange {
  const spend = monthlySpend(data, cardId);
  const month = monthOf(today);
  const current = spend.get(month) ?? 0;
  const previous = spend.get(addMonths(month, -1)) ?? 0;
  return { current, previous, change: current - previous, percent: percentChange(current, previous) };
}

export interface DueItem {
  statement: Statement;
  /** What's still due: total minus any partial payment, never below 0. */
  remaining: number;
  /** Days from today to the due date; negative when overdue. */
  daysUntilDue: number;
}

/** Pending statements, soonest due first, on every card including closed ones. */
export function pendingStatements(data: CardData, today: string, cardId?: string): DueItem[] {
  return usableStatements(data, cardId)
    .filter((s) => s.status === "Pending")
    .map((statement) => ({ statement, remaining: remainingDue(statement), daysUntilDue: daysBetween(today, statement.dueDate) }))
    .sort(
      (a, b) =>
        a.statement.dueDate.localeCompare(b.statement.dueDate) ||
        a.statement.statementDate.localeCompare(b.statement.statementDate),
    );
}

export interface PendingSummary {
  count: number;
  /** The same number as outstanding: what's still due on every pending bill. */
  total: number;
  nextDueDate: string | null;
}

/** The greeting's pending line: every pending bill, what's left on them, and the next due date. */
export function pendingSummary(data: CardData, today: string, cardId?: string): PendingSummary {
  const items = pendingStatements(data, today, cardId);
  return {
    count: items.length,
    total: items.reduce((sum, i) => sum + i.remaining, 0),
    nextDueDate: items[0]?.statement.dueDate ?? null,
  };
}

export interface CardsUtilization {
  /** What's still due on pending bills across every card, closed ones included. Equals the pending total. */
  outstanding: number;
  /** Credit limit across active cards. */
  limit: number;
  /** Active cards' outstanding ÷ active cards' limit; null when no active card has a limit. */
  utilization: number | null;
}

/** The All Cards figures: totals across cards, not an average of each card's percentage. */
export function allCardsUtilization(data: CardData): CardsUtilization {
  const pending = usableStatements(data).filter((s) => s.status === "Pending");
  const active = new Set(data.cards.filter((c) => c.status === "Active").map((c) => c.id));
  const outstanding = pending.reduce((sum, s) => sum + remainingDue(s), 0);
  const activeOutstanding = pending.filter((s) => active.has(s.cardId)).reduce((sum, s) => sum + remainingDue(s), 0);
  const limit = data.cards.filter((c) => active.has(c.id)).reduce((sum, c) => sum + c.creditLimit, 0);
  return { outstanding, limit, utilization: limit > 0 ? activeOutstanding / limit : null };
}

/** Heatmap shade 1 (lowest) to 5 (highest), relative to the largest month shown. */
export function heatLevel(amount: number, max: number): 1 | 2 | 3 | 4 | 5 {
  if (max <= 0 || amount <= 0) return 1;
  return Math.min(5, Math.max(1, Math.ceil((amount / max) * 5))) as 1 | 2 | 3 | 4 | 5;
}

export interface HeatCell {
  month: MonthKey;
  /** Spend that month, or null when there's nothing to show. */
  amount: number | null;
  state: "data" | "no-data" | "upcoming";
  /** 0 for cells without data, otherwise 1–5 from heatLevel. */
  level: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface HeatRow {
  year: number;
  cells: HeatCell[];
}

/**
 * One row of 12 months per year: the period's year, or every year from the first
 * statement to today for all time. Shades are relative to the largest month shown.
 */
export function heatmapRows(data: CardData, period: SpendPeriod, today: string, cardId?: string): HeatRow[] {
  const statements = usableStatements(data, cardId);
  const spend = spendByMonth(statements);
  const current = monthOf(today);
  let years: number[];
  if (period.kind === "year") {
    years = [period.year];
  } else {
    const first = monthsSoFarFor(period, today, statements)[0];
    if (!first) return [];
    const firstYear = Number(first.slice(0, 4));
    years = Array.from({ length: Number(current.slice(0, 4)) - firstYear + 1 }, (_, i) => firstYear + i);
  }
  const shown = years.flatMap((y) => monthRange(`${y}-01`, `${y}-12`));
  const max = Math.max(0, ...shown.filter((m) => m <= current).map((m) => spend.get(m) ?? 0));
  return years.map((year) => ({
    year,
    cells: monthRange(`${year}-01`, `${year}-12`).map((month): HeatCell => {
      if (month > current) return { month, amount: null, state: "upcoming", level: 0 };
      const amount = spend.get(month);
      if (amount === undefined) return { month, amount: null, state: "no-data", level: 0 };
      return { month, amount, state: "data", level: heatLevel(amount, max) };
    }),
  }));
}

export interface SeriesPoint {
  month: MonthKey;
  /** The sum of byCard, so stacked bars always add up to it. */
  total: number;
  /** Spend per card id that month, for every card (0 when a card had no statement). */
  byCard: Record<string, number>;
}

/** Monthly spend for the trend chart, split by every card, from the same per-month sums as everything else. */
export function spendSeries(data: CardData, months: MonthKey[]): SeriesPoint[] {
  const perCard = new Map(data.cards.map((c) => [c.id, monthlySpend(data, c.id)]));
  return months.map((month) => {
    const byCard = Object.fromEntries(data.cards.map((c) => [c.id, perCard.get(c.id)?.get(month) ?? 0]));
    return { month, total: Object.values(byCard).reduce((sum, v) => sum + v, 0), byCard };
  });
}
