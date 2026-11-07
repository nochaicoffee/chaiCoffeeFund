// Round 7 (2026-11-08): L1 Bento, refined. Prathik picked it and asked for: a trend line in the net worth block; an icon or art on every tile below it
// (the cards tile with card art, and so on); and, at the end of the page, "Eight things worth knowing about your money" with "Future you" below it.
//   R1 Bento, refined  the page: greeting, net worth (number, change, a trend line you can click, the ring), 12 tiles each with its own mark,
//                      Coming up beside Keep in mind, then the eight things, then Future you
// The marks are the soft illustrations from round 5 (they were switched off when he said he didn't want the neubrutalism art; he now asks for icons on the tiles,
// so they are back on the tiles only; the cup stays off). The cards tile draws the real cards.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as H from "./history.mjs";
import { radios } from "./ui.mjs";
import { spotArt } from "./art-soft.mjs";
import { MKEYS, TODAY_K, mp, sg, arrow, pctOf, nwBig, smooth } from "./r3.mjs";
import { head, monthHead, typeChips, tiles, tilePer, ring, KIM, secCol, PAL } from "./r6.mjs";
import { q1Body, q3Body } from "./r2.mjs";
const { I, inr } = L;
const { lakh, col, grad, tip } = P;

// ---------- the trend line in the hero ----------
export const TW = 640, TH = 190;
export function trend() {
  const lo = 1300000, hi = 2750000, x = (i) => 24 + (i * (TW - 48)) / 12, y = (v) => TH - 30 - ((v - lo) / (hi - lo)) * (TH - 52);
  const pts = H.HIST.map((r, i) => [x(i), y(r.net)]), d = smooth(pts);
  const hits = H.HIST.map((r, i) => `<label class="pkl th" for="m-${i}" style="left:${(i / 13) * 100}%;width:${100 / 13}%"><i class="th-p" style="top:${(y(r.net) / TH) * 100}%"></i><span class="th-t" style="top:calc(${(y(r.net) / TH) * 100}% - 38px)">${lakh(r.net)}</span><em>${H.mlabel(i)}</em></label>`).join("");
  return `<div class="tr7"><svg viewBox="0 0 ${TW} ${TH}" class="tr7s" style="aspect-ratio:${TW}/${TH}"><defs><linearGradient id="r7a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="${d}L${pts[12][0]},${TH - 30}L${pts[0][0]},${TH - 30}Z" fill="url(#r7a)"/><path d="${d}" class="tr7l" pathLength="1"/></svg><div class="tr7h">${hits}</div></div>`;
}

// ---------- the marks on the tiles ----------
const bubble = (key, size = 52) => `<span class="mk">${spotArt(key, size)}</span>`;
export const cardFaces = () => `<span class="mk-cards">${D.CARDS.map((c, i) => `<i class="cdm cdm-${i}" style="background:linear-gradient(135deg,color-mix(in oklch,var(--card-${c.color}) 72%,white),var(--card-${c.color}))"><b>${c.name.replace("HDFC ", "")}</b><em>•••• ${i ? "7733" : "4021"}</em><span style="width:${(c.out / c.limit) * 100}%"></span></i>`).join("")}</span>`;
export const miniSpark = (vals) => { const w = 120, h = 36, lo = Math.min(...vals), hi = Math.max(...vals), pts = vals.map((v, i) => [3 + (i * (w - 6)) / (vals.length - 1), h - 4 - ((v - lo) / (hi - lo || 1)) * (h - 10)]); return `<svg viewBox="0 0 ${w} ${h}" class="msp"><path d="${smooth(pts)}" pathLength="1"/><circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="3" fill="#fff"/></svg>`; };
export const miniRing = (frac) => `<svg viewBox="0 0 44 44" class="mrg"><circle cx="22" cy="22" r="17" class="mrg-t"/><circle cx="22" cy="22" r="17" class="mrg-v" pathLength="100" style="stroke-dasharray:${(frac * 100).toFixed(1)} 100"/></svg>`;
export const miniBars = (items) => `<span class="mbs">${items.map(([f, c]) => `<i style="width:${f * 100}%;background:${c}"></i>`).join("")}</span>`;
const MARK = {
  cards: cardFaces,
  invest: () => `${bubble("invest")}<span class="mk-s">${miniSpark(H.HIST.map((r) => r.invest))}</span>`,
  loans: () => `${bubble("loans")}<span class="mk-s">${miniBars([[D.LOANS[0].out / D.LOAN_OUT, col("teal")], [D.LOANS[1].out / D.LOAN_OUT, col("sky")]])}</span>`,
  goals: () => `${bubble("goals")}<span class="mk-s">${miniBars(D.GOALS.map((g) => [g.saved / g.target, col(g.color)]))}</span>`,
  left: () => `<span class="mk-r">${miniRing(D.PAID_SO_FAR / D.OBLIGATIONS)}<b>${pctOf(D.PAID_SO_FAR, D.OBLIGATIONS)}</b></span>`,
};
function tileGrid() {
  return tiles().map((t, j) => `<div class="hov tl tl-m" tabindex="0" style="--tg:${grad(t.color)}"><div class="tl-h"><span class="tl-gr">${t.group}</span>${t.warn ? `<span class="tl-w">${t.warn}</span>` : ""}</div>${(MARK[t.key] ?? (() => bubble(t.key)))()}<div class="tl-n">${t.name}</div><div class="tl-v">${t.val}${tilePer(t)}</div><div class="tl-f"><span class="tl-tag${t.owe ? " owe" : ""}">${t.tag}</span><small>${t.sub}</small></div>${tip(t.card, { w: 320, x: j % 4 === 3 ? "r" : "l", y: j >= 8 ? "up" : "down" })}</div>`).join("");
}

// ---------- the page ----------
export function r1() {
  const hero = `<section class="stg2 r7-h" data-b="r7h">${radios("m", MKEYS, TODAY_K)}<div class="r7-l">${monthHead()}${nwBig()}${trend()}<div class="l1-ch">${typeChips()}</div></div><div class="l1-hr">${ring()}<div class="l1-rk"><span><i style="background:oklch(0.85 0.1 250)"></i>owned ${lakh(D.OWNED)}</span><span><i style="background:oklch(0.8 0.12 25)"></i>owed ${lakh(D.OWED)}</span></div></div></section>`;
  const list = `<section class="card glass l1-k"><div class="card-h"><div class="card-t">Keep in mind<small>${KIM.length} things from ten pages, soonest first</small></div></div><div class="k1">${KIM.map((w) => `<div class="k1-r wk-${w.tone}" style="--pc:${secCol(w.page)}"><i class="k1-d"></i><div class="k1-t"><b>${w.text}</b><small>${w.detail}</small></div><span class="k1-p">${H.SEC[w.page].name}</span><span class="k1-g">${I.arrowR(14)}</span></div>`).join("")}</div></section>`;
  const mid = `<div class="r7-b">${P.comingUp({ n: 9, title: "Coming up", note: "the next 30 days" })}${list}</div>`;
  return P.page(`${head()}${hero}<div class="l1-g">${tileGrid()}</div>${mid}<div class="r7">${q3Body()}${q1Body()}</div>${P.sampleNote()}`);
}

export const q = { r1 };
export const renderR = (id) => () => q[id]();
export { PAL, sg, arrow, mp };
