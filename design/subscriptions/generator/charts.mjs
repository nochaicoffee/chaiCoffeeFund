// Six chart widgets for the carousel directions. Each one follows the pick: it either draws the picked
// subscription on top (one pane per pick) or lights up its part and dims the rest (CSS classes).
import * as L from "./lib.mjs";
import * as SC from "./selcore.mjs";
const { inr, inrK, fmt, fmtY, mono, I } = L;
const nowKey = L.TODAY.slice(0, 7);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
export const catSlug = slug;

/** A month's spend: paid for past months, paid plus to-come for this month, expected after. */
export const monthTotal = (k) => (k < nowKey ? L.paidByMonth(k) : k === nowKey ? L.paidByMonth(k) + L.expectedByMonth(k) : L.expectedByMonth(k));
export function subMonth(s, k) {
  const paid = L.paymentsFor(s).filter((p) => p.date.startsWith(k)).reduce((t, p) => t + p.amount, 0);
  const future = k >= nowKey && L.isOn(s) ? L.renewalsBetween(L.addDays(L.TODAY, 1), `${k}-31`, [s]).filter((r) => r.date.startsWith(k)).reduce((t, r) => t + r.amount, 0) : 0;
  return paid + future;
}
const polar = (c, r, deg) => [c + r * Math.cos((deg * Math.PI) / 180), c + r * Math.sin((deg * Math.PI) / 180)];
const sector = (c, r0, r1, a0, a1) => { const [x0, y0] = polar(c, r0, a0), [x1, y1] = polar(c, r1, a0), [x2, y2] = polar(c, r1, a1), [x3, y3] = polar(c, r0, a1); return `M${x0.toFixed(1)},${y0.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)} A${r1},${r1} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} A${r0},${r0} 0 0 0 ${x0.toFixed(1)},${y0.toFixed(1)} Z`; };

// ---------- 1 · Radial month clock ----------
export function radialClock(f, { size = 440 } = {}) {
  const c = size / 2, r0 = size * 0.17, rmax = size / 2 - 34;
  const ks = L.monthsFrom("2026-01", 12);
  const vals = ks.map(monthTotal), max = Math.max(...vals);
  const R = (v) => r0 + (v / max) * (rmax - r0);
  const bars = ks.map((k, i) => {
    const a0 = -90 + i * 30 + 2.5, a1 = a0 + 25, v = vals[i], fut = k > nowKey, now = k === nowKey;
    const lvl = 2 + Math.min(3, Math.floor((v / max) * 4));
    const base = `<path d="${sector(c, r0, R(v), a0, a1)}" fill="${fut ? "none" : `var(--heat-${f.all ? lvl : 2})`}" stroke="${fut ? "var(--heat-4)" : now ? "var(--accent)" : "none"}" stroke-width="${now ? 2.5 : 1.5}" ${fut ? 'stroke-dasharray="4 4"' : ""}></path>`;
    const sv = f.all ? 0 : subMonth(f.s, k);
    const over = sv ? `<path d="${sector(c, r0, R(sv), a0, a1)}" fill="var(--card-${f.color})" ${fut ? 'fill-opacity="0.45"' : ""}></path>` : "";
    const [lx, ly] = polar(c, rmax + 18, (a0 + a1) / 2);
    const [vx, vy] = polar(c, R(v) - 16, (a0 + a1) / 2);
    return `${base}${over}<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="${now ? 800 : 700}" fill="${now ? "var(--fg)" : "var(--muted)"}">${L.monName(k)}</text>${v === max ? `<text x="${vx.toFixed(1)}" y="${(vy + 4).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="800" fill="${f.all ? "var(--on-accent)" : "var(--heat-ink)"}">${inrK(v)}</text>` : ""}`;
  }).join("");
  const year = vals.reduce((a, b) => a + b, 0);
  const subYear = f.all ? 0 : ks.reduce((t, k) => t + subMonth(f.s, k), 0);
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="max-width:100%;display:block" aria-label="Each month of 2026, round a clock">
    ${[0.33, 0.66, 1].map((q) => `<circle cx="${c}" cy="${c}" r="${r0 + q * (rmax - r0)}" fill="none" stroke="var(--divider)" stroke-dasharray="2 5"></circle>`).join("")}${bars}
    <text x="${c}" y="${c - 6}" text-anchor="middle" font-size="${size / 17}" font-weight="800" fill="var(--fg)">${inr(f.all ? year : subYear)}</text>
    <text x="${c}" y="${c + 14}" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--muted)">${f.all ? "in 2026" : `${f.alias} in 2026`}</text>
    <text x="${c}" y="${c + 30}" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--muted)">${f.all ? `of which ${inr(L.yearPaid(2026))} paid` : `${L.pct(subYear, year)} of the year`}</text></svg>`;
}

