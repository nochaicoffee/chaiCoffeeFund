// Round 17 (2026-10-23): the Balance history page (/accounts/history), the Accounts counterpart of Cards' Statements page and
// Subscriptions' Renewals page. Three directions, each on desktop and a phone: H1 Ledger (Renewals' layout: summary tiles, filters,
// month groups), H2 Check-in grid (account by month, then the rows), H3 Passbook (one account's running balance, the others on the left).
// All CSS, no script; one state of each is drawn. Sample data, made up; "today" is Oct 21, 2026.
import * as L from "./lib.mjs";
import * as R from "./r11.mjs";

const YEAR_START = "2026-01-01";

/** Every recorded balance with the one before it, newest first. */
function entries({ from = YEAR_START, id = null } = {}) {
  const out = [];
  for (const a of L.ACCOUNTS) {
    if (id && a.id !== id) continue;
    const s = L.snapsOf(a.id);
    s.forEach((x, i) => {
      if (x.date < from) return;
      const p = s[i - 1] ?? null;
      out.push({ a, date: x.date, bal: x.balance, prev: p ? p.balance : null, delta: p ? x.balance - p.balance : null, gap: p ? L.daysBetween(p.date, x.date) : null, closing: !L.isOn(a) && x.balance === 0, first: !p });
    });
  }
  return out.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : x.a.name < y.a.name ? -1 : 1));
}
const ALL = entries();
const byMonth = (list) => {
  const m = new Map();
  for (const e of list) (m.get(e.date.slice(0, 7)) ?? m.set(e.date.slice(0, 7), []).get(e.date.slice(0, 7))).push(e);
  return [...m.entries()];
};
const ups = ALL.filter((e) => e.delta > 0).length, downs = ALL.filter((e) => e.delta < 0).length;
const biggest = ALL.filter((e) => e.delta != null).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))[0];
const avgGap = Math.round(ALL.filter((e) => e.gap != null).reduce((t, e) => t + e.gap, 0) / ALL.filter((e) => e.gap != null).length);
const staleNames = L.STALE.map((a) => a.name);

const CSS = `<style>
.hx-tile { display: flex; flex-direction: column; gap: 6px; border-radius: 22px; padding: 18px 20px; min-width: 0; }
.hx-row { display: grid; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--divider); }
.hx-row:last-child { border-bottom: 0; }
.hx-amt { text-align: right; font-weight: 800; font-size: 14px; }
.hx-gap { font-size: 11px; color: var(--muted); font-weight: 600; }
.hx-th { display: grid; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--divider); }
.hx-menu { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); }
.hx-menu.open { background: var(--fill); color: var(--fg); }
.hx-pop { position: absolute; right: 0; top: 32px; z-index: 5; width: 168px; border-radius: 14px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--pop-shadow); padding: 6px; font-size: 12px; font-weight: 700; }
.hx-pop div { padding: 8px 10px; border-radius: 9px; }
.hx-pop div.neg { color: var(--negative); }
.hx-pop div:first-child { background: var(--fill); }
.hx-cell { height: 46px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; font-size: 10px; font-weight: 800; position: relative; isolation: isolate; }
.hx-cell small { font-size: 9px; font-weight: 700; opacity: 0.75; }
.hx-cell.gap { background: repeating-linear-gradient(135deg, var(--fill-strong) 0 5px, transparent 5px 10px); color: var(--muted); }
.hx-cell.none { background: var(--fill); color: var(--muted); }
.hx-cell.on { box-shadow: 0 0 0 2.5px var(--surface), 0 0 0 5px var(--ink); }
.hx-search { white-space: nowrap; overflow: hidden; display: flex; align-items: center; gap: 8px; height: 40px; border-radius: 999px; padding: 0 14px; background: var(--fill); color: var(--muted); font-size: 13px; font-weight: 600; min-width: 240px; }
.hx-pager { display: flex; align-items: center; justify-content: space-between; padding-top: 14px; font-size: 12px; font-weight: 700; color: var(--muted); }
.hx-pg { display: inline-flex; gap: 4px; }
.hx-pg i { font-style: normal; min-width: 30px; height: 30px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; }
.hx-pg i.on { background: var(--ink); color: var(--on-ink); }
.hx-spark { display: block; width: 100%; }
</style>`;

