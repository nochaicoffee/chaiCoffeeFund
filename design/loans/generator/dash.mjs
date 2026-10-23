// The six dashboard directions for /loans. Each has the same greeting and attention strip, and its own idea for the hero:
//   L1 The descent      the balance of every loan stacked over twenty years, falling to the debt-free date
//   L2 EMI cliffs       what leaves each month, stepping down as each loan ends
//   L3 Payoff rings     a ring per loan: how much is repaid, and how far through its term it is
//   L4 EMI tally        a tick for every EMI on one calendar: paid, late, next, still to come
//   L5 Cost anatomy     what each ₹1 borrowed costs: principal and interest, paid and still to come
//   L6 Debt-free clock  a countdown to the last EMI, and what each loan ending frees up
// Underneath, the widgets are the same shared ones in a different order: the real layout is picked after the hero.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { rings } from "./rings.mjs";
const { I, inr, inrS, inrL, fmt, fmtY, col, mono, btn, plural } = L;
const { hc, tip, card, cardHead, row, page, pk, pickCss, loanChips, PRINCIPAL, INTEREST } = P;

// ---------- The hero's top: label, a big figure, and four figures on the right ----------
const bigFigure = (v) => `<div class="hbig"><small>₹</small>${Math.round(v).toLocaleString("en-IN")}</div>`;
const figs = (list) => `<div class="row" style="gap:40px;align-items:flex-start;flex-wrap:nowrap">${list.map(([k, v, s, cls]) => `<div class="hfig"><span class="k">${k}</span><span class="v ${cls ?? ""}">${v}</span><span class="s">${s}</span></div>`).join("")}</div>`;
const nx = L.NEXT_DUE, nxd = L.daysBetween(L.TODAY, nx.dueDate);
const dfTxt = `${L.monName(L.DEBT_FREE.slice(0, 7))} ${L.DEBT_FREE.slice(0, 4)}`;
const FIGS = {
  emi: ["Monthly EMIs", inr(L.EMI_TOTAL), `${Math.round(L.SALARY_SHARE * 100)}% of your salary`],
  next: ["Next EMI", fmt(nx.dueDate), `${L.NEXT_LOAN.name} ${inr(nx.totalDue)} · in ${nxd} days`, "warn"],
  interest: ["Interest to come", inr(L.INTEREST_LEFT), `${inr(L.INTEREST_PAID)} paid so far`],
  free: ["Debt-free", dfTxt, `${L.ymTxt(L.monthsTo(L.DEBT_FREE))} to go`],
  owed: ["Still owed", inr(L.OWE), `${inr(L.REPAID)} of ${inr(L.BORROWED)} repaid`],
};
const repaidChip = `<span class="delta">${I.down(11)} ${Math.round(L.REPAID_PCT * 100)}% repaid</span><span class="hsub">${inr(L.REPAID)} of ${inr(L.BORROWED)} borrowed</span>`;
const heroTop = ({ label = "Still owed · all active loans", big = bigFigure(L.OWE), sub = repaidChip, list = [FIGS.emi, FIGS.next, FIGS.interest, FIGS.free] } = {}) =>
  `<div class="between" style="align-items:flex-start;gap:32px;position:relative"><div style="display:flex;flex-direction:column;gap:10px"><div class="hk">${label}</div>${big}<div class="row" style="gap:10px">${sub}</div></div>${figs(list)}</div>`;
export const heroBox = (cls, inner, { dark = false } = {}) => `<section class="hero ${cls}${dark ? " stage-deep" : ""}" style="padding:28px 28px 24px;${dark ? "" : "background:var(--feature-tile);border:1px solid var(--feature-tile-line);"}display:flex;flex-direction:column;gap:20px">${rings(1416, 600, { first: 60, step: 30, opacity: dark ? 0.1 : 0.09, stroke: dark ? "var(--rings-light)" : "var(--rings-ink)" })}${inner}</section>`;

// ---------- A stacked chart of loans over months (L1 and L2) ----------
export const months = (a, b) => { const out = []; let d = `${a}-01`; while (d.slice(0, 7) <= b) { out.push(d.slice(0, 7)); d = L.addMonthsUTC(d, 1); } return out; };
const r1 = (n) => Math.round(n * 10) / 10;
/**
 * series: [{ loan, vals }] stacked bottom to top. step draws each month as a flat step (EMIs); otherwise a line (balances).
 * flags: [{ ym, loan, label, sub, row }]: where a loan ends. grid: [[value, label]].
 */
