// The Entries page (/income/entries): the Income counterpart of Cards' Statements, Subscriptions' Renewals and
// Accounts' Balance history. Three directions:
//   E1 Ledger     Renewals' layout: tiles, filters, month groups, a row per payment
//   E2 Pay grid   sources down, months across: which payments landed when, then the rows behind the pick
//   E3 Passbook   pick a source on the left, its whole history on the right, as a timeline
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { rings } from "./rings.mjs";
const { I, inr, inrS, signed, fmt, col, grad, mono, btn } = L;
const { hc, tip, card, cardHead } = P;

const page = (body) => L.desktop({ h: "auto", body: `<div style="display:flex;flex-direction:column;gap:20px">${body}</div>` });
const plain = (t) => t;
const b = (t) => `<b style="color:var(--fg);font-weight:700">${t}</b>`;
const SIX = L.ENTRIES.filter((e) => cashYear(e) === "2026");
function cashYear(e) { return L.cashDate(e).slice(0, 4); }
const pendingAll = L.PENDING;
const header = (lede) => L.header({ eyebrow: "Income · Entries", title: "Entries", back: true, lede: `<p class="lede" style="margin:0">${lede}</p>`, actions: `${L.periodPill()}${L.iconBtn(I.refresh(), "Refresh")}${btn("Record income", { kind: "primary", icon: I.plus() })}` });
const LEDE = `Every payment in one place: ${b(`${L.received(2026).length + pendingAll.length} in 2026`)} across ${L.plural(L.ACTIVE.length + 1, "source")}. ${b(`${pendingAll.length} is pending`)}, and ${b(String(L.UPCOMING.filter((u) => u.expectedDate <= "2026-12-31").length))} are still to come.`;

const prevOf = (e) => L.ENTRIES.filter((x) => x.sourceId === e.sourceId && x.tag === e.tag && x.expectedDate < e.expectedDate).sort((p, q) => (p.expectedDate < q.expectedDate ? 1 : -1))[0];
/** Change against the payment before it, ignored under 2% (the same rule as Subscriptions' price changes). */
export function change(e) {
  const p = prevOf(e);
  if (!p) return `<span class="dim">—</span>`;
  const d = e.amount - p.amount, pc = (d / p.amount) * 100;
  if (Math.abs(pc) < 2) return `<span class="dim">—</span>`;
  return `<span style="font-size:12px;font-weight:800;color:${d > 0 ? "var(--positive)" : "var(--negative)"};display:inline-flex;align-items:center;gap:3px">${d > 0 ? I.up(10) : I.down(10)}${inr(Math.abs(d))}</span><span class="sub2">${pc > 0 ? "+" : "−"}${Math.abs(pc).toFixed(0)}% on the one before</span>`;
}
const tagChip = (t) => `<span class="tag ${t.toLowerCase()}">${t}</span>`;
const srcCell = (e) => { const s = L.src(e.sourceId); return `<div class="cell-name">${mono(s, 34)}<div><b>${s.name}</b><small>${s.category} · ${s.frequency}${e.tag === "Bonus" && s.id === "salary" ? " · bonus" : ""}</small></div></div>`; };
const dateCell = (e) => `<div><b style="font-weight:700">${L.fmtDow(e.expectedDate).replace(/^\w+, /, (m) => m)}</b>${e.status === "Upcoming" ? `<span class="sub2">${L.inDays(e.expectedDate)}</span>` : e.status === "Pending" ? `<span class="sub2" style="color:var(--negative);font-weight:700">${L.delay(e)} days ago</span>` : ""}</div>`;
const amountCell = (e) => (e.status === "Upcoming" ? `<div><b style="font-weight:800">${inr(e.amount)}</b><span class="sub2">the usual amount</span></div>` : e.status === "Pending" ? `<div><b style="font-weight:800">${inr(e.amount)}</b><span class="sub2">expected</span></div>` : `<div style="font-weight:800">${inr(e.amount)}</div>`);
const recvCell = (e) => (e.receivedDate ? `<div><span style="font-weight:600">${fmt(e.receivedDate)}</span>${L.delay(e) > 0 ? `<span class="sub2">${L.delay(e)} day${L.delay(e) === 1 ? "" : "s"} after</span>` : `<span class="sub2">on the day</span>`}</div>` : `<span class="dim">—</span>`);
const action = (e, menu) => e.status === "Pending" ? `<span class="mini-btn ok">${I.check(11)} Mark received</span>` : e.status === "Upcoming" && L.daysBetween(L.TODAY, e.expectedDate) <= 3 ? `<span class="mini-btn ok">${I.check(11)} Mark received</span>` : e.status === "Upcoming" ? `<span></span>` : `<span style="position:relative;justify-self:end;display:inline-flex">${I.more(16)}${menu ? `<div class="menu"><span class="on">${I.pencil(13)} Edit entry</span><span>Open ${L.src(e.sourceId).alias}</span><span>Mark not received</span><span class="dng">${I.x ? "" : ""}Delete entry</span></div>` : ""}</span>`;
const COLS = "2.1fr 1.15fr 1fr 1.45fr 1.05fr 1.5fr .75fr 1.25fr 130px";
const heads = `<div class="erow" style="grid-template-columns:${COLS};padding:12px 0 8px"><span class="th">Source</span><span class="th">Expected on</span><span class="th">Amount</span><span class="th">Status</span><span class="th">Received on</span><span class="th">Landed in</span><span class="th">Tag</span><span class="th">Change</span><span></span></div>`;
const dataRow = (e, menu = false) => `<div class="erow" style="grid-template-columns:${COLS};position:relative${menu ? ";z-index:6" : ""}">${srcCell(e)}${dateCell(e)}${amountCell(e)}<div>${P.stateChip(e)}</div>${recvCell(e)}${L.acctChip(e.accountId)}<div>${tagChip(e.tag)}</div><div>${change(e)}</div><div style="justify-self:end">${action(e, menu)}</div></div>`;
const group = (title, right, rows) => `<div class="mgrp"><b>${title}</b><span>${right}</span></div>${rows}`;
const monthRows = (key) => L.ENTRIES.filter((e) => e.receivedDate && L.monthKey(e.receivedDate) === key).sort((p, q) => (p.receivedDate < q.receivedDate ? 1 : -1));

