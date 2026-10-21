// Direction J · Year in review. A report you read top to bottom: a statement per section, and one picture under each.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { inr, inrK, fmt, fmtY, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, header, desktop, phone, rings } = L;

const nowKey = L.TODAY.slice(0, 7);
const months = L.monthsFrom("2026-01", 12).map((k) => {
  const paid = k <= nowKey ? L.paidByMonth(k) : 0;
  const exp = k >= nowKey ? L.expectedByMonth(k) : 0;
  const lumps = (k <= nowKey ? L.PAYMENTS.filter((p) => p.date.startsWith(k)).map((p) => ({ s: L.sub(p.subId), amount: p.amount })) : L.renewalsBetween(`${k}-01`, `${k}-31`)).filter((x) => x.s.billingCycle !== "Monthly").sort((a, b) => b.amount - a.amount);
  return { k, paid, exp, total: paid + exp, lumps };
});
const peak = months.reduce((a, b) => (b.total > a.total ? b : a));
const rises = L.renewalRows("2026-01-01", L.TODAY).filter((r) => r.change > 0);
const riseYear = rises.reduce((t, r) => t + (r.change * 12) / L.STEP[r.s.billingCycle], 0);
const off = L.SUBS.filter((s) => !L.isOn(s));
const offYear = off.reduce((t, s) => t + L.monthlyEq(s) * 12, 0);
const [top1, top2] = L.byCost;

const statement = (eyebrow, title, sub = "") => `<div style="display:flex;flex-direction:column;gap:6px"><span class="eyebrow">${eyebrow}</span><h2 style="font-size:26px;font-weight:800;line-height:1.2;text-wrap:balance">${title}</h2>${sub ? `<p class="lede" style="font-size:15px">${sub}</p>` : ""}</div>`;

function hero({ ph = false } = {}) {
  return `<div class="textured" style="border-radius:28px;padding:${ph ? "22px 20px" : "32px 34px"};background:var(--feature-tile);border:1px solid var(--feature-tile-line);display:grid;grid-template-columns:${ph ? "1fr" : "1.2fr 1fr"};gap:${ph ? 18 : 28}px;align-items:end">${rings(1300, 260, { dx: 20, dy: 40, first: 40, step: 30, opacity: 0.1, sheen: "radial-gradient(circle at 85% 0%, var(--feature-tile-glow), transparent 55%)" })}
    <div style="display:flex;flex-direction:column;gap:8px"><span class="eyebrow" style="color:oklch(0.38 0.08 152)">2026 so far</span><span style="font-size:${ph ? 46 : 72}px;font-weight:800;line-height:1;letter-spacing:-0.02em">${inr(L.YEARLY)}</span><span style="font-size:${ph ? 15 : 17}px;font-weight:600;color:oklch(0.32 0.06 152)">a year, at today's prices, for ${L.ACTIVE.length} subscriptions</span></div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">${[[inr(L.MONTHLY), "a month"], [inr(L.YEARLY / 365), "a day"], [inr(L.yearPaid(2026)), "paid since Jan"]].map(([v, k]) => `<div style="background:oklch(1 0 0 / 0.7);border-radius:16px;padding:12px 14px"><b style="display:block;font-size:${ph ? 17 : 22}px;font-weight:800">${v}</b><span class="muted" style="font-size:12px;font-weight:600">${k}</span></div>`).join("")}</div></div>`;
}

function shareBar({ ph = false } = {}) {
  const total = L.MONTHLY;
  return `<div style="display:flex;height:${ph ? 60 : 84}px;border-radius:18px;overflow:hidden;gap:3px">${L.byCost.map((s, i) => {
    const w = (L.monthlyEq(s) / total) * 100;
    return `<div class="textured" style="flex:${L.monthlyEq(s)};background:linear-gradient(155deg,var(--card-${L.catColor(s.category)}-from),var(--card-${L.catColor(s.category)}-to));color:var(--on-card);padding:${ph ? 8 : 12}px;display:flex;flex-direction:column;justify-content:space-between;min-width:0;${i > 1 ? "opacity:0.8;" : ""}">${rings(200, 84, { stroke: "var(--rings-light)", opacity: 0.06, first: 20, step: 14 })}${w > (ph ? 14 : 7) ? `<b style="font-size:${ph ? 11 : 13}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.alias}</b><span style="font-size:${ph ? 10 : 12}px;font-weight:700;opacity:0.8">${Math.round(w)}%</span>` : ""}</div>`;
  }).join("")}</div>`;
}

