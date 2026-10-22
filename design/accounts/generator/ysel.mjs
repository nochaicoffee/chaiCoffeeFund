// Round 5: Y's hero, which Prathik liked, with seven other ways to pick a bank (2026-10-21).
// Everything else in the hero stays: the green stage, the giant figure, the glowing line and the four figures.
// Y1 Sliding switch, Y2 Lanes, Y3 Waffle, Y4 Donut, Y5 Vault dial, Y6 Type menu, Y7 Line legend.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as U from "./uniq.mjs";
import * as D5 from "./dirs5.mjs";
import { board, section, frame, grid } from "./board.mjs";
const { inr, signed, inrS, fmt, fmtY, monName, I, btn, rings, grad, mono } = L;
const { IDS, FACTS, ORDER, panes, greenStage, selSoft, selTint, hue } = P;
const { bigNumber, whiteLine, statRow, heroActions, pickBtnCss } = D5;

const ACTIVE = ORDER.filter((a) => L.isOn(a));
const t = (iso) => Date.parse(`${iso}T00:00:00Z`);
export const ink = (id) => (id === "all" ? "var(--card-emerald-to)" : `var(--card-${hue(id)}-to)`);
export const monoOf = (id, s = 26, round = false) => (id === "all" ? `<span style="width:${s}px;height:${s}px;border-radius:${round ? "50%" : `${Math.round(s * 0.3)}px`};background:oklch(1 0 0 / 0.18);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${I.accounts(Math.round(s * 0.5))}</span>` : round ? mono(FACTS[id].a, s).replace(/border-radius:\d+px/, "border-radius:50%") : mono(FACTS[id].a, s));
export const nameOf = (id, ph = false) => (id === "all" ? "All" : ph ? FACTS[id].a.bank.split(" ")[0] : FACTS[id].name);
export const balOf = (id, short = false) => { const f = FACTS[id]; return f.on ? (short ? inrS(f.balance) : inr(f.balance)) : "closed"; };
/** The top of every variant: the figure on the left, the pick's buttons on the right. */
export const top = (ph) => `<div class="between" style="align-items:flex-end;gap:16px;flex-wrap:wrap"><div>${panes((f) => bigNumber(f, { ph, size: ph ? 44 : 76 }))}</div>${ph ? "" : panes((f) => heroActions(f))}</div>`;
export const chart = (prefix, ph, w = 1440, h = 220) => panes((f) => whiteLine(f, { w: ph ? 330 : w, h: ph ? 140 : h, ph, key: prefix }));
export const stage = (inner, ph) => greenStage(`<div class="gpick" style="display:flex;flex-direction:column;gap:${ph ? 14 : 20}px">${inner}</div>`, { ph, pad: ph ? "18px 14px" : "30px 32px" });

// ================= Y1 · Sliding switch =================
// One long switch across the stage; the thumb glides to the pick and takes its colour.
function y1(prefix, { ph = false } = {}) {
  const n = IDS.length;
  const segs = IDS.map((id) => `<label for="${prefix}-sel-${id}" class="y1s y1s-${id}" style="position:relative;z-index:2;cursor:pointer;display:flex;align-items:center;gap:${ph ? 6 : 9}px;padding:${ph ? "8px 10px" : "10px 12px"};border-radius:14px;min-width:0;transition:color 300ms">${monoOf(id, ph ? 20 : 26)}<span style="min-width:0"><b style="display:block;font-size:${ph ? 11.5 : 13}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nameOf(id, ph)}</b><span class="y1b" style="display:block;font-size:${ph ? 10.5 : 11.5}px;font-weight:700;opacity:0.7;white-space:nowrap">${balOf(id, true)}</span></span></label>`).join("");
  const track = `<div style="position:relative;display:grid;grid-template-columns:repeat(${n},${ph ? "112px" : "minmax(0,1fr)"});padding:5px;border-radius:19px;background:oklch(0 0 0 / 0.22);box-shadow:inset 0 2px 6px oklch(0 0 0 / 0.25)"><span class="y1thumb" style="position:absolute;z-index:1;top:5px;bottom:5px;left:5px;width:calc((100% - 10px) / ${n});border-radius:14px;background:white;box-shadow:0 6px 16px oklch(0 0 0 / 0.3);transition:left 420ms cubic-bezier(0.3, 1.3, 0.5, 1), background 300ms"></span>${segs}</div>`;
  return stage(`${top(ph)}${ph ? `<div style="overflow-x:auto;margin:0 -14px;padding:0 14px;scrollbar-width:none">${track}</div>` : track}${chart(prefix, ph)}${panes((f) => statRow(f, { ph }))}${ph ? panes((f) => heroActions(f)) : ""}`, ph);
}
const y1Sel = (dsel, id) => `${dsel} .y1thumb { left: calc(5px + ${IDS.indexOf(id)} * (100% - 10px) / ${IDS.length}); background: ${selSoft(id)}; } ${dsel} .y1s-${id} { color: ${ink(id)}; } ${dsel} .y1s-${id} .y1b { opacity: 0.85; }${pickBtnCss(dsel, id)}`;

