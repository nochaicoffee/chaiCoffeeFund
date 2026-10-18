import "server-only";
import { unstable_cache } from "next/cache";
import type { Repository } from "./repository";
import type { SkippedRows } from "./rowReading";
import { accountsRepository } from "./accounts";
import { balanceSnapshotsRepository } from "./balanceSnapshots";
import { cardsRepository } from "./cards";
import { statementsRepository } from "./statements";
import { subscriptionsRepository } from "./subscriptions";
import { subscriptionPaymentsRepository } from "./subscriptionPayments";
import { incomeSourcesRepository } from "./incomeSources";
import { incomeEntriesRepository } from "./incomeEntries";
import { loansRepository } from "./loans";
import { loanInstallmentsRepository } from "./loanInstallments";
import { investmentTransactionsRepository } from "./investmentTransactions";
import { fixedDepositsRepository } from "./fixedDeposits";

/**
 * Cached reads for every entity, one tag each — used by pages (Server
 * Components) so repeated navigations don't re-hit the Sheets API on every
 * load. A 15-minute revalidate is the passive safety net; the Refresh
 * button (a Server Action calling `updateTag` per tag, see refresh.ts)
 * forces genuinely fresh data on demand.
 *
 * `updateTag` only works from inside Server Actions — never from a Route
 * Handler — which is exactly why this caching lives here, at the read
 * side, rather than baked into the generic repository's create/update/
 * remove: those get called from both Route Handlers (the /api/* routes)
 * and Server Actions, and only the latter context can call updateTag.
 * Each write call site invalidates its own tag(s) with whichever
 * primitive its context allows — see `lib/api/createCrudRoutes.ts` for
 * Route Handlers (`revalidateTag`) and Server Actions (`updateTag`) once
 * those exist.
 */
export const CACHE_TAGS = {
  accounts: "accounts",
  balanceSnapshots: "balanceSnapshots",
  cards: "cards",
  statements: "statements",
  subscriptions: "subscriptions",
  subscriptionPayments: "subscriptionPayments",
  incomeSources: "incomeSources",
  incomeEntries: "incomeEntries",
  loans: "loans",
  loanInstallments: "loanInstallments",
  investmentTransactions: "investmentTransactions",
  fixedDeposits: "fixedDeposits",
} as const;

const REVALIDATE_SECONDS = 900;

/** One tab as the pages read it: the valid records, and the rows it left out. */
export interface CachedTab<T> {
  records: T[];
  skipped: SkippedRows;
}

/**
 * Wraps a repository's readAll() in unstable_cache, tagged for on-demand
 * invalidation, so a page gets a tab's records and its skipped rows from the
 * same Sheets read and the same cache entry: refreshing the data refreshes the
 * skipped rows too. Skipped rows keep only their row number and problems,
 * never their cells, because a Cards row holds a PDF password.
 */
function cachedTab<T extends { id: string }>(repository: Pick<Repository<T>, "sheetName" | "readAll">, tag: string): () => Promise<CachedTab<T>> {
  return unstable_cache(
    async () => {
      const { records, invalid } = await repository.readAll();
      const rows = invalid.map(({ rowNumber, problems }) => ({ rowNumber, problems }));
      return { records, skipped: { tab: repository.sheetName, rows } };
    },
    [tag],
    { tags: [tag], revalidate: REVALIDATE_SECONDS },
  );
}

/** Just the valid records of a cached tab, from the same cache entry. */
function cachedList<T>(tab: () => Promise<CachedTab<T>>): () => Promise<T[]> {
  return async () => (await tab()).records;
}

/**
 * Derives a cached single-record lookup from a cached list instead of a
 * second, separate cache entry — one cache to invalidate per entity, not
 * two that could ever disagree. Fine at this app's data volumes (an
 * in-memory find over at most a few hundred rows).
 */
function cachedGetById<T extends { id: string }>(list: () => Promise<T[]>) {
  return async (id: string): Promise<T | null> => (await list()).find((item) => item.id === id) ?? null;
}

export const getCachedAccountsTab = cachedTab(accountsRepository, CACHE_TAGS.accounts);
export const getCachedAccounts = cachedList(getCachedAccountsTab);
export const getCachedAccountById = cachedGetById(getCachedAccounts);

export const getCachedBalanceSnapshotsTab = cachedTab(balanceSnapshotsRepository, CACHE_TAGS.balanceSnapshots);
export const getCachedBalanceSnapshots = cachedList(getCachedBalanceSnapshotsTab);
export const getCachedBalanceSnapshotById = cachedGetById(getCachedBalanceSnapshots);

export const getCachedCardsTab = cachedTab(cardsRepository, CACHE_TAGS.cards);
export const getCachedCards = cachedList(getCachedCardsTab);
export const getCachedCardById = cachedGetById(getCachedCards);

export const getCachedStatementsTab = cachedTab(statementsRepository, CACHE_TAGS.statements);
export const getCachedStatements = cachedList(getCachedStatementsTab);
export const getCachedStatementById = cachedGetById(getCachedStatements);

export const getCachedSubscriptionsTab = cachedTab(subscriptionsRepository, CACHE_TAGS.subscriptions);
export const getCachedSubscriptions = cachedList(getCachedSubscriptionsTab);
export const getCachedSubscriptionById = cachedGetById(getCachedSubscriptions);

export const getCachedSubscriptionPaymentsTab = cachedTab(subscriptionPaymentsRepository, CACHE_TAGS.subscriptionPayments);
export const getCachedSubscriptionPayments = cachedList(getCachedSubscriptionPaymentsTab);
export const getCachedSubscriptionPaymentById = cachedGetById(getCachedSubscriptionPayments);

export const getCachedIncomeSourcesTab = cachedTab(incomeSourcesRepository, CACHE_TAGS.incomeSources);
export const getCachedIncomeSources = cachedList(getCachedIncomeSourcesTab);
export const getCachedIncomeSourceById = cachedGetById(getCachedIncomeSources);

export const getCachedIncomeEntriesTab = cachedTab(incomeEntriesRepository, CACHE_TAGS.incomeEntries);
export const getCachedIncomeEntries = cachedList(getCachedIncomeEntriesTab);
export const getCachedIncomeEntryById = cachedGetById(getCachedIncomeEntries);

export const getCachedLoansTab = cachedTab(loansRepository, CACHE_TAGS.loans);
export const getCachedLoans = cachedList(getCachedLoansTab);
export const getCachedLoanById = cachedGetById(getCachedLoans);

export const getCachedLoanInstallmentsTab = cachedTab(loanInstallmentsRepository, CACHE_TAGS.loanInstallments);
export const getCachedLoanInstallments = cachedList(getCachedLoanInstallmentsTab);
export const getCachedLoanInstallmentById = cachedGetById(getCachedLoanInstallments);

export const getCachedInvestmentTransactionsTab = cachedTab(investmentTransactionsRepository, CACHE_TAGS.investmentTransactions);
export const getCachedInvestmentTransactions = cachedList(getCachedInvestmentTransactionsTab);
export const getCachedInvestmentTransactionById = cachedGetById(getCachedInvestmentTransactions);

export const getCachedFixedDepositsTab = cachedTab(fixedDepositsRepository, CACHE_TAGS.fixedDeposits);
export const getCachedFixedDeposits = cachedList(getCachedFixedDepositsTab);
export const getCachedFixedDepositById = cachedGetById(getCachedFixedDeposits);
