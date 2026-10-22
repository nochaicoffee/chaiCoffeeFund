// Round 15 (2026-10-22): the final page on a phone, its states and its forms. States: no accounts, one, many, stale, closed, added with
// no balance, just saved. Forms: full-screen sheets with the primary button pinned, and the account's card as the live preview.
// Every figure is made up; "today" is Oct 21, 2026.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as D5 from "./dirs5.mjs";
import * as Z from "./zsel.mjs";
import * as F from "./forms.mjs";
import * as W from "./wparts.mjs";
import * as S from "./r12.mjs";
import { board, frame, grid, section } from "./board.mjs";
import { heroCard, stageBg, CSSP } from "./r13.mjs";
import { ANIM } from "./widgets.mjs";
import { RT } from "./r11.mjs";
const { inr, inrS, signed, fmt, I, btn, select } = L;
const { FACTS, greenStage } = P;
const { statRow, whiteLine } = D5;
const { lbl, inp, help, fld, fseg, dateInp, bankOptions, purposeCards, swatches } = F;

const PCSS = `<style>
.h4-s.sel { opacity: 1; transform: translateY(-3px); box-shadow: 0 0 0 2px oklch(1 0 0 / 0.6), 0 10px 20px oklch(0 0 0 / 0.35); }
.h4-s.more { background: oklch(1 0 0 / 0.12); box-shadow: none; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; }
.stamp { position: absolute; top: 46px; right: -10px; transform: rotate(8deg); padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; background: oklch(0.82 0.13 85); color: oklch(0.3 0.07 70); border: 2px solid oklch(0.62 0.12 80); z-index: 2; box-shadow: 0 4px 10px oklch(0 0 0 / 0.25); }
.stamp.grey { background: oklch(0.86 0 0); color: oklch(0.3 0 0); border-color: oklch(0.6 0 0); }
</style>`;

// ---------- The phone shell and the hero's pieces, static ----------
const phShell = (inner) => `<div class="chai-app ph" style="width:390px;height:auto;padding-bottom:16px"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${I.menu()}</span></header><div class="ph-body" style="padding-bottom:12px">${inner}</div></div>`;
const spine = (id, { sel = false, name, initial, g } = {}) => { const f = id ? FACTS[id] : null; return `<span class="h4-s${sel ? " sel" : ""}${f && !f.on ? " cs-off" : ""}" style="background:${g ?? S.grad(id)}"><span class="mn">${initial ?? (f?.all ? "⌂" : f?.name[0])}</span><span class="nm">${name ?? (f?.all ? "All" : f?.name)}</span></span>`; };
const row = (...items) => `<div class="h4s-row">${items.join("")}</div>`;
/** A hero card built from parts, for the states that have no real account behind them. */
const card = ({ g, chip = "", fig, size = 38, name, sub = "", actions = "", dashed = false }) => `<div style="position:relative;isolation:isolate;overflow:hidden;border-radius:22px;padding:16px;display:flex;flex-direction:column;gap:7px;color:#fff;${dashed ? "border:2px dashed oklch(1 0 0 / 0.4)" : `background:${g};box-shadow:0 0 0 1.5px oklch(1 0 0 / 0.45), 0 18px 34px oklch(0 0 0 / 0.4)`}"><span class="row" style="justify-content:space-between;gap:8px"><span class="eyebrow" style="color:oklch(1 0 0 / 0.7)">Your balance</span>${chip}</span><b style="font-size:${size}px;letter-spacing:-0.02em;line-height:1.05">${fig}</b><span style="font-size:17px;font-weight:800">${name}</span><span style="font-size:12.5px;font-weight:700;color:oklch(1 0 0 / 0.78)">${sub}</span><span class="row" style="gap:8px;flex-wrap:wrap;margin-top:4px">${actions}</span></div>`;
const chipP = (p) => `<span class="cs-chip" style="font-size:11px;padding:4px 10px;background:oklch(1 0 0 / 0.16)">${L.purposeIcon(p, 12)}${L.purposeName(p)}</span>`;
const stageFor = (id, inner) => greenStage(`<div style="display:flex;flex-direction:column;gap:12px">${inner}</div>`, { ph: true, pad: "16px", style: id ? `background:${stageBg(id)}` : "" });
const line = (f, key) => whiteLine(f, { w: 330, h: 120, ph: true, key, mono: true });
const toast = (text) => `<div class="row" style="gap:10px;padding:9px 9px 9px 14px;border-radius:999px;background:var(--ink);color:var(--on-ink);box-shadow:var(--pop-shadow);font-size:12.5px;font-weight:700;position:relative;overflow:hidden;margin-top:4px">${I.check(12)}<span style="flex:1">${text}</span><span class="btn btn-sm" style="background:oklch(1 0 0 / 0.14);color:var(--on-ink);min-height:30px">Undo</span><span style="position:absolute;left:0;bottom:0;height:3px;width:64%;background:var(--accent)"></span></div>`;
const head = (lede) => L.header({ lede, phone: true });
const wrapStates = (label, body) => frame(label, phShell(`${body}`));