// ================= Y2 · Lanes =================
// Under the big line, a lane per account, each its own little line; pick a lane and it becomes the big one.
function lane(prefix, id, { ph = false, w = 1100 } = {}) {
  const f = FACTS[id], keys = L.LAST12;
  const svg = P.spark(id, { w: ph ? 150 : w, h: ph ? 24 : 30, stroke: id === "all" ? "white" : selSoft(id), fill: id === "all" ? "oklch(1 0 0 / 0.1)" : selTint(id, 30), width: 1.8, dots: true, keys: f.on || f.all ? keys : L.HISTORY });
  return `<label for="${prefix}-sel-${id}" class="y2l y2l-${id}" style="cursor:pointer;display:grid;grid-template-columns:${ph ? "86px 1fr 62px" : "210px 1fr 120px"};gap:${ph ? 8 : 16}px;align-items:center;padding:${ph ? "6px 8px" : "7px 12px"};border-radius:12px;transition:background 220ms, box-shadow 220ms, opacity 220ms"><span class="row" style="gap:9px;min-width:0">${monoOf(id, ph ? 20 : 24)}<b style="font-size:${ph ? 11.5 : 13}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nameOf(id, ph)}</b>${f.stale ? `<span style="width:7px;height:7px;border-radius:50%;background:var(--warning);flex-shrink:0"></span>` : ""}</span><span style="display:block;min-width:0">${svg}</span><b class="num" style="text-align:right;font-size:${ph ? 11.5 : 13.5}px">${balOf(id, ph)}</b></label>`;
}
function y2(prefix, { ph = false } = {}) {
  return stage(`${top(ph)}${chart(prefix, ph, 1440, 200)}<div style="display:flex;flex-direction:column;gap:2px;padding:6px;border-radius:18px;background:oklch(0 0 0 / 0.16)">${IDS.map((id) => lane(prefix, id, { ph })).join("")}</div>${panes((f) => statRow(f, { ph }))}${ph ? panes((f) => heroActions(f)) : ""}`, ph);
}
const y2Sel = (dsel, id) => `${dsel} .y2l-${id} { background: ${id === "all" ? "oklch(1 0 0 / 0.14)" : selTint(id, 45)}; box-shadow: inset 0 0 0 1.5px ${selSoft(id)}; } ${dsel} .y2l:not(.y2l-${id}) { opacity: 0.72; }${pickBtnCss(dsel, id)}`;

