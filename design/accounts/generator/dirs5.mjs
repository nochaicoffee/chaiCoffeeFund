// Directions U–Y, round 4: the green stage Prathik liked in A, with selectors that don't scroll or turn
// (the turning covers belong to Subscriptions), and the selection in the picked account's own colour.
// U Split bar, V Account list, W Passbooks on the desk, X Index tabs, Y Ticker.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as D2 from "./dirs2.mjs";
import * as D3 from "./dirs3.mjs";
import * as D4 from "./dirs4.mjs";
const { inr, signed, inrS, fmt, fmtY, monName, monYear, I, btn, iconBtn, rings, grad, mono, desktop, phone } = L;
const { IDS, FACTS, ORDER, panes, greenStage, selSoft, selTint, hue } = P;

const two = (a, b, ratio = "1fr 1fr") => `<div style="display:grid;grid-template-columns:${ratio.split(" ").map((x) => `minmax(0,${x})`).join(" ")};gap:20px;align-items:stretch">${a}${b}</div>`;
const card = (inner, style = "") => `<section class="card glass" style="${style}">${inner}</section>`;
const head = (title, sub = "", right = "") => `<div class="card-h"><span class="card-t">${title}${sub ? `<small>${sub}</small>` : ""}</span>${right}</div>`;
const MONO = "font-family:'JetBrains Mono',ui-monospace,monospace";
const ACTIVE = ORDER.filter((a) => L.isOn(a));
const t = (iso) => Date.parse(`${iso}T00:00:00Z`);
const stat = (k, v, s = "") => `<div class="hstat"><span class="k">${k}</span><b class="v">${v}</b>${s ? `<span class="s">${s}</span>` : ""}</div>`;
/** The four figures under a green hero, for All or an account. */
export function stats(f) {
  if (f.all) return [stat("This month", signed(f.month.delta), "since Sep 30"), stat("High point", inr(f.range.hi.v), monYear(f.range.hi.k)), stat("Out to bills", inr(f.month.out), "in October · worked out"), stat("Up to date", `${f.fresh} of ${f.count}`, `${f.staleList[0].name}: ${fmt(L.latest(f.staleList[0].id).date)}`)];
  if (!f.on) return [stat("Was open", `${fmtY(f.opened).slice(-4)} – ${fmtY(f.closedOn).slice(-4)}`), stat("Highest", inr(f.range.hi.v), monYear(f.range.hi.k)), stat("Balances", `${f.snaps} recorded`), stat("Closed", fmtY(f.closedOn), "final balance ₹0")];
  return [stat("Since Jan 1", signed(f.sinceJan), `from ${inr(L.yearStart(f.id))}`), stat("Share", L.pct(f.balance, L.TOTAL), `of ${inr(L.TOTAL)}`), stat("Out to bills", inr(f.interval?.out ?? 0), `since ${fmt(f.prev.date)} · worked out`), f.stale ? stat("Updated", `<span style="color:oklch(0.9 0.11 85)">${L.ago(f.asOf)}</span>`, "older than a month") : stat("Updated", fmt(f.asOf), `${f.snaps} balances`)];
}
export const statRow = (f, { ph = false } = {}) => `<div style="display:grid;grid-template-columns:repeat(${ph ? 2 : 4},minmax(0,1fr));gap:${ph ? "12px 16px" : "0"}">${stats(f).map((s, i) => `<div style="${ph ? "" : `padding:0 20px;${i ? "border-left:1px solid var(--divider)" : "padding-left:0"}`}">${s}</div>`).join("")}</div>`;
export const bigNumber = (f, { ph = false, size } = {}) => `<span class="eyebrow">${f.all ? `Everything · ${f.count} active accounts` : `${L.purposeName(f.purpose)} · ${f.bank} · ${f.on ? f.type : "Closed"}`}</span><b style="display:block;font-size:${size ?? (ph ? 38 : 56)}px;font-weight:800;letter-spacing:-0.02em;line-height:1.05;margin-top:6px">${f.on ? inr(f.balance) : "₹0"}</b><span style="display:block;margin-top:6px;font-size:${ph ? 13 : 14.5}px;font-weight:700;color:var(--muted)">${f.all ? "" : `<b style="color:var(--fg)">${f.name}</b> · `}${P.whenLine(f)}</span>`;
export const heroActions = (f) => `<div class="row" style="gap:8px;flex-wrap:wrap">${P.actions(f)}</div>`;
/** Buttons on the green stage take the pick's colour, so the selection shows there too. */
export const pickBtnCss = (dsel, id) => `${dsel} .gpick .btn-primary { background: ${selSoft(id)}; color: ${id === "all" ? "var(--card-emerald-to)" : `var(--card-${hue(id)}-to)`}; }`;

