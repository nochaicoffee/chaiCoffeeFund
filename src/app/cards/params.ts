import { addMonths, monthOf, monthsSoFar, spendSummary, statementYears, type CardData, type MonthKey, type SpendPeriod } from "@/lib/aggregate/cardSpend";
import type { SortOrder, StatementQuery, StatusFilter } from "@/lib/aggregate/cardStatements";
import { lastMonths, monthSpanName, parsePeriodParam, periodName, periodParam, QUICK_RANGES } from "@/lib/aggregate/period";
import { formatInrCompact } from "@/lib/format/money";
import type { SelectOption } from "@/components/Select";

export type PanelView = "statements" | "range";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `?period=`: all, a year, the last 3, 6 or 12 months, or a range of months (parsePeriodParam); anything else, or nothing, is this year. */
export function parsePeriod(params: SearchParams, today: string): SpendPeriod {
  return parsePeriodParam(first(params.period), today);
}

/** `?card=<id>` when it names a real card; otherwise undefined, meaning All Cards. */
export function parseSelectedCard(params: SearchParams, data: CardData): string | undefined {
  const value = first(params.card);
  return value && data.cards.some((c) => c.id === value) ? value : undefined;
}

/** `?panel=range` shows the Spend range view beside the details card; anything else is the Statements view. */
export function parsePanel(params: SearchParams): PanelView {
  return first(params.panel) === "range" ? "range" : "statements";
}

/** A query string from the values that are set, in order, with sample data as a bare `demo`. */
function queryString(values: [string, string | undefined][], demo: boolean): string {
  const query = new URLSearchParams();
  for (const [key, value] of values) if (value) query.set(key, value);
  if (demo) query.set("demo", "");
  const text = query.toString().replace(/demo=(&|$)/, "demo$1");
  return text ? `?${text}` : "?";
}

/** `?closed=1` opens the closed cards folded away at the end of the card row. */
export function parseShowClosed(params: SearchParams): boolean {
  return first(params.closed) === "1";
}

/** The query string for a Cards page link, keeping the other choices (period, panel, closed cards, sample data). */
export function cardsQuery(
  current: { period: SpendPeriod; cardId?: string; panel?: PanelView; showClosed?: boolean; demo: boolean },
  today: string,
): string {
  return queryString(
    [
      ["card", current.cardId],
      ["period", periodParam(current.period, today)],
      ["panel", current.panel === "range" ? "range" : undefined],
      ["closed", current.showClosed ? "1" : undefined],
    ],
    current.demo,
  );
}

/** `?status=pending` or `?status=paid`; anything else lists every statement. */
export function parseStatus(params: SearchParams): StatusFilter {
  const value = first(params.status);
  return value === "pending" || value === "paid" ? value : "all";
}

/** `?sort=oldest`; anything else is newest first. */
export function parseSort(params: SearchParams): SortOrder {
  return first(params.sort) === "oldest" ? "oldest" : "newest";
}

/** `?q=` as typed, trimmed and capped so a pasted wall of text can't slow the page. */
export function parseSearch(params: SearchParams): string {
  return (first(params.q) ?? "").trim().slice(0, 100);
}

/** `?page=` as a whole number from 1; the page clamps it to the last real page. */
export function parsePage(params: SearchParams): number {
  const value = Number(first(params.page));
  return Number.isInteger(value) && value > 1 ? value : 1;
}

/** Everything a Statements page link carries: the list's query, the page number and sample data. */
export interface StatementsListState extends StatementQuery {
  page?: number;
  demo: boolean;
}

/** The query string for a Statements page link, leaving out the defaults (all statements, newest first, page 1). */
export function statementsQuery(current: StatementsListState, today: string): string {
  return queryString(
    [
      ["card", current.cardId],
      ["period", periodParam(current.period, today)],
      ["status", current.status === "all" ? undefined : current.status],
      ["q", current.search],
      ["sort", current.sort === "oldest" ? "oldest" : undefined],
      ["page", current.page && current.page > 1 ? String(current.page) : undefined],
    ],
    current.demo,
  );
}

/** The years the period menu offers: every year with statements, plus the one being shown, newest first. */
export function periodYears(yearsWithStatements: number[], period: SpendPeriod): number[] {
  const years = new Set(yearsWithStatements);
  if (period.kind === "year") years.add(period.year);
  return [...years].sort((a, b) => b - a);
}

/** The menu's value for "Custom range…", which opens the month picker instead of choosing a period. */
export const CUSTOM_PERIOD = "custom";

/** A custom range of months, as opposed to this year, a year, all time or a quick range. */
const isCustom = (period: SpendPeriod) => period.kind === "range" && !period.last;

/**
 * The period menu (#113, option C with A from design/cards-dropdowns): the last
 * 3, 6 and 12 months, then this year, every other year with statements and all
 * time, each with what was spent in it (on the selected card, as the page
 * shows), then "Custom range…". Each option's value is its `?period=`, blank for
 * this year. While a custom range is shown, its option is the chosen one and
 * names the range.
 */
export function periodMenu(data: CardData, period: SpendPeriod, today: string, cardId?: string): SelectOption[] {
  const spent = (p: SpendPeriod) => formatInrCompact(spendSummary(data, p, today, cardId).total);
  const option = (p: SpendPeriod): SelectOption => ({ value: periodParam(p, today) ?? "", label: periodName(p, today), meta: spent(p) });
  const quick = QUICK_RANGES.map((n, i) => ({ ...option(lastMonths(n, today)), group: i === 0 ? "Quick ranges" : undefined }));
  const years = periodYears(statementYears(data, today), period).map((year, i) => ({ ...option({ kind: "year", year }), divider: i === 0 }));
  const custom: SelectOption =
    period.kind === "range" && !period.last
      ? { value: CUSTOM_PERIOD, label: "Custom range", meta: monthSpanName(period.from, period.to), display: periodName(period, today), action: true, divider: true }
      : { value: CUSTOM_PERIOD, label: "Custom range…", action: true, divider: true };
  return [...quick, ...years, option({ kind: "all" }), custom];
}

/** The period menu's chosen value: the period's `?period=` (blank for this year), or the custom option for a custom range. */
export function periodMenuValue(period: SpendPeriod, today: string): string {
  return isCustom(period) ? CUSTOM_PERIOD : (periodParam(period, today) ?? "");
}

/**
 * What the month picker opens on: the months the period shows (for a future
 * year with none yet, the last 6 months), and the earliest month it offers,
 * January of the first statement's year.
 */
export function rangePickerStart(data: CardData, period: SpendPeriod, today: string, cardId?: string): { from: MonthKey; to: MonthKey; earliest: MonthKey } {
  const months = monthsSoFar(period, today, data, cardId);
  const current = monthOf(today);
  const first = monthsSoFar({ kind: "all" }, today, data)[0] ?? current;
  const earliest = `${first.slice(0, 4)}-01`;
  if (months.length === 0) return { from: addMonths(current, -5), to: current, earliest };
  return { from: months[0], to: months[months.length - 1], earliest: months[0] < earliest ? months[0] : earliest };
}
