/**
 * The drawing math behind the hero's Trend (docs/design/accounts.md): a balance line turned
 * into a smooth curve. Pure, so it's tested against known points rather than looked at.
 * Values are scaled to 0..1 (0 the lowest point, 1 the highest) and drawn into a box.
 */

/** Scales values to 0..1 across their own range; a flat line sits in the middle. */
export function normalise(values: number[]): number[] {
  if (values.length === 0) return [];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return values.map((v) => (hi === lo ? 0.5 : (v - lo) / (hi - lo)));
}

/** A triangular blur, so a line that steps week by week reads as a trend. The ends are held, not pulled in. */
export function blur(values: number[], radius: number): number[] {
  const n = values.length;
  return values.map((_, i) => {
    let sum = 0;
    let weight = 0;
    for (let k = -radius; k <= radius; k++) {
      const w = radius + 1 - Math.abs(k);
      sum += values[Math.max(0, Math.min(n - 1, i + k))] * w;
      weight += w;
    }
    return sum / weight;
  });
}

export interface CurvePath {
  /** SVG path data. */
  d: string;
  /** Each point's x and y in the box, for placing a marker on the line. */
  xs: number[];
  ys: number[];
}

/**
 * A smooth path through 0..1 values spread evenly across `width`: a monotone cubic
 * (Fritsch-Carlson), which never overshoots a point, so a balance never dips below a
 * low it didn't reach. 0 is drawn `padBottom` above the bottom, 1 `padTop` below the top.
 */
export function smoothPath(norm: number[], width: number, height: number, padTop: number, padBottom: number): CurvePath {
  const n = norm.length;
  if (n === 0) return { d: "", xs: [], ys: [] };
  const xs = norm.map((_, i) => (n === 1 ? 0 : (i / (n - 1)) * width));
  const ys = norm.map((t) => padTop + (1 - t) * (height - padTop - padBottom));
  if (n === 1) return { d: `M ${xs[0]} ${ys[0]}`, xs, ys };
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xs[i + 1] - xs[i];
    slope[i] = (ys[i + 1] - ys[i]) / dx[i];
  }
  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  tangent[n - 1] = slope[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      tangent[i] = k * a * slope[i];
      tangent[i + 1] = k * b * slope[i];
    }
  }
  const f = (v: number) => v.toFixed(1);
  let d = `M ${f(xs[0])} ${f(ys[0])}`;
  for (let i = 0; i < n - 1; i++) {
    d += ` C ${f(xs[i] + dx[i] / 3)} ${f(ys[i] + (tangent[i] * dx[i]) / 3)} ${f(xs[i + 1] - dx[i] / 3)} ${f(ys[i + 1] - (tangent[i + 1] * dx[i]) / 3)} ${f(xs[i + 1])} ${f(ys[i + 1])}`;
  }
  return { d, xs, ys };
}

/** The index of the point nearest a position across the chart, 0 at its left edge and 1 at its right. */
export function nearestIndex(fraction: number, count: number): number {
  if (count <= 1) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(fraction * (count - 1))));
}

/** A step line through 0..1 values: flat, then straight up or down at the change, as the balance is carried forward. */
export function steppedPath(norm: number[], width: number, height: number, pad: number): string {
  const n = norm.length;
  if (n === 0) return "";
  const x = (i: number) => (n === 1 ? 0 : (i / (n - 1)) * width);
  const y = (t: number) => pad + (1 - t) * (height - pad * 2);
  let d = `M 0 ${y(norm[0]).toFixed(1)}`;
  for (let i = 1; i < n; i++) d += ` L ${x(i).toFixed(1)} ${y(norm[i - 1]).toFixed(1)} L ${x(i).toFixed(1)} ${y(norm[i]).toFixed(1)}`;
  return d;
}
