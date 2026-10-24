// Round 3's visuals for the left of the second row (Subscriptions' cost map, as an income map in three shapes)
// and the trend card that switches between this year and last, month by month, and pay rhythm.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as Q from "./parts2.mjs";
import { rings } from "./rings.mjs";
const { I, inr, inrS, fmt, col, grad, mono } = L;
const { hc, tip, card, cardHead, tgl, variants } = P;

const MAP_W = 654, MAP_H = 488;
export const pickCss3 = () => `<style>${L.SOURCES.map((s) => `.i4dir:has(#i4-sel-${s.id}:checked) .pickable.pk-${s.id} { opacity: 1; box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px var(--card-${s.color}), 0 10px 26px oklch(0.2 0.05 260 / 0.28); z-index: 3; }`).join("\n")}
.i4dir:not(:has(#i4-sel-all:checked)) .pickable { opacity: 0.5; }
.pickable { transition: opacity 260ms, transform 200ms, box-shadow 200ms; cursor: pointer; }
.pickable:hover { transform: translateY(-2px); }</style>`;
const nextChip = (s) => { const nx = L.nextOf(s.id); if (s.status === "Inactive") return `<span class="dt-pill">Done · received once</span>`; if (!nx) return ""; return nx.status === "Pending" ? `<span class="dt-pill" style="background:oklch(0.72 0.14 75 / 0.5);animation:due-pulse 2.2s ease-in-out infinite">${L.delay(nx)} days late</span>` : `<span class="dt-pill">${fmt(nx.expectedDate)} · ${L.daysBetween(L.TODAY, nx.expectedDate)}d</span>`; };
const tipFor = (s, v, mode) => hc({ h: s.name, hr: "", t: inr(v), d: mode === "usual" ? `${s.frequency}, ${inr(s.expectedAmount)} each` : `${L.plural(L.received(2026, s.id).length, "payment")} this year · ${L.pctOf(L.ytdOf(s.id), L.YTD)}% of the year`, rows: [["Lands in", L.ACCOUNTS[s.acct].name, ""], ["Next", L.nextOf(s.id) ? fmt(L.nextOf(s.id).expectedDate) : "none", ""]], w: 220 });
const valueOf = (s, mode) => (mode === "usual" ? L.monthlyEq(s) : L.ytdOf(s.id));
const notInMap = (mode) => { const out = L.SOURCES.filter((s) => valueOf(s, mode) <= 0); return out.length ? `<div class="row" style="gap:8px;flex-wrap:wrap;font-size:12px;font-weight:600;color:var(--muted)"><span>Not in the map:</span>${out.map((s) => `<span class="chip" style="cursor:default">${mono(s, 18)} <b style="color:var(--fg)">${s.alias}</b> <em>${s.status === "Inactive" ? "done" : "no usual month"}</em></span>`).join("")}</div>` : ""; };
/** A livelier gradient than the card tiles: the colour's mid tone down to its deep one. */
const vivid = (s, a = 155) => `linear-gradient(${a}deg,var(--card-${s.color}),var(--card-${s.color}-from))`;
const mapHead = (title, note, t) => cardHead(title, note, t.ui);

// ---------- Z1: the treemap, blocks sized by what each pays ----------
function squarify(items, x, y, w, h, out = []) {
  if (items.length === 1) { out.push({ ...items[0], x, y, w, h }); return out; }
  const total = items.reduce((t, i) => t + i.v, 0); let acc = 0, k = 0;
  while (k < items.length - 1 && acc + items[k].v < total / 2) { acc += items[k].v; k++; }
  k = Math.max(1, k === 0 ? 1 : k + (acc + items[k].v - total / 2 < total / 2 - acc ? 1 : 0));
  const a = items.slice(0, k), b = items.slice(k), fa = a.reduce((t, i) => t + i.v, 0) / total;
  if (w >= h) { squarify(a, x, y, w * fa, h, out); squarify(b, x + w * fa, y, w * (1 - fa), h, out); } else { squarify(a, x, y, w, h * fa, out); squarify(b, x, y + h * fa, w, h * (1 - fa), out); }
  return out;
}
function treemap(mode) {
  const items = L.SOURCES.map((s) => ({ s, v: valueOf(s, mode) })).filter((i) => i.v > 0).sort((a, b) => b.v - a.v);
  const gap = 6, rects = squarify(items, 0, 0, MAP_W, MAP_H);
  const blocks = rects.map(({ s, v, x, y, w, h }) => {
    const bx = x + gap / 2, by = y + gap / 2, bw = w - gap, bh = h - gap, big = bw > 190 && bh > 120, mid = bw > 110 && bh > 70;
    const share = `${L.pctOf(v, items.reduce((t, i) => t + i.v, 0))}%`;
    const inner = big ? `<span class="row" style="gap:10px;justify-content:space-between;align-items:flex-start"><span><b style="font-size:17px;font-weight:800;display:block">${s.name}</b><span class="tb-s">${s.category} · ${s.frequency}</span></span><span class="tb-p" style="position:static">${share}</span></span><span style="margin-top:auto"><span class="tb-v">${inr(v)}</span><span style="font-size:12px;font-weight:700;opacity:.8"> ${mode === "usual" ? "a month" : "so far"}</span><span style="display:block;margin-top:8px">${nextChip(s)}</span></span>`
      : mid ? `<b style="font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.alias}</b><span class="tb-s">${s.frequency}</span><span class="tb-v" style="font-size:17px;margin-top:auto">${inrS(v)}</span>`
      : `<span style="display:flex;flex-direction:column;align-items:center;gap:3px;margin:auto">${L.srcIcon(s, 15)}<b style="font-size:11px">${inrS(v)}</b></span>`;
    return `<label for="i4-sel-${s.id}" class="tblock pickable pk-${s.id} rt hov" tabindex="0" style="position:absolute;left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px;background:${vivid(s, 155)};padding:${big ? 16 : mid ? 11 : 4}px">${inner}${tip(tipFor(s, v, mode), { w: 220, x: "c", y: "up" })}</label>`;
  }).join("");
  return `<div class="tmap" style="position:relative;width:${MAP_W}px;height:${MAP_H}px">${blocks}</div>`;
}
export function incomeMap() {
  const t = tgl("i4", "map", [["rcv", "Received"], ["usual", "A usual month"]]);
  return card(`${pickCss3()}${t.css}${t.radios}${mapHead("What each one pays", "sized by what it pays · pick one for the cover", t)}${variants(t, (k) => `${treemap(k === "usual" ? "usual" : "rcv")}${notInMap(k)}`, { d: "flex", style: "flex-direction:column;gap:14px" })}<div class="card-note foot">Blocks are sized by ${"what landed this year, or by each source's usual month (its amount over its cycle)"}. Pick a block and the cover, the entries and the table follow it.</div>`, { gap: 14 });
}

