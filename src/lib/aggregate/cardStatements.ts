import { daysBetween, inPeriod, monthOf, remainingDue, statementCounts, toAmount, usableStatements, type CardData, type MonthKey, type SpendPeriod } from "./cardSpend";
import { statementVariance } from "./cards";
import { optionLabel } from "../format/labels";
import type { Card, Statement } from "../sheets/types";

/**
 * The full Statements page: its summary numbers and its list (filter, search,
 * sort, group by month, paginate). It works from the same cleaned statements as
 * the Cards dashboard (cardSpend.ts), so statements on a deleted card or with an
 * unreadable date or amount are left out here too.
 */

export type StatusFilter = "all" | "pending" | "paid";
export type SortOrder = "newest" | "oldest";

/**
 * The minimum payments still owed across every pending bill: each one's minimum
 * due less anything already paid on it, never below ₹0. A payment counts towards
 * the minimum first, so paying ₹3,000 on a ₹5,000 minimum leaves ₹2,000
 * (PRD §8, decided 2026-10-17). A blank minimum counts as ₹0.
 */
export function minimumDueNow(data: CardData): number {
  return usableStatements(data)
    .filter((s) => s.status === "Pending")
    .reduce((sum, s) => sum + Math.max(0, (toAmount(s.minimumAmountDue) ?? 0) - (s.amountPaid ?? 0)), 0);
}

export interface PeriodOverview {
  /** Statements dated in the period, how many cards they're on, and how many of them are pending. */
  count: number;
  cardCount: number;
  pending: number;
}

/** The page subtitle's numbers: "5 in 2026 across 2 cards, 2 pending". */
export function periodOverview(data: CardData, period: SpendPeriod): PeriodOverview {
  const statements = inPeriod(usableStatements(data), period);
  return {
    count: statements.length,
    cardCount: new Set(statements.map((s) => s.cardId)).size,
    pending: statements.filter((s) => s.status === "Pending").length,
  };
}

export interface PaidSummary {
  /** What was paid on the period's statements marked Paid, and how many there are. */
  total: number;
  count: number;
  /** Of those, how many were paid in full (amount paid at least the total due) and how many in part. */
  inFull: number;
  partial: number;
}

/** The Paid and Paid in full tiles. Paid in full uses the dashboard's rule (statementCounts). */
export function paidSummary(data: CardData, period: SpendPeriod): PaidSummary {
  const { closed, inFull } = statementCounts(data, period);
  const total = inPeriod(usableStatements(data), period)
    .filter((s) => s.status === "Paid")
    .reduce((sum, s) => sum + (s.amountPaid ?? 0), 0);
  return { total, count: closed, inFull, partial: closed - inFull };
}

/** What the list shows. Left out, status is every statement and sort is newest first. */
export interface StatementQuery {
  period: SpendPeriod;
  status?: StatusFilter;
  cardId?: string;
  search?: string;
  sort?: SortOrder;
}

function cardWords(card: Card | undefined): string {
  return [card?.name, card?.alias, card && optionLabel(card.issuer), card?.last4].filter(Boolean).join(" ").toLowerCase();
}

/**
 * Every word of the search must match the card (name, alias, issuer or last 4) or
 * one of the statement's amounts in whole rupees, ignoring "₹", commas and paise:
 * "hdfc 38,500" finds HDFC statements for ₹38,500 or ₹38,500.50.
 */
function matchesSearch(s: Statement, card: Card | undefined, search: string): boolean {
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const words = cardWords(card);
  const amounts = [s.totalAmountDue, s.minimumAmountDue, s.amountPaid]
    .map(toAmount)
    .filter((v): v is number => v !== null && v !== 0)
    .map((v) => String(Math.trunc(Math.abs(v))));
  return terms.every((term) => {
    if (words.includes(term)) return true;
    const rupees = term.replace(/[₹,]/g, "").split(".")[0];
    return /^\d+$/.test(rupees) && amounts.some((a) => a.includes(rupees));
  });
}

function statusMatches(s: Statement, status: StatusFilter = "all"): boolean {
  return status === "all" || s.status === (status === "pending" ? "Pending" : "Paid");
}

/** The period's statements that match the search, before the status and card filters. */
function searched(data: CardData, query: StatementQuery): Statement[] {
  const cards = new Map(data.cards.map((c) => [c.id, c]));
  return inPeriod(usableStatements(data), query.period).filter((s) => matchesSearch(s, cards.get(s.cardId), query.search ?? ""));
}

