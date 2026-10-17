import { addMonths, monthOf, monthRange, type MonthKey } from "./cardSpend";
import { addDays, allRenewals, monthEnd, monthlySpendSeries, paidByMonth, type Renewal, type RenewalStatus } from "./subscriptionRenewals";
import type { Subscription, SubscriptionPayment } from "../sheets/types";

/**
 * The numbers behind the Subscriptions page's chart (#127, docs/design/subscriptions.md
 * "The chart"): Day by day and the Payment trend, and what their interactions add up
 * (#149): a dragged range of days, this year's running total, and Lifetime cost by year.
 * Lifetime cost itself is lifetimeCost() in subscriptionRenewals.ts. Pure, and built on
 * the same renewal rules as the rest of the page, so a renewal is paid, not recorded or
 * still to come here exactly as it is there.
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
 * (after a cancellation) isn't drawn: it isn't going to happen. Nor is one still to come
 * of a subscription that isn't active (cancelled from a date still ahead), which a
 * month's spend and the year figure don't count either (#149): paused and cancelled
 * subscriptions add nothing more. A day with a renewal not recorded is drawn as not
 * recorded, whatever else is on it.
 */
export function renewalDays(subscriptions: Subscription[], payments: SubscriptionPayment[], from: string, to: string, today: string): RenewalDay[] {
  const active = new Set(subscriptions.filter((s) => s.status === "Active").map((s) => s.id));
  const byDay = new Map<string, Renewal[]>();
  for (const r of allRenewals(subscriptions, payments, from, to, today)) {
    if (r.status === "wont-renew" || (r.status === "upcoming" && !active.has(r.subscriptionId))) continue;
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
  /** Each subscription's part of the total, for the month's card. They add up to it. */
  parts: Record<string, number>;
  /** Its renewals (one that won't renew isn't drawn, so isn't counted), and how many passed with no payment. */
  renewals: number;
  notRecorded: number;
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
  const parts = monthParts(subscriptions, payments, fromMonth, toMonth, today);
  const days = renewalDays(subscriptions, payments, first, last, today);
  const nowMonth = monthOf(today);
  const months = spend.map((m, i) => {
    const week = weekOf(`${m.month}-01`);
    const nextWeek = i < spend.length - 1 ? weekOf(`${spend[i + 1].month}-01`) : weeks;
    const renewals = days.filter((d) => monthOf(d.date) === m.month).flatMap((d) => d.renewals);
    return {
      month: m.month,
      total: m.total,
      parts: parts[i],
      renewals: renewals.length,
      notRecorded: renewals.filter((r) => r.status === "missing").length,
      future: m.month > nowMonth,
      week,
      weeks: nextWeek - week,
    };
  });
  return { start, first, last, weeks, months, days };
}

/** Each subscription's part of each month from `fromMonth` to `toMonth`: its own month's spend, so the parts add up to the month's. */
function monthParts(subscriptions: Subscription[], payments: SubscriptionPayment[], fromMonth: MonthKey, toMonth: MonthKey, today: string): Record<string, number>[] {
  const each = subscriptions.map((s) => ({ id: s.id, series: monthlySpendSeries(subscriptions, payments, fromMonth, toMonth, today, s.id) }));
  return monthRange(fromMonth, toMonth).map((_, i) => {
    const parts: Record<string, number> = {};
    for (const { id, series } of each) if (series[i].total > 0) parts[id] = series[i].total;
    return parts;
  });
}

/**
 * The Day by day window on a phone, which fits five months: from two months before this
 * one, but never starting before the grid's first month or ending after its last
 * (Aug–Dec in October, for this year's grid). A period that doesn't include this month
 * shows its own last five.
 */
export function phoneDayWindow(today: string, grid?: { from: MonthKey; to: MonthKey }): { from: MonthKey; to: MonthKey } {
  const year = today.slice(0, 4);
  const { from: first, to: last } = grid ?? { from: `${year}-01`, to: `${year}-12` };
  const now = monthOf(today);
  const around = [first, now, last].sort()[1];
  const latestStart = addMonths(last, -4);
  // A grid shorter than five months is shown whole.
  const start = latestStart <= first ? first : [first, addMonths(around, -2), latestStart].sort()[1];
  const end = addMonths(start, 4);
  return { from: start, to: end < last ? end : last };
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

/**
 * The Payment trend over `window`'s months; left out, the last 12 months up to this one and
 * the next 6. Months after this one are expected, at today's plan prices.
 */
export function paymentTrend(subscriptions: Subscription[], payments: SubscriptionPayment[], today: string, window?: { from: MonthKey; to: MonthKey }): Trend {
  const nowMonth = monthOf(today);
  const from = window?.from ?? addMonths(nowMonth, -11);
  const to = window?.to ?? addMonths(nowMonth, 6);
  const all = monthlySpendSeries(subscriptions, payments, from, to, today);
  const parts = monthParts(subscriptions, payments, from, to, today);
  const renewals = allRenewals(subscriptions, payments, `${from}-01`, monthEnd(to), today).filter((r) => r.status !== "wont-renew");
  const months = all.map((m, i) => ({
    ...m,
    future: m.month > nowMonth,
    parts: parts[i],
    renewals: renewals.filter((r) => monthOf(r.date) === m.month).sort((a, b) => b.amount - a.amount || (a.date < b.date ? -1 : 1)),
  }));
  const sofar = months.filter((m) => !m.future && m.total > 0);
  const peak = sofar.length ? sofar.reduce((best, m) => (m.total > best.total ? m : best)).month : null;
  return { months, peak };
}

// ---------- What the interactions add up (#149) ----------

/** What a range of days needs of a renewal. */
export type DayRenewal = Pick<Renewal, "subscriptionId" | "status" | "amount">;

export interface RangeTotals {
  /** The range's first and last days, earliest first. */
  from: string;
  to: string;
  renewals: number;
  /** What was paid for its renewals. */
  paid: number;
  /** Its renewals still to come, at the plan's price. */
  toCome: number;
  /** How many passed with no payment. They aren't in the total, as in a month's spend. */
  notRecorded: number;
  /** Paid plus still to come. */
  total: number;
}

/**
 * What the days from one date to another add up to, either way round (Drag to add up,
 * 5C): their renewals, what was paid for them, what's still to come, and how many
 * passed with no payment. A renewal counts on its own day, at what its payment cost,
 * so a whole month's range can differ from the month's total, which counts payments on
 * the day they were made. One that didn't charge, or is pending, adds nothing, as in a
 * month's spend. Given a subscription, only its renewals count.
 */
export function rangeTotals(days: { date: string; renewals: DayRenewal[] }[], a: string, b: string, subscriptionId?: string): RangeTotals {
  const [from, to] = a <= b ? [a, b] : [b, a];
  const renewals = days.filter((d) => d.date >= from && d.date <= to).flatMap((d) => d.renewals).filter((r) => !subscriptionId || r.subscriptionId === subscriptionId);
  const sum = (status: RenewalStatus) => renewals.filter((r) => r.status === status).reduce((t, r) => t + r.amount, 0);
  const paid = sum("paid");
  const toCome = sum("upcoming");
  return { from, to, renewals: renewals.length, paid, toCome, notRecorded: renewals.filter((r) => r.status === "missing").length, total: paid + toCome };
}

export interface RunningMonth {
  month: MonthKey;
  /** The month's spend: what was paid in it, plus what's still to come in it from this month on. */
  total: number;
  /** The part of it still to come. */
  expected: number;
  /** Everything from January to the end of this month. */
  cumulative: number;
}

export interface RunningTotal {
  /** The months it runs over, first and last. */
  from: MonthKey;
  to: MonthKey;
  months: RunningMonth[];
  /**
   * Where the period is heading (decided with Prathik 2026-10-21, for the year): what's been
   * paid in it, plus the renewals still due before it ends at each plan's current price.
   * A renewal that passed without being recorded isn't counted, and a paused or
   * cancelled subscription adds nothing more than it's already been paid.
   */
  total: number;
}

/**
 * The running total over the trend's months (6B): each month's spend added up from the
 * first month. Every month is counted as the trend counts it (the payments made in it,
 * plus, from this month on, the active renewals still to come), so the line ends at the
 * period's figure and a renewal marked paid ahead counts once. Given a subscription, only
 * its own. `window` is the trend's months; left out, it's this year, January to December.
 */
export function runningTotal(subscriptions: Subscription[], payments: SubscriptionPayment[], today: string, subscriptionId?: string, window?: { from: MonthKey; to: MonthKey }): RunningTotal {
  const year = today.slice(0, 4);
  const { from, to } = window ?? { from: `${year}-01`, to: `${year}-12` };
  let cumulative = 0;
  const months = monthlySpendSeries(subscriptions, payments, from, to, today, subscriptionId).map((m) => ({ month: m.month, total: m.total, expected: m.expected, cumulative: (cumulative += m.total) }));
  return { from, to, months, total: cumulative };
}

/**
 * What a subscription's charged payments came to in each calendar year, by the day each
 * was made (Lifetime cost's rows, 6C). Every year from its first payment's to its
 * last's, so a year with none in between shows as ₹0. ₹0 and Skipped payments add
 * nothing, and the years add up to its lifetime cost.
 */
export function paidByYear(payments: SubscriptionPayment[], subscriptionId: string): { year: string; paid: number }[] {
  const sums = new Map<string, number>();
  for (const [month, paid] of paidByMonth(payments, subscriptionId)) sums.set(month.slice(0, 4), (sums.get(month.slice(0, 4)) ?? 0) + paid);
  const years = [...sums.keys()].sort();
  if (years.length === 0) return [];
  const out: { year: string; paid: number }[] = [];
  for (let y = Number(years[0]); y <= Number(years.at(-1)); y++) out.push({ year: String(y), paid: sums.get(String(y)) ?? 0 });
  return out;
}
