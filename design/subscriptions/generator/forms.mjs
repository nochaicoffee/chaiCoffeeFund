// The forms, shared by every direction: Add / Edit subscription, Record payment, Pause and Cancel, and the phone sheets.
// Same shell as the Cards forms (docs/design/cards-forms.md): a dialog with a live preview on the left, a full-screen sheet on phone.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { inr, fmt, fmtY, fmtDow, mono, cardChip, I, btn, iconBtn, rings, select } = L;
import { section, frame } from "./states.mjs";

const lbl = (t, { req = false, opt = false, isNew = false } = {}) => `<span class="lbl">${t}${req ? '<span class="req">*</span>' : ""}${opt ? '<span class="opt-tag">Optional</span>' : ""}${isNew ? ' <span class="tag-new">New field</span>' : ""}</span>`;
const inp = (v, { pre = "", suf = "", cls = "", ph = false, icon = "" } = {}) => `<span class="inp ${cls}">${pre ? `<span class="pre">${pre}</span>` : ""}<span class="grow${ph ? " ph-text" : ""}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v}</span>${suf ? `<span class="suf">${suf}</span>` : ""}${icon}</span>`;
const help = (t, kind = "") => `<span class="help ${kind}">${kind === "err" ? I.alert(12) : I.info(12)}<span>${t}</span></span>`;
const fld = (inner, full = false) => `<div class="fld${full ? " full" : ""}">${inner}</div>`;
const fseg = (items, on) => `<div class="fseg">${items.map((x) => `<span${x === on ? ' class="on"' : ""}>${x}</span>`).join("")}</div>`;
const dateInp = (v, cls = "") => inp(v, { cls, icon: `<span class="muted" style="display:flex">${I.cal(14)}</span>` });
const sw = (c) => `<i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--card-${c});margin-right:10px;vertical-align:0"></i>`;
const catOptions = (on) => L.CATEGORIES.map((c) => ({ label: `${sw(c.color)}${c.name}`, on: c.name === on }));
const cardOptions = (on) => Object.entries(L.CARDS).map(([id, c]) => ({ label: `<span class="minitile" style="display:inline-block;vertical-align:-2px;margin-right:9px;background:linear-gradient(155deg,var(--card-${c.color}-from),var(--card-${c.color}-to))"></span>${c.name}`, meta: `${c.issuer} · ${c.last4}`, on: id === on }));

function previewTile(s, { amount = s.amount, cycle = s.billingCycle, name = s.alias, next = "2026-10-23", w = 284, h = 168 } = {}) {
  const c = L.catColor(s.category);
  return `<div class="dtile" style="width:${w}px;height:${h}px;background:linear-gradient(155deg,var(--card-${c}-from),var(--card-${c}-to))">${rings(w, h, { stroke: "var(--rings-light)", opacity: 0.05, count: 8 })}
    <div class="between"><span style="width:26px;height:26px;border-radius:8px;background:var(--on-card-fill);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px">${name[0] ?? "?"}</span><span class="dt-faint">${cycle}</span></div>
    <div><div style="font-size:16px;font-weight:800">${name || "Name"}</div><div class="between" style="margin-top:6px"><span class="dt-muted">${amount ? `${inr(amount)} / ${L.cycleWord(cycle)}` : "₹— / month"}</span></div>
    <div style="height:5px;border-radius:999px;background:var(--on-card-fill);margin-top:6px"></div><div class="between" style="margin-top:9px"><span class="dt-pill">Renews ${fmt(next)}</span><span class="dt-faint">${L.viaName(s.via)}</span></div></div></div>`;
}
const pvBox = (rows) => `<div class="pv-box">${rows.map(([k, v]) => `<div class="between"><span>${k}</span><span>${v}</span></div>`).join("")}</div>`;

