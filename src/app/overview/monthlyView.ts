import { addMonths, monthOf, monthRange, type HeatCell, type MonthAmount, type MonthKey, type SpendPeriod } from "@/lib/aggregate/cardSpend";
import { expenseMonths, totalsOf, type ExpenseData, type PartKey } from "@/lib/aggregate/expenses";
import { FLOW_KEYS, flowAmounts, flowHeat, flowRow, latestFigure, shownColumns, showsTogether, spanToLoad, type FlowHeat, type FlowKey } from "@/lib/aggregate/monthlyFlows";
import { buildPeriodMenu, periodYears } from "@/app/cards/params";
import { periodLabel, periodName } from "@/lib/aggregate/period";
import type { SelectOption } from "@/components/Select";
import { formatMonthShort } from "@/lib/format/date";
import { formatInrCompact } from "@/lib/format/money";
import type { ColorKey } from "@/lib/format/colors";

/**
 * What the Overview's "Month by month" widget draws (docs/design/overview.md, board MzA): the five measures as separate heatmaps, worked out
 * from the Expenses page's months. Over a year or less they sit together; past that, one at a time on buttons. Plain, already-formatted data.
 */

export interface FlowMeta {
  key: FlowKey;
  name: string;
  /** What it counts, under the name. */
  word: string;
  /** The page it opens, and what that page is called. */
  href: string;
  page: string;
  colorKey: ColorKey;
  /** The hue its five shades are drawn in (the heatmap's own green, turned to this). */
  hue: number;
}

export const FLOW_META: Record<FlowKey, FlowMeta> = {
  income: { key: "income", name: "Income", word: "came in", href: "/income", page: "Income", colorKey: "emerald", hue: 150 },
  invested: { key: "invested", name: "Investments", word: "moved to brokers and new deposits", href: "/investments", page: "Investments", colorKey: "sapphire", hue: 258 },
  emis: { key: "emis", name: "EMIs", word: "loan installments paid", href: "/loans", page: "Loans", colorKey: "teal", hue: 200 },
  cards: { key: "cards", name: "Credit card bills", word: "statements paid that month", href: "/cards", page: "Cards", colorKey: "ruby", hue: 22 },
  cash: { key: "cash", name: "Cash expenses", word: "cash and UPI, worked out", href: "/expenses", page: "Expenses", colorKey: "copper", hue: 50 },
};

export interface MeasureView {
  meta: FlowMeta;
  /** The button's headline: the latest month's figure, "₹1.8L", or "–" when it has none. */
  headline: string;
  /** What the headline is: "October", "November so far". */
  headlineNote: string;
  /** The five-together row: the months drawn side by side. Empty when the period is too long to sit together. */
  row: HeatCell[];
  /** The Cards heatmap's own rows and totals, for one measure on its own. */
  focus: FlowHeat;
  /** A short line under the row: the total and a usual month. */
  summary: { total: number; average: number; months: number; peak: MonthAmount | null };
}

