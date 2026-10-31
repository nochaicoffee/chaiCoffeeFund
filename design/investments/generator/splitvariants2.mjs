// "How it's split", five cooler and more interactive layouts (2026-11-02): a sunburst you zoom into, packed bubbles, a flow from one slicing to another,
// an accordion pillar, and orbits. Every one fills a fixed height whatever the slice. Sample data, made up.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import { data, SLICES, KEYS, shell, view, chipsRow, TOK, SECTOR, V as V1 } from "./splitvariants.mjs";
const { I, plural } = L;
const { sum, pc, spc, lakh, HOLDINGS, VALUE } = D;
const { card, cardHead, col, fillc, symTile, lakhS, gainCls } = P;
const BH = 520;
const polar = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const arcPath = (cx, cy, r0, r1, a0, a1) => { const [x0, y0] = polar(cx, cy, r1, a0), [x1, y1] = polar(cx, cy, r1, a1), [x2, y2] = polar(cx, cy, r0, a1), [x3, y3] = polar(cx, cy, r0, a0), big = a1 - a0 > Math.PI ? 1 : 0; return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r1} ${r1} 0 ${big} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} A${r0} ${r0} 0 ${big} 0 ${x3.toFixed(1)} ${y3.toFixed(1)}Z`; };
const sbShell = (title, sub, head, body, note) => card(`${cardHead(title, sub, head)}<div class="spx" style="--bh:${BH}px">${body}</div><div class="card-note">${note}</div>`, { gap: 12, cls: "sbtw" });

// ---------- W1 Sunburst you zoom into ----------
const assetOf = (h) => (h.assetType === "Debt-Fund" ? "Debt" : h.assetType === "Gold" ? "Gold" : "Equity");
const TREE = (() => {
  const mk = (key, name, color, items, kids) => ({ key, name, color, items, value: sum(items.map((h) => h.value)), cost: sum(items.map((h) => h.costInr)), kids });
  const leaf = (h) => ({ key: null, name: h.name, color: h.color, items: [h], value: h.value, cost: h.costInr, kids: [], h });
  const eq = HOLDINGS.filter((h) => assetOf(h) === "Equity"), eqIn = eq.filter((h) => h.market === "IND"), eqUs = eq.filter((h) => h.market === "US");
  const debt = HOLDINGS.filter((h) => assetOf(h) === "Debt"), gold = HOLDINGS.filter((h) => assetOf(h) === "Gold");
  const nEqIn = mk("eq-in", "India equity", "teal", eqIn, eqIn.map(leaf)), nEqUs = mk("eq-us", "US equity", "sapphire", eqUs, eqUs.map(leaf));
  const nEq = mk("eq", "Equity", "indigo", eq, [nEqUs, nEqIn]), nDebt = mk("debt", "Debt", "forest", debt, debt.map(leaf)), nGold = mk("gold", "Gold", "gold", gold, gold.map(leaf));
  const root = mk("root", "Everything", "onyx", HOLDINGS, [nEq, nDebt, nGold]);
  root.parent = null; nEq.parent = root; nDebt.parent = root; nGold.parent = root; nEqIn.parent = nEq; nEqUs.parent = nEq;
  return { root, all: [root, nEq, nDebt, nGold, nEqIn, nEqUs] };
})();
function zoomView(node, total) {
  const S = 480, c = S / 2, kids = node.kids.length ? node.kids : [node];
  let a = -Math.PI / 2, ring1 = "", ring2 = "";
  kids.forEach((k, i) => { const a0 = a, a1 = a + (k.value / node.value) * Math.PI * 2; a = a1; const clickable = k.kids.length > 0 && k.key, p1 = arcPath(c, c, 92, 150, a0 + 0.008, a1 - 0.008);
    const el = clickable ? "label" : "div", attr = clickable ? ` for="zm-${k.key}"` : "";
    ring1 += `<${el}${attr} class="zarc${clickable ? " go" : ""} dm" data-i="${i}" title="${k.name} ${pc(k.value / total)}${clickable ? " · click to zoom" : ""}" style="clip-path:path('${p1}');background:${fillc(k.color, 135)}"></${el}>`;
    let b = a0; k.kids.forEach((g, j) => { const b1 = b + (g.value / k.value) * (a1 - a0); ring2 += `<div class="zarc dm" data-i="${i}" title="${g.name} ${pc(g.value / total)}" style="clip-path:path('${arcPath(c, c, 156, 214, b + 0.005, b1 - 0.005)}');background:color-mix(in oklch, var(--card-${k.color}) ${100 - Math.min(48, j * 11)}%, white)"></div>`; b = b1; }); });
  const labels = kids.map((k, i) => { const m = (-Math.PI / 2 + kids.slice(0, i).reduce((s2, q) => s2 + q.value / node.value, 0) * Math.PI * 2) + (k.value / node.value) * Math.PI; const [lx, ly] = polar(c, c, 121, m); return k.value / node.value > 0.07 ? `<span class="zl" style="left:${lx}px;top:${ly}px">${pc(k.value / total, 0)}</span>` : ""; }).join("");
  const back = node.parent ? `<label class="zback" for="zm-${node.parent.key}">${I.chevL(12)} ${node.parent.name}</label>` : `<span class="zback off">Click a ring piece to zoom in</span>`;
  const centre = `<div class="zc"><div class="k">${node.parent ? node.name : "Everything"}</div><b>${lakh(node.value)}</b><small>${node.parent ? `${pc(node.value / total)} of the whole · ` : ""}${spc(node.cost ? node.value / node.cost - 1 : 0, 0)} on cost</small></div>`;
  const rows = kids.map((k, i) => `<div class="sl-row tg dm" data-i="${i}" style="--c:var(--card-${k.color})"><span class="n"><i style="background:${col(k.color)}"></i>${k.name}</span><b>${pc(k.value / node.value, 0)}</b><span class="bar"><i style="width:${(k.value / kids[0].value) * 100}%;background:${fillc(k.color)}"></i></span><small>${lakhS(k.value)} · <em class="${gainCls(k.value - k.cost)}">${spc(k.cost ? k.value / k.cost - 1 : 0, 0)}</em>${k.kids.length ? ` · ${plural(k.kids.length, "piece")}` : ""}</small></div>`).join("");
  return view2("zm", node.key, `<div class="spx-in"><div class="zbox">${ring2}${ring1}${labels}${centre}</div><div class="zside">${back}<div class="tilegrid${kids.length > 5 ? " dense" : ""}" style="grid-template-columns:1fr">${rows}</div></div></div>`);
}
const view2 = (name, key, inner) => `<div class="v-${name}" data-k="${key}">${inner}</div>`;
const sunburst = () => sbShell("How it's split · Sunburst", "click a piece to zoom into it", `<span class="chips" style="--chip-on-bg:var(--ink);--chip-on-fg:var(--on-ink)"><label class="chip2" for="zm-root">Reset</label></span>`, TREE.all.map((n) => zoomView(n, VALUE)).join(""), "Everything, then asset class, then market, then holdings: click a ring piece to go in, the back link to come out.");

// ---------- W2 Bubbles, packed ----------
function pack(rs) { const placed = []; rs.forEach((r, i) => { if (i === 0) { placed.push([0, 0, r]); return; } let best = null; for (let rad = 0; rad < 3000 && !best; rad += 2) for (let a = 0; a < 360; a += 5) { const x = Math.cos((a * Math.PI) / 180) * rad, y = Math.sin((a * Math.PI) / 180) * rad; if (placed.every(([px, py, pr]) => Math.hypot(px - x, py - y) >= pr + r + 3)) { best = [x, y, r]; break; } } placed.push(best); });
  const minx = Math.min(...placed.map((p) => p[0] - p[2])), maxx = Math.max(...placed.map((p) => p[0] + p[2])), miny = Math.min(...placed.map((p) => p[1] - p[2])), maxy = Math.max(...placed.map((p) => p[1] + p[2])); return { pos: placed.map((p) => [p[0] - (minx + maxx) / 2, p[1] - (miny + maxy) / 2, p[2]]), w: maxx - minx, h: maxy - miny }; }
function bubbles(d) {
  const groups = d.list.map((g) => { const ir = g.items.map((it) => Math.sqrt(it.value / d.total) * 100), s = 1; const inner = pack(ir.map((r) => r * s)); const R = Math.max(...inner.pos.map((p) => Math.hypot(p[0], p[1]) + p[2])) + 5; return { g, inner, R }; });
  const outer = pack(groups.map((x) => x.R)), W = 698, Hh = BH, sc = Math.min((W * 0.97) / outer.w, (Hh * 0.97) / outer.h);
  const els = groups.map((x, gi) => { const [ox, oy] = outer.pos[gi], gx = W / 2 + ox * sc, gy = Hh / 2 + oy * sc, r = x.R * sc;
    const items = x.g.items.map((it, k) => { const [ix, iy, ir] = x.inner.pos[k]; const rr = ir * sc; return `<div class="bub" title="${it.h.name} · ${lakhS(it.value)}" style="left:${gx + ix * sc - rr}px;top:${gy + iy * sc - rr}px;width:${rr * 2}px;height:${rr * 2}px;background:color-mix(in oklch, var(--card-${x.g.color}) ${100 - Math.min(42, k * 9)}%, white)">${rr > 17 ? `<span>${it.h.symbol.slice(0, 6)}</span>` : ""}</div>`; }).join("");
    return `<div class="bubg sl-row dm" data-i="${gi}" title="${x.g.name} ${pc(x.g.value / d.total)}" style="left:${gx - r}px;top:${gy - r}px;width:${r * 2}px;height:${r * 2}px;--c:var(--card-${x.g.color})"><span class="bubn${r > 70 ? " in" : ""}${d.list.length > 6 && r <= 70 ? " off" : ""}" style="${r > 70 ? "top:6px" : `top:${r * 2 + 3}px`}">${x.g.name} ${pc(x.g.value / d.total, 0)}</span></div>${items}`; }).join("");
  return `<div class="bubs">${els}</div>`;
}
const bubbleCard = () => sbShell("How it's split · Bubbles", "bubbles packed inside their slice", chipsRow(), KEYS.map((k) => view(k, `<div class="spx-in">${bubbles(data(k))}</div>`)).join(""), "A bubble's area is its worth; the ring around a cluster is its slice. Hover one to fade the rest.");

// ---------- W3 A flow from one slicing to another ----------
const FLOW_KEYS = ["asset", "market", "kind", "sector"], fnOf = (k) => SLICES.find((s) => s[0] === k)[2];
function flowSvg(from, to) {
  const W = 698, Hh = BH, xl = 150, xr = W - 190, nw = 16, top = 8, a = data(from), b = data(to), gapA = 14, gapB = 14, nA = a.list.length, nB = b.list.length;
  const k = (Hh - top - 8 - Math.max(gapA * (nA - 1), gapB * (nB - 1))) / a.total;
  let ya = top + (Hh - top - 8 - (a.total * k + gapA * (nA - 1))) / 2; const A = a.list.map((g) => { const n = { g, y: ya, h: g.value * k, off: 0 }; ya += n.h + gapA; return n; });
  let yb = top + (Hh - top - 8 - (b.total * k + gapB * (nB - 1))) / 2; const B = b.list.map((g) => { const n = { g, y: yb, h: g.value * k, off: 0 }; yb += n.h + gapB; return n; });
  const fa = fnOf(from), fb = fnOf(to), bands = [];
  A.forEach((na) => B.forEach((nb) => { const v = sum(HOLDINGS.filter((h) => fa(h) === na.g.name && fb(h) === nb.g.name).map((h) => h.value)); if (v > 0) bands.push({ na, nb, v }); }));
  const rib = (x0, y0, x1, y1, h) => { const m = (x0 + x1) / 2; return `M${x0},${y0} C${m},${y0} ${m},${y1} ${x1},${y1} L${x1},${y1 + h} C${m},${y1 + h} ${m},${y0 + h} ${x0},${y0 + h}Z`; };
  const flows = bands.sort((p, q) => A.indexOf(p.na) - A.indexOf(q.na) || B.indexOf(p.nb) - B.indexOf(q.nb)).map((bd) => { const h = bd.v * k, p = rib(xl + nw, bd.na.y + bd.na.off, xr, bd.nb.y + bd.nb.off, h); bd.na.off += h; bd.nb.off += h; return `<path class="sk-f" d="${p}" fill="${col(bd.na.g.color)}" opacity=".5"><title>${bd.na.g.name} → ${bd.nb.g.name}: ${lakhS(bd.v)}</title></path>`; }).join("");
  const nodes = A.map((n) => `<rect x="${xl}" y="${n.y}" width="${nw}" height="${Math.max(2, n.h)}" rx="5" fill="${col(n.g.color)}"/><text x="${xl - 10}" y="${n.y + n.h / 2 + 4}" text-anchor="end" class="hl" style="font-weight:800">${n.g.name}</text><text x="${xl - 10}" y="${n.y + n.h / 2 + 18}" text-anchor="end" class="sm hl">${pc(n.g.value / a.total, 0)}</text>`).join("") + B.map((n) => `<rect x="${xr}" y="${n.y}" width="${nw}" height="${Math.max(2, n.h)}" rx="5" fill="${col(n.g.color)}"/><text x="${xr + nw + 10}" y="${n.y + n.h / 2 + 4}" class="hl" style="font-weight:800">${n.g.name}</text><text x="${xr + nw + 10}" y="${n.y + n.h / 2 + 18}" class="sm hl">${pc(n.g.value / b.total, 0)}</text>`).join("");
  return `<svg class="sk-svg" viewBox="0 0 ${W} ${Hh}" width="100%">${flows}${nodes}</svg>`;
}
const flowCard = () => { const lab = (n, k, l) => `<label class="chip2" for="${n}-${k}" style="padding:6px 11px;font-size:12px">${l}</label>`; const names = { asset: "Asset class", market: "Market", kind: "Company or fund", sector: "Sector" };
  const body = FLOW_KEYS.map((f) => view2("fr", f, FLOW_KEYS.map((t) => view2("to", t, t === f ? `<div class="emptyplot" style="height:480px;border-color:var(--divider);color:var(--muted)"><span>Pick two different slicings</span></div>` : flowSvg(f, t))).join(""))).join("");
  return sbShell("How it's split · Flow", "how one slicing spreads into another", `<span class="row" style="gap:8px;flex-wrap:wrap"><span class="sub2" style="margin:0">From</span><span class="chips" style="--chip-on-bg:var(--ink);--chip-on-fg:var(--on-ink)">${FLOW_KEYS.map((k) => lab("fr", k, names[k])).join("")}</span></span>`, `<div class="flowsel"><span class="sub2" style="margin:0">To</span><span class="chips" style="--chip-on-bg:var(--ink);--chip-on-fg:var(--on-ink)">${FLOW_KEYS.map((k) => lab("to", k, names[k])).join("")}</span></div>${body}`, "For instance market into asset class shows how much of each is held in rupees or dollars. Hover a flow to follow it."); };

// ---------- W4 An accordion pillar ----------
const pillar = () => sbShell("How it's split · Pillar", "tap a layer to open it", chipsRow(), KEYS.map((k) => { const d = data(k), n = d.list.length;
  const pil = `<div class="pil">${d.list.map((g, i) => `<label class="pill2 dm" for="pl-${i}" style="flex:${Math.max(g.value, d.total * 0.06)};background:${fillc(g.color, 90)}"><b>${g.name}</b><span>${pc(g.value / d.total, 0)}</span></label>`).join("")}</div>`;
  const panels = d.list.map((g, i) => view2("pl", String(i), `<div class="plh"><span class="n"><i style="background:${col(g.color)}"></i><b>${g.name}</b></span><span class="sub2" style="margin:0">${lakhS(g.value)} · ${pc(g.value / d.total)} of the whole${k === "source" ? "" : ` · ${spc(g.cost ? g.value / g.cost - 1 : 0, 0)}`}</span></div><div class="plr">${g.items.map((it, j) => `<div class="plrow">${symTile(it.h, 30)}<div class="nm2"><b>${it.h.symbol}</b><small>${it.h.name}</small></div><div class="plbar"><i style="width:${(it.value / g.items[0].value) * 100}%;background:${fillc(g.color)};animation-delay:${j * 60}ms"></i></div><div class="r"><b class="num">${pc(it.value / g.value, 0)}</b><small>${lakhS(it.value)}</small></div></div>`).join("")}</div>`)).join("");
  return view(k, `<div class="spx-in">${pil}<div class="plpanel">${panels}${n === 0 ? "" : ""}</div></div>`); }).join(""), "Each layer's height is its share. Tap one and what's inside it opens, with the bars growing in.");

// ---------- W5 Orbits ----------
function orbits(d) {
  const W = 698, Hh = BH, cx = W / 2, cy = Hh / 2, n = d.list.length, maxOrb = Math.min(cx, cy) - 36;
  const rings = d.list.map((g, i) => 128 + (i * (maxOrb - 128)) / Math.max(1, n - 1 || 1));
  const maxV = d.list[0].value, parts = d.list.map((g, i) => {
    const R = n === 1 ? 0 : rings[i], pr = 13 + Math.sqrt(g.value / maxV) * 32, dur = 40 + i * 12, ph = (i * 137) % 360, px = cx + R, py = cy;
    const moons = g.items.length > 1 ? g.items.slice(0, 6).map((it, j) => { const mr = Math.max(3.5, Math.sqrt(it.value / g.value) * pr * 0.42), md = pr + 9 + j * 5, mdur = 7 + j * 2.5; return `<g class="spin" style="animation-duration:${mdur}s;transform-origin:${px}px ${py}px"><circle cx="${px + md}" cy="${py}" r="${mr}" fill="color-mix(in oklch, var(--card-${g.color}) 65%, white)"><title>${it.h.name} ${lakhS(it.value)}</title></circle></g>`; }).join("") : "";
    const track = R ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--divider)" stroke-width="1.2" stroke-dasharray="2 6"/>` : "";
    return `${track}<g class="spin orbit plt dm" data-i="${i}" style="animation-duration:${dur}s;animation-delay:-${(ph / 360) * dur}s;transform-origin:${cx}px ${cy}px"><circle cx="${px}" cy="${py}" r="${pr}" fill="${col(g.color)}" opacity=".92"><title>${g.name} ${pc(g.value / d.total)}</title></circle>${moons}<g transform="translate(${px} ${py})"><g class="spin rev" style="animation-duration:${dur}s;animation-delay:-${(ph / 360) * dur}s;transform-box:fill-box;transform-origin:center"><text y="${pr + 15}" text-anchor="middle" class="orl">${g.name} ${pc(g.value / d.total, 0)}</text></g></g></g>`; }).join("");
  const sun = `<circle cx="${cx}" cy="${cy}" r="62" fill="var(--fill)"/><text x="${cx}" y="${cy - 2}" text-anchor="middle" style="font-size:20px;font-weight:800;fill:var(--fg)">${lakh(d.total)}</text><text x="${cx}" y="${cy + 17}" text-anchor="middle" style="font-size:11px;font-weight:700;fill:var(--muted)">${d.key === "source" ? "put in" : "worth today"}</text>`;
  return `<svg class="orbs" viewBox="0 0 ${W} ${Hh}" width="100%">${parts}${sun}</svg>`;
}
const orbitCard = () => sbShell("How it's split · Orbits", "each slice orbits; its holdings circle it", chipsRow(), KEYS.map((k) => view(k, `<div class="spx-in">${orbits(data(k))}</div>`)).join(""), "Bigger planet, bigger slice. Hover and the orbits pause so you can read them.");

