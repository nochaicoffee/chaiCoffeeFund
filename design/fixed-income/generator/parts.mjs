// The widgets shared by every Fixed Income board: the greeting that points, the attention strip, the deposits table, coming up and passbook holdings.
// Static HTML; hover cards are CSS only.
import * as L from "./lib.mjs";
import * as D from "./data-sample.mjs";
const { I, inr, fmt, fmtY, plural } = L;
const { sum } = D;

export const lakh = (n) => (Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : inr(n));
export const lakhS = (n) => (Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(1).replace(/\.0$/, "")}L` : inr(n));
export const col = (c) => `var(--card-${c})`;
export const grad = (c) => `linear-gradient(155deg,var(--card-${c}-from),var(--card-${c}-to))`;
export const fillc = (c, a = 90) => `linear-gradient(${a}deg,color-mix(in oklch,var(--card-${c}) 80%,white),var(--card-${c}))`;
export const cc = (c) => `--c1:var(--card-${c});--c2:var(--card-${c}-to)`;

export const hc = ({ h, hr = "", t = "", d = "", rows = [], f = "", w = 260 }) =>
  `<div class="hc" style="width:${w}px"><div class="h"><span>${h}</span>${hr}</div>${t ? `<div class="t">${t}</div>` : ""}${d ? `<div class="d">${d}</div>` : ""}${rows.length ? `<ul>${rows.map(([nm, v, c]) => `<li>${c ? `<i style="width:8px;height:8px;border-radius:50%;background:${c};flex-shrink:0"></i>` : ""}<span class="nm">${nm}</span><b>${v}</b></li>`).join("")}</ul>` : ""}${f ? `<div class="f">${f}</div>` : ""}</div>`;
export const tip = (card2, { w = 260, x = "c", y = "up", off = 8 } = {}) =>
  `<span class="hc-wrap" style="${y === "up" ? `bottom:calc(100% + ${off}px)` : `top:calc(100% + ${off}px)`};${x === "c" ? `left:50%;margin-left:-${w / 2}px` : x === "l" ? "left:0" : "right:0"}">${card2}</span>`;
export const card = (inner, { gap = 16, style = "", cls = "" } = {}) => `<section class="card glass ${cls}" style="gap:${gap}px;${style}">${inner}</section>`;
export const cardHead = (title, small = "", right = "") => `<div class="card-h"><div class="card-t">${title}${small ? `<small>${small}</small>` : ""}</div>${right}</div>`;
export const link = (t) => `<span class="link">${t}${I.arrowR(12)}</span>`;
export const grid = (items, gap = 20) => `<div class="g12" style="gap:${gap}px">${items.map(([span, html]) => `<div style="grid-column:span ${span}">${html}</div>`).join("")}</div>`;
export const page = (body) => L.desktop({ h: "auto", body: `<div class="pgcol">${body}</div>` });

/** A bank's tile: its initials on its colour. */
export const bankTile = (key, size = 38) => {
  const b = D.BANKS[key];
  const t = b.short.length > 4 ? b.short.slice(0, 2).toUpperCase() : b.short.toUpperCase();
  return `<span class="btile" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;font-size:${Math.round(size * (t.length > 3 ? 0.27 : 0.33))}px;background:${grad(b.color)}">${t}</span>`;
};
export const kindTags = (x) => {
  const t = [];
  if (x.kind !== "FD") t.push(`<span class="tagb">${x.kind}</span>`);
  if (x.compoundingType === "Non-Cumulative") t.push(`<span class="tagb">${x.payoutFrequency} payout</span>`);
  if (D.BANKS[x.bank].company) t.push(`<span class="tagb co">Company FD</span>`);
  if (D.BANKS[x.bank].sovereign) t.push(`<span class="tagb gov">Govt</span>`);
  if (x.status === "Matured") t.push(`<span class="tagb loss">Matured</span>`);
  else if (x.status === "Active" && D.daysBetween(D.TODAY, x.maturityDate) <= 60) t.push(`<span class="tagb warn">Matures soon</span>`);
  return t.join("");
};
export const daysLeft = (iso) => { const n = D.daysBetween(D.TODAY, iso); return n < 0 ? `${-n} days ago` : n === 0 ? "today" : n === 1 ? "tomorrow" : n < 61 ? `in ${n} days` : n < 700 ? `in ${Math.round(n / 30.4)} months` : `in ${(n / 365).toFixed(1)} years`; };

