// Full-width chart widgets for S7–S16. They sit at the end of the page, like the Cards page's trend,
// and follow the pick: either a pane per pick (drawn with that subscription on top) or CSS that dims the rest.
import * as L from "./lib.mjs";
import * as SC from "./selcore.mjs";
import * as CH from "./charts.mjs";
const { inr, inrK, fmt, fmtY, fmtDow, mono, I, rings } = L;
const nowKey = L.TODAY.slice(0, 7);
const { monthTotal, subMonth, catSlug } = CH;
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longMonth = (k) => `${MONTH[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;
const niceMax = (v, step = 2000) => Math.ceil(v / step) * step;
const catColor = L.catColor;

// ================= A · Payment trend (the Cards trend, for subscriptions) =================
const TREND_KEYS = [...L.monthsFrom(L.monthKey(L.addMonthsUTC(`${nowKey}-01`, -11)), 12), ...L.monthsFrom(L.monthKey(L.addMonthsUTC(`${nowKey}-01`, 1)), 6)];
function monthCard(k) {
  const rows = L.renewalRows(`${k}-01`, `${k}-31`).filter((r) => r.status !== "wont");
  const total = monthTotal(k);
  const top = [...rows].sort((a, b) => (b.payment ? b.payment.amount : b.plan) - (a.payment ? a.payment.amount : a.plan)).slice(0, 4);
  const diff = total - L.MONTHLY;
  return `<div class="hc"><div class="h"><span style="color:var(--fg)">${longMonth(k)}</span><span class="pill ${k > nowKey ? "pill-off" : "pill-on"}" style="padding:2px 8px;font-size:10px">${k > nowKey ? "Expected" : k === nowKey ? "This month" : "Paid"}</span></div><div class="t">${inr(total)}</div><div class="d" style="color:${diff > 0 ? "var(--negative)" : "var(--positive)"}">${inr(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than a usual month</div><ul>${top.map((r) => `<li>${mono(r.s, 18)}<span class="nm">${r.s.alias} · ${fmt(r.date)}</span><b>${inr(r.payment ? r.payment.amount : r.plan)}</b></li>`).join("")}</ul>${rows.length > 4 ? `<div class="f">and ${rows.length - 4} more renewals</div>` : ""}</div>`;
}
export function trendBars(f, { w = 1360, h = 330, ph = false } = {}) {
  const keys = ph ? TREND_KEYS.slice(6) : TREND_KEYS;
  const vals = keys.map(monthTotal), max = niceMax(Math.max(...vals));
  const left = ph ? 0 : 50, top = 40, bottom = 30, plot = h - top - bottom, gap = ph ? 5 : 14;
  const bw = (w - left - gap * (keys.length - 1)) / keys.length;
  const Y = (v) => (v / max) * plot;
  const peak = vals.indexOf(Math.max(...vals.filter((_, i) => keys[i] <= nowKey)));
  const usual = f.all ? L.MONTHLY : f.on ? f.monthly : 0;
  const grid = ph ? "" : [0, max / 2, max].map((v) => `<span style="position:absolute;left:${left}px;right:0;bottom:${bottom + Y(v)}px;border-top:1px ${v ? "dashed" : "solid"} var(--divider)"></span><span style="position:absolute;left:0;bottom:${bottom + Y(v) - 6}px;font-size:10.5px;font-weight:700;color:var(--muted)">${inrK(v)}</span>`).join("");
  const bars = keys.map((k, i) => {
    const v = vals[i], x = left + i * (bw + gap), bh = Math.max(5, Y(v)), fut = k > nowKey, now = k === nowKey;
    const lvl = 2 + Math.min(3, Math.floor((v / max) * 4));
    const sv = f.all ? 0 : subMonth(f.s, k);
    const r = ph ? "7px 7px 3px 3px" : "13px 13px 5px 5px";
    const tint = (p) => `color-mix(in oklch, var(--card-${f.color}) ${p}%, var(--surface))`;
    const body = fut ? `border:1.5px dashed ${f.all ? "var(--heat-4)" : tint(70)};background:${f.all ? "oklch(0.95 0.03 150 / 0.4)" : tint(6)}` : `background:${f.all ? `var(--heat-${lvl})` : tint(20)}${i === peak && f.all ? ";box-shadow:0 12px 24px var(--trend-peak-shadow)" : ""}`;
    const over = sv ? `<div class="textured" style="position:absolute;left:0;right:0;bottom:0;height:${Math.max(4, Y(sv))}px;border-radius:${r};background:linear-gradient(160deg,var(--card-${f.color}),var(--card-${f.color}-from));${fut ? "opacity:0.55" : ""}">${rings(60, 120, { stroke: "var(--rings-light)", opacity: 0.14, first: 18, step: 12 })}</div>` : "";
    const label = ph ? "" : `<span style="position:absolute;left:${x - 14}px;width:${bw + 28}px;bottom:${bottom + bh + 7}px;text-align:center;line-height:1.2"><b style="display:block;font-size:12px;font-weight:800;color:${fut ? "var(--muted)" : "var(--fg)"}">${f.all ? inrK(v) : sv ? inr(sv) : ""}</b>${!f.all && sv ? `<span style="font-size:10px;font-weight:700;color:var(--muted)">of ${inrK(v)}</span>` : ""}</span>`;
    const tag = i === peak && f.all && !ph ? `<span class="pill pill-ink" style="position:absolute;left:${x + bw / 2}px;bottom:${bottom + bh + 40}px;transform:translateX(-50%);padding:2px 8px;font-size:9.5px">Peak</span>` : "";
    return `<div class="textured" style="position:absolute;left:${x}px;bottom:${bottom}px;width:${bw}px;height:${bh}px;border-radius:${r};overflow:hidden;${body}${now ? `;outline:2.5px solid ${f.all ? "var(--accent)" : `var(--card-${f.color})`};outline-offset:3px` : ""}">${fut ? "" : rings(60, 200, { stroke: lvl >= 4 && f.all ? "var(--rings-light)" : f.all ? "var(--rings-ink)" : `var(--card-${f.color})`, opacity: 0.14, first: 22, step: 14 })}${over}</div>${label}${tag}
      <span style="position:absolute;left:${x}px;width:${bw}px;bottom:6px;text-align:center;font-size:${ph ? 10 : 12}px;font-weight:${now ? 800 : 600};color:${now ? "var(--fg)" : "var(--muted)"}">${ph ? L.monName(k)[0] : L.monName(k)}${!ph && k.endsWith("-01") ? ` ’${k.slice(2, 4)}` : ""}</span>`;
  }).join("");
  const avg = usual ? `<span style="position:absolute;left:${left}px;right:0;bottom:${bottom + Y(usual)}px;border-top:2px dashed ${f.all ? "var(--accent-text)" : `var(--card-${f.color})`};opacity:0.7"></span>${ph ? "" : `<span style="position:absolute;left:${left + 6}px;bottom:${bottom + Y(usual) + 5}px;padding:2px 9px;border-radius:999px;background:var(--surface);border:1px solid var(--surface-line);font-size:11px;font-weight:800;color:${f.all ? "var(--accent-text)" : "var(--fg)"}">${f.all ? "A usual month" : `${f.alias} a month`} ${inr(usual)}</span>`}` : "";
  return `${grid}${bars}${avg}`;
}
export function trendCard(prefix, { w = 1360, h = 330, ph = false } = {}) {
  const keys = ph ? TREND_KEYS.slice(6) : TREND_KEYS;
  const left = ph ? 0 : 50, gap = ph ? 5 : 14, bw = (w - left - gap * (keys.length - 1)) / keys.length;
  const hover = ph ? "" : keys.map((k, i) => { const x = left + i * (bw + gap); const flip = i > keys.length - 4; return `<div class="hov" style="position:absolute;left:${x}px;top:0;bottom:0;width:${bw}px"><div class="hc-wrap" style="top:-8px;${flip ? "right:calc(100% + 8px)" : "left:calc(100% + 8px)"}">${monthCard(k)}</div></div>`; }).join("");
  return `<div style="position:relative;height:${h}px">${SC.heroPanes((f) => trendBars(f, { w, h, ph }))}${hover}</div>`;
}

// ================= B · Spend over two years, a glowing line =================
const cr = (pts) => { let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`; } return d; };
const GLOW_KEYS = L.monthsFrom("2025-01", 24);
export function glowArea(f, { w = 1360, h = 340, ph = false, uid = "g" } = {}) {
  const keys = ph ? GLOW_KEYS.slice(12) : GLOW_KEYS;
  const vals = keys.map(monthTotal), max = niceMax(Math.max(...vals) * 1.12);
  const left = ph ? 6 : 50, right = ph ? 6 : 20, top = 30, bottom = 30;
  const X = (i) => left + (i / (keys.length - 1)) * (w - left - right), Y = (v) => h - bottom - (v / max) * (h - top - bottom);
  const ci = keys.indexOf(nowKey);
  const pts = vals.map((v, i) => [X(i), Y(v)]);
  const past = pts.slice(0, ci + 1), fut = pts.slice(ci);
  const id = `${uid}-${f.id}`;
  const subPts = f.all ? null : keys.map((k, i) => [X(i), Y(subMonth(f.s, k))]);
  const lumps = keys.map((k, i) => {
    const rs = L.renewalRows(`${k}-01`, `${k}-31`).filter((r) => r.s.billingCycle !== "Monthly" && r.status !== "wont" && (r.payment ? r.payment.amount : r.plan) >= 1000).sort((a, b) => b.plan - a.plan);
    return rs[0] ? { i, r: rs[0] } : null;
  }).filter(Boolean);
  const pins = lumps.map(({ i, r }) => { const dim = !f.all && r.s.id !== f.id; const x = X(i), y = Y(vals[i]); return `<line x1="${x}" x2="${x}" y1="${y - 8}" y2="${y - 30}" stroke="var(--fill-strong)" stroke-width="1.5" opacity="${dim ? 0.3 : 1}"></line>`; }).join("");
  const pinIcons = ph ? "" : lumps.map(({ i, r }) => { const dim = !f.all && r.s.id !== f.id; return `<span style="position:absolute;left:${X(i)}px;top:${Y(vals[i]) - 50}px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;opacity:${dim ? 0.3 : 1}">${mono(r.s, 22)}</span><span style="position:absolute;left:${X(i)}px;top:${Y(vals[i]) - 72}px;transform:translateX(-50%);font-size:10.5px;font-weight:800;color:var(--fg);white-space:nowrap;opacity:${dim ? 0.3 : 1}">${r.s.alias}</span>`; }).join("");
  const todayX = X(ci) + (19 / 30) * (X(1) - X(0));
  const svg = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="position:absolute;inset:0;overflow:visible" aria-label="Monthly spend over two years">
    <defs><linearGradient id="ga-${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="oklch(0.72 0.19 145)" stop-opacity="${f.all ? 0.42 : 0.16}"></stop><stop offset="1" stop-color="oklch(0.72 0.19 145)" stop-opacity="0"></stop></linearGradient>
    <filter id="gl-${id}" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="6"></feGaussianBlur></filter>
    ${subPts ? `<linearGradient id="gs-${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--card-${f.color})" stop-opacity="0.55"></stop><stop offset="1" stop-color="var(--card-${f.color})" stop-opacity="0.04"></stop></linearGradient>` : ""}</defs>
    ${ph ? "" : [0, max / 2, max].map((v) => `<line x1="${left}" x2="${w - right}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--divider)" ${v ? 'stroke-dasharray="3 5"' : ""}></line><text x="${left - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="10.5" font-weight="700" fill="var(--muted)">${inrK(v)}</text>`).join("")}
    <path d="${cr(past)} L${past.at(-1)[0]},${h - bottom} L${past[0][0]},${h - bottom} Z" fill="url(#ga-${id})"></path>
    <path d="${cr(past)}" fill="none" stroke="var(--accent)" stroke-width="7" opacity="${f.all ? 0.45 : 0.2}" filter="url(#gl-${id})"></path>
    <path d="${cr(past)}" fill="none" stroke="var(--accent-text)" stroke-width="${f.all ? 3 : 2}" opacity="${f.all ? 1 : 0.45}" stroke-linejoin="round"></path>
    <path d="${cr(fut)}" fill="none" stroke="var(--accent-text)" stroke-width="2.2" stroke-dasharray="6 6" opacity="${f.all ? 0.75 : 0.35}"></path>
    ${subPts ? `<path d="${cr(subPts)} L${subPts.at(-1)[0]},${h - bottom} L${subPts[0][0]},${h - bottom} Z" fill="url(#gs-${id})"></path><path d="${cr(subPts.slice(0, ci + 1))}" fill="none" stroke="var(--card-${f.color})" stroke-width="3"></path><path d="${cr(subPts.slice(ci))}" fill="none" stroke="var(--card-${f.color})" stroke-width="2.2" stroke-dasharray="6 6"></path>` : ""}
    ${pins}
    <line x1="${todayX}" x2="${todayX}" y1="${top - 10}" y2="${h - bottom}" stroke="var(--accent)" stroke-width="2"></line><text x="${todayX + 6}" y="${top - 2}" font-size="11" font-weight="800" fill="var(--accent-text)">Today</text>
    <circle cx="${pts[ci][0]}" cy="${pts[ci][1]}" r="6" fill="var(--accent-text)" stroke="var(--surface)" stroke-width="2.5"></circle>
    ${keys.map((k, i) => (ph ? i % 2 === 0 : true) ? `<text x="${X(i)}" y="${h - 8}" text-anchor="middle" font-size="${ph ? 9.5 : 11}" font-weight="${k === nowKey ? 800 : 600}" fill="${k === nowKey ? "var(--fg)" : "var(--muted)"}">${ph ? L.monName(k)[0] : L.monName(k)}${!ph && k.endsWith("-01") ? ` ’${k.slice(2, 4)}` : ""}</text>` : "").join("")}
  </svg>`;
  return `<div style="position:relative;width:${w}px;height:${h}px;max-width:100%">${svg}${pinIcons}</div>`;
}
export const glowCard = (prefix, o = {}) => SC.heroPanes((f) => glowArea(f, { uid: prefix, ...o }));

// ================= C · 2026, day by day =================
export function yearOfDays({ ph = false, cell = 21, gap = 4 } = {}) {
  if (ph) { cell = 11; gap = 3; }
  const start = ph ? "2026-07-27" : "2025-12-29";
  const end = "2026-12-31";
  const days = [];
  for (let d = start; d <= end; d = L.addDays(d, 1)) days.push(d);
  const rows = L.renewalRows(start, end);
  const byDay = new Map();
  for (const r of rows) (byDay.get(r.date) ?? byDay.set(r.date, []).get(r.date)).push(r);
  const level = (a) => (a < 200 ? 2 : a < 800 ? 3 : a < 2000 ? 4 : 5);
  const cells = days.map((d) => {
    const rs = byDay.get(d) ?? [];
    const inYear = d >= (ph ? "2026-08-01" : "2026-01-01");
    if (!inYear) return `<span style="width:${cell}px;height:${cell}px"></span>`;
    const today = d === L.TODAY;
    if (!rs.length) return `<span class="yd" style="width:${cell}px;height:${cell}px;border-radius:${ph ? 3 : 6}px;background:var(--heat-no-data);${today ? "box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--accent);" : ""}"></span>`;
    const amt = rs.reduce((t, r) => t + (r.payment ? r.payment.amount : r.plan), 0);
    const fut = rs.every((r) => r.status === "upcoming" || r.status === "wont");
    const miss = rs.some((r) => r.status === "missing");
    const cls = `yd has${fut ? " fut" : ""} ${rs.map((r) => `d-${r.s.id}`).join(" ")}`;
    const style = miss ? "background:var(--warning-tint);border:1.5px solid var(--warning)" : fut ? `border:1.5px dashed var(--heat-${level(amt)});background:oklch(0.95 0.03 150 / 0.5)` : `background:var(--heat-${level(amt)})`;
    return `<span class="${cls}" title="${fmt(d)}: ${rs.map((r) => `${r.s.alias} ${inr(r.payment ? r.payment.amount : r.plan)}`).join(", ")}" style="width:${cell}px;height:${cell}px;border-radius:${ph ? 3 : 6}px;${style};transition:opacity 300ms, background 300ms;${today ? "box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--accent);" : ""}"></span>`;
  });
  const weeks = Math.ceil(days.length / 7), col = cell + gap;
  const lab = ph ? 0 : 34;
  const monthStarts = [];
  for (let i = 0; i < days.length; i++) if (days[i].endsWith("-01") && days[i] >= (ph ? "2026-08-01" : "2026-01-01")) monthStarts.push({ k: days[i].slice(0, 7), wk: Math.floor(i / 7) });
  const head = monthStarts.map((m) => `<span style="position:absolute;left:${lab + m.wk * col}px;top:0;font-size:11px;font-weight:800;color:${m.k === nowKey ? "var(--accent-text)" : "var(--muted)"}">${L.monName(m.k)}</span>`).join("");
  const dows = ph ? "" : ["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => `<span style="position:absolute;left:0;top:${20 + i * col + 3}px;font-size:10px;font-weight:700;color:var(--muted)">${d}</span>`).join("");
  const totals = monthStarts.map((m, j) => { const endWk = j < monthStarts.length - 1 ? monthStarts[j + 1].wk : weeks; return `<span style="position:absolute;left:${lab + m.wk * col}px;width:${(endWk - m.wk) * col - gap}px;top:0;height:${ph ? 22 : 26}px;border-radius:8px;background:${m.k > nowKey ? "transparent" : "var(--fill)"};border:${m.k > nowKey ? "1.5px dashed var(--fill-strong)" : "0"};display:flex;align-items:center;justify-content:center;font-size:${ph ? 9.5 : 11.5}px;font-weight:800;color:${m.k > nowKey ? "var(--muted)" : "var(--fg)"}">${ph ? inrK(monthTotal(m.k)) : inr(monthTotal(m.k))}</span>`; }).join("");
  return `<div style="position:relative;height:${20 + 7 * col}px;max-width:100%">${head}${dows}<div style="position:absolute;left:${lab}px;top:20px;display:grid;grid-template-rows:repeat(7,${cell}px);grid-auto-flow:column;grid-auto-columns:${cell}px;gap:${gap}px">${cells.join("")}</div></div>
    <div style="position:relative;height:${ph ? 22 : 26}px;margin-top:8px">${totals}</div>`;
}
export const yearCss = (dsel, id) => (id === "all" ? "" : `${dsel} .yd.has:not(.d-${id}) { opacity: 0.18; } ${dsel} .yd.d-${id} { background: var(--card-${catColor(L.sub(id).category)}); border-color: var(--card-${catColor(L.sub(id).category)}); } ${dsel} .yd.fut.d-${id} { opacity: 0.6; }`);

// ================= D · By category, month by month =================
export function stackedCats({ w = 1360, h = 330, ph = false } = {}) {
  const keys = ph ? TREND_KEYS.slice(6) : TREND_KEYS;
  const cats = L.byCategory();
  const per = keys.map((k) => cats.map((c) => ({ c, v: L.SUBS.filter((s) => s.category === c.name).reduce((t, s) => t + subMonth(s, k), 0) })));
  const tot = per.map((p) => p.reduce((t, x) => t + x.v, 0)), max = niceMax(Math.max(...tot));
  const left = ph ? 0 : 50, top = 30, bottom = 30, plot = h - top - bottom, gap = ph ? 5 : 16;
  const bw = (w - left - gap * (keys.length - 1)) / keys.length, Y = (v) => (v / max) * plot;
  const grid = ph ? "" : [0, max / 2, max].map((v) => `<span style="position:absolute;left:${left}px;right:0;bottom:${bottom + Y(v)}px;border-top:1px ${v ? "dashed" : "solid"} var(--divider)"></span><span style="position:absolute;left:0;bottom:${bottom + Y(v) - 6}px;font-size:10.5px;font-weight:700;color:var(--muted)">${inrK(v)}</span>`).join("");
  const cols = keys.map((k, i) => {
    const x = left + i * (bw + gap), fut = k > nowKey, now = k === nowKey;
    const segs = per[i].filter((p) => p.v > 0).map((p) => `<span class="scg sc-${catSlug(p.c.name)}" style="display:block;flex:0 0 ${Math.max(2, Y(p.v) - 2)}px;background:linear-gradient(160deg,var(--card-${p.c.color}),var(--card-${p.c.color}-from));border-radius:4px;transition:opacity 300ms" title="${p.c.name} ${inr(p.v)}"></span>`).join("");
    return `<div class="textured" style="position:absolute;left:${x}px;bottom:${bottom}px;width:${bw}px;height:${Y(tot[i])}px;display:flex;flex-direction:column-reverse;gap:2px;border-radius:${ph ? "7px 7px 3px 3px" : "12px 12px 5px 5px"};overflow:hidden;${fut ? "opacity:0.45;" : ""}${now ? "outline:2.5px solid var(--accent);outline-offset:3px;" : ""}">${segs}${rings(60, 200, { stroke: "var(--rings-light)", opacity: 0.1, first: 22, step: 14 })}</div>
      ${ph ? "" : `<b style="position:absolute;left:${x - 12}px;width:${bw + 24}px;bottom:${bottom + Y(tot[i]) + 7}px;text-align:center;font-size:12px;font-weight:800;color:${fut ? "var(--muted)" : "var(--fg)"}">${inrK(tot[i])}</b>`}
      <span style="position:absolute;left:${x}px;width:${bw}px;bottom:6px;text-align:center;font-size:${ph ? 10 : 12}px;font-weight:${now ? 800 : 600};color:${now ? "var(--fg)" : "var(--muted)"}">${ph ? L.monName(k)[0] : L.monName(k)}</span>`;
  }).join("");
  return `<div style="position:relative;height:${h}px">${grid}${cols}${ph ? "" : `<span style="position:absolute;left:${left + 12 * (bw + gap) - gap / 2}px;top:${top - 18}px;bottom:${bottom}px;border-left:1.5px dashed var(--fill-strong)"></span><span style="position:absolute;left:${left + 12 * (bw + gap) + 4}px;top:${top - 22}px;font-size:10.5px;font-weight:800;color:var(--muted)">Expected</span>`}</div>`;
}
export const catCss = (dsel, id) => (id === "all" ? "" : `${dsel} .scg:not(.sc-${catSlug(L.sub(id).category)}) { opacity: 0.16; }`);
export const catLegend = () => `<span class="legend">${L.byCategory().map((c) => `<span><i style="background:var(--card-${c.color})"></i>${c.name}</span>`).join("")}</span>`;

// ================= E · Every payment (a beeswarm) =================
export function beeswarm({ w = 1360, h = 230, ph = false } = {}) {
  const start = ph ? "2026-01-01" : "2024-11-01", end = ph ? "2027-01-31" : "2027-02-28";
  const days = L.daysBetween(start, end);
  const left = ph ? 8 : 20, right = ph ? 8 : 20, mid = ph ? h / 2 - 10 : 78;
  const X = (iso) => left + (L.daysBetween(start, iso) / days) * (w - left - right);
  const evs = L.renewalRows(start, end).map((r) => ({ r, a: r.payment ? r.payment.amount : r.plan }));
  const maxA = Math.max(...evs.map((e) => e.a));
  const R = (a) => (ph ? 2.2 + 6 * Math.sqrt(a / maxA) : 3.6 + 13 * Math.sqrt(a / maxA));
  const placed = [];
  for (const e of [...evs].sort((a, b) => b.a - a.a)) {
    const x = X(e.r.date), r = R(e.a);
    let y = mid;
    for (let k = 0; k < 400; k++) {
      const off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 1.2;
      const yy = mid + off;
      if (placed.every((p) => Math.hypot(p.x - x, p.y - yy) >= p.rad + r + 1)) { y = yy; break; }
    }
    placed.push({ ...e, x, y, rad: r });
  }
  const dot = (p) => {
    const s = p.r.s, c = `var(--card-${catColor(s.category)})`;
    const st = p.r.status;
    const attr = st === "paid" ? `fill="${c}"` : st === "missing" ? `fill="var(--warning-tint)" stroke="var(--warning)" stroke-width="2"` : st === "wont" ? `fill="none" stroke="var(--fill-strong)" stroke-width="1.5" stroke-dasharray="2 2"` : `fill="var(--surface)" stroke="${c}" stroke-width="1.6"`;
    return `<circle class="bp bp-${s.id}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.rad.toFixed(1)}" ${attr} style="transition:opacity 300ms"><title>${s.alias} · ${fmtY(p.r.date)} · ${inr(p.a)}</title></circle>`;
  };
  const big = ph ? [] : [...placed].filter((p) => p.r.status === "paid").sort((a, b) => b.a - a.a).filter((p, i, arr) => arr.findIndex((q) => q.r.s === p.r.s) === i).slice(0, 4);
  const spread = Math.max(...placed.map((p) => Math.abs(p.y - mid) + p.rad));
  const labels = big.sort((a, b) => a.x - b.x).map((p, j) => { const ly = mid + spread + 22 + (j % 2) * 15; return `<g class="bp bp-${p.r.s.id}"><line x1="${p.x}" x2="${p.x}" y1="${p.y + p.rad + 2}" y2="${ly - 11}" stroke="var(--fill-strong)" stroke-width="1"></line><text x="${p.x}" y="${ly}" text-anchor="middle" font-size="11" font-weight="800" fill="var(--fg)">${p.r.s.alias} ${inr(p.a)}</text></g>`; }).join("");
  const months = [];
  for (let k = start.slice(0, 7); k <= end.slice(0, 7); k = L.monthKey(L.addMonthsUTC(`${k}-01`, 1))) months.push(k);
  const ticks = months.map((k, j) => `<line x1="${X(`${k}-01`)}" x2="${X(`${k}-01`)}" y1="${h - 30}" y2="${h - 24}" stroke="var(--fill-strong)"></line>${j % (ph ? 3 : 2) === 0 ? `<text x="${X(`${k}-01`) + 2}" y="${h - 8}" font-size="${ph ? 9.5 : 11}" font-weight="700" fill="var(--muted)">${L.monName(k)}${k.endsWith("-01") ? ` ’${k.slice(2, 4)}` : ""}</text>` : ""}`).join("");
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display:block;overflow:visible" aria-label="Every payment, sized by amount">
    <line x1="${left}" x2="${w - right}" y1="${h - 30}" y2="${h - 30}" stroke="var(--divider)"></line>${ticks}
    <rect x="${X(L.TODAY)}" y="0" width="${w - right - X(L.TODAY)}" height="${h - 30}" fill="oklch(0.95 0.03 150 / 0.35)" rx="12"></rect>
    <line x1="${X(L.TODAY)}" x2="${X(L.TODAY)}" y1="0" y2="${h - 30}" stroke="var(--accent)" stroke-width="2"></line><text x="${X(L.TODAY) + 6}" y="14" font-size="11" font-weight="800" fill="var(--accent-text)">Today</text>
    ${placed.map(dot).join("")}${labels}</svg>`;
}
export const beeCss = (dsel, id) => (id === "all" ? "" : `${dsel} .bp:not(.bp-${id}) { opacity: 0.12; } ${dsel} circle.bp-${id} { stroke: var(--fg); stroke-width: 1.5; }`);

