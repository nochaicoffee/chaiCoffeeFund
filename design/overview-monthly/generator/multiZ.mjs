// Round 3 (2026-11-16): the mix, after Prathik's answers.
//   He picked C (one heatmap, five buttons) and wanted everything together to compare. Answers: all five together up to 12 months;
//   a button focuses one measure at any range; the range is the dashboard's own and drives the whole page.
//     Last 12 months, This year : "All five" (five side by side, one row each) or any one measure on its own
//     Last 2 years, Last 3 years: one measure at a time (C); "All five" goes dim
import { MEASURES, LAST, LONG_KEYS, lastN, yearsOf } from "./data.mjs";
import { cell, icon, wrap, legend, tone, pctText, inr, inrC, mShort, MON, MONTH, mi } from "./boards.mjs";
import { MONTHS } from "../../expenses/generator/data.mjs";
import { seriesOf, rangeLabel, yearAvg, yearRow, GRID_C } from "./mhelp.mjs";

const TY = LONG_KEYS.filter((k) => k.startsWith("2026"));
const KEYS_OF = { "12": lastN(12), ty: TY, "24": lastN(24), "36": lastN(36) };
const RANGES = [["12", "Last 12 months"], ["ty", "This year"], ["24", "Last 2 years"], ["36", "Last 3 years"]];
const mLab = (k, i) => (i === 0 || k.endsWith("-01") ? `${MON[mi(k)]} ’${k.slice(2, 4)}` : MON[mi(k)]);
const totalCell = (s) => `<div class="tot"><b>${inr(s.total)}</b><span>${s.months} ${s.months === 1 ? "month" : "months"} · avg ${inrC(s.avg)}</span></div>`;
const seg = `<div class="seg">${RANGES.map(([r, l]) => `<input type="radio" name="zr" id="r-${r}"${r === "12" ? " checked" : ""}><label for="r-${r}">${l}</label>`).join("")}<label class="off" title="Pick any two months, as on Cards">Custom…</label></div>`;

/** "All five": one row of months for each measure (12 months rolling, or this calendar year with the months to come dashed). */
export function compareOne(id, keys, calendar) {
  const ss = seriesOf(keys);
  const labels = calendar ? MON.map((m, i) => [m, i === mi(LAST)]) : keys.map((k, i) => [mLab(k, i), k === LAST]);
  const head = `<div class="a-head"><span></span>${labels.map(([l, now]) => `<span class="${now ? "now" : ""}">${l}</span>`).join("")}<span>${calendar ? "This year" : "12 months"}</span></div>`;
  const rows = ss.map((s) => {
    const cells = calendar
      ? Array.from({ length: 12 }, (_, i) => { const c = s.cells.find((x) => mi(x.month) === i); return c ? cell(s, c) : `<div class="mh up"></div>`; }).join("")
      : s.cells.map((c) => cell(s, c)).join("");
    return wrap(s, `<div class="a-row mc"><div class="lh">${icon(s)}<div class="nm">${s.name}<small>${s.word}</small></div></div>${cells}${totalCell(s)}</div>`);
  }).join("");
  return `<div class="pz pz-${id}-all">${head}<div class="a-stack">${rows}</div></div>`;
}

/** One measure over a range: the C panel (a row per year, totals, the year-on-year line). */
function focusPanel(r, s) {
  const keys = KEYS_OF[r], yrs = yearsOf(keys);
  const per = yrs.map((y) => yearAvg(s, y)).filter((x) => x.n > 0);
  const yoy = per.map((x, i) => { const p = per[i - 1]; const f = p && p.n >= 3 && x.n >= 3 ? (x.avg - p.avg) / p.avg : null; return `<div><span>${x.y}${x.n < 12 ? ` · ${x.n} months` : ""}</span><b>${inrC(x.avg)} a month${f === null ? "" : `<em class="${tone(s, f)}">${pctText(f)}</em>`}</b></div>`; }).join("");
  const label = RANGES.find(([k]) => k === r)[1];
  return `<div class="pz pz-${r}-${s.k} m-${s.k}"><div class="mc" style="box-shadow:var(--card-shadow)">
    <div class="between" style="margin-bottom:14px"><div class="row">${icon(s)}<div class="nm" style="font-size:15px">${s.name} heatmap<small>${s.word} · ${label.toLowerCase()}, ${rangeLabel(keys)}</small></div></div>${legend(s.hue)}<span class="go">Open ${s.page}</span></div>
    <div class="y-head" style="padding:0;margin-bottom:6px;grid-template-columns:minmax(0,1fr)"><div class="y-inner" ${GRID_C}><span></span>${MON.map((m) => `<span>${m}</span>`).join("")}<span>Total</span></div></div>
    <div class="y-rows">${yrs.map((y) => yearRow(s, y, { h: "h46", caption: true, grid: GRID_C })).join("")}</div>
    <div class="c-stats" style="grid-template-columns:repeat(3,minmax(0,1fr)) auto"><div><b>${inr(s.total)}</b><span>${s.months} ${s.months === 1 ? "month" : "months"} in range</span></div><div><b>${mShort(s.peak.month)} ${s.peak.month.slice(0, 4)} · ${inrC(s.peak.amount)}</b><span>highest month</span></div><div><b>${mShort(s.min.month)} ${s.min.month.slice(0, 4)} · ${inrC(s.min.amount)}</b><span>lowest month</span></div><div class="yoy">${yoy}</div></div>
  </div></div>`;
}

const GRID_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>';

