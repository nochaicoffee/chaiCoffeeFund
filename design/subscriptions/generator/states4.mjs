// Key states for L–P: each hero empty and in one changed state, and the map and payments table working together.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./c.mjs";
import * as HR from "./heroes.mjs";
import { section, frame, board } from "./states.mjs";
const { inr, inrK, fmt, fmtY, fmtDow, rel, mono, cardChip, I, btn, iconBtn, seg, rings } = L;

const card = (inner, extra = "") => `<section class="card glass" style="${extra}">${inner}</section>`;
const grid = (cols, ...items) => `<div style="display:grid;grid-template-columns:${cols};gap:22px;align-items:start">${items.join("")}</div>`;
const toast = (text) => `<div style="display:flex;align-items:center;gap:12px;background:var(--ink);color:var(--on-ink);border-radius:14px;padding:9px 9px 9px 14px;font-size:12.5px;font-weight:600;box-shadow:var(--pop-shadow);position:relative;overflow:hidden;width:max-content">${I.check(12)}<span>${text}</span><span style="padding:6px 11px;border-radius:9px;background:oklch(1 0 0 / 0.14);font-weight:800">Undo</span><span style="position:absolute;left:0;bottom:0;height:3px;width:62%;background:var(--accent)"></span></div>`;
const addBtn = btn("Add subscription", { kind: "primary", cls: "btn-sm", icon: I.plus(12) });
const nowKey = L.TODAY.slice(0, 7);
const paidNow = L.paidByMonth(nowKey), toCome = L.expectedByMonth(nowKey);

