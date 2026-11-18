// Round 1, phone layouts (390 wide) for every design: the same pieces, stacked, the calendar's squares smaller, and the day's panel under it.
// Also the add-a-spend sheet (the phone's version of the add state) and the limit sheet.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import { quickAdd } from "./designs-alt.mjs";
import { limitPopover } from "./designs-budget.mjs";
const { I, inr } = L;
const { card, cardHead, phonePage, tiles, calendar, legend, dayPanel, addForm, whereWent, monthsCard, monthNav, monthName, ring, ringNote, weekBars, streak, streakLegend, streakDays, feed, sparkBars, keypad, methodSeg, catChips } = P;
const m = D.NOVM;
const SEL = "2026-11-14";
const head = (extra = "") => `${P.header({ m, phone: true, eyebrow: "Daily · Wed, 18 Nov", actions: `<span class="btn btn-primary" style="flex:1;justify-content:center">${I.plus()} Add a spend</span>${L.iconBtn(I.refresh(15), "Refresh")}` })}${extra}`;
const calCard = (sel, o = {}) => card(`${cardHead("Calendar", "tap a day")}${monthNav(m)}${calendar(m, { sel, compact: true, ...o })}${legend()}`, { gap: 12 });
const add = (label) => `<span class="btn btn-primary foot" style="justify-content:center">${I.plus()} ${label}</span>`;

export const pC1 = () => phonePage(`${head()}${tiles(m)}${calCard(SEL)}${dayPanel(m, SEL)}${card(whereWent(m, { rows: 5, note: false }))}${card(monthsCard(m.key, { rows: 4 }))}`);

export function pC2() {
  const hero = `<section class="hero"><div class="hero-l"><div class="hero-h"><h2>${monthName(m.key)} 2026<small>Tap a day to see it or add a spend</small></h2></div>${monthNav(m)}${calendar(m, { sel: SEL, compact: true })}${legend()}</div><div class="hero-r">${dayPanel(m, SEL, { dark: true })}</div></section>`;
  return phonePage(`${head()}${hero}${tiles(m)}${card(whereWent(m, { rows: 5, note: false }))}`);
}

export function pC3() {
  const seg = `<span class="seg seg-m"><span class="seg-i">Overview</span><span class="seg-i on">${I.cal(13)} Calendar</span></span>`;
  const weeks = `<div class="fcs">${m.weeks.filter((w) => w.cells.some((c) => c && !c.future)).map((w) => `<span class="fc${w.inProgress ? " on" : ""}">${P.rangeLabel(w.from, w.to)} · ${inr(w.total)}</span>`).join("")}</div>`;
  return phonePage(`${head(seg)}${card(`${cardHead("Calendar", "weeks run Monday to Sunday")}${monthNav(m)}${calendar(m, { sel: SEL, compact: true, daily: Math.round(D.LIMIT / m.len) })}${legend(`<span><i style="width:14px;height:3px;border-radius:2px;background:var(--negative)"></i>Over ${inr(Math.round(D.LIMIT / m.len))} a day</span>`)}<div class="fl" style="margin-top:4px">Week by week</div>${weeks}`, { gap: 12 })}${dayPanel(m, SEL)}${card(whereWent(m, { rows: 5, note: false }))}`);
}

export const pA1 = () => phonePage(`${head()}${card(`${cardHead("Left to spend", "of your ₹30,000 limit")}${ring(m, { size: 230, stroke: 22 })}<div style="display:flex;justify-content:center;text-align:center">${ringNote(m)}</div>`, { gap: 14 })}${quickAdd()}${card(`${cardHead("Week by week")}${weekBars(m)}`, { gap: 10 })}${card(`${cardHead("Latest spends", "newest first")}${feed(m, { days: 2 })}`, { gap: 10 })}`);

export const pA2 = () => phonePage(`${head()}${card(`<div class="composer"><span class="amt"><em>₹</em><b>349</b><u class="caret"></u></span>${methodSeg("UPI")}${L.select({ value: `<span style="display:inline-flex;align-items:center;gap:8px"><i class="md" style="background:var(--card-copper)"></i>Food</span>`, kind: "field", options: [] })}<span class="inp" style="color:var(--muted);font-weight:500">What was it? (optional)</span>${add("Add")}</div><p class="note-p" style="margin:0">Adds to <b style="color:var(--fg)">today, Wed 18 Nov</b>.</p>`, { gap: 12 })}${card(`${cardHead("Spends", "a day at a time")}${feed(m, { days: 4 })}`, { gap: 10 })}${card(`${cardHead("Left to spend", "of ₹30,000")}${ring(m, { size: 190, stroke: 20 })}<div style="display:flex;justify-content:center;text-align:center">${ringNote(m)}</div>`, { gap: 12 })}`);

export function pA3() {
  const daily = Math.round(D.LIMIT / m.len), n = streakDays(m, daily);
  return phonePage(`${head()}${card(`${cardHead("Days under your daily pace", `${inr(daily)} a day`)}<div style="display:flex;align-items:baseline;gap:10px"><span class="big">${n}</span><span style="font-size:14px;font-weight:700;color:var(--muted)">days in a row under ${inr(daily)}</span></div>${streak(m, { daily })}${streakLegend(daily)}`, { gap: 14 })}${card(`${cardHead("Week by week", "against a week of the limit")}${weekBars(m)}`, { gap: 10 })}${quickAdd()}`);
}

export const pA4 = () => phonePage(`${head()}${card(`${cardHead("Add a spend", "for today")}<div style="display:flex;align-items:baseline;justify-content:center;gap:4px;padding:2px 0"><span class="big"><small>₹</small>349</span><u class="caret" style="height:34px;margin-left:2px"></u></div>${methodSeg("UPI")}${catChips("Food")}${keypad()}${add("Add ₹349 · UPI")}`, { gap: 14 })}${card(`${cardHead("Today and the days before")}${feed(m, { days: 3 })}`, { gap: 10 })}${card(`${cardHead("The month", "so far")}${ring(m, { size: 190, stroke: 20 })}<div style="display:flex;justify-content:center;text-align:center">${ringNote(m)}</div>${sparkBars(m, { h: 70 })}`, { gap: 12 })}`);

/** The phone's add-a-spend state: a sheet over the dimmed calendar, with the toast for the last spend. */
export const pS1 = () => phonePage(`<div class="dim">${P.header({ m, phone: true, eyebrow: "Daily · Wed, 18 Nov", actions: "" })}${calCard(D.TODAY)}</div><div class="sheet">${addForm(D.TODAY)}</div>`);

/** The phone's limit sheet over the Left to spend tile. */
export const pB1 = () => phonePage(`<div class="dim"><div class="tiles" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="stile feature textured"><span class="k">Spent so far</span><span class="v">${inr(m.total)}</span><span class="s"><b>70%</b> of ₹30,000</span></div><div class="stile glass"><span class="k">Left to spend <span class="link" style="font-size:11px">Edit limit</span></span><span class="v">${inr(m.budget.left)}</span><span class="s"><b>₹752</b> a day</span></div></div></div><div class="sheet">${limitPopover().replace("bd-pop", "bd-pop-flat")}</div>`);
