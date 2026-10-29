// The insurance forms, drawn on his own policies: Add policy (his ManipalCigna health, paid once for three years, and his Acko car with its
// vehicle fields), Renew (his Digit accident cover, on time and after a lapse) and Cancel (the car, if he sold it). Dialogs follow the other
// dashboards' forms: a live preview beside the fields. Follows docs/design/insurance.md.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { rings } from "./rings.mjs";
const { I, inr, fmt, fmtY, mono } = L;
const { inrC, sgn, pc } = P;

export const sec = (n, title, desc, inner) => `<section style="display:flex;flex-direction:column;gap:16px"><div class="sec-h"><span class="sec-n">${n}</span><div><h3>${title}</h3>${desc ? `<p>${desc}</p>` : ""}</div></div>${inner}</section>`;
export const fld = (label, inner, { full = false, req = false, opt = false, help = "", warn = false } = {}) => `<div class="fld${full ? " full" : ""}"><span class="lbl">${label}${req ? '<span class="req">*</span>' : ""}${opt ? '<span class="opt-tag">OPTIONAL</span>' : ""}</span>${inner}${help ? `<span class="help${warn ? " warn" : ""}">${help}</span>` : ""}</div>`;
export const inp = (v, { pre = "", suf = "", focus = false, ph = false } = {}) => `<div class="inp${focus ? " focus" : ""}">${pre ? `<span class="pre">${pre}</span>` : ""}<span class="${ph ? "ph-text" : ""}">${v}</span>${suf ? `<span class="suf" style="margin-left:auto">${suf}</span>` : ""}</div>`;
export const sel = (v) => `<div class="inp"><span>${v}</span><span style="margin-left:auto;color:var(--muted);display:flex">${I.chev()}</span></div>`;
export const fseg = (items, on) => `<div class="fseg">${items.map((t) => `<span class="${t === on ? "on" : ""}">${t}</span>`).join("")}</div>`;
export const dlg = ({ w, icon, title, sub, preview, fields, foot }) => `<div class="dlg" style="width:${w}px"><div class="dlg-h"><span class="dlg-ic">${icon}</span><div><h3>${title}</h3><p>${sub}</p></div><span class="dlg-x">${I.x(14)}</span></div><div class="dlg-b">${preview}<div class="fields">${fields}</div></div><div class="dlg-f">${foot}</div></div>`;
export const pvBox = (rows) => `<div class="pv-box">${rows.map(([k, v, b]) => `<div class="between"><span${b ? ' style="font-weight:800;color:var(--fg)"' : ""}>${k}</span><span>${v}</span></div>`).join("")}</div>`;
export const preview = (k, inner) => `<div class="preview">${rings(320, 520, { first: 50, step: 26, opacity: 0.1 })}<span class="pv-k">${k}</span>${inner}</div>`;
export const note = (icon, html, cls = "") => `<div class="fld full"><div class="checkrow ${cls}">${icon}<span>${html}</span></div></div>`;
const chips = (items) => `<div class="addons">${items.map((a) => `<span class="addon">${I.check(11)}${a}</span>`).join("")}</div>`;
const chipsOff = (items) => `<div class="addons">${items.map((a) => `<span class="addon" style="opacity:.55">${I.plus(10)}${a}</span>`).join("")}</div>`;
const policyCard = ({ p, title, big, sub, extra = "" }) => `<div class="pv-box" style="gap:12px"><div class="row" style="gap:12px">${mono(p, 40)}<span><b style="font-size:15px;display:block">${title}</b><span class="muted" style="font-weight:600">${sub}</span></span></div><div style="font-size:30px;font-weight:800;letter-spacing:-0.02em">${big}</div>${extra}</div>`;
const small = (t) => `<span style="font-size:13px;font-weight:700;color:var(--muted)"> ${t}</span>`;

