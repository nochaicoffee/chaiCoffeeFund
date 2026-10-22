import { HISTORY_STATUSES, type HistorySort, type HistoryStatus } from "@/lib/aggregate/accountHistory";
import type { SpendPeriod } from "@/lib/aggregate/cardSpend";
import { periodParam } from "@/lib/aggregate/period";
import type { Account, AccountPurpose } from "@/lib/sheets/types";
import { ACCOUNT_PURPOSES } from "@/lib/forms/accountForms";
import { parsePage, parsePeriod, parseSearch, queryString } from "../../cards/params";

/**
 * The Balance history page's address (#177): `?period=` as on the other pages, `?account=<id>`,
 * `?purpose=`, `?status=rises|falls|first`, `?q=`, `?sort=oldest|biggest`, `?page=`, and `demo`.
 * Anything it doesn't recognise falls back to the default, so an old link still opens.
 */

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export interface HistoryState {
  period: SpendPeriod;
  status: HistoryStatus;
  accountId?: string;
  purpose?: AccountPurpose;
  search?: string;
  sort: HistorySort;
  page: number;
  demo: boolean;
}

export function parseHistoryState(params: SearchParams, accounts: Pick<Account, "id">[], today: string, demo: boolean): HistoryState {
  const status = HISTORY_STATUSES.find((s) => s === first(params.status)) ?? "all";
  const account = first(params.account);
  const purpose = ACCOUNT_PURPOSES.find((p) => p === first(params.purpose));
  const sort = first(params.sort);
  return {
    period: parsePeriod(params, today),
    status,
    accountId: account && accounts.some((a) => a.id === account) ? account : undefined,
    purpose,
    search: parseSearch(params) || undefined,
    sort: sort === "oldest" || sort === "biggest" ? sort : "newest",
    page: parsePage(params),
    demo,
  };
}

/** The query string for a link to this page, leaving out the defaults (this year, every balance, newest first, page 1). */
export function historyQuery(state: HistoryState, today: string): string {
  return queryString(
    [
      ["account", state.accountId],
      ["purpose", state.purpose],
      ["period", periodParam(state.period, today)],
      ["status", state.status === "all" ? undefined : state.status],
      ["q", state.search],
      ["sort", state.sort === "newest" ? undefined : state.sort],
      ["page", state.page > 1 ? String(state.page) : undefined],
    ],
    state.demo,
  );
}

/** The page's address for a state, with no trailing "?". */
export function historyHref(state: HistoryState, today: string): string {
  return `/accounts/history${historyQuery(state, today)}`.replace(/\?$/, "");
}
