// The widget library for Income's boards: hover cards, the greeting, month columns, sources, coming up,
// where it lands, pay rhythm, this year vs last, the mix, the pay calendar. Static HTML/SVG; the switches and
// picks are CSS only (radios + :has()), like the Accounts and Subscriptions boards.
import * as L from "./lib.mjs";
const { I, inr, inrS, signed, fmt, fmtDow, esc, btn, mono, col, grad } = L;

// ---------- Hover cards (the app's light .hc), and where they open from ----------
export const hc = ({ h, hr = "", t = "", d = "", rows = [], f = "", w = 250 }) =>
  `<div class="hc" style="width:${w}px"><div class="h"><span>${h}</span>${hr}</div>${t ? `<div class="t">${t}</div>` : ""}${d ? `<div class="d">${d}</div>` : ""}${rows.length ? `<ul>${rows.map(([nm, v, c]) => `<li>${c ? `<i style="width:8px;height:8px;border-radius:3px;background:${c};flex-shrink:0"></i>` : ""}<span class="nm">${nm}</span><b>${v}</b></li>`).join("")}</ul>` : ""}${f ? `<div class="f">${f}</div>` : ""}</div>`;
export const tip = (card, { w = 250, x = "c", y = "up", off = 8 } = {}) =>
  `<span class="hc-wrap" style="${y === "up" ? `bottom:calc(100% + ${off}px)` : `top:calc(100% + ${off}px)`};${x === "c" ? `left:50%;margin-left:-${w / 2}px` : x === "l" ? "left:0" : "right:0"}">${card}</span>`;

