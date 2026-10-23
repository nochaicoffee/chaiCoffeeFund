// The loan forms, drawn: Add loan (with the charges that come out of the disbursal), Mark paid (paying more than the EMI
// creates a prepayment), and Add prepayment (the effect, the charge, the bank's own figures, and the loan's limits as warnings).
// Follows docs/system-design.md, Loan > "Prepayments: designed 2026-10-25". Dialogs follow the other dashboards' forms: a live preview beside the fields.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { rings } from "./rings.mjs";
const { I, inr, fmt, fmtY, mono, grad } = L;

const sec = (n, title, desc, inner) => `<section style="display:flex;flex-direction:column;gap:16px"><div class="sec-h"><span class="sec-n">${n}</span><div><h3>${title}</h3>${desc ? `<p>${desc}</p>` : ""}</div></div>${inner}</section>`;
const fld = (label, inner, { full = false, req = false, opt = false, help = "", warn = false } = {}) => `<div class="fld${full ? " full" : ""}"><span class="lbl">${label}${req ? '<span class="req">*</span>' : ""}${opt ? '<span class="opt-tag">OPTIONAL</span>' : ""}</span>${inner}${help ? `<span class="help${warn ? " warn" : ""}">${help}</span>` : ""}</div>`;
const inp = (v, { pre = "", suf = "", focus = false, ph = false } = {}) => `<div class="inp${focus ? " focus" : ""}">${pre ? `<span class="pre">${pre}</span>` : ""}<span class="${ph ? "ph-text" : ""}">${v}</span>${suf ? `<span class="suf" style="margin-left:auto">${suf}</span>` : ""}</div>`;
const sel = (v) => `<div class="inp"><span>${v}</span><span style="margin-left:auto;color:var(--muted);display:flex">${I.chev()}</span></div>`;
const fseg = (items, on) => `<div class="fseg">${items.map((t) => `<span class="${t === on ? "on" : ""}">${t}</span>`).join("")}</div>`;
const dlg = ({ w, icon, title, sub, preview, fields, foot }) => `<div class="dlg" style="width:${w}px"><div class="dlg-h"><span class="dlg-ic">${icon}</span><div><h3>${title}</h3><p>${sub}</p></div><span class="dlg-x">${I.x(14)}</span></div><div class="dlg-b">${preview}<div class="fields">${fields}</div></div><div class="dlg-f">${foot}</div></div>`;
const pvBox = (rows) => `<div class="pv-box">${rows.map(([k, v, b]) => `<div class="between"><span${b ? ' style="font-weight:800;color:var(--fg)"' : ""}>${k}</span><span>${v}</span></div>`).join("")}</div>`;
const preview = (k, inner) => `<div class="preview">${rings(320, 520, { first: 50, step: 26, opacity: 0.1 })}<span class="pv-k">${k}</span>${inner}</div>`;
const note = (icon, html, cls = "") => `<div class="fld full"><div class="checkrow ${cls}">${icon}<span>${html}</span></div></div>`;
const est = `<span class="pill pill-derived" style="align-self:flex-start">${I.link(10)} Estimate</span>`;

