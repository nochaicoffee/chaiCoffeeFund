// Round 2 (2026-11-18): the hero calendar picked (C2). Quick add, a pinned budget strip, and four at-a-glance widgets, drawn phone first:
// the phone at the top of the page and scrolled, the whole page, the expanded add sheet, just added, the limit sheet, and over the limit; then the desktop page.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as R from "./parts-r2.mjs";
const { I } = L;
const { card, cardHead, page, header, whereWent, monthsCard } = P;
const { strip, glance, hero, qbar, qsheet, limitSheet, screen } = R;

const greet = `<header class="pg-head ph-head"><div class="pg-text"><div class="eyebrow">Daily · Wed, 18 Nov</div><h1>Good evening, Prathik</h1></div></header>`;
const body = (m) => `${greet}${glance(m)}${hero(m, D.TODAY, { compact: true })}${card(whereWent(m, { rows: 5, note: false }))}${card(monthsCard(m.key, { rows: 4 }))}`;
const SCROLLED = 560;

/** The phone at the top of the page: the strip pinned, the widgets, the start of the hero, the quick-add bar pinned below. */
export const m1 = () => screen({ stripHtml: strip(D.NOVM), content: body(D.NOVM), bar: qbar() });
/** Scrolled to the calendar: the strip shrinks to a line, the bar stays. */
export const m1b = () => screen({ stripHtml: strip(D.NOVM, { compact: true }), content: body(D.NOVM), bar: qbar(), scrollY: SCROLLED });
/** The whole page, unrolled (the strip at its top and the bar at its foot are the pinned pieces). */
export const m1c = () => L.phone({ h: "auto", body: `${strip(D.NOVM)}${body(D.NOVM)}<div style="margin:0 -16px -28px">${qbar()}</div>` });
/** The chevron opened: category, note and which day, with the amount typed. */
export const m2 = () => screen({ stripHtml: strip(D.NOVM, { compact: true }), content: body(D.NOVM), bar: qbar({ amount: "349" }), scrollY: SCROLLED, overlay: qsheet() });
/** Just added: the toast with Undo, the bar clear again, and every figure already moved (₹349 more spent, ₹206 left today). */
export const m3 = () => screen({ stripHtml: strip(D.NOV_ADDED), content: body(D.NOV_ADDED), bar: qbar({ toast: true }) });
/** The limit sheet, from tapping the strip. */
export const m4 = () => screen({ stripHtml: strip(D.NOVM), content: body(D.NOVM), bar: qbar(), overlay: limitSheet() });
/** Over the limit: the strip turns red, left today is past its allowance, on track says so. */
export const m5 = () => screen({ stripHtml: strip(D.NOV_OVER), content: body(D.NOV_OVER), bar: qbar() });

/** Desktop: the strip under the greeting, the hero with quick add at its top, the four widgets, then the cards. */
export function d1() {
  const m = D.NOVM;
  return page(`${header({ m, actions: P.actions() })}${strip(m, { wide: true })}${hero(m, D.TODAY, { quick: true })}<div class="g12"><div class="c6x">${card(whereWent(m))}</div><div class="c6x">${card(monthsCard(m.key))}</div></div>`);
}