/** The statements the page lists: in the period, matching the filters and search, sorted by statement date. */
export function filterStatements(data: CardData, query: StatementQuery): Statement[] {
  const direction = query.sort === "oldest" ? 1 : -1;
  return searched(data, query)
    .filter((s) => statusMatches(s, query.status) && (query.cardId === undefined || s.cardId === query.cardId))
    .sort((a, b) => direction * (a.statementDate.localeCompare(b.statementDate) || a.dueDate.localeCompare(b.dueDate)));
}

export interface FilterCounts {
  /** For the status control: how many each status would show, with the current card filter. */
  byStatus: Record<StatusFilter, number>;
  /** For the card chips: how many each card would show, with the current status filter. */
  byCard: Record<string, number>;
  allCards: number;
}

/** The numbers beside each filter, so each one says what choosing it would show. Both respect the search. */
export function filterCounts(data: CardData, query: StatementQuery): FilterCounts {
  const base = searched(data, query);
  const forCard = base.filter((s) => query.cardId === undefined || s.cardId === query.cardId);
  const forStatus = base.filter((s) => statusMatches(s, query.status));
  const byCard: Record<string, number> = Object.fromEntries(data.cards.map((c) => [c.id, 0]));
  for (const s of forStatus) byCard[s.cardId] += 1;
  return {
    byStatus: {
      all: forCard.length,
      pending: forCard.filter((s) => s.status === "Pending").length,
      paid: forCard.filter((s) => s.status === "Paid").length,
    },
    byCard,
    allCards: forStatus.length,
  };
}

export interface Page<T> {
  items: T[];
  /** The page shown, clamped into range, starting at 1. */
  page: number;
  pages: number;
  total: number;
  /** The 1-based positions of the page's first and last items, both 0 for an empty list. */
  from: number;
  to: number;
}

/** One page of a list. A page number out of range shows the nearest real page. */
export function paginate<T>(items: T[], page: number, size: number): Page<T> {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const shown = items.slice((current - 1) * size, current * size);
  const from = shown.length === 0 ? 0 : (current - 1) * size + 1;
  return { items: shown, page: current, pages, total: items.length, from, to: shown.length === 0 ? 0 : from + shown.length - 1 };
}

export interface MonthGroup {
  month: MonthKey;
  statements: Statement[];
  /** The whole month in the list, even when a page shows only part of it. */
  count: number;
  /** What's still due on the month's pending statements, and what was paid on its paid ones. */
  due: number;
  paid: number;
}

/**
 * One page of the list grouped by statement month, keeping its order. Each group's
 * count and totals come from `all` (the whole filtered list), so a month split
 * across two pages shows the same header on both.
 */
export function groupByMonth(page: Statement[], all: Statement[] = page): MonthGroup[] {
  const totals = new Map<MonthKey, { count: number; due: number; paid: number }>();
  for (const s of all) {
    const month = monthOf(s.statementDate);
    const total = totals.get(month) ?? { count: 0, due: 0, paid: 0 };
    total.count += 1;
    if (s.status === "Pending") total.due += remainingDue(s);
    else total.paid += s.amountPaid ?? 0;
    totals.set(month, total);
  }
  const groups: MonthGroup[] = [];
  for (const s of page) {
    const month = monthOf(s.statementDate);
    let group = groups.at(-1);
    if (group?.month !== month) {
      group = { month, statements: [], count: 0, due: 0, paid: 0, ...totals.get(month) };
      groups.push(group);
    }
    group.statements.push(s);
  }
  return groups;
}

export type Variance = { kind: "none" } | { kind: "full" } | { kind: "over" | "under"; amount: number };

/**
 * How a paid statement's payment compares with its total due: paid in full, or
 * overpaid or underpaid by the exact difference (to the paisa). Pending ones have none.
 */
export function paymentVariance(s: Statement): Variance {
  if (s.status !== "Paid") return { kind: "none" };
  const difference = Math.round(statementVariance(s).variance * 100) / 100;
  if (difference === 0) return { kind: "full" };
  return difference > 0 ? { kind: "over", amount: difference } : { kind: "under", amount: -difference };
}

/** The line under a due date: "in 7 days", "due today", "3 days overdue", or "closed" once paid. */
export function dueLabel(s: Statement, today: string): string {
  if (s.status === "Paid") return "closed";
  const days = daysBetween(today, s.dueDate);
  const plural = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
  if (days < 0) return `${plural(-days)} overdue`;
  if (days === 0) return "due today";
  return `in ${plural(days)}`;
}
