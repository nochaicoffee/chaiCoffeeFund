// The widgets shared by every Overview board: the greeting that points, the attention strip, the section tiles, Coming up, This month,
// Bank balance and Goals. Static HTML; the hover cards are CSS only. Every figure comes from data.mjs.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
const { I, inr, inrL } = L;

export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dm = (iso) => `${+iso.slice(8)} ${MON[+iso.slice(5, 7) - 1]}`;
export const dmy = (iso) => `${dm(iso)} ${iso.slice(0, 4)}`;
export const dowDm = (iso) => `${L.dow(iso)} ${dm(iso)}`;
export const col = (c) => `var(--card-${c})`;
export const grad = (c) => `linear-gradient(155deg,var(--card-${c}-from),var(--card-${c}-to))`;
export const fillc = (c, a = 90) => `linear-gradient(${a}deg,color-mix(in oklch,var(--card-${c}) 80%,white),var(--card-${c}))`;
export const daysAway = (iso) => { const n = L.daysBetween(D.TODAY, iso); return n === 0 ? "today" : n === 1 ? "tomorrow" : n > 0 ? `in ${n} days` : n === -1 ? "yesterday" : `${-n} days ago`; };
export const lakh = (n) => (n < 0 ? "−" + lakh(-n) : Math.abs(n) >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : inr(n));
export const pct = (a, b, d = 0) => `${((a / b) * 100).toFixed(d)}%`;
export const big = (n) => `<small>₹</small>${Math.round(n).toLocaleString("en-IN")}`;
export const radios = (p, keys, def = keys[0]) => keys.map((k) => `<input class="pk-in" type="radio" name="${p}" id="${p}-${k}"${k === def ? " checked" : ""}>`).join("");

export const hc = ({ h, hr = "", t = "", d = "", rows = [], f = "", w = 280 }) =>
  `<div class="hc" style="width:${w}px"><div class="h"><span>${h}</span>${hr}</div>${t ? `<div class="t">${t}</div>` : ""}${d ? `<div class="d">${d}</div>` : ""}${rows.length ? `<ul>${rows.map(([nm, v, c]) => `<li>${c ? `<i style="width:8px;height:8px;border-radius:50%;background:${c};flex-shrink:0"></i>` : ""}<span class="nm">${nm}</span><b>${v}</b></li>`).join("")}</ul>` : ""}${f ? `<div class="f">${f}</div>` : ""}</div>`;
export const tip = (card2, { w = 280, x = "c", y = "down", off = 8 } = {}) =>
  `<span class="hc-wrap" style="${y === "up" ? `bottom:calc(100% + ${off}px)` : `top:calc(100% + ${off}px)`};${x === "c" ? `left:50%;margin-left:-${w / 2}px` : x === "l" ? "left:0" : "right:0"}">${card2}</span>`;
export const card = (inner, { gap = 16, style = "", cls = "" } = {}) => `<section class="card glass ${cls}" style="gap:${gap}px;${style}">${inner}</section>`;
export const cardHead = (title, small = "", right = "") => `<div class="card-h"><div class="card-t">${title}${small ? `<small>${small}</small>` : ""}</div>${right}</div>`;
export const link = (t) => `<span class="link">${t}${I.arrowR(12)}</span>`;
export const grid = (items, gap = 20) => `<div class="g12" style="gap:${gap}px">${items.map(([span, html]) => `<div style="grid-column:span ${span}">${html}</div>`).join("")}</div>`;
export const page = (body) => L.desktop({ h: "auto", body: `<div class="pgcol">${body}</div>` });
export const sampleTag = (t = "Sample data, made up") => `<span class="sample sample-tag">${t}</span>`;

