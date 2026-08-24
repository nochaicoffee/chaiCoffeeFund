import { CYCLE_STEP_MONTHS, nextOccurrence } from "./recurring";
import type { Subscription } from "../sheets/types";

export interface SubscriptionSummary {
  subscription: Subscription;
  monthlyEquivalent: number;
  nextBillingDate: string;
}

/** Normalizes a subscription's billed amount to a monthly figure. */
export function monthlyEquivalent(subscription: Subscription): number {
  return subscription.amount / CYCLE_STEP_MONTHS[subscription.billingCycle];
}

export function computeSubscriptionSummaries(subscriptions: Subscription[], from: string): SubscriptionSummary[] {
  return subscriptions.map((subscription) => ({
    subscription,
    monthlyEquivalent: monthlyEquivalent(subscription),
    nextBillingDate: nextOccurrence(subscription.billingAnchorDate, subscription.billingCycle, from),
  }));
}

/** Total monthly-equivalent spend across active subscriptions — feeds the "monthly obligations" tile. */
export function totalMonthlySubscriptionSpend(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((s) => s.status === "Active")
    .reduce((sum, s) => sum + monthlyEquivalent(s), 0);
}

/** Monthly-equivalent spend grouped by category, active subscriptions only. */
export function subscriptionSpendByCategory(subscriptions: Subscription[]): Record<string, number> {
  const byCategory: Record<string, number> = {};
  for (const subscription of subscriptions) {
    if (subscription.status !== "Active") continue;
    byCategory[subscription.category] = (byCategory[subscription.category] ?? 0) + monthlyEquivalent(subscription);
  }
  return byCategory;
}