function dialog({ icon = I.subs(18), title, sub, preview, fields, note, actions, w = 1100, extra = "" }) {
  return `<div class="dlg" style="width:${w}px">
    <div class="dlg-h"><span class="dlg-ic">${icon}</span><div><h3>${title}</h3><p>${sub}</p></div><span class="dlg-x">${I.x()}</span></div>
    ${extra}
    <div class="dlg-b"><div class="preview">${rings(320, 520, { dx: 20, dy: 40, first: 40, step: 26, opacity: 0.1 })}${preview}</div><div class="fields">${fields}</div></div>
    <div class="dlg-f"><span class="note">${note}</span>${actions}</div></div>`;
}
const stage = (inner, h) => `<div class="stage" style="padding:52px 0;display:flex;align-items:center;justify-content:center"><div class="scrim" style="background:linear-gradient(oklch(0.16 0.008 260 / 0.32),oklch(0.16 0.008 260 / 0.38))"></div><div style="position:relative">${inner}</div></div>`;
const NET = L.sub("netflix");

// ---------- Add subscription ----------
function addFields({ errors = false, catOpen = false } = {}) {
  return [
    fld(`${lbl("Name", { req: true })}${errors ? inp("", { cls: "err", ph: true }) + help("Enter the subscription's name", "err") : inp("Netflix Premium")}`, true),
    fld(`${lbl("Short name", { opt: true })}${inp(errors ? "" : "Netflix", { ph: errors })}${help("Shown on tiles and lists. Blank uses the name.")}`),
    fld(`${lbl("Category", { req: true })}${select({ value: catOpen ? "Streaming" : "Streaming", kind: "field", open: catOpen, options: catOptions("Streaming") })}${catOpen ? "" : help("Picks the colour it's shown in.")}`),
    fld(`${lbl("Price", { req: true })}${errors ? inp("", { pre: "₹", cls: "err" }) + help("Enter what it costs each time it renews", "err") : inp("649", { pre: "₹" })}`),
    fld(`${lbl("Billed", { req: true })}${fseg(["Monthly", "Quarterly", "Yearly"], "Monthly")}`),
    fld(`${lbl("Next renewal", { req: true })}${dateInp("Oct 23, 2026")}${help("Any renewal date works. The app counts forward from it.")}`),
    fld(`${lbl("Started on", { req: true })}${errors ? dateInp("Nov 23, 2026", "err") + help("It can't start after its next renewal", "err") : dateInp("Feb 23, 2024")}${errors ? "" : help("No renewals are expected before this.")}`),
    fld(`${lbl("Usually charged to", { opt: true, isNew: true })}<div style="display:grid;grid-template-columns:240px 1fr;gap:10px">${fseg(["Credit card", "Bank account"], "Credit card")}${select({ value: `<span class="minitile" style="display:inline-block;vertical-align:-2px;margin-right:8px;background:linear-gradient(155deg,var(--card-teal-from),var(--card-teal-to))"></span>Millennia`, kind: "field", options: cardOptions("mil") })}</div>${help("Mark paid uses this. A charge on a card is part of that card's statement, so it isn't counted again.")}`, true),
  ].join("");
}
function addPreview({ errors = false } = {}) {
  const after = L.MONTHLY + 649;
  return `<span class="pv-k">Live preview</span>${previewTile(NET, errors ? { amount: 0, name: "" } : {})}
    ${pvBox([["A month", errors ? "—" : inr(649)], ["A year", errors ? "—" : inr(7788)], ["Next renewals", errors ? "—" : "Oct 23 · Nov 23 · Dec 23"]])}
    ${pvBox([["You pay a month now", inr(L.MONTHLY)], ["With this one", `<b style="color:var(--accent-text)">${errors ? "—" : inr(after)}</b>`]])}
    <span class="card-note" style="color:oklch(0.38 0.06 152)">A yearly or quarterly price is spread over its months for these totals.</span>`;
}
function addDialog(opts = {}) {
  return dialog({ title: "Add subscription", sub: "Fill it in and see what it adds to your month", preview: addPreview(opts), fields: addFields(opts), note: "Saves to the Subscriptions tab", actions: `${btn("Cancel", { kind: "soft" })}${btn("Add subscription", { kind: "primary" })}`, extra: opts.errors ? `<div class="notice" role="alert" style="margin:16px 28px 0;background:var(--negative-tint);color:var(--negative)">${I.alert(15)}<span class="grow" style="color:var(--negative)">Three fields need fixing before this can be saved.</span></div>` : "" });
}

