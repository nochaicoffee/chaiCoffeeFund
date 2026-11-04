// Round 3 widgets, on his REAL numbers (data.mjs): the greeting that points, the attention strip, the deposits table, coming up and the EPF card.
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
import * as P from "./parts.mjs";
const { I, inr, fmt, fmtY, plural } = L;
const { sum } = D;
const { hc, tip, card, cardHead, link, grid, page, col, grad, fillc, lakh, lakhS, daysLeft } = P;
export { card, cardHead, link, grid, page, col, grad, fillc, lakh, lakhS, daysLeft, hc, tip };

export const dmy = (iso) => `${+iso.slice(8, 10)} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
export const fdTile = (x, size = 38) => `<span class="btile" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;font-size:${Math.round(size * 0.33)}px;background:${grad(x.color)}">FD</span>`;
export const epfTile = (size = 38) => `<span class="btile" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;font-size:${Math.round(size * 0.3)}px;background:${grad("emerald")}">EPF</span>`;

// ---------- The greeting, pointing ----------
const pt = (text, card2, { x = "l" } = {}) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(card2, { w: 300, x, y: "down" })}</span>`;
export function pointLede() {
  const total = hc({ h: "Worth today", t: lakh(D.TOTAL), d: "what your EPF passbook says, plus your deposits", rows: [["EPF", lakh(D.EPF.total), col("emerald")], ["7 fixed deposits", lakh(D.FD_VALUE), col("teal")]], f: `EPF interest for this year (≈ ${lakh(D.EPF.pending)}) isn't credited yet, so it isn't counted here.` });
  const epf = hc({ h: "EPF, as your passbook says", t: lakh(D.EPF.total), d: `interest credited up to 31 Mar 2026; contributions up to ${fmt(D.EPF.lastCredit)}`, rows: [["Employee share", inr(D.EPF.each)], ["Employer share", inr(D.EPF.each)], ["Pension (EPS)", "₹0"]], f: `A month now: ${inr(D.EPF.lastMonthly)} (${inr(D.EPF.lastMonthly / 2)} each, after the July wage rise).` });
  const fds = hc({ h: "Fixed deposits", t: lakh(D.FD_VALUE), d: `${lakh(D.FD_PUT)} placed, ${inr(D.FD_ACCRUED)} earned so far`, rows: D.FDS.map((x) => [x.name, inr(D.fdWorth(x)), col(x.color)]), f: "All seven are at 7.75%." });
  const day = hc({ h: "Earning a day", t: inr(D.PER_DAY), d: `${inr(D.PER_DAY * 30.44)} a month at this pace`, rows: [["EPF, at 8.25% a year", `${inr(D.EPF.perDay)} a day`, col("emerald")], ["Deposits, at 7.75%", `${inr(D.FD_PER_DAY)} a day`, col("teal")]], f: "EPF's is built up through the year and credited each March." });
  const pend = hc({ h: "EPF interest built up, not credited", t: `≈ ${lakh(D.EPF.pending)}`, d: "April to October, at last year's 8.25%", rows: [["How it is worked out", "each month"], ["", "balance at month start × 8.25% ÷ 12"], ["Last year this gave", inr(D.EPF_CHECK[1].got)], ["And was credited", inr(2 * D.EPF_INTEREST[2].each)]], f: "The rate for this year isn't declared yet, so this is an estimate." });
  const next = hc({ h: "Next deposits to mature", t: D.NEXT_FD.name, d: `${fmtY(D.NEXT_FD.maturityDate)} · ${daysLeft(D.NEXT_FD.maturityDate)}`, rows: [...D.FDS].sort((a, b) => a.maturityDate.localeCompare(b.maturityDate)).slice(0, 4).map((x) => [x.name, `${fmt(x.maturityDate)} ${x.maturityDate.slice(0, 4)}`, col(x.color)]) });
  return `Your fixed income is worth ${pt(lakh(D.TOTAL), total)}: ${pt(`EPF ${lakh(D.EPF.total)}`, epf)} and ${pt(`${plural(D.FDS.length, "deposit")} ${lakh(D.FD_VALUE)}`, fds)}, earning about ${pt(`${inr(D.PER_DAY)} a day`, day)}. EPF has ${pt(`about ${lakh(D.EPF.pending)}`, pend)} of this year's interest built up and not yet credited. The next deposit matures ${daysLeft(D.NEXT_FD.maturityDate)}.`;
}
export const greeting = () => L.header({ lede: pointLede(), actions: `${L.btn("Add deposit", { icon: I.plus() })}${L.btn("Add EPF statement", { kind: "primary", icon: I.plus() })}` });
export const attention = () => `<div class="notes"><div class="notice">${I.alert(16)}<div class="grow"><b>EPF's FY 26-27 interest isn't credited yet.</b> About ${inr(D.EPF.pending)} has built up at last year's 8.25%. The rate is declared later, so it stays an estimate.</div><span class="btn btn-ghost btn-sm">How it's worked out</span></div>
<div class="notice">${I.alert(16)}<div class="grow"><b>The 7 deposits have no bank and no maturity amount.</b> Add what your FD app shows so worth today and maturity use the bank's own figures.</div><span class="btn btn-ghost btn-sm">Add them</span></div></div>`;
export const note = () => `<div style="display:flex;justify-content:flex-end"><span class="sample" style="background:var(--accent-tint);color:var(--accent-text)">Your real numbers: FD app and EPFO passbooks, 4 Nov 2026</span></div>`;

