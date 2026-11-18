// Round 3 (2026-11-18): today's details across the top of the hero, quick add beside the calendar, the widgets outside the hero in rows that align on one grid
// ("Right now" ones fixed to this month; the rest follow a period: a year by default, a month, later a range), and adding categories.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as R from "./parts-r2.mjs";
import * as Q from "./parts-r3.mjs";
const { I, inr } = L;
const { card, cardHead, page, whereWent, monthsCard, sampleTag, proposalTag, dot } = P;
const m = D.NOVM, y = D.YEARM;
const row3 = (ws) => `<div class="g12">${ws.map((w) => `<div class="c4x">${w}</div>`).join("")}</div>`;
const dk = (inner) => `<div class="hero" style="padding:16px;border-radius:22px;display:block">${inner}</div>`;

/** Desktop, the year (the default period): the strip, the hero (details on top, quick add beside the calendar), Right now, then the year. */
export function e1() {
  return page(`${P.header({ m, actions: P.actions() })}${R.strip(m, { wide: true })}${Q.hero(m, D.TODAY)}${Q.sec("Right now", "this month, and it stays put when you change the period")}${row3(Q.nowWidgets(m))}${Q.sec("In 2026", "January to today", Q.picker("2026"))}${row3(Q.periodWidgets("year").slice(0, 3))}${row3(Q.periodWidgets("year").slice(3))}<div class="g12"><div class="c4x">${card(Q.whereYear(y))}</div><div class="c8x">${card(Q.monthsYear(y))}</div></div>`);
}

/** Desktop, the period set to This month (the picker open): the same widgets over November, so a year or a range is only a different period. */
export function e2() {
  return page(`${P.header({ m, actions: P.actions() })}${R.strip(m, { wide: true })}${Q.hero(m, D.TODAY)}${Q.sec("Right now", "this month, and it stays put when you change the period")}${row3(Q.nowWidgets(m))}${Q.sec("In November", "so far", Q.picker("This month", { open: true }))}${row3(Q.periodWidgets("month").slice(0, 3))}${row3(Q.periodWidgets("month").slice(3))}<div class="g12"><div class="c4x">${card(whereWent(m, { rows: 8, note: false }))}</div><div class="c8x">${card(monthsCard(m.key))}</div></div>`);
}

/** Desktop, adding a category: the inline form in quick add, the Manage list, and how a new category shows up. A proposal with questions. */
export function e3() {
  const head = `<header class="pg-head"><div class="pg-text"><div class="eyebrow">Daily · Categories ${sampleTag()} ${proposalTag("Proposal: the questions are at the bottom")}</div><h1>Adding a category</h1><div class="lede">If a category is missing you add it where you are: a <b>+ New</b> chip at the end of the category chips, in quick add and in the add sheet. It takes a name and a colour, and it's chosen for that spend as soon as it's saved. The list can be renamed, recoloured and hidden from <b>Manage</b>, but never deleted, so old months keep their split.</div></div></header>`;
  const one = card(`${cardHead("1 · Add one while you add a spend", "+ New, in the chips")}${dk(Q.quickAdd({ newCat: true, compact: true }))}<p class="note-p foot">Paid with and What it was stay as they are; they are left out here to keep the card short.</p>`, { gap: 14 });
  const two = card(`${cardHead("2 · Manage the list", "from Manage, beside + New")}<div class="bd-pop">${Q.manageList({ renaming: "Pets" })}<div class="mini-lbl" style="margin-top:6px">The dot opens the colours, for Pets</div><div class="swatches">${Q.SWATCHES.map((c) => `<span class="sw-c${c === "violet" ? " on" : ""}" style="background:var(--card-${c});color:var(--ink)">${c === "violet" ? I.check(11) : ""}</span>`).join("")}</div><p class="note-p">The pencil renames, the dot recolours, the tick hides a category from the chips. A hidden one stays on the spends it already has and in old months. There's no delete.</p></div>`, { gap: 14 });
  const nm = D.NOV_PETS;
  const three = card(`${cardHead("3 · Then it's a category like the others", "Where it went, the day's list, the chips")}${whereWent(nm, { rows: 9, note: false })}<div class="dp-l" style="margin-top:4px">${P.dayRow({ note: "Vet", category: "Pets", method: "Card", amount: 850 })}</div>`, { gap: 14 });
  const tab = card(`${cardHead("Where categories are kept", "a Categories tab in the Sheet")}<div class="tab-mock"><table><tr><th>id</th><th>name</th><th>colour</th><th>hidden</th></tr><tr><td>food</td><td>Food</td><td>copper</td><td></td></tr><tr><td>health</td><td>Health</td><td>coral</td><td>yes</td></tr><tr><td>c-4f2a</td><td>Pets</td><td>violet</td><td></td></tr><tr><td>c-9b1c</td><td>Gym</td><td>olive</td><td></td></tr></table></div><p class="note-p">The eight built-in categories are written to the tab the first time, so everything lives in one place. A spend keeps its category's <b style="color:var(--fg)">id</b>, not its name, so renaming a category renames it on every spend and in every old month without touching them. The Spends tab's category column stops being a fixed dropdown (the Sheet can't offer a list that grows), and Claude's add and update tools read the list so a new category is available there too.</p>`, { gap: 14 });
  const qs = card(`${cardHead("Questions for you")}<div class="qa"><div class="qa-i"><b>1</b><span><b>Where does Manage open from?</b> Drawn as a link beside + New. It could also be on the Where it went card.</span></div><div class="qa-i"><b>2</b><span><b>Rename by id (above), or by name?</b> By id keeps old months intact and the Sheet tidy. By name would need every old spend rewritten when you rename.</span></div><div class="qa-i"><b>3</b><span><b>The colour picker:</b> twelve colours here, or the app's full 36-colour picker (family, then shade)?</span></div><div class="qa-i"><b>4</b><span><b>Two categories with the same name?</b> Refused ("Pets is already there"), ignoring capitals.</span></div><div class="qa-i"><b>5</b><span><b>Order of the chips:</b> the order added (drawn), or most-used first?</span></div></div>`, { gap: 14 });
  return page(`${head}<div class="g12"><div class="c4x">${one}</div><div class="c4x">${two}</div><div class="c4x">${three}</div></div><div class="g12"><div class="c6x">${tab}</div><div class="c6x">${qs}</div></div>`);
}