function toolbar() {
  return `<div class="toolbar">${L.seg([{ label: "All", count: 27, on: true }, { label: "Upcoming", count: 3 }, { label: "Pending", count: 1 }, { label: "Received", count: 23 }])}${L.select({ value: "All sources", kind: "small", options: [{ label: "All sources", on: true }] })}${L.select({ value: "Landed in: any", kind: "small", options: [{ label: "any", on: true }] })}${L.select({ value: "Tag: any", kind: "small", options: [{ label: "any", on: true }] })}<span style="flex:1"></span><span class="search">${I.search(14)} Search source or amount</span>${L.select({ value: "Newest first", kind: "small", options: [{ label: "Newest first", on: true }] })}</div>`;
}
const rcvSum = (key) => L.ENTRIES.filter((e) => e.receivedDate && L.monthKey(e.receivedDate) === key).reduce((t, e) => t + e.amount, 0);
const monthHead = (key) => { const n = monthRows(key).length; return [`${L.monFull(key)} ${key.slice(0, 4)}`, `${L.plural(n, "payment")} · ${inr(rcvSum(key))} received`]; };

export function e1() {
  const sum30 = L.NEXT_30.reduce((t, u) => t + u.amount, 0);
  const tiles = P.tiles([
    { k: "Next 30 days", v: inr(sum30), s: `${L.plural(L.NEXT_30.length, "payment")} · next ${L.src(L.UPCOMING[0].sourceId).alias} on ${fmt(L.UPCOMING[0].expectedDate)}`, feature: true, w: 340, h: 118 },
    { k: "Pending", v: inr(L.PENDING_SUM), s: `1 entry · Dividends, ${L.delay(L.PENDING[0])} days late`, vcls: "warn-v" },
    { k: "Received this year", v: inr(L.YTD), s: `${L.plural(L.received(2026).length, "payment")} · ${inr(L.AVG_MONTH)} a month` },
    { k: "On time", v: `${L.onTimeCount} <small>of ${L.rcv26.length}</small>`, s: `average ${L.avgDelay.toFixed(1)} days after expected` },
  ]).replace('class="v warn-v"', 'class="v" style="color:var(--warning-text)"');
  const soon = L.UPCOMING.filter((u) => L.daysBetween(L.TODAY, u.expectedDate) <= 29);
  const later = L.UPCOMING.filter((u) => L.daysBetween(L.TODAY, u.expectedDate) > 29 && u.expectedDate <= "2026-12-31");
  const body = `${group("Needs attention · pending", `${inr(L.PENDING_SUM)} not received`, L.PENDING.map((e) => dataRow(e)).join(""))}${group("Coming up · next 30 days", `${L.plural(soon.length, "payment")} · ${inr(sum30)} to come`, soon.map((e) => dataRow(e)).join(""))}<div class="row" style="gap:6px;padding:10px 0;color:var(--accent-text);font-weight:800;font-size:13px">${I.chev(12)} ${L.plural(later.length, "more")} later this year</div>${["2026-10", "2026-09", "2026-08", "2026-07"].map((k) => { const [t, r] = monthHead(k); return group(t, r, monthRows(k).map((e, i) => dataRow(e, k === "2026-10" && e.sourceId === "fd")).join("")); }).join("")}`;
  const list = card(`${toolbar()}<div>${heads}${body}</div><div class="pager"><span>Showing 14 of 27 entries in 2026. Upcoming ones come from each source's schedule, at its usual amount; nothing is saved until one is received. <b style="color:var(--fg)">Change</b> compares a payment with the one before it.</span><span class="pgb"><i>${I.chevL(12)}</i>Page 1 of 2<i>${I.chevR(12)}</i></span></div>`, { gap: 12 });
  return page(`${header(LEDE)}${tiles}${list}`);
}

