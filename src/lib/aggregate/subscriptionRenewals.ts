import { CYCLE_STEP_MONTHS, addMonthsUTC } from "./recurring";
import { daysBetween, monthOf, monthRange, type MonthKey } from "./cardSpend";
import type { Subscription, SubscriptionPayment } from "../sheets/types";

/**
 * Renewals and what they cost, for the Subscriptions page (#125). Pure: no Sheets
 * calls, tested against fixtures. Rules decided with Prathik 2026-10-21 (see
 * docs/design/subscriptions.md):
 * - Renewals come from each subscription's schedule: its billing anchor date
 *   stepped by whole cycles, never before its start date.
 * - A payment counts for a renewal when it's within half a cycle of it, either side.
 *   Renewals are settled in date order, each by the earliest payment in its window
 *   that hasn't settled an earlier one, over the whole schedule, so the answer never
 *   depends on the dates asked for.
 * - A renewal whose date has passed with no payment is "not recorded". One whose
 *   payment is a ₹0 Skipped one didn't charge, and isn't flagged.
 * - Resumed or restarted (resumedOn): the renewals between its last payment before then
 *   and that date weren't expected, so they're left out rather than flagged. Only the
 *   latest restart is kept.
 * - Paused: renewals stop after its last payment. Cancelled: renewals stop at its
 *   cancelled-on date (one on that date doesn't happen either), and the first one on
 *   or after it that wasn't paid is shown as "won't renew".
 * - A price change is a payment 2% or more different from the one before it.
 */

export type RenewalStatus = "paid" | "skipped" | "pending" | "missing" | "upcoming" | "wont-renew";

export interface Renewal {
  subscriptionId: string;
  /** The renewal date from the schedule. */
  date: string;
  status: RenewalStatus;
  /** The payment that counts for it, when there is one. */
  payment?: SubscriptionPayment;
  /** What it cost (the payment's amount), or what it's expected to cost (the plan's price). */
  amount: number;
}

/** Half a cycle, in days: about 15 for monthly, 46 for quarterly, 183 for yearly. */
export function matchWindowDays(subscription: Pick<Subscription, "billingCycle">): number {
  return (CYCLE_STEP_MONTHS[subscription.billingCycle] * 365.25) / 24;
}

