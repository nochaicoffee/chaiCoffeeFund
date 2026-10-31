// Donuts and pies, six unusual takes (2026-11-04), on the same six slicings as "How it's split". Pure HTML, SVG and CSS: radios, :has(), transitions,
// animations, clip-path and 3D transforms. Sample data, made up.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import { data, KEYS, view, chipsRow, tiles } from "./splitvariants.mjs";
const { I, plural } = L;
const { sum, pc, spc, lakh, HOLDINGS, VALUE } = D;
const { card, cardHead, col, fillc, lakhS, gainCls } = P;
const BH = 520, DEG = Math.PI / 180;
const polar = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const arcPath = (cx, cy, r0, r1, a0, a1, sep = " ") => { const [x0, y0] = polar(cx, cy, r1, a0), [x1, y1] = polar(cx, cy, r1, a1), [x2, y2] = polar(cx, cy, r0, a1), [x3, y3] = polar(cx, cy, r0, a0), big = a1 - a0 > Math.PI ? 1 : 0; return `M${x0.toFixed(1)}${sep}${y0.toFixed(1)} A${r1} ${r1} 0 ${big} 1 ${x1.toFixed(1)}${sep}${y1.toFixed(1)} L${x2.toFixed(1)}${sep}${y2.toFixed(1)} A${r0} ${r0} 0 ${big} 0 ${x3.toFixed(1)}${sep}${y3.toFixed(1)}Z`; };
const NAMES = { asset: "Asset class", market: "Market", kind: "Company or fund", sector: "Sector", holding: "Holding", source: "How it came in" };
const shell = (title, sub, head, body, note) => card(`${cardHead(title, sub, head)}<div class="spx" style="--bh:${BH}px">${body}</div><div class="card-note">${note}</div>`, { gap: 12, cls: "sbtw" });
const mix = (c, k) => `color-mix(in oklch, var(--card-${c}) ${100 - Math.min(46, k * 10)}%, white)`;
const IDX = Array.from({ length: 10 }, (_, i) => i);
/** each group's start, width and middle, in degrees clockwise from the top */
const spans = (d) => { let a = 0; return d.list.map((g) => { const w = (g.value / d.total) * 360, s = a; a += w; return { s, w, m: s + w / 2 }; }); };
/** The chips that pick a slice of the current slicing: they are labels for the `ps` radios. */
const pickChips = (d) => `<div class="pkrow">${d.list.map((g, i) => `<label class="pk" for="ps-${i}"><i style="background:${col(g.color)}"></i>${g.name}<em>${pc(g.value / d.total, 0)}</em></label>`).join("")}</div>`;
const psViews = (d, f) => IDX.map((i) => `<div class="v-ps" data-k="${i}">${i < d.list.length ? f(d.list[i], i) : `<div class="sub2" style="margin:0">Pick a slice</div>`}</div>`).join("");
const holdingsOf = (g, d) => `<div class="hl2">${g.items.map((it, j) => `<div class="hlr"><span class="sy">${it.h.symbol}</span><span class="hb"><i style="width:${(it.value / g.items[0].value) * 100}%;background:${fillc(g.color)};animation-delay:${j * 50}ms"></i></span><b>${pc(it.value / g.value, 0)}</b><small>${lakhS(it.value)}</small></div>`).join("")}</div>`;

