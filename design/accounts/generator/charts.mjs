// The chart widget options, C1–C6. Each follows the pick: marks carry `acm ac-<id>` and fade unless
// picked (see parts.picker), or the chart is drawn once per pick as a pane when its scale changes.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { inr, signed, inrS, fmt, fmtY, monName, monYear, I, ringCircles } = L;

const STACK = ["sbi", "icici", "hdfc", "kotak", "axis", "yes"];
const t = (iso) => Date.parse(`${iso}T00:00:00Z`);
const mix = (c, p = 70) => `color-mix(in oklch, var(--card-${c}) ${p}%, white)`;
/** The gradients and patterns every chart uses, once per board (a def inside a hidden pane wouldn't paint). */
export const DEFS = () => `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="oklch(0.95 0.05 85 / 0.55)"></rect><line x1="0" y1="0" x2="0" y2="7" stroke="oklch(0.72 0.14 75)" stroke-width="2.2" stroke-opacity="0.55"></line></pattern>
  <pattern id="hatch-grey" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--muted)" stroke-width="1.4" stroke-opacity="0.45"></line></pattern>
  <filter id="glow" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="5" result="b"></feGaussianBlur><feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>
  ${L.COLORS.concat("emerald").map((c) => `<linearGradient id="g-${c}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${mix(c, 88)}"></stop><stop offset="1" style="stop-color:var(--card-${c})"></stop></linearGradient><linearGradient id="a-${c}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--card-${c});stop-opacity:0.32"></stop><stop offset="1" style="stop-color:var(--card-${c});stop-opacity:0"></stop></linearGradient>`).join("")}
  <radialGradient id="rt-w" cx="1.1" cy="1.25" r="0.34" spreadMethod="repeat"><stop offset="0" stop-color="white" stop-opacity="0"></stop><stop offset="0.8" stop-color="white" stop-opacity="0"></stop><stop offset="0.87" stop-color="white" stop-opacity="0.34"></stop><stop offset="0.94" stop-color="white" stop-opacity="0"></stop></radialGradient>
  <radialGradient id="rt-i" cx="1.1" cy="1.25" r="0.34" spreadMethod="repeat"><stop offset="0" stop-color="oklch(0.42 0.1 152)" stop-opacity="0"></stop><stop offset="0.8" stop-color="oklch(0.42 0.1 152)" stop-opacity="0"></stop><stop offset="0.87" stop-color="oklch(0.42 0.1 152)" stop-opacity="0.22"></stop><stop offset="0.94" stop-color="oklch(0.42 0.1 152)" stop-opacity="0"></stop></radialGradient>
  <pattern id="waves-ink" width="44" height="14" patternUnits="userSpaceOnUse"><path d="M0,7 C11,1 33,13 44,7" fill="none" stroke="oklch(0.4 0.06 210)" stroke-opacity="0.16" stroke-width="1.2"></path></pattern>
  <pattern id="waves" width="44" height="14" patternUnits="userSpaceOnUse"><path d="M0,7 C11,1 33,13 44,7" fill="none" stroke="white" stroke-opacity="0.4" stroke-width="1.2"></path></pattern>
  ${L.COLORS.concat("emerald").map((c) => `<radialGradient id="r-${c}" cx="34%" cy="28%" r="78%"><stop offset="0" style="stop-color:${mix(c, 78)}"></stop><stop offset="0.55" style="stop-color:var(--card-${c}-from)"></stop><stop offset="1" style="stop-color:var(--card-${c}-to)"></stop></radialGradient>`).join("")}
</defs></svg>`;
const yTicks = (max, n = 5) => { const step = [50000, 100000, 200000, 250000, 300000, 400000, 500000].find((s) => max / s <= n) ?? 1000000; const out = []; for (let v = 0; v <= max * 1.001; v += step) out.push(v); if (out.at(-1) < max) out.push(out.at(-1) + step); return out; };
const niceMax = (v) => yTicks(v).at(-1);