// ---------- phone ----------
const greet = `<header class="pg-head ph-head"><div class="pg-text"><div class="eyebrow">Daily · Wed, 18 Nov</div><h1>Good evening, Prathik</h1></div></header>`;
const wide = (html) => html.replace('class="gl w"', 'class="gl w wide"');
const grid = (items) => `<div class="glance g2">${items.join("")}</div>`;
const phoneBody = () => {
  const now = Q.nowWidgets(m), per = Q.periodWidgets("year");
  return `${greet}${grid([now[0], now[1], wide(now[2])])}${Q.hero(m, D.TODAY, { compact: true })}${Q.sec("In 2026", "January to today", Q.picker("2026"))}${grid([wide(per[0]), per[1], per[2], per[3], per[4], wide(per[5])])}${card(Q.whereYear(y, { rows: 6 }))}${card(Q.monthsYear(y))}`;
};
export const n1 = () => R.screen({ stripHtml: R.strip(m), content: phoneBody(), bar: R.qbar() });
export const n1c = () => L.phone({ h: "auto", body: `${R.strip(m)}${phoneBody()}<div style="margin:0 -16px -28px">${R.qbar()}</div>` });

const chipsFor = (on, extra = []) => `<div class="fcs">${[...D.CAT_KEYS, ...extra].map((c) => `<span class="fc${c === on ? " on" : ""}"><i style="background:var(--card-${D.CATS[c].color})"></i>${c}</span>`).join("")}</div>`;
/** The add sheet with a new category being made: the chips, the name and colour, and the spend's own fields still there. */
export const n2 = () => R.screen({ stripHtml: R.strip(m, { compact: true }), content: phoneBody(), bar: R.qbar({ amount: "349" }), scrollY: 560, overlay: `<div class="scrim"></div><div class="sheetx"><span class="grab"></span><div class="dp-h"><h3>Add a spend</h3><span class="dlg-x">${I.x(14)}</span></div><label class="fld"><span class="fl">Amount</span><span class="amt"><em>₹</em><b>349</b></span></label><div class="fld"><span class="fl">Paid with</span><span class="seg seg-m"><span class="seg-i on">${dot("UPI")} UPI</span><span class="seg-i">${dot("Card")} Credit card</span></span></div><div class="fld"><span class="fl">Category <small>optional</small></span><div class="fcs">${[...D.CAT_KEYS].map((c) => `<span class="fc"><i style="background:var(--card-${D.CATS[c].color})"></i>${c}</span>`).join("")}<span class="fc on"><i style="background:var(--card-violet)"></i>Pets</span></div>${Q.newCatForm().replace(/ncat"/, 'ncat" style="background:var(--fill);border-color:var(--accent)"')}</div><span class="btn btn-primary" style="justify-content:center;min-height:52px;opacity:.5">${I.check(14)} Add ₹349 to today</span></div>` });
/** The Manage list, as a sheet, with Pets being renamed. */
export const n3 = () => R.screen({ stripHtml: R.strip(m, { compact: true }), content: phoneBody(), bar: R.qbar(), scrollY: 560, overlay: `<div class="scrim"></div><div class="sheetx"><span class="grab"></span><div class="dp-h"><div><h3>Manage categories</h3><p class="note-p" style="margin-top:4px">Rename, recolour or hide. Nothing is deleted.</p></div><span class="dlg-x">${I.x(14)}</span></div>${Q.manageList({ renaming: "Pets" })}<span class="btn btn-primary" style="justify-content:center;min-height:52px">Done</span></div>` });