// ================= U · Split bar =================
// The bar of what each account holds is the selector: each segment as wide as its balance, the picked one lifted in its colour.
function splitBar(prefix, { ph = false } = {}) {
  const segs = ACTIVE.map((a) => { const f = FACTS[a.id], share = f.balance / L.TOTAL, small = share < 0.07; return `<label for="${prefix}-sel-${a.id}" class="us us-${a.id}" style="cursor:pointer;flex:${Math.max(share, ph ? 0.12 : 0.06)} 1 0;min-width:0;height:${ph ? 64 : 92}px;border-radius:${ph ? 12 : 16}px;background:${grad(a.color, 150)};position:relative;isolation:isolate;overflow:hidden;padding:${ph ? "8px" : small ? "12px 10px" : "14px 16px"};display:flex;flex-direction:column;justify-content:space-between;color:var(--on-card);transition:transform 220ms var(--ease-out), opacity 220ms, box-shadow 220ms;box-shadow:0 8px 18px oklch(0 0 0 / 0.25)">${rings(300, 100, { stroke: "var(--rings-light)", opacity: 0.08, count: 8 })}<div class="between" style="gap:6px"><b style="font-size:${ph ? 11 : small ? 12 : 13.5}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ph || small ? a.bank.split(" ")[0] : a.name}</b>${ph || small ? "" : `<span style="font-size:11px;font-weight:700;color:var(--on-card-faint)">${L.pct(f.balance, L.TOTAL)}</span>`}</div><div><b style="display:block;font-size:${ph ? 12 : small ? 13 : 17}px;font-weight:800;white-space:nowrap">${ph || small ? inrS(f.balance) : inr(f.balance)}</b>${ph || small ? "" : `<span style="font-size:11px;font-weight:700;color:${f.stale ? "oklch(0.9 0.11 85)" : "var(--on-card-faint)"}">${f.stale ? `${I.clock(9)} ${fmt(f.asOf)} · ${L.daysBetween(f.asOf, L.TODAY)} days` : `Updated ${fmt(f.asOf)}`}</span>`}</div></label>`; }).join("");
  const yes = FACTS.yes;
  return `<div class="row" style="gap:${ph ? 8 : 12}px;align-items:stretch"><label for="${prefix}-sel-all" class="us us-all" style="cursor:pointer;flex:0 0 ${ph ? 56 : 116}px;border-radius:${ph ? 12 : 16}px;background:oklch(1 0 0 / 0.1);border:1.5px solid oklch(1 0 0 / 0.25);display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;text-align:center;transition:box-shadow 220ms">${I.accounts(ph ? 14 : 18)}<b style="font-size:${ph ? 10.5 : 13}px">All</b>${ph ? "" : `<span style="font-size:11px;font-weight:700;color:var(--muted)">${L.ACTIVE.length} accounts</span>`}</label><div class="usbar row" style="gap:${ph ? 4 : 6}px;flex:1;min-width:0;align-items:stretch;border-radius:18px;transition:box-shadow 220ms">${segs}</div><label for="${prefix}-sel-yes" class="us us-yes" style="cursor:pointer;flex:0 0 ${ph ? 40 : 92}px;border-radius:${ph ? 12 : 16}px;border:1.5px dashed oklch(1 0 0 / 0.3);display:flex;flex-direction:column;justify-content:center;align-items:center;gap:3px;text-align:center;font-size:${ph ? 9.5 : 11}px;font-weight:700;color:var(--muted);transition:box-shadow 220ms">${I.lock(ph ? 10 : 12)}${ph ? "" : `<span>${yes.name}</span><span>closed</span>`}</label></div>`;
}
const uSel = (dsel, id) => `${dsel} .us-${id} { transform: translateY(-6px); box-shadow: 0 0 0 3px oklch(0.16 0.05 160 / 0.7), 0 0 0 6px ${selSoft(id)}, 0 16px 28px oklch(0 0 0 / 0.35); }${id === "all" ? "" : ` ${dsel} .usbar .us:not(.us-${id}) { opacity: 0.42; }`}${pickBtnCss(dsel, id)}`;
function uHero(prefix, { ph = false } = {}) {
  return greenStage(`<div class="gpick" style="display:flex;flex-direction:column;gap:${ph ? 14 : 22}px"><div class="between" style="align-items:flex-end;gap:16px;flex-wrap:wrap"><div>${panes((f) => bigNumber(f, { ph }))}</div>${ph ? "" : panes((f) => heroActions(f))}</div>${splitBar(prefix, { ph })}<div style="padding-top:${ph ? 4 : 8}px">${panes((f) => statRow(f, { ph }))}</div>${ph ? panes((f) => heroActions(f)) : ""}</div>`, { ph, pad: ph ? "18px 14px" : "28px 30px 30px" });
}
export function uDesktop() {
  const pk = P.picker("u", uSel);
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${uHero("u")}${C.chartCard("bridge", "u", { h: 330 })}${two(P.historyCard("u", { n: 5 }), P.outCard("u"))}${pk.close}` });
}
export function uPhone() {
  const pk = P.picker("up", uSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${uHero("up", { ph: true })}${C.chartCard("bridge", "up", { ph: true })}${P.historyCard("up", { n: 4, ph: true })}${pk.close}` });
}