// ---------- Z2: bento tiles ----------
const SPAN = { salary: "grid-column:1 / 3;grid-row:1 / 3", rsu: "grid-column:3 / 5;grid-row:1", espp: "grid-column:3;grid-row:2", fd: "grid-column:4;grid-row:2", div: "grid-column:1 / 3;grid-row:3", tax: "grid-column:3 / 5;grid-row:3" };
export function bentoMap() {
  const t = tgl("i4", "map", [["rcv", "Received"], ["usual", "Usual amount"]]);
  const tile = (s) => {
    const mo = L.monthlyOf(s.id), mx = Math.max(...mo, 1), bigT = s.id === "salary", wide = s.id === "rsu" || s.id === "div" || s.id === "tax", off = s.status === "Inactive";
    const spark = bigT || wide ? `<span style="display:flex;align-items:flex-end;gap:3px;height:${bigT ? 70 : 34}px;margin-top:10px">${mo.map((v, i) => `<i style="flex:1;border-radius:3px;background:${v ? "oklch(1 0 0 / 0.55)" : L.YEAR[i] > L.NOW_KEY && s.status === "Active" && L.UPCOMING.some((u) => u.sourceId === s.id && L.monthKey(u.expectedDate) === L.YEAR[i]) ? "oklch(1 0 0 / 0.14)" : "oklch(1 0 0 / 0.08)"};height:${Math.max(3, (v || (L.UPCOMING.some((u) => u.sourceId === s.id && L.monthKey(u.expectedDate) === L.YEAR[i]) ? s.expectedAmount : 0)) / mx * (bigT ? 70 : 34))}px"></i>`).join("")}</span>` : "";
    return `<label for="i4-sel-${s.id}" class="bt pickable pk-${s.id} rt hov" tabindex="0" style="${SPAN[s.id]};background:${vivid(s, 155)};${off ? "filter:grayscale(.85);opacity:.7" : ""}">
      <span class="row" style="gap:9px;justify-content:space-between;align-items:flex-start"><span class="row" style="gap:9px">${L.srcIcon(s, 15)}<b style="font-size:${bigT ? 17 : 14}px;font-weight:800">${bigT ? s.name : s.alias}</b></span><span class="dt-pill">${s.frequency}</span></span>
      <span style="margin-top:auto"><span class="v-map-rcv" style="--d:inline"><span class="tb-v" style="font-size:${bigT ? 32 : wide ? 24 : 20}px">${inr(L.ytdOf(s.id))}</span><span style="font-size:12px;font-weight:700;opacity:.8"> so far</span></span><span class="v-map-usual" style="--d:inline"><span class="tb-v" style="font-size:${bigT ? 32 : wide ? 24 : 20}px">${inr(s.expectedAmount)}</span><span style="font-size:12px;font-weight:700;opacity:.8"> ${s.frequency === "One-Time" ? "once" : s.frequency === "Monthly" ? "a month" : s.frequency === "Quarterly" ? "a quarter" : "a year"}</span></span></span>${spark}
      <span class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">${nextChip(s)}${bigT || wide ? `<span class="dt-pill" style="background:oklch(1 0 0 / 0.1)">into ${L.ACCOUNTS[s.acct].name}</span>` : ""}</span>${tip(tipFor(s, L.ytdOf(s.id), "rcv"), { w: 220, x: "c", y: "up" })}</label>`;
  };
  return card(`${pickCss3()}${t.css}${t.radios}${mapHead("What each one pays", "a tile each · pick one for the cover", t)}<div style="display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,1fr);gap:10px;height:${MAP_H}px">${L.SOURCES.map(tile).join("")}</div><div class="card-note foot">A year of months in each tile; a dashed bar is a payment still to come. Pick a tile and the cover, the entries and the table follow it.</div>`, { gap: 14 });
}

