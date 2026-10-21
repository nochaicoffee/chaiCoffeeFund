// The states every direction has to handle: no accounts, one account, many accounts, a stale balance,
// a closed account, an account with no balance yet, and just after saving a balance.
// Shown in A's cover flow and B's tiles (C and D use the same pieces: rows, passbooks, the flow map).
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as D from "./dirs.mjs";
import * as C from "./charts.mjs";
import { board, section, frame, grid } from "./board.mjs";
const { inr, signed, inrS, fmt, fmtY, I, btn, rings, grad, mono } = L;

// ---------- Made-up facts for the states (beyond the main sample) ----------
const emptyAll = { all: true, id: "all", name: "All accounts", short: "All", color: "emerald", on: true, balance: 0, count: 0, sinceJan: 0, staleList: [], fresh: 0, stale: false };
const fake = (id, name, bank, color, purpose, balance, asOf, extra = {}) => ({ all: false, id, name, short: name, bank, color, purpose, on: true, stale: false, balance, asOf, type: "Savings", chg: null, ...extra });
const MANY = [
  ...P.ORDER.filter((a) => L.isOn(a)).map((a) => P.FACTS[a.id]),
  fake("idfc", "IDFC Travel", "IDFC FIRST Bank", "sapphire", "Spending", 38200, "2026-10-12"),
  fake("fed", "Federal Gold", "Federal Bank", "copper", "Investment", 21600, "2026-10-03"),
  fake("au", "AU Sweep", "AU Small Finance Bank", "teal", "Emergency-Fund", 115000, "2026-10-09"),
  fake("ban", "Bandhan Kids", "Bandhan Bank", "violet", "Investment", 12400, "2026-09-30"),
  fake("ind", "IndusInd Tax", "IndusInd Bank", "onyx", "Spending", 8800, "2026-10-01"),
];
const manyTotal = MANY.reduce((t, f) => t + f.balance, 0);
const manyAll = { ...P.FACTS.all, count: MANY.length, balance: manyTotal, fresh: MANY.length - 1 };
const newAcc = fake("idfc", "IDFC Travel", "IDFC FIRST Bank", "sapphire", "Spending", null, null, { snaps: 0 });

// ---------- A static cover flow, for any list of facts ----------
function staticStage(list, front, { caption = "", ph = false, addCover = false } = {}) {
  const w = ph ? 150 : 220, h = ph ? 106 : 156, place = D.flowPlace(ph ? { near: 110, step: 46, rot: 58 } : {});
  const n = list.length + (addCover ? 1 : 0);
  const wrap = (i) => { let d = i - front; if (d > n / 2) d -= n; if (d < -n / 2) d += n; return d; };
  const covers = list.map((f, i) => { const p = place(wrap(i)); return `<div style="position:absolute;left:50%;top:${ph ? 14 : 24}px;transform:${p.t};z-index:${p.z};opacity:${p.o}">${P.cover(f, w, h, { small: ph }).replace('box-shadow:0 18px 30px', i === front ? "box-shadow:0 0 0 3px var(--surface),0 0 0 5.5px color-mix(in oklch, var(--card-" + f.color + ") 46%, white),0 24px 40px" : "box-shadow:0 18px 30px")}</div>`; }).join("");
  const add = addCover ? (() => { const p = place(wrap(list.length)); return `<div style="position:absolute;left:50%;top:${ph ? 14 : 24}px;transform:${p.t};z-index:${p.z};opacity:${p.o}"><div style="width:${w}px;height:${h}px;border-radius:18px;border:1.5px dashed oklch(1 0 0 / 0.35);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:oklch(1 0 0 / 0.75);font-weight:700;font-size:13px">${I.plus(16)}Add account</div></div>`; })() : "";
  const f = list[front];
  return `<section class="card glass textured stage-dark stage-deep" style="gap:6px;padding:${ph ? "4px 16px 18px" : "8px 22px 26px"};background:${D.stageLayer(f)};overflow:hidden;--pick-soft: color-mix(in oklch, var(--card-${f.color}) 46%, white); --pick-ink: var(--card-${f.color}-to)">${rings(1400, 540, { stroke: "var(--rings-light)", opacity: 0.05, first: 60, step: 34 })}<div style="position:relative;height:${ph ? 186 : 262}px;perspective:${ph ? 900 : 1300}px;overflow:hidden;margin:0 ${ph ? -16 : -22}px">${covers}${add}</div>${caption}</section>`;
}
const simpleCaption = ({ eyebrow, big, line, actions, note = "", ph = false }) => `<div style="display:flex;flex-direction:column;align-items:center;gap:${ph ? 8 : 10}px;text-align:center"><span class="eyebrow" style="font-size:${ph ? 10.5 : 12}px">${eyebrow}</span><b style="font-size:${ph ? 26 : 34}px;font-weight:800;letter-spacing:-0.01em;line-height:1.1">${big}</b><span style="font-size:13px;font-weight:600;color:var(--muted);max-width:520px;line-height:1.55">${line}</span>${note}<div class="row" style="gap:8px;margin-top:4px;justify-content:center">${actions}</div></div>`;
const tileRowStatic = (list, sel, { w = 198, h = 186, extra = "", fade = false } = {}) => `<div style="position:relative"><div style="display:flex;gap:15px;padding:10px;margin:-10px;overflow:hidden">${list.map((f, i) => `<div class="tilewrap" style="position:relative">${P.tile(f, { w, h })}${i === sel ? `<span class="tick" style="display:flex">${I.check(11)}</span>` : ""}</div>`).join("")}${extra}</div>${fade ? `<div style="position:absolute;right:-10px;top:0;bottom:0;width:120px;background:linear-gradient(90deg,transparent,var(--surface));pointer-events:none"></div><span class="btn btn-icon" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);box-shadow:var(--pop-shadow)">${I.chevR(14)}</span>` : ""}</div>`;
const addTileCol = (h = 186) => `<div class="addtile" style="width:128px;height:${h}px;flex-shrink:0">${I.plus(16)}Add account</div>`;
const card = (inner, style = "") => `<section class="card glass" style="${style}">${inner}</section>`;
const toast = (text, { ph = false } = {}) => `<div class="row" style="gap:12px;padding:10px 10px 10px 16px;border-radius:999px;background:var(--ink);color:var(--on-ink);box-shadow:var(--pop-shadow);font-size:13px;font-weight:700;width:max-content;max-width:100%;position:relative;overflow:hidden">${I.check(12)}<span>${text}</span><span class="btn btn-sm" style="background:oklch(1 0 0 / 0.14);color:var(--on-ink);min-height:30px">Undo</span><span style="position:absolute;left:0;bottom:0;height:3px;width:64%;background:var(--accent)"></span></div>`;

