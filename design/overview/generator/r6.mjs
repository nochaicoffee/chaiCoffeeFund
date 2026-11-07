// Round 6 (2026-11-07): Prathik doesn't want the art (the illustrations, the cup), but liked the LAYOUTS of the four neubrutalism pages from the
// "Dashboard design exploration" session, and asked for them whole, not just the hero. So each is rebuilt page-for-page in our design language
// (glass, soft gradients, our type), on our data, with what he asked for in this thread: net worth first, its change and trend, owned against owed,
// the split by type, every page in groups, and every warning in one list.
//   L1 Bento    (Sticker Bento)  our rail; a net worth block with a ring; 12 tiles in a 4-wide grid (the ten pages and two sums); trend bars beside the list
//   L2 Rail     (Chai Buddy)     a round icon rail; the greeting in a card; one chunky segmented bar with a hatched strip for what you owe; badge tiles; an area trend; a tick-off list
//   L3 Poster   (Pop Poster)     a sticker nav across the top; a big title; a loud net worth block with a starburst; slightly tilted tiles; halftone bars; speech-bubble list
//   L4 Windows  (Money Town)     folder tabs; app-window tiles; a block city instead of the skyline (1 block = ₹3L, owed below the road); the trend as stacked blocks
// Picks (no script): the month on the trend picks the net worth shown above it, counted to by the same animated number as the other rounds.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as H from "./history.mjs";
import { radios } from "./ui.mjs";
import { MKEYS, TODAY_K, ICON, mp, sg, arrow, pctOf, nwBig, dots, pageCard, smooth } from "./r3.mjs";
import { lede } from "./r4.mjs";
const { I, inr } = L;
const { lakh, col, grad, hc, tip } = P;

const STAR = Array.from({ length: 40 }, (_, i) => { const r = i % 2 ? 41 : 50, t = (i * Math.PI) / 20; return `${(50 + Math.cos(t) * r).toFixed(1)}% ${(50 + Math.sin(t) * r).toFixed(1)}%`; }).join(",");
const SHORT = ["accounts", "invest", "fixed", "lent", "cards", "loans", "income", "subs", "goals", "ins"];
const icon = (k, n = 16) => (I[ICON[k]] ?? I.overview)(n);
export const head = () => L.header({ eyebrow: `Overview · Today ${P.sampleTag()}`, lede: lede(), actions: P.greetingActions() });
export const dpill = (n, label) => `<span class="dpill ${n >= 0 ? "up" : "dn"}">${arrow(n)} ${sg(n)}<small>${label}</small></span>`;
/** The month's eyebrow and change pills, one pane per month. */
export const monthHead = (cls = "") => mp((i) => {
  const r = H.HIST[i], p = H.HIST[i - 1];
  return `<div class="mh ${cls}"><span class="eyebrow-s">Net worth at the end of ${H.mfull(i)}${i === H.TODAY_I ? " (today)" : ""}</span><div class="n1-d">${p ? dpill(r.net - p.net, `vs ${H.mfull(i - 1)}`) : `<span class="dpill">first month on record</span>`}${i > 0 ? dpill(r.net - H.THEN.net, `since ${H.mfull(0)}`) : ""}</div></div>`;
});
export const typeChips = (cls = "") => H.TYPES.map((t) => `<span class="tc ${cls} ${t.side}" style="--tc:${col(t.c)}"><i></i>${t.name}<b>${t.side === "owe" ? "−" : ""}${lakh(H.NOW[t.k])}</b></span>`).join("");