// ---------- 1. Morph: ten arcs that glide into each slicing ----------
const MORPH = ["asset", "market", "kind", "sector", "holding"];
export function morph() {
  const S = 440, c = S / 2, R = 160, SW = 54, CIRC = 2 * Math.PI * R, G = 36;
  const lay = Object.fromEntries(MORPH.map((k) => { const d = data(k); let cur = 0; const o = {}; d.list.forEach((g) => { g.items.forEach((it, j) => { const len = (it.value / VALUE) * (360 - G); o[it.h.symbol] = { start: cur, len, color: mix(g.color, j) }; cur += len; }); cur += G / d.list.length; }); return [k, o]; }));
  const arcs = [...HOLDINGS].map((h) => { const vars = MORPH.map((k) => `--a-${k}:${(lay[k][h.symbol].start - 90).toFixed(2)}deg;--c-${k}:${lay[k][h.symbol].color}`).join(";"), dash = (lay.asset[h.symbol].len / 360) * CIRC - 1.4; return `<circle class="arc" cx="${c}" cy="${c}" r="${R}" fill="none" stroke-width="${SW}" stroke-dasharray="${dash.toFixed(2)} ${CIRC.toFixed(1)}" style="${vars};transform-origin:${c}px ${c}px"><title>${h.name} ${pc(h.value / VALUE)}</title></circle>`; }).join("");
  const svg = `<svg class="morph" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">${arcs}<text x="${c}" y="${c - 4}" text-anchor="middle" style="font-size:28px;font-weight:800;fill:var(--fg)">${lakh(VALUE)}</text><text x="${c}" y="${c + 18}" text-anchor="middle" style="font-size:12px;font-weight:700;fill:var(--muted)">ten holdings</text></svg>`;
  const legend = KEYS.map((k) => view(k, `<div class="mphh">${k === "source" ? "Asset class (this slicing has no morph)" : NAMES[k]}</div>${tiles(data(k === "source" ? "asset" : k), { cols: 1 })}`)).join("");
  return shell("Donut · Morph", "the same ten arcs slide into each slicing", chipsRow(), `<div class="spx-in"><div class="mphw">${svg}</div><div class="mphl">${legend}</div></div>`, "Nothing is redrawn: each holding's arc slides and recolours into its place in the slicing you pick.");
}

// ---------- 2. Spin wheel ----------
export function spinBody() {
  const S = 420, c = S / 2;
  return KEYS.map((k) => { const d = data(k), sp = spans(d); let outer = "", inner = "";
    d.list.forEach((g, i) => { const a0 = (sp[i].s - 90) * DEG, a1 = (sp[i].s + sp[i].w - 90) * DEG; inner += `<path class="wa" data-i="${i}" d="${arcPath(c, c, 96, 168, a0 + 0.008, a1 - 0.008)}" fill="${col(g.color)}"><title>${g.name}</title></path>`; let b = a0; g.items.forEach((it, j) => { const b1 = b + (it.value / g.value) * (a1 - a0); outer += `<path class="wa" data-i="${i}" d="${arcPath(c, c, 174, 196, b + 0.004, b1 - 0.004)}" fill="${mix(g.color, j)}"><title>${it.h.name} ${pc(it.value / d.total)}</title></path>`; b = b1; }); });
    const vars = d.list.map((g, i) => `--rot-${k}-${i}:${(-sp[i].m).toFixed(1)}deg`).join(";");
    const wheel = `<svg class="wheelsvg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><g class="wheel" style="${vars};transform-origin:${c}px ${c}px">${outer}${inner}</g><path d="M${c - 12} 2 L${c + 12} 2 L${c} 26Z" fill="var(--ink)"/><circle cx="${c}" cy="${c}" r="92" fill="var(--surface)"/></svg>`;
    const centre = psViews(d, (g) => `<div class="wc"><b>${pc(g.value / d.total, 0)}</b><span>${g.name}</span></div>`);
    const side = `${pickChips(d)}${psViews(d, (g) => `<div class="phd"><span class="n"><i style="background:${col(g.color)}"></i><b>${g.name}</b></span><small>${lakhS(g.value)} · ${spc(g.cost ? g.value / g.cost - 1 : 0, 0)}</small></div>${holdingsOf(g, d)}`)}`;
    return view(k, `<div class="spx-in"><div class="wheelbox">${wheel}<div class="wcentre">${centre}</div></div><div class="wside">${side}</div></div>`); }).join("");
}
export function spin() { const body = spinBody(); return shell("Pie · Spin wheel", "pick a slice and the wheel turns to it", chipsRow(), body, "The pointer reads the slice at the top. Pick one from the list: the wheel spins, and its holdings show beside it."); }

