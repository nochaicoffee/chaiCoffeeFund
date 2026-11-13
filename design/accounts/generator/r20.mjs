// Round 20 (2026-11-13): alternatives for how the account cards display in the shipped hero (WalletCards.tsx).
// Prathik liked the real hero (the open card, the wallet of strips, Trend/Check-ins on the right) once he had 12
// real accounts in it: 5 banks and 7 brokerage accounts. He asked for a few ways of showing the folded cards, since
// a dozen full-bleed colour strips is a lot to scroll past. The open card, the balance and Trend/Check-ins are left
// exactly as shipped; only the folded list changes.
//   V1 Compact rows: the same strips, flattened — no full-bleed colour, a thin colour edge instead, so 12 fit in
//      less height and read like a statement.
//   V2 Grouped by purpose: Spending, Investment and Loan Payments as sections with a subtotal; a section past four
//      rows collapses to "+N more", so the seven brokerage accounts don't bury the five banks.
//   V3 Compact grid: two columns of small tiles instead of one column of strips, so the list is roughly half as tall.
// All CSS, no script (radios with :has()); a local sample of 12 accounts, made up but his real shape; "today" is
// Oct 21, 2026.
import * as L from "./lib.mjs";
import * as W from "./wparts.mjs";

const { inr, inrS, grad, I, btn, esc } = L;

// ---------- A local sample of 12 accounts, his real shape: 5 banks, 7 brokers ----------
const ACCTS = [
  { id: "hdfc", name: "HDFC Bank Account", bank: "HDFC Bank", purpose: "Loan Payments", color: "sapphire", series: [17521, 16047, 148396, 137977, 97449, 118277, 86367, 313289, 224790, 6210] },
  { id: "slice", name: "Slice Bank Account", bank: "Slice Small Finance Bank", purpose: "Spending", color: "ruby", series: [2347, 9100, 4200, 6800, 3100, 5200, 2900, 7600, 4300, 312] },
  { id: "jupiter", name: "Jupiter Bank Account", bank: "Federal Bank", purpose: "Spending", color: "copper", series: [3668, 2900, 4100, 1800, 3300, 2200, 3900, 1500, 2600, 886] },
  { id: "canara", name: "Canara Bank Account", bank: "Canara Bank", purpose: "Spending", color: "emerald", series: [689, 53, 589, 53, 75, 776, 726, 676, 629, 541] },
  { id: "sbi", name: "SBI Bank Account", bank: "SBI", purpose: "Spending", color: "teal", series: [0, 0, 10043, 10064, 23736, 2736, 902, 4951, 4998, 5120] },
  { id: "ind-mom", name: "IND Money · Mom", bank: "INDmoney", purpose: "Investment", color: "violet", series: [280000, 282000, 285000, 290000, 300000, 305000, 320000, 325000, 328000, 327900], broker: true },
  { id: "ind-prathik", name: "IND Money · Prathik", bank: "INDmoney", purpose: "Investment", color: "onyx", series: [190000, 195000, 198000, 202000, 208000, 212000, 220000, 225000, 228000, 229400], broker: true },
  { id: "ibkr", name: "IBKR", bank: "Interactive Brokers", purpose: "Investment", color: "sapphire", series: [95000, 98000, 102000, 108000, 112000, 118000, 125000, 130000, 136000, 137800], broker: true },
  { id: "etrade", name: "E*TRADE", bank: "E*TRADE", purpose: "Investment", color: "ruby", series: [8000, 8400, 9000, 9500, 10100, 10600, 11200, 11800, 12200, 12350], broker: true },
  { id: "zerodha", name: "Zerodha", bank: "Zerodha", purpose: "Investment", color: "teal", series: [500, 450, 600, 300, 700, 200, 400, 150, 100, -85], broker: true },
  { id: "groww", name: "Groww", bank: "Groww", purpose: "Investment", color: "copper", series: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], broker: true },
  { id: "fyers", name: "FYERS", bank: "FYERS", purpose: "Investment", color: "violet", series: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], broker: true },
];
const MONTHS = L.YEAR;
const now = ACCTS.map((a) => a.series.at(-1));
const TOTAL = now.reduce((t, v) => t + v, 0);
const changeOf = (a) => a.series.at(-1) - a.series.at(-2);
const shareOf = (a) => a.series.at(-1) / TOTAL;
const SINCE_JAN = now.reduce((t, v) => t + v, 0) - ACCTS.reduce((t, a) => t + a.series[0], 0);
const groupsOf = ACCTS.reduce((m, a) => (m.set(a.purpose, [...(m.get(a.purpose) ?? []), a]), m), new Map());

