import { addMonths, monthOf, monthRange, type MonthKey, type SpendPeriod } from "./cardSpend";
import { periodDates } from "./subscriptionRenewalList";
import { isCharged } from "./subscriptionRenewals";
import type { Subscription, SubscriptionPayment } from "../sheets/types";

/**
 * The months each part of the Subscriptions page covers for the period pill (docs/design/subscriptions.md,
 * "The period"). The period is the same as on the Renewals page (`periodDates`): a year runs
 * Jan to Dec, a range its own months, all time from the first subscription's start to the end
 * of this year. Pure, so it's tested against fixtures.
 */

export interface MonthWindow {
  from: MonthKey;
  to: MonthKey;
}

/** Day by day draws at most this many months, and the Payment trend at most TREND_MONTHS: the latest of a longer period. */
export const GRID_MONTHS = 12;
export const TREND_MONTHS = 24;

/** Whether a date falls in a window's months. */
export const inWindow = (date: string, window: MonthWindow) => monthOf(date) >= window.from && monthOf(date) <= window.to;

/**
 * The months what was paid is counted over: the period's, up to this month (a payment
 * marked ahead into a later month isn't counted yet, as on the Renewals page). All time
 * starts at the first payment's month. A window can be empty (from after to), for a
 * period that hasn't started, and `monthRange` of it is then empty too.
 */
export function paidWindow(period: SpendPeriod, today: string, subscriptions: Pick<Subscription, "startDate">[], payments: SubscriptionPayment[]): MonthWindow {
  const dates = periodDates(period, today, subscriptions);
  const now = monthOf(today);
  const end = monthOf(dates.to);
  const firstPaid = payments.filter(isCharged).map((p) => monthOf(p.paymentDate)).sort()[0];
  return { from: period.kind === "all" && firstPaid ? firstPaid : monthOf(dates.from), to: end < now ? end : now };
}

/** What was paid inside a window, as the payments the page's figures are worked out from. */
export const paymentsIn = (payments: SubscriptionPayment[], window: MonthWindow) => payments.filter((p) => inWindow(p.paymentDate, window));

export interface ChartWindows {
  /** Every month of the period, to the end of its year when it's a year (renewals still to come are drawn). */
  full: MonthWindow;
  days: MonthWindow;
  trend: MonthWindow;
}

/**
 * The months the chart's views draw: the period's, but no more than the latest 12 for
 * Day by day and 24 for the Payment trend, so a long one (all time) still fits the card.
 */
export function chartWindows(period: SpendPeriod, today: string, subscriptions: Pick<Subscription, "startDate">[]): ChartWindows {
  const dates = periodDates(period, today, subscriptions);
  const full = { from: monthOf(dates.from), to: monthOf(dates.to) };
  const latest = (months: number): MonthWindow => {
    const from = addMonths(full.to, -(months - 1));
    return { from: from > full.from ? from : full.from, to: full.to };
  };
  return { full, days: latest(GRID_MONTHS), trend: latest(TREND_MONTHS) };
}

/** How many months a window spans. */
export const monthCount = (window: MonthWindow) => monthRange(window.from, window.to).length;
