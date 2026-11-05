// Round 1: five hero directions for /investments. Each takes an idea from the subject (a bridge from cost to worth, the layers money was laid down in,
// what one company is of the whole, a departures board, a ruler per holding) and sits on the same greeting, attention strip and widgets.
//   I1 Bridge    who made the money: cost, then each holding's gain or loss, then what it's worth
//   I2 Strata    the layers the money was laid down in, year by year, with today's gain as a cap
//   I3 Exposure  how the whole is split, and the one company that is also the employer
//   I4 Board     a departures board: a row of flaps per holding
//   I5 Rulers    a ruler per holding: its 52-week range, what you paid and where it is now
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
const { I, inr, fmt, plural } = L;
const { HOLDINGS, VALUE, COST, pc, spc, usd, qty, lakh, sum } = D;
const { card, cardHead, link, grid, col, fillc, grad, symTile, lakhS, sInr, gainCls, hc, tip } = P;
const kicker = (t) => `<div class="hk">${t}</div>`;
const board = (hero, rest = "") => P.page(`${P.greeting()}${P.attention()}${hero}${rest}`);
const kvb = (k, v, s = "", cls = "") => `<div class="kvbig"><span class="k">${k}</span><span class="v ${cls}">${v}</span>${s ? `<span class="s">${s}</span>` : ""}</div>`;

