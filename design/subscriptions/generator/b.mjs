// Direction B · Calendar. Time first: the next 30 days on a timeline, a year of months paid and expected, then an agenda.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { inr, inrK, fmt, fmtSmart, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, header, desktop, phone } = L;

const soon = () => L.renewalsBetween(L.TODAY, L.addDays(L.TODAY, 30));
export const lede = () => {
  const r = soon();
  const total = r.reduce((t, x) => t + x.amount, 0);
  const first = r[0];
  return `<b>${r.length} renewals</b> in the next 30 days come to <b>${inr(total)}</b>, starting with <b>${first.s.alias}</b> on <b>${fmtDow(first.date)}</b>. In all you pay <b>${inr(L.MONTHLY)} a month</b>, or <b>${inr(L.YEARLY)} a year</b>.`;
};

/** Monday-start weeks covering the next 30 days. */
function weeks(days = 30) {
  const out = [];
  const end = L.addDays(L.TODAY, days);
  const dowIdx = new Date(`${L.TODAY}T00:00:00Z`).getUTCDay();
  let start = L.addDays(L.TODAY, -((dowIdx + 6) % 7));
  while (start <= end) {
    const stop = L.addDays(start, 6);
    const items = L.renewalsBetween(start < L.TODAY ? L.TODAY : start, stop > end ? end : stop);
    out.push({ start, stop, items, total: items.reduce((t, x) => t + x.amount, 0) });
    start = L.addDays(start, 7);
  }
  return out;
}

export function timeline({ w = 1370, h = 300, open = "chatgpt" } = {}) {
  const days = 30;
  const X = (iso) => 30 + (L.daysBetween(L.TODAY, iso) / days) * (w - 60);
  const items = soon();
  const max = Math.max(...items.map((r) => r.amount));
  const base = h - 70;
  const H = (v) => 34 + (v / max) * (base - 100);
  const ghosts = L.SUBS.filter((s) => s.status === "Cancelled").map((s) => ({ s, date: L.nextRenewal(s) })).filter((g) => L.daysBetween(L.TODAY, g.date) <= days);
  const ticks = [];
  for (let i = 0; i <= days; i++) {
    const d = L.addDays(L.TODAY, i);
    const mon = L.dow(d) === "Mon";
    ticks.push(`<span style="position:absolute;left:${X(d)}px;top:${base}px;width:1px;height:${mon ? 10 : 5}px;background:${mon ? "var(--muted)" : "var(--fill-strong)"}"></span>${mon || i === 0 ? `<span style="position:absolute;left:${X(d)}px;top:${base + 14}px;transform:translateX(-50%);font-size:11px;font-weight:700;color:${i === 0 ? "var(--fg)" : "var(--muted)"};white-space:nowrap">${i === 0 ? "Today" : `Mon ${fmt(d)}`}</span>` : ""}`);
  }
  const stems = items.map((r) => {
    const x = X(r.date), sh = H(r.amount);
    const due = L.daysBetween(L.TODAY, r.date) <= 3;
    return `<div class="hov${r.s.id === open ? " is-open" : ""}" style="position:absolute;left:${x}px;top:${base - sh}px;width:0;height:${sh}px">
      <span style="position:absolute;left:-1px;top:0;width:2px;height:${sh}px;background:linear-gradient(var(--card-${L.catColor(r.s.category)}),oklch(0 0 0 / 0.08))"></span>
      <span style="position:absolute;left:0;top:0;transform:translate(-50%,-50%);border-radius:10px;${due ? "box-shadow:0 0 0 3px var(--surface),0 0 0 5px var(--negative);" : "box-shadow:0 0 0 3px var(--surface);"}display:flex">${mono(r.s, 30)}</span>
      <span style="position:absolute;left:0;top:-58px;transform:translateX(-50%);text-align:center;white-space:nowrap"><b style="display:block;font-size:13px;font-weight:800">${inr(r.amount)}</b><span style="display:block;font-size:11px;font-weight:600;color:var(--muted)">${r.s.alias}</span></span>
      <div class="hc-wrap" style="left:30px;top:-20px">${P.renewalCard(r.s, r.date)}</div>
    </div>`;
  }).join("");
  const ghostEls = ghosts.map((g) => {
    const x = X(g.date), sh = 150;
    return `<div style="position:absolute;left:${x}px;top:${base - sh}px;height:${sh}px"><span style="position:absolute;left:-1px;top:0;width:0;height:${sh}px;border-left:2px dashed var(--fill-strong)"></span><span style="position:absolute;left:0;top:0;transform:translate(-50%,-50%);display:flex">${mono(g.s, 26)}</span><span style="position:absolute;left:20px;top:-15px;white-space:nowrap;color:var(--muted)"><b style="display:block;font-size:12px;font-weight:700;text-decoration:line-through">${inr(g.s.amount)}</b><span style="display:block;font-size:11px;font-weight:600">${g.s.alias} won't renew</span></span></div>`;
  }).join("");
  const wk = weeks(days).map((k) => {
    const a = Math.max(X(k.start), X(L.TODAY)), b = Math.min(X(L.addDays(k.stop, 1)), X(L.addDays(L.TODAY, days)));
    return `<div style="position:absolute;left:${a + 3}px;width:${b - a - 6}px;top:${base + 38}px;height:26px;border-radius:9px;background:${k.total ? "var(--fill)" : "transparent"};border:${k.total ? "0" : "1px dashed var(--fill-strong)"};display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;font-weight:700;color:var(--muted)">${k.total ? `<b style="color:var(--fg)">${inr(k.total)}</b> · ${k.items.length}` : "Nothing renews"}</div>`;
  }).join("");
  return `<div style="position:relative;height:${h}px;width:${w}px">
    <span style="position:absolute;left:${X(L.TODAY) - 1}px;top:16px;width:2px;height:${base - 16}px;background:var(--accent);opacity:0.5"></span>
    <span style="position:absolute;left:0;right:0;top:${base}px;height:1px;background:var(--divider)"></span>
    ${ticks.join("")}${ghostEls}${stems}${wk}
  </div>`;
}

