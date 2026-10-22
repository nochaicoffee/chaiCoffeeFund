// The forms, shared by every direction: Add / Edit account, Update balance (one), Update balances (the check-in),
// Close account, editing one balance, and the phone sheets. Same shell as the Cards and Subscriptions forms
// (docs/design/cards-forms.md): a dialog with a live preview on the left, a full-screen sheet on phone.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { board, section, frame, grid } from "./board.mjs";
const { inr, signed, inrS, fmt, fmtY, I, btn, iconBtn, rings, grad, mono, select } = L;

const lbl = (t, { req = false, opt = false, isNew = false } = {}) => `<span class="lbl">${t}${req ? '<span class="req">*</span>' : ""}${opt ? '<span class="opt-tag">Optional</span>' : ""}${isNew ? ' <span class="tag-new">New field</span>' : ""}</span>`;
const inp = (v, { pre = "", suf = "", cls = "", ph = false, icon = "", caret = false } = {}) => `<span class="inp ${cls}">${pre ? `<span class="pre">${pre}</span>` : ""}<span class="grow${ph ? " ph-text" : ""}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v}${caret ? `<span style="display:inline-block;width:1.5px;height:16px;background:var(--fg);vertical-align:-3px;margin-left:1px"></span>` : ""}</span>${suf ? `<span class="suf">${suf}</span>` : ""}${icon}</span>`;
const help = (t, kind = "") => `<span class="help ${kind}">${kind === "err" || kind === "warn" ? I.alert(12) : I.info(12)}<span>${t}</span></span>`;
const fld = (inner, full = false) => `<div class="fld${full ? " full" : ""}">${inner}</div>`;
const fseg = (items, on) => `<div class="fseg">${items.map((x) => `<span${x === on ? ' class="on"' : ""}>${x}</span>`).join("")}</div>`;
const dateInp = (v, cls = "") => inp(v, { cls, icon: `<span class="muted" style="display:flex">${I.cal(14)}</span>` });
const BANKS = ["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Mahindra Bank", "YES Bank", "IDFC FIRST Bank", "IndusInd Bank", "AU Small Finance Bank", "Federal Bank", "Bandhan Bank", "Other"];
const bankOptions = (on) => BANKS.map((b) => ({ label: b, on: b === on }));
const accChip = (a) => `<span class="minitile" style="display:inline-block;vertical-align:-2px;margin-right:9px;background:${grad(a.color)}"></span>${a.name}`;
const accOptions = (on) => P.ORDER.filter((a) => L.isOn(a)).map((a) => ({ label: accChip(a), meta: `${inr(L.latest(a.id).balance)} · ${fmt(L.latest(a.id).date)}`, on: a.id === on }));
const purposeCards = (on) => `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">${L.PURPOSES.map((p) => { const sel = p === on; const sub = { Spending: "Day to day", Investment: "Waiting to invest", "Emergency-Fund": "Not to touch", "Loan-Payments": "EMIs go out" }[p]; return `<span style="display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:12px;border:1.5px solid ${sel ? "var(--accent)" : "var(--surface-line)"};background:${sel ? "var(--accent-tint)" : "var(--surface)"};${sel ? "box-shadow:0 0 0 3px var(--accent-ring)" : ""}"><span class="row" style="gap:6px;font-size:13px;font-weight:800;color:${sel ? "var(--accent-text)" : "var(--fg)"}">${L.purposeIcon(p, 13)}${L.purposeName(p)}</span><span style="font-size:11px;font-weight:600;color:var(--muted)">${sub}</span></span>`; }).join("")}</div>`;
const swatches = (on) => `<div class="row" style="gap:10px">${L.COLORS.map((c) => `<span title="${L.colorName(c)}" style="width:34px;height:34px;border-radius:11px;background:${grad(c)};box-shadow:${c === on ? "0 0 0 2.5px var(--surface), 0 0 0 5px var(--accent)" : "inset 0 1px 0 oklch(1 0 0 / 0.2)"};display:flex;align-items:center;justify-content:center;color:white">${c === on ? I.check(13) : ""}</span>`).join("")}<span class="card-note" style="margin-left:4px">${L.colorName(on)}</span></div>`;
const pvBox = (rows) => `<div class="pv-box">${rows.map(([k, v]) => `<div class="between"><span>${k}</span><span>${v}</span></div>`).join("")}</div>`;