const esc2 = (s) => esc(s);
const mono = (a, size = 30) => `<span class="mono" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;font-size:${Math.round(size * 0.44)}px;background:${grad(a.color)}">${esc2(a.bank[0])}</span>`;
const sparkPath = (series, w, h, pad = 3) => {
  const lo = Math.min(...series), hi = Math.max(...series);
  const X = (i) => pad + (i / (series.length - 1)) * (w - pad * 2), Y = (v) => h - pad - ((v - lo) / (hi - lo || 1)) * (h - pad * 2);
  return series.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
};
const spark = (a, w = 84, h = 26, stroke = "white") => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none" aria-hidden="true" style="display:block;overflow:visible"><path d="${sparkPath(a.series, w, h)}" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path></svg>`;
const chg = (n) => `<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:700">${n >= 0 ? I.up(10) : I.down(10)}${inr(Math.abs(n))}</span>`;

// ---------- The picker (radios + panes), local to this round's 12 accounts ----------
const IDS = ["all", ...ACCTS.map((a) => a.id)];
function picker(prefix, def = "all") {
  const radios = IDS.map((id) => `<input type="radio" class="pk-in" name="${prefix}-sel" id="${prefix}-sel-${id}"${id === def ? " checked" : ""}>`).join("");
  return { open: `<div class="${prefix}dir">${radios}`, close: "</div>" };
}

// ---------- The open card (unchanged from the shipped design: balance, purpose chip, name, buttons) ----------
function openCard(a) {
  if (!a) {
    return `<div class="atile" style="background:${grad("emerald", 150)};min-height:244px">${L.rings(480, 244, { stroke: "var(--rings-light)", opacity: 0.08 })}<div class="between" style="align-items:flex-start"><div><div class="t-muted">Your balance</div><div style="font-size:48px;font-weight:800;letter-spacing:-0.02em;margin-top:4px">${inr(TOTAL)}</div></div><span class="t-pill">${ACCTS.length} accounts</span></div><div><div style="font-size:16px;font-weight:800">All accounts</div><div class="t-muted" style="margin-top:2px">${ACCTS.filter((x) => x.series.at(-1) !== x.series.at(-2)).length} updated recently</div><div class="t-muted">${chg(SINCE_JAN)} since January</div><div style="margin-top:12px;display:flex;gap:8px">${btn("Update balances", { kind: "soft", cls: "btn-sm" })}${btn("Add account", { kind: "soft", cls: "btn-sm" })}</div></div></div>`;
  }
  return `<div class="atile" style="background:${grad(a.color)};min-height:244px">${L.rings(480, 244, { stroke: "var(--rings-light)", opacity: 0.08 })}<div class="between" style="align-items:flex-start"><div><div class="t-muted">Your balance · ${a.bank}</div><div style="font-size:48px;font-weight:800;letter-spacing:-0.02em;margin-top:4px">${inr(a.series.at(-1))}</div></div><span class="t-pill">${a.purpose}</span></div><div><div style="font-size:16px;font-weight:800">${a.name}</div><div class="t-faint" style="margin-top:2px">${a.broker ? "Brokerage" : "Savings"}</div><div class="t-muted" style="margin-top:6px">${chg(changeOf(a))} since last</div><div style="margin-top:12px;display:flex;gap:8px">${btn("Update balance", { kind: "soft", cls: "btn-sm" })}${btn("Edit", { kind: "soft", cls: "btn-sm" })}</div></div></div>`;
}

