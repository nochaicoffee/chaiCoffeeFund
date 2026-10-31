// Round 4 (2026-10-31): Prathik liked K5, the Time machine, but found its hero overdone. Changes: the holdings carousel moves ABOVE the hero and
// is the picker; the returns (KPI cards, or a holding's stats) move OUT, below the hero; the hero keeps only a thin control row, the portfolio
// number and the chart; and the number gets big. Four ways to make the number big:
//   L1 Giant     the number alone, very large, with the change beside it
//   L2 Poster    the number even larger, laid over the chart's quiet top-left corner
//   L3 Split     the number with one bar under it: what you put in, and what it made
//   L4 Flip      the number as split-flap tiles that flip in when the page opens
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as H from "./history.mjs";
import * as P from "./parts.mjs";
import * as W from "./parts2.mjs";
import * as C from "./charts.mjs";
import * as K from "./heroes3.mjs";
import { cashCard } from "./cashui.mjs";
const { I, plural } = L;
const { sum, pc, spc, usd, qty, lakh, HOLDINGS, VALUE, COST } = D;
const { card, cardHead, grid, symTile, lakhS, sInr, gainCls, col } = P;

// ---------- the picker above the hero: the holdings carousel ----------
const selector = () => {
  const all = `<label class="hcard hcw" for="ln-all"><div class="t">${K.allTile(36)}<div><b>Everything</b><small>${plural(HOLDINGS.length, "holding")}</small></div></div>${K.spark2(K.last90(H.VAL), "sel-all", { w: 216, h: 120 })}<div class="sub2" style="margin:0;color:oklch(0.72 0.01 250)">Put in ${lakh(COST)} · ${spc(D.GAIN_PCT, 0)} on cost</div><div><div class="p">${lakh(VALUE)}</div><div class="c ${gainCls(D.DAY)}">${D.DAY >= 0 ? "▲" : "▼"} ${(Math.abs(D.DAY_PCT) * 100).toFixed(2)}% today</div></div></label>`;
  const cards = HOLDINGS.map((h) => `<label class="hcard hcw" for="ln-${h.symbol.toLowerCase()}"><div class="t">${symTile(h, 36)}<div><b>${h.symbol}</b><small>${h.name}</small></div></div>${W.spark(h.symbol, { w: 216, h: 120 })}<div class="sub2" style="margin:0;color:oklch(0.72 0.01 250)">You hold ${qty(h.quantity)} · ${spc(h.gainPct, 0)} on cost</div><div><div class="p">${h.market === "US" ? usd(h.price) : `₹${D.num2(h.price)}`}</div><div class="c ${gainCls(h.dayPct)}">${h.dayPct >= 0 ? "▲" : "▼"} ${(Math.abs(h.dayPct) * 100).toFixed(2)}% today</div></div></label>`).join("");
  return card(`${cardHead("Pick what to look at", "everything, or one holding · the stage and the figures below follow · scroll for more", `<span class="row" style="gap:8px"><span class="btn btn-icon" style="width:34px;height:34px">${I.chevL(12)}</span><span class="btn btn-icon" style="width:34px;height:34px">${I.chevR(12)}</span></span>`)}<div class="crs crs3 selcrs">${all}${cards}</div>`, { gap: 12, style: "overflow:hidden" });
};

// ---------- the thin control row inside the hero ----------
const controls = () => `<div class="tb ctl"><span class="tbr"><span class="sub2" style="margin:0;font-weight:800">Go back to</span>${C.chips("as", H.ASOF.map((a) => [a.k, a.label]), { cls: "dk" })}</span><span class="tbr">${C.chips("vw", [["worth", "Worth"], ["race", "Race"]], { cls: "dk tg-vw" })}${C.rangeChips("dk tg-rg")}</span></div>`;

// ---------- the returns, moved out of the hero ----------
const returns = (ret2 = false) => `<div class="retrow">${K.allBlock({ asof: true, part: "out", ret2 })}${HOLDINGS.map((h) => K.holdingBlock(h.symbol, { part: "out", ret2 })).join("")}</div>`;
const retHead = () => `<div class="card-t" style="padding:2px 4px 0;font-size:16px">Returns<small>as of the day you picked above · for one holding, its stats</small></div>`;

