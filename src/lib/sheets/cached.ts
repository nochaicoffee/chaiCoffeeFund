import "server-only";
import { unstable_cache } from "next/cache";
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

/** Wraps a repository's list() in unstable_cache, tagged for on-demand invalidation. */
function cachedList<T>(list: () => Promise<T[]>, tag: string): () => Promise<T[]> {
  return unstable_cache(list, [tag], { tags: [tag], revalidate: REVALIDATE_SECONDS });
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

export const getCachedAccounts = cachedList(() => accountsRepository.list(), CACHE_TAGS.accounts);
export const getCachedAccountById = cachedGetById(getCachedAccounts);

export const getCachedBalanceSnapshots = cachedList(
  () => balanceSnapshotsRepository.list(),
  CACHE_TAGS.balanceSnapshots,
);
export const getCachedBalanceSnapshotById = cachedGetById(getCachedBalanceSnapshots);

export const getCachedCards = cachedList(() => cardsRepository.list(), CACHE_TAGS.cards);
export const getCachedCardById = cachedGetById(getCachedCards);

export const getCachedStatements = cachedList(() => statementsRepository.list(), CACHE_TAGS.statements);
export const getCachedStatementById = cachedGetById(getCachedStatements);

export const getCachedSubscriptions = cachedList(() => subscriptionsRepository.list(), CACHE_TAGS.subscriptions);
export const getCachedSubscriptionById = cachedGetById(getCachedSubscriptions);

export const getCachedSubscriptionPayments = cachedList(
  () => subscriptionPaymentsRepository.list(),
  CACHE_TAGS.subscriptionPayments,
);
export const getCachedSubscriptionPaymentById = cachedGetById(getCachedSubscriptionPayments);

export const getCachedIncomeSources = cachedList(() => incomeSourcesRepository.list(), CACHE_TAGS.incomeSources);
export const getCachedIncomeSourceById = cachedGetById(getCachedIncomeSources);

export const getCachedIncomeEntries = cachedList(() => incomeEntriesRepository.list(), CACHE_TAGS.incomeEntries);
export const getCachedIncomeEntryById = cachedGetById(getCachedIncomeEntries);

export const getCachedLoans = cachedList(() => loansRepository.list(), CACHE_TAGS.loans);
export const getCachedLoanById = cachedGetById(getCachedLoans);

export const getCachedLoanInstallments = cachedList(
  () => loanInstallmentsRepository.list(),
  CACHE_TAGS.loanInstallments,
);
export const getCachedLoanInstallmentById = cachedGetById(getCachedLoanInstallments);

export const getCachedInvestmentTransactions = cachedList(
  () => investmentTransactionsRepository.list(),
  CACHE_TAGS.investmentTransactions,
);
export const getCachedInvestmentTransactionById = cachedGetById(getCachedInvestmentTransactions);

export const getCachedFixedDeposits = cachedList(() => fixedDepositsRepository.list(), CACHE_TAGS.fixedDeposits);
export const getCachedFixedDepositById = cachedGetById(getCachedFixedDeposits);