function dialog({ icon = I.accounts(18), title, sub, preview, fields, note, actions, w = 1100, extra = "", left = "" }) {
  return `<div class="dlg" style="width:${w}px">
    <div class="dlg-h"><span class="dlg-ic">${icon}</span><div><h3>${title}</h3><p>${sub}</p></div><span class="dlg-x">${I.x()}</span></div>
    ${extra}
    <div class="dlg-b"${preview ? "" : ' style="grid-template-columns:1fr"'}>${preview ? `<div class="preview">${rings(320, 520, { dx: 20, dy: 40, first: 40, step: 26, opacity: 0.1 })}${preview}</div>` : ""}<div class="fields">${fields}</div></div>
    <div class="dlg-f">${left}<span class="note">${note}</span>${actions}</div></div>`;
}
const stage = (inner) => `<div class="stage" style="padding:52px 0;display:flex;align-items:center;justify-content:center"><div class="scrim" style="background:linear-gradient(oklch(0.16 0.008 260 / 0.32),oklch(0.16 0.008 260 / 0.38))"></div><div style="position:relative">${inner}</div></div>`;
const alertBar = (t, kind = "err") => `<div class="notice" role="alert" style="margin:16px 28px 0;${kind === "err" ? "background:var(--negative-tint);color:var(--negative)" : ""}">${I.alert(15)}<span class="grow"${kind === "err" ? ' style="color:var(--negative)"' : ""}>${t}</span></div>`;
const previewTile = (f, opts = {}) => P.tile({ ...f, ...opts }, { w: 284, h: 186 });

// ---------- Add account ----------
const NEW = { all: false, id: "new", name: "IDFC Travel", short: "IDFC Travel", bank: "IDFC FIRST Bank", color: "sapphire", purpose: "Spending", type: "Savings", on: true, stale: false, balance: 38200, asOf: L.TODAY, chg: null, sinceJan: null };
function addFields({ errors = false, bankOpen = false } = {}) {
  return [
    fld(`${lbl("Name", { req: true })}${errors ? inp("", { cls: "err", ph: true }) + help("Give the account a name, like HDFC Salary", "err") : inp("IDFC Travel")}${errors ? "" : help("Shown on covers, tiles and lists.")}`),
    fld(`${lbl("Bank", { req: true })}${select({ value: "IDFC FIRST Bank", kind: "field", open: bankOpen, options: bankOptions("IDFC FIRST Bank") })}`),
    fld(`${lbl("Type", { req: true })}${fseg(["Savings", "Current"], "Savings")}`),
    fld(`${lbl("Opened on", { req: true })}${errors ? dateInp("Nov 3, 2026", "err") + help("It can't open after today", "err") : dateInp("Mar 12, 2024") + help("When you opened it. Balances can't come before it.")}`),
    fld(`${lbl("Purpose", { req: true })}${purposeCards("Spending")}${help("Groups it on the page. Every account counts in your total, whatever its purpose.")}`, true),
    fld(`${lbl("Colour", { isNew: true })}${swatches("sapphire")}${help("Its cover, tile and chart colour. Blank uses its purpose's colour.")}`, true),
    fld(`${lbl("Balance today", { opt: true })}${errors ? inp("38,2OO", { pre: "₹", cls: "err" }) + help("Enter a number, like 38,200", "err") : inp("38,200", { pre: "₹" })}${errors ? "" : help("Saved as its first balance. Leave it blank to add one later.")}`),
    fld(`${lbl("As of")}${dateInp("Today, Oct 21")}`),
  ].join("");
}
function addPreview({ errors = false } = {}) {
  return `<span class="pv-k">Live preview</span>${previewTile(NEW, errors ? { name: "Name", balance: null, asOf: null } : {})}
    ${pvBox([["Purpose", "Spending"], ["First balance", errors ? "—" : `${inr(38200)} · Oct 21`], ["Next update due", errors ? "—" : "By Nov 20"]])}
    ${pvBox([["Your accounts hold now", inr(L.TOTAL)], ["With this one", `<b style="color:var(--accent-text)">${errors ? "—" : inr(L.TOTAL + 38200)}</b>`]])}`;
}
const addDialog = (o = {}) => dialog({ title: "Add account", sub: "Fill it in and see it join your total", preview: addPreview(o), fields: addFields(o), note: "Saves to the Accounts tab, and its first balance to BalanceSnapshots", actions: `${btn("Cancel", { kind: "soft" })}${btn("Add account", { kind: "primary" })}`, extra: o.errors ? alertBar("Three fields need fixing before this can be saved.") : "" });