// ---------- The twelve tiles: the ten pages and the two sums of the month ----------
const ORDER = ["accounts", "invest", "fixed", "lent", "cards", "loans", "income", "subs", "goals", "ins"];
export function tiles() {
  const page = (k) => { const s = H.SEC[k]; return { key: k, name: s.name, val: `${s.owe ? "−" : ""}${lakh(s.big)}`, per: s.per ?? "", sub: s.sub, color: s.color, owe: !!s.owe, group: H.groupOf(k).name, card: pageCard(s), tag: s.owe ? "you owe" : s.per ? s.per : "yours", warn: dots(k) }; };
  const due = { key: "due", name: "Due this month", val: lakh(D.OBLIGATIONS), per: "", sub: `${inr(D.PAID_SO_FAR)} already paid`, color: "gold", owe: true, group: "This month", warn: "", tag: "you owe", card: hc({ h: "Due this month", t: inr(D.OBLIGATIONS), d: "monthly obligations", rows: [["Card bills", inr(D.OBLIG.cards), col("ruby")], ["Loan EMIs", inr(D.OBLIG.emis), col("teal")], ["Subscriptions off cards", inr(D.OBLIG.subs), col("plum")]], f: "Subscriptions charged to a card are inside that card's bill, so they're counted once.", w: 300 }) };
  const left = { key: "left", name: "Still to pay", val: lakh(D.TO_PAY), per: "", sub: `of ${lakh(D.OBLIGATIONS)}, ${pctOf(D.PAID_SO_FAR, D.OBLIGATIONS)} paid`, color: "rose", owe: true, group: "This month", warn: "", tag: "you owe", card: hc({ h: "Still to pay", t: inr(D.TO_PAY), d: `${inr(D.PAID_SO_FAR)} already paid`, rows: [["HDFC Car Loan EMI", "due today", col("sky")], ["HDFC Regalia", "18 Nov", col("ruby")], ["Amex", "24 Nov", col("onyx")], ["Gym", "21 Nov", col("plum")]], f: "Obligations of the month less what has been paid so far.", w: 300 }) };
  return [...ORDER.map(page), due, left];
}
export const tilePer = (t) => (t.per ? `<small>${t.per}</small>` : "");

/** Every warning, as the list each layout dresses its own way. */
export const KIM = H.WARN_SORTED;
export const secCol = (k) => col(H.SEC[k].color);

/** A ring: what you own outside, what you owe inside. */
export function ring() {
  const seg = (items, tot, r, sw) => { let at = 0; return items.map((t) => { const len = (H.NOW[t.k] / tot) * 100, el = `<circle cx="110" cy="110" r="${r}" class="rg-s" pathLength="100" stroke="${col(t.c)}" stroke-width="${sw}" style="stroke-dasharray:${(len - 1.2).toFixed(2)} ${(100 - len + 1.2).toFixed(2)};stroke-dashoffset:${(-at).toFixed(2)}"/>`; at += len; return el; }).join(""); };
  const own = H.TYPES.filter((t) => t.side === "own"), owe = H.TYPES.filter((t) => t.side === "owe");
  return `<svg viewBox="0 0 220 220" class="ring"><circle cx="110" cy="110" r="92" class="rg-t" stroke-width="20"/><circle cx="110" cy="110" r="64" class="rg-t" stroke-width="20"/>${seg(own, D.OWNED, 92, 20)}${seg(owe, D.OWED, 64, 20)}<text x="110" y="104" text-anchor="middle" class="rg-n">${pctOf(D.NET, D.OWNED)}</text><text x="110" y="126" text-anchor="middle" class="rg-l">you keep</text></svg>`;
}

