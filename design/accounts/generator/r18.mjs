// Round 18 (2026-11-13): one money section in place of three. Prathik found "This year, in and out", "Over time" and "Money in
// and out" out of place and hard to read: the saved figure left out the money with no record, the loan sat inside Came in and
// Invested, and card bills, EMIs and big spends were one Expenses number. He asked for one section, beautiful and interactive,
// that answers four things at a glance: what came into the bank, what was invested, what was spent, what was left in the bank.
// Three directions, each replacing the three cards on the final page (the hero, the mix, Balance history and Coming up stay):
//   M1 River: a flow from where money came from, through the banks, to where it went, with a month pick.
//   M2 Four answers: four big tiles (came in, spent, invested, left in the bank); pick one and the months below break it down.
//   M3 Receipt: the year as a till receipt beside a month ribbon; pick a month and the receipt becomes that month's.
// Every direction keeps the loan apart from income, splits spending into card bills, EMIs, big spends and cash and UPI, and
// shows cash and UPI (the balance change no record explains) openly, hatched. All CSS (radios with :has() and :hover), no script.
// Sample data, made up, shaped like his year; "today" is Oct 21, 2026, so the months are January to October.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import * as C from "./charts.mjs";
import * as Z1 from "./z1.mjs";
import * as W from "./wparts.mjs";
import * as R from "./r11.mjs";
import * as S from "./r12.mjs";
import { h4Stage, CSS2 } from "./r13.mjs";
import { ANIM, tag, cols } from "./widgets.mjs";

const { inr, inrS, signed, monName, monFull } = L;
const K = 1000;