// ---------- Edit account ----------
function editDialog() {
  const h = P.FACTS.hdfc;
  const fields = [
    fld(`${lbl("Name", { req: true })}${inp("HDFC Salary")}`),
    fld(`${lbl("Bank", { req: true })}${select({ value: "HDFC Bank", kind: "field", options: bankOptions("HDFC Bank") })}`),
    fld(`${lbl("Type", { req: true })}${fseg(["Savings", "Current"], "Savings")}`),
    fld(`${lbl("Opened on", { req: true })}${dateInp("Jul 1, 2019")}${help("Its first balance is Nov 30, 2024, so any date up to then works.")}`),
    fld(`${lbl("Purpose", { req: true })}${purposeCards("Spending")}`, true),
    fld(`${lbl("Colour", { isNew: true })}${swatches("sapphire")}`, true),
  ].join("");
  const preview = `<span class="pv-k">Live preview</span>${previewTile(h)}${pvBox([["Balances recorded", `${h.snaps} since Nov 2024`], ["Latest", `${inr(h.balance)} · ${fmt(h.asOf)}`], ["Pays", "Millennia and Coral bills"]])}<span class="card-note" style="color:oklch(0.38 0.06 152)">Balances aren't edited here. Change one from its row in Balance history.</span>`;
  return dialog({ title: "Edit account", sub: "HDFC Salary", preview, fields, note: "", left: `<span class="btn btn-sm btn-danger" style="margin-right:auto">${I.lock(11)} Close account</span>`, actions: `${btn("Cancel", { kind: "soft" })}${btn("Save changes", { kind: "primary" })}` });
}

