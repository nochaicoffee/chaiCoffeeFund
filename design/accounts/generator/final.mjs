// The final design, picked by Prathik on 2026-10-22: Z1's hero (the account in the headline is a dropdown, the
// stage takes the picked bank's colour, the line stays white), the monogram tile (B1) as the account's object,
// and All as its own green tile with a colour band under it (A4). One chart only. Desktop, phone, states and forms.
// (The filled cheque, C1, was picked first and replaced the same day: it felt like too much.)
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as D3 from "./dirs3.mjs";
import * as Z from "./zsel.mjs";
import * as Z1 from "./z1.mjs";
import * as Z2 from "./z2.mjs";
import * as F from "./forms.mjs";
import * as O from "./objects.mjs";
import * as O2 from "./objects2.mjs";
import { SIMPLE } from "./objects3.mjs";
import { board, section, frame, grid } from "./board.mjs";
const { inr, signed, inrS, fmt, I, btn, rings, select } = L;
const { FACTS, greenStage } = P;

const TILE = SIMPLE[0];
const ANIM = `<style>.objin { animation: obj-in 560ms cubic-bezier(0.2, 0.9, 0.3, 1.15) both; } @keyframes obj-in { from { opacity: 0; transform: translateY(14px) scale(0.95); } } @media (prefers-reduced-motion: reduce) { .objin { animation: none; } } .board .sec-n { width: auto; padding: 0 9px; border-radius: 999px; } .board details.sel[open] { z-index: 60; }</style>`;
const two = (a, b, ratio = "1fr 1fr") => `<div style="display:grid;grid-template-columns:${ratio.split(" ").map((x) => `minmax(0,${x})`).join(" ")};gap:20px;align-items:stretch">${a}${b}</div>`;
const stack = (...cards) => `<div class="stack-col">${cards.join("")}</div>`;
/** The hero, with its own radios; `sel` is the account it opens on. */
const heroBlock = (prefix, { ph = false, sel = "all", hideAll = false } = {}) => { const pk = P.picker(prefix, Z1.heroSel, sel); return `${pk.css}${hideAll ? `<style>.${prefix}dir .zo-all { display: none; }</style>` : ""}${pk.open}${Z2.hero(prefix, TILE, { ph, allMode: O2.allBand })}${pk.close}`; };

// ---------- The page ----------
export function finalDesktop() {
  const pk = P.picker("fin", Z1.heroSel);
  const below = two(P.historyCard("fin", { n: 10 }), stack(D3.comingUp(), P.outCard("fin")), "1.1fr 1fr");
  return L.desktop({ h: "auto", body: `${C.DEFS()}${ANIM}${pk.css}${pk.open}${P.greeting()}${Z2.hero("fin", TILE, { allMode: O2.allBand })}${below}${pk.close}` });
}
export function finalPhone() {
  const pk = P.picker("finp", Z1.heroSel);
  return L.phone({ h: "auto", body: `${C.DEFS()}${ANIM}${pk.css}${pk.open}${P.greeting({ phone: true })}${Z2.hero("finp", TILE, { ph: true, allMode: O2.allBand })}${D3.comingUp({ ph: true })}${P.historyCard("finp", { n: 4, ph: true })}${P.outCard("finp", { ph: true })}${pk.close}` });
}

