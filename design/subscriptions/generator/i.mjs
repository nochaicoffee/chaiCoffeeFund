// Direction I · Two panes. A list on the left, and everything about the picked subscription on the right, like a mail app.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as RN from "./renewals.mjs";
const { inr, fmt, fmtY, fmtSmart, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, header, desktop, phone, rings } = L;

export const lede = () => `You pay <b>${inr(L.MONTHLY)} a month</b> for <b>${L.ACTIVE.length} subscriptions</b>, or <b>${inr(L.YEARLY)} a year</b>. Pick one to see everything about it.`;

export function listRow(s) {
  const on = L.isOn(s);
  const d = L.nextRenewal(s);
  const n = L.daysBetween(L.TODAY, d);
  const right = !on ? `<span class="pill pill-off">${s.status === "Paused" ? "Paused" : "Cancelled"}</span>` : n <= 7 ? L.duePill(s) : `<span class="muted" style="font-size:12px;font-weight:600">${fmt(d)}</span>`;
  return `<label for="i-sel-${s.id}" class="irow" style="display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:14px;cursor:pointer;${on ? "" : "opacity:0.65;"}">${mono(s, 32)}<span class="grow"><b style="display:block;font-size:13px">${s.alias}</b><span class="sub2">${inr(L.monthlyEq(s))} a month${s.billingCycle === "Monthly" ? "" : ` · ${s.billingCycle.toLowerCase()}`}</span></span>${right}</label>`;
}

