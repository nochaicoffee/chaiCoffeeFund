// Round 2 (2026-10-31): five directions after Prathik shared a dashboard he liked (a dark performance stage with range chips and a crosshair, KPI cards,
// a trading-activity grid, trending cards, a transactions feed) and asked for beautiful variations with good widgets and interactions.
//   J1 Stage   a dark performance stage: range chips, a crosshair, money-in bars under it; KPI cards, portfolio card, money-in matrix, sparkline cards, feed
//   J2 Lens    pick any holding (or all): its price, what you paid and every trade of yours marked on the line
//   J3 Race    your return against Nifty, the S&P in rupees, gold and a 7% deposit: toggle lines, switch range, see the same money elsewhere
//   J4 Rings   a ring a year, a spoke a month, how money came in: growth rings of the portfolio
//   J5 Flow    where the money came from, what it became and where it sits: a flow diagram that lights up on hover
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as H from "./history.mjs";
import * as P from "./parts.mjs";
import * as W from "./parts2.mjs";
import * as C from "./charts.mjs";
const { I, inr, fmt, plural } = L;
const { sum, pc, spc, usd, qty, lakh, HOLDINGS, VALUE, COST } = D;
const { card, cardHead, link, grid, hc, tip, col, fillc, symTile, lakhS, sInr, gainCls } = P;
const SYMS = D.SYMBOLS.map((s) => s.toLowerCase());
const board = (radioHtml, body) => P.page(`${radioHtml}${P.greeting()}${body}`);
const idxOf = (iso) => H.DAYS.indexOf(iso);

// ---------- J1 Stage ----------
const RANGE_WORDS = { "1m": "in the last month", "3m": "in three months", "6m": "in six months", "1y": "in the last year", "3y": "in three years", all: "since you started" };
export function stage() {
  const views = C.rangeViews(() => ({
    W: 940, Hh: 338, dark: true, ml: 46,
    series: [{ key: "val", values: H.VAL, kind: "area", color: "oklch(0.84 0.13 160)", w: 2.4 }, { key: "cost", values: H.COSTD, kind: "step", color: "oklch(0.82 0.12 85)", dash: "5 4", w: 1.6 }],
    bars: { values: H.FLOW, color: "oklch(0.72 0.1 258 / 0.8)" }, yfmt: (v) => `${(v / 100000).toFixed(0)}L`,
    lines: (j, v) => [{ t: L.fmtY(H.DAYS[j]), dim: true }, { t: `Worth ${lakhS(v.val)}`, b: true }, { t: `Put in ${lakhS(v.cost)}` }, { t: `Up ${sInr(v.val - v.cost)} · ${spc(v.val / v.cost - 1)}`, c: v.val >= v.cost ? "oklch(0.42 0.14 150)" : "oklch(0.5 0.16 25)" }],
  }));
  const delta = H.RANGES.map(([k, , days]) => { const s = H.rangeStart(days), e = H.lastIdx, g = H.VAL[e] - H.VAL[s] - sum(H.FLOW.slice(s + 1, e + 1)), p = H.IDX[e] / H.IDX[s] - 1; return `<span class="vi-rg ${p >= 0 ? "" : ""}" data-k="${k}" style="color:${p >= 0 ? "oklch(0.82 0.17 150)" : "oklch(0.74 0.16 25)"}">${sInr(g)} (${spc(p)}) ${RANGE_WORDS[k]}</span>`; }).join("");
  return `<section class="sx sx-dk"><div class="sx-h"><div><div class="sx-t">Portfolio performance</div><div class="bigv" style="margin-top:8px">${lakh(VALUE)}</div><div class="sub2" style="margin-top:6px;font-weight:800">${delta}</div></div>${C.rangeChips("dk")}</div>${views}
  <div class="legend2" style="color:oklch(0.8 0.01 250)"><span><i style="background:oklch(0.84 0.13 160)"></i>Worth</span><span><i style="background:oklch(0.82 0.12 85)"></i>Put in</span><span><i style="background:oklch(0.72 0.1 258)"></i>Money added</span><span class="sub2" style="margin-left:auto">Move across the chart for any day</span></div></section>`;
}
export const j1 = () => board(C.radios("rg", ["1m", "3m", "6m", "1y", "3y", "all"], "1y"), `${P.attention()}${grid([[8, `<div class="col2">${W.kpiTrio()}${stage()}</div>`], [4, W.portfolioCard()]])}${grid([[4, W.moneyMatrix()], [4, W.carousel()], [4, W.txFeed()]])}${grid([[12, P.holdingsTable()]])}`);

