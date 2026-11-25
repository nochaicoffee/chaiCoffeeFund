// Round 6 (2026-11-25): quick entry (often-used spends, type-ahead, repeats, cash), category limits, and the all-spends page.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import * as R from "./parts-r2.mjs";
import * as Q from "./parts-r3.mjs";
import * as X from "./parts-r4.mjs";
import * as E from "./data-r6.mjs";
const { I, inr } = L;
const { col, catIcon, pct, plural, dm, dayLong, cardHead, card } = P;
const m = D.NOVM;

// ---------- Cash ----------
const MD = { UPI: "md-u", Card: "md-c", Cash: "md-k" };
export const mdot = (method) => `<i class="md ${MD[method]}"></i>`;
export const mname = (method) => (method === "Card" ? "Credit card" : method);
export const seg3 = (on = "UPI", { short = false } = {}) => `<span class="seg seg-m">${["UPI", "Card", "Cash"].map((x) => `<span class="seg-i${x === on ? " on" : ""}">${mdot(x)} ${short || x !== "Card" ? x : "Credit card"}</span>`).join("")}</span>`;
export const legend3 = () => `<div class="legend"><span><i style="background:${col("teal")};border-radius:50%"></i>UPI</span><span><i style="background:${col("ruby")};border-radius:50%"></i>Credit card</span><span><i style="background:${col("emerald")};border-radius:50%"></i>Cash</span><span class="lg-n">The shade is the day's total</span></div>`;

// ---------- Quick-add cards (the dark card beside the calendar) ----------
const qaHead = `<div class="dp-h"><div><div class="eyebrow">Quick add</div><h3>Add to today</h3></div><span class="qa-day">Wed 18 Nov ${I.chev(11)}</span></div>`;
const ofChip = (o) => `<span class="of"><i class="md" style="background:${col(D.CATS[o.category].color)}"></i><b>${o.note}</b><em>${inr(o.amount)}</em>${o.method === "UPI" ? "" : `<s>${mdot(o.method)}</s>`}</span>`;
const amountField = (v = "349", { caret = true } = {}) => `<label class="fld"><span class="fl">Amount</span><span class="amt"><em>₹</em><b>${v}</b>${caret ? `<u class="caret"></u>` : ""}</span></label>`;
const noteField = (v = "Evening snacks") => `<div class="fld"><span class="fl">What it was <small>optional</small></span><span class="inp"><span>${v}</span></span></div>`;
const addBtn = (t = "Add ₹349 to today") => `<span class="btn btn-lime" style="justify-content:center;min-height:48px">${I.check(13)} ${t}</span>`;

/** Q1: an Often row on top of quick add: one tap adds the spend to today with its usual amount, method and category. Cash is the third method. */
export const q1 = () => `<aside class="dp dp-dark dp-form qa-card">${qaHead}<div class="fld"><span class="fl fl-row">Often <span class="oft-sw"><span class="on">Often</span><span>Recent</span></span></span><div class="oft">${E.OFTEN.map(ofChip).join("")}</div><small class="qa-hint">Tap one to add it to today as it was. Hold to change it first.</small></div><span class="qa-or"><i></i>or write a new one<i></i></span>${amountField()}<div class="fld"><span class="fl">Paid with</span>${seg3("UPI")}</div><div class="fld"><span class="fl">Category <small>optional</small></span>${Q.catRow("Food")}</div>${noteField()}${addBtn()}</aside>`;

/** Q2: type-ahead. Typing in "What it was" offers the notes he has used, with his usual amount, method and category; choosing one fills the rest. */
export const q2 = () => {
  const row = (s, i) => `<div class="ta-i${i === 0 ? " hl" : ""}">${catIcon(s.category, 14, "ci-s")}<span class="ta-n"><b><mark>Ch</mark>${s.note.slice(2)}</b><small>${s.category} · ${mdot(s.method)} ${mname(s.method)} · ${s.n} times</small></span><span class="ta-a">${inr(s.amount)}</span></div>`;
  return `<aside class="dp dp-dark dp-form qa-card">${qaHead}${amountField("", { caret: false })}<div class="fld ta"><span class="fl">What it was <small>optional</small></span><span class="inp inp-on"><span>Ch</span><u class="caret"></u></span><div class="ta-pop"><div class="ta-h">From your diary</div>${E.SUGGEST.map(row).join("")}<div class="ta-f"><kbd>Tab</kbd> or tap fills the amount, how you paid and the category. You can still change them.</div></div></div><div class="fld ta-under"><span class="fl">Paid with</span>${seg3("UPI")}</div><div class="fld ta-under"><span class="fl">Category <small>optional</small></span>${Q.catRow("Food")}</div></aside>`;
};

