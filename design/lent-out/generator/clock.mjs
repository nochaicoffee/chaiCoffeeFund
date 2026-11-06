// The Interest clock (L2) and its sister widget, Interest adding up.
// On the FINAL page they are two cards in one row: the clock (dial, switch, per-loan rows) on the left and "Interest adding up" (the 12% pot, the payouts in lumps, and the chart) on the right.
// They share ONE pick (the day / month / year / all-time switch) and its colour, scoped to .clk, so they never follow the Who owes what hero.
// Both are drawn from a model of the loans, so the states and phone boards can draw them for a repaid loan, a part-returned loan or sixteen people.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import { L2_KEYS, L2_COL } from "./css-lent.mjs";
import { radios, big } from "./ui.mjs";
const { I, inr } = L;
const { tile, pastel, mY, rateText, termsText, dm } = P;

const polar = (cx, cy, r, deg) => [cx + r * Math.cos(((deg - 90) * Math.PI) / 180), cy + r * Math.sin(((deg - 90) * Math.PI) / 180)];
const endOf = (l) => (l.status === "Repaid" && l.closedDate && l.closedDate < D.TODAY ? l.closedDate : D.TODAY);
const payoutsUpTo = (l, iso) => (l.interestMode === "Paid-out" ? D.dueDates(l, iso < endOf(l) ? iso : endOf(l)).length * l.payoutAmount : 0);
/** Interest a loan has earned up to a day: accrued if it piles up, the payouts that have come due if it pays out. */
const earnedBy = (l, reps, iso) => (l.interestMode === "Accruing" ? D.interestAccrued(l, reps, iso) : payoutsUpTo(l, iso));
const real = (l) => l.id in D.PAYOUTS;
const shortName = (l) => l.borrowerName.replace("Friend – ", "");
const lakhS = (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(2).replace(/0$/, "")}L` : `₹${Math.round(n / 1000)}k`);

/** What the clock and its sister widget read: one entry per loan (the three biggest, then "N others"), with its figure for each period. */
export function clockModel(loans = D.LOANS, reps = D.REPAYMENTS) {
  const sm = loans.map((l) => { const s = D.summarise(l, reps, D.TODAY); return { l, s, perDay: (s.principalOutstanding * s.rate) / 100 / 365, earned: earnedBy(l, reps, D.TODAY) }; }).sort((a, b) => b.s.owedToday - a.s.owedToday || b.earned - a.earned);
  const vals = (xs) => ({ day: D.sum(xs.map((x) => x.perDay)), month: (D.sum(xs.map((x) => x.perDay)) * 365) / 12, year: D.sum(xs.map((x) => x.perDay)) * 365, ever: D.sum(xs.map((x) => x.earned)) });
  const many = sm.length > 3;
  const top = many ? sm.slice(0, 3) : sm, rest = many ? sm.slice(3) : [];
  const entries = top.map((x) => ({ xs: [x], l: x.l, color: x.l.color, name: x.l.borrowerName, vals: vals([x]) }));
  if (rest.length) entries.push({ xs: rest, l: null, color: "onyx", name: `${rest.length} others`, vals: vals(rest) });
  return { sm, entries, loans, reps, many, x0: loans.map((l) => l.startDate).sort()[0].slice(0, 8) + "01" };
}
/** The dial's figure: 44px up to 7 characters (as written, ₹ and commas included), 34px at 8 or more: the built app's rule. A phone dial is a little smaller. */
const figSize = (n, phone) => { const len = `₹${Math.round(n).toLocaleString("en-IN")}`.length, px = (len <= 7 ? 44 : 34) * (phone ? 0.86 : 1), sm = px / 2; return `font-size:${px.toFixed(0)}px;--sm:${sm.toFixed(0)}px`; };
const periodTotal = (m, k) => D.sum(m.entries.map((e) => e.vals[k]));
const PERIODS = (m) => ({ day: ["a day", "at today's pace"], month: ["a month", "at today's pace"], year: ["a year", "at today's pace"], ever: ["earned so far", `since ${mY(m.x0)}`] });

function arcs(m, k) {
  const values = m.entries.map((e) => e.vals[k]), total = D.sum(values) || 1, R = 142, C = 2 * Math.PI * R, gap = 6;
  let acc = 0;
  return m.entries.map((e, i) => {
    const frac = values[i] / total, len = Math.max(0, frac * C - gap), start = (acc / total) * 360 + (gap / 2 / C) * 360;
    acc += values[i];
    return `<circle cx="180" cy="180" r="${R}" fill="none" stroke="${pastel(e.color)}" stroke-width="30" stroke-linecap="butt" stroke-dasharray="${len.toFixed(1)} ${(C - len).toFixed(1)}" transform="rotate(${(start - 90).toFixed(2)} 180 180)"></circle>`;
  }).join("");
}
function bezel() {
  let s = "";
  for (let i = 0; i < 60; i++) { const long = i % 5 === 0, a = polar(180, 180, 166, i * 6), b = polar(180, 180, long ? 156 : 160, i * 6); s += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="#fff" stroke-opacity="${long ? 0.7 : 0.32}" stroke-width="${long ? 2 : 1}"></line>`; }
  return s;
}

