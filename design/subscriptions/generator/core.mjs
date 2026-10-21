// The pieces Prathik asked to keep in every design (2026-10-20): F's greeting header, D's cost map and C's payments table.
// The map's blocks pick a subscription, and the payments table follows the pick.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./c.mjs";
import * as D from "./d.mjs";
import * as Fd from "./f.mjs";
const { inr, fmt, fmtY, fmtSmart, mono, I, btn, iconBtn, header } = L;

export const greetingActions = () => `${L.select({ value: "This year", kind: "pill", icon: I.cal(14), align: "align-end", options: [{ label: "This year", on: true }, { label: "2025" }, { label: "All time" }] })}${btn("Record payment", { icon: I.check(12) })}${btn("Add subscription", { kind: "primary", icon: I.plus() })}`;
export const greeting = ({ phone: ph = false } = {}) => header({ eyebrow: "Subscriptions · Today", title: "Good morning, Prathik", lede: Fd.lede(), phone: ph, actions: ph ? `${btn("Add subscription", { kind: "primary", icon: I.plus() })}${btn("Record payment")}` : greetingActions() });

const IDS = ["all", ...L.SUBS.map((s) => s.id)];

/** Radios and scoped CSS so a block in the map (or a chip) picks the subscription whose payments show. */
export function picker(prefix, sel = "netflix") {
  const radios = IDS.map((id) => `<input type="radio" class="pk-in" name="${prefix}-sel" id="${prefix}-sel-${id}"${id === sel ? " checked" : ""}>`).join("") + `<input type="radio" class="pk-in" name="${prefix}-v" id="${prefix}-v-pay" checked><input type="radio" class="pk-in" name="${prefix}-v" id="${prefix}-v-hist">`;
  const d = `.${prefix}dir`;
  const css = `<style>
    ${d} .pk-in { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
    ${d} .cpay, ${d} .chist, ${d} .pname { display: none; }
    ${d} label.tm { cursor: pointer; } ${d} label.tm .tick { display: none; }
    ${d} label.tm .dtile { transition: transform 160ms var(--ease-out), box-shadow 160ms; }
    ${d} label.tm:hover .dtile { transform: translateY(-2px); }
    ${IDS.map((id) => `${d}:has(#${prefix}-sel-${id}:checked):has(#${prefix}-v-pay:checked) .cpay-${id}, ${d}:has(#${prefix}-sel-${id}:checked):has(#${prefix}-v-hist:checked) .chist-${id} { display: flex; flex-direction: column; flex: 1 1 auto; }
    ${d}:has(#${prefix}-sel-${id}:checked) .pname-${id} { display: inline-flex; }
    ${d}:has(#${prefix}-sel-${id}:checked) .tm-${id} .dtile { box-shadow: 0 0 0 2.5px var(--surface), 0 0 0 5px var(--accent); }
    ${d}:has(#${prefix}-sel-${id}:checked) .tm-${id} .tick { display: flex; }
    ${d}:has(#${prefix}-sel-${id}:checked) .off-${id} { background: var(--ink); color: var(--on-ink); }`).join("\n")}
    ${d}:has(#${prefix}-v-pay:checked) label[for="${prefix}-v-pay"], ${d}:has(#${prefix}-v-hist:checked) label[for="${prefix}-v-hist"] { background: var(--surface); color: var(--accent-text); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); }
    ${d} .pk-seg { cursor: pointer; }
  </style>`;
  return { radios, css, open: `<div class="${prefix.replace(/[^a-z0-9]/g, "")}dir ${prefix}dir" style="display:flex;flex-direction:column;gap:20px">${radios}`, close: "</div>" };
}

/** C's payments table for the picked subscription, with Payments / Price history. */
export function paymentsCard(prefix, { compact = false } = {}) {
  const names = `<span class="pname pname-all row" style="gap:8px">All subscriptions</span>${L.SUBS.map((s) => `<span class="pname pname-${s.id} row" style="gap:8px;align-items:center">${mono(s, 22)}${s.alias}</span>`).join("")}`;
  return `<section class="card glass" style="gap:12px"><div class="card-h"><span class="card-t row" style="gap:10px">Payments <span class="muted" style="font-weight:600">·</span> ${names}</span><span class="seg"><label for="${prefix}-v-pay" class="seg-i pk-seg">Payments</label><label for="${prefix}-v-hist" class="seg-i pk-seg">Price history</label></span></div>
    ${C.allPayments()}<div class="chist chist-all"><p class="card-note" style="padding:40px 0;text-align:center">Pick a subscription in the map to see what each of its payments cost.</p></div>
    ${L.SUBS.map((s) => C.paymentsPanel(s) + C.historyPanel(s).replace("w: 820", "")).join("")}
    <div class="row" style="gap:8px;padding-top:2px;margin-top:auto"><label for="${prefix}-sel-all" class="chip" style="cursor:pointer">${I.subs(11)}All subscriptions</label><span class="card-note">or pick a block in the map</span></div></section>`;
}

export const costMapCard = (prefix, opts = {}) => D.costMapCard({ pick: prefix, fluid: true, ...opts });
export const stack = (...cards) => `<div class="stack-col">${cards.join("")}</div>`;

/** The phone versions: the map isn't a picker there; tapping a block opens that subscription. */
export function phonePayments(s = L.sub("netflix")) {
  const pays = L.paymentsFor(s);
  return `<section class="card glass" style="padding:16px;gap:4px"><div class="between"><span class="card-t row" style="gap:8px">${mono(s, 22)}${s.alias} payments</span><span class="seg" style="transform:scale(0.92);transform-origin:right"><span class="seg-i on">Payments</span><span class="seg-i">Price</span></span></div>${P.paymentRows(s, 5, { phone: true })}<div class="between" style="padding-top:10px"><span class="card-note">${pays.length} payments · ${inr(L.paidSoFar(s))}</span><span class="link">All renewals ${I.arrowR()}</span></div></section>`;
}
export function phoneMap() {
  return `<section class="card glass" style="padding:14px;gap:12px"><div class="between"><span class="card-t">What each one costs</span>${L.seg([{ label: "Month", on: true }, { label: "Year" }])}</div>${D.costMap({ w: 330, h: 360, gap: 4, phone: true, hover: false })}<span class="card-note">Tap a block for its payments.</span></section>`;
}