// ================= C1 · River: every account stacked, over the year =================
export function river({ w = 1368, h = 360, ph = false, from = "2026-01-01", labels: withLabels = true } = {}) {
  const padL = ph ? 34 : 56, padR = ph || !withLabels ? 12 : 190, padT = 26, padB = 30;
  const dates = []; for (let d = from; d < L.TODAY; d = L.addDays(d, 4)) dates.push(d); dates.push(L.TODAY);
  const vals = STACK.map((id) => dates.map((d) => L.balanceOn(id, d) ?? 0));
  const tops = vals.map((_, i) => dates.map((__, k) => vals.slice(0, i + 1).reduce((s, v) => s + v[k], 0)));
  const max = niceMax(Math.max(...tops.at(-1)) * 1.04);
  const X = (d) => padL + ((t(d) - t(from)) / (t(L.TODAY) - t(from))) * (w - padL - padR), Y = (v) => padT + (1 - v / max) * (h - padT - padB);
  const line = (arr) => arr.map((v, k) => `${k ? "L" : "M"}${X(dates[k]).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const back = (arr) => arr.map((v, k) => [X(dates[k]).toFixed(1), Y(v).toFixed(1)]).reverse().map(([x, y]) => `L${x},${y}`).join(" ");
  const bands = STACK.map((id, i) => { const a = L.acc(id), base = i ? tops[i - 1] : dates.map(() => 0); return `<path class="acm ac-${id}" d="${line(tops[i])} ${back(base)} Z" fill="url(#g-${a.color})" stroke="${mix(a.color, 95)}" stroke-width="1"></path>`; }).join("");
  const totalArea = `${line(tops.at(-1))} L${X(L.TODAY)},${Y(0)} L${X(from)},${Y(0)} Z`;
  const ringsClip = `<clipPath id="riv-clip"><path d="${totalArea}"></path></clipPath><g clip-path="url(#riv-clip)" pointer-events="none">${ringCircles(padL, padT, w - padL - padR, h - padT - padB, { first: 40, step: 30, count: 40, opacity: 0.14, dx: 30, dy: 60 })}</g>`;
  // The stale part of the emergency fund: carried forward since its last balance.
  const st = L.STALE[0];
  let stale = "";
  if (st) {
    const i = STACK.indexOf(st.id), d0 = L.latest(st.id).date, ks = dates.map((d, k) => [d, k]).filter(([d]) => d >= d0);
    const top = ks.map(([d, k]) => `${X(d).toFixed(1)},${Y(tops[i][k]).toFixed(1)}`), bot = ks.map(([d, k]) => `${X(d).toFixed(1)},${Y(i ? tops[i - 1][k] : 0).toFixed(1)}`).reverse();
    const midK = ks[Math.floor(ks.length / 2)][1];
    stale = `<path class="acm ac-${st.id}" d="M${top.join(" L")} L${bot.join(" L")} Z" fill="url(#hatch)"></path>${ph ? "" : `<g class="acm ac-${st.id}"><rect x="${X(d0) + 8}" y="${(Y(tops[i][midK]) + Y(i ? tops[i - 1][midK] : 0)) / 2 - 11}" width="${X(L.TODAY) - X(d0) - 16}" height="22" rx="11" fill="var(--surface)" opacity="0.94"></rect><text x="${(X(d0) + X(L.TODAY)) / 2}" y="${(Y(tops[i][midK]) + Y(i ? tops[i - 1][midK] : 0)) / 2 + 4}" text-anchor="middle" font-size="10.5" font-weight="800" fill="var(--warning-text)">Carried from ${fmt(d0)}</text></g>`}`;
  }
  const dots = ph ? "" : STACK.map((id, i) => L.snapsOf(id).filter((s) => s.date >= from).map((s) => { const k = dates.findIndex((d) => d >= s.date); return `<circle class="acm ac-${id}" cx="${X(s.date)}" cy="${Y(tops[i][Math.max(0, k)])}" r="2.6" fill="var(--surface)" stroke="var(--card-${L.acc(id).color}-from)" stroke-width="1.6"></circle>`; }).join("")).join("");
  const ticks = yTicks(max).map((v) => `<line class="axis-l" x1="${padL}" x2="${w - padR}" y1="${Y(v)}" y2="${Y(v)}"></line><text class="axis-t" x="${padL - 8}" y="${Y(v) + 4}" text-anchor="end">${v ? inrS(v) : "₹0"}</text>`).join("");
  const months = L.YEAR.map((k) => `<text class="axis-t" x="${X(`${k}-01`)}" y="${h - 8}" text-anchor="${k === L.YEAR[0] ? "start" : "middle"}"${k === L.monthKey(L.TODAY) ? ' style="fill:var(--fg)"' : ""}>${ph && Number(k.slice(5)) % 3 !== 1 ? "" : monName(k)}</text>`).join("");
  const hiK = L.rangeIn(null).hi, hiX = X("2026-03-31") - 1, hiY = Y(Math.max(...tops.at(-1)));
  const peak = ph ? "" : `<g class="acm-all"><line x1="${hiX}" x2="${hiX}" y1="${hiY - 4}" y2="${hiY - 18}" stroke="var(--fg)" stroke-width="1.2"></line><rect x="${hiX - 76}" y="${hiY - 42}" width="152" height="24" rx="12" fill="var(--ink)"></rect><text x="${hiX}" y="${hiY - 26}" text-anchor="middle" font-size="11" font-weight="800" fill="var(--on-ink)">High ${inr(hiK.v)} · Mar</text></g>`;
  const tx = X(L.TODAY);
  const today = `<line x1="${tx}" x2="${tx}" y1="${padT - 8}" y2="${h - padB}" stroke="var(--fg)" stroke-width="1.4" stroke-dasharray="2 3"></line>`;
  let ly = padT;
  const labels = ph || !withLabels ? "" : STACK.slice().reverse().map((id) => { const a = L.acc(id), b = L.balanceOn(id, L.TODAY) ?? 0, f = P.FACTS[id]; const y = ly; ly += 46; return `<g class="acm ac-${id}"><rect x="${w - padR + 18}" y="${y}" width="10" height="10" rx="3" style="fill:var(--card-${a.color})"></rect><text x="${w - padR + 36}" y="${y + 9}" font-size="12" font-weight="800" fill="var(--fg)">${a.name}</text><text x="${w - padR + 36}" y="${y + 26}" font-size="11.5" font-weight="700" fill="var(--muted)">${L.isOn(a) ? `${inr(b)}${f.stale ? " · stale" : ""}` : "Closed Mar 31"}</text></g>`; }).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Every account's balance this year, stacked">${ticks}${bands}${ringsClip}${stale}${dots}${today}${peak}${months}${labels}
    <text x="${tx - 6}" y="${padT - 12}" text-anchor="end" font-size="11" font-weight="800" fill="var(--fg)">Today ${inr(L.TOTAL)}</text></svg>`;
}

// ================= C2 · Glow line with the change under it =================
function glowPane(f, { w, h, ph }) {
  const keys = L.YEAR, padL = ph ? 34 : 58, padR = ph ? 12 : 40, padT = 34, chH = ph ? 56 : 84, gap = 26, lineH = h - chH - gap - 26;
  const vals = keys.map((k) => (f.all ? L.totalAtMonth(k) : L.atMonth(f.id, k)));
  const known = vals.map((v) => v ?? 0);
  const lo = Math.min(...known), hi = Math.max(...known), span = hi - lo || hi || 1;
  const yMin = Math.max(0, lo - span * 0.35), yMax = hi + span * 0.18;
  const X = (i) => padL + (i / (keys.length - 1)) * (w - padL - padR), Y = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * (lineH - padT);
  const pts = known.map((v, i) => [X(i), Y(v)]);
  const smooth = pts.map((p, i) => { if (!i) return `M${p[0]},${p[1]}`; const q = pts[i - 1], cx = (q[0] + p[0]) / 2; return `C${cx},${q[1]} ${cx},${p[1]} ${p[0]},${p[1]}`; }).join(" ");
  const c = f.all ? "emerald" : f.color;
  const stroke = f.all ? "var(--accent-text)" : `var(--card-${c})`;
  const area = `${smooth} L${X(keys.length - 1)},${lineH} L${X(0)},${lineH} Z`;
  const deltas = known.map((v, i) => (i ? v - known[i - 1] : (f.all ? L.totalAtMonth("2026-01") - L.yearStart() : (L.atMonth(f.id, "2026-01") ?? 0) - L.yearStart(f.id))));
  const dMax = Math.max(...deltas.map(Math.abs), 1), base = lineH + gap + chH / 2, bw = Math.min(46, (w - padL - padR) / keys.length - 18);
  const bars = deltas.map((d, i) => { const bh = (Math.abs(d) / dMax) * (chH / 2 - 6), up = d >= 0; return `<rect x="${X(i) - bw / 2}" y="${up ? base - bh : base}" width="${bw}" height="${Math.max(bh, 1.5)}" rx="5" fill="${up ? "var(--heat-3)" : "oklch(0.8 0.09 28)"}"></rect><rect x="${X(i) - bw / 2}" y="${up ? base - bh : base}" width="${bw}" height="${Math.max(bh, 1.5)}" rx="5" fill="url(#rt-w)" pointer-events="none"></rect>${ph ? "" : `<text x="${X(i)}" y="${up ? base - bh - 5 : base + bh + 13}" text-anchor="middle" font-size="10" font-weight="800" fill="${up ? "var(--positive)" : "var(--negative)"}">${signed(d).replace("₹", "₹").replace(/,\d{3}$/, (m) => m)}</text>`}`; }).join("");
  const iHi = known.indexOf(hi), iLo = known.indexOf(lo), last = keys.length - 1;
  const tag = (i, text, dark = false, above = true) => { const tw = text.length * 6.3 + 20; return `<g><rect x="${X(i) - tw / 2}" y="${Y(known[i]) + (above ? -34 : 12)}" width="${tw}" height="22" rx="11" fill="${dark ? "var(--ink)" : "var(--surface)"}" stroke="${dark ? "none" : "var(--surface-line)"}"></rect><text x="${X(i)}" y="${Y(known[i]) + (above ? -19 : 27)}" text-anchor="middle" font-size="11" font-weight="800" fill="${dark ? "var(--on-ink)" : "var(--fg)"}">${text}</text></g>`; };
  const tstep = [10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000].find((s) => (yMax - yMin) / s <= 4) ?? 1000000;
  const tv = []; for (let v = Math.ceil(yMin / tstep) * tstep; v <= yMax; v += tstep) tv.push(v);
  const ticks = tv.map((v) => `<line class="axis-l" x1="${padL}" x2="${w - padR}" y1="${Y(v)}" y2="${Y(v)}"></line><text class="axis-t" x="${padL - 8}" y="${Y(v) + 4}" text-anchor="end">${inrS(v)}</text>`).join("");
  const months = keys.map((k, i) => `<text class="axis-t" x="${X(i)}" y="${h - 4}" text-anchor="middle"${i === last ? ' style="fill:var(--fg)"' : ""}>${monName(k)}</text>`).join("");
  const hover = f.all && !ph ? (() => { const i = 2, x = X(i), y = Y(known[i]); return `<foreignObject x="${x + 18}" y="${y - 10}" width="262" height="150"><div xmlns="http://www.w3.org/1999/xhtml" class="hc" style="width:250px;padding:12px 14px"><div class="h"><span>March 2026</span><span class="pill pill-on" style="padding:2px 8px;font-size:10px">High point</span></div><div class="t" style="font-size:20px">${inr(known[i])}</div><div class="d" style="color:var(--positive)">${signed(deltas[i])} in March</div><ul style="margin-top:8px"><li><span class="nm">Bonus into HDFC Salary</span><b>${inr(160000)}</b></li><li><span class="nm">Card bills paid</span><b>${inr(L.sumKind(L.monthFlows("2026-03").list, "card"))}</b></li></ul></div></foreignObject>`; })() : "";
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${f.name}: balance by month, with each month's change">${ticks}
    <path d="${area}" fill="url(#a-${c})"></path><path d="${smooth}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" filter="url(#glow)"></path>
    ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === last ? 5 : 3}" fill="${i === last ? stroke : "var(--surface)"}" stroke="${stroke}" stroke-width="2"></circle>`).join("")}
    <circle cx="${pts[last][0]}" cy="${pts[last][1]}" r="11" fill="none" stroke="${stroke}" stroke-opacity="0.3" stroke-width="2"></circle>
    ${ph ? "" : tag(iHi, `High ${inr(hi)}`, true)}${ph || iLo === iHi ? "" : tag(iLo, `Low ${inr(lo)}`, false, false)}${ph ? "" : iHi === last ? "" : tag(last, `${inr(known[last])} now`)}
    <line x1="${padL}" x2="${w - padR}" y1="${base}" y2="${base}" stroke="var(--divider)"></line>${bars}${months}${hover}</svg>`;
}
export const glow = ({ w = 1368, h = 380, ph = false } = {}) => P.panes((f) => glowPane(f, { w, h, ph }));

// ================= C3 · Bridge: from Jan 1 to today, what moved it =================
function bridgeSteps(f) {
  const ids = f.all ? null : f.id;
  const list = L.YEAR.flatMap((k) => L.monthFlows(k, ids).list);
  const start = L.yearStart(f.all ? null : f.id), end = f.all ? L.TOTAL : L.balanceOn(f.id, L.TODAY) ?? 0;
  const steps = [];
  const inc = list.filter((x) => x.kind === "income");
  for (const label of [...new Set(inc.map((x) => x.label))]) steps.push({ label, v: inc.filter((x) => x.label === label).reduce((t, x) => t + x.amount, 0), color: "var(--heat-4)" });
  if (f.all) {
    for (const k of ["card", "sub", "emi", "invest"]) { const v = L.sumKind(list, k); if (v) steps.push({ label: L.KINDS[k].name, v: -v, color: L.KINDS[k].color }); }
  } else {
    for (const ref of Object.keys(L.CARDS)) { const v = list.filter((x) => x.ref === ref).reduce((t, x) => t + x.amount, 0); if (v) steps.push({ label: `${L.CARDS[ref].name} bills`, v: -v, color: `var(--card-${L.CARDS[ref].color})` }); }
    for (const k of ["sub", "emi", "invest"]) { const v = L.sumKind(list, k); if (v) steps.push({ label: L.KINDS[k].name, v: -v, color: L.KINDS[k].color }); }
  }
  const known = steps.reduce((t, s) => t + s.v, 0);
  steps.push({ label: "Everything else", v: end - start - known, other: true });
  return { start, end, steps };
}
function bridgePane(f, { w, h, ph }) {
  if (!f.on) return `<p class="card-note" style="padding:60px 0;text-align:center">${f.name} closed on ${fmtY(f.closedOn)}, so there's nothing to bridge this year. Its history is in Balance history.</p>`;
  const { start, end, steps } = bridgeSteps(f);
  const cols = [{ label: "Jan 1", v: start, total: true }, ...steps, { label: "Today", v: end, total: true }];
  let run = start; const bars = cols.map((c, i) => { if (c.total) return { ...c, a: 0, b: c.v }; const a = run; run += c.v; return { ...c, a, b: run }; });
  const hi = Math.max(...bars.map((b) => Math.max(b.a, b.b))), lo = Math.min(0, ...bars.map((b) => Math.min(b.a, b.b)));
  const padL = ph ? 30 : 58, padR = 10, padT = 34, padB = ph ? 46 : 54;
  const max = niceMax(hi);
  const Y = (v) => padT + (1 - (v - lo) / (max - lo)) * (h - padT - padB);
  const slot = (w - padL - padR) / cols.length, bw = Math.min(ph ? 30 : 92, slot * 0.66);
  const X = (i) => padL + slot * i + slot / 2;
  const ticks = yTicks(max).map((v) => `<line class="axis-l" x1="${padL}" x2="${w - padR}" y1="${Y(v)}" y2="${Y(v)}"></line><text class="axis-t" x="${padL - 8}" y="${Y(v) + 4}" text-anchor="end">${v ? inrS(v) : "₹0"}</text>`).join("");
  const rects = bars.map((b, i) => {
    const y0 = Y(Math.max(b.a, b.b)), y1 = Y(Math.min(b.a, b.b)), x = X(i) - bw / 2, hh = Math.max(y1 - y0, 2);
    const fill = b.total ? (f.all ? "url(#g-emerald)" : `url(#g-${f.color})`) : b.other ? "url(#hatch-grey)" : b.color;
    const conn = i < bars.length - 1 ? `<line x1="${x + bw}" x2="${X(i + 1) - bw / 2}" y1="${Y(b.b)}" y2="${Y(b.b)}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3"></line>` : "";
    const val = b.total ? inr(b.v) : signed(b.v);
    return `<g><rect x="${x}" y="${y0}" width="${bw}" height="${hh}" rx="${Math.min(8, bw / 4)}" fill="${fill}"${b.other ? ' stroke="var(--muted)" stroke-opacity="0.5" stroke-dasharray="3 3"' : ""}></rect>${b.total || b.v > 0 ? `<clipPath id="bc-${f.id}-${i}"><rect x="${x}" y="${y0}" width="${bw}" height="${hh}" rx="8"></rect></clipPath><g clip-path="url(#bc-${f.id}-${i})">${ringCircles(x, y0, bw, hh, { opacity: 0.18 })}</g>` : ""}${conn}
      ${ph && !b.total ? "" : `<text x="${X(i)}" y="${y0 - 8}" text-anchor="middle" font-size="${ph ? 9.5 : 11.5}" font-weight="800" fill="${b.total ? "var(--fg)" : b.v >= 0 ? "var(--positive)" : b.other ? "var(--muted)" : "var(--negative)"}">${ph ? inrS(b.v) : val}</text>`}
      <text x="${X(i)}" y="${h - padB + 18}" text-anchor="middle" font-size="${ph ? 9 : 11}" font-weight="700" fill="${b.total ? "var(--fg)" : "var(--muted)"}">${ph ? b.label.split(" ")[0] : b.label}</text></g>`;
  }).join("");
  const net = end - start;
  return `${ph ? "" : `<p style="font-size:13.5px;line-height:1.55;font-weight:500;color:var(--muted);margin-bottom:6px">${f.all ? "Your accounts" : `<b style="color:var(--fg)">${f.name}</b>`} went from <b style="color:var(--fg)">${inr(start)}</b> on Jan 1 to <b style="color:var(--fg)">${inr(end)}</b> today, <b style="color:${net >= 0 ? "var(--positive)" : "var(--negative)"}">${signed(net)}</b>. ${f.all ? "Income and bills come from the rest of the app; everything else is what the change leaves over." : "The bills are the ones Mark paid recorded from this account."}</p>`}
    <svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${f.name}: from Jan 1 to today">${ticks}${rects}</svg>`;
}
export const bridge = ({ w = 1368, h = 360, ph = false } = {}) => P.panes((f) => bridgePane(f, { w, h, ph }));