// ---------- 3. Exploding pie that reveals its holdings ----------
export function explode() {
  const S = 460, c = S / 2;
  const body = KEYS.map((k) => { const d = data(k), sp = spans(d); let inner = "", outer = "";
    d.list.forEach((g, i) => { const a0 = (sp[i].s - 90) * DEG, a1 = (sp[i].s + sp[i].w - 90) * DEG, mid = (sp[i].m - 90) * DEG, dx = Math.cos(mid) * 20, dy = Math.sin(mid) * 20;
      inner += `<label class="xs" for="ps-${i}" data-i="${i}" title="${g.name} ${pc(g.value / d.total)}" style="--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;clip-path:path('${arcPath(c, c, 74, 176, a0 + 0.006, a1 - 0.006)}');background:${fillc(g.color, 135)}"></label>`;
      let b = a0; outer += `<div class="xr" data-i="${i}">${g.items.map((it, j) => { const b1 = b + (it.value / g.value) * (a1 - a0), p = arcPath(c, c, 186, 222, b + 0.005, b1 - 0.005), [lx, ly] = polar(c, c, 204, (b + b1) / 2); const wide = (it.value / g.value) * (a1 - a0) * 204 > 34; const el = `<div class="xrp" title="${it.h.name} ${pc(it.value / d.total)}" style="clip-path:path('${p}');background:${mix(g.color, j)}"></div>${wide ? `<span class="xrl" style="left:${lx.toFixed(1)}px;top:${ly.toFixed(1)}px">${it.h.symbol.slice(0, 5)}</span>` : ""}`; b = b1; return el; }).join("")}</div>`; });
    const centre = psViews(d, (g) => `<div class="xc"><b>${pc(g.value / d.total, 0)}</b><span>${g.name}</span><small>${lakhS(g.value)} · ${plural(g.items.length, "holding")}</small></div>`);
    return view(k, `<div class="xwrap"><div class="xbox">${outer}${inner}${centre}</div>${pickChips(d)}</div>`); }).join("");
  return shell("Pie · Explode", "pull a slice out and its holdings unfold around it", chipsRow(), body, "Tap a slice (or its chip): it pulls out and a ring of its holdings opens around the pie.");
}