// ---------- The greeting, pointing ----------
const pt = (text, card2, { x = "l", w = 300 } = {}) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(card2, { w, x, y: "down" })}</span>`;
const SEC = { bank: D.BANK, invest: D.INVEST, fixed: D.FIXED, lent: D.LENT };
export function pointLede() {
  const worth = hc({ h: "Net worth", t: inr(D.NET), d: "what you own less what you owe", rows: [["Owned", inr(D.OWNED)], ["Owed", `−${inr(D.OWED)}`]], f: "The same figure as the Overview's net worth today. Investments at today's prices, EPF at the passbook figure, a dollar account at today's rate." });
  const owned = hc({ h: "What you own", t: inr(D.OWNED), rows: [["Bank and brokers' cash", inr(D.BANK), col("sapphire")], ["Investments", inr(D.INVEST), col("indigo")], ["Fixed income", inr(D.FIXED), col("forest")], ["Lent out", inr(D.LENT), col("copper")]], f: "Lent out is owed to you by a person, so it can go bad; it is its own line, never folded into fixed deposits." });
  const owed = hc({ h: "What you owe", t: inr(D.OWED), rows: [["Home loan", inr(D.LOANS[0].out), col("teal")], ["Car loan", inr(D.LOANS[1].out), col("copper")], ["Card bills", inr(D.CARD_OUT), col("ruby")]], f: "Loans at what's left to pay back; cards at what's outstanding. Subscriptions never count here: an unbilled future cost isn't a debt." });
  const due = hc({ h: "Due this month", t: inr(D.OBLIGATIONS), d: "monthly obligations", rows: [["Card bills", inr(D.OBLIG.cards), col("ruby")], ["Loan EMIs", inr(D.OBLIG.emis), col("teal")], ["Subscriptions off cards", inr(D.OBLIG.subs), col("plum")]], f: "Subscriptions charged to a card are already inside that card's bill, so they're counted once." });
  const left = hc({ h: "Still to pay", t: inr(D.TO_PAY), d: `${inr(D.PAID_SO_FAR)} already paid`, rows: [["SBI Home Loan EMI", "paid 2 Nov", col("teal")], ["HDFC Car Loan EMI", "due today", col("copper")], ["HDFC Regalia", "18 Nov", col("ruby")], ["Amex", "24 Nov", col("onyx")], ["Gym", "21 Nov", col("plum")]], f: "Obligations less what's been paid so far this month." });
  const emi = hc({ h: "HDFC Car Loan", t: inr(19850), d: "installment #31 · due today", rows: [["Left to pay on the loan", inr(D.LOANS[1].out)], ["Paid from", "HDFC Salary"]], f: "Mark it paid when it leaves the account, or let the next statement import do it." });
  const attn = hc({ h: "Needs a look", t: `${D.ATTENTION.length} things`, rows: D.ATTENTION.slice(0, 4).map((a) => [a.label, a.from]), f: "The same list as What needs attention below." });
  return `You're worth ${pt(inr(D.NET), worth)}: ${pt(lakh(D.OWNED), owned)} owned against ${pt(lakh(D.OWED), owed)} owed. ${pt(inr(D.OBLIGATIONS), due, { x: "c" })} falls due this month and ${pt(inr(D.TO_PAY), left, { x: "c" })} of it is still to pay, starting with ${pt(inr(19850), emi, { x: "c" })} for the car EMI today. ${pt(`${D.ATTENTION.length} things`, attn, { x: "r" })} need a look.`;
}
export const greetingActions = () => `${L.btn("Record", { icon: I.plus() })}${L.btn("Refresh", { icon: I.refresh(14) })}`;
export const greeting = () => L.header({ eyebrow: `Overview · Today ${sampleTag()}`, lede: pointLede(), actions: greetingActions() });

