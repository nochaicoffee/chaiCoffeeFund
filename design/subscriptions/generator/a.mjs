// Direction A · One list. Summary tiles on top, then every subscription in one table you can sort and filter.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { inr, fmt, fmtSmart, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, select, rings, header, desktop, phone, sampleTag } = L;

export const tableHead = () => `<div style="display:grid;grid-template-columns:${COLS};gap:16px;padding:0 10px 8px" class="th"><span>Subscription</span><span>Price</span><span>A month</span><span>Next renewal</span><span>Charged to</span><span>Last payment</span><span></span></div>`;
export const lede = () => {
  const next = L.byNext[0];
  const missing = L.SUBS.flatMap(L.unrecorded).length;
  return `You pay <b>${inr(L.MONTHLY)} a month</b> for <b>${L.ACTIVE.length} subscriptions</b>, or <b>${inr(L.YEARLY)} a year</b>. <b>${next.alias}</b> renews next, on <b>${fmtDow(L.nextRenewal(next))}</b>.${missing ? ` <b>${missing} renewal</b> from September has no payment recorded.` : ""}`;
};

export function summaryTiles({ cols = 4, phone: ph = false } = {}) {
  const next = L.byNext[0];
  const top = L.byCost[0];
  const soon = L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 30));
  const soonTotal = soon.reduce((t, r) => t + r.amount, 0);
  const big = [...soon].sort((a, b) => b.amount - a.amount)[0];
  return `<div class="tiles" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">
    <div class="stile feature">${rings(360, 120, { dx: 12, dy: 30, first: 30, step: 22, opacity: 0.12, sheen: "radial-gradient(circle at 85% 0%, var(--feature-tile-glow), transparent 55%)" })}
      <span class="k">Every month</span><span class="v">${inr(L.MONTHLY)}</span><span class="s"><b style="color:oklch(0.3 0.08 152)">${inr(L.YEARLY)}</b> a year · ${L.ACTIVE.length} active</span></div>
    <div class="stile glass"><span class="${ph ? "between" : "row"}" style="gap:9px"><span class="k">Renews next</span>${ph ? L.duePill(next) : ""}</span><span class="row" style="gap:9px">${mono(next, 26)}<span class="v" style="font-size:${ph ? 22 : 24}px">${next.alias}</span>${ph ? "" : L.duePill(next)}</span><span class="s"><b>${inr(next.amount)}</b> on ${fmtDow(L.nextRenewal(next))} · ${L.viaName(next.via)}</span></div>
    <div class="stile glass"><span class="k">Next 30 days</span><span class="v">${inr(soonTotal)}</span><span class="s">${soon.length} renewals · biggest is ${big.s.alias} at <b>${inr(big.amount)}</b></span></div>
    <div class="stile glass"><span class="k">Costs the most</span><span class="row" style="gap:9px">${mono(top, 26)}<span class="v" style="font-size:${ph ? 22 : 24}px">${top.alias}</span></span><span class="s"><b>${inr(L.monthlyEq(top))}</b> a month · ${L.pct(L.monthlyEq(top), L.MONTHLY)} of the total</span></div>
  </div>`;
}

const COLS = "minmax(0,2.1fr) minmax(0,1fr) minmax(0,1.35fr) minmax(0,1.15fr) minmax(0,1fr) minmax(0,1.35fr) 118px";
const maxEq = Math.max(...L.ACTIVE.map(L.monthlyEq));

function lastCell(s) {
  const p = L.lastPayment(s);
  if (!p) return `<span class="muted">None yet</span>`;
  const m = L.planMismatch(s);
  const miss = L.unrecorded(s).at(-1);
  const extra = miss ? `<span class="sub2" style="color:var(--warning-text)">${fmt(miss)} not recorded</span>` : m ? `<span class="sub2" style="color:var(--warning-text)">${inr(m.amount - s.amount)} more than the plan</span>` : L.changeChip(s) ? `<span class="sub2">${L.changeChip(s)}</span>` : "";
  return `<span><b class="num" style="font-weight:700">${fmtSmart(p.date)} · ${inr(p.amount)}</b>${extra}</span>`;
}
const cardChipText = (p) => `${L.viaName(p.via)}`;

