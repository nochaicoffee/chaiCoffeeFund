// Round 7 (2026-10-21): Z1, Prathik's pick, with his two changes.
// 1. Picking a bank turns the whole stage its colour, as on the other dashboards (green stays for All). The line stays white.
// 2. An account object in the hero, the way Cards has card tiles and Subscriptions has covers: six options
//    (objects.mjs), each shown in the hero, for every account, and as the live preview in Add account.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as D5 from "./dirs5.mjs";
import * as Z from "./zsel.mjs";
import * as Y from "./ysel.mjs";
import * as F from "./forms.mjs";
import * as O from "./objects.mjs";
import { board, section, frame, grid } from "./board.mjs";
const { inr, inrS, fmt, I, btn, rings, grad, select } = L;
const { IDS, FACTS, panes, greenStage } = P;
const { statRow, heroActions, whiteLine } = D5;
const { monoOf, ink } = Y;

const stageBg = (id) => `radial-gradient(circle at 50% -10%, oklch(1 0 0 / 0.18), transparent 55%), linear-gradient(165deg, var(--card-${P.hue(id)}-from), var(--card-${P.hue(id)}-to))`;
const ANIM = `<style>.objin { animation: obj-in 560ms cubic-bezier(0.2, 0.9, 0.3, 1.15) both; } @keyframes obj-in { from { opacity: 0; transform: translateY(16px) rotate(-4deg) scale(0.94); } } @media (prefers-reduced-motion: reduce) { .objin { animation: none; } } .board .sec-n { width: auto; padding: 0 9px; border-radius: 999px; } .board details.sel[open] { z-index: 60; }</style>`;