// ---------- 2 · Sankey: where the money flows ----------
export function sankey({ w = 1360, h = 380, ph = false } = {}) {
  const payers = L.byPayer(), cats = L.byCategory();
  const subs = [...L.ACTIVE].sort((a, b) => cats.findIndex((c) => c.name === a.category) - cats.findIndex((c) => c.name === b.category) || L.monthlyEq(b) - L.monthlyEq(a));
  const gap = ph ? 6 : 10, col = ph ? [0, w * 0.42, w - 8] : [150, w * 0.47, w - 210], nw = ph ? 8 : 12;
  const k = (h - gap * (subs.length - 1)) / L.MONTHLY;
  const stackNodes = (nodes, val, g) => { const total = nodes.reduce((t, n) => t + val(n), 0) * k + g * (nodes.length - 1); let y = (h - total) / 2; return nodes.map((n) => { const o = { n, y, hgt: val(n) * k }; y += o.hgt + g; return o; }); };
  const pN = stackNodes(payers, (p) => p.v, ph ? 14 : 22), cN = stackNodes(cats, (c) => c.v, ph ? 10 : 18), sN = stackNodes(subs, (s) => L.monthlyEq(s), gap);
  const payerOf = (s) => pN.find((p) => (p.n.kind === "card" ? s.via.card === p.n.id : s.via.account === p.n.id));
  const catOf = (s) => cN.find((c) => c.n.name === s.category);
  const pOff = new Map(pN.map((p) => [p, p.y])), cInOff = new Map(cN.map((c) => [c, c.y])), cOutOff = new Map(cN.map((c) => [c, c.y]));
  const band = (x0, a0, a1, x1, b0, b1) => { const m = (x0 + x1) / 2; return `M${x0},${a0} C${m},${a0} ${m},${b0} ${x1},${b0} L${x1},${b1} C${m},${b1} ${m},${a1} ${x0},${a1} Z`; };
  const bySubPayerOrder = [...subs].sort((a, b) => payers.indexOf(payerOf(a).n) - payers.indexOf(payerOf(b).n) || cats.findIndex((c) => c.name === a.category) - cats.findIndex((c) => c.name === b.category));
  const links = [];
  for (const s of bySubPayerOrder) { const p = payerOf(s), c = catOf(s), v = L.monthlyEq(s) * k; const a0 = pOff.get(p); pOff.set(p, a0 + v); const b0 = cInOff.get(c); cInOff.set(c, b0 + v); links.push(`<path class="sk sk-${s.id}" d="${band(col[0] + nw, a0, a0 + v, col[1], b0, b0 + v)}" fill="var(--card-${L.catColor(s.category)})" fill-opacity="0.28"></path>`); }
  for (const sn of sN) { const s = sn.n, c = catOf(s), v = L.monthlyEq(s) * k; const a0 = cOutOff.get(c); cOutOff.set(c, a0 + v); links.push(`<path class="sk sk-${s.id}" d="${band(col[1] + nw, a0, a0 + v, col[2], sn.y, sn.y + v)}" fill="var(--card-${L.catColor(s.category)})" fill-opacity="0.34"></path>`); }
  const node = (x, y, hh, color) => `<rect x="${x}" y="${y}" width="${nw}" height="${Math.max(hh, 2)}" rx="3" fill="${color}"></rect>`;
  const pLabels = pN.map((p) => `${node(col[0], p.y, p.hgt, `var(--card-${p.n.color})`)}${ph ? "" : `<text x="${col[0] - 10}" y="${p.y + p.hgt / 2 - 2}" text-anchor="end" font-size="12.5" font-weight="800" fill="var(--fg)">${p.n.name}</text><text x="${col[0] - 10}" y="${p.y + p.hgt / 2 + 13}" text-anchor="end" font-size="11" font-weight="600" fill="var(--muted)">${inr(p.n.v)}</text>`}`).join("");
  const cLabels = cN.map((c) => `${node(col[1], c.y, c.hgt, `var(--card-${c.n.color})`)}${ph ? "" : `<text x="${col[1] + nw + 8}" y="${c.y + c.hgt / 2 + 4}" font-size="11.5" font-weight="800" fill="var(--fg)" paint-order="stroke" stroke="var(--surface)" stroke-width="4">${c.n.name} ${inr(c.n.v)}</text>`}`).join("");
  const sLabels = sN.map((sn) => `<g class="sk sk-${sn.n.id}">${node(col[2], sn.y, sn.hgt, `var(--card-${L.catColor(sn.n.category)})`)}<text x="${col[2] + nw + 8}" y="${sn.y + sn.hgt / 2 + 4}" font-size="${ph ? 9.5 : 12}" font-weight="700" fill="var(--fg)">${sn.n.alias}${ph ? "" : ` <tspan fill="var(--muted)" font-weight="600">${inr(L.monthlyEq(sn.n))}</tspan>`}</text></g>`).join("");
  return `<svg viewBox="0 ${-6} ${w + (ph ? 54 : 0)} ${h + 12}" width="100%" height="${h + 12}" style="display:block;overflow:visible" aria-label="Where each rupee goes: card or account, category, subscription">${links.join("")}${pLabels}${cLabels}${sLabels}</svg>`;
}
export const sankeyCss = (dsel, id) => (id === "all" ? "" : `${dsel} .sk:not(.sk-${id}) { opacity: 0.18; } ${dsel} path.sk-${id} { fill-opacity: 0.75; }`);

