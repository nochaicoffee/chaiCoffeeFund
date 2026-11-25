import type { DailyCategoryLimit, DailySpend } from "../sheets/types";
import { monthOf, shiftMonth } from "./dailySpends";

/**
 * Category limits (docs/design/daily.md, round 6, L1). Pure: the limit rows and the spends in, a month's rows out. A category's limit is the latest row
 * at or before the month; a row of 0 takes the limit off from that month on. The monthly limit is separate and still decides the strip and the pace: these
 * are extra, optional, and may add up to more or less than it.
 */

/** A category counts as near its limit from this share of it. */
export const NEAR_LIMIT = 0.8;

const paise = (rupees: number) => Math.round(rupees * 100);

/** The limit a category has in a month, or null when it has none (no row reaches back that far, or the latest says 0). */
export function categoryLimitFor(rows: readonly DailyCategoryLimit[], category: string, month: string): number | null {
  let best: DailyCategoryLimit | null = null;
  for (const r of rows) if (r.category === category && r.month <= month && (best === null || r.month > best.month)) best = r;
  return best && best.limit > 0 ? best.limit : null;
}

export type LimitState = "none" | "ok" | "near" | "over";

/** Where spending stands against a limit: over once past it, near from 80% of it up to and including it. */
export function limitState(spent: number, limit: number | null): LimitState {
  if (limit === null) return "none";
  if (paise(spent) > paise(limit)) return "over";
  return paise(spent) >= Math.round(paise(limit) * NEAR_LIMIT) ? "near" : "ok";
}

export interface CategoryLimitRow {
  /** A category's id, or null for the spends with none. */
  category: string | null;
  spent: number;
  limit: number | null;
  /** Spent over the limit, 0 to 1 and beyond; null without a limit. */
  used: number | null;
  /** What's left of the limit, below zero when passed; null without a limit. */
  left: number | null;
  state: LimitState;
  /** What the category had by the same day of the month before (the whole of it when the month is over). */
  previous: number;
}

/**
 * The rows for one month, biggest spend first: every category with a limit (even with nothing spent) and every one with spending; the spends with no
 * category last. `previous` is the month before up to the same day, so a month part-way through isn't set against a whole one.
 */
export function categoryLimitRows(spends: readonly DailySpend[], limits: readonly DailyCategoryLimit[], month: string, today: string, categoryIds: readonly string[]): CategoryLimitRow[] {
  const before = shiftMonth(month, -1);
  const upTo = month === monthOf(today) ? Number(today.slice(8, 10)) : 31;
  const spentIn = (m: string, category: string | null, maxDay = 31) => spends.filter((s) => monthOf(s.date) === m && (s.category ?? null) === category && Number(s.date.slice(8, 10)) <= maxDay).reduce((a, s) => a + paise(s.amount), 0) / 100;
  const ids: (string | null)[] = [...categoryIds];
  const rows: CategoryLimitRow[] = ids
    .map((category): CategoryLimitRow => {
      const spent = spentIn(month, category);
      const limit = category === null ? null : categoryLimitFor(limits, category, month);
      return { category, spent, limit, used: limit === null ? null : spent / limit, left: limit === null ? null : Math.round((limit - spent) * 100) / 100, state: limitState(spent, limit), previous: spentIn(before, category, upTo) };
    })
    .filter((r) => r.limit !== null || r.spent > 0);
  // The spends with no category, or one that isn't known, are one row at the end.
  const known = new Set(categoryIds);
  const unknown = spends.filter((s) => monthOf(s.date) === month && (s.category === undefined || !known.has(s.category))).reduce((a, s) => a + paise(s.amount), 0) / 100;
  const unknownBefore = spends.filter((s) => monthOf(s.date) === before && Number(s.date.slice(8, 10)) <= upTo && (s.category === undefined || !known.has(s.category))).reduce((a, s) => a + paise(s.amount), 0) / 100;
  rows.sort((a, b) => b.spent - a.spent || String(a.category).localeCompare(String(b.category)));
  if (unknown > 0) rows.push({ category: null, spent: unknown, limit: null, used: null, left: null, state: "none", previous: unknownBefore });
  return rows;
}

/** The rows that need a look: over their limit or near it, the furthest along first. */
export function needsLook(rows: readonly CategoryLimitRow[]): CategoryLimitRow[] {
  return rows.filter((r) => r.state === "over" || r.state === "near").sort((a, b) => (b.used ?? 0) - (a.used ?? 0));
}

/** How much of the monthly limit the category limits give out. */
export const givenOut = (rows: readonly CategoryLimitRow[]): number => rows.reduce((a, r) => a + paise(r.limit ?? 0), 0) / 100;