// ================= Y3 · Waffle =================
// Where every ₹100 sits: a hundred squares in the accounts' colours. Pick a block of colour (or its row in the key).
function y3(prefix, { ph = false } = {}) {
  const shares = ACTIVE.map((a) => ({ id: a.id, n: (L.latest(a.id).balance / L.TOTAL) * 100 }));
  let counts = shares.map((s) => Math.floor(s.n)), left = 100 - counts.reduce((a, b) => a + b, 0);
  shares.map((s, i) => ({ i, r: s.n - Math.floor(s.n) })).sort((a, b) => b.r - a.r).slice(0, left).forEach((x) => counts[x.i]++);
  counts = counts.map((c) => Math.max(c, 1));
  const cells = []; shares.forEach((s, i) => { for (let k = 0; k < counts[i]; k++) cells.push(s.id); }); while (cells.length > 100) cells.pop();
  const sz = ph ? 22 : 27, gap = ph ? 4 : 5;
  const waffle = `<div style="display:grid;grid-template-columns:repeat(10,${sz}px);gap:${gap}px">${cells.map((id, i) => `<label for="${prefix}-sel-${id}" class="y3c y3c-${id}" style="cursor:pointer;width:${sz}px;height:${sz}px;border-radius:${ph ? 5 : 7}px;background:linear-gradient(160deg, color-mix(in srgb, var(--card-${hue(id)}) 78%, white), var(--card-${hue(id)}));box-shadow:inset 0 1px 0 oklch(1 0 0 / 0.3);transition:opacity 220ms, transform 220ms, box-shadow 220ms;transition-delay:${(i % 10) * 12}ms"></label>`).join("")}</div>`;
  const key = IDS.map((id) => { const f = FACTS[id], pct = id === "all" ? 100 : f.on ? Math.round((f.balance / L.TOTAL) * 100) : 0; return `<label for="${prefix}-sel-${id}" class="y3k y3k-${id}" style="cursor:pointer;display:grid;grid-template-columns:${ph ? "20px 1fr auto" : "24px 1fr auto auto"};gap:10px;align-items:center;padding:${ph ? "6px 8px" : "7px 10px"};border-radius:10px;transition:background 200ms">${monoOf(id, ph ? 20 : 24)}<b style="font-size:${ph ? 12 : 13}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nameOf(id)}</b>${ph ? "" : `<span class="num" style="font-size:12.5px;font-weight:700;color:var(--muted)">${balOf(id)}</span>`}<b class="num" style="font-size:${ph ? 12 : 13.5}px;min-width:42px;text-align:right">${id === "yes" ? "—" : `${pct}%`}</b></label>`; }).join("");
  const right = `<div style="display:grid;grid-template-columns:${ph ? "1fr" : `${10 * sz + 9 * gap}px minmax(0,1fr)`};gap:${ph ? 14 : 28}px;align-items:center"><div style="${ph ? "justify-self:center" : ""}">${waffle}<span style="display:block;margin-top:8px;font-size:11.5px;font-weight:700;color:var(--muted);text-align:center">each square is 1% of ${inr(L.TOTAL)}</span></div><div style="display:flex;flex-direction:column;gap:1px">${key}</div></div>`;
  if (ph) return stage(`${top(ph)}${right}${chart(prefix, ph)}${panes((f) => statRow(f, { ph }))}${panes((f) => heroActions(f))}`, ph);
  return stage(`<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:40px;align-items:center"><div style="display:flex;flex-direction:column;gap:22px">${panes((f) => bigNumber(f, { size: 72 }))}${panes((f) => heroActions(f))}</div>${right}</div>${chart(prefix, ph, 1440, 200)}${panes((f) => statRow(f))}`, ph);
}
const y3Sel = (dsel, id) => (id === "all" ? `${dsel} .y3k-all { background: oklch(1 0 0 / 0.14); }` : `${dsel} .y3c:not(.y3c-${id}) { opacity: 0.22; } ${dsel} .y3c-${id} { transform: scale(1.08); box-shadow: 0 0 0 2px ${selSoft(id)}, 0 0 14px ${selSoft(id)}; } ${dsel} .y3k-${id} { background: ${selTint(id, 50)}; box-shadow: inset 3px 0 0 ${selSoft(id)}; }`) + pickBtnCss(dsel, id);

