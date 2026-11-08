// Round 2 (2026-11-08): Prathik picked E1 Split, and asked for a Statements page like the Cards and Income ones.
// ExF1: the Expenses page with E1 as its hero and a way into the statements.
// ExS1 Statements: every month's spending, a row per payment, in Cards' and Income's statements layout (tiles, filters, month groups).
// ExS2 One month: one month as a statement, from the bank at its start to the bank at its end, every payment listed under its part.
// The kind filter on ExS1 is radios named "f"; the month on ExS2 is radios named "m", as on the main page.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
import { render } from "./heroes.mjs";
const { I, inr } = L;
const { col, lakh, signed, mon, monY, monthY, monthName, lastDay, dm, card, cardHead, radios, perMonth } = P;

const KINDS = [
  { k: "all", name: "All" },
  ...D.PARTS.map((p) => ({ k: p.k, name: p.name, color: p.color })),
];
const ALL_LINES = D.MONTHS.flatMap((m) => D.linesOf(m).map((l) => ({ ...l, month: m.key })));
const countOf = (k) => (k === "all" ? ALL_LINES.length : ALL_LINES.filter((l) => l.kind === k).length);

const statementsHeader = (lede, actions) => L.header({ eyebrow: `Expenses · Statements ${P.sampleTag()}`, title: "Statements", lede, actions, back: true });
const tile = ({ k, v, s, feature = false }) => `<div class="stile glass${feature ? " feature" : ""}"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`;

/** A payment row. */
const row = (l) => {
  const p = P.part(l.kind);
  const bigs = (l.bigs ?? []).map((b) => `<span class="lr-big">${P.catIcon(b.cat, 11)}${b.what} <b>${inr(b.amt)}</b><small>bought ${dm(b.date)}</small></span>`).join("");
  return `<div class="lr k-${l.kind}"><span class="lr-d"><b>${+l.date.slice(8)}</b><small>${mon(l.date.slice(0, 7))}</small></span><span class="lr-ic${l.worked ? " hat" : ""}" style="background:${col(l.color)}">${l.kind === "card" ? I.cards(14) : l.kind === "emi" ? I.car(14) : l.kind === "subs" ? I.subs(14) : l.kind === "ins" ? I.shield(14) : I.coin(14)}</span><span class="lr-t"><b>${l.what}${l.worked ? P.workedTag() : ""}</b><small>${l.sub}</small>${bigs ? `<span class="lr-bs">${bigs}</span>` : ""}</span><span class="lr-k"><i style="background:${col(p.color)}"></i>${p.name}</span><span class="lr-v">From ${l.via}</span><span class="lr-a">${inr(l.amt)}</span></div>`;
};
const monthGroup = (m, { open = true } = {}) => {
  const lines = D.linesOf(m);
  const bs = D.bigIn(m.key);
  return `<div class="lg"><div class="lg-h"><b>${monthY(m.key)}</b><span>${lines.length} payments · spent <b>${inr(m.spent)}</b> · cash and UPI ${inr(m.cash)}${bs.length ? ` · ${bs.length} big spend${bs.length > 1 ? "s" : ""}` : ""}</span><span class="link">Open the statement ${I.arrowR(12)}</span></div>${open ? lines.map(row).join("") : ""}</div>`;
};

