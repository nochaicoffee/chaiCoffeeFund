// Round 10 (2026-10-22): five pages for what's below the hero, W1–W5. Prathik liked the hero and asked for more widgets,
// mostly visual, with Balance history on the right as on the Cards and Subscriptions pages (a visual on the left, the list
// of records on the right, a full-width chart). The hero is the final one, untouched; each page below it is its own idea.
// The widgets are in wparts.mjs. Every figure is made up; "today" is Oct 21, 2026.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as Z1 from "./z1.mjs";
import * as Z2 from "./z2.mjs";
import * as O2 from "./objects2.mjs";
import { SIMPLE } from "./objects3.mjs";
import { board, frame, grid } from "./board.mjs";
import * as W from "./wparts.mjs";
const { I } = L;
export const TILE = SIMPLE[0];
export const ANIM = `<style>.objin { animation: obj-in 560ms cubic-bezier(0.2, 0.9, 0.3, 1.15) both; } @keyframes obj-in { from { opacity: 0; transform: translateY(14px) scale(0.95); } } @media (prefers-reduced-motion: reduce) { .objin { animation: none; } } .board .sec-n { width: auto; padding: 0 9px; border-radius: 999px; } .board details.sel[open] { z-index: 60; }</style>`;

export const cols = (spec, ...items) => `<div style="display:grid;grid-template-columns:${spec.split(" ").map((x) => (/^[\d.]+(fr|px)$/.test(x) ? `minmax(0,${x})` : x)).join(" ")};gap:20px;align-items:stretch">${items.join("")}</div>`;
export const stack = (...items) => `<div class="stack-col">${items.join("")}</div>`;
export const tag = (n, name, idea) => `<div class="wtag"><span class="pill pill-ink" style="font-size:12px;padding:4px 10px">${n}</span><b>${name}</b><span class="wi">${idea}</span></div>`;

/** One desktop page: the same greeting and hero, then `below(prefix)`. `slack` leaves room under rows that open in place. */
export function desktopPage(prefix, n, name, idea, below, { slack = 0, greeting = P.greeting } = {}) {
  const pk = P.picker(prefix, Z1.heroSel);
  return L.desktop({ h: "auto", body: `${C.DEFS()}${ANIM}${W.WCSS}${pk.css}${pk.open}${tag(n, name, idea)}${greeting()}${Z2.hero(prefix, TILE, { allMode: O2.allBand })}${below(prefix)}${slack ? `<div aria-hidden="true" style="height:${slack}px;flex-shrink:0"></div>` : ""}${pk.close}` });
}
/** One phone page, for the phone board: the compact hero, then the widgets stacked. */
function phonePage(prefix, below, { slack = 0 } = {}) {
  const pk = P.picker(prefix, Z1.heroSel);
  return `<div class="chai-app ph" style="width:390px;height:auto;padding-bottom:16px"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${I.menu()}</span></header><div class="ph-body" style="padding-bottom:12px">${pk.css}${pk.open}${P.greeting({ phone: true })}${Z2.hero(prefix, TILE, { ph: true, allMode: O2.allBand })}${below(prefix)}${slack ? `<div aria-hidden="true" style="height:${slack}px;flex-shrink:0"></div>` : ""}${pk.close}</div></div>`;
}

// ---------- The five pages ----------
// Each puts a visual on the left and the list of records on the right, as Cards and Subscriptions do, with Balance
// history always on the right, and a chart that switches views. They differ in what they're about and how they're laid out.
const W1 = { n: "W1", name: "Movers", idea: "The page is about what changed: every account's movement since last month, the year's columns, then what it's all made of." };
const W2 = { n: "W2", name: "Runway", idea: "The page is about what's coming: can each account cover its bills and EMI, and how many months of bills the savings would last." };
const W3 = { n: "W3", name: "Check-in", idea: "The page is about how current your picture is: a ring a month for every account, how stale each is, and when you last updated." };
const W4 = { n: "W4", name: "Mix", idea: "The page is about what it's made of: shares over time, accounts and purposes in two rings, and who pays what." };
const W5 = { n: "W5", name: "Scoreboard", idea: "The page is about each account's own trend: a row of columns per account, then what moved, how fresh, and the year's charts." };

