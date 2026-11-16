// Multi-year C: one heatmap with five tabs, years as rows, and a year-on-year line.
import { LAST, yearsOf, lastN } from "./data.mjs";
import { icon, header, legend, tone, pctText, inr, inrC, mShort, MON, MONTH, mi } from "./boards.mjs";
import { seriesOf, chip, rangeLabel, yearAvg, yearRow, GRID_C } from "./mhelp.mjs";

export function sectionC() {
  const keys = lastN(36), ss = seriesOf(keys), yrs = yearsOf(keys);
  const tabs = ss.map((s, i) => `<input type="radio" name="ctab" id="c-${s.k}"${i === 0 ? " checked" : ""}><label for="c-${s.k}" class="c-tab t-${s.k} m-${s.k}">${icon(s, true)}<div class="nm">${s.name}</div><div class="v">${inrC(s.last.amount)}<small>${MONTH[mi(LAST)]}</small></div></label>`).join("");
  const panels = ss.map((s) => {
    const per = yrs.map((y) => yearAvg(s, y)).filter((x) => x.n > 0);
    const yoy = per.map((x, i) => { const p = per[i - 1]; const f = p && p.n >= 3 && x.n >= 3 ? (x.avg - p.avg) / p.avg : null; return `<div><span>${x.y}${x.n < 12 ? ` · ${x.n} months` : ""}</span><b>${inrC(x.avg)} a month${f === null ? "" : `<em class="${tone(s, f)}">${pctText(f)}</em>`}</b></div>`; }).join("");
    return `<div class="c-panel p-${s.k} m-${s.k}"><div class="mc" style="box-shadow:var(--card-shadow)">
      <div class="between" style="margin-bottom:14px"><div class="row">${icon(s)}<div class="nm" style="font-size:15px">${s.name} heatmap<small>${s.word} · ${rangeLabel(keys)}</small></div></div>${legend(s.hue)}<span class="go">Open ${s.page}</span></div>
      <div class="y-head" style="padding:0;margin-bottom:6px;grid-template-columns:minmax(0,1fr)"><div class="y-inner" ${GRID_C}><span></span>${MON.map((m) => `<span>${m}</span>`).join("")}<span>Total</span></div></div>
      <div class="y-rows">${yrs.map((y) => yearRow(s, y, { h: "h46", caption: true, grid: GRID_C })).join("")}</div>
      <div class="c-stats" style="grid-template-columns:repeat(3,minmax(0,1fr)) auto"><div><b>${inr(s.total)}</b><span>${s.months} months in range</span></div><div><b>${mShort(s.peak.month)} ${s.peak.month.slice(0, 4)} · ${inrC(s.peak.amount)}</b><span>highest month</span></div><div><b>${mShort(s.min.month)} ${s.min.month.slice(0, 4)} · ${inrC(s.min.amount)}</b><span>lowest month</span></div><div class="yoy">${yoy}</div></div>
    </div></div>`;
  }).join("");
  return `${header("One heatmap, five measures", `The Cards heatmap exactly: a row per year, a total on the right, and a year-on-year line beneath so you can read the direction.`, chip(keys, "Last 3 years"))}<div class="c-tabs">${tabs}</div>${panels}`;
}