function nextCell(s) {
  if (s.status === "Paused") return `<span><b style="font-weight:700">Paused</b><span class="sub2">would renew ${fmt(L.nextRenewal(s))}</span></span>`;
  if (s.status === "Cancelled") return `<span><b style="font-weight:700">Won't renew</b><span class="sub2">cancelled ${fmt(s.endDate)}</span></span>`;
  const d = L.nextRenewal(s);
  return `<span class="row" style="gap:8px;align-items:flex-start"><span><b style="font-weight:700">${fmtSmart(d)}</b><span class="sub2">${rel(d)}</span></span>${L.duePill(s)}</span>`;
}

function actionCell(s) {
  if (s.status === "Paused") return btn("Resume", { kind: "soft", cls: "btn-sm", icon: I.play(10) });
  if (s.status === "Cancelled") return btn("Restart", { kind: "soft", cls: "btn-sm" });
  const n = L.daysBetween(L.TODAY, L.nextRenewal(s));
  if (n <= 3) return btn("Mark paid", { kind: "accent", cls: "btn-sm", icon: I.check(11) });
  return `<span class="row" style="gap:4px;justify-content:flex-end;color:var(--muted)">${I.more()}</span>`;
}

export const TABLE_COLS = COLS;
export function row(s, { open = false, next, last, action } = {}) {
  const on = L.isOn(s);
  const eq = L.monthlyEq(s);
  return `<div class="arow${open ? " open" : ""}${on ? "" : " off"}" style="display:grid;grid-template-columns:${COLS};align-items:center;gap:16px;padding:12px 10px;border-bottom:1px solid var(--divider)">
    <span class="cell-name">${mono(s, 32)}<span style="min-width:0"><b>${s.name}</b><small>${s.category} · ${s.billingCycle}</small></span></span>
    <span><b class="num" style="font-weight:700">${inr(s.amount)}</b><span class="sub2">a ${L.cycleWord(s.billingCycle)}</span></span>
    <span>${on ? `<span class="between" style="gap:8px"><b class="num">${inr(eq)}</b><span class="muted" style="font-size:11px;font-weight:700">${L.pct(eq, L.MONTHLY)}</span></span><span class="track" style="margin-top:6px;display:block"><span style="width:${(eq / maxEq) * 100}%;background:var(--card-${L.catColor(s.category)})"></span></span>` : `<span class="muted" style="font-weight:600">Not counted</span>`}</span>
    ${next ?? nextCell(s)}
    <span>${cardChip(s.via)}</span>
    ${last ?? lastCell(s)}
    <span style="display:flex;justify-content:flex-end">${action ?? actionCell(s)}</span>
  </div>`;
}

function expanded(s) {
  const pays = L.paymentsFor(s);
  const ch = L.priceChanges(s).at(-1);
  return `<div style="display:grid;grid-template-columns:1.25fr 1fr 0.85fr;gap:28px;padding:18px 18px 20px;margin:0 0 6px;background:oklch(0.985 0.004 90);border-bottom:1px solid var(--divider)">
    <div><div class="between" style="margin-bottom:8px"><span class="th">What each payment cost</span>${ch ? `<span class="chg chg-up">${I.up(10)}${inr(ch.to - ch.from)} (${L.pct(ch.to - ch.from, ch.from)}) on ${fmtSmart(ch.date)}</span>` : ""}</div>${P.priceStep(s, { w: 470, h: 132 })}</div>
    <div><div class="between" style="margin-bottom:2px"><span class="th">Payments</span><span class="link" style="font-size:12px">All ${pays.length} in Renewals ${I.arrowR(11)}</span></div>${P.paymentRows(s, 4)}</div>
    <div style="display:flex;flex-direction:column;gap:10px;font-size:13px">
      <div class="between"><span class="muted" style="font-weight:600">Started</span><b>${L.fmtY(s.startDate)}</b></div>
      <div class="between"><span class="muted" style="font-weight:600">Paid so far</span><b>${inr(L.paidSoFar(s))}</b></div>
      <div class="between"><span class="muted" style="font-weight:600">A year</span><b>${inr(s.amount * (12 / L.STEP[s.billingCycle]))}</b></div>
      <div class="between"><span class="muted" style="font-weight:600">Charged to</span>${cardChip(s.via)}</div>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:4px">${btn("Mark paid", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}${btn("Edit", { kind: "soft", cls: "btn-sm", icon: I.edit(11) })}${btn("Pause", { kind: "soft", cls: "btn-sm", icon: I.pause(11) })}${btn("Cancel", { kind: "soft", cls: "btn-sm", icon: I.stop(11) })}</div>
    </div>
  </div>`;
}

