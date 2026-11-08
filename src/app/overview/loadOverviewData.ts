import { rupeeBalances, unpricedForPage } from "@/lib/prices/rupeeBalances";
import type { PricePoint } from "@/lib/prices/history";
import { getPriceSeries } from "@/lib/prices/series";
import {
  getCachedAccounts,
  getCachedBalanceReviewsTab,
  getCachedBalanceSnapshots,
  getCachedCards,
  getCachedEpfAccounts,
  getCachedEpfEntries,
  getCachedEpfRates,
  getCachedFixedDeposits,
  getCachedGoalContributions,
  getCachedGoals,
  getCachedIncomeEntries,
  getCachedIncomeSources,
  getCachedInstruments,
  getCachedInvestmentTransactions,
  getCachedLentLoans,
  getCachedLentRepayments,
  getCachedLoanInstallments,
  getCachedLoanPrepayments,
  getCachedLoans,
  getCachedPolicies,
  getCachedPolicyPayments,
  getCachedStatements,
  getCachedSubscriptionPayments,
  getCachedSubscriptions,
} from "@/lib/sheets/cached";
import type { OverviewData } from "./model";

/** Reads one source that may not be there yet (its tab, or a problem reading it): a failure is logged, flagged, and never takes the Overview down. */
async function optional<T>(name: string, read: () => Promise<T>, empty: T): Promise<{ value: T; failed: boolean }> {
  try {
    return { value: await read(), failed: false };
  } catch (error) {
    console.error(`[overview] ${name} failed:`, error instanceof Error ? error.message : String(error));
    return { value: empty, failed: true };
  }
}

/**
 * Everything the Overview reads, in one place (F-OV-05): the core tabs (a failure there is the page's own error, as on every page), and the
 * sources that can be missing or unreadable (EPF, lent out, goals, insurance, prices), each flagged when it failed so net worth says what it left out.
 * Dollar accounts are counted in rupees at today's rate once (ADR 0012); with no rate they are left out and flagged.
 */
export async function loadOverviewData(): Promise<OverviewData> {
  // Every read starts here, before any is awaited, so on a cold cache they all go to Sheets in one batch (lib/sheets/batchedReads.ts)
  // and the page waits only for the slowest tab, not one round after another.
  const core = Promise.all([
    getCachedAccounts(),
    getCachedBalanceSnapshots(),
    getCachedCards(),
    getCachedStatements(),
    getCachedSubscriptions(),
    getCachedSubscriptionPayments(),
    getCachedLoans(),
    getCachedLoanInstallments(),
    getCachedInvestmentTransactions(),
    getCachedInstruments(),
    getCachedFixedDeposits(),
    getCachedIncomeEntries(),
    getCachedIncomeSources(),
  ]);
  const sources = Promise.all([
    optional("EPF", async () => {
      const [accounts, entries, rates] = await Promise.all([getCachedEpfAccounts(), getCachedEpfEntries(), getCachedEpfRates()]);
      return { accounts, entries, rates };
    }, { accounts: [], entries: [], rates: [] }),
    optional("lent out", async () => {
      const [loans, repayments] = await Promise.all([getCachedLentLoans(), getCachedLentRepayments()]);
      return { loans, repayments };
    }, { loans: [], repayments: [] }),
    optional("goals", async () => {
      const [goals, contributions] = await Promise.all([getCachedGoals(), getCachedGoalContributions()]);
      return { goals, contributions };
    }, { goals: [], contributions: [] }),
    optional("loan prepayments", () => getCachedLoanPrepayments(), []),
    optional("insurance", async () => {
      const [policies, payments] = await Promise.all([getCachedPolicies(), getCachedPolicyPayments()]);
      return { policies, payments };
    }, { policies: [], payments: [] }),
    optional("prices", () => getPriceSeries(), new Map<string, PricePoint[]>()),
  ]);
  // The balance reviews are read by the Accounts warnings (loadWarnings.ts), which can only start once the model is built. Asking for them
  // now puts them in the same batch, and the warnings then find them cached. A failure here is left to the warnings to report.
  void getCachedBalanceReviewsTab().catch(() => {});

  // If the core fails the page shows its error; `sources` never rejects (each one is optional), so nothing is left unhandled.
  const [allAccounts, allSnapshots, cards, statements, subscriptions, subscriptionPayments, loans, loanInstallments, trades, instruments, fixedDeposits, incomeEntries, incomeSources] = await core;
  const rupee = await rupeeBalances(allAccounts, allSnapshots);
  const [epf, lent, goals, prepayments, insurance, prices] = await sources;

  return {
    accounts: rupee.accounts,
    balanceSnapshots: rupee.snapshots,
    unpriced: unpricedForPage(rupee),
    cards,
    statements,
    subscriptions,
    subscriptionPayments,
    loans,
    loanInstallments,
    loanPrepayments: prepayments.value,
    trades,
    instruments,
    closes: prices.value,
    pricesFailed: prices.failed,
    fixedDeposits,
    incomeEntries,
    incomeSources,
    epf: { ...epf.value, failed: epf.failed },
    lent: { ...lent.value, failed: lent.failed },
    goals: { ...goals.value, failed: goals.failed },
    insurance: { ...insurance.value, failed: insurance.failed },
  };
}