// ---------- 1. Add policy: health, paid once for three years ----------
export function addHealth() {
  const p = L.policy("health");
  const pv = preview("What you'll see", `${policyCard({ p, title: p.name, sub: `${p.insurer} · You`, big: `₹50,00,000${small("sum insured")}` })}${pvBox([["Paid", "₹38,428 once"], ["Cover", "Jul 5, 2026 to Jul 4, 2029"], ["A year of it", `${inr(p.premium)} (${inr(Math.round(p.premium / 12))} a month)`, true], ["Renews", "in 980 days, Jul 5, 2029"]])}<span class="pill pill-derived" style="align-self:flex-start">${I.link(10)} Worked out</span>${pvBox([["A year ÷ cover", pc(L.rateOf(p), 2), true]])}`);
  const fields = [
    fld("Kind", fseg(["Health", "Life", "Motor", "Accident", "Home"], "Health"), { full: true, help: "The kind decides which fields follow. Pick Motor for a car or bike, and the vehicle fields appear." }),
    fld("Name", inp("Lifetime Health", { focus: true }), { req: true, help: "The plan's name, so two policies from one insurer stay apart." }), fld("Insurer", inp("ManipalCigna"), { req: true }),
    fld("Covers", sel("You"), { req: true, help: "A person, a vehicle or the home. The page groups policies by this." }), fld("Policy number", inp("…3850"), { help: "Only the last four digits are kept." }),
    fld("Sum insured", inp("50,00,000", { pre: "₹" }), { req: true, help: "The most the policy pays in a policy year." }), fld("Cover starts", inp("Jul 5, 2026"), { req: true, help: "The first day of cover, from the schedule." }),
    fld("Cover lasts", fseg(["1 year", "2 years", "3 years", "5 years"], "3 years"), { req: true, help: "How long this premium buys. The renewal date is worked out from it." }), fld("Premium paid", fseg(["Once", "Each year"], "Once"), { req: true, help: "A single premium is spread over the years for \"a year\"." }),
    fld("Premium", inp("38,427.59", { pre: "₹", suf: "for 3 years" }), { req: true, help: "With GST, as paid." }), fld("Paid on", inp("Jul 5, 2026"), { help: "The PDF doesn't say. Until you enter it, the day cover starts is used." }),
    fld("Paid from", sel("Not recorded yet"), { opt: true, help: "An account, or a card. A card's premium is counted once, as a premium." }), fld("Policy document", inp("A link to the PDF", { ph: true }), { opt: true }),
    fld("Add-ons and covers", chips(["Health 360 Shield", "Health 360 OPD", "Cumulative bonus 15%", "Worldwide emergency ₹25L"]), { full: true, opt: true }),
    fld("Claims helpline", inp("1800-102-4461"), { opt: true, help: "So it's here when you need to claim." }), fld("Waiting periods", inp("30 days; 24 months for pre-existing"), { opt: true }),
  ].join("");
  return dlg({ w: 960, icon: I.plus(18), title: "Add policy", sub: "Something you're insured under", preview: pv, fields, foot: `<span class="note">The term you're in is saved as its first payment, so the page can count the days left.</span><span class="btn btn-soft">Cancel</span><span class="btn btn-primary">Add policy</span>` });
}

// ---------- 2. Add policy: motor ----------
export function addMotor() {
  const p = L.policy("car");
  const pv = preview("What you'll see", `${policyCard({ p, title: p.name, sub: `${p.insurer} · Honda City · …1843`, big: `₹4,42,000${small("IDV")}` })}${pvBox([["Paid", "₹5,504 for the year"], ["No-claim bonus", "50%, the top step"], ["Cover", "Aug 6, 2026 to Aug 5, 2027"], ["Renews", "in 281 days, Aug 6, 2027"]])}<div class="pv-box" style="gap:6px"><div class="between"><span>Policy recorded for</span><span>the car</span></div></div>`);
  const fields = [
    fld("Kind", fseg(["Health", "Life", "Motor", "Accident", "Home"], "Motor"), { full: true }),
    fld("Name", inp("Car · Comprehensive Platinum", { focus: true }), { req: true }), fld("Insurer", inp("Acko"), { req: true }),
    fld("Covers", sel("Car · Honda City"), { req: true, help: "Add the vehicle once: its registration number tells two vehicles apart. Only the last four digits show." }), fld("Policy number", inp("…5104")),
    fld("IDV", inp("4,42,000", { pre: "₹" }), { req: true, help: "Insured declared value: the most paid if it's stolen or written off. It falls each year." }), fld("Premium", inp("5,504", { pre: "₹", suf: "for 1 year" }), { req: true }),
    fld("Cover starts", inp("Aug 6, 2026"), { req: true }), fld("Cover lasts", fseg(["1 year", "2 years", "3 years", "5 years"], "1 year"), { req: true }),
    fld("Paid on", inp("Aug 6, 2026")), fld("Paid from", sel("Not recorded yet"), { opt: true }),
    fld("No-claim bonus", fseg(["0%", "20%", "25%", "35%", "45%", "50%"], "50%"), { full: true, help: "The step on this term, from the schedule. The car is at the top." }),
    fld("Cover", fseg(["Comprehensive", "Third party only"], "Comprehensive"), { full: true, help: "A third-party-only policy has no IDV; the page shows the premium and the dates." }),
    fld("Add-ons", `${chips(["Consumables", "Rat bite", "Consequential damage"])}<div style="height:6px"></div>${chipsOff(["Zero depreciation", "Engine protect", "Roadside assistance"])}`, { full: true, opt: true, help: "Greyed ones aren't on this policy." }),
    fld("Deductible", inp("1,000", { pre: "₹" }), { opt: true, help: "Paid on every claim." }), fld("Claims helpline", inp("1800-266-2256"), { opt: true }),
  ].join("");
  return dlg({ w: 960, icon: I.plus(18), title: "Add policy", sub: "Motor: a car or a bike", preview: pv, fields, foot: `<span class="note">A vehicle is added once, and each renewal is a new term on its policy.</span><span class="btn btn-soft">Cancel</span><span class="btn btn-primary">Add policy</span>` });
}