/** Last 12 months paid against the next 12 expected, the same calendar months one above the other. */
export function monthGrid({ phone: ph = false } = {}) {
  const startPast = L.monthKey(L.addMonthsUTC(`${L.TODAY.slice(0, 7)}-01`, -11));
  const past = L.monthsFrom(startPast, 12);
  const future = L.monthsFrom(L.monthKey(L.addMonthsUTC(`${L.TODAY.slice(0, 7)}-01`, 1)), 12);
  const nowKey = L.TODAY.slice(0, 7);
  const pastV = past.map((k) => L.paidByMonth(k));
  const futV = future.map((k) => L.expectedByMonth(k));
  const all = [...pastV, ...futV];
  const lo = Math.min(...all), hi = Math.max(...all);
  const lvl = (v) => 1 + Math.min(4, Math.floor(((v - lo) / (hi - lo || 1)) * 5));
  const peakF = futV.indexOf(Math.max(...futV));
  const lumps = (k) => L.renewalsBetween(`${k}-01`, `${k}-31`).filter((r) => r.s.billingCycle !== "Monthly").sort((a, b) => b.amount - a.amount);
  const cell = (k, v, kind, i) => {
    const l = lvl(v);
    const ink = l >= 4 ? "var(--on-accent)" : "var(--heat-ink)";
    const lump = lumps(k)[0];
    if (kind === "past") {
      const now = k === nowKey;
      return `<div class="hcell${now ? " now" : ""}" style="background:var(--heat-${l});color:${ink}">${L.rings(100, 54, { dx: 6, dy: 14, first: 18, step: 12, stroke: l >= 4 ? "var(--rings-light)" : "var(--rings-ink)", opacity: l >= 4 ? 0.1 : 0.08 })}${inrK(v)}<span class="cap">${now ? `+${inrK(L.expectedByMonth(k))} to come` : ""}</span></div>`;
    }
    const peak = i === peakF;
    return `<div class="hov"><div class="hcell up${lump ? " big" : ""}" style="${peak ? "border-style:solid;border-color:var(--heat-4);" : ""}">${inrK(v)}<span class="cap">${lump ? lump.s.alias : ""}</span></div>${peak ? `<span class="pill pill-ink" style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);padding:2px 8px;font-size:9.5px">Biggest</span>` : ""}
      <div class="hc-wrap" style="top:62px;left:50%;margin-left:-125px">${monthCard(k, v)}</div></div>`;
  };
  const cols = ph ? "repeat(6, minmax(0,1fr))" : `96px repeat(12, minmax(0,1fr)) 150px`;
  const pastTotal = pastV.reduce((a, b) => a + b, 0);
  const futTotal = futV.reduce((a, b) => a + b, 0);
  if (ph) {
    const block = (title, keys, vals, kind, total) => `<div style="display:flex;flex-direction:column;gap:8px"><div class="between"><span style="font-size:13px;font-weight:800">${title}</span><b class="num">${inr(total)}</b></div><div class="heat" style="grid-template-columns:${cols}">${keys.map((k) => `<div class="heat-m${k === nowKey ? " now" : ""}">${L.monName(k)}</div>`).join("")}${keys.map((k, i) => cell(k, vals[i], kind, i)).join("")}</div></div>`;
    const sum = (xs) => xs.reduce((x, y) => x + y, 0);
    return `${block("Last 6 months, paid", past.slice(6), pastV.slice(6), "past", sum(pastV.slice(6)))}${block("Next 6 months, expected", future.slice(0, 6), futV.slice(0, 6), "future", sum(futV.slice(0, 6)))}`;
  }
  return `<div class="heat" style="grid-template-columns:${cols}">
    <span></span>${past.map((k) => `<div class="heat-m${k === nowKey ? " now" : ""}">${L.monName(k)}</div>`).join("")}<div class="heat-m" style="text-align:right">Total</div>
    <span style="font-size:12px;font-weight:800;line-height:1.3">Last 12<br><span class="muted" style="font-weight:600">paid</span></span>${past.map((k, i) => cell(k, pastV[i], "past", i)).join("")}<div style="text-align:right"><b style="font-size:16px;font-weight:800">${inr(pastTotal)}</b><div class="muted" style="font-size:11px;font-weight:600;margin-top:2px">${L.monYear(past[0])} – ${L.monName(past.at(-1))}</div></div>
    <span style="font-size:12px;font-weight:800;line-height:1.3">Next 12<br><span class="muted" style="font-weight:600">expected</span></span>${future.map((k, i) => cell(k, futV[i], "future", i)).join("")}<div style="text-align:right"><b style="font-size:16px;font-weight:800">${inr(futTotal)}</b><div class="muted" style="font-size:11px;font-weight:600;margin-top:2px">${L.monYear(future[0])} – ${L.monYear(future.at(-1))}</div></div>
  </div>`;
}

function monthCard(k, v) {
  const rs = L.renewalsBetween(`${k}-01`, `${k}-31`);
  const big = rs.filter((r) => r.s.billingCycle !== "Monthly");
  const monthly = rs.filter((r) => r.s.billingCycle === "Monthly");
  return `<div class="hc"><div class="h"><span style="color:var(--fg)">${L.monYear(k)}</span><span class="pill pill-off" style="padding:2px 8px;font-size:10px">Expected</span></div><div class="t">${inr(v)}</div><div class="d">${inr(v - L.MONTHLY)} ${v >= L.MONTHLY ? "more" : "less"} than a usual month</div><ul>${big.map((r) => `<li>${mono(r.s, 18)}<span class="nm">${r.s.alias} · ${fmt(r.date)}</span><b>${inr(r.amount)}</b></li>`).join("")}<li><span class="minibank" style="width:18px;height:18px;border-radius:6px">${I.subs(10)}</span><span class="nm">${monthly.length} monthly ones</span><b>${inr(monthly.reduce((t, r) => t + r.amount, 0))}</b></li></ul><div class="f">At today's prices. A price change moves it.</div></div>`;
}

