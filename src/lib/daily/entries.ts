import type { DailySpend, DailySpendMethod } from "../sheets/types";

/**
 * The all-spends page's logic (docs/design/daily.md, round 6, G1): which spends a search and filters leave, in what order, grouped by month and day, and the
 * four figures over what's shown. Pure: the spends in, rows out, so it is tested apart from the page.
 */

export type EntrySort = "newest" | "oldest" | "biggest" | "smallest";
export const ENTRY_SORTS: readonly EntrySort[] = ["newest", "oldest", "biggest", "smallest"];

export interface EntryFilters {
  /** Words he typed: every word has to be in the note, the category's name, the way it was paid, or the amount. */
  query: string;
  /** A category's id, "none" for the spends with none, or "" for all. */
  category: string;
  method: DailySpendMethod | "";
  /** Only spends of at least this much; 0 for any. */
  min: number;
  /** "YYYY-MM" for a month, "YYYY" for a year, "" for all time. */
  period: string;
}

export const NO_FILTERS: EntryFilters = { query: "", category: "", method: "", min: 0, period: "" };

const norm = (s: string) => s.trim().toLowerCase();

/**
 * The spends that pass every filter. `nameOf` reads a category id as its name (and "No category" for none), `methodName` a method as it is shown, so a search
 * for "credit" finds card spends and "fuel" finds the Fuel category.
 */
export function filterSpends(spends: readonly DailySpend[], filters: EntryFilters, nameOf: (category: string | undefined) => string, methodName: (method: DailySpendMethod) => string): DailySpend[] {
  const words = norm(filters.query).split(/\s+/).filter(Boolean);
  return spends.filter((s) => {
    if (filters.period && !s.date.startsWith(filters.period)) return false;
    if (filters.category === "none" ? s.category !== undefined : filters.category !== "" && s.category !== filters.category) return false;
    if (filters.method !== "" && s.method !== filters.method) return false;
    if (filters.min > 0 && s.amount < filters.min) return false;
    if (words.length === 0) return true;
    const haystack = [s.note ?? "", nameOf(s.category), methodName(s.method), String(s.amount), s.amount.toLocaleString("en-IN")].map(norm).join(" | ");
    return words.every((w) => haystack.includes(w.replace(/,/g, "")) || haystack.includes(w));
  });
}

/** In the order asked: by date (the later-added first within a day, as the day's panel lists them), or by amount, biggest or smallest first. */
export function sortSpends(spends: readonly DailySpend[], sort: EntrySort): DailySpend[] {
  const indexed = spends.map((s, i) => ({ s, i }));
  indexed.sort((a, b) => {
    if (sort === "newest") return a.s.date < b.s.date ? 1 : a.s.date > b.s.date ? -1 : b.i - a.i;
    if (sort === "oldest") return a.s.date < b.s.date ? -1 : a.s.date > b.s.date ? 1 : b.i - a.i;
    const d = sort === "biggest" ? b.s.amount - a.s.amount : a.s.amount - b.s.amount;
    return d || (a.s.date < b.s.date ? 1 : a.s.date > b.s.date ? -1 : b.i - a.i);
  });
  return indexed.map((x) => x.s);
}

export interface DayGroup {
  date: string;
  total: number;
  spends: DailySpend[];
}
export interface MonthGroup {
  month: string;
  total: number;
  count: number;
  days: DayGroup[];
}

const paise = (n: number) => Math.round(n * 100);

/** Spends already in date order, grouped into months and, inside each, days. A day's total adds in paise. */
export function groupByMonthAndDay(sorted: readonly DailySpend[]): MonthGroup[] {
  const months: MonthGroup[] = [];
  for (const s of sorted) {
    const key = s.date.slice(0, 7);
    let month = months.at(-1);
    if (!month || month.month !== key) {
      month = { month: key, total: 0, count: 0, days: [] };
      months.push(month);
    }
    let day = month.days.at(-1);
    if (!day || day.date !== s.date) {
      day = { date: s.date, total: 0, spends: [] };
      month.days.push(day);
    }
    day.spends.push(s);
    day.total = (paise(day.total) + paise(s.amount)) / 100;
    month.total = (paise(month.total) + paise(s.amount)) / 100;
    month.count++;
  }
  return months;
}

export interface EntryTotals {
  count: number;
  total: number;
  /** The average spend, in whole rupees; 0 for none. */
  average: number;
  biggest: DailySpend | null;
  /** The category with the most spent, or null for none; `category` is undefined for the spends with none. */
  top: { category: string | undefined; amount: number; share: number } | null;
}

/** The four figures over what's shown. */
export function entryTotals(spends: readonly DailySpend[]): EntryTotals {
  const total = spends.reduce((a, s) => a + paise(s.amount), 0) / 100;
  const biggest = spends.reduce<DailySpend | null>((b, s) => (b === null || s.amount > b.amount ? s : b), null);
  const byCategory = new Map<string | undefined, number>();
  for (const s of spends) byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + paise(s.amount));
  const [category, p] = [...byCategory].sort((a, b) => b[1] - a[1])[0] ?? [undefined, 0];
  return { count: spends.length, total, average: spends.length ? Math.round(total / spends.length) : 0, biggest, top: spends.length ? { category, amount: p / 100, share: total > 0 ? p / 100 / total : 0 } : null };
}

/** The months that have a spend, newest first, with what was spent in each. */
export function monthsWithSpends(spends: readonly DailySpend[]): { month: string; total: number }[] {
  const by = new Map<string, number>();
  for (const s of spends) by.set(s.date.slice(0, 7), (by.get(s.date.slice(0, 7)) ?? 0) + paise(s.amount));
  return [...by].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([month, p]) => ({ month, total: p / 100 }));
}
