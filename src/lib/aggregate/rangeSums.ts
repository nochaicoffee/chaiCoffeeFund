import type { MonthKey } from "./cardSpend";
import type { GoalContribution, PolicyPayment, SubscriptionPayment } from "../sheets/types";

/**
 * What was paid or put aside inside a range of months, for the Overview's tiles when the page follows a period (docs/design/overview.md,
 * MzB). Each reads the day the money moved, as the page that owns it does. Pure.
 */

const inMonths = (date: string | undefined, months: ReadonlySet<MonthKey>): boolean => !!date && months.has(date.slice(0, 7));
const sum = (values: number[]) => values.reduce((t, v) => t + v, 0);

/** Subscription payments marked paid in the range. A payment on a card is counted too: it is what the subscription cost, whichever bill carried it. */
export function subscriptionsPaidIn(payments: SubscriptionPayment[], months: ReadonlySet<MonthKey>): number {
  return sum(payments.filter((p) => p.status === "Paid" && inMonths(p.paymentDate, months)).map((p) => p.amount));
}

/** Money put towards goals in the range, net of what was taken back (a Take-back releases money from a goal, so it counts against). */
export function goalsAddedIn(contributions: GoalContribution[], months: ReadonlySet<MonthKey>): number {
  return sum(contributions.filter((c) => inMonths(c.date, months)).map((c) => (c.kind === "Take-back" ? -c.amount : c.amount)));
}

/** Insurance premiums paid in the range, on the day they were paid (a premium with no known day counts at its term's start, as Insurance does). */
export function premiumsPaidIn(payments: PolicyPayment[], months: ReadonlySet<MonthKey>): number {
  return sum(payments.filter((p) => p.status === "Paid" && inMonths(p.paidOn ?? p.periodStart, months)).map((p) => p.amount));
}
