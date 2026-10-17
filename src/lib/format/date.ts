import { appConfig } from "../appConfig";

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