export interface MonthlyView {
  /** "This year", "Last 6 months", "Mar – Aug 2026". */
  periodName: string;
  periodLabel: string;
  currentMonth: MonthKey;
  /** The right-hand column's heading in a heatmap: "Year", or "Total" when a range's rows total only its months. */
  totalsLabel: "Year" | "Total";
  /** Whether the five sit side by side. */
  together: boolean;
  /** The months drawn side by side (a year's twelve, a range's own); empty when they don't. */
  columns: MonthKey[];
  measures: MeasureView[];
  /** Nothing in the period for any of the five. */
  empty: boolean;
  /** What was spent in all over the months of the period that have ended (the month in progress can't be worked out), and in which parts. */
  spent: { total: number; months: number; parts: Record<PartKey, number> };
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The first month any of the records the five read begin, so "all time" starts where they do (never after this month). */
export function earliestFlowMonth(data: ExpenseData, today: string): MonthKey {
  const dates = [
    ...data.incomeEntries.map((e) => e.receivedDate),
    ...data.statements.map((s) => s.paidDate),
    ...data.installments.map((i) => i.paidDate),
    ...data.transfers.map((t) => t.date),
    ...data.fixedDeposits.map((d) => d.startDate),
  ].filter((d): d is string => !!d);
  const first = dates.length === 0 ? monthOf(today) : monthOf(dates.reduce((a, b) => (a < b ? a : b)));
  return first < monthOf(today) ? first : monthOf(today);
}

export function monthlyView(data: ExpenseData, period: SpendPeriod, today: string): MonthlyView {
  const first = earliestFlowMonth(data, today);
  const span = spanToLoad(period, today, first);
  const months = span.from > span.to ? [] : expenseMonths(data, span.from, span.to, today);
  const amounts = flowAmounts(months);
  const totals = totalsOf(months);
  const together = showsTogether(period, today, first);
  const columns = together ? shownColumns(period, today, first) : [];
  const measures = FLOW_KEYS.map((key): MeasureView => {
    // All time starts where this measure's own records do, so a measure that began later has no empty years in front of it.
    const own = [...amounts[key].keys()].sort()[0] ?? first;
    const focus = flowHeat(amounts[key], period, today, own);
    const latest = latestFigure(amounts[key], period, today, own);
    const name = latest ? MONTH_NAMES[Number(latest.month.slice(5, 7)) - 1] : "";
    return {
      meta: FLOW_META[key],
      headline: latest?.amount ? formatInrCompact(latest.amount) : "–",
      headlineNote: !latest ? "" : latest.inProgress ? `${name} so far` : name,
      row: together ? flowRow(amounts[key], columns, today) : [],
      focus,
      summary: { total: focus.total, average: focus.average, months: focus.averagedOver, peak: focus.peak },
    };
  });
  return {
    periodName: periodName(period, today),
    periodLabel: periodLabel(period, today),
    currentMonth: monthOf(today),
    totalsLabel: period.kind === "range" ? "Total" : "Year",
    together,
    columns,
    measures,
    empty: measures.every((m) => m.focus.total === 0),
    spent: { total: totals.spent, months: totals.months, parts: totals.parts },
  };
}

/** A month's short name for a column header: "Nov" or "Jan ’26" where the year changes. */
export function columnLabel(month: MonthKey, index: number): string {
  return index === 0 || month.endsWith("-01") ? `${formatMonthShort(month)} ’${month.slice(2, 4)}` : formatMonthShort(month);
}

// ---------- The period menu (Cards' own, without a spend figure beside each option) ----------

export { CUSTOM_PERIOD, periodMenuValue } from "@/app/cards/params";

/** The years the menu offers: every year from the first with a record to this one, plus the one shown, newest first. */
export function menuYears(first: MonthKey, period: SpendPeriod, today: string): number[] {
  const years = Array.from({ length: Math.max(0, Number(today.slice(0, 4)) - Number(first.slice(0, 4)) + 1) }, (_, i) => Number(first.slice(0, 4)) + i);
  return periodYears(years, period);
}

/** Last 3, 6 and 12 months, then this year, the years since the first record and all time, then "Custom range…". */
export function periodMenu(period: SpendPeriod, today: string, first: MonthKey): SelectOption[] {
  return buildPeriodMenu(period, today, menuYears(first, period, today));
}

/** What the month picker opens on: the months the period shows (the last 6 for a period with none yet), and the earliest it offers. */
export function rangePickerStart(period: SpendPeriod, today: string, first: MonthKey): { from: MonthKey; to: MonthKey; earliest: MonthKey } {
  const current = monthOf(today);
  const shown = (() => {
    const { from, to } = spanToLoad(period, today, first);
    return from > to ? [] : monthRange(from, to);
  })();
  const earliest = `${first.slice(0, 4)}-01`;
  if (shown.length === 0) return { from: addMonths(current, -5), to: current, earliest };
  return { from: shown[0], to: shown[shown.length - 1], earliest: shown[0] < earliest ? shown[0] : earliest };
}