export function stackChart({ id, ms, series, step = false, H = 230, TOP = 96, maxV, grid, flags = [], unit, extraTop = "", hoverRows }) {
  const N = ms.length, X = (i) => (i / (N - 1)) * 1000, Y = (v) => H - (v / maxV) * H, idx = (ym) => ms.indexOf(ym);
  const cum = series.map((_, k) => ms.map((_, i) => series.slice(0, k + 1).reduce((t, s) => t + s.vals[i], 0)));
  const bound = (arr) => { const p = []; for (let i = 0; i < N; i++) { p.push([X(i), Y(arr[i])]); if (step && i < N - 1) p.push([X(i + 1), Y(arr[i])]); } return p; };
  const path = (k) => { const top = bound(cum[k]), bot = k ? bound(cum[k - 1]) : [[X(0), H], [X(N - 1), H]]; return `M${top.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}L${bot.reverse().map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}Z`; };
  const ti = idx(L.TODAY.slice(0, 7)), xt = X(ti) + (step ? X(1) * 0.5 : 0);
  const defs = `<defs><clipPath id="${id}-p"><rect x="0" y="-10" width="${r1(xt)}" height="${H + 20}"></rect></clipPath><clipPath id="${id}-f"><rect x="${r1(xt)}" y="-10" width="${1000 - r1(xt)}" height="${H + 20}"></rect></clipPath>${series.map((s, k) => `<path id="${id}-l${k}" d="${path(k)}"></path>`).join("")}</defs>`;
  const layers = series.map((s, k) => `<g class="pick pk-${s.loan.id}"><use href="#${id}-l${k}" clip-path="url(#${id}-p)" fill="${col(s.loan)}" stroke="var(--solid)" stroke-width="1" vector-effect="non-scaling-stroke"></use><use href="#${id}-l${k}" clip-path="url(#${id}-f)" style="fill:color-mix(in oklch,${col(s.loan)} 42%,var(--future-base))" stroke="var(--solid)" stroke-width="1" vector-effect="non-scaling-stroke"></use></g>`).join("");
  const gridHtml = grid.map(([v, t]) => `<div class="gl" style="top:${TOP + Y(v)}px"><span>${t}</span></div>`).join("");
  const y0 = Number(ms[0].slice(0, 4)), y1 = Number(ms.at(-1).slice(0, 4));
  const yrs = []; for (let y = y0; y <= y1; y++) if ((y - y0) % 2 === (y0 % 2 ? 1 : 0)) { const i = idx(`${y}-01`); if (i >= 0 || y === y0) yrs.push(`<span class="yr${y === 2026 ? " now" : ""}" style="left:${(Math.max(i, 0) / (N - 1)) * 100}%">${y}</span>`); }
  const strips = []; for (let y = y0; y <= y1; y++) {
    const i0 = Math.max(idx(`${y}-01`), 0), i1 = Math.min(idx(`${y}-12`) < 0 ? N - 1 : idx(`${y}-12`), N - 1), left = (i0 / (N - 1)) * 100, width = ((i1 - i0 + 1) / (N - 1)) * 100;
    strips.push(`<div class="ys hov" tabindex="0" style="left:${left}%;width:${Math.min(width, 100 - left)}%;top:${TOP - 10}px;height:${H + 40}px">${tip(hoverRows(y, i1), { w: 250, x: left > 62 ? "r" : "l", y: "up", off: 0 })}</div>`);
  }
  const fl = flags.map((f) => {
    const i = idx(f.ym), x = (i / (N - 1)) * 100, k = series.findIndex((s) => s.loan.id === f.loan.id), yTop = TOP + Y(cum[k][Math.max(i - 1, 0)]) , past = f.ym <= L.TODAY.slice(0, 7), cy = 6 + f.row * 38, right = x > 90, left = x < 8;
    return `<div class="flag${right ? " r" : left ? " l" : ""}${past ? " past" : ""}" style="left:${x}%;top:${cy}px"><span class="fl-chip"><i style="background:${col(f.loan)}"></i><span><b>${f.label}</b><small>${f.sub}</small></span></span><span class="fl-line" style="height:${yTop - cy - 30}px"></span><span class="fl-dot" style="background:${col(f.loan)}"></span></div>`;
  }).join("");
  const today = `<div class="todayline" style="left:${(xt / 1000) * 100}%;top:${TOP - 8}px;bottom:26px"></div><span class="todaytag" style="left:calc(${(xt / 1000) * 100}% + 8px);top:${TOP + H - 32}px;transform:none;background:var(--solid);color:var(--fg);box-shadow:var(--soft-shadow)">Today · Oct 25</span>`;
  return `<div class="sc" style="height:${TOP + H + 30}px">${gridHtml}<div class="scp"><svg viewBox="0 0 1000 ${H}" preserveAspectRatio="none" style="top:${TOP}px;height:${H}px">${defs}${layers}</svg>${strips.join("")}${fl}${today}${extraTop}<div class="yrs">${yrs.join("")}</div></div></div>`;
}
export const legend = (items) => `<div class="row" style="gap:18px;flex-wrap:wrap">${items.map(([c, t, cls]) => `<span class="lg"><i${cls ? ` class="${cls}"` : ""} style="${c ? `background:${c}` : ""}"></i>${t}</span>`).join("")}</div>`;
export const mon = (ym) => `${L.monName(ym)} ${ym.slice(0, 4)}`;

