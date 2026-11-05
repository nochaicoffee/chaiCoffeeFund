// The widgets shared by every Lent out board: the greeting that points, the attention strip, the loans table, "Interest coming up" and the repayments log.
// Static HTML; the hover cards are CSS only. Every figure comes from data.mjs (lentOut.ts, ported).
import * as L from "./lib.mjs";
import * as D from "./data.mjs";
const { I, inr } = L;

export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dmy = (iso) => `${+iso.slice(8)} ${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
export const dm = (iso) => `${+iso.slice(8)} ${MON[+iso.slice(5, 7) - 1]}`;
export const mY = (iso) => `${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
export const dowDm = (iso) => `${L.dow(iso)} ${dm(iso)}`;
export const lakh = (n) => (Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : L.inr(n));
export const inr2 = (n) => `₹${n.toFixed(2)}`;
export const col = (c) => `var(--card-${c})`;
export const grad = (c) => `linear-gradient(155deg,var(--card-${c}-from),var(--card-${c}-to))`;
export const fillc = (c, a = 90) => `linear-gradient(${a}deg,color-mix(in oklch,var(--card-${c}) 80%,white),var(--card-${c}))`;
export const pastel = (c) => `color-mix(in oklch, var(--card-${c}) 45%, white)`;
export const daysAway = (iso) => { const n = D.daysBetween(D.TODAY, iso); return n === 0 ? "today" : n === 1 ? "tomorrow" : n > 0 ? `in ${n} days` : n === -1 ? "yesterday" : `${-n} days ago`; };
export const rateText = (r) => `${Number.isInteger(r) ? r : r.toFixed(1)}%`;
export const termsText = (l) => (l.interestMode === "Accruing" ? `${l.interestRate}% simple` : `${inr(l.payoutAmount)} a ${l.payoutFrequency === "Monthly" ? "month" : l.payoutFrequency === "Quarterly" ? "quarter" : "year"}`);

export const hc = ({ h, hr = "", t = "", d = "", rows = [], f = "", w = 280 }) =>
  `<div class="hc" style="width:${w}px"><div class="h"><span>${h}</span>${hr}</div>${t ? `<div class="t">${t}</div>` : ""}${d ? `<div class="d">${d}</div>` : ""}${rows.length ? `<ul>${rows.map(([nm, v, c]) => `<li>${c ? `<i style="width:8px;height:8px;border-radius:50%;background:${c};flex-shrink:0"></i>` : ""}<span class="nm">${nm}</span><b>${v}</b></li>`).join("")}</ul>` : ""}${f ? `<div class="f">${f}</div>` : ""}</div>`;
export const tip = (card2, { w = 280, x = "c", y = "down", off = 8 } = {}) =>
  `<span class="hc-wrap" style="${y === "up" ? `bottom:calc(100% + ${off}px)` : `top:calc(100% + ${off}px)`};${x === "c" ? `left:50%;margin-left:-${w / 2}px` : x === "l" ? "left:0" : "right:0"}">${card2}</span>`;
export const card = (inner, { gap = 16, style = "", cls = "" } = {}) => `<section class="card glass ${cls}" style="gap:${gap}px;${style}">${inner}</section>`;
export const cardHead = (title, small = "", right = "") => `<div class="card-h"><div class="card-t">${title}${small ? `<small>${small}</small>` : ""}</div>${right}</div>`;
export const link = (t) => `<span class="link">${t}${I.arrowR(12)}</span>`;
export const grid = (items, gap = 20) => `<div class="g12" style="gap:${gap}px">${items.map(([span, html]) => `<div style="grid-column:span ${span}">${html}</div>`).join("")}</div>`;
export const page = (body) => L.desktop({ h: "auto", body: `<div class="pgcol">${body}</div>` });
export const sampleTag = (t = "Sample payments, made up") => `<span class="sample sample-tag">${t}</span>`;

/** A borrower's tile: the initial on the loan's colour. */
export const tile = (l, size = 38) => `<span class="btile" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;font-size:${Math.round(size * 0.4)}px;background:${grad(l.color)}">${l.tag}</span>`;

/** One promised payout's dot. */
export const dot = (state) => `<i class="pd pd-${{ ok: "ok", "late-paid": "lp", missing: "ms", late: "wt", up: "up" }[state]}">${{ ok: "✓", "late-paid": "!", missing: "×", late: "", up: "" }[state]}</i>`;
export const dots = (loan, extraUp = 1) => `<div class="pds">${(D.PAYOUTS[loan.id] ?? []).map((p) => dot(p.state)).join("")}${Array.from({ length: extraUp }, () => dot("up")).join("")}</div>`;

// ---------- The greeting, pointing ----------
const pt = (text, card2, { x = "l", w = 300 } = {}) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(card2, { w, x, y: "down" })}</span>`;
const sumA = D.S.a;
export function pointLede() {
  const owed = hc({ h: "Owed today", t: inr(D.TOTAL), d: "principal still out, plus interest owed", rows: D.LOANS.map((l) => [l.borrowerName, inr(D.S[l.id].owedToday), col(l.color)]), f: "The same figure as the Lent out line in net worth. Interest a payout loan pays arrives as income, so it isn't added here." });
  const loans = hc({ h: "Loans", t: "3 loans", d: "all still out, none repaid", rows: D.LOANS.map((l) => [l.borrowerName, `${rateText(D.S[l.id].rate)} · ${l.interestMode}`, col(l.color)]), f: "One piles up interest until he pays. Two pay it out on a schedule, and the principal stays out." });
  const day = hc({ h: "Earning a day", t: `${inr(D.PER_DAY)}<small> a day</small>`, d: `${inr(D.PER_DAY * 30.44)} a month, at today's pace`, rows: D.LOANS.map((l) => [l.borrowerName, `${inr2(D.perDay(l))} a day`, col(l.color)]), f: "Principal still out × rate ÷ 365, for each loan. A payout loan's rate is what it pays a year over what was lent." });
  const pile = hc({ h: "Friend's interest", t: inr(sumA.interestAccrued), d: `${inr(sumA.principalOutstanding)} × 12% × ${D.DAYS_A} days ÷ 365`, rows: [["Lent on", dmy(D.A.startDate)], ["Days out", String(D.DAYS_A)], ["Paid back so far", inr(sumA.interestPaid)], ["Owed today", inr(sumA.owedToday)]], f: "Simple interest, never compounded: it doesn't earn interest on itself. It grows by about ₹214 a day." });
  const miss = hc({ h: "Payouts not here", t: inr(D.MISSED_AMT), d: "of what was promised so far, on the sample", rows: D.MISSED.map((p) => [`${dm(p.due)} · ${p.loan.borrowerName}`, p.state === "late" ? `${p.lateBy} days late` : "never arrived", col(p.loan.color)]), f: "Matched against the bank statement through each loan's income source. These payments are made up on this board." });
  const nx = D.upcoming(4);
  const next = hc({ h: "Next payouts", t: inr(D.NEXT.amount), d: `${dowDm(D.NEXT.due)} · ${D.NEXT.loan.borrowerName} · ${daysAway(D.NEXT.due)}`, rows: nx.map((u) => [`${dm(u.due)} ${u.due.slice(0, 4)} · ${u.loan.borrowerName}`, inr(u.amount), col(u.loan.color)]), f: "Assumes the first payout falls one period after the day the money was lent." });
  return `${pt(inr(D.TOTAL), owed)} is out with ${pt("3 loans", loans)}, earning about ${pt(`${inr(D.PER_DAY)} a day`, day, { x: "c" })}. ${pt(inr(sumA.interestAccrued), pile)} of it is interest piling up on Friend's 12% loan, and ${pt(inr(D.MISSED_AMT), miss, { x: "c" })} of payouts hasn't reached you. The next one is ${pt(inr(D.NEXT.amount), next, { x: "c" })} on ${pt(dowDm(D.NEXT.due), next, { x: "r" })}.`;
}
export const greetingActions = () => `${L.btn("Record a repayment", { icon: I.coin(14) })}${L.btn("Add a loan", { kind: "primary", icon: I.plus() })}`;
export const greeting = () => L.header({ eyebrow: `Lent out · Today ${sampleTag()}`, lede: pointLede(), actions: greetingActions() });