// =====================================================================
// L1 · Bento  (from Sticker Bento)
// =====================================================================
export const PAL = ["sapphire", "violet", "teal", "emerald", "gold", "copper", "ruby"];
export function l1() {
  const hero = `<section class="stg2 l1-h" data-b="l1">${radios("m", MKEYS, TODAY_K)}<div class="l1-hl">${monthHead()}${nwBig()}<div class="l1-ch">${typeChips()}</div></div><div class="l1-hr">${ring()}<div class="l1-rk"><span><i style="background:oklch(0.85 0.1 250)"></i>owned ${lakh(D.OWNED)}</span><span><i style="background:oklch(0.8 0.12 25)"></i>owed ${lakh(D.OWED)}</span></div></div></section>`;
  const tl = tiles().map((t, j) => `<div class="hov tl tl-b" tabindex="0" style="--tg:${grad(t.color)}"><div class="tl-h"><span class="tl-gr">${t.group}</span>${t.warn ? `<span class="tl-w">${t.warn}</span>` : ""}</div><div class="tl-n">${t.name}</div><div class="tl-v">${t.val}${tilePer(t)}</div><div class="tl-f"><span class="tl-tag${t.owe ? " owe" : ""}">${t.tag}</span><small>${t.sub}</small></div>${tip(t.card, { w: 320, x: j % 4 === 3 ? "r" : "l", y: j >= 8 ? "up" : "down" })}</div>`).join("");
  const bars = H.HIST.map((r, i) => `<label class="pkl b1" for="m-${i}" style="--bh:${((r.net / 2800000) * 100).toFixed(1)}%;--bc:var(--card-${PAL[i % PAL.length]})"><span class="b1-t">${lakh(r.net)}</span><i></i><em>${H.mlabel(i)}</em></label>`).join("");
  const trend = `<section class="card glass l1-t"><div class="card-h"><div class="card-t">Net worth, month by month<small>click a month to count the number above to it</small></div></div><div class="b1s">${bars}</div></section>`;
  const list = `<section class="card glass l1-k"><div class="card-h"><div class="card-t">Keep in mind<small>${KIM.length} things from ten pages, soonest first</small></div></div><div class="k1">${KIM.map((w) => `<div class="k1-r wk-${w.tone}" style="--pc:${secCol(w.page)}"><i class="k1-d"></i><div class="k1-t"><b>${w.text}</b><small>${w.detail}</small></div><span class="k1-p">${H.SEC[w.page].name}</span><span class="k1-g">${I.arrowR(14)}</span></div>`).join("")}</div></section>`;
  return P.page(`${head()}${hero}<div class="l1-g">${tl}</div><div class="l1-b">${trend}${list}</div>${P.sampleNote()}`);
}

// =====================================================================
// shells for the other layouts
// =====================================================================
const shell = (inner, { nav, cls = "", mcls = "" }) => `<div class="chai-app desk ${cls}" style="width:1600px;height:__H__">${nav}<main class="main glass ${mcls}">${inner}</main></div>`;
const NAV = [["overview", "Overview", "sapphire"], ["accounts", "Accounts", "sapphire"], ["cards", "Cards", "ruby"], ["subs", "Subscriptions", "plum"], ["income", "Income", "emerald"], ["loans", "Loans", "teal"], ["lent", "Lent out", "copper"], ["ins", "Insurance", "gold"], ["fixed", "Fixed income", "forest"], ["invest", "Investments", "indigo"], ["goals", "Goals", "rose"]];