// ---------- CSS-only switch ----------
export function tgl(prefix, name, opts, { def = opts[0][0], size = 12, pad = "6px 13px" } = {}) {
  const d = `.${prefix}dir`;
  const radios = opts.map(([k, label]) => `<input type="radio" class="pk-in" name="${prefix}-${name}" id="${prefix}-${name}-${k}"${k === def ? " checked" : ""} aria-label="${label}">`).join("");
  const css = `<style>${d} [class*="v-${name}-"] { display: none; }
${opts.map(([k]) => `${d}:has(#${prefix}-${name}-${k}:checked) .v-${name}-${k} { display: var(--d, block); }
${d}:has(#${prefix}-${name}-${k}:checked) label[for="${prefix}-${name}-${k}"] { background: var(--surface); color: var(--accent-text); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); }`).join("\n")}</style>`;
  const ui = `<span class="seg" role="radiogroup" aria-label="${name}">${opts.map(([k, label]) => `<label for="${prefix}-${name}-${k}" class="seg-i" style="cursor:pointer;font-size:${size}px;padding:${pad}">${label}</label>`).join("")}</span>`;
  return { radios, css, ui, cls: (k) => `v-${name}-${k}`, keys: opts.map(([k]) => k) };
}
export const variants = (t, render, { d = "block", style = "" } = {}) => t.keys.map((k) => `<div class="${t.cls(k)}" style="--d:${d};${style}">${render(k)}</div>`).join("");

// ---------- Small shared bits ----------
export const card = (inner, { gap = 16, style = "", cls = "" } = {}) => `<section class="card glass ${cls}" style="gap:${gap}px;${style}">${inner}</section>`;
export const cardHead = (title, small = "", right = "") => `<div class="card-h"><div class="card-t">${title}${small ? `<small>${small}</small>` : ""}</div>${right}</div>`;
export const link = (t) => `<span class="link">${t}${I.arrowR(12)}</span>`;
export const worked = (t = "Worked out") => L.derivedTag(t);
export const stateChip = (e) => {
  const st = L.stateOf(e);
  if (e.status === "Upcoming") return `<span class="pill pill-off">${L.inDays(e.expectedDate)[0].toUpperCase()}${L.inDays(e.expectedDate).slice(1)}</span>`;
  if (st === "Pending") return `<span class="pill pill-due">${I.clock(10)} ${L.delay(e)} days late</span>`;
  if (st === "Late") return `<span class="pill pill-late">Received · ${L.delay(e)} days late</span>`;
  return `<span class="pill pill-on">Received</span>`;
};
const SK = L.SOURCES.map((s) => s.id);
export const TAGCOL = { Regular: "var(--card-emerald)", Bonus: "var(--card-violet)", Other: "oklch(0.7 0.02 260)" };
const tagName = { Regular: "Regular", Bonus: "Bonus", Other: "One-off" };
const delayTxt = (e) => (e.receivedDate ? (L.delay(e) <= 0 ? "on the day" : `${L.delay(e)} day${L.delay(e) === 1 ? "" : "s"} after`) : `${L.delay(e)} days late`);

// ---------- The greeting, pointing (every dashboard's greeting points) ----------
const pt = (text, card2, { x = "l" } = {}) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(card2, { w: 270, x, y: "down" })}</span>`;
export function pointLede() {
  const rows = (fn) => L.SOURCES.map((s) => [s.alias, fn(s), col(s)]);
  const total = hc({ h: "Received in 2026", t: inr(L.YTD), d: `${L.rcv26.length} payments from ${L.SOURCES.filter((s) => L.ytdOf(s.id)).length} sources`, rows: rows((s) => inr(L.ytdOf(s.id))), f: "By the date each one landed" });
  const regular = L.byTag("Regular");
  const avg = hc({ h: "A usual month", t: inr(L.AVG_MONTH), d: `${inr(L.YTD)} over 10 months, October included`, rows: [["Regular pay and interest", inr(regular / L.ELAPSED), TAGCOL.Regular], ["Bonus", inr(L.byTag("Bonus") / L.ELAPSED), TAGCOL.Bonus], ["One-off", inr(L.byTag("Other") / L.ELAPSED), TAGCOL.Other]], f: `Everything expected adds up to ${inr(L.RUN_RATE)} a month` });
  const growth = hc({ h: "Against the same days of 2025", t: signed(L.YTD - L.YTD_LAST), d: `${inr(L.YTD)} now, ${inr(L.YTD_LAST)} then`, rows: L.SOURCES.filter((s) => L.ytdOf(s.id) || s.id === "tax").map((s) => { const then = L.ENTRIES.filter((e) => e.sourceId === s.id && e.receivedDate && e.receivedDate.startsWith("2025") && e.receivedDate <= "2025-10-24").reduce((t, e) => t + e.amount, 0); return [s.alias, signed(L.ytdOf(s.id) - then), col(s)]; }), f: "1 Jan to 24 Oct, both years" });
  const bi = L.BEST.k, best = hc({ h: `${L.monFull(bi)}, the biggest month`, t: inr(L.BEST.v), d: `${inr(L.BEST.v - L.AVG_MONTH)} above a usual month`, rows: L.SOURCES.filter((s) => L.monthReceived(bi, s.id)).map((s) => [s.alias, inr(L.monthReceived(bi, s.id)), col(s)]), f: "Received between Aug 1 and Aug 31" });
  const p = L.PENDING[0], ps = L.src(p.sourceId), late = hc({ h: `${ps.name} is late`, hr: `<span class="pill pill-due" style="padding:2px 8px;font-size:10px">pending</span>`, t: inr(p.amount), d: `expected ${fmt(p.expectedDate)}, ${L.delay(p)} days ago`, rows: [["Usually lands in", L.ACCOUNTS[p.accountId].name, ""], ["Your usual wait", "0 to 2 days", ""]], f: "Mark it received when it lands" });
  const n30 = hc({ h: "Expected in the next 30 days", t: inr(L.NEXT_30.reduce((t, u) => t + u.amount, 0)), d: `${L.plural(L.NEXT_30.length, "payment")}, Oct 24 to Nov 22`, rows: L.NEXT_30.map((u) => [`${L.src(u.sourceId).alias} · ${fmt(u.expectedDate)}`, inr(u.amount), col(L.src(u.sourceId))]), f: "From each source's schedule, at its usual amount" });
  const n30sum = L.NEXT_30.reduce((t, u) => t + u.amount, 0);
  return `You've received ${pt(inr(L.YTD), total)} so far in 2026, about ${pt(inr(L.AVG_MONTH), avg)} a month, ${pt(`${Math.round(L.GROWTH * 100)}% more`, growth)} than at this point last year. ${pt(L.monFull(bi), best)} was the biggest month at ${pt(inr(L.BEST.v), best)}. ${pt(inr(p.amount), late)} from ${ps.alias} is ${pt(`${L.delay(p)} days late`, late)}, and ${pt(inr(n30sum), n30)} is expected in the next 30 days.`;
}
export const greeting = () => L.header({ lede: pointLede(), actions: L.greetingActions() });

/** The strip under the greeting while something is pending. */
export function attention() {
  const p = L.PENDING[0], s = L.src(p.sourceId);
  return `<div class="notice">${I.alert(16)}<div class="grow"><b>${s.name} · ${inr(p.amount)}</b> was expected ${fmt(p.expectedDate)} (${L.delay(p)} days ago) and hasn't landed in ${L.ACCOUNTS[p.accountId].name}.</div><span class="mini-btn ok">${I.check(11)} Mark received</span><span class="mini-btn ghost">Edit entry</span></div>`;
}