// ================= V · Account list =================
// The green stage split in two: the pick's figure and its year as a white line on the left, every account as a row on the right.
export function whiteLine(f, { w = 820, h = 220, ph = false, key = "", mono = false } = {}) {
  const pts = []; for (let d = "2026-01-01"; d < L.TODAY; d = L.addDays(d, 5)) pts.push(d); pts.push(L.TODAY);
  const vals = pts.map((d) => (f.all ? L.totalOn(d) : L.balanceOn(f.id, d) ?? 0)), hi = Math.max(...vals), lo = Math.min(...vals), span = hi - lo || hi || 1;
  const padB = 22, X = (d) => ((t(d) - t("2026-01-01")) / (t(L.TODAY) - t("2026-01-01"))) * (w - 12) + 6, Y = (v) => 14 + (1 - (v - (lo - span * 0.6)) / (span * 1.75)) * (h - 14 - padB);
  const line = pts.map((d, i) => `${i ? "L" : "M"}${X(d).toFixed(1)},${Y(vals[i]).toFixed(1)}`).join(" ");
  const col = f.all || mono ? "white" : selSoft(f.id);
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${f.name}: this year"><defs><linearGradient id="wl-${key}-${f.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:white;stop-opacity:0.26"></stop><stop offset="1" style="stop-color:white;stop-opacity:0"></stop></linearGradient></defs><path d="${line} L${X(L.TODAY)},${h - padB} L6,${h - padB} Z" fill="url(#wl-${key}-${f.id})"></path><path d="${line}" fill="none" stroke="${col}" stroke-width="2.6" stroke-linejoin="round" style="filter:drop-shadow(0 0 6px ${col})"></path><circle cx="${X(L.TODAY)}" cy="${Y(vals.at(-1))}" r="5" fill="${col}"></circle>${L.YEAR.map((k) => `<text x="${X(`${k}-01`)}" y="${h - 4}" text-anchor="middle" font-size="10.5" font-weight="700" fill="oklch(1 0 0 / 0.55)">${ph && Number(k.slice(5)) % 3 !== 1 ? "" : monName(k)}</text>`).join("")}</svg>`;
}
function vList(prefix, { ph = false } = {}) {
  return IDS.map((id) => { const f = FACTS[id]; return `<label for="${prefix}-sel-${id}" class="vr vr-${id}" style="cursor:pointer;display:grid;grid-template-columns:30px 1fr auto;gap:12px;align-items:center;padding:${ph ? "9px 10px" : "11px 12px"};border-radius:14px;transition:background 200ms, box-shadow 200ms">${f.all ? `<span style="width:30px;height:30px;border-radius:9px;background:oklch(1 0 0 / 0.16);display:flex;align-items:center;justify-content:center">${I.accounts(15)}</span>` : mono(f.a, 30)}<span style="min-width:0"><b style="display:block;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.short}</b><span style="font-size:11.5px;font-weight:600;color:${f.stale ? "oklch(0.9 0.11 85)" : "var(--muted)"}">${f.all ? `${f.count} active · ${signed(f.sinceJan)} this year` : !f.on ? "closed Mar 31" : f.stale ? `${I.clock(9)} ${fmt(f.asOf)} · ${L.daysBetween(f.asOf, L.TODAY)} days` : `updated ${fmt(f.asOf)} · ${signed(f.chg)}`}</span></span><b class="num" style="font-size:${ph ? 13.5 : 15}px">${f.on ? inr(f.balance) : "₹0"}</b></label>`; }).join("");
}
const vSel = (dsel, id) => `${dsel} .vr-${id} { background: ${id === "all" ? "oklch(1 0 0 / 0.16)" : selTint(id, 60)}; box-shadow: inset 4px 0 0 ${selSoft(id)}, 0 0 0 1px ${selSoft(id)}; }${pickBtnCss(dsel, id)}`;
function vHero(prefix, { ph = false } = {}) {
  if (ph) return greenStage(`<div class="gpick" style="display:flex;flex-direction:column;gap:12px">${panes((f) => bigNumber(f, { ph }))}${panes((f) => whiteLine(f, { w: 330, h: 150, ph, key: prefix }))}<div style="display:flex;flex-direction:column;gap:2px;padding:6px;border-radius:18px;background:oklch(0 0 0 / 0.16)">${vList(prefix, { ph })}</div>${panes((f) => heroActions(f))}</div>`, { ph });
  return greenStage(`<div class="gpick" style="display:grid;grid-template-columns:minmax(0,1fr) 430px;gap:28px;align-items:stretch"><div style="display:flex;flex-direction:column;gap:18px">${panes((f) => bigNumber(f))}${panes((f) => whiteLine(f, { key: prefix }))}${panes((f) => statRow(f))}${panes((f) => heroActions(f))}</div><div style="display:flex;flex-direction:column;gap:2px;padding:8px;border-radius:22px;background:oklch(0 0 0 / 0.18);border:1px solid oklch(1 0 0 / 0.1)">${vList(prefix)}<div class="row" style="gap:8px;padding:10px 12px 4px;margin-top:auto">${btn("Add account", { kind: "soft", cls: "btn-sm", icon: I.plus(11) })}</div></div></div>`, { pad: "28px 30px" });
}
export function vDesktop() {
  const pk = P.picker("v", vSel);
  const diary = card(`${head("Lately", "what happened in your accounts, newest first")}${D3.feed("v", { limit: 12 })}`, "gap:6px");
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${vHero("v")}<div style="display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:20px;align-items:stretch">${diary}<div class="stack-col">${D3.comingUp()}${P.outCard("v")}</div></div>${pk.close}` });
}
export function vPhone() {
  const pk = P.picker("vp", vSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${vHero("vp", { ph: true })}${D3.comingUp({ ph: true })}${card(`${head("Lately")}${D3.feed("vp", { ph: true, limit: 8 })}`, "padding:16px;gap:6px")}${pk.close}` });
}

