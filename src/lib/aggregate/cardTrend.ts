import { monthlySpend, monthsSoFar, spendSeries, type CardData, type MonthAmount, type MonthKey, type SpendPeriod } from "./cardSpend";

export interface TrendPoint {
  month: MonthKey;
  /** Spend that month: the selected card's, or every card's. */
  total: number;
  /** Spend per card id, for stacking (just the selected card when one is selected). */
  byCard: Record<string, number>;
  /**
   * Whether the month has a statement (the selected card's, when one is selected).
   * A month without one is "no data", as in the heatmap; one whose statements total ₹0 isn't.
   */
  hasStatements: boolean;
}

/**
 * The page period's months, one bar each: every month so far in it, as the
 * greeting's average counts them (Jan to now for this year, all 12 for a past
 * year, from the first statement for all time, a range's months up to now).
 * The chart follows the page's period and has no range of its own (#113,
 * Prathik's call, 2026-10-20).
 */
export function trendPoints(data: CardData, today: string, period: SpendPeriod, cardId?: string): TrendPoint[] {
  // Only months with statements appear in monthlySpend, ₹0 ones included.
  const withStatements = monthlySpend(data, cardId);
  return spendSeries(data, monthsSoFar(period, today, data, cardId)).map((point) => {
    const hasStatements = withStatements.has(point.month);
    if (cardId === undefined) return { ...point, hasStatements };
    const amount = point.byCard[cardId] ?? 0;
    return { month: point.month, total: amount, byCard: { [cardId]: amount }, hasStatements };
  });
}

export interface TrendSummary {
  /** Total ÷ every month shown: the page's own monthly average for the period (PRD §8). */
  average: number;
  /** The highest month shown, earliest on a tie; null when nothing was spent. */
  peak: MonthAmount | null;
}

/** The chart's average line and peak. */
export function trendSummary(points: TrendPoint[]): TrendSummary {
  const total = points.reduce((sum, p) => sum + p.total, 0);
  let peak: MonthAmount | null = null;
  for (const p of points) if (p.total > 0 && (peak === null || p.total > peak.amount)) peak = { month: p.month, amount: p.total };
  return { average: points.length === 0 ? 0 : total / points.length, peak };
}