// ---------- Month columns ----------
const segsBySource = (key) => L.SOURCES.map((s) => ({ s, v: L.monthReceived(key, s.id) })).filter((x) => x.v);
function monthData(key) {
  const rec = L.ENTRIES.filter((e) => e.receivedDate && L.monthKey(e.receivedDate) === key);
  const pend = L.PENDING.filter((e) => L.monthKey(e.expectedDate) === key);
  const up = L.UPCOMING.filter((u) => L.monthKey(u.expectedDate) === key);
  return { rec, pend, up, total: rec.reduce((t, e) => t + e.amount, 0) };
}
/** Stacked columns for the 12 months of 2026. mode: src | tag. `pick` fades every source but one. */
export function monthCols({ h = 230, mode = "src", cls = "" } = {}) {
  const max = 400000, scale = h / max;
  const cols = L.YEAR.map((k) => {
    const m = monthData(k), future = k > L.NOW_KEY, nowc = k === L.NOW_KEY;
    const segs = [];
    if (mode === "src") for (const s of L.SOURCES) { const v = m.rec.filter((e) => e.sourceId === s.id).reduce((t, e) => t + e.amount, 0); if (v) segs.push(`<div class="mseg s-${s.id} rt" style="height:${Math.max(3, v * scale)}px;background:${L.fill(s, 180)}"></div>`); }
    else for (const t of ["Regular", "Bonus", "Other"]) { const v = m.rec.filter((e) => e.tag === t).reduce((a, e) => a + e.amount, 0); if (v) segs.push(`<div class="mseg rt" style="height:${Math.max(3, v * scale)}px;background:${TAGCOL[t]}"></div>`); }
    for (const e of m.pend) segs.push(`<div class="mseg pend" style="height:${Math.max(8, e.amount * scale)}px"></div>`);
    for (const u of m.up) { const s = L.src(u.sourceId); segs.push(`<div class="mseg ghost s-${s.id}" style="--c:${col(s)};height:${Math.max(8, u.amount * scale)}px"></div>`); }
    const shown = m.total + m.pend.reduce((t, e) => t + e.amount, 0) + m.up.reduce((t, u) => t + u.amount, 0);
    const valTxt = future ? `<div class="mval muted">${m.up.length ? inrS(shown) : "–"}</div>` : `<div class="mval">${inrS(m.total)}</div>`;
    const rows = [...m.rec.map((e) => [L.src(e.sourceId).alias + (e.tag === "Bonus" && e.sourceId === "salary" ? " bonus" : ""), inr(e.amount), col(L.src(e.sourceId))]), ...m.pend.map((e) => [`${L.src(e.sourceId).alias} · pending`, inr(e.amount), "oklch(0.72 0.14 75)"]), ...m.up.map((u) => [`${L.src(u.sourceId).alias} · expected ${fmt(u.expectedDate)}`, inr(u.amount), col(L.src(u.sourceId))])];
    const card2 = hc({ h: L.monYear(k), hr: nowc ? `<span class="pill pill-ink" style="padding:2px 8px;font-size:10px">this month</span>` : future ? `<span class="pill pill-off" style="padding:2px 8px;font-size:10px">expected</span>` : "", t: inr(future ? shown : m.total), d: future ? "from each source's schedule" : (m.total - L.AVG_MONTH >= 0 ? `${inr(m.total - L.AVG_MONTH)} above a usual month` : `${inr(L.AVG_MONTH - m.total)} below a usual month`), rows: rows.length ? rows : [["Nothing expected", "", ""]], w: 260 });
    return `<div class="mcol hov${nowc ? " nowcol" : ""}" tabindex="0"><div style="flex:1"></div>${valTxt}<div class="mstack">${segs.join("")}</div><div class="mlab${nowc ? " now" : ""}">${L.monName(k)}</div>${tip(card2, { w: 260, x: "c", y: "up" })}</div>`;
  });
  const grids = [100000, 200000, 300000].map((g) => `<div class="mgrid" style="bottom:${28 + g * scale}px"><span>${inrS(g)}</span></div>`).join("");
  const line = `<div class="mline" style="bottom:${28 + L.AVG_MONTH * scale}px"><span>A usual month ${inr(L.AVG_MONTH)}</span></div>`;
  return `<div class="mb ${cls}" style="height:${h + 66}px;padding-top:8px">${grids}${line}${cols.join("")}</div>`;
}
export const monthLegend = (mode) => mode === "src"
  ? `<div class="row" style="gap:14px;flex-wrap:wrap">${L.SOURCES.map((s) => `<span class="lg"><i style="background:${col(s)}"></i>${s.alias}</span>`).join("")}<span class="lg"><i class="dash"></i>Expected</span><span class="lg"><i class="hat"></i>Pending</span></div>`
  : `<div class="row" style="gap:14px;flex-wrap:wrap">${["Regular", "Bonus", "Other"].map((t) => `<span class="lg"><i style="background:${TAGCOL[t]}"></i>${tagName[t]}</span>`).join("")}<span class="lg"><i class="dash"></i>Expected</span><span class="lg"><i class="hat"></i>Pending</span></div>`;