// =====================================================================
// L2 · Rail  (from Chai Buddy)
// =====================================================================
export function l2() {
  const rail = `<nav class="rr">${NAV.map(([k, n, c], i) => `<span class="rr-i${i === 0 ? " on" : ""}" data-n="${n}" style="background:linear-gradient(155deg,color-mix(in oklch,var(--card-${c}) 62%,white),var(--card-${c}))">${(k === "overview" ? I.overview : (I[ICON[k]] ?? I.overview))(18)}</span>`).join("")}<span class="rail-me">P</span></nav>`;
  const hd = `<header class="l2-hd"><span class="l2-tail"></span><div><span class="chip-s">Overview · Fri 7 Nov ${P.sampleTag()}</span><h1>Good afternoon, Prathik</h1><div class="lede">${lede()}</div></div><div class="pg-actions">${L.btn("Record", { icon: I.plus() })}${L.btn("Refresh", { icon: I.refresh(14) })}</div></header>`;
  const own = H.TYPES.filter((t) => t.side === "own");
  const seg = own.map((t) => `<span class="sg" style="flex:${H.NOW[t.k]};background:linear-gradient(180deg,color-mix(in oklch,var(--card-${t.c}) 78%,white),var(--card-${t.c}))" title="${t.name}"></span>`).join("");
  const nw = `<section class="card glass l2-n">${radios("m", MKEYS, TODAY_K)}<div class="l2-nh"><div class="card-t">Net worth</div>${monthHead("dark")}</div><div class="l2-big">${nwBig()}</div><div class="sgs">${seg}</div><div class="sgo"><span class="hatch" style="width:${(D.OWED / D.OWNED) * 100}%"></span><small>← you owe ${inr(D.OWED)} (cards and loans), already taken off</small></div><div class="l2-lg">${typeChips("dk")}</div></section>`;
  const tl = tiles().map((t, j) => `<div class="hov tl tl-r" tabindex="0" style="--tg:${grad(t.color)}"><span class="tl-bd" style="background:${grad(t.color)}">${t.key === "due" || t.key === "left" ? I.calendar(20) : icon(t.key, 20)}</span><span class="tl-tag${t.owe ? " owe" : ""}">${t.tag}</span><div class="tl-n">${t.name}</div><div class="tl-v">${t.val}${tilePer(t)}</div><div class="tl-f"><small>${t.sub}</small>${t.warn ? `<span class="tl-w">${t.warn}</span>` : ""}</div>${tip(t.card, { w: 320, x: j % 4 === 3 ? "r" : "l", y: j >= 8 ? "up" : "down" })}</div>`).join("");
  // area chart
  const W = 760, Hh = 760, lo = 1000000, hi = 2800000, x = (i) => 30 + (i * (W - 60)) / 12, y = (v) => Hh - 24 - ((v - lo) / (hi - lo)) * (Hh - 50);
  const pts = H.HIST.map((r, i) => [x(i), y(r.net)]), d = smooth(pts);
  const grid = [1500000, 2000000, 2500000].map((v) => `<line x1="30" x2="${W - 30}" y1="${y(v)}" y2="${y(v)}" class="gl2"/><text x="4" y="${y(v) + 4}" class="gt2">${lakh(v)}</text>`).join("");
  const hits = H.HIST.map((r, i) => `<label class="pkl ht" for="m-${i}" style="left:${(i / 13) * 100}%;width:${100 / 13}%"><i class="ht-p" style="top:${(y(r.net) / Hh) * 100}%"></i><span class="ht-t" style="top:calc(${(y(r.net) / Hh) * 100}% - 40px)">${lakh(r.net)}</span><em>${H.mlabel(i)}</em></label>`).join("");
  const area = `<section class="card glass l2-t"><div class="card-h"><div class="card-t">Net worth trend<small>13 months · click a point</small></div></div><div class="ar"><svg viewBox="0 0 ${W} ${Hh}" class="arsvg" style="aspect-ratio:${W}/${Hh}"><defs><linearGradient id="l2a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--card-sapphire)" stop-opacity=".45"/><stop offset="1" stop-color="var(--card-sapphire)" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${d}L${pts[12][0]},${Hh - 24}L${pts[0][0]},${Hh - 24}Z" fill="url(#l2a)"/><path d="${d}" class="al2" pathLength="1"/></svg><div class="hts">${hits}</div></div></section>`;
  const list = `<section class="card glass l2-k"><div class="card-h"><div class="card-t">Keep in mind<small>${KIM.length} things · tick one off when it's dealt with</small></div></div><div class="k2">${KIM.map((w, i) => `<label class="k2-r wk-${w.tone}" style="--pc:${secCol(w.page)}"><input type="checkbox" class="k2-c" id="k2-${i}"><span class="k2-s"></span><div class="k2-t"><b>${w.text}</b><small>${w.detail}</small></div><span class="k2-p">${H.SEC[w.page].name}</span><span class="k2-b"></span></label>`).join("")}</div></section>`;
  return shell(`<div class="pgcol">${hd}${nw}<div class="l2-g">${tl}</div><div class="l2-b">${area}${list}</div>${P.sampleNote()}</div>`, { nav: rail, cls: "l2s" });
}