function monthBars({ w = 1300, h = 260, ph = false } = {}) {
  const max = Math.ceil(Math.max(...months.map((m) => m.total)) / 2000) * 2000;
  const gap = ph ? 4 : 14, bw = (w - gap * 11) / 12, plot = h - (ph ? 40 : 70);
  const Y = (v) => (v / max) * plot;
  return `<div style="position:relative;height:${h}px;width:${w}px"><span style="position:absolute;left:0;right:0;bottom:${(ph ? 20 : 26) + Y(L.MONTHLY)}px;border-top:1.5px dashed var(--accent-text);opacity:0.55"></span>
    ${months.map((m, i) => {
      const x = i * (bw + gap), base = ph ? 20 : 26;
      const isPeak = m === peak;
      return `${m.paid ? `<div class="textured" style="position:absolute;left:${x}px;bottom:${base}px;width:${bw}px;height:${Y(m.paid)}px;border-radius:${ph ? 6 : 12}px ${ph ? 6 : 12}px 4px 4px;background:var(--heat-${isPeak ? 5 : m.paid > L.MONTHLY ? 4 : 3})${isPeak ? ";box-shadow:0 10px 22px var(--trend-peak-shadow)" : ""}">${rings(60, 200, { stroke: "var(--rings-light)", opacity: 0.1, first: 22, step: 14 })}</div>` : ""}
      ${m.exp ? `<div style="position:absolute;left:${x}px;bottom:${base + Y(m.paid) + (m.paid ? 4 : 0)}px;width:${bw}px;height:${Y(m.exp) - (m.paid ? 4 : 0)}px;border-radius:${ph ? 6 : 12}px ${ph ? 6 : 12}px 4px 4px;border:1.5px dashed var(--heat-4)"></div>` : ""}
      ${ph ? "" : `<span style="position:absolute;left:${x - 10}px;width:${bw + 20}px;bottom:${base + Y(m.total) + 6}px;text-align:center;font-size:11.5px;font-weight:800;color:${m.k > nowKey ? "var(--muted)" : "var(--fg)"}">${inrK(m.total)}${m.lumps[0] ? `<span style="display:block;font-size:10px;font-weight:700;color:var(--muted)">${m.lumps[0].s.alias}</span>` : ""}</span>`}
      <span style="position:absolute;left:${x}px;width:${bw}px;bottom:${ph ? 2 : 4}px;text-align:center;font-size:${ph ? 10 : 12}px;font-weight:${m.k === nowKey ? 800 : 600};color:${m.k === nowKey ? "var(--fg)" : "var(--muted)"}">${ph ? L.monName(m.k)[0] : L.monName(m.k)}</span>`;
    }).join("")}</div>`;
}

function riseCards({ ph = false } = {}) {
  return `<div style="display:grid;grid-template-columns:${ph ? "1fr" : "repeat(3,minmax(0,1fr))"};gap:12px">${rises.map((r) => `<div class="card glass" style="gap:6px;padding:16px"><div class="row" style="gap:10px">${mono(r.s, 28)}<b style="font-size:14px">${r.s.alias}</b><span class="chg chg-up" style="margin-left:auto">${I.up(10)}${L.pct(r.change, r.payment.amount - r.change)}</span></div><div style="font-size:20px;font-weight:800"><span class="muted" style="font-weight:700">${inr(r.payment.amount - r.change)}</span> → ${inr(r.payment.amount)}</div><span class="card-note">${fmtY(r.date)}${r.overPlan ? ". The plan still says the old price." : ""}</span></div>`).join("")}</div>`;
}

function offCard() {
  return `<div class="card glass" style="gap:10px"><div style="font-size:30px;font-weight:800;color:var(--positive)">${inr(offYear)} <span style="font-size:15px;color:var(--muted);font-weight:700">a year</span></div><p class="card-note" style="font-size:13px">that you no longer pay, from the ones you've stopped:</p>${off.map((s) => `<div class="row" style="gap:10px;font-size:13px">${mono(s, 26)}<b class="grow">${s.alias}</b><span class="muted" style="font-weight:600">${s.status === "Paused" ? "paused" : `cancelled ${fmt(s.endDate)}`}</span><b class="num">${inr(L.monthlyEq(s) * 12)}</b></div>`).join("")}</div>`;
}