/** The whole Month by month card, with its By source / Regular and bonus switch. */
export function monthCard({ prefix, h = 230, title = "Month by month", note = "what landed each month · hover a month" } = {}) {
  const t = tgl(prefix, "mview", [["src", "By source"], ["tag", "Regular & bonus"]]);
  return card(`${t.css}${t.radios}${cardHead(title, note, t.ui)}<div class="v-mview-src" style="--d:block">${monthLegend("src")}</div><div class="v-mview-tag" style="--d:block">${monthLegend("tag")}</div>${variants(t, (k) => monthCols({ h, mode: k }))}<div class="card-note">A month counts what landed in it, by the day it was received. Pending and expected income is outlined, never added to a total.</div>`, { cls: `${prefix}dir` });
}

// ---------- Sources ----------
export function sourcesCard({ title = "Sources", note = "everything that pays you · a month is what each is worth spread over its cycle", compact = false } = {}) {
  const cols = compact ? "2.3fr 1.2fr 1.2fr 1.5fr" : "2.3fr 1.2fr 1.3fr 1.4fr 1.6fr 1.5fr 1.3fr";
  const head = compact
    ? `<div class="srow" style="grid-template-columns:${cols};padding:0 0 8px"><span class="th">Source</span><span class="th">Usual</span><span class="th">This year</span><span class="th">Next</span></div>`
    : `<div class="srow" style="grid-template-columns:${cols};padding:0 0 8px"><span class="th">Source</span><span class="th">Usual amount</span><span class="th">Received 2026</span><span class="th">Month by month</span><span class="th">Next</span><span class="th">Lands in</span><span class="th" style="text-align:right">Status</span></div>`;
  const rows = L.SOURCES.map((s) => {
    const off = s.status === "Inactive", nx = L.nextOf(s.id), pend = nx && nx.status === "Pending";
    const mo = L.monthlyOf(s.id), mx = Math.max(...mo, 1);
    const spark = `<div class="spark" style="--c:${col(s)}">${mo.map((v, i) => (v ? `<i style="height:${Math.max(3, (v / mx) * 28)}px"></i>` : L.YEAR[i] > L.NOW_KEY && L.UPCOMING.some((u) => u.sourceId === s.id && L.monthKey(u.expectedDate) === L.YEAR[i]) ? `<i class="f" style="height:${Math.max(6, (s.expectedAmount / mx) * 28)}px"></i>` : `<i class="z"></i>`)).join("")}</div>`;
    const nextTxt = off ? `<span class="dim" style="color:var(--muted);font-weight:600">Done · received once</span>` : nx ? `<b>${fmt(nx.expectedDate)}</b><span class="sub2">${pend ? `<span style="color:var(--negative);font-weight:700">${L.delay(nx)} days late</span>` : L.inDays(nx.expectedDate)}</span>` : `<span class="muted">Jan 5, 2027</span>`;
    const status = off ? `<span class="pill pill-off">Inactive</span>` : pend ? `<span class="pill pill-due">${I.clock(10)} Pending</span>` : `<span class="pill pill-on">On track</span>`;
    const name = `<div class="cell-name">${mono(s, 34)}<div><b>${s.name}</b><small>${s.category} · ${s.frequency}</small></div></div>`;
    const usual = `<div class="num">${inr(s.expectedAmount)}</div><span class="sub2">${L.MONTHS_IN_CYCLE[s.frequency] ? `${inr(L.monthlyEq(s))} a month` : "one time"}</span>`;
    const ytd = `<div class="num">${inr(L.ytdOf(s.id))}</div><span class="sub2">${L.plural(L.received(2026, s.id).length, "payment")}</span>`;
    return compact
      ? `<div class="srow sr-${s.id}${off ? " off" : ""}" style="grid-template-columns:${cols}">${name}<div>${usual}</div><div>${ytd}</div><div>${nextTxt}</div></div>`
      : `<div class="srow sr-${s.id}${off ? " off" : ""}" style="grid-template-columns:${cols}">${name}<div>${usual}</div><div>${ytd}</div>${spark}<div>${nextTxt}</div>${L.acctChip(s.acct)}<div style="text-align:right">${status}</div></div>`;
  }).join("");
  return card(`${cardHead(title, note, btn("Add source", { kind: "soft", icon: I.plus(12), cls: "btn-sm" }))}<div>${head}${rows}</div><div class="foot between" style="font-size:12px;color:var(--muted);font-weight:600"><span>${L.plural(L.ACTIVE.length, "active source")} · a usual month is <b style="color:var(--fg)">${inr(L.RUN_RATE)}</b> when every one pays</span>${link("All entries")}</div>`, { gap: 12 });
}

