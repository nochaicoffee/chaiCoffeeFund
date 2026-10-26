// The widget library for the Loans boards: hover cards, the greeting that points, the attention strip, the loans table,
// coming up, the schedule, principal and interest, where EMIs come from, and the cost of borrowing. Static HTML/SVG;
// switches and picks are CSS only (radios + :has()), like the other dashboards' boards.
import * as L from "./lib.mjs";
const { I, inr, inrL, inrS, signed, fmt, fmtY, fmtDow, btn, mono, col, grad, plural } = L;

// ---------- Hover cards (the app's light .hc), and where they open from ----------
export const hc = ({ h, hr = "", t = "", d = "", rows = [], f = "", w = 250 }) =>
  `<div class="hc" style="width:${w}px"><div class="h"><span>${h}</span>${hr}</div>${t ? `<div class="t">${t}</div>` : ""}${d ? `<div class="d">${d}</div>` : ""}${rows.length ? `<ul>${rows.map(([nm, v, c]) => `<li>${c ? `<i style="width:8px;height:8px;border-radius:3px;background:${c};flex-shrink:0"></i>` : ""}<span class="nm">${nm}</span><b>${v}</b></li>`).join("")}</ul>` : ""}${f ? `<div class="f">${f}</div>` : ""}</div>`;
export const tip = (card2, { w = 250, x = "c", y = "up", off = 8 } = {}) =>
  `<span class="hc-wrap" style="${y === "up" ? `bottom:calc(100% + ${off}px)` : `top:calc(100% + ${off}px)`};${x === "c" ? `left:50%;margin-left:-${w / 2}px` : x === "l" ? "left:0" : "right:0"}">${card2}</span>`;