// ---------- The sample year ----------
// Per month, in rupees. In: salary, other income (a tax refund, an insurance payout, interest on money lent), borrowed (a loan
// paid into the bank), back (money a broker sent back). Out: card bills, EMIs, big spends, subscriptions off a card, cash and UPI
// (no record: the balance moved by it), invested (sent to brokers), lent (to people). Left in the bank = in − out, the actual change.
const MONTHS = L.YEAR; // Jan to Oct 2026
const RAW = {
  salary: [170, 140, 140, 145, 150, 140, 150, 175, 175, 178],
  other: [6, 181, 150, 24, 6, 6, 24, 6, 6, 6],
  borrowed: [0, 0, 0, 0, 0, 0, 1100, 0, 0, 0],
  back: [0, 0, 0, 0, 30, 0, 287, 0, 150, 127],
  card: [61, 64, 55, 72, 66, 69, 74, 77, 71, 81],
  emi: [10, 10, 10, 10, 10, 10, 10, 97, 98, 97],
  big: [0, 57, 102, 0, 0, 0, 276, 18, 0, 108],
  subs: [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4],
  cash: [12, 28, 14, 46, 22, 61, 18, 47, 52, 58],
  invested: [20, 30, 60, 40, 90, 40, 1250, 10, 0, 0],
  lent: [182, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};
const IN_KEYS = ["salary", "other", "borrowed", "back"];
const SPENT_KEYS = ["card", "emi", "big", "subs", "cash"];
const OUT_KEYS = [...SPENT_KEYS, "invested", "lent"];
const NAME = { salary: "Salary", other: "Other income", borrowed: "Borrowed", back: "Back from brokers", card: "Card bills", emi: "EMIs", big: "Big spends", subs: "Subscriptions", cash: "Cash and UPI", invested: "Invested", lent: "Lent to people", kept: "Left in the bank", drawn: "Taken from savings" };
const NOTE = {
  salary: "NetApp, every month",
  other: "A tax refund, an insurance payout, interest on money lent",
  borrowed: "The personal loan, paid into HDFC in July. Not income: it's owed back",
  back: "Money brokers sent back to the bank",
  card: "Every card bill paid from a bank",
  emi: "Loan installments, interest and principal",
  big: "The car, the education loan, the car's upgrades",
  subs: "Charged straight to a bank",
  cash: "The balance moved but nothing records why: UPI to people and shops, cash. Worked out",
  invested: "Sent to brokers; what came back is under money in",
  lent: "Money lent to friends",
  kept: "What the banks hold now, less what they held on Jan 1",
  drawn: "The banks hold less than on Jan 1: the rest was paid from what was already there",
};
const COLOR = { salary: "var(--card-emerald)", other: "oklch(0.74 0.12 150)", borrowed: "var(--card-teal)", back: "oklch(0.7 0.09 205)", card: "var(--card-ruby)", emi: "var(--card-copper)", big: "oklch(0.62 0.14 350)", subs: "oklch(0.7 0.08 20)", cash: "oklch(0.66 0.05 30)", invested: "var(--card-violet)", lent: "oklch(0.72 0.12 80)", kept: "oklch(0.8 0.13 150)", drawn: "oklch(0.78 0.04 260)" };
const HATCH = (c) => `repeating-linear-gradient(135deg, ${c} 0 6px, color-mix(in oklch, ${c} 55%, white) 6px 11px)`;

function monthOf(i) {
  const m = Object.fromEntries(Object.entries(RAW).map(([k, v]) => [k, Math.round(v[i] * K)]));
  return withTotals(m);
}
function withTotals(m) {
  const cameIn = m.salary + m.other;
  const allIn = IN_KEYS.reduce((t, k) => t + m[k], 0);
  const spent = SPENT_KEYS.reduce((t, k) => t + m[k], 0);
  const out = OUT_KEYS.reduce((t, k) => t + m[k], 0);
  return { ...m, cameIn, allIn, spent, out, investedNet: m.invested - m.back, kept: allIn - out };
}
const BY_MONTH = MONTHS.map((k, i) => ({ key: k, ...monthOf(i) }));
const YEAR_T = withTotals(Object.fromEntries(Object.keys(RAW).map((k) => [k, BY_MONTH.reduce((t, m) => t + m[k], 0)])));
const PICKS = [{ id: "yr", label: "This year", m: YEAR_T, when: "Jan 1 to Oct 21" }, ...BY_MONTH.map((m) => ({ id: m.key.slice(5), label: monName(m.key), m, when: monFull(m.key) }))];
const START = 642000; // the banks on Jan 1
const balAfter = BY_MONTH.reduce((acc, m) => [...acc, (acc.at(-1) ?? START) + m.kept], []);

const sg = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${inrS(Math.abs(n))}`;
const tone = (n) => (n > 0 ? "var(--positive)" : n < 0 ? "var(--negative)" : "var(--muted)");
const dot = (k) => `<i style="width:9px;height:9px;border-radius:3px;flex-shrink:0;background:${k === "cash" ? HATCH(COLOR.cash) : COLOR[k]}"></i>`;

// ---------- Shared CSS ----------
const CSS = `<style>
.mf { position: relative; }
.mf .pk-in { position: absolute; opacity: 0; pointer-events: none; }
.mf .vv { display: none; }
.mf-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.mf-chips label { cursor: pointer; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; background: var(--fill); color: var(--fg); transition: background 160ms, color 160ms; }
.mf-chips label:hover { background: var(--fill-strong); }
.mf-big { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; font-variant-numeric: tabular-nums; }
.mf-k { font-size: 12px; font-weight: 700; color: var(--muted); }
.mf-sub { font-size: 12px; font-weight: 600; color: var(--muted); line-height: 1.5; }
.mf-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; }
.mf-row b { margin-left: auto; font-variant-numeric: tabular-nums; }
.mf-bar { display: flex; gap: 2px; height: 10px; border-radius: 6px; overflow: hidden; }
.mf-bar i { display: block; height: 100%; }
.mf-hov { position: relative; }
.mf-hov:hover > .hc-wrap, .mf-hov:focus-within > .hc-wrap { opacity: 1; transform: none; pointer-events: auto; }
.mf-band { transition: opacity 180ms; }
.mf-river:hover .mf-band { opacity: 0.28; }
.mf-river .mf-band:hover { opacity: 0.92; }
.mf-node { transition: transform 180ms; }
.mf-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12px; font-weight: 600; color: var(--muted); }
.mf-legend span { display: inline-flex; align-items: center; gap: 6px; }
.mf-tile { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 18px 20px; border-radius: 22px; background: var(--fill); cursor: pointer; transition: transform 160ms, box-shadow 160ms, background 160ms; min-width: 0; }
.mf-tile:hover { transform: translateY(-2px); }
.mf-col { display: flex; flex-direction: column-reverse; gap: 2px; border-radius: 8px; overflow: hidden; }
.mf-col i { display: block; width: 100%; }
.mf-month { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; border-radius: 14px; padding: 8px 4px; transition: background 160ms; }
.mf-month:hover { background: var(--fill); }
.mf-rcpt { position: relative; border-radius: 6px 6px 0 0; background: oklch(0.99 0.006 85); padding: 22px 24px 28px; font-family: ui-monospace, "SF Mono", Menlo, monospace; box-shadow: var(--card-shadow); border: 1px solid var(--surface-line); }
.mf-rcpt::after { content: ""; position: absolute; left: 0; right: 0; bottom: -10px; height: 10px; background: linear-gradient(-45deg, transparent 6px, oklch(0.99 0.006 85) 0) 0 0 / 12px 10px, linear-gradient(45deg, transparent 6px, oklch(0.99 0.006 85) 0) 0 0 / 12px 10px; filter: drop-shadow(0 2px 1px oklch(0 0 0 / 0.06)); }
.mf-rl { display: flex; justify-content: space-between; gap: 12px; font-size: 12.5px; padding: 3px 0; }
.mf-rl.sub { padding-left: 14px; color: var(--muted); font-size: 12px; }
.mf-rl.tot { border-top: 1px dashed oklch(0 0 0 / 0.25); margin-top: 6px; padding-top: 8px; font-weight: 800; }
.mf-rl.grand { border-top: 2px solid var(--fg); border-bottom: 2px solid var(--fg); margin-top: 8px; padding: 9px 0; font-size: 15px; font-weight: 800; }
</style>`;

/** The radios and the CSS that shows the picked month's variant (`vv v-<id>`) and lights its chip (`[for=…]`). */
function picker(prefix, ids, def = "yr") {
  const radios = ids.map((id) => `<input type="radio" class="pk-in" name="${prefix}" id="${prefix}-${id}"${id === def ? " checked" : ""}>`).join("");
  const css = `<style>${ids.map((id) => `.${prefix}:has(#${prefix}-${id}:checked) .v-${id} { display: var(--d, block); } .${prefix}:has(#${prefix}-${id}:checked) .mf-chips label[for="${prefix}-${id}"] { background: var(--ink); color: var(--on-ink); }`).join("\n")}</style>`;
  return { radios, css };
}
const chips = (prefix, picks = PICKS) => `<div class="mf-chips">${picks.map((p) => `<label for="${prefix}-${p.id}">${p.label}</label>`).join("")}</div>`;

/** The four answers for a pick, as small figures: came in, spent, invested, left in the bank. */
const answers = (m) => [
  { k: "Came in", v: inr(m.cameIn), s: m.borrowed ? `income · plus ${inrS(m.borrowed)} borrowed, kept apart` : "income", c: COLOR.salary },
  { k: "Spent", v: inr(m.spent), s: `${inrS(m.cash)} of it cash and UPI, worked out`, c: COLOR.card },
  { k: "Invested", v: inr(m.investedNet), s: m.back ? `${inrS(m.invested)} sent · ${inrS(m.back)} back` : `${inrS(m.invested)} sent to brokers`, c: COLOR.invested },
  { k: "Left in the bank", v: signed(m.kept), s: m.kept >= 0 ? "more in the banks than before" : "the banks hold less than before", c: m.kept >= 0 ? COLOR.kept : COLOR.drawn, tone: tone(m.kept) },
];

// ---------- M1 · River ----------
// Sources on the left (and "taken from savings" when the banks fell), the banks in the middle, uses on the right
// (and "left in the bank" when they rose). Band widths are rupees; every band has a hover card.
function river(m, { w = 1460, h = 380 } = {}) {
  const sources = IN_KEYS.filter((k) => m[k] > 0).map((k) => ({ k, v: m[k] }));
  const uses = OUT_KEYS.filter((k) => m[k] > 0).map((k) => ({ k, v: m[k] }));
  if (m.kept > 0) uses.push({ k: "kept", v: m.kept });
  if (m.kept < 0) sources.push({ k: "drawn", v: -m.kept });
  const total = sources.reduce((t, s) => t + s.v, 0);
  const gap = 10, nodeW = 14, bankW = 22;
  const minPad = (list) => list.reduce((t, n) => t + Math.max(0, 18 - n.v * ((h - gap * (list.length - 1)) / total)), 0);
  const scale = (h - gap * (Math.max(sources.length, uses.length) - 1) - Math.max(minPad(sources), minPad(uses))) / total;
  const xL = 210, xB = w / 2 - bankW / 2, xR = w - 230;
  const stack = (list) => { let y = 0; return list.map((n) => { const hh = Math.max(18, n.v * scale); const o = { ...n, y, hh }; y += hh + gap; return o; }); };
  const L1 = stack(sources), R1 = stack(uses);
  const bankH = total * scale;
  const bankTop = (h - bankH) / 2;
  let inY = bankTop, outY = bankTop;
  const band = (x0, y0, x1, y1, hh, color, hatch, card) => {
    const mx = (x0 + x1) / 2;
    const d = `M${x0} ${y0} C${mx} ${y0} ${mx} ${y1} ${x1} ${y1} L${x1} ${y1 + hh} C${mx} ${y1 + hh} ${mx} ${y0 + hh} ${x0} ${y0 + hh} Z`;
    return `<path class="mf-band" d="${d}" fill="${hatch ? "url(#mf-hatch)" : color}" fill-opacity="0.55"><title>${card}</title></path>`;
  };
  const label = (n, side) => {
    const x = side === "l" ? xL - 14 : xR + nodeW + 14;
    const anchor = side === "l" ? "end" : "start";
    const cy = n.y + n.hh / 2;
    const small = n.hh < 26;
    return `<text x="${x}" y="${cy - (small ? -4 : 3)}" text-anchor="${anchor}" font-size="13" font-weight="800" fill="var(--fg)">${NAME[n.k]}${small ? ` <tspan font-weight="700" fill="var(--muted)">${inrS(n.v)}</tspan>` : ""}</text>${small ? "" : `<text x="${x}" y="${cy + 14}" text-anchor="${anchor}" font-size="12" font-weight="700" fill="var(--muted)">${inrS(n.v)}</text>`}`;
  };
  const leftBands = L1.map((n) => { const y1 = inY; inY += n.v * scale; return band(xL + nodeW, n.y, xB, y1, n.v * scale, COLOR[n.k], false, `${NAME[n.k]}: ${inr(n.v)}. ${NOTE[n.k]}`); }).join("");
  const rightBands = R1.map((n) => { const y0 = outY; outY += n.v * scale; return band(xB + bankW, y0, xR, n.y, n.v * scale, COLOR[n.k], n.k === "cash", `${NAME[n.k]}: ${inr(n.v)}. ${NOTE[n.k]}`); }).join("");
  const nodes = [...L1.map((n) => `<rect class="mf-node" x="${xL}" y="${n.y}" width="${nodeW}" height="${n.hh}" rx="4" fill="${COLOR[n.k]}"/>${label(n, "l")}`), ...R1.map((n) => `<rect class="mf-node" x="${xR}" y="${n.y}" width="${nodeW}" height="${n.hh}" rx="4" fill="${n.k === "cash" ? "url(#mf-hatch)" : COLOR[n.k]}"/>${label(n, "r")}`)].join("");
  const bank = `<rect x="${xB}" y="${bankTop}" width="${bankW}" height="${bankH}" rx="7" fill="var(--ink)"/><text x="${xB + bankW / 2}" y="${bankTop - 12}" text-anchor="middle" font-size="12" font-weight="800" fill="var(--fg)">Your banks</text><text x="${xB + bankW / 2}" y="${bankTop + bankH + 20}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--muted)">${inrS(total)} through them</text>`;
  const defs = `<defs><pattern id="mf-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="${COLOR.cash}"/><rect width="4" height="9" fill="color-mix(in oklch, ${COLOR.cash} 45%, white)"/></pattern></defs>`;
  return `<svg class="mf-river" viewBox="0 -24 ${w} ${h + 52}" width="100%" style="display:block;overflow:visible">${defs}${leftBands}${rightBands}${nodes}${bank}</svg>`;
}
function m1Section() {
  const p = "mfa", pk = picker(p, PICKS.map((x) => x.id));
  const panes = PICKS.map((x) => {
    const a = answers(x.m);
    const strip = `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px">${a.map((t, i) => `<div style="display:flex;flex-direction:column;gap:4px;padding:14px 18px;border-radius:18px;${i === 3 && x.m.kept >= 0 ? "background:var(--feature-tile);border:1px solid var(--feature-tile-line)" : "background:var(--fill)"}"><span class="mf-k row" style="gap:7px"><i style="width:9px;height:9px;border-radius:3px;background:${t.c}"></i>${t.k}</span><span class="mf-big" style="font-size:26px;${t.tone ? `color:${t.tone}` : ""}">${t.v}</span><span class="mf-sub">${t.s}</span></div>`).join("")}</div>`;
    return `<div class="vv v-${x.id}" style="--d:flex;flex-direction:column;gap:18px">${strip}${river(x.m)}</div>`;
  }).join("");
  return `${pk.css}<section class="card glass mf ${p}" style="gap:18px">${pk.radios}<div class="card-h"><span class="card-t">Where your money went<small>from where it came, through your banks, to where it went · worked out</small></span>${chips(p)}</div>${panes}<div class="mf-legend"><span>${dot("cash")}Cash and UPI: the balance change no record explains</span><span>Hover a stream for what it is</span><span>Borrowed money is a stream of its own, never income</span></div></section>`;
}