// ================= F · Lifelines =================
export function lifelines({ w = 1360, rowH = 36, ph = false } = {}) {
  const start = ph ? "2025-01-01" : "2023-01-01", end = "2027-04-30", days = L.daysBetween(start, end);
  const labelW = ph ? 78 : 200, right = ph ? 6 : 16;
  const X = (iso) => labelW + (Math.max(0, L.daysBetween(start, iso)) / days) * (w - labelW - right);
  const top = 26, H = top + SC.ORDER.length * rowH + 6;
  const years = []; for (let y = Number(start.slice(0, 4)); y <= 2027; y++) years.push(`${y}-01-01`);
  const grid = years.map((d) => `<line x1="${X(d)}" x2="${X(d)}" y1="${top - 6}" y2="${H}" stroke="var(--divider)" stroke-dasharray="2 5"></line><text x="${X(d) + 4}" y="${top - 10}" font-size="11" font-weight="800" fill="var(--muted)">${d.slice(0, 4)}</text>`).join("");
  const lanes = SC.ORDER.map((s, i) => {
    const y = top + i * rowH + rowH / 2, c = `var(--card-${catColor(s.category)})`, bh = ph ? 10 : 14;
    const s0 = s.startDate < start ? start : s.startDate;
    const stop = s.status === "Paused" ? s.lastDate : s.status === "Cancelled" ? s.endDate : L.TODAY;
    const pays = L.paymentsFor(s).filter((p) => p.date >= start);
    const ch = L.priceChanges(s).filter((x) => x.date >= start);
    const fut = L.isOn(s) ? `<line x1="${X(stop)}" x2="${X(end)}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="${bh - 4}" stroke-linecap="round" stroke-opacity="0.22"></line><line x1="${X(stop)}" x2="${X(end)}" y1="${y}" y2="${y}" stroke="${c}" stroke-width="1.5" stroke-dasharray="4 5"></line>` : s.status === "Paused" ? `<line x1="${X(stop)}" x2="${X(L.TODAY)}" y1="${y}" y2="${y}" stroke="var(--fill-strong)" stroke-width="2" stroke-dasharray="2 4"></line><text x="${X(L.TODAY) + 8}" y="${y + 4}" font-size="10.5" font-weight="800" fill="var(--muted)">Paused</text>` : `<circle cx="${X(stop)}" cy="${y}" r="${bh / 2 + 2}" fill="var(--surface)" stroke="${c}" stroke-width="2"></circle><path d="M${X(stop) - 3},${y - 3} L${X(stop) + 3},${y + 3} M${X(stop) + 3},${y - 3} L${X(stop) - 3},${y + 3}" stroke="${c}" stroke-width="1.8" stroke-linecap="round"></path>${ph ? "" : `<text x="${X(stop) + 14}" y="${y + 4}" font-size="10.5" font-weight="800" fill="var(--muted)">Cancelled ${fmt(stop)}</text>`}`;
    const next = L.isOn(s) ? `<rect x="${X(L.nextRenewal(s)) - 5}" y="${y - 5}" width="10" height="10" rx="2" transform="rotate(45 ${X(L.nextRenewal(s))} ${y})" fill="var(--surface)" stroke="${c}" stroke-width="2"></rect>` : "";
    return `<g class="lf lf-${s.id}" style="transition:opacity 300ms"><rect class="lfbg" x="0" y="${y - rowH / 2 + 2}" width="${w}" height="${rowH - 4}" rx="10" fill="transparent"></rect>
      <rect x="${X(s0)}" y="${y - bh / 2}" width="${Math.max(4, X(stop) - X(s0))}" height="${bh}" rx="${bh / 2}" fill="${c}"></rect>
      ${pays.map((p) => `<circle cx="${X(p.date)}" cy="${y}" r="${ph ? 1.4 : 2}" fill="oklch(1 0 0 / 0.75)"></circle>`).join("")}
      ${ch.map((x) => `<path d="M${X(x.date)},${y - bh / 2 - 3} l-5,-8 l10,0 Z" fill="var(--negative)"></path>${ph ? "" : `<text x="${X(x.date)}" y="${y - bh / 2 - 14}" text-anchor="middle" font-size="10" font-weight="800" fill="var(--negative)">+${inr(x.to - x.from)}</text>`}`).join("")}
      ${fut}${next}
      <rect x="2" y="${y - (ph ? 9 : 11)}" width="${ph ? 18 : 22}" height="${ph ? 18 : 22}" rx="${ph ? 5 : 7}" fill="${c}"></rect><text x="${2 + (ph ? 9 : 11)}" y="${y + 4}" text-anchor="middle" font-size="${ph ? 10 : 11}" font-weight="800" fill="var(--on-card)">${s.alias[0]}</text>
      <text x="${ph ? 26 : 32}" y="${ph ? y + 4 : y - 1}" font-size="${ph ? 10.5 : 12.5}" font-weight="800" fill="${L.isOn(s) ? "var(--fg)" : "var(--muted)"}">${ph ? s.alias.slice(0, 8) : s.alias}</text>${ph ? "" : `<text x="32" y="${y + 13}" font-size="10.5" font-weight="600" fill="var(--muted)">${inr(s.amount)} · ${s.billingCycle.toLowerCase()} · since ${L.monName(s.startDate.slice(0, 7))} ’${s.startDate.slice(2, 4)}</text>`}</g>`;
  }).join("");
  return `<svg viewBox="0 0 ${w} ${H}" width="100%" height="${H}" style="display:block;overflow:visible" aria-label="Each subscription's life, from its start">${grid}${lanes}<line x1="${X(L.TODAY)}" x2="${X(L.TODAY)}" y1="${top - 14}" y2="${H}" stroke="var(--accent)" stroke-width="2"></line><text x="${X(L.TODAY) + 6}" y="${top - 16}" font-size="11" font-weight="800" fill="var(--accent-text)">Today</text></svg>`;
}
export const lifeCss = (dsel, id) => (id === "all" ? "" : `${dsel} .lf:not(.lf-${id}) { opacity: 0.2; } ${dsel} .lf-${id} .lfbg { fill: var(--fill); }`);

