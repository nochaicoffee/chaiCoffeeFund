// Round 3 (2026-11-18): the hero with today's details across its top and quick add beside the calendar; the widgets outside it, in rows that align on one grid;
// "Right now" widgets (fixed to this month) and widgets that follow a period (a year by default, a month, later a range); and adding a category.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
const { I, inr } = L;
const { calendar, legend, dayPanel, monthNav, catIcon, dot, plural, pct, col, MON } = P;

const LET = "JFMAMJJASOND";
const NAMES = (c) => c;
export const SWATCHES = ["ruby", "raspberry", "coral", "copper", "amber", "olive", "emerald", "teal", "azure", "indigo", "violet", "slate"];

// ---------- The hero ----------
/** Across the top of the calendar: today's date, what's been spent today, and what's been spent this month. */
export const heroHead = (m) => `<div class="hh"><div class="hh-d"><small>Today · day ${m.counted} of ${m.len}</small><b>Wed, 18 Nov 2026</b></div><div class="hh-s"><small>Spent today</small><b>${inr(m.budget.todayTotal)}</b></div><div class="hh-s"><small>Spent this month</small><b>${inr(m.total)}</b><em>${pct(m.total, m.budget.limit)}% of ${inr(m.budget.limit)}</em></div></div>`;

const chip = (c, on) => `<span class="fc${on ? " on" : ""}"><i style="background:${col(D.CATS[c].color)}"></i>${c}</span>`;
/** The category chips: the built-in ones, any he added, then + New and Manage. */
export const catRow = (on = "Food", { extra = [] } = {}) => `<div class="fcs">${[...D.CAT_KEYS, ...extra].map((c) => chip(c, c === on)).join("")}<span class="fc fc-new">${I.plus(11)} New</span><span class="fc-link">Manage</span></div>`;
/** The inline form that opens under the chips for a new category: a name and a colour; it's selected for this spend as soon as it's saved. */
export const newCatForm = ({ name = "Pets", color = "violet" } = {}) => `<div class="ncat"><div class="ncat-h"><span class="inp ncat-i"><i class="md" style="background:${col(color)}"></i><span>${name}</span><u class="caret"></u></span></div><div class="swatches" aria-label="Colour">${SWATCHES.map((s) => `<span class="sw-c${s === color ? " on" : ""}" style="background:${col(s)}">${s === color ? I.check(11) : ""}</span>`).join("")}</div><div class="ncat-act"><span class="btn btn-soft btn-sm">Cancel</span><span class="btn btn-lime btn-sm">${I.check(12)} Save “${name}”</span></div></div>`;

/** Quick add, beside the calendar on desktop. `newCat` opens the new-category form. */
export const quickAdd = ({ newCat = false, compact = false } = {}) => `<aside class="dp dp-dark dp-form qa-card"><div class="dp-h"><div><div class="eyebrow">Quick add</div><h3>Add to today</h3></div><span class="qa-day">Wed 18 Nov ${I.chev(11)}</span></div><label class="fld"><span class="fl">Amount</span><span class="amt"><em>₹</em><b>349</b><u class="caret"></u></span></label>${compact ? "" : `<div class="fld"><span class="fl">Paid with</span>${P.methodSeg("UPI")}</div>`}<div class="fld"><span class="fl">Category <small>optional</small></span>${newCat ? `<div class="fcs">${[...D.CAT_KEYS].map((c) => chip(c, false)).join("")}${chip("Pets", true)}</div>${newCatForm()}` : catRow("Food")}</div>${compact ? "" : `<div class="fld"><span class="fl">What it was <small>optional</small></span><span class="inp"><span>Evening snacks</span></span></div>`}<span class="btn btn-lime" style="justify-content:center;min-height:48px">${I.check(13)} Add ₹349 to today</span></aside>`;

/** The hero: details across the top, the calendar, and beside it quick add and the day's panel. On a phone quick add is the pinned bar instead. */
export const hero = (m, sel, { compact = false, newCat = false } = {}) => `<section class="hero"><div class="hero-l"><div class="hero-hd">${heroHead(m)}${compact ? "" : monthNav(m)}</div>${compact ? monthNav(m) : ""}${calendar(m, { sel, compact })}${legend()}</div><div class="hero-r">${compact ? "" : quickAdd({ newCat })}${dayPanel(m, sel, { dark: true, add: "Add a spend" })}</div></section>`;

