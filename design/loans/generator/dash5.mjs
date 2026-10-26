// Round 4: variations to pick from (2026-10-25), after Prathik liked the tiles cover but not the rings or the green and orange.
//   Rings    five ways to show how much of each loan is repaid (the circle did not look good), on the dark cover, following the pick
//   Palettes six principal-and-interest colour combinations on the same monthly chart, following the pick where it says so
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as N from "./nwidgets.mjs";
const { boardFrame, coverPanel, payoff, RING_KINDS } = N;
const pickerPills = () => N.pickerPills({ light: true });
const head = (t, p) => `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>${t}</h2>${L.sampleTag(". Today is Oct 25, 2026")}</div><p>${p}</p></div>`;

export function ringsBoard() {
  const panels = RING_KINDS.map(([k, t], i) => `<div style="display:flex;flex-direction:column;gap:10px"><div class="row" style="gap:10px"><span class="sec-n">R${i + 1}</span><b style="font-size:15px">${t}</b></div>${coverPanel(payoff(k, { bare: true }), { pad: 26, extra: "flex:1;justify-content:center;" })}</div>`).join("");
  const note = `<div style="display:flex;flex-direction:column;gap:10px"><div class="row" style="gap:10px"><span class="sec-n">?</span><b style="font-size:15px">What the widget answers</b></div><div class="card glass" style="flex:1;gap:10px;justify-content:center"><p style="font-size:14px;line-height:1.7;margin:0">How much of each loan is <b>repaid</b> (principal), how far through its <b>term</b> it is, and what's <b>still owed</b>. R1, R2 and R5 draw it as arcs; R3 shows the <b>share of what you owe</b> instead (the Home loan is 83% of it); R4 drops the circle for capsules.</p><p style="font-size:13px;color:var(--muted);margin:0">Pick a loan in the pills above: each one fades the others and the cover takes the loan's colour. All of them sit in the cover as an equal half beside the EMI cliffs.</p></div></div>`;
  return boardFrame({ w: 1500, body: `${head("Payoff widget: five ways to draw it", "The rings were crowded: labels over the arcs, dots that needed explaining, a bright grey track. Each of these keeps the same numbers on a clearer shape. Pick a loan below to try the cover's colour.")}${pickerPills()}<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:stretch">${panels}${note}</div>` });
}

const PALETTES = [
  ["Ink and amber", "Graphite principal, amber interest: the loudest contrast.", "--c-prin: oklch(0.32 0.03 260); --c-int: oklch(0.8 0.15 78);"],
  ["Sapphire and coral", "Cool principal, warm interest, both saturated.", "--c-prin: oklch(0.5 0.13 258); --c-int: oklch(0.72 0.15 28);"],
  ["Follows the loan", "Principal in the picked loan's colour, interest its tint. Changes with the pick (the default now).", ""],
  ["Teal and sand", "Calm: a deep teal and a warm sand.", "--c-prin: oklch(0.5 0.09 200); --c-int: oklch(0.86 0.07 85);"],
  ["Violet and lime", "Playful: violet principal, lime interest.", "--c-prin: oklch(0.5 0.15 300); --c-int: oklch(0.86 0.17 128);"],
  ["Solid and outline", "Principal solid, interest a dashed outline: the cost reads as something extra.", "--c-prin: oklch(0.42 0.11 155); --c-int: oklch(0.6 0.14 60);"],
];
export function palettesBoard() {
  const cards = PALETTES.map(([t, d, vars], i) => {
    const bar = `<div class="split" style="height:26px"><span class="rt" style="width:24%;background:var(--c-prin)"></span><span class="rt ${i === 5 ? "" : ""}" style="width:76%;background:var(--c-int)"></span></div>`;
    return `<div class="${i === 5 ? "pal-outline" : ""}" style="${vars}display:flex;flex-direction:column">${P.card(`<div class="card-h"><div class="card-t"><span class="sec-n" style="display:inline-flex;margin-right:8px">P${i + 1}</span>${t}</div>${N.splitLegend}</div><div class="card-note" style="margin-top:-6px">${d}</div>${N.splitBlockHtml("all", "m", { minH: 210 })}<div style="display:flex;flex-direction:column;gap:6px"><div class="hk">An EMI split, same colours</div>${i === 5 ? `<div class="split" style="height:26px"><span class="rt" style="width:24%;background:var(--c-prin)"></span><span style="width:76%;background:color-mix(in oklch,var(--c-int) 14%,transparent);border:1.5px dashed var(--c-int)"></span></div>` : bar}<div class="between" style="font-size:11.5px;font-weight:600;color:var(--muted)"><span>Principal ₹5,814</span><span>Interest ₹18,841</span></div></div>`, { gap: 14, cls: "nw", style: "flex:1" })}</div>`;
  }).join("");
  return boardFrame({ w: 1500, body: `${head("Principal and interest: six colour pairs", "The same monthly chart (every EMI of every loan, 12 months back and 12 ahead) in six palettes, each with an EMI split below it. Pick a loan in the pills to see P3 change. Past months are solid, future ones lighter.")}${pickerPills()}<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:stretch">${cards}</div>` });
}

export function gaugeBoard() {
  const cards = N.LOAD_KINDS.map(([k, t], i) => `<div style="display:flex;flex-direction:column;gap:10px"><div class="row" style="gap:10px"><span class="sec-n">G${i + 1}</span><b style="font-size:15px">${t}</b></div><div style="flex:1;display:flex;flex-direction:column">${N.load(k)}</div></div>`).join("");
  const note = `<div style="display:flex;flex-direction:column;gap:10px"><div class="row" style="gap:10px"><span class="sec-n">?</span><b style="font-size:15px">What the widget answers</b></div><div class="card glass" style="flex:1;gap:10px;justify-content:center"><p style="font-size:14px;line-height:1.7;margin:0">How much of your salary the EMIs take, <b>which loan takes how much</b>, and what's left. G1 and G5 show the salary split by loan; G2 does it as 100 squares; G3 keeps a dial but drops the red, yellow and green blocks for one accent and shaded zones; G4 shows how the share <b>falls as each loan ends</b>.</p><p style="font-size:14px;line-height:1.7;margin:0"><b>My pick: G1.</b> It reads at a glance, shows which loan takes how much, follows the pick and uses the page\'s own colours; G4 is the one to add if you want to see the load fall.</p><p style="font-size:13px;color:var(--muted);margin:0">All of them follow the loan you pick in the pills. The 30% and 40% marks and the salary (Income's sample) are placeholders to decide on. Each sits in an equal half like the other widgets.</p></div></div>`;
  return boardFrame({ w: 1500, cls: "pal-outline", body: `${head("EMI load: five ways to draw it", "The dial's red, yellow and green blocks and fat needle were the wrong tone for the rest of the page. Each of these keeps the same numbers (the share of salary that goes to EMIs, by loan) in the page's own colours. Pick a loan below.")}${pickerPills()}<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:stretch">${cards}${note}</div>` });
}