// ================= G · How you got to the monthly total (waterfall) =================
export function waterfallSteps() {
  const start = L.addMonthsUTC(L.TODAY, -12);
  const steps = [], ghosts = [];
  for (const s of L.SUBS) {
    const step = L.STEP[s.billingCycle];
    if (s.startDate > start && s.startDate <= L.TODAY) steps.push({ s, date: s.startDate, d: L.priceOn(s, s.startDate) / step, kind: "started" });
    let prev = null;
    for (const [from, amt] of s.prices ?? []) {
      if (prev != null && from > start && from <= L.TODAY) (amt === s.amount ? steps : ghosts).push({ s, date: from, d: (amt - prev) / step, kind: "price", from: prev, to: amt });
      prev = amt;
    }
    if (s.status === "Paused") { const pd = L.addMonthsUTC(s.lastDate, step); if (pd > start && pd <= L.TODAY) steps.push({ s, date: pd, d: -L.priceOn(s, s.lastDate) / step, kind: "paused" }); }
    if (s.status === "Cancelled" && s.endDate > start && s.endDate <= L.TODAY) steps.push({ s, date: s.endDate, d: -L.priceOn(s, s.endDate) / step, kind: "cancelled" });
  }
  steps.sort((a, b) => (a.date < b.date ? -1 : 1));
  const startTotal = L.MONTHLY - steps.reduce((t, x) => t + x.d, 0);
  return { start, startTotal, steps, ghosts };
}
export function waterfall({ w = 1360, h = 360, ph = false } = {}) {
  const { start, startTotal, steps, ghosts } = waterfallSteps();
  const cols = [{ kind: "start", v: startTotal }, ...steps, { kind: "end", v: L.MONTHLY }];
  let run = startTotal;
  const geo = cols.map((c) => { if (c.kind === "start" || c.kind === "end") return { ...c, lo: 0, hi: c.v }; const lo = Math.min(run, run + c.d), hi = Math.max(run, run + c.d); run += c.d; return { ...c, lo, hi, after: run }; });
  const minV = Math.floor((Math.min(...geo.filter((g) => g.kind !== "start" && g.kind !== "end").map((g) => g.lo), startTotal) - 600) / 500) * 500;
  const maxV = Math.ceil((Math.max(...geo.map((g) => g.hi)) + 400) / 500) * 500;
  const top = 34, bottom = ph ? 34 : 64, left = ph ? 4 : 56;
  const Y = (v) => h - bottom - ((Math.max(v, minV) - minV) / (maxV - minV)) * (h - top - bottom);
  const n = cols.length, slot = (w - left) / n, bw = Math.min(ph ? 30 : 118, slot * 0.62);
  const kindWord = { started: "started", price: "price up", paused: "paused", cancelled: "cancelled" };
  const bars = geo.map((g, i) => {
    const x = left + i * slot + (slot - bw) / 2;
    const fixed = g.kind === "start" || g.kind === "end";
    const up = !fixed && g.d > 0;
    const fill = fixed ? (g.kind === "end" ? "linear-gradient(160deg,var(--card-emerald-from),var(--card-emerald-to))" : "linear-gradient(160deg,var(--card-onyx),var(--card-onyx-from))") : up ? "linear-gradient(160deg,oklch(0.66 0.15 28),oklch(0.52 0.16 25))" : "linear-gradient(160deg,oklch(0.68 0.14 150),oklch(0.5 0.12 152))";
    const yTop = Y(g.hi), yBot = fixed ? h - bottom : Y(g.lo);
    const amt = fixed ? inr(g.v) : `${up ? "+" : "−"}${inr(Math.abs(g.d))}`;
    const cls = fixed ? "wf wf-fixed" : `wf wf-step wf-${g.s.id}`;
    const label = ph ? (fixed ? `<b style="position:absolute;left:${x - 20}px;width:${bw + 40}px;top:${yTop - 18}px;text-align:center;font-size:10px;font-weight:800">${inrK(g.v)}</b>` : "") : `<b style="position:absolute;left:${x - 30}px;width:${bw + 60}px;top:${yTop - 22}px;text-align:center;font-size:${fixed ? 15 : 13}px;font-weight:800;color:${fixed ? "var(--fg)" : up ? "var(--negative)" : "var(--positive)"}">${amt}</b>`;
    const cap = ph ? `<span style="position:absolute;left:${x + bw / 2}px;bottom:${8}px;transform:translateX(-50%);display:flex">${fixed ? `<b style="font-size:9.5px;color:var(--muted)">${g.kind === "start" ? "Then" : "Now"}</b>` : mono(g.s, 16)}</span>` : `<div style="position:absolute;left:${left + i * slot}px;width:${slot}px;bottom:4px;display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center">${fixed ? `<b style="font-size:12.5px">${g.kind === "start" ? `${L.monName(start.slice(0, 7))} ${start.slice(0, 4)}` : "Now"}</b><span style="font-size:11px;font-weight:600;color:var(--muted)">${g.kind === "start" ? "a month, a year ago" : "a month today"}</span>` : `<span class="row" style="gap:6px">${mono(g.s, 18)}<b style="font-size:12px">${g.s.alias}</b></span><span style="font-size:11px;font-weight:600;color:var(--muted)">${kindWord[g.kind]} · ${fmt(g.date)}</span>`}</div>`;
    const link = i < n - 1 ? `<span style="position:absolute;left:${x + bw}px;width:${slot - bw}px;top:${Y(fixed ? g.v : g.after)}px;border-top:1.5px dashed var(--fill-strong)"></span>` : "";
    return `<div class="${cls}" style="transition:opacity 300ms"><div class="textured" style="position:absolute;left:${x}px;width:${bw}px;top:${yTop}px;height:${Math.max(4, yBot - yTop)}px;border-radius:${fixed ? (ph ? "7px 7px 3px 3px" : "14px 14px 5px 5px") : ph ? "5px" : "10px"};background:${fill};box-shadow:${fixed ? "var(--tile-shadow)" : "0 6px 14px oklch(0 0 0 / 0.12)"}">${rings(120, 260, { stroke: "var(--rings-light)", opacity: 0.12, first: 30, step: 18 })}</div>${label}${cap}${link}</div>`;
  }).join("");
  const axis = ph ? "" : [minV, (minV + maxV) / 2, maxV].map((v) => `<span style="position:absolute;left:${left}px;right:0;top:${Y(v)}px;border-top:1px ${v === minV ? "solid" : "dashed"} var(--divider)"></span><span style="position:absolute;left:0;top:${Y(v) - 8}px;font-size:10.5px;font-weight:700;color:var(--muted)">${inrK(v)}</span>`).join("") + `<span style="position:absolute;left:${left - 30}px;top:${Y(minV) - 4}px;font-size:9.5px;font-weight:800;color:var(--muted)">≈</span>`;
  const ghost = ph || !ghosts.length ? "" : `<div class="row" style="position:absolute;right:0;top:0;gap:8px;padding:6px 12px;border-radius:12px;background:var(--warning-tint);font-size:11.5px;font-weight:700;color:var(--warning-text)">${mono(ghosts[0].s, 18)}${ghosts[0].s.alias} charged ${inr(ghosts[0].to - ghosts[0].from)} more on ${fmt(ghosts[0].date)}, but its plan still says ${inr(ghosts[0].from)}, so it isn't counted.</div>`;
  return `<div style="position:relative;height:${h}px">${axis}${bars}${ghost}</div>${ph ? "" : `<p class="card-note" style="margin-top:4px">The scale starts at ${inr(minV)} so the changes are visible. Prices are a month each; yearly and quarterly ones are spread over their months.</p>`}`;
}
export const waterCss = (dsel, id) => (id === "all" ? "" : `${dsel} .wf-step:not(.wf-${id}) { opacity: 0.18; }`);
export function waterCaption(f) {
  const { steps, startTotal } = waterfallSteps();
  if (f.all) return `${inr(startTotal)} a month a year ago, <b>${inr(L.MONTHLY)}</b> now: ${steps.filter((s) => s.d > 0).length} changes added ${inr(steps.filter((s) => s.d > 0).reduce((t, s) => t + s.d, 0))}, ${steps.filter((s) => s.d < 0).length} took off ${inr(-steps.filter((s) => s.d < 0).reduce((t, s) => t + s.d, 0))}.`;
  const mine = steps.filter((x) => x.s.id === f.id);
  if (!mine.length) return `${f.alias} hasn't changed your monthly total in the last 12 months.`;
  const net = mine.reduce((t, x) => t + x.d, 0);
  return `${f.alias} ${net >= 0 ? "added" : "took off"} <b>${inr(Math.abs(net))}</b> a month in the last 12 months: ${mine.map((x) => `${{ started: "started", price: "price up", paused: "paused", cancelled: "cancelled" }[x.kind]} ${fmt(x.date)}`).join(", ")}.`;
}

