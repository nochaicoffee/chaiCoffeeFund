// Direction F · Cards twin. The Cards page's layout, piece for piece, with categories in place of cards.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./c.mjs";
const { inr, inrK, fmt, fmtY, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, header, desktop, phone, rings } = L;

const nowKey = L.TODAY.slice(0, 7);
const paidNow = L.paidByMonth(nowKey), toCome = L.expectedByMonth(nowKey);
const months2026 = L.monthsFrom("2026-01", 10).map((k) => ({ k, v: L.paidByMonth(k) }));
const hi = months2026.reduce((a, b) => (b.v > a.v ? b : a)), lo = months2026.reduce((a, b) => (b.v < a.v ? b : a));

export const lede = () => `You've paid <b>${inr(L.yearPaid(2026))}</b> for subscriptions so far in 2026, about <b>${inr(L.yearPaid(2026) / 10)}</b> a month. <b>${L.monName(hi.k)} 2026</b> was the biggest month at <b>${inr(hi.v)}</b>. <b>${L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 30)).length} renewals</b> come up in the next 30 days, totalling <b>${inr(L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 30)).reduce((t, r) => t + r.amount, 0))}</b>.`;

function catTile(c, { selected = false, w = 220, h = 176 } = {}) {
  const next = c.subs.map((s) => ({ s, d: L.nextRenewal(s) })).sort((a, b) => (a.d < b.d ? -1 : 1))[0];
  const n = L.daysBetween(L.TODAY, next.d);
  return `<div class="dtile${selected ? " sel" : ""}" style="width:${w}px;height:${h}px;background:linear-gradient(155deg,var(--card-${c.color}-from),var(--card-${c.color}-to))">${rings(w, h, { stroke: "var(--rings-light)", opacity: 0.05, count: 8 })}<span class="tick">${I.check(11)}</span>
    <div class="between"><span class="row" style="gap:0">${c.subs.map((s, i) => `<span style="width:24px;height:24px;border-radius:8px;background:var(--on-card-fill);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;margin-left:${i ? -6 : 0}px;box-shadow:0 0 0 2px oklch(0 0 0 / 0.25)">${s.alias[0]}</span>`).join("")}</span><span class="dt-faint">${c.subs.length} ${c.subs.length === 1 ? "subscription" : "subscriptions"}</span></div>
    <div><div style="font-size:15px;font-weight:800">${c.name}</div><div class="between" style="margin-top:6px"><span class="dt-muted">${inr(c.v)} a month</span><span class="dt-muted" style="font-weight:700">${L.pct(c.v, L.MONTHLY)}</span></div>
      <div style="height:5px;border-radius:999px;background:var(--on-card-fill);overflow:hidden;margin-top:6px"><div style="width:${(c.v / L.MONTHLY) * 100}%;height:100%;background:oklch(1 0 0 / 0.85)"></div></div>
      <div class="between" style="margin-top:9px"><span class="dt-pill${n <= 3 ? " due" : n <= 7 ? " soon" : ""}">${next.s.alias} · ${fmt(next.d)}</span><span class="dt-faint">${inr(c.v * 12)} a year</span></div></div></div>`;
}
function allTile({ w = 270, h = 176 } = {}) {
  return `<div class="dtile sel" style="width:${w}px;height:${h}px;background:radial-gradient(circle at 92% 6%, var(--card-emerald-glow), transparent 42%),linear-gradient(150deg,var(--card-emerald-from),var(--card-emerald-to))">${rings(w, h, { stroke: "var(--rings-light)", opacity: 0.07, count: 10 })}<span class="tick">${I.check(11)}</span>
    <div class="between"><span style="display:flex">${I.subs(18)}</span><span class="dt-faint">${L.byCategory().length} categories</span></div>
    <div><div style="font-size:16px;font-weight:800">All subscriptions</div><div class="between" style="margin-top:6px"><span class="dt-muted">${inr(paidNow)} / ${inr(paidNow + toCome)} in Oct</span><span class="dt-muted" style="font-weight:700">${L.pct(paidNow, paidNow + toCome)}</span></div>
      <div style="height:5px;border-radius:999px;background:var(--on-card-fill);overflow:hidden;margin-top:6px"><div style="width:${(paidNow / (paidNow + toCome)) * 100}%;height:100%;background:var(--on-card-lime)"></div></div>
      <div class="between" style="margin-top:9px"><span class="dt-pill">${L.ACTIVE.length} active</span><span class="dt-faint">Next Oct 23</span></div></div></div>`;
}