// ---------- J2 Lens ----------
const lensTrades = (sym) => D.TRADES.filter((t) => (sym === "all" || t.symbol === sym) && !(t.source === "RSU" && t.tradeType === "Sell"));
export function lensChart(sym, { dark = false, W: CW = 980, Hh: CH = 360, headroom } = {}) {
  const all = sym === "all", h = all ? null : D.holding(sym), s = all ? H.FIRST_IDX : H.FIRST[sym], e = H.lastIdx;
  const bright = dark ? `color-mix(in oklch, var(--card-${all ? "emerald" : h.color}) 62%, white)` : null;
  const series = all ? [{ key: "val", values: H.VAL, kind: "area", color: dark ? "oklch(0.84 0.13 160)" : "oklch(0.55 0.13 160)", w: 2.4 }, { key: "cost", values: H.COSTD, kind: "step", color: dark ? "oklch(0.82 0.12 85)" : "oklch(0.6 0.12 70)", dash: "5 4", w: 1.6 }]
    : [{ key: "px", values: H.PRICE[sym], kind: "area", color: dark ? bright : col(h.color), w: 2.4 }, { key: "avg", values: Array(H.DAYS.length).fill(h.avgCostNative), kind: "line", color: dark ? "oklch(0.92 0.01 250)" : "oklch(0.35 0.01 260)", dash: "5 4", w: 1.5 }];
  const us = !all && h.market === "US", f = (v) => (us ? usd(v) : `₹${D.num2(v)}`);
  const markers = lensTrades(sym).map((t) => { const i = idxOf(t.tradeDate); return { i, v: all ? H.VAL[i] : t.price, shape: t.tradeType === "Sell" ? "down" : t.source === "RSU" ? "up" : "dot", color: t.tradeType === "Sell" ? "var(--card-ruby)" : t.source === "RSU" ? "var(--card-sapphire)" : t.source === "ESPP" ? "var(--card-violet)" : "var(--card-teal)", title: `${t.tradeType === "Sell" ? "Sold" : t.source === "RSU" ? "RSU vest of" : t.source === "ESPP" ? "ESPP bought" : "Bought"} ${D.qty(t.quantity)}${all ? ` ${t.symbol}` : ""} on ${L.fmtY(t.tradeDate)}` }; });
  return C.chartSvg({ uid: `ln-${sym}`, cols: 32, headroom, dark, W: CW, Hh: CH, s, e, series, markers, ml: 52, yfmt: all ? (v) => `${(v / 100000).toFixed(0)}L` : (v) => (us ? `$${v.toFixed(0)}` : `₹${v >= 1000 ? Math.round(v).toLocaleString("en-IN") : v.toFixed(0)}`),
    lines: all ? (j, v) => [{ t: L.fmtY(H.DAYS[j]), dim: true }, { t: `Worth ${lakhS(v.val)}`, b: true }, { t: `Put in ${lakhS(v.cost)}` }, { t: `Up ${sInr(v.val - v.cost)}`, c: v.val >= v.cost ? "oklch(0.42 0.14 150)" : "oklch(0.5 0.16 25)" }]
      : (j, v) => [{ t: L.fmtY(H.DAYS[j]), dim: true }, { t: `Price ${f(v.px)}`, b: true }, { t: `You paid ${f(v.avg)} on average` }, { t: `${spc(v.px / v.avg - 1)} on it`, c: v.px >= v.avg ? "oklch(0.42 0.14 150)" : "oklch(0.5 0.16 25)" }] });
}
function lensView(sym) {
  const all = sym === "all", h = all ? null : D.holding(sym), us = !all && h.market === "US";
  const stat = (k, v, s = "") => `<div><div class="hk">${k}</div><div style="font-size:19px;font-weight:800;letter-spacing:-0.01em;margin-top:3px">${v}</div>${s ? `<div class="sub2" style="margin:2px 0 0">${s}</div>` : ""}</div>`;
  const head = all
    ? `<div class="row" style="gap:16px"><span class="symt" style="width:54px;height:54px;border-radius:17px;background:linear-gradient(155deg,oklch(0.3 0.02 255),oklch(0.16 0.01 260))">${I.invest(24)}</span><div><div class="sx-t">Everything</div><div class="sub2" style="margin:2px 0 0">${plural(HOLDINGS.length, "holding")} together</div></div></div><div style="text-align:right"><div class="bigv">${lakh(VALUE)}</div><div class="sub2 up" style="margin:2px 0 0;font-weight:800">${sInr(D.GAIN)} · ${spc(D.GAIN_PCT)}</div></div>`
    : `<div class="row" style="gap:16px">${symTile(h, 54)}<div><div class="sx-t">${h.name}${P.srcTags(h)}</div><div class="sub2" style="margin:2px 0 0">${h.symbol} · ${h.assetType.replace("-", " ")} · ${h.market === "US" ? "United States" : "India"}</div></div></div><div style="text-align:right"><div class="bigv">${us ? usd(h.price) : `₹${D.num2(h.price)}`}</div><div class="sub2 ${gainCls(h.dayPct)}" style="margin:2px 0 0;font-weight:800">${h.dayPct >= 0 ? "▲" : "▼"} ${(Math.abs(h.dayPct) * 100).toFixed(2)}% today</div></div>`;
  const stats = all
    ? [stat("Put in", lakh(COST), "at each trade's rate"), stat("Worth", lakh(VALUE), "Friday's close"), stat("Gain", sInr(D.GAIN), spc(D.GAIN_PCT)), stat("The rupee's part", sInr(D.RATE_GAIN), `of the gain`), stat("Made on sales", lakhS(D.REALISED), "proposed"), stat("Trades", String(lensTrades("all").length), `since ${L.fmtY(H.DAYS[H.FIRST_IDX]).split(", ")[1]}`)]
    : [stat("You hold", `${qty(h.quantity)}`, h.assetType.includes("Fund") ? "units" : "shares"), stat("You paid", us ? usd(h.avgCostNative) : `₹${D.num2(h.avgCostNative)}`, us ? `a share, at ₹${h.avgFx.toFixed(2)}` : "a share, on average"), stat("Worth", lakhS(h.value), us ? usd(h.valueNative, 0) : `${pc(D.share(h))} of the whole`), stat("Gain", `${h.gain >= 0 ? "+" : "−"}${lakhS(Math.abs(h.gain))}`, `${spc(h.gainPct)}${us ? ` · rupee ${sInr(h.rateGain)}` : ""}`), stat("52-week range", `${us ? usd(h.lo, 0) : `₹${Math.round(h.lo).toLocaleString("en-IN")}`} – ${us ? usd(h.hi, 0) : `₹${Math.round(h.hi).toLocaleString("en-IN")}`}`, `${Math.round(((h.price - h.lo) / (h.hi - h.lo)) * 100)}% of the way up`), stat("Since", L.fmtY(h.since).split(", ")[1], `${plural(lensTrades(sym).length, "trade")}`)];
  const legend = `<div class="legend2"><span><svg width="14" height="12"><circle cx="7" cy="6" r="4.5" fill="var(--card-teal)"/></svg>bought</span><span><svg width="14" height="12"><circle cx="7" cy="6" r="4.5" fill="var(--card-violet)"/></svg>ESPP</span><span><svg width="14" height="12"><path d="M2,11 l5,-9 l5,9Z" fill="var(--card-sapphire)"/></svg>RSU vest</span><span><svg width="14" height="12"><path d="M2,1 l5,9 l5,-9Z" fill="var(--card-ruby)"/></svg>sold</span><span class="sub2" style="margin-left:auto">${all ? "" : "the dashed line is what you paid, on average · "}hover for any day, a mark for the trade</span></div>`;
  const chart = card(`<div class="between" style="align-items:center;gap:20px">${head}</div><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:18px;padding:14px 0;border-top:1px solid var(--divider);border-bottom:1px solid var(--divider)">${stats.join("")}</div>${lensChart(sym)}${legend}`, { gap: 16 });
  const rows = [...lensTrades(sym)].reverse().slice(0, all ? 8 : 3).map((t) => { const hh = D.holding(t.symbol), tag = t.tradeType === "Sell" ? "sell" : t.source === "RSU" ? "vest" : "buy", us2 = t.market === "US"; return `<div class="tradeln">${symTile(hh, 32)}<div><b>${all ? hh.name : L.fmtY(t.tradeDate)} <span class="bsb ${tag}">${t.tradeType === "Sell" ? "Sell" : t.source === "RSU" ? "RSU vest" : t.source === "ESPP" ? "ESPP" : "Buy"}</span></b><small>${all ? `${L.fmtY(t.tradeDate)} · ` : ""}${qty(t.quantity)} × ${us2 ? usd(t.price) : `₹${D.num2(t.price)}`}${us2 ? ` · ₹${t.fxRateToInr}` : ""}</small></div><div class="a">${inr(D.costInr(t))}<small>${t.broker}</small></div></div>`; }).join("");
  const mini = (() => { if (all) return `<div class="stack3" style="margin-top:8px"><b style="font-size:13px">Where it sits</b><div class="strip" style="height:14px">${D.BUCKETS.map(([b, c]) => `<span style="width:${(D.bucketValue(b) / VALUE) * 100}%;background:${fillc(c)}"></span>`).join("")}</div><div class="legend2">${D.BUCKETS.map(([b, c]) => `<span><i style="background:${col(c)}"></i>${b} ${pc(D.bucketValue(b) / VALUE, 0)}</span>`).join("")}</div></div>`;
    const cost = h.avgCostNative, px = h.price, lo = Math.min(h.lo, cost, px) * 0.985, hi = Math.max(h.hi, cost, px) * 1.015, p = (v) => ((v - lo) / (hi - lo)) * 100, a = Math.min(p(cost), p(px)), b = Math.max(p(cost), p(px));
    return `<div class="stack3" style="margin-top:8px"><b style="font-size:13px">Against its 52 weeks</b><div class="rl" style="height:42px"><div class="rl-track" style="top:16px"></div><span class="rl-seg" style="top:16px;left:${a}%;width:${b - a}%;background:${px >= cost ? fillc("emerald") : fillc("ruby")}"></span><span class="rl-cost" style="top:10px;left:${p(cost)}%"></span><span class="rl-px" style="top:14px;left:${p(px)}%;background:${col(h.color)}"></span><div class="rl-ends" style="top:30px"><span>low</span><span>${pc(D.share(h), 1)} of what you hold</span><span>high</span></div></div></div>`; })();
  const px2 = (v) => (us ? usd(v, 0) : `₹${Math.round(v).toLocaleString("en-IN")}`);
  const facts = all ? "" : `<div class="kv"><span>Put in</span><b>${lakhS(h.costInr)}</b></div><div class="kv"><span>Worth</span><b>${lakhS(h.value)}</b></div><div class="kv"><span>Today's move</span><b class="${gainCls(h.day)}">${h.day >= 0 ? "+" : "−"}${inr(Math.abs(h.day))}</b></div><div class="kv"><span>Made on shares sold</span><b>${h.realised ? lakhS(h.realised) : "none"}</b></div><div class="kv"><span>52-week low</span><b>${px2(h.lo)}</b></div><div class="kv"><span>52-week high</span><b>${px2(h.hi)}</b></div><div class="kv"><span>Price from</span><b>${h.src}${h.stale ? ` · ${fmt(h.stale)} (old)` : ""}</b></div><div class="kv"><span>First bought</span><b>${L.fmtY(h.since)}</b></div>`;
  const side = card(`${cardHead(all ? "Latest trades" : "Your trades in it", all ? "every holding" : `${plural(lensTrades(sym).length, "trade")}, the latest ${Math.min(3, lensTrades(sym).length)}`, link(all ? "All" : `All ${lensTrades(sym).length}`))}<div>${rows}</div><div style="margin-top:auto;display:flex;flex-direction:column;gap:6px">${mini}${facts}</div>`, { gap: 6 });
  return `<div class="v-ln" data-k="${sym.toLowerCase()}">${grid([[8, chart], [4, side]])}</div>`;
}
export function lensRow(cls = "") {
  const chip = (k, tile, t, sub, cls = "") => `<label class="lnc" for="ln-${k}">${tile}<b>${t}</b><small class="${cls}">${sub}</small></label>`;
  return `<div class="lnrow ${cls}">${chip("all", `<span class="symt" style="width:30px;height:30px;border-radius:10px;background:linear-gradient(155deg,oklch(0.36 0.02 255),oklch(0.2 0.01 260))">${I.invest(15)}</span>`, "All", spc(D.GAIN_PCT, 0), "")}${HOLDINGS.map((h) => chip(h.symbol.toLowerCase(), symTile(h, 30), h.symbol.length > 8 ? h.symbol.slice(0, 8) : h.symbol, spc(h.gainPct, 0), "")).join("")}</div>`;
}
export const j2 = () => board(C.radios("ln", ["all", ...SYMS], "ntap"), `${grid([[12, card(`${cardHead("Pick a holding", "its price, what you paid and every trade of yours, on one line", `<span class="sub2">sorted by value · the figure is its gain</span>`)}${lensRow()}`, { gap: 12 })]])}${["all", ...SYMS].map((k) => lensView(k === "all" ? "all" : D.SYMBOLS.find((s) => s.toLowerCase() === k))).join("")}${grid([[4, P.allocation({ extra: 2 })], [4, W.txFeed({ n: 8 })], [4, P.pricesCard()]])}`);