// ---------- 1. Add loan: the three amounts that come out of the disbursal ----------
function addLoan() {
  // Prathik's HDFC personal loan agreement, as in system-design.md: 11,10,000 at 9.99%, 12 EMIs due on the 7th, net disbursed 11,00,920.
  const t = { principalAmount: 1110000, annualInterestRate: 9.99, tenureMonths: 12, firstEmiDate: "2026-11-07", processingFee: 7670, stampDuty: 499, preEmiInterest: 911 };
  const sch = L.generateSchedule({ ...t, id: "new" }), emi = sch[0].totalDue, interest = sch.reduce((s, i) => s + i.interestDue, 0), net = t.principalAmount - t.processingFee - t.stampDuty - t.preEmiInterest;
  const pv = preview("What you'll get", `<div class="pv-box" style="gap:12px"><div class="row" style="gap:12px"><span class="mono" style="width:40px;height:40px;border-radius:12px;background:${grad("violet")}">${I.user(20)}</span><span><b style="font-size:15px;display:block">Personal loan</b><span class="muted" style="font-weight:600">HDFC Bank · ${t.annualInterestRate}% · ${t.tenureMonths} EMIs</span></span></div><div style="font-size:30px;font-weight:800;letter-spacing:-0.02em">${inr(emi)}<span style="font-size:13px;font-weight:700;color:var(--muted)"> a month</span></div><span class="muted" style="font-weight:600">due on the 7th, from ${fmtY(t.firstEmiDate)} to ${fmtY(sch.at(-1).dueDate)}</span></div>${pvBox([["Interest over the loan", inr(interest)], ["Last EMI", inr(sch.at(-1).totalDue)], ["Total you'll repay", inr(sch.reduce((s, i) => s + i.totalDue, 0)), true]])}${pvBox([["Loan amount", inr(t.principalAmount)], ["Processing fee", `− ${inr(t.processingFee)}`], ["Stamp duty", `− ${inr(t.stampDuty)}`], ["Pre-EMI interest", `− ${inr(t.preEmiInterest)}`], ["Reaches HDFC Salary", inr(net), true]])}<div class="muted" style="font-size:11.5px;font-weight:600;line-height:1.5">The EMI stays on the full ${inr(t.principalAmount)}. The three amounts are taken out of what's paid in, and the pre-EMI interest counts as interest.</div>`);
  const fields = [
    fld("Name", inp("Personal loan", { focus: true }), { req: true, help: "Something memorable, since two loans can share a bank." }), fld("Lender", inp("HDFC Bank"), { req: true }),
    fld("Category", sel("Personal")), fld("Loan amount", inp("11,10,000", { pre: "₹" }), { req: true }),
    fld("Interest rate", inp("9.99", { suf: "% a year" }), { req: true }), fld("Number of EMIs", inp("12", { suf: "months" }), { req: true, help: "EMIs are monthly." }),
    fld("First EMI date", inp("Nov 7, 2026"), { req: true, help: "From the sanction letter. Every EMI falls on the same day of the month." }), fld("Disbursed on", inp("Oct 21, 2026"), { req: true }),
    fld("Processing fee", inp("7,670", { pre: "₹" }), { help: "With GST, as the bank charged it." }), fld("Stamp duty", inp("499", { pre: "₹" })),
    fld("Pre-EMI interest", inp("911", { pre: "₹" }), { help: "The odd days before the EMI cycle starts (3 days here), as the bank quotes it." }), fld("Paid into", sel("HDFC Salary")),
    fld("EMI paid from", sel("HDFC Salary"), { help: "An account, or a card if the EMI is charged to one." }), fld("A prepayment usually", fseg(["Reduce tenure", "Reduce EMI"], "Reduce tenure"), { help: "What an extra payment does by default. You can change it on any one." }),
    fld("Prepayment charge", inp("4", { suf: "% + GST" }), { opt: true, help: "Drops to 3% after 24 EMIs and 2% after 36 (add steps)." }), fld("Prepayment limits", inp("At most 25% of what's left, once a year, twice in all", {}), { opt: true, help: "Warnings only. They never stop a save." }),
  ].join("");
  return dlg({ w: 960, icon: I.plus(18), title: "Add loan", sub: "Money you borrowed from a bank", preview: pv, fields, foot: `<span class="note">The full schedule of ${t.tenureMonths} EMIs is created with the loan.</span><span class="btn btn-soft">Cancel</span><span class="btn btn-primary">Add loan</span>` });
}