// ---------- States ----------
const stamped = (html, text, grey = false) => `<div style="position:relative">${html}<span class="stamp${grey ? " grey" : ""}" style="top:-11px;right:14px;transform:rotate(3deg)">${text}</span></div>`;
const placeholderLine = (t) => `<div style="height:110px;border-radius:14px;background:repeating-linear-gradient(0deg, transparent 0 36px, oklch(1 0 0 / 0.08) 36px 37px);display:flex;align-items:center;justify-content:center;padding:0 16px;text-align:center"><span class="chip" style="background:oklch(0 0 0 / 0.2);color:var(--fg);white-space:normal">${t}</span></div>`;
function empty() {
  const c = card({ dashed: true, fig: "₹0", name: "No accounts yet", sub: "Add your first account to start your balance line", actions: btn("Add your first account", { kind: "primary", cls: "btn-sm", icon: I.plus(11) }) });
  return wrapStates("1 · No accounts yet", `${head("Nothing here yet. Add an account and it shows up here.")}${stageFor(null, `${c}${placeholderLine("Your balance draws a line here, from the first one you add")}`)}`);
}
function one() {
  const f = FACTS.hdfc;
  return wrapStates("2 · One account", `${head("One account, so there is no All: the hero opens on it. All comes back with the second.")}${stageFor("hdfc", `${heroCard(f)}${row(spine("hdfc", { sel: true }))}${line(f, "pa")}${statRow(f, { ph: true })}`)}`);
}
function many() {
  const list = Z.MANY.filter((x) => x.on).sort((a, b) => b.balance - a.balance);
  const band = `<div style="display:flex;gap:3px;height:9px;border-radius:999px;overflow:hidden">${list.map((x) => `<span style="flex:${x.balance};background:var(--card-${x.color})"></span>`).join("")}</div>`;
  const c = card({ g: S.grad("all"), chip: `<span class="cs-chip" style="font-size:11px;padding:4px 10px;background:oklch(1 0 0 / 0.16)">${list.length} accounts</span>`, fig: inr(Z.MANY_TOTAL), name: "All accounts", sub: `The four biggest are shown in the band · latest update Oct 18`, actions: `${btn("Update balances", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}${btn("Add account", { kind: "soft", cls: "btn-sm", icon: I.plus(11) })}` });
  const sp = [spine("all", { sel: true }), ...list.slice(0, 5).map((x) => spine(null, { g: `linear-gradient(158deg, var(--card-${x.color}-from), var(--card-${x.color}-to))`, name: x.name, initial: x.name[0] })), `<span class="h4-s more">+${list.length - 5}</span>`];
  return wrapStates("3 · Many accounts (13)", `${head("Thirteen accounts. The row scrolls and the menu groups them by purpose.")}${stageFor("all", `${c}${band}${row(...sp)}${line(FACTS.all, "pc")}`)}`);
}
function stale() {
  const f = FACTS.sbi;
  return wrapStates("4 · A stale balance", `${head("SBI Rainy Day was last updated on Aug 9, so it is stamped, and Update balance comes first.")}${stageFor("sbi", `${stamped(heroCard(f), "NOT READ · 73 DAYS")}${row(spine("all"), spine("sbi", { sel: true }), spine("icici"), spine("hdfc"))}${line(f, "pd")}${statRow(f, { ph: true })}`)}`);
}
function closed() {
  const f = FACTS.yes;
  return wrapStates("5 · A closed account", `${head("YES Old Salary closed on Mar 31. Its figure is ₹0, and Reopen replaces Update balance.")}${stageFor("yes", `${stamped(heroCard(f), "CLOSED", true)}${row(spine("kotak"), spine("axis"), spine("yes", { sel: true }))}${line(f, "pe")}${statRow(f, { ph: true })}`)}`);
}
function fresh() {
  const c = card({ g: S.grad("sbi").replace(/teal/g, "sapphire"), chip: chipP("Spending"), fig: "No balance yet", size: 30, name: "IDFC Travel", sub: "Added just now · counts as ₹0 and isn't stale", actions: `${btn("Add its first balance", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}${btn("Edit", { kind: "soft", cls: "btn-sm", icon: I.edit(11) })}` });
  const g = "linear-gradient(158deg, var(--card-sapphire-from), var(--card-sapphire-to))";
  return wrapStates("6 · Added, no balance yet", `${head("IDFC Travel is added. Its card shows right away and it waits for a first balance.")}${stageFor("hdfc", `${card({ g, chip: chipP("Spending"), fig: "No balance yet", size: 30, name: "IDFC Travel", sub: "Added just now · counts as ₹0 and isn't stale", actions: `${btn("Add its first balance", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}${btn("Edit", { kind: "soft", cls: "btn-sm", icon: I.edit(11) })}` })}${row(spine("all"), spine(null, { g, name: "IDFC Travel", initial: "I", sel: true }), spine("hdfc"))}${placeholderLine("Its line starts with the first balance")}`)}`);
}
function saved() {
  const f = { ...FACTS.sbi, balance: 661400, asOf: L.TODAY, stale: false, chg: 3400, sinceJan: 661400 - 625900, prev: { balance: 658000, date: "2026-08-09" } };
  return wrapStates("7 · Just saved", `${head("The figure and the line take the new balance, the stamp goes, and a toast offers Undo.")}${stageFor("sbi", `${heroCard(f)}${row(spine("all"), spine("sbi", { sel: true }), spine("icici"), spine("hdfc"))}${line(f, "pg")}${toast("SBI Rainy Day: ₹6,61,400 saved for Oct 21")}`)}`);
}
export function statesPhoneBoard() {
  const f = [empty(), one(), many(), stale(), closed(), fresh(), saved()];
  return board({ w: 1800, title: "Final page on a phone: states", sub: "Every state of the hero on a phone: the picked account's card, the row to switch, the line and the figures. Sample data, made up.", body: `${C.DEFS()}${ANIM}${PCSS}${S.CSS("zz")}${CSSP("zz")}${RT}${grid("repeat(4, 390px)", f, 40)}` });
}

