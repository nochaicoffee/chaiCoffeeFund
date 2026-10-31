// Round 3 (2026-10-31): Prathik liked J1's dark stage and J2's lens and asked to see them together on a dark background, with the Race as a
// toggle, the holdings carousel across the whole width, the money-in grid, "the same money somewhere else", and the holdings table.
//   K1 Cockpit      the picker is a row of chips above one dark stage
//   K2 Rail         a watchlist rail down the left of the stage: pick a holding, its row lights up
//   K3 Dock         the sparkline cards ARE the picker, docked inside the stage across its whole width
//   K4 Night        the whole page dark, a ticker tape that scrolls and picks
//   K5 Time machine an "as of" control: the stage, the figures and the holdings table all go back to a day
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as H from "./history.mjs";
import * as P from "./parts.mjs";
import * as RU from "./returnsui.mjs";
import * as W from "./parts2.mjs";
import * as C from "./charts.mjs";
import { lensChart, lensRow } from "./heroes2.mjs";
import * as X from "./widgets4.mjs";
import { splitWidget } from "./splitwidget.mjs";
const { I, inr, fmt, plural } = L;
const { sum, pc, spc, usd, qty, lakh, HOLDINGS, VALUE, COST } = D;
const { card, cardHead, link, grid, hc, tip, col, fillc, symTile, lakhS, sInr, gainCls } = P;
const SYMS = D.SYMBOLS.map((s) => s.toLowerCase());
const RK = ["1m", "3m", "6m", "1y", "3y", "all"];

// ---------- the pieces of the page that come with every variation ----------
export const LINES = [
  { key: "you", label: "You", values: H.IDX, color: "oklch(0.82 0.17 152)", w: 3.4 },
  { key: "nifty", label: "Nifty 50", values: H.NIFTY, color: "oklch(0.78 0.1 200)", w: 2 },
  { key: "spx", label: "S&P 500 in rupees", values: H.SPX_INR, color: "oklch(0.74 0.12 262)", w: 2 },
  { key: "gold", label: "Gold", values: H.GOLD, color: "oklch(0.83 0.14 85)", w: 2 },
  { key: "fd", label: "A 7% deposit", values: H.FDI, color: "oklch(0.72 0.012 260)", w: 2, dash: "4 4" },
];
const WORDS = { "1m": "in the last month", "3m": "in three months", "6m": "in six months", "1y": "in the last year", "3y": "in three years", all: "since you started" };
const asofLabel = (a) => (a.k === "now" ? "" : `as of ${C.dayLabel(H.DAYS[a.i], "m")}`);

