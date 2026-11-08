// The pieces every Expenses board shares: the greeting that points, Where the month went, Big spends, and the months table.
// Static HTML; hover cards are CSS only; a picked month (radios named "m") shows its own view through .vw-m-<key>.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
const { I, inr } = L;

export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const mon = (k) => MON[+k.slice(5, 7) - 1];
export const monY = (k) => `${mon(k)} ${k.slice(0, 4)}`;
export const monthName = (k) => MONTH[+k.slice(5, 7) - 1];
export const monthY = (k) => `${monthName(k)} ${k.slice(0, 4)}`;
export const dm = (iso) => `${+iso.slice(8)} ${MON[+iso.slice(5, 7) - 1]}`;
export const lastDay = (k) => { const [y, m] = k.split("-").map(Number); return `${new Date(Date.UTC(y, m, 0)).getUTCDate()} ${MON[m - 1]}`; };
export const lakh = (n) => (n < 0 ? "−" + lakh(-n) : n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : inr(n));
export const signed = (n) => `${n >= 0 ? "+" : "−"}${inr(Math.abs(n))}`;
export const col = (c) => `var(--card-${c})`;
export const grad = (c) => `linear-gradient(155deg,var(--card-${c}-from),var(--card-${c}-to))`;
export const big = (n) => `<small>₹</small>${Math.round(n).toLocaleString("en-IN")}`;
export const radios = (p, keys, def = keys[0]) => keys.map((k) => `<input class="pk-in" type="radio" name="${p}" id="${p}-${k}"${k === def ? " checked" : ""}>`).join("");
/** One block per month, shown only while that month is picked. */
export const perMonth = (fn, cls = "") => D.MKEYS.map((k) => `<div class="vw-m vw-m-${k} ${cls}">${fn(D.byKey[k])}</div>`).join("");
export const part = (k) => D.PARTS.find((p) => p.k === k);

export const hc = ({ h, hr = "", t = "", d = "", rows = [], f = "", w = 280 }) =>
  `<div class="hc" style="width:${w}px"><div class="h"><span>${h}</span>${hr}</div>${t ? `<div class="t">${t}</div>` : ""}${d ? `<div class="d">${d}</div>` : ""}${rows.length ? `<ul>${rows.map(([nm, v, c]) => `<li>${c ? `<i style="width:8px;height:8px;border-radius:50%;background:${c};flex-shrink:0"></i>` : ""}<span class="nm">${nm}</span><b>${v}</b></li>`).join("")}</ul>` : ""}${f ? `<div class="f">${f}</div>` : ""}</div>`;
export const tip = (card2, { w = 280, x = "c", y = "down", off = 8 } = {}) =>
  `<span class="hc-wrap" style="${y === "up" ? `bottom:calc(100% + ${off}px)` : `top:calc(100% + ${off}px)`};${x === "c" ? `left:50%;margin-left:-${w / 2}px` : x === "l" ? "left:0" : "right:0"}">${card2}</span>`;
export const card = (inner, { gap = 16, style = "", cls = "" } = {}) => `<section class="card glass ${cls}" style="gap:${gap}px;${style}">${inner}</section>`;
export const cardHead = (title, small = "", right = "") => `<div class="card-h"><div class="card-t">${title}${small ? `<small>${small}</small>` : ""}</div>${right}</div>`;
export const page = (body) => L.desktop({ h: "auto", body: `<div class="pgcol">${body}</div>` });
export const sampleTag = (t = "Sample data, made up") => `<span class="sample sample-tag">${t}</span>`;
export const workedTag = () => `<span class="wk">${I.info(11)} worked out</span>`;
export const catIcon = (cat, s = 15) => `<span class="ci" style="--cc:${col(D.CATS[cat].color)}">${I[D.CATS[cat].icon](s)}</span>`;

