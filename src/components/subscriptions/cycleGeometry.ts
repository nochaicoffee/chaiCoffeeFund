import type { CycleRead } from "@/app/subscriptions/views";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import { addDays } from "@/lib/aggregate/subscriptionRenewals";
import { formatDate, formatShortDate } from "@/lib/format/date";
import { whenFrom } from "@/lib/format/subscriptionLabels";

/**
 * Geometry for reading the hero's cycle bar (#148, 2B): which day a point on the bar
 * is, snapping to today and to the renewal, and what the readout says there. Pure, so
 * CycleBar only measures and draws, as the Cards page's limit bar does (readLimitAt).
 */

export interface CycleDays {
  /** The cycle's length in days: the renewal is the last day, `days`. */
  days: number;
  /** Today's day in it, or null when today isn't on the bar (the cycle after a renewal paid ahead). */
  today: number | null;
}

export function cycleDays(cycle: Pick<CycleRead, "from" | "to" | "today">): CycleDays {
  const days = Math.max(1, daysBetween(cycle.from, cycle.to));
  const today = daysBetween(cycle.from, cycle.today);
  return { days, today: today >= 0 && today <= days ? today : null };
}

/** What a point on the bar is: the renewal it started with, today, the renewal at its end, or another day. */
export type CycleReadingKind = "start" | "today" | "renewal" | "day";

export interface CycleReading {
  /** The day it reads, 0 (the start) to `days` (the renewal). */
  day: number;
  /** Where the readout sits, 0–1 along the bar. */
  at: number;
  kind: CycleReadingKind;
}

/** The reading on a day, kept on the bar. The renewal wins over the start, and the start over today. */
export function readCycleDay(day: number, cycle: CycleDays): CycleReading {
  const d = Math.min(cycle.days, Math.max(0, Math.round(day)));
  const kind: CycleReadingKind = d === cycle.days ? "renewal" : d === 0 ? "start" : d === cycle.today ? "today" : "day";
  return { day: d, at: d / cycle.days, kind };
}

/**
 * The reading at `fraction` along the bar. Within `snap` (a fraction of the bar) of
 * today or the renewal it snaps there, the nearer one winning; elsewhere it's the
 * nearest day.
 */
export function readCycleAt(fraction: number, cycle: CycleDays, snap: number): CycleReading {
  const at = Math.min(1, Math.max(0, fraction));
  const toRenewal = 1 - at;
  const toToday = cycle.today === null ? Infinity : Math.abs(at - cycle.today / cycle.days);
  if (toToday <= snap && toToday <= toRenewal) return readCycleDay(cycle.today!, cycle);
  if (toRenewal <= snap) return readCycleDay(cycle.days, cycle);
  return readCycleDay(at * cycle.days, cycle);
}

/** How far a day is from today: "in 3 days", "16 days ago", and in months from 45 days either way. */
function fromToday(today: string, iso: string): string {
  const days = daysBetween(today, iso);
  return days <= -45 ? `${Math.round(-days / 30)} months ago` : whenFrom(today, iso);
}

/**
 * What the readout says at a reading: the date ("Today" for today's), then what's
 * there. The start says what the renewal it began with came to, the renewal what it
 * will charge and where, today how long is left, and any other day how far it is
 * from today.
 */
export function cycleReadout(reading: CycleReading, cycle: CycleRead): { date: string; note: string } {
  const iso = addDays(cycle.from, reading.day);
  const date = iso === cycle.today ? "Today" : cycle.withYear ? formatDate(iso) : formatShortDate(iso);
  if (reading.kind === "renewal") return { date, note: cycle.end };
  if (reading.kind === "start" && cycle.start) return { date, note: cycle.start };
  if (reading.kind === "today") {
    const left = daysBetween(cycle.today, cycle.to);
    return { date, note: `${left} ${left === 1 ? "day" : "days"} to go` };
  }
  return { date, note: fromToday(cycle.today, iso) };
}