export function allBlock({ W: CW = 1360, asof = false, part = "both", headFn = null, Hh: CH = 360, headroom, ret2 = false } = {}) {
  const marks = asof ? H.ASOF.filter((a) => a.k !== "now").map((a) => ({ i: a.i, k: a.k, label: `as of ${C.dayLabel(H.DAYS[a.i], "m")}` })) : [];
  const worth = () => ({ W: CW, Hh: CH, headroom, dark: true, ml: 46, marks,
    series: [{ key: "val", values: H.VAL, kind: "area", color: "oklch(0.84 0.13 160)", w: 2.4 }, { key: "cost", values: H.COSTD, kind: "step", color: "oklch(0.82 0.12 85)", dash: "5 4", w: 1.6 }],
    bars: { values: H.FLOW, color: "oklch(0.72 0.1 258 / 0.8)" }, yfmt: (v) => `${(v / 100000).toFixed(0)}L`,
    lines: (j, v) => [{ t: L.fmtY(H.DAYS[j]), dim: true }, { t: `Worth ${lakhS(v.val)}`, b: true }, { t: `Put in ${lakhS(v.cost)}` }, { t: `Up ${sInr(v.val - v.cost)} · ${spc(v.val / v.cost - 1)}`, c: v.val >= v.cost ? "oklch(0.42 0.14 150)" : "oklch(0.5 0.16 25)" }] });
  worth.uid = "w";
  const race = () => ({ W: CW, Hh: CH, headroom, ml: 46, mr: 74, dark: true, rebase: true, endLabels: true, marks, yfmt: (v) => `${v.toFixed(0)}`,
    series: LINES.map((l) => ({ ...l, kind: "line", chip: (v) => `${v >= 100 ? "+" : "−"}${Math.abs(v - 100).toFixed(0)}%` })),
    lines: (j, v) => [{ t: L.fmtY(H.DAYS[j]), dim: true }, ...LINES.map((l) => ({ k: l.key, t: `${l.label} ${v[l.key] >= 100 ? "+" : "−"}${Math.abs(v[l.key] - 100).toFixed(1)}%`, b: l.key === "you", c: l.key === "you" ? "oklch(0.42 0.15 150)" : "oklch(0.3 0.03 260)" }))] });
  race.uid = "r";
  const delta = H.RANGES.map(([k, , days]) => { const s = H.rangeStart(days), e = H.lastIdx, g = H.VAL[e] - H.VAL[s] - sum(H.FLOW.slice(s + 1, e + 1)), p = H.IDX[e] / H.IDX[s] - 1; return `<span class="vi-rg" data-k="${k}" style="color:${p >= 0 ? "oklch(0.82 0.17 150)" : "oklch(0.74 0.16 25)"}">${sInr(g)} (${spc(p)}) ${WORDS[k]}</span>`; }).join("");
  const big = asof ? H.ASOF.map((a) => `<span class="vi-as" data-k="${a.k}">${lakh(H.VAL[a.i])}</span>`).join("") : lakh(VALUE);
  const sub = asof ? H.ASOF.map((a) => `<span class="vi-as" data-k="${a.k}" style="font-weight:800;color:${H.VAL[a.i] >= H.COSTD[a.i] ? "oklch(0.82 0.17 150)" : "oklch(0.74 0.16 25)"}">${a.k === "now" ? `${sInr(D.GAIN)} · ${spc(D.GAIN_PCT)} on ${lakh(COST)} put in` : `${asofLabel(a)} · ${sInr(H.VAL[a.i] - H.COSTD[a.i])} on ${lakh(H.COSTD[a.i])} put in · since then ${sInr(VALUE - H.VAL[a.i] - sum(H.FLOW.slice(a.i + 1)))} from the market`}</span>`).join("") : delta;
  const head = `<div class="h3head"><div><div class="hk">Portfolio</div><div class="bigv" style="margin-top:6px">${big}</div><div class="sub2" style="margin-top:6px">${sub}${asof ? "" : ""}</div></div><div class="h3pills"><span class="pill pill-on" style="background:oklch(1 0 0/.1);color:oklch(0.9 0.01 250)">${plural(HOLDINGS.length, "holding")}</span><span class="pill pill-on" style="background:oklch(1 0 0/.1);color:oklch(0.9 0.01 250)">NetApp ${pc(D.share(D.NETAPP), 0)}</span></div></div>`;
  const toggles = `<div class="lgrow dkl">${LINES.map((l) => `<label class="lgc" for="lg-${l.key}" style="--lc:${l.color}"><i></i>${l.label}</label>`).join("")}</div>`;
  const legend = `<div class="legend2" style="color:oklch(0.8 0.01 250)"><span><i style="background:oklch(0.84 0.13 160)"></i>Worth</span><span><i style="background:oklch(0.82 0.12 85)"></i>Put in</span><span><i style="background:oklch(0.72 0.1 258)"></i>Money added</span><span class="sub2" style="margin-left:auto">Move across the chart for any day</span></div>`;
  const dk = part !== "out", headUse = headFn ? headFn({ big, sub, asof }) : head;
  let kpis = dk ? W.kpiTrio().replaceAll('class="kpi hov"', 'class="kpi kpidk hov"') : W.kpiTrio();
  if (asof) { const mk = (k, v, sub) => `<div class="kd${dk ? "" : " lt"}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${sub}</div></div>`; kpis = H.ASOF.map((a) => { if (a.k === "now") return `<div class="v-as" data-k="now">${kpis}</div>`; const w0 = H.VAL[a.i], c0 = H.COSTD[a.i], since = VALUE - w0 - sum(H.FLOW.slice(a.i + 1)), added = sum(H.FLOW.slice(a.i + 1)); return `<div class="v-as" data-k="${a.k}"><div class="kdrow" style="grid-template-columns:repeat(4,1fr)">${mk("Worth then", lakh(w0), asofLabel(a))}${mk("Put in then", lakh(c0), `${sInr(w0 - c0)} · ${spc(w0 / c0 - 1)}`)}${mk("Added since", lakh(added), "buys less sales")}${mk("The market since", sInr(since), `${spc(H.IDX[H.lastIdx] / H.IDX[a.i] - 1)} time-weighted`)}</div></div>`; }).join(""); }
  if (ret2 && part === "out") kpis = asof ? H.ASOF.map((a) => `<div class="v-as" data-k="${a.k}">${a.k === "now" ? RU.sixCards() : RU.asofRows(a)}</div>`).join("") : RU.sixCards();
  if (part === "out") return `<div class="v-ln" data-k="all">${kpis}</div>`;
  const charts = `<div class="v-vw" data-k="worth">${C.rangeViews(worth)}${legend}</div><div class="v-vw" data-k="race">${C.rangeViews(race)}${toggles}</div>`;
  return `<div class="v-ln" data-k="all">${headUse}${charts}${part === "both" ? kpis : ""}</div>`;
}
export function holdingBlock(sym, { W: CW = 1360, part = "both", headFn = null, Hh: CH = 360, headroom, ret2 = false } = {}) {
  const h = D.holding(sym), us = h.market === "US", px = (v) => (us ? usd(v, 0) : `₹${Math.round(v).toLocaleString("en-IN")}`);
  const head = `<div class="h3head"><div class="row" style="gap:16px">${symTile(h, 54)}<div><div class="sx-t">${h.name}${P.srcTags(h)}</div><div class="sub2" style="margin:2px 0 0">${h.symbol} · ${h.assetType.replace("-", " ")} · ${us ? "United States" : "India"} · ${plural(h.trades.length, "trade")} since ${L.fmtY(h.since).split(", ")[1]}</div></div></div><div style="text-align:right"><div class="bigv">${us ? usd(h.price) : `₹${D.num2(h.price)}`}</div><div class="sub2" style="margin:2px 0 0;font-weight:800;color:${h.dayPct >= 0 ? "oklch(0.82 0.17 150)" : "oklch(0.74 0.16 25)"}">${h.dayPct >= 0 ? "▲" : "▼"} ${(Math.abs(h.dayPct) * 100).toFixed(2)}% today</div></div></div>`;
  const stat = (k, v, s) => `<div class="kd${part === "out" ? " lt" : ""}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  const stats = `<div class="kdrow">${stat("You hold", qty(h.quantity), h.assetType.includes("Fund") ? "units" : "shares")}${stat("You paid", us ? usd(h.avgCostNative) : `₹${D.num2(h.avgCostNative)}`, us ? `a share, at ₹${h.avgFx.toFixed(2)}` : "a share, on average")}${stat("Worth", lakhS(h.value), `${pc(D.share(h))} of what you hold`)}${stat("Gain", `${h.gain >= 0 ? "+" : "−"}${lakhS(Math.abs(h.gain))}`, `${spc(h.gainPct)}${us ? ` · rupee ${sInr(h.rateGain)}` : ""}`)}${stat("52-week range", `${px(h.lo)} – ${px(h.hi)}`, `${Math.round(((h.price - h.lo) / (h.hi - h.lo)) * 100)}% of the way up`)}${stat("Made on sales", h.realised ? lakhS(h.realised) : "none", h.stale ? `price from ${fmt(h.stale)}` : `price from ${h.src}`)}</div>`;
  const legend = `<div class="legend2" style="color:oklch(0.8 0.01 250)"><span><svg width="14" height="12"><circle cx="7" cy="6" r="4.5" fill="var(--card-teal)"/></svg>bought</span><span><svg width="14" height="12"><circle cx="7" cy="6" r="4.5" fill="var(--card-violet)"/></svg>ESPP</span><span><svg width="14" height="12"><path d="M2,11 l5,-9 l5,9Z" fill="var(--card-sapphire)"/></svg>RSU vest</span><span><svg width="14" height="12"><path d="M2,1 l5,9 l5,-9Z" fill="var(--card-ruby)"/></svg>sold</span><span class="sub2" style="margin-left:auto">the dashed line is what you paid · a mark for each of your trades</span></div>`;
  if (part === "out") return `<div class="v-ln" data-k="${sym.toLowerCase()}">${ret2 ? RU.holdingStats(h) : stats}</div>`;
  const headUse = headFn ? headFn({ h, us }) : head;
  return `<div class="v-ln" data-k="${sym.toLowerCase()}">${headUse}${lensChart(sym, { dark: true, W: CW, Hh: CH, headroom })}${legend}${part === "both" ? stats : ""}</div>`;
}
export const toolbar = ({ asof = false, left = "" } = {}) => `<div class="tb">${left}<span class="tbr">${asof ? `<span class="sub2" style="margin:0">As of</span>${C.chips("as", H.ASOF.map((a) => [a.k, a.label]), { cls: "dk" })}` : ""}${C.chips("vw", [["worth", "Worth"], ["race", "Race"]], { cls: "dk tg-vw" })}${C.rangeChips("dk tg-rg")}</span></div>`;
const views = (opts) => `${allBlock(opts)}${HOLDINGS.map((h) => holdingBlock(h.symbol, opts)).join("")}`;

// ---------- pickers ----------
export const spark2 = (vals, id, { w = 120, h = 34 } = {}) => { const lo = Math.min(...vals), hi = Math.max(...vals), pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, h - 3 - ((v - lo) / (hi - lo || 1)) * (h - 6)]), up = vals.at(-1) >= vals[0], c = up ? "oklch(0.82 0.17 150)" : "oklch(0.74 0.16 25)", d = pts.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" "); return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".35"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs><path d="${d} L${w},${h} L0,${h}Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/></svg>`; };
export const last90 = (arr) => arr.slice(H.lastIdx - 90, H.lastIdx + 1);
export const allTile = (s = 34) => `<span class="symt" style="width:${s}px;height:${s}px;border-radius:${Math.round(s * 0.3)}px;background:linear-gradient(155deg,oklch(0.4 0.03 255),oklch(0.22 0.015 260))">${I.invest(Math.round(s * 0.5))}</span>`;
const rail = () => `<aside class="wrail"><div class="wr-h"><b>Watchlist</b><span class="sub2" style="margin:0">pick one</span></div>
  <label class="wr" for="ln-all">${allTile(36)}<div><b>Everything</b><small>${lakhS(VALUE)}</small></div>${spark2(last90(H.VAL), "wr-all", { w: 56, h: 28 })}<em class="up">${spc(D.GAIN_PCT, 0)}</em></label>
  ${HOLDINGS.map((h) => `<label class="wr" for="ln-${h.symbol.toLowerCase()}">${symTile(h, 36)}<div><b>${h.symbol}</b><small>${h.name}</small></div>${spark2(last90(H.PRICE[h.symbol]), `wr-${h.symbol}`, { w: 56, h: 28 })}<em class="${gainCls(h.gain)}">${spc(h.gainPct, 0)}</em></label>`).join("")}</aside>`;
