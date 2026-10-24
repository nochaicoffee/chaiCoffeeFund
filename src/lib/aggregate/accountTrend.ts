import type { BalanceTrendPoint } from "./accounts";

/**
 * What the Accounts hero's Trend reads off the pick's line (docs/design/accounts.md): the
 * whole period, or a stretch the pointer has measured. The line is a total carried forward
 * week by week, so a stretch is the points from one index to another, both included.
 */

export interface TrendStats {
  /** The first and last day of the stretch. */
  from: string;
  to: string;
  /** The balance at each end. */
  start: number;
  end: number;
  /** end − start, and as a fraction of start (null when it started at ₹0). */
  change: number;
  changeFraction: number | null;
  high: { total: number; date: string };
  low: { total: number; date: string };
  /** Points in the stretch, so weeks apart plus one. */
  count: number;
}

/** The stretch from `from` to `to` (in either order, clamped to the line). Null with no points. */
export function trendStats(points: BalanceTrendPoint[], from = 0, to = points.length - 1): TrendStats | null {
  if (points.length === 0) return null;
  const last = points.length - 1;
  const a = Math.max(0, Math.min(last, Math.min(from, to)));
  const b = Math.max(0, Math.min(last, Math.max(from, to)));
  const stretch = points.slice(a, b + 1);
  const start = stretch[0].total;
  const end = stretch[stretch.length - 1].total;
  const high = stretch.reduce((h, p) => (p.total > h.total ? p : h), stretch[0]);
  const low = stretch.reduce((l, p) => (p.total < l.total ? p : l), stretch[0]);
  return {
    from: stretch[0].date,
    to: stretch[stretch.length - 1].date,
    start,
    end,
    change: end - start,
    changeFraction: start === 0 ? null : (end - start) / start,
    high: { total: high.total, date: high.date },
    low: { total: low.total, date: low.date },
    count: stretch.length,
  };
}