// ---------- Section headers and the period picker ----------
export const sec = (title, small = "", right = "") => `<div class="sec"><div class="sec-t"><h2>${title}</h2>${small ? `<small>${small}</small>` : ""}</div>${right}</div>`;
export const picker = (value = "2026", { open = false } = {}) => L.select({ value, kind: "pill", icon: I.cal(14), align: "align-end", open, options: [{ group: "Show" }, { label: "This month", meta: "Nov 2026", on: value === "This month" }, { label: "2026", meta: "Jan to now", on: value === "2026" }, "-", { label: "Range…", meta: "later" }] });
const nowTag = `<span class="w-tag now">Now</span>`;
const perTag = (t) => `<span class="w-tag">${t}</span>`;

// ---------- Widget visuals (each sits at the foot of its card, the same height) ----------
const letters = (s) => `<div class="mb-l">${[...s].map((x) => `<span>${x}</span>`).join("")}</div>`;
const monthPlot = (months, key, limit) => { const scale = Math.max(limit * 1.3, ...months.map((x) => x[key])); return `<div class="mb"><div class="mb-plot">${months.map((x) => `<i class="mbar${x.future ? " fut" : ""}${x.key === D.NOV ? " cur" : ""}" style="height:${x.future ? 6 : Math.max(4, (x[key] / scale) * 100)}%"></i>`).join("")}${limit ? `<u style="bottom:${(limit / scale) * 100}%"></u>` : ""}</div>${letters(LET)}</div>`; };
const dayPlot = (m) => { const max = Math.max(...m.days.map((d) => d.total), 1); return `<div class="mb"><div class="mb-plot">${m.days.filter((d) => d.counted).map((d) => `<i class="mbar${d.today ? " cur" : ""}" style="height:${Math.max(4, (d.total / max) * 100)}%"></i>`).join("")}</div><div class="mb-l"><span style="flex:1;text-align:left">1</span><span style="flex:1;text-align:right">18</span></div></div>`; };
const splitBar = (upi, card, total) => `<div class="sp2"><span class="sp2-b"><i style="width:${(upi / total) * 100}%;background:${col("teal")}"></i><i style="width:${(card / total) * 100}%;background:${col("ruby")}"></i></span><span class="sp2-l"><span>${dot("UPI")} UPI <b>${pct(upi, total)}%</b></span><span>${dot("Card")} Credit card <b>${pct(card, total)}%</b></span></span></div>`;
const catStack = (cats, total) => `<div class="sp2"><span class="sp2-b">${cats.slice(0, 5).map((c) => `<i style="width:${(c.amount / total) * 100}%;background:${col(D.CATS[c.cat].color)}"></i>`).join("")}<i style="flex:1;background:var(--fill-strong)"></i></span><span class="sp2-l">${cats.slice(1, 4).map((c) => `<span><i class="md" style="background:${col(D.CATS[c.cat].color)}"></i>${c.cat} <b>${Math.round(c.share * 100)}%</b></span>`).join("")}</span></div>`;
const bigList = (list) => `<div class="bl">${list.map((b) => `<div class="bl-r">${catIcon(b.category, 12, "ci-s")}<span><b>${b.note}</b><small>${P.dm(b.date)}</small></span><b>${inr(b.amount)}</b></div>`).join("")}</div>`;
const pills = (arr) => `<div class="pills">${arr.map(([t, st]) => `<span class="pl ${st}">${t}</span>`).join("")}</div>`;

const wc = (k, tag, v, s, vis, { tone = "" } = {}) => `<div class="gl w"><div class="w-h"><span class="gl-k">${k}</span>${tag}</div><b class="gl-v ${tone}">${v}</b><span class="gl-s">${s}</span><div class="gl-vis">${vis}</div></div>`;
const barOne = (w, c) => `<span class="gl-bar"><i style="width:${Math.min(100, w)}%;background:${c}"></i></span>`;

