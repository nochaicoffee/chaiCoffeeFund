// Round 16 (2026-10-22): the final page's states and forms on a desktop, with the new hero (the cards are the hero) and the
// account's card as the live preview in the forms. They replace the earlier States and Forms boards, which still showed the
// dropdown hero and the monogram tile. Every figure is made up; "today" is Oct 21, 2026.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as D5 from "./dirs5.mjs";
import * as Z from "./zsel.mjs";
import * as F from "./forms.mjs";
import * as S from "./r12.mjs";
import { board, section } from "./board.mjs";
import { stageBg, CSS2 } from "./r13.mjs";
import { mini, gr } from "./r15.mjs";
import { ANIM } from "./widgets.mjs";
import { RT } from "./r11.mjs";
const { inr, signed, fmt, I, btn, select } = L;
const { FACTS, greenStage } = P;
const { statRow, whiteLine, heroActions } = D5;

const OPEN = `<style>
.h4-t.open { flex-grow: 7; cursor: default; box-shadow: 0 0 0 2px oklch(1 0 0 / 0.5), 0 24px 44px oklch(0 0 0 / 0.45); transform: none; }
.h4-t.open .full { display: flex; opacity: 1; position: relative; } .h4-t.open .mini { display: none; }
.h4-t.more { flex-grow: 0.6; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; box-shadow: none; background: oklch(1 0 0 / 0.1) !important; cursor: default; }
.h4-t.dashed { background: transparent !important; border: 2px dashed oklch(1 0 0 / 0.4); box-shadow: none; }
.h4-t.dashed::before { display: none; }
.stamp { position: absolute; top: 46px; right: 24px; transform: rotate(5deg); padding: 5px 14px; border-radius: 7px; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; background: oklch(0.82 0.13 85); color: oklch(0.3 0.07 70); border: 2px solid oklch(0.62 0.12 80); z-index: 2; box-shadow: 0 4px 10px oklch(0 0 0 / 0.25); }
.stamp.grey { background: oklch(0.86 0 0); color: oklch(0.3 0 0); border-color: oklch(0.6 0 0); }
</style>`;
const BG = "radial-gradient(circle at 10% -25%, oklch(1 0 0 / 0.14), transparent 52%)";
/** A card in the row. Open, it is the hero: the figure, the name and the buttons; shut, a spine with the initial and the name. */
function tile({ id, g, open = false, cls = "", chip = "", eyebrow = "Your balance", fig, name, sub = "", actions = "", stamp = "", initial, shortName }) {
  const f = id ? FACTS[id] : null;
  const gg = g ?? gr(P.hue(id));
  const mn = initial ?? (f?.all ? "⌂" : f?.name[0]);
  const nm = shortName ?? (f?.all ? "All" : f?.name);
  const full = `<span class="full">${chip}<span class="eyebrow" style="color:oklch(1 0 0 / 0.7)">${eyebrow}</span><b style="font-size:62px;letter-spacing:-0.02em;line-height:1.05">${fig}</b><span style="font-size:20px;font-weight:800">${name}</span><span style="font-size:13.5px;font-weight:700;color:oklch(1 0 0 / 0.78)">${sub}</span><span style="margin-top:auto">${actions}</span>${stamp}</span>`;
  return `<span class="h4-t${open ? " open" : ""}${cls ? ` ${cls}` : ""}${f && !f.on && !open ? " cs-off" : ""}" style="background:${open ? `${BG}, ${gg}` : gg}"><span class="mini"><span class="mn">${mn}</span><span class="nm">${nm}</span></span>${full}</span>`;
}
const purposeChip = (p, extra = "") => `<span class="h4-cat cs-chip">${L.purposeIcon(p, 12)}${L.purposeName(p)}${extra}</span>`;
/** A real account as the open card. */
const openOf = (f, o = {}) => tile({ id: f.id, open: true, chip: f.all ? `<span class="h4-cat cs-chip">${f.count} accounts · ${f.fresh} up to date</span>` : purposeChip(f.purpose, f.on ? "" : " · Closed"), eyebrow: f.all ? "Your balance" : `Your balance · ${f.bank}`, fig: f.on && f.balance != null ? inr(f.balance) : "₹0", name: f.name, sub: P.whenLine(f), actions: heroActions(f), ...o });
const shut = (id) => tile({ id });
const rowOf = (...t) => `<div class="h4-row">${t.join("")}</div>`;
const hero = (id, inner) => greenStage(`<div class="gpick" style="display:flex;flex-direction:column;gap:20px">${inner}</div>`, { pad: "26px 30px", style: id ? `background:${stageBg(id)}` : "" });
const lineStats = (f, key) => `${whiteLine(f, { w: 1440, h: 170, ph: false, key, mono: true })}${statRow(f)}`;
const placeholder = (t) => `<div style="height:170px;border-radius:14px;background:repeating-linear-gradient(0deg, transparent 0 49px, oklch(1 0 0 / 0.08) 49px 50px);display:flex;align-items:center;justify-content:center"><span class="chip" style="background:oklch(0 0 0 / 0.2);color:var(--fg)">${t}</span></div>`;
const toast = (text) => `<div class="row" style="gap:12px;padding:10px 10px 10px 16px;border-radius:999px;background:var(--ink);color:var(--on-ink);box-shadow:var(--pop-shadow);font-size:13px;font-weight:700;width:max-content;position:relative;overflow:hidden">${I.check(12)}<span>${text}</span><span class="btn btn-sm" style="background:oklch(1 0 0 / 0.14);color:var(--on-ink);min-height:30px">Undo</span><span style="position:absolute;left:0;bottom:0;height:3px;width:64%;background:var(--accent)"></span></div>`;

