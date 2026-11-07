/** The stage's ranges and what it reads at a day (docs/design/investments.md, L1 Giant). Pure, so it is tested rather than looked at. */

export interface StagePoint {
  date: string;
  /** What he held was worth that day, in rupees. */
  value: number;
  /** What it cost him, in rupees. */
  cost: number;
}

export const RANGES = [
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 91 },
  { key: "6M", label: "6M", days: 182 },
  { key: "1Y", label: "1Y", days: 365 },
  { key: "3Y", label: "3Y", days: 1095 },
  { key: "All", label: "All", days: null },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];

/** The last `days` days of the series (a series is one point a day), or all of it. A range longer than the history is all of it. */
export function inRange(series: StagePoint[], key: RangeKey): StagePoint[] {
  const days = RANGES.find((r) => r.key === key)?.days ?? null;
  return days === null || days >= series.length ? series : series.slice(series.length - 1 - days);
}

/** The ranges worth offering: not one longer than the history, since it would show the same as All. "All" is always there. */
export function offeredRanges(series: StagePoint[]): RangeKey[] {
  return RANGES.filter((r) => r.days === null || r.days < series.length - 1).map((r) => r.key);
}

export interface StageReading {
  date: string;
  value: number;
  cost: number;
  /** Worth less cost. */
  gain: number;
  /** The gain as a fraction of cost; null when it cost nothing. */
  gainFraction: number | null;
}

export function readingAt(points: StagePoint[], index: number): StageReading | null {
  const p = points[Math.max(0, Math.min(points.length - 1, index))];
  if (!p) return null;
  return { date: p.date, value: p.value, cost: p.cost, gain: p.value - p.cost, gainFraction: p.cost > 0 ? (p.value - p.cost) / p.cost : null };
}

export interface StageScale {
  min: number;
  max: number;
}

/** The value range the chart is drawn over: both lines, with a little room at the top and bottom so neither touches the edge. */
export function scaleOf(points: StagePoint[]): StageScale {
  const all = points.flatMap((p) => [p.value, p.cost]);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const room = hi === lo ? Math.max(1, hi * 0.05) : (hi - lo) * 0.08;
  return { min: Math.max(0, lo - room), max: hi + room };
}

/** SVG path data for a line through `values` spread evenly across `width`, drawn over `scale` in a box `height` tall. A step line holds each value until the next. */
export function linePath(values: number[], scale: StageScale, width: number, height: number, step = false): string {
  const n = values.length;
  if (n === 0) return "";
  const x = (i: number) => (n === 1 ? 0 : (i / (n - 1)) * width);
  const y = (v: number) => height - ((v - scale.min) / (scale.max - scale.min)) * height;
  const f = (v: number) => v.toFixed(1);
  let d = `M ${f(x(0))} ${f(y(values[0]))}`;
  for (let i = 1; i < n; i++) d += step ? ` L ${f(x(i))} ${f(y(values[i - 1]))} L ${f(x(i))} ${f(y(values[i]))}` : ` L ${f(x(i))} ${f(y(values[i]))}`;
  return d;
}

/** The first day a range shows, counted back from `end`, or null for All. */
export function rangeStart(end: string, key: RangeKey): string | null {
  const days = RANGES.find((r) => r.key === key)?.days ?? null;
  return days === null ? null : new Date(Date.parse(`${end}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
}

/** A holding's points (trading days only) and markers inside a range, counted back from its last point. */
export function lensWindow<P extends { date: string }, M extends { date: string }>(points: P[], markers: M[], key: RangeKey): { points: P[]; markers: M[] } {
  const end = points.at(-1)?.date;
  const start = end ? rangeStart(end, key) : null;
  if (start === null) return { points, markers: markers.filter((m) => points.length > 0 && m.date >= points[0].date) };
  const inside = points.filter((p) => p.date >= start);
  return { points: inside, markers: markers.filter((m) => inside.length > 0 && m.date >= inside[0].date) };
}

/** The ranges worth offering for a holding: those shorter than the days its line covers, and All. */
export function offeredLensRanges(points: { date: string }[]): RangeKey[] {
  if (points.length < 2) return ["All"];
  const span = (Date.parse(`${points.at(-1)!.date}T00:00:00Z`) - Date.parse(`${points[0].date}T00:00:00Z`)) / 86_400_000;
  return RANGES.filter((r) => r.days === null || r.days < span).map((r) => r.key);
}