// ---------- 3. Renew: the accident cover ----------
export function renew({ late = false } = {}) {
  const p = L.policy("accident"), quote = 473, startIso = late ? "2027-03-27" : "2027-03-21", nxt = L.addMonthsUTC(startIso, 12);
  const start = late ? "Mar 27, 2027" : "Mar 21, 2027", paidOn = late ? "Mar 27, 2027" : "Mar 18, 2027";
  const ch = quote / p.paid - 1;
  const pv = preview(late ? "After this renewal, late" : "After this renewal", `${policyCard({ p, title: p.name, sub: `${p.insurer} · owner-driver of the bike`, big: `${inr(quote)}${small("for the year")}`, extra: `<span class="chg-up" style="font-weight:800;font-size:12.5px">${sgn(ch)} on last year's ${inr(p.paid)}</span>` })}${pvBox([["Cover", "₹15,00,000, the same"], ["New term", `${start} to ${fmtY(L.addDays(nxt, -1))}`], ["Next renewal", fmtY(nxt)]])}${late ? `<div class="pv-box" style="display:block;background:var(--warning-tint);color:var(--warning-text);font-weight:700;font-size:12px;line-height:1.55">Cover stopped Mar 20 and restarts Mar 27: <b>6 days with no cover</b>. The bike's policy leaves owner-driver cover out because this one exists, so there was none in the gap.</div>` : ""}`);
  const fields = [
    fld("Policy", sel(`${p.name} · ${p.insurer}`), { full: true }),
    fld("New term starts", inp(start, { focus: true }), { req: true, help: late ? "Later than Mar 21, so the page records a gap." : "The day after the last term ends. Change it if the insurer gave a different date.", warn: late }), fld("Paid on", inp(paidOn), { req: true }),
    fld("Cover lasts", fseg(["1 year", "2 years", "3 years", "5 years"], "1 year"), { req: true, help: "A multi-year renewal is one premium for all of it." }), fld("Premium", inp(String(quote), { pre: "₹", suf: "for 1 year" }), { req: true, help: `The insurer's quote, with GST. Last time was ${inr(p.paid)}.` }),
    fld("Sum insured", inp("15,00,000", { pre: "₹" }), { req: true, help: "Same as before. Change it if the cover changed." }), fld("Paid from", sel("Not recorded yet"), { opt: true }),
    fld("Policy number", inp("Same as before", { ph: true }), { opt: true, help: "Only if the insurer issued a new one." }), fld("Add-ons", inp("Same as before", { ph: true }), { opt: true }),
    ...(late ? [note(I.alert(16), `<b>This renews after the term ended.</b> The gap (Mar 21 to Mar 26) stays on the policy's history. The Insurance page showed it as lapsed until now.`)] : []),
  ].join("");
  return dlg({ w: 960, icon: I.refresh(18), title: "Renew policy", sub: `${p.name} · term 2`, preview: pv, fields, foot: `<span class="note">Saves the new term as a payment, and the policy's cover, premium and renewal date move to it.</span><span class="btn btn-soft">Cancel</span><span class="btn btn-primary">${I.check(13)} Renew</span>` });
}

