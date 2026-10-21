// Direction E · Wall calendar. This month as a calendar with each renewal on its day, and the year as dots.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { inr, inrK, fmt, fmtY, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, header, desktop, phone, rings } = L;

const nowKey = L.TODAY.slice(0, 7);
const paidNow = L.paidByMonth(nowKey), toCome = L.expectedByMonth(nowKey);
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const lede = () => `October so far: <b>${inr(paidNow)} paid</b>, and <b>${inr(toCome)}</b> still to renew this month. <b>Netflix</b> is next, on <b>${fmtDow(L.nextRenewal(L.sub("netflix")))}</b>. In all you pay <b>${inr(L.MONTHLY)} a month</b>.`;

/** Every renewal on a day: paid ones from the log, the rest from the schedule. */
function dayItems(iso) {
  const rows = L.renewalRows(iso, iso);
  return rows.map((r) => ({ s: r.s, status: r.status, amount: r.payment ? r.payment.amount : r.plan }));
}
const mondayOf = (iso) => L.addDays(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7));

function chip(it, { compact = false } = {}) {
  const n = L.daysBetween(L.TODAY, it.date ?? L.TODAY);
  const st = it.status;
  const style = st === "paid" ? "background:var(--accent-tint);color:var(--accent-text)" : st === "missing" ? "background:var(--warning-tint);color:var(--warning-text)" : st === "wont" ? "background:var(--fill);color:var(--muted);text-decoration:line-through" : "background:var(--surface);border:1px solid var(--surface-line);box-shadow:var(--soft-shadow)";
  return `<span style="display:flex;flex-direction:column;gap:2px;max-width:100%"><span class="row" style="gap:5px;padding:2px 8px 2px 2px;border-radius:999px;font-size:11.5px;font-weight:800;white-space:nowrap;width:max-content;max-width:100%;${style}">${mono(it.s, 18)}<span>${inr(it.amount)}</span>${st === "paid" ? I.check(9) : ""}</span><span style="font-size:10.5px;font-weight:700;color:var(--muted);padding-left:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it.s.alias}</span></span>`;
}

export function monthGrid({ key = nowKey, cellH = 112, phone: ph = false } = {}) {
  const first = `${key}-01`;
  const start = mondayOf(first);
  const last = L.addDays(L.addMonthsUTC(first, 1), -1);
  const end = L.addDays(mondayOf(last), 6);
  const days = [];
  for (let d = start; d <= end; d = L.addDays(d, 1)) days.push(d);
  const headers = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="heat-m" style="text-align:${ph ? "center" : "left"};padding-left:${ph ? 0 : 10}px">${ph ? d[0] : d}</div>`).join("");
  const cells = days.map((d) => {
    const inMonth = d.slice(0, 7) === key;
    const items = dayItems(d).map((it) => ({ ...it, date: d }));
    const today = d === L.TODAY;
    const due = items.some((it) => it.status === "upcoming" && L.daysBetween(L.TODAY, d) <= 3);
    if (ph) {
      return `<div style="height:${cellH}px;border-radius:10px;display:flex;flex-direction:column;align-items:center;gap:3px;padding-top:5px;${today ? "box-shadow:inset 0 0 0 2px var(--accent);" : ""}${inMonth ? "" : "opacity:0.4;"}"><span style="font-size:12px;font-weight:${today ? 800 : 600};color:${today ? "var(--accent-text)" : "var(--fg)"}">${Number(d.slice(8))}</span><span class="row" style="gap:2px">${items.slice(0, 2).map((it) => `<i style="width:7px;height:7px;border-radius:50%;background:${it.status === "paid" ? `var(--card-${L.catColor(it.s.category)})` : "transparent"};border:1.5px solid var(--card-${L.catColor(it.s.category)})"></i>`).join("")}</span></div>`;
    }
    return `<div style="position:relative;min-height:${cellH}px;border-radius:14px;padding:8px 8px 8px 10px;display:flex;flex-direction:column;gap:5px;background:${inMonth ? (today ? "oklch(0.97 0.03 150)" : "var(--surface)") : "transparent"};border:1px solid ${today ? "var(--accent)" : due ? "oklch(0.55 0.16 25 / 0.35)" : inMonth ? "var(--surface-line)" : "transparent"};${today ? "box-shadow:0 0 0 3px var(--accent-ring);" : ""}">
      <div class="between"><span style="font-size:12px;font-weight:800;color:${inMonth ? (today ? "var(--accent-text)" : "var(--fg)") : "var(--muted)"}">${Number(d.slice(8))}${d.slice(8) === "01" ? ` ${L.monName(d.slice(0, 7))}` : ""}</span>${today ? `<span class="pill pill-on" style="padding:1px 7px;font-size:9.5px">Today</span>` : ""}</div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start;${inMonth ? "" : "opacity:0.55"}">${items.map((it) => chip(it)).join("")}</div>
      ${due ? `<span style="position:absolute;right:8px;bottom:8px" class="btn btn-accent btn-xs">${I.check(10)}Mark paid</span>` : ""}
    </div>`;
  }).join("");
  return `<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));${ph ? "" : `grid-template-rows:auto repeat(${days.length / 7},minmax(${cellH}px,1fr));flex:1 1 auto;`}gap:${ph ? 2 : 8}px">${headers}${cells}</div>`;
}

