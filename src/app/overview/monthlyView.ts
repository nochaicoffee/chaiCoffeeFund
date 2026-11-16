import { addMonths, monthOf, monthRange, type HeatCell, type MonthAmount, type MonthKey, type SpendPeriod } from "@/lib/aggregate/cardSpend";
import { expenseMonths, totalsOf, type ExpenseData, type MonthExpenses, type PartKey } from "@/lib/aggregate/expenses";
import { FLOW_KEYS, flowAmounts, flowHeat, flowRow, latestFigure, monthsSoFarIn, rankOf, shownColumns, showsTogether, spanToLoad, type FlowHeat, type FlowKey } from "@/lib/aggregate/monthlyFlows";
import { buildPeriodMenu, periodYears } from "@/app/cards/params";
import { periodLabel, periodName } from "@/lib/aggregate/period";
import type { SelectOption } from "@/components/Select";
import { formatMonthShort } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
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
  /** What hovering a month says, for each month that has a figure. */
  tips: Record<MonthKey, MonthTipView>;
  /** A short line under the row: the total and a usual month. */
  summary: { total: number; average: number; months: number; peak: MonthAmount | null };
}

/** The card a month's cell opens: its figure, how it sits against a usual month and the others, and what it is made of. */
export interface MonthTipView {
  month: MonthKey;
  total: string;
  tag: "Peak" | "This month" | null;
  /** Against a usual month, with whether that is good news (income up, spending down), bad, or neither. */
  versus: { text: string; tone: "good" | "bad" | "flat" } | null;
  /** "4th highest of 10". */
  rank: string | null;
  rows: { name: string; amount: string }[];
  foot: string | null;
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

/** Which way is good news for a measure: income and investments up, card bills and cash down; EMIs are a fixed bill, so neither. */
const GOOD_WHEN: Record<FlowKey, "up" | "down" | null> = { income: "up", invested: "up", emis: null, cards: "down", cash: "down" };
export const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`;
const payments = (m: MonthExpenses, part: PartKey) => m.payments.filter((p) => p.part === part).map((p) => ({ name: p.label, amount: formatInr(p.amount) }));

/**
 * What the card over a month says. A month in progress has no comparison or rank (it is only part of a month); the others read against a
 * usual month of the period and against each other. What it is made of comes from the Expenses month: income by source, what went to and
 * came back from brokers, the EMI and card payments, or what the month spent in all for cash and UPI.
 */
export function monthTip(key: FlowKey, m: MonthExpenses, ctx: { amounts: Map<MonthKey, number>; usual: number; peak: MonthKey | null; current: MonthKey; within: MonthKey[]; data: ExpenseData }): MonthTipView {
  const amount = ctx.amounts.get(m.month) ?? 0;
  const inProgress = m.month === ctx.current;
  const f = !inProgress && ctx.usual > 0 ? (amount - ctx.usual) / ctx.usual : null;
  const good = GOOD_WHEN[key];
  const versus =
    f === null
      ? null
      : Math.abs(f) < 0.005
        ? { text: `In line with a usual month of ${formatInr(ctx.usual)}`, tone: "flat" as const }
        : { text: `${f > 0 ? "▲" : "▼"} ${Math.round(Math.abs(f) * 100)}% ${f > 0 ? "above" : "below"} a usual month of ${formatInr(ctx.usual)}`, tone: good === null ? ("flat" as const) : (f > 0) === (good === "up") ? ("good" as const) : ("bad" as const) };
  const rank = inProgress ? null : rankOf(ctx.amounts, m.month, ctx.within.filter((x) => x !== ctx.current));
  let rows: MonthTipView["rows"] = [];
  let foot: string | null = null;
  if (key === "income") {
    const bySource = new Map<string, number>();
    for (const e of ctx.data.incomeEntries) if (e.status === "Received" && e.receivedDate?.slice(0, 7) === m.month) bySource.set(e.incomeSourceId, (bySource.get(e.incomeSourceId) ?? 0) + e.amount);
    const names = new Map(ctx.data.incomeSources.map((s) => [s.id, s.alias || s.name]));
    rows = [...bySource].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, v]) => ({ name: names.get(id) ?? "Income", amount: formatInr(v) }));
  } else if (key === "invested") {
    rows = [{ name: "Sent to brokers and new deposits", amount: formatInr(m.bought) }, ...(m.sold > 0 ? [{ name: "Taken back", amount: `−${formatInr(m.sold)}` }] : [])];
  } else if (key === "emis") {
    rows = payments(m, "emi").slice(0, 5);
  } else if (key === "cards") {
    rows = payments(m, "card").slice(0, 5);
  } else if (m.spent !== null) {
    rows = [{ name: "Spent in all", amount: formatInr(m.spent) }, { name: "Explained by records", amount: formatInr(m.explained) }];
    foot = "Cash and UPI is what no record explains.";
  }
  if (inProgress) foot = "So far: the month isn't over.";
  return { month: m.month, total: formatInr(amount), tag: inProgress ? "This month" : m.month === ctx.peak ? "Peak" : null, versus, rank: rank ? `${ordinal(rank.rank)} highest of ${rank.of}` : null, rows, foot };
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
    const within = monthsSoFarIn(period, today, own);
    const name = latest ? MONTH_NAMES[Number(latest.month.slice(5, 7)) - 1] : "";
    return {
      meta: FLOW_META[key],
      headline: latest?.amount ? formatInrCompact(latest.amount) : "–",
      headlineNote: !latest ? "" : latest.inProgress ? `${name} so far` : name,
      row: together ? flowRow(amounts[key], columns, today) : [],
      focus,
      tips: Object.fromEntries(months.filter((m) => amounts[key].has(m.month)).map((m) => [m.month, monthTip(key, m, { amounts: amounts[key], usual: focus.average, peak: focus.peak?.month ?? null, current: monthOf(today), within, data })])),
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