// ---------- States ----------
const tileSlot = (inner, { w = 220, h = 245 } = {}) => `<div style="width:${w}px;height:${h}px;border-radius:50px;border:2px dashed oklch(1 0 0 / 0.35);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:oklch(1 0 0 / 0.8);text-align:center">${inner}</div>`;
function emptyHero() {
  const left = `<div style="display:flex;flex-direction:column;gap:14px"><span class="eyebrow">Your balance</span><b style="font-size:76px;font-weight:800;letter-spacing:-0.02em;line-height:1.05">₹0</b><div class="row" style="gap:12px"><span style="font-size:20px;font-weight:700;color:var(--muted)">in</span><span style="display:inline-flex;align-items:center;gap:10px;padding:8px 16px 8px 10px;border-radius:999px;background:oklch(1 0 0 / 0.1);border:1px dashed oklch(1 0 0 / 0.35)">${L.allMono(30)}<b style="font-size:22px;color:var(--muted)">No accounts yet</b></span></div><span style="font-size:14px;font-weight:700;color:var(--muted);max-width:440px;line-height:1.5">Add an account and its balance today. Its tile appears here, and the line starts from that day.</span><div>${btn("Add account", { kind: "primary", cls: "btn-sm", icon: I.plus(11), style: "background:white;color:var(--card-emerald-to)" })}</div></div>`;
  const right = tileSlot(`${I.plus(20)}<b style="font-size:15px;padding:0 18px">Your first account</b><span style="font-size:12px;font-weight:600;opacity:0.75;padding:0 18px">its initial, name and last 4</span>`);
  const line = `<div style="height:200px;border-radius:14px;background:repeating-linear-gradient(0deg, transparent 0 49px, oklch(1 0 0 / 0.08) 49px 50px);display:flex;align-items:center;justify-content:center"><span class="chip" style="background:oklch(0 0 0 / 0.2);color:var(--fg)">Your balance draws a line here, from the first one you add</span></div>`;
  return greenStage(`<div style="display:flex;flex-direction:column;gap:20px"><div style="display:grid;grid-template-columns:minmax(0,1fr) 480px;gap:24px;align-items:center">${left}<div style="display:flex;justify-content:center">${right}</div></div>${line}</div>`, { pad: "30px 32px" });
}
function newHero() {
  const a = { ...O.NEW_ACCT, bal: null, date: null };
  const left = `<div style="display:flex;flex-direction:column;gap:14px"><span class="eyebrow">Your balance</span><b style="font-size:60px;font-weight:800;letter-spacing:-0.02em;line-height:1.05">No balance yet</b><div class="row" style="gap:12px"><span style="font-size:20px;font-weight:700;color:var(--muted)">in</span><span style="display:inline-flex;align-items:center;gap:10px;padding:8px 16px 8px 10px;border-radius:999px;background:oklch(1 0 0 / 0.14);border:1px solid oklch(1 0 0 / 0.28)">${L.mono({ bank: "IDFC FIRST Bank", color: "sapphire", status: "Active" }, 30)}<b style="font-size:22px">IDFC Travel</b>${I.chev(16)}</span></div><span style="font-size:14px;font-weight:700;color:var(--muted)">Added today · it counts as ₹0 until its first balance</span><div>${btn("Add its first balance", { kind: "primary", cls: "btn-sm", icon: I.plus(11), style: "background:white;color:var(--card-sapphire-to)" })}</div></div>`;
  const stageBg = "radial-gradient(circle at 50% -10%, oklch(1 0 0 / 0.18), transparent 55%), linear-gradient(165deg, var(--card-sapphire-from), var(--card-sapphire-to))";
  return greenStage(`<div style="display:grid;grid-template-columns:minmax(0,1fr) 480px;gap:24px;align-items:center">${left}<div style="display:flex;justify-content:center">${O.fit(O.objectOf(TILE, a), TILE.w, TILE.h, 1.15)}</div></div>`, { pad: "30px 32px", style: `background:${stageBg}` });
}
function manyHero() {
  const list = Z.MANY.filter((x) => x.on).sort((a, b) => b.balance - a.balance);
  const all = { ...O.acctOf("all"), sub: `${list.length} accounts`, bal: Z.MANY_TOTAL };
  const band = `<div style="width:320px"><div style="display:flex;gap:3px;height:10px;border-radius:999px;overflow:hidden">${list.map((x) => `<span style="flex:${x.balance};background:var(--card-${x.color})"></span>`).join("")}</div><div style="display:flex;justify-content:center;gap:12px;margin-top:6px;font-size:10.5px;font-weight:700;color:oklch(1 0 0 / 0.75)">${list.slice(0, 4).map((x) => `<span style="display:inline-flex;align-items:center;gap:4px;white-space:nowrap"><i style="width:7px;height:7px;border-radius:2px;background:var(--card-${x.color})"></i>${x.bank.split(" ")[0]} ${Math.round((x.balance / Z.MANY_TOTAL) * 100)}%</span>`).join("")}<span>+${list.length - 4}</span></div></div>`;
  const left = `<div style="display:flex;flex-direction:column;gap:14px"><span class="eyebrow">Your balance</span><b style="font-size:76px;font-weight:800;letter-spacing:-0.02em;line-height:1.05">${inr(Z.MANY_TOTAL)}</b><div style="display:flex;gap:12px;align-items:flex-start"><span style="font-size:20px;font-weight:700;color:var(--muted);padding-top:10px">in</span><div style="display:flex;flex-direction:column;gap:10px"><span style="display:inline-flex;align-items:center;gap:10px;padding:8px 16px 8px 10px;border-radius:999px;background:oklch(1 0 0 / 0.14);border:1px solid oklch(1 0 0 / 0.28);align-self:flex-start">${L.allMono(30)}<b style="font-size:22px">All accounts</b>${I.chev(16)}</span>${Z.menu(`<div style="padding:6px 6px 8px">${Z.searchBox("")}</div><div class="lb" style="max-height:330px">${Z.groupedOptions(Z.MANY, { pick: "all", allBalance: Z.MANY_TOTAL })}</div>`, { w: 380 })}</div></div></div>`;
  return greenStage(`<div style="display:grid;grid-template-columns:minmax(0,1fr) 480px;gap:24px;align-items:start">${left}<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding-top:40px">${O.fit(TILE.render(all), TILE.w, TILE.h, 1.15)}${band}</div></div>`, { pad: "30px 32px" });
}
const toast = (text) => `<div class="row" style="gap:12px;padding:10px 10px 10px 16px;border-radius:999px;background:var(--ink);color:var(--on-ink);box-shadow:var(--pop-shadow);font-size:13px;font-weight:700;width:max-content;position:relative;overflow:hidden">${I.check(12)}<span>${text}</span><span class="btn btn-sm" style="background:oklch(1 0 0 / 0.14);color:var(--on-ink);min-height:30px">Undo</span><span style="position:absolute;left:0;bottom:0;height:3px;width:64%;background:var(--accent)"></span></div>`;
function savedRow() {
  const before = O.acctOf("sbi"), after = { ...before, bal: 661400, date: L.TODAY, stale: false };
  const z = 0.9;
  return `<div style="display:grid;grid-template-columns:auto auto 1fr;gap:28px;align-items:center;padding:26px;border-radius:22px;background:var(--fill)">${frame("Before", O.fit(O.objectOf(TILE, before), TILE.w, TILE.h, z))}<span style="font-size:28px;color:var(--muted)">→</span>${frame("Just saved: the stale stamp is gone", `<div style="display:flex;flex-direction:column;gap:16px">${O.fit(O.objectOf(TILE, after), TILE.w, TILE.h, z)}${toast("SBI Rainy Day: ₹6,61,400 saved for Oct 21")}</div>`)}</div>`;
}
export function finalStates() {
  const s = [
    section(1, "No accounts yet", "₹0, and a dashed place where the first account's tile will be. The dropdown says No accounts yet; Add account is the only button. No chart until there's a balance.", emptyHero()),
    section(2, "One account", "All would only repeat the one account, so the hero opens on it and the menu has no All (decision 6). All comes back with the second account.", heroBlock("st1", { sel: "hdfc", hideAll: true })),
    section(3, "Many accounts (fourteen)", "The menu groups them by purpose and scrolls, and search narrows it. Under All's tile, the colour band shows the four biggest and +9.", manyHero()),
    section(4, "A stale balance", "SBI Rainy Day's last balance is from Aug 9. Its tile is stamped NOT READ · 73 DAYS, the line under the dropdown says so in amber, and Update balance is the first button. Its ₹6,58,000 still counts in the total.", heroBlock("st4", { sel: "sbi" })),
    section(5, "A closed account", "YES Old Salary closed on Mar 31. Its tile is grey and stamped Closed, the figure is ₹0, and Reopen replaces Update balance. It sits under Closed at the end of the menu.", heroBlock("st5", { sel: "yes" })),
    section(6, "Added, no balance yet", "A new account without a balance: its tile shows as soon as it's added, the figure says No balance yet, and the button says Add its first balance. It counts as ₹0 and isn't stale.", newHero()),
    section(7, "Just after saving a balance", "The figure and the line take the new balance, the tile's stale stamp goes, the stage stays on the account, and a toast offers Undo for 6 seconds.", savedRow()),
  ];
  return board({ w: 1700, title: "Final design: states", sub: "Every state on the picked hero. Pick a bank from the dropdown in the live ones. Sample data, made up.", body: `${C.DEFS()}${ANIM}${s.join("")}` });
}