// ---------- Small shared bits ----------
export const card = (inner, { gap = 16, style = "", cls = "" } = {}) => `<section class="card glass ${cls}" style="gap:${gap}px;${style}">${inner}</section>`;
export const cardHead = (title, small = "", right = "") => `<div class="card-h"><div class="card-t">${title}${small ? `<small>${small}</small>` : ""}</div>${right}</div>`;
export const link = (t) => `<span class="link">${t}${I.arrowR(12)}</span>`;
export const worked = (t = "Worked out") => L.derivedTag(t);
/** Principal and interest colours are variables, so a palette is one override (see the Palettes board). Defaults are on .chai-app. */
export const PRINCIPAL = "var(--c-prin)";
export const INTEREST = "var(--c-int)";
export const row = (cols, items, gap = 20) => `<div style="display:grid;grid-template-columns:${cols};gap:${gap}px;align-items:stretch">${items.join("")}</div>`;
export const page = (body, wrapCls = "") => L.desktop({ h: "auto", body: `<div class="${wrapCls}" style="display:flex;flex-direction:column;gap:20px">${body}</div>` });
export const pk = (prefix, ids, def = "all") => ids.map((id) => `<input type="radio" class="pk-in" name="${prefix}-sel" id="${prefix}-sel-${id}"${id === def ? " checked" : ""} aria-label="${id}">`).join("");
/** CSS that fades every loan but the picked one. `sel` maps a loan id to the selector of what to keep lit inside the hero. */
export const pickCss = (prefix, keep) => `<style>${L.LOANS.map((l) => `.${prefix}dir:has(#${prefix}-sel-${l.id}:checked) .pick:not(.pk-${l.id}) { opacity: 0.18; }`).join("\n")}
${L.LOANS.map((l) => `.${prefix}dir:has(#${prefix}-sel-${l.id}:checked) label[for="${prefix}-sel-${l.id}"].pkl { background: var(--surface); box-shadow: var(--soft-shadow); }`).join("\n")}
.${prefix}dir:has(#${prefix}-sel-all:checked) label[for="${prefix}-sel-all"].pkl { background: var(--ink); color: var(--on-ink); }${keep ?? ""}</style>`;
/** The loan chips along the top of a hero (pick one to follow it). */
export const loanChips = (prefix) => `<div class="row" style="gap:8px;flex-wrap:wrap"><label for="${prefix}-sel-all" class="chip pkl" style="cursor:pointer">All loans</label>${L.ACTIVE.map((l) => `<label for="${prefix}-sel-${l.id}" class="chip pkl" style="cursor:pointer"><i style="background:${col(l)}"></i>${l.name}</label>`).join("")}</div>`;

const rowsBy = (fn, list = L.AS) => list.map((s) => [s.loan.name, fn(s), col(s.loan)]);
const dayWord = (d) => (d === 0 ? "today" : d === 1 ? "tomorrow" : d > 0 ? `in ${d} days` : `${-d} days ago`);
const instState = (i) => {
  if (i.status === "Paid") return i.paidDate > i.dueDate ? `<span class="pill pill-late">Paid · ${L.daysBetween(i.dueDate, i.paidDate)} days late</span>` : `<span class="pill pill-on">Paid</span>`;
  const d = L.daysBetween(L.TODAY, i.dueDate);
  return d <= 7 ? `<span class="pill pill-due">${I.clock(10)} Due ${dayWord(d)}</span>` : `<span class="pill pill-off">${L.fmt(i.dueDate)}</span>`;
};

// ---------- The greeting, pointing (every dashboard's greeting points) ----------
const pt = (text, card2, { x = "l" } = {}) => `<span class="hov pt" tabindex="0"><b>${text}</b>${tip(card2, { w: 270, x, y: "down" })}</span>`;
export function pointLede() {
  const nx = L.NEXT_DUE, nl = L.NEXT_LOAN, ns = L.sum_(nl.id);
  const owe = hc({ h: "Still owed", t: inr(L.OWE), d: `${inr(L.BORROWED)} borrowed, ${inr(L.REPAID)} repaid`, rows: rowsBy((s) => inr(s.outstanding)), f: "The principal of every EMI not yet paid" });
  const emi = hc({ h: "EMIs each month", t: inr(L.EMI_TOTAL), d: `${plural(L.AS.length, "active loan")}`, rows: rowsBy((s) => inr(s.emi)), f: `${(L.SALARY_SHARE * 100).toFixed(0)}% of your ${inr(L.SALARY)} salary` });
  const rep = hc({ h: "Repaid so far", t: `${(L.REPAID_PCT * 100).toFixed(0)}%`, d: `${inr(L.REPAID)} of the ${inr(L.BORROWED)} you borrowed`, rows: rowsBy((s) => `${(s.repaidPct * 100).toFixed(0)}%`), f: "Principal only. Interest is counted separately" });
  const intr = hc({ h: "Interest still to pay", t: inr(L.INTEREST_LEFT), d: `${inr(L.INTEREST_PAID)} already paid`, rows: rowsBy((s) => inr(s.interestLeft)), f: "From each loan's schedule, if you pay every EMI on time" });
  const next = hc({ h: `${nl.name} · EMI ${nx.installmentNumber} of ${ns.n}`, hr: `<span class="pill pill-due" style="padding:2px 8px;font-size:10px">due soon</span>`, t: inr(nx.totalDue), d: `due ${fmtDow(nx.dueDate)}`, rows: [["Principal", inr(nx.principalDue), PRINCIPAL], ["Interest", inr(nx.interestDue), INTEREST], ["Charged to", L.ACCOUNTS[nx.paidFrom].name, ""]], f: "Mark it paid once it's gone through" });
  const free = hc({ h: "Debt-free", t: fmtY(L.DEBT_FREE), d: `${L.ymTxt(L.monthsTo(L.DEBT_FREE))} from today`, rows: L.AS.map((s) => [s.loan.name, L.monName(s.end.slice(0, 7)) + " " + s.end.slice(0, 4), col(s.loan)]), f: "When the last EMI of the last loan is due" });
  return `You owe ${pt(inr(L.OWE), owe)} across ${plural(L.AS.length, "loan")}, and ${pt(inr(L.EMI_TOTAL), emi)} goes out in EMIs each month. ${pt(`${(L.REPAID_PCT * 100).toFixed(0)}%`, rep)} of what you borrowed is repaid, with ${pt(inr(L.INTEREST_LEFT), intr)} of interest still to come. Your next EMI, ${pt(inr(nx.totalDue), next)} for the ${nl.name}, is due ${fmt(nx.dueDate)}, and you'll be ${pt(`debt-free in ${L.monName(L.DEBT_FREE.slice(0, 7))} ${L.DEBT_FREE.slice(0, 4)}`, free, { x: "r" })}.`;
}
export const greeting = () => L.header({ lede: pointLede(), actions: L.greetingActions() });

/** The strip under the greeting while an EMI is due within a week. */
export function attention() {
  const i = L.DUE_SOON[0], l = L.loan(i.loanId), d = L.daysBetween(L.TODAY, i.dueDate);
  return `<div class="notice">${I.alert(16)}<div class="grow"><b>${l.name} · ${inr(i.totalDue)}</b> is due ${fmt(i.dueDate)} (${dayWord(d)}) and will be charged to ${L.ACCOUNTS[i.paidFrom].name}.</div><span class="mini-btn ok">${I.check(11)} Mark paid</span><span class="mini-btn ghost">See schedule</span></div>`;
}

// ---------- The loans table ----------
export function loansTable({ title = "Loans", note = "everything you borrowed from a bank · hover a bar", compact = false } = {}) {
  const cols = compact ? "2.2fr 1fr 2fr 1.2fr 1.3fr" : "2.3fr 1.1fr 1fr 2.1fr 1.2fr 1.3fr 1.1fr";
  const th = (t, r) => `<span class="th"${r ? ' style="text-align:right"' : ""}>${t}</span>`;
  const head = compact
    ? `<div class="srow" style="grid-template-columns:${cols};padding:0 0 8px">${th("Loan")}${th("EMI")}${th("Repaid")}${th("Still owed")}${th("Next EMI")}</div>`
    : `<div class="srow" style="grid-template-columns:${cols};padding:0 0 8px">${th("Loan")}${th("Borrowed")}${th("EMI")}${th("Repaid")}${th("Still owed")}${th("Next EMI")}${th("Ends", true)}</div>`;
  const rows = L.SUM.map((s) => {
    const l = s.loan, off = l.status === "Closed", nx = s.next;
    const name = `<div class="cell-name">${mono(l, 34)}<div><b>${l.name}</b><small>${l.lenderName} · ${l.annualInterestRate}% · ${l.tenureMonths / 12 >= 1 && l.tenureMonths % 12 === 0 ? `${l.tenureMonths / 12} yr` : `${l.tenureMonths} mo`}</small></div></div>`;
    const bar = `<div class="hov" tabindex="0" style="position:relative"><div class="hbar"><span class="rt" style="width:${Math.max(2, s.repaidPct * 100)}%;background:${L.fill(l, 90)}"></span></div><span class="sub2" style="margin-top:5px;display:block">${off ? "All 12 paid" : `${s.paidN} of ${s.n} paid · ${(s.repaidPct * 100).toFixed(0)}%`}</span>${tip(hc({ h: l.name, t: `${(s.repaidPct * 100).toFixed(1)}% repaid`, d: `${inr(s.principalRepaid)} of ${inr(l.principalAmount)}`, rows: [["Paid so far (with charges)", inr(s.totalPaid), PRINCIPAL], ["Of which interest", inr(s.interestPaid), INTEREST], ["Interest still to come", inr(s.interestLeft), INTEREST]], f: `${plural(s.lateN, "EMI")} paid late` }), { w: 270, x: "c", y: "up" })}</div>`;
    const owed = `<div class="num">${inr(s.outstanding)}</div><span class="sub2">${off ? "Closed" : `${s.left} EMIs left`}</span>`;
    const nextTxt = off ? `<span class="pill pill-off">Closed ${L.monName(s.end.slice(0, 7))} ${s.end.slice(0, 4)}</span>` : `<b>${fmt(nx.dueDate)}</b><span class="sub2">${L.daysBetween(L.TODAY, nx.dueDate) <= 7 ? `<span style="color:var(--warning-text);font-weight:700">${dayWord(L.daysBetween(L.TODAY, nx.dueDate))}</span>` : dayWord(L.daysBetween(L.TODAY, nx.dueDate))}</span>`;
    const ends = `<div class="num" style="text-align:right">${L.monName(s.end.slice(0, 7))} ${s.end.slice(0, 4)}</div><span class="sub2" style="text-align:right;display:block">${off ? "done" : L.ymTxt(L.monthsTo(s.end))}</span>`;
    return compact
      ? `<div class="srow pick pk-${l.id}${off ? " off" : ""}" style="grid-template-columns:${cols}">${name}<div><div class="num">${inr(s.emi)}</div></div>${bar}<div>${owed}</div><div>${nextTxt}</div></div>`
      : `<div class="srow pick pk-${l.id}${off ? " off" : ""}" style="grid-template-columns:${cols}">${name}<div class="num">${inr(l.principalAmount)}</div><div class="num">${inr(s.emi)}</div>${bar}<div>${owed}</div><div>${nextTxt}</div><div>${ends}</div></div>`;
  }).join("");
  return card(`${cardHead(title, note, btn("Add loan", { kind: "soft", icon: I.plus(12), cls: "btn-sm" }))}<div class="tbl">${head}${rows}</div><div class="foot between" style="font-size:12px;color:var(--muted);font-weight:600"><span>${plural(L.AS.length, "active loan")} · <b style="color:var(--fg)">${inr(L.OWE)}</b> still owed · ${inr(L.EMI_TOTAL)} a month</span>${link("All installments")}</div>`, { gap: 12 });
}

// ---------- Coming up ----------
export function comingUp({ n = 5, filter = true } = {}) {
  const items = L.UPCOMING.slice(0, n);
  const rows = items.map((i, k) => {
    const l = L.loan(i.loanId), d = L.daysBetween(L.TODAY, i.dueDate), soon = d <= 7;
    return `<div class="cu"><div class="dd${soon ? " late" : ""}"><b>${Number(i.dueDate.slice(8))}</b><span>${L.monName(i.dueDate).toUpperCase()}</span></div><div><div class="tt">${l.name} · EMI ${i.installmentNumber} of ${L.sum_(l.id).n}</div><div class="ss">${soon ? `<span style="color:var(--warning-text);font-weight:700">${dayWord(d)}</span>` : dayWord(d)} · ${inr(i.principalDue)} principal, ${inr(i.interestDue)} interest · ${L.ACCOUNTS[i.paidFrom].name}</div></div><div class="amt" style="color:var(--fg)">−${inr(i.totalDue)}${k === 0 ? `<span class="mini-btn ok" style="margin-top:6px">${I.check(11)} Mark paid</span>` : ""}</div></div>`;
  }).join("");
  const n30 = L.UPCOMING.filter((i) => L.daysBetween(L.TODAY, i.dueDate) <= 29), s30 = n30.reduce((t, i) => t + i.totalDue, 0);
  return card(`${cardHead("Coming up", "the next EMIs, from each schedule", filter ? L.seg([{ label: "All", on: true }, { label: "Due soon" }, { label: "Later" }]) : "")}<div class="tbl">${rows}</div><div class="foot between" style="font-size:12px;color:var(--muted);font-weight:600;border-top:1px solid var(--divider);padding-top:12px"><span>Next 30 days: <b style="color:var(--fg)">${inr(s30)}</b> from ${plural(n30.length, "EMI")}</span>${worked("From the schedules")}</div>`, { gap: 6 });
}

// ---------- The schedule of one loan ----------
export function scheduleCard({ loanId = "pers", before = 3, after = 6, title = "Schedule", selector = true } = {}) {
  const l = L.loan(loanId), s = L.sum_(loanId);
  const idx = s.ins.findIndex((i) => i.status === "Pending");
  const list = s.ins.slice(Math.max(0, idx - before), idx + after);
  const g = "40px 1.1fr 1.2fr 1fr 1fr 1.1fr 1.5fr";
  const head = `<div class="srow" style="grid-template-columns:${g};padding:0 0 8px;gap:10px"><span class="th">#</span><span class="th">Due</span><span class="th">Opening</span><span class="th">Principal</span><span class="th">Interest</span><span class="th">EMI</span><span class="th" style="text-align:right">Status</span></div>`;
  const rows = list.map((i) => `<div class="srow${i.installmentNumber === s.next?.installmentNumber ? " nextrow" : ""}" style="grid-template-columns:${g};padding:9px 0;gap:10px;${i.status === "Paid" ? "color:var(--muted)" : ""}"><span class="num">${i.installmentNumber}</span><span>${fmtY(i.dueDate)}</span><span>${inr(i.openingBalance)}</span><span>${inr(i.principalDue)}</span><span>${inr(i.interestDue)}</span><b>${inr(i.totalDue)}</b><span style="text-align:right">${instState(i)}</span></div>`).join("");
  const pickSel = L.select({ value: `${mono(l, 18)} ${l.name}`, kind: "pill", options: L.ACTIVE.map((x) => ({ label: x.name, meta: inr(L.sum_(x.id).emi), on: x.id === loanId })) });
  return card(`${cardHead(title, `EMI ${s.paidN + 1} of ${s.n} next · ${l.annualInterestRate}% reducing balance`, selector ? pickSel : `<span class="row" style="gap:8px;font-weight:700;font-size:13px">${mono(l, 22)}${l.name}</span>`)}<div class="tbl">${head}${rows}</div><div class="foot between" style="font-size:12px;color:var(--muted);font-weight:600"><span>Interest falls and principal grows every month, the EMI stays ${inr(s.emi)}</span>${link(`All ${s.n} installments`)}</div>`, { gap: 12 });
}

// ---------- Principal and interest, year by year ----------
export function splitCard({ h = 190, title = "Principal and interest", note = "what each year's EMIs are made of · hover a year" } = {}) {
  const years = Array.from({ length: 18 }, (_, k) => 2026 + k);
  const data = years.map((y) => { const ins = L.INST.filter((i) => i.dueDate.startsWith(String(y)) && L.loan(i.loanId).status === "Active"); return { y, p: ins.reduce((t, i) => t + i.principalDue, 0), i: ins.reduce((t, i) => t + i.interestDue, 0) }; });
  const max = Math.max(...data.map((d) => d.p + d.i));
  const cols = data.map((d) => {
    const past = d.y < 2026, now = d.y === 2026;
    const card2 = hc({ h: String(d.y), hr: now ? `<span class="pill pill-ink" style="padding:2px 8px;font-size:10px">this year</span>` : "", t: inr(d.p + d.i), d: `${Math.round((d.i / (d.p + d.i)) * 100)}% of it is interest`, rows: [["Principal", inr(d.p), PRINCIPAL], ["Interest", inr(d.i), INTEREST], ["Loans paying", L.AS.filter((s) => s.ins.some((i) => i.dueDate.startsWith(String(d.y)))).map((s) => s.loan.name.replace(" loan", "")).join(", "), ""]], w: 250 });
    const tot = d.p + d.i, ph = (tot / max) * 86;
    return `<div class="mcol hov${now ? " nowcol" : ""}" tabindex="0"><div class="plot"><div class="mval" style="font-size:10px;position:absolute;left:0;right:0;bottom:${ph}%">${inrS(tot)}</div><div class="mstack" style="position:absolute;left:0;right:0;bottom:0;height:${ph}%"><div class="mseg rt" style="height:${(d.p / tot) * 100}%;background:${PRINCIPAL}"></div><div class="mseg rt" style="height:${(d.i / tot) * 100}%;background:${INTEREST}"></div></div></div><div class="mlab${now ? " now" : ""}" style="font-size:10px">’${String(d.y).slice(2)}</div>${tip(card2, { w: 250, x: "c", y: "up" })}</div>`;
  }).join("");
  const first = data[0], totalI = data.reduce((t, d) => t + d.i, 0), totalP = data.reduce((t, d) => t + d.p, 0);
  return card(`${cardHead(title, note, `<div class="row" style="gap:14px"><span class="lg"><i style="background:${PRINCIPAL}"></i>Principal</span><span class="lg"><i style="background:${INTEREST}"></i>Interest</span></div>`)}<div class="mb fill" style="min-height:${h + 60}px;flex:1;gap:8px;padding-left:0">${cols}</div><div class="card-note">Every year's EMIs for the loans still active, by due date. The step down in 2028 and 2029 is when the Personal and Car loans end, and from 2030 only the Home loan is left. Interest is ${Math.round((totalI / (totalI + totalP)) * 100)}% of the ${inr(totalI + totalP)} still to be paid from 2026.</div>`, { gap: 12 });
}

// ---------- Where EMIs come from ----------
export function paidFromCard() {
  const ids = ["hdfc", "regalia"];
  const rows = ids.map((id) => {
    const a = L.ACCOUNTS[id], ls = L.AS.filter((s) => s.loan.paidFrom === id), v = ls.reduce((t, s) => t + s.emi, 0);
    return `<div style="display:flex;flex-direction:column;gap:7px"><div class="between"><span class="row" style="gap:8px;font-weight:800;font-size:13px"><span class="minibank" style="background:${grad(a.color)};width:22px;height:22px;border-radius:7px">${a.initial}</span>${a.name}</span><b style="font-size:15px">${inr(v)}<span style="font-size:11px;color:var(--muted);font-weight:600"> a month</span></b></div><div class="hbar" style="display:flex;gap:2px;background:transparent;height:12px">${ls.map((s) => `<span class="rt" style="width:${(s.emi / L.EMI_TOTAL) * 100}%;background:${L.fill(s.loan, 90)};border-radius:6px"></span>`).join("")}</div><span class="sub2">${ls.map((s) => `${s.loan.name} ${inr(s.emi)}`).join(" · ")}</span></div>`;
  }).join("");
  return card(`${cardHead("Where the EMIs come from", "who pays each one")}<div style="display:flex;flex-direction:column;gap:18px;flex:1;justify-content:space-around">${rows}</div><div class="card-note">The Personal loan's EMI is charged to the Regalia card, so it only leaves HDFC Salary when that card's statement is paid. It's counted once, as an EMI here, and not again as card spending.</div>`, { gap: 16 });
}

// ---------- Cost of borrowing ----------
export function costCard() {
  const intAll = L.INTEREST_ALL + L.PRE_EMI, cost = intAll + L.CHARGES, total = L.BORROWED + cost;
  const paidSoFar = L.AS.reduce((t, s) => t + s.principalRepaid + s.interestPaid, 0) + L.PRE_EMI + L.CHARGES;
  const net = L.AS.reduce((t, s) => t + L.netDisbursed(s.loan), 0);
  const line = (k, v, { b = false, c = "", sub = "" } = {}) => `<div class="between" style="padding:9px 0;border-bottom:1px dashed var(--divider);${b ? "font-weight:800;font-size:14px" : "font-weight:600"}"><span class="row" style="gap:8px">${c ? `<i style="width:9px;height:9px;border-radius:3px;background:${c}"></i>` : ""}${k}${sub ? `<small style="color:var(--muted);font-weight:600">${sub}</small>` : ""}</span><b>${v}</b></div>`;
  return card(`${cardHead("Cost of borrowing", "interest and charges, if every EMI is on time", worked())}<div>${line("You borrowed", inr(L.BORROWED), { c: PRINCIPAL, sub: `${inr(net)} reached your accounts` })}${line("Interest", inr(intAll), { c: INTEREST, sub: `${inr(L.INTEREST_PAID)} paid, ${inr(L.INTEREST_LEFT)} to come, ${inr(L.PRE_EMI)} pre-EMI` })}${line("Charges", inr(L.CHARGES), { c: "oklch(0.7 0.02 260)", sub: "processing fees, stamp duty, prepayment charges" })}${line("Interest and charges", inr(cost), { b: true })}</div><div style="display:flex;flex-direction:column;gap:7px"><div class="hbar" style="height:14px"><span class="rt" style="width:${(paidSoFar / total) * 100}%;background:${L.fill("emerald", 90)}"></span></div><div class="between sub2"><span>${inr(paidSoFar)} paid so far (${Math.round((paidSoFar / total) * 100)}%)</span><span>${inr(total - paidSoFar)} to go</span></div></div><div class="tbl" style="gap:0"><div class="srow" style="grid-template-columns:1.6fr 1fr 1fr 1fr;padding:0 0 6px;gap:8px"><span class="th">By loan</span><span class="th">Interest</span><span class="th">Charges</span><span class="th" style="text-align:right">Repay</span></div>${L.AS.map((s) => `<div class="srow" style="grid-template-columns:1.6fr 1fr 1fr 1fr;padding:9px 0;gap:8px;font-weight:700"><span class="row" style="gap:8px">${mono(s.loan, 22)}${s.loan.name.replace(" loan", "")}</span><span>${inrL(s.interestTotal + s.loan.preEmiInterest)}</span><span>${inrL(s.loan.processingFee + s.loan.stampDuty)}</span><b style="text-align:right">${(1 + (s.interestTotal + s.loan.preEmiInterest + s.loan.processingFee + s.loan.stampDuty) / s.loan.principalAmount).toFixed(2)}×</b></div>`).join("")}</div><div class="card-note">Every ₹100 borrowed costs ₹${Math.round((total / L.BORROWED) * 100)} by the end. Late charges so far: ${inr(L.AS.reduce((t, s) => t + s.lateCharges, 0))} across ${plural(L.LATE_N, "late EMI")}.</div>`, { gap: 14 });
}