// =========================================================== L1 · The descent
export function descentChart({ H = 230, TOP = 96, id = "l1", compact = false } = {}) {
  const ms = months("2023-06", "2043-07");
  const series = ["home", "car", "pers", "lap"].map((id) => ({ loan: L.loan(id), vals: ms.map((m) => L.balanceAt(L.loan(id), m)) }));
  const totals = ms.map((_, i) => series.reduce((t, s) => t + s.vals[i], 0)), peak = Math.max(...totals), pi = totals.indexOf(peak);
  const ends = (compact ? [["pers", 0], ["car", 1], ["home", 0]] : [["lap", 0], ["pers", 1], ["car", 2], ["home", 0]]).map(([id, r]) => { const l = L.loan(id), e = L.lastEmiOf(l).dueDate.slice(0, 7); return { ym: e, loan: l, row: r, label: l.status === "Closed" ? `${l.name} closed` : `${l.name} ends`, sub: mon(e) }; });
  const hoverRows = (y, i) => hc({ h: `${y === 2043 ? "June" : "December"} ${y}`, t: inr(totals[i]), d: i >= ms.indexOf(L.TODAY.slice(0, 7)) ? "still owed then, if every EMI is paid on time" : "owed at the time", rows: series.filter((s) => s.vals[i] > 0).map((s) => [s.loan.name, inr(s.vals[i]), col(s.loan)]).concat(totals[i] === 0 ? [["Nothing owed", "", ""]] : []), w: 250 });
  const peakChip = `<div class="peakchip" style="left:${(pi / (ms.length - 1)) * 100}%;top:${TOP + H - (peak / 4300000) * H - 30}px"><b>Peak ${inr(peak)}</b><small>${mon(ms[pi])}</small></div>`;
  const chart = stackChart({ id, ms, series, H, TOP, maxV: 4300000, grid: [[1000000, "₹10L"], [2000000, "₹20L"], [3000000, "₹30L"], [4000000, "₹40L"]], flags: ends, hoverRows, extraTop: compact ? "" : peakChip });
  return chart;
}
function descent() {
  const chart = descentChart();
  const inner = `${pk("l1", ["all", ...L.ACTIVE.map((l) => l.id), "lap"])}${pickCss("l1")}${heroTop()}<div class="between">${loanChips("l1")}${legend([["var(--card-sapphire)", "Owed then"], ["color-mix(in oklch,var(--card-sapphire) 38%,white)", "Still to come, if every EMI is paid on time"]])}</div>${chart}`;
  return heroBox("l1dir", inner);
}
export function l1() {
  return page(`${P.greeting()}${P.attention()}${descent()}${row("1.65fr 1fr", [P.loansTable(), P.comingUp({ n: 4 })])}${row("1.6fr 1fr", [P.splitCard(), P.paidFromCard()])}`);
}