// ---------- The greeting, pointing ----------
const pt = (text, card2, { x = "l", w = 300 } = {}) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(card2, { w, x, y: "down" })}</span>`;
export function greeting({ final = false } = {}) {
  const m = D.byKey[D.LAST];
  const spent = hc({ h: "Spent in October", t: inr(m.spent), d: "money that left the bank and won't come back", rows: D.PARTS.map((p) => [p.name, inr(m[p.k]), col(p.color)]), f: `Card bills count in the month they're paid, so this holds September's card spending. EMIs count in full.` });
  const cash = hc({ h: "Cash and UPI", t: inr(m.cash), d: "worked out, not a record", rows: [["Came in", inr(m.inc)], ["Less invested", `−${inr(m.inv)}`], ["Less kept in the bank", `−${inr(m.kept)}`], ["Less what's recorded", `−${inr(m.named)}`]], f: "Whatever no record explains. A refund or interest you didn't record makes it smaller; an FD or loan to a friend you didn't record makes it bigger." });
  const inv = hc({ h: "Invested", t: inr(m.inv), d: "money that left the bank to be invested", rows: [["Shares and funds", inr(30000)], ["New fixed deposit", inr(15000)]], f: "ESPP comes out of the salary before it reaches the bank, so it's in neither came in nor invested. An RSU vest isn't counted." });
  const kept = hc({ h: "Kept in the bank", t: signed(m.kept), d: "HDFC, Jupiter, Slice, Canara and SBI together", rows: [[`On ${D.MKEYS.at(-2) ? lastDay(D.MKEYS.at(-2)) : ""}`, inr(D.bankBefore(m.key))], [`On ${lastDay(m.key)}`, inr(D.BANK_END[m.key])]], f: "The dollar accounts at brokers are left out: their balance moves with the rate." });
  const bigC = hc({ h: "Big spends in October", rows: D.bigIn(m.key).map((b) => [b.what, inr(b.amt), col(D.CATS[b.cat].color)]), f: `Flights home (${inr(18600)}, bought 3 Oct on the Regalia) count in November, when that bill is paid.` });
  const lede = `In October you spent ${pt(inr(m.spent), spent)}, ${pt(inr(m.cash), cash)} of it in cash and UPI. ${pt(inr(m.inv), inv)} went into investments and ${pt(signed(m.kept).replace("+", ""), kept)} stayed in the bank. ${pt("1 big spend", bigC, { x: "r" })} this month, and one more is waiting in November's card bill.`;
  return L.header({ eyebrow: `Expenses · October 2026 ${sampleTag()}`, lede, actions: `${final ? L.btn("Statements", { icon: I.receipt(14) }) : ""}${L.btn("Add a big spend", { icon: I.plus() })}${L.btn("Refresh", { icon: I.refresh(14) })}` });
}

// ---------- Where the month went (follows the picked month) ----------
export function whereWent({ final = false } = {}) {
  const body = (m) => {
    const max = Math.max(...D.PARTS.map((p) => m[p.k]));
    const rows = D.PARTS.filter((p) => m[p.k] > 0).map((p) => {
      const bs = D.bigIn(m.key).filter((b) => b.part === p.k);
      const bsW = bs.reduce((s, b) => s + b.amt, 0);
      return `<div class="ww-r"><div class="ww-n"><i style="background:${col(p.color)}"></i><b>${p.name}</b><small>${p.note}</small></div><div class="ww-bar"><span class="${p.worked ? "hat" : ""}" style="width:${(m[p.k] / max) * 100}%;background:${col(p.color)}">${bsW ? `<em style="width:${(bsW / m[p.k]) * 100}%"></em>` : ""}</span></div><div class="ww-v">${inr(m[p.k])}<small>${Math.round((m[p.k] / m.spent) * 100)}%</small></div>${bs.length ? `<div class="ww-b">${bs.map((b) => `${catIcon(b.cat, 12)}<span>${b.what} <b>${inr(b.amt)}</b></span>`).join("")}</div>` : ""}</div>`;
    }).join("");
    const avg = (k) => Math.round(D.TOTALS[k] / D.MONTHS.length);
    const vs = D.PARTS.map((p) => { const a = avg(p.k), d = m[p.k] - a; return `<div class="ww-u-i"><span><i style="background:${col(p.color)}"></i>${p.short}</span><b>${lakh(m[p.k])}</b><small class="${Math.abs(d) < a * 0.05 ? "" : d > 0 ? "dn" : "up"}">${Math.abs(d) < a * 0.05 ? "about usual" : `${d > 0 ? "+" : "−"}${lakh(Math.abs(d))} vs ${lakh(a)}`}</small></div>`; }).join("");
    return `${cardHead(`Where ${monthName(m.key)} went`, "", `<span class="ww-t">${inr(m.spent)}</span>`)}<div class="ww">${rows}</div><div class="ww-u"><div class="ww-u-h">Against your usual month <small>the 12-month average</small></div><div class="ww-u-g">${vs}</div></div><div class="ww-f"><span>The light part of a bar is the month's big spends. ${D.PARTS.find((p) => p.worked).name} is ${D.PARTS.find((p) => p.worked).note.replace("worked out: ", "worked out, ")}.</span>${final ? `<span class="link">${monthName(m.key)}'s statement ${I.arrowR(12)}</span>` : ""}</div>`;
  };
  return card(perMonth(body, "vw-flexcol"), { cls: "ww-card" });
}