/** Whole months from one ISO date's month to another's. */
function monthsApart(from: string, to: string): number {
  return (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + (Number(to.slice(5, 7)) - Number(from.slice(5, 7)));
}

/**
 * Every date in a subscription's schedule from `from` to `to` (inclusive), on or
 * after its start date. Each date counts from the anchor itself, so a 31st anchor
 * comes back to the 31st after a short month (as in recurring.ts), in either direction.
 */
export function scheduleDates(subscription: Pick<Subscription, "billingAnchorDate" | "billingCycle" | "startDate">, from: string, to: string): string[] {
  const step = CYCLE_STEP_MONTHS[subscription.billingCycle];
  const lower = from > subscription.startDate ? from : subscription.startDate;
  if (lower > to) return [];
  let k = Math.floor(monthsApart(subscription.billingAnchorDate, lower) / step) - 1;
  const dates: string[] = [];
  for (let guard = 0; guard < 10_000; guard++, k++) {
    const date = addMonthsUTC(subscription.billingAnchorDate, k * step);
    if (date > to) break;
    if (date >= lower) dates.push(date);
  }
  return dates;
}

const isCharged = (p: SubscriptionPayment) => p.status === "Paid" && p.amount > 0;

/**
 * A subscription's renewals from `from` to `to`, each matched to its payment. Each
 * renewal takes at most one payment, so a second charge in one cycle counts towards
 * spend (it's a payment) but doesn't settle another renewal.
 */
export function renewalsFor(subscription: Subscription, payments: SubscriptionPayment[], from: string, to: string, today: string): Renewal[] {
  const own = payments.filter((p) => p.subscriptionId === subscription.id).sort((a, b) => (a.paymentDate < b.paymentDate ? -1 : 1));
  const lastSettled = [...own].reverse().find((p) => p.status === "Paid" || p.status === "Skipped")?.paymentDate;
  const window = matchWindowDays(subscription);

  // Matched over the whole schedule, from its start to past the last payment, whatever range is shown.
  const lastPayment = own.at(-1)?.paymentDate;
  const until = addDays(lastPayment && lastPayment > to ? lastPayment : to, Math.ceil(window) + 1);
  const dates = scheduleDates(subscription, subscription.startDate, until);
  const matched = new Map<string, SubscriptionPayment>();
  const used = new Set<SubscriptionPayment>();
  for (const date of dates) {
    const payment = own.find((p) => !used.has(p) && Math.abs(daysBetween(date, p.paymentDate)) <= window);
    if (payment) {
      matched.set(date, payment);
      used.add(payment);
    }
  }

  // Where the schedule stops: unpaid renewals after this aren't expected. Paused: after its
  // last payment. Cancelled: before its cancelled-on date, or after its last payment when it has none.
  let stop: string | null = null;
  if (subscription.status === "Paused") stop = lastSettled ?? "";
  if (subscription.status === "Cancelled") stop = subscription.endDate ? addDays(subscription.endDate, -1) : (lastSettled ?? "");
  // After a pause or a cancellation it started again on resumedOn: the renewals between its
  // last payment before then and that date weren't expected (#128, decided with Prathik 2026-10-21).
  const resumedOn = subscription.resumedOn;
  const gapFrom = resumedOn ? (own.filter((p) => (p.status === "Paid" || p.status === "Skipped") && p.paymentDate < resumedOn).at(-1)?.paymentDate ?? "") : null;
  const inGap = (date: string) => resumedOn !== undefined && gapFrom !== null && date > gapFrom && date < resumedOn;
  // The renewal that won't happen: the first unpaid one on or after the cancelled-on date.
  const endDate = subscription.status === "Cancelled" ? subscription.endDate : undefined;
  const wontRenew = endDate ? dates.find((d) => d >= endDate && !matched.has(d)) : undefined;

  const renewals: Renewal[] = [];
  for (const date of dates) {
    if (date < from || date > to) continue;
    const payment = matched.get(date);
    if (!payment && inGap(date)) continue;
    if (stop !== null && date > stop && !payment) {
      if (date === wontRenew) renewals.push({ subscriptionId: subscription.id, date, status: "wont-renew", amount: subscription.amount });
      continue;
    }
    if (payment) {
      const status: RenewalStatus = payment.status === "Skipped" ? "skipped" : payment.status === "Pending" ? "pending" : "paid";
      renewals.push({ subscriptionId: subscription.id, date, status, payment, amount: payment.amount });
    } else {
      renewals.push({ subscriptionId: subscription.id, date, status: date < today ? "missing" : "upcoming", amount: subscription.amount });
    }
  }
  return renewals;
}

/** Mark paid is offered from this many days before a renewal (decided 2026-10-21). */
export const MARK_PAID_DAYS_BEFORE = 3;

export type RenewalAction = "mark-paid" | "record-payment" | "payment-menu";

/**
 * What a renewal's row offers: Mark paid from 3 days before it's due, Record payment once
 * it's passed with none, and the paid row's menu (Edit payment, Delete payment) once
 * something's recorded. Nothing for one further off, or one that won't renew.
 */
export function renewalAction(renewal: Renewal, today: string): RenewalAction | null {
  if (renewal.status === "upcoming") return daysBetween(today, renewal.date) <= MARK_PAID_DAYS_BEFORE ? "mark-paid" : null;
  if (renewal.status === "missing") return "record-payment";
  if (renewal.status === "wont-renew") return null;
  return "payment-menu";
}

export interface CycleProgress {
  /** The renewal this cycle started on (on or before today). */
  last: string;
  /** The next renewal (after today). */
  next: string;
  /** How far through the cycle today is, 0 to 1. */
  fraction: number;
}

/**
 * Where today sits in an active subscription's cycle, from its schedule, for the
 * hero's bar. Null for a paused or cancelled one, or before its first renewal.
 */
export function cycleProgress(subscription: Subscription, today: string): CycleProgress | null {
  if (subscription.status !== "Active") return null;
  const step = CYCLE_STEP_MONTHS[subscription.billingCycle];
  const dates = scheduleDates(subscription, addMonthsUTC(today, -step - 1), addMonthsUTC(today, step + 1));
  const next = dates.find((d) => d > today);
  const last = [...dates].reverse().find((d) => d <= today);
  if (!last || !next) return null;
  return { last, next, fraction: daysBetween(last, today) / daysBetween(last, next) };
}

/** Every subscription's renewals from `from` to `to`, by date (then by subscription). */
export function allRenewals(subscriptions: Subscription[], payments: SubscriptionPayment[], from: string, to: string, today: string): Renewal[] {
  return subscriptions
    .flatMap((s) => renewalsFor(s, payments, from, to, today))
    .sort((a, b) => (a.date === b.date ? a.subscriptionId.localeCompare(b.subscriptionId) : a.date < b.date ? -1 : 1));
}

/** The first renewal in a subscription's schedule after a date. */
export function firstRenewalAfter(subscription: Pick<Subscription, "billingAnchorDate" | "billingCycle" | "startDate">, date: string): string | null {
  const step = CYCLE_STEP_MONTHS[subscription.billingCycle];
  return scheduleDates(subscription, addDays(date, 1), addMonthsUTC(date, step + 1))[0] ?? null;
}

/** A month's last day, as an ISO date. */
export function monthEnd(month: MonthKey): string {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0));
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// ---------- What it costs ----------

