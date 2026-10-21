// Direction G · Check-in. Action first: what needs you, then everything that's on track, and the month as a receipt.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { inr, inrK, fmt, fmtY, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, header, desktop, phone, rings } = L;

/** What needs a decision: a renewal with no payment, a charge that differs from the plan, and a yearly one renewing within 14 days. */
export function needs() {
  const out = [];
  for (const s of L.ACTIVE) for (const d of L.unrecorded(s)) out.push({ kind: "missing", s, d, title: "No payment recorded", body: `<b>${s.alias}</b> renewed on ${fmtDow(d)}, ${inr(L.priceOn(s, d))} to ${L.viaName(s.via)}, but there's no payment for it.`, primary: "Record payment", secondary: "It didn't charge" });
  for (const s of L.ACTIVE) { const m = L.planMismatch(s); if (m) out.push({ kind: "price", s, d: m.date, title: "The price went up", body: `<b>${s.alias}</b> charged ${inr(m.amount)} on ${fmt(m.date)}. The plan still says ${inr(s.amount)}, so your monthly total is ${inr(m.amount - s.amount)} too low.`, primary: `Update plan to ${inr(m.amount)}`, secondary: `Keep ${inr(s.amount)}` }); }
  for (const s of L.ACTIVE.filter((x) => x.billingCycle !== "Monthly")) { const d = L.nextRenewal(s); const n = L.daysBetween(L.TODAY, d); if (n <= 14) out.push({ kind: "review", s, d, title: `Renews in ${n} days`, body: `<b>${s.alias}</b> takes ${inr(s.amount)} for the year on ${fmtDow(d)}. Still using it? Cancel before then if not.`, primary: "Keep it", secondary: "Cancel it" }); }
  return out;
}
const KIND = { missing: { tint: "var(--warning-tint)", ink: "var(--warning-text)", icon: I.alert(16) }, price: { tint: "var(--negative-tint)", ink: "var(--negative)", icon: I.up(14) }, review: { tint: "oklch(0.93 0.05 258)", ink: "oklch(0.42 0.1 258)", icon: I.cal(15) } };

export function needCard(n, { ph = false, done = false } = {}) {
  const k = KIND[n.kind];
  return `<div class="card glass" style="gap:12px;${ph ? "padding:16px" : ""}"><div class="row" style="gap:10px"><span style="width:34px;height:34px;border-radius:11px;background:${k.tint};color:${k.ink};display:flex;align-items:center;justify-content:center;flex-shrink:0">${k.icon}</span><b style="font-size:14px">${n.title}</b><span style="margin-left:auto;display:flex">${mono(n.s, 26)}</span></div>
    <p style="font-size:13px;line-height:1.55;color:var(--muted);font-weight:500">${n.body.replace(/<b>/g, '<b style="color:var(--fg)">')}</p>
    <div class="row" style="gap:8px;margin-top:auto">${done ? `<span class="pill pill-on">${I.check(10)} Done</span>` : `${btn(n.primary, { kind: "primary", cls: "btn-sm" })}${btn(n.secondary, { kind: "soft", cls: "btn-sm" })}`}</div></div>`;
}

export function onTrack({ ph = false } = {}) {
  const rs = L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 45));
  const groups = [["This week", rs.filter((r) => r.date <= "2026-10-25")], ["Rest of October", rs.filter((r) => r.date > "2026-10-25" && r.date <= "2026-10-31")], ["November", rs.filter((r) => r.date.startsWith("2026-11"))], ["Early December", rs.filter((r) => r.date.startsWith("2026-12"))]];
  return groups.filter(([, g]) => g.length).map(([t, g]) => `<div><div class="tgroup">${t}<span>${inr(g.reduce((a, r) => a + r.amount, 0))}</span></div>${g.map((r) => { const n = L.daysBetween(L.TODAY, r.date); return `<div class="row" style="gap:12px;padding:9px 0;border-bottom:1px solid var(--divider);font-size:13px">${mono(r.s, 24)}<b class="grow" style="font-weight:700">${r.s.alias}</b><span class="muted" style="font-weight:600;width:${ph ? 74 : 110}px">${ph ? fmt(r.date) : fmtDow(r.date)}</span><b class="num" style="width:62px;text-align:right">${inr(r.amount)}</b>${ph ? "" : `<span style="width:96px;display:flex;justify-content:flex-end">${n <= 3 ? btn("Mark paid", { kind: "accent", cls: "btn-xs", icon: I.check(9) }) : `<span class="muted" style="font-size:12px;font-weight:600">${rel(r.date)}</span>`}</span>`}</div>`; }).join("")}</div>`).join("");
}