// ================= W · Passbooks on the desk =================
// The kept passbook, on the green: a closed passbook per account stands in a row; the picked one rises and lies open below.
function bookCover(f, { ph = false } = {}) {
  const w = ph ? 86 : 132, h = ph ? 118 : 178, c = f.all ? "emerald" : f.color;
  return `<div style="position:relative;width:${w}px;height:${h}px;border-radius:6px 12px 12px 6px;background:${f.all ? `linear-gradient(160deg, oklch(0.32 0.03 160), oklch(0.18 0.02 160))` : grad(c, 160)};box-shadow:inset 7px 0 0 oklch(0 0 0 / 0.25), inset 9px 0 0 oklch(1 0 0 / 0.08), 0 14px 26px oklch(0 0 0 / 0.35);color:var(--on-card);display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:${ph ? "12px 6px 10px 12px" : "18px 10px 14px 18px"};overflow:hidden;isolation:isolate;${f.on ? "" : "filter:grayscale(0.85)"}">${rings(140, 190, { stroke: "var(--rings-light)", opacity: 0.07, count: 8 })}
    <span style="font-size:${ph ? 7.5 : 9}px;font-weight:800;letter-spacing:0.14em;color:oklch(0.86 0.09 85)">${f.all ? "ALL ACCOUNTS" : "PASSBOOK"}</span>
    <span style="width:${ph ? 30 : 46}px;height:${ph ? 30 : 46}px;border-radius:50%;border:1.5px solid oklch(0.86 0.09 85 / 0.8);display:flex;align-items:center;justify-content:center;font-size:${ph ? 13 : 19}px;font-weight:800;color:oklch(0.9 0.08 85)">${f.all ? I.accounts(ph ? 13 : 18) : L.esc(f.bank[0])}</span>
    <span style="text-align:center"><b style="display:block;font-size:${ph ? 10 : 12.5}px;line-height:1.25">${f.short}</b><span style="display:block;font-size:${ph ? 9.5 : 11.5}px;font-weight:800;margin-top:3px">${f.on ? inrS(f.balance) : "closed"}</span></span>
    ${f.stale ? `<span style="position:absolute;right:${ph ? 4 : 8}px;top:${ph ? 4 : 8}px;width:${ph ? 8 : 10}px;height:${ph ? 8 : 10}px;border-radius:50%;background:var(--warning);box-shadow:0 0 0 3px oklch(0.72 0.14 75 / 0.3)"></span>` : ""}</div>`;
}
const wSel = (dsel, id) => `${dsel} .wb-${id} { transform: translateY(-14px); } ${dsel} .wb-${id} > div { box-shadow: inset 7px 0 0 oklch(0 0 0 / 0.25), 0 0 0 3px oklch(0.16 0.05 160 / 0.7), 0 0 0 6px ${selSoft(id)}, 0 22px 34px oklch(0 0 0 / 0.4) !important; }${pickBtnCss(dsel, id)}`;
function wHero(prefix, { ph = false } = {}) {
  const books = IDS.map((id) => `<label for="${prefix}-sel-${id}" class="wb-${id}" style="cursor:pointer;flex-shrink:0;transition:transform 260ms var(--ease-out)">${bookCover(FACTS[id], { ph })}</label>`).join("");
  const shelf = `<div style="display:flex;gap:${ph ? 10 : 22}px;justify-content:${ph ? "flex-start" : "center"};align-items:flex-end;padding:${ph ? "16px 14px 10px" : "22px 0 16px"};${ph ? "overflow-x:auto;margin:0 -14px;scrollbar-width:none" : ""}">${books}</div><div style="height:10px;border-radius:999px;background:oklch(0 0 0 / 0.22);margin:${ph ? "0 -4px" : "-6px 40px 0"};filter:blur(4px)"></div>`;
  const page = `<div class="on-paper" style="--pb-page:oklch(0.975 0.014 165);position:relative;isolation:isolate;padding:${ph ? "16px 14px" : "26px 32px"};border-radius:${ph ? 14 : 18}px;background:var(--pb-page);background-image:repeating-linear-gradient(180deg, transparent 0 33px, oklch(0.6 0.05 170 / 0.14) 33px 34px);box-shadow:0 20px 40px oklch(0 0 0 / 0.3);display:flex;flex-direction:column;gap:12px">${rings(900, 560, { stroke: "oklch(0.5 0.08 170)", opacity: 0.06, first: 30, step: 14, dx: -450, dy: -140 })}${panes((f) => D2.rightPage(f, { ph }), {}, { flex: true })}</div>`;
  return greenStage(`<div class="gpick" style="display:flex;flex-direction:column;gap:${ph ? 10 : 14}px"><div class="between" style="gap:12px;flex-wrap:wrap"><span class="card-t" style="color:var(--fg)">Your passbooks<small style="color:var(--muted)">pick one off the desk and it lies open below</small></span>${ph ? "" : `<span class="row" style="gap:8px">${btn("Update passbook", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}${btn("Open a new one", { kind: "soft", cls: "btn-sm", icon: I.plus(11) })}</span>`}</div>${shelf}${page}</div>`, { ph, pad: ph ? "16px 14px" : "24px 30px 30px" });
}
export function wDesktop() {
  const pk = P.picker("w", wSel);
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${wHero("w")}${card(`${head("As printed", "each recorded balance, this year · a step until the next entry")}${panes((f) => D2.printedTrend(f, { w: 1368, h: 230 }))}`, "gap:10px")}${pk.close}` });
}
export function wPhone() {
  const pk = P.picker("wp", wSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${wHero("wp", { ph: true })}${card(`${head("As printed")}${panes((f) => D2.printedTrend(f, { w: 330, h: 170, ph: true }))}`, "padding:16px;gap:10px")}${pk.close}` });
}