// ---------- Forms: full-screen sheets, the account's card as the live preview ----------
const sheet = (title, body, primary, { kind = "primary", h = 800 } = {}) => `<div class="chai-app ph" style="width:390px;height:${h}px;position:relative;overflow:hidden"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><div class="between" style="padding:6px 16px 10px;border-bottom:1px solid var(--divider)"><span class="dlg-x" style="margin:0">${I.x()}</span><b style="font-size:16px">${title}</b><span style="width:34px"></span></div><div style="padding:16px;display:flex;flex-direction:column;gap:14px;overflow:hidden">${body}</div><div style="position:absolute;left:0;right:0;bottom:0;padding:12px 16px 30px;background:var(--surface);border-top:1px solid var(--divider)">${btn(primary, { kind, style: "width:100%;justify-content:center" })}</div></div>`;
/** The live preview: the account's card as the hero shows it, small. */
export const mini = ({ g, name, bank, initial, purpose, fig, sub, stamp = "", chip }) => `<div style="position:relative;isolation:isolate;overflow:hidden;border-radius:18px;padding:13px 14px;display:flex;flex-direction:column;gap:4px;color:#fff;background:${g};box-shadow:0 12px 24px oklch(0 0 0 / 0.25)"><span style="position:absolute;inset:0;z-index:-1;background:repeating-radial-gradient(circle at 120% 130%, oklch(1 0 0 / 0.07) 0 1px, transparent 1px 22px)"></span><span class="row" style="justify-content:space-between"><span class="row" style="gap:8px"><span style="width:26px;height:26px;border-radius:9px;display:grid;place-items:center;background:oklch(1 0 0 / 0.2);font-weight:800;font-size:12.5px">${initial}</span><span style="font-size:11.5px;font-weight:700;opacity:0.8">${bank}</span></span><span class="cs-chip" style="font-size:10.5px;padding:3px 9px;background:oklch(1 0 0 / 0.16)">${chip ?? `${L.purposeIcon(purpose, 11)}${L.purposeName(purpose)}`}</span></span><span style="font-size:15px;font-weight:800;margin-top:2px">${name}</span><b style="font-size:24px;letter-spacing:-0.02em">${fig}</b><span style="font-size:11.5px;font-weight:700;opacity:0.78">${sub}</span>${stamp}</div>`;
export const gr = (c) => `linear-gradient(158deg, var(--card-${c}-from), var(--card-${c}-to))`;
const IDFC = { g: gr("sapphire"), bank: "IDFC FIRST Bank", initial: "I", purpose: "Spending" };

