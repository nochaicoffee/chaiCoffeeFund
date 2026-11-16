// The boards: five ways to show the five monthly measures as separate widgets, and one showing where it sits on the Overview.
import { SERIES, KEYS, LAST, MEASURES } from "./data.mjs";
import { pickCss } from "./css.mjs";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const inrC = (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(1).replace(/\.0$/, "")}L` : n >= 1000 ? `₹${Math.round(n / 1000)}k` : inr(n));
const mi = (k) => Number(k.slice(5)) - 1;
const mShort = (k) => MON[mi(k)];
const mLong = (k) => `${MONTH[mi(k)]} ${k.slice(0, 4)}`;
const mLab = (k) => (k === KEYS[0] || k.endsWith("-01") ? `${MON[mi(k)]} ’${k.slice(2, 4)}` : MON[mi(k)]);
const icon = (m, sm) => `<span class="icn${sm ? " sm" : ""}"><svg viewBox="0 0 24 24" aria-hidden="true">${m.icon}</svg></span>`;

/** Is this change good news? Income and investments up, card bills and cash down; EMIs are neutral (a fixed bill). */
const tone = (s, frac) => (Math.abs(frac) < 0.005 ? "flat" : s.good === "flat" ? "flat" : (frac > 0) === (s.good === "up") ? "good" : "bad");
const pctText = (f) => (Math.round(Math.abs(f) * 100) === 0 ? "=" : `${f > 0 ? "▲" : "▼"} ${Math.round(Math.abs(f) * 100)}%`);
const vsText = (f) => (Math.abs(f) < 0.005 ? "in line with usual" : `${Math.round(Math.abs(f) * 100)}% ${f > 0 ? "above" : "below"} usual`);

const tip = (s, c) => (c.amount === null ? `${mLong(c.month)}\nNothing recorded` : `${mLong(c.month)}\n${inr(c.amount)}\n${vsText(c.vsAvg)} (${inrC(s.avg)})\n${s.rankText(c)}`).replace(/\n/g, "&#10;");

/** One heatmap cell (the app's Cell): the shade, a compact amount, Peak or Last month beneath. */
function cell(s, c, { small, mini, caption = true, extra = "" } = {}) {
  const cls = `mh ${small || mini ? (mini ? "mini" : "sm") : ""} ${extra}`;
  if (c.amount === null) return `<div class="${cls} none" data-tip="${tip(s, c)}"><span>–</span></div>`;
  const isPeak = s.peak.month === c.month, isLast = c.month === LAST;
  const cap = caption && !small && !mini ? (isPeak ? "Peak" : isLast ? "Last month" : "") : "";
  return `<div class="${cls} l${c.level}${isLast ? " now" : ""} s-${c.month}" tabindex="0" data-tip="${tip(s, c)}"><span class="rg"></span>${small || mini ? "" : `<span>${inrC(c.amount)}</span>`}${cap ? `<i>${cap}</i>` : ""}</div>`;
}
const wrap = (s, inner, cls = "") => `<div class="m-${s.k} ${cls}">${inner}</div>`;

const header = (title, sub, extra = "") => `<div class="sec-h"><div><div class="eyebrow">Month by month · last 12 months</div><h2>${title}</h2></div><div class="sub">${sub}</div>${extra}</div>`;
const legend = (hue, note) => `<div class="mleg" aria-hidden="true"><i class="st"></i>Nothing that month<span class="sh">Low</span>${[1, 2, 3, 4, 5].map((l) => `<i style="background:oklch(${[0.95, 0.87, 0.76, 0.6, 0.42][l - 1]} ${hue === null ? 0 : [0.03, 0.07, 0.11, 0.12, 0.1][l - 1]} ${hue ?? 0})"></i>`).join("")}High${note ? `<span class="sh">${note}</span>` : ""}</div>`;
const monthHead = (cls) => `<div class="${cls}"><span></span>${KEYS.map((k) => `<span class="${k === LAST ? "now" : ""}">${mLab(k)}</span>`).join("")}<span>12 months</span></div>`;

// ---------- A · five heatmaps ----------
function sectionA() {
  const rows = SERIES.map((s) => wrap(s, `<div class="a-row mc">
    <div class="lh">${icon(s)}<div class="nm">${s.name}<small>${s.word}</small></div></div>
    ${s.cells.map((c) => cell(s, c)).join("")}
    <div class="tot"><b>${inr(s.total)}</b><span>${s.months} ${s.months === 1 ? "month" : "months"} · avg ${inrC(s.avg)}</span></div></div>`)).join("");
  return `${header("Where each month's money went", `Each measure is its own heatmap, so a big salary month never washes out a small EMI. Hover a month for the detail.`, legend(null, "each measure in its own colour and scale"))}
    ${monthHead("a-head")}<div class="a-stack">${rows}</div>`;
}

// ---------- B · five tiles with a strip ----------
function sectionB() {
  const tiles = SERIES.map((s) => {
    const f = s.last.vsAvg;
    return wrap(s, `<div class="mc b-tile">
      <div class="top">${icon(s, true)}<div class="nm">${s.name}</div><span class="go ar" title="Open ${s.page}"></span></div>
      <div class="fig"><div class="mon">${MONTH[mi(LAST)]}</div><div class="big">${inrC(s.last.amount)}</div><div><span class="delta ${tone(s, f)}">${pctText(f)} ${vsText(f).replace(/^\d+% /, "")}</span></div></div>
      <div class="strip">${s.cells.map((c) => cell(s, c, { mini: true })).join("")}</div>
      <div class="strip-m">${KEYS.map((k) => `<span class="${k === LAST ? "now" : ""}">${mShort(k)[0]}</span>`).join("")}</div>
      <div class="mfoot">Usual <b>${inrC(s.avg)}</b> a month · peak <b>${mShort(s.peak.month)} ${inrC(s.peak.amount)}</b></div></div>`);
  }).join("");
  return `${header("This month at a glance, and the year behind it", `Last month's figure for each, against your usual. Each tile opens its page.`)}<div class="b-grid">${tiles}</div>`;
}

// ---------- C · one heatmap, five tabs (the app's own year rows) ----------
function panelC(s) {
  const yrs = ["2025", "2026"];
  const grid = yrs.map((y) => {
    const have = s.cells.filter((c) => c.month.startsWith(y) && c.amount !== null);
    const total = have.reduce((t, c) => t + c.amount, 0);
    const months = Array.from({ length: 12 }, (_, i) => {
      const k = `${y}-${String(i + 1).padStart(2, "0")}`;
      const c = s.cells.find((x) => x.month === k);
      if (c) return cell(s, c);
      return `<div class="mh ${k > LAST ? "up" : "out"}"></div>`;
    }).join("");
    return `<span class="yr">${y}</span>${months}<div class="tot"><b>${inr(total)}</b><span>${have.length} ${have.length === 1 ? "month" : "months"}${have.length ? ` · avg ${inrC(total / have.length)}` : ""}</span></div>`;
  }).join("");
  return `<div class="c-panel p-${s.k} m-${s.k}"><div class="mc" style="box-shadow:var(--card-shadow)">
    <div class="between" style="margin-bottom:14px"><div class="row">${icon(s)}<div class="nm" style="font-size:15px">${s.name} heatmap<small>${s.word} · Nov 2025 to Oct 2026</small></div></div>${legend(s.hue)}<span class="go">Open ${s.page}</span></div>
    <div class="c-grid"><span></span>${MON.map((m) => `<span class="hdr">${m}</span>`).join("")}<span class="hdr" style="text-align:right">Year</span>${grid}</div>
    <div class="c-stats"><div><b>${inr(s.total)}</b><span>12-month total</span></div><div><b>${inr(s.avg)}</b><span>a usual month</span></div><div><b>${mShort(s.peak.month)} · ${inrC(s.peak.amount)}</b><span>highest month</span></div><div><b>${mShort(s.min.month)} · ${inrC(s.min.amount)}</b><span>lowest month</span></div><span class="delta ${tone(s, s.last.vsAvg)}">${MONTH[mi(LAST)]}: ${pctText(s.last.vsAvg)} ${vsText(s.last.vsAvg).replace(/^\d+% /, "")}</span></div>
  </div></div>`;
}
function sectionC() {
  const tabs = SERIES.map((s, i) => `<input type="radio" name="ctab" id="c-${s.k}"${i === 0 ? " checked" : ""}><label for="c-${s.k}" class="c-tab t-${s.k} m-${s.k}">${icon(s, true)}<div class="nm">${s.name}</div><div class="v">${inrC(s.last.amount)}<small>${MONTH[mi(LAST)]}</small></div></label>`).join("");
  return `${header("One heatmap, five measures", `Pick a measure. It is the Cards heatmap exactly: a row per year, the shade, the peak and the last month marked.`)}
    <div class="c-tabs">${tabs}</div>${SERIES.map(panelC).join("")}`;
}

// ---------- D · five bar cards ----------
function sectionD() {
  const cards = SERIES.map((s, i) => {
    const bars = s.cells.map((c) => {
      if (c.amount === null) return `<div class="bar none" data-tip="${tip(s, c)}"></div>`;
      const isPeak = s.peak.month === c.month, isLast = c.month === LAST;
      return `<div class="bar${isPeak ? " pk" : ""}${isLast ? " nw" : ""}" style="height:${((c.amount / s.max) * 100).toFixed(1)}%" data-tip="${tip(s, c)}">${isPeak || isLast ? `<span class="blab">${inrC(c.amount)}</span>` : ""}</div>`;
    }).join("");
    return `<div class="m-${s.k}" style="grid-column:span ${i > 2 ? 3 : 2}"><div class="mc d-card${i > 2 ? " w" : ""}"><div class="hd">${icon(s)}<div class="nm">${s.name}<small>${s.word}</small></div><div class="t"><b>${inrC(s.total)}</b><span>in 12 months</span></div></div>
      <div class="bars" style="margin-top:14px">${bars}<div class="avg" style="bottom:${((s.avg / s.max) * 100).toFixed(1)}%"></div></div>
      <div class="bars-m">${KEYS.map((k) => `<span class="${k === LAST ? "now" : ""}">${mShort(k)[0]}</span>`).join("")}</div>
      <div class="between"><div class="mfoot">Usual <b>${inrC(s.avg)}</b> (dashed) · peak <b>${mShort(s.peak.month)}</b> · low <b>${mShort(s.min.month)}</b></div><span class="delta ${tone(s, s.last.vsAvg)}">${MONTH[mi(LAST)]} ${pctText(s.last.vsAvg)}</span></div></div></div>`;
  });
  return `${header("Five monthly bars, each on its own scale", `The dashed line is your usual month. The ringed bar is last month, the dark one is the peak.`)}<div class="d-grid dd">${cards.join("")}</div>`;
}

// ---------- E · pick a month ----------
function sectionE() {
  const chips = KEYS.map((k) => `<input type="radio" name="emonth" id="e-${k}"${k === LAST ? " checked" : ""}><label for="e-${k}">${mShort(k)} ${k === KEYS[0] || k.endsWith("-01") ? `’${k.slice(2, 4)}` : ""}</label>`).join("");
  const cards = SERIES.map((s) => {
    const variants = KEYS.map((k) => {
      const c = s.cells.find((x) => x.month === k);
      if (c.amount === null) return `<div class="v v-${k}"><div class="mon">${mLong(k)}</div><div class="big" style="color:var(--muted)">–</div><div><span class="delta flat">Nothing recorded</span></div><div class="rank">No ${s.name === "EMIs" ? "EMI" : s.name.toLowerCase()} recorded for ${MONTH[mi(k)]}.</div></div>`;
      return `<div class="v v-${k}"><div class="mon">${mLong(k)}</div><div class="big">${inrC(c.amount)}<small>${inr(c.amount)}</small></div><div><span class="delta ${tone(s, c.vsAvg)}">${pctText(c.vsAvg)} ${vsText(c.vsAvg).replace(/^\d+% /, "")}</span></div><div class="rank"><b>${s.rankText(c)}</b> · usual ${inrC(s.avg)}</div></div>`;
    }).join("");
    const bars = s.cells.map((c) => (c.amount === null ? `<div class="bar none b-${c.month}"></div>` : `<div class="bar b-${c.month}" style="height:${((c.amount / s.max) * 100).toFixed(1)}%"></div>`)).join("");
    return wrap(s, `<div class="mc e-card"><div class="top row" style="gap:10px">${icon(s, true)}<div class="nm">${s.name}</div><span class="go ar" title="Open ${s.page}"></span></div>${variants}<div class="e-bars">${bars}</div><div class="strip-m" style="margin-top:-6px">${KEYS.map((k) => `<span>${mShort(k)[0]}</span>`).join("")}</div></div>`);
  }).join("");
  return `${header("Pick a month, see all five", `One month at a time, the way Expenses does it: the figure, how it compares with a usual month, and where it sits in the year.`)}
    <div class="e-chips">${chips}</div><div class="e-grid">${cards}</div>`;
}

// ---------- X · where it sits on the Overview ----------
function sectionX() {
  return `<div class="ghost stage" style="height:170px">Net worth, its trend and the ring (as built)</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px">${["Accounts", "Investments", "Fixed income", "Lent out", "Cards", "Loans", "Income", "Subscriptions", "Goals", "Insurance", "Due this month", "Still to pay"].map((t) => `<div class="ghost tile" style="height:74px">${t}</div>`).join("")}</div>
    <div class="slot"><span class="slot-tag">New · after the twelve tiles</span><div style="display:flex;flex-direction:column;gap:16px;padding:6px 0">${sectionA()}</div></div>
    <div class="ghost" style="height:140px;margin-top:6px">Eight things worth knowing, Future you, Coming up (as built)</div>`;
}

// `wide` boards are 1480px, the page's content width plus the board's gutters.
export const BOARDS = [
  { file: "MoA.dc.html", w: 1480, page: "r1", cap: ["A · Five heatmaps", "A row per measure, in the Cards heatmap's own look: shade, peak, last month, a total on the right."], body: sectionA },
  { file: "MoB.dc.html", w: 1480, page: "r1", cap: ["B · Five tiles with a strip", "Compact: last month's figure against your usual, and the year as twelve small squares. Sits like the tiles above it."], body: sectionB },
  { file: "MoC.dc.html", w: 1480, page: "r1", cap: ["C · One heatmap, five tabs", "Takes one slot: pick a measure and the Cards heatmap redraws (years as rows, a total and average per year)."], body: sectionC, cls: "mo-c" },
  { file: "MoD.dc.html", w: 1480, page: "r1", cap: ["D · Five bar cards", "Bars instead of shades, so size is easy to compare; the dashed line is a usual month, the ringed bar is last month."], body: sectionD },
  { file: "MoE.dc.html", w: 1480, page: "r1", cap: ["E · Pick a month, see all five", "Month chips drive five cards: the figure, against usual, its rank, and where it sits in the year."], body: sectionE, cls: "mo-e" },
  { file: "MoX.dc.html", w: 1480, page: "r1", cap: ["Where it sits · shown with A", "After the twelve tiles and before the Eight things; the grey boxes are the page as built."], body: sectionX },
];
export const PAGES = [{ id: "r1", name: "Round 1 · Overview month-by-month widget: five separate measures, five layouts, and where it sits" }];
export const NOTES = [{ page: "r1", text: "Overview · Month by month (round 1, 2026-11-16). Income, investments, EMIs, credit card bills and cash expenses as five separate widgets, five ways. Every figure is the Expenses canvas's made-up year (Nov 2025 to Oct 2026), so the widget agrees with /expenses. Hover any month for its detail; C and E are interactive." }];
export const PICK = pickCss({ tabs: MEASURES, months: KEYS });

export const render = (b) => `<div class="chai-app mo ${b.cls ?? ""}" style="width:${b.w}px;height:__H__${b.minH ? `;min-height:${b.minH}px` : ""}">
  <div class="cap"><b>${b.cap[0]}</b><span>${b.cap[1]}</span></div>
  ${b.body()}
</div>`;

export { cell, icon, wrap, header, legend, tone, pctText, vsText, inr, inrC, mShort, mLong, MON, MONTH, mi, tip };