// =========================================================== L2 · EMI cliffs
export function cliffsChart({ H = 230, TOP = 96, id = "l2", compact = false } = {}) {
  const ms = months("2026-01", "2043-07"), order = ["home", "car", "pers", "lap"];
  const series = order.map((id) => ({ loan: L.loan(id), vals: ms.map((m) => L.emiIn(m, L.loan(id))) }));
  const totals = ms.map((_, i) => series.reduce((t, s) => t + s.vals[i], 0));
  const ends = (compact ? [["pers", 0], ["car", 1], ["home", 0]] : [["lap", 0], ["pers", 1], ["car", 2], ["home", 0]]).map(([id, r]) => { const l = L.loan(id), e = L.lastEmiOf(l).dueDate.slice(0, 7), i = ms.indexOf(e); return { ym: e, loan: l, row: r, label: `${l.name} ends`, sub: `${mon(e)} · −${inr(L.sum_(id).emi)} a month` }; });
  const hoverRows = (y, i) => { const j = ms.indexOf(`${y}-06`) < 0 ? i : ms.indexOf(`${y}-06`); return hc({ h: y === 2043 ? "January to June 2043" : `Each month of ${y}`, t: `${inr(totals[j])} a month`, d: y === 2026 ? "the Laptop loan ended in April" : "what leaves in EMIs", rows: series.filter((s) => s.vals[j] > 0).map((s) => [s.loan.name, inr(s.vals[j]), col(s.loan)]), f: `${Math.round((totals[j] / L.SALARY) * 100)}% of today's salary`, w: 250 }); };
  const chart = stackChart({ id, ms, series, step: true, H, TOP, maxV: 66000, grid: [[20000, "₹20k"], [40000, "₹40k"], [60000, "₹60k"]], flags: ends, hoverRows });
  return chart;
}
function cliffs() {
  const chart = cliffsChart();
  const list = [["Today", inr(L.EMI_TOTAL), `${plural(L.AS.length, "loan")} paying`]].concat(L.AS.map((s) => s.end).sort().map((e) => [mon(e.slice(0, 7)), inr(L.EMI_TOTAL - L.AS.filter((s) => s.end <= e).reduce((t, s) => t + s.emi, 0)), `after ${L.AS.find((s) => s.end === e).loan.name} ends`]));
  const steps = `<div class="row" style="gap:12px;flex-wrap:wrap;align-items:stretch">${list.map(([k, v, s], i) => `<div class="stepbox${i === 0 ? " on" : ""}"><span class="k">${k}</span><b>${v}</b><small>${s}</small></div>${i < list.length - 1 ? `<span class="stepar">${I.arrowR(14)}</span>` : ""}`).join("")}</div>`;
  const inner = `${pickCss("l2")}${pk("l2", ["all", ...L.ACTIVE.map((l) => l.id), "lap"])}${heroTop({ label: "Going out every month · EMIs", big: bigFigure(L.EMI_TOTAL), sub: `<span class="delta">${Math.round(L.SALARY_SHARE * 100)}% of your ${inr(L.SALARY)} salary</span><span class="hsub">the share is a proposed figure</span>`, list: [FIGS.owed, FIGS.next, FIGS.interest, FIGS.free] })}<div class="between">${loanChips("l2")}${legend([["var(--card-sapphire)", "Paid"], ["color-mix(in oklch,var(--card-sapphire) 38%,white)", "Still to come"]])}</div>${chart}${steps}`;
  return heroBox("l2dir", inner);
}
export function l2() {
  return page(`${P.greeting()}${P.attention()}${cliffs()}${row("1.65fr 1fr", [P.loansTable(), P.costCard()])}${row("1.6fr 1fr", [P.scheduleCard({ loanId: "pers" }), P.comingUp({ n: 5 })])}`);
}