// ---------- 3 · Streamgraph ----------
const smooth = (pts) => { let d = `M${pts[0][0]},${pts[0][1]}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`; } return d; };
export function streamgraph({ w = 1360, h = 300, ph = false } = {}) {
  const ks = L.monthsFrom("2025-05", 24);
  const cats = L.byCategory().map((c) => c.name);
  const val = (cat, k) => L.SUBS.filter((s) => s.category === cat).reduce((t, s) => t + subMonth(s, k), 0);
  const M = cats.map((c) => ks.map((k) => val(c, k)));
  const tot = ks.map((_, j) => M.reduce((t, row) => t + row[j], 0));
  const max = Math.max(...tot), mid = h / 2 - 10, sc = (h - 50) / max;
  const X = (j) => 10 + (j / (ks.length - 1)) * (w - 20);
  let base = ks.map((_, j) => mid - (tot[j] * sc) / 2);
  const labelled = new Set(cats.slice(0, 3));
  const layers = cats.map((cat, i) => {
    const top = base.map((b, j) => [X(j), b]);
    const bot = base.map((b, j) => [X(j), b + M[i][j] * sc]);
    base = bot.map((p) => p[1]);
    const peak = M[i].indexOf(Math.max(...M[i]));
    const color = L.byCategory().find((c) => c.name === cat).color;
    const thick = M[i][peak] * sc;
    return `<g class="sg sg-${slug(cat)}"><path d="${smooth(top)} L${bot.at(-1)[0].toFixed(1)},${bot.at(-1)[1].toFixed(1)} ${smooth([...bot].reverse()).replace(/^M[^ ]+/, "L" + bot.at(-1)[0].toFixed(1) + "," + bot.at(-1)[1].toFixed(1))} Z" fill="var(--card-${color})" fill-opacity="0.85" stroke="var(--surface)" stroke-width="1"></path>${!ph && thick > 20 && labelled.has(cat) ? `<text x="${X(peak)}" y="${(top[peak][1] + bot[peak][1]) / 2 + 4}" text-anchor="middle" font-size="11.5" font-weight="800" fill="var(--on-card)">${cat}</text>` : ""}</g>`;
  }).join("");
  const today = X(ks.indexOf(nowKey) + 19 / 31);
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display:block" aria-label="Monthly spend by category, flowing over two years">
    ${layers}<rect x="${today}" y="0" width="${w - today}" height="${h - 24}" fill="var(--surface)" fill-opacity="0.55"></rect><line x1="${today}" x2="${today}" y1="0" y2="${h - 24}" stroke="var(--accent)" stroke-width="2"></line><text x="${today + 6}" y="14" font-size="11" font-weight="800" fill="var(--accent-text)">Today</text><text x="${today + 6}" y="28" font-size="10.5" font-weight="600" fill="var(--muted)">expected after this</text>
    ${ks.map((k, j) => (j % (ph ? 6 : 3) === 0 ? `<text x="${X(j)}" y="${h - 6}" text-anchor="${j === 0 ? "start" : "middle"}" font-size="10.5" font-weight="700" fill="var(--muted)">${L.monName(k)}${k.endsWith("-01") || j === 0 ? ` ’${k.slice(2, 4)}` : ""}</text>` : "")).join("")}</svg>`;
}
export const streamCss = (dsel, id) => (id === "all" ? "" : `${dsel} .sg:not(.sg-${slug(L.sub(id).category)}) { opacity: 0.22; }`);

// ---------- 4 · Isometric skyline ----------
export function skyline(f, { w = 1360, h = 300, ph = false } = {}) {
  const ks = L.monthsFrom("2026-01", 12);
  const vals = ks.map(monthTotal), max = Math.max(...vals);
  const n = 12, depth = ph ? 10 : 22, dx = depth * 0.87, dy = depth * 0.5;
  const slot = (w - dx - 10) / n, bw = slot * 0.62, base = h - 30, H = (v) => (v / max) * (h - 80);
  const prism = (x, y0, y1, front, side, top, dash = false) => { const st = dash ? `stroke="var(--heat-4)" stroke-dasharray="3 3" fill-opacity="0.18"` : ""; return `<path d="M${x},${y1} L${x + bw},${y1} L${x + bw},${y0} L${x},${y0} Z" fill="${front}" ${st}></path><path d="M${x + bw},${y1} L${x + bw + dx},${y1 - dy} L${x + bw + dx},${y0 - dy} L${x + bw},${y0} Z" fill="${side}" ${st}></path><path d="M${x},${y1} L${x + dx},${y1 - dy} L${x + bw + dx},${y1 - dy} L${x + bw},${y1} Z" fill="${top}" ${st}></path>`; };
  const bars = ks.map((k, i) => {
    const x = 8 + i * slot, v = vals[i], fut = k > nowKey, sv = f.all ? 0 : subMonth(f.s, k);
    const y1 = base - H(v);
    const body = fut ? prism(x, base, y1, "var(--heat-2)", "var(--heat-3)", "var(--heat-1)", true) : prism(x, base, y1, "var(--heat-3)", "var(--heat-4)", "var(--heat-2)");
    const over = sv ? prism(x, base, base - H(sv), `var(--card-${f.color})`, `var(--card-${f.color}-from)`, `var(--card-${f.color})`) : "";
    const lab = `<text x="${x + bw / 2}" y="${h - 8}" text-anchor="middle" font-size="${ph ? 9.5 : 11.5}" font-weight="${k === nowKey ? 800 : 600}" fill="${k === nowKey ? "var(--fg)" : "var(--muted)"}">${ph ? L.monName(k)[0] : L.monName(k)}</text>`;
    const vl = ph ? "" : `<text x="${x + bw / 2 + dx / 2}" y="${y1 - dy - 8}" text-anchor="middle" font-size="11" font-weight="800" fill="${fut ? "var(--muted)" : "var(--fg)"}">${inrK(v)}</text>`;
    const nowRing = k === nowKey ? `<path d="M${x - 4},${base + 4} L${x + bw + 4},${base + 4}" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"></path>` : "";
    return body + over + lab + vl + nowRing;
  }).join("");
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display:block" aria-label="Each month of 2026 as a building"><path d="M0,${base} L${w},${base}" stroke="var(--divider)"></path><path d="M${dx},${base - dy} L${w},${base - dy}" stroke="var(--divider)" stroke-dasharray="2 4"></path>${bars}</svg>`;
}