// ================= C4 · Flow map: one month of money in and out =================
export function sankeyData(key = "2026-09") {
  const accounts = P.ORDER.filter((a) => L.isOn(a)).map((a) => a.id);
  const links = [];
  for (const id of accounts) {
    const m = L.monthFlows(key, id);
    for (const x of m.list.filter((x) => x.kind === "income")) links.push({ s: `in:${x.label}`, t: id, v: x.amount });
    if (m.other > 0) links.push({ s: "in:other", t: id, v: m.other });
    if (m.delta < 0) links.push({ s: "in:drawn", t: id, v: -m.delta });
    for (const x of m.list.filter((x) => x.kind !== "income")) links.push({ s: id, t: x.kind === "card" ? `out:${x.ref}` : `out:${x.kind}`, v: x.amount });
    if (m.other < 0) links.push({ s: id, t: "out:other", v: -m.other });
    if (m.delta > 0) links.push({ s: id, t: "out:kept", v: m.delta });
  }
  const merged = [];
  for (const l of links) { const e = merged.find((x) => x.s === l.s && x.t === l.t); if (e) e.v += l.v; else merged.push({ ...l }); }
  return { accounts, links: merged };
}
const NODE = {
  "in:Salary": { name: "Salary", sub: "recorded income", color: "var(--heat-4)" },
  "in:Dividends": { name: "Dividends", sub: "recorded income", color: "var(--heat-4)" },
  "in:Bonus": { name: "Bonus", sub: "recorded income", color: "var(--heat-4)" },
  "in:other": { name: "Not recorded, in", sub: "transfers, refunds, UPI", color: "url(#hatch-grey)", other: true },
  "in:drawn": { name: "Drawn from balance", sub: "accounts that went down", color: "oklch(0.82 0.07 28)" },
  "out:mil": { name: "Millennia bill", sub: "card", card: "mil" }, "out:cor": { name: "Coral bill", sub: "card", card: "cor" }, "out:ace": { name: "Ace bill", sub: "card", card: "ace" },
  "out:sub": { name: "Subscriptions", sub: "charged to an account", color: "var(--card-ruby)" },
  "out:emi": { name: "Car loan EMI", sub: "loan", color: "var(--card-copper)" },
  "out:invest": { name: "Shares bought", sub: "investments", color: "var(--card-violet)" },
  "out:other": { name: "Not recorded, out", sub: "UPI, transfers, cash", color: "url(#hatch-grey)", other: true },
  "out:kept": { name: "Kept", sub: "accounts that went up", color: "var(--heat-3)" },
};
/** The flow map's nodes as a list, for phones, where the labels don't fit beside the bands. */
export function sankeyKey(key = "2026-09") {
  const { links } = sankeyData(key);
  const val = (k, side) => links.filter((l) => (side === "s" ? l.s : l.t) === k).reduce((t, l) => t + l.v, 0);
  const sw = (k) => { const n = NODE[k]; return n.card ? `var(--card-${L.CARDS[n.card].color})` : n.other ? "repeating-linear-gradient(135deg,var(--muted) 0 2px,transparent 2px 4px)" : n.color; };
  const col = (keys, side, title) => `<div style="display:flex;flex-direction:column;gap:6px"><span class="th">${title}</span>${keys.map((k) => `<div class="between" style="font-size:12px;gap:6px"><span class="row" style="gap:6px;min-width:0"><i style="width:8px;height:8px;border-radius:3px;flex-shrink:0;background:${sw(k)}"></i><span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${NODE[k].name}</span></span><b>${inrS(val(k, side))}</b></div>`).join("")}</div>`;
  const left = Object.keys(NODE).filter((k) => k.startsWith("in:") && links.some((l) => l.s === k));
  const right = Object.keys(NODE).filter((k) => k.startsWith("out:") && links.some((l) => l.t === k));
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">${col(left, "s", "In")}${col(right, "t", "Out")}</div>`;
}
export function sankey({ w = 1368, h = 420, ph = false, key = "2026-09" } = {}) {
  const { accounts, links } = sankeyData(key);
  const left = [...new Set(links.filter((l) => l.s.startsWith("in:")).map((l) => l.s))].sort((a, b) => (a === "in:drawn") - (b === "in:drawn") || (a === "in:other") - (b === "in:other"));
  const right = Object.keys(NODE).filter((k) => k.startsWith("out:") && links.some((l) => l.t === k));
  const val = (k, side) => links.filter((l) => (side === "s" ? l.s : l.t) === k).reduce((t, l) => t + l.v, 0);
  const nw = ph ? 10 : 14, gapN = ph ? 8 : 12, top = 12;
  const total = left.reduce((t, k) => t + val(k, "s"), 0);
  const colH = (n) => h - top * 2 - gapN * (n - 1);
  const scale = Math.min(colH(left.length), colH(accounts.length), colH(right.length)) / total;
  const place = (keys, side) => { let y = top + (h - top * 2 - (keys.reduce((t, k) => t + (side === "m" ? val(k, "t") : val(k, side)) * scale, 0) + gapN * (keys.length - 1))) / 2; return Object.fromEntries(keys.map((k) => { const hh = (side === "m" ? val(k, "t") : val(k, side)) * scale; const r = [k, { y, h: hh }]; y += hh + gapN; return r; })); };
  const L0 = place(left, "s"), M = place(accounts, "m"), R = place(right, "t");
  const xL = ph ? 4 : 190, xM = w / 2 - nw / 2, xR = w - (ph ? 4 : 190) - nw;
  const offS = {}, offT = {};
  const band = (x0, y0, x1, y1, hh, cls, fill) => { const c = (x0 + x1) / 2; return `<path class="${cls}" d="M${x0},${y0} C${c},${y0} ${c},${y1} ${x1},${y1} L${x1},${y1 + hh} C${c},${y1 + hh} ${c},${y0 + hh} ${x0},${y0 + hh} Z" fill="${fill}" fill-opacity="0.34"></path>`; };
  const sorted = links.slice().sort((a, b) => (a.s < b.s ? -1 : 1));
  const paths = sorted.map((l) => {
    const hh = l.v * scale;
    if (l.s.startsWith("in:")) { const s = L0[l.s], m = M[l.t]; const ys = s.y + (offS[l.s] ?? 0), ym = m.y + (offT[l.t] ?? 0); offS[l.s] = (offS[l.s] ?? 0) + hh; offT[l.t] = (offT[l.t] ?? 0) + hh; return band(xL + nw, ys, xM, ym, hh, `acm ac-${l.t}`, NODE[l.s].other ? "var(--muted)" : `var(--card-${L.acc(l.t).color})`); }
    const m = M[l.s], r = R[l.t]; const ym = m.y + (offS[l.s] ?? 0), yr = r.y + (offT[l.t] ?? 0); offS[l.s] = (offS[l.s] ?? 0) + hh; offT[l.t] = (offT[l.t] ?? 0) + hh; return band(xM + nw, ym, xR, yr, hh, `acm ac-${l.s}`, NODE[l.t].other ? "var(--muted)" : `var(--card-${L.acc(l.s).color})`);
  }).join("");
  const nodeFill = (k) => (NODE[k].card ? `var(--card-${L.CARDS[NODE[k].card].color})` : NODE[k].color);
  const lab = (x, y, anchor, name, sub, v) => (ph ? "" : `<text x="${x}" y="${y - 2}" text-anchor="${anchor}" font-size="12" font-weight="800" fill="var(--fg)">${name} <tspan font-weight="700" fill="var(--muted)">${inr(v)}</tspan></text><text x="${x}" y="${y + 13}" text-anchor="${anchor}" font-size="10.5" font-weight="600" fill="var(--muted)">${sub}</text>`);
  const spread = (pos, keys, minGap = 34) => { const ys = keys.map((k) => ({ k, y: pos[k].y + pos[k].h / 2 })).sort((a, b) => a.y - b.y); for (let i = 1; i < ys.length; i++) if (ys[i].y - ys[i - 1].y < minGap) ys[i].y = ys[i - 1].y + minGap; const over = ys.length ? ys.at(-1).y - (h - 14) : 0; if (over > 0) ys.forEach((x) => (x.y -= over)); return Object.fromEntries(ys.map((x) => [x.k, x.y])); };
  const lyL = spread(L0, left), lyR = spread(R, right), lyM = spread(M, accounts, 30);
  const nodesL = left.map((k) => `<rect x="${xL}" y="${L0[k].y}" width="${nw}" height="${Math.max(L0[k].h, 2)}" rx="4" fill="${nodeFill(k)}"${NODE[k].other ? ' stroke="var(--muted)" stroke-opacity="0.6"' : ""}></rect>${lab(xL - 10, lyL[k], "end", NODE[k].name, NODE[k].sub, val(k, "s"))}`).join("");
  const nodesR = right.map((k) => `<rect x="${xR}" y="${R[k].y}" width="${nw}" height="${Math.max(R[k].h, 2)}" rx="4" fill="${nodeFill(k)}"${NODE[k].other ? ' stroke="var(--muted)" stroke-opacity="0.6"' : ""}></rect>${lab(xR + nw + 10, lyR[k], "start", NODE[k].name, NODE[k].sub, val(k, "t"))}`).join("");
  const nodesM = accounts.map((id) => { const a = L.acc(id), m = M[id]; return `<g class="acm ac-${id}"><rect x="${xM}" y="${m.y}" width="${nw}" height="${Math.max(m.h, 3)}" rx="4" fill="url(#g-${a.color})"></rect>${ph ? "" : `<rect x="${xM + nw + 8}" y="${lyM[id] - 12}" width="${a.name.length * 7 + 26}" height="24" rx="12" fill="var(--surface)" stroke="var(--surface-line)"></rect><text x="${xM + nw + 20}" y="${lyM[id] + 4}" font-size="11.5" font-weight="800" fill="var(--fg)">${a.name}</text>`}</g>`; }).join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Money in and out of your accounts in ${L.monFull(key)}">${paths}${nodesL}${nodesM}${nodesR}</svg>`;
}