export function chartSvg(k, m, { W = 700, H = 410, l = 54, r = 92, t = 26, b = 36, fs = 1 } = {}) {
  const x0 = m.x0, x1 = "2027-01-01", span = D.daysBetween(x0, x1);
  const cumOf = (xs, iso) => D.sum(xs.map((x) => earnedBy(x.l, m.reps, iso)));
  const series = m.entries.map((e) => {
    const dates = new Set(); for (let d = D.addDays(x0, 0); d < D.TODAY; d = L.addDays(d, 10)) dates.add(d); dates.add(D.TODAY);
    for (const x of e.xs) for (const due of D.dueDates(x.l, endOf(x.l))) { dates.add(due); dates.add(L.addDays(due, -1)); }
    const first = e.xs.map((x) => x.l.startDate).sort()[0], pts = [...dates, first].filter((d) => d >= first).sort().map((d) => [d, cumOf(e.xs, d)]);
    return { e, pts, end: cumOf(e.xs, D.TODAY), pure: e.xs.every((x) => x.l.interestMode === "Accruing") };
  });
  const rawMax = Math.max(...series.map((s) => s.end)) * 1.15, step = [25000, 50000, 100000, 200000, 500000, 1000000].find((s) => rawMax / s <= 4) ?? 1000000, max = Math.ceil(rawMax / step) * step;
  const x = (iso) => l + (D.daysBetween(x0, iso) / span) * (W - l - r), y = (v) => t + (1 - v / max) * (H - t - b);
  const ticks = []; for (let v = 0; v <= max; v += step) ticks.push(v);
  const grid = ticks.map((v) => `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" stroke="#fff" stroke-opacity="${v ? 0.14 : 0.3}" ${v ? 'stroke-dasharray="3 5"' : ""}></line><text x="${l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="${11 * fs}" font-weight="700" fill="#fff" fill-opacity=".75">${v ? `₹${v >= 100000 ? v / 100000 + "L" : v / 1000 + "k"}` : "0"}</text>`).join("");
  const y0 = +x0.slice(0, 4), yrs = []; for (let yy = y0 + 1; yy <= 2027; yy++) yrs.push([`${yy}-01-01`, String(yy)]);
  const yrsSvg = yrs.map(([d, t2]) => `<line x1="${x(d)}" x2="${x(d)}" y1="${t}" y2="${H - b}" stroke="#fff" stroke-opacity=".18"></line><text x="${x(d) + 6}" y="${H - 14}" font-size="${11 * fs}" font-weight="800" fill="#fff" fill-opacity=".75">${t2}</text>`).join("");
  const win = { day: [L.addDays(D.TODAY, -1), 8], month: [L.addDays(D.TODAY, -30), 0], year: [L.addDays(D.TODAY, -365), 0], ever: [x0, 0] }[k];
  const band = `<rect x="${x(win[0] < x0 ? x0 : win[0]).toFixed(1)}" y="${t}" width="${Math.max(win[1] || 0, x(D.TODAY) - x(win[0] < x0 ? x0 : win[0])).toFixed(1)}" height="${H - t - b}" fill="#fff" fill-opacity="${k === "ever" ? 0.05 : 0.14}" rx="4"></rect>`;
  const lines = series.map((s) => `<polyline points="${s.pts.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}" fill="none" stroke="${pastel(s.e.color)}" stroke-width="3" stroke-linejoin="round"></polyline>${s.pure && s.e.xs.length === 1 ? `<polyline points="${x(D.TODAY).toFixed(1)},${y(s.end).toFixed(1)} ${x("2026-12-31").toFixed(1)},${y(cumOf(s.e.xs, "2026-12-31")).toFixed(1)}" fill="none" stroke="${pastel(s.e.color)}" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round"></polyline>` : ""}`).join("");
  const missX = series.flatMap((s) => s.e.xs.filter((q) => real(q.l)).flatMap((q) => D.MISSED.filter((p) => p.loan.id === q.l.id && p.due <= endOf(q.l) && p.state === "missing" || p.loan.id === q.l.id && p.due <= endOf(q.l) && p.state === "late").map((p) => { const cum = D.sum(D.PAYOUTS[q.l.id].filter((z) => z.due <= p.due).map((z) => z.amount)); return `<g><circle cx="${x(p.due)}" cy="${y(cum - p.amount / 2)}" r="${8 * fs}" fill="oklch(0.62 0.2 25)" stroke="#fff" stroke-width="1.5"></circle><text x="${x(p.due)}" y="${y(cum - p.amount / 2) + 4 * fs}" text-anchor="middle" font-size="${11 * fs}" font-weight="800" fill="#fff">×</text></g>`; }))).join("");
  // labels at the end of each line, nudged so they never sit on each other
  const labs = series.map((s) => ({ y: y(s.end) + 4, c: pastel(s.e.color), t: `${s.e.l ? shortName(s.e.l) : s.e.name} ${lakhS(s.end)}` })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 15 * fs) labs[i].y = labs[i - 1].y + 15 * fs;
  const labSvg = labs.map((q) => `<text x="${x(D.TODAY) + 8}" y="${q.y}" font-size="${12 * fs}" font-weight="800" fill="${q.c}">${q.t}</text>`).join("");
  const dotS = series.find((s) => s.pure);
  return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" style="display:block;width:100%;height:auto" role="img" aria-label="Interest earned, adding up since ${mY(x0)}">${grid}${yrsSvg}${band}${lines}${missX}<line x1="${x(D.TODAY)}" x2="${x(D.TODAY)}" y1="${t}" y2="${H - b}" stroke="#fff" stroke-width="1.5"></line><rect x="${x(D.TODAY) - 24}" y="${t - 14}" width="48" height="18" rx="9" fill="#fff"></rect><text x="${x(D.TODAY)}" y="${t - 1}" text-anchor="middle" font-size="10.5" font-weight="800" fill="oklch(0.25 0.04 260)">today</text>${dotS ? `<circle cx="${x(D.TODAY)}" cy="${y(dotS.end)}" r="5" fill="${pastel(dotS.e.color)}" stroke="#fff" stroke-width="2"></circle>` : ""}${labSvg}</svg>`;
}

/**
 * live: all four periods, switchable (radios named e, scoped to .clk). Not live: only `period`, drawn as picked (phone and states boards).
 * split: the final page's two cards (clock | Interest adding up). Not split: the L2 exploration's single stage.
 */
export function clockWidget({ live = true, period = "day", phone = false, exploration = false, split = false, model = clockModel() } = {}) {
  const m = model, keys = live ? L2_KEYS : [period], PER = PERIODS(m);
  const pane = (k, inner, cls = "") => (live ? `<div class="vw-e vw-e-${k} ${cls}">${inner}</div>` : `<div>${inner}</div>`);
  const centre = (k) => { const [lab, sub] = PER[k]; return pane(k, `<div class="dial-c"><div class="k">Interest earned</div><div class="v" style="${figSize(periodTotal(m, k), phone)}">${big(periodTotal(m, k))}</div><div class="s" style="font-weight:800;opacity:.95">${lab}</div><div class="s">${sub}</div></div>`); };
  const dial = `<div class="dialw"><svg viewBox="0 0 360 360" aria-label="Interest by loan"><circle cx="180" cy="180" r="172" fill="oklch(1 0 0 / .06)"></circle><circle cx="180" cy="180" r="142" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="30"></circle>${keys.map((k) => `<g class="${live ? `vw-e vw-e-${k}` : ""}">${arcs(m, k)}</g>`).join("")}${bezel()}<g class="hand"><line x1="180" y1="70" x2="180" y2="30" stroke="#fff" stroke-width="3" stroke-linecap="round"></line><circle cx="180" cy="38" r="5" fill="#fff"></circle></g><circle cx="180" cy="180" r="112" fill="oklch(0 0 0 / .16)"></circle></svg>${keys.map(centre).join("")}</div>`;
  const chips = `<div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap">${[["day", "A day"], ["month", "A month"], ["year", "A year"], ["ever", "All time"]].map(([k, t]) => (live ? `<label class="pkl chip-b" for="e-${k}">${t}</label>` : `<span class="chip-b" style="--sel:${k === period ? 1 : 0}">${t}</span>`)).join("")}</div>`;
  const rowTile = (e) => (e.l ? tile(e.l, 30) : `<span class="btile" style="width:30px;height:30px;border-radius:9px;font-size:11px;background:${P.grad("onyx")}">+${e.xs.length}</span>`);
  const rowSub = (e) => (e.l ? (e.l.interestMode === "Accruing" ? `${e.l.interestRate}% simple · piles up` : `${termsText(e.l)} · ${rateText(D.annualRatePercent(e.l))}`) : "paid out or piling up, each as its terms say");
  const rowNote = (e, k, tot) => {
    if (k !== "ever") return e.l && e.l.status === "Repaid" ? `repaid ${dm(e.l.closedDate)}` : `${tot ? ((e.vals[k] / tot) * 100).toFixed(0) : 0}% of it`;
    if (!e.l) return "earned to date";
    if (e.l.interestMode === "Accruing") return e.xs[0].s.interestPaid ? `${inr(e.xs[0].s.interestPaid)} paid` : "owed, not paid";
    return real(e.l) ? `${inr(D.receivedSoFar(e.l))} arrived` : "matched in Income";
  };
  const rowsFor = (k) => { const tot = periodTotal(m, k); return `<div class="lrows">${m.entries.map((e) => `<div class="lr2">${rowTile(e)}<div><b>${e.name}</b><small>${rowSub(e)}</small></div><div class="am">${inr(e.vals[k])}<small>${rowNote(e, k, tot)}</small></div><div class="bar"><i style="width:${tot ? (e.vals[k] / tot) * 100 : 0}%"></i></div></div>`).join("")}</div>`; };
  // the pot and the payouts
  const piling = m.sm.filter((x) => x.l.interestMode === "Accruing"), paying = m.sm.filter((x) => x.l.interestMode === "Paid-out");
  const potA = D.sum(piling.map((x) => x.s.interestAccrued)), potDay = D.sum(piling.map((x) => x.perDay)), potPaid = D.sum(piling.map((x) => x.s.interestPaid));
  const promised = D.sum(paying.map((x) => payoutsUpTo(x.l, D.TODAY))), isReal = paying.length && paying.every((x) => real(x.l));
  const arrived = isReal ? D.sum(paying.map((x) => D.PAYOUTS[x.l.id].filter((p) => D.isReceived(p) && p.due <= endOf(x.l)).reduce((t, p) => t + p.amount, 0))) : 0;
  const potLabel = piling.length === 1 && piling[0].l.interestRate ? `The ${piling[0].l.interestRate}% pot, ticking up` : "The piling-up pot, ticking up";
  const pots = `<div class="potrow"><div class="pot"><div class="k">${potLabel}</div><div class="v">${inr(potA)}</div><div class="s">+${inr(potDay)} a day · about ₹${(potDay / 24).toFixed(2)} an hour · ${potPaid ? `${inr(potPaid)} of it paid` : "none of it paid yet"}</div></div><div class="pot"><div class="k">The payouts, in lumps</div><div class="v">${inr(promised)} <small style="font-size:13px;opacity:.75">promised</small></div><div class="s">${isReal ? `${inr(arrived)} arrived (sample) · <b>${inr(promised - arrived)} missing</b>` : "each one matched to its bank credit in Income"}</div></div></div>`;
  const chartOpt = phone ? { W: 340, H: 300, l: 44, r: 84, fs: 1.1 } : split ? { W: 700, H: 450 } : {};
  const hint = `A day, a month and a year are at today's pace; all time is what has really piled up or fallen due.`;
  const left = `<div style="display:flex;flex-direction:column;gap:18px;align-items:stretch;flex:1;justify-content:space-between"><div style="display:flex;justify-content:center">${dial}</div>${chips}${keys.map((k) => pane(k, rowsFor(k))).join("")}</div>`;
  const chartBox = `<div class="s-chart" style="flex:1;display:flex;flex-direction:column"><div class="s-ct">Interest earned, adding up<small>${phone ? "the shaded stretch is the period" : "shaded: the period you picked on the clock · × a payout that is not here"}</small></div>${keys.map((k) => pane(k, chartSvg(k, m, chartOpt))).join("")}</div>`;

  if (split) {
    const style = live ? "" : ` style="--h1:var(--card-${L2_COL[period]}-from);--h2:var(--card-${L2_COL[period]}-to)"`;
    const cls = `stg2 clk clk-card${phone ? " clk-ph" : ""}`;
    const cardL = `<section class="${cls}"${style}>${live ? radios("e", L2_KEYS, "day") : ""}<div class="chead"><div class="s-ct" style="margin:0;font-size:15px">Interest clock<small>what the money earns</small></div></div>${left}<div class="s-note" style="margin-top:auto">${hint}</div></section>`;
    const cardR = `<section class="${cls}"${style}><div class="chead"><div class="s-ct" style="margin:0;font-size:15px">Interest adding up<small>${potLabel.includes("%") ? `the ${piling[0].l.interestRate}% pot beside the payouts` : "the pot beside the payouts"}, since ${mY(m.x0)}</small></div></div>${pots}${chartBox}</section>`;
    return phone ? `<div style="display:flex;flex-direction:column;gap:16px">${cardL}${cardR}</div>` : `<div class="g12" style="gap:20px"><div style="grid-column:span 5">${cardL}</div><div style="grid-column:span 7">${cardR}</div></div>`;
  }
  const head = `<div class="s-ct" style="margin:0;font-size:15px">Interest clock<small>${exploration ? "what the money earns: the dial turns once a minute, the arcs are each loan's share" : "what the money earns, and how it adds up"}</small></div>`;
  const hintSpan = `<span class="on-stage-hint">${I.clock(13)} ${hint}</span>`;
  const right = `<div style="display:flex;flex-direction:column;gap:14px">${pots}${chartBox.replace("flex:1;display:flex;flex-direction:column", "")}</div>`;
  return `<section class="stg2 clk${phone ? " clk-ph" : ""}">${live ? radios("e", L2_KEYS, "day") : ""}<div class="chead" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">${head}${hintSpan}</div><div class="s-grid" style="grid-template-columns:5fr 7fr;gap:32px">${left}${right}</div></section>`;
}