/** What was paid in each month, from charged payments (₹0 and Skipped ones add nothing). */
export function paidByMonth(payments: SubscriptionPayment[], subscriptionId?: string): Map<MonthKey, number> {
  const months = new Map<MonthKey, number>();
  for (const p of payments) {
    if (!isCharged(p) || (subscriptionId && p.subscriptionId !== subscriptionId)) continue;
    const month = monthOf(p.paymentDate);
    months.set(month, (months.get(month) ?? 0) + p.amount);
  }
  return months;
}

export interface MonthSpend {
  month: MonthKey;
  /** Charged payments recorded in the month. */
  paid: number;
  /** Renewals not paid yet, at the plan's price: the rest of this month, or a future month. */
  expected: number;
  /** paid + expected: what the month costs. A past month is what was paid. */
  total: number;
}

/**
 * Each month's spend from `fromMonth` to `toMonth`: the payments recorded in it, plus,
 * from this month on, the active renewals still to come at the plan's price. So a past
 * month is what was paid, and a renewal marked paid ahead of its date (Mark paid, from 3
 * days before, records it on the renewal date) counts in its own month as paid, never
 * also as expected. Renewals not recorded aren't counted as expected: they're flagged.
 */
export function monthlySpendSeries(subscriptions: Subscription[], payments: SubscriptionPayment[], fromMonth: MonthKey, toMonth: MonthKey, today: string, subscriptionId?: string): MonthSpend[] {
  const subs = subscriptionId ? subscriptions.filter((s) => s.id === subscriptionId) : subscriptions;
  const paid = paidByMonth(payments, subscriptionId);
  const nowMonth = monthOf(today);
  const upcoming = allRenewals(subs.filter((s) => s.status === "Active"), payments, today, monthEnd(toMonth), today).filter((r) => r.status === "upcoming");
  return monthRange(fromMonth, toMonth).map((month) => {
    const p = paid.get(month) ?? 0;
    const e = month >= nowMonth ? upcoming.filter((r) => monthOf(r.date) === month).reduce((t, r) => t + r.amount, 0) : 0;
    return { month, paid: p, expected: e, total: p + e };
  });
}

/** Renewals by day, for the Day by day chart: each date's renewals, paid or not. */
export function renewalsByDay(renewals: Renewal[]): Map<string, Renewal[]> {
  const days = new Map<string, Renewal[]>();
  for (const r of renewals) (days.get(r.date) ?? days.set(r.date, []).get(r.date)!).push(r);
  return days;
}

export interface LifetimeCost {
  subscriptionId: string;
  paid: number;
  payments: number;
  /** Each charged payment's amount, oldest first, for the price line. */
  amounts: number[];
}

