// Round 9 boards (2026-10-22): seven simpler bank objects (objects3.mjs) in one live Z1 hero with a switch to
// flip between them, each on its own stage with its All version, and on a phone.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as Y from "./ysel.mjs";
import * as Z1 from "./z1.mjs";
import * as Z2 from "./z2.mjs";
import * as O from "./objects.mjs";
import * as O2 from "./objects2.mjs";
import { SIMPLE } from "./objects3.mjs";
import { board, section, frame, grid } from "./board.mjs";
const { I, rings } = L;
const { IDS, FACTS, panes } = P;
const { monoOf, ink } = Y;

const stageBg = (id) => `radial-gradient(circle at 50% -10%, oklch(1 0 0 / 0.18), transparent 55%), linear-gradient(165deg, var(--card-${P.hue(id)}-from), var(--card-${P.hue(id)}-to))`;
const layers = () => IDS.filter((id) => id !== "all").map((id) => `<span class="stg stg-${id}" style="background:${stageBg(id)}"></span>`).join("");
const ANIM = `<style>.objin { animation: obj-in 560ms cubic-bezier(0.2, 0.9, 0.3, 1.15) both; } @keyframes obj-in { from { opacity: 0; transform: translateY(14px) scale(0.95); } } @media (prefers-reduced-motion: reduce) { .objin { animation: none; } } .board .sec-n { width: auto; padding: 0 9px; border-radius: 999px; } .board details.sel[open] { z-index: 60; }</style>`;