// ---------- M2 · Four answers ----------
// Four big tiles; the picked one opens its months below as stacked columns, split the way that answer splits.
const SPLITS = {
  in: { keys: ["salary", "other", "borrowed", "back"], title: "What came into your banks", note: "Income in green; the loan and money back from brokers apart, since neither is earned" },
  spent: { keys: ["card", "emi", "big", "subs", "cash"], title: "What you spent", note: "Card bills, EMIs, big spends and subscriptions are recorded; cash and UPI is what the balances say left with no record" },
  inv: { keys: ["invested"], neg: ["back"], title: "What you invested", note: "Sent to brokers above the line, what they sent back below it" },
  kept: { keys: ["kept"], title: "What was left in the bank", note: "Each month's change in what the banks hold: above the line they grew, below it they fell" },
};
function monthCols(which, { h = 210 } = {}) {
  const sp = SPLITS[which];
  const val = (m, k) => (k === "kept" ? m.kept : m[k]);
  const ups = BY_MONTH.map((m) => sp.keys.reduce((t, k) => t + Math.max(0, val(m, k)), 0));
  const downs = BY_MONTH.map((m) => (sp.neg ?? []).reduce((t, k) => t + m[k], 0) + (which === "kept" ? Math.max(0, -m.kept) : 0));
  const top = Math.max(...ups, 1), bot = Math.max(...downs, 0);
  const H = h, upH = bot ? H * (top / (top + bot)) : H, dnH = H - upH;
  const col = (m, i) => {
    const segs = sp.keys.map((k) => ({ k, v: Math.max(0, val(m, k)) })).filter((s) => s.v > 0);
    const neg = which === "kept" ? (m.kept < 0 ? [{ k: "drawn", v: -m.kept }] : []) : (sp.neg ?? []).map((k) => ({ k, v: m[k] })).filter((s) => s.v > 0);
    const upPx = (ups[i] / top) * upH, dnPx = bot ? (downs[i] / bot) * dnH : 0;
    const total = which === "kept" ? m.kept : which === "inv" ? m.investedNet : which === "in" ? m.allIn : m.spent;
    const card = W.hc({ h: monFull(m.key), hr: `<b>${which === "kept" ? signed(total) : inr(total)}</b>`, rows: [...segs, ...neg].map((s) => [NAME[s.k], inr(s.v), s.k === "cash" ? COLOR.cash : COLOR[s.k]]), f: sp.note, w: 250 });
    return `<span class="mf-month hov" tabindex="0"><span style="height:${upH}px;width:100%;display:flex;align-items:flex-end;justify-content:center"><span class="mf-col rt-i" style="width:62%;height:${upPx}px">${segs.map((s) => `<i style="flex:${s.v} 1 0;background:${s.k === "cash" ? HATCH(COLOR.cash) : COLOR[s.k]}"></i>`).join("")}</span></span>${bot ? `<span style="height:${dnH}px;width:100%;display:flex;align-items:flex-start;justify-content:center;border-top:1px solid var(--divider)"><span class="mf-col" style="width:62%;height:${dnPx}px;flex-direction:column">${neg.map((s) => `<i style="flex:${s.v} 1 0;background:${COLOR[s.k]}"></i>`).join("")}</span></span>` : ""}<b style="font-size:12px">${monName(m.key)}</b><span style="font-size:11.5px;font-weight:800;color:${which === "kept" ? tone(total) : "var(--muted)"}">${which === "kept" ? sg(total) : inrS(total)}</span>${W.tip(card, { w: 250, x: "c", y: "up" })}</span>`;
  };
  const legend = [...sp.keys, ...(sp.neg ?? []), ...(which === "kept" ? ["drawn"] : [])].map((k) => `<span>${dot(k)}${NAME[k]}</span>`).join("");
  return `<div style="display:flex;flex-direction:column;gap:12px"><div class="between"><span class="card-t" style="font-size:14px">${sp.title}, month by month</span><span class="mf-legend">${legend}</span></div><div style="display:grid;grid-template-columns:repeat(${BY_MONTH.length},minmax(0,1fr));gap:6px;align-items:end">${BY_MONTH.map(col).join("")}</div><span class="mf-sub">${sp.note}. Hover a month for its parts.</span></div>`;
}
export function m2Section() {
  const p = "mfb", pk = picker(p, ["in", "spent", "inv", "kept"], "spent");
  const y = YEAR_T;
  const bar = (keys) => `<span class="mf-bar">${keys.filter((k) => y[k] > 0).map((k) => `<i style="flex:${y[k]} 1 0;background:${k === "cash" ? HATCH(COLOR.cash) : COLOR[k]}"></i>`).join("")}</span>`;
  const rows = (keys) => keys.filter((k) => y[k] > 0).map((k) => `<span class="mf-row">${dot(k)}${NAME[k]}<b>${inrS(y[k])}</b></span>`).join("");
  const tile = (id, k, v, sub, inner, { feat = false, vTone = "" } = {}) => `<label for="${p}-${id}" class="mf-tile rt-i" style="${feat ? "background:var(--feature-tile);border:1px solid var(--feature-tile-line)" : ""}"><span class="mf-k">${k}</span><span class="mf-big" style="${vTone ? `color:${vTone}` : ""}">${v}</span><span class="mf-sub">${sub}</span>${inner}</label>`;
  const tiles = `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px">${[
    tile("in", "Came in", inr(y.cameIn), `income · <b style="color:var(--fg)">${inrS(y.borrowed)}</b> borrowed and <b style="color:var(--fg)">${inrS(y.back)}</b> back from brokers on top`, `${bar(["salary", "other", "borrowed", "back"])}${rows(["salary", "other", "borrowed"])}`),
    tile("spent", "Spent", inr(y.spent), "recorded, plus cash and UPI worked out", `${bar(SPENT_KEYS)}${rows(["card", "emi", "big", "cash"])}`),
    tile("inv", "Invested", inr(y.investedNet), `${inrS(y.invested)} sent · ${inrS(y.back)} back`, `${bar(["invested", "back"])}<span class="mf-row">${dot("invested")}Sent from the loan<b>${inrS(1100 * K)}</b></span><span class="mf-row">${dot("invested")}Sent from your money<b>${inrS(y.invested - 1100 * K)}</b></span><span class="mf-row">${dot("back")}Back from brokers<b>−${inrS(y.back)}</b></span>`),
    tile("kept", "Left in the bank", signed(y.kept), `the banks: ${inrS(START)} on Jan 1, ${inrS(START + y.kept)} now`, `<span class="mf-row">${dot("lent")}Lent to people<b>${inrS(y.lent)}</b></span><span class="mf-row" style="color:var(--muted)">Matches your balances, to the rupee</span>`, { feat: y.kept >= 0, vTone: tone(y.kept) }),
  ].join("")}</div>`;
  const ring = `<style>${["in", "spent", "inv", "kept"].map((id) => `.${p}:has(#${p}-${id}:checked) label[for="${p}-${id}"].mf-tile { box-shadow: 0 0 0 2.5px var(--surface), 0 0 0 5px var(--ink); background: var(--surface); }`).join("")}</style>`;
  const panes = ["in", "spent", "inv", "kept"].map((id) => `<div class="vv v-${id}">${monthCols(id)}</div>`).join("");
  return `${pk.css}${ring}<section class="card glass mf ${p}" style="gap:20px">${pk.radios}<div class="card-h"><span class="card-t">This year, in four answers<small>pick one to see its months · worked out from your records and balances</small></span><span class="sample">Pick a tile</span></div>${tiles}${panes}</section>`;
}

// ---------- M3 · Receipt ----------
// The month ribbon on the left (money in above the line, out below, the bank balance as a line through it); the picked
// month, or the year, as a till receipt on the right that always ends on what the banks hold.
function receipt(x) {
  const m = x.m;
  const line = (k, v, cls = "") => `<div class="mf-rl ${cls}"><span>${k}</span><span>${v}</span></div>`;
  const neg = (n) => (n ? `−${inr(n).replace("−", "")}` : "₹0");
  return `<div class="mf-rcpt"><div style="text-align:center;font-weight:800;font-size:13px;letter-spacing:0.12em">CHAICOFFEEFUND · BANKS</div><div style="text-align:center;font-size:11px;color:var(--muted);margin:4px 0 14px">${x.when.toUpperCase()} · ALL ACCOUNTS</div>
${line("Salary", inr(m.salary))}${m.other ? line("Other income", inr(m.other)) : ""}${line("CAME IN", inr(m.cameIn), "tot")}
${m.borrowed ? line("Borrowed (loan)", inr(m.borrowed)) : ""}${m.back ? line("Back from brokers", inr(m.back)) : ""}
${line("Card bills", neg(m.card), "sub")}${line("EMIs", neg(m.emi), "sub")}${m.big ? line("Big spends", neg(m.big), "sub") : ""}${line("Cash and UPI *", neg(m.cash), "sub")}${line("SPENT", neg(m.spent), "tot")}
${line("Invested", neg(m.invested))}${m.lent ? line("Lent to people", neg(m.lent)) : ""}
${line("LEFT IN THE BANK", signed(m.kept), "grand")}
<div style="font-size:10.5px;color:var(--muted);margin-top:12px;line-height:1.5">* No record explains it: the balances moved by this much. UPI to people and shops, and cash.</div></div>`;
}
function ribbon(p, { w = 860, h = 270, lineH = 74 } = {}) {
  const n = BY_MONTH.length, cw = w / n;
  // One month (the loan) would flatten the rest: the scale stops at 1.5 times the next biggest, and that bar is cut with a break mark.
  const capOf = (vals) => { const s2 = [...vals].sort((x, y) => y - x); return Math.min(s2[0], (s2[1] || s2[0]) * 1.5); };
  const capIn = capOf(BY_MONTH.map((m) => m.allIn)), capOut = capOf(BY_MONTH.map((m) => m.out));
  const mid = h * (capIn / (capIn + capOut)), sIn = mid / capIn, sOut = (h - mid) / capOut;
  const cols = BY_MONTH.map((m, i) => {
    const x = i * cw + cw * 0.22, bw = cw * 0.56;
    const fIn = Math.min(1, capIn / m.allIn), fOut = Math.min(1, capOut / m.out);
    let y = mid;
    const inSegs = IN_KEYS.filter((k) => m[k] > 0).map((k) => { const hh = m[k] * sIn * fIn; y -= hh; return `<rect x="${x}" y="${y}" width="${bw}" height="${hh}" fill="${COLOR[k]}"/>`; }).join("");
    let y2 = mid;
    const outSegs = OUT_KEYS.filter((k) => m[k] > 0).map((k) => { const hh = m[k] * sOut * fOut; const r = `<rect x="${x}" y="${y2}" width="${bw}" height="${hh}" fill="${k === "cash" ? "url(#mf-hatch3)" : COLOR[k]}"/>`; y2 += hh; return r; }).join("");
    const brk = (yy) => `<path d="M${x - 3} ${yy + 4} l${bw / 4 + 1.5} -6 l${bw / 4} 6 l${bw / 4} -6 l${bw / 4 + 1.5} 6" fill="none" stroke="var(--surface)" stroke-width="5"/>`;
    const tops = `${fIn < 1 ? `${brk(mid - capIn * sIn * 0.55)}<text x="${x + bw / 2}" y="${y - 8}" text-anchor="middle" font-size="11" font-weight="800" fill="var(--fg)">${inrS(m.allIn)} in</text>` : ""}${fOut < 1 ? `${brk(mid + capOut * sOut * 0.55)}<text x="${x + bw / 2}" y="${y2 - 10}" text-anchor="middle" font-size="11" font-weight="800" fill="white">${inrS(m.out)} out</text>` : ""}`;
    return `<g>${inSegs}${outSegs}${tops}</g>`;
  }).join("");
  const defs = `<defs><pattern id="mf-hatch3" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="${COLOR.cash}"/><rect width="3.5" height="8" fill="color-mix(in oklch, ${COLOR.cash} 45%, white)"/></pattern></defs>`;
  // What the banks hold, on its own strip above: the month-end balances.
  const bals = balAfter, bLo = Math.min(START, ...bals), bHi = Math.max(START, ...bals);
  const by = (b) => 10 + (1 - (b - bLo) / (bHi - bLo || 1)) * (lineH - 22);
  const pts = bals.map((b, i) => [i * cw + cw / 2, by(b)]);
  const path = pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" ");
  const line = `<svg viewBox="0 0 ${w} ${lineH}" width="100%" style="display:block;overflow:visible"><path d="${path} L${pts.at(-1)[0]} ${lineH} L${pts[0][0]} ${lineH} Z" fill="var(--fill)"/><path d="${path}" fill="none" stroke="var(--fg)" stroke-width="2" opacity="0.8"/>${pts.map((q, i) => `<circle cx="${q[0]}" cy="${q[1]}" r="3.5" fill="var(--surface)" stroke="var(--fg)" stroke-width="2"/><text x="${q[0]}" y="${q[1] - 8}" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--muted)">${inrS(bals[i])}</text>`).join("")}</svg>`;
  const months = BY_MONTH.map((m, i) => `<label for="${p}-${m.key.slice(5)}" style="position:absolute;left:${(i / n) * 100}%;width:${100 / n}%;text-align:center;font-size:12px;font-weight:800;cursor:pointer;padding:4px 0;border-radius:999px">${monName(m.key)}</label>`).join("");
  // A layer of month columns over the chart: each picks its month, and hovering it shades the column.
  const hits = BY_MONTH.map((m, i) => `<label for="${p}-${m.key.slice(5)}" class="mf-hit hov" tabindex="0" style="position:absolute;top:0;bottom:0;left:${(i / n) * 100}%;width:${100 / n}%;border-radius:12px;cursor:pointer">${W.tip(W.hc({ h: monFull(m.key), hr: `<b style="color:${tone(m.kept)}">${signed(m.kept)}</b>`, rows: [["Came in", inr(m.cameIn), COLOR.salary], ...(m.borrowed ? [["Borrowed", inr(m.borrowed), COLOR.borrowed]] : []), ...(m.back ? [["Back from brokers", inr(m.back), COLOR.back]] : []), ["Spent", inr(m.spent), COLOR.card], ["Invested", inr(m.invested), COLOR.invested], ...(m.lent ? [["Lent", inr(m.lent), COLOR.lent]] : [])], f: "Click to itemise it on the receipt", w: 230 }), { w: 230, x: "c", y: "up" })}</label>`).join("");
  return `<div style="display:flex;flex-direction:column;gap:6px"><span class="mf-k">What the banks hold, each month end</span>${line}<div style="position:relative;margin-top:10px"><div style="position:absolute;inset:0 0 34px 0;z-index:2">${hits}</div><svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block;overflow:visible;position:relative;z-index:1">${defs}<line x1="0" x2="${w}" y1="${mid}" y2="${mid}" stroke="var(--divider)" stroke-width="1.5"/><text x="2" y="${mid - 6}" font-size="10.5" font-weight="800" fill="var(--muted)">IN</text><text x="2" y="${mid + 15}" font-size="10.5" font-weight="800" fill="var(--muted)">OUT</text>${cols}</svg><div class="mf-mlabels" style="position:relative;height:28px;margin-top:6px">${months}</div></div></div>`;
}
function m3Section() {
  const p = "mfc", pk = picker(p, PICKS.map((x) => x.id));
  const hi = `<style>${BY_MONTH.map((m) => `.${p}:has(#${p}-${m.key.slice(5)}:checked) .mf-mlabels label[for="${p}-${m.key.slice(5)}"] { background: var(--ink); color: var(--on-ink); } .${p}:has(#${p}-${m.key.slice(5)}:checked) label.mf-hit[for="${p}-${m.key.slice(5)}"] { background: oklch(0 0 0 / 0.06); box-shadow: inset 0 0 0 2px oklch(0 0 0 / 0.12); }`).join("")} .${p} label.mf-hit:hover { background: oklch(0 0 0 / 0.04); }</style>`;
  const legend = `<div class="mf-legend">${["salary", "other", "borrowed", "back"].map((k) => `<span>${dot(k)}${NAME[k]}</span>`).join("")}<span style="color:var(--fg)">· above the line in, below it out ·</span>${OUT_KEYS.filter((k) => k !== "subs").map((k) => `<span>${dot(k)}${NAME[k]}</span>`).join("")}</div>`;
  const left = `<div style="display:flex;flex-direction:column;gap:14px;min-width:0"><div class="between"><span class="card-t">Month by month<small>pick a month, or the year</small></span><div class="mf-chips"><label for="${p}-yr">This year</label></div></div>${ribbon(p)}${legend}</div>`;
  const right = `<div>${PICKS.map((x) => `<div class="vv v-${x.id}">${receipt(x)}</div>`).join("")}</div>`;
  return `${pk.css}${hi}<section class="card glass mf ${p}" style="gap:18px">${pk.radios}<div class="card-h"><span class="card-t">Your money, itemised<small>every rupee that came into and left your banks · worked out</small></span></div><div style="display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:28px;align-items:start">${left}${right}</div></section>`;
}

// ---------- The pages ----------
const IDEAS = {
  M1: ["River", "Where the money came from, through your banks, to where it went. The four answers sit on top; pick the year or a month."],
  M2: ["Four answers", "Came in, spent, invested and left in the bank as four big tiles; pick one and its months open below, split the way it splits."],
  M3: ["Receipt", "A month ribbon (in above the line, out below, the bank balance through it) beside a till receipt that always ends on what the banks hold."],
};
const SECTIONS = { M1: m1Section, M2: m2Section, M3: m3Section };
function page(id) {
  const p = `m18${id.toLowerCase()}`, pk = P.picker(p, Z1.heroSel);
  const hist = P.historyCard(p, { n: 8, spread: true, fill: W.trendFill });
  const body = [cols("1fr 1fr", R.mixBlocks(p), hist), SECTIONS[id](), cols("1fr", W.coming(p))].join("");
  const [name, idea] = IDEAS[id];
  return L.desktop({ h: "auto", body: `${C.DEFS()}${ANIM}${W.WCSS}${S.CSS(p)}${CSS2(p)}${R.RT}${CSS}${pk.css}${pk.open}${tag(id, name, `${idea} It replaces This year in and out, Over time and Money in and out. Sample data, made up.`)}${R.pointGreeting()}${h4Stage(p)}${body}<div aria-hidden="true" style="height:140px;flex-shrink:0"></div>${pk.close}` });
}

/** The sums the sample must keep: in − out = the balance change, month by month and for the year. */
export function checks() {
  for (const m of [...BY_MONTH, YEAR_T]) {
    const lhs = m.allIn - m.out;
    if (lhs !== m.kept) throw new Error(`r18: ${m.key ?? "year"} doesn't add up`);
  }
  if (balAfter.at(-1) !== START + YEAR_T.kept) throw new Error("r18: the balance line drifts from the year's change");
  return { year: YEAR_T, end: balAfter.at(-1) };
}
checks();

export const R18_DESKTOPS = [
  { file: "AccountsMoneyM1.dc.html", w: 1600, render: () => page("M1") },
  { file: "AccountsMoneyM2.dc.html", w: 1600, render: () => page("M2") },
  { file: "AccountsMoneyM3.dc.html", w: 1600, render: () => page("M3") },
];
