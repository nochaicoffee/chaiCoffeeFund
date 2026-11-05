// The page's "How it's split" widget (2026-11-04): a Spin wheel and a Treemap in the Subscriptions cost map's style, behind one toggle, sharing the six
// slice chips. The treemap's tiles are the app's: card-gradient blocks with the ring texture, a lift and a dim on hover, a picked ring with a check, tiles that
// glide when the slicing changes, a hover card, and "Try without" (hold the page without one holding). Pure HTML, CSS and radios. Sample data, made up.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import { data, KEYS, chipsRow, squarify } from "./splitvariants.mjs";
import { spinBody } from "./donuts.mjs";
const { I } = L;
const { sum, pc, spc, usd, qty, lakh, HOLDINGS, VALUE, COST } = D;
const { card, cardHead, hc, tip, lakhS, sInr, symTile } = P;
export const W = 652, H = 440, PAD = 4, HEAD = 34;
const SYMS = D.SYMBOLS;
const TREE_KEYS = ["asset", "market", "kind", "sector", "holding"];
const grad = (c) => `linear-gradient(155deg,var(--card-${c}-from),var(--card-${c}-to))`;
const pct = (v, of) => `${((v / of) * 100).toFixed(3)}%`;
const box = (r) => ({ l: pct(r.x, W), t: pct(r.y, H), w: pct(r.w, W), h: pct(r.h, H) });
const sorted = (a) => [...a].sort((x, y) => y.v - x.v);

/** For one slicing: each holding's rectangle and the group tiles behind them. */
function layoutFor(key, holdings = HOLDINGS) {
  if (key === "holding") { const rs = squarify(sorted(holdings.map((hd) => ({ hd, v: hd.value }))), 0, 0, W, H); return { tiles: Object.fromEntries(rs.map((r) => [r.hd.symbol, { ...r, color: r.hd.color }])), groups: [] }; }
  const d = data(key), gr = squarify(sorted(d.list.map((g, i) => ({ g, i, v: g.value }))), 0, 0, W, H), tiles = {}, groups = [];
  for (const r of gr) {
    const head = r.w > 110 && r.h > 70 ? HEAD : 0, x = r.x + PAD, y = r.y + head + (head ? 0 : PAD), w = r.w - PAD * 2, h = r.h - head - PAD * (head ? 1 : 2);
    groups.push({ ...r, head, g: r.g, share: r.g.value / d.total });
    squarify(sorted(r.g.items.map((it) => ({ hd: it.h, v: it.value }))), x, y, w, h).forEach((c) => (tiles[c.hd.symbol] = { ...c, color: r.g.color }));
  }
  return { tiles, groups };
}
const LAY = Object.fromEntries(TREE_KEYS.map((k) => [k, layoutFor(k)]));
const WITHOUT = Object.fromEntries(SYMS.map((s) => [s, layoutFor("holding", HOLDINGS.filter((h) => h.symbol !== s)).tiles]));

