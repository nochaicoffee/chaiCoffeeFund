import type { SubscriptionData } from "@/lib/aggregate/subscriptionPage";
import { isDemoAllowed } from "@/lib/demo/cardsDemo";
import { demoSubscriptionData } from "@/lib/demo/subscriptionsDemo";
import { getCachedAccounts, getCachedCards, getCachedSubscriptionPaymentsTab, getCachedSubscriptionsTab } from "@/lib/sheets/cached";
import type { SkippedRows } from "@/lib/sheets/rowReading";

/**
 * What the Subscriptions page shows. With `?demo` in development it's the sample data,
 * which never reads from or writes to the Sheet; otherwise both tabs, and the cards and
 * accounts things are charged to, are read in parallel. `skipped` is the rows that
 * failed validation, for the page to point out.
 */
export async function loadSubscriptionData(
  params: Record<string, string | string[] | undefined>,
  today: string,
): Promise<{ demo: boolean; data: SubscriptionData; skipped: SkippedRows[] }> {
  const demo = isDemoAllowed() && params.demo !== undefined;
  if (demo) return { demo, data: demoSubscriptionData(today), skipped: [] };
  const [subscriptions, payments, cards, accounts] = await Promise.all([getCachedSubscriptionsTab(), getCachedSubscriptionPaymentsTab(), getCachedCards(), getCachedAccounts()]);
  return { demo, data: { subscriptions: subscriptions.records, payments: payments.records, cards, accounts }, skipped: [subscriptions.skipped, payments.skipped] };
}
