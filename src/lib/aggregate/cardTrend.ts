import { addMonths, monthOf, monthRange, monthsSoFar, spendSeries, type CardData, type MonthAmount, type MonthKey, type SpendPeriod } from "./cardSpend";

/** The statement trend chart's ranges: the last 3, 6 or 12 months, or everything. */
export type TrendRange = "3M" | "6M" | "1Y" | "All";

const RANGE_MONTHS: Record<Exclude<TrendRange, "All">, number> = { "3M": 3, "6M": 6, "1Y": 12 };

export interface TrendPoint {
  month: MonthKey;
  /** Spend that month: the selected card's, or every card's. */
  total: number;
  /** Spend per card id, for stacking (just the selected card when one is selected). */
  byCard: Record<string, number>;
}

/**
 * Every month the chart can show, ending where the page's period ends: December
 * of a past year, otherwise the current month. It starts at the first statement's
 * month (or a year before the end, whichever is earlier, so 1Y always has 12 bars).
 */
export function trendPoints(data: CardData, today: string, period: SpendPeriod, cardId?: string): TrendPoint[] {
  const current = monthOf(today);
  const end = period.kind === "year" && `${period.year}-12` < current ? `${period.year}-12` : current;
  // The same cleaned statements as every other number (no orphans or unreadable rows).
  const firstStatement = monthsSoFar({ kind: "all" }, today, data, cardId)[0] ?? null;
  const yearBack = addMonths(end, -11);
  const start = firstStatement !== null && firstStatement < yearBack ? firstStatement : yearBack;
  return spendSeries(data, monthRange(start, end)).map((point) => {
    if (cardId === undefined) return point;
    const amount = point.byCard[cardId] ?? 0;
    return { month: point.month, total: amount, byCard: { [cardId]: amount } };
  });
}

export interface TrendWindow {
  points: TrendPoint[];
  /** Total ÷ every month shown, matching the page's "every month so far" average (PRD §8). */
  average: number;
  /** The highest month shown, earliest on a tie; null when nothing was spent. */
  peak: MonthAmount | null;
}

/** The months a range shows, with their average and peak. */
export function trendWindow(points: TrendPoint[], range: TrendRange): TrendWindow {
  const shown = range === "All" ? points : points.slice(-RANGE_MONTHS[range]);
  const total = shown.reduce((sum, p) => sum + p.total, 0);
  let peak: MonthAmount | null = null;
  for (const p of shown) if (p.total > 0 && (peak === null || p.total > peak.amount)) peak = { month: p.month, amount: p.total };
  return { points: shown, average: shown.length === 0 ? 0 : total / shown.length, peak };
}
