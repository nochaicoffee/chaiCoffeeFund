// Round 8 boards (2026-10-21): the object variants on stages that take the picked bank's colour, five ways to
// show All without a pile, one live Z1 hero with the filled cheque, and a compact phone layout (a small object).
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as D5 from "./dirs5.mjs";
import * as Y from "./ysel.mjs";
import * as Z1 from "./z1.mjs";
import * as O from "./objects.mjs";
import * as O2 from "./objects2.mjs";
import { board, section, frame, grid } from "./board.mjs";
const { inr, I, rings } = L;
const { IDS, FACTS, panes, greenStage } = P;
const { statRow, heroActions, whiteLine } = D5;
const { monoOf, ink } = Y;

const stageBg = (id) => `radial-gradient(circle at 50% -10%, oklch(1 0 0 / 0.18), transparent 55%), linear-gradient(165deg, var(--card-${P.hue(id)}-from), var(--card-${P.hue(id)}-to))`;
const layers = () => IDS.filter((id) => id !== "all").map((id) => `<span class="stg stg-${id}" style="background:${stageBg(id)}"></span>`).join("");
const ANIM = `<style>.objin { animation: obj-in 560ms cubic-bezier(0.2, 0.9, 0.3, 1.15) both; } @keyframes obj-in { from { opacity: 0; transform: translateY(14px) scale(0.95); } } @media (prefers-reduced-motion: reduce) { .objin { animation: none; } } .board .sec-n { width: auto; padding: 0 9px; border-radius: 999px; } .board details.sel[open] { z-index: 60; }</style>`;
export const objFor = (o, id, { allMode = O2.allSingle, bw = 440, bh = 270, z } = {}) => (id === "all" ? allMode(o, bw, bh) : O.fit(O.objectOf(o, O.acctOf(id)), o.w, o.h, z ?? Math.min(1.2, bh / o.h, bw / o.w)));

// ---------- The live hero: Z1, with an object and an All mode ----------
export function hero(prefix, o, { ph = false, allMode = O2.allRow, objArea = null } = {}) {
  const figure = panes((f) => `<b style="display:block;font-size:${ph ? 36 : 76}px;font-weight:800;letter-spacing:-0.02em;line-height:1.05">${f.on ? inr(f.balance) : "₹0"}</b>`);
  const when = panes((f) => `<span style="font-size:${ph ? 12.5 : 14}px;font-weight:700;color:var(--muted)">${P.whenLine(f)}</span>`);
  const line = panes((f) => whiteLine(f, { w: ph ? 330 : 1440, h: ph ? 120 : 200, ph, key: prefix, mono: true }));
  if (ph) {
    // On a phone the object shrinks to a thumbnail beside the figure, so the hero stays short.
    const thumb = panes((f) => `<div class="objin">${f.all ? O2.allSingle(o, 74, 84) : O.fit(O.objectOf(o, O.acctOf(f.id)), o.w, o.h, Math.min(84 / o.h, 96 / o.w))}</div>`);
    return greenStage(`${layers()}<div class="gpick" style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;align-items:center;gap:12px">${thumb}<div style="min-width:0"><span class="eyebrow">Your balance</span>${figure}</div></div><div class="row" style="gap:10px;flex-wrap:wrap"><span style="font-size:15px;font-weight:700;color:var(--muted)">in</span>${Z1.dropdown(prefix, { ph })}</div>${when}${panes((f) => heroActions(f))}${line}${panes((f) => statRow(f, { ph }))}</div>`, { ph, pad: "16px 14px" });
  }
  const obj = objArea ?? panes((f) => `<div class="objin" style="display:flex;justify-content:center;align-items:center">${objFor(o, f.id, { allMode, z: o.w > 300 ? 1.15 : 1.15 })}</div>`);
  const left = `<div style="display:flex;flex-direction:column;gap:14px;min-width:0"><span class="eyebrow">Your balance</span>${figure}<div class="row" style="gap:12px;flex-wrap:wrap"><span style="font-size:20px;font-weight:700;color:var(--muted)">in</span>${Z1.dropdown(prefix)}</div>${when}<div style="margin-top:6px">${panes((f) => heroActions(f))}</div></div>`;
  const top = `<div style="display:grid;grid-template-columns:minmax(0,1fr) 480px;gap:24px;align-items:center">${left}<div style="display:flex;justify-content:center;align-items:center;min-height:290px">${obj}</div></div>`;
  return greenStage(`${layers()}<div class="gpick" style="display:flex;flex-direction:column;gap:20px">${top}${line}${panes((f) => statRow(f))}</div>`, { pad: "30px 32px" });
}
const block = (prefix, o, opts = {}) => { const pk = P.picker(prefix, Z1.heroSel); return `${pk.css}${pk.open}${hero(prefix, o, opts)}${pk.close}`; };