/** The Cards heatmap: one row per year, a cell per month, paid shades, dashed months still to come. */
export function heatmap({ years = [2025, 2026], phone: ph = false } = {}) {
  const vals = years.flatMap((y) => L.monthsFrom(`${y}-01`, 12).map((k) => (k <= nowKey ? L.paidByMonth(k) : 0))).filter(Boolean);
  const max = Math.max(...vals), min = Math.min(...vals);
  const lvl = (v) => 1 + Math.min(4, Math.floor(((v - min) / (max - min || 1)) * 5));
  const peakK = years.flatMap((y) => L.monthsFrom(`${y}-01`, 12)).filter((k) => k <= nowKey).reduce((a, k) => (L.paidByMonth(k) > L.paidByMonth(a) ? k : a));
  const cell = (k) => {
    const v = k <= nowKey ? L.paidByMonth(k) : L.expectedByMonth(k);
    if (k > nowKey) return `<div class="hcell up">${ph ? "" : inrK(v)}${ph ? "" : `<span class="cap">expected</span>`}</div>`;
    if (!v) return `<div class="hcell none">–</div>`;
    const l = lvl(v), ink = l >= 4 ? "var(--on-accent)" : "var(--heat-ink)";
    const now = k === nowKey, peak = k === peakK;
    return `<div class="hcell${now ? " now" : ""}" style="background:var(--heat-${l});color:${ink}${peak ? ";box-shadow:0 10px 22px var(--trend-peak-shadow)" : ""}">${rings(100, 54, { dx: 6, dy: 14, first: 18, step: 12, stroke: l >= 4 ? "var(--rings-light)" : "var(--rings-ink)", opacity: 0.09 })}${ph ? "" : inrK(v)}<span class="cap">${now ? "This month" : peak ? "Peak" : ""}</span></div>`;
  };
  const cols = ph ? "36px repeat(12,minmax(0,1fr))" : "52px repeat(12,minmax(0,1fr)) 150px";
  return `<div class="heat" style="grid-template-columns:${cols};gap:${ph ? 3 : 8}px"><span></span>${L.monthsFrom("2026-01", 12).map((k) => `<div class="heat-m${k === nowKey ? " now" : ""}">${ph ? L.monName(k)[0] : L.monName(k)}${k === nowKey && !ph ? ' <span style="color:var(--accent)">●</span>' : ""}</div>`).join("")}${ph ? "" : `<div class="heat-m" style="text-align:right">Year</div>`}
    ${years.map((y) => { const ks = L.monthsFrom(`${y}-01`, 12); const paid = ks.reduce((t, k) => t + (k <= nowKey ? L.paidByMonth(k) : 0), 0); const n = ks.filter((k) => k <= nowKey && L.paidByMonth(k)).length; return `<span style="font-size:${ph ? 11 : 13}px;font-weight:800">${ph ? `’${String(y).slice(2)}` : y}</span>${ks.map(cell).join("")}${ph ? "" : `<div style="text-align:right"><b style="font-size:16px">${inr(paid)}</b><div class="muted" style="font-size:11px;font-weight:600">${n} months · avg ${inr(paid / n)}</div></div>`}`; }).join("")}</div>`;
}

function details() {
  const soon = L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 7));
  const soonT = soon.reduce((t, r) => t + r.amount, 0);
  return `<section class="card glass" style="padding:0;gap:0;overflow:hidden">
    <div class="textured" style="margin:10px;border-radius:18px;padding:18px 20px;color:var(--on-card);background:radial-gradient(circle at 92% 6%, var(--card-emerald-glow), transparent 42%),linear-gradient(150deg,var(--card-emerald-from),var(--card-emerald-to));box-shadow:var(--tile-shadow)">${rings(600, 200, { stroke: "var(--rings-light)", opacity: 0.07 })}
      <span class="dt-muted" style="font-size:12px">All subscriptions · ${L.ACTIVE.length} active</span>
      <div style="display:flex;align-items:baseline;gap:10px;margin-top:6px"><span style="font-size:34px;font-weight:800">${inr(L.MONTHLY)}</span><span class="dt-muted" style="font-size:13px;font-weight:700">a month · ${inr(L.YEARLY)} a year</span></div>
      <div style="position:relative;margin-top:26px"><span style="position:absolute;left:${(L.MONTHLY / (paidNow + toCome)) * 100}%;top:-24px;transform:translateX(-50%);font-size:10px;font-weight:800;padding:3px 8px;border-radius:999px;background:var(--on-card-fill);white-space:nowrap">Usual ${inr(L.MONTHLY)}</span><span style="position:absolute;left:${(L.MONTHLY / (paidNow + toCome)) * 100}%;top:-4px;width:1px;height:16px;background:oklch(1 0 0 / 0.6)"></span>
        <div style="height:10px;border-radius:999px;background:var(--on-card-fill);overflow:hidden"><div style="width:${(paidNow / (paidNow + toCome)) * 100}%;height:100%;background:var(--on-card-lime);border-radius:inherit"></div></div>
        <div class="between dt-muted" style="margin-top:7px;font-size:11px"><span>${inr(paidNow)} paid in October</span><span>${inr(paidNow + toCome)} this month</span></div></div>
    </div>
    <div style="padding:6px 20px 18px;display:grid;grid-template-columns:1fr 1px 1fr;gap:12px 22px;font-size:13px;flex:1 1 auto;align-content:space-between">
      <div style="display:flex;flex-direction:column;gap:10px"><div class="between"><span class="muted" style="font-weight:600">Paid this year</span><b>${inr(L.yearPaid(2026))}</b></div><div class="between"><span class="muted" style="font-weight:600">A year, at today's prices</span><b>${inr(L.YEARLY)}</b></div></div>
      <span style="background:var(--divider)"></span>
      <div style="display:flex;flex-direction:column;gap:10px"><div class="between"><span class="muted" style="font-weight:600"><span style="color:var(--negative)">▲</span> Biggest month</span><b>${inr(hi.v)} <span class="muted" style="font-size:11px">${L.monName(hi.k)}</span></b></div><div class="between"><span class="muted" style="font-weight:600"><span style="color:var(--positive)">▼</span> Smallest month</span><b>${inr(lo.v)} <span class="muted" style="font-size:11px">${L.monName(lo.k)}</span></b></div></div>
      <div style="grid-column:1/-1;padding:12px 14px;border-radius:14px;background:var(--fill);display:flex;flex-direction:column;gap:8px"><div class="between"><span style="font-size:12px;font-weight:600" class="muted">Next 7 days · ${soon.length} renewals</span><b style="font-size:15px">${inr(soonT)}</b></div>
        <div class="stack" style="height:22px;border-radius:8px">${soon.map((r) => `<span class="textured" style="flex:${r.amount};background:var(--card-${L.catColor(r.s.category)});border-radius:6px;color:var(--on-card);font-size:10.5px;font-weight:800;display:flex;align-items:center;padding-left:8px">${rings(200, 22, { stroke: "var(--rings-light)", opacity: 0.12, first: 10, step: 8 })}${inrK(r.amount)}</span>`).join("")}</div>
        <div class="legend" style="font-size:11px">${soon.map((r) => `<span><i style="background:var(--card-${L.catColor(r.s.category)})"></i><b>${r.s.alias} ${inr(r.amount)}</b> ${fmt(r.date)}</span>`).join("")}</div></div>
    </div></section>`;
}