// ---------- 4. Cancel ----------
export function cancel() {
  const p = L.policy("car");
  const pv = preview("Cancelling", `${policyCard({ p, title: p.name, sub: `${p.insurer} · Honda City · …1843`, big: "Stops counting" })}${pvBox([["A year of cover", `${inr(L.YEARLY)} → ${inr(L.YEARLY - p.premium)}`], ["Renewals", "none to come"], ["History", `${p.terms.length} payment stays`, true]])}`);
  const fields = [
    fld("Policy", sel(`${p.name} · ${p.insurer}`), { full: true }), fld("Cancelled on", inp("Nov 2, 2026", { focus: true })), fld("Why", sel("Vehicle sold")),
    fld("Refund", inp("0", { pre: "₹" }), { opt: true, help: "If the insurer refunded part of the premium. Recorded as a refund, not as income." }), fld("Replaced by", sel("Nothing")),
    note(I.info(16), `<b>Nothing is deleted.</b> A cancelled policy is left out of every total and its payments stay, as a cancelled subscription does. It's shown dimmed, and Restart brings it back.`),
  ].join("");
  return dlg({ w: 960, icon: I.x(16), title: "Cancel policy", sub: "It stops renewing and counting", preview: pv, fields, foot: `<span class="note">Cancelled, sold, surrendered or replaced: the page keeps the record.</span><span class="btn btn-soft">Keep it</span><span class="btn btn-primary" style="background:var(--negative)">Cancel policy</span>` });
}
export const toast = (t) => `<div class="toast"><i>${I.check(12)}</i>${t}<u>Undo</u><span style="opacity:.55">6s</span></div>`;

export function formsBoard() {
  const body = `<div class="board-h"><div class="row" style="gap:14px;flex-wrap:wrap"><h2>Insurance forms: add a policy, renew it, cancel it</h2>${L.sampleTag(". Today is Oct 29, 2026; the renewal quotes in 2027 are illustrative")}</div><p>Every policy is a <b>master row</b> (what it is, who it covers, the insurer) and a <b>payment for each term</b> (the dates the cover runs, how many years it buys, the premium, and for a vehicle the IDV and no-claim step). <b>Renewing is recording the next term.</b> A term can last <b>one to five years</b>, paid once or each year: his health cover and his bike's policy are single premiums for three years, so a year of cover is the premium over the years. The <b>kind</b> decides the fields. Nothing is deleted when a policy ends: cancelled ones stay, dimmed.</p></div>
${sec(1, "Add policy: health, paid once for three years", "His ManipalCigna policy as the example. The two new fields are how long the cover lasts and whether the premium is paid once or each year; the preview works out a year of it and the cost against the cover. The paid-on day is optional: the PDFs don't say, so the day cover starts stands in until it's entered.", addHealth())}
${sec(2, "Add policy: motor", "His Acko car policy. A vehicle has an IDV, a no-claim bonus step, and add-ons shown as on or off. The registration number is entered once, and only its last four digits show on the page.", addMotor())}
${sec(3, "Renew: on time", "His Digit accident cover, due Mar 21, 2027 (the quote is illustrative). Pre-filled from the last term: dates, cover and account. The insurer's quote is the only thing you must type.", `<div style="display:flex;flex-direction:column;gap:22px">${renew()}${toast("Accident · Owner-driver cover renewed to Mar 2028 · ₹473")}</div>`)}
${sec(4, "Renew: after a lapse", "When the new term starts after the old one ended, the form says how many days had no cover, and the gap stays in the history. For this policy it also says the bike's policy relies on it.", renew({ late: true }))}
${sec(5, "Cancel", "Sold the car, surrendered a plan, replaced it: it stops counting and stays on record.", `<div style="display:flex;flex-direction:column;gap:22px">${cancel()}${toast("Car · Comprehensive Platinum cancelled")}</div>`)}`;
  return `<div class="chai-app board" style="width:1100px;height:__H__">${body}</div>`;
}