// ---------- I1 Bridge ----------
export function bridgeCard() {
  const deltas = [...HOLDINGS.map((h) => ({ key: h.symbol, label: h.symbol, sub: h.market === "US" ? "price" : "", v: h.stockGain, color: h.color, h })), { key: "FX", label: "Rupee", sub: "vs dollar", v: D.RATE_GAIN, color: "copper" }].sort((a, b) => b.v - a.v);
  const steps = [{ label: "Put in", sub: lakh(COST), total: true, v: COST }, ...deltas, { label: "Worth today", sub: lakh(VALUE), total: true, v: VALUE }];
  const lo = 4000000, hi = 5800000, H = 276, y = (v) => H - ((v - lo) / (hi - lo)) * H, N = steps.length;
  let cur = 0;
  const cols = steps.map((s, i) => {
    let top, bot, fill, lab, labY;
    if (s.total) { top = y(s.v); bot = H; fill = "linear-gradient(180deg,oklch(0.36 0.012 260),oklch(0.2 0.01 260))"; lab = lakh(s.v); cur = s.v; labY = top - 20; }
    else { const a = cur, b = cur + s.v; top = y(Math.max(a, b)); bot = y(Math.min(a, b)); fill = s.v >= 0 ? (s.key === "FX" ? fillc("copper", 180) : fillc("emerald", 180)) : fillc("ruby", 180); lab = sInr(s.v).replace("₹", "₹"); cur = b; labY = s.v >= 0 ? top - 20 : bot + 4; }
    const bar = `<span class="wf-bar${s.total ? "" : " rt"}" style="top:${top}px;height:${Math.max(3, bot - top)}px;background:${fill}"></span>`;
    const val = `<span class="wf-v ${s.total ? "" : s.v >= 0 ? "up" : "dn"}" style="top:${labY}px">${lab}</span>`;
    const h = s.h, card2 = s.total ? hc({ h: s.label, t: lakh(s.v), d: s.label === "Put in" ? "what the shares and units cost, in rupees at each day's rate" : `${spc(D.GAIN_PCT)} on what you put in` }) : s.key === "FX" ? hc({ h: "The rupee against the dollar", t: sInr(s.v), d: `USD/INR ₹${D.FX_NOW} against ₹${(sum(D.byMarket("US").map((x) => x.costInr)) / sum(D.byMarket("US").map((x) => x.costUsd))).toFixed(2)} paid, on average`, rows: D.byMarket("US").map((x) => [x.name, sInr(x.rateGain), col(x.color)]), f: "It lifts every US holding, because they're worth more rupees. Held apart so the price moves are clean" }) : hc({ h: h.name, t: sInr(s.v), d: `${spc(h.market === "US" ? h.stockGain / h.costInr : h.gainPct)} from the price${h.market === "US" ? ", at the rate you paid" : ""}`, rows: [["Cost", lakhS(h.costInr)], ["Value", lakhS(h.value)], ["Quantity", qty(h.quantity)]], f: h.market === "US" ? `The rupee's part of this holding (${sInr(h.rateGain)}) is the Rupee column` : "" });
    return `<div class="wf-c hov" tabindex="0"><div class="wf-plot">${bar}${val}</div><div class="wf-l">${s.label}${s.sub ? `<small>${s.sub}</small>` : ""}</div>${tip(card2, { w: 270, x: "c", y: "up", off: -(H - Math.min(top, 200)) + 60 })}</div>`;
  }).join("");
  // connectors: from the end of one bar to the start of the next
  let c2 = 0; const links = [];
  steps.forEach((s, i) => { c2 = s.total ? s.v : c2 + s.v; if (i < N - 1) links.push(`<i class="wf-link" style="left:calc(${((i + 0.88) / N) * 100}% - 3px);width:calc(${(0.24 / N) * 100}% + 4px);top:${6 + y(c2)}px"></i>`); });
  const grid2 = [4000000, 4500000, 5000000, 5500000].map((v) => `<i class="wf-grid" style="top:${6 + y(v)}px"><span>₹${v / 100000}L</span></i>`).join("");
  const wf = `<div style="position:relative"><div style="position:absolute;left:0;right:0;top:0;height:${H + 6}px">${grid2}</div><div class="wf" style="height:${H + 6 + 36}px;padding-left:42px">${cols}</div>${links.join("").replace(/left:calc\(/g, "left:calc(42px + (100% - 42px) * 0 + ")}</div>`;
  const left = card(`${cardHead("From cost to worth", "each holding's gain or loss, in the order it adds up · hover a bar", `<span class="row" style="gap:10px">${L.derivedTag("The rupee is held apart")}${L.seg([{ label: "Now", on: true }, { label: "With sales" }])}</span>`)}${wf}<div class="card-note">The axis starts at ₹40L (the hatching at the foot of the first and last bars) so the steps can be read. A US holding's step is its price move at the rate you paid; the rupee's move on top of it is the Rupee step.</div>`, { gap: 12 });
  const right = card(`${cardHead("The sum", "")}${kvb("Put in", lakh(COST), `${plural(HOLDINGS.length, "holding")}, at each trade's own rate`)}${kvb("Worth today", lakh(VALUE), "Friday's close")}${kvb("Up", `${sInr(D.GAIN)}`, `${spc(D.GAIN_PCT)} on what it cost`, "up")}<div class="stack3"><div class="strip" style="height:14px"><span style="width:${(sum(D.byMarket("IND").map((h) => h.gain)) / D.GAIN) * 100}%;background:${col("teal")}"></span><span style="width:${(D.STOCK_GAIN_US / D.GAIN) * 100}%;background:${col("sapphire")}"></span><span style="width:${(D.RATE_GAIN / D.GAIN) * 100}%;background:${col("copper")}"></span></div><div class="legend2"><span><i style="background:${col("teal")}"></i>India ${sInr(sum(D.byMarket("IND").map((h) => h.gain)))}</span><span><i style="background:${col("sapphire")}"></i>US price ${sInr(D.STOCK_GAIN_US)}</span><span><i style="background:${col("copper")}"></i>Rupee ${sInr(D.RATE_GAIN)}</span></div></div><div class="kv"><span>Made on shares already sold</span><b>${lakhS(D.REALISED)}</b></div><div class="card-note">${pc(D.RATE_GAIN / D.GAIN, 0)} of the gain is the rupee falling, not a price rising. Sales are shown apart and aren't in net worth (proposed).</div>`, { gap: 14 });
  return grid([[8, left], [4, right]]);
}
export const i1 = () => board(bridgeCard(), P.rest());

// ---------- I2 Strata ----------
export function strataCard() {
  const W = 940, Ht = 372, ml = 46, mr = 128, mt = 12, mb = 30, pw = W - ml - mr, ph = Ht - mt - mb, N = D.MONTHS.length, ymax = 6000000;
  const x = (i) => ml + (i / (N - 1)) * pw, y = (v) => mt + ph - (v / ymax) * ph;
  const order = [...D.COST_SERIES].sort((a, b) => D.holding(a.symbol).since.localeCompare(D.holding(b.symbol).since));
  const below = Array(N).fill(0);
  const paths = order.map((s) => {
    const up = s.points.map((v, i) => below[i] + v), lo = [...below];
    const step = (arr) => arr.map((v, i) => (i === 0 ? `M${x(0).toFixed(1)},${y(v).toFixed(1)}` : `L${x(i).toFixed(1)},${y(arr[i - 1]).toFixed(1)} L${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join(" ");
    const back = (arr) => { let d = `L${x(N - 1).toFixed(1)},${y(arr[N - 1]).toFixed(1)}`; for (let i = N - 1; i >= 1; i--) d += ` L${x(i).toFixed(1)},${y(arr[i - 1]).toFixed(1)} L${x(i - 1).toFixed(1)},${y(arr[i - 1]).toFixed(1)}`; return d; };
    const d = `${step(up)} ${back(lo)} Z`; up.forEach((v, i) => (below[i] = v));
    const h = D.holding(s.symbol);
    return `<path d="${d}" fill="${col(s.color)}" stroke="var(--surface)" stroke-width="0.5"><title>${h.name}</title></path>`;
  }).join("");
  const grid3 = [0, 1000000, 2000000, 3000000, 4000000, 5000000, 6000000].map((v) => `<line x1="${ml}" x2="${ml + pw}" y1="${y(v)}" y2="${y(v)}" stroke="var(--divider)"/><text x="${ml - 8}" y="${y(v) + 4}" text-anchor="end">${v ? `${v / 100000}L` : "0"}</text>`).join("");
  const xs = D.MONTHS.map((m, i) => (m.endsWith("-01") ? `<line x1="${x(i)}" x2="${x(i)}" y1="${mt}" y2="${mt + ph}" stroke="var(--divider)"/><text x="${x(i) + 4}" y="${Ht - 8}">${m.slice(0, 4)}</text>` : "")).join("");
  const mi = (iso) => D.MONTHS.indexOf(iso.slice(0, 7)) + (Number(iso.slice(8)) - 1) / 30;
  const marks = D.TRADES.filter((t) => t.source === "ESPP" || (t.source === "RSU" && t.tradeType === "Buy")).map((t) => (t.source === "ESPP" ? `<circle cx="${x(mi(t.tradeDate))}" cy="${mt + ph + 9}" r="3.4" fill="var(--card-violet)"/>` : `<path d="M${x(mi(t.tradeDate)) - 3.4},${mt + ph + 12} l3.4,-6.4 l3.4,6.4Z" fill="var(--card-sapphire)"/>`)).join("");
  const cx = ml + pw + 16, capW = 46, yC = y(COST), yV = y(VALUE);
  const cap = `<defs><pattern id="hat" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="oklch(0.94 0.05 150)"/><line x1="0" y1="0" x2="0" y2="6" stroke="oklch(0.62 0.15 150)" stroke-width="2.4"/></pattern></defs>
  <rect x="${cx}" y="${yV}" width="${capW}" height="${yC - yV}" rx="6" fill="url(#hat)" stroke="oklch(0.6 0.14 150)"/><line x1="${x(N - 1)}" x2="${cx}" y1="${yC}" y2="${yC}" stroke="var(--ink)" stroke-dasharray="3 3" opacity=".5"/>
  <text x="${cx + capW + 8}" y="${yV + 4}" style="fill:var(--fg);font-weight:800;font-size:12px">${lakh(VALUE)}</text><text x="${cx + capW + 8}" y="${yV + 18}">worth today</text><text x="${cx + capW + 8}" y="${yC + 4}" style="fill:var(--fg);font-weight:800;font-size:12px">${lakh(COST)}</text><text x="${cx + capW + 8}" y="${yC + 18}">put in</text>
  <text x="${cx + capW / 2}" y="${(yC + yV) / 2 + 4}" text-anchor="middle" style="fill:oklch(0.3 0.1 150);font-weight:800;font-size:11px">${spc(D.GAIN_PCT, 0)}</text>`;
  const svg = `<svg class="strata" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="What you put in, by holding, month by month">${grid3}${xs}${paths}${marks}${cap}</svg>`;
  const legend = `<div class="legend2">${[...order].reverse().map((s) => `<span><i style="background:${col(s.color)}"></i>${D.holding(s.symbol).name}</span>`).join("")}</div><div class="legend2" style="margin-top:2px"><span><svg width="12" height="10" viewBox="0 0 12 10"><path d="M1,9 l5,-8 l5,8Z" fill="var(--card-sapphire)"/></svg>an RSU vest</span><span><i style="background:var(--card-violet);border-radius:50%"></i>an ESPP purchase</span></div>`;
  const left = card(`${cardHead("Layers of money", "what you put in, by holding, month by month · the green cap is today's gain", `<span class="row" style="gap:10px">${L.derivedTag("Cost, not value")}${L.seg([{ label: "By holding", on: true }, { label: "By kind" }])}</span>`)}${svg}${legend}<div class="card-note">The log alone can draw what was put in, month by month. Value over time needs a daily price for every holding (round 2 draws it): until that exists, only the cap at the right is today's value.</div>`, { gap: 12 });
  const maxY = Math.max(...D.YEARS.map((r) => r.market + r.espp + r.rsu));
  const yrs = D.YEARS.map((r) => { const t = r.market + r.espp + r.rsu; return `<div style="display:grid;grid-template-columns:44px 1fr 74px;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--divider)"><b style="font-size:13px">${r.y}${r.y === 2026 ? `<small style="display:block;font-size:10px;color:var(--muted);font-weight:600">so far</small>` : ""}</b><span class="strip" style="height:14px;width:${(t / maxY) * 100}%;min-width:4px;gap:1px"><span style="flex:${r.market};background:${col("teal")}"></span><span style="flex:${r.espp};background:${col("violet")}"></span><span style="flex:${r.rsu};background:${col("sapphire")}"></span></span><span style="text-align:right;font-size:12.5px;font-weight:800">${lakhS(t)}${r.out ? `<small style="display:block;font-size:10.5px;color:var(--loss);font-weight:700">−${lakhS(r.out)} sold</small>` : ""}</span></div>`; }).join("");
  const right = card(`${cardHead("Money in, each year", "every buy at its cost, less sales")}<div>${yrs}</div><div class="legend2"><span><i style="background:${col("teal")}"></i>Bought</span><span><i style="background:${col("violet")}"></i>ESPP</span><span><i style="background:${col("sapphire")}"></i>RSU vests</span></div><div class="stack3"><div class="kv"><span>Bought in the market</span><b>${lakhS(sum(D.YEARS.map((r) => r.market)))}</b></div><div class="kv"><span>ESPP purchases</span><b>${lakhS(sum(D.YEARS.map((r) => r.espp)))}</b></div><div class="kv"><span>RSU vests, at fair value</span><b>${lakhS(sum(D.YEARS.map((r) => r.rsu)))}</b></div><div class="kv"><span>Sold, proceeds</span><b class="dn">−${lakhS(sum(D.YEARS.map((r) => r.out)))}</b></div></div><div class="card-note">An RSU vest counts at its fair value, though no cash left your account: it came out of pay as shares. Whether it counts as "money in" is yours to decide.</div>`, { gap: 8 });
  return grid([[8, left], [4, right]]);
}
export const i2 = () => board(strataCard(), P.rest());

// ---------- I3 Exposure ----------
const polar = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
function arc(cx, cy, r0, r1, a0, a1) {
  const [x0, y0] = polar(cx, cy, r1, a0), [x1, y1] = polar(cx, cy, r1, a1), [x2, y2] = polar(cx, cy, r0, a1), [x3, y3] = polar(cx, cy, r0, a0), big = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r1},${r1} 0 ${big} 1 ${x1.toFixed(2)},${y1.toFixed(2)} L${x2.toFixed(2)},${y2.toFixed(2)} A${r0},${r0} 0 ${big} 0 ${x3.toFixed(2)},${y3.toFixed(2)} Z`;
}
export function exposureCard() {
  const S = 420, cx = S / 2, cy = S / 2, T = Math.PI * 2, start = -Math.PI / 2, gap = 0.012;
  let a = start;
  const outer = HOLDINGS.map((h) => { const a0 = a, a1 = a + D.share(h) * T; a = a1; const mid = (a0 + a1) / 2, pull = h.symbol === "NTAP" ? 14 : 0, [dx, dy] = polar(0, 0, pull, mid), [lx, ly] = polar(cx + dx, cy + dy, 175, mid);
    return `<g transform="translate(${dx.toFixed(1)},${dy.toFixed(1)})"><path d="${arc(cx, cy, 128, 168, a0 + gap, a1 - gap)}" fill="${col(h.color)}"><title>${h.name}</title></path>${D.share(h) > 0.07 ? `<text x="${polar(cx, cy, 148, mid)[0]}" y="${polar(cx, cy, 148, mid)[1] + 4}" text-anchor="middle" style="fill:white;font-weight:800;font-size:12px">${pc(D.share(h), 0)}</text>` : ""}</g>`; }).join("");
  a = start;
  const inner = D.BUCKETS.map(([b, c]) => { const sh = D.bucketValue(b) / VALUE, a0 = a, a1 = a + sh * T; a = a1; return `<path d="${arc(cx, cy, 92, 118, a0 + gap, a1 - gap)}" fill="${col(c)}" opacity=".85"><title>${b}</title></path>`; }).join("");
  const svg = `<svg class="donut" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${outer}${inner}<text x="${cx}" y="${cy - 6}" text-anchor="middle" style="font-size:26px;font-weight:800;fill:var(--fg)">${lakh(VALUE)}</text><text x="${cx}" y="${cy + 16}" text-anchor="middle" style="font-size:12px;font-weight:700;fill:var(--muted)">${plural(HOLDINGS.length, "holding")}</text></svg>`;
  const rows = HOLDINGS.map((h) => `<div class="exrow">${symTile(h, 34)}<div class="nm2"><b>${h.name}${h.symbol === "NTAP" ? `<span class="employer">${I.briefcase(9)} Employer</span>` : ""}</b><div class="shbar"><span style="width:${Math.min(100, D.share(h) * 250)}%;background:${fillc(h.color)}"></span></div></div><div class="r"><b style="font-size:13.5px">${pc(D.share(h))}</b><small>${lakhS(h.value)}</small></div></div>`).join("");
  const left = card(`${cardHead("How it's split", "outer ring by holding, inner ring by kind of asset", `<span class="row" style="gap:10px">${L.seg([{ label: "Holding", on: true }, { label: "Company" }, { label: "Market" }])}</span>`)}<div class="row" style="gap:28px;align-items:center">${svg}<div style="flex:1;min-width:0">${rows}</div></div><div class="legend2">${D.BUCKETS.map(([b, c]) => `<span><i style="background:${col(c)}"></i>${b} ${pc(D.bucketValue(b) / VALUE, 0)}</span>`).join("")}</div><div class="card-note">The slice pulled out is the one that's also your employer.</div>`, { gap: 14 });
  const sorted = [...HOLDINGS].sort((p, q) => q.value - p.value), top = (n) => sum(sorted.slice(0, n).map((h) => h.value)) / VALUE;
  const usdShare = sum(D.byMarket("US").map((h) => h.value)) / VALUE, single = HOLDINGS.filter((h) => h.assetType === "Equity"), singleV = sum(single.map((h) => h.value)) / VALUE;
  const right = card(`${cardHead("One company, twice", "the biggest holding is also the employer")}
  <div class="pair"><div><div class="k">Of what you hold</div><div class="v">${pc(D.share(D.NETAPP))}</div><div class="s">${lakhS(D.NETAPP.value)} in NetApp shares</div></div><div><div class="k">Of your pay</div><div class="v">${lakhS(D.SALARY_YEAR)}</div><div class="s">salary from NetApp, last 12 months</div></div></div>
  <div class="stack3"><div class="between"><b style="font-size:13px">The biggest few</b><span class="sub2">share of the whole</span></div>${[["Biggest one", 1], ["Top three", 3], ["Top five", 5]].map(([l, n]) => `<div style="display:grid;grid-template-columns:90px 1fr 48px;gap:10px;align-items:center;font-size:12px;font-weight:700"><span>${l}</span><span class="hbar" style="height:8px"><span style="width:${top(n) * 100}%;background:${fillc("onyx")}"></span></span><span style="text-align:right">${pc(top(n), 0)}</span></div>`).join("")}</div>
  <div class="stack3"><div class="between"><b style="font-size:13px">Single companies and funds</b></div><div class="strip" style="height:16px"><span style="width:${singleV * 100}%;background:${fillc("ruby")}"></span><span style="width:${(1 - singleV) * 100}%;background:${fillc("teal")}"></span></div><div class="legend2"><span><i style="background:${col("ruby")}"></i>${plural(single.length, "company", "companies")} ${pc(singleV, 0)}</span><span><i style="background:${col("teal")}"></i>${plural(HOLDINGS.length - single.length, "fund")} and ETFs ${pc(1 - singleV, 0)}</span></div></div>
  <div class="stack3"><div class="between"><b style="font-size:13px">Rupees and dollars</b><span class="sub2">what you hold, by currency</span></div><div class="strip" style="height:16px"><span style="width:${(1 - usdShare) * 100}%;background:${fillc("teal")}"></span><span style="width:${usdShare * 100}%;background:${fillc("sapphire")}"></span></div><div class="legend2"><span><i style="background:${col("teal")}"></i>Rupees ${pc(1 - usdShare, 0)}</span><span><i style="background:${col("sapphire")}"></i>Dollars ${pc(usdShare, 0)}</span></div><div class="kv"><span>A ₹1 move in USD/INR changes it by</span><b>${inr(D.US_VALUE_USD)}</b></div></div>
  <div class="stack3"><div class="kv"><span>Biggest holding</span><b>${sorted[0].name} · ${lakhS(sorted[0].value)}</b></div><div class="kv"><span>Smallest</span><b>${sorted.at(-1).name} · ${lakhS(sorted.at(-1).value)}</b></div><div class="kv"><span>The middle one</span><b>${sorted[Math.floor(sorted.length / 2)].name} · ${lakhS(sorted[Math.floor(sorted.length / 2)].value)}</b></div></div>
  <div class="card-note">These are facts about today's value. The app suggests no target split, and a share moves with prices as much as with what you buy.</div>`, { gap: 16 });
  return grid([[7, left], [5, right]]);
}
export const i3 = () => board(exposureCard(), P.rest());

// ---------- I4 Board ----------
const fl = (str, n, { cls = "", align = "r" } = {}) => { const s = String(str); const pad = Math.max(0, n - [...s].length); const chars = [...(align === "r" ? " ".repeat(pad) + s : s + " ".repeat(pad))]; return `<span class="fl sm ${cls}${align === "r" ? " r" : ""}">${chars.map((c) => `<i>${c === " " ? "&nbsp;" : c}</i>`).join("")}</span>`; };
const boardPrice = (h) => (h.market === "US" ? `$${h.price.toFixed(2)}` : h.price >= 1000 ? `₹${Math.round(h.price).toLocaleString("en-IN")}` : `₹${h.price.toFixed(2)}`);
export function departures() {
  const mk = D.MARKETS.map(([k, v, c]) => `<div><div class="k">${k}</div><div class="v">${v}</div><div class="c ${c >= 0 ? "" : ""}" style="color:${c >= 0 ? "oklch(0.82 0.17 150)" : "oklch(0.72 0.17 25)"}">${c >= 0 ? "▲" : "▼"} ${Math.abs(c).toFixed(2)}%</div></div>`).join("");
  const row = (h) => `<div class="fb-r">${fl(h.symbol, 8, { align: "l" })}<div class="fb-n"><b>${h.name}</b><small>${qty(h.quantity)} ${h.assetType === "Mutual-Fund" || h.assetType === "Debt-Fund" ? "units" : "shares"}${h.sources.length ? ` · ${h.sources.join(" + ")}` : ""} · ${h.src}</small></div>${fl(Math.round(h.quantity).toLocaleString("en-IN"), 6)}${fl(boardPrice(h), 8)}${fl(`${h.dayPct >= 0 ? "▲" : "▼"}${(Math.abs(h.dayPct) * 100).toFixed(2)}%`, 7, { cls: h.dayPct >= 0 ? "up" : "dn" })}${fl(lakh(h.value), 9)}${fl(spc(h.gainPct), 7, { cls: h.gain >= 0 ? "up" : "dn" })}<span style="text-align:center"><i class="fb-dot ${h.stale ? "st" : "ok"}"></i></span></div>`;
  const grp = (label, time, list) => `<div class="fb-grp"><span>${label}</span><span>${time}</span></div>${list.map(row).join("")}`;
  return `<section class="fb"><div class="fb-top"><div><h3>${I.invest(14).replace("<svg", '<svg style="vertical-align:-2px;margin-right:8px"')}Holdings board</h3><small>Friday 30 October 2026 · markets closed · prices are the closing price</small></div><div style="text-align:right"><div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:oklch(0.7 0.01 250);margin-bottom:6px">Total value</div>${fl(lakh(VALUE), 9)}<div style="margin-top:6px">${fl(`${D.DAY >= 0 ? "▲" : "▼"} ${inr(Math.abs(D.DAY))}`, 10, { cls: D.DAY >= 0 ? "up" : "dn" })}</div></div></div>
  <div class="fb-mk">${mk}</div>
  <div class="fb-h"><span>Symbol</span><span>Holding</span><span style="text-align:right">Qty</span><span style="text-align:right">Price</span><span style="text-align:right">Day</span><span style="text-align:right">Value</span><span style="text-align:right">Gain</span><span style="text-align:center">Price</span></div>
  ${grp("India · NSE · AMFI", "closed 15:30 IST", D.byMarket("IND"))}${grp("United States · NYSE · Nasdaq", "closed 16:00 ET", D.byMarket("US"))}
  <div class="fb-f"><span>Put in ${lakh(COST)} · up ${lakhS(D.GAIN)} (${spc(D.GAIN_PCT)}) · USD/INR ₹${D.FX_NOW}</span><span><i class="fb-dot ok" style="width:8px;height:8px"></i> fresh &nbsp; <i class="fb-dot st" style="width:8px;height:8px"></i> NAV is old</span></div></section>`;
}
export const i4 = () => board(departures(), `${grid([[4, P.allocation()], [4, P.recentTrades()], [4, P.netappCard()]])}${grid([[6, P.movers()], [6, P.pricesCard()]])}`);

// ---------- I5 Rulers ----------
export function rulers() {
  const ruler = (h) => {
    const cost = h.avgCostNative, px = h.price, lo = Math.min(h.lo, cost, px) * 0.985, hi = Math.max(h.hi, cost, px) * 1.015, p = (v) => ((v - lo) / (hi - lo)) * 100, fmtp = (v) => (h.market === "US" ? usd(v, 0) : `₹${Math.round(v).toLocaleString("en-IN")}`);
    const a = Math.min(p(cost), p(px)), b = Math.max(p(cost), p(px)), up = px >= cost;
    return `<div class="rl"><div class="rl-track"></div><span class="rl-seg" style="left:${a}%;width:${b - a}%;background:${up ? fillc("emerald") : fillc("ruby")}"></span><span class="rl-cost" style="left:${p(cost)}%"><span>cost ${fmtp(cost)}</span></span><span class="rl-px" style="left:${p(px)}%;background:${col(h.color)}"><span style="left:${p(px) > 90 ? -50 : p(px) < 8 ? -2 : -14}px">${h.market === "US" ? usd(px) : `₹${D.num2(px)}`}</span></span><div class="rl-ends"><span>${fmtp(h.lo)} low</span><span>52 weeks</span><span>${fmtp(h.hi)} high</span></div></div>`;
  };
  const row = (h) => `<div class="rl-row"><div class="cell-name">${symTile(h, 40)}<div class="nm2"><b>${h.name}${P.srcTags(h)}</b><small>${qty(h.quantity)} ${h.assetType.includes("Fund") ? "units" : "shares"} · ${P.dchip(h.dayPct).replace(/<[^>]+>/g, (m) => m)} today</small></div></div>${ruler(h)}<div class="r"><b style="font-size:15px">${lakhS(h.value)}</b><small class="${gainCls(h.gain)}">${h.gain >= 0 ? "+" : "−"}${lakhS(Math.abs(h.gain))} · ${spc(h.gainPct)}</small></div></div>`;
  const sec = (label, list, extra) => `<div class="hgrp"><span>${label}</span><b>${extra}</b></div>${list.map(row).join("")}`;
  const legend = `<span class="row" style="gap:16px"><span class="lgd"><i style="width:2px;height:14px;background:var(--ink);display:inline-block;border-radius:2px"></i>what you paid, on average</span><span class="lgd"><i style="width:11px;height:11px;background:var(--card-sapphire);transform:rotate(45deg);border-radius:2px;display:inline-block"></i>today's price</span><span class="lgd"><i style="width:22px;height:8px;border-radius:999px;background:${fillc("emerald")};display:inline-block"></i>ahead</span><span class="lgd"><i style="width:22px;height:8px;border-radius:999px;background:${fillc("ruby")};display:inline-block"></i>behind</span></span>`;
  return card(`${cardHead("Where each one stands", "its price against what you paid, along its 52-week range", legend)}<div>${sec("India · INR", D.byMarket("IND"), `${plural(D.byMarket("IND").length, "holding")} · ${lakhS(sum(D.byMarket("IND").map((h) => h.value)))}`)}${sec("United States · USD", D.byMarket("US"), `${plural(D.byMarket("US").length, "holding")} · ${usd(D.US_VALUE_USD, 0)} · ${lakhS(sum(D.byMarket("US").map((h) => h.value)))}`)}</div><div class="card-note">A US holding is on its dollar prices here; the rupee's move is in its value and gain. Each ruler has its own scale.</div>`, { gap: 6 });
}
export const i5 = () => board(rulers(), `${grid([[4, P.allocation()], [4, P.recentTrades()], [4, P.netappCard()]])}${grid([[6, P.movers()], [6, P.pricesCard()]])}`);
