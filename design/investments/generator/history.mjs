// Sample history for round 2 (the performance stage, the lens, the race): a daily price per holding, USD/INR, the portfolio's value, its cost
// and a time-weighted index, plus four benchmarks. All of it is made up: each holding's price passes through its own trade prices (so cost
// and value agree) and ends on today's price; the rest is seeded noise. In the app it would come from the price history behind F-IV-03.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
const { sum } = D;

const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gauss = (r) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());

export const START = "2021-09-01", END = D.PRICES_AS_OF;
const dows = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();
export const DAYS = (() => {
  const set = new Set(D.TRADES.map((t) => t.tradeDate));
  for (let d = START; d <= END; d = L.addDays(d, 1)) if (dows(d) !== 0 && dows(d) !== 6) set.add(d);
  return [...set].filter((d) => d >= START && d <= END).sort();
})();
const idx = new Map(DAYS.map((d, i) => [d, i]));
const N = DAYS.length;
const near = (iso) => { let i = idx.get(iso); if (i != null) return i; let d = iso; while (idx.get(d) == null && d < END) d = L.addDays(d, 1); return idx.get(d) ?? N - 1; };

/** A path through anchors [[iso, value]] with a Brownian bridge between each pair, so it hits every anchor exactly. */
function path(anchors, sigma, seed) {
  const r = rng(seed), out = Array(N).fill(null), pts = anchors.map(([d, v]) => [near(d), v]).sort((a, b) => a[0] - b[0]);
  for (let k = 0; k < pts.length - 1; k++) {
    const [i0, v0] = pts[k], [i1, v1] = pts[k + 1], T = i1 - i0;
    if (T <= 0) { out[i0] = v0; continue; }
    const W = [0]; for (let t = 1; t <= T; t++) W.push(W[t - 1] + gauss(r) * sigma);
    for (let t = 0; t <= T; t++) { const lin = Math.log(v0) + (Math.log(v1) - Math.log(v0)) * (t / T), br = W[t] - (t / T) * W[T]; out[i0 + t] = Math.exp(lin + br); }
  }
  return { first: pts[0][0], series: out };
}

const SIGMA = { NTAP: 0.017, VOO: 0.009, QQQ: 0.012, HDFCBANK: 0.012, INFY: 0.013, RELIANCE: 0.012, NIFTYBEES: 0.008, PPFAS: 0.007, ICICICORP: 0.0006, GOLDBEES: 0.009 };
export const PRICE = {}, FIRST = {};
D.SYMBOLS.forEach((s, k) => {
  const ins = D.INSTRUMENTS[s], trades = D.TRADES.filter((t) => t.symbol === s);
  const a = trades.map((t) => [t.tradeDate, t.price]);
  const yr = L.addDays(END, -365), have = (d) => a.some(([x]) => Math.abs(L.daysBetween(x, d)) < 25);
  const loD = L.addDays(END, -200 - k * 3), hiD = L.addDays(END, -70 - k * 2);
  if (!have(loD) && loD > yr) a.push([loD, ins.lo * 1.01]);
  if (!have(hiD) && hiD > yr) a.push([hiD, ins.hi * 0.99]);
  a.push([L.addDays(END, -1), ins.prev], [END, ins.price]);
  const p = path(a.sort((x, y) => (x[0] < y[0] ? -1 : 1)).filter((x, i, arr) => !i || x[0] !== arr[i - 1][0]), SIGMA[s], 100 + k * 7);
  PRICE[s] = p.series; FIRST[s] = p.first;
});
const fxAnch = [...D.TRADES.filter((t) => t.fxRateToInr).map((t) => [t.tradeDate, t.fxRateToInr]), [START, 74.2], [L.addDays(END, -1), D.FX_PREV], [END, D.FX_NOW]].sort((a, b) => (a[0] < b[0] ? -1 : 1)).filter((x, i, arr) => !i || x[0] !== arr[i - 1][0]);
export const FX = path(fxAnch, 0.0016, 77).series;

// ---------- Value, cost, flows, the time-weighted index ----------
const fold = (sym, upTo) => { let q = 0, cost = 0; for (const t of D.TRADES.filter((x) => x.symbol === sym && x.tradeDate <= upTo)) { if (t.tradeType === "Buy") { q += t.quantity; cost += D.costInr(t); } else { const s = Math.min(t.quantity, q), f = q ? s / q : 0; cost -= cost * f; q -= s; if (q < 1e-9) { q = 0; cost = 0; } } } return { q, cost }; };
export const VAL = Array(N).fill(0), COSTD = Array(N).fill(0), FLOW = Array(N).fill(0), BYSYM = {};
D.SYMBOLS.forEach((s) => (BYSYM[s] = { q: Array(N).fill(0), v: Array(N).fill(0) }));
DAYS.forEach((d, i) => {
  for (const s of D.SYMBOLS) {
    const f = fold(s, d), us = D.INSTRUMENTS[s].market === "US", v = f.q ? PRICE[s][i] * (us ? FX[i] : 1) * f.q : 0;
    BYSYM[s].q[i] = f.q; BYSYM[s].v[i] = v; VAL[i] += v; COSTD[i] += f.cost;
  }
  for (const t of D.TRADES.filter((x) => x.tradeDate === d)) FLOW[i] += (t.tradeType === "Buy" ? 1 : -1) * t.quantity * PRICE[t.symbol][i] * (t.market === "US" ? FX[i] : 1);
});
// rescale the last day so the series ends exactly on today's value
export const IDX = Array(N).fill(null); let first = VAL.findIndex((v) => v > 0);
IDX[first] = 100;
for (let i = first + 1; i < N; i++) { const prev = VAL[i - 1], r = prev > 0 ? (VAL[i] - FLOW[i]) / prev : 1; IDX[i] = IDX[i - 1] * (Number.isFinite(r) && r > 0 ? r : 1); }
export const FIRST_IDX = first;