// ---------------------------------------------------------- E2 · Pay grid
function grid() {
  const cols = "170px repeat(12, minmax(0, 1fr)) 120px";
  const heads = `<span></span>${L.YEAR.map((k) => `<span class="mh${k === L.NOW_KEY ? " now" : ""}">${L.monName(k)}</span>`).join("")}<span class="mh" style="text-align:right">2026 so far</span>`;
  const sel = { s: "rsu", k: "2026-08" };
  const rows = L.SOURCES.map((s) => {
    const cells = L.YEAR.map((k) => {
      const es = L.monthEntries(k).filter((e) => e.sourceId === s.id);
      if (!es.length) return `<div class="mc none">–</div>`;
      const tot = es.reduce((t, e) => t + e.amount, 0), e0 = es[0], st = e0.status === "Upcoming" ? "soon" : es.some((e) => e.status === "Pending") ? "pend" : es.some((e) => L.stateOf(e) === "Late") ? "late" : "";
      const isSel = s.id === sel.s && k === sel.k;
      const bg = st === "soon" || st === "pend" ? "" : `background:${L.fill(s, 160)};color:var(--on-card)`;
      const small = es.length > 1 ? `<small>${es.length} payments</small>` : st === "pend" ? `<small>pending</small>` : st === "soon" ? `<small>${fmt(e0.expectedDate)}</small>` : `<small>${fmt(e0.receivedDate)}</small>`;
      const tipc = hc({ h: `${s.alias} · ${L.monYear(k)}`, t: inr(tot), d: es.length > 1 ? `${es.length} payments` : P.stateChip(e0).replace(/<[^>]+>/g, ""), rows: es.map((e) => [`${e.tag === "Bonus" ? "Bonus · " : ""}${e.receivedDate ? `landed ${fmt(e.receivedDate)}` : `expected ${fmt(e.expectedDate)}`}`, inr(e.amount), col(s)]), w: 240 });
      return `<div class="mc hov ${st}${isSel ? " sel" : ""} ${st ? "" : "rt"}" style="--c:${col(s)};${bg}" tabindex="0">${inrS(tot)}${small}${tip(tipc, { w: 240, x: "c", y: "up" })}</div>`;
    }).join("");
    return `<div class="rl">${mono(s, 32)}<span><b>${s.alias}</b><small>${s.frequency}</small></span></div>${cells}<div class="rt2">${inr(L.ytdOf(s.id))}</div>`;
  }).join("");
  const totals = `<div class="rl" style="padding-top:6px;border-top:1px solid var(--divider)"><b>All sources</b></div>${L.YEAR.map((k, i) => `<div style="padding-top:6px;border-top:1px solid var(--divider);text-align:center;font-weight:800;font-size:12px;${k > L.NOW_KEY ? "color:var(--muted)" : ""}">${k > L.NOW_KEY ? inrS(L.monthEntries(k).reduce((t, e) => t + e.amount, 0)) : inrS(L.MONTHLY[i])}</div>`).join("")}<div class="rt2" style="padding-top:6px;border-top:1px solid var(--divider)">${inr(L.YTD)}</div>`;
  return `<div class="mx" style="grid-template-columns:${cols}">${heads}${rows}${totals}</div>`;
}
export function e2() {
  const tiles = `<div class="tiles" style="grid-template-columns:repeat(3,1fr)">${P.tile({ k: "Landed this month", v: inr(L.monthReceived("2026-10")), s: "Salary and FD interest · October", feature: true, w: 460, h: 118 })}${P.tile({ k: "Pending", v: inr(L.PENDING_SUM), s: "Dividends · 14 days late" }).replace('class="v "', 'class="v" style="color:var(--warning-text)"')}${P.tile({ k: "Still to come in 2026", v: inr(L.UPCOMING.filter((u) => u.expectedDate <= "2026-12-31").reduce((t, u) => t + u.amount, 0)), s: "3 payments · Nov 1, Nov 15, Dec 1" })}</div>`;
  const g = card(`${cardHead("Pay grid", "every source by month · the amount that landed, the day on its second line · hover a cell", `${L.seg([{ label: "Amount", on: true }, { label: "Days late" }, { label: "Count" }])}`)}${grid()}<div class="row" style="gap:18px;flex-wrap:wrap"><span class="lg"><i style="background:var(--card-sapphire)"></i>Landed</span><span class="lg"><i style="background:var(--card-sapphire);box-shadow:0 0 0 2px var(--surface),0 0 0 3.5px oklch(0.72 0.14 75)"></i>Landed more than 3 days late</span><span class="lg"><i class="hat"></i>Pending</span><span class="lg"><i class="dash"></i>Expected</span><span class="lg"><i style="background:var(--heat-no-data)"></i>Nothing due</span></div>`, { gap: 18 });
  const sel = L.ENTRIES.find((e) => e.sourceId === "rsu" && e.expectedDate === "2026-08-15"), s = L.src("rsu");
  const detail = card(`<div class="between"><div class="row" style="gap:12px">${mono(s, 40)}<div><div class="card-t">${s.name} · Aug 2026</div><div class="card-note">the picked cell · Aug 15 vest</div></div></div>${P.stateChip(sel)}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:18px 24px"><div class="hfig"><span class="k">Amount</span><span class="v">${inr(sel.amount)}</span><span class="s">${change(sel).replace(/<[^>]+>/g, " ").trim()}</span></div><div class="hfig"><span class="k">Expected</span><span class="v">${fmt(sel.expectedDate)}</span><span class="s">${L.dow(sel.expectedDate)}</span></div><div class="hfig"><span class="k">Landed</span><span class="v">${fmt(sel.receivedDate)}</span><span class="s">${L.delay(sel)} days after</span></div><div class="hfig"><span class="k">Into</span><span class="v" style="font-size:16px">${L.ACCOUNTS[sel.accountId].name}</span><span class="s">${sel.tag} pay</span></div></div><div style="border-top:1px solid var(--divider);padding-top:12px"><div class="th" style="margin-bottom:6px">Every RSU vest this year</div>${[...L.ENTRIES.filter((e) => e.sourceId === "rsu" && e.expectedDate.startsWith("2026")), L.UPCOMING.find((u) => u.sourceId === "rsu")].map((e) => `<div class="between" style="padding:6px 0;font-size:12.5px;font-weight:600"><span>${L.fmt(e.expectedDate)}${e.receivedDate ? ` · landed ${L.fmt(e.receivedDate)}` : " · expected"}</span><b style="${e.status === "Upcoming" ? "color:var(--muted)" : ""}">${inr(e.amount)}</b></div>`).join("")}</div><div class="foot row" style="gap:8px">${btn("Edit entry", { kind: "soft", icon: I.pencil(12), cls: "btn-sm" })}${btn("Open RSUs", { kind: "soft", cls: "btn-sm" })}</div>`, { gap: 18 });
  const recent = card(`${cardHead("Latest entries", "newest first", btn("All entries", { kind: "soft", cls: "btn-sm" }))}<div>${[...L.PENDING, ...monthRows("2026-10"), ...monthRows("2026-09"), ...monthRows("2026-08")].slice(0, 7).map((e) => `<div class="erow" style="grid-template-columns:2fr 1fr 1fr 1.4fr"><div class="cell-name">${mono(L.src(e.sourceId), 30)}<div><b>${L.src(e.sourceId).alias}</b><small>${e.receivedDate ? `landed ${fmt(e.receivedDate)}` : `expected ${fmt(e.expectedDate)}`}</small></div></div><div style="font-weight:800">${inr(e.amount)}</div>${L.acctChip(e.accountId)}<div style="justify-self:end">${P.stateChip(e)}</div></div>`).join("")}</div>`, { gap: 8 });
  return page(`${header(LEDE)}${tiles}${g}<div style="display:grid;grid-template-columns:1fr 1.5fr;gap:20px;align-items:stretch">${detail}${recent}</div>`);
}