export const w1Desktop = () => desktopPage("w1", W1.n, W1.name, W1.idea, (p) => [
  cols("660px 1fr", W.mom(p), P.historyCard(p, { n: 7, spread: true, fill: W.trendFill })),
  W.overTime(p, { views: ["change", "stack", "share"] }),
  cols("1.05fr 1fr", W.mix(p, { size: 272 }), W.coming(p)),
].join(""));
export const w2Desktop = () => desktopPage("w2", W2.n, W2.name, W2.idea, (p) => [
  W.runway(p),
  cols("1fr 1fr", W.outKinds(p), P.historyCard(p, { n: 7, spread: true, fill: W.trendFill })),
  cols("1fr 1fr", W.outSplit(p), W.coming(p)),
].join(""));
export const w3Desktop = () => desktopPage("w3", W3.n, W3.name, W3.idea, (p) => [
  W.rings(p),
  cols("1fr 1fr", stack(W.fresh(p), W.coming(p)), P.historyCard(p, { n: 17, spread: true, fill: W.trendFill })),
  W.rhythm(p),
].join(""), { slack: 130 });
export const w4Desktop = () => desktopPage("w4", W4.n, W4.name, W4.idea, (p) => [
  W.overTime(p, { views: ["share", "stack", "change"] }),
  cols("1fr 1fr", stack(W.mix(p, { size: 250 }), W.buffer(p)), P.historyCard(p, { n: 16, spread: true, fill: W.trendFill })),
  cols("1fr 1fr", W.outSplit(p), W.fresh(p)),
].join(""), { slack: 130 });
export const w5Desktop = () => desktopPage("w5", W5.n, W5.name, W5.idea, (p) => [
  W.trendRows(p),
  cols("1fr 1fr 1fr", W.mom(p, { narrow: true }), W.fresh(p, { narrow: true }), P.historyCard(p, { n: 10, compact: true, spread: true, fill: W.trendFill })),
  C.switchCard(["river", "glow", "bridge", "flow"], p, { title: "Over time" }),
].join(""), { slack: 130 });

export const w1Phone = () => phonePage("w1p", (p) => [W.mom(p, { ph: true }), W.overTime(p, { views: ["change", "stack"], ph: true, minH: 250 }), W.mix(p, { size: 220, ph: true, layout: "stack", legend: "accounts" }), W.coming(p, { ph: true }), P.historyCard(p, { n: 3, ph: true })].join(""));
export const w2Phone = () => phonePage("w2p", (p) => [W.runway(p, { ph: true }), W.outKinds(p, { ph: true, views: ["kind", "net"] }), W.buffer(p, { ph: true }), W.coming(p, { ph: true }), P.historyCard(p, { n: 3, ph: true })].join(""));
export const w3Phone = () => phonePage("w3p", (p) => [W.rings(p, { ph: true, both: false }), W.fresh(p, { ph: true }), W.rhythm(p, { ph: true }), W.coming(p, { ph: true }), P.historyCard(p, { n: 3, ph: true })].join(""), { slack: 130 });
export const w4Phone = () => phonePage("w4p", (p) => [W.overTime(p, { views: ["share", "stack"], ph: true, minH: 250 }), W.mix(p, { size: 220, ph: true, layout: "stack", legend: "accounts" }), W.buffer(p, { ph: true }), W.outSplit(p, { ph: true }), W.coming(p, { ph: true }), P.historyCard(p, { n: 3, ph: true })].join(""));
export const w5Phone = () => phonePage("w5p", (p) => [W.trendRows(p, { ph: true }), W.overTime(p, { views: ["stack", "change"], ph: true, minH: 250 }), W.fresh(p, { ph: true }), P.historyCard(p, { n: 3, ph: true })].join(""), { slack: 130 });

export const WIDGET_DESKTOPS = [
  { file: "AccountsWidgetsW1.dc.html", w: 1600, render: w1Desktop },
  { file: "AccountsWidgetsW2.dc.html", w: 1600, render: w2Desktop },
  { file: "AccountsWidgetsW3.dc.html", w: 1600, render: w3Desktop },
  { file: "AccountsWidgetsW4.dc.html", w: 1600, render: w4Desktop },
  { file: "AccountsWidgetsW5.dc.html", w: 1600, render: w5Desktop },
];
/** Long decimals in percentages and paths add nothing a screen shows. */
const trimNum = (html) => html.replace(/(\d\.\d{3})\d+/g, "$1");
const PHONES = [[`${W1.n} · ${W1.name}`, w1Phone], [`${W2.n} · ${W2.name}`, w2Phone], [`${W3.n} · ${W3.name}`, w3Phone], [`${W4.n} · ${W4.name}`, w4Phone], [`${W5.n} · ${W5.name}`, w5Phone]];
export const WIDGET_PHONE_W = 96 + PHONES.length * 390 + (PHONES.length - 1) * 40;
export function widgetsPhoneBoard() {
  // Five phones with every pick in each are big: hover cards (a touch screen has none) and long decimals are left out, which keeps the file under jj's 1 MiB snapshot limit.
  W.OPTS.tips = false;
  try { return trimNum(board({ w: WIDGET_PHONE_W, title: "Below the hero, on a phone", sub: "The same hero, smaller, then each page's widgets stacked: the visuals first, Balance history after them. Pick a bank in any hero: its widgets follow it. Sample data, made up.", body: `${C.DEFS()}${ANIM}${W.WCSS}${grid(`repeat(${PHONES.length}, 390px)`, PHONES.map(([label, fn]) => frame(label, fn())), 40)}` })); } finally { W.OPTS.tips = true; }
}