export function pane(s, { ph = false } = {}) {
  const on = L.isOn(s);
  const c = L.catColor(s.category);
  const next = L.nextRenewal(s);
  const prev = L.addMonthsUTC(next, -L.STEP[s.billingCycle]);
  const frac = Math.max(0, Math.min(1, L.daysBetween(prev, L.TODAY) / L.daysBetween(prev, next)));
  const rows = L.renewalRows("2020-01-01", on ? next : L.addDays(L.TODAY, 60), [s]);
  const nRows = ph ? 5 : 8;
  const ch = L.priceChanges(s).at(-1);
  const pays = L.paymentsFor(s);
  const nexts = [0, 1, 2].map((i) => L.addMonthsUTC(next, i * L.STEP[s.billingCycle]));
  return `<div class="${ph ? "" : `ipane ipane-${s.id}`}" style="${ph ? "display:flex;" : ""}flex-direction:column;gap:${ph ? 14 : 18}px">
    <div class="row" style="gap:14px;align-items:flex-start">${mono(s, ph ? 44 : 52)}<div class="grow"><div class="row" style="gap:10px;flex-wrap:wrap"><h2 style="font-size:${ph ? 20 : 24}px;font-weight:800">${s.name}</h2>${L.statusPill(s)}</div><span class="muted" style="font-size:13px;font-weight:600">${s.category} · ${s.billingCycle} · since ${fmtY(s.startDate)} · ${L.viaName(s.via)}</span></div>
      <span class="row" style="gap:8px;${ph ? "display:none" : ""}">${on ? btn("Mark paid", { kind: "primary", cls: "btn-sm", icon: I.check(11) }) : btn(s.status === "Paused" ? "Resume" : "Restart", { kind: "primary", cls: "btn-sm", icon: I.play(10) })}${btn("Edit", { kind: "soft", cls: "btn-sm", icon: I.edit(11) })}${iconBtn(I.more(), "Pause, cancel or delete")}</span></div>
    <div style="display:grid;grid-template-columns:${ph ? "1fr" : "repeat(3,minmax(0,1fr))"};gap:${ph ? 10 : 14}px">
      <div class="stile feature" style="padding:16px 18px">${rings(320, 110, { opacity: 0.12 })}<span class="k">${on ? "A month" : "Was, a month"}</span><span class="v">${inr(L.monthlyEq(s))}</span><span class="s">${inr(s.amount)} a ${L.cycleWord(s.billingCycle)} · ${inr(L.monthlyEq(s) * 12)} a year</span></div>
      <div class="stile glass" style="padding:16px 18px"><span class="k">${on ? "Next renewal" : s.status === "Paused" ? "Paused" : "Won't renew"}</span><span class="row" style="gap:8px"><span class="v" style="font-size:22px">${on ? fmtDow(next) : fmt(next)}</span>${on ? L.duePill(s) : ""}</span>${on ? `<div class="track" style="margin-top:4px"><span style="width:${frac * 100}%;background:var(--card-${c})"></span></div><span class="s">${rel(next)} · then ${nexts.slice(1).map(fmt).join(", ")}</span>` : `<span class="s">${s.status === "Paused" ? `Last paid ${fmt(s.lastDate)}. Resume picks it up from its next date.` : `Cancelled on ${fmt(s.endDate)}. Its payments stay.`}</span>`}</div>
      <div class="stile glass" style="padding:16px 18px"><span class="k">Paid so far</span><span class="v">${inr(L.paidSoFar(s))}</span><span class="s">${pays.length} payments${ch ? ` · <span class="chg chg-up">${I.up(9)}${inr(ch.to - ch.from)} on ${fmtSmart(ch.date)}</span>` : " · price never changed"}</span></div>
    </div>
    <section class="card glass" style="gap:8px;padding:18px 20px"><div class="between"><span class="th">What each payment cost</span>${ch ? `<span class="chg chg-up">${I.up(10)}${inr(ch.from)} → ${inr(ch.to)} on ${fmtY(ch.date)}</span>` : ""}</div>${P.priceStep(s, ph ? { w: 320, h: 120, pad: 18 } : { w: 920, h: 190, pad: 28 })}</section>
    <section class="card glass" style="gap:4px;padding:18px 20px"><div class="between"><span class="card-t">Renewals<small>${rows.length} since ${fmtSmart(s.startDate)}</small></span><span class="link">All in Renewals ${I.arrowR()}</span></div>
      <div class="spread" style="gap:0">${rows.slice(0, nRows).map((r) => ph ? `<div class="between" style="padding:10px 0;border-bottom:1px solid var(--divider);font-size:13px"><span><b style="font-weight:700;display:block">${r.status === "upcoming" ? fmtDow(r.date) : fmtY(r.date)}</b>${r.change ? `<span class="sub2">${RN.change(r)}</span>` : ""}</span><span class="row" style="gap:10px"><b class="num">${inr(r.payment ? r.payment.amount : r.plan)}</b>${RN.status(r)}</span></div>` : `<div class="row" style="gap:14px;padding:10px 0;border-bottom:1px solid var(--divider);font-size:13px"><b style="width:140px;font-weight:700">${r.status === "upcoming" || r.status === "wont" ? fmtDow(r.date) : fmtY(r.date)}</b><b class="num" style="width:80px">${inr(r.payment ? r.payment.amount : r.plan)}</b><span style="width:120px">${RN.status(r)}</span><span class="grow">${r.payment ? cardChip(r.payment.via) : `<span class="muted">—</span>`}</span><span>${r.payment ? RN.change(r) : ""}</span></div>`).join("")}</div></section>
  </div>`;
}

function allPane() {
  return `<div class="ipane ipane-all" style="flex-direction:column;gap:18px"><div class="row" style="gap:14px"><span style="width:52px;height:52px;border-radius:16px;background:linear-gradient(150deg,var(--card-emerald-from),var(--card-emerald-to));color:var(--on-card);display:flex;align-items:center;justify-content:center">${I.subs(22)}</span><div><h2 style="font-size:24px;font-weight:800">All subscriptions</h2><span class="muted" style="font-size:13px;font-weight:600">${L.ACTIVE.length} active · 1 paused · 1 cancelled</span></div></div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px"><div class="stile feature">${rings(320, 110, { opacity: 0.12 })}<span class="k">A month</span><span class="v">${inr(L.MONTHLY)}</span><span class="s">${inr(L.YEARLY)} a year</span></div><div class="stile glass"><span class="k">Paid this year</span><span class="v">${inr(L.yearPaid(2026))}</span><span class="s">${L.yearPayments(2026)} payments</span></div><div class="stile glass"><span class="k">Next 30 days</span><span class="v">${inr(L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 30)).reduce((t, r) => t + r.amount, 0))}</span><span class="s">${L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 30)).length} renewals</span></div></div>
    <section class="card glass"><span class="card-t">Where it goes</span>${P.categorySplit()}</section></div>`;
}