// ---------- 2. Mark paid: more than the EMI is a prepayment ----------
function markPaid() {
  const l = L.loan("pers"), s = L.sum_("pers"), i = s.next, paid = 30000, extra = paid - i.totalDue, p = L.prepay(l, extra, "Reduce-Emi");
  const pv = preview("Marking paid", `<div class="pv-box" style="gap:12px"><div class="row" style="gap:12px">${mono(l, 40)}<span><b style="font-size:15px;display:block">${l.name} · EMI ${i.installmentNumber} of ${s.n}</b><span class="muted" style="font-weight:600">due ${fmt(i.dueDate)}</span></span></div><div style="font-size:30px;font-weight:800;letter-spacing:-0.02em">${inr(paid)}</div></div>${pvBox([["This EMI, recorded as", inr(i.totalDue)], ["Prepayment (Excess-Emi)", inr(extra), true], ["Charge on the prepayment", inr(p.charge)]])}${est}${pvBox([["Still owed", `${inr(s.outstanding)} → ${inr(s.outstanding - i.principalDue - extra)}`], ["EMI from the next one", `${inr(s.emi)} → ${inr(p.emi)}`], ["Still ends", fmt(s.end) + ", " + s.end.slice(0, 4)], ["Interest saved", inr(p.interestSaved), true]])}`);
  const fields = [
    fld("Loan", sel(`${l.name} · EMI ${i.installmentNumber}`), { full: true }), fld("Due on", inp(fmtY(i.dueDate))), fld("Paid on", inp("Oct 25, 2026", { focus: true }), { req: true }),
    fld("Amount paid", inp("30,000", { pre: "₹" }), { req: true, help: `The EMI is ${inr(i.totalDue)}. The form starts there.` }), fld("Paid from", sel("HDFC Regalia (card)")),
    note(I.info(16), `<b>${inr(extra)} above the EMI goes to principal as a prepayment.</b> The EMI is recorded at its own ${inr(i.totalDue)}, and the extra becomes a prepayment dated the same day.`),
    fld("The extra should", fseg(["Reduce tenure", "Reduce EMI"], "Reduce EMI"), { help: `This loan usually reduces its EMI. Changing it here only affects this prepayment.` }), fld("Prepayment charge", inp(Math.round(p.charge).toLocaleString("en-IN"), { pre: "₹" }), { help: `4% + GST of ${inr(extra)}. Change it to what the bank took.` }),
    fld("Overdue charge", inp("0", { pre: "₹" }), { opt: true, help: "Anything above the EMI and this is the prepayment." }),
  ].join("");
  return dlg({ w: 960, icon: I.check(18), title: "Mark paid", sub: "An EMI, with anything extra", preview: pv, fields, foot: `<span class="note">Both rows are saved together, so the extra is never lost inside the EMI's amount.</span><span class="btn btn-soft">Cancel</span><span class="btn btn-primary">${I.check(13)} Mark paid</span>` });
}

// ---------- 3. Add prepayment ----------
function addPrepayment() {
  const l = L.loan("pers"), s = L.sum_("pers"), amount = 50000, p = L.prepay(l, amount, "Reduce-Emi"), checks = L.limitChecks(l, s, amount);
  const pv = preview("After this prepayment", `${est}${pvBox([["Still owed", `${inr(s.outstanding)} → ${inr(s.outstanding - amount)}`], ["EMI", `${inr(s.emi)} → ${inr(p.emi)}`], ["Ends", `${fmt(s.end)}, ${s.end.slice(0, 4)}, the same`], ["Interest still to pay", `${inr(s.interestLeft)} → ${inr(p.interest)}`]])}<div class="pv-box" style="gap:10px"><div class="between"><span>Interest saved</span><span style="font-size:17px">${inr(p.interestSaved)}</span></div><div class="between"><span>Charge</span><span style="font-size:17px">${inr(p.charge)}</span></div><div class="muted" style="font-size:11.5px;font-weight:600;line-height:1.5">Shown side by side, never netted, so a prepayment that isn't worth its fee is easy to see.</div></div>${pvBox([["You pay", inr(amount + p.charge), true], ["From", "HDFC Salary"]])}<div class="muted" style="font-size:11.5px;font-weight:600;line-height:1.5">The interest in the month of a prepayment follows a proposed rule, so these are estimates until a bank letter confirms them. Paid EMIs never change.</div>`);
  const warnList = `<div class="fld full"><div class="limbox"><span class="lbl">${l.lenderName}'s limits · warnings, not blocks</span>${checks.map((c) => `<div class="lim ${c.ok ? "ok" : "bad"}"><span>${c.ok ? I.check(12) : I.alert(13)}</span><span>${c.text}${c.detail && !c.ok ? `<small>${c.detail}. You can still save it.</small>` : ""}</span></div>`).join("")}</div></div>`;
  const fields = [
    fld("Loan", sel(`${l.name} · ${inr(s.outstanding)} still owed`), { full: true }), fld("Date", inp("Oct 25, 2026")), fld("Amount", inp("50,000", { pre: "₹", focus: true }), { req: true, help: "The principal it pays off." }),
    fld("Effect", fseg(["Reduce tenure", "Reduce EMI", "Close"], "Reduce EMI"), { full: true, help: "This loan usually reduces its EMI, so that's chosen. Close pays off everything that's left and closes the loan." }),
    fld("Charge", inp(Math.round(p.charge).toLocaleString("en-IN"), { pre: "₹" }), { help: `4% + GST of ${inr(amount)}, filled in from the loan's rule. A separate debit that doesn't reduce principal.` }), fld("Paid from", sel("HDFC Salary")),
    warnList,
    fld("Bank's new EMI", inp("From the revised schedule letter", { ph: true }), { opt: true, help: "If you enter it, the app uses it instead of its own figure." }), fld("Bank's new number of EMIs", inp("From the revised schedule letter", { ph: true }), { opt: true, help: "Same: the bank's figure wins." }),
  ].join("");
  return dlg({ w: 960, icon: I.arrowR(18), title: "Add prepayment", sub: `${l.name} · ${l.lenderName}`, preview: pv, fields, foot: `<span class="note">The remaining EMIs are rebuilt. The ones already paid stay as they are.</span><span class="btn btn-soft">Cancel</span><span class="btn btn-primary">Save prepayment</span>` });
}
const toast = () => `<div style="display:inline-flex;align-items:center;gap:14px;padding:12px 16px 12px 18px;border-radius:999px;background:var(--ink);color:var(--on-ink);box-shadow:var(--pop-shadow);font-weight:700;font-size:13.5px;align-self:flex-start"><span style="width:22px;height:22px;border-radius:50%;background:var(--on-card-lime);color:var(--ink);display:inline-flex;align-items:center;justify-content:center">${I.check(12)}</span>Personal loan ₹50,000 prepaid · EMI now ₹6,719<span style="color:var(--on-card-lime);font-weight:800;margin-left:6px">Undo</span><span style="opacity:.55;font-weight:600;font-size:12px">6 s</span></div>`;