export function fDesktop() {
  const cats = L.byCategory();
  const body = `${header({ eyebrow: "Subscriptions · Today", title: "Good morning, Prathik", lede: lede(), actions: `${L.select({ value: "This year", kind: "pill", icon: I.cal(14), align: "align-end", options: [{ label: "This year", on: true }, { label: "2025" }, { label: "All time" }] })}${btn("Add subscription", { kind: "primary", icon: I.plus() })}` })}
    <div style="position:relative;margin:0 -26px"><div style="display:flex;gap:16px;overflow-x:auto;scrollbar-width:none;padding:12px 26px 18px">${allTile()}${cats.map((c) => catTile(c)).join("")}<span class="addtile" style="width:180px;height:176px">${I.plus(18)}Add subscription</span></div><span style="position:absolute;right:0;top:0;bottom:0;width:90px;background:linear-gradient(90deg,transparent,var(--surface));pointer-events:none"></span></div>
    <section class="card glass"><div class="card-h"><span class="card-t">Payments by month<small>All subscriptions</small></span><span class="legend"><span><i class="hcell none" style="width:12px;height:12px;border-radius:4px"></i>No payments</span><span><i style="border:1.5px dashed var(--heat-upcoming);background:transparent"></i>Expected</span><span>Low <i style="background:var(--heat-1)"></i><i style="background:var(--heat-2)"></i><i style="background:var(--heat-3)"></i><i style="background:var(--heat-4)"></i><i style="background:var(--heat-5)"></i> High</span></span></div>${heatmap()}</section>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:20px;align-items:stretch">${details()}${P.renewalsPanel({ n: 5, segOn: "renewals" })}</div>
    <section class="card glass"><div class="card-h"><span class="card-t">Payment trend<small>paid, and what's expected next</small></span><span class="row" style="gap:10px">${seg([{ label: "By category" }, { label: "Total", on: true }])}${seg([{ label: "All" }, { label: "1Y", on: true }, { label: "6M" }, { label: "3M" }])}</span></div>${C.trend({ w: 1360, h: 280 })}</section>`;
  return desktop({ h: "auto", body });
}

export function fPhone() {
  const cats = L.byCategory();
  const body = `${header({ eyebrow: "Subscriptions · Today", title: "Good morning, Prathik", lede: lede(), phone: true, actions: `${L.select({ value: "This year", kind: "pill", icon: I.cal(14), options: [] })}${btn("Add subscription", { kind: "primary", icon: I.plus() })}` })}
    <div style="margin:0 -16px;overflow:hidden"><div style="display:flex;gap:12px;padding:10px 16px 16px">${allTile({ w: 236, h: 164 })}${cats.slice(0, 2).map((c) => catTile(c, { w: 196, h: 164 })).join("")}</div></div>
    <section class="card glass" style="padding:14px;gap:10px"><span class="card-t">Payments by month</span>${heatmap({ phone: true })}<span class="card-note">Tap a month for what renewed in it.</span></section>
    ${details().replace(/grid-template-columns:1fr 1px 1fr/, "grid-template-columns:1fr").replace('<span style="background:var(--divider)"></span>', "")}
    ${P.renewalsPanel({ n: 5, phone: true })}`;
  return phone({ h: "auto", body });
}
