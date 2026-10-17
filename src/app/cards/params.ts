import type { CardData, SpendPeriod } from "@/lib/aggregate/cardSpend";
import type { SortOrder, StatementQuery, StatusFilter } from "@/lib/aggregate/cardStatements";

export type PanelView = "statements" | "range";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `?period=all` or `?period=2025`; anything else (or nothing) is this year. */
export function parsePeriod(params: SearchParams, today: string): SpendPeriod {
  const value = first(params.period);
  if (value === "all") return { kind: "all" };
  if (value && /^\d{4}$/.test(value)) return { kind: "year", year: Number(value) };
  return { kind: "year", year: Number(today.slice(0, 4)) };
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

/** `?period=` for a link: left out for this year, the default. */
function periodValue(period: SpendPeriod, today: string): string | undefined {
  if (period.kind === "all") return "all";
  return period.year === Number(today.slice(0, 4)) ? undefined : String(period.year);
}

/** A query string from the values that are set, in order, with sample data as a bare `demo`. */
function queryString(values: [string, string | undefined][], demo: boolean): string {
  const query = new URLSearchParams();
  for (const [key, value] of values) if (value) query.set(key, value);
  if (demo) query.set("demo", "");
  const text = query.toString().replace(/demo=(&|$)/, "demo$1");
  return text ? `?${text}` : "?";
}

/** The query string for a Cards page link, keeping the other choices (period, panel, sample data). */
export function cardsQuery(
  current: { period: SpendPeriod; cardId?: string; panel?: PanelView; demo: boolean },
  today: string,
): string {
  return queryString(
    [
      ["card", current.cardId],
      ["period", periodValue(current.period, today)],
      ["panel", current.panel === "range" ? "range" : undefined],
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
      ["period", periodValue(current.period, today)],
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