/** The three that are about right now (this month), so they stay put when the period changes. */
export function nowWidgets(m) {
  const b = m.budget, wk = b.week, over = m.pace > b.limit;
  const wcells = m.weeks.find((w) => w.inProgress).cells, wmax = Math.max(b.limit / 30, ...wcells.map((d) => d?.total ?? 0));
  const days = ["M", "T", "W", "T", "F", "S", "S"].map((l, i) => { const d = wcells[i]; return `<span class="wd${d?.today ? " cur" : ""}${d && d.future ? " fut" : ""}"><i style="height:${d && !d.future ? Math.max(6, (d.total / wmax) * 100) : 6}%"></i><em>${l}</em></span>`; }).join("");
  const scale = b.limit * 1.4;
  return [
    wc("Left today", nowTag, b.todayLeft < 0 ? `−${inr(-b.todayLeft)}` : inr(b.todayLeft), b.todayLeft < 0 ? `past today's ${inr(b.allowToday)}` : `of ${inr(b.allowToday)} for today`, barOne(b.allowToday ? (b.todayTotal / b.allowToday) * 100 : 100, b.todayLeft < 0 ? "var(--negative)" : "var(--accent)"), { tone: b.todayLeft < 0 ? "neg" : "" }),
    wc("Week so far", nowTag, inr(wk.total), `<b>${inr(Math.max(0, wk.share - wk.total))}</b> left of ${inr(wk.share)} · ${P.rangeLabel(wk.from, wk.to, true)}`, `<div class="wdays">${days}</div>`),
    wc("On track to end at", nowTag, inr(m.pace), over ? `<b class="neg">${inr(m.pace - b.limit)} over</b> your ${inr(b.limit)}` : `<b class="pos">${inr(b.limit - m.pace)} under</b> your ${inr(b.limit)}`, `<span class="gl-bar"><i style="width:${Math.min(100, (m.pace / scale) * 100)}%;background:${over ? "var(--warning)" : "var(--accent)"}"></i><u style="left:${(b.limit / scale) * 100}%"></u></span>`, { tone: over ? "warn" : "" }),
  ];
}

/** The six that follow the period. A year reads D.YEARM; a month reads the month. A range would build the same view over its own months. */
export function periodWidgets(kind = "year") {
  const m = D.NOVM, b = m.budget, daily = Math.round(D.LIMIT / 30);
  if (kind === "year") {
    const y = D.YEARM, top = y.cats[0];
    return [
      wc("Spent in 2026", perTag("2026"), inr(y.total), `<b>${inr(y.avg)}</b> a month on average · ${y.live.length} months`, monthPlot(y.months, "total", D.LIMIT)),
      wc("Top category", perTag("2026"), `<span class="tc">${catIcon(top.cat, 15, "ci-s")} ${top.cat}</span>`, `<b>${inr(top.amount)}</b> · ${Math.round(top.share * 100)}% of the year`, catStack(y.cats, y.total)),
      wc("Biggest spend", perTag("2026"), inr(y.bigs[0].amount), `${y.bigs[0].note} · ${P.dm(y.bigs[0].date)} · ${P.methodName(y.bigs[0].method)}`, bigList(y.bigs.slice(1, 3))),
      wc("UPI vs credit card", perTag("2026"), `${pct(y.card, y.total)}% card`, `<b>${inr(y.upi)}</b> UPI · <b>${inr(y.card)}</b> card`, splitBar(y.upi, y.card, y.total)),
      wc("Quiet days", perTag("2026"), `${y.quiet} days`, `Longest run under ${inr(daily)}: <b>${y.bestRun} days</b> (Oct) · now <b>${y.curRun}</b>`, `<div class="mb"><div class="mb-plot">${y.months.map((x) => `<i class="mbar q${x.future ? " fut" : ""}" style="height:${x.future ? 6 : Math.max(8, (x.quiet / 4) * 100)}%"></i>`).join("")}</div>${letters(LET)}</div>`),
      wc("Months inside the limit", perTag("2026"), `${y.inside} of ${y.fullCount}`, `${y.over.map((o) => `${P.MONTH[+o.key.slice(5, 7) - 1].slice(0, 3)} ${inr(o.total)}`).join(" and ")} went over ${inr(D.LIMIT)}`, pills(y.months.map((x, i) => [LET[i], x.future ? "fut" : x.key === D.NOV ? "cur" : x.total <= D.LIMIT ? "ok" : "bad"]))),
    ];
  }
  const top = m.cats[0], bigSp = [...m.spends].sort((a, b2) => b2.amount - a.amount);
  const under = m.days.filter((d) => d.counted && d.total <= daily).length;
  return [
    wc("Spent in November", perTag("Nov"), inr(m.total), `<b>${inr(Math.round(m.perDay))}</b> a day · day ${m.counted} of ${m.len}`, dayPlot(m)),
    wc("Top category", perTag("Nov"), `<span class="tc">${catIcon(top.cat, 15, "ci-s")} ${top.cat}</span>`, `<b>${inr(top.amount)}</b> · ${Math.round(top.share * 100)}% of the month`, catStack(m.cats, m.total)),
    wc("Biggest spend", perTag("Nov"), inr(bigSp[0].amount), `${bigSp[0].note} · ${P.dm(bigSp[0].date)} · ${P.methodName(bigSp[0].method)}`, bigList(bigSp.slice(1, 3).map((x) => ({ note: x.note, amount: x.amount, date: x.date, category: x.category })))),
    wc("UPI vs credit card", perTag("Nov"), `${pct(m.card, m.total)}% card`, `<b>${inr(m.upi)}</b> UPI · <b>${inr(m.card)}</b> card`, splitBar(m.upi, m.card, m.total)),
    wc("Quiet days", perTag("Nov"), `${m.quiet} day`, `Nothing written down on <b>Nov 11</b> · run under ${inr(daily)} now <b>${D.YEARM.curRun}</b>`, pills(m.days.filter((d) => d.counted).map((d) => [d.d, d.spends.length === 0 ? "none" : "ok"]).slice(-12))),
    wc("Days under the allowance", perTag("Nov"), `${under} of ${m.counted}`, `Days at or under ${inr(daily)} (the limit ÷ ${m.len})`, pills(m.days.filter((d) => d.counted).map((d) => [d.d, d.total <= daily ? "ok" : d.total <= daily * 2 ? "mid" : "bad"]).slice(-12))),
  ];
}