// ---------- Forms, with the tile as the live preview ----------
const pvBox = (rows) => `<div class="pv-box">${rows.map(([k, v]) => `<div class="between"><span>${k}</span><span>${v}</span></div>`).join("")}</div>`;
const tilePreview = (a, rows, { closed = false } = {}) => `<span class="pv-k">Live preview</span><div style="display:flex;justify-content:center;padding:14px 0 8px">${O.fit(O.objectOf(TILE, closed ? { ...a, on: false } : a), TILE.w, TILE.h, 1)}</div>${pvBox(rows)}`;
const stage = (inner) => `<div class="stage" style="padding:46px 0;display:flex;align-items:center;justify-content:center"><div class="scrim" style="background:linear-gradient(oklch(0.16 0.008 260 / 0.32),oklch(0.16 0.008 260 / 0.38))"></div><div style="position:relative">${inner}</div></div>`;
function addAccount() {
  const fields = [
    F.fld(`${F.lbl("Name", { req: true })}${F.inp("IDFC Travel")}${F.help("Shown on its tile and in the menu.")}`),
    F.fld(`${F.lbl("Bank", { req: true })}${select({ value: "IDFC FIRST Bank", kind: "field", options: F.bankOptions("IDFC FIRST Bank") })}`),
    F.fld(`${F.lbl("Type", { req: true })}${F.fseg(["Savings", "Current"], "Savings")}`),
    F.fld(`${F.lbl("Opened on", { req: true })}${F.dateInp("Mar 12, 2024")}`),
    F.fld(`${F.lbl("Purpose", { req: true })}${F.purposeCards("Spending")}`, true),
    F.fld(`${F.lbl("Colour", { isNew: true })}${F.swatches("sapphire")}${F.help("The tile's colour, and the stage's colour when it's picked.")}`, true),
    F.fld(`${F.lbl("Last 4 digits", { opt: true, isNew: true })}${F.inp("3390", { cls: "focus", caret: true })}${F.help("Shown under the name on its tile. Never the full number.")}`),
    F.fld(`${F.lbl("Balance today", { opt: true })}${F.inp("38,200", { pre: "₹" })}${F.help("Saved as its first balance.")}`),
  ].join("");
  return F.dialog({ title: "Add account", sub: "Fill it in and watch its tile appear", preview: tilePreview(O.NEW_ACCT, [["Your accounts hold now", inr(L.TOTAL)], ["With this one", `<b style="color:var(--accent-text)">${inr(L.TOTAL + 38200)}</b>`]]), fields, note: "Saves to the Accounts tab, and its first balance to BalanceSnapshots", actions: `${btn("Cancel", { kind: "soft" })}${btn("Add account", { kind: "primary" })}` });
}
function updateBalance() {
  const a = { ...O.acctOf("sbi"), bal: 661400, date: L.TODAY, stale: false };
  const fields = [
    F.fld(`${F.lbl("Account", { req: true })}${select({ value: "SBI Rainy Day", kind: "field" })}`, true),
    F.fld(`${F.lbl("Balance on", { req: true })}${F.dateInp("Today, Oct 21")}`),
    F.fld(`${F.lbl("Balance", { req: true })}${F.inp("6,61,400", { pre: "₹", cls: "focus", caret: true })}${F.help("The change and your new total show as you type.")}`),
  ].join("");
  return F.dialog({ icon: I.check(18), title: "Update balance", sub: "SBI Rainy Day · last updated Aug 9, 73 days ago", preview: tilePreview(a, [["Change", `<b style="color:var(--positive)">+₹3,400</b>`], ["Since", "Aug 9 · 73 days"], ["Your total after", `<b style="color:var(--accent-text)">${inr(L.TOTAL + 3400)}</b>`]]), fields, w: 960, note: "Adds a row to BalanceSnapshots", actions: `${btn("Cancel", { kind: "soft" })}${btn("Save balance", { kind: "primary" })}` });
}
function closeAccount() {
  const a = { ...O.acctOf("axis"), bal: 0, date: L.TODAY };
  const fields = [
    F.fld(`${F.lbl("Closed on", { req: true })}${F.dateInp("Today, Oct 21")}`),
    F.fld(`${F.lbl("Final balance")}${F.inp("0", { pre: "₹", suf: "fixed" })}`),
    F.fld(`<div class="checkrow">${I.alert(16)}<span>Its latest balance is <b>${inr(FACTS.axis.balance)}</b> (Oct 6). Closing takes that out of your total. The car loan pays from it: pick another account for it.</span></div>`, true),
  ].join("");
  return F.dialog({ icon: I.lock(18), title: "Close Axis EMI", sub: "Its tile turns grey; its history stays", preview: tilePreview(a, [["Total now", inr(L.TOTAL)], ["After closing", `<b>${inr(L.TOTAL - FACTS.axis.balance)}</b>`]], { closed: true }), fields, w: 960, note: "Sets it Inactive and adds a ₹0 balance", actions: `${btn("Cancel", { kind: "soft" })}${btn("Close account", { kind: "danger" })}` });
}
function phoneSheet() {
  const a = { ...O.acctOf("sbi"), bal: 661400, date: L.TODAY, stale: false };
  return `<div class="chai-app ph" style="width:390px;height:720px;position:relative"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><div class="between" style="padding:6px 16px 10px;border-bottom:1px solid var(--divider)"><span class="dlg-x" style="margin:0">${I.x()}</span><b style="font-size:16px">Update balance</b><span style="width:34px"></span></div><div style="padding:16px;display:flex;flex-direction:column;gap:14px"><div style="display:flex;justify-content:center">${O.fit(O.objectOf(TILE, a), TILE.w, TILE.h, 0.62)}</div>${F.fld(`${F.lbl("Account", { req: true })}${select({ value: "SBI Rainy Day", kind: "field" })}`)}${F.fld(`${F.lbl("Balance on", { req: true })}${F.dateInp("Today, Oct 21")}`)}${F.fld(`${F.lbl("Balance", { req: true })}${F.inp("6,61,400", { pre: "₹", cls: "focus", caret: true })}${F.help("+₹3,400 since Aug 9 · total becomes ₹11,68,900")}`)}</div><div style="position:absolute;left:0;right:0;bottom:0;padding:12px 16px 30px;background:var(--surface);border-top:1px solid var(--divider)">${btn("Save balance", { kind: "primary", style: "width:100%;justify-content:center" })}</div></div>`;
}
export function finalForms() {
  const s = [
    section(1, "Add account", "The preview draws the new account's tile as you fill it in: the bank's initial, the name and the last 4, in the colour you pick.", stage(addAccount())),
    section(2, "Update balance", "The preview shows the change and the new total; the tile's stale stamp goes once it's saved. The monthly check-in for every account at once is unchanged (Forms tab).", stage(updateBalance())),
    section(3, "Close account", "Closing turns the account's tile grey and stamps it Closed. It adds a ₹0 balance and keeps the history.", stage(closeAccount())),
    section(4, "On a phone", "A full-screen sheet with the tile small at the top and the button pinned.", `<div style="display:flex;justify-content:center;padding:20px 0">${phoneSheet()}</div>`),
  ];
  return board({ w: 1300, title: "Final design: forms", sub: "The forms with the tile as their preview. The rest (Edit account, the monthly check-in, editing one balance) are on the Forms tab and work the same, with the monogram tile in place of the older tile in their previews.", body: `${C.DEFS()}${s.join("")}` });
}