// ---------- 5 · Renewal rhythm (ridgeline) ----------
export function ridgeline({ w = 1360, rowH = 30, ph = false } = {}) {
  const start = "2025-11-01", end = "2027-04-30", days = L.daysBetween(start, end);
  const labelW = ph ? 64 : 150, plotW = w - labelW - 10;
  const X = (iso) => labelW + (L.daysBetween(start, iso) / days) * plotW;
  const maxAmt = Math.max(...L.SUBS.map((s) => s.amount));
  const peak = ph ? 36 : 54;
  const rows = SC.ORDER.map((s, i) => {
    const y = 34 + i * rowH;
    const events = L.renewalRows(start, end, [s]).map((r) => ({ d: r.date, a: r.payment ? r.payment.amount : r.plan, fut: r.status === "upcoming" || r.status === "wont", wont: r.status === "wont", miss: r.status === "missing" }));
    const pts = (fut) => { const out = []; for (let t = 0; t <= days; t += 2) { const iso = L.addDays(start, t); let v = 0; for (const e of events) if (e.fut === fut && !e.wont) { const dd = L.daysBetween(e.d, iso); v += Math.sqrt(e.a / maxAmt) * Math.exp(-(dd * dd) / 18); } out.push([X(iso), y - v * peak]); } return out; };
    const col = `var(--card-${L.catColor(s.category)})`;
    const path = (p) => `M${p[0][0]},${y} ` + p.map(([x, yy]) => `L${x.toFixed(1)},${yy.toFixed(1)}`).join(" ") + ` L${p.at(-1)[0]},${y} Z`;
    const miss = events.filter((e) => e.miss).map((e) => `<circle cx="${X(e.d)}" cy="${y - 4}" r="4" fill="var(--warning)" stroke="var(--surface)" stroke-width="1.5"></circle>`).join("");
    return `<g class="rg rg-${s.id}"><path d="${path(pts(false))}" fill="${col}" fill-opacity="${L.isOn(s) ? 0.8 : 0.35}" stroke="var(--surface)" stroke-width="1.2"></path><path d="${path(pts(true))}" fill="${col}" fill-opacity="0.16" stroke="${col}" stroke-width="1.2" stroke-dasharray="3 3"></path><line x1="${labelW}" x2="${w}" y1="${y}" y2="${y}" stroke="var(--divider)"></line>${miss}<text x="${labelW - 10}" y="${y - 2}" text-anchor="end" font-size="${ph ? 10 : 12}" font-weight="700" fill="${L.isOn(s) ? "var(--fg)" : "var(--muted)"}">${s.alias}</text>${ph ? "" : `<text x="${labelW - 10}" y="${y + 11}" text-anchor="end" font-size="10" font-weight="600" fill="var(--muted)">${L.isOn(s) ? `${inr(s.amount)} · ${s.billingCycle.toLowerCase()}` : s.status.toLowerCase()}</text>`}</g>`;
  }).join("");
  const H = 34 + SC.ORDER.length * rowH + 18;
  const months = L.monthsFrom("2025-11", 18).map((k, j) => `<text x="${X(`${k}-15`)}" y="${H - 2}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--muted)">${ph && j % 3 ? "" : L.monName(k)}</text>`).join("");
  return `<svg viewBox="0 0 ${w} ${H}" width="100%" height="${H}" style="display:block" aria-label="Each subscription's renewals over time">${rows}<line x1="${X(L.TODAY)}" x2="${X(L.TODAY)}" y1="0" y2="${H - 14}" stroke="var(--accent)" stroke-width="2"></line><text x="${X(L.TODAY) + 6}" y="12" font-size="11" font-weight="800" fill="var(--accent-text)">Today</text>${months}</svg>`;
}
export const ridgeCss = (dsel, id) => (id === "all" ? "" : `${dsel} .rg:not(.rg-${id}) { opacity: 0.25; }`);