// =========================================================== L3 · Payoff rings
function payoffRings() {
  const S = 440, c = S / 2, radii = [190, 154, 118], W = 26, loans = L.AS.slice();
  const lab = loans.map((s, k) => `<div class="rlabel pick pk-${s.loan.id}" style="top:${c - radii[k] - 9}px;right:${S - c + 10}px"><b>${s.loan.name.replace(" loan", "")}</b> ${(s.repaidPct * 100).toFixed(0)}%</div>`).join("");
  const arcs = loans.map((s, k) => {
    const r = radii[k], circ = 2 * Math.PI * r, a = (s.paidN / s.n) * 2 * Math.PI, dx = c + r * Math.sin(a), dy = c - r * Math.cos(a);
    return `<g class="pick pk-${s.loan.id}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--fill-strong)" stroke-width="${W}"></circle><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${col(s.loan)}" stroke-width="${W}" stroke-linecap="round" stroke-dasharray="${(circ * s.repaidPct).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${c} ${c})"></circle><circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="7" fill="var(--surface)" stroke="${col(s.loan)}" stroke-width="3"></circle></g>`;
  }).join("");
  const ringBox = `<div style="position:relative;width:${S}px;height:${S}px;flex-shrink:0"><svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${arcs}</svg>${lab}<div class="rcentre"><small>Repaid</small><b>${Math.round(L.REPAID_PCT * 100)}%</b><span>${inrL(L.OWE)} still owed</span></div></div>`;
  const cards = L.SUM.map((s) => {
    const l = s.loan, off = l.status === "Closed", timePct = s.paidN / s.n;
    const lag = Math.round((timePct - s.repaidPct) * 100);
    const card2 = hc({ h: l.name, t: `${(s.repaidPct * 100).toFixed(1)}% repaid`, d: `${(timePct * 100).toFixed(1)}% of the way through its term`, rows: [["Principal repaid", inr(s.principalRepaid), PRINCIPAL], ["Interest paid", inr(s.interestPaid), INTEREST], ["Still owed", inr(s.outstanding), ""]], f: "The dot on the ring is how far through the term it is", w: 260 });
    return `<label for="l3-sel-${l.id}" class="lcard pkl pick pk-${l.id} hov${off ? " off" : ""}" tabindex="0" style="--c:${col(l)}"><div class="row" style="gap:12px">${mono(l, 40)}<div class="grow"><b style="font-size:15px;font-weight:800;display:block">${l.name}</b><small style="color:var(--muted);font-weight:600;font-size:12px">${l.lenderName} · ${l.annualInterestRate}% · ${inr(l.principalAmount)} borrowed</small></div><div style="text-align:right"><b style="font-size:20px;font-weight:800;display:block">${off ? "Closed" : inr(s.outstanding)}</b><small style="color:var(--muted);font-weight:600;font-size:11px">${off ? mon(s.end.slice(0, 7)) : "still owed"}</small></div></div><div class="lbars"><div><span>Principal repaid</span><div class="hbar"><span class="rt" style="width:${s.repaidPct * 100}%;background:${L.fill(l, 90)}"></span></div></div><div><span>Through its term · ${s.paidN} of ${s.n} EMIs</span><div class="hbar"><span style="width:${timePct * 100}%;background:var(--ink);opacity:.8"></span></div></div></div>${off ? "" : `<div class="lnote">${lag > 4 ? `The term is ${Math.round(timePct * 100)}% done but only ${(s.repaidPct * 100).toFixed(0)}% of the principal: early EMIs are mostly interest.` : `Ends ${mon(s.end.slice(0, 7))}, ${L.ymTxt(L.monthsTo(s.end))} to go.`}</div>`}${tip(card2, { w: 260, x: "r", y: "up" })}</label>`;
  }).join("");
  const inner = `${pk("l3", ["all", ...L.LOANS.map((l) => l.id)])}${pickCss("l3")}${heroTop({ list: [FIGS.emi, FIGS.interest, FIGS.next, FIGS.free] })}<div style="display:flex;gap:40px;align-items:center">${ringBox}<div class="grow" style="display:flex;flex-direction:column;gap:12px">${cards}<div class="row" style="gap:18px;flex-wrap:wrap;padding-top:2px"><span class="lg"><i style="border-radius:50%;background:var(--card-sapphire)"></i>The ring: principal repaid</span><span class="lg"><i style="border-radius:50%;background:var(--surface);border:2.5px solid var(--card-sapphire)"></i>The dot: how far through its term</span><span class="lg" style="margin-left:auto">Pick a loan to follow it</span></div></div></div>`;
  return heroBox("l3dir", inner);
}
export function l3() {
  return page(`${P.greeting()}${P.attention()}${payoffRings()}${row("1fr 1fr", [P.comingUp({ n: 5 }), P.costCard()])}${P.loansTable()}${row("1.6fr 1fr", [P.splitCard(), P.paidFromCard()])}`);
}

