import "server-only";
import type { ExpenseData } from "@/lib/aggregate/expenses";
import type { PricePoint } from "@/lib/prices/history";
import { USD_INR_TICKER } from "@/lib/prices/refreshPlan";
import { getPriceSeries } from "@/lib/prices/series";
import { getUsdInr } from "@/lib/prices/usdInr";
import {
  getCachedAccountsTab,
  getCachedBalanceSnapshotsTab,
  getCachedBigSpendsTab,
  getCachedCardsTab,
  getCachedFixedDepositsTab,
  getCachedIncomeEntriesTab,
  getCachedIncomeSourcesTab,
  getCachedInvestmentTransactionsTab,
  getCachedLentLoansTab,
  getCachedLentRepaymentsTab,
  getCachedLoanInstallmentsTab,
  getCachedLoanPrepaymentsTab,
  getCachedLoansTab,
  getCachedPoliciesTab,
  getCachedPolicyPaymentsTab,
  getCachedStatementsTab,
  getCachedSubscriptionPaymentsTab,
  getCachedSubscriptionsTab,
} from "@/lib/sheets/cached";
import type { SkippedRows } from "@/lib/sheets/rowReading";

export interface ExpensePageData {
  data: ExpenseData;
  /** Tabs with rows that didn't read, for the notice under the greeting. */
  skipped: SkippedRows[];
}

/**
 * Everything the Expenses page reads (docs/design/expenses.md): every tab a month's money touches, the saved USD to INR closes and today's rate.
 * A dollar balance stays in dollars here; the math turns its change into rupees at the month's rate. The closes not reading leaves today's rate,
 * and no rate at all leaves months with a dollar account unknown, said so on the page.
 */
export async function loadExpenseData(): Promise<ExpensePageData> {
  const closes = getPriceSeries().then(
    (series) => series.get(USD_INR_TICKER) ?? ([] as PricePoint[]),
    (error) => {
      console.error("Expenses: the saved USD to INR closes couldn't be read", error);
      return [] as PricePoint[];
    },
  );
  const [accounts, snapshots, incomeEntries, incomeSources, cards, statements, subscriptions, subscriptionPayments, loans, installments, prepayments, policies, policyPayments, trades, fixedDeposits, lentLoans, lentRepayments, bigSpends] = await Promise.all([
    getCachedAccountsTab(),
    getCachedBalanceSnapshotsTab(),
    getCachedIncomeEntriesTab(),
    getCachedIncomeSourcesTab(),
    getCachedCardsTab(),
    getCachedStatementsTab(),
    getCachedSubscriptionsTab(),
    getCachedSubscriptionPaymentsTab(),
    getCachedLoansTab(),
    getCachedLoanInstallmentsTab(),
    getCachedLoanPrepaymentsTab(),
    getCachedPoliciesTab(),
    getCachedPolicyPaymentsTab(),
    getCachedInvestmentTransactionsTab(),
    getCachedFixedDepositsTab(),
    getCachedLentLoansTab(),
    getCachedLentRepaymentsTab(),
    getCachedBigSpendsTab(),
  ]);
  const needsRate = accounts.records.some((a) => a.currency === "USD") || trades.records.some((t) => t.market === "US");
  const [usdInr, today] = await Promise.all([closes, needsRate ? getUsdInr() : Promise.resolve(null)]);
  const tabs = [accounts, snapshots, incomeEntries, statements, subscriptionPayments, installments, prepayments, policyPayments, trades, fixedDeposits, lentLoans, lentRepayments, bigSpends];
  return {
    data: {
      accounts: accounts.records,
      snapshots: snapshots.records,
      usdInr,
      usdInrToday: today?.ok ? today.rate : null,
      incomeEntries: incomeEntries.records,
      incomeSources: incomeSources.records,
      cards: cards.records,
      statements: statements.records,
      subscriptions: subscriptions.records,
      subscriptionPayments: subscriptionPayments.records,
      loans: loans.records,
      installments: installments.records,
      prepayments: prepayments.records,
      policies: policies.records,
      policyPayments: policyPayments.records,
      trades: trades.records,
      fixedDeposits: fixedDeposits.records,
      lentLoans: lentLoans.records,
      lentRepayments: lentRepayments.records,
      bigSpends: bigSpends.records,
    },
    skipped: tabs.map((t) => t.skipped).filter((s) => s.rows.length > 0),
  };
}