/** Q3: repeats. A strip of what's due today (offered, never written for him), and a Repeat choice in the form. */
export const q3 = () => {
  const due = E.REPEATS.filter((r) => r.due).map((r) => `<div class="rp-r">${catIcon(r.category, 14, "ci-s")}<span class="rp-n"><b>${r.note} · ${inr(r.amount)}</b><small>${r.every} · ${mdot(r.method)} ${mname(r.method)}</small></span><span class="btn btn-lime btn-xs">Add</span><span class="rp-skip">Skip</span></div>`).join("");
  const reps = ["Never", "Every day", "Weekdays", "Every week", "Every month"].map((t, i) => `<span class="fc${i === 0 ? " on" : ""}">${t}</span>`).join("");
  return `<aside class="dp dp-dark dp-form qa-card">${qaHead}<div class="rp"><div class="rp-h"><b>Due today</b><em>${E.REPEATS.filter((r) => r.due).length}</em><small>Nothing is written until you tap Add</small></div>${due}</div>${amountField()}<div class="fld"><span class="fl">Paid with</span>${seg3("UPI")}</div><div class="fld"><span class="fl">Category <small>optional</small></span>${Q.catRow("Food")}</div>${noteField()}<div class="fld"><span class="fl">Repeat <small>optional</small></span><div class="fcs">${reps}</div></div>${addBtn()}</aside>`;
};

/** The hero with H4's header and a given quick-add card beside the calendar. */
export const heroWith = (cardHtml, { selected = D.TODAY } = {}) => `<section class="hero hero4"><div class="hero-main"><div class="hero-l"><div class="hero-hd4">${X.head4()}${P.monthNav(m)}</div>${P.calendar(m, { sel: selected })}${legend3()}</div><div class="hero-r">${cardHtml}${P.dayPanel(m, selected, { dark: true, add: "Add a spend" })}</div></div></section>`;

// ---------- Cash on the page: a week of the calendar, the split widget, and the tiles ----------
/** Mon 2 to Sun 15 Nov, from the real month. Cash is drawn on the 5th and the 10th (a lunch each) and, later, the 17th's barber: the ₹920 on Q4. */
export const CASH_DAYS = { 5: ["k"], 10: ["k"] };
export function cashWeek() {
  const lv = (t) => (t <= 0 ? 0 : t < 500 ? 1 : t < 1500 ? 2 : t < 3000 ? 3 : 4);
  const days = m.days.slice(1, 15);
  const cell = (d) => {
    const dots = CASH_DAYS[d.d] ?? [d.card > 0 && "c", d.upi > 0 && "u"].filter(Boolean);
    const n = d.spends.length;
    return `<div class="cd lv${lv(d.total)}${d.spends.length ? "" : " quiet"}"><span class="cd-n">${d.d}</span><span class="cd-dots">${dots.map((x) => `<i class="md md-${x}"></i>`).join("")}</span><span class="cd-t">${d.total ? inr(d.total) : ""}</span>${n > 1 ? `<span class="cd-c">${n} spends</span>` : ""}</div>`;
  };
  const rows = [days.slice(0, 7), days.slice(7)].map((r) => `<div class="cal-r">${r.map(cell).join("")}</div>`).join("");
  return `<div class="cal cal-one"><div class="cal-hd">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<span>${d}</span>`).join("")}</div>${rows}</div>`;
}
export function howYouPaid() {
  const p = E.PAID, t = m.total;
  const rows = [["UPI", p.upi, "teal"], ["Credit card", p.card, "ruby"], ["Cash", p.cash, "emerald"]];
  return `${cardHead("How you paid", "November", `<span class="ww-t">${inr(t)}</span>`)}<div class="sp2"><span class="sp2-b">${rows.map(([, v, c]) => `<i style="width:${(v / t) * 100}%;background:${col(c)}"></i>`).join("")}</span></div><div class="hp">${rows.map(([n, v, c]) => `<div class="hp-r"><i class="md" style="background:${col(c)}"></i><b>${n}</b><span>${pct(v, t)}%</span><b class="hp-v">${inr(v)}</b></div>`).join("")}</div><div class="hp-h">The cash ones</div><div class="dp-l">${[{ note: "Lunch", category: "Food", method: "Cash", amount: 410 }, { note: "Lunch", category: "Food", method: "Cash", amount: 310 }, { note: "Barber", category: "Other", method: "Cash", amount: 200 }].map(P.dayRow).join("")}</div><p class="card-note foot">Cash is only what you write down. Bank withdrawals aren't counted as spending.</p>`;
}
export function methodTiles() {
  const p = E.PAID, t = m.total;
  const tile = (n, v, c, extra = "") => `<div class="stile glass"><span class="k"><i class="md" style="background:${col(c)}"></i> ${n}</span><span class="v">${inr(v)}</span><span class="s"><b>${pct(v, t)}%</b> of the month${extra}</span></div>`;
  return `<div class="tiles" style="grid-template-columns:repeat(3,minmax(0,1fr))">${tile("UPI", p.upi, "teal")}${tile("Credit card", p.card, "ruby")}${tile("Cash", p.cash, "emerald", " · new")}</div>`;
}