export const attention = () => {
  const late = D.MISSED.find((p) => p.state === "late"), gone = D.MISSED.find((p) => p.state === "missing");
  return `<div class="notes"><div class="notice">${I.alert(16)}<div class="grow"><b>${inr(late.amount)} from ${late.loan.borrowerName} was due ${L.dow(late.due)} ${dm(late.due)} and hasn't arrived (${late.lateBy} days).</b> ${dm(gone.due)}'s ${inr(gone.amount)} never did. Match the bank credit when it lands, or leave it open.</div><span class="btn btn-ghost btn-sm">Open Income</span></div>
<div class="notice">${I.clock(16)}<div class="grow"><b>Friend's ${inr(D.A.principalAmount)} is ${D.DAYS_A} days out with nothing paid back.</b> ${inr(sumA.interestAccrued)} of interest is owed, growing ${inr(D.perDay(D.A))} a day. A measure, not a reminder to chase.</div><span class="btn btn-ghost btn-sm">Record a repayment</span></div></div>`;
};

// ---------- The loans table ----------
export function interestCell(l, S = D.S, payoutOf = D.PAYOUTS) {
  const s = S[l.id];
  if (l.interestMode === "Accruing") return `<div class="r"><b class="num">${inr(s.interestOwed)}</b><small>${s.interestPaid ? `${inr(s.interestPaid)} paid · ` : "owed · "}piling up ${inr(D.perDay(l))} a day</small></div>`;
  const exp = D.expectedSoFar(l), got = D.receivedSoFar(l);
  return `<div class="r"><b class="num">${inr(exp)}</b><small>so far: ${inr(got)} in${exp - got ? `, <span class="dn">${inr(exp - got)} missing</span>` : ""}</small></div>`;
}
export function loansTable({ title = "Loans", note = "money you've lent, outside any bank", footer = true } = {}) {
  const cols = "2.5fr 0.8fr 1fr 0.9fr 1.9fr 1.2fr 1.5fr";
  const th = (t, r) => `<span class="th"${r ? ' style="text-align:right"' : ""}>${t}</span>`;
  const head = `<div class="hrow" style="grid-template-columns:${cols};padding:0 0 8px">${th("Loan")}${th("Rate", 1)}${th("Lent", 1)}${th("Back so far", 1)}${th("Interest", 1)}${th("Owed today", 1)}${th("Next due", 1)}</div>`;
  const row = (l) => {
    const s = D.S[l.id], nd = D.nextDue(l, D.TODAY), pay = l.interestMode === "Paid-out";
    return `<div class="hrow" style="grid-template-columns:${cols}"><div class="cell-name">${tile(l, 40)}<div class="nm2"><b>${l.borrowerName}<span class="tagb ${pay ? "" : "warn"}">${l.interestMode}</span></b><small>lent ${dmy(l.startDate)} · ${D.daysBetween(l.startDate, D.TODAY)} days</small>${pay ? dots(l) : ""}</div></div>
<div class="r"><b class="num">${rateText(s.rate)}</b><small>${pay ? "from the payout" : "simple, a year"}</small></div>
<div class="r"><b class="num">${inr(l.principalAmount)}</b><small>${pay ? termsText(l) : "one lump sum"}</small></div>
<div class="r"><b class="num">${inr(l.principalAmount - s.principalOutstanding)}</b><small>${s.principalOutstanding === l.principalAmount ? "none returned" : `${inr(s.principalOutstanding)} still out`}</small></div>
${interestCell(l)}
<div class="r"><b class="num">${inr(s.owedToday)}</b><small>${pay ? "principal only" : "principal + interest"}</small></div>
<div class="r">${nd ? `<b class="num">${dm(nd)} ${nd.slice(0, 4)}</b><small>${daysAway(nd)} · ${inr(l.payoutAmount)}</small>` : `<b class="num">No date</b><small>paid when he pays</small>`}</div></div>`;
  };
  const foot = footer ? `<div class="hrow" style="grid-template-columns:${cols};border-top:1px solid var(--divider);border-bottom:0;padding-bottom:0"><b style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">All three</b><span></span><div class="r"><b class="num">${inr(D.sum(D.LOANS.map((l) => l.principalAmount)))}</b></div><div class="r"><b class="num">₹0</b></div><div class="r"><b class="num">${inr(D.EARNED)}</b><small>${inr(D.RECEIVED)} received · ${inr(D.NOT_YET)} not yet</small></div><div class="r"><b class="num">${inr(D.TOTAL)}</b></div><span></span></div>` : "";
  return card(`${cardHead(title, note, link("Repaid (0)"))}<div>${head}${D.LOANS.map(row).join("")}${foot}</div>`);
}

