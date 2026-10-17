import { CYCLE_STEP_MONTHS, addMonthsUTC } from "./recurring";
import { monthOf, monthRange, type MonthKey } from "./cardSpend";
import { monthlyEquivalent } from "./subscriptions";
import {
  PRICE_CHANGE_THRESHOLD,
  cycleProgress,
  firstRenewalAfter,
  monthEnd,
  monthlySpendSeries,
  priceChanges,
  renewalsFor,
  type PriceChange,
  type Renewal,
} from "./subscriptionRenewals";
import type { Account, Card, Subscription, SubscriptionPayment } from "../sheets/types";

/**
 * The numbers behind the Subscriptions page (#126): the carousel's order, what the
 * hero shows for each pick, the payments table, and what's charged where. Pure, so
 * it's tested against fixtures; the renewal rules themselves are in
 * subscriptionRenewals.ts.
 */

/** What the Subscriptions page reads: the two tabs, plus the cards and accounts things are charged to. */
export interface SubscriptionData {
  subscriptions: Subscription[];
  payments: SubscriptionPayment[];
  cards: Card[];
  accounts: Account[];
}

/**
 * The data every figure on the page is worked out from. A payment whose subscription no
 * longer exists (it was deleted, but its payments weren't) is left out of everything, as
 * the Cards page leaves out statements whose card is gone: the page can't name it, and a
 * total that its parts don't add up to would be wrong either way.
 */
export function usableSubscriptionData(data: SubscriptionData): SubscriptionData {
  const ids = new Set(data.subscriptions.map((s) => s.id));
  return { ...data, payments: data.payments.filter((p) => ids.has(p.subscriptionId)) };
}

const isCharged = (p: SubscriptionPayment) => p.status === "Paid" && p.amount > 0;
const byDate = (a: { paymentDate: string }, b: { paymentDate: string }) => (a.paymentDate < b.paymentDate ? -1 : a.paymentDate > b.paymentDate ? 1 : 0);

/** An active subscription's next renewal that isn't paid yet (today or later), or null. */
export function nextRenewal(subscription: Subscription, payments: SubscriptionPayment[], today: string): Renewal | null {
  if (subscription.status !== "Active") return null;
  const step = CYCLE_STEP_MONTHS[subscription.billingCycle];
  return renewalsFor(subscription, payments, today, addMonthsUTC(today, step * 2 + 1), today).find((r) => r.status === "upcoming") ?? null;
}

const STATUS_RANK = { Active: 0, Paused: 1, Cancelled: 2 } as const;

/**
 * The carousel's order after All: active subscriptions by their next renewal, soonest
 * first, then the paused ones, then the cancelled ones. The order wraps round, so the
 * covers left of All are the ones that renew last.
 */
export function carouselOrder(subscriptions: Subscription[], payments: SubscriptionPayment[], today: string): Subscription[] {
  const next = new Map(subscriptions.map((s) => [s.id, nextRenewal(s, payments, today)?.date ?? "9999-12-31"]));
  return [...subscriptions].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      (next.get(a.id)! < next.get(b.id)! ? -1 : next.get(a.id)! > next.get(b.id)! ? 1 : 0) ||
      a.alias.localeCompare(b.alias),
  );
}

/** The hero's bar for one subscription: the cycle it's in, from one renewal to the next. */
export interface CycleBar {
  from: string;
  to: string;
  /** How far through it today is, 0 to 1. */
  fraction: number;
  /** The renewal at its start, when it was settled ahead of its date (Mark paid from 3 days before): the bar shows the cycle after it. */
  settledAhead?: Renewal;
}

export interface SubscriptionFacts {
  subscriptionId: string;
  monthly: number;
  yearly: number;
  /** Its next renewal that isn't paid yet; null unless active. */
  next: Renewal | null;
  /** Null unless active, or before its first renewal. */
  bar: CycleBar | null;
  /** Every charged payment, and how many. */
  paid: number;
  payments: number;
  /** The latest price change, 2% or more from the payment before. */
  lastChange: PriceChange | null;
  /** The latest charged payment, as "last paid" for a paused one. */
  lastCharged: SubscriptionPayment | null;
}