// ---------- Phone: quick-add bar with the Often row, the sheet with suggestions, the Due-today card ----------
const oftenBar = (chips) => `<div class="qb-often">${chips.map(ofChip).join("")}</div>`;
export function qbar3({ amount = "", method = "UPI", often = true } = {}) {
  const filled = amount !== "";
  return `<div class="qbar">${often ? `<div class="qb-oh"><b>Often</b><small>tap to add to today</small></div>${oftenBar(E.OFTEN)}` : ""}<div class="qb-hint">Adds to <b>today</b> · Wed 18 Nov</div><div class="qb-row"><span class="qb-amt${filled ? "" : " empty"}"><em>₹</em>${filled ? `<b>${amount}</b>` : `<b class="ph-t">Amount</b>`}${filled ? `<u class="caret"></u>` : ""}</span><span class="seg seg-q seg-q3">${["UPI", "Card", "Cash"].map((x) => `<span class="seg-i${x === method ? " on" : ""}">${x}</span>`).join("")}</span><span class="qb-more">${I.up(14)}</span><span class="qb-add${filled ? "" : " off"}">${I.check(18)}</span></div></div>`;
}
export function sheetSuggest() {
  const row = (s, i) => `<div class="ta-i${i === 0 ? " hl" : ""}">${catIcon(s.category, 14, "ci-s")}<span class="ta-n"><b><mark>Ch</mark>${s.note.slice(2)}</b><small>${s.category} · ${mdot(s.method)} ${mname(s.method)} · ${s.n} times</small></span><span class="ta-a">${inr(s.amount)}</span></div>`;
  return `<div class="scrim"></div><div class="sheetx"><span class="grab"></span><div class="dp-h"><h3>Add a spend</h3><span class="dlg-x">${I.x(14)}</span></div><div class="fld ta"><span class="fl">What it was <small>optional</small></span><span class="inp inp-on"><span>Ch</span><u class="caret"></u></span><div class="ta-pop ta-light"><div class="ta-h">From your diary</div>${E.SUGGEST.map(row).join("")}<div class="ta-f">Tap one to fill the amount, how you paid and the category.</div></div></div><div class="fld ta-under"><span class="fl">Amount</span><span class="amt"><em>₹</em><b class="ph-t">0</b></span></div><div class="fld ta-under"><span class="fl">Paid with</span>${seg3("UPI")}</div></div>`;
}
export function sheetRepeat() {
  const reps = ["Never", "Every day", "Weekdays", "Every week", "Every month"].map((t, i) => `<span class="fc${i === 2 ? " on" : ""}">${t}</span>`).join("");
  return `<div class="scrim"></div><div class="sheetx"><span class="grab"></span><div class="dp-h"><h3>Add a spend</h3><span class="dlg-x">${I.x(14)}</span></div><label class="fld"><span class="fl">Amount</span><span class="amt"><em>₹</em><b>40</b><u class="caret"></u></span></label><div class="fld"><span class="fl">Paid with</span>${seg3("UPI")}</div><div class="fld"><span class="fl">What it was</span><span class="inp"><span>Chai</span></span></div><div class="fld"><span class="fl">Repeat <small>optional</small></span><div class="fcs">${reps}</div><small class="qa-hint dk">It shows under Due today each weekday. Tap Add to write it, or Skip.</small></div><span class="btn btn-primary" style="justify-content:center;min-height:52px">${I.check(14)} Add ₹40 to today</span></div>`;
}
export function dueToday() {
  const due = E.REPEATS.filter((r) => r.due).map((r) => `<div class="rp-r lt">${catIcon(r.category, 14, "ci-s")}<span class="rp-n"><b>${r.note} · ${inr(r.amount)}</b><small>${r.every} · ${mdot(r.method)} ${mname(r.method)}</small></span><span class="btn btn-primary btn-xs">Add</span><span class="rp-skip">Skip</span></div>`).join("");
  return `<section class="card glass" style="gap:6px"><div class="rp-h lt"><b>Due today</b><em>2</em><small>Nothing is written until you tap Add</small></div>${due}</section>`;
}