// ---------- Where it went, and Month by month, for a period ----------
export function whereYear(y, { rows = 8 } = {}) {
  const max = y.cats[0].amount;
  return `${P.cardHead(`Where ${y.label} went`, "", `<span class="ww-t">${inr(y.total)}</span>`)}<div class="ww">${y.cats.slice(0, rows).map((c) => `<div class="ww-r">${catIcon(c.cat, 14)}<b class="ww-n">${c.cat}</b><span class="ww-bar"><span style="width:${(c.amount / max) * 100}%;background:${col(D.CATS[c.cat].color)}"></span></span><span class="ww-v">${inr(c.amount)}<small>${Math.round(c.share * 100)}%</small></span></div>`).join("")}</div>`;
}
export function monthsYear(y) {
  const max = Math.max(...y.months.map((x) => x.total), D.LIMIT);
  const rows = y.months.map((x, i) => `<div class="my-r${x.key === D.NOV ? " on" : ""}${x.future ? " fut" : ""}"><b>${P.MONTH[i].slice(0, 3)}</b><span class="mo-bar"><span style="width:${(x.upi / max) * 100}%;background:${col("teal")}"></span><span style="width:${(x.card / max) * 100}%;background:${col("ruby")}"></span><span class="mo-lim" style="left:${(D.LIMIT / max) * 100}%"></span></span><b class="mo-t">${x.future ? "—" : inr(x.total)}</b><small class="${x.total > D.LIMIT ? "neg" : ""}">${x.future ? "" : x.total > D.LIMIT ? `${inr(x.total - D.LIMIT)} over` : `${inr(D.LIMIT - x.total)} under`}</small></div>`).join("");
  return `${P.cardHead("Month by month", y.label, `<span class="lg-lim"><i></i>${inr(D.LIMIT)} limit</span>`)}<div class="my">${rows}</div>`;
}

// ---------- Managing categories ----------
export function manageList({ hidden = ["Health"], extra = ["Pets"], renaming = "" } = {}) {
  const all = [...D.CAT_KEYS, ...extra];
  return `<div class="mg">${all.map((c) => `<div class="mg-r${hidden.includes(c) ? " off" : ""}">${catIcon(c, 14)}<span class="mg-n">${renaming === c ? `<span class="inp mg-i"><span>${c}</span><u class="caret"></u></span>` : `<b>${c}</b>${extra.includes(c) ? "<em>yours</em>" : ""}`}</span><span class="mg-a" title="Rename">${I.pencil(13)}</span><span class="mg-a" title="Colour"><i style="background:${col(D.CATS[c].color)}"></i></span><span class="mg-a eye${hidden.includes(c) ? " off" : ""}" title="${hidden.includes(c) ? "Show" : "Hide"} in the list">${hidden.includes(c) ? I.x(13) : I.check(13)}</span></div>`).join("")}</div>`;
}
