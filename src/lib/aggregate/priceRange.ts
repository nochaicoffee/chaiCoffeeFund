/**
 * A price's range over the last year, and where today's close sits in it (docs/design/investments.md, one holding's stats: "52-week
 * range"). Taken from the closes given, which for a holding start at its first trade, so a holding bought less than a year ago shows its
 * range since then and says so (`full` is false). Pure.
 */

export interface YearRange {
  low: number;
  high: number;
  /** Where the last close sits between the low (0) and the high (1); 0.5 when the price never moved. */
  position: number;
  /** The first day the range covers. */
  from: string;
  /** True when the closes reach back a whole year, so it is a real 52-week range. */
  full: boolean;
}

const DAY = 86_400_000;
const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

/** `points` oldest first, each a day's close. Null with no close in the window. */
export function yearRange(points: { date: string; price: number }[], today: string): YearRange | null {
  const start = addDays(today, -365);
  const inWindow = points.filter((p) => p.date > start && p.date <= today);
  if (inWindow.length === 0) return null;
  const prices = inWindow.map((p) => p.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const last = inWindow[inWindow.length - 1].price;
  // The closes reach back a year when the first of all of them is on or before the window's start (a weekend or holiday can leave a few days' gap).
  const full = points.length > 0 && points[0].date <= addDays(start, 5);
  return { low, high, position: high > low ? (last - low) / (high - low) : 0.5, from: inWindow[0].date, full };
}