// =========================================================== L4 · EMI tally
function tally() {
  const ms = months("2023-06", "2043-07"), N = ms.length, pct = (ym) => (ms.indexOf(ym) / N) * 100, tw = (100 / N) * 0.62;
  const rows = L.SUM.map((s) => {
    const l = s.loan, off = l.status === "Closed";
    const ticks = s.ins.map((i) => {
      const paid = i.status === "Paid", late = paid && i.paidDate > i.dueDate, isNext = s.next && i.installmentNumber === s.next.installmentNumber;
      const cls = `tk${paid ? "" : " f"}${late ? " late" : ""}${isNext ? " next" : ""}`;
      const card2 = hc({ h: `${l.name} · EMI ${i.installmentNumber} of ${s.n}`, hr: isNext ? `<span class="pill pill-due" style="padding:2px 8px;font-size:10px">next</span>` : late ? `<span class="pill pill-late" style="padding:2px 8px;font-size:10px">${L.daysBetween(i.dueDate, i.paidDate)} days late</span>` : paid ? `<span class="pill pill-on" style="padding:2px 8px;font-size:10px">paid</span>` : "", t: inr(i.totalDue), d: `due ${fmtY(i.dueDate)}`, rows: [["Principal", inr(i.principalDue), PRINCIPAL], ["Interest", inr(i.interestDue), INTEREST], ["Owed after this", inr(i.openingBalance - i.principalDue), ""]], w: 230 });
      const left = pct(i.dueDate.slice(0, 7));
      return `<span class="tkw hov" tabindex="0" style="left:${left}%;width:${tw}%"><i class="${cls}"></i>${tip(card2, { w: 230, x: left > 70 ? "r" : "c", y: "up", off: 14 })}</span>`;
    }).join("");
    return `<div class="trow pick pk-${l.id}${off ? " off" : ""}" style="--c:${col(l)}"><label for="l4-sel-${l.id}" class="tl-lab pkl">${mono(l, 34)}<span><b>${l.name}</b><small>${off ? "Closed" : `${s.paidN} of ${s.n} paid`} · ends ${mon(s.end.slice(0, 7))}</small></span></label><div class="tlane">${ticks}</div></div>`;
  }).join("");
  const nowPct = pct(L.TODAY.slice(0, 7)) + tw / 2;
  const yrs = []; for (let y = 2024; y <= 2043; y += 2) yrs.push(`<span style="left:${pct(`${y}-01`)}%">${y}</span>`);
  const grid = []; for (let y = 2024; y <= 2043; y += 2) grid.push(`<span style="left:${pct(`${y}-01`)}%"></span>`);
  const paidN = L.PAID_N + L.sum_("lap").paidN, totalN = L.SUM.reduce((t, s) => t + s.n, 0);
  const inner = `${pk("l4", ["all", ...L.LOANS.map((l) => l.id)])}${pickCss("l4")}${heroTop({ label: "EMIs paid · every loan", big: `<div class="hbig">${paidN}<small style="margin:0 6px 0 10px">of</small>${totalN}</div>`, sub: `<span class="delta">${I.check(11)} ${plural(L.PAID_N - L.LATE_N + L.sum_("lap").paidN, "EMI")} on the day</span><span class="hsub">${plural(L.LATE_N, "late EMI")}, ${inr(L.AS.reduce((t, s) => t + s.lateCharges, 0))} in charges</span>`, list: [FIGS.owed, FIGS.emi, FIGS.next, FIGS.free] })}<div class="between"><div class="row" style="gap:8px"><label for="l4-sel-all" class="chip pkl" style="cursor:pointer">All loans</label><span class="hsub">one tick for every EMI · hover a tick · pick a loan</span></div>${legend([["var(--card-sapphire)", "Paid"], ["", "Paid late", "latekey"], ["", "Still to come", "futurekey"], ["oklch(0.72 0.14 75)", "Next"]])}</div><div class="tally"><div class="tgrid">${grid.join("")}</div>${rows}<div class="taxis">${yrs.join("")}</div><div class="todayline" style="left:calc(190px + (100% - 190px) * ${(nowPct / 100).toFixed(4)});top:0;bottom:24px"></div></div>`;
  return heroBox("l4dir", inner);
}
export function l4() {
  return page(`${P.greeting()}${P.attention()}${tally()}${row("1.65fr 1fr", [P.scheduleCard({ loanId: "home", before: 3, after: 6 }), P.comingUp({ n: 6 })])}${P.loansTable()}${row("1fr 1fr", [P.splitCard(), P.costCard()])}`);
}