export function listCard({ openId = "netflix", rowsFor = L.SUBS, notice = true, toolbar = true, customRows = null } = {}) {
  const active = L.byCost.filter((s) => rowsFor.includes(s));
  const paused = rowsFor.filter((s) => s.status === "Paused");
  const cancelled = rowsFor.filter((s) => s.status === "Cancelled");
  const miss = L.SUBS.flatMap((s) => L.unrecorded(s).map((d) => ({ s, d })));
  const counts = { all: rowsFor.length, on: active.length, p: paused.length, c: cancelled.length };
  const cats = L.CATEGORIES.filter((c) => L.SUBS.some((s) => s.category === c.name));
  return `<section class="card glass">
    ${toolbar ? `<div class="between" style="flex-wrap:wrap">
      <span class="row" style="gap:12px">${seg([{ label: "All", count: counts.all, on: true }, { label: "Active", count: counts.on }, { label: "Paused", count: counts.p }, { label: "Cancelled", count: counts.c }])}
        ${select({ value: "All categories", kind: "small", options: [{ label: "All categories", on: true, meta: counts.all }, "-", ...cats.map((c) => ({ label: c.name, meta: L.SUBS.filter((s) => s.category === c.name).length }))] })}</span>
      <span class="row" style="gap:10px"><span class="row" style="gap:8px;height:34px;padding:0 14px;border-radius:999px;background:var(--fill);color:var(--muted);font-size:12px;font-weight:600;width:240px">${I.search()}Search subscriptions</span>
        ${select({ value: "Costs the most first", kind: "small", align: "align-end", options: [{ group: "Sort by" }, { label: "Costs the most first", on: true }, { label: "Renews soonest first" }, { label: "Name, A to Z" }, { label: "Newest first" }] })}</span>
    </div>` : ""}
    ${notice && miss.length ? `<div class="notice">${I.alert(16)}<span class="grow"><b>${miss[0].s.alias} renewed on ${fmt(miss[0].d)}</b>, but no payment is recorded for it.</span>${btn("Record payment", { kind: "ghost", cls: "btn-sm" })}</div>` : ""}
    <div>
      <div style="display:grid;grid-template-columns:${COLS};gap:16px;padding:0 10px 8px" class="th"><span>Subscription</span><span>Price</span><span>A month</span><span>Next renewal</span><span>Charged to</span><span>Last payment</span><span></span></div>
      ${customRows ?? ""}${customRows != null ? "" : active.length ? `<div class="tgroup" style="padding-left:10px;padding-right:10px">Active <span>${active.length} · ${inr(active.reduce((t, s) => t + L.monthlyEq(s), 0))} a month</span></div>` : ""}
      ${customRows != null ? "" : active.map((s) => row(s, { open: s.id === openId }) + (s.id === openId ? expanded(s) : "")).join("")}
      ${customRows != null ? "" : paused.length ? `<div class="tgroup" style="padding-left:10px;padding-right:10px">Paused <span>Left out of the totals until you resume</span></div>${paused.map((s) => row(s)).join("")}` : ""}
      ${customRows != null ? "" : cancelled.length ? `<div class="tgroup" style="padding-left:10px;padding-right:10px">Cancelled <span>Kept for their payment history</span></div>${cancelled.map((s) => row(s)).join("")}` : ""}
    </div>
  </section>`;
}

export function bottomRow() {
  return `<div style="display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:20px">
    <section class="card glass"><div class="card-h"><span class="card-t">Where it goes<small>a month, by category</small></span></div>${P.categorySplit()}</section>
    <section class="card glass"><div class="card-h"><span class="card-t">Charged to<small>a month</small></span></div><div class="spread" style="gap:14px">${P.payerSplit()}</div><p class="card-note">Charges on a card are part of that card's statement, so they're never counted twice.</p></section>
    <section class="card glass"><div class="card-h"><span class="card-t">Price changes<small>last 12 months</small></span></div><div class="spread" style="gap:16px">${P.changeList()}</div></section>
  </div>`;
}

