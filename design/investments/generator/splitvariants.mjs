// "How it's split", five fuller layouts (2026-11-02): the donut-and-list left white space whenever a slice had few rows. Each layout here fills a fixed
// height whatever the slice, and all of them are driven by the same six slice chips. Sample data, made up.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as X from "./widgets4.mjs";
import * as K from "./heroes3.mjs";
const { I, plural } = L;
const { sum, pc, spc, lakh, HOLDINGS, VALUE } = D;
const { card, cardHead, grid, col, fillc, symTile, lakhS, gainCls } = P;

export const SECTOR = { NTAP: "Technology", VOO: "Broad market", QQQ: "Technology", HDFCBANK: "Financials", INFY: "Technology", RELIANCE: "Energy and conglomerate", NIFTYBEES: "Broad market", PPFAS: "Broad market", ICICICORP: "Debt", GOLDBEES: "Gold" };
export const TOK = ["teal", "sapphire", "copper", "violet", "emerald", "ruby", "gold", "indigo", "sky", "rose"];
export const SLICES = [
  ["asset", "Asset class", (h) => (h.assetType === "Debt-Fund" ? "Debt" : h.assetType === "Gold" ? "Gold" : "Equity")],
  ["market", "Market", (h) => (h.market === "US" ? "United States" : "India")],
  ["kind", "Company or fund", (h) => (h.assetType === "Equity" ? "Single companies" : h.assetType === "Debt-Fund" ? "Debt fund" : h.assetType === "Gold" ? "Gold" : "Funds and ETFs")],
  ["sector", "Sector", (h) => SECTOR[h.symbol]],
  ["holding", "Holding", (h) => h.name],
  ["source", "How it came in", null],
];
const SRC = [["market", "Bought with cash"], ["espp", "ESPP"], ["rsu", "RSU vests"]];
const srcCost = (h) => { const b = h.trades.filter((t) => t.tradeType === "Buy"), tot = sum(b.map(D.costInr)); return Object.fromEntries(SRC.map(([k]) => [k, tot ? (h.costInr * sum(b.filter((t) => (k === "market" ? t.source === "Market" : t.source.toLowerCase() === k)).map(D.costInr))) / tot : 0])); };
/** [{name, color, value, cost, items: [{h, value}]}] biggest first, and the total. */
export function data(key) {
  const fn = SLICES.find((s) => s[0] === key)[2], map = new Map();
  if (key === "source") { for (const h of HOLDINGS) { const s = srcCost(h); for (const [k, n] of SRC) { if (s[k] < 1) continue; const g = map.get(n) ?? { name: n, value: 0, cost: 0, items: [] }; g.value += s[k]; g.cost += s[k]; g.items.push({ h, value: s[k] }); map.set(n, g); } } }
  else for (const h of HOLDINGS) { const n = fn(h), g = map.get(n) ?? { name: n, value: 0, cost: 0, items: [], color: key === "holding" ? h.color : null }; g.value += h.value; g.cost += h.costInr; g.items.push({ h, value: h.value }); map.set(n, g); }
  const list = [...map.values()].sort((a, b) => b.value - a.value); list.forEach((g, i) => { g.color ??= TOK[i % TOK.length]; g.items.sort((a, b) => b.value - a.value); });
  return { list, total: sum(list.map((g) => g.value)), key };
}
export const view = (key, inner) => `<div class="v-sp" data-k="${key}">${inner}</div>`;
export const chipsRow = () => `<span class="chips" style="--chip-on-bg:var(--ink);--chip-on-fg:var(--on-ink)">${SLICES.map(([k, l]) => `<label class="chip2" for="sp-${k}">${l}</label>`).join("")}</span>`;
export const shell = (title, sub, body, note) => card(`${cardHead(title, sub, chipsRow())}<div class="spx" style="--bh:520px">${body}</div><div class="card-note">${note}</div>`, { gap: 12, cls: "sbtw" });
export const gainTxt = (g, key) => (key === "source" ? "" : ` · <em class="${gainCls(g.value - g.cost)}">${spc(g.cost ? g.value / g.cost - 1 : 0, 0)}</em>`);

// tiles: a grid that fills its height whatever the number of groups
export const tiles = (d, { cols } = {}) => `<div class="tilegrid${d.list.length > 8 ? " tiny" : d.list.length > 4 ? " dense" : ""}" style="grid-template-columns:repeat(${cols ?? (d.list.length > 6 ? 2 : 1)},minmax(0,1fr))">${d.list.map((g, i) => `<div class="sl-row tg" data-i="${i}" style="--c:${`var(--card-${g.color})`}"><span class="n"><i style="background:${col(g.color)}"></i>${d.key === "holding" ? g.items[0].h.symbol : g.name}</span><b>${pc(g.value / d.total)}</b><span class="bar"><i style="width:${Math.min(100, (g.value / d.list[0].value) * 100)}%;background:${fillc(g.color)}"></i></span><small>${lakhS(g.value)}${gainTxt(g, d.key)}</small></div>`).join("")}</div>`;