// ================= Y4 · Donut =================
// A ring of what each account holds beside the figure. The picked slice slides out and glows; All is the centre.
function y4(prefix, { ph = false } = {}) {
  const S = ph ? 240 : 330, cx = S / 2, r = S * 0.34, sw = S * 0.11, gapDeg = 1.4;
  let a0 = 0;
  const arcs = ACTIVE.map((a) => { const share = L.latest(a.id).balance / L.TOTAL, a1 = a0 + share * 360, mid = (a0 + a1) / 2, [dx, dy] = U.polar(0, 0, ph ? 8 : 12, mid), d = U.arc(cx, cx, r, a0 + gapDeg / 2, Math.max(a0 + gapDeg / 2 + 0.6, a1 - gapDeg / 2)), [lx, ly] = U.polar(cx, cx, r + sw / 2 + (ph ? 20 : 34), mid); const o = { id: a.id, d, mid, dx, dy, lx, ly, share }; a0 = a1; return o; });
  const svg = `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" style="display:block;overflow:visible" aria-hidden="true"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="oklch(0 0 0 / 0.18)" stroke-width="${sw + 8}"></circle>${arcs.map((x) => `<path class="y4a y4a-${x.id}" d="${x.d}" fill="none" stroke="var(--card-${hue(x.id)})" stroke-width="${sw}" style="--dx:${x.dx.toFixed(1)}px;--dy:${x.dy.toFixed(1)}px;transition:transform 320ms cubic-bezier(0.3, 1.4, 0.5, 1), opacity 220ms, stroke 220ms, filter 220ms"></path>`).join("")}</svg>`;
  const hits = arcs.map((x) => { const [hx, hy] = U.polar(cx, cx, r, x.mid); return `<label for="${prefix}-sel-${x.id}" style="position:absolute;left:${hx - 22}px;top:${hy - 22}px;width:44px;height:44px;border-radius:50%;cursor:pointer" aria-label="${FACTS[x.id].name}"></label>`; }).join("");
  // Small slices sit close together, so their labels are pushed apart on each side.
  for (const side of [true, false]) { const g = arcs.filter((x) => (x.lx > cx) === side).sort((a, b) => a.ly - b.ly); for (let i = 1; i < g.length; i++) if (g[i].ly - g[i - 1].ly < (ph ? 30 : 40)) g[i].ly = g[i - 1].ly + (ph ? 30 : 40); }
  const callouts = arcs.map((x) => { const right = x.lx > cx; return `<label for="${prefix}-sel-${x.id}" class="y4c y4c-${x.id}" style="position:absolute;left:${x.lx}px;top:${x.ly}px;transform:translate(${right ? "0" : "-100%"},-50%);cursor:pointer;text-align:${right ? "left" : "right"};white-space:nowrap;padding:3px 8px;border-radius:8px;transition:background 200ms, color 200ms"><b style="display:block;font-size:${ph ? 10.5 : 12.5}px">${nameOf(x.id, ph)}</b><span style="font-size:${ph ? 10 : 11.5}px;font-weight:700;opacity:0.75">${Math.round(x.share * 100)}%${ph ? "" : ` · ${inrS(L.latest(x.id).balance)}`}</span></label>`; }).join("");
  const centre = `<label for="${prefix}-sel-all" style="position:absolute;left:${cx - r + sw / 2 + 6}px;top:${cx - r + sw / 2 + 6}px;width:${2 * (r - sw / 2 - 6)}px;height:${2 * (r - sw / 2 - 6)}px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;text-align:center;background:oklch(0 0 0 / 0.14)">${panes((f) => `<span><span style="display:block;font-size:${ph ? 10 : 11}px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted)">${f.all ? "All" : f.a.bank.split(" ")[0]}</span><b style="display:block;font-size:${ph ? 20 : 28}px;font-weight:800">${f.all ? "100%" : f.on ? L.pct(f.balance, L.TOTAL) : "0%"}</b><span style="font-size:${ph ? 10 : 11}px;font-weight:700;color:var(--muted)">${f.all ? "tap a slice" : "of everything"}</span></span>`)}</label>`;
  const donut = `<div style="position:relative;width:${S}px;height:${S}px;margin:${ph ? "26px auto" : "0 auto"}">${svg}${centre}${hits}${callouts}</div>`;
  const closed = `<label for="${prefix}-sel-yes" class="chip" style="cursor:pointer;align-self:center;background:oklch(1 0 0 / 0.1);color:var(--fg)">${I.lock(10)} YES Old Salary · closed</label>`;
  if (ph) return stage(`${top(ph)}${donut}${closed}${chart(prefix, ph)}${panes((f) => statRow(f, { ph }))}${panes((f) => heroActions(f))}`, ph);
  return stage(`<div style="display:grid;grid-template-columns:minmax(0,1fr) 520px;gap:30px;align-items:center"><div style="display:flex;flex-direction:column;gap:22px">${panes((f) => bigNumber(f, { size: 76 }))}${panes((f) => heroActions(f))}${panes((f) => statRow(f))}</div><div style="display:flex;flex-direction:column;gap:14px;align-items:center;padding:20px 0">${donut}${closed}</div></div>${chart(prefix, ph, 1440, 200)}`, ph);
}
const y4Sel = (dsel, id) => (id === "all" ? "" : `${dsel} .y4a:not(.y4a-${id}) { opacity: 0.35; } ${dsel} .y4a-${id} { transform: translate(var(--dx), var(--dy)); stroke: ${selSoft(id)}; filter: drop-shadow(0 0 10px ${selSoft(id)}); } ${dsel} .y4c-${id} { background: ${selSoft(id)}; color: ${ink(id)}; }`) + pickBtnCss(dsel, id);

