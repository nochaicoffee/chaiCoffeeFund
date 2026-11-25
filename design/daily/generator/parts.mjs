// The pieces the Daily boards share: the calendar grid, the day panel and its add form, the pointing greeting, tiles, categories, months, the ring, week bars and the streak strip.
// Static HTML; hover cards are CSS only. Every figure comes from data.mjs.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
const { I, inr } = L;

export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const dowOf = (iso) => DOW[new Date(`${iso}T00:00:00Z`).getUTCDay()];
export const dm = (iso) => `${+iso.slice(8)} ${MON[+iso.slice(5, 7) - 1]}`;
/** "2–8" (or "2–8 Nov"), or just "1" (or "1 Nov") for a one-day week. */
export const rangeLabel = (from, to, withMonth = false) => { const a = +from.slice(8), b = +to.slice(8), m = withMonth ? ` ${MON[+to.slice(5, 7) - 1]}` : ""; return a === b ? `${a}${m}` : `${a}–${b}${m}`; };
export const dayLong = (iso) => `${dowOf(iso)}, ${MON[+iso.slice(5, 7) - 1]} ${+iso.slice(8)}`;
export const monthName = (k) => MONTH[+k.slice(5, 7) - 1];
export const monthY = (k) => `${monthName(k)} ${k.slice(0, 4)}`;
export const monY = (k) => `${MON[+k.slice(5, 7) - 1]} ${k.slice(0, 4)}`;
/** ₹4.9k for a cell too small for ₹4,999. */
export const k = (n) => (n >= 10000 ? `₹${(n / 1000).toFixed(0)}k` : n >= 1000 ? `₹${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : inr(n));
export const col = (c) => `var(--card-${c})`;
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const card = (inner, { gap = 16, style = "", cls = "" } = {}) => `<section class="card glass ${cls}" style="gap:${gap}px;${style}">${inner}</section>`;
export const cardHead = (title, small = "", right = "") => `<div class="card-h"><div class="card-t">${title}${small ? `<small>${small}</small>` : ""}</div>${right}</div>`;
export const sampleTag = (t = "Sample data, made up") => `<span class="sample sample-tag">${t}</span>`;
export const proposalTag = (t = "Proposal") => `<span class="pill pill-soon">${t}</span>`;
export const page = (body) => L.desktop({ h: "auto", body: `<div class="pgcol">${body}</div>` });
export const phonePage = (body) => L.phone({ h: "auto", body });

// ---------- Category icons ----------
const sv = (d, s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  fork: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 21V3c-2 1-3 4-3 8h3"/>',
  basket: '<path d="M5 9h14l-1.5 10h-11Z"/><path d="M9 9l3-5 3 5"/>',
  bus: '<rect x="5" y="4" width="14" height="13" rx="2"/><path d="M5 12h14M8 20v-3M16 20v-3"/>',
  bag: '<path d="M6 8h12l1 12H5Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10Z"/>',
  ticket: '<path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 0 0-6V6H3Z"/><path d="M14 6v12"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
};
export const catIcon = (cat, s = 15, cls = "") => `<span class="ci ${cls}" style="--cc:${col(D.CATS[cat].color)}">${sv(ICONS[D.CATS[cat].icon], s)}</span>`;
export const dot = (method) => `<i class="md md-${method === "UPI" ? "u" : method === "Cash" ? "k" : "c"}"></i>`;
export const methodName = (m) => D.METHODS[m].name;

// ---------- Greeting that points (CSS hover cards) ----------
const hc = ({ h, t = "", d = "", rows = [], f = "", w = 290 }) => `<div class="hc" style="width:${w}px"><div class="h"><span>${h}</span></div>${t ? `<div class="t">${t}</div>` : ""}${d ? `<div class="d">${d}</div>` : ""}${rows.length ? `<ul>${rows.map(([nm, v, c]) => `<li>${c ? `<i style="width:8px;height:8px;border-radius:50%;background:${c};flex-shrink:0"></i>` : ""}<span class="nm">${nm}</span><b>${v}</b></li>`).join("")}</ul>` : ""}${f ? `<div class="f">${f}</div>` : ""}</div>`;
const tip = (c2, { w = 290, x = "l" } = {}) => `<span class="hc-wrap" style="top:calc(100% + 8px);${x === "c" ? `left:50%;margin-left:-${w / 2}px` : x === "l" ? "left:0" : "right:0"}">${c2}</span>`;
const pt = (text, c2, o) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(c2, o)}</span>`;

/** The greeting sentence for a month, with the limit when the board has one. */
export function lede(m, { budget = true } = {}) {
  const mm = monthName(m.key);
  if (m.count === 0) return `Nothing written down for ${mm} yet. Add what you spent today, and this page fills in as you go.${budget ? ` Your limit for ${mm} is <b>${inr(D.LIMIT)}</b>.` : ""}`;
  const spent = hc({ h: `Spent in ${mm}`, t: inr(m.total), rows: [["UPI", inr(m.upi), col("teal")], ["Credit card", inr(m.card), col("ruby")]], f: `${plural(m.count, "spend")} written down. A usual month is ${inr(D.usual().total)}, the average of the earlier months.` });
  const upi = hc({ h: `UPI in ${mm}`, t: inr(m.upi), rows: [[`${pct(m.upi, m.total)}% of the month`, inr(m.upi), col("teal")]], f: `A usual month has ${inr(D.usual().upi)} on UPI.` });
  const cc = hc({ h: `Credit card in ${mm}`, t: inr(m.card), rows: [[`${pct(m.card, m.total)}% of the month`, inr(m.card), col("ruby")]], f: `A usual month has ${inr(D.usual().card)} on credit cards.` });
  const perDay = hc({ h: "Spent each day", t: inr(Math.round(m.perDay)), rows: [["Biggest day", inr(m.biggest.total)], ["Days with nothing written", String(m.quiet)]], f: `${inr(m.total)} over ${plural(m.counted, "day")}.` });
  let out = `${m.cur ? "You've spent" : "You spent"} ${pt(inr(m.total), spent)} in ${mm}${m.cur ? " so far" : ""}: ${pt(inr(m.upi), upi)} on UPI and ${pt(inr(m.card), cc)} on credit cards, about ${pt(inr(Math.round(m.perDay)), perDay, { x: "r" })} a day.`;
  if (budget && m.budget && !m.cur) {
    const b = m.budget;
    out += ` You ended the month <b class="${b.left < 0 ? "neg" : "pos"}">${inr(Math.abs(b.left))} ${b.left < 0 ? "over" : "under"}</b> your ${inr(b.limit)} limit.`;
  } else if (budget && m.budget) {
    const b = m.budget;
    const left = hc({ h: `Left of your ${inr(b.limit)} limit`, t: inr(b.left), rows: [["Spent so far", inr(m.total), col("ruby")], ["Expected by the 18th", inr(b.expected)], ["Over the pace by", inr(b.overPace)]], f: `${inr(b.perDayLeft)} a day for the ${plural(b.daysLeft, "day")} left keeps you inside it.`, w: 300 });
    out += ` <b>${inr(b.left)}</b> of your limit is left, ${pt(inr(b.perDayLeft) + " a day", left, { x: "r" })} for the ${plural(b.daysLeft, "day")} to go.`;
  }
  return out;
}
export function header({ m, title = "Good evening, Prathik", budget = true, actions, eyebrow = `Daily · Wed, 18 Nov`, phone = false }) {
  return `<header class="pg-head${phone ? " ph-head" : ""}"><div class="pg-text"><div class="eyebrow">${eyebrow} ${phone ? "" : sampleTag()}</div><h1>${title}</h1><div class="lede">${lede(m, { budget })}</div></div>${actions ? `<div class="pg-actions">${actions}</div>` : ""}</header>`;
}
export const actions = ({ plus = true } = {}) => `${L.iconBtn(I.refresh(15), "Refresh")}${L.btn("Add a spend", { kind: "primary", icon: I.plus() })}`;

// ---------- Month switcher ----------
export function monthNav(m, { today = true, cls = "" } = {}) {
  return `<nav class="mnav ${cls}" aria-label="Month"><span class="mn-b">${I.chevL(14)}</span><b>${monthY(m.key)}</b><span class="mn-b${m.cur ? " off" : ""}">${I.chevR(14)}</span>${m.cur ? "" : `<span class="link">Back to this month</span>`}</nav>`;
}

// ---------- The calendar ----------
const level = (t) => (t <= 0 ? 0 : t < 500 ? 1 : t < 1500 ? 2 : t < 3000 ? 3 : 4);
/** Day number, UPI and card dots, the day's total and how many spends. `sel` is the selected date; `weekTotals` adds a Week column; `daily` marks days over the daily pace. */
export function calendar(m, { sel, weekTotals = false, daily = null, cls = "", compact = false } = {}) {
  const head = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<span>${d}</span>`).join("") + (weekTotals ? `<span class="cw-h">Week</span>` : "");
  const cell = (c) => {
    if (!c) return `<div class="cd blank"></div>`;
    const lv = level(c.total);
    const n = c.spends.length;
    const dots = `${c.upi > 0 ? `<i class="md md-u"></i>` : ""}${c.card > 0 ? `<i class="md md-c"></i>` : ""}`;
    const total = c.total > 0 ? (compact ? k(c.total) : inr(c.total)) : c.today ? `<span class="cd-add">${I.plus(11)}</span>` : "";
    const classes = ["cd", c.today && "today", c.date === sel && "sel", c.future && "future", c.counted && n === 0 && !c.today && "quiet", daily != null && c.total > daily && "over", `lv${lv}`].filter(Boolean).join(" ");
    return `<div class="${classes}"><span class="cd-n">${c.d}</span>${dots ? `<span class="cd-dots">${dots}</span>` : ""}<span class="cd-t">${total}</span>${n > 1 && !compact ? `<span class="cd-c">${n} spends</span>` : ""}${c.today ? `<span class="cd-tag">Today</span>` : ""}</div>`;
  };
  const rows = m.weeks.map((w) => `<div class="cal-r">${w.cells.map(cell).join("")}${weekTotals ? `<div class="cw${w.inProgress ? " now" : ""}"><b>${w.total ? inr(w.total) : "—"}</b><small>${rangeLabel(w.from, w.to)}</small></div>` : ""}</div>`).join("");
  return `<div class="cal ${weekTotals ? "cal-wk" : ""} ${cls}"><div class="cal-hd">${head}</div>${rows}</div>`;
}
export const legend = (extra = "") => `<div class="legend"><span><i style="background:${col("teal")};border-radius:50%"></i>UPI</span><span><i style="background:${col("ruby")};border-radius:50%"></i>Credit card</span><span class="lg-n">The shade is the day's total</span>${extra}</div>`;

// ---------- The day panel ----------
export function dayRow(x) {
  return `<div class="dp-r">${catIcon(x.category, 15)}<span class="dp-n"><b>${x.note ?? x.category}</b><small>${x.note ? `${x.category} · ` : ""}${dot(x.method)} ${methodName(x.method)}</small></span><span class="dp-a">${inr(x.amount)}</span></div>`;
}
/** The selected day, as a panel: its total, the split, its spends, and Add. */
export function dayPanel(m, date, { cls = "", add = "Add a spend", more = 0, dark = false } = {}) {
  const day = m.days.find((d) => d.date === date);
  const rel = date === D.TODAY ? "Today" : `${D.TODAY > date ? Math.round((Date.parse(D.TODAY) - Date.parse(date)) / 864e5) : 0} days ago`;
  const list = day.spends.length
    ? day.spends.map(dayRow).join("")
    : `<div class="dp-empty">${I.plus(16)}<b>Nothing written for ${dayLong(date)}</b><small>${m.count === 0 ? "Add your first spend. The amount and UPI or card is all it needs." : "A quiet day, or one you haven't written down yet."}</small></div>`;
  return `<aside class="dp ${dark ? "dp-dark" : "card glass"} ${cls}"><div class="dp-h"><div><div class="eyebrow">${rel}</div><h3>${dayLong(date)}</h3></div><div class="dp-tot"><b>${inr(day.total)}</b>${day.total ? `<small>${dot("UPI")}${inr(day.upi)} ${dot("Card")}${inr(day.card)}</small>` : ""}</div></div><div class="dp-l${more ? " scroll" : ""}">${list}</div>${more ? `<div class="dp-more">${I.down(11)} ${more} more</div>` : ""}<span class="btn btn-primary dp-add">${I.plus()} ${add}${day.spends.length ? ` on ${dm(date).replace(/ \w+$/, "")} ${MON[+date.slice(5, 7) - 1]}` : ""}</span></aside>`;
}
/** The add form in the panel's place, and the toast above it (the add-spend state). */
export function addForm(date, { toast = true, cls = "", dark = false, amount = "349", note = "Evening snacks", cat = "Food", method = "UPI", existing = "" } = {}) {
  const cats = D.CAT_KEYS.map((c) => `<span class="fc${c === cat ? " on" : ""}"><i style="background:${col(D.CATS[c].color)}"></i>${c}</span>`).join("");
  return `<aside class="dp dp-form ${dark ? "dp-dark" : "card glass"} ${cls}">${toast ? `<div class="toast">${I.check(13)} Spend added · ₹349 on UPI <span class="undo">Undo</span></div>` : ""}<div class="dp-h"><div><div class="eyebrow">Adding to</div><h3>${dayLong(date)}</h3></div><span class="dlg-x">${I.x(14)}</span></div><label class="fld"><span class="fl">Amount</span><span class="amt"><em>₹</em><b>${amount}</b><u class="caret"></u></span></label><div class="fld"><span class="fl">Paid with</span><span class="seg seg-m"><span class="seg-i on">${dot("UPI")} UPI</span><span class="seg-i">${dot("Card")} Credit card</span></span></div><div class="fld"><span class="fl">Category <small>optional</small></span><div class="fcs">${cats}</div></div><div class="fld"><span class="fl">What it was <small>optional</small></span><span class="inp"><span>${note}</span></span></div>${existing ? `<div class="fld"><span class="fl">Already on this day</span><div class="dp-l">${existing}</div></div>` : ""}<div class="dp-act"><span class="btn btn-soft">Cancel</span><span class="btn btn-primary">${I.check(13)} Add spend</span></div><div class="dp-hint">Press Enter to add. Adds to ${dayLong(date)}.</div></aside>`;
}

// ---------- Tiles ----------
const rings = `<span class="tex"><svg viewBox="0 0 400 160" preserveAspectRatio="xMaxYMid slice"><g fill="none" stroke="var(--rings-ink)" stroke-opacity="0.13" stroke-width="1.5"><circle cx="360" cy="40" r="30"/><circle cx="360" cy="40" r="56"/><circle cx="360" cy="40" r="84"/><circle cx="360" cy="40" r="114"/></g></svg></span>`;
/** Spent, UPI, Credit card, and what's left of the limit. */
export function tiles(m, { limit = true, cls = "" } = {}) {
  const b = m.budget;
  const left = limit && b
    ? `<div class="stile glass"><span class="k">${b.left < 0 ? "Over the limit" : "Left to spend"}</span><span class="v ${b.left < 0 ? "neg" : ""}">${inr(Math.abs(b.left))}</span><span class="s">${b.left < 0 ? (m.cur ? "already past your limit" : "the month ended over it") : m.cur ? `<b>${inr(b.perDayLeft)}</b> a day for ${plural(b.daysLeft, "day")}` : "the month ended under it"}</span><span class="track"><span style="width:${Math.min(100, b.used * 100)}%;background:${b.left < 0 ? "var(--negative)" : b.overPace > 0 && m.cur ? "var(--warning)" : "var(--accent)"}"></span></span></div>`
    : `<div class="stile glass"><span class="k">A day</span><span class="v">${inr(Math.round(m.perDay))}</span><span class="s">${plural(m.quiet, "quiet day")} of ${m.counted}</span></div>`;
  return `<div class="tiles ${cls}" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div class="stile feature textured">${rings}<span class="k">${m.cur ? "Spent so far" : "Spent"}</span><span class="v">${inr(m.total)}</span><span class="s">${b ? `<b>${pct(m.total, b.limit)}%</b> of your ${inr(b.limit)} limit` : plural(m.count, "spend")}</span></div><div class="stile glass"><span class="k"><i class="md md-u"></i> UPI</span><span class="v">${inr(m.upi)}</span><span class="s"><b>${pct(m.upi, m.total)}%</b> of the month</span></div><div class="stile glass"><span class="k"><i class="md md-c"></i> Credit card</span><span class="v">${inr(m.card)}</span><span class="s"><b>${pct(m.card, m.total)}%</b> of the month</span></div>${left}</div>`;
}

// ---------- Where it went, months ----------
export function whereWent(m, { rows = 8, note = true } = {}) {
  if (!m.cats.length) return `${cardHead("Where it went")}<div class="empty-box"><b>Nothing to split yet</b><small>Give a spend a category when you add it, and this shows which ones took the month.</small></div>`;
  const max = m.cats[0].amount;
  const list = m.cats.slice(0, rows).map((c) => `<div class="ww-r">${catIcon(c.cat, 14)}<b class="ww-n">${c.cat}</b><span class="ww-bar"><span style="width:${(c.amount / max) * 100}%;background:${col(D.CATS[c.cat].color)}"></span></span><span class="ww-v">${inr(c.amount)}<small>${Math.round(c.share * 100)}%</small></span></div>`).join("");
  return `${cardHead(`Where ${monthName(m.key)} went`, "", `<span class="ww-t">${inr(m.total)}</span>`)}<div class="ww">${list}</div>${note ? `<p class="card-note foot">Spends without a category are left out of the bars.</p>` : ""}`;
}
export function months(picked = D.NOV, { rows = 6, limit = true, spends = D.ALL_SPENDS } = {}) {
  const list = D.monthRows(spends).slice(0, rows);
  const max = Math.max(...list.map((r) => r.total), D.LIMIT);
  const lim = limit ? `<span class="mo-lim" style="left:${(D.LIMIT / max) * 100}%"></span>` : "";
  return list.map((r) => `<div class="mo-r${r.key === picked ? " on" : ""}"><b>${monY(r.key)}</b><span class="mo-bar"><span style="width:${(r.upi / max) * 100}%;background:${col("teal")}"></span><span style="width:${(r.card / max) * 100}%;background:${col("ruby")}"></span>${lim}</span><b class="mo-t">${inr(r.total)}</b><small>UPI ${inr(r.upi)} · Credit card ${inr(r.card)}</small></div>`).join("");
}
export const monthsCard = (picked, o = {}) => `${cardHead("Month by month", "the last six months", o.limit === false ? "" : `<span class="lg-lim"><i></i>${inr(D.LIMIT)} limit</span>`)}<div class="mo">${months(picked, o)}</div>`;

// ---------- The ring (spent against the limit) ----------
export function ring(m, { size = 220, stroke = 22 } = {}) {
  const b = m.budget, r = (size - stroke) / 2, C = 2 * Math.PI * r, c = size / 2;
  const seg = (frac, off, color) => `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="butt" stroke-dasharray="${Math.max(0, frac) * C} ${C}" stroke-dashoffset="${-off * C}" transform="rotate(-90 ${c} ${c})"/>`;
  const upiF = Math.min(1, m.upi / b.limit), cardF = Math.min(1 - upiF, m.card / b.limit);
  const pace = b.expected / b.limit, a = pace * 2 * Math.PI - Math.PI / 2;
  const x1 = c + (r - stroke / 2 - 4) * Math.cos(a), y1 = c + (r - stroke / 2 - 4) * Math.sin(a), x2 = c + (r + stroke / 2 + 5) * Math.cos(a), y2 = c + (r + stroke / 2 + 5) * Math.sin(a);
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--fill)" stroke-width="${stroke}"/>${seg(cardF, 0, col("ruby"))}${seg(upiF, cardF, col("teal"))}<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--fg)" stroke-width="3" stroke-linecap="round"/></svg><div class="ring-c"><small>Left to spend</small><b>${inr(b.left)}</b><span>of ${inr(b.limit)}</span></div></div>`;
}
export const ringNote = (m) => { const b = m.budget; return `<span class="ring-pace"><i></i>Pace for the ${m.counted}th: <b>${inr(b.expected)}</b> · you're <b class="${b.overPace > 0 ? "neg" : "pos"}">${inr(Math.abs(b.overPace))} ${b.overPace > 0 ? "over" : "under"}</b></span>`; };

// ---------- Weeks ----------
export function weekBars(m, { allowanceDays = 7 } = {}) {
  const allow = Math.round((D.LIMIT * allowanceDays) / m.len);
  const max = Math.max(allow, ...m.weeks.map((w) => w.total));
  return m.weeks.filter((w) => w.cells.some((c) => c && !c.future)).map((w) => {
    const over = w.total - allow;
    const label = rangeLabel(w.from, w.to, true);
    return `<div class="wk-r${w.inProgress ? " now" : ""}"><span class="wk-l"><b>${label}</b><small>${w.inProgress ? "this week so far" : "week"}</small></span><span class="wk-bar"><span style="width:${(w.upi / max) * 100}%;background:${col("teal")}"></span><span style="width:${(w.card / max) * 100}%;background:${col("ruby")}"></span><i class="wk-tick" style="left:${(allow / max) * 100}%"></i></span><span class="wk-v"><b>${inr(w.total)}</b><small class="${over > 0 && !w.inProgress ? "neg" : "pos"}">${w.inProgress ? `${inr(allow - w.total)} of ${inr(allow)} left` : over > 0 ? `${inr(over)} over ${inr(allow)}` : `${inr(-over)} under ${inr(allow)}`}</small></span></div>`;
  }).join("");
}

// ---------- The streak strip ----------
export function streak(m, { daily = Math.round(D.LIMIT / m.len), cls = "" } = {}) {
  const cells = m.days.map((d) => {
    const st = d.future ? "fut" : d.total === 0 ? "none" : d.total <= daily ? "ok" : d.total <= daily * 2 ? "hi" : "bad";
    return `<span class="sk ${st}${d.today ? " today" : ""}" title="${dayLong(d.date)}">${d.d}</span>`;
  }).join("");
  return `<div class="sks ${cls}">${cells}</div>`;
}
export const streakLegend = (daily) => `<div class="legend"><span><i class="sk-ok"></i>Under ${inr(daily)}</span><span><i class="sk-hi"></i>Up to ${inr(daily * 2)}</span><span><i class="sk-bad"></i>More</span><span><i class="sk-none"></i>Nothing written</span></div>`;
export const streakDays = (m, daily = Math.round(D.LIMIT / m.len)) => { let n = 0; for (const d of [...m.days].reverse().filter((x) => x.counted)) { if (d.total > daily) break; n++; } return n; };

// ---------- A feed of spends (a day at a time, newest first) ----------
export function feed(m, { days = 5, from } = {}) {
  const list = [...m.days].reverse().filter((d) => d.spends.length && (!from || d.date <= from)).slice(0, days);
  return list.map((d) => `<div class="fd-d"><div class="fd-h"><b>${d.date === D.TODAY ? "Today" : d.date === "2026-11-17" ? "Yesterday" : dayLong(d.date)}</b><small>${d.date === D.TODAY || d.date === "2026-11-17" ? dayLong(d.date) : ""}</small><span class="fd-t">${inr(d.total)}</span></div>${[...d.spends].reverse().map(dayRow).join("")}</div>`).join("");
}

// ---------- A few small widgets ----------
export const sparkBars = (m, { h = 70, grow = false } = {}) => {
  const max = Math.max(...m.days.map((d) => d.total), 1);
  return `<div class="spark" style="${grow ? `flex:1;min-height:${h}px` : `height:${h}px`}">${m.days.filter((d) => d.counted).map((d) => `<span class="sp${d.today ? " today" : ""}" title="${dayLong(d.date)}"><i class="u" style="height:${(d.upi / max) * 100}%"></i><i class="c" style="height:${(d.card / max) * 100}%"></i></span>`).join("")}</div>`;
};
export const keypad = () => `<div class="kp">${["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((x) => `<span class="kk${x === "⌫" ? " kk-b" : ""}">${x}</span>`).join("")}</div>`;
export const methodSeg = (on = "UPI") => `<span class="seg seg-m"><span class="seg-i${on === "UPI" ? " on" : ""}">${dot("UPI")} UPI</span><span class="seg-i${on === "Card" ? " on" : ""}">${dot("Card")} Credit card</span></span>`;
export const catChips = (on = "Food", keys = D.CAT_KEYS) => `<div class="fcs">${keys.map((c) => `<span class="fc${c === on ? " on" : ""}"><i style="background:${col(D.CATS[c].color)}"></i>${c}</span>`).join("")}</div>`;