function eqBlocks(paid, paidN, come, comeN, note) {
  const t = (k, v, s, st) => `<div style="flex:1;border-radius:18px;padding:14px 16px;display:flex;flex-direction:column;gap:3px;${st}"><span style="font-size:12px;font-weight:700;color:var(--muted)">${k}</span><b style="font-size:26px;font-weight:800">${v}</b><span style="font-size:11.5px;font-weight:600;color:var(--muted)">${s}</span></div>`;
  return `<div style="display:flex;gap:10px;align-items:center">${t("Paid", inr(paid), `${paidN} payments`, "background:var(--accent-tint)")}<b style="font-size:24px;color:var(--muted)">+</b>${t("To come", inr(come), `${comeN} renewals left`, "border:1.5px dashed var(--fill-strong)")}<b style="font-size:24px;color:var(--muted)">=</b><div class="textured" style="flex:1.1;border-radius:18px;padding:14px 16px;background:var(--feature-tile);border:1px solid var(--feature-tile-line);display:flex;flex-direction:column;gap:3px">${rings(240, 90, { opacity: 0.12 })}<span style="font-size:12px;font-weight:700;color:oklch(0.38 0.06 152)">October</span><b style="font-size:28px;font-weight:800">${inr(paid + come)}</b><span style="font-size:11.5px;font-weight:700;color:oklch(0.38 0.06 152)">${note}</span></div></div>`;
}
function lRow() {
  const empty = card(`<span class="eyebrow">October so far</span>${eqBlocks(0, 0, 0, 0, "Nothing yet")}<p class="card-note">The sum fills in from the first subscription.</p>${addBtn}`);
  const after = card(`<span class="eyebrow">October so far</span>${eqBlocks(paidNow + 649, 4, toCome - 649, 3, `${inr(paidNow + toCome - L.MONTHLY)} more than a usual month`)}<p class="card-note">Netflix moved from To come to Paid. The total doesn't change.</p>${toast("Netflix: ₹649 paid on Oct 23")}`);
  return grid("1fr 1fr", frame("Empty", empty), frame("After Mark paid", after));
}
function mRow() {
  const shell = (rows, foot) => `<section class="textured" style="border-radius:22px;padding:18px 22px;background:linear-gradient(160deg,oklch(0.2 0.01 260),var(--ink));color:var(--on-ink);display:flex;flex-direction:column;gap:12px">${rings(800, 300, { stroke: "var(--rings-light)", opacity: 0.04, first: 60, step: 34 })}<div class="between"><b style="font-size:16px">Up next</b><span style="font-size:12px;font-weight:600;color:oklch(1 0 0 / 0.55)">${fmtDow(L.TODAY)}</span></div>${rows}<span style="font-size:11px;font-weight:600;color:oklch(1 0 0 / 0.5)">${foot}</span></section>`;
  const empty = shell(`<div style="padding:30px 0;text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center"><span style="font-size:13px;font-weight:700;letter-spacing:0.08em;color:oklch(1 0 0 / 0.6)">NO RENEWALS IN THE NEXT 30 DAYS</span>${btn("Add subscription", { kind: "ghost", cls: "btn-sm", icon: I.plus(12) })}</div>`, "Renewals land here, soonest first, with a countdown in days.");
  const flap = (d) => `<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:22px;height:30px;border-radius:6px;background:linear-gradient(oklch(0.27 0.01 260) 50%, oklch(0.23 0.01 260) 50%);font-size:18px;font-weight:800">${d}<span style="position:absolute;left:0;right:0;top:50%;height:1px;background:oklch(0 0 0 / 0.5)"></span></span>`;
  const brow = (s, n, date, label, color) => `<div style="display:grid;grid-template-columns:84px minmax(0,1fr) 110px 80px 110px;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid oklch(1 0 0 / 0.07)"><span class="row" style="gap:3px">${String(n).padStart(2, "0").split("").map(flap).join("")}</span><span class="row" style="gap:10px">${mono(s, 26)}<b style="font-size:13px">${s.alias}</b></span><span style="font-size:12px;font-weight:700">${date}</span><b style="text-align:right">${inr(s.amount)}</b><span style="text-align:right;font-size:10.5px;font-weight:800;letter-spacing:0.08em;color:${color}">${label}</span></div>`;
  const clear = shell(brow(L.sub("netflix"), 3, "FRI 23 OCT", "DUE SOON", "oklch(0.78 0.15 30)") + brow(L.sub("icloud"), 4, "SAT 24 OCT", "ON TIME", "oklch(0.85 0.15 145)") + brow(L.sub("spotify"), 8, "WED 28 OCT", "ON TIME", "oklch(0.85 0.15 145)"), "Once iCloud+'s Sep 24 renewal is recorded, its NOT RECORDED row leaves the top of the board.");
  return grid("1fr 1.3fr", frame("Empty", empty), frame("Everything recorded", clear));
}
function nRow() {
  const one = `<svg width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="none" stroke="var(--card-ruby)" stroke-width="12"></circle><text x="100" y="104" text-anchor="middle" font-size="22" font-weight="800" fill="var(--fg)">${inr(649)}</text><text x="100" y="124" text-anchor="middle" font-size="11" font-weight="700" fill="var(--muted)">a month</text></svg>`;
  const zero = `<svg width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="none" stroke="var(--fill)" stroke-width="12" stroke-dasharray="6 8"></circle><text x="100" y="106" text-anchor="middle" font-size="22" font-weight="800" fill="var(--muted)">₹0</text></svg>`;
  return grid("1fr 1fr", frame("Empty", card(`<div class="row" style="gap:24px">${zero}<div style="display:flex;flex-direction:column;gap:10px"><b style="font-size:18px">Each category gets a ring</b><p class="card-note">Its length is that category's share of what you pay a month.</p>${addBtn}</div></div>`)), frame("One category", card(`<div class="row" style="gap:24px">${one}<div style="display:flex;flex-direction:column;gap:8px"><b style="font-size:18px">Streaming is all of it, for now.</b><p class="card-note">With one category the ring is full. It splits as soon as a second one is added.</p></div></div>`)));
}
function oRow() {
  const emptyChart = `<svg viewBox="0 0 600 160" width="100%" height="160"><line x1="20" x2="580" y1="120" y2="120" stroke="var(--divider)"></line><line x1="300" x2="300" y1="20" y2="120" stroke="var(--accent)" stroke-width="2"></line><text x="306" y="30" font-size="11" font-weight="800" fill="var(--accent-text)">Today</text><path d="M300,120 L580,120" stroke="var(--accent-text)" stroke-dasharray="5 5" stroke-width="2" fill="none" opacity="0.5"></path><text x="160" y="90" text-anchor="middle" font-size="12" font-weight="700" fill="var(--muted)">Payments draw the line</text><text x="440" y="90" text-anchor="middle" font-size="12" font-weight="700" fill="var(--muted)">Expected renewals, dashed</text></svg>`;
  const wrap = (inner) => `<section class="textured" style="border-radius:22px;padding:16px 18px;background:var(--feature-tile);border:1px solid var(--feature-tile-line);display:flex;flex-direction:column;gap:10px">${rings(700, 260, { opacity: 0.08 })}${inner}</section>`;
  return grid("1fr 1fr", frame("Empty", wrap(`<div class="between"><b style="font-size:18px">₹0 a month</b>${addBtn}</div><div style="background:oklch(1 0 0 / 0.55);border-radius:14px;padding:8px">${emptyChart}</div>`)), frame("A new subscription, no history yet", wrap(`<div class="between"><b style="font-size:18px">${inr(649)} a month</b><span class="card-note">Netflix, added today</span></div><div style="background:oklch(1 0 0 / 0.55);border-radius:14px;padding:8px">${emptyChart.replace("Payments draw the line", "No payments recorded yet").replace(/<path d="M300,120 L580,120"[^>]*><\/path>/, '<path d="M300,96 L580,96" stroke="var(--accent-text)" stroke-dasharray="5 5" stroke-width="2" fill="none" opacity="0.7"></path>').replace("Expected renewals, dashed", "₹649 each month from Oct 23")}</div>`)));
}
function pRow() {
  const dialStub = (f, label, sub) => { const cx = 150, cy = 150, r = 115; const pt = (q) => [cx - r * Math.cos(Math.PI * q), cy - r * Math.sin(Math.PI * q)]; const [x1, y1] = pt(f); return `<svg viewBox="0 0 300 180" width="300" height="180"><path d="M35,150 A115,115 0 0 1 265,150" fill="none" stroke="var(--fill-strong)" stroke-width="22"></path>${f > 0 ? `<path d="M35,150 A115,115 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}" fill="none" stroke="var(--accent)" stroke-width="22"></path>` : ""}<text x="150" y="130" text-anchor="middle" font-size="26" font-weight="800" fill="var(--fg)">${label}</text><text x="150" y="152" text-anchor="middle" font-size="11" font-weight="700" fill="var(--muted)">${sub}</text></svg>`; };
  return grid("1fr 1fr", frame("Empty", card(`<div class="row" style="gap:20px">${dialStub(0, "₹0", "paid this year")}<div style="display:flex;flex-direction:column;gap:10px"><b style="font-size:18px">The year fills in as you pay</b><p class="card-note">The dial shows what's paid against the whole year at today's prices.</p>${addBtn}</div></div>`)), frame("December 31: the year is paid", card(`<div class="row" style="gap:20px">${dialStub(1, inr(67667), "paid in 2026")}<div style="display:flex;flex-direction:column;gap:8px"><b style="font-size:18px">All of 2026 is paid.</b><p class="card-note">On Jan 1 it starts again at ₹0, with 2027 at today's prices: ${inr(L.YEARLY)}.</p></div></div>`)));
}
function pickRow() {
  const s = L.sub("sonyliv");
  const cancelled = card(`<div class="card-h"><span class="card-t row" style="gap:10px">Payments <span class="muted">·</span> ${mono(s, 22)}SonyLIV</span><span class="seg"><span class="seg-i on">Payments</span><span class="seg-i">Price history</span></span></div><div class="row" style="gap:8px"><span class="chip on">${mono(s, 16)}SonyLIV<em>cancelled</em></span><span class="card-note">Picked from "Not in the map"</span></div>${C.paymentsPanel(s).replace('class="cpay cpay-sonyliv"', 'style="display:flex;flex-direction:column"')}`);
  const none = card(`<div class="card-h"><span class="card-t row" style="gap:10px">Payments <span class="muted">·</span> ${mono(L.sub("netflix"), 22)}Netflix</span><span class="seg"><span class="seg-i on">Payments</span><span class="seg-i">Price history</span></span></div><div style="padding:30px 0;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center"><b>No payments recorded yet</b><p class="card-note">Mark it paid when it renews on Oct 23, or add its past payments.</p>${btn("Add past payments", { kind: "soft", cls: "btn-sm" })}</div>`);
  const hist = card(`<div class="card-h"><span class="card-t row" style="gap:10px">Payments <span class="muted">·</span> ${mono(L.sub("netflix"), 22)}Netflix</span><span class="seg"><span class="seg-i">Payments</span><span class="seg-i on">Price history</span></span></div>${C.historyPanel(L.sub("netflix")).replace('class="chist chist-netflix"', 'style="display:flex;flex-direction:column"')}`);
  return grid("1fr 1fr 1fr", frame("A cancelled one, picked from the chips", cancelled), frame("A subscription with no payments yet", none), frame("Price history", hist));
}

export function lpStates() {
  return board({ title: "L–P: states", intro: "Each new hero with no data and in one changed state, then the payments table in its other states. The greeting, cost map and payments table work the same in all five.", body: [
    section("L", "October as an equation", "", lRow()),
    section("M", "Departure board", "", mRow()),
    section("N", "Category rings", "", nRow()),
    section("O", "Two-year chart", "", oRow()),
    section("P", "Year dial", "", pRow()),
    section("+", "The cost map and payments table together", "Clicking a block, or a paused or cancelled chip under the map, picks that subscription; the table follows. All subscriptions shows the latest payments across every one.", pickRow()),
  ].join("") });
}