// =====================================================================
// L3 · Poster  (from Pop Poster)
// =====================================================================
export function l3() {
  const nav = `<nav class="pn">${NAV.map(([k, n, c], i) => `<span class="pn-i${i === 0 ? " on" : ""}" style="--pc:var(--card-${c})">${(k === "overview" ? I.overview : (I[ICON[k]] ?? I.overview))(14)}${n}</span>`).join("")}</nav>`;
  const hd = `<header class="l3-hd"><div><span class="l3-eb">Overview · Fri 7 Nov ${P.sampleTag()}</span><h1>Good afternoon,<br><em>Prathik!</em></h1><div class="lede">${lede()}</div></div><div class="l3-bub"><b>Psst!</b> ${COVER_LINE}</div></header>`;
  const star = `<div class="burst" style="clip-path:polygon(${STAR})"><div><small>Net worth</small><b>${mp((i) => `${H.HIST[i].net - (H.HIST[i - 1]?.net ?? H.HIST[i].net) >= 0 ? "UP" : "DOWN"} ${lakh(Math.abs(H.HIST[i].net - (H.HIST[i - 1]?.net ?? H.HIST[i].net)))}`, "bs")}</b><small>${"since last month!"}</small></div></div>`;
  const hero = `<section class="stg2 l3-h" data-b="l3">${radios("m", MKEYS, TODAY_K)}<div class="l3-hl"><span class="l3-tag">Net worth</span>${nwBig()}${monthHead("pzm")}<div class="l3-ch">${typeChips("pz")}</div></div>${star}</section>`;
  const tl = tiles().map((t, j) => `<div class="hov tl tl-p" tabindex="0" style="--tg:${grad(t.color)};--rot:${[-1.2, 0.8, -0.6, 1.1, 0.9, -1, 0.6, -0.8, -0.7, 1, 0.8, -1.1][j]}deg"><div class="tl-n">${t.name}</div><div class="tl-v">${t.val}${tilePer(t)}</div><div class="tl-f"><small>${t.sub}</small>${t.warn ? `<span class="tl-w">${t.warn}</span>` : ""}</div>${t.owe ? '<span class="owe-t">OWE!</span>' : ""}${tip(t.card, { w: 320, x: j % 4 === 3 ? "r" : "l", y: j >= 8 ? "up" : "down" })}</div>`).join("");
  const bars = H.HIST.map((r, i) => `<label class="pkl b3" for="m-${i}" style="--bh:${((r.net / 2800000) * 100).toFixed(1)}%"><span class="b3-t">${lakh(r.net)}</span><i></i><em>${H.mlabel(i)}</em></label>`).join("");
  const trend = `<section class="l3-t"><span class="l3-lab pink">Net worth trend</span><div class="b3s">${bars}</div></section>`;
  const list = `<section class="l3-k"><span class="l3-lab">Needs attention!</span><div class="k3">${KIM.map((w, i) => `<div class="k3-r ${i % 2 ? "rt" : ""} wk-${w.tone}" style="--pc:${secCol(w.page)}"><span class="k3-p">${H.SEC[w.page].name}</span><b>${w.text}</b><small>${w.detail}</small></div>`).join("")}</div></section>`;
  return shell(`<div class="pgcol">${hd}${hero}<div class="l3-g">${tl}</div><div class="l3-b">${trend}${list}</div>${P.sampleNote()}</div>`, { nav, cls: "col l3s" });
}
const COVER_LINE = `Cash covers <u>${(D.BANK_SPEND / (D.EMI + D.SUBS_MONTH)).toFixed(1)} months</u> of bills.`;