export function dropdown(prefix, { ph = false } = {}) {
  const trigger = panes((f) => `<span class="row" style="gap:10px">${monoOf(f.id, ph ? 24 : 30)}<b style="font-size:${ph ? 17 : 22}px;font-weight:800">${f.all ? "All accounts" : f.name}</b><span style="display:flex;opacity:0.8">${Z.chev(ph ? 13 : 16)}</span></span>`, {}, { style: "display:inherit" }).replace(/class="hp hp-/g, 'class="hp hpi hp-');
  return `<details class="sel" style="display:inline-block;position:relative"><summary style="list-style:none;cursor:pointer;display:inline-flex;align-items:center;padding:${ph ? "7px 12px 7px 8px" : "8px 16px 8px 10px"};border-radius:999px;background:oklch(1 0 0 / 0.14);border:1px solid oklch(1 0 0 / 0.28)">${trigger}</summary><div style="position:absolute;z-index:40;top:calc(100% + 10px);left:0">${Z.menu(`<div style="padding:6px 6px 8px">${Z.searchBox("", { ph })}</div><div class="lb" style="max-height:${ph ? 300 : 380}px">${Z.groupedOptions(Z.liveList, { prefix, allBalance: L.TOTAL })}</div><div class="lb-divider"></div><div class="opt" style="color:var(--accent-text)">${I.plus(12)}<span class="opt-label">Add account</span></div>`, { w: ph ? 320 : 380 })}</div></details>`;
}
/** Z1's hero with the stage in the pick's colour and the object `o` beside the figure. */
export function hero(prefix, o, { ph = false } = {}) {
  const layers = IDS.filter((id) => id !== "all").map((id) => `<span class="stg stg-${id}" style="background:${stageBg(id)}"></span>`).join("");
  const z = ph ? Math.min(0.78, 230 / o.w) : o.z;
  const obj = panes((f) => `<div class="objin" style="display:flex;justify-content:center;align-items:flex-end">${O.fit(O.pick(o, f.id), o.w, o.h, z)}</div>`);
  const figure = panes((f) => `<b style="display:block;font-size:${ph ? 44 : 76}px;font-weight:800;letter-spacing:-0.02em;line-height:1.05">${f.on ? inr(f.balance) : "₹0"}</b>`);
  const when = panes((f) => `<span style="font-size:${ph ? 13 : 14}px;font-weight:700;color:var(--muted)">${P.whenLine(f)}</span>`);
  const left = `<div style="display:flex;flex-direction:column;gap:${ph ? 10 : 14}px;min-width:0"><span class="eyebrow">Your balance</span>${figure}<div class="row" style="gap:12px;flex-wrap:wrap"><span style="font-size:${ph ? 16 : 20}px;font-weight:700;color:var(--muted)">in</span>${dropdown(prefix, { ph })}</div>${when}<div style="margin-top:${ph ? 2 : 6}px">${panes((f) => heroActions(f))}</div></div>`;
  const right = `<div style="display:flex;justify-content:center;align-items:flex-end;padding:${ph ? "4px 0 6px" : "10px 10px 0"};min-height:${(o.h * z + 20).toFixed(0)}px">${obj}</div>`;
  const top = ph ? `${right}${left}` : `<div style="display:grid;grid-template-columns:minmax(0,1fr) 460px;gap:24px;align-items:end">${left}${right}</div>`;
  const line = panes((f) => whiteLine(f, { w: ph ? 330 : 1440, h: ph ? 140 : 200, ph, key: prefix, mono: true }));
  return greenStage(`${layers}<div class="gpick" style="display:flex;flex-direction:column;gap:${ph ? 14 : 20}px">${top}${line}${panes((f) => statRow(f, { ph }))}</div>`, { ph, pad: ph ? "18px 14px" : "30px 32px" });
}
export const heroSel = (dsel, id) => `${dsel} .stg-${id} { opacity: 1; } ${dsel} .hpi { display: none; } ${dsel} .hpi.hp-${id} { display: inline-flex; } ${Z.optSel(dsel, id)} ${dsel} .gpick .btn-primary { background: white; color: ${ink(id)}; }`;
const block = (prefix, o, opts = {}) => { const pk = P.picker(prefix, heroSel); return `${pk.css}${pk.open}${hero(prefix, o, opts)}${pk.close}`; };

/** Every account as the object, on the page, with All's pile first. */
function strip(o) {
  const z = Math.min(1, 178 / o.w);
  const items = ["all", ...IDS.filter((id) => id !== "all")].map((id) => `<div style="display:flex;flex-direction:column;align-items:center;gap:18px">${O.fit(O.pick(o, id), o.w, o.h, z)}<span style="font-size:12px;font-weight:700;color:var(--muted)">${id === "all" ? "All, on top of the pile" : FACTS[id].on ? (FACTS[id].stale ? "Not read lately" : FACTS[id].name) : "Closed"}</span></div>`).join("");
  return `<div><div class="frame-l">Every account as ${/^[aeiou]/i.test(o.name) ? "an" : "a"} ${o.name.toLowerCase()}</div><div style="display:flex;gap:30px;align-items:flex-end;padding:18px 18px 6px">${items}</div></div>`;
}
export function z1Board() {
  const intro = `<div class="card glass" style="gap:10px;padding:20px 22px"><b style="font-size:15px">What changed from Z1</b><p class="card-note" style="font-size:13.5px;line-height:1.6;max-width:1150px"><b style="color:var(--fg)">The stage takes the bank's colour.</b> Pick HDFC Salary and the whole hero turns sapphire, Kotak ruby, and so on, fading over 650ms, as the Cards details card and the Subscriptions hero do. All stays green, and the line stays white for every pick. <b style="color:var(--fg)">The account now has an object</b>, like a card tile or a subscription cover: six ideas below, O1 to O6. Each shows in the hero, for every account (All is its own object on a little pile of the others, so it holds any number), and as the live preview in Add account (the Add account tab). Each object shows the last 4 of the account number, a new optional field (decision 12).</p></div>`;
  const body = O.OBJECTS.map((o) => section(o.n, `Z1 with ${/^[aeiou]/i.test(o.name) ? "an" : "a"} ${o.name.toLowerCase()}`, o.blurb, `${block(`z1${o.k}`, o)}${strip(o)}`)).join("");
  return board({ w: 1600, title: "Z1: the stage in the bank's colour, and an account object", sub: "Pick a bank from the dropdown in each hero: the stage changes colour and the object changes with it. Sample data, made up; the last 4 digits are made up too.", body: `${C.DEFS()}${ANIM}${intro}${body}` });
}

// ---------- Add account, with the object as its live preview ----------
function addDialog(o) {
  const z = Math.min(1, 250 / o.w);
  const preview = `<span class="pv-k">Live preview</span><div style="display:flex;justify-content:center;padding:16px 0 10px">${O.fit(O.objectOf(o, O.NEW_ACCT), o.w, o.h, z)}</div><div class="pv-box"><div class="between"><span>Your accounts hold now</span><span>${inr(L.TOTAL)}</span></div><div class="between"><span>With this one</span><span><b style="color:var(--accent-text)">${inr(L.TOTAL + 38200)}</b></span></div></div>`;
  const fields = [
    F.fld(`${F.lbl("Name", { req: true })}${F.inp("IDFC Travel")}`, true),
    F.fld(`${F.lbl("Bank", { req: true })}${select({ value: "IDFC FIRST Bank", kind: "field", options: F.bankOptions("IDFC FIRST Bank") })}`),
    F.fld(`${F.lbl("Type", { req: true })}${F.fseg(["Savings", "Current"], "Savings")}`),
    F.fld(`${F.lbl("Last 4 digits", { opt: true, isNew: true })}${F.inp("3390", { cls: "focus", caret: true })}${F.help(`Shown on its ${o.name.toLowerCase()}. Never the full number.`)}`),
    F.fld(`${F.lbl("Purpose", { req: true })}${select({ value: "Spending", kind: "field" })}`),
    F.fld(`${F.lbl("Colour", { isNew: true })}${F.swatches("sapphire")}`, true),
    F.fld(`${F.lbl("Balance today", { opt: true })}${F.inp("38,200", { pre: "₹" })}`),
    F.fld(`${F.lbl("Opened on", { req: true })}${F.dateInp("Mar 12, 2024")}`),
  ].join("");
  return F.dialog({ title: "Add account", sub: `Fill it in and watch its ${o.name.toLowerCase()} appear`, preview, fields, note: "", actions: `${btn("Cancel", { kind: "soft" })}${btn("Add account", { kind: "primary" })}`, w: 742 });
}
export function z1FormsBoard() {
  const items = O.OBJECTS.map((o) => frame(`${o.n} · ${o.name}`, `<div class="stage" style="padding:22px;display:flex;justify-content:center">${addDialog(o)}</div>`));
  return board({ w: 1600, title: "Add account, with the object as its preview", sub: "As on Cards and Subscriptions, the form's left side draws the thing you're adding, filling in as you type: its name, bank, type and last 4, in the colour you pick. The new field is Last 4 digits (optional); Colour was already proposed.", body: `${C.DEFS()}${grid("742px 742px", items, 20)}` });
}

export function z1PhoneBoard() {
  const phoneFrame = (o) => frame(`${o.n} · ${o.name}`, `<div class="chai-app ph" style="width:390px;height:auto;padding-bottom:16px"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${I.menu()}</span></header><div class="ph-body" style="padding-bottom:12px">${block(`z1${o.k}p`, o, { ph: true })}</div></div>`);
  return board({ w: 1800, title: "Z1 with an account object, on a phone", sub: "The object sits above the figure. The stage still takes the bank's colour.", body: `${C.DEFS()}${ANIM}${grid("repeat(4, 390px)", O.OBJECTS.map(phoneFrame), 40)}` });
}