// ---------- J3 Race ----------
const LINES = [
  { key: "you", label: "You", values: H.IDX, color: "oklch(0.5 0.17 150)", w: 3.4 },
  { key: "nifty", label: "Nifty 50", values: H.NIFTY, color: "oklch(0.58 0.11 200)", w: 2 },
  { key: "spx", label: "S&P 500 in rupees", values: H.SPX_INR, color: "oklch(0.48 0.13 262)", w: 2 },
  { key: "gold", label: "Gold", values: H.GOLD, color: "oklch(0.68 0.14 85)", w: 2 },
  { key: "fd", label: "A 7% deposit", values: H.FDI, color: "oklch(0.58 0.012 260)", w: 2, dash: "4 4" },
];
const retOf = (sr, s, e) => sr.values[e] / sr.values[s] - 1;
export function race() {
  const views = C.rangeViews(() => ({
    W: 960, Hh: 424, ml: 46, mr: 74, rebase: true, endLabels: true, yfmt: (v) => `${v.toFixed(0)}`,
    series: LINES.map((l) => ({ ...l, kind: "line", chip: (v) => `${v >= 100 ? "+" : "−"}${Math.abs(v - 100).toFixed(0)}%` })),
    lines: (j, v) => [{ t: L.fmtY(H.DAYS[j]), dim: true }, ...LINES.map((l) => ({ k: l.key, t: `${l.label} ${v[l.key] >= 100 ? "+" : "−"}${Math.abs(v[l.key] - 100).toFixed(1)}%`, b: l.key === "you", c: l.color }))],
  }));
  const toggles = `<div class="lgrow">${LINES.map((l) => `<input type="checkbox" class="pk-in" id="lg-${l.key}"${l.key === "fd" ? "" : " checked"}><label class="lgc" for="lg-${l.key}" style="--lc:${l.color}"><i></i>${l.label}</label>`).join("")}</div>`;
  const left = card(`${cardHead("The race", "everything starts at 100 on the first day of the range · switch a line on or off", C.rangeChips())}${toggles}${views}<div class="card-note">The S&P is counted in rupees, so it carries the dollar's move like your US holdings do. Your line is time-weighted: money you add later doesn't move it. Benchmarks need their own price history (proposed, F-OV-08).</div>`, { gap: 14 });
  const board2 = H.RANGES.map(([k, , days]) => { const s = H.rangeStart(days), e = H.lastIdx, rows = LINES.map((l) => ({ ...l, r: retOf(l, s, e) })).sort((a, b) => b.r - a.r), mx = Math.max(...rows.map((r) => Math.abs(r.r)), 0.01);
    return `<div class="v-rg" data-k="${k}">${rows.map((r, n) => `<div class="rk${n === 0 ? " first" : ""}"><span class="n">${n + 1}</span><div><b>${r.label}</b><div class="bar"><i style="width:${Math.max(3, (Math.abs(r.r) / mx) * 100)}%;background:${r.color}"></i></div></div><div class="a ${r.r >= 0 ? "up" : "dn"}">${spc(r.r)}<small>${r.key === "you" ? "time-weighted" : "in rupees"}</small></div></div>`).join("")}</div>`; }).join("");
  const right = card(`${cardHead("Leaderboard", "same dates, same range")}${board2}<div class="stack3" style="margin-top:6px"><b style="font-size:13px">A year, on average</b>${LINES.slice(0, 4).map((l) => { const yrs = H.YEARS_HELD, r = Math.pow(l.values[H.lastIdx] / l.values[H.FIRST_IDX], 1 / yrs) - 1; return `<div class="kv"><span style="display:flex;align-items:center;gap:8px"><i class="dot" style="background:${l.color}"></i>${l.label}</span><b>${(r * 100).toFixed(1)}%</b></div>`; }).join("")}</div><div class="card-note">Last place isn't a verdict: a deposit is a different risk to a share.</div>`, { gap: 8 });
  const mm = [{ k: "You, as it went", v: VALUE, c: LINES[0].color, me: true }, { k: "All in Nifty 50", v: H.sameMoney(H.NIFTY), c: LINES[1].color }, { k: "All in the S&P 500", v: H.sameMoney(H.SPX_INR), c: LINES[2].color }, { k: "All in gold", v: H.sameMoney(H.GOLD), c: LINES[3].color }, { k: "All in a 7% deposit", v: H.sameMoney(H.FDI), c: LINES[4].color }];
  const mx = Math.max(...mm.map((m) => m.v));
  const same = `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:20px">${mm.map((m) => `<div class="same${m.me ? " me" : ""}"><div class="k"><i style="background:${m.c}"></i>${m.k}</div><div class="v">${lakh(m.v)}</div><div class="bar"><i style="width:${(m.v / mx) * 100}%;background:${m.c}"></i></div><div class="d ${m.me ? "" : m.v > VALUE ? "dn" : "up"}">${m.me ? `${sInr(VALUE - COST)} on ${lakh(COST)}` : m.v > VALUE ? `${lakhS(m.v - VALUE)} more than you` : `${lakhS(VALUE - m.v)} less than you`}</div></div>`).join("")}</div>`;
  const ymax = Math.max(...H.YEAR_RETURNS.flatMap((r) => [r.you, r.nifty, r.spx]));
  const yb = `<div class="yb">${H.YEAR_RETURNS.map((r) => `<div><div class="grp">${[[r.you, LINES[0].color], [r.nifty, LINES[1].color], [r.spx, LINES[2].color]].map(([v, c]) => `<i style="height:${Math.max(4, (Math.max(v, 0) / ymax) * 150)}px;background:${c}"><em>${(v * 100).toFixed(0)}%</em></i>`).join("")}</div><b>${r.y}${r.y === 2026 ? " so far" : ""}</b></div>`).join("")}</div>`;
  const ahead = H.YEAR_RETURNS.filter((r) => r.you > r.nifty).length;
  const years = card(`${cardHead("Year by year", "calendar years, you against Nifty 50 and the S&P 500 in rupees", `<span class="legend2"><span><i style="background:${LINES[0].color}"></i>You</span><span><i style="background:${LINES[1].color}"></i>Nifty 50</span><span><i style="background:${LINES[2].color}"></i>S&P 500</span></span>`)}${yb}`, { gap: 12 });
  const facts = card(`${cardHead("Reading it", "")}<div class="kv"><span>Years you finished ahead of Nifty</span><b>${ahead} of ${H.YEAR_RETURNS.length}</b></div><div class="kv"><span>Your best year</span><b>${H.YEAR_RETURNS.reduce((a, b) => (b.you > a.you ? b : a)).y} · ${spc(Math.max(...H.YEAR_RETURNS.map((r) => r.you)))}</b></div><div class="kv"><span>Your deepest fall</span><b>${(H.DRAWDOWN.pct * 100).toFixed(1)}% · ${L.monYear(H.DRAWDOWN.date.slice(0, 7))}</b></div><div class="kv"><span>A year, on average</span><b>${(H.TWR_YEARLY * 100).toFixed(1)}%</b></div><div class="card-note">The amounts above put the same money, on the same days, into each one: your ${lakh(COST)} of buys, every sale taken out. An RSU vest counts as a buy at its fair value.</div>`, { gap: 8 });
  return board(C.radios("rg", ["1m", "3m", "6m", "1y", "3y", "all"], "all"), `${grid([[8, left], [4, right]])}${cardHead2("The same money, somewhere else", "your buys and sales, on their own dates")}${same}${grid([[8, years], [4, facts]])}${grid([[4, P.allocation({ extra: 1 })], [4, W.txFeed({ n: 7 })], [4, P.movers()]])}`);
}
const cardHead2 = (t, s) => `<div class="card-t" style="padding:4px 4px 0">${t}<small>${s}</small></div>`;
export const j3 = race;