// ---------- Interest coming up ----------
export function comingUp() {
  const day = (iso) => ({ d: +iso.slice(8), m: MON[+iso.slice(5, 7) - 1] });
  const ev = D.upcoming(4).map((u) => ({ ...u, ...day(u.due) }));
  const row = (e) => `<div class="ev"><div class="dt"><b>${e.d}</b><small>${e.m}</small></div><div class="nm"><b>${e.loan.borrowerName}</b><small>${termsText(e.loan)} · ${L.dow(e.due)}</small></div><div class="am"><b>${inr(e.amount)}</b><small>${daysAway(e.due)}</small></div></div>`;
  const pile = `<div class="ev soft"><div class="dt"><b>∞</b><small>daily</small></div><div class="nm"><b>${D.A.borrowerName}</b><small>12% simple · piles up, paid when he pays</small></div><div class="am"><b>+${inr(D.perDay(D.A))}</b><small>a day, ${inr(D.perDay(D.A) * 30)} in 30</small></div></div>`;
  const over = D.MISSED.filter((q) => q.state === "late").map((q) => `<div class="ev soft" style="background:var(--warning-tint)"><div class="dt"><b>${+q.due.slice(8)}</b><small>${MON[+q.due.slice(5, 7) - 1]}</small></div><div class="nm"><b>${q.loan.borrowerName}<span class="tagb warn">${q.lateBy} days over</span></b><small>${termsText(q.loan)} · due ${L.dow(q.due)} · not matched to a bank credit yet</small></div><div class="am"><b>${inr(q.amount)}</b><small>overdue</small></div></div>`).join("");
  return card(`${cardHead("Interest coming up", "dated payouts, and the one that piles up", link("All dates"))}<div>${over}${pile}${ev.map(row).join("")}</div><div class="card-note foot">Each payout is matched to the bank credit through the loan's income source, so it shows as received here and in Income.</div>`, { gap: 10 });
}