// ---------- Z3: packed bubbles ----------
function pack(radii) {
  const placed = [{ x: 0, y: 0, r: radii[0] }];
  for (let i = 1; i < radii.length; i++) {
    const r = radii[i], cx = placed.reduce((t, p) => t + p.x * p.r * p.r, 0) / placed.reduce((t, p) => t + p.r * p.r, 0), cy = 0;
    let best = null;
    for (const p of placed) for (let a = 0; a < 360; a += 4) {
      const x = p.x + (p.r + r + 8) * Math.cos((a * Math.PI) / 180), y = p.y + (p.r + r + 8) * Math.sin((a * Math.PI) / 180);
      if (placed.some((q) => Math.hypot(q.x - x, q.y - y) < q.r + r + 7.5)) continue;
      const d = Math.hypot(x - cx, (y - cy) * 1.6);
      if (!best || d < best.d) best = { x, y, d };
    }
    placed.push({ x: best.x, y: best.y, r });
  }
  return placed;
}
function bubbles(mode) {
  const items = L.SOURCES.map((s) => ({ s, v: valueOf(s, mode) })).filter((i) => i.v > 0).sort((a, b) => b.v - a.v);
  const radii = items.map((i) => Math.max(15, Math.sqrt(i.v)));
  const pl = pack(radii), minx = Math.min(...pl.map((p) => p.x - p.r)), maxx = Math.max(...pl.map((p) => p.x + p.r)), miny = Math.min(...pl.map((p) => p.y - p.r)), maxy = Math.max(...pl.map((p) => p.y + p.r));
  const k = Math.min((MAP_W - 20) / (maxx - minx), (MAP_H - 20) / (maxy - miny)), ox = (MAP_W - (maxx - minx) * k) / 2 - minx * k, oy = (MAP_H - (maxy - miny) * k) / 2 - miny * k;
  const total = items.reduce((t, i) => t + i.v, 0);
  return `<div style="position:relative;width:${MAP_W}px;height:${MAP_H}px;border-radius:24px;background:var(--fill);overflow:hidden">${rings(MAP_W, MAP_H, { first: 50, step: 28, opacity: 0.08 })}${items.map(({ s, v }, i) => {
    const r = pl[i].r * k, x = pl[i].x * k + ox, y = pl[i].y * k + oy, big = r > 70, mid = r > 34;
    const inner = big ? `<span style="display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center">${L.srcIcon(s, 20)}<b style="font-size:${r > 120 ? 19 : 15}px;font-weight:800">${r > 120 ? s.name : s.alias}</b><span class="tb-v" style="font-size:${r > 120 ? 28 : 19}px">${inr(v)}</span><span style="font-size:11.5px;font-weight:700;opacity:.8">${L.pctOf(v, total)}% · ${mode === "usual" ? "a month" : "so far"}</span></span>`
      : mid ? `<span style="display:flex;flex-direction:column;align-items:center;gap:2px">${L.srcIcon(s, 15)}<b style="font-size:11px">${inrS(v)}</b></span>` : `<span>${L.srcIcon(s, 13)}</span>`;
    return `<label for="i4-sel-${s.id}" class="pickable pk-${s.id} rt hov" tabindex="0" style="position:absolute;left:${x - r}px;top:${y - r}px;width:${r * 2}px;height:${r * 2}px;border-radius:50%;background:${vivid(s, 155)};color:var(--on-card);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 1px 0 oklch(1 0 0 / 0.25)">${inner}${tip(tipFor(s, v, mode), { w: 220, x: "c", y: "up", off: 6 })}</label>`;
  }).join("")}</div>`;
}
export function bubbleMap() {
  const t = tgl("i4", "map", [["rcv", "Received"], ["usual", "A usual month"]]);
  return card(`${pickCss3()}${t.css}${t.radios}${mapHead("What each one pays", "a bubble each · pick one for the cover", t)}${variants(t, (k) => `${bubbles(k === "usual" ? "usual" : "rcv")}${notInMap(k)}`, { d: "flex", style: "flex-direction:column;gap:14px" })}<div class="card-note foot">A bubble's area is what it pays. Pick one and the cover, the entries and the table follow it.</div>`, { gap: 14 });
}