// ---------- The deposits table ----------
export function depositsTable() {
  const cols = "2.6fr 0.8fr 1fr 1.3fr 1.2fr 1.2fr 1.8fr";
  const th = (t, r) => `<span class="th"${r ? ' style="text-align:right"' : ""}>${t}</span>`;
  const head = `<div class="hrow" style="grid-template-columns:${cols};padding:0 0 8px">${th("Deposit")}${th("Rate", 1)}${th("Placed", 1)}${th("Worth today", 1)}${th("Matures", 1)}${th("Matures at", 1)}${th("How far through")}</div>`;
  const row = (x) => {
    const f = Math.min(1, D.daysBetween(x.startDate, D.TODAY) / D.daysBetween(x.startDate, x.maturityDate));
    return `<div class="hrow" style="grid-template-columns:${cols}"><div class="cell-name">${fdTile(x)}<div class="nm2"><b>${x.name}</b><small>${x.tenure} · started ${dmy(x.startDate)}</small></div></div><div class="r"><b class="num">${x.interestRate.toFixed(2)}%</b><small>quarterly</small></div><div class="r"><b class="num">${inr(x.principalAmount)}</b></div><div class="r"><b class="num">${inr(D.fdWorth(x))}</b><small class="up">+₹${x.shown.toFixed(2)}</small></div><div class="r"><b class="num">${dmy(x.maturityDate).split(" ").slice(0, 3).join(" ")}</b><small>${daysLeft(x.maturityDate)}</small></div><div class="r"><b class="num">${inr(x.maturityAmount)}</b><small>an estimate</small></div><div><b style="font-size:12.5px">${Math.round(f * 100)}%</b><div class="prog"><span style="width:${f * 100}%;background:${fillc(x.color)}"></span></div></div></div>`;
  };
  return card(`${cardHead("Fixed deposits", "as your FD app shows them · maturity amounts are estimates until you enter the bank's", link("Matured and pre-closed (0)"))}<div>${head}${[...D.FDS].sort((a, b) => a.maturityDate.localeCompare(b.maturityDate)).map(row).join("")}</div>`);
}

// ---------- Coming up ----------
export function comingUp() {
  const ev = [{ date: D.NEXT_EPF_CREDIT, nm: "EPF contribution", sub: "Oct wages, about the 17th", amt: `≈ ${inr(D.EPF.lastMonthly)}`, kind: "epf" }, { date: "2027-03-31", nm: "EPF year ends", sub: "interest is declared and credited after", amt: `≈ ${lakh(D.EPF.yearEnd)}`, kind: "epf" }];
  for (const x of [...D.FDS].sort((a, b) => a.maturityDate.localeCompare(b.maturityDate)).slice(0, 3)) ev.push({ date: x.maturityDate, nm: `${x.name} matures`, sub: `${x.tenure} · interest included`, amt: inr(x.maturityAmount), kind: "fd" });
  ev.sort((a, b) => a.date.localeCompare(b.date));
  const row = (e) => { const d = new Date(`${e.date}T00:00:00Z`); return `<div class="ev"><div class="dt"><b>${d.getUTCDate()}</b><small>${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]}</small></div><div class="nm"><b>${e.nm}</b><small>${e.sub}</small></div><div class="am"><b>${e.amt}</b><small>${daysLeft(e.date)}</small></div></div>`; };
  return card(`${cardHead("Coming up", "the next dates", link("All dates"))}<div>${ev.map(row).join("")}</div><div class="card-note">EPF contributions arrive about a month after the wage month, around the 17th to 18th lately; June's wages came late, on 26 July. The year-end figure is the estimate so far plus the rest of the year at today's contribution.</div>`);
}

// ---------- The EPF card ----------
export function epfCard() {
  const three = `<div class="statrow"><div class="kv"><span class="k">Employee</span><span class="v">${lakh(D.EPF.each)}</span><span class="s">${inr(D.EPF.each)}</span></div><div class="kv"><span class="k">Employer</span><span class="v">${lakh(D.EPF.each)}</span><span class="s">${inr(D.EPF.each)}</span></div><div class="kv"><span class="k">Pension (EPS)</span><span class="v">₹0</span><span class="s">none: wages are above the ceiling</span></div></div>`;
  const rows = [["This year's contributions", inr(D.EPF.contributedThisYear), `${D.EPF.creditsThisYear} credits, ${inr(D.EPF.lastMonthly)} a month now`], ["Interest not credited yet", `≈ ${inr(D.EPF.pending)}`, "April to October at 8.25%, an estimate"], ...[...D.EPF_INTEREST].reverse().map((i) => [`Interest credited, ${i.fy}`, inr(2 * i.each), `${fmtY(i.date).replace(",", "")}`])];
  const list = rows.map(([k, v, s]) => `<div style="display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:9px 0;border-bottom:1px solid var(--divider)"><span style="font-size:13px;font-weight:700">${k}</span><b class="num" style="text-align:right">${v}</b><small style="color:var(--muted);font-size:11.5px;font-weight:600;grid-column:1/-1">${s}</small></div>`).join("");
  return card(`${cardHead("Provident fund (EPF)", "NetApp India · from your EPFO passbook", link("Add a statement"))}${three}<div>${list}</div>`);
}
/** Deposits table, then coming up beside the EPF card. */
export const widgets = () => `${depositsTable()}${grid([[6, comingUp()], [6, epfCard()]])}`;
