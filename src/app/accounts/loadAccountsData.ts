import type { AccountsData } from "@/lib/aggregate/accountFlows";
import { isDemoAllowed } from "@/lib/demo/cardsDemo";
import { demoAccountsData, demoReviews } from "@/lib/demo/accountsDemo";
import {
  getCachedAccountsTab,
  getCachedBalanceReviewsTab,
  getCachedBalanceSnapshotsTab,
  getCachedCards,
  getCachedIncomeEntries,
  getCachedIncomeSources,
  getCachedInvestmentTransactions,
  getCachedLoanInstallments,
  getCachedLoans,
  getCachedStatements,
  getCachedSubscriptionPayments,
  getCachedSubscriptions,
} from "@/lib/sheets/cached";
import type { SkippedRows } from "@/lib/sheets/rowReading";

/**
 * What the Accounts page reads (#162). With `?demo` in development it's the sample data,
 * which never reads from or writes to the Sheet; otherwise the Accounts and BalanceSnapshots
 * tabs, and what the money-out figures are worked out from (card bills, subscriptions, EMIs,
 * trades and income), are read in parallel. `skipped` is the rows that failed validation.
 */
export async function loadAccountsData(
  params: Record<string, string | string[] | undefined>,
  today: string,
): Promise<{ demo: boolean; data: AccountsData; skipped: SkippedRows[] }> {
  const demo = isDemoAllowed() && params.demo !== undefined;
  if (demo) {
    const sample = demoAccountsData(today);
    return { demo, data: { ...sample, reviews: demoReviews(sample, today) }, skipped: [] };
  }
  const [accounts, snapshots, reviews, cards, statements, subscriptions, subscriptionPayments, loans, installments, trades, incomeSources, incomeEntries] = await Promise.all([
    getCachedAccountsTab(),
    getCachedBalanceSnapshotsTab(),
    getCachedBalanceReviewsTab(),
    getCachedCards(),
    getCachedStatements(),
    getCachedSubscriptions(),
    getCachedSubscriptionPayments(),
    getCachedLoans(),
    getCachedLoanInstallments(),
    getCachedInvestmentTransactions(),
    getCachedIncomeSources(),
    getCachedIncomeEntries(),
  ]);
  return {
    demo,
    data: { accounts: accounts.records, snapshots: snapshots.records, reviews: reviews.records, cards, statements, subscriptions, subscriptionPayments, loans, installments, trades, incomeSources, incomeEntries },
    skipped: [accounts.skipped, snapshots.skipped, reviews.skipped],
  };
}