/** The month as a receipt: every active subscription's share of a month, adding up to the total. */
export function receipt({ w = 420, ph = false } = {}) {
  const line = (l, r, { bold = false, muted = false, size = 13 } = {}) => `<div style="display:flex;align-items:baseline;gap:8px;font-size:${size}px;${bold ? "font-weight:800" : "font-weight:600"};${muted ? "color:var(--muted)" : ""}"><span style="white-space:nowrap">${l}</span><span style="flex:1;border-bottom:1.5px dotted var(--fill-strong);transform:translateY(-3px)"></span><span style="white-space:nowrap">${r}</span></div>`;
  const zig = `<svg viewBox="0 0 ${w} 12" width="100%" height="12" preserveAspectRatio="none" style="display:block"><path d="M0 0 ${Array.from({ length: Math.ceil(w / 14) }, (_, i) => `L${i * 14 + 7} 10 L${i * 14 + 14} 0`).join(" ")} V12 H0 Z" fill="var(--surface)"></path></svg>`;
  return `<div style="position:relative;background:oklch(0.975 0.012 85);border:1px solid oklch(0.85 0.03 85 / 0.6);border-bottom:0;border-radius:18px 18px 0 0;box-shadow:var(--soft-shadow)">
    <div style="padding:${ph ? "18px 16px 14px" : "22px 24px 16px"};display:flex;flex-direction:column;gap:9px">
      <div style="text-align:center;display:flex;flex-direction:column;gap:2px;margin-bottom:6px"><span class="th">Your subscriptions</span><b style="font-size:16px">A month, as of ${fmt(L.TODAY)}</b></div>
      ${L.byCost.map((s) => line(`${s.alias}${s.billingCycle === "Monthly" ? "" : `<span class="muted" style="font-size:11px;font-weight:600"> · ${inr(s.amount)} a ${L.cycleWord(s.billingCycle)}</span>`}`, inr(L.monthlyEq(s)))).join("")}
      <div style="border-top:1.5px dashed var(--fill-strong);margin:6px 0 2px"></div>
      ${line("Total a month", inr(L.MONTHLY), { bold: true, size: 16 })}
      ${line("A year", inr(L.YEARLY), { muted: true })}
      ${line("Not counted", "Headspace, SonyLIV", { muted: true, size: 12 })}
      <span class="card-note" style="text-align:center;margin-top:6px">Yearly and quarterly ones are spread over their months.</span>
    </div>${zig}</div>`;
}

export const lede = () => {
  const n = needs().length;
  return `Everything else is on track: you pay <b>${inr(L.MONTHLY)} a month</b>, and <b>Netflix</b> renews next, on <b>${fmtDow(L.nextRenewal(L.sub("netflix")))}</b>.`;
};

export function gDesktop() {
  const ns = needs();
  const body = `${header({ eyebrow: "Subscriptions · Check-in", title: `${ns.length} things need you`, lede: lede(), actions: L.headerActions() })}
    <div style="display:grid;grid-template-columns:repeat(${ns.length},minmax(0,1fr));gap:16px">${ns.map((n) => needCard(n)).join("")}</div>
    <div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:20px;align-items:start">
      <section class="card glass" style="gap:4px"><div class="card-h"><span class="card-t">On track<small>the next six weeks</small></span><span class="link">View all renewals ${I.arrowR()}</span></div>${onTrack()}</section>
      <div style="display:flex;flex-direction:column;gap:0">${receipt()}</div>
    </div>`;
  return desktop({ h: "auto", body });
}

export function gPhone() {
  const ns = needs();
  const body = `${header({ eyebrow: "Subscriptions · Check-in", title: `${ns.length} things need you`, lede: lede(), phone: true, actions: `${btn("Add subscription", { kind: "primary", icon: I.plus() })}${btn("Record payment")}` })}
    ${ns.map((n) => needCard(n, { ph: true })).join("")}
    <section class="card glass" style="padding:16px;gap:4px"><div class="between"><span class="card-t">On track</span><span class="link" style="font-size:12px">All renewals ${I.arrowR(11)}</span></div>${onTrack({ ph: true })}</section>
    ${receipt({ w: 358, ph: true })}`;
  return phone({ h: "auto", body });
}