// ================= Y5 · Vault dial =================
// A safe's dial beside the figure: the accounts sit round it, and the knob turns to point at the one you pick.
function y5(prefix, { ph = false } = {}) {
  const S = ph ? 250 : 340, cx = S / 2, R = S * 0.3, n = IDS.length, ang = (i) => -135 + (270 / (n - 1)) * i;
  const ridges = Array.from({ length: 60 }, (_, k) => { const a = k * 6, [x0, y0] = U.polar(cx, cx, R - 6, a), [x1, y1] = U.polar(cx, cx, R - (k % 5 ? 12 : 18), a); return `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="oklch(1 0 0 / ${k % 5 ? 0.18 : 0.4})" stroke-width="${k % 5 ? 1 : 1.8}"></line>`; }).join("");
  const ticks = IDS.map((id, i) => { const [x0, y0] = U.polar(cx, cx, R + 8, ang(i)), [x1, y1] = U.polar(cx, cx, R + 18, ang(i)); return `<line class="y5t y5t-${id}" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="oklch(1 0 0 / 0.45)" stroke-width="3" stroke-linecap="round"></line>`; }).join("");
  const svg = `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" style="display:block;overflow:visible" aria-hidden="true"><defs><radialGradient id="knob-${prefix}" cx="38%" cy="32%" r="75%"><stop offset="0" style="stop-color:oklch(0.5 0.06 160)"></stop><stop offset="0.6" style="stop-color:oklch(0.28 0.05 162)"></stop><stop offset="1" style="stop-color:oklch(0.18 0.03 162)"></stop></radialGradient></defs>${ticks}<circle cx="${cx}" cy="${cx}" r="${R + 2}" fill="oklch(0 0 0 / 0.3)"></circle><g class="y5knob" style="transform-origin:${cx}px ${cx}px;transform:rotate(${ang(0)}deg);transition:transform 700ms cubic-bezier(0.3, 1.25, 0.5, 1)"><circle cx="${cx}" cy="${cx}" r="${R}" fill="url(#knob-${prefix})" stroke="oklch(1 0 0 / 0.2)"></circle>${ridges}<path class="y5n" d="M${cx - 7},${cx - R + 2} L${cx + 7},${cx - R + 2} L${cx},${cx - R + 20} Z" fill="white"></path><line class="y5n2" x1="${cx}" y1="${cx - R + 22}" x2="${cx}" y2="${cx - R * 0.45}" stroke="white" stroke-width="3" stroke-linecap="round"></line></g><circle cx="${cx}" cy="${cx}" r="${R * 0.38}" fill="oklch(0.2 0.03 162)" stroke="oklch(1 0 0 / 0.12)"></circle></svg>`;
  const labels = IDS.map((id, i) => { const [x, y] = U.polar(cx, cx, R + (ph ? 32 : 40), ang(i)), right = x > cx + 4, mid = Math.abs(x - cx) <= 4; return `<label for="${prefix}-sel-${id}" class="y5l y5l-${id}" style="position:absolute;left:${x}px;top:${y}px;transform:translate(${mid ? "-50%" : right ? "0" : "-100%"},-50%);cursor:pointer;display:flex;align-items:center;gap:6px;flex-direction:${right || mid ? "row" : "row-reverse"};padding:4px 9px 4px 5px;border-radius:999px;white-space:nowrap;background:oklch(0 0 0 / 0.18);transition:background 220ms, color 220ms, box-shadow 220ms">${monoOf(id, ph ? 18 : 22, true)}<span style="text-align:${right || mid ? "left" : "right"}"><b style="display:block;font-size:${ph ? 10.5 : 12}px">${nameOf(id, ph)}</b>${ph ? "" : `<span style="font-size:10.5px;font-weight:700;opacity:0.75">${balOf(id, true)}</span>`}</span></label>`; }).join("");
  const centre = `<div style="position:absolute;left:${cx}px;top:${cx}px;transform:translate(-50%,-50%);text-align:center;pointer-events:none">${panes((f) => `<b style="display:block;font-size:${ph ? 15 : 19}px;font-weight:800">${f.all ? "All" : f.a.bank.split(" ")[0]}</b>`)}</div>`;
  const dial = `<div style="position:relative;width:${S}px;height:${S}px;margin:${ph ? "36px auto 20px" : "0 auto"}">${svg}${centre}${labels}</div>`;
  if (ph) return stage(`${top(ph)}${dial}${chart(prefix, ph)}${panes((f) => statRow(f, { ph }))}${panes((f) => heroActions(f))}`, ph);
  return stage(`<div style="display:grid;grid-template-columns:minmax(0,1fr) 560px;gap:30px;align-items:center"><div style="display:flex;flex-direction:column;gap:22px">${panes((f) => bigNumber(f, { size: 76 }))}${panes((f) => heroActions(f))}${panes((f) => statRow(f))}</div><div style="padding:34px 0">${dial}</div></div>${chart(prefix, ph, 1440, 200)}`, ph);
}
const y5Sel = (dsel, id) => { const i = IDS.indexOf(id), a = -135 + (270 / (IDS.length - 1)) * i; return `${dsel} .y5knob { transform: rotate(${a}deg); } ${dsel} .y5n { fill: ${selSoft(id)}; } ${dsel} .y5n2 { stroke: ${selSoft(id)}; } ${dsel} .y5t-${id} { stroke: ${selSoft(id)}; } ${dsel} .y5l-${id} { background: ${selSoft(id)}; color: ${ink(id)}; box-shadow: 0 0 18px ${selSoft(id)}; }${pickBtnCss(dsel, id)}`; };

