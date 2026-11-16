import { heatLevel, monthOf, monthRange, periodHasMonth, type HeatCell, type HeatRow, type MonthAmount, type MonthKey, type SpendPeriod, type YearTotal } from "./cardSpend";
import type { MonthExpenses } from "./expenses";

/**
 * The Overview's "Month by month" widget (docs/design/overview.md): five separate monthly measures, each its own heatmap, worked out from the
 * Expenses page's own months so the two always agree. Pure.
 *
 *   income    what came in (Expenses' "came in": salary and the rest, not a loan or what a friend sent)
 *   invested  moved to brokers and new deposits, less what came back; a month that took more out than it put in shows nothing
 *   emis      loan installments (and prepayments) paid
 *   cards     credit card bills paid that month
 *   cash      cash and UPI: the part of the month's spending no record explains. Worked out only when the month has ended
 */

export const FLOW_KEYS = ["income", "invested", "emis", "cards", "cash"] as const;
export type FlowKey = (typeof FLOW_KEYS)[number];

/** A month's figure for a measure, or null when there is nothing to show (nothing happened, or it can't be worked out yet). */
export function flowAmount(m: MonthExpenses, key: FlowKey): number | null {
  const amount = {
    income: m.cameIn,
    invested: m.invested,
    emis: m.parts.emi,
    cards: m.parts.card,
    // Cash and UPI is the worked-out rest, so only a month that has ended has one; below zero means a transfer isn't recorded yet.
    cash: m.status === "done" ? m.parts.cash : 0,
  }[key];
  return amount > 0 ? amount : null;
}

/** Every measure's months that have a figure, ready for the heatmaps. */
export function flowAmounts(months: MonthExpenses[]): Record<FlowKey, Map<MonthKey, number>> {
  const out = Object.fromEntries(FLOW_KEYS.map((k) => [k, new Map<MonthKey, number>()])) as Record<FlowKey, Map<MonthKey, number>>;
  for (const m of months) for (const key of FLOW_KEYS) {
    const amount = flowAmount(m, key);
    if (amount !== null) out[key].set(m.month, amount);
  }
  return out;
}

/** The months from the first to the last given, so the Expenses math can be run over exactly the span a period shows. */
export function spanToLoad(period: SpendPeriod, today: string, firstMonth: MonthKey): { from: MonthKey; to: MonthKey } {
  const current = monthOf(today);
  if (period.kind === "all") return { from: firstMonth < current ? firstMonth : current, to: current };
  if (period.kind === "year") return { from: `${period.year}-01`, to: `${period.year}-12` < current ? `${period.year}-12` : current };
  return { from: period.from, to: period.to < current ? period.to : current };
}

/** Every month so far in the period (none of the months still to come). */
export function monthsSoFarIn(period: SpendPeriod, today: string, firstMonth: MonthKey): MonthKey[] {
  const { from, to } = spanToLoad(period, today, firstMonth);
  return from > to ? [] : monthRange(from, to);
}

/** The months the period draws side by side: a year's twelve (months to come included), a range's own months, or all time from the first. */
export function shownColumns(period: SpendPeriod, today: string, firstMonth: MonthKey): MonthKey[] {
  if (period.kind === "year") return monthRange(`${period.year}-01`, `${period.year}-12`);
  if (period.kind === "range") return monthRange(period.from, period.to);
  return monthsSoFarIn(period, today, firstMonth);
}

/** Most months the five can sit side by side over. Past it they move onto buttons, one at a time (Prathik, 2026-11-16). */
export const TOGETHER_MAX_MONTHS = 12;

/** Whether the five measures show together for this period: a year, or any range of up to twelve months. */
export function showsTogether(period: SpendPeriod, today: string, firstMonth: MonthKey): boolean {
  const columns = shownColumns(period, today, firstMonth).length;
  return columns > 0 && columns <= TOGETHER_MAX_MONTHS;
}

const yearsFrom = (first: number, last: number) => Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i);

/** The part of a year the period covers: the whole year, or just a range's months in it. */
function yearPart(period: SpendPeriod, year: number): SpendPeriod {
  if (period.kind !== "range") return { kind: "year", year };
  const from = `${year}-01` > period.from ? `${year}-01` : period.from;
  const to = `${year}-12` < period.to ? `${year}-12` : period.to;
  return { kind: "range", from, to };
}

const sumOf = (months: MonthKey[], amounts: Map<MonthKey, number>) => months.reduce((t, m) => t + (amounts.get(m) ?? 0), 0);

/**
 * A usual month: the total over the months that have ended, since the month in progress is only part of one. When nothing has ended yet
 * (the first month of a new year), the month in progress stands in. Months with nothing count as nothing, as Cards' average does.
 */
