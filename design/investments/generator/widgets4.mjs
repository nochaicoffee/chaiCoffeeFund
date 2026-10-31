// Round 3 widgets that explain the split and what to look at: the split explorer, targets and drift (your targets), the weight-against-return
// map, a what-if stress test, a growth path, concentration against your own limits, and who made the gain. Everything here is arithmetic on the
// holdings and on numbers YOU set (targets, limits, a monthly amount, a return): the page never suggests a split, a limit or a trade.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as H from "./history.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
const { I, inr, fmt, plural } = L;
const { sum, pc, spc, usd, qty, lakh, HOLDINGS, VALUE, COST } = D;
const { card, cardHead, link, hc, tip, col, fillc, symTile, lakhS, sInr, gainCls } = P;

const cr = (n) => (Math.abs(n) >= 1e7 ? `₹${(n / 1e7).toFixed(2)}Cr` : lakh(n));
const SECTOR = { NTAP: "Technology", VOO: "Broad market", QQQ: "Technology", HDFCBANK: "Financials", INFY: "Technology", RELIANCE: "Energy and conglomerate", NIFTYBEES: "Broad market", PPFAS: "Broad market", ICICICORP: "Debt", GOLDBEES: "Gold" };
const TOK = ["teal", "sapphire", "copper", "violet", "emerald", "ruby", "gold", "indigo", "sky", "rose"];
const view = (name, key, inner) => `<div class="v-${name}" data-k="${key}">${inner}</div>`;