export function iDesktop({ sel = "netflix" } = {}) {
  const ids = ["all", ...L.SUBS.map((s) => s.id)];
  const css = `<style>.idir .i-in{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}.idir .ipane{display:none}.idir .ipane > section:last-child{flex:1 1 auto}.idir .irow:hover{background:oklch(1 0 0 / 0.6)}
    ${ids.map((id) => `.idir:has(#i-sel-${id}:checked) .ipane-${id}{display:flex;flex:1 1 auto}.idir:has(#i-sel-${id}:checked) label[for="i-sel-${id}"]{background:var(--surface);box-shadow:var(--soft-shadow),inset 0 0 0 1.5px var(--accent-edge);opacity:1}`).join("")}</style>`;
  const radios = ids.map((id) => `<input type="radio" class="i-in" name="i-sel" id="i-sel-${id}"${id === sel ? " checked" : ""}>`).join("");
  const groups = [["Renews next", L.byNext], ["Paused and cancelled", L.SUBS.filter((s) => !L.isOn(s))]];
  const list = `<section class="card glass" style="gap:10px;padding:16px;position:sticky;top:0">
    <div class="row" style="gap:8px;height:38px;padding:0 14px;border-radius:999px;background:var(--fill);color:var(--muted);font-size:12px;font-weight:600">${I.search()}Search</div>
    <div class="between">${seg([{ label: "Renews next", on: true }, { label: "Cost" }, { label: "A–Z" }])}</div>
    <label for="i-sel-all" class="irow" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;cursor:pointer"><span style="width:32px;height:32px;border-radius:10px;background:linear-gradient(150deg,var(--card-emerald-from),var(--card-emerald-to));color:var(--on-card);display:flex;align-items:center;justify-content:center">${I.subs(14)}</span><span class="grow"><b style="display:block;font-size:13px">All subscriptions</b><span class="sub2">${inr(L.MONTHLY)} a month</span></span></label>
    <div style="background:var(--fill);border-radius:18px;padding:6px;display:flex;flex-direction:column;gap:2px">${groups.map(([t, list]) => `<span class="th" style="padding:8px 12px 4px">${t}</span>${list.map(listRow).join("")}`).join("")}</div>
    ${btn("Add subscription", { kind: "soft", cls: "btn-sm", icon: I.plus(11) })}
  </section>`;
  const body = `${css}<div class="idir" style="display:flex;flex-direction:column;gap:20px">${radios}${header({ lede: lede(), actions: `${iconBtn(I.refresh(), "Refresh")}${btn("Renewals", { icon: I.cal(13) })}${btn("Add subscription", { kind: "primary", icon: I.plus() })}` })}
    <div style="display:grid;grid-template-columns:400px minmax(0,1fr);gap:20px;align-items:stretch">${list}<div style="display:flex;flex-direction:column">${allPane()}${L.SUBS.map((s) => pane(s)).join("")}</div></div></div>`;
  return desktop({ h: "auto", body });
}

export function iPhone() {
  const s = L.sub("netflix");
  const body = `<div class="row" style="gap:6px;color:var(--accent-text);font-size:14px;font-weight:700">${I.chevR(14).replace("9 6 15 12 9 18", "15 6 9 12 15 18")}Subscriptions</div>
    ${pane(s, { ph: true })}
    <div class="row" style="gap:8px">${btn("Mark paid", { kind: "primary", cls: "grow", icon: I.check(11) })}${btn("Edit", { kind: "soft" })}${iconBtn(I.more(), "More")}</div>
    <p class="card-note">The list is the first screen, like A on a phone. Tapping one opens this.</p>`;
  return phone({ h: "auto", body });
}