// ---------- Variant stages: one set of radios recolours every stage on the board ----------
const V = "z2v";
const chipSel = (dsel, id) => `${dsel} .stg-${id} { opacity: 1; } ${dsel} .vch-${id} { background: white; color: ${ink(id)}; border-color: transparent; box-shadow: 0 6px 16px oklch(0 0 0 / 0.18); }`;
const chips = () => `<div class="row" style="gap:8px;flex-wrap:wrap"><span class="card-note" style="margin-right:4px">Try them with</span>${IDS.map((id) => { const f = FACTS[id]; return `<label for="${V}-sel-${id}" class="chip vch-${id}" style="cursor:pointer;padding:7px 13px 7px 7px;gap:8px;background:var(--surface);border:1px solid var(--surface-line);transition:background 200ms, color 200ms">${monoOf(id, 20)}${f.all ? "All" : f.name}${f.on ? "" : "<em>closed</em>"}</label>`; }).join("")}</div>`;
function stageBox(o, { h = 320 } = {}) {
  const z = Math.min(1.25, (h - 50) / o.h, 620 / o.w);
  return `<div class="textured stage-dark" style="position:relative;isolation:isolate;overflow:hidden;border-radius:22px;height:${h}px;background:${P.GREEN_BG};display:flex;align-items:center;justify-content:center">${layers()}${rings(760, h, { stroke: "var(--rings-light)", opacity: 0.05, first: 60, step: 34 })}${panes((f) => `<div class="objin" style="display:flex;justify-content:center">${f.all ? O2.allSingle(o, 600, h - 50) : O.fit(O.objectOf(o, O.acctOf(f.id)), o.w, o.h, z)}</div>`)}</div>`;
}
const variant = (o) => `<div style="display:flex;flex-direction:column;gap:10px;min-width:0"><div class="row" style="gap:10px;align-items:flex-start"><span class="pill pill-ink" style="font-size:12px;padding:4px 10px;flex-shrink:0">${o.n}</span><span><b style="font-size:15px">${o.name}</b><span class="card-note" style="display:block;margin-top:2px;font-size:12.5px">${o.blurb}</span></span></div>${stageBox(o)}</div>`;
const note = (title, rows) => `<div class="card glass" style="gap:10px;padding:20px 22px;align-self:stretch"><b style="font-size:15px">${title}</b><div class="spread" style="gap:0">${rows.map(([k, v]) => `<div style="display:grid;grid-template-columns:120px 1fr;gap:12px;padding:7px 0;border-bottom:1px solid var(--divider);font-size:13px"><b style="font-weight:700">${k}</b><span class="muted" style="font-weight:600;line-height:1.5">${v}</span></div>`).join("")}</div></div>`;
const CHEQUE_NOTE = note("Where each field comes from", [["Date", "The date of the balance it shows (the last one you recorded)."], ["Pay", "Self, as a balance is your own money. C3 pays the account by name."], ["Rupees", "The balance in words, Indian style: Two Lakh Four Thousand Three Hundred only."], ["₹ box", "The balance in figures."], ["Signature", "Your name, written in."], ["MICR line", "A cheque number, then the last 4 of the account number."]]);
const PASS_NOTE = note("What a passbook shows", [["Cover", "The account's colour, the bank's initial in gold, the account's name and bank."], ["Number", "Only the last 4, a new optional field (decision 12)."], ["Balance", "P3, P4 and P5 put the balance on it; P2 lists the last four balances you recorded."], ["Closed", "Greyed and stamped Closed, like the others."]]);
const pairs = (items, extra) => grid("1fr 1fr", [...items.map(variant), ...(extra ? [extra] : [])], 22);