// ---------- The trend card: this year and last, month by month, or pay rhythm ----------
export function trendCard() {
  const t = tgl("i4", "trend", [["tot", "This year, and last"], ["mon", "Month by month"], ["rhy", "Pay rhythm"]]);
  const y = Q.yoyParts({ w: 1372, h: 330 });
  const rhy = P.rhythmCard().replace(/^<section[^>]*>/, "").replace(/<\/section>$/, "").replace(/^<div class="card-h">.*?<\/div><\/div>/, "");
  const delta = `<span class="delta">${I.up(11)} ${Math.round(L.GROWTH * 100)}% on this time last year</span>`;
  return card(`${t.css}${t.radios}<div class="card-h"><div class="card-t">Trends<small class="v-trend-tot" style="--d:inline">money received, adding up through the year</small><small class="v-trend-mon" style="--d:inline">each month against the same month of 2025</small><small class="v-trend-rhy" style="--d:inline">how long after its expected date each payment landed</small></div><span class="row" style="gap:12px"><span class="v-trend-tot" style="--d:inline">${delta}</span>${t.ui}</span></div><div class="v-trend-tot" style="--d:flex;flex-direction:column;gap:16px">${y.sv}${y.foot}</div><div class="v-trend-mon" style="--d:flex;flex-direction:column;gap:16px">${y.bars}</div><div class="v-trend-rhy" style="--d:flex;flex-direction:column;gap:14px">${rhy}</div>`);
}