// ---------- the four big numbers ----------
const flap = (str) => `<span class="fl xl">${[...str].map((c) => `<i class="${c === "." || c === "," ? "dotc" : ""}">${c}</i>`).join("")}</span>`;
const holdName = (h, us, size = 56) => `<div class="row" style="gap:16px">${symTile(h, size)}<div><div class="sx-t">${h.name}${P.srcTags(h)}</div><div class="sub2" style="margin:2px 0 0">${h.symbol} · ${h.assetType.replace("-", " ")} · ${us ? "United States" : "India"} · ${plural(h.trades.length, "trade")} since ${L.fmtY(h.since).split(", ")[1]}</div></div></div>`;
const px = (h, us) => (us ? usd(h.price) : `₹${D.num2(h.price)}`);
const dayTxt = (h) => `<div class="sub2" style="margin:6px 0 0;font-weight:800;color:${h.dayPct >= 0 ? "oklch(0.82 0.17 150)" : "oklch(0.74 0.16 25)"}">${h.dayPct >= 0 ? "▲" : "▼"} ${(Math.abs(h.dayPct) * 100).toFixed(2)}% today</div>`;
const VARIANTS = {
  l1: { cls: "l1", hr: undefined, Hh: 520,
    all: ({ big, sub }) => `<div class="gh1"><div><div class="hk">Portfolio · ${plural(HOLDINGS.length, "holding")}</div><div class="bigv xl">${big}</div></div><div class="gr">${sub}</div></div>`,
    hold: ({ h, us }) => `<div class="gh1"><div>${holdName(h, us)}<div class="bigv xl" style="margin-top:10px">${px(h, us)}</div></div><div class="gr">${dayTxt(h)}</div></div>` },
  l2: { cls: "l2", hr: 4.2, Hh: 680,
    all: ({ big, sub }) => `<div class="gh2"><div class="hk">Portfolio · ${plural(HOLDINGS.length, "holding")}</div><div class="bigv xxl">${big}</div><div class="gr2">${sub}</div></div>`,
    hold: ({ h, us }) => `<div class="gh2">${holdName(h, us)}<div class="bigv xxl" style="margin-top:6px">${px(h, us)}</div><div class="gr2">${dayTxt(h)}</div></div>` },
  l3: { cls: "l3", hr: undefined, Hh: 500,
    all: ({ big, sub }) => {
      const bar = H.ASOF.map((a) => { const w = H.VAL[a.i], c = H.COSTD[a.i], g = w - c; return `<div class="v-as" data-k="${a.k}"><div class="gsp"><div class="gsp-l"><span><i style="background:oklch(0.82 0.12 85)"></i>Put in <b>${lakh(c)}</b></span><span><i style="background:oklch(0.84 0.13 160)"></i>${g >= 0 ? "Made" : "Lost"} <b>${sInr(g)}</b> · ${spc(w / c - 1)}</span></div><div class="gsp-b"><span style="width:${(c / Math.max(w, c)) * 100}%;background:oklch(0.82 0.12 85)"></span><span style="width:${(Math.max(g, 0) / Math.max(w, c)) * 100}%;background:oklch(0.84 0.13 160)"></span></div></div></div>`; }).join("");
      return `<div class="gh3"><div><div class="hk">Portfolio · ${plural(HOLDINGS.length, "holding")}</div><div class="bigv xl">${big}</div><div class="gr3">${sub}</div></div><div>${bar}</div></div>`; },
    hold: ({ h, us }) => { const c = h.costInr, v = h.value, g = h.gain; return `<div class="gh3"><div>${holdName(h, us)}<div class="bigv xl" style="margin-top:10px">${px(h, us)}</div><div class="gr3">${dayTxt(h)}</div></div><div><div class="gsp"><div class="gsp-l"><span><i style="background:oklch(0.82 0.12 85)"></i>Put in <b>${lakhS(c)}</b></span><span><i style="background:oklch(0.84 0.13 160)"></i>${g >= 0 ? "Made" : "Lost"} <b>${sInr(g)}</b> · ${spc(h.gainPct)}</span></div><div class="gsp-b"><span style="width:${(c / Math.max(v, c)) * 100}%;background:oklch(0.82 0.12 85)"></span><span style="width:${(Math.max(g, 0) / Math.max(v, c)) * 100}%;background:oklch(0.84 0.13 160)"></span></div></div></div></div>`; } },
  l4: { cls: "l4", hr: undefined, Hh: 520,
    all: ({ sub }) => `<div class="gh1"><div><div class="hk">Portfolio · ${plural(HOLDINGS.length, "holding")}</div><div class="flapbox">${H.ASOF.map((a) => `<span class="vi-as" data-k="${a.k}">${flap(lakh(H.VAL[a.i]))}</span>`).join("")}</div></div><div class="gr">${sub}</div></div>`,
    hold: ({ h, us }) => `<div class="gh1"><div>${holdName(h, us)}<div class="flapbox" style="margin-top:12px">${flap(px(h, us))}</div></div><div class="gr">${dayTxt(h)}</div></div>` },
};
function board(vk, understandRows) {
  const v = VARIANTS[vk];
  const views = `${K.allBlock({ asof: true, part: "hero", headFn: v.all, Hh: v.Hh, headroom: v.hr })}${HOLDINGS.map((h) => K.holdingBlock(h.symbol, { part: "hero", headFn: v.hold, Hh: v.Hh, headroom: v.hr })).join("")}`;
  return K.page3(`${K.radiosAll({ asof: true })}${P.greeting({ returns: vk === "l1", cash: vk === "l1" })}${selector()}${K.hero(`${controls()}${views}`, `slim ${v.cls}`)}${retHead()}${returns(vk === "l1")}${K.table3({ asof: true })}${vk === "l1" ? P.grid([[12, cashCard()]]) : ""}${K.money6(6)}${K.understand(understandRows)}`);
}
export const l1 = () => board("l1", [[["split2", 6], ["targets", 6]], [["map", 6], ["gain", 6]], [["what", 6], ["conc", 6]], [["grow", 12]]]);
export const l2 = () => board("l2", [[["conc", 5], ["split", 7]], [["what", 6], ["map", 6]], [["targets", 6], ["gain", 6]], [["grow", 12]]]);
export const l3 = () => board("l3", [[["split", 5], ["map", 7]], [["targets", 12]], [["gain", 6], ["conc", 6]], [["what", 6], ["grow", 6]]]);
export const l4 = () => board("l4", [[["targets", 6], ["split", 6]], [["conc", 4], ["map", 4], ["gain", 4]], [["what", 7], ["grow", 5]]]);