// ================= C5 · Each on its own scale =================
export function multiples({ ph = false, cols = 3 } = {}) {
  const cell = (a) => {
    const f = P.FACTS[a.id], keys = L.LAST12, vals = keys.map((k) => L.atMonth(a.id, k)), known = vals.filter((v) => v != null);
    const w = ph ? 150 : 400, h = ph ? 54 : 96, pad = 6;
    const lo = Math.min(...known), hi = Math.max(...known);
    const X = (i) => pad + (i / (keys.length - 1)) * (w - pad * 2), Y = (v) => pad + (1 - (v - lo) / (hi - lo || 1)) * (h - pad * 2 - 12);
    const pts = vals.map((v, i) => (v == null ? null : [X(i), Y(v)]));
    const lastSnapK = f.on ? keys.findIndex((k) => k >= L.monthKey(f.asOf ?? L.TODAY)) : keys.findIndex((k) => k > L.monthKey(f.closedOn));
    const solid = pts.map((p, i) => (p && (lastSnapK < 0 || i <= lastSnapK || !f.stale) ? p : null));
    const path = (arr) => arr.reduce((d, p, i) => (p ? d + `${d && arr[i - 1] ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)} ` : d), "");
    const dashed = f.stale ? path(pts.map((p, i) => (i >= lastSnapK ? p : null))) : "";
    const fi = pts.findIndex(Boolean), li = pts.length - 1 - [...pts].reverse().findIndex(Boolean);
    const area = `${path(solid)} L${X(f.stale ? lastSnapK : li)},${h - 12} L${X(fi)},${h - 12} Z`;
    const hiI = vals.indexOf(hi), loI = vals.indexOf(lo);
    const svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" aria-hidden="true" style="display:block;overflow:visible">
      <path d="${area}" fill="url(#a-${a.color})"></path><path d="${path(solid)}" fill="none" stroke="var(--card-${a.color})" stroke-width="2.4" stroke-linejoin="round"></path>
      ${dashed ? `<path d="${dashed}" fill="none" stroke="var(--warning)" stroke-width="2.2" stroke-dasharray="3 4"></path><rect x="${X(lastSnapK)}" y="0" width="${X(keys.length - 1) - X(lastSnapK)}" height="${h - 12}" fill="url(#hatch)" opacity="0.6"></rect>` : ""}
      <circle cx="${X(hiI)}" cy="${Y(hi)}" r="3" fill="var(--card-${a.color})"></circle>${ph ? "" : `<text x="${X(hiI)}" y="${Y(hi) - 6}" text-anchor="middle" font-size="9.5" font-weight="800" fill="var(--muted)">${inrS(hi)}</text>`}
      ${loI !== hiI ? `<circle cx="${X(loI)}" cy="${Y(lo)}" r="3" fill="var(--surface)" stroke="var(--card-${a.color})" stroke-width="1.6"></circle>${ph ? "" : `<text x="${X(loI) + (loI > keys.length - 3 ? -7 : 7)}" y="${Y(lo) + 3.5}" text-anchor="${loI > keys.length - 3 ? "end" : "start"}" font-size="9.5" font-weight="800" fill="var(--muted)">${inrS(lo)}</text>`}` : ""}
      ${ph ? "" : keys.map((k, i) => (i % 3 === 0 || i === keys.length - 1 ? `<text x="${X(i)}" y="${h}" text-anchor="${i === 0 ? "start" : i === keys.length - 1 ? "end" : "middle"}" font-size="9.5" font-weight="700" fill="var(--muted)">${monName(k)}</text>` : "")).join("")}</svg>`;
    const right = !f.on ? `<span class="pill pill-off">${I.lock(10)} Closed ${fmt(f.closedOn)}</span>` : f.stale ? `<span class="pill pill-stale">${I.clock(10)} ${fmt(f.asOf)}</span>` : L.chg(f.sinceJan, { suffix: " this year" });
    if (ph) return `<label for="__P__-sel-${a.id}" class="pbook glass acm ac-${a.id}" style="padding:10px;gap:4px;border-radius:16px"><span class="row" style="gap:6px;min-width:0">${L.mono(a, 18)}<b style="font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</b></span><b style="font-size:15px;font-weight:800">${f.on ? inr(f.balance) : "₹0"}</b>${svg}</label>`;
    return `<label for="__P__-sel-${a.id}" class="pbook glass acm ac-${a.id}" style="padding:14px 16px;gap:8px;cursor:pointer"><div class="between"><span class="row" style="gap:10px;min-width:0">${L.mono(a, 26)}<span style="min-width:0"><b style="display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</b><span class="sub2">${L.purposeName(a.purpose)}</span></span></span>${right}</div><div class="between" style="align-items:baseline"><b style="font-size:20px;font-weight:800">${f.balance == null ? "—" : inr(f.balance)}</b><span class="card-note">range ${inrS(lo)}–${inrS(hi)}</span></div>${svg}</label>`;
  };
  return `<div style="display:grid;grid-template-columns:repeat(${ph ? 2 : cols},minmax(0,1fr));gap:${ph ? 8 : 14}px">${P.ORDER.map(cell).join("")}</div>`;
}