// ---------- Edit subscription ----------
function editDialog() {
  const fields = [
    fld(`${lbl("Name", { req: true })}${inp("Netflix Premium")}`, true),
    fld(`${lbl("Short name", { opt: true })}${inp("Netflix")}`),
    fld(`${lbl("Category", { req: true })}${select({ value: "Streaming", kind: "field", options: catOptions("Streaming") })}`),
    fld(`${lbl("Price", { req: true })}${inp("649", { pre: "₹", cls: "focus" })}${help("Was ₹499. The new price counts from the next renewal; past payments keep what they cost.", "warn")}`),
    fld(`${lbl("Billed", { req: true })}${fseg(["Monthly", "Quarterly", "Yearly"], "Monthly")}`),
    fld(`${lbl("Next renewal", { req: true })}${dateInp("Oct 23, 2026")}`),
    fld(`${lbl("Started on", { req: true })}${dateInp("Feb 23, 2024")}`),
    fld(`${lbl("Usually charged to", { opt: true, isNew: true })}<div style="display:grid;grid-template-columns:240px 1fr;gap:10px">${fseg(["Credit card", "Bank account"], "Credit card")}${select({ value: `<span class="minitile" style="display:inline-block;vertical-align:-2px;margin-right:8px;background:linear-gradient(155deg,var(--card-teal-from),var(--card-teal-to))"></span>Millennia`, kind: "field", options: cardOptions("mil") })}</div>`, true),
    fld(`${lbl("Status", { req: true })}${fseg(["Active", "Paused", "Cancelled"], "Active")}${help("Paused and cancelled ones are left out of your totals. Cancelled is new: the Sheet's status list needs it.")}`, true),
  ].join("");
  const preview = `<span class="pv-k">Live preview</span>${previewTile(NET)}${pvBox([["A month", `${inr(499)} → <b style="color:var(--accent-text)">${inr(649)}</b>`], ["Next renewal", "Oct 23 at ₹649"], ["Paid so far", `${inr(L.paidSoFar(NET))} · 32`]])}${pvBox([["You pay a month", `${inr(L.MONTHLY - 150)} → <b style="color:var(--accent-text)">${inr(L.MONTHLY)}</b>`]])}`;
  return dialog({ icon: I.edit(17), title: "Edit Netflix", sub: "Netflix Premium · since Feb 23, 2024", preview, fields, note: `<span class="link" style="color:var(--negative);font-size:12px">Delete subscription</span> <span class="muted" style="margin-left:8px">Removes it and its 32 payments. To keep the history, cancel it instead.</span>`, actions: `${btn("Cancel", { kind: "soft" })}${btn("Save changes", { kind: "primary" })}` });
}

