import * as LIB from "./lib.mjs";
import { TODAY, paymentsFor, priceChanges, inr, fmt, fmtY, fmtSmart, daysBetween, byCategory, byPayer, MONTHLY, ACTIVE, SUBS, planMismatch, mono, I, pct, cardChip, viaName, esc, isOn, monthlyEq, perCycle, nextRenewal, rel, duePill, lastPayment, CARDS, cycleWord, STEP } from "./lib.mjs";

const t = (iso) => Date.parse(`${iso}T00:00:00Z`);

/** A step line of what each payment cost, from the first payment to today. */
export function priceStep(s, { w = 360, h = 120, pad = 26 } = {}) {
  const pays = paymentsFor(s).slice().reverse();
  if (!pays.length) return "";
  const x0 = t(pays[0].date), x1 = t(TODAY);
  const amts = pays.map((p) => p.amount);
  const lo = Math.min(...amts), hi = Math.max(...amts);
  const yMin = lo * 0.75, yMax = hi * 1.12 || 1;
  const X = (iso) => pad + ((t(iso) - x0) / (x1 - x0 || 1)) * (w - pad * 2);
  const Y = (v) => h - 22 - ((v - yMin) / (yMax - yMin || 1)) * (h - 44);
  let d = `M${X(pays[0].date)},${Y(pays[0].amount)}`;
  for (let i = 1; i < pays.length; i++) d += ` H${X(pays[i].date)} V${Y(pays[i].amount)}`;
  d += ` H${X(TODAY)}`;
  const area = `${d} V${h - 22} H${X(pays[0].date)} Z`;
  const ch = priceChanges(s);
  const marks = ch.map((c) => `<circle cx="${X(c.date)}" cy="${Y(c.to)}" r="4" fill="var(--surface)" stroke="${c.to > c.from ? "var(--negative)" : "var(--positive)"}" stroke-width="2"></circle><text x="${X(c.date) - 8}" y="${Y(c.to) + 4}" text-anchor="end" font-size="10.5" font-weight="800" fill="${c.to > c.from ? "var(--negative)" : "var(--positive)"}">${c.to > c.from ? "+" : "−"}${inr(Math.abs(c.to - c.from))}</text>`).join("");
  const years = [];
  for (let y = Number(pays[0].date.slice(0, 4)) + 1; y <= Number(TODAY.slice(0, 4)); y++) years.push(`${y}-01-01`);
  const ticks = years.map((iso) => `<line x1="${X(iso)}" x2="${X(iso)}" y1="10" y2="${h - 22}" stroke="var(--divider)" stroke-dasharray="3 3"></line><text x="${X(iso)}" y="${h - 6}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--muted)">${iso.slice(0, 4)}</text>`).join("");
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display:block;overflow:visible" aria-label="What each ${esc(s.alias)} payment cost">
    ${ticks}
    <path d="${area}" fill="oklch(0.72 0.19 145 / 0.12)"></path>
    <path d="${d}" fill="none" stroke="var(--accent-text)" stroke-width="2" stroke-linejoin="round"></path>
    <text x="${X(pays[0].date)}" y="${Y(pays[0].amount) - 8}" font-size="10.5" font-weight="700" fill="var(--muted)">${inr(pays[0].amount)}</text>
    <circle cx="${X(TODAY)}" cy="${Y(pays.at(-1).amount)}" r="4" fill="var(--accent-text)"></circle>
    <text x="${X(TODAY)}" y="${Y(pays.at(-1).amount) - 9}" text-anchor="end" font-size="11" font-weight="800" fill="var(--fg)">${inr(pays.at(-1).amount)}</text>
    ${marks}
  </svg>`;
}

/** One stacked bar of the monthly total by category, with its list. */
export function categorySplit({ list = true, compact = false } = {}) {
  const cats = byCategory();
  const bar = `<div class="stack">${cats.map((c) => `<span style="flex:${c.v};background:var(--card-${c.color})" title="${c.name}"></span>`).join("")}</div>`;
  if (!list) return bar;
  const rows = cats.map((c) => `<div class="between" style="font-size:13px"><span class="row" style="gap:9px;min-width:0"><i style="width:10px;height:10px;border-radius:3px;background:var(--card-${c.color});flex-shrink:0"></i><b style="font-weight:700">${c.name}</b>${compact ? "" : `<span class="muted" style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.subs.map((s) => s.alias).join(", ")}</span>`}</span><span class="row" style="gap:10px"><b class="num">${inr(c.v)}</b><span class="muted" style="width:34px;text-align:right;font-size:12px;font-weight:700">${pct(c.v, MONTHLY)}</span></span></div>`).join("");
  return `${bar}<div class="spread" style="gap:11px">${rows}</div>`;
}

/** How much of the monthly total lands on each card or account. */
export function payerSplit() {
  const ps = byPayer();
  const max = Math.max(...ps.map((p) => p.v));
  return ps.map((p) => `<div style="display:flex;flex-direction:column;gap:7px"><div class="between">${p.kind === "card" ? cardChip({ card: p.id }) : cardChip({ account: p.id })}<span class="row" style="gap:10px"><span class="muted" style="font-size:12px;font-weight:600">${p.subs.length} ${p.subs.length === 1 ? "subscription" : "subscriptions"}</span><b class="num">${inr(p.v)}</b></span></div><div class="track"><span style="width:${(p.v / max) * 100}%;background:var(--card-${p.color})"></span></div></div>`).join("");
}

/** Price changes found in the payment log, plus last charges that differ from the plan. */
export function changeList({ withAction = true } = {}) {
  const items = [];
  for (const s of SUBS.filter(isOn)) {
    const m = planMismatch(s);
    if (m) items.push({ s, date: m.date, html: `Charged <b>${inr(m.amount)}</b> on ${fmt(m.date)}, but the plan says ${inr(s.amount)}.`, chip: `<span class="chg chg-up">${I.up(10)}${inr(m.amount - s.amount)}</span>`, action: withAction ? `<span class="btn btn-accent btn-xs">Update plan to ${inr(m.amount)}</span>` : "" });
    for (const c of priceChanges(s)) if (daysBetween(c.date, TODAY) < 365 && !(m && m.date === c.date)) items.push({ s, date: c.date, html: `Went from ${inr(c.from)} to <b>${inr(c.to)}</b> on ${fmtSmart(c.date)}.`, chip: `<span class="chg ${c.to > c.from ? "chg-up" : "chg-down"}">${c.to > c.from ? I.up(10) : I.down(10)}${inr(Math.abs(c.to - c.from))}</span>`, action: "" });
  }
  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  return items.map((it) => `<div class="row" style="align-items:flex-start;gap:12px">${mono(it.s, 28)}<div class="grow"><div class="between"><b style="font-size:13px">${it.s.alias}</b>${it.chip}</div><div class="muted" style="font-size:12px;font-weight:500;line-height:1.5;margin-top:2px">${it.html}</div>${it.action ? `<div style="margin-top:7px">${it.action}</div>` : ""}</div></div>`).join("");
}

/** The light hover card for one renewal. */
export function renewalCard(s, date) {
  const last = lastPayment(s);
  return `<div class="hc"><div class="h"><span class="row" style="gap:8px">${mono(s, 20)}<span style="color:var(--fg)">${s.alias}</span></span><span class="pill pill-on" style="padding:2px 8px;font-size:10px">${s.billingCycle}</span></div><div class="t">${inr(s.amount)}</div><div class="d">${fmtY(date)} · ${rel(date)}</div><ul><li><span class="nm">Charged to</span>${cardChip(s.via)}</li><li><span class="nm">Last paid</span><b>${last ? `${inr(last.amount)} · ${fmtSmart(last.date)}` : "Never"}</b></li><li><span class="nm">A month</span><b>${inr(monthlyEq(s))}</b></li></ul><div class="f">Mark paid records ${inr(s.amount)} on ${fmt(date)} to ${viaName(s.via)}.</div></div>`;
}

export function paymentRows(s, n = 5, { phone = false } = {}) {
  const all = paymentsFor(s);
  const pays = all.slice(0, n);
  return pays.map((p) => {
    const i = all.indexOf(p);
    const prev = all[i + 1];
    const diff = prev ? p.amount - prev.amount : 0;
    return `<div class="between" style="padding:9px 0;border-bottom:1px solid var(--divider);font-size:13px"><span style="font-weight:600">${fmtSmart(p.date)}</span><span class="row" style="gap:12px">${diff ? `<span class="chg ${diff > 0 ? "chg-up" : "chg-down"}">${diff > 0 ? I.up(10) : I.down(10)}${inr(Math.abs(diff))}</span>` : ""}${phone ? "" : cardChip(p.via)}<b class="num" style="min-width:58px;text-align:right">${inr(p.amount)}</b></span></div>`;
  }).join("");
}

/** The panel beside the main card on several directions, like the Cards page's Statements panel: what's next, then a link to the Renewals page. */
export function renewalsPanel({ n = 6, title = "Renewals", phone: ph = false, segOn = "", cols = 1 } = {}) {
  const L = LIB;
  const miss = L.SUBS.flatMap((s) => L.unrecorded(s).map((d) => ({ s, date: d, amount: L.priceOn(s, d), missing: true })));
  const next = L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 60)).slice(0, n - miss.length);
  const rows = [...miss, ...next].map((r) => {
    const d = L.daysBetween(L.TODAY, r.date);
    const pill = r.missing ? `<span class="pill pill-warn">Not recorded</span>` : d <= 3 ? `<span class="pill pill-due">In ${d} days</span>` : d <= 7 ? `<span class="pill pill-soon">In ${d} days</span>` : `<span class="muted" style="font-size:12px;font-weight:600">${L.rel(r.date)}</span>`;
    return `<div class="row" style="gap:12px;padding:10px 0;border-bottom:1px solid var(--divider)">${L.mono(r.s, 28)}<span class="grow"><b style="display:block;font-size:13px">${r.s.alias}</b><span class="sub2">${L.fmtDow(r.date)}${ph ? "" : ` · ${L.viaName(r.s.via)}`}</span></span><b class="num" style="font-size:13px">${L.inr(r.amount)}</b><span style="width:${ph ? 92 : 104}px;display:flex;justify-content:flex-end">${pill}</span></div>`;
  }).join("");
  const soon = L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 30));
  return `<section class="card glass" style="gap:6px${ph ? ";padding:16px" : ""}"><div class="card-h"><span class="card-t">${title}<small>${soon.length} in the next 30 days</small></span>${segOn ? `<span class="seg"><span class="seg-i${segOn === "renewals" ? " on" : ""}">Renewals</span><span class="seg-i${segOn === "range" ? " on" : ""}">Spend range</span></span>` : ""}</div>${cols > 1 ? `<div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));column-gap:32px">${rows}</div>` : `<div class="spread" style="gap:0">${rows}</div>`}<div class="between foot" style="padding-top:10px"><span class="card-note">${miss.length ? `${miss.length} not recorded · ` : ""}${L.inr(soon.reduce((t, r) => t + r.amount, 0))} in the next 30 days</span><span class="link">View all renewals ${L.I.arrowR()}</span></div></section>`;
}

export const chargedToCard = ({ title = "Charged to" } = {}) => `<section class="card glass"><div class="card-h"><span class="card-t">${title}<small>a month</small></span></div><div class="spread" style="gap:14px">${payerSplit()}</div><p class="card-note foot">Charges on a card are part of that card's statement, so they're never counted twice.</p></section>`;
export const priceChangesCard = () => `<section class="card glass"><div class="card-h"><span class="card-t">Price changes<small>last 12 months</small></span></div><div class="spread" style="gap:16px">${changeList()}</div></section>`;
export function stoppedCard() {
  const off = SUBS.filter((s) => !isOn(s));
  const year = off.reduce((t, s) => t + monthlyEq(s) * 12, 0);
  return `<section class="card glass"><div class="card-h"><span class="card-t">Stopped<small>not counted</small></span><b style="color:var(--positive)">${inr(year)} a year</b></div><div class="spread" style="gap:10px">${off.map((s) => `<div class="row" style="gap:10px;font-size:13px">${mono(s, 26)}<b class="grow">${s.alias}</b><span class="muted" style="font-weight:600">${s.status === "Paused" ? "paused" : "cancelled"}</span><b class="num">${inr(monthlyEq(s))}/mo</b></div>`).join("")}</div></section>`;
}
