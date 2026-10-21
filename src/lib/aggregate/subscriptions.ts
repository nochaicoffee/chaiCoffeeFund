import { CYCLE_STEP_MONTHS, nextOccurrence } from "./recurring";
import type { Card, Subscription } from "../sheets/types";

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

/**
 * The monthly-equivalent spend of active subscriptions that aren't charged to a card:
 * the part of subscriptions that reaches a bank account directly. A card-charged one is
 * already inside that card's statement, so a total of everything you'll pay (the
 * Overview's monthly obligations) counts it there and never again here. Decided with
 * Prathik 2026-10-21 (#124): count once, by context. One with no "charged to" set is
 * counted here, since nothing says a card covers it. So is one charged to a card that's
 * no longer active or no longer exists: the Overview only adds active cards' bills, so
 * it would otherwise be counted nowhere.
 */
export function monthlySpendOffCards(subscriptions: Subscription[], cards: Pick<Card, "id" | "status">[]): number {
  const activeCards = new Set(cards.filter((c) => c.status === "Active").map((c) => c.id));
  return totalMonthlySubscriptionSpend(subscriptions.filter((s) => !s.defaultPaidFromCardId || !activeCards.has(s.defaultPaidFromCardId)));
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