// ---------- Pay changes as bars: each change in its source's colour, by percent or in rupees ----------
export function payChangesVisual({ n = 6 } = {}) {
  const list = Q.changes(n), t = tgl("i4", "chg", [["pct", "By %"], ["inr", "In ₹"]]);
  const sumD = list.reduce((a, { e, p }) => a + (e.amount - p.amount), 0), top = list.map((c) => ({ ...c, pc: ((c.e.amount - c.p.amount) / c.p.amount) * 100 })).sort((a, b) => b.pc - a.pc)[0];
  const rows = (mode) => list.map(({ e, p }) => {
    const s = L.src(e.sourceId), d = e.amount - p.amount, pc = (d / p.amount) * 100, w = mode === "pct" ? Math.max(4, (pc / 20) * 100) : Math.max(3, (d / 16000) * 100);
    const label = mode === "pct" ? `${d > 0 ? "+" : "−"}${Math.abs(pc).toFixed(1)}%` : `${d > 0 ? "+" : "−"}${inr(Math.abs(d))}`;
    const card2 = hc({ h: `${s.alias} · from ${fmt(e.expectedDate)}${e.expectedDate.startsWith("2025") ? ", 2025" : ""}`, t: `${d > 0 ? "+" : "−"}${inr(Math.abs(d))}`, d: `${inr(p.amount)} → ${inr(e.amount)} (${d > 0 ? "+" : "−"}${Math.abs(pc).toFixed(1)}%)`, w: 240 });
    return `<div class="hov" tabindex="0" style="display:grid;grid-template-columns:132px 1fr 132px;gap:14px;align-items:center;padding:7px 0"><div class="cell-name">${mono(s, 30)}<div><b style="font-size:13px">${s.alias}${e.tag === "Bonus" && s.id === "salary" ? " bonus" : ""}</b><small>from ${fmt(e.expectedDate)}</small></div></div><div style="position:relative;height:28px;border-radius:14px;background:var(--fill)"><span class="rt" style="position:absolute;left:0;top:0;bottom:0;width:${w}%;border-radius:14px;background:${L.fill(s, 90)};min-width:28px"></span>${w >= 40 ? `<b style="position:absolute;left:0;width:${w}%;top:50%;transform:translateY(-50%);text-align:right;padding-right:12px;box-sizing:border-box;font-size:12.5px;font-weight:800;color:var(--on-card);white-space:nowrap">${label}</b>` : `<b style="position:absolute;left:calc(${w}% + 10px);top:50%;transform:translateY(-50%);font-size:12.5px;font-weight:800;color:var(--positive);white-space:nowrap">${label}</b>`}</div><div style="text-align:right;font-size:12px;font-weight:600;color:var(--muted);white-space:nowrap">${inr(p.amount)} <span>→</span> <b style="color:var(--fg)">${inr(e.amount)}</b></div>${tip(card2, { w: 240, x: "c", y: "up" })}</div>`;
  }).join("");
  const ticks = (mode) => `<div style="display:grid;grid-template-columns:132px 1fr 132px;gap:14px"><span></span><div style="position:relative;height:14px;font-size:10px;font-weight:700;color:var(--muted)">${(mode === "pct" ? [0, 5, 10, 15, 20] : [0, 4000, 8000, 12000, 16000]).map((v, i, a) => `<span style="position:absolute;left:${(i / (a.length - 1)) * 100}%;transform:translateX(${i === 0 ? "0" : i === a.length - 1 ? "-100%" : "-50%"})">${mode === "pct" ? `${v}%` : v ? inrS(v) : "0"}</span>`).join("")}</div><span></span></div>`;
  return card(`${t.css}${t.radios}${cardHead("Pay changes", "a payment 2% or more off the one before it", t.ui)}<div class="row" style="gap:30px"><div class="hfig"><span class="k">Changes</span><span class="v">${list.length}</span><span class="s">all of them up</span></div><div class="hfig"><span class="k">Biggest rise</span><span class="v" style="color:var(--positive)">${top.pc.toFixed(1)}%</span><span class="s">${L.src(top.e.sourceId).alias} · ${inr(top.e.amount - top.p.amount)}</span></div><div class="hfig"><span class="k">Added up</span><span class="v">${inr(sumD)}</span><span class="s">more across those payments</span></div></div><div class="spread" style="justify-content:flex-start">${variants(t, (k) => `${rows(k)}${ticks(k)}`)}</div><div class="foot between" style="font-size:12px;color:var(--muted);font-weight:600;border-top:1px solid var(--divider);padding-top:12px"><span>A raise, a bigger bonus or a lower dividend, newest first</span>${P.worked("Worked out")}</div>`, { gap: 12 });
}
