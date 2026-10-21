import { addMonths, monthOf, type MonthKey } from "./cardSpend";
import { addDays, allRenewals, monthEnd, monthlySpendSeries, type Renewal, type RenewalStatus } from "./subscriptionRenewals";
import type { Subscription, SubscriptionPayment } from "../sheets/types";

/**
 * The numbers behind the Subscriptions page's chart (#127, docs/design/subscriptions.md
 * "The chart"): Day by day and the Payment trend. Lifetime cost is lifetimeCost() in
 * subscriptionRenewals.ts. Pure, and built on the same renewal rules as the rest of the
 * page, so a renewal is paid, not recorded or still to come here exactly as it is there.
 */

/**
 * How a day with renewals is drawn: paid (shaded by cost), still to come (dashed), not
 * recorded (amber), pending (dashed: recorded but not confirmed paid, which only an old
 * row can be, since nothing writes Pending), or skipped (it didn't charge).
 */
export type DayKind = "paid" | "expected" | "missing" | "pending" | "skipped";

export interface RenewalDay {
  date: string;
  renewals: Renewal[];
  /** What the day cost: payments for paid renewals, the plan's price for the rest. */
  total: number;
  kind: DayKind;
  /** 2 to 5: under ₹200, under ₹800, under ₹2,000, more. */
  level: 2 | 3 | 4 | 5;
}

/** The design's shades for a day's cost. */
export function dayLevel(amount: number): 2 | 3 | 4 | 5 {
  return amount < 200 ? 2 : amount < 800 ? 3 : amount < 2000 ? 4 : 5;
}

/** Which renewal decides how a day with several is drawn: anything not recorded first, then pending, then still to come. */
const KIND_ORDER: Record<RenewalStatus, number> = { missing: 0, pending: 1, upcoming: 2, paid: 3, skipped: 4, "wont-renew": 5 };

/**
 * Every day from `from` to `to` that has a renewal, in date order. One that won't renew
 * (after a cancellation) isn't drawn: it isn't going to happen. A day with a renewal not
 * recorded is drawn as not recorded, whatever else is on it.
 */
export function renewalDays(subscriptions: Subscription[], payments: SubscriptionPayment[], from: string, to: string, today: string): RenewalDay[] {
  const byDay = new Map<string, Renewal[]>();
  for (const r of allRenewals(subscriptions, payments, from, to, today)) {
    if (r.status === "wont-renew") continue;
    (byDay.get(r.date) ?? byDay.set(r.date, []).get(r.date)!).push(r);
  }
  return [...byDay.entries()].map(([date, renewals]) => {
    const first = [...renewals].sort((a, b) => KIND_ORDER[a.status] - KIND_ORDER[b.status])[0].status;
    const kind: DayKind = first === "missing" ? "missing" : first === "pending" ? "pending" : first === "upcoming" ? "expected" : first === "skipped" ? "skipped" : "paid";
    const total = renewals.reduce((t, r) => t + r.amount, 0);
    return { date, renewals, total, kind, level: dayLevel(total) };
  });
}

export interface DayGridMonth {
  month: MonthKey;
  /** Its spend, as the Payment trend counts it: paid, plus still to come from this month on. */
  total: number;
  future: boolean;
  /** The week column its first day falls in. */
  week: number;
  /** How many week columns it spans, up to the next month's first. */
  weeks: number;
}

export interface DayGrid {
  /** The Monday of the first week shown. */
  start: string;
  /** The first and last days drawn; the days before `first` in its week are blank. */
  first: string;
  last: string;
  weeks: number;
  months: DayGridMonth[];
  days: RenewalDay[];
}

/** The Monday on or before a date. */
export function mondayOf(iso: string): string {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return addDays(iso, -((day + 6) % 7));
}

/**
 * The Day by day grid from `fromMonth` to `toMonth`: weeks across, Monday to Sunday
 * down, as in the design. A month starts in the week column of its first day.
 */
export function dayGrid(subscriptions: Subscription[], payments: SubscriptionPayment[], fromMonth: MonthKey, toMonth: MonthKey, today: string): DayGrid {
  const first = `${fromMonth}-01`;
  const last = monthEnd(toMonth);
  const start = mondayOf(first);
  const weekOf = (iso: string) => Math.floor((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / (7 * 86_400_000));
  const weeks = weekOf(last) + 1;
  const spend = monthlySpendSeries(subscriptions, payments, fromMonth, toMonth, today);
  const nowMonth = monthOf(today);
  const months = spend.map((m, i) => {
    const week = weekOf(`${m.month}-01`);
    const nextWeek = i < spend.length - 1 ? weekOf(`${spend[i + 1].month}-01`) : weeks;
    return { month: m.month, total: m.total, future: m.month > nowMonth, week, weeks: nextWeek - week };
  });
  return { start, first, last, weeks, months, days: renewalDays(subscriptions, payments, first, last, today) };
}

/**
 * The Day by day window on a phone, which fits five months: from two months before this
 * one, but never starting before January or ending after December (Aug–Dec in October).
 */
export function phoneDayWindow(today: string): { from: MonthKey; to: MonthKey } {
  const year = today.slice(0, 4);
  const now = monthOf(today);
  const from = [addMonths(now, -2), `${year}-01`, `${year}-08`].sort()[1];
  return { from, to: addMonths(from, 4) };
}

export interface TrendMonth {
  month: MonthKey;
  paid: number;
  expected: number;
  total: number;
  future: boolean;
  /** Each subscription's part of the month (paid plus still to come), for drawing the pick's share. */
  parts: Record<string, number>;
  /** The month's renewals, biggest first, for its hover card. One that won't renew isn't listed. */
  renewals: Renewal[];
}

export interface Trend {
  months: TrendMonth[];
  /** The biggest month so far, this month included (with what's still to come in it), or null with nothing paid or due. */
  peak: MonthKey | null;
}

/** The Payment trend: the last `past` months up to this one, and the next `ahead`. */
export function paymentTrend(subscriptions: Subscription[], payments: SubscriptionPayment[], today: string, past = 12, ahead = 6): Trend {
  const nowMonth = monthOf(today);
  const from = addMonths(nowMonth, -(past - 1));
  const to = addMonths(nowMonth, ahead);
  const all = monthlySpendSeries(subscriptions, payments, from, to, today);
  const each = subscriptions.map((s) => ({ id: s.id, series: monthlySpendSeries(subscriptions, payments, from, to, today, s.id) }));
  const renewals = allRenewals(subscriptions, payments, `${from}-01`, monthEnd(to), today).filter((r) => r.status !== "wont-renew");
  const months = all.map((m, i) => {
    const parts: Record<string, number> = {};
    for (const { id, series } of each) if (series[i].total > 0) parts[id] = series[i].total;
    return {
      ...m,
      future: m.month > nowMonth,
      parts,
      renewals: renewals.filter((r) => monthOf(r.date) === m.month).sort((a, b) => b.amount - a.amount || (a.date < b.date ? -1 : 1)),
    };
  });
  const sofar = months.filter((m) => !m.future && m.total > 0);
  const peak = sofar.length ? sofar.reduce((best, m) => (m.total > best.total ? m : best)).month : null;
  return { months, peak };
}