// ---------- Big spends (the whole year, newest first) ----------
export function bigSpends() {
  const row = (b, pending = false) => `<div class="bs-r${pending ? " pend" : ""}" data-m="${b.month}">${catIcon(b.cat)}<div class="bs-t"><b>${b.what}</b><small>${b.cat} · ${b.via} · bought ${dm(b.date)}</small></div><div class="bs-m">${pending ? `<span class="tagb warn">in November's bill</span>` : `<span class="bs-mo">counts in ${mon(b.month)}</span>`}</div><div class="bs-v">${inr(b.amt)}</div></div>`;
  const all = [...D.PENDING.map((b) => row(b, true)), ...[...D.BIG].reverse().map((b) => row(b))];
  const SHOWN = 5;
  const list = all.slice(0, SHOWN).join("");
  const total = D.BIG.reduce((s, b) => s + b.amt, 0);
  const byCat = Object.entries(D.BIG.reduce((t, b) => ((t[b.cat] = (t[b.cat] ?? 0) + b.amt), t), {})).sort((a, b) => b[1] - a[1]);
  const strip = `<div class="bs-strip">${byCat.map(([c, v]) => `<span style="flex:${v};background:${col(D.CATS[c].color)}" title="${c}"></span>`).join("")}</div><div class="bs-key">${byCat.map(([c, v]) => `<span><i style="background:${col(D.CATS[c].color)}"></i>${c} <b>${lakh(v)}</b></span>`).join("")}</div>`;
  return card(`${cardHead("Big spends", `${D.BIG.length} in 12 months · ${inr(total)}`, L.btn("Add", { icon: I.plus(12), cls: "btn-sm" }))}${strip}<div class="bs">${list}</div><div class="bs-more"><span>${all.length - SHOWN} more, back to ${mon(D.BIG[0].month)} ${D.BIG[0].month.slice(0, 4)}</span><b>See all ${all.length}</b></div>`, { cls: "bs-card" });
}

// ---------- The months table ----------
export function monthsTable({ final = false } = {}) {
  const head = `<div class="mt-r mt-h"><span>Month</span><span class="r">Came in</span><span class="r">Invested</span><span class="r">Lent out</span><span class="r">Kept in bank</span><span class="r">Spent</span><span class="r">Cards</span><span class="r">EMIs</span><span class="r">Subs + insurance</span><span class="r">Cash and UPI ${workedTag()}</span></div>`;
  const rows = [...D.MONTHS].reverse().map((m) => {
    const bs = D.bigIn(m.key);
    return `<label class="mt-r pkl" for="m-${m.key}"><span class="mt-mo"><b>${monY(m.key)}</b>${bs.length ? `<small>${bs.map((b) => catIcon(b.cat, 11)).join("")}${bs.length === 1 ? bs[0].what : `${bs.length} big spends`}</small>` : ""}</span><span class="r">${inr(m.inc)}</span><span class="r">${m.inv ? inr(m.inv) : "–"}</span><span class="r">${m.lent ? inr(m.lent) : "–"}</span><span class="r ${m.kept < 0 ? "dn" : "up"}">${signed(m.kept)}</span><span class="r"><b>${inr(m.spent)}</b></span><span class="r">${inr(m.card)}</span><span class="r">${m.emi ? inr(m.emi) : "–"}</span><span class="r">${inr(m.subs + m.ins)}</span><span class="r">${inr(m.cash)}</span></label>`;
  }).join("");
  const t = D.TOTALS;
  const foot = `<div class="mt-r mt-f"><span>12 months</span><span class="r">${inr(t.inc)}</span><span class="r">${inr(t.inv)}</span><span class="r">${inr(t.lent)}</span><span class="r ${t.kept < 0 ? "dn" : "up"}">${signed(t.kept)}</span><span class="r"><b>${inr(t.spent)}</b></span><span class="r">${inr(t.card)}</span><span class="r">${inr(t.emi)}</span><span class="r">${inr(t.subs + t.ins)}</span><span class="r">${inr(t.cash)}</span></div>`;
  return card(`${cardHead("Month by month", "came in = invested + lent out + kept + spent, every row", final ? `<span class="link">Every payment, month by month ${I.arrowR(12)}</span>` : "")}<div class="mt">${head}${rows}${foot}</div>`, { cls: "mt-card" });
}

export const sampleNote = () => `<div style="display:flex;justify-content:flex-end"><span class="sample">Every figure is made up, shaped like Prathik's money · today is Sun Nov 8, 2026</span></div>`;

/** The shared page around a hero. */
export const pageWith = (hero, o = {}) => page(`${greeting(o)}${hero}<div class="ex-row">${whereWent(o)}${bigSpends()}</div>${monthsTable(o)}${sampleNote()}`);

/** The month chips: one per month, with a little bar of what was spent. */
export function monthChips({ cls = "" } = {}) {
  const max = Math.max(...D.MONTHS.map((m) => m.spent));
  return `<div class="mc ${cls}">${D.MONTHS.map((m) => `<label class="mc-i pkl" for="m-${m.key}"><span class="mc-b"><i style="height:${Math.max(8, (m.spent / max) * 100)}%"></i></span><b>${mon(m.key)}</b><small>${lakh(m.spent)}</small>${D.bigIn(m.key).length ? `<em>${I.star(9)}</em>` : ""}</label>`).join("")}</div>`;
}