// ---------- 4. Gauge with a needle ----------
export function gauge() {
  const W = 640, Hh = 330, cx = W / 2, cy = 290;
  const body = KEYS.map((k) => { const d = data(k); let f = 0, arcs = "", ticks = ""; const mids = [];
    d.list.forEach((g, i) => { const f0 = f, f1 = f + g.value / d.total; f = f1; mids.push((f0 + f1) / 2); arcs += `<path class="ga" data-i="${i}" d="${arcPath(cx, cy, 190, 262, Math.PI + f0 * Math.PI + 0.006, Math.PI + f1 * Math.PI - 0.006)}" fill="${col(g.color)}"><title>${g.name}</title></path>`; });
    [0, 25, 50, 75, 100].forEach((t) => { const a = Math.PI + (t / 100) * Math.PI, [x, y] = polar(cx, cy, 276, a); ticks += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" style="font-size:11px;font-weight:700;fill:var(--muted)">${t}%</text>`; });
    const vars = d.list.map((g, i) => `--n-${i}:${((mids[i] - 0.5) * 180).toFixed(1)}deg`).join(";");
    const svg = `<svg class="gsvg" viewBox="0 0 ${W} ${Hh}" width="100%">${arcs}${ticks}<g class="needle" style="${vars};transform-origin:${cx}px ${cy}px"><path d="M${cx - 7} ${cy} L${cx} ${cy - 244} L${cx + 7} ${cy}Z" fill="var(--ink)"/></g><circle cx="${cx}" cy="${cy}" r="20" fill="var(--ink)"/><circle cx="${cx}" cy="${cy}" r="8" fill="var(--surface)"/></svg>`;
    const read = psViews(d, (g) => `<div class="gread"><div><div class="hk">${NAMES[k]}</div><div class="bigv" style="font-size:44px">${pc(g.value / d.total, 1)}</div></div><div class="gr2b"><b>${g.name}</b><span>${lakhS(g.value)} · ${plural(g.items.length, "holding")}</span><span class="${gainCls(g.value - g.cost)}">${k === "source" ? "" : `${spc(g.cost ? g.value / g.cost - 1 : 0, 0)} on cost`}</span></div></div>`);
    return view(k, `<div class="gwrap">${svg}${read}${pickChips(d)}</div>`); }).join("");
  return shell("Donut · Gauge", "a half donut and a needle that swings", chipsRow(), body, "Pick a slice and the needle swings to it, with its share read out below.");
}

// ---------- 5. A tilted stack of donuts ----------
export function stack() {
  const Z = 40, order = ["holding", "source", "sector", "kind", "market", "asset"]; // bottom to top
  const disc = (k, i) => { const d = data(k), sp = spans(d), S = 340, c = S / 2; const arcs = d.list.map((g, j) => `<path d="${arcPath(c, c, 78, 160, (sp[j].s - 90) * DEG + 0.01, (sp[j].s + sp[j].w - 90) * DEG - 0.01)}" fill="${col(g.color)}" fill-opacity=".9"/>`).join(""); return `<label class="disc" for="sp-${k}" style="--z:${i * Z}"><svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}"><circle cx="${c}" cy="${c}" r="168" fill="var(--surface)" fill-opacity=".55" stroke="var(--surface-line)"/>${arcs}</svg><span class="dtag">${NAMES[k]}</span></label>`; };
  const discs = order.map((k, i) => disc(k, i)).join("");
  const legend = KEYS.map((k) => view(k, `<div class="mphh">${NAMES[k]}</div>${tiles(data(k), { cols: 1 })}`)).join("");
  return shell("Donut · 3D stack", "six donuts, one for each slicing: tap one", chipsRow(), `<div class="spx-in"><div class="stage3d"><div class="stk3d">${discs}</div></div><div class="mphl">${legend}</div></div>`, "Hover a layer to lift it; tap it to make it the slicing. The list on the right reads it out.");
}

// ---------- 6. A rose (polar area) ----------
export function rose() {
  const W = 700, Hh = BH, cx = W / 2 - 20, cy = Hh / 2, Rmax = 206;
  const body = KEYS.map((k) => { const d = data(k), n = d.list.length, w = (Math.PI * 2) / n, mx = d.list[0].value; let petals = "", labels = "";
    d.list.forEach((g, i) => { const a0 = -Math.PI / 2 + i * w + 0.02, a1 = -Math.PI / 2 + (i + 1) * w - 0.02, r = 46 + Math.sqrt(g.value / mx) * (Rmax - 46), [lx, ly] = polar(cx, cy, r + 14, (a0 + a1) / 2);
      petals += `<path class="pt" data-i="${i}" d="${arcPath(cx, cy, 36, r, a0, a1)}" fill="${col(g.color)}" fill-opacity=".92" stroke="var(--surface)" stroke-width="1.5" style="animation-delay:${i * 70}ms;transform-origin:${cx}px ${cy}px"><title>${g.name} ${pc(g.value / d.total)} · ${lakhS(g.value)}</title></path>`;
      labels += `<text class="rl" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${Math.cos((a0 + a1) / 2) > 0.2 ? "start" : Math.cos((a0 + a1) / 2) < -0.2 ? "end" : "middle"}">${g.name} ${pc(g.value / d.total, 0)}</text>`; });
    const grid = [0.25, 0.5, 1].map((q) => `<circle cx="${cx}" cy="${cy}" r="${(46 + Math.sqrt(q) * (Rmax - 46)).toFixed(1)}" fill="none" stroke="var(--divider)" stroke-dasharray="3 5"/>`).join("");
    return view(k, `<svg class="rosesvg" viewBox="0 0 ${W} ${Hh}" width="100%">${grid}${petals}<circle cx="${cx}" cy="${cy}" r="36" fill="var(--surface)"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" style="font-size:14px;font-weight:800;fill:var(--fg)">${lakh(d.total)}</text>${labels}</svg>`); }).join("");
  return shell("Pie · Rose", "every slice the same width; its petal reaches as far as its worth", chipsRow(), `<div class="spx-in">${body}</div>`, "A rose chart: the petal's area is the slice's worth, so a small slice stays visible. Hover a petal.");
}

export function donutsBoard() {
  const pair = (a, b) => `<div class="g12" style="gap:20px"><div style="grid-column:span 6">${a}</div><div style="grid-column:span 6">${b}</div></div>`;
  const body = `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>Donuts and pies: six unusual takes</h2>${L.sampleTag()}</div><p>The same six slicings (asset class, market, company or fund, sector, holding, how it came in) as <b>Morph</b> (ten arcs that glide into each slicing), <b>Spin wheel</b>, <b>Explode</b> (a pie that unfolds its holdings), <b>Gauge</b>, a tilted <b>3D stack</b> and a <b>Rose</b>. The slice chips drive every card at once; Spin, Explode and Gauge also have their own slice picker, and the 3D stack is itself a slicing picker.</p></div>${pair(morph(), spin())}${pair(explode(), gauge())}${pair(stack(), rose())}`;
  return `<div class="chai-app board" style="width:1600px;height:__H__">${C.radios("sp", KEYS, "sector")}${C.radios("ps", IDX.map(String), "0")}${body}</div>`;
}
