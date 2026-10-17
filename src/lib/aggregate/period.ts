import { formatMonthShort, formatMonthYear } from "../format/date";
import { addMonths, monthOf, type MonthKey, type SpendPeriod } from "./cardSpend";

/**
 * The page's period (#113, decided with Prathik 2026-10-20): this year, a past
 * year, all time, the last 3, 6 or 12 months, or a custom range of months. A
 * range counts statements by statement date, like the years, and whole months
 * only. Every number on the Cards and Statements pages follows it. Here:
 * reading and writing it as `?period=`, and how it's named and worded.
 */

/** The quick ranges in the period menu: the last 3, 6 or 12 months, this month included. */
export const QUICK_RANGES = [3, 6, 12] as const;
export type QuickRange = (typeof QUICK_RANGES)[number];

/** The last `months` months up to and including this month, as the trend's old 3M / 6M / 1Y buttons showed. */
export function lastMonths(months: QuickRange, today: string): SpendPeriod {
  const to = monthOf(today);
  return { kind: "range", from: addMonths(to, -(months - 1)), to, last: months };
}

/**
 * A custom range of months, in order whichever end came first, and ending no
 * later than this month, since there's nothing to show after it. Null when the
 * whole range is still to come.
 */
export function monthRangePeriod(from: MonthKey, to: MonthKey, today: string): SpendPeriod | null {
  const current = monthOf(today);
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const last = end < current ? end : current;
  return start > last ? null : { kind: "range", from: start, to: last };
}

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * `?period=` read back: "all", a year ("2025"), the last 3, 6 or 12 months
 * ("last-6m", which stays the last 6 months whenever the link is opened), or a
 * range of months ("2026-03..2026-08"). Anything else, or nothing, is this year.
 */
export function parsePeriodParam(value: string | undefined, today: string): SpendPeriod {
  const thisYear: SpendPeriod = { kind: "year", year: Number(today.slice(0, 4)) };
  if (!value) return thisYear;
  if (value === "all") return { kind: "all" };
  if (/^\d{4}$/.test(value)) return { kind: "year", year: Number(value) };
  const last = /^last-(\d{1,2})m$/.exec(value);
  const months = last ? QUICK_RANGES.find((n) => n === Number(last[1])) : undefined;
  if (months) return lastMonths(months, today);
  const [from, to, ...rest] = value.split("..");
  if (to !== undefined && rest.length === 0 && MONTH_KEY.test(from) && MONTH_KEY.test(to)) return monthRangePeriod(from, to, today) ?? thisYear;
  return thisYear;
}

/** `?period=` for a link, the other way round; undefined for this year, the default, so it's left out. */
export function periodParam(period: SpendPeriod, today: string): string | undefined {
  if (period.kind === "all") return "all";
  if (period.kind === "year") return period.year === Number(today.slice(0, 4)) ? undefined : String(period.year);
  if (period.last) return `last-${period.last}m`;
  return `${period.from}..${period.to}`;
}

/** A range of months as the pill shows it: "Mar 2026", "Mar – Aug 2026" or "Nov 2025 – Feb 2026". */
export function monthSpanName(from: MonthKey, to: MonthKey): string {
  const year = (m: MonthKey) => m.slice(0, 4);
  if (from === to) return `${formatMonthShort(from)} ${year(from)}`;
  if (year(from) === year(to)) return `${formatMonthShort(from)} – ${formatMonthShort(to)} ${year(to)}`;
  return `${formatMonthShort(from)} ${year(from)} – ${formatMonthShort(to)} ${year(to)}`;
}

/** What the period pill and its menu call it: "This year", "2025", "All time", "Last 6 months", "Mar – Aug 2026". */
export function periodName(period: SpendPeriod, today: string): string {
  if (period.kind === "all") return "All time";
  if (period.kind === "year") return period.year === Number(today.slice(0, 4)) ? "This year" : String(period.year);
  if (period.last) return `Last ${period.last} months`;
  return monthSpanName(period.from, period.to);
}

/** The name inside a label or a sentence: "this year", "2025", "all time", "last 6 months", "Mar – Aug 2026". */
export function periodLabel(period: SpendPeriod, today: string): string {
  const name = periodName(period, today);
  return period.kind === "all" || period.kind === "year" || period.last ? name.charAt(0).toLowerCase() + name.slice(1) : name;
}

const monthWord = (month: MonthKey) => formatMonthYear(month).split(" ")[0];

/**
 * When, in the summary sentence: "so far in 2026", "in 2025", "since April 2026"
 * (all time, from the first statement's month), "in the last 6 months", and for
 * a custom range "in March 2026", "since March 2026" when it runs to this month,
 * or "from March to August 2026".
 */
export function periodPhrase(period: SpendPeriod, today: string, firstMonth?: MonthKey): string {
  const current = monthOf(today);
  if (period.kind === "all") return firstMonth ? `since ${formatMonthYear(firstMonth)}` : "so far";
  if (period.kind === "year") return period.year === Number(today.slice(0, 4)) ? `so far in ${period.year}` : `in ${period.year}`;
  if (period.last) return `in the last ${period.last} months`;
  if (period.from === period.to) return `in ${formatMonthYear(period.from)}`;
  if (period.to >= current) return `since ${formatMonthYear(period.from)}`;
  return period.from.slice(0, 4) === period.to.slice(0, 4)
    ? `from ${monthWord(period.from)} to ${formatMonthYear(period.to)}`
    : `from ${formatMonthYear(period.from)} to ${formatMonthYear(period.to)}`;
}

/** Whether the period is over: a past year, or a range that ended before this month. Over, the page says "You spent"; otherwise "You've spent". */
export function isPastPeriod(period: SpendPeriod, today: string): boolean {
  if (period.kind === "all") return false;
  if (period.kind === "year") return period.year < Number(today.slice(0, 4));
  return period.to < monthOf(today);
}

/** Whether every month the period can show is in one calendar year, so month labels can leave the year out. */
export function withinOneYear(period: SpendPeriod): boolean {
  if (period.kind === "all") return false;
  return period.kind === "year" || period.from.slice(0, 4) === period.to.slice(0, 4);
}