function sectionZ() {
  const ssL = seriesOf(KEYS_OF["36"]);
  const chips = `<input type="radio" name="zt" id="t-all" checked><label for="t-all" class="c-tab t-all"><span class="icn sm">${GRID_ICON}</span><div class="nm">All five</div><div class="v">together<small>compare</small></div></label>` +
    ssL.map((s) => `<input type="radio" name="zt" id="t-${s.k}"><label for="t-${s.k}" class="c-tab t-${s.k} m-${s.k}">${icon(s, true)}<div class="nm">${s.name}</div><div class="v">${inrC(s.last.amount)}<small>${MONTH[mi(LAST)]}</small></div></label>`).join("");
  const panels = [compareOne("12", KEYS_OF["12"], false), compareOne("ty", TY, true), ...RANGES.flatMap(([r]) => ssL.map((s) => focusPanel(r, seriesOf(KEYS_OF[r]).find((x) => x.k === s.k))))].join("");
  return `<div class="sec-h"><div><div class="eyebrow">Month by month</div><h2>Where each month's money went</h2></div><div class="z-page"><span class="lbl">Dashboard range</span>${seg}<span class="note">The range is the dashboard's, so it also moves net worth and the tiles.</span></div></div>
    <div class="z-chips">${chips}</div>
    <div class="z-hint"><i class="dot"></i><span class="h-all"><b>All five side by side</b>, so the months line up. Click one to look at it on its own.</span><span class="h-one"><b>One measure.</b> Click <b>All five</b> to put them back together.</span><span class="h-long"><b>Over a year, five at once is too much.</b> One measure at a time; <b>All five</b> comes back on a shorter range.</span></div>
    ${panels}`;
}

// ---------- The page around it: the range sits at the top and drives everything ----------
// Every tile keeps its headline (a balance is what it is at the end of the range) and gains a line for what happened inside the range.
// "Spent" and "Income" are the range's own totals and match the widget. Made-up figures, consistent with the widget's.
const SPENT = MONTHS.slice(-12).reduce((t, m) => t + m.spent, 0);
const TILES = [
  ["Accounts", "₹6.51L", "up ₹1.9L over the range", 1], ["Investments", "₹30.69L", "up ₹9.5L: ₹6.75L put in, ₹2.8L growth", 1], ["Fixed income", "₹14.60L", "₹0.9L interest earned", 1], ["Lent out", "₹12.96L", "₹2.2L earned", 1],
  ["Cards", "−₹68,400", "₹9.19L paid in bills", 1], ["Loans", "−₹38.50L", "₹67k paid in EMIs", 1], ["Income", "₹24.77L", "in the range · avg ₹2.1L a month", 1], ["Subscriptions", "₹4,820 a month", "₹58k paid in the range", 1],
  ["Goals", "₹3.70L", "₹1.4L added in the range", 1], ["Insurance", "₹1.10Cr cover", "₹24.6k in premiums", 1], ["Due this month", "₹1.21L", "forward-looking, so always this month", 0], ["Spent", inrC(SPENT), "in the range · avg " + inrC(SPENT / 12) + " a month", 1],
];
function sectionPage() {
  const tiles = TILES.map(([t, h, line, r]) => `<div class="rt${r ? " on" : ""}"><span class="nowtag${r ? " on" : ""}">${r ? "follows range" : "always now"}</span><div class="n">${t}</div><div class="h">${h}</div><div class="l">${line}</div></div>`).join("");
  const widget = compareOne("12", KEYS_OF["12"], false).replace('class="pz ', 'style="display:flex" class="pz ');
  return `<div class="pg-head"><div><div class="eyebrow">Overview · Nov 2025 to Oct 2026</div><h1>Good afternoon, Prathik</h1><p>Over these 12 months you took in <b>₹24.77L</b> and spent <b>${inrC(SPENT)}</b>, and you're worth <b>₹25,57,193</b>, up <b>₹10.09L</b> since November 2025. <span class="muted">(The greeting's figures follow the range too.)</span></p></div>
      <div class="pg-range"><span class="lbl">Dashboard range · same selector as Cards</span>${seg.replace(/ id="r-/g, ' id="pg-r-').replace(/for="r-/g, 'for="pg-r-').replace(/name="zr"/g, 'name="pgr"')}</div></div>
    <div class="ghost stage follows" data-tag="follows range" style="height:150px">Net worth at the end of the range; the trend line runs over it, and the change reads "since Nov 2025"</div>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px">${tiles}</div>
    <div class="slot"><span class="slot-tag">This widget · follows the range</span><div style="display:flex;flex-direction:column;gap:16px;padding:6px 0"><div class="sec-h"><div><div class="eyebrow">Month by month</div><h2>Where each month's money went</h2></div></div>${widget}</div></div>
    <div class="ghost" style="height:110px;margin-top:6px">Eight things, Future you, Coming up: forward-looking, so they stay on now (always now)</div>`;
}

export const BOARDS3 = [
  { file: "MzA.dc.html", w: 1480, page: "r3", minH: 740, cap: ["The mix · all five up to a year, then one at a time", "Pick a range. A button focuses one measure at any range; \"All five\" works up to 12 months and goes dim past it."], body: sectionZ, cls: "mo-z" },
  { file: "MzB.dc.html", w: 1480, page: "r3", cap: ["On the page · the range drives everything", "Everything follows the range: the greeting, net worth, the tiles and the widget. The two forward-looking parts are tagged always now."], body: sectionPage, cls: "mo-z" },
];
export const PAGES3 = [{ id: "r3", name: "Round 3 · C picked, mixed with A: all five together up to a year, one at a time past it, and the range at the top of the dashboard" }];
export const NOTES3 = [{ page: "r3", text: "Round 3 (2026-11-16), Prathik's answers: all five together up to 12 months; a button focuses one measure at any range; the range is the whole dashboard's. Last 12 months and This year show 'All five' (one row each) or any one measure; Last 2 years and Last 3 years show one measure at a time and 'All five' goes dim. MzB proposes which Overview parts follow the range." }];