export function subscriptionFacts(subscription: Subscription, payments: SubscriptionPayment[], today: string): SubscriptionFacts {
  const charged = payments.filter((p) => p.subscriptionId === subscription.id && isCharged(p)).sort(byDate);
  const cycle = cycleProgress(subscription, today);
  let bar: CycleBar | null = null;
  if (cycle) {
    const atNext = renewalsFor(subscription, payments, cycle.next, cycle.next, today)[0];
    const after = atNext && (atNext.status === "paid" || atNext.status === "skipped") ? firstRenewalAfter(subscription, cycle.next) : null;
    bar = after ? { from: cycle.next, to: after, fraction: 0, settledAhead: atNext } : { from: cycle.last, to: cycle.next, fraction: cycle.fraction };
  }
  return {
    subscriptionId: subscription.id,
    monthly: monthlyEquivalent(subscription),
    yearly: monthlyEquivalent(subscription) * 12,
    next: nextRenewal(subscription, payments, today),
    bar,
    paid: charged.reduce((t, p) => t + p.amount, 0),
    payments: charged.length,
    lastChange: priceChanges(payments, subscription.id).at(-1) ?? null,
    lastCharged: charged.at(-1) ?? null,
  };
}

export interface AllFacts {
  active: number;
  monthly: number;
  yearly: number;
  /** The soonest renewal not paid yet, across active subscriptions. */
  next: Renewal | null;
  /** This month: paid so far, and the renewals still to come at the plan's price. */
  month: { from: string; to: string; paid: number; toCome: number; fraction: number };
  /** Charged payments in the period's months so far (this year, January to this month, by default), and how many. */
  periodPaid: number;
  periodPayments: number;
  /**
   * Active subscriptions whose price went up in the period (this year by default), and how
   * much more a month that adds up to. Net over the period (decided with Prathik
   * 2026-10-21): the last charge before it against the latest one in it (or the first in it,
   * for one that started in it), counted when it ended up 2% or more higher. So a promo that
   * ends, putting the price back where it was, isn't a rise.
   */
  rises: { count: number; monthlyMore: number };
}

/**
 * `window` is the months the paid and price-rise figures cover (the Subscriptions page's
 * period, up to this month); left out, it's this year so far. Everything else is today's.
 */
export function allFacts(subscriptions: Subscription[], payments: SubscriptionPayment[], today: string, window?: { from: MonthKey; to: MonthKey }): AllFacts {
  const active = subscriptions.filter((s) => s.status === "Active");
  const nexts = active.flatMap((s) => nextRenewal(s, payments, today) ?? []).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.subscriptionId.localeCompare(b.subscriptionId)));
  const nowMonth = monthOf(today);
  const [month] = monthlySpendSeries(subscriptions, payments, nowMonth, nowMonth, today);
  const { from: periodFrom, to: periodTo } = window ?? { from: `${today.slice(0, 4)}-01`, to: nowMonth };
  const periodMonths = new Set(monthRange(periodFrom, periodTo));
  const inPeriod = payments.filter((p) => isCharged(p) && periodMonths.has(monthOf(p.paymentDate)));
  let count = 0;
  let monthlyMore = 0;
  for (const s of active) {
    const charged = payments.filter((p) => p.subscriptionId === s.id && isCharged(p) && monthOf(p.paymentDate) <= nowMonth).sort(byDate);
    const inYear = charged.filter((p) => periodMonths.has(monthOf(p.paymentDate)));
    const latest = inYear.at(-1);
    // The last charge before the period (not after it: a past period's rise is over by today).
    const before = charged.filter((p) => monthOf(p.paymentDate) < periodFrom).at(-1) ?? inYear[0];
    if (!latest || !before || latest === before) continue;
    const rise = latest.amount - before.amount;
    if (rise / before.amount >= PRICE_CHANGE_THRESHOLD) {
      count += 1;
      // A rise of ₹X on a yearly plan is ₹X ÷ 12 more a month.
      monthlyMore += rise / CYCLE_STEP_MONTHS[s.billingCycle];
    }
  }
  const monthly = active.reduce((t, s) => t + monthlyEquivalent(s), 0);
  return {
    active: active.length,
    monthly,
    yearly: monthly * 12,
    next: nexts[0] ?? null,
    month: { from: `${nowMonth}-01`, to: monthEnd(nowMonth), paid: month.paid, toCome: month.expected, fraction: month.total > 0 ? month.paid / month.total : 0 },
    periodPaid: inPeriod.reduce((t, p) => t + p.amount, 0),
    periodPayments: inPeriod.length,
    rises: { count, monthlyMore },
  };
}