export function jDesktop() {
  const body = `<div class="between" style="align-items:center"><span class="eyebrow">Subscriptions</span><span class="pg-actions">${iconBtn(I.refresh(), "Refresh")}${btn("Record payment", { icon: I.check(12) })}${btn("Add subscription", { kind: "primary", icon: I.plus() })}</span></div>
    ${hero()}
    <section style="display:flex;flex-direction:column;gap:16px;padding:8px 6px 0">${statement("What it's made of", `Two of them, ${top1.alias} and ${top2.alias}, are ${L.pct(L.monthlyEq(top1) + L.monthlyEq(top2), L.MONTHLY)} of it.`, `${top1.alias} alone costs ${inr(L.monthlyEq(top1) * 12)} a year.`)}${shareBar()}<div class="legend">${L.byCategory().map((c) => `<span><i style="background:var(--card-${c.color})"></i>${c.name} <b>${L.pct(c.v, L.MONTHLY)}</b></span>`).join("")}</div></section>
    <section style="display:flex;flex-direction:column;gap:16px;padding:18px 6px 0">${statement("When it's charged", `${L.monName(peak.k) === "Mar" ? "March" : L.monName(peak.k)} is the heaviest month, at ${inr(peak.total)}.`, `That's the month ${peak.lumps.map((l) => l.s.alias).join(" and ")} ${peak.lumps.length > 1 ? "renew" : "renews"}. A usual month is ${inr(L.MONTHLY)}, the dashed line.`)}${monthBars({ w: 1400, h: 280 })}</section>
    <section style="display:flex;flex-direction:column;gap:16px;padding:18px 6px 0">${statement("What changed", `${rises.length} prices went up this year, adding ${inr(riseYear)} a year.`)}${riseCards()}</section>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;padding:18px 6px 0;align-items:stretch">
      <section style="display:flex;flex-direction:column;gap:16px">${statement("What you stopped", `Pausing and cancelling saves ${inr(offYear)} a year.`)}${offCard().replace('class="card glass" style="gap:10px"', 'class="card glass" style="gap:10px;flex:1 1 auto"')}</section>
      <section style="display:flex;flex-direction:column;gap:16px">${statement("Where it's charged", `${L.byPayer()[0].name} carries the most, ${inr(L.byPayer()[0].v)} a month.`)}<div class="card glass" style="gap:14px;flex:1 1 auto"><div class="spread" style="gap:14px">${P.payerSplit()}</div></div></section>
    </div>
    <section style="display:flex;flex-direction:column;gap:16px;padding:18px 6px 0">${statement("What's next", `${L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 30)).length} renewals in the next 30 days, starting ${fmtDow(L.nextRenewal(L.byNext[0]))}.`)}${P.renewalsPanel({ n: 8, cols: 2 })}</section>`;
  return desktop({ h: "auto", body });
}

export function jPhone() {
  const body = `<div class="between"><span class="eyebrow">Subscriptions</span>${btn("Add", { kind: "primary", cls: "btn-sm", icon: I.plus(11) })}</div>${hero({ ph: true })}
    ${statement("What it's made of", `${top1.alias} and ${top2.alias} are ${L.pct(L.monthlyEq(top1) + L.monthlyEq(top2), L.MONTHLY)} of it.`)}${shareBar({ ph: true })}
    ${statement("When it's charged", `March is the heaviest month, at ${inr(peak.total)}.`)}<section class="card glass" style="padding:14px">${monthBars({ w: 330, h: 170, ph: true })}</section>
    ${statement("What changed", `${rises.length} prices went up, adding ${inr(riseYear)} a year.`)}${riseCards({ ph: true })}
    ${statement("What you stopped", `Pausing and cancelling saves ${inr(offYear)} a year.`)}${offCard()}
    ${P.renewalsPanel({ n: 4, phone: true })}`;
  return phone({ h: "auto", body });
}
