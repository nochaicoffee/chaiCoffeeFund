// Two more layouts for the Renewals page: R2 a ledger timeline, R3 a grid of subscriptions by month.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as RN from "./renewals.mjs";
const { inr, inrK, fmt, fmtY, fmtSmart, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, select, rings, header, desktop, phone } = L;

const ROWS = L.renewalRows("2026-01-01", "2026-12-31");
const nowKey = L.TODAY.slice(0, 7);
const soonEnd = L.addDays(L.TODAY, 30);
const MONTHS = { Jan: "January", Feb: "February", Mar: "March", Apr: "April", May: "May", Jun: "June", Jul: "July", Aug: "August", Sep: "September", Oct: "October", Nov: "November", Dec: "December" };
const longMonth = (k) => `${MONTHS[L.monName(k)]} ${k.slice(0, 4)}`;
const back = `<span class="row" style="gap:6px">${I.chevR(11).replace("9 6 15 12 9 18", "15 6 9 12 15 18")} Subscriptions · Renewals</span>`;
const actions = () => `${RN.periodSelect()}${iconBtn(I.refresh(), "Refresh")}${btn("Record payment", { kind: "primary", icon: I.plus() })}`;
const lede = () => `<b>${ROWS.length} renewals in 2026</b>: ${ROWS.filter((r) => r.status === "paid").length} paid, <b>${ROWS.filter((r) => r.status === "missing").length} not recorded</b>, and ${ROWS.filter((r) => r.status === "upcoming").length} still to come.`;