/** Everything paid to each subscription, biggest first. */
export function lifetimeCost(subscriptions: Subscription[], payments: SubscriptionPayment[]): LifetimeCost[] {
  return subscriptions
    .map((s) => {
      const own = payments.filter((p) => p.subscriptionId === s.id && isCharged(p)).sort((a, b) => (a.paymentDate < b.paymentDate ? -1 : 1));
      return { subscriptionId: s.id, paid: own.reduce((t, p) => t + p.amount, 0), payments: own.length, amounts: own.map((p) => p.amount) };
    })
    .sort((a, b) => b.paid - a.paid);
}

// ---------- Price changes ----------

/** A payment 2% or more different from the one before it counts as a price change. */
export const PRICE_CHANGE_THRESHOLD = 0.02;

export interface PriceChange {
  subscriptionId: string;
  date: string;
  from: number;
  to: number;
}

/** Each time a subscription's charge moved by 2% or more from the payment before it. */
export function priceChanges(payments: SubscriptionPayment[], subscriptionId: string): PriceChange[] {
  const own = payments.filter((p) => p.subscriptionId === subscriptionId && isCharged(p)).sort((a, b) => (a.paymentDate < b.paymentDate ? -1 : 1));
  const changes: PriceChange[] = [];
  for (let i = 1; i < own.length; i++) {
    const before = own[i - 1].amount, after = own[i].amount;
    if (Math.abs(after - before) / before >= PRICE_CHANGE_THRESHOLD) changes.push({ subscriptionId, date: own[i].paymentDate, from: before, to: after });
  }
  return changes;
}

/**
 * When the latest charge differs from the plan's price by 2% or more: the plan is
 * probably out of date, so the page offers to update it. Active subscriptions only.
 */
export function chargedOffPlan(subscription: Subscription, payments: SubscriptionPayment[]): SubscriptionPayment | null {
  if (subscription.status !== "Active") return null;
  const latest = payments.filter((p) => p.subscriptionId === subscription.id && isCharged(p)).sort((a, b) => (a.paymentDate < b.paymentDate ? 1 : -1))[0];
  if (!latest || subscription.amount === 0) return null;
  return Math.abs(latest.amount - subscription.amount) / subscription.amount >= PRICE_CHANGE_THRESHOLD ? latest : null;
}

// ---------- The greeting ----------

export interface YearSummary {
  /** Charged payments so far this year. */
  paid: number;
  /** paid ÷ every month so far this year (January to the current month), as on the Cards page. */
  monthlyAverage: number;
  /** The month with the most paid so far this year, or null before any payment. */
  biggestMonth: { month: MonthKey; paid: number } | null;
  /**
   * Renewals in the next 30 days (today included) and what they cost: the ones still to
   * come at the plan's price, and any already marked paid ahead at what was paid.
   */
  next30: { count: number; total: number };
  /** What was paid in each month so far this year, January first, for the greeting's cards (7A). */
  months: { month: MonthKey; paid: number }[];
  /** The renewals counted in next30, soonest first. */
  soon: Renewal[];
}

export function yearSummary(subscriptions: Subscription[], payments: SubscriptionPayment[], today: string): YearSummary {
  const year = today.slice(0, 4);
  const months = monthRange(`${year}-01`, monthOf(today));
  const paid = paidByMonth(payments);
  const total = months.reduce((t, m) => t + (paid.get(m) ?? 0), 0);
  let biggest: { month: MonthKey; paid: number } | null = null;
  for (const m of months) {
    const v = paid.get(m) ?? 0;
    if (v > 0 && (!biggest || v > biggest.paid)) biggest = { month: m, paid: v };
  }
  const soon = allRenewals(subscriptions.filter((s) => s.status === "Active"), payments, today, addDays(today, 29), today).filter((r) => r.status === "upcoming" || r.status === "paid" || r.status === "pending");
  return {
    paid: total,
    monthlyAverage: total / months.length,
    biggestMonth: biggest,
    next30: { count: soon.length, total: soon.reduce((t, r) => t + r.amount, 0) },
    months: months.map((m) => ({ month: m, paid: paid.get(m) ?? 0 })),
    soon,
  };
}