// ---------- ExS1 Statements: every month, a row per payment ----------
function s1() {
  const m = D.byKey[D.LAST];
  const lede = `Every month's spending in one place: <b>${inr(D.TOTALS.spent)}</b> over 12 months, a usual month <b>${lakh(D.AVG_SPENT)}</b>. ${inr(D.TOTALS.cash)} of it is cash and UPI, worked out from your bank balances.`;
  const actions = `${L.select({ value: "Last 12 months", icon: I.cal(14) })}${L.btn("Download", { icon: I.down(13) })}${L.btn("Add a big spend", { kind: "primary", icon: I.plus() })}`;
  const tiles = `<div class="tiles" style="grid-template-columns:1.25fr 1fr 1fr 1fr">${tile({ k: "Spent in October", v: inr(m.spent), s: `${D.linesOf(m).length} payments · ${inr(m.inv)} invested, ${signed(m.kept)} kept`, feature: true })}${tile({ k: "A usual month", v: lakh(D.AVG_SPENT), s: `the 12-month average · ${lakh(Math.min(...D.MONTHS.map((x) => x.spent)))} to ${lakh(Math.max(...D.MONTHS.map((x) => x.spent)))}` })}${tile({ k: "Cash and UPI", v: lakh(D.TOTALS.cash), s: `${Math.round((D.TOTALS.cash / D.TOTALS.spent) * 100)}% of everything spent · worked out` })}${tile({ k: "Big spends", v: lakh(D.BIG.reduce((s, b) => s + b.amt, 0)), s: `${D.BIG.length} in 12 months · biggest the car down payment` })}</div>`;
  const filt = `<div class="lf">${KINDS.map((k) => `<label class="lf-i pkl" for="f-${k.k}">${k.color ? `<i style="background:${col(k.color)}"></i>` : ""}${k.name}<em>${countOf(k.k)}</em></label>`).join("")}<span class="lf-sp"></span><span class="chip">${I.star(11)} Big spends only</span><span class="lf-s">${I.search(13)} Search payee or amount</span>${L.select({ value: "Newest first" })}</div>`;
  const groups = [...D.MONTHS].reverse();
  const list = `${groups.slice(0, 4).map((x) => monthGroup(x)).join("")}<div class="lg-more">${I.chev(12)} 8 more months, back to November 2025</div>`;
  return P.page(`${radios("f", KINDS.map((k) => k.k), "all")}${statementsHeader(lede, actions)}${tiles}${card(`${filt}<div class="lh"><span></span><span></span><span>Payment</span><span>Kind</span><span>Paid from</span><span class="r">Amount</span></div>${list}`, { gap: 10, cls: "lcard" })}${P.sampleNote()}`);
}

// The twelve months as small bars, each a label for its month: step to any month from the side card.
const yearStrip = (m) => {
  const max = Math.max(...D.MONTHS.map((x) => x.spent));
  return `<div class="sm-yr"><div class="sm-yh"><b>Every month</b><small>usual ${lakh(D.AVG_SPENT)}</small></div><div class="sm-yb" style="--avg:${(D.AVG_SPENT / max) * 100}%">${D.MONTHS.map((x) => `<label class="sm-yc pkl${x.key === m.key ? " on" : ""}" for="m-${x.key}"><span><i style="height:${(x.spent / max) * 100}%"></i></span><small>${mon(x.key).slice(0, 1)}</small></label>`).join("")}</div></div>`;
};

