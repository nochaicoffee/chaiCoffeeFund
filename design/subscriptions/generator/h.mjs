// Direction H · By card. A lane for each card or account, holding the subscriptions charged to it.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { inr, inrK, fmt, fmtY, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, header, desktop, phone, rings } = L;

/** Lanes, biggest first. Each holds its active subscriptions, then its paused and cancelled ones. */
export function lanes() {
  return L.byPayer().map((p) => ({ ...p, off: L.SUBS.filter((s) => !L.isOn(s) && (p.kind === "card" ? s.via.card === p.id : s.via.account === p.id)), soon: L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 30), p.subs) }));
}
export const lede = () => {
  const ls = lanes();
  return `Your ${L.ACTIVE.length} subscriptions are charged to <b>${ls.filter((l) => l.kind === "card").length} cards</b> and <b>${ls.filter((l) => l.kind !== "card").length} bank account</b>. <b>${ls[0].name}</b> carries the most, <b>${inr(ls[0].v)} a month</b>. In all you pay <b>${inr(L.MONTHLY)} a month</b>.`;
};

function laneHead(l, { ph = false } = {}) {
  const soonT = l.soon.reduce((t, r) => t + r.amount, 0);
  if (l.kind === "card") {
    const c = L.CARDS[l.id];
    return `<div class="dtile" style="width:100%;height:${ph ? 128 : 150}px;background:linear-gradient(155deg,var(--card-${c.color}-from),var(--card-${c.color}-to))">${rings(300, 150, { stroke: "var(--rings-light)", opacity: 0.06, count: 9 })}
      <div class="between"><svg width="22" height="17" viewBox="0 0 24 18"><rect x="1" y="1" width="22" height="16" rx="3" fill="var(--card-chip)"></rect><line x1="1" y1="7" x2="23" y2="7" stroke="var(--card-chip-deep)" stroke-width="1.2"></line><line x1="1" y1="11" x2="23" y2="11" stroke="var(--card-chip-deep)" stroke-width="1.2"></line></svg><span class="dt-faint">${c.issuer}</span></div>
      <div><div class="between"><span style="font-size:16px;font-weight:800">${c.name}</span><span class="dt-muted" style="letter-spacing:0.12em">•••• ${c.last4}</span></div><div class="between" style="margin-top:8px"><span style="font-size:20px;font-weight:800">${inr(l.v)}<span class="dt-muted" style="font-size:11px"> a month</span></span><span class="dt-pill">${inr(soonT)} next 30 days</span></div></div></div>`;
  }
  return `<div class="glass" style="width:100%;height:${ph ? 128 : 150}px;border-radius:22px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;background:linear-gradient(155deg,var(--surface),oklch(0.97 0.01 150))"><div class="between"><span class="minibank" style="width:26px;height:20px;border-radius:6px">${I.bank(12)}</span><span class="muted" style="font-size:10px;font-weight:600">Bank account</span></div>
    <div><span style="font-size:16px;font-weight:800">${l.name}</span><div class="between" style="margin-top:8px"><span style="font-size:20px;font-weight:800">${inr(l.v)}<span class="muted" style="font-size:11px"> a month</span></span><span class="pill pill-off">${inr(soonT)} next 30 days</span></div></div></div>`;
}

function subCard(s, { ghost = false, drop = false } = {}) {
  const on = L.isOn(s);
  const d = L.nextRenewal(s);
  const n = L.daysBetween(L.TODAY, d);
  const right = !on ? `<span class="pill pill-off">${s.status === "Paused" ? "Paused" : "Cancelled"}</span>` : n <= 7 ? L.duePill(s) : `<span class="muted" style="font-size:11px;font-weight:600">${fmt(d)}</span>`;
  return `<div style="position:relative;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:var(--surface);border:1px solid var(--surface-line);box-shadow:${ghost ? "var(--pop-shadow)" : "var(--soft-shadow)"};${on ? "" : "opacity:0.6;"}${ghost ? "transform:rotate(-3deg);" : ""}">
    <span style="color:var(--fill-strong);display:flex;cursor:grab" aria-hidden="true"><svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor"><circle cx="2" cy="2" r="1.4"></circle><circle cx="6" cy="2" r="1.4"></circle><circle cx="2" cy="7" r="1.4"></circle><circle cx="6" cy="7" r="1.4"></circle><circle cx="2" cy="12" r="1.4"></circle><circle cx="6" cy="12" r="1.4"></circle></svg></span>${mono(s, 28)}
    <span class="grow"><b style="display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.alias}</b><span class="sub2">${inr(s.amount)} a ${L.cycleWord(s.billingCycle)}${s.billingCycle === "Monthly" ? "" : ` · ${inr(L.monthlyEq(s))}/mo`}</span></span>${right}</div>`;
}