// =====================================================================
// L4 · Windows  (from Money Town)
// =====================================================================
export function l4() {
  const tabs = `<nav class="ft">${NAV.map(([k, n, c], i) => `<span class="ft-i${i === 0 ? " on" : ""}" style="--pc:var(--card-${c})">${(k === "overview" ? I.overview : (I[ICON[k]] ?? I.overview))(14)}${n}</span>`).join("")}</nav>`;
  const win = (title, right, body, cls = "") => `<section class="win ${cls}"><div class="win-b"><i></i><i></i><i></i><b>${title}</b>${right ? `<span>${right}</span>` : ""}</div><div class="win-c">${body}</div></section>`;
  // the block city: 1 block = ₹2L; owned stands on the road, owed hangs below
  const BL = 300000, city = () => {
    const own = H.TYPES.filter((t) => t.side === "own"), owe = H.TYPES.filter((t) => t.side === "owe");
    const stack = (t, dir) => { const n = Math.round(H.NOW[t.k] / BL), bl = Array.from({ length: Math.max(n, 1) }, () => `<i style="background:linear-gradient(180deg,color-mix(in oklch,var(--card-${t.c}) 75%,white),var(--card-${t.c}))"></i>`).join(""); const v = `<span class="cc-v">${dir === "owe" ? "−" : ""}${lakh(H.NOW[t.k])}</span>`, nm = `<span class="cc-n">${t.name}</span>`; return dir === "own" ? `<div class="cc cc-own">${nm}${v}<div class="cc-s">${bl}</div></div>` : `<div class="cc cc-owe"><div class="cc-s">${bl}</div>${v}${nm}</div>`; };
    return `<div class="city"><div class="cy-up">${own.map((t) => stack(t, "own")).join("")}</div><div class="cy-road"></div><div class="cy-dn">${owe.map((t) => stack(t, "owe")).join("")}</div><div class="cy-bb"><small>Net worth</small>${nwBig()}</div><div class="cy-eq"><div><small>Above ground</small><b>${lakh(D.OWNED)}</b></div><span>−</span><div><small>Underground</small><b class="owe">${lakh(D.OWED)}</b></div><span>=</span><div class="k"><small>You keep</small><b>${lakh(D.NET)}</b></div></div></div>`;
  };
  const gr = `<div class="l4-gr"><span class="l4-eb">Overview · Fri 7 Nov ${P.sampleTag()}</span><h1>Good afternoon, Prathik</h1><div class="lede">${lede()}</div><div class="l4-lg"><span class="l4-lt">What the blocks are</span>${typeChips("dk")}</div></div>`;
  const hero = win("overview / net.worth", "1 block = ₹3L · what you own stands on the road, what you owe hangs below it", `${radios("m", MKEYS, TODAY_K)}<div class="l4-hero">${gr}${city()}</div>`, "win-hero");
  const tl = tiles().map((t, j) => `<section class="hov win win-t" tabindex="0" style="--wc:${col(t.color)};--wg:${grad(t.color)}"><div class="win-b"><i></i><i></i><i></i><b>${t.name}</b>${t.warn ? `<span class="tl-w">${t.warn}</span>` : ""}</div><div class="win-c"><div class="tl-v">${t.val}${tilePer(t)}</div><div class="tl-f"><span class="tl-tag${t.owe ? " owe" : ""}">${t.tag}</span><small>${t.sub}</small></div></div>${tip(t.card, { w: 320, x: j % 4 === 3 ? "r" : "l", y: j >= 8 ? "up" : "down" })}</section>`).join("");
  const stacks = H.HIST.map((r, i) => { const n = Math.max(1, Math.round(r.net / 200000)); return `<label class="pkl sb" for="m-${i}"><span class="sb-t">${lakh(r.net)}</span><div class="sb-s">${Array.from({ length: n }, (_, j) => `<i style="background:var(--card-${PAL[(i + j) % 4]})"></i>`).join("")}</div><em>${H.mlabel(i)}</em></label>`; }).join("");
  const trend = win("net_worth_trend", "1 block = ₹2L", `<div class="sbs">${stacks}</div>`, "win-tr");
  const list = win("what_needs_attention", `${KIM.length} new`, `<div class="k4">${KIM.map((w, i) => `<div class="k4-r${i % 2 ? " alt" : ""} wk-${w.tone}" style="--pc:${secCol(w.page)}"><span class="k4-i" style="background:${grad(H.SEC[w.page].color)}">${icon(w.page, 15)}</span><div class="k4-t"><b>${w.text}</b><small>${w.detail}</small></div><span class="k4-n">${H.SEC[w.page].name}</span><span class="k4-g">${I.arrowR(13)}</span></div>`).join("")}</div>`, "win-k");
  return shell(`<div class="pgcol">${hero}<div class="l4-g">${tl}</div><div class="l4-b">${trend}${list}</div>${P.sampleNote()}</div>`, { nav: tabs, cls: "col l4s", mcls: "l4m" });
}

export const q = { l1, l2, l3, l4 };
export const renderL = (id) => () => q[id]();
export { SHORT };