// ---------- 1. The split explorer ----------
const SLICES = [
  ["asset", "Asset class", (h) => (h.assetType === "Debt-Fund" ? "Debt" : h.assetType === "Gold" ? "Gold" : "Equity"), "stocks and equity funds together"],
  ["market", "Market", (h) => (h.market === "US" ? "United States" : "India"), "where it trades, and so its currency"],
  ["kind", "Company or fund", (h) => (h.assetType === "Equity" ? "Single companies" : h.assetType === "Debt-Fund" ? "Debt fund" : h.assetType === "Gold" ? "Gold" : "Funds and ETFs"), "one company's fortunes against a basket"],
  ["sector", "Sector", (h) => SECTOR[h.symbol], "a fund or ETF by its main tilt (proposed)"],
  ["holding", "Holding", (h) => h.name, "every holding on its own"],
];
const SRC_NAMES = [["market", "Bought with cash"], ["espp", "ESPP"], ["rsu", "RSU vests"]];
const srcCost = (h) => { const buys = h.trades.filter((t) => t.tradeType === "Buy"), tot = sum(buys.map(D.costInr)); return Object.fromEntries(SRC_NAMES.map(([k]) => [k, tot ? (h.costInr * sum(buys.filter((t) => (k === "market" ? t.source === "Market" : t.source.toLowerCase() === k)).map(D.costInr))) / tot : 0])); };
const polar = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const arc = (cx, cy, r0, r1, a0, a1) => { const [x0, y0] = polar(cx, cy, r1, a0), [x1, y1] = polar(cx, cy, r1, a1), [x2, y2] = polar(cx, cy, r0, a1), [x3, y3] = polar(cx, cy, r0, a0), big = a1 - a0 > Math.PI ? 1 : 0; return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r1},${r1} 0 ${big} 1 ${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} A${r0},${r0} 0 ${big} 0 ${x3.toFixed(1)},${y3.toFixed(1)}Z`; };
function sliceView(key, label, fn, note) {
  const groups = new Map();
  if (key === "source") { for (const h of HOLDINGS) { const s = srcCost(h); for (const [k, n] of SRC_NAMES) { const g = groups.get(n) ?? { name: n, value: 0, cost: 0, items: [] }; g.value += s[k]; g.cost += s[k]; groups.set(n, g); } } }
  else for (const h of HOLDINGS) { const n = fn(h), g = groups.get(n) ?? { name: n, value: 0, cost: 0, items: [], color: key === "holding" ? h.color : null }; g.value += h.value; g.cost += h.costInr; g.items.push(h); groups.set(n, g); }
  const list = [...groups.values()].sort((a, b) => b.value - a.value), total = sum(list.map((g) => g.value));
  list.forEach((g, i) => (g.color ??= TOK[i % TOK.length]));
  const S = 300, c = S / 2; let a = -Math.PI / 2;
  const arcs = list.map((g, i) => { const a0 = a, a1 = a + (g.value / total) * Math.PI * 2; a = a1; return `<path class="sl-arc" data-i="${i}" d="${arc(c, c, 86, 134, a0 + 0.012, a1 - 0.012)}" fill="${col(g.color)}"><title>${g.name} ${pc(g.value / total)}</title></path>`; }).join("");
  const svg = `<svg class="donut" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${arcs}<text x="${c}" y="${c - 4}" text-anchor="middle" style="font-size:24px;font-weight:800;fill:var(--fg)">${lakh(total)}</text><text x="${c}" y="${c + 18}" text-anchor="middle" style="font-size:11.5px;font-weight:700;fill:var(--muted)">${key === "source" ? "put in" : "worth today"}</text></svg>`;
  const rows = list.map((g, i) => `<div class="sl-row" data-i="${i}"><span class="n"><i style="background:${col(g.color)}"></i>${g.name}</span><b>${pc(g.value / total)}</b><span class="bar"><i style="width:${Math.min(100, (g.value / total) * 100 * 1.6)}%;background:${fillc(g.color)}"></i></span><small>${lakhS(g.value)}${key === "source" ? "" : ` · <em class="${gainCls(g.value - g.cost)}">${spc(g.cost ? g.value / g.cost - 1 : 0, 0)}</em>`}</small></div>`).join("");
  return view("sp", key, `<div class="spw">${svg}<div class="sl-list">${rows}</div></div><div class="card-note">${note}.</div>`);
}
export function splitExplorer() {
  const all = [...SLICES, ["source", "How it came in", null, "cost still held, split by how it was bought: cash, ESPP, RSU vests"]];
  return card(`${cardHead("How it's split", "slice it six ways · hover a row to find its slice", C.chips("sp", all.map(([k, l]) => [k, l])))}${all.map(([k, l, fn, n]) => sliceView(k, l, fn, n)).join("")}`, { gap: 14, cls: "sbtw" });
}

// ---------- 2. Your targets, and the drift ----------
const TARGETS = { "India equity": 0.35, "US equity": 0.5, Debt: 0.1, Gold: 0.05 };
const NEW_MONEY = [["50k", 50000, "₹50,000"], ["1l", 100000, "₹1,00,000"], ["2l", 200000, "₹2,00,000"], ["5l", 500000, "₹5,00,000"]];
const bucketsNow = D.BUCKETS.map(([b, c]) => ({ b, c, v: D.bucketValue(b), t: TARGETS[b], short: TARGETS[b] * VALUE - D.bucketValue(b) }));
/** New money goes only to buckets below their target, in proportion to how far below; past that, by target weight. Never a sale. */
const allocate = (x) => { const under = bucketsNow.filter((b) => b.short > 0), sh = sum(under.map((b) => b.short)); return bucketsNow.map((b) => { const first = b.short > 0 ? Math.min(x, sh) * (b.short / sh) : 0, rest = Math.max(0, x - sh) * b.t; return first + rest; }); };
export function targets() {
  const row = (b, i, add) => { const after = (b.v + (add?.[i] ?? 0)) / (VALUE + (add ? sum(add) : 0)); return `<div class="tg-row"><div class="tg-n"><i style="background:${col(b.c)}"></i><b>${b.b}</b><span>${b.t * 100}% target</span></div><div class="tg-bar"><span class="now" style="width:${(b.v / VALUE) * 100}%;background:${fillc(b.c)}"></span>${add ? `<span class="aft" style="left:${(b.v / VALUE) * 100}%;width:${Math.max(0, (after - b.v / VALUE) * 100)}%"></span>` : ""}<i class="tick" style="left:${b.t * 100}%"></i></div><div class="tg-v"><b>${pc(add ? after : b.v / VALUE)}</b>${add ? `<small class="up">+${lakhS(add[i])}</small>` : `<small class="${b.short >= 0 ? "" : ""}">${b.short >= 0 ? `${lakhS(b.short)} below` : `${lakhS(-b.short)} above`}</small>`}</div></div>`; };
  const views = NEW_MONEY.map(([k, x, l]) => { const add = allocate(x); return view("nm", k, `<div class="tg-h"><b>Adding ${l}</b><span class="sub2" style="margin:0">it goes only where you're below your target, in proportion to how far below</span></div>${bucketsNow.map((b, i) => row(b, i, add)).join("")}`); }).join("");
  const move = bucketsNow.map((b) => `<span class="mvchip ${b.short >= 0 ? "buy" : "sell"}">${b.short >= 0 ? "Buy" : "Sell"} ${lakhS(Math.abs(b.short))} <em>${b.b}</em></span>`).join("");
  return card(`${cardHead("Your targets", "yours, not the app's · sample numbers", `<span class="chips" style="--chip-on-bg:var(--ink);--chip-on-fg:var(--on-ink)">${NEW_MONEY.map(([k, , l]) => `<label class="chip2" for="nm-${k}">+${l.replace("₹", "₹")}</label>`).join("")}</span>`)}
  <div class="tg-h"><b>Today</b><span class="sub2" style="margin:0">the tick is your target</span></div>${bucketsNow.map((b) => row(b, 0, null)).join("")}
  ${views}
  <div class="stack3" style="margin-top:2px"><b style="font-size:13px">To land exactly on your targets, with no new money</b><div class="mvrow">${move}</div></div>
  <div class="card-note">The app suggests no split: these targets are numbers you set, and this only does the sum. Adding money never sells anything.</div>`, { gap: 12, cls: "sbtw" });
}

