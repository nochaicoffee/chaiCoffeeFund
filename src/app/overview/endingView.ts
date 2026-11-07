import { formatInr } from "@/lib/format/money";
import { formatDayDate } from "@/lib/format/date";
import { daysBetween } from "@/lib/aggregate/cardSpend";
import { eventWarning, warningsWithoutDay, windowTotals, type OverviewEvent } from "./events";
import { PAGE_NAME, type OverviewWarning, type WarningTone } from "./warnings";

/**
 * The end of the page (docs/design/overview.md, OvT1): Coming up and Keep in mind as one Timeline (what needs a look now, then each day with its
 * events, tagged where a warning belongs to it), and the same things as a Calendar. Plain, already-formatted data; the toggle is the component's.
 */
export interface WarningItem { id: string; tone: WarningTone; page: string; text: string; detail: string; act: string; href: string }
export interface EventItem { id: string; date: string; label: string; sub: string; amount: string; arrives: boolean; cash: boolean; kind: string; warning: WarningItem | null }
export interface DayGroup { date: string; heading: string; relative: string; events: EventItem[] }
export interface EndingView {
  /** Warnings with no day inside the window: overdue things, and what is only true now. */
  now: WarningItem[];
  days: DayGroup[];
  /** The window, for the calendar: today and the last day. */
  today: string;
  until: string;
  /** Money out and money in over the window (cash events only). */
  out: string;
  in: string;
  total: number;
}

const toItem = (w: OverviewWarning): WarningItem => ({ id: w.id, tone: w.tone, page: PAGE_NAME[w.page], text: w.text, detail: w.detail, act: w.act, href: w.href });

export function relative(today: string, date: string): string {
  const n = daysBetween(today, date);
  return n === 0 ? "today" : n === 1 ? "tomorrow" : n > 0 ? `in ${n} days` : n === -1 ? "yesterday" : `${-n} days ago`;
}

export function endingView(warnings: OverviewWarning[], events: OverviewEvent[], today: string, until: string): EndingView {
  const byDate = new Map<string, OverviewEvent[]>();
  for (const e of events) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  const days = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, list]): DayGroup => ({
    date,
    heading: formatDayDate(date),
    relative: relative(today, date),
    events: list.map((e): EventItem => {
      const w = eventWarning(e, warnings);
      return { id: e.id, date: e.date, label: e.label, sub: e.sub, amount: `${e.amount < 0 ? "−" : "+"}${formatInr(Math.abs(e.amount))}`, arrives: e.amount > 0, cash: e.cash, kind: e.kind, warning: w ? toItem(w) : null };
    }),
  }));
  const totals = windowTotals(events);
  return { now: warningsWithoutDay(warnings, events).map(toItem), days, today, until, out: formatInr(totals.out), in: formatInr(totals.in), total: warnings.length };
}