export const dock = () => `<div class="dock"><div class="dock-h"><b>Your holdings</b><span class="sub2" style="margin:0">tap a card: the stage above follows · scroll for more</span></div><div class="crs">
  <label class="hcard" for="ln-all"><div class="t">${allTile(36)}<div><b>All</b><small>${plural(HOLDINGS.length, "holding")}</small></div></div>${spark2(last90(H.VAL), "dk-all", { w: 168, h: 112 })}<div class="sub2" style="margin:0;color:oklch(0.72 0.01 250)">Put in ${lakh(COST)} · ${spc(D.GAIN_PCT, 0)} on cost</div><div><div class="p">${lakh(VALUE)}</div><div class="c ${gainCls(D.DAY)}">${D.DAY >= 0 ? "▲" : "▼"} ${(Math.abs(D.DAY_PCT) * 100).toFixed(2)}% today</div></div></label>
  ${HOLDINGS.map((h) => `<label class="hcard" for="ln-${h.symbol.toLowerCase()}"><div class="t">${symTile(h, 36)}<div><b>${h.symbol}</b><small>${h.name}</small></div></div>${W.spark(h.symbol, { w: 168, h: 112 })}<div class="sub2" style="margin:0;color:oklch(0.72 0.01 250)">You hold ${qty(h.quantity)} · ${spc(h.gainPct, 0)} on cost</div><div><div class="p">${h.market === "US" ? usd(h.price) : `₹${D.num2(h.price)}`}</div><div class="c ${gainCls(h.dayPct)}">${h.dayPct >= 0 ? "▲" : "▼"} ${(Math.abs(h.dayPct) * 100).toFixed(2)}% today</div></div></label>`).join("")}</div></div>`;