// ================= Y6 · Type menu =================
// The accounts as a line of big type under the figure: the pick in its colour, the rest quiet.
function y6(prefix, { ph = false } = {}) {
  const items = IDS.map((id, i) => { const f = FACTS[id]; return `${i ? `<span aria-hidden="true" style="font-size:${ph ? 22 : 34}px;font-weight:300;color:oklch(1 0 0 / 0.22);margin:0 ${ph ? 4 : 10}px">/</span>` : ""}<label for="${prefix}-sel-${id}" class="y6i y6i-${id}" style="cursor:pointer;display:inline-flex;align-items:baseline;gap:6px;font-size:${ph ? 22 : 34}px;font-weight:800;letter-spacing:-0.01em;line-height:1.35;color:oklch(1 0 0 / 0.42);transition:color 240ms, text-shadow 240ms;white-space:nowrap">${id === "all" ? "All" : f.name}<sup style="font-size:${ph ? 10 : 12.5}px;font-weight:700;letter-spacing:0;opacity:0.85">${id === "all" ? inrS(L.TOTAL) : f.on ? inrS(f.balance) : "closed"}${f.stale ? " ●" : ""}</sup></label>`; }).join("");
  return stage(`${top(ph)}<div style="display:flex;flex-wrap:wrap;align-items:baseline;row-gap:${ph ? 0 : 2}px;padding:${ph ? "4px 0" : "6px 0 4px"};border-top:1px solid oklch(1 0 0 / 0.14);border-bottom:1px solid oklch(1 0 0 / 0.14)">${items}</div>${chart(prefix, ph)}${panes((f) => statRow(f, { ph }))}${ph ? panes((f) => heroActions(f)) : ""}`, ph);
}
const y6Sel = (dsel, id) => `${dsel} .y6i-${id} { color: ${selSoft(id)}; text-shadow: 0 0 24px ${id === "all" ? "oklch(1 0 0 / 0.35)" : selTint(id, 70)}; text-decoration: underline; text-decoration-thickness: 3px; text-underline-offset: 8px; }${pickBtnCss(dsel, id)}`;