// ---- V1 treemap ----
export function squarify(items, x, y, w, h) { // items: [{v}] sorted desc; returns [{...item, x, y, w, h}]
  const out = [], total = sum(items.map((i) => i.v)); let rest = [...items], rx = x, ry = y, rw = w, rh = h, rt = total;
  const worst = (row, side) => { const s = sum(row.map((i) => i.v)), a = (s / rt) * rw * rh; const t = a / side; return Math.max(...row.map((i) => { const ia = (i.v / rt) * rw * rh, l = ia / t; return Math.max(l / t, t / l); })); };
  while (rest.length) {
    const side = Math.min(rw, rh); let row = [rest[0]], k = 1;
    while (k < rest.length && worst([...row, rest[k]], side) <= worst(row, side)) row.push(rest[k++]);
    const s = sum(row.map((i) => i.v)), a = (s / rt) * rw * rh;
    if (rw >= rh) { const cw = a / rh; let cy = ry; row.forEach((i) => { const ih = ((i.v / s) * rh); out.push({ ...i, x: rx, y: cy, w: cw, h: ih }); cy += ih; }); rx += cw; rw -= cw; }
    else { const ch = a / rw; let cx = rx; row.forEach((i) => { const iw = ((i.v / s) * rw); out.push({ ...i, x: cx, y: ry, w: iw, h: ch }); cx += iw; }); ry += ch; rh -= ch; }
    rt -= s; rest = rest.slice(row.length);
  }
  return out;
}
const treemap = (d) => { const W = 100, Hh = 100, lay = squarify(d.list.map((g, i) => ({ g, i, v: g.value })), 0, 0, W, Hh);
  return `<div class="tm2">${lay.map(({ g, i, x, y, w, h }) => { const inner = squarify(g.items.map((it) => ({ it, v: it.value })), 0, 0, 100, 100); return `<div class="tm2g sl-row" data-i="${i}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%;--c:var(--card-${g.color})"><div class="tm2h"><b>${g.name}</b><span>${pc(g.value / d.total, g.value / d.total < 0.1 ? 1 : 0)}</span></div><div class="tm2i">${inner.map(({ it, x: ix, y: iy, w: iw, h: ih }) => `<div class="tm2t" title="${it.h.name} ${pc(it.value / d.total)}" style="left:${ix}%;top:${iy}%;width:${iw}%;height:${ih}%;background:color-mix(in oklch, var(--card-${g.color}) ${d.key === "holding" ? 100 : 100 - Math.min(40, inner.indexOf(inner.find((q) => q.it === it)) * 9)}%, white)"><span>${(iw * w) / 100 > 8 && (ih * h) / 100 > 9 ? it.h.symbol : ""}</span></div>`).join("")}</div></div>`; }).join("")}</div>`; };

// ---- V2 waffle + tiles ----
function waffle(d) { const raw = d.list.map((g) => (g.value / d.total) * 100), base = raw.map(Math.floor); let left = 100 - sum(base); raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).slice(0, left).forEach(([, i]) => base[i]++);
  const cells = []; base.forEach((n, i) => { for (let k = 0; k < n; k++) cells.push(i); });
  return `<div class="wf2">${cells.map((i, n) => `<i class="sl-arc" data-i="${i}" title="${d.list[i].name}" style="background:${fillc(d.list[i].color, 135)}"></i>`).join("")}</div>`; }

// ---- V3 columns ----
const columns = (d) => { const mx = d.list[0].value; return `<div class="cols2">${d.list.map((g, i) => `<div class="col2c sl-row" data-i="${i}"><div class="cv"><b>${pc(g.value / d.total)}</b></div><div class="cb" style="height:${Math.max(6, (g.value / mx) * 100)}%">${g.items.map((it) => `<span class="sl-arc" data-i="${i}" title="${it.h.name} ${lakhS(it.value)}" style="flex:${it.value};background:color-mix(in oklch, var(--card-${d.key === "holding" ? g.color : g.color}) ${100 - Math.min(45, g.items.indexOf(it) * 10)}%, white)"></span>`).join("")}</div><div class="cl"><i style="background:${col(g.color)}"></i>${g.name}<small>${lakhS(g.value)}</small></div></div>`).join("")}</div>`; };

