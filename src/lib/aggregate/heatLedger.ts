import type { HeatCell, HeatRow, MonthKey } from "./cardSpend";

/**
 * The phone's heatmap: a ledger, one row per month with a bar the length of its amount (docs/design/phone-heatmap.md). Pure, so what the
 * rows hold and how long each bar is can be tested without drawing anything.
 */

/** The shortest a bar is drawn, in percent, so the smallest month still shows its shade. */
export const MIN_BAR = 8;

/** The largest amount among the months that have one: the bar and shade scale. 0 when none do. */
export function maxAmount(cells: HeatCell[]): number {
  return Math.max(0, ...cells.filter((c) => c.state === "data" && c.amount !== null).map((c) => c.amount ?? 0));
}

/**
 * A bar's length in percent of the track for a month that has a figure: proportional to the scale's largest month and never under
 * MIN_BAR, so a ₹0 month (a credit balance counts as ₹0) still shows its shade and isn't mistaken for a month with no data.
 */
export function barWidth(amount: number, max: number): number {
  if (max <= 0 || amount <= 0) return MIN_BAR;
  return Math.min(100, Math.max(MIN_BAR, (amount / max) * 100));
}

/** The last column in which any of the rows has a figure, or null when none does: the month the five-together ledger opens first. */
export function latestDataColumn(rows: HeatCell[][]): number | null {
  const length = Math.max(0, ...rows.map((r) => r.length));
  for (let i = length - 1; i >= 0; i--) if (rows.some((r) => r[i]?.state === "data")) return i;
  return null;
}

export interface LedgerRow {
  month: MonthKey;
  state: HeatCell["state"];
  level: HeatCell["level"];
  amount: number | null;
  /** The bar's length in percent; 0 for a month without a figure. */
  width: number;
}

export interface LedgerYear {
  year: number;
  rows: LedgerRow[];
}

/**
 * A heatmap's rows as ledger years, newest first: every month from January to December, minus the months a range leaves out. Bars scale
 * to the largest month shown across all the years, the same scale the heatmap's shades use, so a bar and its shade agree.
 */
export function ledgerYears(rows: HeatRow[]): LedgerYear[] {
  const max = maxAmount(rows.flatMap((r) => r.cells));
  return [...rows]
    .sort((a, b) => b.year - a.year)
    .map(({ year, cells }) => ({
      year,
      rows: cells
        .filter((c) => c.state !== "outside")
        .map((c) => ({ month: c.month, state: c.state, level: c.level, amount: c.amount, width: c.state === "data" && c.amount !== null ? barWidth(c.amount, max) : 0 })),
    }));
}