// ================= Y7 · Line legend =================
// Every account's own line runs faintly under the total, each on its own scale, named where it ends. Pick a name to light its line.
function y7(prefix, { ph = false } = {}) {
  const w = ph ? 330 : 1180, h = ph ? 200 : 300, padB = 22;
  const dates = []; for (let d = "2026-01-01"; d < L.TODAY; d = L.addDays(d, 5)) dates.push(d); dates.push(L.TODAY);
  const X = (d) => 6 + ((t(d) - t("2026-01-01")) / (t(L.TODAY) - t("2026-01-01"))) * (w - 12);
  const series = IDS.map((id) => { const vals = dates.map((d) => (id === "all" ? L.totalOn(d) : L.balanceOn(id, d) ?? 0)), hi = Math.max(...vals), lo = Math.min(...vals), sp = hi - lo || hi || 1, band = id === "all" ? [0.08, 0.6] : [0.2, 0.9]; const Y = (v) => 10 + (band[0] + (1 - (v - lo) / sp) * (band[1] - band[0])) * (h - padB - 10); return { id, vals, Y, path: vals.map((v, i) => `${i ? "L" : "M"}${X(dates[i]).toFixed(1)},${Y(v).toFixed(1)}`).join(" ") }; });
  const lines = series.map((s) => `<path class="y7p y7p-${s.id}" d="${s.path}" fill="none" stroke="${s.id === "all" ? "white" : selSoft(s.id)}" stroke-width="${s.id === "all" ? 2.6 : 1.6}" stroke-linejoin="round" opacity="${s.id === "all" ? 1 : 0.38}" style="transition:opacity 240ms, stroke-width 240ms, filter 240ms"></path>`).join("");
  const svg = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block;overflow:visible" aria-hidden="true">${lines}${L.YEAR.map((k) => `<text x="${X(`${k}-01`)}" y="${h - 4}" text-anchor="middle" font-size="10.5" font-weight="700" fill="oklch(1 0 0 / 0.55)">${ph && Number(k.slice(5)) % 3 !== 1 ? "" : monName(k)}</text>`).join("")}</svg>`;
  const ends = series.map((s) => ({ id: s.id, y: s.Y(s.vals.at(-1)) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < (ph ? 30 : 38)) ends[i].y = ends[i - 1].y + (ph ? 30 : 38);
  const labelHtml = (id) => `${monoOf(id, ph ? 18 : 22)}<span style="min-width:0"><b style="display:block;font-size:${ph ? 11 : 12.5}px;white-space:nowrap">${nameOf(id, ph)}</b><span style="font-size:${ph ? 10 : 11}px;font-weight:700;opacity:0.75;white-space:nowrap">${balOf(id, true)}</span></span>`;
  if (ph) return stage(`${top(ph)}${svg}<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${IDS.map((id) => `<label for="${prefix}-sel-${id}" class="y7l y7l-${id}" style="cursor:pointer;display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:10px;background:oklch(0 0 0 / 0.16);transition:background 220ms, color 220ms">${labelHtml(id)}</label>`).join("")}</div>${panes((f) => statRow(f, { ph }))}${panes((f) => heroActions(f))}`, ph);
  const legend = `<div style="position:relative;width:230px;height:${h}px">${ends.map((e) => `<label for="${prefix}-sel-${e.id}" class="y7l y7l-${e.id}" style="position:absolute;left:0;top:${e.y}px;transform:translateY(-50%);cursor:pointer;display:flex;align-items:center;gap:8px;padding:5px 12px 5px 6px;border-radius:12px;transition:background 220ms, color 220ms"><span style="position:absolute;left:-20px;top:50%;width:16px;height:2px;background:oklch(1 0 0 / 0.35)"></span>${labelHtml(e.id)}</label>`).join("")}</div>`;
  return stage(`${top(ph)}<div style="display:grid;grid-template-columns:${w}px 1fr;gap:26px;align-items:start">${svg}${legend}</div><span style="font-size:11.5px;font-weight:700;color:var(--muted)">The white line is your total; each account's line is drawn on its own scale, so you see its shape.</span>${panes((f) => statRow(f))}`, ph);
}
const y7Sel = (dsel, id) => `${id === "all" ? "" : `${dsel} .y7p-all { opacity: 0.3; } ${dsel} .y7p-${id} { opacity: 1; stroke-width: 3; filter: drop-shadow(0 0 6px ${selSoft(id)}); }`} ${dsel} .y7l-${id} { background: ${selSoft(id)}; color: ${ink(id)}; }${pickBtnCss(dsel, id)}`;

// ---------- The boards ----------
const VARIANTS = [
  { k: "y1", name: "Sliding switch", render: y1, sel: y1Sel, blurb: "One long switch across the stage. The thumb glides to the bank you pick, with a little overshoot, and turns its colour." },
  { k: "y2", name: "Lanes", render: y2, sel: y2Sel, blurb: "A lane per account under the big line, each with its own small line. Pick a lane and its line becomes the big one." },
  { k: "y3", name: "Waffle", render: y3, sel: y3Sel, blurb: "Where every ₹100 sits: a hundred squares in the accounts' colours. Pick a block of colour, or its row in the key, and the rest fade." },
  { k: "y4", name: "Donut", render: y4, sel: y4Sel, blurb: "A ring of what each account holds, beside the figure. The picked slice slides out and glows; the centre is All." },
  { k: "y5", name: "Vault dial", render: y5, sel: y5Sel, blurb: "A safe's dial: the accounts sit round it, and the knob turns to point at the one you pick. It turns, but it's a knob, not a carousel." },
  { k: "y6", name: "Type menu", render: y6, sel: y6Sel, blurb: "The accounts as a line of big type under the figure. The pick lights up in its colour and is underlined; the rest stay quiet." },
  { k: "y7", name: "Line legend", render: y7, sel: y7Sel, blurb: "Every account's own line runs faintly under the total, named where it ends. Pick a name to light its line." },
];
export const YSEL = VARIANTS.map(({ k, name, blurb }) => ({ k, name, blurb }));
function variantBlock(v, { ph = false } = {}) {
  const prefix = ph ? `${v.k}p` : v.k, pk = P.picker(prefix, v.sel);
  return `${pk.css}${pk.open}${v.render(prefix, { ph })}${pk.close}`;
}
export function ySelBoard() {
  const body = VARIANTS.map((v, i) => section(`Y${i + 1}`, `${v.name}`, v.blurb, variantBlock(v))).join("");
  return board({ w: 1600, title: "Y's hero: other ways to pick a bank", sub: "You liked Y's hero. Here it is seven times with a different selector each time; the green stage, the figure, the glowing line and the four figures stay the same. None of them scrolls or turns cards. Every one is live: pick a bank and the figure, the line, the buttons and the selection follow, in that bank's colour (white for All).", body: `${C.DEFS()}<style>.board .sec-n { width: auto; padding: 0 9px; border-radius: 999px; }</style>${body}` });
}
export function ySelPhoneBoard() {
  const phoneFrame = (v) => frame(`Y${VARIANTS.indexOf(v) + 1} · ${v.name}`, `<div class="chai-app ph" style="width:390px;height:auto;padding-bottom:16px"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${I.menu()}</span></header><div class="ph-body" style="padding-bottom:12px">${variantBlock(v, { ph: true })}</div></div>`);
  return board({ w: 1800, title: "Y's selectors on a phone", sub: "The same seven at phone width. Where a selector is wide, it scrolls sideways or wraps; everything stays 44px to tap.", body: `${C.DEFS()}${grid("repeat(4, 390px)", VARIANTS.map(phoneFrame), 40)}` });
}
