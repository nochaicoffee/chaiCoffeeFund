// Round 6 (2026-11-25): quick entry (Q1 to Q4), category limits (L1 to L3), and the all-spends page (G1 to G4), on desktop and a phone.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as R from "./parts-r2.mjs";
import * as X from "./parts-r4.mjs";
import * as U from "./parts-r5.mjs";
import * as K from "./parts-r6.mjs";
import * as QA from "./parts-r3.mjs";
import * as E from "./data-r6.mjs";
const { I, inr } = L;
const m = D.NOVM;

const label = (code, name, note) => `<div class="sec"><div class="sec-t"><h2>${code} · ${name}</h2><small>${note}</small></div>${P.sampleTag()}</div>`;
const grid = (...cols) => `<div class="g12">${cols.map(([span, html]) => `<div style="grid-column:span ${span}">${html}</div>`).join("")}</div>`;
const sp = (html) => `<div class="under">${html}</div>`;

// ---------- Quick entry ----------
const Q = {
  q1: ["Q1", "Often row", "an Often row on quick add: one tap adds a regular spend to today as it was. Cash joins UPI and credit card", K.q1],
  q2: ["Q2", "Type-ahead", "type in What it was and your own notes come up with their usual amount, method and category", K.q2],
  q3: ["Q3", "Repeats", "a Due today strip for chai, the gym, the maid: offered, never written until you tap Add", K.q3],
};
export const quick = (key) => () => { const [c, n, note, card] = Q[key]; return P.page(`${label(c, n, note)}${K.heroWith(card())}`); };
/** Q4: cash across the page (calendar dots, legend, a three-way split, the tiles). */
export const q4 = () => P.page(`${label("Q4", "Cash across the page", "a third method: its dot on the calendar, a third tile, and How you paid in place of UPI vs credit card")}${grid([12, P.card(`${P.cardHead("The calendar", "Mon 2 to Sun 15 Nov", "")}${K.cashWeek()}${K.legend3()}<p class="card-note foot">A day shows a dot for each way it was paid. Cash is green.</p>`)])}${K.methodTiles()}${grid([5, P.card(K.howYouPaid())], [7, P.card(`${P.cardHead("In the form", "Paid with has three choices", "")}<div class="fld"><span class="fl">Paid with</span>${K.seg3("Cash")}</div><div class="fld"><span class="fl">Category <small>optional</small></span>${QA.catRow("Other")}</div><div class="fld"><span class="fl">What it was <small>optional</small></span><span class="inp"><span>Barber</span></span></div><p class="card-note foot">Cash only changes the Paid with choices, the dots and the split. The limit, the pace and every other figure count it like any spend.</p>`)])}`);
const phoneScreen = ({ content, bar = "", overlay = "", scrollY = 0 }) => R.screen({ stripHtml: "", content, bar, scrollY, overlay });
const heroPhone = () => `<section class="hero hero4"><div class="hero-main"><div class="hero-l"><div class="hero-hd4">${X.head4()}</div>${P.monthNav(m)}${P.calendar(m, { sel: D.TODAY, compact: true })}${K.legend3()}</div></div></section>`;
export const quickPhone = (key) => () => {
  if (key === "q1") return phoneScreen({ content: `${label("Q1", "Often row", "")}${heroPhone()}`, bar: K.qbar3() });
  if (key === "q2") return phoneScreen({ content: `${label("Q2", "Type-ahead", "")}${heroPhone()}`, bar: K.qbar3({ often: false }), overlay: K.sheetSuggest() });
  return phoneScreen({ content: `${label("Q3", "Repeats", "")}${K.dueToday()}${heroPhone()}`, bar: K.qbar3({ amount: "40", often: false }), overlay: "" });
};
export const q3sheetPhone = () => phoneScreen({ content: `${label("Q3", "Repeats: the sheet", "")}${heroPhone()}`, bar: K.qbar3({ often: false }), overlay: K.sheetRepeat() });