export function statesBoard() {
  const s1 = section(1, "No accounts yet", "The All cover stands alone at ₹0 beside an Add account cover. The tile row is All plus Add account. The chart keeps its frame with a note on what will appear, so the page doesn't jump once the first balance lands.", grid("1fr 1fr", [
    frame("A · Cover flow", staticStage([emptyAll], 0, { addCover: true, caption: simpleCaption({ eyebrow: "Nothing yet", big: "Add your first account", line: "Each one becomes a cover here. Add its balance today and it starts its line; update it whenever you check, and the page keeps the history.", actions: btn("Add account", { kind: "primary", cls: "btn-sm", icon: I.plus(11) }) }) })),
    frame("B · Tiles, and the chart's empty frame", `<div style="display:flex;flex-direction:column;gap:20px">${card(tileRowStatic([emptyAll], 0, { extra: addTileCol() }), "padding:18px")}${card(`<div class="card-h"><span class="card-t">Balance by month<small>this year</small></span></div><div style="position:relative;height:200px;border-radius:14px;background:repeating-linear-gradient(0deg,transparent 0 49px,var(--divider) 49px 50px)"><span class="chip" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:var(--surface);box-shadow:var(--soft-shadow)">Your balances draw a line here, month by month</span></div>`)}</div>`),
  ]));
  const one = P.FACTS.hdfc;
  const s2 = section(2, "One account", "With a single account, All would only repeat it, so <b>All steps aside</b> until there's a second one (decision 6 on the Read me). The hero and the tile are the account itself.", grid("1fr 1fr", [
    frame("A · Cover flow", staticStage([one], 0, { addCover: true, caption: simpleCaption({ eyebrow: "Spending · HDFC Bank · Savings", big: inr(one.balance), line: `Updated ${fmt(one.asOf)} · ${signed(one.chg)} since ${fmt(one.prev.date)}`, actions: P.actions(one) }) })),
    frame("B · Tiles", card(tileRowStatic([one], 0, { extra: addTileCol() }), "padding:18px")),
  ]));
  const s3 = section(3, "Many accounts (ten)", "The cover flow turns round any number, five each side, the rest waiting off the edge. The tile row scrolls sideways with a fade and an arrow, and says how many there are. In Where it sits, the smallest blocks fold into one \"4 more\" block once they'd be too small to read.", `<div style="display:flex;flex-direction:column;gap:20px">${grid("1fr 1fr", [
    frame("A · Cover flow, All at the centre", staticStage([manyAll, ...MANY], 0, { caption: simpleCaption({ eyebrow: "Everything · 10 active accounts", big: inr(manyTotal), line: "+₹74,850 since Jan 1 · latest update Oct 20", actions: P.actions(P.FACTS.all) }) })),
    frame("Where it sits, with small ones folded", card(`<div class="card-h"><span class="card-t">Where it sits<small>sized by balance</small></span></div>${manyMap()}`, "padding:18px")),
  ])}${frame("B · Tiles: the row scrolls, 10 accounts", card(`<div class="between" style="margin-bottom:4px"><span class="card-t">10 accounts<small>scroll for more</small></span></div>${tileRowStatic([manyAll, ...MANY.slice(0, 6)], 0, { fade: true })}`, "padding:18px;gap:10px"))}</div>`);
  const sbi = P.FACTS.sbi;
  const s4 = section(4, "A stale balance", `SBI Rainy Day's last balance is from Aug 9, more than ${L.STALE_DAYS} days ago (the rule is decision 3). Its ₹6,58,000 still counts in the total, carried forward, and everywhere it shows says so in amber: the cover, the tile, the hero's line, a note over its history, and the hatched stretch of the chart. Update balance is the first button, and the check-in lists it first.`, `<div style="display:flex;flex-direction:column;gap:20px">${grid("1.15fr 1fr", [
    frame("A · Picked in the cover flow", staticStage([P.FACTS.all, ...P.ORDER.map((a) => P.FACTS[a.id])], 1, { caption: P.heroCaption(sbi) })),
    frame("B · Tile and details", `<div style="display:flex;flex-direction:column;gap:16px">${tileRowStatic([P.FACTS.all, sbi, P.FACTS.icici], 1)}${card(D.detailsPane(sbi), "padding:18px")}</div>`),
  ])}${grid("1fr 1fr 1fr", [
    frame("C · Its row", card(`<div class="arow" style="grid-template-columns:1.3fr 1fr auto;padding:4px 0"><span class="cell-name">${mono(sbi.a, 32)}<span><b>SBI Rainy Day</b><small>SBI · Savings</small></span></span><span><b class="num" style="font-size:15px">${inr(sbi.balance)}</b><span class="sub2" style="color:var(--warning-text)">${I.clock(9)} Aug 9 · 73 days ago</span></span>${btn("Update", { kind: "primary", cls: "btn-sm" })}</div>`, "padding:16px")),
    frame("D · Its passbook", D.passbook("st", sbi.a)),
    frame("Its history, with the note", card(P.historyPane(sbi, { n: 3 }), "padding:16px;gap:8px")),
  ])}</div>`);
  const yes = P.FACTS.yes;
  const s5 = section(5, "A closed account", "Closing records a final ₹0 balance on the day it closed and marks it Inactive, shown as Closed (decision 5). It stays in the cover flow at the end, greyed, and leaves the tile row for a small stub. Its history and charts stay; it counts in past totals until it closed and in nothing after. Reopen sets it Active again.", grid("1.15fr 1fr", [
    frame("A · Picked in the cover flow", staticStage([P.FACTS.all, ...P.ORDER.map((a) => P.FACTS[a.id])], 6, { caption: P.heroCaption(yes) })),
    frame("B · Details, and C · the closed list opened", `<div style="display:flex;flex-direction:column;gap:16px">${card(D.detailsPane(yes), "padding:18px")}${card(`<div class="between"><span class="card-t">Closed accounts<small>1</small></span><span class="link">Hide ${I.chev(11).replace("6 9 12 15 18 9", "6 15 12 9 18 15")}</span></div><div class="arow" style="grid-template-columns:1.3fr 1fr auto;padding:8px 0 0"><span class="cell-name">${mono(yes.a, 30)}<span><b>YES Old Salary</b><small>YES Bank · open Aug 2017 to Mar 2026</small></span></span><span class="card-note">7 balances · last ₹0 on Mar 31</span>${btn("Reopen", { kind: "soft", cls: "btn-sm", icon: I.play(10) })}</div>`, "padding:16px;gap:8px")}</div>`),
  ]));
  const s6 = section(6, "Just added, no balance yet", "An account added without a balance shows \"No balance yet\" and counts as ₹0 until its first one. It isn't stale, since there's nothing to be old. Its Update balance button says Add its first balance.", grid("1fr 1fr", [
    frame("A · Cover", staticStage([P.FACTS.all, ...P.ORDER.filter((a) => L.isOn(a)).map((a) => P.FACTS[a.id]), newAcc], 6, { caption: simpleCaption({ eyebrow: "Spending · IDFC FIRST Bank · Savings", big: "No balance yet", line: "IDFC Travel was added today. Its first balance starts its line and adds it to your total.", actions: btn("Add its first balance", { kind: "primary", cls: "btn-sm", icon: I.plus(11) }) + btn("Edit", { kind: "soft", cls: "btn-sm", icon: I.edit(11) }) }) })),
    frame("B · Tile", card(tileRowStatic([P.FACTS.all, newAcc], 1, { extra: addTileCol() }), "padding:18px")),
  ]));
  const s7 = section(7, "Just after saving a balance", "The page updates at once (updateTag, as on Cards). A toast offers Undo for 6 seconds; Undo removes the balance it added, but only if it's still the one saved. The cover's balance rolls to the new number digit by digit, like the Cards details card.", grid("1fr 1fr", [
    frame("The toast", `<div style="padding:24px;border-radius:22px;background:var(--fill)">${toast("SBI Rainy Day: ₹6,61,400 saved for Oct 21")}</div>`),
    frame("After a check-in of several", `<div style="padding:24px;border-radius:22px;background:var(--fill)">${toast("3 balances saved for Oct 21 · total ₹11,70,300")}</div>`),
  ]));
  return board({ w: 1700, title: "States", sub: "What each direction does when there's nothing, one, many, a stale balance, a closed account, a new account without a balance, and just after saving. Shown on A's cover flow and B's tiles; C and D use the same rows, passbooks and charts.", body: `${C.DEFS()}${s1}${s2}${s3}${s4}${s5}${s6}${s7}` });
}

function manyMap() {
  const items = MANY.map((f) => ({ id: f.id, v: f.balance, f })).sort((a, b) => b.v - a.v);
  const keep = items.slice(0, 6), rest = items.slice(6);
  const blocks = P.squarify([...keep, { id: "more", v: rest.reduce((t, x) => t + x.v, 0), more: rest }], 0, 0, 100, 100);
  return `<div class="tmap" style="height:330px;margin:-3px">${blocks.map((b) => { const style = `left:calc(${b.x}% + 3px);top:calc(${b.y}% + 3px);width:calc(${b.w}% - 6px);height:calc(${b.h}% - 6px);`; if (b.more) return `<div class="tblock" style="${style}background:var(--fill-strong);color:var(--fg);padding:8px 10px"><b style="font-size:12px">${b.more.length} more</b><span style="font-size:11px;font-weight:700;color:var(--muted)">${inrS(b.v)}</span></div>`; const tiny = b.w < 14 || b.h < 16; return `<div class="tblock" style="${style}background:${grad(b.f.color)};${tiny ? "padding:8px 10px;" : ""}"><b style="${tiny ? "font-size:12px" : ""}">${tiny ? b.f.bank.split(" ")[0] : b.f.name}</b><span class="tb-v" style="font-size:${tiny ? 11 : 17}px">${tiny ? inrS(b.v) : inr(b.v)}</span></div>`; }).join("")}</div>`;
}

export function statesPhone() {
  const sbi = P.FACTS.sbi, yes = P.FACTS.yes;
  const ph = (label, body) => frame(label, `<div class="chai-app ph" style="width:390px;height:auto;padding-bottom:16px"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${I.menu()}</span></header><div class="ph-body" style="padding-bottom:12px">${body}</div></div>`);
  return board({ w: 1300, title: "States on a phone", sub: "The same states at phone width: no accounts, a stale balance, a closed account, and the toast after saving. The toast sits above the bottom edge, clear of the home bar.", body: `${C.DEFS()}${grid("repeat(3, 390px)", [
    ph("No accounts yet", staticStage([emptyAll], 0, { ph: true, addCover: true, caption: simpleCaption({ ph: true, eyebrow: "Nothing yet", big: "Add your first account", line: "Each one becomes a cover here.", actions: btn("Add account", { kind: "primary", cls: "btn-sm", icon: I.plus(11) }) }) })),
    ph("A stale balance, picked", `${staticStage([P.FACTS.all, ...P.ORDER.map((a) => P.FACTS[a.id])], 1, { ph: true, caption: P.heroCaption(sbi, { ph: true }) })}<div class="notice" style="font-size:12px">${I.clock(14)}<span class="grow">No balance since <b>Aug 9</b>. It's still counted until you update it.</span></div>${toast("₹6,61,400 saved for Oct 21", { ph: true })}`),
    ph("A closed account, picked", `${staticStage([P.FACTS.all, ...P.ORDER.map((a) => P.FACTS[a.id])], 6, { ph: true, caption: P.heroCaption(yes, { ph: true }) })}`),
  ], 40)}` });
}