/** The year as twelve small dot calendars: a dot on each renewal day, filled once paid. */
export function yearDots({ year = 2026, cols = 6, dot = 9 } = {}) {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  return `<div style="display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:16px 20px">${months.map((k) => {
    const first = `${k}-01`, start = mondayOf(first), last = L.addDays(L.addMonthsUTC(first, 1), -1);
    const days = [];
    for (let d = start; d <= last; d = L.addDays(d, 1)) days.push(d);
    const total = k < nowKey ? L.paidByMonth(k) : k === nowKey ? paidNow + toCome : L.expectedByMonth(k);
    const peak = k === "2026-03";
    return `<div style="display:flex;flex-direction:column;gap:7px"><div class="between"><b style="font-size:12px;${k === nowKey ? "color:var(--accent-text)" : ""}">${MONTHS[Number(k.slice(5)) - 1]}</b><span style="font-size:11px;font-weight:800;color:${k > nowKey ? "var(--muted)" : "var(--fg)"}">${inrK(total)}</span></div>
      <div style="display:grid;grid-template-columns:repeat(7,${dot + 6}px);gap:3px">${days.map((d) => {
        if (d.slice(0, 7) !== k) return `<span></span>`;
        const items = dayItems(d);
        if (!items.length) return `<span style="width:${dot + 6}px;height:${dot + 6}px;display:flex;align-items:center;justify-content:center"><i style="width:${d === L.TODAY ? 6 : 3}px;height:${d === L.TODAY ? 6 : 3}px;border-radius:50%;background:${d === L.TODAY ? "var(--accent)" : "var(--fill-strong)"};${d === L.TODAY ? "box-shadow:0 0 0 2px var(--surface),0 0 0 3.5px var(--accent);" : ""}"></i></span>`;
        const big = items.reduce((t, it) => t + it.amount, 0) >= 1000;
        const it = items.sort((a, b) => b.amount - a.amount)[0];
        const col = `var(--card-${L.catColor(it.s.category)})`;
        const filled = it.status === "paid";
        const size = big ? dot + 5 : dot;
        return `<span style="width:${dot + 6}px;height:${dot + 6}px;display:flex;align-items:center;justify-content:center"><i title="${it.s.alias} ${fmt(d)}" style="width:${size}px;height:${size}px;border-radius:50%;background:${filled ? col : it.status === "missing" ? "var(--warning-tint)" : "transparent"};border:1.6px ${it.status === "wont" ? "dashed" : "solid"} ${it.status === "missing" ? "var(--warning)" : col};${d === L.TODAY ? "box-shadow:0 0 0 2px var(--surface),0 0 0 3.5px var(--accent);" : ""}"></i></span>`;
      }).join("")}</div>${peak ? `<span class="card-note" style="font-size:11px">Microsoft 365 renews</span>` : k === nowKey ? `<span class="card-note" style="font-size:11px;color:var(--accent-text)">Today is the 20th</span>` : k > nowKey ? `<span class="card-note" style="font-size:11px">Expected</span>` : ""}</div>`;
  }).join("")}</div>`;
}

function monthSide() {
  const left = L.renewalsBetween(L.addDays(L.TODAY, 0), `${nowKey}-31`);
  const nov = L.renewalsBetween("2026-11-01", "2026-11-30");
  const frac = paidNow / (paidNow + toCome);
  return `<section class="card glass textured" style="gap:12px;flex:0 0 auto">${rings(420, 320, { opacity: 0.06 })}
    <div class="between"><span class="card-t">October</span><span class="pill pill-on">This month</span></div>
    <div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:30px;font-weight:800">${inr(paidNow + toCome)}</span><span class="muted" style="font-weight:700">${inr(paidNow + toCome - L.MONTHLY)} more than a usual month</span></div>
    <div><div class="track" style="height:10px"><span style="width:${frac * 100}%;background:var(--accent)"></span></div><div class="between" style="margin-top:6px;font-size:12px;font-weight:700"><span style="color:var(--accent-text)">${inr(paidNow)} paid</span><span class="muted">${inr(toCome)} to come</span></div></div>
    <div><span class="th">Still to renew</span>${left.map((r) => { const n = L.daysBetween(L.TODAY, r.date); return `<div class="row" style="gap:10px;padding:9px 0;border-bottom:1px solid var(--divider)">${mono(r.s, 26)}<span class="grow"><b style="font-size:13px;display:block">${r.s.alias}</b><span class="sub2">${fmtDow(r.date)} · ${rel(r.date)}</span></span><b class="num">${inr(r.amount)}</b>${n <= 3 ? btn("Mark paid", { kind: "accent", cls: "btn-xs" }) : ""}</div>`; }).join("")}</div>
    <div class="between" style="padding:10px 12px;border-radius:12px;background:var(--fill);font-size:12px;font-weight:600"><span class="muted">November</span><span><b>${inr(nov.reduce((t, r) => t + r.amount, 0))}</b> <span class="muted">· ${nov.length} renewals · SonyLIV won't renew</span></span></div>
    <span class="link">View all renewals ${I.arrowR()}</span>
  </section>`;
}