// ---------- Coming up ----------
export function comingUp({ n = 5, filter = true } = {}) {
  const items = [...L.PENDING, ...L.UPCOMING].slice(0, n);
  const rows = items.map((e) => {
    const s = L.src(e.sourceId), pend = e.status === "Pending";
    const d = e.expectedDate;
    return `<div class="cu"><div class="dd${pend ? " late" : ""}"><b>${Number(d.slice(8))}</b><span>${L.monName(d).toUpperCase()}</span></div><div><div class="tt">${s.alias} lands in ${L.ACCOUNTS[e.accountId].name}</div><div class="ss">${pend ? `<span style="color:var(--negative);font-weight:700">${L.delay(e)} days late</span> · expected ${L.fmtDow(d)}` : `${L.fmtDow(d)} · ${L.inDays(d)} · the usual amount`}</div></div><div class="amt">+${inr(e.amount)}${pend ? `<span class="mini-btn ok" style="margin-top:6px">${I.check(11)} Mark received</span>` : ""}</div></div>`;
  }).join("");
  const sum30 = L.NEXT_30.reduce((t, u) => t + u.amount, 0);
  return card(`${cardHead("Coming up", "from each source's schedule", filter ? L.seg([{ label: "All", on: true }, { label: "Pending" }, { label: "Upcoming" }]) : "")}<div>${rows}</div><div class="foot between" style="font-size:12px;color:var(--muted);font-weight:600;border-top:1px solid var(--divider);padding-top:12px"><span>Next 30 days: <b style="color:var(--positive)">${inr(sum30)}</b> from ${L.plural(L.NEXT_30.length, "payment")}</span>${worked("Expected")}</div>`, { gap: 6 });
}

// ---------- Where it lands ----------
export function landsCard() {
  const ids = ["hdfc", "icici", "kotak"], max = Math.max(...ids.map(L.byAcct));
  const rows = ids.map((id) => {
    const a = L.ACCOUNTS[id], v = L.byAcct(id), last = L.ENTRIES.filter((e) => e.accountId === id && e.receivedDate).sort((x, y) => (x.receivedDate < y.receivedDate ? 1 : -1))[0], srcs = L.SOURCES.filter((s) => s.acct === id && L.ytdOf(s.id));
    const parts = srcs.map((s) => `<span class="rt" style="display:block;height:100%;width:${(L.ytdOf(s.id) / max) * 100}%;background:${L.fill(s, 90)}"></span>`).join("");
    return `<div class="hov" tabindex="0" style="display:flex;flex-direction:column;gap:8px"><div class="between"><span class="via"><span class="minibank" style="background:${grad(a.color)}">${a.initial}</span><b style="font-weight:800">${a.name}</b></span><span class="row" style="gap:12px"><span class="muted" style="font-weight:600">${L.pctOf(v, L.YTD)}%</span><b style="font-weight:800;font-size:14px">${inr(v)}</b></span></div><div class="hbar" style="display:flex;gap:2px;background:var(--fill)">${parts}</div><div class="muted" style="font-size:12px;font-weight:600">${srcs.map((s) => s.alias).join(" · ")}</div><div class="muted" style="font-size:12px;font-weight:600">Last credit <b style="color:var(--fg)">${fmt(last.receivedDate)}</b> · ${L.src(last.sourceId).alias} ${inr(last.amount)}</div>${tip(hc({ h: `Into ${a.name}`, t: inr(v), d: `${L.pctOf(v, L.YTD)}% of what you've received`, rows: srcs.map((s) => [s.alias, inr(L.ytdOf(s.id)), col(s)]), w: 240 }), { w: 240, x: "c", y: "up" })}</div>`;
  }).join("");
  return card(`${cardHead("Where it lands", "this year · by the account it was credited to")}<div style="display:flex;flex-direction:column;gap:16px" class="spread">${rows}</div><div class="card-note foot">Every entry names the account it landed in; a source's usual one is filled in for you.</div>`);
}

