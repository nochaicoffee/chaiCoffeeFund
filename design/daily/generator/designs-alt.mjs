// Round 1, the alternatives where the calendar isn't the main widget, in the way budget apps do it:
// A1 Ring (what's left to spend as a ring), A2 Feed (a composer and a feed), A3 Weeks (weeks against an allowance and a streak strip), A4 Keypad (a calculator pad to add fast).
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
const { I, inr } = L;
const { card, cardHead, page, header, whereWent, monthsCard, ring, ringNote, weekBars, streak, streakLegend, streakDays, feed, sparkBars, keypad, methodSeg, catChips, dayPanel } = P;

const m = D.NOVM;
const addBtn = (label = "Add spend") => `<span class="btn btn-primary">${I.plus()} ${label}</span>`;
const stat = (k, v, dotc) => `<div class="stile glass" style="padding:14px 16px;background:var(--fill);box-shadow:none;border:0"><span class="k">${dotc ? `<i class="md ${dotc}"></i> ` : ""}${k}</span><span class="v" style="font-size:22px">${v}</span></div>`;

/** The inline quick-add form (the same fields as the dialog, always open). */
export const quickAdd = ({ title = "Quick add", sub = "for today, Wed 18 Nov" } = {}) => card(`${cardHead(title, sub)}<label class="fld"><span class="fl">Amount</span><span class="amt"><em>₹</em><b>349</b><u class="caret"></u></span></label><div class="fld"><span class="fl">Paid with</span>${methodSeg("UPI")}</div><div class="fld"><span class="fl">Category <small>optional</small></span>${catChips("Food")}</div><div class="fld"><span class="fl">What it was <small>optional</small></span><span class="inp"><span style="color:var(--muted);font-weight:500">Evening snacks</span></span></div>${addBtn().replace("btn btn-primary", "btn btn-primary foot").replace(">", ' style="justify-content:center">')}`, { gap: 16 });

/** A1 Ring: what's left to spend as a ring, the weeks beside it, the form and the latest spends under. */
export function a1() {
  const hero = card(`${cardHead("Left to spend", "of your ₹30,000 limit")}${ring(m, { size: 250, stroke: 24 })}<div style="display:flex;justify-content:center">${ringNote(m)}</div><div class="tiles foot" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">${stat("UPI", inr(m.upi), "md-u")}${stat("Credit card", inr(m.card), "md-c")}${stat("A day", inr(Math.round(m.perDay)))}</div>`, { gap: 18 });
  const weeks = card(`${cardHead("Week by week", "against a week's share of the limit")}<div class="spread">${weekBars(m)}</div>${cardHead("Day by day")}${sparkBars(m, { h: 96 })}`, { gap: 14 });
  const recent = card(`${cardHead("Latest spends", "newest first", `<span class="link">All of November ${I.arrowR(12)}</span>`)}<div>${feed(m, { days: 4 })}</div>`, { gap: 12 });
  return page(`${header({ m, actions: P.actions() })}<div class="g12"><div class="c5x">${hero}</div><div class="c7x">${weeks}</div></div><div class="g12"><div class="c5x">${quickAdd()}</div><div class="c7x">${recent}</div></div><div class="g12"><div class="c6x">${card(whereWent(m))}</div><div class="c6x">${card(monthsCard(m.key))}</div></div>`);
}

