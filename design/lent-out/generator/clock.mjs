// The Interest clock (L2): a dial of what the money earns (an arc per loan, a sweeping hand), a day / month / year / all-time switch, the 12% pot beside the payouts,
// and the chart of interest adding up since Oct 2024. On the final page it is its own widget: it has its OWN colour pick (scoped to .clk), so it never recolours with the hero.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import { L2_KEYS, L2_COL } from "./css-lent.mjs";
import { radios, big } from "./ui.mjs";
const { I, inr } = L;
const { tile, pastel, mY, rateText, termsText } = P;

export const COLS = { a: pastel("copper"), b: pastel("teal"), c: pastel("violet") };
const polar = (cx, cy, r, deg) => [cx + r * Math.cos(((deg - 90) * Math.PI) / 180), cy + r * Math.sin(((deg - 90) * Math.PI) / 180)];
function arcs(values) {
  const total = D.sum(values), R = 142, C = 2 * Math.PI * R, gap = 6;
  let acc = 0;
  return D.LOANS.map((l, i) => {
    const frac = values[i] / total, len = Math.max(0, frac * C - gap), start = (acc / total) * 360 + (gap / 2 / C) * 360;
    acc += values[i];
    return `<circle cx="180" cy="180" r="${R}" fill="none" stroke="${COLS[l.id]}" stroke-width="30" stroke-linecap="butt" stroke-dasharray="${len.toFixed(1)} ${(C - len).toFixed(1)}" transform="rotate(${(start - 90).toFixed(2)} 180 180)"></circle>`;
  }).join("");
}
function bezel() {
  let s = "";
  for (let i = 0; i < 60; i++) { const long = i % 5 === 0, a = polar(180, 180, 166, i * 6), b = polar(180, 180, long ? 156 : 160, i * 6); s += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="#fff" stroke-opacity="${long ? 0.7 : 0.32}" stroke-width="${long ? 2 : 1}"></line>`; }
  return s;
}
const PERIODS = { day: ["a day", "at today's pace"], month: ["a month", "at today's pace"], year: ["a year", "at today's pace"], ever: ["earned so far", `since ${mY(D.A.startDate)}`] };
const periodVal = (k, l) => (k === "ever" ? D.earnedOf(l) : D.paceOf(l, k));
const periodTotal = (k) => D.sum(D.LOANS.map((l) => periodVal(k, l)));

export function chartSvg(k, { W = 700, H = 410, l = 54, r = 92, t = 26, b = 36, fs = 1 } = {}) {
  const x0 = "2024-10-01", x1 = "2027-01-01", span = D.daysBetween(x0, x1), max = 200000;
  const x = (iso) => l + (D.daysBetween(x0, iso) / span) * (W - l - r), y = (v) => t + (1 - v / max) * (H - t - b);
  const ramp = []; for (let d = x0; d <= D.TODAY; d = L.addDays(d, 10)) ramp.push(`${x(d).toFixed(1)},${y(D.accruedOn(d)).toFixed(1)}`); ramp.push(`${x(D.TODAY).toFixed(1)},${y(D.S.a.interestAccrued).toFixed(1)}`);
  const proj = `${x(D.TODAY).toFixed(1)},${y(D.S.a.interestAccrued).toFixed(1)} ${x("2026-12-31").toFixed(1)},${y(D.accruedOn("2026-12-31")).toFixed(1)}`;
  const steps = (l2) => { const ps = D.PAYOUTS[l2.id] ?? []; let cum = 0, s = `${x(l2.startDate).toFixed(1)},${y(0).toFixed(1)}`; for (const p of ps) { s += ` ${x(p.due).toFixed(1)},${y(cum).toFixed(1)} ${x(p.due).toFixed(1)},${y((cum += p.amount)).toFixed(1)}`; } s += ` ${x(D.TODAY).toFixed(1)},${y(cum).toFixed(1)}`; return [s, cum]; };
  const [sb, cb] = steps(D.B), [sc, cc] = steps(D.C);
  const grid = [0, 50000, 100000, 150000, 200000].map((v) => `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" stroke="#fff" stroke-opacity="${v ? 0.14 : 0.3}" ${v ? 'stroke-dasharray="3 5"' : ""}></line><text x="${l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="${11 * fs}" font-weight="700" fill="#fff" fill-opacity=".75">${v ? `₹${v >= 100000 ? v / 100000 + "L" : v / 1000 + "k"}` : "0"}</text>`).join("");
  const yrs = [["2025-01-01", "2025"], ["2026-01-01", "2026"], ["2027-01-01", "2027"]].map(([d, t2]) => `<line x1="${x(d)}" x2="${x(d)}" y1="${t}" y2="${H - b}" stroke="#fff" stroke-opacity=".18"></line><text x="${x(d) + 6}" y="${H - 14}" font-size="${11 * fs}" font-weight="800" fill="#fff" fill-opacity=".75">${t2}</text>`).join("");
  const win = { day: [L.addDays(D.TODAY, -1), 8], month: [L.addDays(D.TODAY, -30), 0], year: [L.addDays(D.TODAY, -365), 0], ever: [x0, 0] }[k];
  const band = `<rect x="${x(win[0]).toFixed(1)}" y="${t}" width="${Math.max(win[1] || 0, x(D.TODAY) - x(win[0])).toFixed(1)}" height="${H - t - b}" fill="#fff" fill-opacity="${k === "ever" ? 0.05 : 0.14}" rx="4"></rect>`;
  const missX = D.MISSED.map((p) => { const cum = D.sum(D.PAYOUTS[p.loan.id].filter((q) => q.due <= p.due).map((q) => q.amount)); return `<g><circle cx="${x(p.due)}" cy="${y(cum - p.amount / 2)}" r="${8 * fs}" fill="oklch(0.62 0.2 25)" stroke="#fff" stroke-width="1.5"></circle><text x="${x(p.due)}" y="${y(cum - p.amount / 2) + 4 * fs}" text-anchor="middle" font-size="${11 * fs}" font-weight="800" fill="#fff">×</text></g>`; }).join("");
  const lab = (iso, v, t2, c) => `<text x="${x(iso) + 8}" y="${y(v) + 4}" font-size="${12 * fs}" font-weight="800" fill="${c}">${t2}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" style="display:block;width:100%;height:auto" role="img" aria-label="Interest earned, adding up since Oct 2024">${grid}${yrs}${band}<polyline points="${ramp.join(" ")}" fill="none" stroke="${COLS.a}" stroke-width="3" stroke-linejoin="round"></polyline><polyline points="${proj}" fill="none" stroke="${COLS.a}" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round"></polyline><polyline points="${sb}" fill="none" stroke="${COLS.b}" stroke-width="3" stroke-linejoin="round"></polyline><polyline points="${sc}" fill="none" stroke="${COLS.c}" stroke-width="3" stroke-linejoin="round"></polyline>${missX}<line x1="${x(D.TODAY)}" x2="${x(D.TODAY)}" y1="${t}" y2="${H - b}" stroke="#fff" stroke-width="1.5"></line><rect x="${x(D.TODAY) - 24}" y="${t - 14}" width="48" height="18" rx="9" fill="#fff"></rect><text x="${x(D.TODAY)}" y="${t - 1}" text-anchor="middle" font-size="10.5" font-weight="800" fill="oklch(0.25 0.04 260)">today</text><circle cx="${x(D.TODAY)}" cy="${y(D.S.a.interestAccrued)}" r="5" fill="${COLS.a}" stroke="#fff" stroke-width="2"></circle>${lab(D.TODAY, D.S.a.interestAccrued, "Friend ₹1.64L", COLS.a)}${lab(D.TODAY, cb - 14000, "₹3L ₹72k", COLS.b)}${lab(D.TODAY, cc - 22000, "₹1.82L ₹54k", COLS.c)}</svg>`;
}

/**
 * live: all four periods, switchable (radios named e, scoped to .clk). Not live: only `period`, drawn as picked (for the phone and states boards).
 * exploration: the L2 board's own header (it recolours the same way). The widget never reads the hero's colours.
 */
export function clockWidget({ live = true, period = "day", phone = false, exploration = false } = {}) {
  const keys = live ? L2_KEYS : [period];
  const pane = (k, inner, cls = "") => (live ? `<div class="vw-e vw-e-${k} ${cls}">${inner}</div>` : `<div>${inner}</div>`);
  const centre = (k) => { const [lab, sub] = PERIODS[k]; return pane(k, `<div class="dial-c"><div class="k">Interest earned</div><div class="v">${big(periodTotal(k))}</div><div class="s" style="font-weight:800;opacity:.95">${lab}</div><div class="s">${sub}</div></div>`); };
  const dial = `<div class="dialw"><svg viewBox="0 0 360 360" aria-label="Interest by loan"><circle cx="180" cy="180" r="172" fill="oklch(1 0 0 / .06)"></circle><circle cx="180" cy="180" r="142" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="30"></circle>${keys.filter((k) => k !== "ever").map((k) => `<g class="${live ? `vw-e vw-e-${k}` : ""}">${arcs(D.LOANS.map((l) => D.perDay(l)))}</g>`).join("")}${keys.includes("ever") ? `<g class="${live ? "vw-e vw-e-ever" : ""}">${arcs(D.LOANS.map((l) => D.earnedOf(l)))}</g>` : ""}${bezel()}<g class="hand"><line x1="180" y1="70" x2="180" y2="30" stroke="#fff" stroke-width="3" stroke-linecap="round"></line><circle cx="180" cy="38" r="5" fill="#fff"></circle></g><circle cx="180" cy="180" r="112" fill="oklch(0 0 0 / .16)"></circle></svg>${keys.map(centre).join("")}</div>`;
  const chips = `<div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap">${[["day", "A day"], ["month", "A month"], ["year", "A year"], ["ever", "All time"]].map(([k, t]) => (live ? `<label class="pkl chip-b" for="e-${k}">${t}</label>` : `<span class="chip-b" style="--sel:${k === period ? 1 : 0}">${t}</span>`)).join("")}</div>`;
  const rowsFor = (k) => { const tot = periodTotal(k); return `<div class="lrows">${D.LOANS.map((l) => { const v = periodVal(k, l); return `<div class="lr2">${tile(l, 30)}<div><b>${l.borrowerName}</b><small>${l.interestMode === "Accruing" ? "12% simple · piles up" : `${termsText(l)} · ${rateText(D.S[l.id].rate)}`}</small></div><div class="am">${inr(v)}<small>${k === "ever" ? (l.interestMode === "Accruing" ? "owed, not paid" : `${inr(D.receivedSoFar(l))} arrived`) : `${((v / tot) * 100).toFixed(0)}% of it`}</small></div><div class="bar"><i style="width:${(v / tot) * 100}%"></i></div></div>`; }).join("")}</div>`; };
  const potA = D.S.a.interestAccrued, promised = D.EARNED - potA;
  const pots = `<div class="potrow"><div class="pot"><div class="k">The 12% pot, ticking up</div><div class="v">${inr(potA)}</div><div class="s">+${inr(D.perDay(D.A))} a day · about ₹${(D.perDay(D.A) / 24).toFixed(2)} an hour · none of it paid yet</div></div><div class="pot"><div class="k">The payouts, in lumps</div><div class="v">${inr(promised)} <small style="font-size:13px;opacity:.75">promised</small></div><div class="s">${inr(D.RECEIVED)} arrived (sample) · <b>${inr(D.MISSED_AMT)} missing</b></div></div></div>`;
  const chartOpt = phone ? { W: 340, H: 300, l: 44, r: 84, fs: 1.1 } : {};
  const head = exploration
    ? `<div class="s-ct" style="margin:0;font-size:15px">Interest clock<small>what the money earns: the dial turns once a minute, the arcs are each loan's share</small></div>`
    : `<div class="s-ct" style="margin:0;font-size:15px">Interest clock<small>what the money earns, and how it adds up</small></div>`;
  const hint = `<span class="on-stage-hint">${I.clock(13)} ${phone ? "A day, month, year: today's pace · all time: really earned" : "A day, a month and a year are at today's pace; all time is what has really piled up or fallen due"}</span>`;
  const left = `<div style="display:flex;flex-direction:column;gap:18px;align-items:stretch"><div style="display:flex;justify-content:center">${dial}</div>${chips}${keys.map((k) => pane(k, rowsFor(k))).join("")}</div>`;
  const right = `<div style="display:flex;flex-direction:column;gap:14px">${pots}<div class="s-chart"><div class="s-ct">Interest earned, adding up since ${mY(D.A.startDate)}<small>${phone ? "the shaded stretch is the period" : "the shaded stretch is the period you picked · × is a payout that never came"}</small></div>${keys.map((k) => pane(k, chartSvg(k, chartOpt))).join("")}</div></div>`;
  return `<section class="stg2 clk${phone ? " clk-ph" : ""}"${live ? "" : ` style="--h1:var(--card-${L2_COL[period]}-from);--h2:var(--card-${L2_COL[period]}-to)"`}>${live ? radios("e", L2_KEYS, "day") : ""}<div class="chead" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">${head}${phone ? "" : hint}</div><div class="s-grid" style="grid-template-columns:${phone ? "1fr" : "5fr 7fr"};gap:${phone ? 16 : 32}px">${left}${right}</div></section>`;
}