// ---------- J4 Rings ----------
const polar = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const sector = (cx, cy, r0, r1, a0, a1) => { const [x0, y0] = polar(cx, cy, r1, a0), [x1, y1] = polar(cx, cy, r1, a1), [x2, y2] = polar(cx, cy, r0, a1), [x3, y3] = polar(cx, cy, r0, a0); return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r1},${r1} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} A${r0},${r0} 0 0 0 ${x3.toFixed(1)},${y3.toFixed(1)}Z`; };
const YEARS6 = [2021, 2022, 2023, 2024, 2025, 2026];
const monthAmt = (y, m) => { const key = `${y}-${String(m + 1).padStart(2, "0")}`, ts = D.TRADES.filter((t) => t.tradeDate.startsWith(key)); const by = (src) => sum(ts.filter((t) => t.tradeType === "Buy" && t.source === src).map(D.costInr)); return { key, market: by("Market"), espp: by("ESPP"), rsu: by("RSU"), sold: sum(ts.filter((t) => t.tradeType === "Sell" && t.source !== "RSU").map(D.costInr)), trades: ts }; };
export function ringsHero() {
  const S = 760, cx = S / 2, cy = S / 2, r0 = 92, step = 44, maxH = 36, sectorA = (Math.PI * 2 * 28) / 360, gapA = (Math.PI * 2 * 24) / 360;
  const all = YEARS6.flatMap((y) => [...Array(12)].map((_, m) => monthAmt(y, m))), mx = Math.max(...all.map((a) => a.market + a.espp + a.rsu));
  const SRC = [["market", "teal", "Bought"], ["espp", "violet", "ESPP"], ["rsu", "sapphire", "RSU vests"]];
  const body = YEARS6.map((y, yi) => {
    const rb = r0 + yi * step, bars = [...Array(12)].map((_, m) => {
      const a = monthAmt(y, m), start = -Math.PI / 2 + gapA / 2 + m * sectorA * (1 + 0), a0 = -Math.PI / 2 + gapA / 2 + (m * (Math.PI * 2 - gapA)) / 12 + 0.01, a1 = a0 + (Math.PI * 2 - gapA) / 12 - 0.035;
      const future = a.key > L.TODAY.slice(0, 7), tot = a.market + a.espp + a.rsu;
      let r = rb; const totH = Math.max(4, Math.sqrt(tot / mx) * maxH); const segs = SRC.map(([k, c]) => { if (!a[k]) return ""; const h = Math.max(3, totH * (a[k] / tot)); const p = sector(cx, cy, r, r + h, a0, a1); r += h; return `<path class="sg sg-${k}" d="${p}" fill="${col(c)}"/>`; }).join("");
      const ctr = `<g class="ctr"><text x="${cx}" y="${cy - 26}" text-anchor="middle" style="font-size:13px;font-weight:800;fill:var(--muted)">${L.monFull(a.key)} ${y}</text><text x="${cx}" y="${cy + 8}" text-anchor="middle" style="font-size:30px;font-weight:800;fill:var(--fg)">${tot ? lakhS(tot) : "Nothing bought"}</text>${SRC.filter(([k]) => a[k]).map(([k, c, n], i) => `<text x="${cx}" y="${cy + 30 + i * 17}" text-anchor="middle" style="font-size:12px;font-weight:700;fill:${col(c)}">${n} ${lakhS(a[k])}</text>`).join("")}${a.sold ? `<text x="${cx}" y="${cy + 30 + SRC.filter(([k]) => a[k]).length * 17}" text-anchor="middle" style="font-size:12px;font-weight:700;fill:var(--card-ruby)">Sold ${lakhS(a.sold)}</text>` : ""}</g>`;
      return `<g class="rb"><path class="trk" d="${sector(cx, cy, rb, rb + maxH, a0, a1)}" ${future ? 'style="opacity:.4"' : ""}/>${segs}${a.sold ? `<path d="${sector(cx, cy, rb - 6, rb - 2, a0, a1)}" fill="var(--card-ruby)"/>` : ""}${ctr}</g>`;
    }).join("");
    const lab = `<text x="${cx}" y="${cy - rb - maxH / 2 + 3}" text-anchor="middle" style="font-size:10.5px;font-weight:800;fill:var(--muted)">${y}</text>`;
    return bars + lab;
  }).join("");
  const mlabs = [...Array(12)].map((_, m) => { const a = -Math.PI / 2 + gapA / 2 + ((m + 0.5) * (Math.PI * 2 - gapA)) / 12, [x, y] = polar(cx, cy, r0 + 5 * step + maxH + 22, a); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" style="font-size:11px;font-weight:800;fill:var(--muted)">${"JFMAMJJASOND"[m]}</text>`; }).join("");
  const totalIn = sum(all.map((a) => a.market + a.espp + a.rsu));
  const ctr0 = `<g class="ctr0"><text x="${cx}" y="${cy - 14}" text-anchor="middle" style="font-size:12px;font-weight:800;fill:var(--muted);letter-spacing:.06em">PUT IN SINCE SEP 2021</text><text x="${cx}" y="${cy + 20}" text-anchor="middle" style="font-size:34px;font-weight:800;fill:var(--fg)">${lakh(totalIn)}</text><text x="${cx}" y="${cy + 42}" text-anchor="middle" style="font-size:12px;font-weight:700;fill:var(--muted)">before sales · hover a spoke</text></g>`;
  const svg = `<svg class="rings" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${body}${mlabs}${ctr0}</svg>`;
  const filter = `<span class="chips" style="--chip-on-bg:var(--ink);--chip-on-fg:var(--on-ink)">${[["all", "All"], ["market", "Bought"], ["espp", "ESPP"], ["rsu", "RSU vests"]].map(([k, l]) => `<label class="chip2" for="sf-${k}">${l}</label>`).join("")}</span>`;
  const hero = card(`${cardHead("Growth rings", "a ring a year, innermost is 2021 · a spoke a month · taller is more money in", filter)}<div style="padding:6px 0 0">${svg}</div><div class="legend2" style="justify-content:center"><span><i style="background:${col("teal")}"></i>Bought</span><span><i style="background:${col("violet")}"></i>ESPP</span><span><i style="background:${col("sapphire")}"></i>RSU vests (fair value)</span><span><i style="background:${col("ruby")};height:4px;margin-top:3px"></i>a sale, drawn inside the ring</span></div>`, { gap: 10 });
  // the rhythm
  const monthsWithBuy = new Set(D.TRADES.filter((t) => t.tradeType === "Buy").map((t) => t.tradeDate.slice(0, 7)));
  let run = 0, best = 0, cur = "2021-09"; for (let i = 0; i < 62; i++) { if (monthsWithBuy.has(cur)) { run++; best = Math.max(best, run); } else run = 0; cur = L.addMonthsUTC(`${cur}-01`, 1).slice(0, 7); }
  const byYear = YEARS6.map((y) => ({ y, v: sum([...Array(12)].map((_, m) => { const a = monthAmt(y, m); return a.market + a.espp + a.rsu; })) })), bestY = byYear.reduce((a, b) => (b.v > a.v ? b : a));
  const srcTot = { market: sum(all.map((a) => a.market)), espp: sum(all.map((a) => a.espp)), rsu: sum(all.map((a) => a.rsu)) };
  const bestM = all.reduce((a, b) => (b.market + b.espp + b.rsu > a.market + a.espp + a.rsu ? b : a));
  const rhythm = card(`${cardHead("The rhythm", "how often, and how much")}<div class="kv"><span>Months with a buy</span><b>${monthsWithBuy.size} of 62</b></div><div class="kv"><span>Longest run of months in a row</span><b>${best}</b></div><div class="kv"><span>A month, on average</span><b>${lakhS(totalIn / 62)}</b></div><div class="kv"><span>Best year</span><b>${bestY.y} · ${lakhS(bestY.v)}</b></div><div class="kv"><span>Biggest month</span><b>${L.monYear(bestM.key)} · ${lakhS(bestM.market + bestM.espp + bestM.rsu)}</b></div><div class="kv"><span>Sold, ever</span><b>${lakhS(sum(all.map((a) => a.sold)))}</b></div><div class="stack3" style="margin-top:6px"><b style="font-size:13px">Money in by year</b>${byYear.map((r) => `<div style="display:grid;grid-template-columns:38px 1fr 62px;gap:10px;align-items:center;font-size:12px;font-weight:700"><span>${r.y}</span><span class="hbar" style="height:8px"><span style="width:${(r.v / bestY.v) * 100}%;background:${fillc("teal")}"></span></span><span style="text-align:right">${lakhS(r.v)}</span></div>`).join("")}</div><div class="stack3" style="margin-top:6px"><b style="font-size:13px">How it came in</b><div class="strip" style="height:14px"><span style="width:${(srcTot.market / totalIn) * 100}%;background:${col("teal")}"></span><span style="width:${(srcTot.espp / totalIn) * 100}%;background:${col("violet")}"></span><span style="width:${(srcTot.rsu / totalIn) * 100}%;background:${col("sapphire")}"></span></div><div class="legend2"><span><i style="background:${col("teal")}"></i>Bought ${pc(srcTot.market / totalIn, 0)}</span><span><i style="background:${col("violet")}"></i>ESPP ${pc(srcTot.espp / totalIn, 0)}</span><span><i style="background:${col("sapphire")}"></i>RSU ${pc(srcTot.rsu / totalIn, 0)}</span></div></div>`, { gap: 6 });
  const next = card(`${cardHead("What usually comes next", "from the pattern, not a schedule", `<span class="pill pill-late" style="font-size:10px">Proposed</span>`)}<div class="pat"><span class="symt" style="width:38px;height:38px;border-radius:12px;background:${P.grad("sapphire")}">NTAP</span><div><b>RSU vest</b><small>quarterly, around the 12th</small></div><div class="dd">Nov 12<small style="display:block;color:var(--muted);font-weight:600">in 12 days</small></div></div><div class="pat"><span class="symt" style="width:38px;height:38px;border-radius:12px;background:${P.grad("violet")}">NTAP</span><div><b>ESPP purchase</b><small>twice a year, mid-Nov and mid-May</small></div><div class="dd">Nov 16<small style="display:block;color:var(--muted);font-weight:600">in 16 days</small></div></div><div class="card-note">Upcoming vests are a list only, never part of net worth (F-IV-06, not decided).</div>`, { gap: 12 });
  return board(C.radios("sf", ["all", "market", "espp", "rsu"], "all"), `${grid([[8, hero], [4, `<div class="col2" style="flex:1">${rhythm}${next}</div>`]])}${grid([[4, W.txFeed({ n: 6, note: "Cash that left or arrived. A vest brings shares, not cash." })], [4, P.allocation()], [4, P.netappCard()]])}`);
}
export const j4 = ringsHero;