export function formsBoard() {
  const body = `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>Loan forms: add a loan, mark an EMI paid, add a prepayment</h2>${L.sampleTag(". Today is Oct 25, 2026")}</div><p>These follow the prepayment design in <b>system-design.md</b> (decided 2026-10-25). A prepayment either <b>shortens the loan or lowers the EMI</b>, by the loan's usual effect unless you choose otherwise, or <b>closes</b> it. <b>Any amount paid beyond an EMI is a prepayment.</b> Prepayments carry the bank's <b>charge</b>, a separate debit shown beside interest saved. The bank's <b>limits are warnings</b>, never blocks. A bank figure, if entered, replaces the app's. Forms are the other dashboards' forms: a live preview beside the fields; a full-screen sheet on a phone.</p></div>
${sec(1, "Add loan", "New since the first design: the first EMI date (the day of the month every EMI falls on), stamp duty, pre-EMI interest, and a usual prepayment effect with the bank's charge and limits. The processing fee, stamp duty and pre-EMI interest come out of the disbursal, so the preview shows what actually reaches the account. Shown with the numbers from the HDFC agreement (the fee and stamp duty split is made up; the total matches).", addLoan())}
${sec(2, "Mark paid, with more than the EMI", "Paying more than the EMI (plus any overdue charge) records the EMI at its own amount and creates a prepayment for the extra, in one save. The form says so.", markPaid())}
${sec(3, "Add prepayment, and after it", "The effect starts as the loan's usual one. The charge is filled in from the loan's rule and can be changed to what the bank took. HDFC's limits show as warnings: this ₹50,000 is over 25% of what's left, and it still saves. The two bank letter fields are optional.", `<div style="display:flex;flex-direction:column;gap:22px">${addPrepayment()}${toast()}</div>`)}
${sec(4, "Cost of borrowing, with charges beside interest", "Interest (pre-EMI interest included) and charges (processing fee, stamp duty, and prepayment charges once there are any) are shown apart, with the total of both.", `<div style="width:560px">${P.costCard()}</div>`)}`;
  return `<div class="chai-app board" style="width:1100px;height:__H__">${body}</div>`;
}