function lane(l, { dragFrom = null, dropHere = false, ph = false } = {}) {
  return `<div style="display:flex;flex-direction:column;gap:10px;min-width:0">${laneHead(l, { ph })}
    <div style="flex:1 1 auto;display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:18px;background:${dropHere ? "oklch(0.95 0.04 150)" : "var(--fill)"};${dropHere ? "outline:1.5px dashed var(--accent);" : ""}min-height:120px">
      ${l.subs.sort((a, b) => L.monthlyEq(b) - L.monthlyEq(a)).map((s) => (s.id === dragFrom ? `<div style="height:52px;border-radius:14px;border:1.5px dashed var(--fill-strong)"></div>` : subCard(s))).join("")}
      ${dropHere ? `<div style="position:relative;height:92px;border-radius:14px;border:1.5px dashed var(--accent);display:flex;align-items:flex-start;justify-content:center;padding-top:9px;font-size:12px;font-weight:700;color:var(--accent-text)">Drop to charge ${L.sub(dropHere).alias} to ${l.name}<div style="position:absolute;left:22px;right:-18px;top:34px">${subCard(L.sub(dropHere), { ghost: true })}</div></div>` : ""}
      ${l.off.map((s) => subCard(s)).join("")}
      <span class="row" style="gap:6px;justify-content:center;padding:6px;margin-top:auto;font-size:12px;font-weight:700;color:var(--muted)">${I.plus(11)}Add to ${l.name}</span>
    </div></div>`;
}

export function hDesktop({ drag = true } = {}) {
  const ls = lanes();
  const body = `${header({ lede: lede(), actions: L.headerActions() })}
    <section class="card glass" style="gap:16px"><div class="card-h"><span class="card-t">By card or account<small>drag a subscription to change where it's charged</small></span>${seg([{ label: "A month", on: true }, { label: "Next 30 days" }])}</div>
      <div style="display:grid;grid-template-columns:repeat(${ls.length},minmax(0,1fr));gap:16px;align-items:stretch">${ls.map((l) => lane(l, { dragFrom: drag && l.id === "mil" ? "spotify" : null, dropHere: drag && l.id === "cor" ? "spotify" : null })).join("")}</div>
      <p class="card-note">A card's subscriptions land on its statement, so they're counted there, not again here. Moving one changes its "usually charged to" for the next renewal; payments already recorded keep their card.</p>
    </section>
    <div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:20px;align-items:stretch">${P.renewalsPanel({ n: 6 })}<div class="stack-col"><section class="card glass"><div class="card-h"><span class="card-t">Where it goes<small>a month, by category</small></span></div>${P.categorySplit()}</section>${P.stoppedCard()}</div></div>`;
  return desktop({ h: "auto", body });
}

export function hPhone() {
  const ls = lanes();
  const l = ls[0];
  const body = `${header({ lede: lede(), phone: true, actions: `${btn("Add subscription", { kind: "primary", icon: I.plus() })}${btn("Record payment")}` })}
    <div style="display:flex;gap:6px;overflow:hidden;margin:0 -16px;padding:0 16px">${ls.map((x, i) => `<span class="chip${i === 0 ? " on" : ""}">${x.kind === "card" ? `<span class="minitile" style="width:14px;height:10px;background:linear-gradient(155deg,var(--card-${L.CARDS[x.id].color}-from),var(--card-${L.CARDS[x.id].color}-to))"></span>` : ""}${x.name}<em>${inr(x.v)}</em></span>`).join("")}</div>
    ${lane(l, { ph: true })}
    <section class="card glass" style="padding:16px;gap:12px"><span class="card-t">All cards and accounts</span>${P.payerSplit()}<span class="card-note">On a phone, move one with Edit → Usually charged to.</span></section>
    ${P.renewalsPanel({ n: 4, phone: true })}`;
  return phone({ h: "auto", body });
}