export function aDesktop() {
  const body = `${header({ lede: lede(), actions: L.headerActions() })}${summaryTiles()}${listCard()}${bottomRow()}`;
  return desktop({ h: "auto", body });
}

// ---------- Phone ----------
function phoneRow(s, { open = false } = {}) {
  const on = L.isOn(s);
  const d = L.nextRenewal(s);
  const right = s.status === "Paused" ? `<span class="pill pill-off">${I.pause(10)} Paused</span>` : s.status === "Cancelled" ? `<span class="pill pill-off">Cancelled</span>` : L.duePill(s) || `<span class="muted" style="font-size:12px;font-weight:600">${fmt(d)}</span>`;
  return `<div style="padding:12px 0;border-bottom:1px solid var(--divider)${on ? "" : ";opacity:0.75"}">
    <div class="row" style="gap:12px">${mono(s, 36)}<div class="grow"><div class="between"><b style="font-size:14px">${s.alias}</b><b class="num" style="font-size:14px">${inr(s.amount)}<span class="muted" style="font-weight:600;font-size:12px"> /${s.billingCycle === "Monthly" ? "mo" : s.billingCycle === "Yearly" ? "yr" : "qtr"}</span></b></div>
    <div class="between" style="margin-top:3px"><span class="muted" style="font-size:12px;font-weight:600">${on ? `${s.category} · renews ${rel(d)}` : s.status === "Paused" ? `would renew ${fmt(d)}` : `won't renew on ${fmt(d)}`}</span>${right}</div></div></div>
    ${open ? `<div style="margin-top:12px;padding:14px;border-radius:16px;background:oklch(0.985 0.004 90);display:flex;flex-direction:column;gap:12px">
      <div class="between"><span class="th">What each payment cost</span>${L.changeChip(s)}</div>${P.priceStep(s, { w: 300, h: 110, pad: 18 })}
      <div>${P.paymentRows(s, 3, { phone: true })}</div>
      <div class="between" style="font-size:13px"><span class="muted" style="font-weight:600">Charged to</span>${cardChip(s.via)}</div>
      <div class="row" style="gap:8px">${btn("Mark paid", { kind: "primary", cls: "btn-sm grow", icon: I.check(11) })}${btn("Edit", { kind: "soft", cls: "btn-sm" })}${iconBtn(I.more(), "More")}</div>
    </div>` : ""}
  </div>`;
}

export function aPhone() {
  const miss = L.SUBS.flatMap((s) => L.unrecorded(s).map((d) => ({ s, d })));
  const body = `${header({ lede: lede(), phone: true, actions: `${btn("Add subscription", { kind: "primary", icon: L.I.plus() })}${btn("Record payment")}` })}
    ${summaryTiles({ cols: 2, phone: true })}
    <section class="card glass" style="padding:16px;gap:12px">
      <div class="between">${seg([{ label: "All", count: 12, on: true }, { label: "Active", count: 10 }, { label: "Off", count: 2 }])}${select({ value: "Cost", kind: "small", align: "align-end", options: [{ label: "Costs the most first", on: true }, { label: "Renews soonest first" }, { label: "Name, A to Z" }] })}</div>
      ${miss.length ? `<div class="notice" style="font-size:12px;padding:10px 12px">${I.alert(14)}<span class="grow"><b>${miss[0].s.alias}, ${fmt(miss[0].d)}</b>: no payment recorded.</span><span class="link" style="font-size:12px;color:var(--warning-text)">Record</span></div>` : ""}
      <div>${L.byCost.map((s) => phoneRow(s, { open: s.id === "netflix" })).join("")}${L.SUBS.filter((s) => !L.isOn(s)).map((s) => phoneRow(s)).join("")}</div>
    </section>
    <section class="card glass" style="padding:16px"><span class="card-t">Where it goes</span>${P.categorySplit({ compact: true })}</section>`;
  return phone({ h: "auto", body });
}