// ---------- The greeting, pointing ----------
const pt = (text, card2, { x = "l" } = {}) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(card2, { w: 290, x, y: "down" })}</span>`;
export function pointLede() {
  const dep = D.HELD, n = dep.length;
  const worth = hc({ h: "Worth today", t: lakh(D.DEP_VALUE), d: `${lakh(D.DEP_PUT)} placed, ${lakh(D.DEP_ACCRUED)} earned so far`, rows: ["FD", "RD", "NSC"].map((k) => [{ FD: "Fixed deposits", RD: "Recurring deposit", NSC: "NSC" }[k], lakhS(sum(dep.filter((x) => x.kind === k).map(D.valueOf))), col(k === "FD" ? "sapphire" : k === "RD" ? "sky" : "forest")]), f: "An estimate between what you placed and the maturity amount the bank quoted. It is not the redemption value." });
  const count = hc({ h: "Deposits", t: plural(n, "deposit"), d: "Still holding money", rows: dep.map((x) => [x.name, lakhS(D.valueOf(x)), col(D.BANKS[x.bank].color)]), f: "Closed deposits drop off. A matured one stays until you close it." });
  const day = hc({ h: "Earning a day", t: inr(D.PER_DAY), d: `${inr(D.PER_DAY * 30.4)} a month, at today's pace`, rows: [...D.ACTIVE].sort((a, b) => D.perDay(b) - D.perDay(a)).slice(0, 4).map((x) => [x.name, `${inr(D.perDay(x))} a day`, col(D.BANKS[x.bank].color)]), f: "A cumulative deposit's interest is spread evenly over its term; a payout deposit earns its rate on what was placed." });
  const avg = hc({ h: "Average rate", t: `${D.AVG_RATE.toFixed(2)}%`, d: "weighted by what each deposit is worth", rows: [...D.ACTIVE].sort((a, b) => b.interestRate - a.interestRate).slice(0, 4).map((x) => [x.name, D.rate(x.interestRate), col(D.BANKS[x.bank].color)]) });
  const pass = hc({ h: "Passbook holdings", t: lakh(D.PASS_VALUE), d: "balances read off a statement, plus what you added since", rows: D.PASSBOOKS.map((p) => [p.name, lakhS(p.value), col(p.color)]), f: "Their interest is declared once a year, so the app never works it out." });
  const nx = D.NEXT;
  const next = hc({ h: "Next to mature", t: `${nx.x.name}`, d: `${fmtY(nx.date)} · ${daysLeft(nx.date)}`, rows: D.UPCOMING.slice(0, 4).map((u) => [u.x.name, `${fmt(u.date)} · ${lakhS(u.amount)}`, col(D.BANKS[u.x.bank].color)]) });
  return `${pt(plural(n, "deposit"), count)} hold ${pt(lakh(D.DEP_VALUE), worth)}, earning about ${pt(`${inr(D.PER_DAY)} a day`, day)} at ${pt(`${D.AVG_RATE.toFixed(2)}%`, avg, { x: "c" })} on average. ${pt("Passbook holdings", pass)} add ${pt(lakh(D.PASS_VALUE), pass)}. The next deposit to mature is ${pt(nx.x.name, next)}, ${daysLeft(nx.date)}.`;
}
export const greetingActions = () => `${L.btn("Add deposit", { icon: I.plus() })}${L.btn("Add passbook balance", { kind: "primary", icon: I.plus() })}`;
export const greeting = () => L.header({ lede: pointLede(), actions: greetingActions() });

export const attention = () => {
  const m = D.MATURED_WAITING[0];
  const over = D.OVER_BANKS[0];
  return `<div class="notes"><div class="notice">${I.alert(16)}<div class="grow"><b>${m.name} matured ${daysLeft(m.maturityDate)}.</b> ${inr(m.maturityAmount)} should have reached your account. Mark it closed once it has, so it stops counting as held.</div><span class="btn btn-ghost btn-sm">Close it</span></div>
<div class="notice">${I.alert(16)}<div class="grow"><b>${D.OVER_BANKS.length} banks hold more than the ₹5L cover.</b> With your savings there, ${over.bank.name} holds ${lakh(over.total)}. A figure to know, not a reason to move money.</div><span class="btn btn-ghost btn-sm">See cover</span></div></div>`;
};