function tile(h) {
  const us = h.market === "US", vars = [];
  for (const k of TREE_KEYS) { const t = LAY[k].tiles[h.symbol], b = box(t); vars.push(`--l-${k}:${b.l}`, `--t-${k}:${b.t}`, `--w-${k}:${b.w}`, `--h-${k}:${b.h}`, `--bg-${k}:${grad(t.color)}`); }
  for (const s of SYMS) if (s !== h.symbol) { const b = box(WITHOUT[s][h.symbol]); vars.push(`--wl-${s}:${b.l}`, `--wt-${s}:${b.t}`, `--ww-${s}:${b.w}`, `--wh-${s}:${b.h}`); }
  const card2 = hc({ h: h.name, t: lakhS(h.value), d: `${pc(D.share(h))} of what you hold`, rows: [["You hold", `${qty(h.quantity)} ${h.assetType.includes("Fund") ? "units" : "shares"}`], ["You paid", us ? usd(h.avgCostNative) : `₹${D.num2(h.avgCostNative)}`], ["Gain", `${h.gain >= 0 ? "+" : "−"}${lakhS(Math.abs(h.gain))} · ${spc(h.gainPct, 0)}`], ["Today", `${h.dayPct >= 0 ? "▲" : "▼"} ${(Math.abs(h.dayPct) * 100).toFixed(2)}%`]], f: "Click to pick it", w: 240 });
  return `<div class="tile hov" data-s="${h.symbol}" tabindex="0" style="${vars.join(";")}"><label class="tl rt" for="tp-${h.symbol}"><span class="tr1"><span class="tnm"><b class="tn">${h.name}</b><small class="td">${h.symbol} · ${h.assetType.replace("-", " ")}</small></span><em class="ts">${pc(D.share(h), 0)}</em></span><span class="tx">${h.symbol.slice(0, 2)}</span><span class="tr2"><b class="tv">${lakhS(h.value)}</b><small class="tw2">worth${h.stale ? " · old price" : ""}</small></span></label><label class="twl" for="tw-${h.symbol}">Try without</label><span class="chk">${I.check(12)}</span>${tip(card2, { w: 240, x: "c", y: "up", off: 8 })}</div>`;
}
const groupBgs = () => TREE_KEYS.filter((k) => k !== "holding").map((k) => `<div class="tgl" data-k="${k}">${LAY[k].groups.map((r) => { const b = box(r); return `<div class="tgb rt" style="left:${b.l};top:${b.t};width:${b.w};height:${b.h};background:${grad(r.g.color)}">${r.head ? `<span class="tgh"><b>${r.g.name}</b><em>${lakhS(r.g.value)} · ${pc(r.share, 0)}</em></span>` : ""}</div>`; }).join("")}</div>`).join("");

const strip = () => {
  const row = (h) => `<span class="sp1">${symTile(h, 28)}<b>${h.name}</b> · ${qty(h.quantity)} ${h.assetType.includes("Fund") ? "units" : "shares"} · worth <b>${lakhS(h.value)}</b> · ${spc(h.gainPct, 0)} on cost · ${pc(D.share(h))} of the whole</span>`;
  return `<div class="tmstrip"><div class="tpv"><div class="v-tp" data-k="none"><span class="sub2" style="margin:0">Click a tile to pick it · hover for its card · hover a tile in Holding view for Try without</span></div>${HOLDINGS.map((h) => `<div class="v-tp" data-k="${h.symbol}">${row(h)}</div>`).join("")}</div>
  <div class="twv"><div class="v-tw" data-k="none"></div>${HOLDINGS.map((h) => { const left = VALUE - h.value, gl = D.GAIN - h.gain; return `<div class="v-tw" data-k="${h.symbol}"><span class="sp1 tw"><b>Without ${h.name}:</b> ${lakh(left)} left (${sInr(-h.value)}), a gain of ${sInr(gl)} on ${lakh(COST - h.costInr)}. <label class="twreset" for="tw-none">${I.undo(11)} Put it back</label></span></div>`; }).join("")}</div></div>`;
};
const treemap = () => `<div class="tmw"><div class="tmxw"><div class="tmx">${groupBgs()}${HOLDINGS.map(tile).join("")}</div></div>${strip()}</div>`;

export function splitWidget() {
  const toggle = C.chips("vz", [["wheel", "Spin wheel"], ["tree", "Treemap"]]);
  const radios = `${C.radios("vz", ["wheel", "tree"], "wheel")}${C.radios("ps", Array.from({ length: 10 }, (_, i) => String(i)), "0")}${C.radios("tp", [...SYMS, "none"], "none")}${C.radios("tw", ["none", ...SYMS], "none")}`;
  return card(`${radios}${cardHead("How it's split", "slice it six ways", toggle)}<div class="slrow">${chipsRow()}</div>
  <div class="v-vz" data-k="wheel"><div class="spx splw" style="--bh:520px">${spinBody()}</div></div>
  <div class="v-vz" data-k="tree">${treemap()}</div>
  <div class="card-note vzn"><span class="vz1">The pointer reads the slice at the top. Pick one from the list: the wheel spins, and its holdings show beside it.</span><span class="vz2">Blocks are sized by worth. Pick a slicing and they glide into their groups; in Holding view, hover one and press Try without to see the rest grow. How it came in isn't a layout here: it shows the holdings.</span></div>`, { gap: 12, cls: "sbtw" });
}