// ---------- Benchmarks (made up, in rupees) ----------
const bench = (anch, sigma, seed) => path(anch, sigma, seed).series;
export const NIFTY = bench([[START, 17100], ["2022-06-17", 15800], ["2023-01-02", 18100], ["2024-01-02", 21700], ["2025-01-02", 23500], ["2025-10-31", 24600], [END, 25918]], 0.008, 501);
const spx = bench([[START, 4520], ["2022-10-12", 3580], ["2024-01-02", 4770], ["2025-01-02", 5880], ["2025-10-31", 6560], [END, 6774]], 0.009, 502);
export const SPX_INR = spx.map((v, i) => v * FX[i]);
export const GOLD = bench([[START, 47000], ["2023-01-02", 54800], ["2024-01-02", 63000], ["2025-01-02", 78500], ["2025-10-31", 118000], [END, 121840]], 0.008, 503);
export const FDI = DAYS.map((d) => 100 * Math.pow(1.07, L.daysBetween(START, d) / 365));

// ---------- The numbers on the boards ----------
export const rebased = (series, from = first) => series.map((v, i) => (i < from ? null : (v / series[from]) * 100));
export const lastIdx = N - 1;
export const sliceFrom = (days) => (days == null ? first : Math.max(first, N - 1 - days));
export const RANGES = [["1m", "1M", 30], ["3m", "3M", 90], ["6m", "6M", 182], ["1y", "1Y", 365], ["3y", "3Y", 1095], ["all", "All", null]];
export const rangeStart = (days) => (days == null ? first : Math.max(first, idx.get(L.addDays(END, -days)) ?? near(L.addDays(END, -days))));
/** Max drawdown of the time-weighted index (peak to trough), with the month of the trough. */
export const DRAWDOWN = (() => { let peak = -Infinity, worst = 0, at = first, pk = first; for (let i = first; i < N; i++) { if (IDX[i] > peak) { peak = IDX[i]; pk = i; } const dd = IDX[i] / peak - 1; if (dd < worst) { worst = dd; at = i; } } return { pct: worst, at: DAYS[at], date: DAYS[at] }; })();
export const YEARS_HELD = L.daysBetween(DAYS[first], END) / 365;
export const TWR_TOTAL = IDX[N - 1] / 100 - 1;
export const TWR_YEARLY = Math.pow(IDX[N - 1] / 100, 1 / YEARS_HELD) - 1;
const yearReturn = (series, y) => { const a = near(`${y - 1}-12-31`), b = near(`${y}-12-31`) > N - 1 ? N - 1 : near(`${y}-12-31`); const a0 = Math.max(a, first); return series[Math.min(b, N - 1)] / series[a0] - 1; };
export const YEAR_RETURNS = [2022, 2023, 2024, 2025, 2026].map((y) => ({ y, you: yearReturn(IDX, y), nifty: yearReturn(NIFTY, y), spx: yearReturn(SPX_INR, y), gold: yearReturn(GOLD, y) }));
/** The same money, on the same days, in a benchmark: each buy grows with the index, each sell takes its share out. */
export const sameMoney = (series) => { let v = 0; for (let i = first; i < N; i++) { v *= series[i] / series[i - 1] || 1; const f = FLOW[i]; v += f; } return v; };

/** Where each holding stood on a day: quantity, cost (rupees, and dollars for a US one), price and value. Uses the day's own price and rate. */
export function holdingAt(sym, i) {
  const iso = DAYS[i], us = D.INSTRUMENTS[sym].market === "US"; let q = 0, cost = 0, usdc = 0;
  for (const t of D.TRADES.filter((x) => x.symbol === sym && x.tradeDate <= iso)) {
    if (t.tradeType === "Buy") { q += t.quantity; cost += D.costInr(t); usdc += us ? t.total : 0; continue; }
    const sold = Math.min(t.quantity, q), f = q ? sold / q : 0; cost -= cost * f; usdc -= usdc * f; q -= sold; if (q < 1e-9) { q = 0; cost = 0; usdc = 0; }
  }
  const px = PRICE[sym][i], fx = us ? FX[i] : 1, value = q * px * fx;
  return { symbol: sym, q, cost, usdc, px, fx, value, avgNative: q ? (us ? usdc / q : cost / q) : 0, avgFx: us && usdc ? cost / usdc : 1, gain: value - cost, gainPct: cost ? value / cost - 1 : 0, sinceThen: D.INSTRUMENTS[sym].price / px - 1 };
}
export const ASOF = [["now", "Today", 0], ["1m", "1M ago", 30], ["6m", "6M ago", 182], ["1y", "1Y ago", 365], ["2y", "2Y ago", 730]].map(([k, label, days]) => ({ k, label, days, i: days ? (() => { let d = L.addDays(END, -days); while (!idx.has(d)) d = L.addDays(d, -1); return idx.get(d); })() : N - 1 }));