export function agenda({ phone: ph = false, limit = 99 } = {}) {
  const miss = L.SUBS.flatMap((s) => L.unrecorded(s).map((d) => ({ s, d })));
  const groups = [];
  const wks = weeks(30);
  const names = ["This week", "Next week"];
  wks.forEach((k, i) => { if (k.items.length) groups.push({ title: names[i] ?? `Week of ${fmt(k.start)}`, sub: `${inr(k.total)}`, items: k.items }); });
  const later = L.renewalsBetween(L.addDays(L.TODAY, 31), L.addDays(L.TODAY, 75)).filter((r) => r.s.billingCycle !== "Monthly");
  const item = (r, missing = false) => {
    const n = L.daysBetween(L.TODAY, r.date);
    const top = missing || n > 13 ? L.monName(r.date.slice(0, 7)) : L.dow(r.date);
    const action = missing ? btn("Record payment", { kind: "ghost", cls: "btn-sm" }) : n <= 3 ? btn("Mark paid", { kind: "accent", cls: "btn-sm", icon: I.check(11) }) : "";
    return `<div class="row" style="gap:14px;padding:11px 0;border-bottom:1px solid var(--divider)">
      <span style="width:42px;flex-shrink:0;text-align:center;border-radius:12px;padding:5px 0;background:${missing ? "var(--warning-tint)" : n <= 3 ? "var(--negative-tint)" : "var(--fill)"}"><span style="display:block;font-size:9.5px;font-weight:800;text-transform:uppercase;color:${missing ? "var(--warning-text)" : n <= 3 ? "var(--negative)" : "var(--muted)"}">${top}</span><b style="display:block;font-size:16px;font-weight:800;line-height:1.1">${Number(r.date.slice(8))}</b></span>
      ${mono(r.s, 30)}
      <span class="grow"><b style="display:block;font-size:13px">${r.s.alias}</b><span class="sub2">${missing ? `${L.dow(r.date)} · no payment recorded` : `${n > 13 ? `${L.dow(r.date)} · ` : ""}${rel(r.date)} · ${L.viaName(r.s.via)}`}</span></span>
      ${ph && action ? `<span style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><b class="num" style="font-size:14px">${inr(r.amount)}</b><span class="link" style="font-size:12px;${missing ? "color:var(--warning-text)" : ""}">${missing ? "Record" : "Mark paid"}</span></span>` : `<b class="num" style="font-size:14px">${inr(r.amount)}</b>`}${ph ? "" : `<span style="width:128px;display:flex;justify-content:flex-end">${action}</span>`}
    </div>`;
  };
  return `${miss.length ? `<div><div class="tgroup" style="color:var(--warning-text)">Not recorded <span>${miss.length} renewal</span></div>${miss.map((m) => item({ s: m.s, date: m.d, amount: L.priceOn(m.s, m.d) }, true)).join("")}</div>` : ""}
    ${groups.map((g) => `<div><div class="tgroup">${g.title}<span>${g.sub}</span></div>${g.items.slice(0, limit).map((r) => item(r)).join("")}</div>`).join("")}
    ${later.length && !ph ? `<div><div class="tgroup">Later<span>quarterly and yearly ones</span></div>${later.map((r) => item(r)).join("")}</div>` : ""}`;
}