export function statesBoardNew() {
  const manyList = Z.MANY.filter((x) => x.on).sort((a, b) => b.balance - a.balance);
  const manySpines = manyList.slice(0, 6).map((x) => tile({ g: `linear-gradient(158deg, var(--card-${x.color}-from), var(--card-${x.color}-to))`, initial: x.name[0], shortName: x.name }));
  const f1 = FACTS.hdfc, f4 = FACTS.sbi, f5 = FACTS.yes;
  const f7 = { ...FACTS.sbi, balance: 661400, asOf: L.TODAY, stale: false, chg: 3400, sinceJan: 661400 - 625900, prev: { balance: 658000, date: "2026-08-09" } };
  const NEWG = gr("sapphire");
  const s = [
    section(1, "No accounts yet", "₹0 and a dashed place where the first account's card will be. Add your first account is the only button. No line until there is a balance.", hero(null, `${rowOf(tile({ open: true, cls: "dashed", g: "transparent", eyebrow: "Your balance", fig: "₹0", name: "No accounts yet", sub: "Add your first account to start your balance line", actions: btn("Add your first account", { kind: "primary", cls: "btn-sm", icon: I.plus(11) }) }))}${placeholder("Your balance draws a line here, from the first one you add")}`)),
    section(2, "One account", "All would only repeat the one account, so the hero opens on it and the row has no All card (decision 6). All comes back with the second account.", hero("hdfc", `${rowOf(openOf(f1))}${lineStats(f1, "da")}`)),
    section(3, "Many accounts (thirteen)", "The row scrolls and ends in a +7 card. The colour band under it shows the biggest accounts. The dropdown is gone, so the purposes group the accounts in the By purpose view of the mix.", hero("all", `${rowOf(openOf(FACTS.all, { fig: inr(Z.MANY_TOTAL), chip: `<span class="h4-cat cs-chip">${manyList.length} accounts</span>` }), ...manySpines, `<span class="h4-t more">+${manyList.length - 6}</span>`)}<div style="display:flex;gap:3px;height:10px;border-radius:999px;overflow:hidden">${manyList.map((x) => `<span style="flex:${x.balance};background:var(--card-${x.color})"></span>`).join("")}</div>${whiteLine(FACTS.all, { w: 1440, h: 170, ph: false, key: "db", mono: true })}`)),
    section(4, "A stale balance", "SBI Rainy Day's last balance is from Aug 9. Its card is stamped NOT READ · 73 DAYS, the line under the name says so in amber, and Update balance is the first button. Its ₹6,58,000 still counts in the total.", hero("sbi", `${rowOf(shut("all"), openOf(f4, { stamp: `<span class="stamp">NOT READ · 73 DAYS</span>` }), shut("icici"), shut("hdfc"), shut("kotak"), shut("axis"), shut("yes"))}${lineStats(f4, "dc")}`)),
    section(5, "A closed account", "YES Old Salary closed on Mar 31. Its card is grey and stamped CLOSED, the figure is ₹0, and Reopen replaces Update balance.", hero("yes", `${rowOf(shut("hdfc"), shut("kotak"), shut("axis"), openOf(f5, { stamp: `<span class="stamp grey">CLOSED</span>` }))}${lineStats(f5, "dd")}`)),
    section(6, "Added, no balance yet", "A new account without a balance: its card shows as soon as it's added, the figure says No balance yet, and the button says Add its first balance. It counts as ₹0 and isn't stale.", hero("hdfc", `${rowOf(shut("all"), tile({ g: NEWG, initial: "I", shortName: "IDFC Travel" }), tile({ g: NEWG, open: true, chip: purposeChip("Spending"), eyebrow: "Your balance · IDFC FIRST Bank", fig: "No balance yet", name: "IDFC Travel", sub: "Added just now · counts as ₹0 and isn't stale", actions: `<span class="row" style="gap:8px">${btn("Add its first balance", { kind: "primary", cls: "btn-sm", icon: I.check(11) })}${btn("Edit", { kind: "soft", cls: "btn-sm", icon: I.edit(11) })}</span>` }), shut("hdfc"))}${placeholder("Its line starts with the first balance")}`)),
    section(7, "Just after saving a balance", "The figure and the line take the new balance, the stale stamp goes, the stage stays on the account, and a toast offers Undo for 6 seconds.", hero("sbi", `${rowOf(shut("all"), openOf(f7), shut("icici"), shut("hdfc"), shut("kotak"), shut("axis"))}${whiteLine(f7, { w: 1440, h: 150, ph: false, key: "dg", mono: true })}${toast("SBI Rainy Day: ₹6,61,400 saved for Oct 21")}`)),
  ];
  return board({ w: 1700, title: "Final page: states", sub: "Every state of the hero, with the cards as the hero. Sample data, made up. These replace the earlier States board, which still showed the dropdown hero.", body: `${C.DEFS()}${ANIM}${S.CSS("zz")}${CSS2("zz")}${OPEN}${RT}${s.join("")}` });
}