// ---------- The attention strip (the first two items) and the full list ----------
const toneIcon = (t) => (t === "red" ? I.alert(16) : t === "amber" ? I.clock(16) : I.info(16));
export const attentionStrip = () => {
  const n = (a) => `<div class="notice${a.tone === "red" ? " err" : a.tone === "plain" ? " info" : ""}">${toneIcon(a.tone)}<div class="grow"><b>${a.label}.</b> ${a.detail}.</div><span class="btn btn-ghost btn-sm">${a.act}</span></div>`;
  return `<div class="notes">${n(D.ATTENTION[0])}${n(D.ATTENTION[1])}</div>`;
};
export function attentionList({ title = "What needs attention", small = `${D.ATTENTION.length} things`, items = D.ATTENTION } = {}) {
  const row = (a) => `<div class="att att-${a.tone}"><span class="att-i">${toneIcon(a.tone)}</span><div class="att-t"><b>${a.label}</b><small>${a.detail}</small></div><span class="tagb grey">${a.from}</span><span class="btn btn-ghost btn-xs">${a.act}</span></div>`;
  return card(`${cardHead(title, small)}<div>${items.map(row).join("")}</div>`, { gap: 8 });
}

// ---------- The section tiles: every section, its headline number, its flag ----------
export function sectionTiles({ title = "Section by section", note = "every part of your money, and where to go next", pick = null } = {}) {
  const tile = (s) => {
    const body = `<div class="sc-top"><span class="sc-ic" style="background:${grad(s.color)}">${I[{ accounts: "accounts", invest: "invest", fixed: "fixed", lent: "lent", cards: "cards", loans: "loans", income: "income", subs: "subs", ins: "shield", goals: "goals" }[s.key]]?.(15) ?? ""}</span><b>${s.name}</b>${s.flag ? `<span class="tagb ${s.flag.includes("late") || s.flag.includes("today") ? "loss" : "warn"}">${s.flag}</span>` : ""}</div><div class="sc-big${s.owe ? " owe" : ""}">${s.owe ? "−" : ""}${lakh(s.big)}${s.per ? `<small> ${s.per}</small>` : ""}</div><small class="sc-sub">${s.sub}</small>`;
    return `<div class="sc">${body}<span class="sc-go">${I.arrowR(13)}</span></div>`;
  };
  return card(`${cardHead(title, note)}<div class="sc-grid">${D.SECTIONS.map(tile).join("")}</div>`);
}

// ---------- Coming up: the next dated events ----------
export function comingUp({ n = 7, title = "Coming up", note = "the next 30 days" } = {}) {
  const row = (e) => `<div class="ev${e.cash ? "" : " soft"}"><div class="dt"><b>${+e.date.slice(8)}</b><small>${MON[+e.date.slice(5, 7) - 1]}</small></div><div class="nm"><b>${e.label}</b><small>${e.sub}</small></div><div class="am"><b class="${e.amt > 0 ? "up" : ""}">${e.amt > 0 ? "+" : "−"}${inr(Math.abs(e.amt))}</b><small>${daysAway(e.date)}</small></div></div>`;
  const evs = D.EVENTS.filter((e) => e.kind !== "sub" || e.cash).slice(0, n);
  return card(`${cardHead(title, note, link("All dates"))}<div>${evs.map(row).join("")}</div>`, { gap: 6 });
}

// ---------- This month: what's due, what's paid, what comes in ----------
export function thisMonth() {
  const o = D.OBLIG;
  const segs = [["Card bills", o.cards, "ruby"], ["Loan EMIs", o.emis, "teal"], ["Subscriptions off cards", o.subs, "plum"]];
  const total = D.OBLIGATIONS;
  const bar = `<div class="mbar">${segs.map(([, v, c]) => `<i style="width:${(v / total) * 100}%;background:${fillc(c, 180)}"></i>`).join("")}</div>`;
  const paid = `<div class="mprog"><span style="width:${(D.PAID_SO_FAR / total) * 100}%"></span></div>`;
  return card(`${cardHead("This month", "November 2026")}
<div class="kv"><div class="k">Monthly obligations</div><div class="v">${inr(total)}</div><div class="s">${inr(D.PAID_SO_FAR)} paid, ${inr(D.TO_PAY)} still to pay</div></div>${bar}${paid}
<div class="mleg2">${segs.map(([n, v, c]) => `<span><i style="background:${col(c)}"></i>${n}<b>${inr(v)}</b></span>`).join("")}</div>
<div class="statrow" style="grid-template-columns:1fr 1fr;margin-top:auto"><div><div class="k2">Coming in</div><b class="num up">${inr(D.SALARY + 6000)}</b><small class="sub2">salary 30 Nov, interest 1 Dec</small></div><div><div class="k2">Left after obligations</div><b class="num">${inr(D.SALARY - D.OBLIGATIONS)}</b><small class="sub2">not a true surplus</small></div></div>`, { gap: 14 });
}