function allRow(mode) {
  const box = (o) => `<div class="textured stage-dark" style="position:relative;isolation:isolate;overflow:hidden;border-radius:22px;height:300px;background:${P.GREEN_BG};display:flex;align-items:center;justify-content:center;padding:0 20px">${rings(760, 300, { stroke: "var(--rings-light)", opacity: 0.05, first: 60, step: 34 })}${mode.render(o, 600, 250)}</div>`;
  return `<div style="display:flex;flex-direction:column;gap:10px"><div class="row" style="gap:10px;align-items:flex-start"><span class="pill pill-ink" style="font-size:12px;padding:4px 10px;flex-shrink:0">${mode.n}</span><span><b style="font-size:15px">${mode.name}</b><span class="card-note" style="display:block;margin-top:2px;font-size:12.5px">${mode.blurb}</span></span></div>${grid("1fr 1fr", [frame("With the passbook (P3)", box(O2.PASSBOOKS[2])), frame("With the cheque book (C1)", box(O2.CHEQUES[0]))], 22)}</div>`;
}

export function z2Board() {
  const intro = `<div class="card glass" style="gap:10px;padding:20px 22px"><b style="font-size:15px">This round</b><p class="card-note" style="font-size:13.5px;line-height:1.6;max-width:1180px"><b style="color:var(--fg)">Cheque book (C1–C5):</b> every field is filled in now, from the account's own figures. <b style="color:var(--fg)">Passbook (P1–P5):</b> the cover as before, plus four more. <b style="color:var(--fg)">Account card (D1–D4):</b> no gold chip, so none reads as a credit card. <b style="color:var(--fg)">All (A1–A5):</b> the pile is gone; five inline, symmetrical ways instead. Pick a bank in the chips above each group: every stage on the board turns its colour. On a phone the object is now a small thumbnail beside the figure (the Phone tab).</p></div>`;
  const pk = P.picker(V, chipSel);
  const groups = `${pk.css}${pk.open}
    ${section("C", "Cheque book, filled in", "Every field written in from the account: the date of its balance, Pay Self, the balance in words and figures, signed, with the last 4 in the MICR line.", `${chips()}${pairs(O2.CHEQUES, CHEQUE_NOTE)}`)}
    ${section("P", "Passbook", "P1 is O1 as before. P2 to P5 put more of the account on it.", `${chips()}${pairs(O2.PASSBOOKS, PASS_NOTE)}`)}
    ${section("D", "Account card, without the credit-card chip", "Still a card you can hold, but nothing that says credit card: no gold chip, no 16-digit number.", `${chips()}${pairs(O2.CARDS)}`)}${pk.close}`;
  const alls = section("A", "All, inline and symmetrical", "No pile. Each shown with the passbook and with the cheque book; all of them hold any number of accounts.", `<div style="display:flex;flex-direction:column;gap:30px">${O2.ALLS.map(allRow).join("")}</div>`);
  const live = section("Z1", "Z1 with the filled cheque (C1), All with a colour band (A4)", "One live hero to try the whole thing: pick a bank from the dropdown, and the stage, the cheque and the buttons follow.", block("z2h", O2.CHEQUES[0], { allMode: O2.allBand }));
  return board({ w: 1600, title: "Account objects, round 2", sub: "Cheques with nothing left blank, more passbooks, cards without a chip, and All without the pile. Sample data, made up; the last 4 digits and the cheque numbers are made up too.", body: `${C.DEFS()}${ANIM}${intro}${live}${groups}${alls}` });
}

export function z2PhoneBoard() {
  const picks = [[O2.CHEQUES[0], "C1 · Filled leaf"], [O2.CHEQUES[1], "C2 · Clean leaf"], [O2.PASSBOOKS[2], "P3 · Band and ribbon"], [O2.CARDS[1], "D2 · UPI card"]];
  const phoneFrame = ([o, label], i) => frame(label, `<div class="chai-app ph" style="width:390px;height:auto;padding-bottom:16px"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${I.menu()}</span></header><div class="ph-body" style="padding-bottom:12px">${block(`z2p${i}`, o, { ph: true })}</div></div>`);
  return board({ w: 1800, title: "Smaller on a phone", sub: "The object is a thumbnail beside the figure, so the hero is about half as tall as before. Pick a bank from the dropdown: the stage and the thumbnail follow.", body: `${C.DEFS()}${ANIM}${grid("repeat(4, 390px)", picks.map(phoneFrame), 40)}` });
}
