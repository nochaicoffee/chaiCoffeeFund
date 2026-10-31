// Interactive SVG charts for round 2. A chart is one <svg> per view (a range, a holding); the page shows the view whose radio is checked (CSS only,
// see css-inv.mjs `pick`). Hovering a column shows a crosshair, a dot on every line and a tooltip (CSS only: the column's group is the :hover target).
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as H from "./history.mjs";

const f1 = (n) => n.toFixed(1);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dayLabel = (iso, mode) => { const [y, m, d] = iso.split("-").map(Number); return mode === "d" ? `${d} ${MON[m - 1]}` : mode === "m" ? `${MON[m - 1]} ${String(y).slice(2)}` : `${d} ${MON[m - 1]} ${y}`; };

/**
 * One chart. series: [{key, values (one per H.DAYS), kind: "area"|"line"|"step", color, dash, w}] ; bars: {values, color} (money in, drawn along the foot);
 * markers: [{i, v, shape: "dot"|"up"|"down", color, title}]; lines(j, vals): tooltip rows [{t, b?, c?}].
 */
export function chartSvg(o) {
  const { uid, marks = [], W = 900, Hh = 300, s, e, series, rebase = false, dark = false, bars, markers = [], lines, yfmt = (v) => v.toFixed(0), ticks = 4, ml = 54, mr = 18, mt = 14, mb = 28, endLabels = false } = o;
  const pw = W - ml - mr, ph = Hh - mt - mb, barH = bars ? 34 : 0, top = mt, bot = mt + ph - barH - (bars ? 8 : 0);
  const val = (sr, i) => (rebase ? (sr.values[i] / sr.values[s]) * 100 : sr.values[i]);
  const step = Math.max(1, Math.floor((e - s) / 170));
  const idxs = []; for (let i = s; i <= e; i += step) idxs.push(i); if (idxs.at(-1) !== e) idxs.push(e);
  let lo = Infinity, hi = -Infinity;
  for (const sr of series) for (const i of idxs) { const v = val(sr, i); if (v == null || !Number.isFinite(v)) continue; lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad * (o.headroom ?? 0.7);
  const x = (i) => ml + ((i - s) / (e - s || 1)) * pw, y = (v) => top + (bot - top) * (1 - (v - lo) / (hi - lo));
  const defs = []; const body = [];
  const raw = (hi - lo) / ticks, mag = Math.pow(10, Math.floor(Math.log10(raw))), stepY = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw), ticksY = []; for (let v = Math.ceil(lo / stepY) * stepY; v <= hi; v += stepY) ticksY.push(v);
  body.push(ticksY.map((v) => `<line class="gl" x1="${ml}" x2="${ml + pw}" y1="${f1(y(v))}" y2="${f1(y(v))}"/><text class="ax" x="${ml - 8}" y="${f1(y(v) + 4)}" text-anchor="end">${yfmt(v)}</text>`).join(""));
  const span = L.daysBetween(H.DAYS[s], H.DAYS[e]);
  const mode = span <= 100 ? "d" : "m";
  const nx = W < 500 ? 3 : 5;
  body.push(Array.from({ length: nx + 1 }, (_, k) => k).map((k) => { const i = s + Math.round((k * (e - s)) / nx); return `<text class="ax" x="${f1(x(i))}" y="${Hh - 8}" text-anchor="${k === 0 ? "start" : k === nx ? "end" : "middle"}">${dayLabel(H.DAYS[i], mode)}</text>`; }).join(""));
  if (bars) {
    const B = 38, size = Math.ceil((e - s + 1) / B), agg = [];
    for (let b = 0; b < B; b++) { let sum = 0; for (let i = s + b * size; i < Math.min(e + 1, s + (b + 1) * size); i++) sum += Math.max(0, bars.values[i] || 0); agg.push(sum); }
    const mx = Math.max(...agg, 1);
    body.push(agg.map((v, b) => (v ? `<rect class="mbar" x="${f1(ml + (b / B) * pw + 1)}" y="${f1(mt + ph - (v / mx) * barH)}" width="${f1(pw / B - 2)}" height="${f1((v / mx) * barH)}" rx="2" fill="${bars.color}"/>` : "")).join(""));
  }
  series.forEach((sr, k) => {
    const pts = idxs.map((i) => [x(i), y(val(sr, i))]).filter(([a, b]) => Number.isFinite(b));
    if (!pts.length) return;
    const line = pts.map(([a, b], n) => `${n ? "L" : "M"}${f1(a)},${f1(b)}`).join(" ");
    if (sr.kind === "step") { const d = pts.map(([a, b], n) => (n ? `L${f1(a)},${f1(pts[n - 1][1])} L${f1(a)},${f1(b)}` : `M${f1(a)},${f1(b)}`)).join(" "); body.push(`<path class="ln ln-${sr.key}" d="${d}" fill="none" stroke="${sr.color}" stroke-width="${sr.w ?? 1.6}" ${sr.dash ? `stroke-dasharray="${sr.dash}"` : ""} stroke-linejoin="round"/>`); return; }
    if (sr.kind === "area") {
      const gid = `${uid}-g${k}`; defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sr.color}" stop-opacity="${dark ? 0.42 : 0.3}"/><stop offset="1" stop-color="${sr.color}" stop-opacity="0.02"/></linearGradient>`);
      body.push(`<path d="${line} L${f1(pts.at(-1)[0])},${f1(bot)} L${f1(pts[0][0])},${f1(bot)} Z" fill="url(#${gid})"/>`);
    }
    body.push(`<path class="ln ln-${sr.key}" d="${line}" fill="none" stroke="${sr.color}" stroke-width="${sr.w ?? 2.2}" ${sr.dash ? `stroke-dasharray="${sr.dash}"` : ""} stroke-linejoin="round" stroke-linecap="round"/>`);
  });
  for (const m of markers) {
    if (m.i < s || m.i > e) continue; const cx = x(m.i), cy = y(m.v);
    body.push(m.shape === "up" ? `<path d="M${f1(cx - 5)},${f1(cy + 5)} l5,-9 l5,9Z" fill="${m.color}" stroke="${dark ? "oklch(0.18 0.01 260)" : "var(--surface)"}" stroke-width="1.5"><title>${m.title}</title></path>` : m.shape === "down" ? `<path d="M${f1(cx - 5)},${f1(cy - 5)} l5,9 l5,-9Z" fill="${m.color}" stroke="${dark ? "oklch(0.18 0.01 260)" : "var(--surface)"}" stroke-width="1.5"><title>${m.title}</title></path>` : `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="5" fill="${m.color}" stroke="${dark ? "oklch(0.18 0.01 260)" : "var(--surface)"}" stroke-width="2"><title>${m.title}</title></circle>`);
  }
  if (endLabels) { // a chip at the end of every line, spread so they don't sit on each other
    const ends = series.map((sr) => ({ sr, v: val(sr, e) })).sort((a, b) => b.v - a.v); let last = -99;
    ends.forEach(({ sr, v }) => { let yy = y(v); if (yy - last < 20) yy = last + 20; last = yy; body.push(`<g class="ln ln-${sr.key}"><rect x="${f1(ml + pw + 4)}" y="${f1(yy - 9)}" width="52" height="18" rx="9" fill="${sr.color}"/><text x="${f1(ml + pw + 30)}" y="${f1(yy + 4)}" text-anchor="middle" style="fill:white;font-weight:800;font-size:10.5px">${sr.chip(v)}</text></g>`); });
  }
  for (const mk of marks) { if (mk.i < s || mk.i > e) continue; const mx = x(mk.i); body.push(`<g class="v-as" data-k="${mk.k}"><rect x="${f1(mx)}" y="${top}" width="${f1(ml + pw - mx)}" height="${f1(ph)}" fill="oklch(0 0 0 / 0.28)"/><line x1="${f1(mx)}" x2="${f1(mx)}" y1="${top}" y2="${mt + ph}" stroke="oklch(0.86 0.13 85)" stroke-width="1.6" stroke-dasharray="4 3"/><rect x="${f1(mx - 38)}" y="${top - 10}" width="76" height="20" rx="10" fill="oklch(0.86 0.13 85)"/><text x="${f1(mx)}" y="${top + 4}" text-anchor="middle" style="fill:oklch(0.25 0.05 70);font-weight:800;font-size:11px">${mk.label}</text></g>`); }
  const M = Math.min(o.cols ?? 32, e - s), tw = 184;
  const hits = [];
  for (let k = 0; k <= M; k++) {
    const j = s + Math.round((k * (e - s)) / M), cx = x(j), w = pw / M, vals = Object.fromEntries(series.map((sr) => [sr.key, val(sr, j)]));
    const rows = lines(j, vals), h = 14 + rows.length * 16, tx = cx > W * 0.62 ? cx - tw - 12 : cx + 12;
    const dots = series.filter((sr) => sr.kind !== "step" && Number.isFinite(vals[sr.key])).map((sr) => `<circle class="dt dt-${sr.key}" cx="${f1(cx)}" cy="${f1(y(vals[sr.key]))}" fill="${sr.color}"/>`).join("");
    hits.push(`<g class="hc2"><rect class="hit" x="${f1(cx - w / 2)}" y="${top}" width="${f1(w)}" height="${f1(ph)}"/><g class="hv"><line class="xh" x1="${f1(cx)}" x2="${f1(cx)}" y1="${top}" y2="${mt + ph}"/>${dots}<g class="tt"><rect x="${f1(tx)}" y="${top + 2}" width="${tw}" height="${h}" rx="10"/>${rows.map((r, n) => `<text x="${f1(tx + 12)}" y="${top + 2 + 21 + n * 16}" ${r.k || r.b || r.dim ? `class="${[r.k && `tr-${r.k}`, r.b && "bb", r.dim && "dm"].filter(Boolean).join(" ")}"` : ""}${r.c ? ` style="fill:${r.c}"` : ""}>${r.t}</text>`).join("")}</g></g></g>`);
  }
  return `<svg class="chsvg${dark ? " ch-dark" : ""}" viewBox="0 0 ${W} ${Hh}" width="100%" role="img"><defs>${defs.join("")}</defs>${body.join("")}${hits.join("")}</svg>`;
}

/** One view of a chart per range chip: `build(s, e, range)` returns the chart's options. */
export function rangeViews(build, { name = "rg" } = {}) {
  return H.RANGES.map(([key, label, days]) => { const s = H.rangeStart(days), e = H.lastIdx; return `<div class="v-${name}" data-k="${key}">${chartSvg({ uid: `${name}${key}${build.uid ?? ""}`, s, e, ...build(s, e, key) })}</div>`; }).join("");
}
/** The radios and the chips that drive them. Radios sit near the top of the page so `:has()` can reach every view. */
export const radios = (name, keys, def) => keys.map((k) => `<input type="radio" class="pk-in" name="${name}" id="${name}-${k}"${k === def ? " checked" : ""}>`).join("");
export const chips = (name, items, { cls = "" } = {}) => `<span class="chips ${cls}">${items.map(([k, label]) => `<label class="chip2" for="${name}-${k}">${label}</label>`).join("")}</span>`;
export const rangeChips = (cls = "") => chips("rg", H.RANGES.map(([k, l]) => [k, l]), { cls });
