// Round 4 (2026-11-19): the top of the hero, redrawn four ways. It was three bare figures on the dark card with uneven gaps and a lot of height:
// H1 compact stat chips, H2 a date tile with Today and a month ring, H3 two tiles side by side, H4 one big figure with its sentence. Each sits in the same hero
// (the budget strip first, then this, then the calendar with quick add and the day's panel beside it).
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as R from "./parts-r2.mjs";
import * as Q from "./parts-r3.mjs";
const { I, inr } = L;
const { pct, calendar, legend, dayPanel, monthNav } = P;

const m = D.NOVM;
const day = m.days[17]; // Wed 18 Nov, today
const b = m.budget;
const split = `<span class="sp-i"><i class="md md-u"></i>UPI ${inr(day.upi)}</span><span class="sp-i"><i class="md md-c"></i>Card ${inr(day.card)}</span>`;
const dbadge = (cls = "") => `<span class="dbadge ${cls}"><small>Wed</small><b>18</b><em>Nov</em></span>`;
const miniRing = (frac, size = 72, stroke = 9) => {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r, c = size / 2;
  return `<svg class="mring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="oklch(1 0 0 / 0.16)" stroke-width="${stroke}"/><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--on-card-lime)" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${Math.min(1, frac) * C} ${C}" transform="rotate(-90 ${c} ${c})"/></svg>`;
};

/** H1: one slim row: the date, then two stat chips, each with a little something under its figure. */
export const head1 = (nav = "") => `<div class="hh1"><div class="h1-top"><div class="h1-date">${dbadge("sm")}<span><b>Wed, Nov 18</b><small>day ${m.counted} of ${m.len}</small></span></div>${nav}</div><div class="h1-chips"><div class="h1-chip"><span class="h1-ic">${I.coin(16)}</span><span class="h1-v"><small>Spent today</small><b>${inr(b.todayTotal)}</b></span><span class="h1-sub">${split}</span></div><div class="h1-chip grow"><span class="h1-ic">${I.cal(16)}</span><span class="h1-v"><small>Spent this month</small><b>${inr(m.total)}</b></span><span class="h1-meter"><span class="h1-bar"><i style="width:${(m.total / b.limit) * 100}%"></i></span><em>${pct(m.total, b.limit)}% of ${inr(b.limit)}</em></span></div></div></div>`;

/** H2: a calendar tile for the date, today's figure with its split, and the month as a ring against the limit. */
export const head2 = () => `<div class="hh2">${dbadge()}<div class="h2-today"><small>Spent today</small><b>${inr(b.todayTotal)}</b><span class="h2-split">${split}</span></div><span class="h2-rule"></span><div class="h2-month">${miniRing(m.total / b.limit)}<span><small>Spent this month</small><b>${inr(m.total)}</b><em>${pct(m.total, b.limit)}% of ${inr(b.limit)} · day ${m.counted} of ${m.len}</em></span></div></div>`;

/** H3: a slim date line, then two equal tiles, Today and This month, each with a bar. */
export const head3 = (nav = "") => `<div class="hh3"><div class="h3-top"><div class="h3-date"><b>Wed, Nov 18, 2026</b><span>day ${m.counted} of ${m.len}</span></div>${nav}</div><div class="h3-tiles"><div class="h3-tile"><small>Today</small><b>${inr(b.todayTotal)}</b><span class="h3-bar"><i style="width:${day.total ? (day.upi / day.total) * 100 : 0}%;background:var(--card-teal)"></i><i style="width:${day.total ? (day.card / day.total) * 100 : 0}%;background:var(--card-ruby)"></i></span><em>${split}</em></div><div class="h3-tile"><small>This month</small><b>${inr(m.total)}</b><span class="h3-bar"><i style="width:${(m.total / b.limit) * 100}%;background:var(--on-card-lime)"></i></span><em>${pct(m.total, b.limit)}% of ${inr(b.limit)} · ${inr(Math.round(m.perDay))} a day</em></div></div></div>`;

/** H4: this month as the one big figure with its sentence under it; today and the date as pills beside it. */
export const head4 = () => `<div class="hh4"><div class="h4-main"><small>Spent this month · November 2026</small><b>${inr(m.total)}</b><p>${pct(m.total, b.limit)}% of your ${inr(b.limit)} limit, about ${inr(Math.round(m.perDay))} a day.</p></div><div class="h4-side"><span class="h4-pill"><small>Today</small><b>${inr(b.todayTotal)}</b></span><span class="h4-pill soft"><small>Wed, Nov 18</small><b>day ${m.counted} of ${m.len}</b></span></div></div>`;

/** The hero as built: the dark strip, then the header, then the calendar with quick add and the day's panel beside it. */
export const heroWith = (head, { compact = false, navIn = false, strip = true } = {}) => `<section class="hero hero4">${strip ? `<div class="strip-in">${R.strip(m, { wide: !compact })}</div>` : ""}<div class="hero-main"><div class="hero-l"><div class="hero-hd4">${navIn && !compact ? head(monthNav(m)) : head()}${compact || navIn ? "" : monthNav(m)}</div>${compact ? monthNav(m) : ""}${calendar(m, { sel: D.TODAY, compact })}${legend()}</div><div class="hero-r">${compact ? "" : Q.quickAdd()}${dayPanel(m, D.TODAY, { dark: true, add: "Add a spend" })}</div></div></section>`;
