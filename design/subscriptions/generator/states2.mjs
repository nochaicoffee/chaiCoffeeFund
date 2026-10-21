// Key states for directions D–H, side by side per direction: empty, a renewal due soon, paused and cancelled.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as D from "./d.mjs";
import * as Fd from "./f.mjs";
import * as Gd from "./g.mjs";
import { section, frame, board } from "./states.mjs";
const { inr, inrK, fmt, fmtY, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, rings } = L;

const NET = L.sub("netflix");
const toast = (text) => `<div style="display:flex;align-items:center;gap:12px;background:var(--ink);color:var(--on-ink);border-radius:14px;padding:9px 9px 9px 14px;font-size:12.5px;font-weight:600;box-shadow:var(--pop-shadow);position:relative;overflow:hidden;width:max-content">${I.check(12)}<span>${text}</span><span style="padding:6px 11px;border-radius:9px;background:oklch(1 0 0 / 0.14);font-weight:800">Undo</span><span style="position:absolute;left:0;bottom:0;height:3px;width:62%;background:var(--accent)"></span></div>`;
const three = (a, b, c) => `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;align-items:start">${a}${b}${c}</div>`;
const card = (inner, extra = "") => `<section class="card glass" style="${extra}">${inner}</section>`;
const empty = (title, body) => `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:10px 0"><span style="width:44px;height:44px;border-radius:14px;background:var(--accent-tint);color:var(--accent-text);display:flex;align-items:center;justify-content:center">${I.subs(20)}</span><b style="font-size:15px">${title}</b><p class="card-note" style="max-width:360px">${body}</p>${btn("Add subscription", { kind: "primary", cls: "btn-sm", icon: I.plus(12) })}</div>`;

// ---------- D ----------
function dRow() {
  const emptyMap = card(`<span class="card-t">What each one costs</span><div style="height:250px;border-radius:18px;border:1.5px dashed var(--fill-strong);display:flex;align-items:center;justify-content:center;padding:20px">${empty("Nothing to map yet", "Each subscription becomes a block, sized by what it costs a month. The map always adds up to what you pay.")}</div>`);
  const block = `<div style="display:flex;gap:14px;align-items:flex-start"><div class="dtile" style="width:200px;height:180px;flex-shrink:0;background:linear-gradient(155deg,var(--card-ruby-from),var(--card-ruby-to));box-shadow:none">${rings(200, 180, { stroke: "var(--rings-light)", opacity: 0.05 })}<div><div style="font-size:17px;font-weight:800">Netflix</div><div class="dt-muted" style="margin-top:3px">Streaming · Monthly</div></div><div><div style="font-size:24px;font-weight:800">${inr(649)}</div><div style="margin-top:8px"><span class="dt-pill due">Oct 23 · 3d</span></div></div></div>
    <div class="hc" style="width:230px"><div class="h"><span style="color:var(--fg)">Netflix</span><span class="pill pill-due" style="padding:2px 8px;font-size:10px">In 3 days</span></div><div class="t">${inr(649)}</div><div class="d">Fri, Oct 23 · Millennia</div><div class="f" style="display:flex;gap:6px">${btn("Mark paid", { kind: "primary", cls: "btn-xs", icon: I.check(9) })}${btn("Open", { kind: "soft", cls: "btn-xs" })}</div></div></div>`;
  const off = card(`<span class="card-t">Paused and cancelled</span><p class="card-note">They leave the map, so it shows what you pay now. They sit in a line under it, and open like any other.</p><div class="row" style="gap:8px;flex-wrap:wrap">${L.SUBS.filter((s) => !L.isOn(s)).map((s) => `<span class="chip">${mono(s, 16)}${s.alias}<em>${s.status === "Paused" ? "paused" : "cancelled"}</em></span>`).join("")}</div><div class="row" style="gap:8px"><span class="card-note">Or show them greyed in the map:</span>${seg([{ label: "Hide", on: true }, { label: "Show" }])}</div>`);
  return three(frame("Empty", emptyMap), frame("Due in 3 days: the block's date pulses; hover or tap for Mark paid", card(block)), frame("Paused and cancelled", off));
}