// ---------- The right panel: the balance and the trend, identical across the three ----------
function trendChart(a, { w = 760, h = 300 } = {}) {
  const series = a ? a.series : MONTHS.map((_, i) => ACCTS.reduce((t, x) => t + x.series[i], 0));
  const lo = Math.min(...series), hi = Math.max(...series);
  const pad = 10;
  const X = (i) => pad + (i / (series.length - 1)) * (w - pad * 2);
  const Y = (v) => pad + (1 - (v - lo) / (hi - lo || 1)) * (h - pad * 2);
  const d = series.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  return `<svg width="100%" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible"><path d="${d} L${X(series.length - 1)} ${h} L${X(0)} ${h} Z" fill="var(--fill)"></path><path d="${d}" fill="none" stroke="var(--fg)" stroke-width="2.5" stroke-linejoin="round"></path><circle cx="${X(series.length - 1)}" cy="${Y(series.at(-1))}" r="5" fill="var(--fg)"></circle>${MONTHS.map((k, i) => `<text x="${X(i)}" y="${h - 2}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--muted)">${L.monName(k)}</text>`).join("")}</svg>`;
}
/** A month-by-month check-in grid for one account (or the total): every month has a balance in this sample, so every cell reads as read. */
function checkGrid(a) {
  const series = a ? a.series : MONTHS.map((_, i) => ACCTS.reduce((t, x) => t + x.series[i], 0));
  const color = a ? `var(--card-${a.color})` : "var(--card-emerald)";
  return `<div style="display:grid;grid-template-columns:repeat(${MONTHS.length},minmax(0,1fr));gap:6px">${MONTHS.map((k, i) => `<div style="height:52px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:10px;font-weight:800;background:color-mix(in oklch, ${color} 16%, var(--surface));color:var(--fg)"><span style="text-transform:uppercase;letter-spacing:0.02em;opacity:0.85">${L.monName(k)}</span><span style="font-size:9px;font-weight:700;opacity:0.8">${inrS(series[i])}</span></div>`).join("")}</div>`;
}
function rightPanel(p) {
  const toggle = `<input type="radio" class="pk-in" name="${p}-m" id="${p}-m-trend" checked><input type="radio" class="pk-in" name="${p}-m" id="${p}-m-checkins"><div class="row-toggle" role="group" aria-label="Show"><label for="${p}-m-trend">Trend</label><label for="${p}-m-checkins">Check-ins</label></div>`;
  const facts = (a) => a
    ? `<div class="between" style="align-items:flex-start"><div><div class="eyebrow">Balance · ${a.name}</div><div style="font-size:30px;font-weight:800;margin-top:4px">${inr(a.series.at(-1))}</div></div>${chg(changeOf(a))}</div>`
    : `<div class="between" style="align-items:flex-start"><div><div class="eyebrow">Balance · all accounts</div><div style="font-size:30px;font-weight:800;margin-top:4px">${inr(TOTAL)}</div></div>${chg(SINCE_JAN)}</div>`;
  const panesHtml = [["all", null], ...ACCTS.map((a) => [a.id, a])].map(([id, a]) => `<div class="hpf-${id}" style="display:none;flex-direction:column;gap:16px">${facts(a)}<div class="rp-trend">${trendChart(a)}</div><div class="rp-checkins" style="display:none">${checkGrid(a)}</div></div>`).join("");
  return `<div style="display:flex;flex-direction:column;gap:16px;min-width:0">${toggle}${panesHtml}</div>`;
}