/** A2 Feed: a composer on top (type, pick, Enter), the feed of days under it, the month summarised beside it. */
export function a2() {
  const composer = card(`<div class="composer"><span class="amt"><em>₹</em><b>349</b><u class="caret"></u></span>${methodSeg("UPI")}${L.select({ value: `<span style="display:inline-flex;align-items:center;gap:8px"><i class="md" style="background:var(--card-copper)"></i>Food</span>`, kind: "field", options: [] })}<span class="inp" style="color:var(--muted);font-weight:500">What was it? (optional)</span>${addBtn("Add")}</div><p class="note-p" style="margin:0">Adds to <b style="color:var(--fg)">today, Wed 18 Nov</b>. Press Enter to add, Tab to move on. Click a day's name in the feed to add to another day.</p>`, { gap: 12 });
  const feedCard = card(`${cardHead("Spends", "a day at a time", `<span class="seg"><span class="seg-i on">All</span><span class="seg-i">${I.cal(12)} Calendar</span></span>`)}<div>${feed(m, { days: 7 })}</div><span class="link foot">Earlier in November ${I.arrowR(12)}</span>`, { gap: 12 });
  const side = `<div class="c4x stack-col">${card(`${cardHead("Left to spend", "of ₹30,000")}${ring(m, { size: 190, stroke: 20 })}<div style="display:flex;justify-content:center">${ringNote(m)}</div>`, { gap: 14 })}${card(whereWent(m, { rows: 5, note: false }))}</div>`;
  return page(`${header({ m, actions: P.actions() })}${composer}<div class="g12"><div class="c8x">${feedCard}</div>${side}</div><div class="g12"><div class="c12x">${card(monthsCard(m.key))}</div></div>`);
}

/** A3 Weeks: each week against its allowance, and a strip of days that shows the streak under a daily allowance. */
export function a3() {
  const daily = Math.round(D.LIMIT / m.len), n = streakDays(m, daily);
  const weeks = card(`${cardHead("Week by week", "each against a week of the limit")}<div class="spread">${weekBars(m)}</div><p class="card-note foot">The line is a week's share of ${inr(D.LIMIT)}: ${inr(Math.round((D.LIMIT * 7) / m.len))}. A week in progress shows what's left of it.</p>`, { gap: 12 });
  const sk = card(`${cardHead("Days under your daily pace", `${inr(daily)} a day`)}<div style="display:flex;align-items:baseline;gap:10px"><span class="big">${n}</span><span style="font-size:15px;font-weight:700;color:var(--muted)">${n === 1 ? "day" : "days"} in a row under ${inr(daily)}</span></div>${streak(m, { daily, cls: "fill" })}${streakLegend(daily)}<p class="card-note foot">Best this month: 3 days (Nov 9 to 11). Nov 11 had nothing written down, and counts as under.</p>`, { gap: 16 });
  return page(`${header({ m, actions: P.actions() })}<div class="g12"><div class="c7x">${weeks}</div><div class="c5x">${sk}</div></div><div class="g12"><div class="c4x">${quickAdd()}</div><div class="c4x">${card(whereWent(m, { rows: 8, note: false }))}</div><div class="c4x">${card(monthsCard(m.key))}</div></div>`);
}

/** A4 Keypad: a calculator pad to add a spend fast, today beside it, the month at a glance. */
export function a4() {
  const pad = card(`${cardHead("Add a spend", "for today")}<div style="display:flex;align-items:baseline;justify-content:center;gap:4px;padding:6px 0"><span class="big"><small>₹</small>349</span><u class="caret" style="height:40px;margin-left:2px"></u></div>${methodSeg("UPI")}${catChips("Food")}${keypad()}${addBtn("Add ₹349 · UPI").replace("btn btn-primary", "btn btn-primary foot").replace(">", ' style="justify-content:center">')}`, { gap: 16 });
  const today = card(`${cardHead("Today and the days before", "Wed 18 Nov: " + inr(m.days[17].total))}<div>${feed(m, { days: 5 })}</div>${addBtn("Add another for today").replace("btn btn-primary", "btn btn-primary foot").replace(">", ' style="justify-content:center">')}`, { gap: 12 });
  const glance = card(`${cardHead("The month", "so far")}${ring(m, { size: 200, stroke: 20 })}<div style="display:flex;justify-content:center">${ringNote(m)}</div>${cardHead("Day by day")}${sparkBars(m, { h: 80, grow: true })}<div class="legend"><span><i style="background:var(--card-teal);border-radius:50%"></i>UPI</span><span><i style="background:var(--card-ruby);border-radius:50%"></i>Credit card</span></div>`, { gap: 14 });
  return page(`${header({ m, actions: P.actions() })}<div class="g12"><div class="c4x">${pad}</div><div class="c4x">${today}</div><div class="c4x">${glance}</div></div><div class="g12"><div class="c6x">${card(whereWent(m, { rows: 8 }))}</div><div class="c6x">${card(monthsCard(m.key))}</div></div>`);
}