// ---------- 6 · Year-to-date race ----------
export function race(f, { w = 1360, h = 300, ph = false } = {}) {
  const cum = (year, list, upTo) => { const pts = []; let t = 0; for (let d = 0; d <= 364; d += 3) { const iso = L.addDays(`${year}-01-01`, d); if (upTo && iso > upTo) break; pts.push([d, 0]); } const pays = L.PAYMENTS.filter((p) => p.date.startsWith(String(year)) && list.includes(p.subId)).sort((a, b) => (a.date < b.date ? -1 : 1)); return pts.map(([d]) => { const iso = L.addDays(`${year}-01-01`, d); return [d, pays.filter((p) => p.date <= iso).reduce((s, p) => s + p.amount, 0)]; }); };
  const allIds = L.SUBS.map((s) => s.id);
  const y25 = cum(2025, allIds), y26 = cum(2026, allIds, L.TODAY);
  const future = L.renewalsBetween(L.addDays(L.TODAY, 1), "2026-12-31");
  const lastPaid = y26.at(-1)[1];
  const proj = [[L.daysBetween("2026-01-01", L.TODAY), lastPaid]]; { let t = lastPaid; for (let d = proj[0][0] + 3; d <= 364; d += 3) { const iso = L.addDays("2026-01-01", d); t = lastPaid + future.filter((r) => r.date <= iso).reduce((s, r) => s + r.amount, 0); proj.push([d, t]); } }
  const max = Math.ceil(Math.max(y25.at(-1)[1], proj.at(-1)[1]) / 10000) * 10000;
  const X = (d) => 50 + (d / 364) * (w - 70), Y = (v) => h - 30 - (v / max) * (h - 60);
  const line = (pts) => pts.map(([d, v], i) => `${i ? "L" : "M"}${X(d).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const td = L.daysBetween("2026-01-01", L.TODAY);
  const lastYearNow = y25.find(([d]) => d >= td)?.[1] ?? 0;
  const diff = lastPaid - lastYearNow;
  const sub = f.all ? "" : (() => { const p = cum(2026, [f.id], L.TODAY); return `<path d="${line(p)} L${X(p.at(-1)[0])},${Y(0)} L${X(0)},${Y(0)} Z" fill="var(--card-${f.color})" fill-opacity="0.55"></path><path d="${line(p)}" fill="none" stroke="var(--card-${f.color})" stroke-width="2.5"></path><text x="${X(p.at(-1)[0]) + 8}" y="${Y(p.at(-1)[1]) - 2}" font-size="11.5" font-weight="800" fill="var(--card-${f.color})">${f.alias} ${inr(p.at(-1)[1])}</text>`; })();
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display:block;overflow:visible" aria-label="Paid so far this year against last year">
    ${[0, 0.25, 0.5, 0.75, 1].map((q) => `<line x1="50" x2="${w - 20}" y1="${Y(q * max)}" y2="${Y(q * max)}" stroke="var(--divider)" ${q ? 'stroke-dasharray="3 5"' : ""}></line><text x="42" y="${Y(q * max) + 4}" text-anchor="end" font-size="10.5" font-weight="700" fill="var(--muted)">${inrK(q * max)}</text>`).join("")}
    <path d="${line(y25)}" fill="none" stroke="var(--fill-strong)" stroke-width="2.5"></path><text x="${X(364) - 4}" y="${Y(y25.at(-1)[1]) - 8}" text-anchor="end" font-size="11.5" font-weight="800" fill="var(--muted)">2025 · ${inr(y25.at(-1)[1])}</text>
    <path d="${line(y26)} L${X(td)},${Y(0)} L${X(0)},${Y(0)} Z" fill="oklch(0.72 0.19 145 / 0.12)"></path><path d="${line(y26)}" fill="none" stroke="var(--accent-text)" stroke-width="3"></path><path d="${line(proj)}" fill="none" stroke="var(--accent-text)" stroke-width="2.5" stroke-dasharray="6 6"></path>
    <text x="${X(364) - 4}" y="${Y(proj.at(-1)[1]) - 8}" text-anchor="end" font-size="11.5" font-weight="800" fill="var(--accent-text)">2026 · ${inr(proj.at(-1)[1])} expected</text>
    ${sub}
    <line x1="${X(td)}" x2="${X(td)}" y1="${Y(lastPaid)}" y2="${Y(lastYearNow)}" stroke="var(--negative)" stroke-width="2"></line><circle cx="${X(td)}" cy="${Y(lastPaid)}" r="5.5" fill="var(--accent-text)" stroke="var(--surface)" stroke-width="2"></circle>
    <g transform="translate(${X(td) - (ph ? 132 : 222)},${(Y(lastPaid) + Y(lastYearNow)) / 2 - 6})"><rect x="0" y="-14" width="${ph ? 120 : 210}" height="${ph ? 36 : 40}" rx="10" fill="var(--surface)" stroke="var(--surface-line)"></rect><text x="10" y="2" font-size="${ph ? 10.5 : 12}" font-weight="800" fill="var(--negative)">${diff >= 0 ? "+" : "−"}${inr(Math.abs(diff))} on last year</text><text x="10" y="${ph ? 16 : 19}" font-size="${ph ? 9.5 : 11}" font-weight="600" fill="var(--muted)">${ph ? "by today" : `${inr(lastPaid)} paid by Oct 20`}</text></g>
    ${["Jan", "Mar", "May", "Jul", "Sep", "Nov"].map((m, i) => `<text x="${X(i * 61)}" y="${h - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--muted)">${m}</text>`).join("")}</svg>`;
}
