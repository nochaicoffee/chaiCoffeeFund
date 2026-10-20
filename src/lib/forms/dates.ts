import { addMonthsUTC } from "../aggregate/recurring";
import { ISO_DATE_PATTERN, MONTH_NAMES, WEEKDAY_NAMES } from "../format/date";

/**
 * The pure date math behind the forms' date picker (src/components/DatePicker.tsx):
 * reading a typed date, the weeks of a month, and where the calendar's keys
 * move. Dates are plain YYYY-MM-DD strings, worked on in UTC so no time zone
 * ever shifts a day.
 */

/** The calendar's weeks start on Sunday (Prathik's pick, 2026-10-20). */
export const WEEK_START = 0;

/** Whether `value` is a YYYY-MM-DD date that exists: 2026-02-30 isn't one. */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The date for a year, month (1–12) and day, or null when there's no such day. */
function realDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return isoDate(year, month, day);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function utc(date: string): number {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
}

export function addDays(date: string, days: number): string {
  return new Date(utc(date) + days * 86_400_000).toISOString().slice(0, 10);
}

/** 0 for Sunday to 6 for Saturday. */
export function weekdayOf(date: string): number {
  return new Date(utc(date)).getUTCDay();
}

/** `date`'s day of the month in another month ("2026-02"), or that month's last day when it's shorter: the 31st is the 28th in February. */
export function sameDayIn(month: string, date: string): string {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return isoDate(year, m, Math.min(Number(date.slice(8, 10)), daysInMonth(year, m)));
}

/** `date`, moved to `min` or `max` when it's outside them. */
export function clampDate(date: string, min?: string, max?: string): string {
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
}

/**
 * The weeks of a month ("2026-10") as the calendar lays them out: always six,
 * so the calendar keeps its height from month to month, each of seven days
 * from `weekStart` (0 for Sunday), with null for days in the months either side.
 */
export function monthWeeks(month: string, weekStart: number = WEEK_START): (string | null)[][] {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const lead = (weekdayOf(isoDate(year, m, 1)) - weekStart + 7) % 7;
  const days: (string | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: daysInMonth(year, m) }, (_, i) => isoDate(year, m, i + 1))];
  while (days.length < 42) days.push(null);
  return Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));
}

/**
 * Where a key moves the calendar's focus from `date`, as in the WAI-ARIA date
 * picker: ← → a day, ↑ ↓ a week, Home and End the start and end of the week,
 * Page Up and Down a month, and with Shift a year. A month or year on from the
 * 31st (or 29 February) lands on the last day of a shorter month. Null for any
 * other key.
 */
export function moveDate(date: string, key: string, { shift = false, weekStart = WEEK_START }: { shift?: boolean; weekStart?: number } = {}): string | null {
  const intoWeek = (weekdayOf(date) - weekStart + 7) % 7;
  switch (key) {
    case "ArrowLeft":
      return addDays(date, -1);
    case "ArrowRight":
      return addDays(date, 1);
    case "ArrowUp":
      return addDays(date, -7);
    case "ArrowDown":
      return addDays(date, 7);
    case "Home":
      return addDays(date, -intoWeek);
    case "End":
      return addDays(date, 6 - intoWeek);
    case "PageUp":
      return addMonthsUTC(date, shift ? -12 : -1);
    case "PageDown":
      return addMonthsUTC(date, shift ? 12 : 1);
    default:
      return null;
  }
}

const MONTH_WORDS = MONTH_NAMES.map((m) => m.toLowerCase());
const WEEKDAY_WORDS = WEEKDAY_NAMES.map((d) => d.toLowerCase());
const RELATIVE: [word: string, days: number][] = [
  ["today", 0],
  ["yesterday", -1],
  ["tomorrow", 1],
];

/** A word's month (1–12) from its first three letters or more ("aug", "sept"), or 0. */
function monthWord(word: string): number {
  return word.length >= 3 ? MONTH_WORDS.findIndex((m) => m.startsWith(word)) + 1 : 0;
}