function usual(months: MonthKey[], amounts: Map<MonthKey, number>, current: MonthKey): { months: number; average: number } {
  const ended = months.filter((m) => m < current);
  const counted = ended.length > 0 ? ended : months;
  return { months: counted.length, average: counted.length === 0 ? 0 : sumOf(counted, amounts) / counted.length };
}

export interface FlowHeat {
  /** A row of twelve months per calendar year the period touches, months outside it left blank (as the Cards heatmap draws it). */
  rows: HeatRow[];
  /** Each row's total and usual month. */
  yearTotals: YearTotal[];
  /** The highest month shown (the earliest wins a tie). */
  peak: MonthAmount | null;
  total: number;
  /** A usual month over the whole period. */
  average: number;
  /** The months a usual month is taken over. */
  averagedOver: number;
}

/**
 * One measure's heatmap over a period: the Cards heatmap's rules (cardSpend.ts, heatmapRows): a row per year, shades relative to the
 * largest month shown, months still to come left empty, a range's outside months blank.
 */
export function flowHeat(amounts: Map<MonthKey, number>, period: SpendPeriod, today: string, firstMonth: MonthKey): FlowHeat {
  const current = monthOf(today);
  const sofar = monthsSoFarIn(period, today, firstMonth);
  let years: number[];
  if (period.kind === "year") years = [period.year];
  else if (period.kind === "range") years = yearsFrom(Number(period.from.slice(0, 4)), Number(period.to.slice(0, 4)));
  else years = sofar.length === 0 ? [] : yearsFrom(Number(sofar[0].slice(0, 4)), Number(current.slice(0, 4)));
  const outside = (month: MonthKey) => period.kind === "range" && !periodHasMonth(period, month);
  const shown = years.flatMap((y) => monthRange(`${y}-01`, `${y}-12`)).filter((m) => !outside(m) && m <= current);
  const max = Math.max(0, ...shown.map((m) => amounts.get(m) ?? 0));
  const rows = years.map((year): HeatRow => ({
    year,
    cells: monthRange(`${year}-01`, `${year}-12`).map((month): HeatCell => {
      if (outside(month)) return { month, amount: null, state: "outside", level: 0 };
      if (month > current) return { month, amount: null, state: "upcoming", level: 0 };
      const amount = amounts.get(month);
      if (amount === undefined) return { month, amount: null, state: "no-data", level: 0 };
      return { month, amount, state: "data", level: heatLevel(amount, max) };
    }),
  }));
  const inPeriod = new Set(sofar);
  const yearTotals = years.map((year): YearTotal => {
    // Only the period's own months: all time starts at the measure's first month, not January of that year.
    const months = monthsSoFarIn(yearPart(period, year), today, firstMonth).filter((m) => inPeriod.has(m));
    const u = usual(months, amounts, current);
    return { year, total: sumOf(months, amounts), months: u.months, average: u.average };
  });
  let peak: MonthAmount | null = null;
  for (const m of sofar) {
    const amount = amounts.get(m);
    if (amount !== undefined && (peak === null || amount > peak.amount)) peak = { month: m, amount };
  }
  const overall = usual(sofar, amounts, current);
  return { rows, yearTotals, peak, total: sumOf(sofar, amounts), average: overall.average, averagedOver: overall.months };
}

/** One row of cells over the given months (a year's twelve, or a range's own), for the five-together view. */
export function flowRow(amounts: Map<MonthKey, number>, columns: MonthKey[], today: string): HeatCell[] {
  const current = monthOf(today);
  const max = Math.max(0, ...columns.filter((m) => m <= current).map((m) => amounts.get(m) ?? 0));
  return columns.map((month): HeatCell => {
    if (month > current) return { month, amount: null, state: "upcoming", level: 0 };
    const amount = amounts.get(month);
    if (amount === undefined) return { month, amount: null, state: "no-data", level: 0 };
    return { month, amount, state: "data", level: heatLevel(amount, max) };
  });
}

/** The latest month the period has up to today, and its figure (so far, if it is the month in progress), for a button's headline. */
export function latestFigure(amounts: Map<MonthKey, number>, period: SpendPeriod, today: string, firstMonth: MonthKey): { month: MonthKey; amount: number | null; inProgress: boolean } | null {
  const sofar = monthsSoFarIn(period, today, firstMonth);
  const month = sofar.at(-1);
  if (!month) return null;
  return { month, amount: amounts.get(month) ?? null, inProgress: month === monthOf(today) };
}

/** A month's place among the months that had a figure, 1 being the highest, for "4th highest of 12". Null for a month with none. */
export function rankOf(amounts: Map<MonthKey, number>, month: MonthKey, within: MonthKey[]): { rank: number; of: number } | null {
  const have = within.filter((m) => amounts.has(m));
  const amount = amounts.get(month);
  if (amount === undefined || !have.includes(month)) return null;
  return { rank: have.filter((m) => (amounts.get(m) as number) > amount).length + 1, of: have.length };
}
