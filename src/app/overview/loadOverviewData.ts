import { rupeeBalances, unpricedForPage } from "@/lib/prices/rupeeBalances";
import type { PricePoint } from "@/lib/prices/history";
import { getPriceSeries } from "@/lib/prices/series";
import {
  getCachedAccounts,
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
  const [allAccounts, allSnapshots, cards, statements, subscriptions, loans, loanInstallments, trades, instruments, fixedDeposits, incomeEntries, incomeSources] = await Promise.all([
    getCachedAccounts(),
    getCachedBalanceSnapshots(),
    getCachedCards(),
    getCachedStatements(),
    getCachedSubscriptions(),
    getCachedLoans(),
    getCachedLoanInstallments(),
    getCachedInvestmentTransactions(),
    getCachedInstruments(),
    getCachedFixedDeposits(),
    getCachedIncomeEntries(),
    getCachedIncomeSources(),
  ]);
  const rupee = await rupeeBalances(allAccounts, allSnapshots);

  const [epf, lent, goals, prepayments, insurance, prices] = await Promise.all([
    optional("EPF", async () => ({ accounts: await getCachedEpfAccounts(), entries: await getCachedEpfEntries(), rates: await getCachedEpfRates() }), { accounts: [], entries: [], rates: [] }),
    optional("lent out", async () => ({ loans: await getCachedLentLoans(), repayments: await getCachedLentRepayments() }), { loans: [], repayments: [] }),
    optional("goals", async () => ({ goals: await getCachedGoals(), contributions: await getCachedGoalContributions() }), { goals: [], contributions: [] }),
    optional("loan prepayments", () => getCachedLoanPrepayments(), []),
    optional("insurance", async () => ({ policies: await getCachedPolicies(), payments: await getCachedPolicyPayments() }), { policies: [], payments: [] }),
    optional("prices", () => getPriceSeries(), new Map<string, PricePoint[]>()),
  ]);

  return {
    accounts: rupee.accounts,
    balanceSnapshots: rupee.snapshots,
    unpriced: unpricedForPage(rupee),
    cards,
    statements,
    subscriptions,
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