// ---------- 3. Where the weight is, and how it is doing ----------
const cw = (span) => Math.round(99.4 * span + 20 * (span - 1) - 44);
export function weightMap(span = 6) {
  const W = cw(span), Hh = Math.round(Math.max(320, W * 0.6)), ml = 52, mr = 22, mt = 20, mb = 40, pw = W - ml - mr, ph = Hh - mt - mb, xmin = -0.2, xmax = 0.7, ymax = 0.42;
  const x = (v) => ml + ((v - xmin) / (xmax - xmin)) * pw, y = (v) => mt + ph - (v / ymax) * ph, maxV = Math.max(...HOLDINGS.map((h) => h.value));
  const gx = [-0.2, 0, 0.2, 0.4, 0.6].map((v) => `<line class="gl" x1="${x(v)}" x2="${x(v)}" y1="${mt}" y2="${mt + ph}" ${v === 0 ? 'style="stroke-width:1.6;opacity:.7"' : ""}/><text class="ax" x="${x(v)}" y="${Hh - 18}" text-anchor="middle">${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100)}%</text>`).join("");
  const gy = [0, 0.1, 0.2, 0.3, 0.4].map((v) => `<line class="gl" x1="${ml}" x2="${ml + pw}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${ml - 8}" y="${y(v) + 4}" text-anchor="end">${v * 100}%</text>`).join("");
  const bubbles = [...HOLDINGS].sort((a, b) => b.value - a.value).map((h) => { const cx = x(h.gainPct), cy = y(D.share(h)), r = 8 + Math.sqrt(h.value / maxV) * 30, tx = cx > W * 0.6 ? cx - 196 : cx + r + 8, ty = Math.max(mt, Math.min(cy - 6, Hh - mb - 78));
    return `<g class="bbg"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${col(h.color)}" fill-opacity=".82" stroke="var(--surface)" stroke-width="2"/>${r > 18 ? `<text x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" style="fill:white;font-weight:800;font-size:11px;pointer-events:none">${h.symbol.slice(0, 5)}</text>` : ""}<g class="bt"><rect x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" width="188" height="68" rx="10"/><text x="${(tx + 12).toFixed(1)}" y="${(ty + 20).toFixed(1)}" class="bb">${h.name}</text><text x="${(tx + 12).toFixed(1)}" y="${(ty + 38).toFixed(1)}">${pc(D.share(h))} of what you hold · ${lakhS(h.value)}</text><text x="${(tx + 12).toFixed(1)}" y="${(ty + 55).toFixed(1)}" style="fill:${h.gain >= 0 ? "oklch(0.42 0.14 150)" : "oklch(0.5 0.16 25)"}">${spc(h.gainPct)} on what it cost</text></g></g>`; }).join("");
  const zone = `<rect x="${x(xmin)}" y="${mt}" width="${x(0.1) - x(xmin)}" height="${y(0.2) - mt}" rx="14" fill="var(--loss)" opacity=".07"/><text x="${x(xmin) + 10}" y="${mt + 18}" style="fill:var(--loss);font-weight:800;font-size:11px;opacity:.85">BIG AND BEHIND</text><rect x="${x(0.3)}" y="${mt}" width="${x(xmax) - x(0.3)}" height="${y(0.2) - mt}" rx="14" fill="var(--gain)" opacity=".07"/><text x="${x(xmax) - 10}" y="${mt + 18}" text-anchor="end" style="fill:var(--gain);font-weight:800;font-size:11px;opacity:.85">BIG AND AHEAD</text>`;
  const svg = `<svg class="chsvg wm" viewBox="0 0 ${W} ${Hh}" width="100%">${zone}${gx}${gy}<text class="ax" x="${ml + pw / 2}" y="${Hh - 2}" text-anchor="middle" style="font-weight:800">Return on what it cost →</text><text class="ax" transform="translate(12 ${mt + ph / 2}) rotate(-90)" text-anchor="middle" style="font-weight:800">Share of what you hold →</text>${bubbles}</svg>`;
  return card(`${cardHead("Weight against return", "each bubble is a holding: the bigger, the more it's worth · hover one")}${svg}<div class="card-note">The shaded corners are only a way to look: a big holding that is behind isn't a signal to sell. The map just shows where the weight sits.</div>`, { gap: 10, cls: "sbtw" });
}

// ---------- 4. What if ----------
const SCEN = [
  ["usdn", "USD/INR −5%", "the rupee gets stronger", (h) => (h.market === "US" ? 0.95 : 1)],
  ["usup", "USD/INR +5%", "the rupee gets weaker", (h) => (h.market === "US" ? 1.05 : 1)],
  ["us20", "US prices −20%", "every US holding falls a fifth", (h) => (h.market === "US" ? 0.8 : 1)],
  ["in20", "India equity −20%", "Indian stocks and funds fall a fifth", (h) => (h.bucket === "India equity" ? 0.8 : 1)],
  ["ntap30", "NetApp −30%", "the employer's shares fall", (h) => (h.symbol === "NTAP" ? 0.7 : 1)],
  ["eq15", "All equity −15%", "a broad fall everywhere", (h) => (h.bucket.endsWith("equity") ? 0.85 : 1)],
  ["gold10", "Gold −10%", "gold falls a tenth", (h) => (h.bucket === "Gold" ? 0.9 : 1)],
];
export function whatIf() {
  const views = SCEN.map(([k, label, why, f]) => {
    const rows = HOLDINGS.map((h) => ({ h, d: h.value * (f(h) - 1) })), tot = sum(rows.map((r) => r.d)), nv = VALUE + tot, mx = Math.max(...rows.map((r) => Math.abs(r.d)), 1), ng = nv - COST;
    return view("st", k, `<div class="st-top"><div><div class="hk">If ${label.toLowerCase().replace("usd/inr", "USD/INR")}</div><div class="bigv" style="font-size:34px">${lakh(nv)}</div><div class="sub2 ${gainCls(tot)}" style="margin-top:4px;font-weight:800">${sInr(tot)} · ${spc(tot / VALUE)} from today</div></div><div class="st-note"><b>${pc(Math.abs(tot) / D.GAIN, 0)}</b> of today's gain<small>you'd still be ${ng >= 0 ? "up" : "down"} ${lakhS(Math.abs(ng))} on what it cost</small></div></div>${[...rows].sort((a, b) => a.d - b.d).map((r) => Math.abs(r.d) <= 1 ? `<div class="st-row mute">${symTile(r.h, 24)}<span class="n">${r.h.symbol}</span><span class="bar"><b class="zero"></b></span><span class="v">no change</span></div>` : `<div class="st-row">${symTile(r.h, 24)}<span class="n">${r.h.symbol}</span><span class="bar"><i class="${r.d < 0 ? "dn" : "up"}" style="${r.d < 0 ? "right" : "left"}:50%;width:${(Math.abs(r.d) / mx) * 50}%"></i><b class="zero"></b></span><span class="v ${gainCls(r.d)}">${sInr(r.d)}</span></div>`).join("")}<div class="card-note">${why}. Prices only: nothing sold, nothing added.</div>`);
  });
  const base = view("st", "base", `<div class="st-top"><div><div class="hk">Today</div><div class="bigv" style="font-size:34px">${lakh(VALUE)}</div><div class="sub2" style="margin-top:4px;font-weight:800">pick a what-if above</div></div><div class="st-note"><b>${pc(D.GAIN / VALUE, 0)}</b> of it is gain<small>${lakhS(D.GAIN)} on ${lakhS(COST)} put in</small></div></div>${HOLDINGS.map((h) => `<div class="st-row">${symTile(h, 24)}<span class="n">${h.symbol}</span><span class="bar"><i class="up" style="left:0;width:${D.share(h) * 250}%"></i></span><span class="v">${pc(D.share(h))}</span></div>`).join("")}<div class="card-note">Bars are each holding's share today. Pick a what-if to see how each would move.</div>`);
  return card(`${cardHead("What if", "a what-if, not a forecast", `<span class="chips" style="--chip-on-bg:var(--ink);--chip-on-fg:var(--on-ink);flex-wrap:wrap;border-radius:18px">${[["base", "Today"], ...SCEN.map(([k, l]) => [k, l])].map(([k, l]) => `<label class="chip2" for="st-${k}" style="padding:6px 11px;font-size:12px">${l}</label>`).join("")}</span>`)}${base}${views.join("")}`, { gap: 12, cls: "sbtw" });
}

// ---------- 5. Growth path ----------
const RETS = [["6", 0.06], ["9", 0.09], ["12", 0.12]], ADDS = [["0", 0, "Nothing added", "oklch(0.58 0.012 260)"], ["25", 25000, "+₹25,000 a month", "oklch(0.6 0.12 200)"], ["50", 50000, "+₹50,000 a month", "oklch(0.5 0.17 150)"]];
const proj = (r, add, months) => { const out = [VALUE]; let v = VALUE; for (let m = 1; m <= months; m++) { v = v * (1 + r / 12) + add; out.push(v); } return out; };
export function growth(span = 6) {
  const Wd = cw(span), Hh = Math.round(Math.max(290, Wd * 0.46)), ml = 56, mr = 100, mt = 18, mb = 32, pw = Wd - ml - mr, ph = Hh - mt - mb, months = 120;
  const views = RETS.map(([k, r]) => { const lines = ADDS.map(([ak, add, lab, c]) => ({ ak, add, lab, c, pts: proj(r, add, months) })), top = Math.max(...lines.map((l) => l.pts.at(-1))) * 1.06, nice = (() => { const raw = top / 4, m = Math.pow(10, Math.floor(Math.log10(raw))); return [1, 2, 2.5, 5, 10].map((q) => q * m).find((q) => q >= raw); })();
    const ymax = Math.ceil(top / nice) * nice, x = (m) => ml + (m / months) * pw, y = (v) => mt + ph - (v / ymax) * ph;
    const gy = Array.from({ length: Math.round(ymax / nice) + 1 }, (_, i) => i * nice).map((v) => `<line class="gl" x1="${ml}" x2="${ml + pw}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${ml - 8}" y="${y(v) + 4}" text-anchor="end">${v ? (v >= 1e7 ? `${(v / 1e7).toFixed(1)}Cr` : `${v / 1e5}L`) : "0"}</text>`).join("");
    const gx = [0, 2, 4, 6, 8, 10].map((yr) => `<text class="ax" x="${x(yr * 12)}" y="${Hh - 8}" text-anchor="${yr === 0 ? "start" : yr === 10 ? "end" : "middle"}">${yr === 0 ? "Today" : `${2026 + yr}`}</text>`).join("");
    const body = lines.map((l) => `<g class="gl-${l.ak}"><path d="${l.pts.map((v, m) => `${m ? "L" : "M"}${x(m).toFixed(1)},${y(v).toFixed(1)}`).filter((_, m) => m % 3 === 0 || m === months).join(" ")}" fill="none" stroke="${l.c}" stroke-width="${l.ak === "50" ? 3 : 2.2}" stroke-linejoin="round"/><rect x="${ml + pw + 6}" y="${(y(l.pts.at(-1)) - 10).toFixed(1)}" width="84" height="20" rx="10" fill="${l.c}"/><text x="${ml + pw + 48}" y="${(y(l.pts.at(-1)) + 4).toFixed(1)}" text-anchor="middle" style="fill:white;font-weight:800;font-size:11px">${cr(l.pts.at(-1))}</text></g>`).join("");
    const kv = lines.map((l) => `<div class="kv gl-${l.ak}"><span style="display:flex;align-items:center;gap:8px"><i class="dot" style="background:${l.c}"></i>${l.lab}</span><b>${cr(l.pts.at(-1))}${l.add ? ` <small style="color:var(--muted);font-weight:600">of which you add ${lakh(l.add * months)}</small>` : ""}</b></div>`).join("");
    return view("gr", k, `<svg class="chsvg" viewBox="0 0 ${Wd} ${Hh}" width="100%">${gy}${gx}${body}</svg>${kv}`);
  }).join("");
  const toggles = `<div class="lgrow">${ADDS.map(([k, , lab, c]) => `<input type="checkbox" class="pk-in" id="ga-${k}" checked><label class="lgc" for="ga-${k}" style="--lc:${c}"><i></i>${lab}</label>`).join("")}</div>`;
  return card(`${cardHead("Where it could go in ten years", "a yearly return YOU assume · not a forecast", `<span class="chips" style="--chip-on-bg:var(--ink);--chip-on-fg:var(--on-ink)">${RETS.map(([k, r]) => `<label class="chip2" for="gr-${k}">${r * 100}% a year</label>`).join("")}</span>`)}${toggles}${views}<div class="card-note">Compounded monthly from today's ${lakh(VALUE)}, no tax and no fees. The return is a number you pick to see how much a monthly amount matters; the app has no view on what you'll earn.</div>`, { gap: 12, cls: "sbtw" });
}

// ---------- 6. Concentration, against your own limits ----------
const sorted = [...HOLDINGS].sort((a, b) => b.value - a.value);
const cum = (p) => { let c = 0, n = 0; for (const h of sorted) { c += D.share(h); n++; if (c >= p) break; } return n; };
const effN = 1 / sum(HOLDINGS.map((h) => D.share(h) ** 2));
export function concentration() {
  const usdShare = sum(D.byMarket("US").map((h) => h.value)) / VALUE, singles = sum(HOLDINGS.filter((h) => h.assetType === "Equity").map((h) => h.value)) / VALUE, debt = D.bucketValue("Debt") / VALUE, top = D.share(sorted[0]);
  const ladder = `<div class="ld"><div class="strip" style="height:30px;gap:2px;position:relative">${sorted.map((h) => `<span class="hov" style="width:${D.share(h) * 100}%;background:${fillc(h.color)};border-radius:6px;position:relative" tabindex="0">${tip(hc({ h: h.name, t: pc(D.share(h)), d: lakhS(h.value), w: 200 }), { w: 200 })}</span>`).join("")}<i class="ldm" style="left:50%"><em>50%</em></i><i class="ldm" style="left:80%"><em>80%</em></i></div></div>`;
  const rules = [
    ["One holding at most 30%", top, 0.3, "max", `${sorted[0].name} is ${pc(top)}`],
    ["Dollars at most 70%", usdShare, 0.7, "max", `${pc(usdShare)} of what you hold is in dollars`],
    ["Debt at least 5%", debt, 0.05, "min", `${pc(debt)} is in debt`],
    ["Single companies at most 50%", singles, 0.5, "max", `${pc(singles)} is in single companies`],
  ].map(([l, v, lim, kind, why]) => { const bad = kind === "max" ? v > lim : v < lim; return `<div class="rule${bad ? " bad" : ""}"><div class="rrt"><b>${l}</b><span class="rchip ${bad ? "bad" : "ok"}">${bad ? `${kind === "max" ? "Over" : "Under"} by ${((Math.abs(v - lim)) * 100).toFixed(1)} pts` : "Within"}</span></div><div class="rm"><span style="width:${Math.min(100, v * 100)}%;background:${bad ? "var(--loss)" : "var(--gain)"}"></span><i style="left:${lim * 100}%"></i></div><small>${why}</small></div>`; }).join("");
  return card(`${cardHead("How concentrated", "and your own limits")}
  <div class="pair"><div><div class="k">Holdings that make half</div><div class="v">${cum(0.5)}</div><div class="s">${cum(0.8)} make 80%</div></div><div><div class="k">Like holding</div><div class="v">${effN.toFixed(1)}</div><div class="s">equal-sized holdings, of ${HOLDINGS.length}</div></div></div>
  ${ladder}<div class="legend2" style="margin-top:-2px"><span class="sub2" style="margin:0">every holding, biggest first, as a share of the whole · hover a piece</span></div>
  <div class="stack3"><div class="between"><b style="font-size:13px">Your limits</b><span class="sub2" style="margin:0">yours, sample numbers</span></div>${rules}</div>
  <div class="card-note">The app only checks the limits you set against today's figures. It never suggests one, and a breach isn't a call to act.</div>`, { gap: 12, cls: "sbtw" });
}

// ---------- 7. Who made the gain ----------
export function gainShare() {
  const rows = [...HOLDINGS].sort((a, b) => b.gain - a.gain), mx = Math.max(...rows.map((h) => Math.abs(h.gain))), tot = D.GAIN;
  const line = (h) => { const us = h.market === "US", pr = us ? h.stockGain : h.gain, fx = us ? h.rateGain : 0, w = (v) => (Math.abs(v) / mx) * 100; return `<div class="gs-row">${symTile(h, 28)}<div class="nm2"><b>${h.symbol}</b><small>${h.name}</small></div><div class="gs-bar">${pr >= 0 ? `<span style="width:${w(pr) * 0.52}%;background:${fillc(h.color)}"></span>${fx ? `<span style="width:${w(fx) * 0.52}%;background:${fillc("copper")}"></span>` : ""}` : `<span style="width:${w(pr) * 0.52}%;background:${fillc("ruby")}"></span>`}</div><div class="r"><b class="${gainCls(h.gain)}">${sInr(h.gain)}</b><small>${h.gain >= 0 ? `${pc(h.gain / tot, 0)} of the gain` : "a loss"}</small></div></div>`; };
  return card(`${cardHead("Who made the gain", "each holding's gain, and its share of the whole", `<span class="legend2"><span><i style="background:${col("sapphire")}"></i>price</span><span><i style="background:${col("copper")}"></i>the rupee</span></span>`)}<div>${rows.map(line).join("")}</div><div class="kv"><span>All ten</span><b class="up">${sInr(tot)} · ${spc(D.GAIN_PCT)}</b></div>`, { gap: 6, cls: "sbtw" });
}

export const sectionHead = (t, s) => `<div class="card-t" style="padding:6px 4px 0;font-size:17px">${t}<small>${s}</small></div>`;
export const RADIO_KEYS = { sp: [...SLICES.map((s) => s[0]), "source"], nm: NEW_MONEY.map((n) => n[0]), st: ["base", ...SCEN.map((s) => s[0])], gr: RETS.map((r) => r[0]) };
export const widgetRadios = () => `${C.radios("sp", RADIO_KEYS.sp, "asset")}${C.radios("nm", RADIO_KEYS.nm, "1l")}${C.radios("st", RADIO_KEYS.st, "base")}${C.radios("gr", RADIO_KEYS.gr, "9")}`;