// ================= H · Lifetime cost =================
export function lifetime({ ph = false } = {}) {
  const subs = [...L.SUBS].sort((a, b) => L.paidSoFar(b) - L.paidSoFar(a));
  const max = L.paidSoFar(subs[0]);
  const spark = (s) => { const pays = L.paymentsFor(s).slice().reverse(); if (pays.length < 2) return ""; const mx = Math.max(...pays.map((p) => p.amount)), mn = Math.min(...pays.map((p) => p.amount)); const W = 96, H = 22; const pts = pays.map((p, i) => [(i / (pays.length - 1)) * W, H - 3 - ((p.amount - mn) / (mx - mn || 1)) * (H - 8)]); let d = `M${pts[0][0]},${pts[0][1]}`; for (let i = 1; i < pts.length; i++) d += ` H${pts[i][0].toFixed(1)} V${pts[i][1].toFixed(1)}`; return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--card-${catColor(s.category)})" stroke-width="2"></path></svg>`; };
  return `<div style="display:flex;flex-direction:column;gap:${ph ? 7 : 9}px">${subs.map((s) => {
    const paid = L.paidSoFar(s), n = L.paymentsFor(s).length, c = catColor(s.category);
    return `<div class="lt lt-${s.id}" style="display:grid;grid-template-columns:${ph ? "84px minmax(0,1fr)" : "190px minmax(0,1fr) 230px 110px"};gap:${ph ? 8 : 16}px;align-items:center;transition:opacity 300ms;${L.isOn(s) ? "" : "opacity:0.75"}">
      <span class="row" style="gap:${ph ? 6 : 10}px;min-width:0">${mono(s, ph ? 20 : 26)}<b style="font-size:${ph ? 11.5 : 13}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.alias}</b></span>
      <div style="position:relative;height:${ph ? 20 : 28}px;border-radius:999px;background:var(--fill)"><div class="textured" style="position:absolute;left:0;top:0;bottom:0;width:${Math.max(6, (paid / max) * 100)}%;border-radius:999px;background:linear-gradient(90deg,var(--card-${c}-from),var(--card-${c}));display:flex;align-items:center;justify-content:flex-end;padding-right:${ph ? 6 : 10}px;${L.isOn(s) ? "" : "filter:grayscale(0.7)"}">${rings(400, 28, { stroke: "var(--rings-light)", opacity: 0.12, first: 14, step: 10 })}${paid / max > 0.22 ? `<b style="font-size:${ph ? 10 : 12}px;color:var(--on-card)">${inr(paid)}</b>` : ""}</div>${paid / max <= 0.22 ? `<b style="position:absolute;left:calc(${Math.max(6, (paid / max) * 100)}% + 8px);top:50%;transform:translateY(-50%);font-size:${ph ? 10 : 12}px">${inr(paid)}</b>` : ""}</div>
      ${ph ? "" : `<span style="font-size:12px;font-weight:600;color:var(--muted)">${n} payments · since ${L.monName(s.startDate.slice(0, 7))} ${s.startDate.slice(0, 4)}${L.isOn(s) ? "" : ` · ${s.status.toLowerCase()}`}</span><span style="display:flex;justify-content:flex-end">${spark(s)}</span>`}
    </div>`;
  }).join("")}</div>`;
}
export const lifeTotal = () => L.SUBS.reduce((t, s) => t + L.paidSoFar(s), 0);
export const lifetimeCss = (dsel, id) => (id === "all" ? "" : `${dsel} .lt:not(.lt-${id}) { opacity: 0.22; }`);
export function lifetimeCaption(f) {
  const tot = lifeTotal();
  if (f.all) return `You've paid <b>${inr(tot)}</b> across ${L.SUBS.length} subscriptions since Dec 2022. ${L.SUBS.slice().sort((a, b) => L.paidSoFar(b) - L.paidSoFar(a))[0].alias} is the biggest at ${inr(Math.max(...L.SUBS.map(L.paidSoFar)))}.`;
  return `${f.alias}: <b>${inr(f.paidSoFar)}</b> over ${f.payCount} payments since ${fmtY(f.since)}, ${L.pct(f.paidSoFar, tot)} of everything you've paid for subscriptions.`;
}