// ---------- Category limits ----------
const delta = (r) => (r.diff === 0 ? "" : `<span class="dv ${r.diff > 0 ? "up" : "dn"}">${r.diff > 0 ? I.up(10) : I.down(10)}${inr(Math.abs(r.diff))} vs Oct</span>`);
const stateChip = (r) => (r.state === "over" ? `<span class="pill pill-due">${inr(-r.left)} over</span>` : r.state === "near" ? `<span class="pill pill-warn">${Math.round(r.used * 100)}% used</span>` : r.state === "ok" ? `<span class="pill pill-on">${inr(r.left)} left</span>` : `<span class="pill pill-off">No limit</span>`);
/** One category against its limit: the bar is the limit (full is 100%); 80% is ticked; an overspend turns the bar red. */
const limBar = (r) => {
  const w = r.limit ? Math.min(100, r.used * 100) : (r.spent / 6500) * 100;
  const tone = r.state === "over" ? "neg" : r.state === "near" ? "warn" : r.state === "none" ? "none" : "ok";
  return `<span class="lm-bar ${tone}"><i style="width:${w}%;background:${r.state === "over" ? "var(--negative)" : r.state === "near" ? "var(--warning)" : col(D.CATS[r.cat].color)}"></i>${r.limit ? `<u></u>` : ""}</span>`;
};
export function limitRow(r, { compact = false, link = true } = {}) {
  const bar = limBar(r);
  const sub = r.limit ? `of ${inr(r.limit)}${r.state === "over" ? ` · ${Math.round(r.used * 100)}%` : ""}` : "";
  return `<div class="lm-r ${r.state}">${catIcon(r.cat, 14)}<span class="lm-n"><b>${r.cat}</b>${compact ? "" : delta(r)}</span>${bar}<span class="lm-v"><b>${inr(r.spent)}</b>${sub ? `<small>${sub}</small>` : ""}</span>${compact ? "" : stateChip(r)}${link ? `<span class="lm-go">${I.chevR(12)}</span>` : ""}</div>`;
}
export const limitHead = () => `<div class="lm-hd"><span></span><span>Category</span><span>Against its limit · 80% ticked</span><span class="r">Spent</span><span class="r">Status</span><span></span></div>`;
export function whereLimits({ rows = E.LIMITS } = {}) {
  const sorted = [...rows].sort((a, b) => b.spent - a.spent);
  return `${cardHead("Where November went", "against each category's limit · tap one to see its spends", `<span class="btn btn-ghost btn-sm">${I.pencil(12)} Edit limits</span>`)}<div class="lm">${limitHead()}${sorted.map((r) => limitRow(r)).join("")}</div><p class="card-note foot">${inr(D.LIMIT - E.GIVEN)} of your ${inr(D.LIMIT)} isn't given to a category. Other has no limit. “vs Oct” compares with the same days of October (1 to 18).</p>`;
}
export function whereLimitsPhone() {
  const sorted = [...E.LIMITS].sort((a, b) => b.spent - a.spent);
  return `${cardHead("Where November went", "against each category's limit", `<span class="btn btn-ghost btn-xs">${I.pencil(11)} Edit</span>`)}<div class="lm lm-ph">${sorted.map((r) => `<div class="lm-p ${r.state}"><div class="lm-pt">${catIcon(r.cat, 13)}<b>${r.cat}</b><span class="lm-pv"><b>${inr(r.spent)}</b>${r.limit ? ` <small>of ${inr(r.limit)}</small>` : ""}</span>${stateChip(r)}</div>${limBar(r)}</div>`).join("")}</div>`;
}
/** A slim row above Where it went: what needs a look. */
export const needsLook = () => `<div class="nl">${I.alert(15)}<span class="nl-t">${E.ATTENTION.map((r) => r.state === "over" ? `<b>${r.cat}</b> is <b class="neg">${inr(-r.left)} over</b> its ${inr(r.limit)} limit` : `<b>${r.cat}</b> is at <b class="warn">${Math.round(r.used * 100)}%</b> of its ${inr(r.limit)}`).join(" · ")}</span><span class="link">See them ${I.arrowR(11)}</span></div>`;
export function latestSpends(n = 6) {
  const list = E.NOV_ALL.slice(0, n);
  return `${cardHead("Latest spends", "newest first", `<span class="btn btn-ghost btn-sm">See all spends ${I.arrowR(12)}</span>`)}<div class="dp-l">${E.byDay(list).map((g) => `<div class="ls-d"><b>${g.date === D.TODAY ? "Today" : g.date === "2026-11-17" ? "Yesterday" : dayLong(g.date)}</b><small>${inr(g.total)}</small></div>${g.list.map(P.dayRow).join("")}`).join("")}</div>`;
}
/** Envelopes: a tile per category with a ring. */
export function envelopes({ cols = 4 } = {}) {
  const ring = (r, size = 74, stroke = 9) => {
    const rad = (size - stroke) / 2, C = 2 * Math.PI * rad, c = size / 2, f = Math.min(1, r.used ?? 0);
    const color = r.state === "over" ? "var(--negative)" : r.state === "near" ? "var(--warning)" : col(D.CATS[r.cat].color);
    return `<svg class="env-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="var(--fill)" stroke-width="${stroke}"/><circle cx="${c}" cy="${c}" r="${rad}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${f * C} ${C}" transform="rotate(-90 ${c} ${c})"/></svg>`;
  };
  const tile = (r) => r.limit
    ? `<div class="env ${r.state}"><div class="env-t">${catIcon(r.cat, 14)}<b>${r.cat}</b>${r.state !== "ok" ? `<span class="env-flag ${r.state}">${r.state === "over" ? "Over" : "Near"}</span>` : ""}</div><div class="env-m">${ring(r)}<span class="env-c"><b>${Math.round(r.used * 100)}%</b></span><span class="env-v"><b>${inr(r.spent)}</b><small>of ${inr(r.limit)}</small></span></div><div class="env-f"><span class="${r.state === "over" ? "neg" : ""}">${r.state === "over" ? `${inr(-r.left)} over` : `${inr(r.left)} left`}</span>${delta(r)}</div></div>`
    : `<div class="env none"><div class="env-t">${catIcon(r.cat, 14)}<b>${r.cat}</b></div><div class="env-m"><span class="env-v"><b>${inr(r.spent)}</b><small>no limit</small></span></div><div class="env-f"><span class="link">${I.plus(11)} Set a limit</span>${delta(r)}</div></div>`;
  return `<div class="envs" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${[...E.LIMITS].sort((a, b) => (b.used ?? -1) - (a.used ?? -1)).map(tile).join("")}</div>`;
}
/** The limits sheet: the monthly limit, then a box per category, and what's not given out. */
export function limitsDialog({ phone = false } = {}) {
  const row = (r) => { const on = r.limit != null; return `<div class="ls-r${on ? "" : " off"}">${catIcon(r.cat, 13)}<b>${r.cat}</b><span class="lim-in${on ? "" : " nolim"}">${on ? `<em>₹</em><b>${r.limit.toLocaleString("en-IN")}</b>` : `<b>No limit</b>`}</span><span class="ls-sw${on ? " on" : ""}"></span></div>`; };
  const stack = D.CAT_KEYS.filter((c) => E.CAT_LIMITS[c]).map((c) => `<i style="width:${(E.CAT_LIMITS[c] / D.LIMIT) * 100}%;background:${col(D.CATS[c].color)}"></i>`).join("");
  const body = `<div class="ls-top"><span class="fl">Monthly limit</span><span class="lim-in big"><em>₹</em><b>30,000</b></span><small>The strip and the pace use this one.</small></div><div class="ls-h"><b>By category</b><small>Optional. A switch off means no limit for it.</small></div><div class="ls-l">${D.CAT_KEYS.map((c) => row(E.LIMITS.find((x) => x.cat === c))).join("")}</div><div class="ls-sum"><span class="ls-bar">${stack}</span><span class="ls-t"><b>${inr(E.GIVEN)}</b> of ${inr(D.LIMIT)} given to categories · <b>${inr(D.LIMIT - E.GIVEN)}</b> not given out</span></div><p class="note-p">Applies from November until you change it. Category limits can add up to more than the monthly one; the monthly limit still decides the strip.</p>`;
  if (phone) return `<div class="scrim"></div><div class="sheetx sheet-tall"><span class="grab"></span><div class="dp-h"><div><h3>Limits for November</h3></div><span class="dlg-x">${I.x(14)}</span></div>${body}<div class="dp-act"><span class="btn btn-soft">Cancel</span><span class="btn btn-primary" style="min-height:52px">${I.check(13)} Save limits</span></div></div>`;
  return `<div class="dlg ls-dlg"><div class="dlg-h"><span class="dlg-ic">${I.pie(18)}</span><div><h3>Limits for November</h3><p>One for the month, and one for each category if you want.</p></div><span class="dlg-x">${I.x(14)}</span></div><div class="ls-body">${body}</div><div class="dlg-f"><span class="note">Nothing is deleted. Turning a category off keeps its spends.</span><span class="btn btn-soft">Cancel</span><span class="btn btn-primary">${I.check(13)} Save limits</span></div></div>`;
}