// ---------- ExS2 One month: the statement ----------
function s2() {
  const lede = `One month at a time, from what was in the bank at its start to what was left at its end. Every payment sits under its part; cash and UPI is what's left over.`;
  const actions = `${L.btn("Download PDF", { icon: I.down(13) })}${L.btn("Add a big spend", { kind: "primary", icon: I.plus() })}`;
  const view = (m) => {
    const start = D.bankBefore(m.key), end = D.BANK_END[m.key];
    const lines = D.linesOf(m);
    const prev = D.MKEYS[D.MKEYS.indexOf(m.key) - 1], next = D.MKEYS[D.MKEYS.indexOf(m.key) + 1];
    const nav = `<div class="sm-nav">${prev ? `<label class="btn btn-ghost btn-sm pkl" for="m-${prev}">${I.chevL(11)} ${mon(prev)}</label>` : `<span class="btn btn-ghost btn-sm dim">${I.chevL(11)}</span>`}<b>${monthY(m.key)}</b>${next ? `<label class="btn btn-ghost btn-sm pkl" for="m-${next}">${mon(next)} ${I.chevR(11)}</label>` : `<span class="btn btn-ghost btn-sm dim">${I.chevR(11)}</span>`}</div>`;
    const tiles = `<div class="tiles" style="grid-template-columns:repeat(4,1fr)">${tile({ k: `In the bank on ${lastDay(prev ?? "2025-10")}`, v: inr(start), s: "HDFC, Jupiter, Slice, Canara, SBI" })}${tile({ k: "Came in", v: inr(m.inc), s: m.inv || m.lent ? `${inr(m.inv + m.lent)} of it invested${m.lent ? " or lent" : ""}` : "nothing invested" })}${tile({ k: "Spent", v: inr(m.spent), s: `${lines.length} payments · ${Math.round((m.cash / m.spent) * 100)}% cash and UPI`, feature: true })}${tile({ k: `In the bank on ${lastDay(m.key)}`, v: inr(end), s: `${signed(m.kept)} over the month` })}</div>`;
    const section = (p) => {
      const ls = lines.filter((l) => l.kind === p.k);
      if (!ls.length) return "";
      return `<div class="sm-sec"><div class="sm-sh"><i class="${p.worked ? "hat" : ""}" style="background:${col(p.color)}"></i><b>${p.name}</b><small>${p.note}</small><span>${inr(m[p.k])}</span></div>${[...ls].reverse().map((l) => `<div class="sm-l"><span class="sm-d">${dm(l.date)}</span><span class="sm-w"><b>${l.what}</b><small>${l.sub} · from ${l.via}</small>${(l.bigs ?? []).map((b) => `<span class="sm-b">${P.catIcon(b.cat, 11)}${b.what}<small>${b.via} · bought ${dm(b.date)}</small><em>${inr(b.amt)}</em></span>`).join("")}</span><span class="sm-a">${inr(l.amt)}</span></div>`).join("")}</div>`;
    };
    const doc = card(`${cardHead(`${monthName(m.key)} ${m.key.slice(0, 4)} statement`, `1 ${mon(m.key)} to ${lastDay(m.key)} · savings and salary accounts`, nav)}<div class="sm">${D.PARTS.map(section).join("")}<div class="sm-tot"><span>Total spent</span><b>${inr(m.spent)}</b></div></div>`, { cls: "sm-card" });
    const share = D.PARTS.filter((p) => m[p.k] > 0);
    const side = card(`${cardHead("How it adds up")}<div class="sm-eq"><div><span>In the bank on ${lastDay(prev ?? "2025-10")}</span><b>${inr(start)}</b></div>${D.notSpentOf(m).map((n) => `<div><span>${n.what}<small>${n.sub}</small></span><b class="${n.amt > 0 ? "up" : ""}">${signed(n.amt)}</b></div>`).join("")}<div><span>Spent<small>the payments on the left</small></span><b>${signed(-m.spent)}</b></div><div class="eq"><span>In the bank on ${lastDay(m.key)}</span><b>${inr(end)}</b></div></div><div class="sm-bar">${share.map((p) => `<span class="${p.worked ? "hat" : ""}" style="flex:${m[p.k]};background:${col(p.color)}"></span>`).join("")}</div><div class="sm-key">${share.map((p) => `<span><i style="background:${col(p.color)}"></i>${p.short} <b>${Math.round((m[p.k] / m.spent) * 100)}%</b></span>`).join("")}</div>${yearStrip(m)}<div class="sm-vs">Against a usual month: <b class="${m.spent > D.AVG_SPENT ? "dn" : "up"}">${m.spent > D.AVG_SPENT ? "+" : "−"}${lakh(Math.abs(m.spent - D.AVG_SPENT))}</b>${D.bigIn(m.key).length ? `, or ${lakh(Math.abs(D.usual(m) - D.AVG_SPENT))} ${D.usual(m) > D.AVG_SPENT ? "more" : "less"} without its big spends` : ""}.</div>`, { cls: "sm-side" });
    return `${tiles}<div class="sm-row">${doc}${side}</div>`;
  };
  return P.page(`${radios("m", D.MKEYS, D.LAST)}${L.header({ eyebrow: `Expenses · Statements · One month ${P.sampleTag()}`, title: "Monthly statement", lede, actions, back: true })}${perMonth(view, "vw-flexcol sm-v")}${P.sampleNote()}`);
}

export const renderF = () => render("e1", { final: true })();
export const renderS1 = () => s1();
export const renderS2 = () => s2();