const tape = () => { const items = [`<label class="tp" for="ln-all"><b>ALL</b><span>${lakh(VALUE)}</span><em class="${gainCls(D.DAY)}">${D.DAY >= 0 ? "▲" : "▼"} ${(Math.abs(D.DAY_PCT) * 100).toFixed(2)}%</em></label>`, ...HOLDINGS.map((h) => `<label class="tp" for="ln-${h.symbol.toLowerCase()}"><b>${h.symbol}</b><span>${h.market === "US" ? usd(h.price) : `₹${D.num2(h.price)}`}</span><em class="${gainCls(h.dayPct)}">${h.dayPct >= 0 ? "▲" : "▼"} ${(Math.abs(h.dayPct) * 100).toFixed(2)}%</em></label>`)]; const one = items.join(""); return `<div class="tape"><div class="tape-in">${one}${one}</div></div>`; };

export const hero = (inner, cls = "") => `<section class="sx sx-dk h3 ${cls}">${inner}</section>`;

// ---------- the widgets that follow ----------
export function carouselFull() {
  const cards = HOLDINGS.map((h) => `<div class="hcard hcw"><div class="t">${symTile(h, 36)}<div><b>${h.symbol}</b><small>${h.name}</small></div></div>${W.spark(h.symbol, { w: 216, h: 120 })}<div class="sub2" style="margin:0;color:oklch(0.72 0.01 250)">You hold ${qty(h.quantity)} · ${spc(h.gainPct, 0)} on cost</div><div><div class="p">${h.market === "US" ? usd(h.price) : `₹${D.num2(h.price)}`}</div><div class="c ${gainCls(h.dayPct)}">${h.dayPct >= 0 ? "▲" : "▼"} ${(Math.abs(h.dayPct) * 100).toFixed(2)}% today</div></div></div>`).join("");
  return card(`${cardHead("Your holdings", "last three months · scroll for more", `<span class="row" style="gap:8px"><span class="btn btn-icon" style="width:34px;height:34px">${I.chevL(12)}</span><span class="btn btn-icon" style="width:34px;height:34px">${I.chevR(12)}</span></span>`)}<div class="crs crs3">${cards}</div>`, { gap: 12, style: "overflow:hidden" });
}
const mmData = () => [{ k: "You, as it went", v: VALUE, c: LINES[0].color, me: true }, { k: "All in Nifty 50", v: H.sameMoney(H.NIFTY), c: "oklch(0.58 0.11 200)" }, { k: "All in the S&P 500", v: H.sameMoney(H.SPX_INR), c: "oklch(0.5 0.13 262)" }, { k: "All in gold", v: H.sameMoney(H.GOLD), c: "oklch(0.68 0.14 85)" }, { k: "All in a 7% deposit", v: H.sameMoney(H.FDI), c: "oklch(0.6 0.012 260)" }];
const mmDiff = (m) => (m.me ? `${sInr(VALUE - COST)} on ${lakh(COST)}` : m.v > VALUE ? `${lakhS(m.v - VALUE)} more than you` : `${lakhS(VALUE - m.v)} less than you`);
export function sameTiles() {
  const mm = mmData(), mx = Math.max(...mm.map((m) => m.v));
  return `<div class="col2"><div class="card-t" style="padding:4px 4px 0">The same money, somewhere else<small>your buys and sales, on their own dates</small></div><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:20px">${mm.map((m) => `<div class="same${m.me ? " me" : ""}"><div class="k"><i style="background:${m.c}"></i>${m.k}</div><div class="v">${lakh(m.v)}</div><div class="bar"><i style="width:${(m.v / mx) * 100}%;background:${m.c}"></i></div><div class="d ${m.me ? "" : m.v > VALUE ? "dn" : "up"}">${mmDiff(m)}</div></div>`).join("")}</div></div>`;
}
export function sameList({ extra = 0 } = {}) {
  const mm = mmData(), mx = Math.max(...mm.map((m) => m.v));
  return card(`${cardHead("The same money, somewhere else", "your buys and sales, on their own dates")}${mm.map((m) => `<div class="smr${m.me ? " me" : ""}"><span class="n"><i style="background:${m.c}"></i>${m.k}</span><b>${lakh(m.v)}</b><div class="bar"><i style="width:${(m.v / mx) * 100}%;background:${m.c}"></i></div><small class="${m.me ? "" : m.v > VALUE ? "dn" : "up"}">${mmDiff(m)}</small></div>`).join("")}${extra ? `<div class="kv"><span>Put in, every buy less every sale</span><b>${lakh(COST)}</b></div>` : ""}<div class="card-note">A counterfactual, never advice: each buy and sale put into the index on its own day. An RSU vest counts as a buy at fair value.</div>`, { gap: 10 });
}
/** The holdings table. `asof` adds a version per "as of" day (the same rows as that day stood). */
export function table3({ asof = false } = {}) {
  const cols = "2.6fr 0.8fr 1.1fr 1.2fr 1.1fr 1.2fr 1.7fr 1.2fr";
  const th = (t, r) => `<span class="th"${r ? ' style="text-align:right"' : ""}>${t}</span>`;
  const head = (c5) => `<div class="hrow" style="grid-template-columns:${cols};padding:0 0 8px">${th("Holding")}${th("Quantity", 1)}${th("Average cost", 1)}${th("Price", 1)}${th(c5, 1)}${th("Value", 1)}${th("Gain", 1)}${th("Share")}</div>`;
  const row = (h, cls, d) => { const us = h.market === "US"; return `<div class="hrow ${cls}" style="grid-template-columns:${cols}"><div class="cell-name">${symTile(h, 38)}<div class="nm2"><b>${h.name}${d.tags ?? ""}</b><small>${h.symbol} · ${h.assetType.replace("-", " ")} · since ${L.fmtY(h.since).split(", ")[1]}</small></div></div>
    <div class="r"><b class="num">${qty(d.q)}</b></div><div class="r"><b class="num">${us ? usd(d.avg) : `₹${Math.round(d.avg).toLocaleString("en-IN")}`}</b>${us ? `<small>at ₹${d.avgFx.toFixed(2)}</small>` : ""}</div>
    <div class="r"><b class="num">${us ? usd(d.px) : `₹${D.num2(d.px)}`}</b><small>${d.src}</small></div><div class="r">${d.c5}</div><div class="r"><b class="num">${inr(d.value)}</b>${us ? `<small>${usd(d.value / d.fx, 0)}</small>` : ""}</div>
    <div class="r"><b class="num ${gainCls(d.gain)}">${d.gain >= 0 ? "+" : "−"}${inr(Math.abs(d.gain))}</b><small class="${gainCls(d.gain)}">${spc(d.gainPct)}</small></div><div><b style="font-size:12.5px">${pc(d.share)}</b><div class="shbar"><span style="width:${Math.min(100, d.share * 250)}%;background:${fillc(h.color)}"></span></div></div></div>`; };
  const nowD = (h) => ({ q: h.quantity, avg: h.avgCostNative, avgFx: h.avgFx, px: h.price, fx: h.market === "US" ? D.FX_NOW : 1, src: h.stale ? `${h.src} · ${fmt(h.stale)}` : h.src, c5: P.dchip(h.dayPct), value: h.value, gain: h.gain, gainPct: h.gainPct, share: D.share(h), tags: P.srcTags(h) });
  const block = (list, nd, c5) => { const ind = list.filter((h) => h.market === "IND"), us = list.filter((h) => h.market === "US"), tv = (l) => sum(l.map((h) => nd(h).value)); return `${head(c5)}<div class="hgrp mk-ind"><span>India · INR</span><b>${plural(ind.length, "holding")} · ${lakhS(tv(ind))}</b></div>${ind.map((h) => row(h, "mk-ind", nd(h))).join("")}<div class="hgrp mk-us"><span>United States · USD</span><b>${plural(us.length, "holding")} · ${lakhS(tv(us))}</b></div>${us.map((h) => row(h, "mk-us", nd(h))).join("")}`; };
  let body;
  if (!asof) body = `<div>${block(HOLDINGS, nowD, "Today")}</div>`;
  else body = H.ASOF.map((a) => { const at = H.ASOF.find((x) => x.k === a.k); if (a.k === "now") return `<div class="v-as" data-k="now">${block(HOLDINGS, nowD, "Today")}</div>`; const rows = D.SYMBOLS.map((s) => ({ h: D.INSTRUMENTS[s], s, d: H.holdingAt(s, at.i) })).filter((x) => x.d.q > 0), tot = sum(rows.map((x) => x.d.value)); const list = rows.map((x) => { const base = HOLDINGS.find((hh) => hh.symbol === x.s); return base; }).filter(Boolean); const map = Object.fromEntries(rows.map((x) => [x.s, x.d])); const nd = (h) => { const d = map[h.symbol]; return { q: d.q, avg: d.avgNative, avgFx: d.avgFx, px: d.px, fx: d.fx, src: "that day's close", c5: `<span class="dchip ${gainCls(d.sinceThen)}">${P.arrow(d.sinceThen)}${pc(Math.abs(d.sinceThen), 1)}</span>`, value: d.value, gain: d.gain, gainPct: d.gainPct, share: d.value / tot }; }; return `<div class="v-as" data-k="${a.k}">${block(list, nd, "Since then")}</div>`; }).join("");
  const chips = C.chips("mk", [["all", `All ${HOLDINGS.length}`], ["ind", "India 7"], ["us", "US 3"]], {});
  return card(`${cardHead(asof ? "Holdings as they stood" : "Holdings", asof ? "move the As of control: every row goes back to that day (the price is its price then)" : "folded from the trade log · India in rupees, the US in dollars at today's rate", chips)}${body}${asof ? `<div class="card-note">A holding you hadn't bought yet is left out. "Since then" is how its price has moved from that day to now.</div>` : ""}`, { gap: 6 });
}
export const money6 = (n = 6) => grid([[n, W.moneyMatrix({ year: true })], [12 - n, sameList({ extra: n === 5 ? 1 : 0 })]]);

// ---------- the "understand it" section: how it is split, where the weight is, what-ifs, your own targets and limits ----------
const WG = { split2: splitWidget, split: X.splitExplorer, targets: X.targets, map: X.weightMap, what: X.whatIf, grow: X.growth, conc: X.concentration, gain: X.gainShare };
export const understand = (rows) => `${X.sectionHead("Understand it", "how it's split, where the weight sits, and how it would move: arithmetic on your holdings and on numbers you set; the app suggests nothing")}${rows.map((r) => grid(r.map(([w, n]) => [n, WG[w](n)]))).join("")}`;
// ---------- the page ----------
export const radiosAll = ({ asof = false, def = "all" } = {}) => `${C.radios("ln", ["all", ...SYMS], def)}${C.radios("vw", ["worth", "race"], "worth")}${C.radios("rg", RK, "1y")}${LINES.map((l) => `<input type="checkbox" class="pk-in" id="lg-${l.key}"${l.key === "fd" ? "" : " checked"}>`).join("")}${C.radios("mk", ["all", "ind", "us"], "all")}${asof ? C.radios("as", H.ASOF.map((a) => a.k), "now") : ""}${X.widgetRadios()}`;
export const radiosAllLite = () => `${C.radios("ln", ["all"], "all")}${C.radios("vw", ["worth", "race"], "worth")}${C.radios("rg", RK, "1y")}${LINES.map((l) => `<input type="checkbox" class="pk-in" id="lg-${l.key}"${l.key === "fd" ? "" : " checked"}>`).join("")}${C.radios("as", H.ASOF.map((a) => a.k), "now")}`;
export const page3 = (inner, { night = false } = {}) => { const html = P.page(inner); return night ? html.replace('class="chai-app desk"', 'class="chai-app desk night"') : html; };

// K1 Cockpit: the picker is a row of chips above one dark stage.
export const k1 = () => page3(`${radiosAll()}${P.greeting()}${hero(`${toolbar({ left: `<div><div class="sx-t">Portfolio performance</div><div class="sub2" style="margin:3px 0 0">pick what to look at · everything, or one holding with your trades on it</div></div>` })}${lensRow("dk")}${views()}`)}${carouselFull()}${money6(5)}${understand([[["split", 7], ["conc", 5]], [["map", 6], ["gain", 6]], [["what", 6], ["targets", 6]], [["grow", 12]]])}${table3()}`);

// K2 Rail: a watchlist down the left; the stage beside it.
export const k2 = () => page3(`${radiosAll()}${P.greeting()}${hero(`<div class="h3rail">${rail()}<div class="h3main">${toolbar({ left: `<div class="sx-t">Portfolio performance</div>` })}${views({ W: 1060 })}</div></div>`)}${carouselFull()}${sameTiles()}${grid([[6, W.moneyMatrix({ year: true, kv: 1 })], [6, W.portfolioCard()]])}${understand([[["targets", 6], ["split", 6]], [["conc", 4], ["map", 4], ["gain", 4]], [["what", 7], ["grow", 5]]])}${table3()}`);

// K3 Dock: the sparkline cards are the picker, docked inside the stage.
export const k3 = () => page3(`${radiosAll()}${P.greeting()}${hero(`${toolbar({ left: `<div class="sx-t">Portfolio performance</div>` })}${views()}${dock()}`, "h3dock")}${money6(5)}${understand([[["split", 5], ["map", 7]], [["gain", 6], ["conc", 6]], [["targets", 12]], [["what", 6], ["grow", 6]]])}${table3()}`);

// K4 Night: the whole page dark; a ticker tape that scrolls and picks.
export const k4 = () => page3(`${radiosAll()}${P.greeting()}${hero(`${tape()}${toolbar({ left: `<div class="sx-t">Portfolio performance</div>` })}${views()}`, "h3night")}${carouselFull()}${sameTiles()}${grid([[6, W.moneyMatrix({ year: true, kv: 1, cellH: 33 })], [6, P.movers({ n: 5, extra: 1 })]])}${understand([[["conc", 5], ["split", 7]], [["what", 12]], [["targets", 6], ["gain", 6]], [["map", 6], ["grow", 6]]])}${table3()}`, { night: true });

// K5 Time machine: an "as of" control takes the stage, the figures and the table back to a day.
export const k5 = () => page3(`${radiosAll({ asof: true })}${P.greeting()}${hero(`${toolbar({ asof: true, left: `<div><div class="sx-t">Portfolio performance</div><div class="sub2" style="margin:3px 0 0">go back to a day: the figures and the table below follow</div></div>` })}${lensRow("dk")}${views({ asof: true })}`)}${table3({ asof: true })}${carouselFull()}${money6(6)}${understand([[["split", 7], ["targets", 5]], [["map", 6], ["what", 6]], [["grow", 7], ["conc", 5]], [["gain", 12]]])}`);