// ---------------------------------------------------------- E3 · Passbook
export function e3() {
  const pick = L.src("salary"), es = L.ENTRIES.filter((e) => e.sourceId === pick.id && L.cashDate(e) >= "2026-01-01").sort((p, q) => (L.cashDate(p) < L.cashDate(q) ? 1 : -1));
  const ups = L.UPCOMING.filter((u) => u.sourceId === pick.id && u.expectedDate <= "2027-01-31").sort((p, q) => (p.expectedDate < q.expectedDate ? 1 : -1));
  const rail = `<section class="card glass" style="padding:14px;gap:10px;flex:1"><div class="between" style="padding:4px 8px 0"><b style="font-size:13px">Sources</b>${btn("Add", { kind: "soft", icon: I.plus(11), cls: "btn-xs" })}</div><div class="srcpick" style="flex:1;justify-content:space-between">${[{ id: "all" }, ...L.SOURCES].map((s) => s.id === "all" ? `<div class="sp"><span>${L.allMono(34)}</span><span><b>All sources</b><small>${L.received(2026).length + 1} entries · ${inr(L.YTD)}</small></span></div>` : `<div class="sp${s.id === pick.id ? " on" : ""}" style="--c:${col(s)};${s.status === "Inactive" ? "opacity:.6" : ""}">${mono(s, 34)}<span style="min-width:0"><b>${s.alias}</b><small>${s.frequency} · ${inr(L.ytdOf(s.id))}</small></span></div>`).join("")}</div></section>`;
  const changes = card(`${cardHead("Pay changes", "salary only")}<div style="display:flex;flex-direction:column;gap:12px"><div class="between"><span><b style="font-size:13px">Apr 2026</b><span class="sub2">₹1,25,000 → ₹1,38,500</span></span><b style="color:var(--positive)">+10.8%</b></div><div class="between"><span><b style="font-size:13px">Apr 2025</b><span class="sub2">₹1,12,000 → ₹1,25,000</span></span><b style="color:var(--positive)">+11.6%</b></div></div><div class="card-note">A payment 2% or more off the one before is a change, the same rule as Subscriptions' price changes.</div>`, { gap: 14 });
  const mo = L.monthlyOf(pick.id), mx = Math.max(...mo);
  const bars = L.YEAR.map((k, i) => `<div class="mcol" style="gap:6px"><div style="flex:1"></div><div class="mval${mo[i] ? "" : " muted"}">${mo[i] ? inrS(mo[i]) : k > L.NOW_KEY ? inrS(pick.expectedAmount) : ""}</div><div class="mseg ${mo[i] ? "rt" : "ghost"}" style="--c:${col(pick)};height:${(mo[i] || (k > L.NOW_KEY ? pick.expectedAmount : 0)) / mx * 110}px;${mo[i] ? `background:${L.fill(pick, 180)}` : ""}"></div><div class="mlab${k === L.NOW_KEY ? " now" : ""}">${L.monName(k)}</div></div>`).join("");
  const nx = L.nextOf(pick.id);
  const head = `<section class="card glass" style="gap:18px"><div class="between" style="align-items:flex-start"><div class="row" style="gap:14px">${mono(pick, 52)}<div><div style="font-size:22px;font-weight:800">${pick.name}</div><div class="card-note">${pick.category} · ${pick.frequency} · since ${pick.since} · lands in ${L.ACCOUNTS[pick.acct].name}</div></div></div><span class="row" style="gap:8px">${btn("Edit source", { kind: "soft", icon: I.pencil(12), cls: "btn-sm" })}${btn("Record income", { kind: "primary", icon: I.plus(12), cls: "btn-sm" })}</span></div><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:20px"><div class="hfig"><span class="k">Received 2026</span><span class="v">${inr(L.ytdOf(pick.id))}</span><span class="s">${L.plural(L.received(2026, pick.id).length, "payment")}</span></div><div class="hfig"><span class="k">Usual amount</span><span class="v">${inr(pick.expectedAmount)}</span><span class="s">a month</span></div><div class="hfig"><span class="k">Last raise</span><span class="v" style="color:var(--positive)">+₹13,500</span><span class="s">from Apr 1 · up 10.8%</span></div><div class="hfig"><span class="k">Next</span><span class="v">${fmt(nx.expectedDate)}</span><span class="s">${L.inDays(nx.expectedDate)}</span></div><div class="hfig"><span class="k">On time</span><span class="v">11 <small style="font-size:13px;color:var(--muted)">of 11</small></span><span class="s">average 1.2 days after</span></div></div><div class="mb" style="height:196px;gap:12px;padding-left:0">${bars}</div></section>`;
  const items = [...ups.map((e) => ({ e, soon: true })), ...es.map((e) => ({ e }))].slice(0, 9).map(({ e, soon }) => { const st = soon ? "soon" : L.stateOf(e) === "Pending" ? "pend" : ""; const dd = soon ? e.expectedDate : L.cashDate(e); return `<div class="it ${st}" style="--c:${col(pick)}"><div><div class="row" style="gap:10px"><b style="font-size:13.5px;width:70px">${fmt(dd)}${dd.startsWith("2027") ? "<small style=\"font-weight:600;color:var(--muted)\">, 2027</small>" : ""}</b><span style="font-size:13px;font-weight:700">${e.tag === "Bonus" ? "Bonus" : `${L.monFull(L.monthKey(e.expectedDate))} salary`}</span>${e.tag === "Bonus" ? tagChip("Bonus") : ""}${P.stateChip(soon ? { ...e, status: "Upcoming" } : e)}</div><div class="card-note" style="margin:3px 0 0 80px">${soon ? "the usual amount" : e.receivedDate ? `expected ${fmt(e.expectedDate)}${L.delay(e) > 0 ? ` · ${L.delay(e)} day${L.delay(e) === 1 ? "" : "s"} after` : " · on the day"} · into ${L.ACCOUNTS[e.accountId].name}` : "not received"}</div></div><div style="text-align:right"><b style="font-size:15px;${soon ? "color:var(--muted)" : ""}">${inr(e.amount)}</b><div style="font-size:11.5px;margin-top:2px">${soon ? "" : change(e).replace('class="sub2"', 'class="sub2" style="display:inline;margin-left:6px"')}</div></div></div>`; }).join("");
  const tl = card(`${cardHead("Every payment", `${pick.alias} · newest first · 2026 and what's next`, L.seg([{ label: "Timeline", on: true }, { label: "Table" }]))}<div class="tl">${items}</div><div class="pager"><span>Showing 9 of 25 entries since Jan 2025</span><span class="pgb"><i>${I.chevL(12)}</i>Page 1 of 3<i>${I.chevR(12)}</i></span></div>`, { gap: 6 });
  return page(`${header(LEDE)}<div style="display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:stretch"><div style="display:flex;flex-direction:column;gap:20px;align-self:stretch">${rail}${changes}</div><div style="display:flex;flex-direction:column;gap:20px;min-width:0">${head}${tl}</div></div>`);
}
