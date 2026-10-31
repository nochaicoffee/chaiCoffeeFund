// The forms the page needs: Add goal, Add sub-goal, Set aside, Mark done. Sample data, made up.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { I, inr, btn, seg } = L;
export const fld = (label, inner, { full = false, req = false, opt = false, help = "" } = {}) => `<div class="fld${full ? " full" : ""}"><span class="lbl">${label}${req ? '<span class="req">*</span>' : ""}${opt ? '<span class="opt-tag">OPTIONAL</span>' : ""}</span>${inner}${help ? `<div class="help">${I.info(12)}<span>${help}</span></div>` : ""}</div>`;
export const inp = (v, { pre = "", suf = "", focus = false, ph = false } = {}) => `<div class="inp${focus ? " focus" : ""}">${pre ? `<span class="pre">${pre}</span>` : ""}<span class="${ph ? "ph-text" : ""}">${v}</span>${suf ? `<span class="suf">${suf}</span>` : ""}</div>`;
export const sel = (v) => `<div class="inp" style="justify-content:space-between"><span>${v}</span>${I.chev()}</div>`;
const sw = (on = 2) => `<span class="sw">${["copper", "violet", "teal", "ruby", "sapphire", "onyx"].map((c, i) => `<i class="${i === on ? "on" : ""}" style="background:${L.grad(c)}"></i>`).join("")}</span>`;
export const dlg = ({ icon, title, sub, preview, fields, note, cta }) => `<div class="dlg"><div class="dlg-h"><div class="dlg-ic">${icon}</div><div><h3>${title}</h3><p>${sub}</p></div><span class="dlg-x">${I.x(14)}</span></div><div class="dlg-b"><div class="preview">${preview}</div><div class="fields">${fields}</div></div><div class="dlg-f"><span class="note">${note}</span>${btn("Cancel")}${cta}</div></div>`;
export const pvk = (t) => `<div class="pv-k">${t}</div>`;
export const box = (rows) => `<div class="pv-box">${rows.map(([a, b]) => `<div class="between"><span>${a}</span><span>${b}</span></div>`).join("")}</div>`;

