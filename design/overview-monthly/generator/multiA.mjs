// Multi-year A: five heatmaps, years as rows, with a working range picker (12 months, 2 years, 3 years).
import { yearsOf, lastN } from "./data.mjs";
import { icon, wrap, header, MON } from "./boards.mjs";
import { RANGES, seriesOf, seg, yearRow } from "./mhelp.mjs";

export function sectionA() {
  const blocks = RANGES.map(([r, , n]) => {
    const keys = lastN(n), ss = seriesOf(keys), yrs = yearsOf(keys);
    return `<div class="yr-r${r} y-stack">${ss.map((s) => wrap(s, `<div class="mc y-card"><div class="lh row" style="gap:10px">${icon(s)}<div class="nm">${s.name}<small>${s.months ? `${s.months} of ${keys.length} months` : "nothing recorded"}</small></div></div><div class="y-rows">${yrs.map((y) => yearRow(s, y)).join("")}</div></div>`)).join("")}</div>`;
  }).join("");
  return `${header("Where each month's money went", `Pick a range. Each measure keeps a row per year it touches, shaded on its own scale for that range; months outside the range stay blank.`, seg)}
    <div class="y-head"><span></span><div class="y-inner"><span></span>${MON.map((m) => `<span>${m}</span>`).join("")}<span>Total in range</span></div></div>${blocks}`;
}