// ---------- Category limits ----------
const lower = (kind) => {
  const strip = sp(U.s2());
  if (kind === "l1") return `${strip}${K.needsLook()}${grid([7, P.card(K.whereLimits())], [5, P.card(K.latestSpends(8))])}`;
  return `${strip}${K.needsLook()}${P.card(`${P.cardHead("Where November went", "an envelope for each category · tap one to see its spends", `<span class="btn btn-ghost btn-sm">${I.pencil(12)} Edit limits</span>`)}${K.envelopes()}<p class="card-note foot">${inr(D.LIMIT - E.GIVEN)} of your ${inr(D.LIMIT)} isn't given to a category.</p>`)}${grid([5, P.card(K.latestSpends())], [7, P.card(P.monthsCard(D.NOV))])}`;
};
const L_ = {
  l1: ["L1", "Limits inside Where it went", "each category's bar is its limit, 80% ticked; a nudge above; Latest spends and a way into the full list beside it"],
  l2: ["L2", "Envelopes", "a tile per category with a ring, what's left and last month's figure; categories without a limit invite you to set one"],
};
export const limits = (key) => () => { const [c, n, note] = L_[key]; return P.page(`${label(c, n, note)}${lower(key)}`); };
/** L3: the limits dialog over the page (the hero is left out; the dialog is the point). */
export const l3 = () => P.page(`${label("L3", "Setting the limits", "from Edit limits: the monthly limit first, then a box and a switch per category, and what isn't given out")}<div class="dlg-wrap">${K.limitsDialog()}</div>`);
export const limitsPhone = (key) => () => {
  if (key === "l1") return phoneScreen({ content: `${label("L1", "Limits inside Where it went", "")}${K.needsLook()}<section class="card glass" style="gap:14px">${K.whereLimitsPhone()}</section>` });
  if (key === "l2") return phoneScreen({ content: `${label("L2", "Envelopes", "")}${K.needsLook()}<section class="card glass" style="gap:14px">${P.cardHead("Where November went", "an envelope per category")}${K.envelopes({ cols: 2 })}</section>` });
  return phoneScreen({ content: `${label("L3", "Setting the limits", "")}<section class="card glass" style="gap:14px">${K.whereLimitsPhone()}</section>`, overlay: K.limitsDialog({ phone: true }) });
};

// ---------- The all-spends page ----------
const G_ = {
  g1: ["G1", "Ledger", "month groups, a day under each with its total, a row per spend; search and filters on top; the way Income's Entries and Cards' Statements do it"],
  g2: ["G2", "Table", "one dense table you can sort, with a pager: the quickest to scan a lot of spends, the least like the diary"],
  g3: ["G3", "A category's page", "from Where it went: this month against last (the same point and the whole month), its limit, its weekdays, then its spends"],
  g4: ["G4", "No results", "a search with nothing found, and what the filters in force look like"],
};
const page = (...parts) => P.page(parts.join(""));
export const g1 = () => page(label(...G_.g1.slice(0, 3)), K.entriesHeader(), K.spendTiles(E.NOV_ALL), P.card(`${K.toolbar({ count: "26 spends" })}<div class="er-l">${K.ledger(E.NOV_ALL.slice(0, 16), { hover: "s20" })}</div><div class="er-more">${I.down(12)} Show earlier days · 10 more spends in November</div>`, { gap: 12 }));
export const g2 = () => page(label(...G_.g2.slice(0, 3)), K.entriesHeader(), K.spendTiles(E.NOV_ALL), P.card(`${K.toolbar({ count: "26 spends" })}${K.table(E.NOV_ALL.slice(0, 12))}${K.pager(1, 12, 26)}`, { gap: 12 }));
export const g3 = () => page(label(...G_.g3.slice(0, 3)), K.entriesHeader({ title: "Food", eyebrow: "Daily · All spends · Food" }), K.categoryFacts(), P.card(`${K.toolbar({ category: "Food", chips: ["Food"], count: "12 spends" })}<div class="er-l">${K.ledger(E.FOOD.list, { cat: false })}</div>`, { gap: 12 }));
export const g4 = () => page(label(...G_.g4.slice(0, 3)), K.entriesHeader(), P.card(`${K.toolbar({ q: "biryani", method: "Card", amount: "Over ₹500", chips: ["Credit card", "Over ₹500"], count: "0 of 26" })}${K.emptyResults()}`, { gap: 12 }));
export const entriesPhone = (key) => () => {
  const head = `<header class="pg-head ph-head"><div class="pg-text"><div class="eyebrow"><span style="display:inline-flex;align-items:center;gap:6px">${I.chevL(11)}Daily · ${key === "g3" ? "Food" : "All spends"}</span></div><h1>${key === "g3" ? "Food" : "All spends"}</h1></div></header>`;
  const pickers = `<div class="tb tb-ph"><span class="srch">${I.search(14)}<span class="ph-t">Search spends</span></span>${L.iconBtn(I.pie(15), "Filters")}</div><div class="chips-r">${key === "g3" ? `<span class="fchip">Food${I.x(10)}</span>` : ""}<span class="fchip on">Nov 2026 ${I.chev(10)}</span><span class="fchip">All paid ${I.chev(10)}</span></div>`;
  if (key === "g1") return L.phone({ h: "auto", body: `${label("G1", "Ledger", "")}${head}${pickers}<section class="card glass" style="gap:6px"><div class="er-ph-sum"><b>${inr(m.total)}</b><small>26 spends · November</small></div><div class="er-l er-ph">${K.ledger(E.NOV_ALL.slice(0, 11), { monthHead: false })}</div></section>` });
  return L.phone({ h: "auto", body: `${label("G3", "A category's page", "")}${head}${pickers}<div class="cf cf-ph">${K.categoryFacts().replace(/<div class="cf">/, "").replace(/<\/div>$/, "")}</div><section class="card glass" style="gap:6px"><div class="er-l er-ph">${K.ledger(E.FOOD.list.slice(0, 7), { monthHead: false, cat: false })}</div></section>` });
};