// ================= C6 · Snapshot calendar: a cell per month, each account a row =================
export function calendar({ ph = false, keys = L.LAST12 } = {}) {
  const ks = ph ? keys.slice(-6) : keys;
  const now = L.monthKey(L.TODAY);
  const note = (d, prev) => { if (prev == null) return `<small style="color:var(--muted)">first</small>`; const c = d - prev; return `<small style="color:${c >= 0 ? "var(--positive)" : "var(--negative)"}">${c >= 0 ? "▲" : "▼"} ${inrS(Math.abs(c))}</small>`; };
  const rows = P.ORDER.map((a) => {
    const f = P.FACTS[a.id], snaps = L.snapsOf(a.id);
    const cells = ks.map((k) => {
      const inMonth = snaps.filter((s) => L.monthKey(s.date) === k).at(-1);
      const before = snaps.filter((s) => s.date < `${k}-01`).at(-1);
      const cls = k === now ? " now" : "";
      if (!L.isOn(a) && k > L.monthKey(f.closedOn)) return `<div class="scell closed${cls}">—</div>`;
      if (inMonth) return `<div class="scell${cls}" style="background:var(--heat-1);color:var(--heat-ink)" title="${inr(inMonth.balance)} on ${fmt(inMonth.date)}">${inrS(inMonth.balance)}${ph ? "" : note(inMonth.balance, before?.balance)}</div>`;
      if (f.stale && k > L.monthKey(f.asOf)) return `<div class="scell stale${cls}">${ph ? "!" : "No balance"}</div>`;
      if (snaps[0] && k < L.monthKey(snaps[0].date)) return `<div class="scell closed${cls}" style="background:transparent">${ph ? "" : "not open"}</div>`;
      return `<div class="scell none${cls}">${ph ? "·" : before ? inrS(before.balance) : "—"}</div>`;
    }).join("");
    const last = !f.on ? `Closed ${fmt(f.closedOn)}` : f.stale ? `<b style="color:var(--warning-text)">${L.daysBetween(f.asOf, L.TODAY)} days ago</b>` : fmt(f.asOf);
    return `<label for="__P__-sel-${a.id}" class="acm ac-${a.id}" style="display:contents;cursor:pointer"><span class="row" style="gap:9px;min-width:0">${L.mono(a, ph ? 22 : 26)}<b style="font-size:${ph ? 12 : 13}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ph ? a.name.split(" ")[0] : a.name}</b></span>${cells}${ph ? "" : `<span style="font-size:12px;font-weight:600;color:var(--muted);text-align:right">${last}</span>`}</label>`;
  }).join("");
  const head = `<span></span>${ks.map((k) => `<span class="sc-h${k === now ? " now" : ""}">${monName(k)}${k.endsWith("-01") ? ` <span style="opacity:0.6">${k.slice(2, 4)}</span>` : ""}</span>`).join("")}${ph ? "" : `<span class="sc-h" style="text-align:right">Last update</span>`}`;
  // display:contents on a label drops its opacity, so the fade is applied to its cells.
  return `<style>.scal label.acm > * { transition: opacity 260ms; }</style><div class="scal" style="grid-template-columns:${ph ? "86px" : "170px"} repeat(${ks.length},minmax(0,1fr))${ph ? "" : " 110px"}">${head}${rows}</div>`;
}
/** display:contents rows can't fade themselves, so the calendar's fade rules target their children. */
export const calendarCss = (prefix) => `<style>${P.IDS.filter((id) => id !== "all").map((id) => `.${prefix}dir:has(#${prefix}-sel-${id}:checked) .scal label.acm:not(.ac-${id}) > * { opacity: 0.18; }`).join("\n")}</style>`;

// ---------- Legends and the chart card ----------
export const CHARTS = {
  river: { name: "River", title: "Every account, stacked", sub: "this year · each band is an account · dots are the balances you recorded", legend: `<span class="legend"><span><i style="background:repeating-linear-gradient(135deg,var(--warning) 0 2px,var(--warning-tint) 2px 4px)"></i>Carried forward</span><span><i style="border:1.5px solid var(--muted);border-radius:50%;background:var(--surface)"></i>A recorded balance</span></span>`, render: (o) => river(o) },
  glow: { name: "Glow line", title: "Balance by month", sub: "this year · the line is the month-end balance · bars below are each month's change", legend: `<span class="legend"><span><i style="background:var(--heat-3)"></i>Went up</span><span><i style="background:oklch(0.8 0.09 28)"></i>Went down</span></span>`, render: (o) => glow(o) },
  bridge: { name: "Bridge", title: "From Jan 1 to today", sub: "what moved the balance · income and bills from the rest of the app", legend: `<span class="legend"><span><i style="background:var(--heat-4)"></i>Came in</span><span><i style="background:var(--card-sapphire)"></i>Went out</span><span><i style="background:repeating-linear-gradient(135deg,var(--muted) 0 2px,transparent 2px 4px)"></i>Everything else</span></span>${L.derivedTag("Worked out")}`, render: (o) => bridge(o) },
  flow: { name: "Flow map", title: "September, in and out", sub: "where money came from and went, through each account · worked out from the rest of the app", legend: `<span class="row" style="gap:8px">${L.seg([{ label: "‹" }, { label: "Sep 2026", on: true }, { label: "›" }])}${L.derivedTag("Worked out")}</span>`, render: (o) => sankey(o) },
  multiples: { name: "Each on its own scale", title: "Each account, on its own scale", sub: "the last 12 months · small accounts are as readable as big ones", legend: `<span class="legend"><span><i style="background:var(--card-sapphire);border-radius:50%"></i>High</span><span><i style="border:1.5px solid var(--card-sapphire);border-radius:50%"></i>Low</span><span><i style="border-top:2px dashed var(--warning);height:0;width:14px;border-radius:0"></i>No balance since</span></span>`, render: (o) => multiples(o) },
  calendar: { name: "Snapshot calendar", title: "When you updated each one", sub: "the last 12 months · each cell is the month's last balance and how it changed", legend: `<span class="legend"><span><i style="background:var(--heat-1);border:1px solid var(--feature-tile-line)"></i>A balance recorded</span><span><i style="background:repeating-linear-gradient(135deg,var(--heat-no-data) 0 3px,transparent 3px 6px);border:1px solid var(--divider)"></i>Nothing that month</span><span><i style="background:var(--warning-tint);border:1.5px dashed var(--warning)"></i>Overdue</span></span>`, render: (o) => calendar(o) },
};
/** The chart's own card. `prefix` ties its picks to the page's radios. */
export function chartCard(kind, prefix, { ph = false, w = 1368, h, switchTo = null } = {}) {
  const C = CHARTS[kind];
  const body = C.render({ w: ph ? 330 : w, h: h ?? (ph ? 220 : 360), ph }).replace(/__P__/g, prefix);
  const showing = `<span class="row" style="gap:8px"><span class="card-note">Showing</span>${P.panes((f) => `<span class="chip" style="gap:8px">${f.all ? L.allMono(18) : L.mono(f.a, 18)}${f.short}</span>`)}</span>`;
  return `${kind === "calendar" ? calendarCss(prefix) : ""}<section class="card glass" style="gap:14px${ph ? ";padding:16px" : ""}"><div class="card-h"><span class="card-t">${C.title}${ph ? "" : `<small>${C.sub}</small>`}</span>${ph ? "" : `<span class="row" style="gap:16px">${C.legend}${showing}</span>`}</div>${body}</section>`;
}
/** One full-width card that switches between charts. */
export function switchCard(kinds, prefix, { ph = false, w = 1368, title = "Over time" } = {}) {
  const d = `.${prefix}dir`;
  const radios = kinds.map((k, i) => `<input type="radio" class="pk-in" name="${prefix}-cv" id="${prefix}-cv-${k}"${i === 0 ? " checked" : ""}>`).join("");
  const css = `<style>${d} .cvp { display: none; } ${kinds.map((k) => `${d}:has(#${prefix}-cv-${k}:checked) .cvp-${k} { display: block; } ${d}:has(#${prefix}-cv-${k}:checked) label[for="${prefix}-cv-${k}"] { background: var(--surface); color: var(--accent-text); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); }`).join(" ")}</style>`;
  const sw = `<span class="seg" role="tablist" aria-label="Chart">${kinds.map((k) => `<label for="${prefix}-cv-${k}" class="seg-i" style="cursor:pointer${ph ? ";padding:6px 10px;font-size:11.5px" : ""}">${CHARTS[k].name}</label>`).join("")}</span>`;
  const showing = `<span class="row" style="gap:8px"><span class="card-note">Showing</span>${P.panes((f) => `<span class="chip" style="gap:8px">${f.all ? L.allMono(18) : L.mono(f.a, 18)}${f.short}</span>`)}</span>`;
  const panesHtml = kinds.map((k) => `<div class="cvp cvp-${k}">${ph ? "" : `<p class="card-note" style="margin-bottom:12px">${CHARTS[k].sub[0].toUpperCase()}${CHARTS[k].sub.slice(1)}.</p>`}${CHARTS[k].render({ w: ph ? 330 : w, h: ph ? 220 : 360, ph }).replace(/__P__/g, prefix)}</div>`).join("");
  const legends = ph ? "" : kinds.map((k) => `<span class="cvp cvp-${k}">${CHARTS[k].legend}</span>`).join("");
  return `${css}${kinds.includes("calendar") ? calendarCss(prefix) : ""}<section class="card glass" style="gap:12px${ph ? ";padding:16px" : ""}">${radios}<div class="card-h"><span class="row" style="gap:14px">${ph ? "" : `<span class="card-t">${title}</span>`}${sw}</span>${ph ? "" : `<span class="row" style="gap:16px">${legends}${showing}</span>`}</div>${panesHtml}</section>`;
}
