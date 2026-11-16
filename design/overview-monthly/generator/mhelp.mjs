// Shared bits of the multi-year boards (round 2): ranges, the range picker, and one calendar year's row of cells.
import { MEASURES, LAST, seriesFor } from "./data.mjs";
import { cell, inr, inrC, MON, mi } from "./boards.mjs";

export const RANGES = [["12", "Last 12 months", 12], ["24", "Last 2 years", 24], ["36", "Last 3 years", 36]];
export const rangeLabel = (keys) => `${MON[mi(keys[0])]} ${keys[0].slice(0, 4)} to ${MON[mi(keys.at(-1))]} ${keys.at(-1).slice(0, 4)}`;
export const seriesOf = (keys) => MEASURES.map((m) => seriesFor(m, keys));
export const seg = `<div class="seg">${RANGES.map(([r, l]) => `<input type="radio" name="yr" id="y-${r}"${r === "36" ? " checked" : ""}><label for="y-${r}">${l}</label>`).join("")}<label class="off" title="Pick any two months, as on Cards">Custom…</label></div>`;
export const chip = (keys, label) => `<span class="rangechip">${label} <small>${rangeLabel(keys)}</small></span>`;
export const GRID_C = 'style="grid-template-columns:38px repeat(12,minmax(0,1fr)) 170px"';
/** Average a month of the months that have data in a calendar year of the range. */
export const yearAvg = (s, y) => { const have = s.cells.filter((c) => c.month.startsWith(y) && c.amount !== null); return { y, n: have.length, avg: have.length ? have.reduce((t, c) => t + c.amount, 0) / have.length : null }; };

/** The months of one calendar year inside a range: a cell for each, blank where the range doesn't reach (as Cards does). */
export function yearRow(s, year, { h = "h40", caption = false, grid = "" } = {}) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const k = `${year}-${String(i + 1).padStart(2, "0")}`;
    const c = s.cells.find((x) => x.month === k);
    return c ? cell(s, c, { extra: h, caption }) : `<div class="mh ${h} ${k > LAST ? "up" : "out"}"></div>`;
  }).join("");
  const have = s.cells.filter((c) => c.month.startsWith(year) && c.amount !== null);
  const total = have.reduce((t, c) => t + c.amount, 0);
  const right = have.length
    ? `<div class="tot"><b>${inr(total)}</b><span>${have.length} ${have.length === 1 ? "month" : "months"} · avg ${inrC(total / have.length)}</span></div>`
    : `<div class="tot"><span>Nothing recorded</span></div>`;
  return `<div class="y-inner" ${grid}><span class="yl">${year}</span>${months}${right}</div>`;
}
