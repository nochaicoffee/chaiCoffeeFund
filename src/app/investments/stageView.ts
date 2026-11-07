/** The stage's ranges and what it reads at a day (docs/design/investments.md, L1 Giant). Pure, so it is tested rather than looked at. */

export interface StagePoint {
  date: string;
  /** What he held was worth that day, in rupees. */
  value: number;
  /** What it cost him, in rupees. */
  cost: number;
  /** Money put in that day, less money taken out, in rupees (the "money added" bars). Missing counts as none. */
  flow?: number;
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

// ---------- Go back to a day ----------
/** The days the stage can go back to (design: Today, 1M ago, 6M ago, 1Y ago, 2Y ago). */
export const GO_BACK = [
  { key: "now", label: "Today", days: 0 },
  { key: "1m", label: "1M ago", days: 30 },
  { key: "6m", label: "6M ago", days: 182 },
  { key: "1y", label: "1Y ago", days: 365 },
  { key: "2y", label: "2Y ago", days: 730 },
] as const;
export type GoBackKey = (typeof GO_BACK)[number]["key"];

/** The days worth offering: those that fall on or after his first trade. A day before it has nothing to show. Today is always there. */
export function offeredGoBack(series: StagePoint[]): GoBackKey[] {
  return GO_BACK.filter((g) => g.days < series.length).map((g) => g.key);
}

/** The point a "go back to" lands on, counted back from the last day of the series (one point a day); the last point for Today. */
export function goBackIndex(series: StagePoint[], key: GoBackKey): number {
  const days = GO_BACK.find((g) => g.key === key)?.days ?? 0;
  return Math.max(0, series.length - 1 - days);
}

export interface AsOfReading extends StageReading {
  /** Money put in after that day, less money taken out, in rupees. */
  addedSince: number;
  /** What the market did to it since that day: today's worth less that day's, less the money added since. */
  marketSince: number;
}

/** The portfolio as it stood on `index`, and what has happened since up to the last point. */
export function asOfReading(series: StagePoint[], index: number): AsOfReading | null {
  const base = readingAt(series, index);
  const last = series.at(-1);
  if (!base || !last) return null;
  const from = Math.max(0, Math.min(series.length - 1, index));
  let addedSince = 0;
  for (let i = from + 1; i < series.length; i++) addedSince += series[i].flow ?? 0;
  return { ...base, addedSince, marketSince: last.value - base.value - addedSince };
}

// ---------- Money added, along the foot of the chart ----------
/**
 * The money put in, in `buckets` equal slices of the chart's width: each slice's buys (money taken out doesn't count here), as a fraction of
 * the biggest slice. A day goes in the slice its place along the chart falls in, so a bar sits under the days it belongs to however many
 * days the range has.
 */
export function moneyBars(points: StagePoint[], buckets = 38): number[] {
  const n = points.length;
  if (n === 0) return [];
  const sums = Array.from({ length: buckets }, () => 0);
  points.forEach((p, i) => {
    const slice = n === 1 ? 0 : Math.min(buckets - 1, Math.floor((i / (n - 1)) * buckets));
    sums[slice] += Math.max(0, p.flow ?? 0);
  });
  const biggest = Math.max(...sums);
  return biggest > 0 ? sums.map((v) => v / biggest) : sums.map(() => 0);
}

/** Where a "go back to" day falls among the points a range shows (the tail of the series), or null for Today or a day before the range starts. */
export function goBackMark(series: StagePoint[], shown: number, key: GoBackKey): number | null {
  if (key === "now") return null;
  const at = goBackIndex(series, key) - (series.length - shown);
  return at >= 0 && at < shown ? at : null;
}

// ---------- The axes ----------
/** Round values to hang gridlines on, about `count` of them across [min, max] (1, 2, 2.5, 5 or 10 times a power of ten apart). */
export function axisTicks(min: number, max: number, count = 4): number[] {
  if (!(max > min)) return [];
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((v) => v >= raw)!;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

/** A tick as the design prints it: 60L, 1.5Cr, or the plain number under a lakh. */
export function tickLabel(value: number): string {
  const abs = Math.abs(value);
  const trim = (n: number) => String(Math.round(n * 100) / 100);
  if (abs >= 1e7) return `${trim(value / 1e7)}Cr`;
  if (abs >= 1e5) return `${trim(value / 1e5)}L`;
  return trim(value);
}

/** `count` evenly spaced indexes from 0 to n-1, for the dates under the chart. */
export function dateTickIndexes(n: number, count = 5): number[] {
  if (n <= 1) return [0];
  return Array.from({ length: count + 1 }, (_, k) => Math.round((k * (n - 1)) / count)).filter((v, i, all) => all.indexOf(v) === i);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A day under the chart: "14 Jun" when the chart covers about three months or less, "Jun 21" (month and year) over longer. */
export function axisDate(iso: string, spanDays: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return spanDays <= 100 ? `${d} ${MONTHS[m - 1]}` : `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}
