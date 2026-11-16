// Multi-year B: five tiles, each with a small row of twelve squares per year.
import { LAST, yearsOf, lastN } from "./data.mjs";
import { cell, icon, wrap, header, tone, pctText, vsText, inrC, MON, MONTH, mi } from "./boards.mjs";
import { seriesOf, chip, yearAvg } from "./mhelp.mjs";

export function sectionB() {
  const keys = lastN(36), ss = seriesOf(keys), yrs = yearsOf(keys);
  const tiles = ss.map((s) => {
    const f = s.last.vsAvg;
    const byYear = yrs.map((y) => yearAvg(s, y)).filter((x) => x.n >= 3).slice(-3);
    const rows = yrs.map((y) => `<div class="yrow"><span>’${y.slice(2)}</span><div class="strip">${Array.from({ length: 12 }, (_, i) => { const k = `${y}-${String(i + 1).padStart(2, "0")}`; const c = s.cells.find((x) => x.month === k); return c ? cell(s, c, { mini: true, extra: "h16" }) : `<div class="mh mini h16 out"></div>`; }).join("")}</div></div>`).join("");
    return wrap(s, `<div class="mc b-tile"><div class="top">${icon(s, true)}<div class="nm">${s.name}</div><span class="go ar"></span></div>
      <div class="fig"><div class="mon">${MONTH[mi(LAST)]}</div><div class="big">${inrC(s.last.amount)}</div><div><span class="delta ${tone(s, f)}">${pctText(f)} ${vsText(f).replace(/^\d+% /, "")}</span></div></div>
      <div class="yrows">${rows}</div><div class="strip-m" style="grid-template-columns:22px repeat(12,minmax(0,1fr));gap:2px;margin-top:-2px"><span></span>${MON.map((m) => `<span>${m[0]}</span>`).join("")}</div>
      <div class="mfoot">A month, on average: ${byYear.map((x) => `<b>’${x.y.slice(2)}</b> ${inrC(x.avg)}`).join(" · ") || "one year so far"}</div></div>`);
  }).join("");
  return `${header("This month at a glance, and the years behind it", `Usual means the whole range. Each tile's squares run January to December, a row for each year.`, chip(keys, "Last 3 years"))}<div class="b-grid">${tiles}</div>`;
}
