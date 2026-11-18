// Round 1, the calendar designs: C1 the calendar in Day by day's place, C2 a dark hero calendar above the tiles, C3 a Calendar view of its own.
// The states (add a spend, an empty month, a busy month) are drawn on C1's layout.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
const { I, inr } = L;
const { card, cardHead, page, header, tiles, calendar, legend, dayPanel, addForm, whereWent, monthsCard, monthNav, monthName, dm, dayLong } = P;

export const SEL = "2026-11-14";
const calHead = (m, sub) => cardHead("Calendar", sub, P.monthNav(m));

/** C1: the calendar takes Day by day's place, the selected day's panel beside it, Where it went and Month by month below. */
export function c1({ m = D.NOVM, sel = SEL, form = false, more = 0, spends } = {}) {
  const calc = card(`${calHead(m, "click a day to see it or add a spend")}${calendar(m, { sel })}${legend()}`, { gap: 14 });
  const panel = form ? addForm(sel, { existing: m.days.find((d) => d.date === sel).spends.map(P.dayRow).join("") }) : dayPanel(m, sel, { more });
  return page(`${header({ m, actions: P.actions() })}${tiles(m)}<div class="g12"><div class="c8x">${calc}</div><div class="c4x">${panel}</div></div><div class="g12"><div class="c6x">${card(whereWent(m))}</div><div class="c6x">${card(monthsCard(m.key, { spends }))}</div></div>`);
}

/** C2: a dark calendar is the hero, the day's panel inside it; the tiles and the cards follow. */
export function c2() {
  const m = D.NOVM;
  const hero = `<section class="hero"><div class="hero-l"><div class="hero-h"><h2>${monthName(m.key)} 2026<small>Click a day to see it, or add a spend to it</small></h2>${monthNav(m)}</div>${calendar(m, { sel: SEL })}${legend()}</div><div class="hero-r">${dayPanel(m, SEL, { dark: true })}</div></section>`;
  return page(`${header({ m, actions: P.actions() })}${hero}${tiles(m)}<div class="g12"><div class="c6x">${card(whereWent(m))}</div><div class="c6x">${card(monthsCard(m.key))}</div></div>`);
}

const biggestDays = (m) => [...m.days].filter((d) => d.counted && d.total > 0).sort((a, b) => b.total - a.total).slice(0, 5).map((d) => { const top = [...d.spends].sort((a, b) => b.amount - a.amount)[0]; return `<div class="bg-r"><b>${P.dowOf(d.date)} ${+d.date.slice(8)}</b><span class="bg-n"><b>${top.note}</b><small>${d.spends.length > 1 ? `and ${d.spends.length - 1} more` : top.category} · ${P.dot(top.method)} ${P.methodName(top.method)}</small></span><b class="dp-a">${inr(d.total)}</b></div>`; }).join("");

/** C3: a Calendar view on its own, switched to from the page's toggle: months down the left, the calendar with a Week column, the day's panel. */
export function c3() {
  const m = D.NOVM;
  const actions = `${L.seg([{ label: "Overview" }, { label: `${I.cal(13)} Calendar`, on: true }])}${L.iconBtn(I.refresh(15), "Refresh")}${L.btn("Add a spend", { kind: "primary", icon: I.plus() })}`;
  const rail = card(`${cardHead("Months")}<div class="mo v">${P.months(m.key, { rows: 6 })}</div>`, { gap: 12 });
  const calc = card(`${cardHead("Calendar", "weeks run Monday to Sunday", monthNav(m))}${calendar(m, { sel: SEL, weekTotals: true, daily: Math.round(D.LIMIT / m.len) })}${legend(`<span><i style="width:14px;height:3px;border-radius:2px;background:var(--negative)"></i>Over ${inr(Math.round(D.LIMIT / m.len))} a day</span>`)}`, { gap: 14 });
  return page(`${header({ m, actions, eyebrow: "Daily · Calendar · Wed, 18 Nov" })}<div class="c3v">${rail}${calc}${dayPanel(m, SEL)}</div><div class="g12"><div class="c6x">${card(whereWent(m))}</div><div class="c6x">${card(`${cardHead("Biggest days", "this month")}<div class="biggest">${biggestDays(m)}</div><p class="card-note foot">${m.quiet} quiet ${m.quiet === 1 ? "day" : "days"} so far: nothing written down on ${dayLong(m.days.find((d) => d.counted && d.spends.length === 0).date)}.</p>`)}</div></div>`);
}

// The states, on C1's layout.
export const s1 = () => c1({ sel: D.TODAY, form: true });
export const s2 = () => c1({ m: D.EMPTYM, sel: D.TODAY, spends: D.ALL_SPENDS.filter((x) => !x.date.startsWith(D.NOV)) });
export const s3 = () => { const m = D.OCTM; return c1({ m, sel: "2026-10-17", more: m.days[16].spends.length - 5 }); };