// ---------- The all-spends page ----------
const rings = `<span class="tex"><svg viewBox="0 0 400 160" preserveAspectRatio="xMaxYMid slice"><g fill="none" stroke="var(--rings-ink)" stroke-opacity="0.13" stroke-width="1.5"><circle cx="360" cy="40" r="30"/><circle cx="360" cy="40" r="56"/><circle cx="360" cy="40" r="84"/><circle cx="360" cy="40" r="114"/></g></svg></span>`;
export function spendTiles(list, { label = "November", cls = "" } = {}) {
  const total = list.reduce((a, x) => a + x.amount, 0), big = E.biggest(list), top = (() => { const c = {}; list.forEach((x) => (c[x.category] = (c[x.category] ?? 0) + x.amount)); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]; })();
  return `<div class="tiles ${cls}" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div class="stile feature textured">${rings}<span class="k">Spent · ${label}</span><span class="v">${inr(total)}</span><span class="s"><b>${plural(list.length, "spend")}</b> shown</span></div><div class="stile glass"><span class="k">A usual spend</span><span class="v">${inr(E.avgOf(list))}</span><span class="s">the average of the ones shown</span></div><div class="stile glass"><span class="k">Biggest</span><span class="v">${inr(big.amount)}</span><span class="s"><b>${big.note}</b> · ${dm(big.date)}</span></div><div class="stile glass"><span class="k">Most spent on</span><span class="v">${top[0]}</span><span class="s"><b>${inr(top[1])}</b> · ${pct(top[1], total)}% of what's shown</span></div></div>`;
}
const monthPick = (value = "November 2026") => L.select({ value, kind: "pill", icon: I.cal(14), align: "align-end", options: [{ group: "Show" }, { label: "November 2026", meta: inr(m.total), on: value === "November 2026" }, { label: "October 2026", meta: inr(D.OCTM.total) }, { label: "2026", meta: "Jan to now" }, "-", { label: "Range…", meta: "later" }] });
export const entriesHeader = ({ title = "All spends", eyebrow = "Daily · All spends", pick = "November 2026" } = {}) => L.header({ back: true, eyebrow, title, actions: `${monthPick(pick)}${L.iconBtn(I.refresh(15), "Refresh")}${L.btn("Add a spend", { kind: "primary", icon: I.plus() })}` });