// ---------- Record payment ----------
function payDialog({ s = NET, amount = s.amount, date = "2026-10-23", mismatch = false } = {}) {
  const subOpts = L.byNext.map((x) => ({ label: `${mono(x, 18).replace('class="mono"', 'class="mono" style="margin-right:10px;vertical-align:-4px"')}${x.alias}`, meta: `${inr(x.amount)} · ${fmt(L.nextRenewal(x))}`, on: x.id === s.id }));
  const diff = amount - s.amount;
  const fields = [
    fld(`${lbl("Subscription", { req: true })}${select({ value: `${s.alias}`, kind: "field", options: subOpts })}${help(mismatch ? `Billed monthly at ${inr(s.amount)}. Charged to ${L.viaName(s.via)}.` : `Opened from its row, so it's already picked.`)}`, true),
    fld(`${lbl("Paid on", { req: true })}${dateInp(fmtY(date))}${help("Starts on the renewal date.")}`),
    fld(`${lbl("Amount", { req: true })}${inp(String(amount), { pre: "₹", cls: mismatch ? "focus" : "" })}${mismatch ? help(`${inr(diff)} more than the plan's ${inr(s.amount)}.`, "warn") : help("Starts at the plan's price.")}`),
    fld(`${lbl("Charged to", { opt: true })}<div style="display:grid;grid-template-columns:240px 1fr;gap:10px">${fseg(["Credit card", "Bank account"], "Credit card")}${select({ value: `<span class="minitile" style="display:inline-block;vertical-align:-2px;margin-right:8px;background:linear-gradient(155deg,var(--card-${L.CARDS[s.via.card].color}-from),var(--card-${L.CARDS[s.via.card].color}-to))"></span>${L.viaName(s.via)}`, kind: "field", options: cardOptions(s.via.card) })}</div>${help("Starts with its usual card.")}`, true),
    mismatch ? fld(`<div class="checkrow"><span class="box">${I.check(11)}</span><span><b>Update ${s.alias}'s price to ${inr(amount)} from now on.</b><br>Its next renewals are expected at ${inr(amount)}, and your monthly total goes from ${inr(L.MONTHLY)} to ${inr(L.MONTHLY + diff)}. Leave it unticked for a one-off charge.</span></div>`, true) : "",
  ].join("");
  const paid = L.paidSoFar(s);
  const preview = `<span class="pv-k">Live preview</span>
    ${pvBox([["Renewal", `${fmtDow(date)}`], ["Plan's price", inr(s.amount)], ["This payment", `<b style="color:${mismatch ? "var(--negative)" : "var(--accent-text)"}">${inr(amount)}</b>`], ["", mismatch ? `<span class="chg chg-up">${I.up(10)}${inr(diff)} over the plan</span>` : `<span style="color:var(--accent-text)">${I.check(10)} Matches the plan</span>`]])}
    <span class="pv-k" style="margin-top:4px">After this payment</span>
    ${pvBox([["Next renewal", fmt(L.addMonthsUTC(date, 1))], ["Paid so far", `${inr(paid)} → <b>${inr(paid + amount)}</b>`], ["Payments", `${L.paymentsFor(s).length} → ${L.paymentsFor(s).length + 1}`]])}
    ${mismatch ? `<div style="background:oklch(1 0 0 / 0.72);border-radius:14px;padding:10px 12px">${P.priceStep({ ...s, prices: [[s.startDate, s.amount], [date, amount]], skip: [] }, { w: 260, h: 90, pad: 14 })}</div>` : ""}`;
  return dialog({ icon: I.check(17), title: "Record a payment", sub: `${s.alias} · the renewal on ${fmtY(date)}`, preview, fields, note: "Saves to the SubscriptionPayments tab", actions: `${btn("Cancel", { kind: "soft" })}${btn("Save payment", { kind: "primary" })}` });
}

// ---------- Pause / Cancel ----------
function smallDialog({ icon, tint = "var(--fill)", color = "var(--fg)", title, body, fields = "", actions }) {
  return `<div class="dlg" style="width:460px"><div class="dlg-h" style="padding-bottom:4px"><span class="dlg-ic" style="background:${tint};color:${color}">${icon}</span><div><h3>${title}</h3><p style="line-height:1.55">${body}</p></div></div>${fields ? `<div style="padding:12px 28px 4px 82px" class="fields">${fields}</div>` : ""}<div class="dlg-f" style="border-top:0;justify-content:flex-end">${actions}</div></div>`;
}
function confirmRow() {
  const hs = L.sub("headspace"), sl = L.sub("sonyliv");
  return `<div class="stage" style="padding:56px 0;display:flex;align-items:center;justify-content:center;gap:28px"><div class="scrim"></div>
    <div style="position:relative">${smallDialog({ icon: I.pause(16), title: `Pause ${hs.alias}?`, body: `It's left out of your totals, and no renewals are expected until you resume it. Its ${L.paymentsFor(hs).length} payments stay.`, actions: `${btn("Keep it active", { kind: "soft" })}${btn("Pause", { kind: "primary", icon: I.pause(11) })}` })}</div>
    <div style="position:relative">${smallDialog({ icon: I.stop(16), tint: "var(--negative-tint)", color: "var(--negative)", title: `Cancel ${sl.alias}?`, body: `It won't renew on Nov 3. It moves to Cancelled with its ${L.paymentsFor(sl).length} payments, so your history stays complete.`, fields: fld(`${lbl("Cancelled on", { req: true, isNew: true })}${dateInp("Sep 14, 2026")}`, true), actions: `${btn("Keep it", { kind: "soft" })}${btn("Cancel subscription", { kind: "danger" })}` })}</div></div>`;
}

// ---------- Phone sheets ----------
function sheet({ title, strip, fields, cta }) {
  return L.phone({ h: 844, body: `<div style="margin:-18px -16px -28px;flex:1;display:flex;flex-direction:column;background:var(--surface);position:relative">
    <div class="between" style="padding:10px 12px;border-bottom:1px solid var(--divider)"><span class="ph-menu">${I.x(18)}</span><b style="font-size:16px">${title}</b><span style="width:44px"></span></div>
    <div class="textured" style="background:var(--feature-tile);padding:14px 16px;display:flex;gap:12px;align-items:center;border-bottom:1px solid var(--feature-tile-line)">${rings(390, 120, { opacity: 0.1 })}${strip}</div>
    <div class="fields" style="padding:16px;grid-template-columns:1fr 1fr;gap:14px 12px">${fields}</div>
    <div style="position:absolute;left:0;right:0;bottom:0;padding:12px 16px 26px;background:linear-gradient(transparent,var(--surface) 30%)">${btn(cta, { kind: "primary", cls: "grow" }).replace('class="btn btn-primary grow"', 'class="btn btn-primary grow" style="width:100%;justify-content:center"')}</div></div>` }).replace(/<header class="ph-bar">[\s\S]*?<\/header>/, "");
}
function phones() {
  const addStrip = `${previewTile(NET, { w: 150, h: 96 }).replace(/<div class="between" style="margin-top:9px">[\s\S]*?<\/div><\/div><\/div>$/, "</div></div>")}<div style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:oklch(0.38 0.06 152)"><span>A month <b style="color:var(--fg)">${inr(649)}</b></span><span>A year <b style="color:var(--fg)">${inr(7788)}</b></span><span>Your total <b style="color:var(--accent-text)">${inr(L.MONTHLY + 649)}</b></span></div>`;
  const addF = [
    fld(`${lbl("Name", { req: true })}${inp("Netflix Premium")}`, true),
    fld(`${lbl("Category", { req: true })}${select({ value: "Streaming", kind: "field", options: [] })}`, true),
    fld(`${lbl("Price", { req: true })}${inp("649", { pre: "₹" })}`),
    fld(`${lbl("Next renewal", { req: true })}${dateInp("Oct 23")}`),
    fld(`${lbl("Billed", { req: true })}${fseg(["Monthly", "Quarterly", "Yearly"], "Monthly")}`, true),
    fld(`${lbl("Started on", { req: true })}${dateInp("Feb 23, 2024")}`, true),
    fld(`${lbl("Usually charged to", { opt: true })}${fseg(["Credit card", "Bank account"], "Credit card")}`, true),
  ].join("");
  const payStrip = `${mono(NET, 40)}<div style="display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:600;color:oklch(0.38 0.06 152)"><b style="color:var(--fg);font-size:14px">Netflix · Oct 23 renewal</b><span>Plan ${inr(649)} · <span style="color:var(--accent-text)">${I.check(10)} matches</span></span><span>Next renewal after this: Nov 23</span></div>`;
  const payF = [
    fld(`${lbl("Subscription", { req: true })}${select({ value: "Netflix", kind: "field", options: [] })}`, true),
    fld(`${lbl("Paid on", { req: true })}${dateInp("Oct 23, 2026")}`),
    fld(`${lbl("Amount", { req: true })}${inp("649", { pre: "₹" })}`),
    fld(`${lbl("Charged to", { opt: true })}${fseg(["Credit card", "Bank account"], "Credit card")}`, true),
    fld(`${select({ value: `<span class="minitile" style="display:inline-block;vertical-align:-2px;margin-right:8px;background:linear-gradient(155deg,var(--card-teal-from),var(--card-teal-to))"></span>Millennia`, kind: "field", options: [] })}`, true),
  ].join("");
  return `<div style="display:flex;gap:16px">${frame("Phone · add subscription", sheet({ title: "Add subscription", strip: addStrip, fields: addF, cta: "Add subscription" }))}${frame("Phone · record a payment", sheet({ title: "Record a payment", strip: payStrip, fields: payF, cta: "Save payment" }))}${frame("Phone · category, the app's own menu", L.phone({ h: 844, body: `<div style="margin:-18px -16px -28px;flex:1;position:relative;background:oklch(0.16 0.008 260 / 0.3)"><div style="position:absolute;left:0;right:0;bottom:0;background:var(--surface);border-radius:26px 26px 0 0;padding:10px 12px 28px;display:flex;flex-direction:column;gap:2px"><span style="width:40px;height:5px;border-radius:9px;background:var(--fill-strong);align-self:center;margin-bottom:8px"></span><span class="lb-group">Category</span>${catOptions("Streaming").map((o) => `<div class="opt" style="min-height:48px" ${o.on ? 'aria-selected="true"' : ""}><span class="opt-label">${o.label}</span><span class="opt-check">${I.check(12)}</span></div>`).join("")}</div></div>` }).replace(/<header class="ph-bar">[\s\S]*?<\/header>/, ""))}</div>`;
}

export function formsBoard() {
  const W = 1300;
  return `<div class="chai-app board" style="width:${W}px;height:__H__">
    <div class="board-h"><div class="row" style="gap:12px"><h2>Subscriptions forms</h2>${L.sampleTag(". Today is Oct 20, 2026")}</div><p>The same for every direction. They follow the Cards forms: a dialog with a live preview on the left, a full-screen sheet on phone, plain-word errors under each field, and the app's own dropdowns. Fields marked <span class="tag-new">New field</span> need a new Sheet column.</p></div>
    ${section(1, "Add subscription", "Filled in. The preview shows the tile, what it costs a month and a year, the next three renewals, and your new monthly total. Category picks its colour, so there's no colour field. Status isn't asked: a new subscription is active.", stage(addDialog(), 760))}
    ${section(2, "Add subscription · errors, and the category menu", "Errors show on blur and on submit. Category is a fixed list in the app's own menu, which needs the Sheet's category dropdown to hold the same names (see the decisions board).", stage(addDialog({ errors: true, catOpen: true }), 840))}
    ${section(3, "Edit subscription", "The same fields plus Status. A new price counts from the next renewal, and past payments keep what they cost, so the price history stays true. Delete is offered, but cancelling keeps the history.", stage(editDialog(), 800))}
    ${section(4, "Record a payment", "From Mark paid with one change, or from the header button for any subscription. It starts at the renewal date, the plan's price and the usual card.", stage(payDialog(), 700))}
    ${section(5, "Record a payment · the price changed", "Catching up on iCloud+'s Sep 24 renewal, which cost more than its plan. When the amount differs from the plan, it offers to update the plan, ticked by default. That's how price changes get caught without editing the subscription.", stage(payDialog({ s: L.sub("icloud"), amount: 249, date: "2026-09-24", mismatch: true }), 780))}
    ${section(6, "Pause and cancel", "Both confirm first. Cancel asks for the date, because it's often cancelled before the paid time runs out.", confirmRow())}
    ${section(7, "Phone", "Full-screen sheets with the button pinned. Pairs stay two-up. The menus open as a bottom sheet.", phones())}
  </div>`;
}