// ---------- Shared CSS for the three directions ----------
const SHARED_CSS = `<style>
.row-toggle { display: inline-flex; padding: 3px; border-radius: 999px; background: var(--fill); gap: 2px; align-self: flex-start; }
.row-toggle label { padding: 7px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 800; color: var(--muted); cursor: pointer; }
.hero-grid { display: grid; grid-template-columns: minmax(0,520px) minmax(0,1fr); gap: 28px; align-items: start; }
</style>`;
function withToggleCss(p) {
  return `<style>${["trend", "checkins"].map((m) => `.${p}dir:has(#${p}-m-${m}:checked) label[for="${p}-m-${m}"] { background: var(--surface); color: var(--fg); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); }`).join("\n")}
.${p}dir:has(#${p}-m-checkins:checked) .rp-trend { display: none; }
.${p}dir:has(#${p}-m-checkins:checked) .rp-checkins { display: block !important; }
</style>`;
}

// ---------- V1 · Compact rows: a thin colour edge instead of full-bleed colour, so 12 fit in less height ----------
function v1Rows(p) {
  const CSS = `<style>
.v1-list { display: flex; flex-direction: column; gap: 3px; }
.v1-row { display: grid; grid-template-columns: 30px minmax(0,1fr) 70px 90px; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 12px; cursor: pointer; border-left: 3px solid transparent; transition: background 150ms; }
.v1-row:hover { background: var(--fill); }
.v1-row .nm { min-width: 0; }
.v1-row .nm b { display: block; font-size: 12.5px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v1-row .nm small { font-size: 10.5px; font-weight: 600; color: var(--muted); }
.v1-row svg path { stroke: var(--muted) !important; }
.v1-row .bal { text-align: right; }
.v1-row .bal b { display: block; font-size: 12.5px; font-weight: 800; }
${ACCTS.map((a) => `.${p}dir:has(#${p}-sel-${a.id}:checked) .v1-row.r-${a.id} { border-left-color: var(--card-${a.color}); background: color-mix(in oklch, var(--card-${a.color}) 9%, var(--surface)); }`).join("\n")}
.${p}dir:has(#${p}-sel-all:checked) .v1-row.r-all { border-left-color: var(--card-emerald); background: color-mix(in oklch, var(--card-emerald) 9%, var(--surface)); }
</style>`;
  const row = (a) => `<label for="${p}-sel-${a.id}" class="v1-row r-${a.id}"><span class="mono" style="width:26px;height:26px;border-radius:9px;font-size:11px;background:${grad(a.color)}">${esc2(a.bank[0])}</span><span class="nm"><b>${esc2(a.name)}</b><small>${a.purpose}</small></span><svg viewBox="0 0 84 26" width="56" height="18" preserveAspectRatio="none"><path d="${sparkPath(a.series, 84, 26)}" fill="none" stroke-width="1.8" vector-effect="non-scaling-stroke"></path></svg><span class="bal"><b>${inrS(a.series.at(-1))}</b>${chg(changeOf(a))}</span></label>`;
  const allRow = `<label for="${p}-sel-all" class="v1-row r-all" style="margin-bottom:4px"><span class="mono" style="width:26px;height:26px;border-radius:9px;font-size:11px;background:${grad("emerald", 150)}">${I.accounts(13)}</span><span class="nm"><b>All accounts</b><small>${ACCTS.length} total</small></span><span></span><span class="bal"><b>${inrS(TOTAL)}</b>${chg(SINCE_JAN)}</span></label>`;
  const panesHtml = [["all", null], ...ACCTS.map((a) => [a.id, a])].map(([id, a]) => `<div class="hpf-${id}" style="display:none">${openCard(a)}</div>`).join("");
  return `${CSS}<div class="hero-grid"><div>${panesHtml}<div class="v1-list" style="margin-top:14px">${allRow}${ACCTS.map(row).join("")}</div></div>${rightPanel(p)}</div>`;
}

// ---------- V2 · Grouped by purpose: a subtotal per group, a group past four rows collapses ----------
function v2Grouped(p) {
  const CSS = `<style>
.v2-group { display: flex; flex-direction: column; gap: 2px; margin-top: 14px; }
.v2-gh { display: flex; align-items: baseline; justify-content: space-between; padding: 6px 10px 4px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
.v2-gh b { font-size: 12.5px; font-weight: 800; color: var(--fg); letter-spacing: 0; text-transform: none; }
.v2-row { display: grid; grid-template-columns: 28px minmax(0,1fr) 90px; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; cursor: pointer; transition: background 150ms; }
.v2-row:hover { background: var(--fill); }
.v2-row .nm { min-width: 0; font-size: 12.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v2-row .bal { text-align: right; font-size: 12.5px; font-weight: 800; }
.v2-more { display: none; }
.v2-toggle-more { padding: 7px 10px; border-radius: 10px; font-size: 11.5px; font-weight: 800; color: var(--accent-text); cursor: pointer; }
.v2-toggle-more input { position: absolute; opacity: 0; }
.v2-g-id:checked ~ .v2-more { display: flex; flex-direction: column; gap: 2px; }
.v2-g-id:checked ~ .v2-toggle-more .v2-less { display: inline; } .v2-g-id:checked ~ .v2-toggle-more .v2-show { display: none; }
.v2-toggle-more .v2-less { display: none; }
${ACCTS.map((a) => `.${p}dir:has(#${p}-sel-${a.id}:checked) .v2-row.r-${a.id} { background: color-mix(in oklch, var(--card-${a.color}) 13%, var(--surface)); box-shadow: inset 2px 0 0 var(--card-${a.color}); }`).join("\n")}
.${p}dir:has(#${p}-sel-all:checked) .v2-row.r-all { background: color-mix(in oklch, var(--card-emerald) 13%, var(--surface)); box-shadow: inset 2px 0 0 var(--card-emerald); }
</style>`;
  const row = (a) => `<label for="${p}-sel-${a.id}" class="v2-row r-${a.id}"><span class="mono" style="width:24px;height:24px;border-radius:8px;font-size:10px;background:${grad(a.color)}">${esc2(a.bank[0])}</span><span class="nm">${esc2(a.name)}</span><span class="bal">${inrS(a.series.at(-1))}</span></label>`;
  const groups = [...groupsOf.entries()].map(([purpose, accts], gi) => {
    const subtotal = accts.reduce((t, a) => t + a.series.at(-1), 0);
    const shown = accts.slice(0, 4), rest = accts.slice(4);
    const gid = `${p}-g${gi}`;
    return `${rest.length ? `<input type="checkbox" id="${gid}" class="v2-g-id" style="position:absolute;opacity:0">` : ""}<div class="v2-group"><div class="v2-gh"><b>${purpose}</b><span>${inrS(subtotal)} · ${accts.length} ${accts.length === 1 ? "account" : "accounts"}</span></div>${shown.map(row).join("")}${rest.length ? `<div class="v2-more">${rest.map(row).join("")}</div><label for="${gid}" class="v2-toggle-more"><span class="v2-show">+${rest.length} more</span><span class="v2-less">Show fewer</span></label>` : ""}</div>`;
  }).join("");
  const allRow = `<label for="${p}-sel-all" class="v2-row r-all" style="margin-top:2px"><span class="mono" style="width:24px;height:24px;border-radius:8px;font-size:10px;background:${grad("emerald", 150)}">${I.accounts(12)}</span><span class="nm" style="font-weight:800">All accounts</span><span class="bal">${inrS(TOTAL)}</span></label>`;
  const panesHtml = [["all", null], ...ACCTS.map((a) => [a.id, a])].map(([id, a]) => `<div class="hpf-${id}" style="display:none">${openCard(a)}</div>`).join("");
  return `${CSS}<div class="hero-grid"><div>${panesHtml}${allRow}${groups}</div>${rightPanel(p)}</div>`;
}

// ---------- V3 · Compact grid: two columns of small tiles instead of one column of strips ----------
function v3Grid(p) {
  const CSS = `<style>
.v3-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; margin-top: 14px; }
.v3-tile { display: flex; flex-direction: column; gap: 6px; padding: 12px 13px; border-radius: 16px; background: var(--fill); cursor: pointer; transition: transform 150ms, background 150ms; min-width: 0; }
.v3-tile:hover { transform: translateY(-2px); }
.v3-tile .top { display: flex; align-items: center; gap: 8px; min-width: 0; }
.v3-tile .nm { min-width: 0; font-size: 11.5px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v3-tile .bal { font-size: 15px; font-weight: 800; letter-spacing: -0.01em; }
.v3-tile svg path { stroke: var(--muted) !important; }
.v3-all { grid-column: 1 / -1; }
${ACCTS.map((a) => `.${p}dir:has(#${p}-sel-${a.id}:checked) .v3-tile.r-${a.id} { background: color-mix(in oklch, var(--card-${a.color}) 16%, var(--surface)); box-shadow: 0 0 0 1.5px var(--card-${a.color}); }`).join("\n")}
.${p}dir:has(#${p}-sel-all:checked) .v3-tile.r-all { background: color-mix(in oklch, var(--card-emerald) 16%, var(--surface)); box-shadow: 0 0 0 1.5px var(--card-emerald); }
</style>`;
  const tile = (a) => `<label for="${p}-sel-${a.id}" class="v3-tile r-${a.id}"><span class="top"><span class="mono" style="width:22px;height:22px;border-radius:7px;font-size:10px;background:${grad(a.color)}">${esc2(a.bank[0])}</span><span class="nm">${esc2(a.name)}</span></span><span class="bal">${inrS(a.series.at(-1))}</span><span style="display:flex;align-items:center;justify-content:space-between;gap:8px"><svg viewBox="0 0 84 26" width="48" height="16" preserveAspectRatio="none"><path d="${sparkPath(a.series, 84, 26)}" fill="none" stroke-width="1.8" vector-effect="non-scaling-stroke"></path></svg>${chg(changeOf(a))}</span></label>`;
  const allTile = `<label for="${p}-sel-all" class="v3-tile v3-all r-all"><span class="top"><span class="mono" style="width:22px;height:22px;border-radius:7px;font-size:10px;background:${grad("emerald", 150)}">${I.accounts(12)}</span><span class="nm" style="font-weight:800">All accounts · ${ACCTS.length}</span></span><span class="bal">${inrS(TOTAL)}</span>${chg(SINCE_JAN)}</label>`;
  const panesHtml = [["all", null], ...ACCTS.map((a) => [a.id, a])].map(([id, a]) => `<div class="hpf-${id}" style="display:none">${openCard(a)}</div>`).join("");
  return `${CSS}<div class="hero-grid"><div>${panesHtml}<div class="v3-grid">${allTile}${ACCTS.map(tile).join("")}</div></div>${rightPanel(p)}</div>`;
}

// ---------- Pages ----------
const IDEAS = {
  V1: ["Compact rows", "The same strips, flattened: a thin colour edge instead of a full-bleed colour background, so all 12 fit in noticeably less height and read like a statement."],
  V2: ["Grouped by purpose", "Spending, Investment and Loan Payments as sections with a subtotal each. A section past four accounts collapses to “+N more”, so the seven brokerage accounts don't bury the five banks."],
  V3: ["Compact grid", "Two columns of small tiles instead of one column of strips: roughly half the height for the same 12 accounts."],
};
const DIRS = { V1: v1Rows, V2: v2Grouped, V3: v3Grid };
function page(id) {
  const p = `r20${id.toLowerCase()}`;
  const pk = picker(p);
  const CSS2 = `<style>${[...ACCTS.map((a) => a.id), "all"].map((id2) => `.${p}dir:has(#${p}-sel-${id2}:checked) .hpf-${id2} { display: flex !important; }`).join("\n")}</style>`;
  const [name, idea] = IDEAS[id];
  const tag = `<div class="wtag"><span class="pill pill-ink" style="font-size:12px;padding:4px 10px">${id}</span><b>${name}</b><span class="wi">${idea} The open card, the balance and Trend/Check-ins are unchanged from the shipped design. 12 accounts, his real shape (5 banks, 7 brokers). Sample data, made up.</span></div>`;
  return L.desktop({ h: "auto", body: `${SHARED_CSS}${CSS2}${withToggleCss(p)}${W.WCSS}${tag}<section class="card glass ${p}dir" style="gap:0">${pk.open}${DIRS[id](p)}${pk.close}</section><div aria-hidden="true" style="height:60px;flex-shrink:0"></div>` });
}

export const R20_DESKTOPS = [
  { file: "AccountsCardsV1.dc.html", w: 1600, render: () => page("V1") },
  { file: "AccountsCardsV2.dc.html", w: 1600, render: () => page("V2") },
  { file: "AccountsCardsV3.dc.html", w: 1600, render: () => page("V3") },
];