// ---------- Forms, with the account's card as the live preview ----------
const pv = (rows) => `<div class="pv-box">${rows.map(([k, v]) => `<div class="between"><span>${k}</span><span>${v}</span></div>`).join("")}</div>`;
const preview = (m, rows) => `<span class="pv-k">Live preview</span><div style="padding:14px 0 8px">${mini(m)}</div>${pv(rows)}`;
const stage = (inner) => `<div class="stage" style="padding:46px 0;display:flex;align-items:center;justify-content:center"><div class="scrim" style="background:linear-gradient(oklch(0.16 0.008 260 / 0.32),oklch(0.16 0.008 260 / 0.38))"></div><div style="position:relative">${inner}</div></div>`;
function addAccount() {
  const fields = [
    F.fld(`${F.lbl("Name", { req: true })}${F.inp("IDFC Travel")}${F.help("Shown on its card and in the mix.")}`),
    F.fld(`${F.lbl("Bank", { req: true })}${select({ value: "IDFC FIRST Bank", kind: "field", options: F.bankOptions("IDFC FIRST Bank") })}`),
    F.fld(`${F.lbl("Type", { req: true })}${F.fseg(["Savings", "Current"], "Savings")}`),
    F.fld(`${F.lbl("Opened on", { req: true })}${F.dateInp("Mar 12, 2024")}`),
    F.fld(`${F.lbl("Purpose", { req: true })}${F.purposeCards("Spending")}${F.help("Groups it in the mix's By purpose view. Every account counts in your total.")}`, true),
    F.fld(`${F.lbl("Colour", { isNew: true })}${F.swatches("sapphire")}${F.help("The card's colour, and the stage's colour when it's picked.")}`, true),
    F.fld(`${F.lbl("Balance today", { opt: true })}${F.inp("38,200", { pre: "₹" })}${F.help("Saved as its first balance.")}`),
    F.fld(`${F.lbl("As of")}${F.dateInp("Today, Oct 21")}`),
  ].join("");
  return F.dialog({ title: "Add account", sub: "Fill it in and watch its card appear", preview: preview({ g: gr("sapphire"), name: "IDFC Travel", bank: "IDFC FIRST Bank", initial: "I", purpose: "Spending", fig: inr(38200), sub: `Oct 21 · total becomes ${inr(L.TOTAL + 38200)}` }, [["Your accounts hold now", inr(L.TOTAL)], ["With this one", `<b style="color:var(--accent-text)">${inr(L.TOTAL + 38200)}</b>`]]), fields, note: "Saves to the Accounts tab, and its first balance to BalanceSnapshots", actions: `${btn("Cancel", { kind: "soft" })}${btn("Add account", { kind: "primary" })}` });
}
function updateBalance() {
  const f = FACTS.sbi;
  const fields = [F.fld(`${F.lbl("Account", { req: true })}${select({ value: "SBI Rainy Day", kind: "field" })}`, true), F.fld(`${F.lbl("Balance on", { req: true })}${F.dateInp("Today, Oct 21")}`), F.fld(`${F.lbl("Balance", { req: true })}${F.inp("6,61,400", { pre: "₹", cls: "focus", caret: true })}${F.help("The change and your new total show as you type.")}`)].join("");
  return F.dialog({ icon: I.check(18), title: "Update balance", sub: "SBI Rainy Day · last updated Aug 9, 73 days ago", preview: preview({ g: gr("teal"), name: f.name, bank: f.bank, initial: "S", purpose: f.purpose, fig: inr(661400), sub: `${signed(3400)} since Aug 9` }, [["Change", `<b style="color:var(--positive)">+₹3,400</b>`], ["Since", "Aug 9 · 73 days"], ["Your total after", `<b style="color:var(--accent-text)">${inr(L.TOTAL + 3400)}</b>`]]), fields, w: 960, note: "Adds a row to BalanceSnapshots", actions: `${btn("Cancel", { kind: "soft" })}${btn("Save balance", { kind: "primary" })}` });
}
function closeAccount() {
  const f = FACTS.axis;
  const fields = [F.fld(`${F.lbl("Closed on", { req: true })}${F.dateInp("Today, Oct 21")}`), F.fld(`${F.lbl("Final balance")}${F.inp("0", { pre: "₹", suf: "fixed" })}`), F.fld(`<div class="checkrow">${I.alert(16)}<span>Its latest balance is <b>${inr(f.balance)}</b> (Oct 6). Closing takes that out of your total. The car loan pays from it: pick another account for it.</span></div>`, true)].join("");
  return F.dialog({ icon: I.lock(18), title: "Close Axis EMI", sub: "Its card turns grey; its history stays", preview: preview({ g: "linear-gradient(158deg, oklch(0.5 0 0), oklch(0.3 0 0))", name: f.name, bank: f.bank, initial: "A", purpose: f.purpose, fig: "₹0", sub: `Closed ${fmt(L.TODAY)} · history kept` }, [["Total now", inr(L.TOTAL)], ["After closing", `<b>${inr(L.TOTAL - f.balance)}</b>`]]), fields, w: 960, note: "Sets it Inactive and adds a ₹0 balance", actions: `${btn("Cancel", { kind: "soft" })}${btn("Close account", { kind: "danger" })}` });
}
const PUR = (id) => FACTS[id].purpose;
function editAccount() {
  const h = FACTS.hdfc;
  const fields = [
    F.fld(`${F.lbl("Name", { req: true })}${F.inp("HDFC Salary")}`),
    F.fld(`${F.lbl("Bank", { req: true })}${select({ value: "HDFC Bank", kind: "field", options: F.bankOptions("HDFC Bank") })}`),
    F.fld(`${F.lbl("Type", { req: true })}${F.fseg(["Savings", "Current"], "Savings")}`),
    F.fld(`${F.lbl("Opened on", { req: true })}${F.dateInp("Jul 1, 2019")}${F.help("Its first balance is Nov 30, 2024, so any date up to then works.")}`),
    F.fld(`${F.lbl("Purpose", { req: true })}${F.purposeCards("Spending")}`, true),
    F.fld(`${F.lbl("Colour", { isNew: true })}${F.swatches("sapphire")}`, true),
  ].join("");
  return F.dialog({ title: "Edit account", sub: "HDFC Salary", preview: preview({ g: gr("sapphire"), name: h.name, bank: h.bank, initial: "H", purpose: PUR("hdfc"), fig: inr(h.balance), sub: `Updated ${fmt(h.asOf)} · ${signed(L.change("hdfc"))} since Sep 30` }, [["Balances recorded", `${h.snaps} since Nov 2024`], ["Latest", `${inr(h.balance)} · ${fmt(h.asOf)}`], ["Pays", "Millennia and Coral bills"]]) + `<span class="card-note" style="color:oklch(0.38 0.06 152)">Balances aren't edited here. Change one from its row in Balance history.</span>`, fields, note: "", left: `<span class="btn btn-sm btn-danger" style="margin-right:auto">${I.lock(11)} Close account</span>`, actions: `${btn("Cancel", { kind: "soft" })}${btn("Save changes", { kind: "primary" })}` });
}
function checkIn() {
  const typed = { sbi: 661400, kotak: 54200, axis: 21350 };
  const rows = P.ORDER.filter((a) => L.isOn(a)).sort((x, y) => L.isStale(y) - L.isStale(x)).map((a) => {
    const f = FACTS[a.id], v = typed[a.id], focus = a.id === "icici", d = v ? v - f.balance : null;
    return `<div class="arow" style="grid-template-columns:1.3fr 0.9fr 170px 110px;padding:10px 0"><span class="cell-name">${L.mono(a, 30)}<span style="min-width:0"><b>${a.name}</b><small>${a.bank}</small></span></span><span style="font-size:12px;font-weight:600;color:${f.stale ? "var(--warning-text)" : "var(--muted)"}">${f.stale ? I.clock(10) + " " : ""}${inr(f.balance)} on ${fmt(f.asOf)}</span><span class="qinp${focus ? " focus" : v ? "" : " ghost"}"><span class="pre">₹</span>${v ? v.toLocaleString("en-IN") : focus ? `<span style="width:1.5px;height:16px;background:var(--fg)"></span>` : `<span style="font-weight:500">Same as before?</span>`}</span><span style="text-align:right">${d == null ? `<span class="card-note">${focus ? "" : "Skipped"}</span>` : L.chg(d)}</span></div>`;
  }).join("");
  const after = L.TOTAL + Object.entries(typed).reduce((t, [id, v]) => t + v - L.latest(id).balance, 0);
  const pre = preview({ g: gr("emerald"), name: "All accounts", bank: "5 accounts", initial: "⌂", chip: "After these 3", fig: inr(after), sub: `${signed(after - L.TOTAL)} on ${inr(L.TOTAL)} now` }, [["Typed", "3 of 5"], ["Skipped", "2 keep their balances"], ["Still stale after", "None"]]) + `<span class="card-note" style="color:oklch(0.38 0.06 152)">The stale one comes first. Tab moves down the list; Enter on the last saves.</span>`;
  const fields = F.fld(`<div class="between" style="margin-bottom:4px">${F.lbl("Balances on", { req: true })}${select({ value: "Today, Oct 21", kind: "small", icon: I.cal(12) })}</div><div style="border-top:1px solid var(--divider)">${rows}</div>`, true);
  return F.dialog({ icon: I.check(18), title: "Update balances", sub: "Your monthly check-in: every account at once", preview: pre, fields, note: "Adds 3 rows to BalanceSnapshots", actions: `${btn("Cancel", { kind: "soft" })}${btn("Save 3 balances", { kind: "primary" })}` });
}
function editBalance() {
  const h = FACTS.hdfc;
  const row = (d, b, c, on = false) => `<div style="display:grid;grid-template-columns:1fr 1fr 1fr 28px;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;font-size:13px;${on ? "background:var(--fill)" : "border-bottom:1px solid var(--divider)"}"><span style="font-weight:600">${d}</span><b>${b}</b>${c}<span class="muted" style="display:flex;justify-content:flex-end">${I.edit(13)}</span></div>`;
  const pop = `<div class="pop" style="position:absolute;top:92px;left:300px;width:400px;padding:16px;display:flex;flex-direction:column;gap:12px;z-index:5"><div class="between"><b style="font-size:14px">Edit balance</b><span class="dlg-x" style="width:28px;height:28px">${I.x(12)}</span></div>${mini({ g: gr("sapphire"), name: h.name, bank: h.bank, initial: "H", purpose: PUR("hdfc"), fig: inr(191900), sub: `Sep 30 · ${signed(7200)} on Aug 31` })}<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${F.fld(`${F.lbl("On")}${F.dateInp("Sep 30, 2026")}`)}${F.fld(`${F.lbl("Balance")}${F.inp("1,91,900", { pre: "₹", cls: "focus", caret: true })}`)}</div><div class="between"><span class="btn btn-sm btn-danger">${I.trash(12)} Delete</span><span class="row" style="gap:8px">${btn("Cancel", { kind: "soft", cls: "btn-sm" })}${btn("Save", { kind: "primary", cls: "btn-sm" })}</span></div></div>`;
  return `<div class="card glass" style="width:660px;position:relative;gap:6px"><span class="card-t">Balance history · HDFC Salary</span>${row("Oct 20", inr(204300), L.chg(12400))}${row("Sep 30", inr(191900), L.chg(7200), true)}${row("Aug 31", inr(184700), L.chg(-13800))}${row("Jul 31", inr(198500), L.chg(-14300))}${pop}<div style="height:300px"></div></div>`;
}
export function formsBoardNew() {
  const s = [
    section(1, "Add account", "The preview draws the new account's card as you fill it in: the bank's initial, the name, the purpose and the balance, in the colour you pick.", stage(addAccount())),
    section(2, "Update balance", "The preview shows the card with its new balance and the change; the stale stamp goes once it's saved.", stage(updateBalance())),
    section(3, "Close account", "Closing turns the account's card grey and stamps it Closed. It adds a ₹0 balance and keeps the history.", stage(closeAccount())),
    section(4, "Edit account", "The same fields as Add. Close account sits on the left of the footer, apart from Save. Balances are never edited here; each one is edited from its row (section 6).", stage(editAccount())),
    section(5, "Update balances: the monthly check-in", "Every active account at once, for one date. The stale one comes first. Blank rows are skipped, so it saves only what you typed. The card shows your total after these.", stage(checkIn())),
    section(6, "Editing one balance", "The pencil on a Balance history row opens this, with the account's card showing the balance as you type it. Delete asks nothing; a toast offers Undo for 6 seconds, as on Cards.", `<div class="stage" style="padding:40px;display:flex;justify-content:center">${editBalance()}</div>`),
  ];
  return board({ w: 1300, title: "Final page: forms", sub: "The forms with the account's card as their preview, replacing the monogram tile. All six forms use the card.", body: `${C.DEFS()}${S.CSS("zz")}${s.join("")}` });
}
