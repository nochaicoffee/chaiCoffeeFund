// Round 8 (2026-11-08): the refined Bento, again. Prathik's notes on round 7:
//   1. the soft illustrations don't fit our design: explore 5 more modern icon styles for the tiles;
//   2. move Coming up and Keep in mind to the very end, and explore a few ways of expressing them;
//   3. everything else looks good; Future you gets a setter for any percentage.
// So the page is: greeting, net worth (number, change, trend, ring), 12 tiles, the eight things, Future you (with the setter), then Coming up and Keep in mind.
// Two design aids sit on the board (not on the real page): "Icon style" (5 ways of dressing one glyph set) and the four ways to express the last section.
// Picks work with no script: m the month, ik the icon style, kv the last section's version, cd a day on the calendar.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as H from "./history.mjs";
import { radios } from "./ui.mjs";
import { glyph, STYLES } from "./icons-v.mjs";
import { MKEYS, TODAY_K, nwBig } from "./r3.mjs";
import { head, monthHead, typeChips, tiles, tilePer, ring, KIM, secCol } from "./r6.mjs";
import { trend, cardFaces, miniSpark, miniRing, miniBars } from "./r7.mjs";
import { q1Body, q3Body } from "./r2.mjs";
import * as M from "./model.mjs";
const { I, inr } = L;
const { lakh, col, grad, tip, dm, daysAway } = P;

export const IK = STYLES.map((s) => s.k);
export const KV = ["a", "b", "c", "d"];
export const KV_NAMES = { a: "Two cards", b: "One timeline", c: "Board by when", d: "Calendar" };

// ---------- the tiles, with a glyph in the chosen style ----------
const MICRO = {
  invest: () => `<span class="mk-s">${miniSpark(H.HIST.map((r) => r.invest))}</span>`,
  loans: () => `<span class="mk-s">${miniBars([[D.LOANS[0].out / D.LOAN_OUT, col("teal")], [D.LOANS[1].out / D.LOAN_OUT, col("sky")]])}</span>`,
  goals: () => `<span class="mk-s">${miniBars(D.GOALS.map((g) => [g.saved / g.target, col(g.color)]))}</span>`,
  left: () => `<span class="mk-s mk-sr">${miniRing(D.PAID_SO_FAR / D.OBLIGATIONS)}</span>`,
};
const tileGrid = () => tiles().map((t, j) => {
  const key = t.key, tc = `var(--card-${t.color})`;
  const mark = `<span class="ik-wrap">${glyph(key)}</span>`;
  return `<div class="hov tl tl-m" tabindex="0" style="--tg:${grad(t.color)};--tc:${tc}"><div class="tl-h"><span class="tl-gr">${t.group}</span>${t.warn ? `<span class="tl-w">${t.warn}</span>` : ""}</div>${mark}${(MICRO[key] ?? (() => ""))()}<div class="tl-n">${t.name}</div><div class="tl-v">${t.val}${tilePer(t)}</div><div class="tl-f"><span class="tl-tag${t.owe ? " owe" : ""}">${t.tag}</span><small>${t.sub}</small></div>${tip(t.card, { w: 320, x: j % 4 === 3 ? "r" : "l", y: j >= 8 ? "up" : "down" })}</div>`;
}).join("");

// ---------- the end of the page: Coming up and Keep in mind, four ways ----------
const EVS = D.EVENTS.filter((e) => e.kind !== "sub" || e.cash);
const LINK = { "e-car": "w-car", "e-card1": "w-c1", "e-card2": "w-c2", "e-ins": "w-ins", "e-fd": "w-fd" };
const wBy = Object.fromEntries(H.WARN.map((w) => [w.id, w]));
const LINKED = new Set(Object.values(LINK));
const FREE = H.WARN_SORTED.filter((w) => !LINKED.has(w.id)); // warnings with no day of their own
const money = (e) => `${e.amt > 0 ? "+" : "−"}${inr(Math.abs(e.amt))}`;
const evWarn = (e) => (LINK[e.id] ? wBy[LINK[e.id]] : null);
const evKind = { emi: "EMI", card: "Card bill", fd: "Deposit", ins: "Premium", in: "Money in", sub: "Subscription" };
const wCard = (w, cls = "") => `<div class="it it-w wk-${w.tone} ${cls}" style="--pc:${secCol(w.page)}"><i class="it-d"></i><div class="it-t"><b>${w.text}</b><small>${w.detail}</small></div><span class="it-p">${H.SEC[w.page].name}</span><span class="it-a">${w.act}</span></div>`;
const eCard = (e, cls = "") => { const w = evWarn(e); return `<div class="it it-e ${e.amt > 0 ? "in" : "out"} ${w ? `wk-${w.tone}` : ""} ${cls}" style="--pc:${col(e.color)}"><span class="it-dt"><b>${+e.date.slice(8)}</b><small>${P.MON[+e.date.slice(5, 7) - 1]}</small></span><div class="it-t"><b>${e.label}</b><small>${e.sub}</small></div>${w ? `<span class="it-b">needs a look</span>` : ""}<span class="it-m ${e.amt > 0 ? "up" : ""}">${money(e)}<small>${daysAway(e.date)}</small></span></div>`; };
const groupDays = () => { const g = new Map(); for (const e of EVS) { (g.get(e.date) ?? g.set(e.date, []).get(e.date)).push(e); } return [...g.entries()]; };