// =========================================================== L5 · Cost anatomy
function anatomy() {
  const MAXX = 2.3, w = (v) => `${(v / MAXX) * 100}%`;
  const mult = (L.BORROWED + L.INTEREST_ALL) / L.BORROWED;
  const rows = L.SUM.map((s) => {
    const l = s.loan, p = l.principalAmount, off = l.status === "Closed", total = (p + s.interestTotal) / p;
    const seg = (v, bg, extra = "") => `<span class="seg5 ${extra}" style="width:${w(v / p)};background:${bg}"></span>`;
    const card2 = hc({ h: l.name, t: `${total.toFixed(2)}× what you borrowed`, d: `${inr(p)} borrowed, ${inr(p + s.interestTotal)} repaid in all`, rows: [["Principal repaid", inr(s.principalRepaid), PRINCIPAL], ["Principal still owed", inr(s.outstanding), `color-mix(in oklch,${PRINCIPAL} 40%,white)`], ["Interest paid", inr(s.interestPaid), INTEREST], ["Interest still to come", inr(s.interestLeft), `color-mix(in oklch,${INTEREST} 40%,white)`]], w: 270 });
    return `<div class="a5 pick pk-${l.id}${off ? " off" : ""}"><div class="cell-name">${mono(l, 34)}<div><b>${l.name}</b><small>${l.lenderName} · ${inr(p)} borrowed</small></div></div><div class="a5bar hov" tabindex="0"><span class="a5track">${seg(s.principalRepaid, PRINCIPAL, "rt")}${seg(s.outstanding, `color-mix(in oklch,${PRINCIPAL} 28%,var(--surface))`, "pale")}${seg(s.interestPaid, INTEREST, "rt")}${seg(s.interestLeft, `color-mix(in oklch,${INTEREST} 30%,var(--surface))`, "pale")}</span><span class="a5end" style="left:calc(${w(total)} + 10px)"><b>${total.toFixed(2)}×</b></span>${tip(card2, { w: 270, x: "c", y: "up", off: 4 })}</div><div class="a5f"><span class="num">${inr(s.interestPaid)}</span><small>interest paid</small></div><div class="a5f"><span class="num">${inr(s.interestLeft)}</span><small>interest to come</small></div></div>`;
  }).join("");
  const axis = [0, 0.5, 1, 1.5, 2].map((v) => `<span style="left:${w(v)}">${v === 1 ? "1× what you borrowed" : `${v}×`}</span>`).join("");
  const inner = `${pickCss("l5")}${heroTop({ label: "What each ₹1 you borrowed costs", big: `<div class="hbig">${mult.toFixed(2)}<small style="margin-left:2px">×</small></div>`, sub: `<span class="hsub">${inr(L.BORROWED)} borrowed, ${inr(L.BORROWED + L.INTEREST_ALL)} repaid in all, if every EMI is on time</span>`, list: [FIGS.owed, FIGS.emi, FIGS.interest, FIGS.free] })}<div class="between">${legend([[PRINCIPAL, "Principal repaid"], [`color-mix(in oklch,${PRINCIPAL} 28%,var(--surface))`, "Principal still owed"], [INTEREST, "Interest paid"], [`color-mix(in oklch,${INTEREST} 30%,var(--surface))`, "Interest still to come"]])}<span class="hsub">a bar's length is what it costs, in multiples of what you borrowed</span></div><div class="a5wrap"><div class="a5scale"><span></span><div class="a5axis">${axis}</div></div>${rows}</div>`;
  return heroBox("l5dir", inner);
}
export function l5() {
  return page(`${P.greeting()}${P.attention()}${anatomy()}${row("1.65fr 1fr", [P.loansTable(), P.comingUp({ n: 6 })])}${row("1.6fr 1fr", [P.splitCard(), P.scheduleCard({ loanId: "car", before: 2, after: 5 })])}`);
}

