// Round 2 (the hero calendar picked, phone first): the pinned budget strip, the at-a-glance widgets, the quick-add bar pinned at the bottom,
// and a phone shell that pins the strip at the top and the bar at the bottom while the page scrolls between them.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
const { I, inr } = L;
const { calendar, legend, dayPanel, monthNav, monthName, plural, pct, dayLong } = P;

const pill = (b) => (b.left < 0 ? `<span class="pill pill-due">${inr(-b.left)} over the limit</span>` : b.overPace > 0 ? `<span class="pill pill-warn">${inr(b.overPace)} over pace</span>` : `<span class="pill pill-on">${inr(-b.overPace)} under pace</span>`);
const barTone = (b) => (b.left < 0 ? "neg" : b.overPace > 0 ? "warn" : "ok");

/** The budget strip: what's left of the limit, the bar with the pace marked, and what's left today. `compact` is the one-line version it shrinks to when the page scrolls. */
export function strip(m, { compact = false, wide = false } = {}) {
  const b = m.budget, over = b.left < 0;
  const bar = `<span class="bs-bar ${barTone(b)}"><i style="width:${Math.min(100, b.used * 100)}%"></i><u style="left:${(b.expected / b.limit) * 100}%"></u></span>`;
  const today = b.todayLeft < 0 ? `<span>Over today by <b class="neg">${inr(-b.todayLeft)}</b></span>` : `<span>Left today <b>${inr(b.todayLeft)}</b></span>`;
  if (compact) return `<div class="bstrip compact"><span class="bs-c"><b class="${over ? "neg" : ""}">${inr(Math.abs(b.left))}</b> ${over ? "over" : "left"}</span><span class="bs-c"><b class="${b.todayLeft < 0 ? "neg" : ""}">${inr(Math.abs(b.todayLeft))}</b> ${b.todayLeft < 0 ? "over today" : "today"}</span>${bar}</div>`;
  if (wide) return `<div class="bstrip wide"><div class="bs-l"><small>${over ? "Over the limit" : "Left to spend"} · ${monthName(m.key)}</small><b class="${over ? "neg" : ""}">${inr(Math.abs(b.left))}</b><em>of ${inr(b.limit)}</em></div><div class="bs-m">${bar}<div class="bs-foot"><span><i class="bs-t"></i>Pace for the ${m.counted}th: <b>${inr(b.expected)}</b></span><span>Spent <b>${inr(m.total)}</b></span></div></div><div class="bs-r">${pill(b)}<span class="bs-d">${today}<span>${plural(b.daysLeft, "day")} to go</span></span></div><span class="pin-tag">${I.pin(11)} stays in view while you scroll</span></div>`;
  return `<div class="bstrip"><div class="bs-top"><span class="bs-lv"><small>${over ? "Over the limit" : "Left to spend"}</small><b class="${over ? "neg" : ""}">${inr(Math.abs(b.left))}</b><em>of ${inr(b.limit)}</em></span>${pill(b)}</div>${bar}<div class="bs-foot">${today}<span>${plural(b.daysLeft, "day")} to go</span></div></div>`;
}

/** Spent so far, left today, week so far, on track to end at. */
export function glance(m, { cols = 2, dark = false } = {}) {
  const b = m.budget, wk = b.week;
  const over = m.pace > b.limit;
  const tile = (k, v, s, bar, { tone = "", note = "" } = {}) => `<div class="gl"><span class="gl-k">${k}</span><b class="gl-v ${tone}">${v}</b><span class="gl-s">${s}</span>${bar}${note ? `<span class="gl-n">${note}</span>` : ""}</div>`;
  const one = (w, c) => `<span class="gl-bar"><i style="width:${Math.min(100, w)}%;background:${c}"></i></span>`;
  const t1 = tile("Spent so far", inr(m.total), `<b>${pct(m.total, b.limit)}%</b> of ${inr(b.limit)} · day ${m.counted} of ${m.len}`, `<span class="gl-bar"><i style="width:${(m.upi / b.limit) * 100}%;background:var(--card-teal)"></i><i style="width:${(m.card / b.limit) * 100}%;background:var(--card-ruby)"></i></span>`);
  const t2 = tile("Left today", b.todayLeft < 0 ? `−${inr(-b.todayLeft)}` : inr(b.todayLeft), b.todayLeft < 0 ? `past today's ${inr(b.allowToday)}` : `of ${inr(b.allowToday)} for today`, one(b.allowToday ? (b.todayTotal / b.allowToday) * 100 : 100, b.todayLeft < 0 ? "var(--negative)" : "var(--accent)"), { tone: b.todayLeft < 0 ? "neg" : "" });
  const t3 = tile("Week so far", inr(wk.total), `<b>${inr(Math.max(0, wk.share - wk.total))}</b> left of ${inr(wk.share)} · ${P.rangeLabel(wk.from, wk.to, true)}`, one((wk.total / wk.share) * 100, wk.total > wk.share ? "var(--negative)" : "var(--accent)"));
  const scale = b.limit * 1.4;
  const t4 = tile("On track to end at", inr(m.pace), over ? `<b class="neg">${inr(m.pace - b.limit)} over</b> your ${inr(b.limit)}` : `<b class="pos">${inr(b.limit - m.pace)} under</b> your ${inr(b.limit)}`, `<span class="gl-bar"><i style="width:${Math.min(100, (m.pace / scale) * 100)}%;background:${over ? "var(--warning)" : "var(--accent)"}"></i><u style="left:${(b.limit / scale) * 100}%"></u></span>`, { tone: over ? "warn" : "", note: over ? (b.left > 0 ? `Keep to <b>${inr(Math.round(b.left / b.daysInclToday))}</b> a day from here to stay inside.` : "Already over the limit: anything more adds to it.") : "" });
  return `<div class="glance g${cols}${dark ? " dark" : ""}">${t1}${t2}${t3}${t4}</div>`;
}