export interface PaymentRow {
  payment: SubscriptionPayment;
  /** How much it moved from the subscription's charged payment before it, when that's 2% or more. */
  change: number | null;
}

/**
 * The latest payments, newest first, for one subscription or for all of them, each
 * with its change from the one before (the price-change rule: 2% or more). `count`
 * and `paid` are over every payment in the filter, not just the ones shown. `within` keeps
 * only the payments made in those months (the page's period); a change is still worked out
 * against the payment before it, even one made before them.
 */
export function latestPayments(payments: SubscriptionPayment[], limit: number, subscriptionId?: string, within?: { from: MonthKey; to: MonthKey }): { rows: PaymentRow[]; count: number; paid: number } {
  const every = payments.filter((p) => !subscriptionId || p.subscriptionId === subscriptionId);
  const changes = new Map<SubscriptionPayment, number>();
  const bySub = new Map<string, SubscriptionPayment[]>();
  for (const p of every.filter(isCharged).sort(byDate)) (bySub.get(p.subscriptionId) ?? bySub.set(p.subscriptionId, []).get(p.subscriptionId)!).push(p);
  for (const list of bySub.values()) {
    for (let i = 1; i < list.length; i++) {
      const diff = list[i].amount - list[i - 1].amount;
      if (Math.abs(diff) / list[i - 1].amount >= PRICE_CHANGE_THRESHOLD) changes.set(list[i], diff);
    }
  }
  // Changes are against the payment before, even one before the window; only the rows and totals are the window's.
  const own = within ? every.filter((p) => monthOf(p.paymentDate) >= within.from && monthOf(p.paymentDate) <= within.to) : every;
  const newest = [...own].sort((a, b) => byDate(b, a) || a.subscriptionId.localeCompare(b.subscriptionId));
  return {
    rows: newest.slice(0, limit).map((payment) => ({ payment, change: changes.get(payment) ?? null })),
    count: own.length,
    paid: own.filter(isCharged).reduce((t, p) => t + p.amount, 0),
  };
}

/** What each charged payment cost, oldest first, for the price history. */
export function priceHistory(payments: SubscriptionPayment[], subscriptionId: string): { date: string; amount: number }[] {
  return payments
    .filter((p) => p.subscriptionId === subscriptionId && isCharged(p))
    .sort(byDate)
    .map((p) => ({ date: p.paymentDate, amount: p.amount }));
}

export interface ChargedToPlace {
  kind: "card" | "account" | "none";
  /** The card's or account's id; null for subscriptions with nothing set. */
  id: string | null;
  monthly: number;
  count: number;
}

/** Active subscriptions' monthly cost by where they're charged, biggest first. */
export function chargedToSplit(subscriptions: Subscription[]): ChargedToPlace[] {
  const places = new Map<string, ChargedToPlace>();
  for (const s of subscriptions.filter((x) => x.status === "Active")) {
    const place: Pick<ChargedToPlace, "kind" | "id"> = s.defaultPaidFromCardId
      ? { kind: "card", id: s.defaultPaidFromCardId }
      : s.defaultPaidFromAccountId
        ? { kind: "account", id: s.defaultPaidFromAccountId }
        : { kind: "none", id: null };
    const key = `${place.kind}:${place.id}`;
    const entry = places.get(key) ?? places.set(key, { ...place, monthly: 0, count: 0 }).get(key)!;
    entry.monthly += monthlyEquivalent(s);
    entry.count += 1;
  }
  return [...places.values()].sort((a, b) => b.monthly - a.monthly);
}
