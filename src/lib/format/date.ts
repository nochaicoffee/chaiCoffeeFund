import { appConfig } from "../appConfig";

/** A plain YYYY-MM-DD date, the only date format this app stores or passes around. */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Today's date as YYYY-MM-DD in the app's time zone (India by default).
 * `new Date().toISOString()` gives the UTC date instead, which is still
 * "yesterday" in India until 05:30. Built from formatToParts so it never
 * depends on how a locale happens to lay out dates.
 */
export function todayIso(now: Date = new Date(), timeZone: string = appConfig.timeZone): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Short date for page headers: "Fri, 17 Oct". */
export function formatHeaderDate(now: Date = new Date(), timeZone: string = appConfig.timeZone): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone, weekday: "short", day: "numeric", month: "short" }).format(now);
}

/** "Good morning" before noon, "Good afternoon" until 5 pm, "Good evening" after, by the clock in `timeZone`. */
export function greetingFor(now: Date = new Date(), timeZone: string = appConfig.timeZone): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** An ISO date as the design writes it: "2026-08-23" → "Aug 23". */
export function formatShortDate(isoDate: string): string {
  return `${MONTH_NAMES[Number(isoDate.slice(5, 7)) - 1].slice(0, 3)} ${Number(isoDate.slice(8, 10))}`;
}

/** An ISO date with its year, as the Statements page writes it: "2026-08-05" → "Aug 5, 2026". */
export function formatDate(isoDate: string): string {
  return `${formatShortDate(isoDate)}, ${isoDate.slice(0, 4)}`;
}

/** A month key as words: "2026-07" → "July 2026". */
export function formatMonthYear(month: string): string {
  return `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

/** A month key's short name: "2026-07" → "Jul". */
export function formatMonthShort(month: string): string {
  return MONTH_NAMES[Number(month.slice(5, 7)) - 1].slice(0, 3);
}

/** An ISO date in full, as a screen reader should say a day in the date picker: "2026-10-18" → "Sunday, October 18, 2026". */
export function formatSpokenDate(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return `${WEEKDAY_NAMES[day]}, ${MONTH_NAMES[Number(isoDate.slice(5, 7)) - 1]} ${Number(isoDate.slice(8, 10))}, ${isoDate.slice(0, 4)}`;
}