const money = L.inr;
const up = (n) => (n == null ? `<span class="hx-gap">First balance</span>` : n === 0 ? `<span class="hx-gap">No change</span>` : `<span class="chg ${n > 0 ? "chg-down" : "chg-up"}" style="${n > 0 ? "color:var(--positive)" : "color:var(--negative)"}">${n > 0 ? L.I.up(10) : L.I.down(10)}${money(Math.abs(n))}</span>`);
const rowPills = (e) => [e.closing ? `<span class="pill pill-off">${L.I.lock(10)} Closing balance</span>` : "", e.first && !e.closing ? `<span class="pill pill-on">First balance</span>` : ""].filter(Boolean).join(" ");
const sparkOf = (id, w = 560, h = 70) => {
  const s = L.snapsOf(id).filter((x) => x.date >= "2025-11-01");
  const lo = Math.min(...s.map((x) => x.balance)), hi = Math.max(...s.map((x) => x.balance));
  const t0 = Date.parse(s[0].date), t1 = Date.parse(s.at(-1).date);
  const pts = s.map((x) => [((Date.parse(x.date) - t0) / (t1 - t0)) * w, 8 + (hi === lo ? 0.5 : 1 - (x.balance - lo) / (hi - lo)) * (h - 16)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return `<svg class="hx-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" height="${h}"><path d="${d} L${w} ${h} L0 ${h} Z" fill="var(--card-${L.acc(id).color})" fill-opacity="0.12"/><path d="${d}" fill="none" stroke="var(--card-${L.acc(id).color})" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="var(--surface)" stroke="var(--card-${L.acc(id).color})" stroke-width="2"/>`).join("")}</svg>`;
};

const back = `<span class="row" style="gap:6px">${L.I.chevL(11)} Bank accounts · Balance history</span>`;
const headerFor = (ph = false, lede = null) =>
  L.header({
    eyebrow: back,
    title: "Balance history",
    lede: lede ?? `Every balance you've recorded: <b>${ALL.length} in 2026</b> across ${L.ACCOUNTS.length} accounts. <b>${ups}</b> went up, <b>${downs}</b> went down, and <b>${staleNames.join(", ")}</b> hasn't been updated in over 30 days.`,
    actions: ph ? `${L.periodPill()}${L.btn("Update balances", { kind: "primary", icon: L.I.plus(14) })}` : `${L.periodPill()}${L.iconBtn(L.I.refresh(15), "Refresh")}${L.btn("Update balances", { kind: "primary", icon: L.I.plus(14) })}`,
    phone: ph,
  });

// ---------- H1 · Ledger (Renewals' layout) ----------
function tiles(ph = false) {
  const t = (k, v, s, cls = "glass", extra = "", rt = false) => `<div class="hx-tile ${cls}${rt ? " rt-i" : ""}" style="${extra}"><span class="k" style="font-size:12px;font-weight:600;color:${cls.includes("feature") ? "oklch(0.38 0.06 152)" : "var(--muted)"}">${k}</span><span style="font-size:${ph ? 22 : 28}px;font-weight:800;letter-spacing:-0.01em;line-height:1.2">${v}</span><span style="font-size:12px;color:${cls.includes("feature") ? "oklch(0.38 0.06 152)" : "var(--muted)"};font-weight:500">${s}</span></div>`;
  return `<div style="display:grid;grid-template-columns:repeat(${ph ? 2 : 4},minmax(0,1fr));gap:${ph ? 10 : 16}px">${[
    t("Recorded this year", `${ALL.length}`, `${ups} up · ${downs} down · ${ALL.length - ups - downs} first or flat`, "feature", "border:1px solid var(--feature-tile-line);background:var(--feature-tile)", true),
    t("Biggest move", `<span style="color:${biggest.delta > 0 ? "var(--positive)" : "var(--negative)"}">${L.signed(biggest.delta)}</span>`, `${biggest.a.name} · ${L.fmt(biggest.date)}`),
    t("Not read lately", `<span style="color:var(--warning-text)">${staleNames.length}</span> <small style="font-size:14px;color:var(--muted)">account</small>`, `${staleNames[0]} · last read ${L.fmt(L.latest(L.STALE[0].id).date)}`),
    t("Between readings", `${avgGap} <small style="font-size:14px;color:var(--muted)">days</small>`, "On average, across all accounts"),
  ].join("")}</div>`;
}
function ledgerRow(e, { menu = false, ph = false } = {}) {
  const left = `<span class="cell-name">${L.mono(e.a, ph ? 34 : 38)}<span style="min-width:0"><b>${e.a.name}</b><small>${L.fmtDow(e.date)}${e.gap != null ? ` · ${e.gap} days after the one before` : ""}</small></span></span>`;
  const right = `<span style="text-align:right;position:relative"><span class="hx-amt" style="display:block">${money(e.bal)}</span>${up(e.delta)}</span>`;
  if (ph) return `<div class="hx-row" style="grid-template-columns:1fr auto">${left}${right}</div>`;
  return `<div class="hx-row" style="grid-template-columns:minmax(0,1fr) auto 150px 40px">${left}<span>${rowPills(e)}</span>${right}<span style="position:relative;text-align:right"><span class="hx-menu${menu ? " open" : ""}">${L.I.more(16)}</span>${menu ? `<div class="hx-pop"><div>Edit balance</div><div>Update ${e.a.name.split(" ")[0]}</div><div class="neg">Delete balance</div></div>` : ""}</span></div>`;
}
function monthGroup([key, list], { ph = false, menuAt = null } = {}) {
  const net = list.reduce((t, e) => t + (e.delta ?? 0), 0);
  return `<div><div class="tgroup"><b>${L.monFull(key)} ${key.slice(0, 4)}</b><span>${list.length} ${list.length === 1 ? "balance" : "balances"} · net ${L.signed(net)}</span></div>${list.map((e, i) => ledgerRow(e, { ph, menu: menuAt === `${key}:${i}` })).join("")}</div>`;
}
const filters = (ph = false) => `<div style="display:flex;flex-direction:column;gap:10px"><div class="row" style="flex-wrap:wrap;gap:10px">${L.seg([{ label: "All", count: ALL.length, on: true }, { label: "Rises", count: ups }, { label: "Falls", count: downs }, { label: ph ? "First" : "First &amp; closing", count: ALL.filter((e) => e.first || e.closing).length }])}${ph ? "" : L.select({ value: "All accounts", kind: "pill", options: [{ label: "All accounts", on: true }, ...L.ACCOUNTS.map((a) => ({ label: a.name }))] })}${ph ? "" : L.select({ value: "Any purpose", kind: "pill", options: [{ label: "Any purpose", on: true }, ...L.PURPOSES.map((p) => ({ label: L.purposeName(p) }))] })}</div><div class="row" style="flex-wrap:wrap;gap:10px"><span class="hx-search" style="${ph ? "min-width:0;flex:1 1 100%" : ""}">${L.I.search(14)} ${ph ? "Search account or amount" : "Search account or amount"}</span>${ph ? L.select({ value: "All accounts", kind: "pill", options: [{ label: "All accounts", on: true }] }) : ""}${L.select({ value: "Newest first", kind: "pill", options: [{ label: "Newest first", on: true }, { label: "Oldest first" }, { label: "Biggest change" }] })}</div></div>`;
function h1Board(ph = false) {
  const groups = byMonth(ALL);
  const list = `<section class="card glass" style="gap:14px${ph ? ";padding:16px" : ""}">${filters(ph)}${groups.slice(0, ph ? 2 : 3).map((g, i) => monthGroup(g, { ph, menuAt: !ph && i === 0 ? `${g[0]}:1` : null })).join("")}<div class="hx-pager"><span>Showing ${ph ? "1–6" : "1–12"} of ${ALL.length}</span><span class="hx-pg"><i class="on">1</i><i>2</i><i>3</i><i>${L.I.chevR(11)}</i></span></div></section>`;
  const note = `<span class="sample" style="align-self:flex-start">Sample data, made up</span>`;
  return `${CSS}${R.RT}${headerFor(ph)}${note}${tiles(ph)}${list}`;
}

// ---------- H2 · Check-in grid ----------
const MONTHS = L.YEAR;
function cell(a, key, { on = false } = {}) {
  const e = ALL.filter((x) => x.a.id === a.id && x.date.slice(0, 7) === key).at(-1);
  if (!e) {
    const before = L.snapsOf(a.id)[0];
    if (!before || before.date.slice(0, 7) > key || (!L.isOn(a) && L.latest(a.id).date.slice(0, 7) < key)) return `<div class="hx-cell none">–</div>`;
    return `<div class="hx-cell gap" title="Not read"><span>missed</span></div>`;
  }
  const d = e.delta;
  const bg = e.closing ? "var(--fill-strong)" : d == null ? "var(--heat-2)" : d > 0 ? (d > 20000 ? "var(--heat-4)" : "var(--heat-3)") : "var(--negative-tint)";
  const fg = e.closing ? "var(--muted)" : d != null && d > 20000 ? "var(--on-accent)" : d != null && d < 0 ? "var(--negative)" : "var(--heat-ink)";
  return `<div class="hx-cell${d != null && d < 0 || e.closing ? "" : " rt-i"}${on ? " on" : ""}" style="background:${bg};color:${fg}"><span>${Number(e.date.slice(8, 10))} ${L.monName(key)}</span><small>${d == null ? "first" : e.closing ? "closed" : `${d > 0 ? "+" : "−"}${L.inrS(Math.abs(d))}`}</small></div>`;
}
function h2Board(ph = false) {
  const live = L.ACCOUNTS;
  const months = ph ? MONTHS.slice(-5) : MONTHS;
  const grid = `<section class="card glass" style="gap:14px${ph ? ";padding:16px" : ""}"><div class="card-h"><span class="card-t">Check-in grid<small>the day each balance was read, and how far it moved</small></span><span class="row" style="gap:10px;font-size:11px;font-weight:700;color:var(--muted)"><span class="row" style="gap:5px"><i style="width:12px;height:12px;border-radius:4px;background:var(--heat-3)"></i>Up</span><span class="row" style="gap:5px"><i style="width:12px;height:12px;border-radius:4px;background:var(--negative-tint)"></i>Down</span><span class="row" style="gap:5px"><i style="width:12px;height:12px;border-radius:4px;background:repeating-linear-gradient(135deg,var(--fill-strong) 0 3px,transparent 3px 6px)"></i>Missed</span></span></div><div style="display:grid;grid-template-columns:${ph ? 100 : 160}px repeat(${months.length},minmax(0,1fr));gap:6px;align-items:center"><span></span>${months.map((k) => `<span class="th" style="text-align:center">${L.monName(k)}</span>`).join("")}${live.map((a) => `<span class="cell-name" style="min-width:0">${L.mono(a, ph ? 24 : 28)}<span style="min-width:0"><b style="${ph ? "font-size:11px" : ""}">${a.name}</b></span></span>${months.map((k) => cell(a, k, { on: a.id === "sbi" && k === "2026-08" })).join("")}`).join("")}</div></section>`;
  const sel = ALL.filter((e) => e.a.id === "sbi").slice(0, 4);
  const rows = `<section class="card glass" style="gap:6px${ph ? ";padding:16px" : ""}"><div class="card-h"><span class="card-t">SBI Rainy Day<small>picked in the grid · ${sel.length} readings</small></span><span class="chip on">Clear pick ${L.I.x(10)}</span></div>${filters(ph)}${sel.map((e) => ledgerRow(e, { ph })).join("")}</section>`;
  return `${CSS}${R.RT}${headerFor(ph, `Which accounts were read when. <b>${staleNames.join(", ")}</b> missed September and October; click a cell to list just that reading, an account's row, or a month's column.`)}<span class="sample" style="align-self:flex-start">Sample data, made up</span>${grid}${rows}`;
}

// ---------- H3 · Passbook ----------
function h3Board(ph = false) {
  const picked = L.acc("hdfc");
  const rows = entries({ id: picked.id }).slice(0, ph ? 6 : 10);
  const rail = `<aside class="card glass" style="gap:8px;padding:14px;${ph ? "" : "width:268px;flex-shrink:0"}"><div class="th" style="padding:4px 8px">Accounts</div>${L.ACCOUNTS.map((a) => `<div class="row" style="gap:10px;padding:9px 8px;border-radius:14px;${a.id === picked.id ? `background:color-mix(in oklch, var(--card-${a.color}) 14%, transparent);box-shadow:inset 3px 0 0 var(--card-${a.color})` : ""}">${L.mono(a, 30)}<span class="grow"><b style="display:block;font-size:13px">${a.name}</b><span class="hx-gap">${L.isOn(a) ? `${L.snapsOf(a.id).filter((s) => s.date >= YEAR_START).length} readings · ${L.fmt(L.latest(a.id).date)}` : "Closed"}</span></span>${L.isStale(a) ? `<span class="pill pill-stale" style="padding:2px 7px">${L.I.clock(9)}</span>` : ""}</div>`).join("")}</aside>`;
  const th = `grid-template-columns:110px minmax(0,1fr) 120px 120px 110px 34px`;
  const table = ph
    ? rows.map((e) => `<div class="hx-row" style="grid-template-columns:1fr auto"><span><b style="display:block;font-size:13px">${L.fmtY(e.date)}</b><span class="hx-gap">${e.gap != null ? `${e.gap} days after` : "First balance"}</span></span><span style="text-align:right"><span class="hx-amt" style="display:block">${money(e.bal)}</span>${up(e.delta)}</span></div>`).join("")
    : `<div class="hx-th th" style="${th}"><span>Date</span><span>Note</span><span style="text-align:right">Change</span><span style="text-align:right">Balance</span><span style="text-align:right">Gap</span><span></span></div>${rows.map((e, i) => `<div class="hx-row" style="${th}"><b style="font-size:13px">${L.fmtY(e.date)}</b><span class="hx-gap">${L.fmtDow(e.date)}${e.first ? " · opened" : ""}</span><span style="text-align:right">${up(e.delta)}</span><span class="hx-amt">${money(e.bal)}</span><span class="hx-gap" style="text-align:right">${e.gap != null ? `${e.gap} days` : "–"}</span><span class="hx-menu${i === 1 ? " open" : ""}" style="position:relative">${L.I.more(16)}${i === 1 ? `<div class="hx-pop"><div>Edit balance</div><div class="neg">Delete balance</div></div>` : ""}</span></div>`).join("")}`;
  const page = `<section class="card glass textured" style="gap:12px;min-width:0;flex:1;${ph ? "padding:16px" : ""}">${L.rings(900, 520, { opacity: 0.035 })}<div class="card-h"><span class="row" style="gap:12px">${L.mono(picked, 40)}<span><span class="card-t" style="display:block">${picked.name}</span><span class="hx-gap">${picked.bank} · •••• 4821 · opened ${L.fmtY(picked.startDate)}</span></span></span><span class="row" style="gap:8px">${L.btn("Update balance", { kind: "soft", cls: "btn-sm" })}${L.btn("Edit", { kind: "soft", cls: "btn-sm" })}</span></div>${sparkOf(picked.id, 560, ph ? 56 : 80)}<div class="between" style="font-size:12px;color:var(--muted);font-weight:600"><span>Nov 2025</span><span>${L.monYear("2026-10")}</span></div><div class="between" style="gap:10px;flex-wrap:wrap"><span class="row" style="gap:10px">${L.seg([{ label: "Readings", count: rows.length, on: true }, { label: "Month ends" }])}</span><span class="hx-search" style="min-width:0;${ph ? "flex:1" : ""}">${L.I.search(14)} ${ph ? "Search" : "Search a date or amount"}</span></div>${table}<div class="hx-pager"><span>Showing ${rows.length} of ${entries({ id: picked.id, from: "2000-01-01" }).length}</span><span class="hx-pg"><i class="on">1</i><i>2</i><i>${L.I.chevR(11)}</i></span></div></section>`;
  const lede = `One account's passbook: <b>${picked.name}</b> read <b>${rows.length}</b> times this year, from ${money(rows.at(-1).bal)} to ${money(rows[0].bal)}. Pick another account ${ph ? "above" : "on the left"}.`;
  return `${CSS}${R.RT}${headerFor(ph, lede)}<span class="sample" style="align-self:flex-start">Sample data, made up</span>${ph ? `<div class="row" style="gap:8px;overflow:hidden">${L.ACCOUNTS.slice(0, 4).map((a) => `<span class="chip${a.id === picked.id ? " on" : ""}"><i style="background:var(--card-${a.color})"></i>${a.name.split(" ")[0]}</span>`).join("")}</div>${page}` : `<div style="display:flex;gap:20px;align-items:flex-start">${rail}${page}</div>`}`;
}

const desk = (render) => () => L.desktop({ h: "auto", body: `${render(false)}<div aria-hidden="true" style="height:40px;flex-shrink:0"></div>` });
const phoneOf = (render) => () => `<div class="chai-app ph" style="width:390px;height:auto;padding-bottom:16px"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${L.I.menu()}</span></header><div class="ph-body" style="padding-bottom:12px">${render(true)}</div></div>`;

export const R17_DESKTOPS = [
  { file: "AccountsHistoryH1.dc.html", w: 1600, render: desk(h1Board) },
  { file: "AccountsHistoryH1Phone.dc.html", w: 390, render: phoneOf(h1Board) },
  { file: "AccountsHistoryH2.dc.html", w: 1600, render: desk(h2Board) },
  { file: "AccountsHistoryH2Phone.dc.html", w: 390, render: phoneOf(h2Board) },
  { file: "AccountsHistoryH3.dc.html", w: 1600, render: desk(h3Board) },
  { file: "AccountsHistoryH3Phone.dc.html", w: 390, render: phoneOf(h3Board) },
];