// ---------- The deposits table ----------
export function depositsTable({ title = "Deposits", note = "fixed deposits, the recurring deposit and the NSC · value is an estimate between what you placed and the maturity amount" } = {}) {
  const cols = "2.7fr 0.9fr 1.1fr 1.2fr 1.3fr 1.3fr 1.8fr";
  const th = (t, r) => `<span class="th"${r ? ' style="text-align:right"' : ""}>${t}</span>`;
  const head = `<div class="hrow" style="grid-template-columns:${cols};padding:0 0 8px">${th("Deposit")}${th("Rate", 1)}${th("Placed", 1)}${th("Worth today", 1)}${th("Matures", 1)}${th("Matures at", 1)}${th("How far through")}</div>`;
  const order = [...D.HELD].sort((a, b) => (a.status === "Matured" ? -1 : 0) - (b.status === "Matured" ? -1 : 0) || a.maturityDate.localeCompare(b.maturityDate));
  const row = (x) => {
    const b = D.BANKS[x.bank], done = D.daysBetween(x.startDate, D.TODAY) / D.daysBetween(x.startDate, x.maturityDate), f = Math.min(1, done);
    return `<div class="hrow" style="grid-template-columns:${cols}"><div class="cell-name">${bankTile(x.bank, 38)}<div class="nm2"><b>${x.name}${kindTags(x)}</b><small>${b.name} · started ${fmtY(x.startDate).split(", ")[0]} ${x.startDate.slice(0, 4)}</small></div></div>
    <div class="r"><b class="num">${D.rate(x.interestRate)}</b><small>${x.kind === "RD" ? "quarterly" : x.compoundingType === "Cumulative" ? "cumulative" : "pays out"}</small></div>
    <div class="r"><b class="num">${inr(D.principalOf(x))}</b>${x.kind === "RD" ? `<small>${x.paid ?? D.RD.paid} of ${D.RD.months} paid</small>` : ""}</div>
    <div class="r"><b class="num">${inr(D.valueOf(x))}</b><small class="up">+${inr(D.valueOf(x) - D.principalOf(x))}</small></div>
    <div class="r"><b class="num">${fmtY(x.maturityDate).split(",")[0]} ${x.maturityDate.slice(0, 4)}</b><small>${daysLeft(x.maturityDate)}</small></div>
    <div class="r"><b class="num">${inr(x.maturityAmount)}</b>${x.compoundingType === "Non-Cumulative" ? `<small>interest paid out on the way</small>` : ""}</div>
    <div><b style="font-size:12.5px">${Math.round(f * 100)}%</b><div class="prog"><span style="width:${f * 100}%;background:${fillc(b.color)}"></span></div></div></div>`;
  };
  const closed = D.DEPOSITS.filter((x) => x.status === "Closed").length;
  return card(`${cardHead(title, note, link(`Closed (${closed})`))}<div>${head}${order.map(row).join("")}</div>`);
}

// ---------- Coming up ----------
export function comingUp({ days = 120 } = {}) {
  const ev = [];
  for (const u of D.UPCOMING) if (u.days <= 400) ev.push({ date: u.date, nm: `${u.x.name} matures`, sub: `${D.BANKS[u.x.bank].name}${u.x.compoundingType === "Cumulative" ? ", interest included" : ", principal back"}`, amt: lakh(u.amount), kind: "mat", c: D.BANKS[u.x.bank].color });
  for (const x of D.ACTIVE.filter((y) => y.compoundingType === "Non-Cumulative")) for (const p of D.payouts(x)) if (p.date > D.TODAY && D.daysBetween(D.TODAY, p.date) <= days) ev.push({ date: p.date, nm: `${x.name} interest`, sub: `${x.payoutFrequency} payout`, amt: inr(p.amount), kind: "pay", c: D.BANKS[x.bank].color });
  ev.push({ date: D.RD.nextInstallment, nm: `${D.RD.name} instalment ${D.RD.paid + 1}`, sub: `${D.RD.paid + 1} of ${D.RD.months}`, amt: inr(D.RD.monthly), kind: "rd", c: D.BANKS.SBI.color });
  const p = D.PASSBOOKS;
  ev.push({ date: "2027-03-31", nm: "PPF and EPF interest is credited", sub: "the rate is declared first", amt: "—", kind: "int", c: "forest" });
  const list = ev.filter((e) => D.daysBetween(D.TODAY, e.date) <= days).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  const row = (e) => { const d = new Date(`${e.date}T00:00:00Z`); return `<div class="ev"><div class="dt"><b>${d.getUTCDate()}</b><small>${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]}</small></div><div class="nm"><b>${e.nm}</b><small>${e.sub}</small></div><div class="am"><b>${e.amt}</b><small>${daysLeft(e.date)}</small></div></div>`; };
  return card(`${cardHead("Coming up", `next ${days} days`, link("All dates"))}<div>${list.map(row).join("")}</div>`);
}

// ---------- Passbook holdings ----------
export function passbooks() {
  const row = (p) => `<div class="pbk" style="--c1:var(--card-${p.color});--c2:var(--card-${p.color}-to)"><span class="sp"></span><div class="bd"><b class="t">${p.name}<span class="tagb">${p.kind === "NPS" ? "Market-linked" : p.kind === "PPF" ? "Govt" : "Govt"}</span></b><small>${p.where} · ${p.rate ? `${p.rate}% ${p.rateNote}` : p.rateNote}</small><small>Passbook said ${inr(p.balance)} on ${fmtY(p.balanceDate).split(",")[0]}${p.added ? `, plus ${inr(p.added)} added since` : ""}</small></div><div class="ar"><span class="v">${lakh(p.value)}</span><small>${p.kind === "NPS" ? "from the statement" : "an estimate"}</small></div></div>`;
  return card(`${cardHead("Passbook holdings", "balances you read off a statement", link("Add a balance"))}<div style="display:grid;gap:12px">${D.PASSBOOKS.map(row).join("")}</div><div class="card-note">The app never works out their interest. It keeps contributions and the balance your passbook says on a date, and adds what you put in since.</div>`);
}

export const sampleNote = () => `<div style="display:flex;justify-content:flex-end">${L.sampleTag(" · today is Wed Nov 4, 2026")}</div>`;

/** The common closing widgets: deposits table, then coming up beside passbook holdings. */
export const widgets = () => `${depositsTable()}${grid([[6, comingUp()], [6, passbooks()]])}`;