// ---------- E ----------
function miniGrid(cells) {
  return `<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<div class="heat-m">${d}</div>`).join("")}${cells.join("")}</div>`;
}
const dayCell = (n, inner = "", { today = false, due = false, dim = false } = {}) => `<div style="height:84px;border-radius:12px;padding:6px 7px;display:flex;flex-direction:column;gap:4px;background:${today ? "oklch(0.97 0.03 150)" : dim ? "transparent" : "var(--surface)"};border:1px solid ${today ? "var(--accent)" : due ? "oklch(0.55 0.16 25 / 0.35)" : dim ? "transparent" : "var(--surface-line)"}"><span style="font-size:11px;font-weight:800;color:${today ? "var(--accent-text)" : dim ? "var(--muted)" : "var(--fg)"}">${n}</span>${inner}</div>`;
const echip = (s, amt, kind) => `<span class="row" style="gap:4px;padding:2px 7px 2px 2px;border-radius:999px;font-size:10.5px;font-weight:800;width:max-content;${kind === "paid" ? "background:var(--accent-tint);color:var(--accent-text)" : kind === "wont" ? "background:var(--fill);color:var(--muted);text-decoration:line-through" : kind === "missing" ? "background:var(--warning-tint);color:var(--warning-text)" : "background:var(--surface);border:1px solid var(--surface-line)"}">${mono(s, 15)}${inr(amt)}${kind === "paid" ? I.check(8) : ""}</span>`;
function eRow() {
  const blank = Array.from({ length: 14 }, (_, i) => dayCell(i + 12, "", { today: i + 12 === 20 }));
  const emptyCal = card(`<span class="card-t">October 2026</span><div style="position:relative">${miniGrid(blank)}<div style="position:absolute;inset:30px 0 0;display:flex;align-items:center;justify-content:center"><div class="hc" style="width:300px;text-align:center">${empty("No renewals yet", "Each subscription lands on its renewal day, here and in the year view below.")}</div></div></div>`);
  const due = card(`${miniGrid([dayCell(22, ""), dayCell(23, `${echip(NET, 649, "up")}<span class="btn btn-accent btn-xs" style="margin-top:auto">${I.check(9)}Paid</span>`, { due: true }), dayCell(24, echip(L.sub("icloud"), 219, "up")), dayCell(25, "")].concat([dayCell(26, "", { dim: true }), dayCell(27, "", { dim: true }), dayCell(28, "", { dim: true })]))}
    <div class="between" style="font-size:12px;font-weight:600"><span class="muted">After the click:</span>${echip(NET, 649, "paid")}</div>${toast("Netflix: ₹649 paid on Oct 23")}`);
  const off = card(`${miniGrid([dayCell("2 Nov", echip(L.sub("youtube"), 149, "up")), dayCell(3, echip(L.sub("sonyliv"), 999, "wont")), dayCell(4, ""), dayCell(5, ""), dayCell(6, ""), dayCell(7, ""), dayCell(8, echip(L.sub("chatgpt"), 1999, "up"))])}<p class="card-note">SonyLIV shows where it would have renewed, struck through, so it's clear nothing will be charged. Paused Headspace simply isn't on the calendar until it's resumed.</p>`);
  return three(frame("Empty", emptyCal), frame("Due in 3 days, and after Mark paid", due), frame("Cancelled and paused", off));
}