// ================= R2 · Ledger =================
function node(r) {
  const n = L.daysBetween(L.TODAY, r.date);
  if (r.status === "paid") return `<span style="width:22px;height:22px;border-radius:50%;background:var(--accent);color:var(--on-accent);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px var(--surface)">${I.check(10)}</span>`;
  if (r.status === "missing") return `<span style="width:22px;height:22px;border-radius:50%;background:var(--warning);color:var(--surface);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;box-shadow:0 0 0 4px var(--surface)">!</span>`;
  if (r.status === "wont") return `<span style="width:18px;height:18px;border-radius:50%;border:2px dashed var(--fill-strong);background:var(--surface);box-shadow:0 0 0 4px var(--surface)"></span>`;
  return `<span style="width:18px;height:18px;border-radius:50%;border:2px ${n <= 3 ? "solid var(--negative)" : "dashed var(--heat-4)"};background:var(--surface);box-shadow:0 0 0 4px var(--surface)${n <= 3 ? ",0 0 0 7px var(--due-pulse-ring)" : ""}"></span>`;
}
function item(r, { ph = false } = {}) {
  const n = L.daysBetween(L.TODAY, r.date);
  const act = r.status === "missing" ? btn("Record payment", { kind: "ghost", cls: "btn-sm" }) : r.status === "upcoming" && n <= 3 ? btn("Mark paid", { kind: "accent", cls: "btn-sm", icon: I.check(11) }) : "";
  const amount = r.payment ? inr(r.payment.amount) : inr(r.plan);
  return `<div style="display:grid;grid-template-columns:${ph ? "44px 26px minmax(0,1fr)" : "70px 40px minmax(0,1fr)"};align-items:center;min-height:${ph ? 64 : 66}px">
    <div style="text-align:right;padding-right:${ph ? 4 : 10}px"><b style="display:block;font-size:${ph ? 15 : 17}px;line-height:1.1">${Number(r.date.slice(8))}</b><span style="font-size:10px;font-weight:800;text-transform:uppercase;color:var(--muted)">${L.dow(r.date)}</span></div>
    <div style="display:flex;justify-content:center;position:relative;z-index:1">${node(r)}</div>
    <div class="row" style="gap:12px;padding:10px 14px;border-radius:14px;background:${r.status === "missing" ? "oklch(0.98 0.03 85)" : "var(--surface)"};border:1px solid ${r.status === "missing" ? "oklch(0.72 0.14 75 / 0.35)" : "var(--surface-line)"};margin:4px 0;min-width:0;${ph ? "padding:9px 10px;gap:9px;" : ""}${r.status === "wont" ? "opacity:0.65;" : ""}">
      ${mono(r.s, ph ? 28 : 30)}<span class="grow" style="min-width:0"><b style="display:block;font-size:13px">${r.s.alias}</b><span class="sub2">${ph ? (r.payment ? L.viaName(r.payment.via) : r.status === "missing" ? "no payment" : r.status === "wont" ? "cancelled" : rel(r.date)) : `${r.s.category} · ${r.s.billingCycle}${r.payment ? ` · ${L.viaName(r.payment.via)}` : r.status === "upcoming" ? ` · ${rel(r.date)} · ${L.viaName(r.s.via)}` : r.status === "wont" ? ` · cancelled ${fmt(r.s.endDate)}` : ""}`}</span></span>
      ${!ph && r.payment && (r.change || r.overPlan) ? RN.change(r) : ""}
      <b class="num" style="font-size:14px;${r.payment ? "" : "color:var(--muted);"}${r.status === "wont" ? "text-decoration:line-through;" : ""}">${amount}</b>
      ${ph ? RN.status(r) : `<span style="width:116px;display:flex;justify-content:flex-end">${RN.status(r)}</span>`}${ph ? "" : `<span style="width:132px;display:flex;justify-content:flex-end">${act || `<span style="color:var(--muted);display:flex">${r.payment ? I.more() : ""}</span>`}</span>`}
    </div></div>`;
}
const monthMarker = (k, rows, { ph = false } = {}) => {
  const paid = rows.filter((r) => r.payment).reduce((t, r) => t + r.payment.amount, 0);
  const due = rows.filter((r) => r.status === "upcoming").reduce((t, r) => t + r.plan, 0);
  return `<div style="display:grid;grid-template-columns:${ph ? "44px 26px minmax(0,1fr)" : "70px 40px minmax(0,1fr)"};align-items:center;padding:14px 0 6px"><span></span><span style="display:flex;justify-content:center;position:relative;z-index:1"><span style="width:12px;height:12px;border-radius:4px;background:var(--ink);box-shadow:0 0 0 4px var(--surface)"></span></span><div class="between"><b style="font-size:15px">${longMonth(k)}</b><span class="muted" style="font-size:12px;font-weight:700">${[paid ? `${inr(paid)} paid` : "", due ? `${inr(due)} to come` : ""].filter(Boolean).join(" · ")}</span></div></div>`;
};
export function ledger({ rows = ROWS, maxPast = 3, ph = false, showUpTo = soonEnd } = {}) {
  const fut = rows.filter((r) => (r.status === "upcoming" || r.status === "wont") && r.date <= showUpTo);
  const past = rows.filter((r) => r.status === "paid" || r.status === "missing");
  const keys = [...new Set([...fut, ...past].map((r) => r.date.slice(0, 7)))].sort().reverse();
  const pastKeys = [...new Set(past.map((r) => r.date.slice(0, 7)))].slice(0, maxPast);
  const keep = keys.filter((k) => k > nowKey || k === nowKey || pastKeys.includes(k));
  let out = "";
  for (const k of keep) {
    const rs = [...fut, ...past].filter((r) => r.date.startsWith(k));
    out += monthMarker(k, rows.filter((r) => r.date.startsWith(k)), { ph });
    const after = rs.filter((r) => r.date >= L.TODAY), before = rs.filter((r) => r.date < L.TODAY);
    out += after.map((r) => item(r, { ph })).join("");
    if (k === nowKey) out += `<div style="display:grid;grid-template-columns:${ph ? "44px 26px minmax(0,1fr)" : "70px 40px minmax(0,1fr)"};align-items:center;padding:6px 0"><b style="text-align:right;padding-right:${ph ? 4 : 10}px;font-size:11px;color:var(--accent-text);text-transform:uppercase;letter-spacing:0.04em">Today</b><span style="display:flex;justify-content:center;position:relative;z-index:1"><span style="width:14px;height:14px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px var(--surface),0 0 0 7px var(--accent-ring)"></span></span><div class="row" style="gap:10px"><span style="flex:1;border-top:1.5px solid var(--accent)"></span><span class="pill pill-on">${fmtDow(L.TODAY)}</span></div></div>`;
    out += before.map((r) => item(r, { ph })).join("");
  }
  return `<div style="position:relative"><span style="position:absolute;left:${ph ? 44 + 13 : 70 + 20}px;top:20px;bottom:0;width:2px;background:var(--divider)"></span>${out}</div>`;
}
function monthRail() {
  const keys = L.monthsFrom("2026-01", 12).reverse();
  return `<nav class="card glass" style="gap:2px;padding:12px;position:sticky;top:0"><span class="th" style="padding:4px 10px 8px">2026</span>${keys.map((k) => {
    const rs = ROWS.filter((r) => r.date.startsWith(k));
    const v = k < nowKey ? L.paidByMonth(k) : k === nowKey ? L.paidByMonth(k) + L.expectedByMonth(k) : L.expectedByMonth(k);
    const miss = rs.some((r) => r.status === "missing");
    return `<div class="between" style="padding:8px 10px;border-radius:10px;font-size:13px;font-weight:700;${k === nowKey ? "background:var(--accent-tint);color:var(--accent-text)" : k > nowKey ? "color:var(--muted)" : ""}"><span class="row" style="gap:6px">${L.monName(k)}${miss ? '<i style="width:7px;height:7px;border-radius:50%;background:var(--warning)"></i>' : ""}</span><span style="font-size:12px">${inrK(v)}</span></div>`;
  }).join("")}<span class="card-note" style="padding:8px 10px 0">Grey months are expected.</span></nav>`;
}
function sideSummary() {
  const ks = L.monthsFrom("2026-01", 10);
  const max = Math.max(...ks.map(L.paidByMonth));
  const miss = ROWS.filter((r) => r.status === "missing");
  const ch = ROWS.filter((r) => r.change > 0);
  return `<div style="display:flex;flex-direction:column;gap:16px;position:sticky;top:0">
    <section class="card glass textured" style="gap:10px;background:var(--feature-tile);border-color:var(--feature-tile-line)">${rings(330, 220, { opacity: 0.1 })}<span class="k" style="font-size:12px;font-weight:600;color:oklch(0.38 0.06 152)">Paid this year</span><span style="font-size:30px;font-weight:800">${inr(L.yearPaid(2026))}</span><span style="font-size:12px;font-weight:600;color:oklch(0.38 0.06 152)">${L.yearPayments(2026)} payments · ${inr(L.yearPaid(2026) / 10)} a month</span>
      <div style="display:flex;gap:4px;align-items:flex-end;height:54px">${ks.map((k) => `<span style="flex:1;height:${(L.paidByMonth(k) / max) * 100}%;border-radius:4px 4px 2px 2px;background:${k === nowKey ? "var(--accent)" : "oklch(0.42 0.1 152 / 0.45)"}"></span>`).join("")}</div></section>
    <section class="card glass" style="gap:10px"><div class="between"><span class="card-t" style="font-size:14px">Not recorded</span><span class="pill pill-warn">${miss.length}</span></div>${miss.map((r) => `<div class="row" style="gap:10px;font-size:13px">${mono(r.s, 24)}<b class="grow">${r.s.alias}</b><span class="muted" style="font-weight:600">${fmt(r.date)}</span></div>`).join("")}${btn("Show only these", { kind: "soft", cls: "btn-sm" })}</section>
    <section class="card glass" style="gap:10px"><span class="card-t" style="font-size:14px">Price changes</span>${ch.map((r) => `<div class="row" style="gap:10px;font-size:13px">${mono(r.s, 24)}<b class="grow">${r.s.alias}</b><span class="chg chg-up">${I.up(9)}${inr(r.change)}</span><span class="muted" style="font-weight:600;font-size:12px">${fmt(r.date)}</span></div>`).join("")}</section>
  </div>`;
}
function monthChips() {
  const keys = L.monthsFrom("2026-01", 12).reverse();
  return `<div class="row" style="gap:6px;flex-wrap:wrap">${keys.map((k) => {
    const v = k < nowKey ? L.paidByMonth(k) : k === nowKey ? L.paidByMonth(k) + L.expectedByMonth(k) : L.expectedByMonth(k);
    const miss = ROWS.some((r) => r.date.startsWith(k) && r.status === "missing");
    return `<span class="chip${k === nowKey ? " on" : ""}" style="${k > nowKey && k !== nowKey ? "background:transparent;border:1.5px dashed var(--fill-strong);" : ""}">${L.monName(k)}${miss ? '<i style="width:7px;height:7px;border-radius:50%;background:var(--warning)"></i>' : ""}<em>${inrK(v)}</em></span>`;
  }).join("")}</div>`;
}
function summaryRow() {
  const ks = L.monthsFrom("2026-01", 10);
  const max = Math.max(...ks.map(L.paidByMonth));
  const miss = ROWS.filter((r) => r.status === "missing");
  const ch = ROWS.filter((r) => r.change > 0);
  return `<div style="display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:16px">
    <section class="card glass textured" style="gap:8px;background:var(--feature-tile);border-color:var(--feature-tile-line);flex-direction:row;align-items:stretch">${rings(520, 160, { opacity: 0.1 })}<div style="display:flex;flex-direction:column;gap:4px"><span style="font-size:12px;font-weight:600;color:oklch(0.38 0.06 152)">Paid this year</span><span style="font-size:30px;font-weight:800">${inr(L.yearPaid(2026))}</span><span style="font-size:12px;font-weight:600;color:oklch(0.38 0.06 152)">${L.yearPayments(2026)} payments · ${inr(L.yearPaid(2026) / 10)} a month</span></div>
      <div class="grow" style="display:flex;gap:4px;align-items:flex-end;min-height:70px">${ks.map((k) => `<span style="flex:1;height:${(L.paidByMonth(k) / max) * 100}%;border-radius:4px 4px 2px 2px;background:${k === nowKey ? "var(--accent)" : "oklch(0.42 0.1 152 / 0.45)"}"></span>`).join("")}</div></section>
    <section class="card glass" style="gap:10px"><div class="between"><span class="card-t" style="font-size:14px">Not recorded</span><span class="pill pill-warn">${miss.length}</span></div><div class="spread" style="gap:8px">${miss.map((r) => `<div class="row" style="gap:10px;font-size:13px">${mono(r.s, 24)}<b class="grow">${r.s.alias}</b><span class="muted" style="font-weight:600">${fmtDow(r.date)}</span><b class="num">${inr(r.plan)}</b></div>`).join("")}${btn("Show only these", { kind: "soft", cls: "btn-sm" })}</div></section>
    <section class="card glass" style="gap:10px"><span class="card-t" style="font-size:14px">Price changes</span><div class="spread" style="gap:8px">${ch.map((r) => `<div class="row" style="gap:10px;font-size:13px">${mono(r.s, 24)}<b class="grow">${r.s.alias}</b><span class="chg chg-up">${I.up(9)}${inr(r.change)}</span><span class="muted" style="font-weight:600;font-size:12px">${fmt(r.date)}</span></div>`).join("")}</div></section>
  </div>`;
}
export function r2Desktop() {
  const body = `${header({ eyebrow: back, title: "Renewals", lede: lede(), actions: actions() })}
    ${summaryRow()}
    <section class="card glass" style="gap:10px;padding:16px 22px 22px"><div class="between" style="flex-wrap:wrap">${seg([{ label: "All", count: ROWS.length, on: true }, { label: "Upcoming", count: ROWS.filter((r) => r.status === "upcoming").length }, { label: "Paid", count: ROWS.filter((r) => r.status === "paid").length }, { label: "Not recorded", count: 1 }])}${select({ value: "All subscriptions", kind: "small", align: "align-end", options: [{ label: "All subscriptions", on: true }] })}</div>
      <div class="between" style="gap:14px;padding:4px 0 2px;border-bottom:1px solid var(--divider);padding-bottom:12px"><span class="th" style="white-space:nowrap">Jump to</span>${monthChips()}</div>
      <div style="padding:0 120px 0 60px">${ledger()}</div><div style="padding:6px 0 0 190px"><span class="link">Show July and earlier ${I.chev(11)}</span></div></section>`;
  return desktop({ h: "auto", body });
}
export function r2Phone() {
  const body = `${header({ eyebrow: "← Subscriptions · Renewals", title: "Renewals", lede: lede(), phone: true, actions: `${RN.periodSelect()}${btn("Record payment", { kind: "primary", icon: I.plus() })}` })}
    <div style="display:flex;gap:6px;overflow:hidden;margin:0 -16px;padding:0 16px">${["All", "Upcoming", "Paid", "Not recorded"].map((x, i) => `<span class="chip${i === 0 ? " on" : ""}">${x}</span>`).join("")}</div>
    <section class="card glass" style="padding:10px 12px 16px;gap:0">${ledger({ ph: true, maxPast: 2, showUpTo: L.addDays(L.TODAY, 14) })}<span class="link" style="align-self:center;padding-top:10px">Show more</span></section>`;
  return phone({ h: "auto", body });
}