export function costRank({ max = 10 } = {}) {
  const top = L.monthlyEq(L.byCost[0]);
  return `<div style="display:flex;flex-direction:column;gap:12px">${L.byCost.slice(0, max).map((s, i) => `<div class="row" style="gap:12px"><span class="muted" style="width:16px;font-size:12px;font-weight:800;text-align:right">${i + 1}</span>${mono(s, 26)}<span class="grow"><span class="between"><b style="font-size:13px">${s.alias}</b><span class="row" style="gap:8px"><span class="muted" style="font-size:11px;font-weight:600">${s.billingCycle === "Monthly" ? "" : `${inr(s.amount)} a ${L.cycleWord(s.billingCycle)} →`}</span><b class="num">${inr(L.monthlyEq(s))}</b></span></span><span class="track" style="display:block;margin-top:6px"><span style="width:${(L.monthlyEq(s) / top) * 100}%;background:var(--card-${L.catColor(s.category)})"></span></span></span></div>`).join("")}</div>`;
}

export function bDesktop() {
  const r = soon();
  const body = `${header({ lede: lede(), actions: L.headerActions() })}
    <section class="card glass" style="gap:6px">
      <div class="card-h"><span class="card-t">Next 30 days<small>${fmt(L.TODAY)} – ${fmt(L.addDays(L.TODAY, 30))}</small></span><span class="row" style="gap:14px"><span class="legend"><span><i style="background:var(--negative);border-radius:50%"></i>Due in 3 days or less</span><span><i style="border:1.5px dashed var(--muted);background:transparent"></i>Cancelled, won't renew</span></span><b style="font-size:20px;font-weight:800">${inr(r.reduce((t, x) => t + x.amount, 0))}</b></span></div>
      ${timeline()}
    </section>
    <section class="card glass">
      <div class="card-h"><span class="card-t">Month by month<small>the same months a year apart</small></span><span class="legend"><span><i style="background:var(--heat-2)"></i>Paid</span><span><i style="border:1.5px dashed var(--heat-upcoming)"></i>Expected</span><span><i style="border:1.5px dashed oklch(0.6 0.12 153 / 0.6);background:oklch(0.95 0.03 150 / 0.5)"></i>A yearly or quarterly one renews</span></span></div>
      ${monthGrid()}
    </section>
    <div style="display:grid;grid-template-columns:1.25fr 1fr;gap:20px;align-items:stretch">
      <section class="card glass" style="gap:4px"><div class="card-h"><span class="card-t">Coming up</span><span class="link">All renewals ${I.arrowR()}</span></div>${agenda()}</section>
      <div class="stack-col">
        <section class="card glass"><div class="card-h"><span class="card-t">Costs the most<small>a month</small></span>${L.select({ value: "Active, 10", kind: "small", align: "align-end", options: [{ label: "Active", meta: 10, on: true }, { label: "Include paused", meta: 11 }] })}</div>${costRank()}<p class="card-note">Not counted: Headspace (paused) and SonyLIV (cancelled).</p></section>
        <section class="card glass"><div class="card-h"><span class="card-t">Price changes<small>last 12 months</small></span></div><div class="spread" style="gap:16px">${P.changeList()}</div></section>
      </div>
    </div>`;
  return desktop({ h: "auto", body });
}

export function bPhone() {
  const r = soon();
  const body = `${header({ lede: lede(), phone: true, actions: `${btn("Add subscription", { kind: "primary", icon: I.plus() })}${btn("Record payment")}` })}
    <section class="card glass" style="padding:16px;gap:6px"><div class="between"><span class="card-t">Next 30 days</span><b style="font-size:18px">${inr(r.reduce((t, x) => t + x.amount, 0))}</b></div>${agenda({ phone: true })}</section>
    <section class="card glass" style="padding:16px;gap:14px"><span class="card-t">Month by month</span>${monthGrid({ phone: true })}</section>
    <section class="card glass" style="padding:16px"><span class="card-t">Costs the most</span>${costRank({ max: 5 })}<span class="link">All 10 ${I.arrowR()}</span></section>`;
  return phone({ h: "auto", body });
}