/** The dark hero calendar, with the day's panel; `quick` puts the quick-add row at the top of it (desktop). */
export const hero = (m, sel, { compact = false, quick = false } = {}) => `<section class="hero"><div class="hero-l"><div class="hero-h"><h2>${monthName(m.key)} 2026<small>${compact ? "Tap" : "Click"} a day to see it, or add a spend to it</small></h2>${compact ? "" : monthNav(m)}</div>${compact ? monthNav(m) : ""}${quick ? hq() : ""}${calendar(m, { sel, compact })}${legend()}</div><div class="hero-r">${dayPanel(m, sel, { dark: true, add: "Add a spend" })}${quick ? glance(m, { cols: 1, dark: true }) : ""}</div></section>`;

/** The quick-add row inside the desktop hero. */
export const hq = () => `<div class="hq"><span class="amt"><em>₹</em><b>349</b><u class="caret"></u></span><span class="seg seg-m"><span class="seg-i on">${P.dot("UPI")} UPI</span><span class="seg-i">${P.dot("Card")} Credit card</span></span><span class="hq-sel"><i class="md" style="background:var(--card-copper)"></i>Food ${I.chev(11)}</span><span class="inp">What was it? (optional)</span><span class="btn btn-lime">${I.plus()} Add to today</span></div>`;

/** The quick-add bar, pinned at the bottom of the phone: amount, UPI or card, more, and the add button. */
export function qbar({ amount = "", method = "UPI", toast = false } = {}) {
  const filled = amount !== "";
  return `<div class="qbar">${toast ? `<div class="toast">${I.check(13)} Spend added · ₹349 on UPI <span class="undo">Undo</span></div>` : ""}<div class="qb-hint">Adds to <b>today</b> · Wed 18 Nov</div><div class="qb-row"><span class="qb-amt${filled ? "" : " empty"}"><em>₹</em>${filled ? `<b>${amount}</b>` : `<b class="ph-t">Amount</b>`}${filled ? `<u class="caret"></u>` : ""}</span><span class="seg seg-q"><span class="seg-i${method === "UPI" ? " on" : ""}">UPI</span><span class="seg-i${method === "Card" ? " on" : ""}">Card</span></span><span class="qb-more" aria-label="More: category, note, day">${I.up(14)}</span><span class="qb-add${filled ? "" : " off"}">${I.check(18)}</span></div></div>`;
}

/** The expanded add sheet, from the chevron: category, note and which day, as well as the amount. */
export function qsheet({ day = "today", cat = "Food" } = {}) {
  const cats = D.CAT_KEYS.map((c) => `<span class="fc${c === cat ? " on" : ""}"><i style="background:var(--card-${D.CATS[c].color})"></i>${c}</span>`).join("");
  const days = [["Today", day === "today"], ["Yesterday", day === "yesterday"], ["Pick a day", false]].map(([t, on]) => `<span class="fc${on ? " on" : ""}">${t}</span>`).join("");
  return `<div class="scrim"></div><div class="sheetx"><span class="grab"></span><div class="dp-h"><h3>Add a spend</h3><span class="dlg-x">${I.x(14)}</span></div><label class="fld"><span class="fl">Amount</span><span class="amt"><em>₹</em><b>349</b><u class="caret"></u></span></label><div class="fld"><span class="fl">Paid with</span><span class="seg seg-m"><span class="seg-i on">${P.dot("UPI")} UPI</span><span class="seg-i">${P.dot("Card")} Credit card</span></span></div><div class="fld"><span class="fl">Day</span><div class="fcs">${days}</div></div><div class="fld"><span class="fl">Category <small>optional</small></span><div class="fcs">${cats}</div></div><div class="fld"><span class="fl">What it was <small>optional</small></span><span class="inp"><span>Evening snacks</span></span></div><span class="btn btn-primary" style="justify-content:center;min-height:52px">${I.check(14)} Add ₹349 to today</span></div>`;
}

/** The limit sheet, from the strip. */
export const limitSheet = () => `<div class="scrim"></div><div class="sheetx"><span class="grab"></span><div class="dp-h"><div><h3>Monthly limit</h3><p class="note-p" style="margin-top:4px">UPI and credit card together.</p></div><span class="dlg-x">${I.x(14)}</span></div><label class="fld"><span class="fl">Limit for November</span><span class="amt"><em>₹</em><b>30,000</b><u class="caret"></u></span></label><div class="tgl"><span class="sw"></span><span><b>Keep it for the months after</b><small>December and on use this until you change it</small></span></div><div class="note-p">Today's allowance is what's left of the limit, shared over the days to go: <b style="color:var(--fg)">${inr(D.NOVM.budget.allowToday)}</b> today. It moves as you spend.</div><div class="dp-act"><span class="btn btn-soft">Cancel</span><span class="btn btn-primary" style="min-height:52px">${I.check(13)} Save limit</span></div></div>`;

/** A phone screen with the strip pinned under the app bar, the bar pinned at the bottom, and the page scrolled `scrollY` px between them. */
export function screen({ stripHtml, content, bar, scrollY = 0, overlay = "" }) {
  return `<div class="chai-app ph pin" style="width:390px;height:844px"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${I.menu()}</span></header><div class="pin-strip">${stripHtml}</div><div class="pin-scroll"><div class="pin-in" style="margin-top:-${scrollY}px">${content}</div></div>${bar}${overlay}</div>`;
}