// ---------- F ----------
function fRow() {
  const emptyF = card(`<div style="display:flex;gap:12px"><div class="dtile" style="width:200px;height:150px;opacity:0.55;background:linear-gradient(150deg,var(--card-emerald-from),var(--card-emerald-to))">${rings(200, 150, { stroke: "var(--rings-light)", opacity: 0.07 })}<span style="display:flex">${I.subs(16)}</span><div><b style="font-size:15px">All subscriptions</b><div class="dt-muted" style="margin-top:4px">₹0 a month</div></div></div><span class="addtile" style="width:150px;height:150px;border-color:var(--accent-edge);color:var(--accent-text)">${I.plus(16)}Add subscription</span></div>
    <div class="heat" style="grid-template-columns:40px repeat(6,minmax(0,1fr))"><span style="font-size:12px;font-weight:800">2026</span>${Array.from({ length: 6 }, () => `<div class="hcell none" style="height:40px">–</div>`).join("")}</div><p class="card-note">The heatmap fills in as payments are recorded, like the Cards page with no statements.</p>`);
  const cat = L.byCategory().find((c) => c.name === "Streaming");
  const due = card(`<div class="dtile" style="width:100%;height:160px;background:linear-gradient(155deg,var(--card-ruby-from),var(--card-ruby-to))">${rings(460, 160, { stroke: "var(--rings-light)", opacity: 0.05 })}<div class="between"><b style="font-size:15px">Streaming</b><span class="dt-faint">2 subscriptions</span></div><div><div class="dt-muted">${inr(cat.v)} a month · ${L.pct(cat.v, L.MONTHLY)}</div><div class="between" style="margin-top:9px"><span class="dt-pill due">Netflix · Oct 23</span><span class="dt-faint">${inr(cat.v * 12)} a year</span></div></div></div>
    <div style="padding:12px 14px;border-radius:14px;background:var(--fill);display:flex;flex-direction:column;gap:8px"><div class="between"><span class="muted" style="font-size:12px;font-weight:600">Next 7 days · 2 renewals</span><b>${inr(868)}</b></div><div class="stack" style="height:22px;border-radius:8px"><span style="flex:649;background:var(--card-ruby);border-radius:6px;animation:due-pulse 2.2s ease-in-out infinite"></span><span style="flex:219;background:var(--card-violet);border-radius:6px"></span></div></div>`);
  const off = card(`<div class="dtile" style="width:100%;height:150px;background:linear-gradient(155deg,var(--card-copper-from),var(--card-copper-to))">${rings(460, 150, { stroke: "var(--rings-light)", opacity: 0.05 })}<div class="between"><b style="font-size:15px">Fitness</b><span class="dt-pill">1 paused</span></div><div><div class="dt-muted">${inr(1500)} a month · Cult.fit</div><div class="dt-faint" style="margin-top:8px">Headspace is paused and not counted</div></div></div><p class="card-note">A category's tile counts only its active subscriptions, and names the paused and cancelled ones. A category whose subscriptions are all off greys out at the end of the row.</p>`);
  return three(frame("Empty", emptyF), frame("Due in 3 days: the category's pill and the Next 7 days bar pulse", due), frame("Paused and cancelled", off));
}

// ---------- G ----------
function gRow() {
  const clear = card(`<div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:14px 0"><span style="width:52px;height:52px;border-radius:50%;background:var(--accent-tint);color:var(--accent-text);display:flex;align-items:center;justify-content:center">${I.check(22)}</span><b style="font-size:18px">Nothing needs you</b><p class="card-note" style="max-width:340px">Every renewal so far is recorded and every price matches. Next up: Netflix on Fri, Oct 23, ${inr(649)}.</p></div>`);
  const ns = Gd.needs();
  const after = Gd.needCard(ns.find((n) => n.kind === "review"), { done: true }).replace("Renews in 10 days", "Times Prime won't renew").replace(/<p style[^>]*>[\s\S]*?<\/p>/, `<p style="font-size:13px;line-height:1.55;color:var(--muted);font-weight:500">Marked cancelled from Oct 30. It leaves your totals after that date; its 2 payments stay.</p>`);
  const missing = Gd.needCard(ns.find((n) => n.kind === "missing"), { done: true }).replace("No payment recorded", "Sep 24 didn't charge").replace(/<p style[^>]*>[\s\S]*?<\/p>/, `<p style="font-size:13px;line-height:1.55;color:var(--muted);font-weight:500">iCloud+ won't ask about Sep 24 again. The app needs somewhere to remember this: a payment marked <b style="color:var(--fg)">Skipped</b> (see the decisions).</p>`);
  return three(frame("All clear", clear), frame("After Cancel it, with Undo", `${after}<div style="margin-top:10px">${toast("Times Prime cancelled")}</div>`), frame("After It didn't charge", missing));
}