const addGoal = dlg({
  icon: I.goals(20), title: "Add a goal", sub: "Something you're saving a sum of money for.",
  preview: `${pvk("What this means")}${box([["Needed a month", "₹9,143"], ["Months left", "7"], ["Standing", "No plan yet"]])}<div class="pv-box" style="font-size:12px;line-height:1.5">Putting ₹9,143 aside each month reaches ₹85,000 by Jun 10, 2027. Set a planned amount to see whether you're on track.</div><div class="card-note" style="color:oklch(0.38 0.1 150)">A goal is an earmark: the money stays where it is and net worth doesn't change.</div>`,
  fields: [fld("Name", inp("Goa trip", { focus: true }), { full: true, req: true }), fld("Category", sel("Travel"), { req: true }), fld("Colour", sw(3), { opt: true }),
    fld("Why", seg([{ label: "Need" }, { label: "Want", on: true }]), { req: true, help: "A Need is something that breaks or goes undone without it." }), fld("How long", seg([{ label: "Minor", on: true }, { label: "Major" }]), { req: true, help: "Minor: a short-term thing. Major: a long-term financial commitment." }),
    fld("Amount", inp("85,000", { pre: "₹" }), { req: true }), fld("Target date", inp("Jun 10, 2027"), { help: "Leave it empty for someday." }), fld("Date type", seg([{ label: "Flexible", on: true }, { label: "Fixed" }]), { help: "Fixed can't slip, and is funded first." }), fld("Planned a month", inp("8,000", { pre: "₹" }), { opt: true }),
    fld("Saving began", inp("Aug 1, 2026"), { help: "The dashed line counts from here." }), fld("Link", inp("Paste a product or booking page", { ph: true }), { opt: true }), fld("Notes", inp("Four nights, flights booked early", { ph: false }), { full: true, opt: true })].join(""),
  note: "A goal can be split into sub-goals afterwards.", cta: btn("Add goal", { kind: "primary", icon: I.plus() }),
});
const car = L.goal("car");
const addSub = dlg({
  icon: I.plus(20), title: "Add a sub-goal", sub: "A piece of Car upgrade. Its total grows by this amount.",
  preview: `${pvk("Car upgrade will become")}${box([["Its own part", inr(150000)], ["Sub-goals now", inr(L.targetOf(car) - 150000)], ["This one", "+ ₹60,000"], ["Total", `<b>${inr(L.targetOf(car) + 60000)}</b>`]])}<div class="pv-box" style="font-size:12px;line-height:1.5">Its required monthly across everything goes from ${inr(L.requiredAll(car))} to ${inr(L.requiredAll(car) + 3530)}.</div><div class="card-note" style="color:oklch(0.38 0.1 150)">Sub-goals are one level deep: a sub-goal can't have its own.</div>`,
  fields: [fld("Part of", sel("Car upgrade"), { full: true, req: true }), fld("Name", inp("Music system", { focus: true }), { req: true }), fld("Category", sel("Vehicle")), fld("Why", seg([{ label: "Need" }, { label: "Want", on: true }]), { req: true }), fld("How long", seg([{ label: "Minor", on: true }, { label: "Major" }]), { req: true }),
    fld("Amount", inp("60,000", { pre: "₹" }), { req: true }), fld("Target date", inp("Mar 31, 2028"), { help: "Later than Car upgrade's date? The parent's date moves to match." }), fld("Date type", seg([{ label: "Flexible", on: true }, { label: "Fixed" }])), fld("Planned a month", inp("None yet", { ph: true }), { opt: true })].join(""),
  note: "Its colour and icon follow the parent unless you change them.", cta: btn("Add sub-goal", { kind: "primary", icon: I.plus() }),
});
const setAside = dlg({
  icon: I.goals(20), title: "Set aside", sub: "Record money you've put towards a goal. Nothing moves in your accounts.",
  preview: `${pvk("New fridge after this")}${box([["Set aside", `${inr(45000)} → <b>${inr(60000)}</b>`], ["Still to go", `${inr(17000)} → <b>${inr(2000)}</b>`], ["Needed a month", "₹17,000 → ₹2,000"]])}<div class="pv-box"><div class="gbar" style="height:12px"><span class="f" style="width:96.8%;background:${L.fill("teal", 90)}"></span><span class="e" style="left:59%"></span></div><div class="between" style="margin-top:4px"><span>97%</span><span>by now: 59%</span></div></div>`,
  fields: [fld("Goal", sel("New fridge · Fixed Dec 20"), { full: true, req: true }), fld("Amount", inp("15,000", { pre: "₹", focus: true }), { req: true }), fld("Date", inp("Oct 29, 2026"), { req: true }),
    fld("Where it sits", sel("HDFC Salary"), { full: true, opt: true, help: "Optional. HDFC Salary holds ₹1,82,400, and ₹45,000 of it is already earmarked for goals." }),
    fld("Note", inp("Added from the bonus", { ph: false }), { full: true, opt: true }),
    `<div class="fld full"><div class="help warn">${I.alert(13)}<span>This takes the account's earmarks to ₹60,000 of ₹1,82,400. That's fine. It would warn if the earmarks passed the balance.</span></div></div>`].join(""),
  note: "A Take-back is the same form the other way round.", cta: btn("Set aside ₹15,000", { kind: "primary", icon: I.check(14) }),
});
const markDone = dlg({
  icon: I.check(20), title: "Mark as bought", sub: "Headphones are done: record what they really cost.",
  preview: `${pvk("Against the estimate")}${box([["Estimate", inr(28000)], ["Cost", inr(26499)], ["Under by", `<b>${inr(1501)}</b> · 5.4%`]])}<div class="pv-box" style="font-size:12px;line-height:1.5">The ₹28,000 set aside is released: nothing stays in the goal, and the money is still in your accounts.</div><div class="card-note" style="color:oklch(0.38 0.1 150)">The payment itself shows up where it always does, on the card's statement or the account's balance.</div>`,
  fields: [fld("Goal", sel("Noise-cancelling headphones"), { full: true }), fld("What it cost", inp("26,499", { pre: "₹", focus: true }), { req: true }), fld("Bought on", inp("Sep 12, 2026"), { req: true }), fld("Paid from", sel("HDFC Regalia (card)"), { full: true, help: "An account or a card, never both." }),
    `<div class="fld full"><div class="help err">${I.alert(13)}<span>A goal with open sub-goals can't be marked bought. Finish or drop them first. (Not this one.)</span></div></div>`].join(""),
  note: "You can reopen it from Finished.", cta: btn("Mark bought", { kind: "primary", icon: I.check(14) }),
});
export const formsBoard = () => L.desktop({ w: 1100, h: "auto", body: `<div class="formgrid" style="padding:20px 0;align-items:stretch"><div class="between"><div><h1 style="font-size:24px;font-weight:800">Goal forms</h1><div class="card-note">Add goal · Add sub-goal · Set aside · Mark bought</div></div>${L.sampleTag()}</div>${[addGoal, addSub, setAside, markDone].map((d) => d.replace('class="dlg"', 'class="dlg" style="width:auto"')).join("")}</div>` });