/** The toolbar: search, category, how it was paid, amount, sort. `q` is what's typed; `chips` are the filters in force. */
export function toolbar({ q = "", category = "All categories", method = "All", amount = "Any amount", chips = [], count = "" } = {}) {
  const meth = ["All", "UPI", "Card", "Cash"].map((x) => `<span class="seg-i${x === method ? " on" : ""}">${x === "All" ? "All" : `${mdot(x)} ${x}`}</span>`).join("");
  return `<div class="tb"><span class="srch">${I.search(14)}<span class="${q ? "" : "ph-t"}">${q || "Search notes, amounts, categories"}</span>${q ? `<span class="srch-x">${I.x(11)}</span>` : ""}</span>${L.select({ value: category, kind: "small", width: "170px" })}<span class="seg">${meth}</span>${L.select({ value: amount, kind: "small", width: "150px" })}<span class="tb-sp"></span>${count ? `<span class="tb-c">${count}</span>` : ""}${L.select({ value: "Newest first", kind: "small", width: "150px" })}</div>${chips.length ? `<div class="chips-r">${chips.map((c) => `<span class="fchip">${c}${I.x(10)}</span>`).join("")}<span class="link">Clear all</span></div>` : ""}`;
}
const spendRow = (x, { hover = false, cat = true } = {}) => `<div class="er${hover ? " hov" : ""}${cat ? "" : " nocat"}">${catIcon(x.category, 15)}<span class="er-n"><b>${x.note ?? x.category}</b></span>${cat ? `<span class="er-c">${x.category}</span>` : ""}<span class="er-m">${mdot(x.method)} ${mname(x.method)}</span><span class="er-a">${inr(x.amount)}</span><span class="er-x">${I.pencil(13)}${I.x(13)}</span></div>`;
/** Day groups under month headers. */
export function ledger(list, { monthHead = true, hover = "", limit = 99, cat = true } = {}) {
  const months = [...new Set(list.map((x) => x.date.slice(0, 7)))];
  return months.map((k) => {
    const inM = list.filter((x) => x.date.startsWith(k)), tot = inM.reduce((a, x) => a + x.amount, 0);
    const days = E.byDay(inM).slice(0, limit);
    return `${monthHead ? `<div class="er-mh"><b>${P.monthY(k)}</b><small>${plural(inM.length, "spend")}</small><span>${inr(tot)}</span></div>` : ""}${days.map((g) => `<div class="er-dh"><b>${g.date === D.TODAY ? "Today" : g.date === "2026-11-17" ? "Yesterday" : dayLong(g.date)}</b>${g.date === D.TODAY || g.date === "2026-11-17" ? `<small>${dayLong(g.date)}</small>` : ""}<span>${inr(g.total)}</span></div>${g.list.map((x) => spendRow(x, { hover: x.id === hover, cat })).join("")}`).join("")}`;
  }).join("");
}
/** The dense table: date, what, category, paid with, amount, with sortable headers and a pager. */
export function table(list, { sort = "date" } = {}) {
  const th = (t, k, r = false) => `<th class="${r ? "r" : ""}${sort === k ? " on" : ""}">${t}${sort === k ? I.down(10) : ""}</th>`;
  const rows = list.map((x) => `<tr><td class="dim">${dm(x.date)}<small>${P.dowOf(x.date)}</small></td><td><b>${x.note ?? x.category}</b></td><td><span class="tcat">${catIcon(x.category, 11, "ci-s")} ${x.category}</span></td><td>${mdot(x.method)} ${mname(x.method)}</td><td class="r"><b>${inr(x.amount)}</b></td><td class="r act">${I.pencil(13)}</td></tr>`).join("");
  return `<table class="etb"><thead><tr>${th("Date", "date")}${th("What", "what")}${th("Category", "cat")}${th("Paid with", "pay")}${th("Amount", "amt", true)}<th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
export const pager = (a, b, n) => `<div class="pager"><span>Showing ${a}–${b} of ${n}</span><span class="pgb"><i>${I.chevL(12)}</i><b>1</b> of ${Math.ceil(n / (b - a + 1))}<i>${I.chevR(12)}</i></span></div>`;

/** A category's own page: this month against last (the same point, and the whole of it), its limit, its weekdays, its usual spend. */
export function categoryFacts(cp = E.FOOD) {
  const diffSame = cp.total - cp.prevSame;
  const lim = cp.limit, used = lim ? cp.total / lim : null;
  const maxD = Math.max(...cp.dows.map((d) => d.amount), 1);
  const top = [...cp.dows].sort((a, b) => b.amount - a.amount)[0];
  const scale = Math.max(cp.total, cp.prevTotal, lim ?? 0);
  return `<div class="cf"><div class="gl w cf-c"><div class="w-h"><span class="gl-k">This month vs last</span><span class="w-tag now">Now</span></div><b class="gl-v">${inr(cp.total)}</b><span class="gl-s"><b class="${diffSame > 0 ? "neg" : "pos"}">${diffSame > 0 ? "+" : "−"}${inr(Math.abs(diffSame))}</b> against the same point in October (${inr(cp.prevSame)})</span><div class="gl-vis"><div class="cmp"><span class="cmp-r"><em>Nov</em><span class="cmp-b"><i style="width:${(cp.total / scale) * 100}%;background:${col(D.CATS[cp.cat].color)}"></i></span><b>${inr(cp.total)}</b></span><span class="cmp-r"><em>Oct</em><span class="cmp-b"><i style="width:${(cp.prevTotal / scale) * 100}%;background:var(--fill-strong)"></i><u style="left:${(cp.prevSame / scale) * 100}%"></u></span><b>${inr(cp.prevTotal)}</b></span></div></div></div>
<div class="gl w cf-c"><div class="w-h"><span class="gl-k">Against its limit</span><span class="w-tag">Nov</span></div><b class="gl-v">${lim ? `${Math.round(used * 100)}%` : "No limit"}</b><span class="gl-s">${lim ? `<b>${inr(lim - cp.total)}</b> left of ${inr(lim)}` : "Set one to see how far through you are"}</span><div class="gl-vis">${lim ? `<span class="gl-bar"><i style="width:${Math.min(100, used * 100)}%;background:${col(D.CATS[cp.cat].color)}"></i><u style="left:80%"></u></span>` : `<span class="btn btn-soft btn-sm">${I.plus(12)} Set a limit</span>`}</div></div>
<div class="gl w cf-c"><div class="w-h"><span class="gl-k">Days it goes on</span><span class="w-tag">Nov</span></div><b class="gl-v">${top.d}</b><span class="gl-s"><b>${inr(top.amount)}</b> on ${top.d}s, the most of any weekday</span><div class="gl-vis"><div class="wdays">${cp.dows.map((d) => `<span class="wd${d === top ? " cur" : ""}"><i style="height:${Math.max(6, (d.amount / maxD) * 100)}%"></i><em>${d.d[0]}</em></span>`).join("")}</div></div></div>
<div class="gl w cf-c"><div class="w-h"><span class="gl-k">A usual ${cp.cat.toLowerCase()} spend</span><span class="w-tag">Nov</span></div><b class="gl-v">${inr(cp.avg)}</b><span class="gl-s"><b>${plural(cp.n, "spend")}</b> · biggest <b>${cp.biggest.note}</b> ${inr(cp.biggest.amount)}</span><div class="gl-vis"><div class="bl">${[...cp.list].sort((a, b) => b.amount - a.amount).slice(0, 2).map((x) => `<div class="bl-r">${catIcon(x.category, 12, "ci-s")}<span><b>${x.note}</b><small>${dm(x.date)}</small></span><b>${inr(x.amount)}</b></div>`).join("")}</div></div></div></div>`;
}
export const emptyResults = (q = "biryani") => `<div class="empty-box er-empty">${I.search(22)}<b>Nothing matches “${q}”</b><small>Nothing in November has that in its note, category or amount. Try another word, or clear the filters to see all 26 spends.</small><span class="btn btn-soft btn-sm">Clear the search</span></div>`;
export const sampleTag = P.sampleTag;