// ---------- H ----------
function hRow() {
  const emptyH = card(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${["mil", "cor"].map((id) => { const c = L.CARDS[id]; return `<div style="display:flex;flex-direction:column;gap:8px"><div class="dtile" style="width:100%;height:96px;padding:12px;background:linear-gradient(155deg,var(--card-${c.color}-from),var(--card-${c.color}-to))"><b style="font-size:14px">${c.name}</b><span class="dt-muted">₹0 a month</span></div><div style="height:90px;border-radius:14px;border:1.5px dashed var(--fill-strong);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--muted);text-align:center;padding:10px">Nothing charged to ${c.name} yet</div></div>`; }).join("")}</div>${empty("Add your first subscription", "Lanes come from your cards and accounts. Pick one under Usually charged to and it lands in that lane.")}`);
  const lane = `<div style="display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:18px;background:var(--fill)">${["netflix", "m365"].map((id) => { const s = L.sub(id); const n = L.daysBetween(L.TODAY, L.nextRenewal(s)); return `<div class="row" style="gap:10px;padding:10px 12px;border-radius:14px;background:var(--surface);border:1px solid var(--surface-line);box-shadow:var(--soft-shadow)">${mono(s, 28)}<span class="grow"><b style="font-size:13px;display:block">${s.alias}</b><span class="sub2">${inr(s.amount)} a ${L.cycleWord(s.billingCycle)}</span></span>${n <= 3 ? `${L.duePill(s)}${btn("Paid", { kind: "accent", cls: "btn-xs", icon: I.check(9) })}` : `<span class="muted" style="font-size:11px;font-weight:600">${fmt(L.nextRenewal(s))}</span>`}</div>`; }).join("")}</div>`;
  const off = `<div style="display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:18px;background:var(--fill)">${["sonyliv"].map((id) => { const s = L.sub(id); return `<div class="row" style="gap:10px;padding:10px 12px;border-radius:14px;background:var(--surface);border:1px solid var(--surface-line);opacity:0.6">${mono(s, 28)}<span class="grow"><b style="font-size:13px;display:block">${s.alias}</b><span class="sub2">won't renew on Nov 3</span></span><span class="pill pill-off">Cancelled</span></div>`; }).join("")}<div class="row" style="gap:10px;padding:10px 12px;border-radius:14px;background:var(--surface);border:1px solid var(--surface-line);opacity:0.6">${mono(L.sub("headspace"), 28)}<span class="grow"><b style="font-size:13px;display:block">Headspace</b><span class="sub2">on Ace · ${inr(299)} a month</span></span><span class="pill pill-off">Paused</span></div></div>`;
  return three(frame("Empty", emptyH), frame("Due in 3 days, with Paid on the card", card(`<span class="card-t">Millennia</span>${lane}`)), frame("Paused and cancelled: at the bottom of their lane, not counted", card(`<span class="card-t">At the bottom of a lane</span>${off}<p class="card-note">A lane's total counts only its active ones.</p>`)));
}

export function dhStates() {
  return board({ title: "D–H: states", intro: "Each of the five newer directions with no data, with a renewal due within 3 days, and with its paused and cancelled subscriptions. A to C have their own states boards; the one-subscription state works the same way here.", body: [
    section("D", "Cost map", "", dRow()),
    section("E", "Wall calendar", "", eRow()),
    section("F", "Cards twin", "", fRow()),
    section("G", "Check-in", "Its states are about the queue: when it's empty, and what each answer does.", gRow()),
    section("H", "By card", "", hRow()),
  ].join("") });
}