export const V2 = { sunburst, bubbles: bubbleCard, flow: flowCard, pillar, orbits: orbitCard };
export function split2Board() {
  const pair = (a, b) => `<div class="g12" style="gap:20px"><div style="grid-column:span 6">${a}</div><div style="grid-column:span 6">${b}</div></div>`;
  const body = `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>How it's split: five cooler, more interactive layouts</h2>${L.sampleTag()}</div><p>A <b>Sunburst</b> you zoom into (click a ring piece, use the back link), packed <b>Bubbles</b>, a <b>Flow</b> from one slicing into another (market into asset class, say), an accordion <b>Pillar</b> and animated <b>Orbits</b>. Each fills the same fixed height whatever the slice. The slice chips drive Bubbles, Pillar, Orbits and the Treemap together; the Sunburst, Flow and Pillar's layers have their own controls. The Treemap from the last round is here for comparison.</p></div>${pair(V2.sunburst(), V2.bubbles())}${pair(V2.flow(), V2.pillar())}${pair(V2.orbits(), V1.v1())}`;
  const rk = Array.from({ length: 10 }, (_, i) => String(i));
  return `<div class="chai-app board" style="width:1600px;height:__H__">${C.radios("sp", KEYS, "sector")}${C.radios("zm", ["root", "eq", "debt", "gold", "eq-in", "eq-us"], "root")}${C.radios("fr", FLOW_KEYS, "market")}${C.radios("to", FLOW_KEYS, "asset")}${C.radios("pl", rk, "0")}${body}</div>`;
}