function addForm({ errors = false } = {}) {
  const pc = purposeCards("Spending").replace('<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">', "").replace(/<\/div>$/, "");
  const body = `${mini({ ...IDFC, name: errors ? "Name" : "IDFC Travel", fig: errors ? "No balance yet" : inr(38200), sub: errors ? "Fill it in to see it join your total" : `Oct 21 · total becomes ${inr(L.TOTAL + 38200)}` })}${fld(`${lbl("Name", { req: true })}${errors ? inp("", { cls: "err", ph: true }) + help("Give the account a name, like HDFC Salary", "err") : inp("IDFC Travel")}`)}${fld(`${lbl("Bank", { req: true })}${select({ value: "IDFC FIRST Bank", kind: "field" })}`)}<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${fld(`${lbl("Type", { req: true })}${fseg(["Savings", "Current"], "Savings")}`)}${fld(`${lbl("Opened on", { req: true })}${errors ? dateInp("Nov 3, 2026", "err") + help("It can't open after today", "err") : dateInp("Mar 12, 2024")}`)}</div>${fld(`${lbl("Purpose", { req: true })}<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${pc}</div>`)}${fld(`${lbl("Colour", { isNew: true })}${swatches("sapphire").replace(/width:34px;height:34px/g, "width:36px;height:36px")}`)}`;
  return sheet("Add account", body, "Add account", { h: 1000 });
}
function updateForm() {
  const f = FACTS.sbi;
  const body = `${mini({ g: S.grad("sbi"), name: f.name, bank: f.bank, initial: "S", purpose: f.purpose, fig: inr(661400), sub: `${signed(3400)} since Aug 9 · total becomes ${inr(L.TOTAL + 3400)}` })}${fld(`${lbl("Account", { req: true })}${select({ value: f.name, kind: "field" })}`)}${fld(`${lbl("Balance on", { req: true })}${dateInp("Today, Oct 21")}<div class="row" style="gap:6px;flex-wrap:wrap"><span class="chip" style="background:var(--accent-tint);color:var(--accent-text)">Today</span><span class="chip">Yesterday</span><span class="chip">End of September</span></div>`)}${fld(`${lbl("Balance", { req: true })}${inp("6,61,400", { pre: "₹", cls: "focus", caret: true })}${help("Type what the bank shows. The app works out the change.")}`)}`;
  return sheet("Update balance", body, "Save balance", { h: 800 });
}
function warnForm() {
  const f = FACTS.sbi;
  const body = `${mini({ g: S.grad("sbi"), name: f.name, bank: f.bank, initial: "S", purpose: f.purpose, fig: inr(520000), sub: `${signed(-138000)} since Aug 9` })}${fld(`${lbl("Balance on", { req: true })}${dateInp("Today, Oct 21")}`)}${fld(`${lbl("Balance", { req: true })}${inp("5,20,000", { pre: "₹" })}${help(`That's <b>${inr(138000)} less</b> than on ${fmt(f.asOf)}. Check the number, then save anyway if it's right.`, "warn")}`)}`;
  return sheet("Update balance", body, "Save anyway", { h: 800 });
}
function checkIn() {
  const typed = { sbi: 661400, kotak: 54200, axis: 21350 };
  const rows = P.ORDER.filter((a) => L.isOn(a)).sort((x, y) => L.isStale(y) - L.isStale(x)).map((a) => { const f = FACTS[a.id], v = typed[a.id], focus = a.id === "icici", d = v ? v - f.balance : null; return `<div style="display:flex;flex-direction:column;gap:6px;padding:10px 0;border-bottom:1px solid var(--divider)"><div class="between"><span class="row" style="gap:8px;font-weight:800;font-size:13.5px">${L.mono(a, 26)}${a.name}</span><span style="font-size:11.5px;font-weight:600;color:${f.stale ? "var(--warning-text)" : "var(--muted)"}">${f.stale ? `${I.clock(10)} ` : ""}${inrS(f.balance)} · ${fmt(f.asOf)}</span></div><div class="between" style="gap:10px"><span class="qinp${focus ? " focus" : v ? "" : " ghost"}" style="flex:1"><span class="pre">₹</span>${v ? v.toLocaleString("en-IN") : focus ? `<span style="width:1.5px;height:16px;background:var(--fg)"></span>` : `<span style="font-weight:500">Same as before?</span>`}</span><span style="min-width:70px;text-align:right">${d == null ? `<span class="card-note">${focus ? "" : "Skipped"}</span>` : L.chg(d)}</span></div></div>`; }).join("");
  const body = `<div class="between">${lbl("Balances on", { req: true })}${select({ value: "Today, Oct 21", kind: "small", icon: I.cal(12) })}</div><div style="border-top:1px solid var(--divider);margin-top:-6px">${rows}</div><span class="card-note">The stale one comes first. Blank rows are skipped.</span>`;
  return sheet("Update balances", body, "Save 3 balances", { h: 800 });
}
function closeForm() {
  const f = FACTS.axis;
  const body = `${mini({ g: "linear-gradient(158deg, oklch(0.5 0 0), oklch(0.3 0 0))", name: f.name, bank: f.bank, initial: "A", purpose: f.purpose, fig: "₹0", sub: `Closed ${fmt(L.TODAY)} · history kept` })}${fld(`${lbl("Closed on", { req: true })}${dateInp("Today, Oct 21")}${help("It counts in your totals up to this day.")}`)}<div class="checkrow">${I.alert(16)}<span>Its latest balance is <b>${inr(f.balance)}</b> (${fmt(f.asOf)}). Closing takes that out of your total, so update the account you moved it to.</span></div><div class="row" style="gap:10px;font-size:13px;font-weight:600"><span class="box">${I.check(11)}</span>Keep its balances and charts. Reopen brings it back.</div><div class="notice" style="background:var(--warning-tint)">${I.alert(14)}<span class="grow">Car loan pays from it. Pick another account first.</span></div>`;
  return sheet("Close Axis EMI", body, "Close account", { kind: "danger", h: 800 });
}
function editBalance() {
  const rows = [["Oct 20", inr(204300), L.chg(12400)], ["Sep 30", inr(191900), L.chg(7200)], ["Aug 31", inr(184700), L.chg(-13800)], ["Jul 31", inr(198500), L.chg(-14300)]].map(([d, b, c], i) => `<div style="display:grid;grid-template-columns:1fr 1fr 1fr 24px;align-items:center;gap:8px;padding:12px 4px;font-size:13px;${i === 1 ? "background:var(--fill);border-radius:10px;" : "border-bottom:1px solid var(--divider);"}"><span style="font-weight:600">${d}</span><b>${b}</b>${c}<span class="muted" style="display:flex">${I.edit(13)}</span></div>`).join("");
  const sheetUp = `<div style="position:absolute;left:0;right:0;bottom:0;padding:16px 16px 30px;background:var(--surface);border-radius:22px 22px 0 0;box-shadow:0 -12px 40px oklch(0 0 0 / 0.2);display:flex;flex-direction:column;gap:12px"><span style="align-self:center;width:36px;height:4px;border-radius:2px;background:var(--divider)"></span><div class="between"><b style="font-size:15px">Edit balance</b><span class="dlg-x" style="width:30px;height:30px">${I.x(12)}</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${fld(`${lbl("On")}${dateInp("Sep 30, 2026")}`)}${fld(`${lbl("Balance")}${inp("1,91,900", { pre: "₹", cls: "focus", caret: true })}`)}</div><div class="between"><span class="btn btn-sm btn-danger">${I.trash(12)} Delete</span><span class="row" style="gap:8px">${btn("Cancel", { kind: "soft", cls: "btn-sm" })}${btn("Save", { kind: "primary", cls: "btn-sm" })}</span></div></div>`;
  return `<div class="chai-app ph" style="width:390px;height:800px;position:relative;overflow:hidden"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><div style="padding:16px;display:flex;flex-direction:column;gap:6px"><div class="row" style="gap:10px"><b style="font-size:16px">Balance history</b><span class="muted">·</span><span class="row" style="gap:6px;font-weight:700">${L.mono(L.acc("hdfc"), 20)}HDFC Salary</span></div>${rows}</div><div style="position:absolute;inset:0;background:oklch(0 0 0 / 0.32)"></div>${sheetUp}</div>`;
}
export function formsPhoneBoard() {
  const s = [frame("Add account", addForm()), frame("Add account · errors", addForm({ errors: true })), frame("Update balance", updateForm()), frame("Update balance · a big drop", warnForm()), frame("Update balances · the monthly check-in", checkIn()), frame("Close account", closeForm()), frame("Editing one balance (from its row)", editBalance())];
  return board({ w: 1800, title: "Final page on a phone: forms", sub: "Full-screen sheets with the primary button pinned, as on Cards and Subscriptions, and the account's card as the live preview. Inputs, segments and chips are 44px tall. Sample data, made up.", body: `${C.DEFS()}${PCSS}${S.CSS("zz")}${grid("repeat(4, 390px)", s, 40)}` });
}