// ---- V4 nested rings ----
const polar = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const arc = (cx, cy, r0, r1, a0, a1) => { const [x0, y0] = polar(cx, cy, r1, a0), [x1, y1] = polar(cx, cy, r1, a1), [x2, y2] = polar(cx, cy, r0, a1), [x3, y3] = polar(cx, cy, r0, a0), big = a1 - a0 > Math.PI ? 1 : 0; return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r1},${r1} 0 ${big} 1 ${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} A${r0},${r0} 0 ${big} 0 ${x3.toFixed(1)},${y3.toFixed(1)}Z`; };
function rings(d) { const S = 400, c = S / 2; let a = -Math.PI / 2, inner = "", outer = "";
  d.list.forEach((g, i) => { const a0 = a, a1 = a + (g.value / d.total) * Math.PI * 2; a = a1; inner += `<path class="sl-arc" data-i="${i}" d="${arc(c, c, 70, 112, a0 + 0.01, a1 - 0.01)}" fill="${col(g.color)}"><title>${g.name}</title></path>`; let b = a0; g.items.forEach((it, k) => { const b1 = b + (it.value / g.value) * (a1 - a0); outer += `<path class="sl-arc" data-i="${i}" d="${arc(c, c, 118, 176, b + 0.006, b1 - 0.006)}" fill="color-mix(in oklch, var(--card-${g.color}) ${100 - Math.min(45, k * 10)}%, white)"><title>${it.h.name} ${pc(it.value / d.total)}</title></path>`; b = b1; }); });
  return `<svg class="ring4" viewBox="0 0 ${S} ${S}" width="100%">${outer}${inner}<text x="${c}" y="${c - 2}" text-anchor="middle" style="font-size:26px;font-weight:800;fill:var(--fg)">${lakh(d.total)}</text><text x="${c}" y="${c + 20}" text-anchor="middle" style="font-size:12px;font-weight:700;fill:var(--muted)">${d.key === "source" ? "put in" : "worth today"}</text></svg>`; }

// ---- V5 rows that show what is inside ----
const rowsIn = (d) => `<div class="rowsin${d.list.length > 8 ? " tiny" : d.list.length > 4 ? " dense" : ""}">${d.list.map((g, i) => `<div class="sl-row ri" data-i="${i}"><div class="rih"><span class="n"><i style="background:${col(g.color)}"></i>${g.name}</span><b>${pc(g.value / d.total)}</b></div><span class="bar"><i style="width:${Math.min(100, (g.value / d.list[0].value) * 100)}%;background:${fillc(g.color)}"></i></span><div class="rif"><small>${lakhS(g.value)}${gainTxt(g, d.key)}${d.list.length > 4 && g.items.length > 1 && d.key !== "holding" ? ` · ${g.items.slice(0, 3).map((it) => `${it.h.symbol} ${pc(it.value / g.value, 0)}`).join(" · ")}` : ""}</small>${d.list.length <= 4 && g.items.length > 1 && d.key !== "holding" ? `<span class="chp">${g.items.slice(0, 7).map((it) => `<em>${it.h.symbol} ${pc(it.value / g.value, 0)}</em>`).join("")}${g.items.length > 7 ? `<em>+${g.items.length - 7}</em>` : ""}</span>` : ""}</div></div>`).join("")}</div>`;

export const KEYS = SLICES.map((s) => s[0]);
export const make = (title, sub, note, f) => shell(title, sub, KEYS.map((k) => view(k, f(data(k)))).join(""), note);
export const V = {
  now: () => X.splitExplorer(),
  v1: () => make("How it's split · Treemap", "area is worth · holdings sit inside their slice", "Hover a block. The tile names show where there's room.", (d) => `<div class="spx-in">${treemap(d)}</div>`),
  v2: () => make("How it's split · Waffle", "each square is 1% of the whole", "A hundred squares: count them. Hover a tile and its squares light up.", (d) => `<div class="spx-in two"><div class="wfw">${waffle(d)}</div>${tiles(d, { cols: d.list.length > 6 ? 2 : 1 })}</div>`),
  v3: () => make("How it's split · Columns", "height is worth · holdings stack inside", "Each column is one slice; the pieces inside are its holdings, biggest at the bottom.", (d) => `<div class="spx-in">${columns(d)}</div>`),
  v4: () => make("How it's split · Rings", "inner ring the slices, outer ring the holdings", "Hover a tile or a ring piece: the rest fades.", (d) => `<div class="spx-in two"><div class="rw4">${rings(d)}</div>${tiles(d, { cols: 1 })}</div>`),
  v5: () => make("How it's split · Rows", "each row shows what's inside it", "The chips are the holdings in that slice and their share of it.", (d) => `<div class="spx-in">${rowsIn(d)}</div>`),
};
export function splitBoard() {
  const lab = (t, n) => `<div class="frame-l" style="margin:0 0 -4px 4px">${t}${n ? ` · ${n}` : ""}</div>`;
  const pair = (a, b) => `<div class="g12" style="gap:20px"><div style="grid-column:span 6">${a}</div><div style="grid-column:span 6">${b}</div></div>`;
  const body = `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>How it's split: five fuller layouts</h2>${L.sampleTag()}</div><p>Today's donut and list (first) leaves white space when a slice has few rows, because the card is stretched to match its neighbour. Each layout here fills a fixed height <b>whatever the slice</b>: the six slice chips drive every card at once, so you can flip through them and compare. <b>Treemap</b>, <b>Waffle</b>, <b>Columns</b>, <b>Rings</b> and <b>Rows</b>.</p></div>${pair(V.now(), V.v1())}${pair(V.v2(), V.v3())}${pair(V.v4(), V.v5())}`;
  return `<div class="chai-app board" style="width:1600px;height:__H__">${C.radios("sp", KEYS, "asset")}${body}</div>`;
}