// ---------- Pay rhythm ----------
export function rhythmCard({ title = "Pay rhythm", note = "how long after its expected date each payment landed" } = {}) {
  const span = 9; // days shown to the right of 0
  const pos = (d) => `${Math.min(100, (Math.max(d, -0.5) + 0.5) / (span + 0.5) * 100)}%`;
  const rows = L.ACTIVE.map((s) => {
    const es = L.entriesOf(s.id).filter((e) => e.sourceId === s.id), done = es.filter((e) => e.receivedDate);
    const avg = done.reduce((t, e) => t + Math.max(0, L.delay(e)), 0) / (done.length || 1);
    const dots = es.map((e) => {
      const d = e.receivedDate ? L.delay(e) : Math.min(span, L.delay(e)), st = L.stateOf(e);
      const c = `<div class="hov rdot${st === "Late" ? " late" : st === "Pending" ? " pend" : ""}" style="--c:${col(s)};left:${pos(d)}" tabindex="0">${tip(hc({ h: `${s.alias} · ${L.fmt(e.expectedDate)}`, t: inr(e.amount), d: e.receivedDate ? `landed ${L.fmt(e.receivedDate)}, ${delayTxt(e)}` : `still pending, ${L.delay(e)} days after`, w: 210 }), { w: 210, x: "c", y: "up" })}</div>`;
      return c;
    }).join("");
    const nPend = es.filter((e) => !e.receivedDate).length;
    return `<div class="rhy rh-${s.id}"><div class="cell-name">${mono(s, 28)}<b style="font-size:13px">${s.alias}</b></div><div class="rt-axis"><div class="base"></div><div class="band" style="width:${pos(L.ON_TIME_DAYS)}"></div>${dots}</div><div style="text-align:right;font-size:12px;font-weight:700;color:var(--muted)">${nPend ? `<span style="color:var(--negative)">${I.clock(10)} +${L.delay(L.PENDING[0])} d</span>` : `avg <b style="color:var(--fg)">+${avg.toFixed(1)} d</b>`}</div></div>`;
  }).join("");
  const ticks = [0, 3, 6, 9].map((d) => `<span style="left:${pos(d)};white-space:nowrap">${d === 0 ? "On the day" : d === 9 ? "+9 d or more" : `+${d} d`}</span>`).join("");
  return card(`${cardHead(title, note)}<div class="row" style="gap:18px;align-items:flex-end"><div><div class="hk">On time</div><div style="font-size:30px;font-weight:800;letter-spacing:-0.02em;line-height:1.1;white-space:nowrap">${L.onTimeCount} of ${L.rcv26.length}</div></div><div class="muted" style="font-size:12.5px;font-weight:600;line-height:1.5;padding-bottom:3px">landed within ${L.ON_TIME_DAYS} days of expected · on average <b style="color:var(--fg)">${L.avgDelay.toFixed(1)} days</b> after</div></div><div class="spread">${rows}</div><div class="rhy-ticks"><div></div><div>${ticks}</div><div></div></div><div class="row" style="gap:16px"><span class="lg"><i style="background:var(--accent-tint)"></i>On time (up to ${L.ON_TIME_DAYS} days)</span><span class="lg"><i style="background:var(--muted);border-radius:50%;width:8px;height:8px"></i>Landed</span><span class="lg"><i class="hat" style="border-radius:50%"></i>Still pending</span></div>`);
}

