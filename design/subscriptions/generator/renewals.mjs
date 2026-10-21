// The Renewals page (/subscriptions/renewals): every renewal in one place, like the Cards Statements page.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { inr, inrK, fmt, fmtY, fmtSmart, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, select, rings, header, desktop, phone } = L;

const Y0 = "2026-01-01", Y1 = "2026-12-31";
const ROWS = L.renewalRows(Y0, Y1);
const soonEnd = L.addDays(L.TODAY, 30);
const count = (st) => ROWS.filter((r) => r.status === st).length;

export const periodSelect = (open = false, value = "This year") => select({ value, kind: "pill", open, align: "align-end", icon: I.cal(14), options: [{ group: "Quick ranges" }, { label: "Next 30 days" }, { label: "Last 3 months" }, { label: "Last 12 months" }, "-", { label: "This year", on: value === "This year", meta: inrK(L.yearPaid(2026)) }, { label: "2025", meta: inrK(L.yearPaid(2025)) }, { label: "All time" }, "-", { label: "Custom range…" }] });
const subSelect = (value = "All subscriptions") => select({ value, kind: "small", options: [{ label: "All subscriptions", on: value === "All subscriptions", meta: 12 }, "-", ...L.SUBS.map((s) => ({ label: `${mono(s, 18).replace('class="mono', 'style="margin-right:10px;vertical-align:-4px" class="mono')}${s.alias}`, meta: ROWS.filter((r) => r.s === s).length, on: value === s.alias }))] });

function lede() {
  return `Every renewal in one place: <b>${ROWS.length} in 2026</b> across ${L.SUBS.length} subscriptions. <b>${count("missing")} isn't recorded</b>, and <b>${count("upcoming")}</b> are still to come.`;
}
function tiles({ cols = 4 } = {}) {
  const soon = L.renewalsBetween(L.TODAY, soonEnd);
  const miss = ROWS.filter((r) => r.status === "missing");
  const months = Number(L.TODAY.slice(5, 7));
  const changes = ROWS.filter((r) => r.change > 0);
  return `<div class="tiles" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">
    <div class="stile feature">${rings(360, 120, { dx: 12, dy: 30, first: 30, step: 22, opacity: 0.12, sheen: "radial-gradient(circle at 85% 0%, var(--feature-tile-glow), transparent 55%)" })}<span class="k">Next 30 days</span><span class="v">${inr(soon.reduce((t, r) => t + r.amount, 0))}</span><span class="s">${soon.length} renewals · next ${fmtDow(soon[0].date)}</span></div>
    <div class="stile glass"><span class="k">Not recorded</span><span class="v" style="color:var(--warning-text)">${inr(miss.reduce((t, r) => t + r.plan, 0))}</span><span class="s">${miss.length} renewal · ${miss.map((r) => `${r.s.alias} on ${fmt(r.date)}`).join(", ")}</span></div>
    <div class="stile glass"><span class="k">Paid this year</span><span class="v">${inr(L.yearPaid(2026))}</span><span class="s">${L.yearPayments(2026)} payments · ${inr(L.yearPaid(2026) / months)} a month on average</span></div>
    <div class="stile glass"><span class="k">Price changes</span><span class="v">${changes.length} <small>this year</small></span><span class="s"><b>${inr(changes.reduce((t, r) => t + r.change, 0))}</b> more a month: ${changes.map((r) => r.s.alias).join(", ")}</span></div>
  </div>`;
}

const COLS = "minmax(0,1.9fr) minmax(0,1.1fr) 0.95fr 1fr 0.8fr minmax(0,1fr) minmax(0,1.1fr) 112px";
const head = () => `<div style="display:grid;grid-template-columns:${COLS};gap:14px;padding:0 10px 8px" class="th"><span>Subscription</span><span>Renews on</span><span>Amount</span><span>Status</span><span>Paid on</span><span>Charged to</span><span>Change</span><span></span></div>`;