// ---------- Money back (the repayments log) ----------
export function repaymentsLog() {
  const rows = D.LOG.slice(0, 6);
  const row = (p) => { const d = p.got; return `<div class="ev"><div class="dt"><b>${+d.slice(8)}</b><small>${MON[+d.slice(5, 7) - 1]}</small></div><div class="nm"><b>${p.loan.borrowerName}<span class="tagb ${p.state === "late-paid" ? "warn" : "gain"}">${p.state === "late-paid" ? `${p.lateBy} days late` : "on time"}</span></b><small>Interest · from Income, matched to the bank credit</small></div><div class="am"><b>${inr(p.amount)}</b><small>due ${dm(p.due)}</small></div></div>`; };
  return card(`${cardHead("Money back", "interest from Income, and repayments you record", link("Everything"))}<div>${rows.map(row).join("")}</div><div class="notice info foot" style="font-size:12px;padding:10px 12px">${I.info(14)}<div class="grow">No principal has come back yet, so there are no repayments to log. The interest on Friend's loan will land here as a repayment when he pays.</div></div>`, { gap: 6 });
}
export const widgets = () => `${loansTable()}${grid([[6, comingUp()], [6, repaymentsLog()]])}`;
export const sampleNote = () => `<div style="display:flex;justify-content:flex-end"><span class="sample">Real loans · payments received are sample, made up · today is Fri Nov 6, 2026</span></div>`;