// ================= X · Index tabs =================
// A green folder with an index tab per account; the picked tab joins the page in front, which holds its month as a T-account.
function xTabs(prefix, { ph = false } = {}) {
  return `<div style="display:flex;gap:${ph ? 4 : 6}px;align-items:flex-end;padding:0 ${ph ? 4 : 18}px;${ph ? "overflow-x:auto;margin:0 -14px;padding:0 14px;scrollbar-width:none" : ""}">${IDS.map((id) => { const f = FACTS[id]; return `<label for="${prefix}-sel-${id}" class="xt xt-${id}" style="cursor:pointer;flex:${ph ? "0 0 auto" : "1 1 0"};min-width:${ph ? 74 : 0}px;height:${ph ? 40 : 52}px;border-radius:14px 14px 0 0;padding:${ph ? "7px 9px" : "9px 14px"};background:${f.all ? "oklch(1 0 0 / 0.14)" : `color-mix(in srgb, var(--card-${f.color}) 55%, oklch(0.2 0.03 160))`};color:var(--on-card);display:flex;align-items:center;gap:8px;transform:translateY(${ph ? 6 : 10}px);opacity:0.78;transition:transform 220ms var(--ease-out), opacity 220ms, background 220ms;${f.on ? "" : "filter:grayscale(0.8)"}"><b style="font-size:${ph ? 10.5 : 12.5}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ph ? (f.all ? "All" : f.a.bank.split(" ")[0]) : f.short}</b>${ph ? "" : `<span style="margin-left:auto;font-size:11px;font-weight:700;opacity:0.8;white-space:nowrap">${f.on ? inrS(f.balance) : "closed"}</span>`}${f.stale ? `<span style="width:7px;height:7px;border-radius:50%;background:var(--warning);flex-shrink:0"></span>` : ""}</label>`; }).join("")}</div>`;
}
function xPage(f, prefix, { ph = false } = {}) {
  if (f.all) return `<div style="display:flex;flex-direction:column;gap:18px"><div class="between"><b style="font-size:16px">All accounts · September 2026</b>${L.derivedTag("Worked out")}</div>${D3.trialBalance("2026-09", { ph })}<div style="border-top:1px solid var(--divider);padding-top:14px">${D4.summaryTable(prefix, { ph })}</div></div>`;
  if (!f.on) return `<div style="display:flex;flex-direction:column;gap:12px"><b style="font-size:16px">${f.name} · closed ${fmtY(f.closedOn)}</b><p class="card-note" style="font-size:13px">Its pages stay in the folder. It counts in totals up to the day it closed.</p>${D4.monthEnds(f, { w: ph ? 320 : 1290, h: 160, ph })}<div class="row" style="gap:8px">${P.actions(f)}</div></div>`;
  return `<div style="display:grid;grid-template-columns:${ph ? "1fr" : "minmax(0,1fr) minmax(0,1.25fr)"};gap:24px;align-items:start">${D3.tAccount(prefix, f.a, "2026-09", { ph }).replace(/<label for="[^"]*" class="tac tac-[a-z]+" style="cursor:pointer;/, '<div style="').replace(/<\/label>$/, "</div>")}<div style="display:flex;flex-direction:column;gap:14px"><div class="between"><b style="font-size:16px">${f.name}</b><span class="row" style="gap:8px">${P.actions(f)}</span></div><span class="th">Balance at each month's end</span>${D4.monthEnds(f, { w: ph ? 320 : 700, h: 150, ph })}${f.stale ? `<div class="notice">${I.clock(14)}<span class="grow">No balance since <b>${fmt(f.asOf)}</b>. September is carried from August.</span></div>` : ""}</div></div>`;
}
const xSel = (dsel, id) => `${dsel} .xt-${id} { transform: translateY(0); opacity: 1; background: ${id === "all" ? "white" : selSoft(id)}; color: ${id === "all" ? "var(--card-emerald-to)" : `var(--card-${hue(id)}-to)`}; } ${dsel} .xpage { border-top-color: ${id === "all" ? "white" : selSoft(id)}; }${pickBtnCss(dsel, id)}`;
function xHero(prefix, { ph = false } = {}) {
  return greenStage(`<div class="gpick" style="display:flex;flex-direction:column;gap:0"><div class="between" style="margin-bottom:${ph ? 10 : 16}px;gap:12px;flex-wrap:wrap"><span class="card-t" style="color:var(--fg)">The accounts folder<small style="color:var(--muted)">a tab for each account · the picked one comes to the front</small></span>${ph ? "" : btn("Update balances", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}</div>${xTabs(prefix, { ph })}<div class="xpage on-paper" style="position:relative;z-index:2;background:var(--surface);border-radius:${ph ? "0 0 16px 16px" : "0 0 20px 20px"};border-top:5px solid white;padding:${ph ? "16px 14px" : "26px 30px"};box-shadow:0 20px 40px oklch(0 0 0 / 0.3);transition:border-color 220ms">${panes((f) => xPage(f, prefix, { ph }))}</div></div>`, { ph, pad: ph ? "16px 14px" : "24px 30px 30px" });
}
export function xDesktop() {
  const pk = P.picker("x", xSel);
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${xHero("x")}${card(`${head("In and out, month by month", "green came in, colour went out, hatched is what isn't recorded · the line is the change")}${panes((f) => D3.ledgerColumns(f))}`, "gap:12px")}${pk.close}` });
}
export function xPhone() {
  const pk = P.picker("xp", xSel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${xHero("xp", { ph: true })}${card(`${head("In and out")}${panes((f) => D3.ledgerColumns(f, { w: 330, h: 200, ph: true }))}`, "padding:16px;gap:10px")}${pk.close}` });
}