// ---------- Update balance (one account) ----------
const SBI = P.FACTS.sbi, HDFC = P.FACTS.hdfc;
function datePop() {
  const days = []; const first = "2026-10-01"; const lead = new Date(`${first}T00:00:00Z`).getUTCDay();
  for (let i = 0; i < lead; i++) days.push("");
  for (let d = 1; d <= 31; d++) days.push(d);
  while (days.length < 42) days.push("");
  const cell = (d) => { const on = d === 21, future = d > 21, aug = false; void aug; return `<span style="height:32px;display:flex;align-items:center;justify-content:center;border-radius:10px;font-size:12.5px;font-weight:${on ? 800 : 600};${on ? "background:var(--accent);color:var(--on-accent)" : future ? "color:var(--muted);opacity:0.45" : ""}">${d}</span>`; };
  return `<div class="pop" style="position:absolute;top:calc(100% + 8px);left:0;width:300px;padding:12px;z-index:30"><div class="between" style="padding:2px 4px 10px"><b style="font-size:13px">October 2026</b><span class="row" style="gap:4px">${iconBtn(I.chevL(12), "Previous month", "btn-sm")}${iconBtn(I.chevR(12), "Next month", "btn-sm")}</span></div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;font-size:10.5px;font-weight:800;color:var(--muted);text-align:center;margin-bottom:4px">${["S", "M", "T", "W", "T", "F", "S"].map((x) => `<span>${x}</span>`).join("")}</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">${days.map(cell).join("")}</div><div class="row" style="gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid var(--divider);flex-wrap:wrap"><span class="chip" style="background:var(--accent-tint);color:var(--accent-text)">Today</span><span class="chip">Yesterday</span><span class="chip">End of September</span></div></div>`;
}
function updateDialog({ warn = false, same = false, dateOpen = false } = {}) {
  const f = same ? HDFC : SBI;
  const typed = same ? 206100 : warn ? 538000 : 661400;
  const d = typed - f.balance, date = same ? "Oct 20, 2026" : "Today, Oct 21";
  const fields = [
    fld(`${lbl("Account", { req: true })}${select({ value: accChip(f.a), kind: "field", options: accOptions(f.id) })}`, true),
    fld(`${lbl("Balance on", { req: true })}<div style="position:relative">${dateInp(date, dateOpen ? "focus" : "")}${dateOpen ? datePop() : ""}</div>${dateOpen ? "" : help("The day the bank showed it. It can't be after today.")}`),
    fld(`${lbl("Balance", { req: true })}${inp(typed.toLocaleString("en-IN"), { pre: "₹", cls: warn || same ? "" : "focus", caret: !warn && !same })}${warn ? help(`That's <b>${inr(-d)} less</b> than on ${fmt(f.asOf)}. Check the number, then save anyway if it's right.`, "warn") : same ? help(`${f.name} already has a balance for Oct 20 (${inr(f.balance)}). Saving <b>replaces</b> it with ${inr(typed)}, so there's one a day.`, "warn") : help("Type what the bank shows. The app works out the change.")}`),
  ].join("");
  const preview = `<span class="pv-k">Live preview</span>${previewTile(f, { balance: typed, asOf: same ? f.asOf : L.TODAY, stale: false, chg: same ? typed - f.prev.balance : d })}${pvBox(same ? [["Replaces", `${inr(f.balance)} on Oct 20`], ["Change since Sep 30", `<b style="color:var(--positive)">${signed(typed - f.prev.balance)}</b>`], ["Out since Sep 30", `${inr(f.interval.out)} · 2 card bills`]] : [["Change", `<b style="color:${d >= 0 ? "var(--positive)" : "var(--negative)"}">${signed(d)}</b>`], ["Since", `${fmtY(f.asOf)} · ${L.daysBetween(f.asOf, L.TODAY)} days`], ["Out since then", `${inr(0)} recorded`]])}${pvBox([["Your total now", inr(L.TOTAL)], ["After this", `<b style="color:var(--accent-text)">${inr(L.TOTAL + d)}</b>`]])}`;
  return dialog({ icon: I.check(18), title: "Update balance", sub: same ? "One balance per account per day" : f.stale ? `${f.name} · last updated ${fmt(f.asOf)}, 73 days ago` : f.name, preview, fields: `${fields}`, w: 960, note: "Adds a row to BalanceSnapshots", actions: `${btn("Cancel", { kind: "soft" })}${btn(warn ? "Save anyway" : same ? "Replace balance" : "Save balance", { kind: "primary" })}` });
}

// ---------- Update balances (the check-in) ----------
function checkInDialog() {
  const typed = { sbi: 661400, kotak: 54200, axis: 21350 };
  const rows = P.ORDER.filter((a) => L.isOn(a)).sort((x, y) => L.isStale(y) - L.isStale(x)).map((a) => {
    const f = P.FACTS[a.id], v = typed[a.id], focus = a.id === "icici";
    const d = v ? v - f.balance : null;
    return `<div class="arow" style="grid-template-columns:1.3fr 0.9fr 170px 110px;padding:10px 0"><span class="cell-name">${mono(a, 30)}<span style="min-width:0"><b>${a.name}</b><small>${a.bank}</small></span></span><span style="font-size:12px;font-weight:600;color:${f.stale ? "var(--warning-text)" : "var(--muted)"}">${f.stale ? I.clock(10) + " " : ""}${inr(f.balance)} on ${fmt(f.asOf)}</span><span class="qinp${focus ? " focus" : v ? "" : " ghost"}"><span class="pre">₹</span>${v ? v.toLocaleString("en-IN") : focus ? `<span style="width:1.5px;height:16px;background:var(--fg)"></span>` : `<span style="font-weight:500">Same as before?</span>`}</span><span style="text-align:right">${d == null ? `<span class="card-note">${focus ? "" : "Skipped"}</span>` : L.chg(d)}</span></div>`;
  }).join("");
  const after = L.TOTAL + Object.entries(typed).reduce((t, [id, v]) => t + v - L.latest(id).balance, 0);
  const preview = `<span class="pv-k">Your total</span><div class="pv-box" style="gap:4px"><span class="muted" style="font-size:12px;font-weight:700">Now</span><b style="font-size:20px">${inr(L.TOTAL)}</b><span class="muted" style="font-size:12px;font-weight:700;margin-top:6px">After these 3</span><b style="font-size:26px;color:var(--accent-text)">${inr(after)}</b><span class="chg chg-up" style="font-size:12px">${I.up(10)}${inr(after - L.TOTAL)}</span></div>${pvBox([["Typed", "3 of 5"], ["Skipped", "2 keep their balances"], ["Still stale after", "None"]])}<span class="card-note" style="color:oklch(0.38 0.06 152)">The stale one comes first. Tab moves down the list; Enter on the last saves.</span>`;
  const fields = fld(`<div class="between" style="margin-bottom:4px">${lbl("Balances on", { req: true })}${select({ value: "Today, Oct 21", kind: "small", icon: I.cal(12) })}</div><div style="border-top:1px solid var(--divider)">${rows}</div>`, true);
  return dialog({ icon: I.check(18), title: "Update balances", sub: "Your monthly check-in: every account at once", preview, fields, note: "Adds 3 rows to BalanceSnapshots", actions: `${btn("Cancel", { kind: "soft" })}${btn("Save 3 balances", { kind: "primary" })}` });
}

// ---------- Close account ----------
function closeDialog() {
  const f = P.FACTS.axis;
  const fields = [
    fld(`${lbl("Closed on", { req: true })}${dateInp("Today, Oct 21")}${help("It counts in your totals up to this day.")}`),
    fld(`${lbl("Final balance")}${inp("0", { pre: "₹", suf: "fixed" })}${help("A closed account holds nothing, so its last balance is ₹0.")}`),
    fld(`<div class="checkrow">${I.alert(16)}<span>Its latest balance is <b>${inr(f.balance)}</b> (${fmt(f.asOf)}). Closing takes that out of your total. If you moved it to another account, update that one too, or it won't show anywhere.</span></div>`, true),
    fld(`<div class="row" style="gap:10px;font-size:13px;font-weight:600"><span class="box">${I.check(11)}</span>Keep its balances and charts. It moves to Closed accounts, and Reopen brings it back.</div>`, true),
  ].join("");
  const preview = `<span class="pv-k">After closing</span>${previewTile(f, { on: false, closedOn: L.TODAY, balance: 0 })}${pvBox([["Total now", inr(L.TOTAL)], ["After closing", `<b>${inr(L.TOTAL - f.balance)}</b>`]])}${pvBox([["Its EMIs", "Car loan pays from it"], ["", '<span style="color:var(--warning-text)">Pick another account for it</span>']])}`;
  return dialog({ icon: I.lock(18), title: "Close Axis EMI", sub: "Mark it closed and keep its history", preview, fields, w: 960, note: "Sets it Inactive in the Accounts tab, and adds a ₹0 balance", actions: `${btn("Cancel", { kind: "soft" })}${btn("Close account", { kind: "danger" })}` });
}

// ---------- Editing one balance, from its row ----------
function editBalance() {
  const h = P.FACTS.hdfc;
  const row = (d, b, c, on = false) => `<div style="display:grid;grid-template-columns:1fr 1fr 1fr 28px;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;font-size:13px;${on ? "background:var(--fill)" : "border-bottom:1px solid var(--divider)"}"><span style="font-weight:600">${d}</span><b>${b}</b>${c}<span class="muted" style="display:flex;justify-content:flex-end">${I.edit(13)}</span></div>`;
  const pop = `<div class="pop" style="position:absolute;top:52px;left:120px;width:360px;padding:16px;display:flex;flex-direction:column;gap:12px;z-index:5"><div class="between"><b style="font-size:14px">Edit balance</b><span class="dlg-x" style="width:28px;height:28px">${I.x(12)}</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${fld(`${lbl("On")}${dateInp("Sep 30, 2026")}`)}${fld(`${lbl("Balance")}${inp("1,91,900", { pre: "₹", cls: "focus", caret: true })}`)}</div><div class="between"><span class="btn btn-sm btn-danger">${I.trash(12)} Delete</span><span class="row" style="gap:8px">${btn("Cancel", { kind: "soft", cls: "btn-sm" })}${btn("Save", { kind: "primary", cls: "btn-sm" })}</span></div></div>`;
  return `<div class="card glass" style="width:620px;position:relative;gap:6px"><span class="card-t">Balance history · HDFC Salary</span>${row("Oct 20", inr(204300), L.chg(12400))}${row("Sep 30", inr(191900), L.chg(7200), true)}${row("Aug 31", inr(184700), L.chg(-13800))}${row("Jul 31", inr(198500), L.chg(-14300))}${pop}<div style="height:90px"></div></div>`;
}

// ---------- Phone sheets ----------
const sheet = (title, body, primary) => `<div class="chai-app ph" style="width:390px;height:780px;position:relative"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><div class="between" style="padding:6px 16px 10px;border-bottom:1px solid var(--divider)"><span class="dlg-x" style="margin:0">${I.x()}</span><b style="font-size:16px">${title}</b><span style="width:34px"></span></div><div style="padding:16px;display:flex;flex-direction:column;gap:14px">${body}</div><div style="position:absolute;left:0;right:0;bottom:0;padding:12px 16px 30px;background:var(--surface);border-top:1px solid var(--divider)">${btn(primary, { kind: "primary", style: "width:100%;justify-content:center" })}</div></div>`;
function phoneUpdate() {
  const f = SBI;
  return sheet("Update balance", `${P.tile({ ...f, balance: 661400, asOf: L.TODAY, stale: false, chg: 3400 }, { w: 358, h: 168, ph: true })}${fld(`${lbl("Account", { req: true })}${select({ value: accChip(f.a), kind: "field" })}`)}${fld(`${lbl("Balance on", { req: true })}${dateInp("Today, Oct 21")}<div class="row" style="gap:6px;flex-wrap:wrap"><span class="chip" style="background:var(--accent-tint);color:var(--accent-text)">Today</span><span class="chip">Yesterday</span><span class="chip">End of September</span></div>`)}${fld(`${lbl("Balance", { req: true })}${inp("6,61,400", { pre: "₹", cls: "focus", caret: true })}${help(`${signed(3400)} since Aug 9 · total becomes ${inr(L.TOTAL + 3400)}`)}`)}`, "Save balance");
}
function phoneAdd() {
  return sheet("Add account", `${fld(`${lbl("Name", { req: true })}${inp("IDFC Travel")}`)}${fld(`${lbl("Bank", { req: true })}${select({ value: "IDFC FIRST Bank", kind: "field" })}`)}<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${fld(`${lbl("Type", { req: true })}${fseg(["Savings", "Current"], "Savings")}`)}${fld(`${lbl("Opened on", { req: true })}${dateInp("Mar 12, 2024")}`)}</div>${fld(`${lbl("Purpose", { req: true })}<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${purposeCards("Spending").replace('<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">', "").replace(/<\/div>$/, "")}</div>`)}${fld(`${lbl("Colour", { isNew: true })}${swatches("sapphire").replace(/width:34px;height:34px/g, "width:36px;height:36px")}`)}${fld(`${lbl("Balance today", { opt: true })}${inp("38,200", { pre: "₹" })}`)}`, "Add account");
}

export function formsBoard() {
  const s = [
    section(1, "Add account", "Filled in. The preview shows its tile and what it does to your total. Bank is the app's own list (the Sheet column stays text). <b>Colour</b> is the one new field; without it, colour comes from purpose (decision 4). A balance typed here is saved as its first one.", stage(addDialog())),
    section(2, "Add account · errors, and the bank menu", "Errors show on blur and on submit, in plain words under each field, as on the Cards forms.", stage(addDialog({ errors: true, bankOpen: true }))),
    section(3, "Edit account", "The same fields. Close account sits on the left of the footer, apart from Save. Balances are never edited here; each one is edited from its row (section 8).", stage(editDialog())),
    section(4, "Update balance", "From Update balance on a cover, tile, row or passbook, with that account already picked. The date is the app's own picker (#119) with Today, Yesterday and End of last month. The preview gives the change and the new total as you type.", stage(updateDialog({ dateOpen: true }))),
    section(5, "Update balance · a big drop, and a second balance on one day", "A drop of more than a fifth asks you to check it, without blocking the save (decision 8). A balance on a day that already has one replaces it, so each account has at most one balance a day (decision 7).", `<div style="display:flex;flex-direction:column;gap:24px">${stage(updateDialog({ warn: true }))}${stage(updateDialog({ same: true }))}</div>`),
    section(6, "Update balances: the monthly check-in", "Every active account at once, for one date. The stale one comes first. Blank rows are skipped, so it saves only what you typed; each typed row shows its change.", stage(checkInDialog())),
    section(7, "Close account", "Closing adds a ₹0 balance on the closing day and sets the account Inactive, shown as Closed. It warns when money is still in it, and when a loan or a card is set to pay from it.", stage(closeDialog())),
    section(8, "Editing one balance", "The pencil on a Balance history row opens this. Delete asks nothing; a toast offers Undo for 6 seconds, as on Cards.", `<div class="stage" style="padding:40px;display:flex;justify-content:center">${editBalance()}</div>`),
    section(9, "On a phone", "Full-screen sheets with the primary button pinned, as on Cards and Subscriptions. Inputs, segments and chips are 44px tall.", grid("390px 390px", [frame("Update balance", phoneUpdate()), frame("Add account", phoneAdd())], 40)),
  ];
  return board({ w: 1300, title: "Accounts forms", sub: "The same for every direction. They follow the Cards forms: a dialog with a live preview on the left, a full-screen sheet on phone, plain-word errors under each field, and the app's own dropdowns and date picker. Fields marked <span class=\"tag-new\">New field</span> need a new Sheet column.", body: s.join("") });
}

// For the account-object previews (z1.mjs).
export { lbl, inp, help, fld, fseg, dateInp, bankOptions, purposeCards, swatches, dialog };