function verA() {
  const list = `<section class="card glass l1-k"><div class="card-h"><div class="card-t">Keep in mind<small>${KIM.length} things from ten pages, soonest first</small></div></div><div class="k1">${KIM.map((w) => `<div class="k1-r wk-${w.tone}" style="--pc:${secCol(w.page)}"><i class="k1-d"></i><div class="k1-t"><b>${w.text}</b><small>${w.detail}</small></div><span class="k1-p">${H.SEC[w.page].name}</span><span class="k1-g">${I.arrowR(14)}</span></div>`).join("")}</div></section>`;
  return `<div class="r7-b">${P.comingUp({ n: 9, title: "Coming up", note: "the next 30 days" })}${list}</div>`;
}
function verB() {
  const days = groupDays().map(([d, es]) => `<div class="tlv-g"><div class="tlv-h"><i></i><b>${L.fmtDow(d)}</b><small>${daysAway(d)}</small></div><div class="tlv-i">${es.map((e) => eCard(e)).join("")}</div></div>`).join("");
  return `<div class="tlv"><div class="tlv-g tlv-now"><div class="tlv-h"><i></i><b>Needs a look now</b><small>${FREE.length} things with no day of their own</small></div><div class="tlv-i">${FREE.map((w) => wCard(w)).join("")}</div></div>${days}</div>`;
}
function verC() {
  const inRange = (e, a, b) => e.date >= a && e.date <= b;
  const cols = [
    { n: "Needs a look now", sub: "no day of their own", w: FREE, e: [] },
    { n: "This week", sub: "7 to 13 Nov", w: [], e: EVS.filter((e) => inRange(e, "2026-11-07", "2026-11-13")) },
    { n: "Later this month", sub: "14 to 30 Nov", w: [], e: EVS.filter((e) => inRange(e, "2026-11-14", "2026-11-30")) },
    { n: "December", sub: "next month", w: [], e: EVS.filter((e) => e.date >= "2026-12-01") },
  ];
  const sum = (es) => { const o = -es.filter((e) => e.cash && e.amt < 0).reduce((a, e) => a + e.amt, 0), i = es.filter((e) => e.cash && e.amt > 0).reduce((a, e) => a + e.amt, 0); return es.length ? `<span class="bd-o">−${lakh(o)}</span><span class="bd-i">+${lakh(i)}</span>` : ""; };
  return `<div class="bd">${cols.map((c) => `<section class="bd-c"><div class="bd-h"><div><b>${c.n}</b><small>${c.sub}</small></div><span class="bd-n">${c.w.length + c.e.length}</span></div>${sum(c.e) ? `<div class="bd-s">${sum(c.e)}</div>` : ""}<div class="bd-l">${c.w.map((w) => wCard(w, "sm")).join("")}${c.e.map((e) => eCard(e, "sm")).join("")}</div></section>`).join("")}</div>`;
}
const CAL_KEYS = [...Array.from({ length: 30 }, (_, i) => `n${i + 1}`), ...Array.from({ length: 6 }, (_, i) => `d${i + 1}`)];
function verD() {
  const dateOf = (k) => (k[0] === "n" ? `2026-11-${String(+k.slice(1)).padStart(2, "0")}` : `2026-12-${String(+k.slice(1)).padStart(2, "0")}`);
  const at = (k) => EVS.filter((e) => e.date === dateOf(k));
  const cells = [];
  for (let d = 26; d <= 31; d++) cells.push(`<span class="cal-c off"><b>${d}</b></span>`); // Mon 26 Oct .. Sat 31 Oct; Sunday 1 Nov follows
  const all = CAL_KEYS.map((k) => {
    const es = at(k), n = +k.slice(1), today = k === "n7";
    const dots = es.slice(0, 3).map((e) => { const w = evWarn(e); return `<i class="cdot ${e.amt > 0 ? "in" : "out"}${w ? ` w-${w.tone}` : ""}"></i>`; }).join("");
    return `<label class="pkl cal-c${today ? " today" : ""}${k[0] === "d" ? " nx" : ""}${es.length ? " has" : ""}" for="cd-${k}"><b>${n}${k[0] === "d" ? "<em>Dec</em>" : ""}</b><span class="cdots">${dots}</span>${es.length ? `<small>${es.length > 1 ? `${es.length} things` : money(es[0])}</small>` : ""}</label>`;
  });
  // the grid starts on a Monday: Oct 26..31, then Nov 1 (Sun) is the 7th cell
  const grid = [...cells, ...all].join("");
  const panes = CAL_KEYS.map((k) => { const es = at(k); return `<div class="vw-cd vw-cd-${k}"><div class="cal-ph"><b>${L.fmtDow(dateOf(k))}</b><small>${daysAway(dateOf(k))}</small></div>${es.length ? es.map((e) => eCard(e)).join("") : `<div class="cal-none">Nothing dated on this day.</div>`}</div>`; }).join("");
  const free = `<div class="cal-f"><div class="cal-fh"><b>No day of their own</b><small>${FREE.length} things</small></div>${FREE.map((w) => wCard(w, "sm")).join("")}</div>`;
  return `${radios("cd", CAL_KEYS, "n7")}<div class="cal"><div class="cal-g"><div class="cal-w">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<span>${d}</span>`).join("")}</div><div class="cal-b">${grid}</div></div><div class="cal-r">${panes}${free}</div></div>`;
}

const sw = (name, ids, labelOf, title) => `<div class="swr"><span class="swr-t">${title}</span>${ids.map((k) => `<label class="pkl sw-i" for="${name}-${k}">${labelOf(k)}</label>`).join("")}</div>`;
function ending({ final = false } = {}) {
  const vers = { a: verA, b: verB, c: verC, d: verD };
  const keys = final ? ["b", "d"] : KV;
  const panes = keys.map((k) => `<div class="vw-kv vw-kv-${k}">${vers[k]()}</div>`).join("");
  const toggle = final ? `<div class="vt"><span class="vt-t">View</span>${["b", "d"].map((k) => `<label class="pkl vt-i" for="kv-${k}">${k === "b" ? I.list(14) : I.cal(14)}${k === "b" ? "Timeline" : "Calendar"}</label>`).join("")}</div>` : sw("kv", KV, (k) => KV_NAMES[k], "Design aid · how it's expressed");
  return `<section class="r8-end"><div class="r8-eh"><div><div class="eyebrow">At the end</div><h2>Coming up, and what to keep in mind</h2></div>${toggle}</div>${panes}</section>`;
}

// ---------- the page ----------
export function s1({ final = false } = {}) {
  const hero = `<section class="stg2 r7-h" data-b="r7h">${radios("m", MKEYS, TODAY_K)}${radios("ik", IK, final ? "3" : "2")}${final ? radios("kv", ["b", "d"], "b") : radios("kv", KV, "a")}<div class="r7-l">${monthHead()}${nwBig()}${trend()}<div class="l1-ch">${typeChips()}</div></div><div class="l1-hr">${ring()}<div class="l1-rk"><span><i style="background:oklch(0.85 0.1 250)"></i>owned ${lakh(D.OWNED)}</span><span><i style="background:oklch(0.8 0.12 25)"></i>owed ${lakh(D.OWED)}</span></div></div></section>`;
  const iconSw = final ? "" : `<div class="r8-sw">${sw("ik", IK, (k) => `${k} · ${STYLES.find((s) => s.k === k).name}`, "Design aid · icon style")}</div>`;
  const future = q1Body({ rates: M.RATES, slider: true });
  return P.page(`${head()}${hero}${iconSw}<div class="l1-g">${tileGrid()}</div><div class="r7">${q3Body()}${future}</div>${ending({ final })}${P.sampleNote()}`);
}

export const q = { s1, t1: () => s1({ final: true }) };
export const renderS = (id) => () => q[id]();
export { CAL_KEYS };