export function status(r) {
  if (r.status === "paid") return `<span class="pill pill-on">Paid</span>`;
  if (r.status === "missing") return `<span class="pill pill-warn">Not recorded</span>`;
  if (r.status === "wont") return `<span class="pill pill-off">${I.stop(10)} Won't renew</span>`;
  const n = L.daysBetween(L.TODAY, r.date);
  if (n <= 3) return `<span class="pill pill-due">${n === 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`}</span>`;
  if (n <= 7) return `<span class="pill pill-soon">In ${n} days</span>`;
  return `<span class="pill pill-off">Upcoming</span>`;
}
export function change(r) {
  if (r.overPlan) return `<span class="chg" style="color:var(--warning-text)">${I.up(10)}${inr(r.overPlan)} over plan</span>`;
  if (r.change) return `<span class="chg ${r.change > 0 ? "chg-up" : "chg-down"}">${r.change > 0 ? I.up(10) : I.down(10)}${inr(Math.abs(r.change))} vs last</span>`;
  return `<span class="muted">—</span>`;
}
function action(r) {
  if (r.status === "missing") return btn("Record payment", { kind: "ghost", cls: "btn-sm" });
  if (r.status === "upcoming" && L.daysBetween(L.TODAY, r.date) <= 3) return btn("Mark paid", { kind: "accent", cls: "btn-sm", icon: I.check(11) });
  if (r.status === "paid") return `<span style="color:var(--muted);display:flex">${I.more()}</span>`;
  return "";
}
export function row(r, { menu = false } = {}) {
  const dateMain = r.status === "upcoming" || r.status === "wont" ? fmtDow(r.date) : fmtY(r.date);
  const sub = r.status === "upcoming" ? `<span class="sub2" style="${L.daysBetween(L.TODAY, r.date) <= 3 ? "color:var(--negative)" : ""}">${rel(r.date)}</span>` : r.status === "missing" ? `<span class="sub2" style="color:var(--warning-text)">${-L.daysBetween(L.TODAY, r.date)} days ago</span>` : r.status === "wont" ? `<span class="sub2">cancelled ${fmt(r.s.endDate)}</span>` : "";
  return `<div style="display:grid;grid-template-columns:${COLS};gap:14px;align-items:center;padding:11px 10px;border-bottom:1px solid var(--divider);font-size:13px${r.status === "wont" ? ";opacity:0.7" : ""}">
    <span class="cell-name">${mono(r.s, 30)}<span style="min-width:0"><b>${r.s.alias}</b><small>${r.s.category} · ${r.s.billingCycle}</small></span></span>
    <span><b style="font-weight:700${r.status === "wont" ? ";text-decoration:line-through" : ""}">${dateMain}</b>${sub}</span>
    <span>${r.payment ? `<b class="num">${inr(r.payment.amount)}</b>` : `<b class="num" style="font-weight:700;color:var(--muted)${r.status === "wont" ? ";text-decoration:line-through" : ""}">${inr(r.plan)}</b><span class="sub2">${r.status === "wont" ? "not charged" : "the plan's price"}</span>`}</span>
    <span>${status(r)}</span>
    <span>${r.payment ? fmtSmart(r.payment.date) : `<span class="muted">—</span>`}</span>
    <span>${r.payment ? cardChip(r.payment.via) : r.status === "upcoming" ? `<span style="opacity:0.6">${cardChip(r.s.via)}</span>` : `<span class="muted">—</span>`}</span>
    <span>${r.payment ? change(r) : `<span class="muted">—</span>`}</span>
    <span style="display:flex;justify-content:flex-end;position:relative">${action(r)}${menu ? rowMenu() : ""}</span>
  </div>`;
}
const rowMenu = () => `<div class="pop align-end" style="top:28px;right:0;left:auto;min-width:200px"><div class="lb"><div class="opt"><span class="opt-label">${I.edit(12)}&nbsp; Edit payment</span></div><div class="opt"><span class="opt-label">${I.subs(12)}&nbsp; Open Netflix</span></div><div class="lb-divider"></div><div class="opt" style="color:var(--negative)"><span class="opt-label">${I.x(12)}&nbsp; Delete payment</span></div></div></div>`;

function groupHead(title, rows) {
  const paid = rows.filter((r) => r.status === "paid").reduce((t, r) => t + r.payment.amount, 0);
  const due = rows.filter((r) => r.status === "upcoming").reduce((t, r) => t + r.plan, 0);
  const miss = rows.filter((r) => r.status === "missing").length;
  const bits = [`${rows.length} renewal${rows.length === 1 ? "" : "s"}`];
  if (paid) bits.push(`${inr(paid)} paid`);
  if (due) bits.push(`${inr(due)} to come`);
  if (miss) bits.push(`<span style="color:var(--warning-text)">${miss} not recorded</span>`);
  return `<div class="tgroup" style="padding-left:10px;padding-right:10px">${title}<span>${bits.join(" · ")}</span></div>`;
}

/** The table, grouped: what's coming in the next 30 days first, then past months, newest first. */
export function table({ rows = ROWS, maxPast = 3, menuOn = null, comingTitle = "Coming up · next 30 days", showMoreUpcoming = true } = {}) {
  const coming = rows.filter((r) => (r.status === "upcoming" || r.status === "wont") && r.date <= soonEnd).reverse();
  const later = rows.filter((r) => (r.status === "upcoming" || r.status === "wont") && r.date > soonEnd);
  const past = rows.filter((r) => r.status === "paid" || r.status === "missing");
  const months = [...new Set(past.map((r) => r.date.slice(0, 7)))].slice(0, maxPast);
  return `${head()}
    ${(table.shown = coming.length + months.reduce((t, k) => t + past.filter((r) => r.date.startsWith(k)).length, 0), "")}${coming.length ? `${groupHead(comingTitle, coming)}${coming.map((r) => row(r)).join("")}${later.length && showMoreUpcoming ? `<div style="padding:10px"><span class="link" style="font-size:12px">${I.chev(11)} ${later.length} more later this year</span></div>` : ""}` : ""}
    ${months.map((k) => { const rs = past.filter((r) => r.date.startsWith(k)); return groupHead(L.monYear(k).replace(/^(\w+)/, (m) => ({ Jan: "January", Feb: "February", Mar: "March", Apr: "April", May: "May", Jun: "June", Jul: "July", Aug: "August", Sep: "September", Oct: "October", Nov: "November", Dec: "December" })[m]), rs) + rs.map((r) => row(r, { menu: menuOn && r.s.id === menuOn.id && r.date === menuOn.date })).join(""); }).join("")}`;
}

function toolbar({ on = "All", sub = "All subscriptions" } = {}) {
  return `<div class="between" style="flex-wrap:wrap">
    <span class="row" style="gap:12px">${seg([{ label: "All", count: ROWS.length, on: on === "All" }, { label: "Upcoming", count: count("upcoming"), on: on === "Upcoming" }, { label: "Paid", count: count("paid"), on: on === "Paid" }, { label: "Not recorded", count: count("missing"), on: on === "Not recorded" }])}
      ${subSelect(sub)}${select({ value: "Charged to: any", kind: "small", options: [{ label: "Any card or account", on: true }, "-", ...Object.values(L.CARDS).map((c) => ({ label: c.name, meta: c.issuer })), { label: "Kotak Savings", meta: "Account" }] })}</span>
    <span class="row" style="gap:10px"><span class="row" style="gap:8px;height:34px;padding:0 14px;border-radius:999px;background:var(--fill);color:var(--muted);font-size:12px;font-weight:600;width:250px">${I.search()}Search subscription or amount</span>${select({ value: "Newest first", kind: "small", align: "align-end", options: [{ label: "Newest first", on: true }, { label: "Oldest first" }, { label: "Biggest first" }] })}</span>
  </div>`;
}

export function renewalsDesktop() {
  const body = `${header({ eyebrow: `<span class="row" style="gap:6px">${I.chevR(11).replace("9 6 15 12 9 18", "15 6 9 12 15 18")} Subscriptions · Renewals</span>`, title: "Renewals", lede: lede(), actions: `${periodSelect()}${iconBtn(I.refresh(), "Refresh")}${btn("Record payment", { kind: "primary", icon: I.plus() })}` })}
    ${tiles()}
    <section class="card glass" style="gap:12px">${toolbar()}<div>${table()}</div>
      <div class="between" style="padding-top:6px"><p class="card-note" style="max-width:860px">Showing ${table.shown} of ${ROWS.length} renewals in 2026. Upcoming ones come from each subscription's schedule, at the plan's price; nothing is saved until a payment is recorded. <b>Change</b> compares a payment with the one before it, or the latest one with the plan.</p><span class="row" style="gap:8px;font-size:12px;font-weight:700;color:var(--muted)">${iconBtn(I.chevR(12).replace("9 6 15 12 9 18", "15 6 9 12 15 18"), "Previous page")}Page 1 of 4${iconBtn(I.chevR(12), "Next page")}</span></div>
    </section>`;
  return desktop({ h: "auto", body });
}

// ---------- Phone ----------
export function phoneRow(r) {
  const n = L.daysBetween(L.TODAY, r.date);
  const act = r.status === "missing" ? `<span class="link" style="font-size:12px;color:var(--warning-text)">Record</span>` : r.status === "upcoming" && n <= 3 ? `<span class="link" style="font-size:12px">Mark paid</span>` : "";
  return `<div class="row" style="gap:12px;padding:11px 0;border-bottom:1px solid var(--divider)${r.status === "wont" ? ";opacity:0.7" : ""}">${mono(r.s, 34)}
    <div class="grow"><div class="between"><b style="font-size:14px">${r.s.alias}</b><b class="num" style="font-size:14px${r.status === "wont" ? ";text-decoration:line-through" : ""}">${inr(r.payment ? r.payment.amount : r.plan)}</b></div>
    <div class="between" style="margin-top:4px"><span class="muted" style="font-size:12px;font-weight:600">${r.status === "paid" ? `${fmt(r.date)} · ${L.viaName(r.payment.via)}` : r.status === "upcoming" ? `${fmtDow(r.date)} · ${rel(r.date)}` : r.status === "wont" ? `${fmt(r.date)} · cancelled` : `${fmt(r.date)} · no payment`}${r.change && !r.overPlan ? ` · <span class="chg chg-up">${I.up(9)}${inr(r.change)}</span>` : ""}</span><span class="row" style="gap:8px">${act}${status(r)}</span></div></div></div>`;
}
export function renewalsPhone() {
  const coming = ROWS.filter((r) => (r.status === "upcoming" || r.status === "wont") && r.date <= soonEnd).reverse();
  const past = ROWS.filter((r) => r.status === "paid" || r.status === "missing");
  const months = [...new Set(past.map((r) => r.date.slice(0, 7)))].slice(0, 2);
  const body = `${header({ eyebrow: "← Subscriptions · Renewals", title: "Renewals", lede: lede(), phone: true, actions: `${periodSelect()}${btn("Record payment", { kind: "primary", icon: I.plus() })}` })}
    ${tiles({ cols: 2 })}
    <section class="card glass" style="padding:16px;gap:10px">
      <div style="display:flex;gap:6px;overflow:hidden;margin:0 -16px;padding:0 16px">${["All", "Upcoming", "Paid", "Not recorded"].map((x, i) => `<span class="chip${i === 0 ? " on" : ""}">${x}<em>${[ROWS.length, count("upcoming"), count("paid"), count("missing")][i]}</em></span>`).join("")}</div>
      <div class="row" style="gap:8px">${subSelect()}</div>
      <div><div class="tgroup">Next 30 days<span>${inr(coming.filter((r) => r.status === "upcoming").reduce((t, r) => t + r.plan, 0))}</span></div>${coming.map(phoneRow).join("")}
      ${months.map((k) => `<div class="tgroup">${L.monYear(k)}<span>${inr(past.filter((r) => r.date.startsWith(k) && r.payment).reduce((t, r) => t + r.payment.amount, 0))} paid</span></div>${past.filter((r) => r.date.startsWith(k)).map(phoneRow).join("")}`).join("")}</div>
      <span class="link" style="align-self:center;padding:6px 0">Show more</span>
    </section>`;
  return phone({ h: "auto", body });
}

// ---------- States ----------
import { section, frame, board } from "./states.mjs";
function oneSub() {
  const s = L.sub("netflix");
  const rows = L.renewalRows("2020-01-01", Y1, [s]);
  const pays = L.paymentsFor(s);
  const strip = `<div style="display:grid;grid-template-columns:1.1fr 1.4fr;gap:20px;align-items:stretch">
    <div class="stile feature" style="gap:10px">${rings(520, 170, { dx: 12, dy: 30, first: 30, step: 22, opacity: 0.12 })}<span class="row" style="gap:12px">${mono(s, 40)}<span><b style="font-size:18px">${s.name}</b><span class="s" style="display:block">Streaming · Monthly · since ${fmtY(s.startDate)}</span></span></span>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:4px"><div><span class="k">Paid so far</span><div style="font-size:20px;font-weight:800">${inr(L.paidSoFar(s))}</div></div><div><span class="k">Payments</span><div style="font-size:20px;font-weight:800">${pays.length}</div></div><div><span class="k">Now</span><div style="font-size:20px;font-weight:800">${inr(s.amount)}<small style="font-size:12px;color:var(--muted)"> /mo</small></div></div></div></div>
    <section class="card glass" style="gap:6px;padding:16px 18px"><div class="between"><span class="th">What each payment cost</span><span class="chg chg-up">${I.up(10)}${inr(150)} (30%) on Jul 23, 2026</span></div>${P.priceStep(s, { w: 640, h: 120 })}</section></div>`;
  const tb = `<div class="between" style="flex-wrap:wrap"><span class="row" style="gap:12px">${seg([{ label: "All", count: rows.length, on: true }, { label: "Upcoming", count: rows.filter((r) => r.status === "upcoming").length }, { label: "Paid", count: pays.length }, { label: "Not recorded", count: rows.filter((r) => r.status === "missing").length }])}<span class="chip on" style="gap:8px">${mono(s, 16)}Netflix<span style="display:flex;opacity:0.7">${I.x(11)}</span></span></span>${periodSelect(false, "All time")}</div>`;
  const tableRows = table({ rows, maxPast: 3, comingTitle: "Coming up", showMoreUpcoming: false });
  return `<section class="card glass" style="gap:16px">${tb}${strip}<div>${tableRows}</div><div class="between"><span class="card-note">Showing 4 of ${rows.length}. Every Netflix renewal since ${fmtY(s.startDate)}.</span><span class="link">Show all ${I.chev(11)}</span></div></section>`;
}
function missingOnly() {
  const rows = ROWS.filter((r) => r.status === "missing");
  return `<section class="card glass" style="gap:12px">${toolbar({ on: "Not recorded" })}<div>${head()}${groupHead("September 2026", rows)}${rows.map((r) => row(r)).join("")}</div><p class="card-note">Recording it here works like Mark paid: it starts at the plan's price, the renewal date and the usual card.</p></section>`;
}
function emptyPeriod() {
  return `<section class="card glass" style="gap:12px">${toolbar()}<div>${head()}<div style="padding:46px 0;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center"><span style="width:44px;height:44px;border-radius:14px;background:var(--fill);color:var(--muted);display:flex;align-items:center;justify-content:center">${I.cal(20)}</span><b style="font-size:15px">No renewals from Jan to Mar 2022</b><p class="card-note">None of your subscriptions had started yet. Amazon Prime is the oldest, from Dec 15, 2022.</p><div class="row">${btn("Show all time", { kind: "soft", cls: "btn-sm" })}</div></div></div></section>`;
}
function menuState() {
  const rows = ROWS.filter((r) => r.date.startsWith("2026-09") && r.status === "paid").slice(0, 3);
  const net = rows.find((r) => r.s.id === "netflix");
  return `<section class="card glass" style="gap:12px;padding-bottom:110px">${head()}${rows.map((r) => row(r, { menu: r === net })).join("")}</section>`;
}
export function renewalsStates() {
  return board({ title: "Renewals page: states", intro: "The Renewals page filtered to one subscription is its full history, so every direction can link here instead of fitting a long list onto the main page.", body: [
    section(1, "One subscription", "From a subscription's \"All renewals\" link, or picked in the filter. A strip on top shows what it has cost and its price history; the table is every renewal, paid or still to come.", oneSub()),
    section(2, "Not recorded only", "The quickest way to catch up after a busy month.", missingOnly()),
    section(3, "Nothing in the period", "Says why, and offers the way out.", emptyPeriod()),
    section(4, "A paid row's menu", "Edit or delete a payment, or jump to its subscription. The app's own menu, as in #112.", menuState()),
  ].join("") });
}