// ================= R3 · Grid =================
const GRID_KEYS = L.monthsFrom("2026-01", 12);
function cellFor(s, k) {
  const rs = ROWS.filter((r) => r.s === s && r.date.startsWith(k));
  if (!rs.length) return { kind: "none" };
  const r = rs[0];
  return { kind: r.status, r };
}
function gridCell(s, k, { dimExcept = null, ph = false } = {}) {
  const c = cellFor(s, k);
  const keep = dimExcept === "change" ? Boolean(c.r && (c.r.change > 0 || c.r.overPlan)) : c.kind === dimExcept;
  const dim = dimExcept && !keep ? "opacity:0.22;" : "";
  const now = k === nowKey;
  if (c.kind === "none") return `<div style="height:${ph ? 18 : 44}px;display:flex;align-items:center;justify-content:center;color:var(--fill-strong);font-weight:800;${now ? "background:oklch(0.72 0.19 145 / 0.06);" : ""}${dim}">${ph ? `<i style="width:4px;height:4px;border-radius:50%;background:var(--fill-strong)"></i>` : "·"}</div>`;
  const r = c.r;
  const styles = { paid: "background:var(--accent-tint);color:var(--accent-text)", missing: "background:var(--warning-tint);color:var(--warning-text);box-shadow:inset 0 0 0 1.5px var(--warning)", upcoming: "border:1.5px dashed var(--heat-upcoming);color:var(--muted)", wont: "border:1.5px dashed var(--fill-strong);color:var(--muted);text-decoration:line-through" };
  const due = r.status === "upcoming" && L.daysBetween(L.TODAY, r.date) <= 3;
  if (ph) return `<div style="height:18px;border-radius:5px;${styles[r.status]}${due ? ";box-shadow:inset 0 0 0 1.5px var(--negative)" : ""};${dim}"></div>`;
  return `<div class="hov" style="${dim}"><div style="position:relative;height:44px;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px;font-weight:800;${styles[r.status]}${due ? ";border-color:var(--negative);color:var(--negative)" : ""}">${inr(r.payment ? r.payment.amount : r.plan)}<span style="font-size:9.5px;font-weight:700;opacity:0.85">${r.status === "missing" ? "not recorded" : due ? `in ${L.daysBetween(L.TODAY, r.date)} days` : `${L.monName(k)} ${Number(r.date.slice(8))}`}</span>${r.change > 0 ? `<span style="position:absolute;top:-7px;right:-5px;padding:1px 5px;border-radius:999px;background:var(--negative);color:var(--on-accent);font-size:9px;font-weight:800">+${inr(r.change)}</span>` : ""}</div>
    <div class="hc-wrap" style="top:50px;left:50%;margin-left:-125px">${cellCard(r)}</div></div>`;
}
function cellCard(r) {
  return `<div class="hc"><div class="h"><span class="row" style="gap:8px">${mono(r.s, 20)}<span style="color:var(--fg)">${r.s.alias}</span></span>${RN.status(r)}</div><div class="t">${inr(r.payment ? r.payment.amount : r.plan)}</div><div class="d">${fmtY(r.date)}${r.payment ? ` · ${L.viaName(r.payment.via)}` : ""}</div>${r.change ? `<div class="f">${RN.change(r)}</div>` : ""}</div>`;
}
export function grid({ dimExcept = null, subs = null, ph = false } = {}) {
  const groups = [["Active", L.byCost], ["Paused", L.SUBS.filter((s) => s.status === "Paused")], ["Cancelled", L.SUBS.filter((s) => s.status === "Cancelled")]].map(([t, l]) => [t, subs ? l.filter((s) => subs.includes(s)) : l]).filter(([, l]) => l.length);
  const cols = ph ? "92px repeat(12,minmax(0,1fr))" : "200px repeat(12,minmax(0,1fr)) 96px";
  const head = `<div style="display:grid;grid-template-columns:${cols};gap:${ph ? 3 : 6}px;align-items:end;padding-bottom:6px"><span class="th">Subscription</span>${GRID_KEYS.map((k) => `<div class="heat-m${k === nowKey ? " now" : ""}" style="${k === nowKey ? "color:var(--accent-text)" : ""}">${ph ? L.monName(k)[0] : L.monName(k)}${k === nowKey && !ph ? " ●" : ""}</div>`).join("")}${ph ? "" : `<span class="th" style="text-align:right">Paid in 2026</span>`}</div>`;
  const body = groups.map(([t, l]) => `<div style="padding:10px 0 6px;font-size:12px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em">${t}</div>${l.map((s) => {
    const paid = ROWS.filter((r) => r.s === s && r.payment).reduce((a, r) => a + r.payment.amount, 0);
    return `<div style="display:grid;grid-template-columns:${cols};gap:${ph ? 3 : 6}px;align-items:center;padding:${ph ? 5 : 3}px 0;${L.isOn(s) ? "" : "opacity:0.7"}"><span class="row" style="gap:${ph ? 6 : 10}px;min-width:0">${mono(s, ph ? 20 : 26)}<span style="min-width:0"><b style="display:block;font-size:${ph ? 12 : 13}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.alias}</b>${ph ? "" : `<span class="sub2">${inr(s.amount)} · ${s.billingCycle}</span>`}</span></span>${GRID_KEYS.map((k) => gridCell(s, k, { dimExcept, ph })).join("")}${ph ? "" : `<b class="num" style="text-align:right">${inr(paid)}</b>`}</div>`;
  }).join("")}`).join("");
  const totals = ph ? "" : `<div style="display:grid;grid-template-columns:${cols};gap:6px;align-items:center;padding-top:10px;margin-top:6px;border-top:1px solid var(--divider)"><b style="font-size:13px">Each month</b>${GRID_KEYS.map((k) => { const v = k < nowKey ? L.paidByMonth(k) : k === nowKey ? L.paidByMonth(k) + L.expectedByMonth(k) : L.expectedByMonth(k); return `<b style="text-align:center;font-size:12px;${k > nowKey ? "color:var(--muted)" : ""}">${inrK(v)}</b>`; }).join("")}<b class="num" style="text-align:right">${inr(L.yearPaid(2026))}</b></div>`;
  return `${head}${body}${totals}`;
}
const gridLegend = () => `<span class="legend"><span><i style="background:var(--accent-tint)"></i>Paid</span><span><i style="background:var(--warning-tint);box-shadow:inset 0 0 0 1.5px var(--warning)"></i>Not recorded</span><span><i style="border:1.5px dashed var(--heat-upcoming)"></i>To come</span><span><i style="background:var(--negative);border-radius:999px"></i>Price went up</span><span><b style="color:var(--fill-strong)">·</b> No renewal that month</span></span>`;
export function r3Desktop() {
  const body = `${header({ eyebrow: back, title: "Renewals", lede: lede(), actions: actions().replace("This year", "2026") })}
    <section class="card glass" style="gap:12px"><div class="between" style="flex-wrap:wrap">${seg([{ label: "All", on: true }, { label: "Not recorded", count: 1 }, { label: "Price changes", count: 3 }])}${gridLegend()}</div>${grid()}
      <p class="card-note">One row per subscription and one column per month. Hover a cell for the payment; click it to record or edit it. A quarterly or yearly one only fills the months it renews in.</p></section>`;
  return desktop({ h: "auto", body });
}
export function r3Phone() {
  const body = `${header({ eyebrow: "← Subscriptions · Renewals", title: "Renewals", lede: lede(), phone: true, actions: `${RN.periodSelect(false, "2026")}${btn("Record payment", { kind: "primary", icon: I.plus() })}` })}
    <section class="card glass" style="padding:14px;gap:10px">${grid({ ph: true })}<div class="legend" style="font-size:11px"><span><i style="background:var(--accent-tint)"></i>Paid</span><span><i style="background:var(--warning-tint);box-shadow:inset 0 0 0 1.5px var(--warning)"></i>Not recorded</span><span><i style="border:1.5px dashed var(--heat-upcoming)"></i>To come</span></div><span class="card-note">Tap a row for that subscription's renewals, or a square for one payment.</span></section>
    ${P.renewalsPanel({ n: 4, phone: true, title: "Next up" })}`;
  return phone({ h: "auto", body });
}