// ---------- This year vs last ----------
export function yoyCard({ w = 640, h = 250, title = "This year, and last" } = {}) {
  const c26 = L.cumulative(2026), c25 = L.cumulative(2025);
  const then = (sid) => L.ENTRIES.filter((e) => e.sourceId === sid && e.receivedDate && e.receivedDate.startsWith("2025") && e.receivedDate <= "2025-10-24").reduce((t, e) => t + e.amount, 0);
  const gains = L.SOURCES.map((s) => [s, L.ytdOf(s.id) - then(s.id)]).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const padL = 44, padR = 110, padT = 24, padB = 30, iw = w - padL - padR, ih = h - padT - padB;
  const maxV = 3000000, x = (i) => padL + (i / 11) * iw, y = (v) => padT + ih - (v / maxV) * ih;
  const now = 9, proj = [...c26.slice(0, now + 1)];
  let run = c26[now]; const exp = [];
  for (let i = now + 1; i < 12; i++) { run += L.UPCOMING.filter((u) => L.monthKey(u.expectedDate) === L.YEAR[i]).reduce((t, u) => t + u.amount, 0); exp.push(run); }
  const pts = (a, from = 0) => a.map((v, i) => `${x(i + from).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${x(0)},${y(0)} ${pts(c26.slice(0, now + 1))} ${x(now)},${y(0)}`;
  const grid = [0, 1000000, 2000000, 3000000].map((g) => `<line x1="${padL}" x2="${w - padR}" y1="${y(g)}" y2="${y(g)}" class="axis-l"></line><text x="${padL - 8}" y="${y(g) + 4}" text-anchor="end" class="axis-t">${g ? inrS(g) : "0"}</text>`).join("");
  const months = L.YEAR.map((k, i) => `<text x="${x(i)}" y="${h - 8}" text-anchor="middle" class="axis-t" style="${i === now ? "fill:var(--fg)" : ""}">${L.monName(k)}</text>`).join("");
  const svg = `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" style="display:block"><defs><linearGradient id="yoyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="oklch(0.72 0.19 145)" stop-opacity="0.28"></stop><stop offset="1" stop-color="oklch(0.72 0.19 145)" stop-opacity="0"></stop></linearGradient></defs>${grid}${months}<polyline points="${pts(c25)}" fill="none" stroke="oklch(0.62 0.02 260)" stroke-width="2" stroke-dasharray="5 5" stroke-linecap="round"></polyline><polygon points="${area}" fill="url(#yoyg)"></polygon><polyline points="${pts(exp, now + 1).replace(/^/, `${x(now).toFixed(1)},${y(c26[now]).toFixed(1)} `)}" fill="none" stroke="oklch(0.55 0.14 150)" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"></polyline><polyline points="${pts(c26.slice(0, now + 1))}" fill="none" stroke="oklch(0.5 0.14 150)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"></polyline><circle cx="${x(now)}" cy="${y(c26[now])}" r="6" fill="oklch(0.5 0.14 150)" stroke="white" stroke-width="2.5"></circle><circle cx="${x(now)}" cy="${y(c25[now])}" r="4" fill="oklch(0.62 0.02 260)" stroke="white" stroke-width="2"></circle><text x="${x(now) + 12}" y="${y(c26[now]) - 10}" class="vlabel">${inr(c26[now])} now</text><text x="${x(now) + 12}" y="${y(c25[now]) + 18}" class="axis-t" style="fill:oklch(0.5 0.02 260)">${inr(c25[now])} a year ago</text><text x="${x(11) + 10}" y="${y(exp.at(-1)) + 4}" class="axis-t" style="fill:oklch(0.4 0.12 150)">${inrS(exp.at(-1))} by Dec</text><text x="${x(11) + 10}" y="${y(c25[11]) + 4}" class="axis-t" style="fill:oklch(0.5 0.02 260)">${inrS(c25[11])} in 2025</text></svg>`;
  return card(`${cardHead(title, "money received, adding up through the year", `<span class="delta">${I.up(11)} ${Math.round(L.GROWTH * 100)}% on this time last year</span>`)}${svg}<div class="row" style="gap:16px;flex-wrap:wrap"><span class="lg"><i style="background:oklch(0.5 0.14 150)"></i>2026</span><span class="lg"><i style="background:oklch(0.62 0.02 260)"></i>2025</span><span class="lg"><i class="dash"></i>Still expected this year (${inrS(exp.at(-1))} by December)</span></div><div class="foot" style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;border-top:1px solid var(--divider);padding-top:14px">${gains.map(([s, d]) => `<div class="hfig"><span class="k">${s.alias}</span><span class="v" style="font-size:17px;color:var(--positive)">${signed(d)}</span><span class="s">on 2025, same days</span></div>`).join("")}</div>`);
}

// ---------- Where it comes from (the mix) ----------
export function mixCard({ title = "Where it comes from", note = "this year, by source" } = {}) {
  const sorted = L.SOURCES.slice().sort((a, b) => L.ytdOf(b.id) - L.ytdOf(a.id));
  const bar = sorted.map((s) => `<span class="rt hov" tabindex="0" style="display:block;height:100%;flex:${L.ytdOf(s.id)};background:${L.fill(s, 90)};min-width:6px">${tip(hc({ h: s.name, t: inr(L.ytdOf(s.id)), d: `${L.pctOf(L.ytdOf(s.id), L.YTD)}% of the year`, w: 200 }), { w: 200, x: "c", y: "up" })}</span>`).join("");
  const rows = sorted.map((s) => `<div style="display:flex;flex-direction:column;gap:6px"><div class="between" style="font-size:13px;font-weight:700"><span class="row" style="gap:9px"><i style="width:10px;height:10px;border-radius:3px;background:${col(s)};display:inline-block"></i>${s.alias}</span><span class="row" style="gap:12px"><span class="muted" style="font-weight:600;width:36px;text-align:right">${L.pctOf(L.ytdOf(s.id), L.YTD)}%</span><b style="width:92px;text-align:right">${inr(L.ytdOf(s.id))}</b></span></div><div class="pbar" style="height:5px"><span class="rt" style="display:block;height:100%;width:${(L.ytdOf(s.id) / L.ytdOf(sorted[0].id)) * 100}%;background:${L.fill(s, 90)};border-radius:inherit"></span></div></div>`).join("");
  return card(`${cardHead(title, note)}<div class="stack" style="height:30px;border-radius:12px;gap:3px;display:flex;overflow:hidden">${bar}</div><div class="spread">${rows}</div>`);
}
export function variableCard() {
  const reg = L.byTag("Regular"), bon = L.byTag("Bonus"), oth = L.byTag("Other");
  const parts = [["Regular", reg, "Salary, interest and dividends"], ["Bonus", bon, "The March bonus"], ["Other", oth, "The tax refund"]];
  return card(`${cardHead("Regular, bonus and one-off", "this year", worked())}<div class="stack" style="height:14px;display:flex;gap:3px">${parts.map(([t, v]) => `<span class="rt" style="flex:${v};background:${TAGCOL[t]};border-radius:6px;min-width:6px"></span>`).join("")}</div><div class="spread">${parts.map(([t, v, d]) => `<div class="between"><span class="row" style="gap:10px"><i style="width:10px;height:10px;border-radius:3px;background:${TAGCOL[t]};display:inline-block"></i><span><b style="font-size:13px">${tagName[t]}</b><span class="sub2">${d}</span></span></span><span style="text-align:right"><b style="font-size:15px">${inr(v)}</b><span class="sub2">${L.pctOf(v, L.YTD)}%</span></span></div>`).join("")}</div><div class="card-note foot" style="border-top:1px solid var(--divider);padding-top:12px"><b style="color:var(--fg)">Take the bonuses out</b> and a usual month is <b style="color:var(--fg)">${inr(reg / L.ELAPSED)}</b>, not ${inr(L.AVG_MONTH)}.</div>`);
}

// ---------- Pay calendar ----------
export function payCalendar({ key = "2026-10", title = "Pay calendar" } = {}) {
  const first = `${key}-01`, offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday first
  const next = L.addMonthsUTC(first, 1), last = L.daysBetween(first, next);
  const start = L.addDays(first, -offset), cells = [];
  const total = Math.ceil((offset + last) / 7) * 7;
  const byDay = {};
  for (const e of [...L.ENTRIES.filter((e) => L.monthKey(L.cashDate(e)) === key || (e.expectedDate && L.monthKey(e.expectedDate) === key)), ...L.UPCOMING]) { const d = e.status === "Received" ? e.receivedDate : e.expectedDate; (byDay[d] ||= []).push(e); }
  for (let i = 0; i < total; i++) {
    const d = L.addDays(start, i), inM = L.monthKey(d) === key, es = byDay[d] ?? [];
    const chips = es.filter((e) => inM || e.status === "Upcoming").map((e) => { const s = L.src(e.sourceId), st = e.status === "Upcoming" ? "soon" : L.stateOf(e) === "Pending" ? "pend" : ""; return `<span class="chip2 cc-${s.id} ${st}" style="background:${grad(s.color, 150)};--c:${col(s)}">${st === "pend" ? I.clock(9) : st === "soon" ? "" : I.check(9)}${inrS(e.amount)}</span>`; }).join("");
    cells.push(`<div class="dc${inM ? "" : " out"}${d === L.TODAY ? " today" : ""}${chips && inM ? " has" : ""}"><span class="n">${Number(d.slice(8))}</span>${chips}</div>`);
  }
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="dh">${d}</div>`).join("");
  const rec = L.monthEntries(key).filter((e) => e.receivedDate).reduce((t, e) => t + e.amount, 0);
  return card(`${cardHead(title, `${L.monYear(key)} · ${inr(rec)} received`, `<span class="row" style="gap:6px"><span class="btn btn-icon btn-sm" style="width:32px;min-height:32px">${I.chevL(12)}</span><span class="btn btn-icon btn-sm" style="width:32px;min-height:32px">${I.chevR(12)}</span></span>`)}<div class="pcal">${days}${cells.join("")}</div><div class="row foot" style="gap:14px;flex-wrap:wrap">${L.SOURCES.filter((s) => L.monthEntries(key).some((e) => e.sourceId === s.id)).map((s) => `<span class="lg"><i style="background:${col(s)}"></i>${s.alias}</span>`).join("")}<span class="lg"><i class="hat"></i>Pending</span><span class="lg"><i class="dash"></i>Expected</span></div>`);
}

// ---------- Summary tiles (Renewals' grammar) ----------
import { rings } from "./rings.mjs";
export const tile = ({ k, v, s, feature = false, vcls = "", w = 460, h = 118 }) => `<div class="stile glass${feature ? " feature" : ""}" style="min-width:0">${feature ? rings(w, h) : ""}<span class="k">${k}</span><span class="v ${vcls}">${v}</span><span class="s">${s}</span></div>`;
export const tiles = (list) => `<div class="tiles" style="grid-template-columns:repeat(${list.length},1fr)">${list.map(tile).join("")}</div>`;