export function eDesktop() {
  const miss = L.SUBS.flatMap((s) => L.unrecorded(s).map((d) => ({ s, d })));
  const body = `${header({ lede: lede(), actions: L.headerActions() })}
    ${miss.length ? `<div class="notice">${I.alert(16)}<span class="grow"><b>${miss[0].s.alias} renewed on ${fmt(miss[0].d)}</b>, last month, but no payment is recorded for it.</span>${btn("Record payment", { cls: "btn-sm" })}</div>` : ""}
    <div style="display:grid;grid-template-columns:minmax(0,2.1fr) minmax(0,1fr);gap:20px;align-items:stretch">
      <section class="card glass" style="gap:14px"><div class="card-h"><span class="row" style="gap:10px">${iconBtn(I.chevR(13).replace("9 6 15 12 9 18", "15 6 9 12 15 18"), "Previous month")}<span class="card-t" style="font-size:18px">October 2026</span>${iconBtn(I.chevR(13), "Next month")}</span><span class="row" style="gap:12px"><span class="legend"><span><i style="background:var(--accent-tint);border:1px solid var(--accent-edge)"></i>Paid</span><span><i style="background:var(--surface);border:1px solid var(--fill-strong)"></i>To come</span></span>${seg([{ label: "Month", on: true }, { label: "Year" }])}</span></div>${monthGrid()}</section>
      <div class="stack-col">${monthSide()}${P.chargedToCard()}</div>
    </div>
    <section class="card glass"><div class="card-h"><span class="card-t">2026 at a glance<small>a dot on every renewal day, filled once paid, bigger from ₹1,000</small></span><span class="legend"><span><i style="border-radius:50%;background:var(--card-sapphire)"></i>Paid</span><span><i style="border-radius:50%;border:1.6px solid var(--card-sapphire)"></i>Expected</span><span><i style="border-radius:50%;background:var(--warning-tint);border:1.6px solid var(--warning)"></i>Not recorded</span></span></div>${yearDots()}</section>`;
  return desktop({ h: "auto", body });
}

export function ePhone() {
  const left = L.renewalsBetween(L.TODAY, `${nowKey}-31`);
  const body = `${header({ lede: lede(), phone: true, actions: `${btn("Add subscription", { kind: "primary", icon: I.plus() })}${btn("Record payment")}` })}
    <section class="card glass" style="padding:14px;gap:12px"><div class="between"><span class="row" style="gap:6px"><span class="card-t">October 2026</span></span><span class="row" style="gap:6px">${iconBtn(I.chevR(12).replace("9 6 15 12 9 18", "15 6 9 12 15 18"), "Previous")}${iconBtn(I.chevR(12), "Next")}</span></div>${monthGrid({ cellH: 46, phone: true })}
      <div class="between" style="font-size:12px;font-weight:700"><span style="color:var(--accent-text)">${inr(paidNow)} paid</span><span class="muted">${inr(toCome)} to come</span></div><div class="track" style="height:8px"><span style="width:${(paidNow / (paidNow + toCome)) * 100}%;background:var(--accent)"></span></div></section>
    <section class="card glass" style="padding:16px;gap:4px"><span class="card-t">Still to renew in October</span>${left.map((r) => { const n = L.daysBetween(L.TODAY, r.date); return `<div class="row" style="gap:12px;padding:10px 0;border-bottom:1px solid var(--divider)"><span style="width:38px;text-align:center;border-radius:11px;padding:4px 0;background:${n <= 3 ? "var(--negative-tint)" : "var(--fill)"}"><span style="display:block;font-size:9px;font-weight:800;text-transform:uppercase;color:${n <= 3 ? "var(--negative)" : "var(--muted)"}">${L.dow(r.date)}</span><b style="font-size:15px">${Number(r.date.slice(8))}</b></span>${mono(r.s, 28)}<span class="grow"><b style="font-size:14px">${r.s.alias}</b><span class="sub2">${rel(r.date)}</span></span><span style="text-align:right"><b class="num">${inr(r.amount)}</b>${n <= 3 ? `<span class="link" style="display:block;font-size:12px">Mark paid</span>` : ""}</span></div>`; }).join("")}<span class="link" style="padding-top:10px">View all renewals ${I.arrowR()}</span></section>
    <section class="card glass" style="padding:16px"><span class="card-t">2026 at a glance</span>${yearDots({ cols: 3, dot: 6 })}</section>`;
  return phone({ h: "auto", body });
}
