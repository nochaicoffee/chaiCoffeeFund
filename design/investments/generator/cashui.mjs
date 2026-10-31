// The Cash at your brokers card (2026-11-04, PRD F-IV-18): a summary tile (what is idle, and what share of everything at the brokers that is) beside one tile
// per broker account, in the app's card style with the ring texture. Used by the final page (full width), the phone, and the "cash is old" state.
// Sample data, made up; the sums are cash.mjs.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as C from "./cash.mjs";
import * as P from "./parts.mjs";
const { I, plural } = L;
const { card, cardHead, hc, tip, col, grad, lakhS, fillc, pc } = { ...P, pc: D.pc };

const money = (c) => C.cashTxt(c);
const rate = (c) => (c.us ? `at ₹${D.FX_NOW} a dollar` : "already in rupees");
const ageTxt = (c) => { const n = C.daysOld(c); return n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`; };

/** The hover card of one account. */
const acctCard = (c) => hc({ h: c.name, t: money(c), d: c.us ? `${L.inr(c.inr)} at today's rate of ₹${D.FX_NOW}` : "in rupees", w: 270,
  rows: [["Read on", `${L.fmtY(c.asOf)} · ${ageTxt(c)}`], ["From", c.source === "Statement" ? "a statement" : "typed in by hand"], ["At the broker", c.broker], ["Pays for", c.holds]],
  f: c.us ? "A dollar balance has no cost, so the rupee's move on it is not shown as gain." : "Cash earns nothing here; interest, if the broker pays any, is on its own line (F-IN-03)." });

/** One broker account as a tile. */
export function acct(c) {
  const stale = C.isStale(c);
  return `<div class="hov cwrap" tabindex="0"><div class="cacct rt" style="background:${grad(c.color)}"><div class="ch"><span class="cbr"><i>${c.broker.slice(0, 1)}</i><b>${c.name}</b></span><span class="ccur">${c.currency}</span></div>
    <div class="cbal">${money(c)}</div><div class="cinr">${c.us ? `≈ ${L.inr(c.inr)} <small>${rate(c)}</small>` : `<small>${rate(c)}</small>`}</div>
    <div class="cft"><span>${c.source === "Statement" ? "From a statement" : "Typed in"} · read ${L.fmt(c.asOf)} ${stale ? `<em class="cold">${C.daysOld(c)} days old</em>` : `<small>${ageTxt(c)}</small>`}</span><span class="cup">${I.refresh(11)} Update</span></div></div>${tip(acctCard(c), { w: 270, x: "c", y: "up", off: 8 })}</div>`;
}

/** The summary: what the cash is, and how much of everything at the brokers is idle. */
function summary(list) {
  const cash = list.reduce((s, c) => s + c.inr, 0), tot = D.VALUE + cash, idle = cash / tot, usd = list.filter((c) => c.us).reduce((s, c) => s + c.balance, 0), inrOnly = list.filter((c) => !c.us).reduce((s, c) => s + c.balance, 0);
  const parts = [usd ? D.usd(usd) : "", inrOnly ? L.inr(inrOnly) : ""].filter(Boolean).join(" and ");
  const point = hc({ h: "Cash at your brokers", t: lakhS(cash), d: `${plural(list.length, "account")}: ${parts}`, w: 280,
    rows: [...list.map((c) => [c.name, `${money(c)} · ${L.inr(c.inr)}`, col(c.color)]), ["Holdings", lakhS(D.VALUE), col("emerald")]],
    f: "Counted once in net worth, on Accounts. Here it sits beside the holdings, not inside their worth or your yearly return" });
  return `<div class="csum hov" tabindex="0"><div class="hk">Idle at the brokers</div><div class="cbig">${lakhS(cash)}</div><div class="csub">${plural(list.length, "account")} · ${parts}</div>
    <div class="cbar"><div class="strip"><span style="width:${(1 - idle) * 100}%;background:${fillc("emerald")}"></span><span style="width:${idle * 100}%;background:${fillc("gold")}"></span></div><div class="legend2"><span><i style="background:var(--card-emerald)"></i>Holdings ${lakhS(D.VALUE)} · ${pc(1 - idle)}</span><span><i style="background:var(--card-gold)"></i>Cash ${lakhS(cash)} · ${pc(idle)}</span></div></div>
    <div class="cnote"><b>${pc(idle)}</b> of the ${lakhS(tot)} you have at your brokers is not invested.</div>${tip(point, { w: 280, x: "l", y: "down", off: -4 })}</div>`;
}

/** The card. `list` defaults to the two sample accounts; `phone` stacks the tiles. */
export function cashCard({ list = C.CASH, phone = false, note = true } = {}) {
  const add = `<span class="mini-btn ghost">${I.plus(11)} ${phone ? "Add" : "Add broker cash"}</span>`;
  return card(`${cardHead("Cash at your brokers", phone ? "not invested" : "uninvested money, outside the worth and the yearly return", add)}<div class="cashx${phone ? " ph1" : ""}">${summary(list)}${list.map(acct).join("")}</div>${note ? `<div class="card-note">These are today's balances, each read off a statement or typed in, and they count once in net worth on Accounts. Going back to a day changes the holdings above, not this card: an older balance is in the account's history.</div>` : ""}`, { gap: 14 });
}