export interface TypedDateContext {
  today: string;
  /** What a date without its year (or month) is nearest to: the field's date when typing started, or today. */
  near: string;
  /** The last day the field allows, if any. A date without its year that would fall after it is the year before. */
  max?: string;
}

/**
 * A date as typed into a date field, or null when it can't be read. It reads:
 * - "today", "yesterday", "tomorrow", or their first three letters or more;
 * - 2026-08-05 (and with / or . between);
 * - numbers day first, as India writes dates: 5/8, 5-8-26, 05.08.2026 are all 5 August;
 * - a month by name, either side of the day: "5 aug", "Aug 5, 2026", "5th August",
 *   and what the field itself shows, with or without a weekday ("Wed, Aug 5, 2026");
 * - a day alone: "18" is the 18th.
 * A two-digit year is 20xx. Without a year, it's the year that puts the date
 * nearest `near`; without a month, the nearest month. When that date is after
 * `max`, it's the one before instead, so "18 Dec" in a field that stops at
 * today (20 Oct 2026) is 18 Dec 2025.
 */
export function parseTypedDate(text: string, context: TypedDateContext): string | null {
  const typed = text.trim().toLowerCase().replace(/,/g, " ").replace(/\s+/g, " ");
  if (typed === "") return null;
  if (typed.length >= 3) {
    const relative = RELATIVE.find(([word]) => word.startsWith(typed));
    if (relative) return addDays(context.today, relative[1]);
  }

  const iso = typed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso) return realDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const numeric = typed.match(/^(\d{1,2})[-/. ](\d{1,2})(?:[-/. ](\d{2}|\d{4}))?$/);
  if (numeric) return complete(Number(numeric[1]), Number(numeric[2]), numeric[3], context);
  const dayAlone = typed.match(/^(\d{1,2})(?:st|nd|rd|th)?$/);
  if (dayAlone) return complete(Number(dayAlone[1]), undefined, undefined, context);

  let day: number | undefined;
  let month: number | undefined;
  let year: string | undefined;
  for (const word of typed.split(/[\s\-/.]+/)) {
    if (word.length >= 3 && WEEKDAY_WORDS.some((d) => d.startsWith(word))) continue;
    const named = monthWord(word);
    if (named) {
      if (month !== undefined) return null;
      month = named;
      continue;
    }
    const number = word.match(/^(\d{1,4})(?:st|nd|rd|th)?$/);
    if (!number) return null;
    if (number[1].length > 2 || day !== undefined) {
      if (year !== undefined) return null;
      year = number[1];
    } else day = Number(number[1]);
  }
  if (day === undefined || month === undefined) return null;
  return complete(day, month, year, context);
}

/** A day, with its month and year when they were typed, filled in from the context when they weren't. */
function complete(day: number, month: number | undefined, yearText: string | undefined, { near, max }: TypedDateContext): string | null {
  if (yearText !== undefined) {
    if (month === undefined || (yearText.length !== 2 && yearText.length !== 4)) return null;
    return realDate(yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText), month, day);
  }
  const nearYear = Number(near.slice(0, 4));
  const nearMonth = Number(near.slice(5, 7));
  const candidates = (
    month === undefined
      ? [-1, 0, 1].map((k) => {
          const index = nearYear * 12 + nearMonth - 1 + k;
          return realDate(Math.floor(index / 12), (index % 12) + 1, day);
        })
      : [nearYear - 1, nearYear, nearYear + 1].map((y) => realDate(y, month, day))
  ).filter((d): d is string => d !== null);
  if (candidates.length === 0) return null;
  const distance = (d: string) => Math.abs(utc(d) - utc(near));
  let best = candidates.reduce((a, b) => (distance(b) < distance(a) ? b : a));
  if (max && best > max) {
    const before = candidates.filter((d) => d <= max);
    if (before.length > 0) best = before[before.length - 1];
  }
  return best;
}