// ---------- J5 Flow ----------
export function flow() {
  const W2 = 1180, Hh = 690, xl = 170, xm = 560, xr = 940, nw = 20, top = 30;
  const holds = [...HOLDINGS].sort((a, b) => D.BUCKETS.findIndex(([n]) => n === a.bucket) - D.BUCKETS.findIndex(([n]) => n === b.bucket) || b.value - a.value);
  const SRCS = [["market", "Bought", "teal"], ["espp", "ESPP", "violet"], ["rsu", "RSU vests", "sapphire"]];
  const srcCost = (h) => { const buys = h.trades.filter((t) => t.tradeType === "Buy"), tot = sum(buys.map(D.costInr)); return Object.fromEntries(SRCS.map(([k]) => [k, tot ? (h.costInr * sum(buys.filter((t) => t.source.toLowerCase() === k || (k === "market" && t.source === "Market")).map(D.costInr))) / tot : 0])); };
  const sc = holds.map((h) => ({ h, s: srcCost(h) }));
  const midGap = 14, rGap = 34, lGap = 60, midH = (h) => Math.max(h.costInr, h.value);
  const k = (Hh - top - 20 - midGap * (holds.length - 1)) / sum(holds.map(midH));
  // middle nodes
  let y = top; const mid = sc.map((x) => { const n = { ...x, y, hgt: midH(x.h) * k }; y += n.hgt + midGap; return n; });
  // left nodes: centred against the middle column
  const lTot = SRCS.map(([key]) => sum(sc.map((x) => x.s[key]))), lH = lTot.map((v) => v * k), lSpan = sum(lH) + lGap * 2, lTop = top + (y - midGap - top - lSpan) / 2;
  let ly = lTop; const left = SRCS.map(([key, name, c], i) => { const n = { key, name, c, v: lTot[i], y: ly, hgt: lH[i], off: 0 }; ly += lH[i] + lGap; return n; });
  // right nodes
  const rH = D.BUCKETS.map(([b]) => D.bucketValue(b) * k), rSpan = sum(rH) + rGap * 3, rTop = top + (y - midGap - top - rSpan) / 2; let ry = rTop; const right = D.BUCKETS.map(([b, c], i) => { const n = { b, c, v: D.bucketValue(b), y: ry, hgt: rH[i], off: 0 }; ry += rH[i] + rGap; return n; });
  const ribbon = (x0, y0, x1, y1, h) => { const m = (x0 + x1) / 2; return `M${x0},${y0} C${m},${y0} ${m},${y1} ${x1},${y1} L${x1},${y1 + h} C${m},${y1 + h} ${m},${y0 + h} ${x0},${y0 + h}Z`; };
  const flows = [], nodes = [], labels = [];
  // left -> middle
  for (const m of mid) { let off = 0; for (const [key, name, c] of SRCS) { const w = m.s[key] * k; if (w < 0.4) continue; const l = left.find((n) => n.key === key); flows.push(`<path class="sk-f" d="${ribbon(xl + nw, l.y + l.off, xm, m.y + off, w)}" fill="${col(c)}" opacity=".42"><title>${name} → ${m.h.name}: ${lakhS(m.s[key])} put in</title></path>`); l.off += w; off += w; } }
  // middle -> right
  for (const m of mid) { const r = right.find((n) => n.b === m.h.bucket), w = m.h.value * k; flows.push(`<path class="sk-f" d="${ribbon(xm + nw, m.y, xr, r.y + r.off, w).replace(/^M/, "M")}" fill="${col(m.h.color)}" opacity=".5"><title>${m.h.name} → ${m.h.bucket}: worth ${lakhS(m.h.value)}</title></path>`); r.off += w; }
  // nodes
  left.forEach((n) => { nodes.push(`<rect x="${xl}" y="${n.y}" width="${nw}" height="${n.hgt}" rx="6" fill="${col(n.c)}"/>`); labels.push(`<text x="${xl - 14}" y="${n.y + n.hgt / 2 - 2}" text-anchor="end" style="font-weight:800">${n.name}</text><text class="sm" x="${xl - 14}" y="${n.y + n.hgt / 2 + 14}" text-anchor="end">${lakhS(n.v)} put in</text>`); });
  mid.forEach((m) => { const costH = m.h.costInr * k, valH = m.h.value * k; nodes.push(`<rect x="${xm}" y="${m.y}" width="${nw}" height="${Math.min(costH, valH)}" rx="5" fill="${col(m.h.color)}"/>`);
    if (valH > costH) nodes.push(`<rect x="${xm}" y="${m.y + costH}" width="${nw}" height="${valH - costH}" rx="3" fill="url(#gainh)" stroke="oklch(0.55 0.15 150)" stroke-width="1"/>`);
    if (costH > valH) nodes.push(`<rect x="${xm}" y="${m.y + valH}" width="${nw}" height="${costH - valH}" rx="3" fill="url(#lossh)" stroke="oklch(0.55 0.16 25)" stroke-width="1"/>`);
    const lx = xm + nw + 12, cyy = m.y + m.hgt / 2; labels.push(`<text x="${lx}" y="${cyy + (m.hgt > 22 ? -2 : 4)}" class="hl" style="font-weight:800;font-size:12px">${m.h.symbol}</text>${m.hgt > 22 ? `<text class="sm hl" x="${lx}" y="${cyy + 12}">${spc(m.h.gainPct, 0)}</text>` : ""}`); });
  right.forEach((n) => { nodes.push(`<rect x="${xr}" y="${n.y}" width="${nw}" height="${n.hgt}" rx="6" fill="${col(n.c)}"/>`); labels.push(`<text x="${xr + nw + 14}" y="${n.y + n.hgt / 2 - 2}" style="font-weight:800;font-size:14px">${n.b}</text><text class="sm" x="${xr + nw + 14}" y="${n.y + n.hgt / 2 + 15}">${lakhS(n.v)} · ${pc(n.v / VALUE, 0)} of the whole</text>`); });
  const heads = `<text class="sm" x="${xl - 14}" y="14" text-anchor="end" style="font-weight:800;letter-spacing:.06em">HOW IT CAME IN</text><text class="sm" x="${xm}" y="14" style="font-weight:800;letter-spacing:.06em">WHAT IT BECAME</text><text class="sm" x="${xr}" y="14" style="font-weight:800;letter-spacing:.06em">WHERE IT SITS</text>`;
  const defs = `<defs><pattern id="gainh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="oklch(0.94 0.05 150)"/><line x1="0" y1="0" x2="0" y2="6" stroke="oklch(0.62 0.15 150)" stroke-width="2.4"/></pattern><pattern id="lossh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="oklch(0.95 0.035 30)"/><line x1="0" y1="0" x2="0" y2="6" stroke="oklch(0.6 0.16 25)" stroke-width="2.4"/></pattern></defs>`;
  const svg = `<svg class="sk-svg" viewBox="0 0 ${W2} ${y + 10}" width="100%">${defs}${heads}${flows.join("")}${nodes.join("")}${labels.join("")}</svg>`;
  const legend = `<div class="legend2"><span><i style="background:${col("teal")}"></i>bought with cash</span><span><i style="background:${col("violet")}"></i>ESPP</span><span><i style="background:${col("sapphire")}"></i>RSU vests</span><span><svg width="18" height="12"><rect width="18" height="12" rx="3" fill="url(#gainh)" stroke="oklch(0.55 0.15 150)"/></svg>a gain on it</span><span><svg width="18" height="12"><rect width="18" height="12" rx="3" fill="url(#lossh)" stroke="oklch(0.55 0.16 25)"/></svg>a loss</span><span class="sub2" style="margin-left:auto">hover any flow: the rest fades</span></div>`;
  const hero = card(`${cardHead("Where it came from, and where it sits", "money in on the left, what each holding became in the middle, where it sits now on the right", `<span class="row" style="gap:10px">${L.derivedTag("Cost, then value")}${L.seg([{ label: "By holding", on: true }, { label: "By company" }])}</span>`)}${svg}${legend}<div class="card-note">The left side is what's still held, by how it came in: a holding's cost is split by the share each way bought it. An RSU vest counts at its fair value.</div>`, { gap: 14 });
  return board("", `${grid([[12, hero]])}${grid([[4, P.allocation({ extra: 3 })], [4, P.movers({ n: 5 })], [4, P.pricesCard({ extra: 1 })]])}`);
}
export const j5 = flow;
