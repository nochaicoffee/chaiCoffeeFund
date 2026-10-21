import { addMonths, monthOf, type MonthKey, type SpendPeriod } from "@/lib/aggregate/cardSpend";
import { lastMonths, periodName, periodParam, QUICK_RANGES, monthSpanName } from "@/lib/aggregate/period";
import { paidInPeriod, periodDates, type Place, type RenewalFilter, type RenewalQuery } from "@/lib/aggregate/subscriptionRenewalList";
import type { SubscriptionData } from "@/lib/aggregate/subscriptionPage";
import { formatInrCompact } from "@/lib/format/money";
import type { SelectOption } from "@/components/Select";
import { CUSTOM_PERIOD, parsePage, parsePeriod, parseSearch, parseSort, periodMenuValue, periodYears, queryString } from "../../cards/params";

/**
 * The Renewals page's address (#130): `?period=` as on the Statements page, `?status=`,
 * `?sub=<id>`, `?card=<id>` or `?account=<id>` for Charged to, `?q=`, `?sort=oldest`,
 * `?page=`, `?later=1` to show the renewals after the next 30 days, and `demo`.
 * Anything it doesn't recognise falls back to the default, so an old link still opens.
 */

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export interface RenewalsListState extends RenewalQuery {
  page?: number;
  showLater?: boolean;
  demo: boolean;
}

const STATUSES: RenewalFilter[] = ["upcoming", "paid", "not-recorded"];

/** Everything the list shows, from the address. A subscription, card or account that doesn't exist (any more) is ignored. */
export function parseRenewalsState(params: SearchParams, data: SubscriptionData, today: string, demo: boolean): RenewalsListState {
  const status = STATUSES.find((s) => s === first(params.status)) ?? "all";
  const sub = first(params.sub);
  const card = first(params.card);
  const account = first(params.account);
  let place: Place | undefined;
  if (card && data.cards.some((c) => c.id === card)) place = { kind: "card", id: card };
  else if (account && data.accounts.some((a) => a.id === account)) place = { kind: "account", id: account };
  return {
    period: parsePeriod(params, today),
    status,
    subscriptionId: sub && data.subscriptions.some((s) => s.id === sub) ? sub : undefined,
    place,
    search: parseSearch(params) || undefined,
    sort: parseSort(params),
    page: parsePage(params),
    showLater: first(params.later) === "1",
    demo,
  };
}

/** The query string for a Renewals page link, leaving out the defaults (this year, every renewal, newest first, page 1). */
export function renewalsQuery(state: RenewalsListState, today: string): string {
  return queryString(
    [
      ["sub", state.subscriptionId],
      ["period", periodParam(state.period, today)],
      ["status", state.status === "all" ? undefined : state.status],
      ["card", state.place?.kind === "card" ? state.place.id : undefined],
      ["account", state.place?.kind === "account" ? state.place.id : undefined],
      ["q", state.search],
      ["sort", state.sort === "oldest" ? "oldest" : undefined],
      ["page", state.page && state.page > 1 ? String(state.page) : undefined],
      ["later", state.showLater ? "1" : undefined],
    ],
    state.demo,
  );
}

/** The years with renewals: from the first subscription's start to this year. */
function renewalYears(data: SubscriptionData, today: string): number[] {
  const now = Number(today.slice(0, 4));
  const start = data.subscriptions.map((s) => Number(s.startDate.slice(0, 4))).sort((a, b) => a - b)[0] ?? now;
  const years: number[] = [];
  for (let y = Math.min(start, now); y <= now; y++) years.push(y);
  return years;
}

/**
 * The period menu, as on the Statements page (#113): the last 3, 6 and 12 months, this
 * year and every earlier one with renewals, all time, each with what was paid in it,
 * then "Custom range…". Each option's value is its `?period=`, blank for this year.
 */
export function renewalsPeriodMenu(data: SubscriptionData, period: SpendPeriod, today: string): SelectOption[] {
  const option = (p: SpendPeriod): SelectOption => ({ value: periodParam(p, today) ?? "", label: periodName(p, today), meta: formatInrCompact(paidInPeriod(data, p, today).total) });
  const quick = QUICK_RANGES.map((n, i) => ({ ...option(lastMonths(n, today)), group: i === 0 ? "Quick ranges" : undefined }));
  const years = periodYears(renewalYears(data, today), period).map((year, i) => ({ ...option({ kind: "year", year }), divider: i === 0 }));
  const custom: SelectOption =
    period.kind === "range" && !period.last
      ? { value: CUSTOM_PERIOD, label: "Custom range", meta: monthSpanName(period.from, period.to), display: periodName(period, today), action: true, divider: true }
      : { value: CUSTOM_PERIOD, label: "Custom range…", action: true, divider: true };
  return [...quick, ...years, option({ kind: "all" }), custom];
}

export { periodMenuValue as renewalsPeriodValue };

/**
 * Where the month picker opens: the period's months up to this one (for all time, or a
 * period with none yet, the last 6 months), and the earliest month it offers, January of
 * the first subscription's start year.
 */
export function renewalsRangeStart(data: SubscriptionData, period: SpendPeriod, today: string): { from: MonthKey; to: MonthKey; earliest: MonthKey } {
  const current = monthOf(today);
  const earliest = `${renewalYears(data, today)[0]}-01`;
  const later = (a: MonthKey, b: MonthKey) => (a > b ? a : b);
  const fallback = { from: later(addMonths(current, -5), earliest), to: current, earliest };
  if (period.kind === "all") return fallback;
  const { from, to } = periodDates(period, today, data.subscriptions);
  const start = later(monthOf(from), earliest);
  const end = monthOf(to) < current ? monthOf(to) : current;
  return start > end ? fallback : { from: start, to: end, earliest };
}
