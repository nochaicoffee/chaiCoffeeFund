// Multi-year D: five bar cards of 36 bars, with each year's usual month as a dashed step.
import { LAST, yearsOf, lastN } from "./data.mjs";
import { icon, header, tone, pctText, inrC, mShort, MONTH, mi, tip } from "./boards.mjs";
import { seriesOf, chip } from "./mhelp.mjs";

export function sectionD() {
  const keys = lastN(36), ss = seriesOf(keys), yrs = yearsOf(keys);
  const cards = ss.map((s, i) => {
    const bars = s.cells.map((c) => {
      if (c.amount === null) return `<div class="bar none" data-tip="${tip(s, c)}"></div>`;
      const pk = s.peak.month === c.month, nw = c.month === LAST;
      return `<div class="bar${pk ? " pk" : ""}${nw ? " nw" : ""}" style="height:${((c.amount / s.max) * 100).toFixed(1)}%" data-tip="${tip(s, c)}">${nw || (pk && s.cells.indexOf(c) < s.cells.length - 3) ? `<span class="blab">${inrC(c.amount)}</span>` : ""}</div>`;
    }).join("");
    const avgs = yrs.map((y) => {
      const idx = keys.map((k, j) => [k, j]).filter(([k]) => k.startsWith(y)).map(([, j]) => j);
      const have = idx.filter((j) => s.cells[j].amount !== null);
      if (!have.length) return "";
      const a = have.reduce((t, j) => t + s.cells[j].amount, 0) / have.length;
      return `<div class="yavg" style="left:${(idx[0] / 36) * 100}%;width:${(idx.length / 36) * 100}%;bottom:${((a / s.max) * 100).toFixed(1)}%"></div>`;
    }).join("");
    const labels = yrs.map((y) => { const n = keys.filter((k) => k.startsWith(y)).length; return `<span style="grid-column:span ${n}">${n >= 4 ? y : ""}</span>`; }).join("");
    return `<div style="grid-column:span ${i > 2 ? 3 : 2}" class="m-${s.k}"><div class="mc d-card"><div class="hd">${icon(s)}<div class="nm">${s.name}<small>${s.word}</small></div><div class="t"><b>${inrC(s.total)}</b><span>in 3 years</span></div></div>
      <div class="long-bars" style="margin-top:14px">${bars}${avgs}</div><div class="ylabels">${labels}</div>
      <div class="between"><div class="mfoot">Dashed: each year's usual month · peak <b>${mShort(s.peak.month)} ’${s.peak.month.slice(2, 4)}</b></div><span class="delta ${tone(s, s.last.vsAvg)}">${MONTH[mi(LAST)]} ${pctText(s.last.vsAvg)}</span></div></div></div>`;
  }).join("");
  return `${header("Thirty-six months, five scales", `The dashed line steps with each year's usual month, so a rise or fall across years shows without reading a number.`, chip(keys, "Last 3 years"))}<div class="d-grid dd">${cards}</div>`;
}