// ================= Y · Ticker =================
// A giant figure on the green, a board of account pills under it like a ticker, and the year as a glowing line along the bottom.
function pills(prefix, { ph = false } = {}) {
  return `<div style="display:flex;flex-wrap:wrap;gap:${ph ? 8 : 10}px">${IDS.map((id) => { const f = FACTS[id], d = f.all ? f.sinceJan : f.chg; return `<label for="${prefix}-sel-${id}" class="yp yp-${id}" style="cursor:pointer;display:flex;align-items:center;gap:${ph ? 8 : 10}px;padding:${ph ? "7px 12px 7px 7px" : "9px 16px 9px 9px"};border-radius:999px;background:oklch(1 0 0 / 0.1);border:1px solid oklch(1 0 0 / 0.16);color:var(--fg);transition:background 200ms, color 200ms, box-shadow 200ms">${f.all ? `<span style="width:${ph ? 24 : 28}px;height:${ph ? 24 : 28}px;border-radius:50%;background:oklch(1 0 0 / 0.18);display:flex;align-items:center;justify-content:center">${I.accounts(13)}</span>` : mono(f.a, ph ? 24 : 28).replace(/border-radius:\d+px/, "border-radius:50%")}<b style="font-size:${ph ? 12 : 13.5}px">${f.short}</b><b class="num" style="font-size:${ph ? 12 : 13.5}px">${f.on ? (ph ? inrS(f.balance) : inr(f.balance)) : "closed"}</b>${f.on && d != null && !ph ? `<span class="yd" style="font-size:11.5px;font-weight:800;color:${d >= 0 ? "var(--on-card-lime)" : "oklch(0.82 0.1 30)"}">${d >= 0 ? "▲" : "▼"} ${inrS(Math.abs(d))}</span>` : ""}${f.stale ? `<span style="width:8px;height:8px;border-radius:50%;background:var(--warning)"></span>` : ""}</label>`; }).join("")}</div>`;
}
const ySel = (dsel, id) => `${dsel} .yp-${id} { background: ${selSoft(id)}; color: ${id === "all" ? "var(--card-emerald-to)" : `var(--card-${hue(id)}-to)`}; box-shadow: 0 0 0 3px oklch(0.16 0.05 160 / 0.5), 0 8px 22px oklch(0 0 0 / 0.3); } ${dsel} .yp-${id} .yd { color: inherit !important; }${pickBtnCss(dsel, id)}`;
function yHero(prefix, { ph = false } = {}) {
  return greenStage(`<div class="gpick" style="display:flex;flex-direction:column;gap:${ph ? 14 : 20}px"><div class="between" style="align-items:flex-end;gap:16px;flex-wrap:wrap"><div>${panes((f) => bigNumber(f, { ph, size: ph ? 44 : 76 }))}</div>${ph ? "" : panes((f) => heroActions(f))}</div>${pills(prefix, { ph })}${panes((f) => whiteLine(f, { w: ph ? 330 : 1350, h: ph ? 150 : 230, ph, key: prefix }))}${panes((f) => statRow(f, { ph }))}${ph ? panes((f) => heroActions(f)) : ""}</div>`, { ph, pad: ph ? "18px 14px" : "30px 32px 30px" });
}
export function yDesktop() {
  const pk = P.picker("y", ySel);
  const receipt = card(`${head("Today's check-in", "every balance, printed")}${D4.todayReceipt("y")}`, "gap:12px;background:linear-gradient(180deg, oklch(0.94 0.006 260), var(--surface))");
  return desktop({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting()}${yHero("y")}${two(receipt, `<div class="stack-col">${P.historyCard("y", { n: 4 })}${P.outCard("y")}</div>`, "440px 1fr")}${pk.close}` });
}
export function yPhone() {
  const pk = P.picker("yp", ySel);
  return phone({ h: "auto", body: `${C.DEFS()}${pk.css}${pk.open}${P.greeting({ phone: true })}${yHero("yp", { ph: true })}${D4.todayReceipt("yp", { ph: true })}${P.historyCard("yp", { n: 4, ph: true })}${pk.close}` });
}

export const DIRS5 = [
  { k: "u", name: "Split bar", blurb: "The green stage, with the bar of what each account holds as the selector: every segment as wide as its balance, the picked one lifted and ringed in its colour while the rest dim." },
  { k: "v", name: "Account list", blurb: "The green stage split in two: the pick's figure and its year as a glowing line on the left, every account as a row on the right that fills with its colour when picked. Lately and Coming up below." },
  { k: "w", name: "Passbooks on the desk", blurb: "Your kept passbook on the green: a closed passbook for each account stands in a row; the picked one rises in its colour and lies open below." },
  { k: "x", name: "Index tabs", blurb: "A green folder with an index tab per account. The picked tab comes forward in its colour and joins the page, which holds its month as a T-account and its month-end balances." },
  { k: "y", name: "Ticker", blurb: "A giant figure on the green, a board of account pills under it, and the year as a glowing line along the bottom. The picked pill fills with its colour." },
];
