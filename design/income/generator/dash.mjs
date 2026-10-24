// The four dashboard directions for /income. Each has the same greeting, and its own idea for the hero:
//   I1 Payday river   every source is a lane across the year; a bead is a payment, sized by its amount
//   I2 Money flow     sources flow into the accounts they land in (a Sankey); pick a source to follow it
//   I3 Income wheel   the year as a wheel, a spoke per month stacked by source; pick a month to open it
//   I4 Year in columns  the classic: twelve stacked columns, with a source switch and the usual-month line
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { rings } from "./rings.mjs";
const { I, inr, inrS, fmt, col, grad, mono, btn } = L;
const { hc, tip, card, cardHead } = P;

export const row = (cols, items, gap = 20) => `<div style="display:grid;grid-template-columns:${cols};gap:${gap}px;align-items:stretch">${items.join("")}</div>`;
export const page = (body, wrapCls = "") => L.desktop({ h: "auto", body: `<div class="${wrapCls}" style="display:flex;flex-direction:column;gap:20px">${body}</div>` });
const bigFigure = (v) => `<div class="hbig"><small>₹</small>${Math.round(v).toLocaleString("en-IN")}</div>`;
const pk = (prefix, ids, def = "all") => ids.map((id) => `<input type="radio" class="pk-in" name="${prefix}-sel" id="${prefix}-sel-${id}"${id === def ? " checked" : ""} aria-label="${id}">`).join("");

/** The figures along the top of a hero. */
const figs = (list, light = false) => `<div class="row" style="gap:40px;align-items:flex-start;flex-wrap:nowrap">${list.map(([k, v, s, cls]) => `<div class="hfig"><span class="k">${k}</span><span class="v ${cls ?? ""}">${v}</span><span class="s">${s}</span></div>`).join("")}</div>`;
const p0 = L.PENDING[0];
const sum30 = L.NEXT_30.reduce((t, u) => t + u.amount, 0);
const nextPay = L.UPCOMING[0];
const HERO_FIGS = [
  ["A usual month", inr(L.RUN_RATE), "when every source pays"],
  ["Pending", inr(L.PENDING_SUM), `${L.src(p0.sourceId).alias} · ${L.delay(p0)} days late`, "warn"],
  ["Next payday", fmt(nextPay.expectedDate), `${L.src(nextPay.sourceId).alias} ${inr(nextPay.amount)} · ${L.inDays(nextPay.expectedDate)}`],
  ["On time", `${L.onTimeCount} of ${L.rcv26.length}`, `average ${L.avgDelay.toFixed(1)} days after expected`],
];
const heroTop = (label, light = true) => `<div class="between" style="align-items:flex-start;gap:32px;position:relative"><div style="display:flex;flex-direction:column;gap:10px"><div class="hk">${label}</div>${bigFigure(L.YTD)}<div class="row" style="gap:10px"><span class="delta">${I.up(11)} ${Math.round(L.GROWTH * 100)}% on this time last year</span><span class="hsub">${inr(L.YTD_LAST)} by Oct 24, 2025</span></div></div>${figs(HERO_FIGS)}</div>`;