// ---------- Bank balance: the last 90 days (a made-up shape that ends at today's real sum) ----------
export function balanceCard({ w = 640, h = 150, title = "Bank balance", note = "the three bank accounts, 90 days" } = {}) {
  const pts = [];
  const shape = [230, 244, 268, 252, 221, 305, 296, 262, 247, 231, 218, 332, 304, 281, 266, 249, 233, 320, 300, 286, 270, 252, 240, 228, 215, 206, 198, 190, 187, 286];
  for (let i = 0; i < shape.length; i++) pts.push(shape[i] * 1000);
  pts[pts.length - 1] = D.BANK_SPEND;
  const max = 340000, min = 150000, x = (i) => 6 + (i * (w - 12)) / (pts.length - 1), y = (v) => h - 8 - ((v - min) / (max - min)) * (h - 22);
  const line = pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const svg = `<svg viewBox="0 0 ${w} ${h}" style="display:block;width:100%;height:100%" preserveAspectRatio="none"><defs><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><polygon points="6,${h} ${line} ${x(pts.length - 1)},${h}" fill="url(#bg1)"/><polyline points="${line}" fill="none" stroke="var(--accent-text)" stroke-width="2.2" stroke-linejoin="round"/><circle cx="${x(pts.length - 1)}" cy="${y(D.BANK_SPEND)}" r="4.5" fill="var(--accent-text)"/></svg>`;
  return card(`${cardHead(title, note)}<div class="kv" style="grid-template-columns:auto auto;justify-content:space-between;align-items:end"><div><div class="v">${inr(D.BANK_SPEND)}</div><div class="s">today · 90 days ago ${inr(pts[0])}</div></div><span class="tagb gain">${I.up(10)} ${inr(D.BANK_SPEND - pts[0])}</span></div><div style="flex:1;min-height:150px;display:flex">${svg}</div>`, { gap: 12 });
}

// ---------- Goals: where each stands ----------
export function goalsCard() {
  const row = (g) => `<div class="gl"><div class="gl-h"><b>${g.name}</b><span class="tagb ${g.ok ? "gain" : "warn"}">${g.ok ? "on track" : "behind"}</span><small>${dm(g.date)} ${g.date.slice(0, 4)}</small></div><div class="prog"><span style="width:${(g.saved / g.target) * 100}%;background:${fillc(g.color)}"></span></div><div class="gl-f"><span>${inr(g.saved)} of ${inr(g.target)}</span><span>${g.ok ? `${inr(g.setting)} a month is enough` : `needs ${inr(g.need)}, setting ${inr(g.setting)}`}</span></div></div>`;
  return card(`${cardHead("Goals", "set aside so far", link("All goals"))}<div style="display:grid;gap:18px;flex:1;align-content:space-evenly">${D.GOALS.map(row).join("")}</div>`, { gap: 12 });
}
export const widgets = () => `${sectionTiles()}${grid([[7, comingUp()], [5, thisMonth()]])}${grid([[7, balanceCard()], [5, goalsCard()]])}`;
export const sampleNote = () => `<div style="display:flex;justify-content:flex-end"><span class="sample">Every figure is made up, shaped like the real Overview · today is Sat Nov 7, 2026</span></div>`;