// ---------- One hero, every object: a switch above it picks which one ----------
function liveHero() {
  const prefix = "z3h";
  const radios = SIMPLE.map((o, i) => `<input type="radio" class="pk-in" name="${prefix}-obj" id="${prefix}-obj-${o.k}"${i === 0 ? " checked" : ""}>`).join("");
  const d = `.${prefix}dir`;
  const css = `<style>${d} .ot { display: none; } ${SIMPLE.map((o) => `${d}:has(#${prefix}-obj-${o.k}:checked) .ot-${o.k} { display: block; } ${d}:has(#${prefix}-obj-${o.k}:checked) label[for="${prefix}-obj-${o.k}"] { background: var(--surface); color: var(--accent-text); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); }`).join(" ")}</style>`;
  const sw = `<div class="row" style="gap:12px;flex-wrap:wrap"><span class="card-note">Show the account as</span><span class="seg">${SIMPLE.map((o) => `<label for="${prefix}-obj-${o.k}" class="seg-i" style="cursor:pointer">${o.n} · ${o.name}</label>`).join("")}</span></div>`;
  const objArea = SIMPLE.map((o) => `<div class="ot ot-${o.k}">${panes((f) => `<div class="objin" style="display:flex;justify-content:center;align-items:center">${Z2.objFor(o, f.id, { allMode: O2.allBand, z: Math.min(1.25, 260 / o.h, 430 / o.w) })}</div>`)}</div>`).join("");
  const pk = P.picker(prefix, Z1.heroSel, "all", { extraRadios: radios });
  return `${pk.css}${css}${pk.open}${sw}${Z2.hero(prefix, SIMPLE[0], { allMode: O2.allBand, objArea })}${pk.close}`;
}

// ---------- Each object on a stage; one row of chips recolours them all ----------
const V = "z3v";
const chipSel = (dsel, id) => `${dsel} .stg-${id} { opacity: 1; } ${dsel} .vch-${id} { background: white; color: ${ink(id)}; border-color: transparent; box-shadow: 0 6px 16px oklch(0 0 0 / 0.18); }`;
const chips = () => `<div class="row" style="gap:8px;flex-wrap:wrap"><span class="card-note" style="margin-right:4px">Try them with</span>${IDS.map((id) => { const f = FACTS[id]; return `<label for="${V}-sel-${id}" class="chip vch-${id}" style="cursor:pointer;padding:7px 13px 7px 7px;gap:8px;background:var(--surface);border:1px solid var(--surface-line);transition:background 200ms, color 200ms">${monoOf(id, 20)}${f.all ? "All" : f.name}${f.on ? "" : "<em>closed</em>"}</label>`; }).join("")}</div>`;
function stageBox(o, h = 330) {
  const z = Math.min(1.3, (h - 60) / o.h, 600 / o.w);
  return `<div class="textured stage-dark" style="position:relative;isolation:isolate;overflow:hidden;border-radius:22px;height:${h}px;background:${P.GREEN_BG};display:flex;align-items:center;justify-content:center">${layers()}${rings(760, h, { stroke: "var(--rings-light)", opacity: 0.05, first: 60, step: 34 })}${panes((f) => `<div class="objin" style="display:flex;justify-content:center">${f.all ? O2.allBand(o, 600, h - 40) : O.fit(O.objectOf(o, O.acctOf(f.id)), o.w, o.h, z)}</div>`)}</div>`;
}
const variant = (o) => `<div style="display:flex;flex-direction:column;gap:10px;min-width:0"><div class="row" style="gap:10px;align-items:flex-start"><span class="pill pill-ink" style="font-size:12px;padding:4px 10px;flex-shrink:0">${o.n}</span><span><b style="font-size:15px">${o.name}</b><span class="card-note" style="display:block;margin-top:2px;font-size:12.5px">${o.blurb}</span></span></div>${stageBox(o)}</div>`;
/** Every account side by side, on the page: how each object reads as a set. */
function lineup(o) {
  const z = Math.min(1, 150 / o.w, 160 / o.h);
  return `<div style="display:flex;gap:18px;align-items:center;justify-content:center;flex-wrap:wrap;padding:18px 8px 4px">${IDS.filter((id) => id !== "all").map((id) => O.fit(O.objectOf(o, O.acctOf(id)), o.w, o.h, z)).join("")}</div>`;
}
const note = `<div class="card glass" style="gap:12px;padding:20px 22px"><b style="font-size:15px">Every account, side by side</b><p class="card-note" style="font-size:12.5px">How each object reads as a set, in the menu's order. Stale ones are stamped; the closed one is grey.</p><div class="spread" style="gap:6px">${SIMPLE.map((o) => `<div><span class="pill pill-off" style="font-size:10.5px">${o.n} · ${o.name}</span>${lineup(o)}</div>`).join("")}</div></div>`;

const shows = `<div class="card glass" style="gap:10px;padding:20px 22px;align-self:stretch"><b style="font-size:15px">What each one shows</b><div class="spread" style="gap:0">${[["B1 Monogram tile", "Initial, name, last 4"], ["B2 Passbook, quiet", "Initial, name, last 4"], ["B3 Envelope", "Initial, name, bank, last 4"], ["B4 Note bundle", "Initial, name, last 4"], ["B5 Nameplate", "Name, bank, last 4"], ["B6 Key card", "Initial, name, last 4, bank"], ["B7 Stamp", "Initial, name, bank, last 4"]].map(([k, v]) => `<div style="display:grid;grid-template-columns:170px 1fr;gap:12px;padding:8px 0;border-bottom:1px solid var(--divider);font-size:13px"><b style="font-weight:700">${k}</b><span class="muted" style="font-weight:600">${v}</span></div>`).join("")}</div><p class="card-note">None shows the balance: the hero's figure already does. Every one has a closed (grey, stamped) and a stale (amber stamp) look, and an All version in green with the colour band.</p></div>`;
export function z3Board() {
  const intro = `<div class="card glass" style="gap:10px;padding:20px 22px"><b style="font-size:15px">This round</b><p class="card-note" style="font-size:13.5px;line-height:1.6;max-width:1180px">The cheque was too much, so here are seven simpler ones, B1 to B7. Each is symmetrical and carries little text: the bank's initial, the account's name, the last 4, sometimes the bank. Try them in the hero with the switch above it, and pick a bank from its dropdown; the stage takes the bank's colour as before. All is each object's own green version with the colour band under it (A4). Below, each one on its own stage, with chips to recolour them all at once.</p></div>`;
  const pk = P.picker(V, chipSel);
  const stages = `${pk.css}${pk.open}${section("B", "Seven simpler objects", "One row of chips recolours every stage below.", `${chips()}${grid("1fr 1fr", [...SIMPLE.map(variant), shows], 22)}`)}${pk.close}`;
  return board({ w: 1600, title: "Bank objects, simpler", sub: "Seven new objects for an account, quieter than the cheque. Sample data, made up; the last 4 digits are made up too.", body: `${C.DEFS()}${ANIM}${intro}${section("Z1", "In the hero", "Switch the object, then pick a bank from the dropdown.", liveHero())}${stages}${section("Set", "Side by side", "", note)}` });
}

export function z3PhoneBoard() {
  const picks = [SIMPLE[0], SIMPLE[1], SIMPLE[2], SIMPLE[4]];
  const phoneFrame = (o, i) => frame(`${o.n} · ${o.name}`, `<div class="chai-app ph" style="width:390px;height:auto;padding-bottom:16px"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${I.menu()}</span></header><div class="ph-body" style="padding-bottom:12px">${(() => { const prefix = `z3p${i}`, pk = P.picker(prefix, Z1.heroSel); return `${pk.css}${pk.open}${Z2.hero(prefix, o, { ph: true, allMode: O2.allBand })}${pk.close}`; })()}</div></div>`);
  return board({ w: 1800, title: "The simpler objects on a phone", sub: "A thumbnail beside the figure, as last round.", body: `${C.DEFS()}${ANIM}${grid("repeat(4, 390px)", picks.map(phoneFrame), 40)}` });
}