// =========================================================== I1 · Payday river
function river() {
  const px = (iso) => `${(L.dayOfYear(iso) / 365) * 100}%`;
  const size = (v) => 10 + Math.sqrt(v / 1000) * 2.4;
  const now = px(L.TODAY);
  const axis = L.YEAR.map((k) => `<span class="${k === L.NOW_KEY ? "now" : ""}" style="left:${px(`${k}-01`)}">${L.monName(k)}</span>`).join("");
  const grid = L.YEAR.map((k) => `<span style="position:absolute;left:${px(`${k}-01`)};top:0;bottom:0;border-left:1px solid oklch(0.3 0.09 155 / 0.1)"></span>`).join("");
  const lanes = L.SOURCES.map((s) => {
    const es = [...L.entriesOf(s.id).filter((e) => e.sourceId === s.id), ...L.UPCOMING.filter((u) => u.sourceId === s.id && u.expectedDate <= "2026-12-31")];
    const tall = s.id === "salary", lh = tall ? 92 : 56;
    const ly = tall ? "68%" : "50%";
    const beads = es.map((e) => {
      const st = e.status === "Upcoming" ? "soon" : L.stateOf(e), d = size(e.amount), date = e.status === "Upcoming" ? e.expectedDate : L.cashDate(e);
      const top = tall ? (e.tag === "Bonus" ? "26%" : ly) : ly;
      const cls = st === "Late" ? " late" : st === "Pending" ? " pend" : st === "soon" ? " soon" : "";
      const lab = `<span class="bead-l${st === "soon" ? " soon" : ""}" style="left:calc(${px(date)} + ${d / 2 + 7}px);top:${top}">${e.tag === "Bonus" && tall ? "Bonus " : ""}${inrS(e.amount)}</span>`;
      const body = e.status === "Upcoming" ? hc({ h: `${s.alias} · expected`, t: inr(e.amount), d: `${L.fmtDow(e.expectedDate)} · ${L.inDays(e.expectedDate)}`, rows: [["Lands in", L.ACCOUNTS[e.accountId].name, ""]], w: 230 })
        : hc({ h: `${s.alias}${e.tag === "Bonus" ? " · bonus" : ""}`, hr: P.stateChip(e), t: inr(e.amount), d: e.receivedDate ? `expected ${fmt(e.expectedDate)} · landed ${fmt(e.receivedDate)}` : `expected ${fmt(e.expectedDate)} · not received`, rows: [["Landed in", L.ACCOUNTS[e.accountId].name, ""]], w: 230 });
      return `<div class="bead-wrap hov" tabindex="0" style="left:${px(date)};top:${top}"><span class="bead${cls}" style="width:${d}px;height:${d}px;background:${L.fill(s, 150)}"></span>${tip(body, { w: 230, x: "c", y: "up", off: d / 2 + 6 })}</div>${lab}`;
    }).join("");
    const sel = `<label for="i1-sel-${s.id}" class="ll"><span>${mono(s, 34)}</span><span><b>${s.alias}</b><small>${s.frequency}${s.status === "Inactive" ? " · done" : ""}</small></span></label>`;
    return `<div class="lane ln-${s.id}" style="--lh:${lh}px;--lane:${col(s)};--now:${now};--ly:${ly}">${sel}<div class="lp">${beads}</div><div class="lt">${inr(L.ytdOf(s.id))}</div></div>`;
  }).join("");
  const css = `<style>.i1dir${L.SOURCES.map((s) => `:has(#i1-sel-${s.id}:checked) .lane:not(.ln-${s.id}) > *`).join(", .i1dir")} { opacity: 0.2; } ${L.SOURCES.map((s) => `.i1dir:has(#i1-sel-${s.id}:checked) .lane.ln-${s.id} .ll { background: var(--surface); box-shadow: var(--soft-shadow); }`).join(" ")} .i1dir:has(#i1-sel-all:checked) label[for="i1-sel-all"] { background: var(--ink); color: var(--on-ink); }</style>`;
  return `${css}<div class="river" style="position:relative;margin-top:6px"><div style="grid-column:1;display:flex;align-items:flex-end;padding-bottom:4px"><label for="i1-sel-all" class="chip" style="cursor:pointer">All sources</label></div><div class="ax">${axis}</div><div class="hk" style="align-self:end;text-align:right;padding-bottom:4px">Received</div>
  ${lanes}<div style="position:absolute;left:150px;right:96px;top:38px;bottom:0;pointer-events:none">${grid}<span class="todayline" style="left:${now}"></span><span class="todaytag" style="left:${now};top:-34px">Today · Oct 24</span></div></div>`;
}
export function i1() {
  const hero = `<section class="hero i1dir" style="padding:28px 28px 22px;background:var(--feature-tile);border:1px solid var(--feature-tile-line);display:flex;flex-direction:column;gap:20px">${rings(1416, 560, { first: 60, step: 30, opacity: 0.09 })}${pk("i1", ["all", ...L.SOURCES.map((s) => s.id)])}${heroTop("Money in · Jan 1 to today")}${river()}<div class="row" style="gap:18px;flex-wrap:wrap;padding-top:6px"><span class="lg"><i style="background:var(--card-sapphire);border-radius:50%"></i>Received</span><span class="lg"><i style="border-radius:50%;box-shadow:0 0 0 1.5px var(--surface),0 0 0 3px oklch(0.72 0.14 75);background:var(--card-sapphire)"></i>Landed more than 3 days late</span><span class="lg"><i class="hat" style="border-radius:50%"></i>Pending</span><span class="lg"><i class="dash" style="border-radius:50%"></i>Expected</span><span class="lg" style="margin-left:auto">A bead's size is its amount · pick a source to follow it</span></div></section>`;
  return page(`${P.greeting()}${P.attention()}${hero}${row("1.65fr 1fr", [P.sourcesCard({ compact: true }), `<div class="stack-col">${P.comingUp({ n: 6 })}</div>`])}${row("1.6fr 1fr", [P.monthCard({ prefix: "i1m", h: 220 }), P.landsCard()])}${row("1fr 1fr", [P.yoyCard({ w: 680, h: 260 }), P.rhythmCard()])}`);
}

// =========================================================== I2 · Money flow
const FLOW_W = 960;
function flow() {
  const order = ["salary", "tax", "rsu", "espp", "div", "fd"], accts = ["hdfc", "icici", "kotak"];
  const gap = 14, top = 6, k = 262 / (L.YTD + L.PENDING_SUM);
  const wOf = (v) => Math.max(5, v * k);
  const lx = 262, rx = FLOW_W - 262, nodeW = 14;
  const pendOf = (id) => L.PENDING.filter((p) => p.sourceId === id).reduce((t, p) => t + p.amount, 0);
  const place = (items, gp) => { let end = -Infinity, c = -Infinity; const out = {}; for (const [id, h] of items) { const y = Math.max(end + gp, c + 42 - h / 2, top); out[id] = { y, h }; end = y + h; c = y + h / 2; } return [out, end]; };
  const [lnodes, endL] = place(order.map((id) => [id, wOf(L.ytdOf(id)) + (pendOf(id) ? wOf(pendOf(id)) : 0)]), gap);
  const [rnodes, endR] = place(accts.map((a) => [a, order.filter((id) => L.src(id).acct === a).reduce((t, id) => t + wOf(L.ytdOf(id)) + (pendOf(id) ? wOf(pendOf(id)) : 0), 0)]), 24);
  const FLOW_H = Math.ceil(Math.max(endL, endR) + top);
  const shift = (list, d) => Object.values(list).forEach((n) => (n.y += d));
  shift(lnodes, (FLOW_H - top - endL) / 2); shift(rnodes, (FLOW_H - top - endR) / 2);
  const rOff = Object.fromEntries(accts.map((a) => [a, rnodes[a].y]));
  const path = (y0, h0, y1, h1) => { const xm = (lx + nodeW + rx) / 2; return `M${lx + nodeW},${y0} C${xm},${y0} ${xm},${y1} ${rx},${y1} L${rx},${y1 + h1} C${xm},${y1 + h1} ${xm},${y0 + h0} ${lx + nodeW},${y0 + h0} Z`; };
  const defs = [], paths = [];
  for (const id of order) {
    const s = L.src(id), a = s.acct, v = L.ytdOf(id), w = wOf(v);
    const y1 = rOff[a]; rOff[a] += w;
    defs.push(`<linearGradient id="fl-${id}" x1="0" x2="1"><stop offset="0" stop-color="var(--card-${s.color})"></stop><stop offset="1" stop-color="var(--card-${L.ACCOUNTS[a].color})"></stop></linearGradient>`);
    const cardBody = hc({ h: `${s.alias} → ${L.ACCOUNTS[a].name}`, t: inr(v), d: `${L.pctOf(v, L.YTD)}% of what you've received`, rows: [["Payments", String(L.received(2026, id).length), ""], ["Usually lands in", L.ACCOUNTS[a].name, ""]], w: 230 });
    paths.push(`<g class="rb rb-${id} ra-${a}"><path d="${path(lnodes[id].y, w, y1, w)}" fill="url(#fl-${id})" fill-opacity="0.62"></path></g>`);
    const pend = pendOf(id);
    if (pend) { const pw = wOf(pend), y1p = rOff[a]; rOff[a] += pw; paths.push(`<g class="rb rb-${id} ra-${a}"><path d="${path(lnodes[id].y + w, pw, y1p, pw)}" fill="oklch(0.95 0.05 85)" fill-opacity="0.9" stroke="oklch(0.72 0.14 75)" stroke-width="1.5" stroke-dasharray="4 3"></path></g>`); }
  }
  const nodes = order.map((id) => `<rect class="rb rb-${id}" x="${lx}" y="${lnodes[id].y}" width="${nodeW}" height="${lnodes[id].h}" rx="5" fill="var(--card-${L.src(id).color})"></rect>`).join("")
    + accts.map((a) => `<rect class="rb ${order.filter((id) => L.src(id).acct === a).map((id) => `rb-${id}`).join(" ")} ra-${a}" x="${rx}" y="${rnodes[a].y}" width="${nodeW}" height="${rnodes[a].h}" rx="5" fill="var(--card-${L.ACCOUNTS[a].color})"></rect>`).join("");
  const labL = order.map((id) => { const s = L.src(id), n = lnodes[id]; return `<label for="i2-sel-${id}" class="fl fl-${id}" style="position:absolute;left:0;width:${lx - 14}px;top:${n.y + n.h / 2}px;transform:translateY(-50%);display:flex;align-items:center;justify-content:flex-end;gap:10px;text-align:right;cursor:pointer;border-radius:14px;padding:4px 6px"><span><b style="display:block;font-size:13px">${s.alias}</b><small class="muted" style="font-weight:700;font-size:12px">${inr(L.ytdOf(id))}</small></span>${mono(s, 32)}</label>`; }).join("");
  const labR = accts.map((a) => { const n = rnodes[a], ac = L.ACCOUNTS[a]; return `<label for="i2-sel-${a}" class="fl fl-${a}" style="position:absolute;left:${rx + nodeW + 14}px;width:${FLOW_W - rx - nodeW - 14}px;top:${n.y + n.h / 2}px;transform:translateY(-50%);display:flex;align-items:center;gap:10px;cursor:pointer;border-radius:14px;padding:4px 6px"><span class="minibank" style="width:32px;height:32px;border-radius:10px;font-size:13px;background:${grad(ac.color)}">${ac.initial}</span><span><b style="display:block;font-size:13px">${ac.name}</b><small class="muted" style="font-weight:700;font-size:12px">${inr(L.byAcct(a))} · ${L.pctOf(L.byAcct(a), L.YTD)}%</small></span></label>`; }).join("");
  const pendTag = `<span class="pill pill-late" style="position:absolute;left:${(lx + rx) / 2 - 62}px;top:${Math.min(...Object.values(rnodes).map((n) => n.y)) + 0}px;display:none"></span>`;
  const css = `<style>.i2dir .rb { transition: opacity 240ms; } ${[...order, ...accts].map((id) => `.i2dir:has(#i2-sel-${id}:checked) .rb:not(.${accts.includes(id) ? "ra" : "rb"}-${id}) { opacity: 0.12; } .i2dir:has(#i2-sel-${id}:checked) label.fl-${id} { background: var(--surface); box-shadow: var(--soft-shadow); }`).join(" ")} .i2dir:has(#i2-sel-all:checked) label[for="i2-sel-all"] { background: var(--ink); color: var(--on-ink); } .i2dir [class*="i2p-"] { display: none; } ${["all", ...order, ...accts].map((id) => `.i2dir:has(#i2-sel-${id}:checked) .i2p-${id} { display: grid; }`).join(" ")}</style>`;
  return `${css}<div style="position:relative;width:${FLOW_W}px;height:${FLOW_H}px;margin:0 auto"><svg width="${FLOW_W}" height="${FLOW_H}" viewBox="0 0 ${FLOW_W} ${FLOW_H}" style="position:absolute;inset:0"><defs>${defs.join("")}</defs>${paths.join("")}${nodes}</svg>${labL}${labR}</div>`;
}
function flowPanes() {
  const fig = ([k, v, s, c]) => `<div class="hfig"><span class="k">${k}</span><span class="v ${c ?? ""}" style="font-size:18px">${v}</span><span class="s">${s}</span></div>`;
  const grid = (items) => items.map(fig).join("");
  const acctLast = (a) => L.ENTRIES.filter((e) => e.accountId === a && e.receivedDate).sort((x, y) => (x.receivedDate < y.receivedDate ? 1 : -1))[0];
  const all = grid([["Sources", `${L.SOURCES.length}`, `${L.ACTIVE.length} active, 1 done`], ["Into", "3 accounts", "HDFC takes 66%"], ["Biggest source", "Salary", `${L.SALARY_SHARE}% of the year, bonus included`], ["Variable pay", inr(L.byTag("Bonus")), "March bonus and the ESPP"], ["Still on its way", inr(L.PENDING_SUM), "Dividends, into ICICI Invest", "warn"]]);
  const src = (s) => { const nx = L.nextOf(s.id), lr = L.lastReceived(s.id), es = L.received(2026, s.id), ot = es.filter((e) => L.delay(e) <= L.ON_TIME_DAYS).length; return grid([["Received 2026", inr(L.ytdOf(s.id)), L.plural(es.length, "payment")], ["Usual amount", inr(s.expectedAmount), L.MONTHS_IN_CYCLE[s.frequency] ? `${s.frequency}, ${inr(L.monthlyEq(s))} a month` : "one time"], ["Next", nx ? fmt(nx.expectedDate) : "None", nx ? (nx.status === "Pending" ? `${L.delay(nx)} days late` : L.inDays(nx.expectedDate)) : "won't repeat", nx?.status === "Pending" ? "warn" : ""], ["Last one", fmt(lr.receivedDate), `${inr(lr.amount)}, ${lr.receivedDate === lr.expectedDate ? "on the day" : `${L.delay(lr)} days after`}`], ["On time", `${ot} of ${es.length}`, `lands in ${L.ACCOUNTS[s.acct].name}`]]); };
  const ac = (a) => { const ss = L.SOURCES.filter((s) => s.acct === a && L.ytdOf(s.id)), l = acctLast(a); return grid([["Received into it", inr(L.byAcct(a)), `${L.pctOf(L.byAcct(a), L.YTD)}% of the year`], ["From", L.plural(ss.length, "source"), ss.map((s) => s.alias).join(", ")], ["Last credit", fmt(l.receivedDate), `${L.src(l.sourceId).alias} · ${inr(l.amount)}`], ["Usual month", inr(L.byAcct(a) / L.ELAPSED), "an average over 10 months"], ["Pending", inr(L.PENDING.filter((p) => p.accountId === a).reduce((t, p) => t + p.amount, 0)), a === "icici" ? "Dividends" : "nothing waiting", a === "icici" ? "warn" : ""]]); };
  const wrap = (id, inner) => `<div class="i2p-${id}" style="grid-template-columns:repeat(5,1fr);gap:20px">${inner}</div>`;
  return wrap("all", all) + L.SOURCES.map((s) => wrap(s.id, src(s))).join("") + ["hdfc", "icici", "kotak"].map((a) => wrap(a, ac(a))).join("");
}
export function i2() {
  const panel = `<div class="rt-wrap" style="position:relative;isolation:isolate;border-radius:22px;background:var(--feature-tile);border:1px solid var(--feature-tile-line);padding:26px;display:flex;flex-direction:column;gap:18px">${rings(380, 560, { first: 60, step: 30, opacity: 0.09 })}<div class="hk">Money in · Jan 1 to today</div>${bigFigure(L.YTD).replace("hbig", "hbig\" style=\"font-size:50px")}<div class="row" style="gap:8px;flex-wrap:wrap"><span class="delta">${I.up(11)} ${Math.round(L.GROWTH * 100)}% on last year</span></div><div style="display:flex;flex-direction:column;gap:14px;margin-top:auto">${HERO_FIGS.map(([k, v, s, cls]) => `<div class="between" style="align-items:flex-end;border-top:1px solid var(--feature-tile-line);padding-top:12px"><div class="hfig"><span class="k">${k}</span><span class="s" style="white-space:normal">${s}</span></div><span class="hfig"><span class="v ${cls ?? ""}">${v}</span></span></div>`).join("")}</div></div>`;
  const right = `<div style="display:flex;flex-direction:column;gap:14px;min-width:0"><div class="between"><div class="card-t">Where it flows<small>this year · pick a source or an account to follow it</small></div><label for="i2-sel-all" class="chip" style="cursor:pointer">Show everything</label></div>${flow()}<div style="border-top:1px solid var(--divider);padding-top:16px">${flowPanes()}</div><div class="row" style="gap:16px;flex-wrap:wrap"><span class="lg"><i style="background:var(--card-sapphire)"></i>Received</span><span class="lg"><i class="hat"></i>Pending, on its way</span><span class="lg" style="margin-left:auto">A ribbon is as wide as the money it carries</span></div></div>`;
  const hero = `<section class="card glass i2dir" style="padding:20px;display:grid;grid-template-columns:380px 1fr;gap:28px">${pk("i2", ["all", ...L.SOURCES.map((s) => s.id), "hdfc", "icici", "kotak"])}${panel}${right}</section>`;
  return page(`${P.greeting()}${P.attention()}${hero}${row("1.55fr 1fr", [P.monthCard({ prefix: "i2m", h: 230 }), P.comingUp({ n: 5 })])}${row("1fr 1fr", [P.rhythmCard(), P.sourcesCard({ compact: true, title: "Sources" })])}${row("1.1fr 1fr", [P.yoyCard({ w: 700, h: 290 }), P.payCalendar()])}`);
}

// =========================================================== I3 · Income wheel
const WH = 580, WCX = 290, WR0 = 104, WR1 = 236;
const rad = (deg) => (deg * Math.PI) / 180;
const polar = (a, r) => [WCX + r * Math.cos(rad(a)), WCX + r * Math.sin(rad(a))];
const sector = (a0, a1, r0, r1) => { const [x0, y0] = polar(a0, r1), [x1, y1] = polar(a1, r1), [x2, y2] = polar(a1, r0), [x3, y3] = polar(a0, r0); return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r1},${r1} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} A${r0},${r0} 0 0 0 ${x3.toFixed(1)},${y3.toFixed(1)} Z`; };
const BRIGHT = { sapphire: "oklch(0.74 0.13 258)", violet: "oklch(0.72 0.15 300)", onyx: "oklch(0.78 0.05 75)", teal: "oklch(0.76 0.1 200)", copper: "oklch(0.77 0.14 52)", ruby: "oklch(0.72 0.15 22)" };
const lite = (s) => BRIGHT[s.color];
function wheel() {
  const kk = (WR1 - WR0) / 400000, gm = 3;
  const grids = [100000, 200000, 300000].map((g) => `<circle cx="${WCX}" cy="${WCX}" r="${WR0 + g * kk}" fill="none" stroke="white" stroke-opacity="0.16" stroke-dasharray="2 5"></circle><text x="${WCX + 4}" y="${WCX - (WR0 + g * kk) + 4}" fill="white" fill-opacity="0.55" font-size="9.5" font-weight="700">${inrS(g)}</text>`).join("");
  const months = L.YEAR.map((k, i) => {
    const a0 = i * 30 - 90 + gm, a1 = i * 30 - 90 + 30 - gm, m = L.monthEntries(k);
    let r = WR0; const segs = [];
    const add = (v, fillc, extra = "") => { const hh = Math.max(3, v * kk); segs.push(`<path d="${sector(a0, a1, r, r + hh)}" ${fillc} ${extra}></path>`); r += hh + 1.5; };
    for (const s of L.SOURCES) { const v = L.ENTRIES.filter((e) => e.sourceId === s.id && e.receivedDate && L.monthKey(e.receivedDate) === k).reduce((t, e) => t + e.amount, 0); if (v) add(v, `fill="${lite(s)}"`); }
    for (const e of L.PENDING.filter((e) => L.monthKey(e.expectedDate) === k)) add(e.amount, `fill="oklch(0.9 0.1 85)" fill-opacity="0.85"`, `stroke="oklch(0.72 0.14 75)" stroke-dasharray="3 2"`);
    for (const u of L.UPCOMING.filter((u) => L.monthKey(u.expectedDate) === k)) add(u.amount, `fill="white" fill-opacity="0.1"`, `stroke="white" stroke-opacity="0.7" stroke-dasharray="3 3"`);
    return `<g class="wm wm-${k}">${`<path d="${sector(a0, a1, WR0, WR1)}" fill="white" fill-opacity="0.05"></path>`}${segs.join("")}</g>`;
  }).join("");
  const ta = (L.dayOfYear(L.TODAY) / 365) * 360 - 90, [hx0, hy0] = polar(ta, WR0 - 12), [hx1, hy1] = polar(ta, WR1 + 8);
  const hand = `<line x1="${hx0}" y1="${hy0}" x2="${hx1}" y2="${hy1}" stroke="white" stroke-width="1.5" stroke-dasharray="1 4" stroke-linecap="round"></line><circle cx="${hx1}" cy="${hy1}" r="4" fill="var(--on-card-lime)"></circle>`;
  const labs = L.YEAR.map((k, i) => { const [x, y] = polar(i * 30 - 75, WR1 + 28); return `<label for="i3-m-${k}" class="mchip wl-${k}" style="position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);width:auto;padding:4px 9px;border-radius:999px;font-size:11px">${L.monName(k)}</label>`; }).join("");
  const css = `<style>.i3dir .wm { opacity: 0.78; transition: opacity 240ms, filter 240ms; } ${L.YEAR.map((k) => `.i3dir:has(#i3-m-${k}:checked) .wm-${k} { opacity: 1; filter: drop-shadow(0 0 6px oklch(1 0 0 / 0.35)); } .i3dir:has(#i3-m-${k}:checked) label.wl-${k} { background: var(--on-card-lime); color: var(--ink); } .i3dir:has(#i3-m-${k}:checked) .mp-${k} { display: flex; }`).join(" ")}</style>`;
  const centre = `<div style="position:absolute;left:${WCX - 88}px;top:${WCX - 62}px;width:176px;text-align:center;display:flex;flex-direction:column;gap:4px;align-items:center"><span class="hk" style="color:var(--on-card-muted)">Received in 2026</span><span style="font-size:27px;font-weight:800;letter-spacing:-0.02em;line-height:1.1">${inr(L.YTD)}</span><span class="delta" style="background:oklch(1 0 0 / 0.14);color:var(--on-card-lime)">${I.up(10)} ${Math.round(L.GROWTH * 100)}% on last year</span><span style="font-size:11.5px;font-weight:600;color:var(--on-card-muted)">${inr(L.AVG_MONTH)} a usual month</span></div>`;
  return `${css}<div style="position:relative;width:${WH}px;height:${WH}px;flex-shrink:0"><svg width="${WH}" height="${WH}" viewBox="0 0 ${WH} ${WH}" style="position:absolute;inset:0"><circle cx="${WCX}" cy="${WCX}" r="${WR0 - 8}" fill="oklch(0 0 0 / 0.16)"></circle>${grids}${months}${hand}</svg>${labs}${centre}</div>`;
}
function monthPane(k) {
  const m = L.monthEntries(k), future = k > L.NOW_KEY, rec = m.filter((e) => e.receivedDate).reduce((t, e) => t + e.amount, 0), pend = m.filter((e) => e.status === "Pending").reduce((t, e) => t + e.amount, 0), up = m.filter((e) => e.status === "Upcoming").reduce((t, e) => t + e.amount, 0);
  const expected = rec + pend + up, pctDone = expected ? (rec / expected) * 100 : 0;
  const rows = m.sort((a, b) => (L.cashDate(a) < L.cashDate(b) ? -1 : 1)).map((e) => { const s = L.src(e.sourceId); return `<div class="between" style="padding:9px 0;border-top:1px solid var(--divider)"><span class="row" style="gap:11px">${mono(s, 30)}<span><b style="font-size:13px;display:block">${s.alias}${e.tag === "Bonus" && s.id === "salary" ? " bonus" : ""}</b><small class="muted" style="font-size:11.5px;font-weight:600">${e.status === "Received" ? `landed ${fmt(e.receivedDate)}` : `expected ${fmt(e.expectedDate)}`} · ${L.ACCOUNTS[e.accountId].name}</small></span></span><span class="row" style="gap:12px"><b style="font-size:14px">${inr(e.amount)}</b><span style="width:128px;text-align:right">${e.status === "Upcoming" ? `<span class="pill" style="background:oklch(1 0 0 / 0.14);color:var(--fg)">${L.inDays(e.expectedDate)}</span>` : `${P.stateChip(e)}`}</span></span></div>`; }).join("");
  return `<div class="mp-${k} mpane" style="flex-direction:column;gap:14px"><div class="between"><div><div class="hk" style="color:var(--on-card-muted)">${L.monFull(k)} ${k.slice(0, 4)}${k === L.NOW_KEY ? " · this month" : future ? " · to come" : ""}</div><div style="font-size:40px;font-weight:800;letter-spacing:-0.02em;line-height:1.1;margin-top:4px">${inr(future ? up : rec)}</div></div><div style="text-align:right;font-size:12.5px;font-weight:600;color:var(--on-card-muted);line-height:1.5">${future ? `expected from ${L.plural(m.length, "source")}` : pend ? `<b style="color:oklch(0.9 0.12 85)">${inr(pend)} pending</b><br>of ${inr(expected)} expected` : `all of the ${inr(expected)} expected<br>has landed`}</div></div><div class="pbar" style="background:oklch(1 0 0 / 0.16)"><span class="rt" style="display:block;height:100%;width:${future ? 0 : pctDone}%;background:var(--on-card-lime);border-radius:inherit"></span></div><div>${rows || '<div class="muted" style="padding:20px 0">Nothing expected this month.</div>'}</div><div class="between" style="font-size:12px;font-weight:600;color:var(--on-card-muted)"><span>${future ? "From each source's schedule" : `${inr(Math.abs(rec - L.AVG_MONTH))} ${rec >= L.AVG_MONTH ? "above" : "below"} a usual month`}</span><span style="display:inline-flex;align-items:center;gap:5px;color:var(--on-card-lime);font-weight:800">All of ${L.monFull(k)} in Entries ${I.arrowR(11)}</span></div></div>`;
}
export function i3() {
  const stage = `<section class="hero stage-deep i3dir" style="padding:34px 34px 30px;display:grid;grid-template-columns:${WH}px 1fr;gap:44px;align-items:center">${rings(1416, 620, { first: 80, step: 34, stroke: "white", opacity: 0.07 })}${pk("i3", L.YEAR.map((k) => k), L.NOW_KEY).replace(/id="i3-sel-/g, 'id="i3-m-').replace(/name="i3-sel"/g, 'name="i3-m"')}${wheel()}<div style="display:flex;flex-direction:column;gap:22px;min-width:0"><div class="row" style="gap:36px;flex-wrap:wrap">${HERO_FIGS.map(([k, v, s, cls]) => `<div class="hfig"><span class="k" style="color:var(--on-card-muted)">${k}</span><span class="v" style="color:${cls === "warn" ? "oklch(0.9 0.12 85)" : "var(--fg)"}">${v}</span><span class="s" style="color:var(--on-card-muted)">${s}</span></div>`).join("")}</div><div style="border-radius:22px;background:oklch(0 0 0 / 0.18);border:1px solid oklch(1 0 0 / 0.14);padding:22px">${L.YEAR.map(monthPane).join("")}</div><div class="row" style="gap:16px;flex-wrap:wrap;font-size:12px;font-weight:600;color:var(--on-card-muted)"><span>Each spoke is a month, as tall as what landed, stacked by source</span><span class="lg" style="color:var(--on-card-muted)"><i class="hat"></i>Pending</span><span class="lg" style="color:var(--on-card-muted)"><i class="dash" style="border-color:var(--on-card-muted)"></i>Expected</span></div></div></section>`;
  return page(`${P.greeting()}${P.attention()}${stage}${row("1.5fr 1fr", [P.sourcesCard({ compact: true }), P.payCalendar()])}${row("1fr 1fr 1fr", [P.landsCard(), P.mixCard(), P.variableCard()])}${row("1.4fr 1fr", [P.yoyCard({ w: 760, h: 300 }), P.rhythmCard()])}`);
}

// =========================================================== I4 · Year in columns
export function i4Hero(withClass = true, { detail = false, def = "all", menu = false } = {}) {
  const ids = ["all", ...L.SOURCES.map((s) => s.id)];
  const css = `<style>.i4dir:not(:has(#i4-sel-all:checked)) .v-mview-src .mseg { opacity: 0.16; } ${L.SOURCES.map((s) => `.i4dir:has(#i4-sel-${s.id}:checked) .v-mview-src .mseg.s-${s.id} { opacity: 1; } .i4dir:has(#i4-sel-${s.id}:checked) label.ch-${s.id} { background: var(--ink); color: var(--on-ink); }`).join(" ")} .i4dir:has(#i4-sel-all:checked) label.ch-all { background: var(--ink); color: var(--on-ink); } .i4dir [class*="i4p-"] { display: none; } ${ids.map((id) => `.i4dir:has(#i4-sel-${id}:checked) .i4p-${id} { display: flex; }`).join(" ")} .i4dir [class*="i4f-"] { display: none; } ${ids.map((id) => `.i4dir:has(#i4-sel-${id}:checked) .i4f-${id} { display: block; }`).join(" ")}</style>`;
  const acts = (id) => {
    if (!detail) return "";
    const open = menu && id === def;
    const more = `<span style="position:relative;display:inline-flex">${L.iconBtn(I.more(), "More", "btn-sm")}${open ? `<div class="menu" style="left:0;right:auto"><span>${I.pencil(13)} Edit source</span><span>Open its entries</span><span>${id === "all" ? "" : L.src(id).status === "Active" ? "Mark inactive" : "Reactivate"}</span><span class="dng">Delete source</span></div>` : ""}</span>`;
    if (id === "all") return `<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:6px">${btn("Record income", { kind: "primary", icon: I.plus(12), cls: "btn-sm" })}${btn("Add source", { kind: "soft", icon: I.plus(12), cls: "btn-sm" })}<span class="link" style="margin-left:6px">View all entries${I.arrowR(12)}</span></div>`;
    const sc = L.src(id), nx = L.nextOf(id), pend = nx && nx.status === "Pending", off = sc.status === "Inactive";
    const primary = off ? btn("Reactivate", { kind: "accent", icon: I.check(12), cls: "btn-sm" }) : pend ? btn("Mark received", { kind: "accent", icon: I.check(12), cls: "btn-sm" }) : btn("Record income", { kind: "primary", icon: I.plus(12), cls: "btn-sm" });
    return `<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:6px">${primary}${btn("Edit source", { kind: "soft", icon: I.pencil(12), cls: "btn-sm" })}${more}<span class="link" style="margin-left:6px">View ${sc.alias} entries${I.arrowR(12)}</span></div>`;
  };
  const facts = (id) => {
    if (id === "all") return `<div class="i4f-all">${figs(HERO_FIGS)}</div>`;
    const sc = L.src(id), nx = L.nextOf(id), lr = L.lastReceived(id), es = L.received(2026, id), ot = es.filter((e) => L.delay(e) <= L.ON_TIME_DAYS).length, pend = nx && nx.status === "Pending";
    return `<div class="i4f-${id}">${figs([["Usual amount", inr(sc.expectedAmount), L.MONTHS_IN_CYCLE[sc.frequency] ? `${sc.frequency} · ${inr(L.monthlyEq(sc))} a month` : "one time"], ["Next", nx ? fmt(nx.expectedDate) : "None", nx ? (pend ? `${L.delay(nx)} days late` : L.inDays(nx.expectedDate)) : "won't repeat", pend ? "warn" : ""], ["Last paid", lr ? fmt(lr.receivedDate) : "–", lr ? `${inr(lr.amount)}, ${L.delay(lr) <= 0 ? "on the day" : `${L.delay(lr)} days after`}` : ""], ["Lands in", L.ACCOUNTS[sc.acct].name, "usually"], ["On time", `${ot} of ${es.length}`, sc.status === "Inactive" ? "inactive" : "this year"]])}</div>`;
  };
  const pane = (id) => {
    const s = L.src(id), grid = (items) => `<div class="row" style="gap:36px;align-items:flex-start">${items.map(([k, v, sub, cls]) => `<div class="hfig"><span class="k">${k}</span><span class="v ${cls ?? ""}">${v}</span><span class="s">${sub}</span></div>`).join("")}</div>`;
    if (id === "all") return `<div class="i4p-all" style="flex-direction:column;gap:12px"><div class="hk">Money in · every source</div><div class="row" style="gap:28px;align-items:flex-end;flex-wrap:wrap">${bigFigure(L.YTD)}<span class="delta" style="margin-bottom:10px">${I.up(11)} ${Math.round(L.GROWTH * 100)}% on this time last year</span></div>${acts("all")}</div>`;
    const nx = L.nextOf(id);
    return `<div class="i4p-${id}" style="flex-direction:column;gap:12px"><div class="hk">${s.name} · ${s.category} · ${s.frequency}</div><div class="row" style="gap:28px;align-items:flex-end;flex-wrap:wrap">${bigFigure(L.ytdOf(id))}<span class="hsub" style="margin-bottom:10px">${L.pctOf(L.ytdOf(id), L.YTD)}% of the year · ${L.plural(L.received(2026, id).length, "payment")} · usually ${inr(s.expectedAmount)} into ${L.ACCOUNTS[s.acct].name}${nx ? ` · next ${fmt(nx.expectedDate)}` : ""}</span></div>${acts(id)}</div>`;
  };
  const t = P.tgl("i4", "mview", [["src", "By source"], ["tag", "Regular & bonus"]]);
  const chips = ids.map((id) => `<label for="i4-sel-${id}" class="chip ch-${id}" style="cursor:pointer">${id === "all" ? "All sources" : `<i style="background:${col(L.src(id))}"></i>${L.src(id).alias}`}</label>`).join("");
  const hero = `<section class="card glass${withClass ? " i4dir" : ""}" style="padding:26px;gap:20px;border-radius:28px">${css}${t.css}${t.radios}${pk("i4", ids, def)}<div class="between" style="align-items:flex-start;gap:32px"><div style="min-height:${detail ? 178 : 130}px">${ids.map(pane).join("")}</div><div style="display:flex;flex-direction:column;gap:14px;align-items:flex-end">${t.ui}${detail ? ids.map(facts).join("") : figs(HERO_FIGS)}</div></div><div class="row" style="gap:8px;flex-wrap:wrap">${chips}</div><div class="v-mview-src" style="--d:block">${P.monthLegend("src")}</div><div class="v-mview-tag" style="--d:block">${P.monthLegend("tag")}</div>${P.variants(t, (k) => P.monthCols({ h: 310, mode: k }))}<div class="card-note">A month counts what landed in it, by the day it was received. Pick a source to light up its part of every month.</div></section>`;
  return hero;
}
export function i4() {
  const hero = i4Hero();
  return page(`${P.greeting()}${P.attention()}${hero}${row("1fr 1.35fr 1fr", [P.mixCard(), P.rhythmCard(), P.comingUp({ n: 5, filter: false })])}${P.sourcesCard()}${row("1.4fr 1fr", [P.yoyCard({ w: 760, h: 280 }), P.landsCard()])}`);
}