// =========================================================== L6 · Debt-free clock
function clock() {
  const u = L.untilYmd(L.DEBT_FREE), total = L.monthsTo(L.DEBT_FREE) + 1;
  const tile = (v, k) => `<div class="ctile"><b>${String(v).padStart(2, "0")}</b><small>${k}</small></div>`;
  const base = L.TODAY, span = L.daysBetween(base, L.DEBT_FREE);
  const bars = L.AS.slice().sort((a, b) => (a.end < b.end ? -1 : 1)).map((s) => {
    const l = s.loan, d = L.daysBetween(base, s.end), pc = (d / span) * 100, um = L.untilYmd(s.end), freed = L.AS.filter((x) => x.end > s.end).reduce((t, x) => t + x.emi, 0);
    const card2 = hc({ h: l.name, t: mon(s.end.slice(0, 7)), d: `${L.ymTxt(L.monthsTo(s.end))} from today`, rows: [["EMIs left", String(s.left), ""], ["Still owed", inr(s.outstanding), col(l)], ["Interest to come", inr(s.interestLeft), INTEREST]], f: freed ? `Monthly EMIs fall to ${inr(freed)}` : "Then nothing is owed", w: 250 });
    return `<div class="cbar hov" tabindex="0" style="--c:${col(l)}"><div class="cell-name">${mono(l, 30)}<div><b>${l.name}</b><small>${s.left} EMIs left</small></div></div><div class="ctrack"><span class="cfill rt" style="width:${pc}%"></span><span class="cend${pc > 80 ? " in" : ""}" style="left:${pc}%"><b>${mon(s.end.slice(0, 7))}</b></span></div>${tip(card2, { w: 250, x: "c", y: "up" })}</div>`;
  }).join("");
  const yrs = [2027, 2030, 2035, 2040].map((y) => `<span style="left:${(L.daysBetween(base, `${y}-01-01`) / span) * 100}%">${y}</span>`).join("");
  const miles = L.AS.slice().sort((a, b) => (a.end < b.end ? -1 : 1)).map((s) => {
    const rest = L.AS.filter((x) => x.end > s.end).reduce((t, x) => t + x.emi, 0), um = L.untilYmd(s.end);
    return `<div class="mile"><div class="row" style="gap:10px">${mono(s.loan, 32)}<div><b style="font-size:14px;font-weight:800;display:block">${s.loan.name} clears</b><small style="color:var(--muted);font-weight:600">${mon(s.end.slice(0, 7))} · in ${L.ymTxt(L.monthsTo(s.end))}</small></div></div><div class="mfall"><span>Each month you pay</span><div class="row" style="gap:8px"><s>${inr(L.EMI_TOTAL)}</s>${I.arrowR(12)}<b>${inr(rest)}</b></div></div></div>`;
  }).join("");
  const inner = `<div class="between" style="align-items:flex-start;gap:32px;position:relative"><div style="display:flex;flex-direction:column;gap:14px"><div class="hk">Until the last EMI · ${fmtY(L.DEBT_FREE)}</div><div class="row" style="gap:12px">${tile(u.y, "years")}${tile(u.m, "months")}${tile(u.d, "days")}</div><div class="hsub">${plural(total - 1, "EMI")} to go on the longest loan, the ${L.AS.find((s) => s.end === L.DEBT_FREE).loan.name}</div></div>${figs([FIGS.owed, FIGS.emi, FIGS.next, FIGS.interest])}</div><div class="cwrap"><div class="between" style="margin-bottom:6px"><div class="hk">Runway · today to the last EMI</div><span class="hsub">hover a loan</span></div>${bars}<div class="cyrs">${yrs}</div></div><div class="miles">${miles}</div>`;
  return heroBox("l6dir", inner, { dark: true });
}
export function l6() {
  return page(`${P.greeting()}${P.attention()}${clock()}${row("1.65fr 1fr", [P.loansTable(), P.comingUp({ n: 6 })])}${row("1.6fr 1fr", [P.scheduleCard({ loanId: "pers" }), P.paidFromCard()])}${row("1fr 1fr", [P.splitCard(), P.costCard()])}`);
}
