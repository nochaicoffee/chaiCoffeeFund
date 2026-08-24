import type { RecurrenceCycle } from "../sheets/types";

export const CYCLE_STEP_MONTHS: Record<RecurrenceCycle, number> = {
  Monthly: 1,
  Quarterly: 3,
  Yearly: 12,
};

export function addMonthsUTC(iso: string, months: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const originalDay = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  // If the target month is shorter (e.g. Jan 31 -> Feb), JS rolls into the
  // following month instead of clamping. Detect that and clamp back to the
  // target month's last day instead.
  if (date.getUTCDate() !== originalDay) {
    date.setUTCDate(0);
  }
  return date.toISOString().slice(0, 10);
}

/**
 * The next occurrence of a recurring date on or after `from`, stepping
 * forward from `anchorDate` by whole `cycle` intervals (never partial).
 */
export function nextOccurrence(anchorDate: string, cycle: RecurrenceCycle, from: string): string {
  const step = CYCLE_STEP_MONTHS[cycle];
  let occurrence = anchorDate;
  for (let i = 0; i < 10_000 && occurrence < from; i++) {
    occurrence = addMonthsUTC(occurrence, step);
  }
  return occurrence;
}
