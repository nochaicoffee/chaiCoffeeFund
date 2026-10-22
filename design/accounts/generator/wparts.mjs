// Round 10 (2026-10-22): the widgets for the five pages below the hero (widgets.mjs puts them together).
// Prathik asked for more widgets, mostly visual, with Balance history on the right as on the Cards and Subscriptions pages.
// Every widget follows the hero's pick (All, or one account) and has its own interaction, all CSS: radios with :has() and :hover, no script.
// Every figure is made up, and every worked-out number is labelled so. "Today" is Oct 21, 2026.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
const { inr, signed, inrS, fmt, fmtY, monName, monYear, I, btn, mono, allMono } = L;
const { IDS, FACTS, ORDER, panes } = P;

// ---------- Shared bits ----------
export const NOW = L.monthKey(L.TODAY);
export const pkey = (k) => L.addMonthsUTC(`${k}-01`, -1).slice(0, 7);
export const ACT = ORDER.filter((a) => L.isOn(a)); // active accounts, biggest first
export const bal = (id) => (L.isOn(L.acc(id)) ? L.latest(id)?.balance ?? 0 : 0);
const sg = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + inrS(Math.abs(n));
const tone = (n) => (n > 0 ? "var(--positive)" : n < 0 ? "var(--negative)" : "var(--muted)");
const up = (a) => `var(--card-${a.color})`;
const soft = (a, p = 45) => `color-mix(in oklch, var(--card-${a.color}) ${p}%, white)`;
const DOWN = "oklch(0.76 0.11 27)";
const firstBal = (id) => L.snapsOf(id)[0]?.balance ?? 0;
const balAt = (id, k) => L.atMonth(id, k);
const pctTxt = (d, base) => (base ? `${d >= 0 ? "+" : "−"}${Math.abs((d / base) * 100).toFixed(1)}%` : "");
const pick = (prefix, id, inner, cls = "", style = "") => `<label for="${prefix}-sel-${id}" class="${cls}" style="cursor:pointer;${style}">${inner}</label>`;
const upTo = (a, b) => { const out = []; for (let k = a; k <= b; k = L.addMonthsUTC(`${k}-01`, 1).slice(0, 7)) out.push(k); return out; };

/** A light hover card (the app's .hc), built from parts. */
export const hc = ({ h, hr = "", t = "", d = "", rows = [], f = "", w = 240 }) =>
  `<div class="hc" style="width:${w}px"><div class="h"><span>${h}</span>${hr}</div>${t ? `<div class="t">${t}</div>` : ""}${d ? `<div class="d">${d}</div>` : ""}${rows.length ? `<ul>${rows.map(([nm, v, c]) => `<li>${c ? `<i style="width:8px;height:8px;border-radius:3px;background:${c};flex-shrink:0"></i>` : ""}<span class="nm">${nm}</span><b>${v}</b></li>`).join("")}</ul>` : ""}${f ? `<div class="f">${f}</div>` : ""}</div>`;
/** Where a hover card opens from its host: above or below, centred or flush left or right. */
export const OPTS = { tips: true };
export const tip = (card, { w = 240, x = "c", y = "up" } = {}) => !OPTS.tips ? "" :
  `<span class="hc-wrap" style="${x === "side-r" ? "top:6px;left:calc(100% + 8px)" : x === "side-l" ? "top:6px;right:calc(100% + 8px)" : `${y === "up" ? "bottom:calc(100% + 8px)" : "top:calc(100% + 8px)"};${x === "c" ? `left:50%;margin-left:-${w / 2}px` : x === "l" ? "left:0" : "right:0"}`}">${card}</span>`;

/**
 * A CSS-only switch. Its radios sit inside the page's `.<prefix>dir` wrapper (so :has() sees them); a variant of
 * anything inside shows when its option is checked: give it the class `v-<name>-<key>` and `style="--d:flex"` if it isn't a block.
 */
export function tgl(prefix, name, opts, { def = opts[0][0], size = 12, pad = "6px 13px" } = {}) {
  const d = `.${prefix}dir`;
  const radios = opts.map(([k, label]) => `<input type="radio" class="pk-in" name="${prefix}-${name}" id="${prefix}-${name}-${k}"${k === def ? " checked" : ""} aria-label="${label}">`).join("");
  const css = `<style>${d} [class*="v-${name}-"] { display: none; }
${opts.map(([k]) => `${d}:has(#${prefix}-${name}-${k}:checked) .v-${name}-${k} { display: var(--d, block); }
${d}:has(#${prefix}-${name}-${k}:checked) label[for="${prefix}-${name}-${k}"] { background: var(--surface); color: var(--accent-text); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); }`).join("\n")}</style>`;
  const ui = `<span class="seg" role="radiogroup" aria-label="${name}">${opts.map(([k, label]) => `<label for="${prefix}-${name}-${k}" class="seg-i" style="cursor:pointer;font-size:${size}px;padding:${pad}">${label}</label>`).join("")}</span>`;
  const cls = (k) => `v-${name}-${k}`;
  return { radios, css, ui, cls, keys: opts.map(([k]) => k), labels: Object.fromEntries(opts) };
}
/** Every variant of `render(key)`, each wrapped so only the checked one shows. */
export const variants = (t, render, { d = "block", style = "" } = {}) => t.keys.map((k) => `<div class="${t.cls(k)}" style="--d:${d};${style}">${render(k)}</div>`).join("");
/** The same switch, deciding the order of a list's rows instead of which variant shows. */
export function sortBy(prefix, name, opts, orders, { def = opts[0][0] } = {}) {
  const t = tgl(prefix, name, opts, { def });
  const d = `.${prefix}dir`;
  const css = `<style>${opts.map(([k]) => `${d}:has(#${prefix}-${name}-${k}:checked) label[for="${prefix}-${name}-${k}"] { background: var(--surface); color: var(--accent-text); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); }
${Object.entries(orders[k]).map(([id, o]) => `${d}:has(#${prefix}-${name}-${k}:checked) .o-${name}-${id} { order: ${o}; }`).join(" ")}`).join("\n")}</style>`;
  return { ...t, css };
}
const rankOrder = (ids, key, dir = 1) => Object.fromEntries(ids.slice().sort((a, b) => dir * (key(a) - key(b)) || (a < b ? -1 : 1)).map((id, i) => [id, i]));

const card = (inner, { gap = 14, pad = "", style = "" } = {}) => `<section class="card glass" style="gap:${gap}px;${pad ? `padding:${pad};` : ""}${style}">${inner}</section>`;
const head = (title, sub = "", right = "", ph = false) => `<div class="card-h"><span class="card-t">${title}${sub && !ph ? `<small>${sub}</small>` : ""}</span>${right}</div>`;
const foot = (left, right = "") => `<div class="between foot" style="padding-top:10px;border-top:1px solid var(--divider);gap:12px"><span class="card-note">${left}</span>${right}</div>`;
const worked = (t = "Worked out") => L.derivedTag(t);

// ---------- The stylesheet for round 10 (kept here, not in css.mjs, so the other boards' files stay as they were) ----------
export const WCSS = `<style>
.hov:focus-within > .hc-wrap { opacity: 1; transform: none; }
.hov > .hc-wrap { white-space: normal; text-align: left; }
.hov { outline: none; }
.hc li i { display: inline-block; }
.wtag { display: flex; align-items: center; gap: 12px; padding: 7px 14px 7px 8px; border-radius: 999px; border: 1.5px dashed var(--fill-strong); background: var(--fill); width: fit-content; max-width: 100%; }
.wtag b { font-size: 13px; font-weight: 800; } .wtag span.wi { font-size: 12.5px; font-weight: 600; color: var(--muted); }
.wsec { display: flex; flex-direction: column; gap: 20px; }
.wflex { flex: 1 1 auto; min-height: 0; }
.wpane { display: flex; flex-direction: column; gap: 12px; flex: 1 1 auto; }

/* Month over month */
.wmo-row { display: grid; grid-template-columns: 28px minmax(0,112px) 100px minmax(0,1fr) 80px 54px; gap: 12px; align-items: center; padding: 9px 8px; margin: 0 -8px; border-radius: 14px; transition: background 160ms; }
.wmo-row:hover, .wmo-row:focus-visible { background: var(--fill); }
.wmo-nm b { display: block; font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wmo-nm small { display: block; font-size: 11px; color: var(--muted); font-weight: 600; margin-top: 2px; white-space: nowrap; }
.wmo-dv { position: relative; height: 26px; }
.wmo-dv .z { position: absolute; top: -4px; bottom: -4px; width: 1.5px; border-radius: 2px; background: var(--fg); opacity: 0.32; }
.wmo-bar { position: absolute; top: 4px; bottom: 4px; border-radius: 8px; transition: filter 160ms; }
.wmo-row:hover .wmo-bar { filter: saturate(1.25) brightness(1.04); }
.wmo-val { text-align: right; font-size: 13px; font-weight: 800; white-space: nowrap; }
.wmo-pc { text-align: right; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
.wmo-chart { position: relative; flex: 1 1 auto; min-height: 210px; }
.wmo-chart .z { position: absolute; left: 0; right: 0; height: 0; border-top: 1.5px solid var(--fg); opacity: 0.3; }
.wmo-chart .g { position: absolute; left: 0; right: 0; height: 0; border-top: 1px dashed var(--divider); }
.wmo-col { position: absolute; top: 0; bottom: 0; }
.wmo-col .b { position: absolute; left: 14%; right: 14%; border-radius: 8px; transition: filter 160ms, transform 160ms; }
.wmo-col:hover .b { filter: saturate(1.3) brightness(1.05); transform: scaleX(1.06); }
.wmo-col .l { position: absolute; left: -10px; right: -10px; text-align: center; font-size: 10.5px; font-weight: 800; white-space: nowrap; }
.wmo-ax { display: grid; font-size: 10.5px; font-weight: 700; color: var(--muted); text-align: center; }

/* Mix rings */
.wmx { position: relative; flex-shrink: 0; }
.wmx svg { display: block; overflow: visible; }
.wmx .sg { fill: none; transition: stroke-width 180ms var(--ease-out), opacity 260ms; cursor: pointer; stroke-width: var(--w); }
.wmx .sg:hover { stroke-width: calc(var(--w) + 9px); }
.wmx .cen { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; padding: 0 20%; }
.wmx .cen > div[class^="c-"] { display: none; }
.wmx .cen b.v { display: block; font-size: 17px; font-weight: 800; letter-spacing: -0.01em; white-space: nowrap; }
.wmx .cen .cdw { display: flex; flex-direction: column; align-items: center; }
.wmx .cen .cdw .hp { text-align: center; }
.wmx .cen div[class^="c-"] { text-align: center; }
.wmx .cen span.s { display: block; font-size: 10.5px; font-weight: 700; color: var(--muted); margin-top: 2px; }
.wmx-lg { display: grid; grid-template-columns: 12px minmax(0,1fr) auto 38px; gap: 8px; align-items: center; padding: 6px 8px; margin: 0 -8px; border-radius: 10px; font-size: 12.5px; font-weight: 600; transition: background 160ms; }
.wmx-lg:hover { background: var(--fill); }
.wmx-lg b { font-weight: 800; }
.wmx-lg .p { text-align: right; color: var(--muted); font-size: 11.5px; font-weight: 700; }
.wmx-gh { display: flex; align-items: center; gap: 8px; padding: 8px 0 2px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); }
.wmx-gh span.r { margin-left: auto; letter-spacing: 0; text-transform: none; font-size: 11.5px; color: var(--fg); font-weight: 800; }

/* Freshness */
.wfr-row { border-radius: 14px; transition: background 160ms, opacity 260ms; }
.wfr-row > summary { list-style: none; cursor: pointer; display: grid; grid-template-columns: 28px minmax(0,132px) minmax(0,1fr) 108px 14px; gap: 12px; align-items: center; padding: 9px 8px; border-radius: 14px; }
.wfr-row > summary::-webkit-details-marker { display: none; }
.wfr-row > summary:hover { background: var(--fill); }
.wfr-row[open] { background: var(--fill); }
.wfr-row[open] .ch { transform: rotate(90deg); }
.wfr-row .ch { color: var(--muted); display: flex; transition: transform 180ms var(--ease-out); }
.wfr-tr { position: relative; height: 12px; border-radius: 999px; background: var(--fill); }
.wfr-tr .f { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; }
.wfr-tr .m { position: absolute; top: -5px; bottom: -5px; width: 2px; border-radius: 2px; background: var(--fg); opacity: 0.45; }
.wfr-body { padding: 4px 10px 12px 48px; display: flex; flex-direction: column; gap: 8px; }
.wfr-body .snap { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.wfr-body .snap > div { padding: 8px 10px; border-radius: 12px; background: var(--surface); border: 1px solid var(--surface-line); }
.wfr-body .snap small { display: block; font-size: 10.5px; font-weight: 700; color: var(--muted); }
.wfr-body .snap b { display: block; font-size: 13px; font-weight: 800; margin-top: 2px; }
.wfr-ax { display: grid; grid-template-columns: 28px minmax(0,132px) minmax(0,1fr) 108px 14px; gap: 12px; padding: 0 8px; font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }
.wfr-ax .t { display: flex; justify-content: space-between; }

/* Check-in rings */
.wrg-grid { display: grid; gap: 12px; }
.wrg-tile { position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 16px 10px 14px; border-radius: 22px; background: var(--fill); transition: background 200ms, transform 200ms var(--ease-out), opacity 260ms; }
.wrg-tile:hover { background: var(--fill-strong); transform: translateY(-2px); }
.wrg-ring { position: relative; width: var(--rs); height: var(--rs); }
.wrg-tk { position: absolute; left: 50%; border-radius: 5px; transition: transform 160ms var(--ease-out), filter 160ms; cursor: default; }
.wrg-tk:hover { filter: brightness(1.15) saturate(1.2); z-index: 2; }
.wrg-tp, .wrg-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; padding: 0 30%; }
.wrg-tp { display: none; }
.wrg-tk:hover + .wrg-tp { display: flex; }
.wrg-ring:has(.wrg-tk:hover) .wrg-c { opacity: 0; }
.wrg-c b, .wrg-tp b { font-size: 21px; font-weight: 800; letter-spacing: -0.01em; line-height: 1.1; }
.wrg-c span, .wrg-tp span { font-size: 10.5px; font-weight: 700; color: var(--muted); line-height: 1.3; margin-top: 2px; }
.wrg-tp b { font-size: 14px; }

/* Runway */
.wrw-lane { display: grid; grid-template-columns: 170px minmax(0,1fr) 128px; gap: 16px; align-items: center; padding: 8px 8px; margin: 0 -8px; border-radius: 16px; transition: background 160ms, opacity 260ms; }
.wrw-lane:hover { background: var(--fill); }
.wrw-cv { position: relative; height: 64px; }
.wrw-cv svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.hov.wrw-pin { position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 0 0 2.5px var(--surface), 0 3px 8px oklch(0 0 0 / 0.22); transition: transform 160ms var(--ease-out); z-index: 3; }
.wrw-pin:hover { transform: scale(1.18); z-index: 6; }
.wrw-axis { position: relative; height: 22px; }
.wrw-axis span { position: absolute; font-size: 10.5px; font-weight: 700; color: var(--muted); transform: translateX(-50%); white-space: nowrap; }
.wrw-vg { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px dashed var(--divider); }

/* Column charts (money out by month, the over-time chart) */
.wk { position: relative; flex: 1 1 auto; --g: 54px; }
.wk-y { position: absolute; left: 0; top: 8px; bottom: 26px; width: var(--g); }
.wk-y span { position: absolute; right: 8px; transform: translateY(50%); font-size: 10.5px; font-weight: 700; color: var(--muted); white-space: nowrap; }
.wk-plot { position: absolute; left: var(--g); right: 0; top: 8px; bottom: 26px; }
.wk-g { position: absolute; left: 0; right: 0; height: 0; border-top: 1px dashed var(--divider); }
.wk-z { position: absolute; left: 0; right: 0; height: 0; border-top: 1.5px solid var(--fg); opacity: 0.3; }
.wk-slot { position: absolute; top: 0; bottom: 0; }
.wk-stack { position: absolute; left: 0; right: 0; display: flex; flex-direction: column-reverse; gap: 2px; }
.wk-stack > i { display: block; min-height: 2px; border-radius: 6px; transition: opacity 260ms, filter 200ms; }
.wk-stack.dn { flex-direction: column; }
.wk-hit { position: absolute; top: -4px; bottom: -4px; border-radius: 12px; transition: background 160ms; }
.wk-hit:hover, .wk-hit:focus-visible { background: var(--fill); }
.wk-x { position: absolute; left: var(--g); right: 0; bottom: 0; height: 20px; display: grid; font-size: 10.5px; font-weight: 700; color: var(--muted); text-align: center; align-items: end; }
.wk-avg { position: absolute; left: 0; right: 0; height: 0; border-top: 1.5px dashed var(--accent-text); opacity: 0.7; pointer-events: none; }
.wk-avg span { position: absolute; left: 0; top: -19px; font-size: 10.5px; font-weight: 800; color: var(--accent-text); background: var(--surface); padding: 0 6px; border-radius: 999px; }
.wok-lg { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; background: var(--fill); font-size: 12px; font-weight: 700; cursor: default; transition: background 160ms; }
.wok-lg:hover { background: var(--fill-strong); }
.wok-lg i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }

/* Emergency buffer */
.wbf-cells { display: grid; grid-template-columns: repeat(12, minmax(0,1fr)); gap: 4px; }
.wbf-cells i { position: relative; display: block; height: 22px; border-radius: 7px; background: var(--fill); overflow: hidden; }
.wbf-cells i > b { position: absolute; left: 0; top: 0; bottom: 0; border-radius: inherit; }
.wbf-row { display: grid; grid-template-columns: 26px minmax(0,1fr); gap: 10px; align-items: center; padding: 6px 8px; margin: 0 -8px; border-radius: 12px; transition: background 160ms, opacity 260ms; }
.wbf-row:hover { background: var(--fill); }

/* Money out split by account */
.wos-row { display: grid; grid-template-columns: 150px minmax(0,1fr) 92px; gap: 14px; align-items: center; padding: 10px 8px; margin: 0 -8px; border-radius: 14px; transition: background 160ms, opacity 260ms; }
.wos-row:hover { background: var(--fill); }
.wos-trk { display: block; height: 28px; border-radius: 9px; background: var(--fill); }
.wos-bar { display: flex; gap: 2px; height: 100%; }
.wos-bar > .hov { height: 100%; min-width: 0; }
.wos-bar > .hov > i { display: block; width: 100%; height: 100%; border-radius: 7px; transition: filter 160ms, transform 160ms; }
.wos-bar > .hov:hover > i { filter: saturate(1.3) brightness(1.06); transform: scaleY(1.12); }

/* Account trends */
.wtr-row { border-radius: 14px; transition: background 160ms, opacity 260ms; }
.wtr-row > summary { list-style: none; cursor: pointer; display: grid; grid-template-columns: 190px minmax(0,1fr) 112px 106px 66px 14px; gap: 18px; align-items: center; padding: 10px 10px; border-radius: 14px; }
.wtr-row > summary::-webkit-details-marker { display: none; }
.wtr-row > summary:hover { background: var(--fill); }
.wtr-row[open] { background: var(--fill); }
.wtr-row[open] .ch { transform: rotate(90deg); }
.wtr-row .ch { color: var(--muted); display: flex; transition: transform 180ms var(--ease-out); }
.wtr-cols { display: grid; grid-template-columns: repeat(12, minmax(0,1fr)); gap: 4px; height: 44px; align-items: end; }
.wtr-cols > .hov { height: 100%; display: flex; align-items: flex-end; }
.wtr-cols > .hov > i { display: block; width: 100%; border-radius: 5px; transition: filter 160ms, transform 160ms; transform-origin: bottom; }
.wtr-cols > .hov:hover > i { filter: saturate(1.35) brightness(1.08); transform: scaleY(1.06); }
.wtr-body { padding: 2px 12px 14px 12px; display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 8px; }
.wtr-body > div { padding: 8px 10px; border-radius: 12px; background: var(--surface); border: 1px solid var(--surface-line); }
.wtr-body small { display: block; font-size: 10.5px; font-weight: 700; color: var(--muted); }
.wtr-body b { display: block; font-size: 13px; font-weight: 800; margin-top: 2px; }

/* Update rhythm */
.wrh-lane { display: grid; grid-template-columns: 176px minmax(0,1fr) 92px; gap: 14px; align-items: center; height: 56px; padding: 0 8px; margin: 0 -8px; border-radius: 14px; transition: background 160ms, opacity 260ms; }
.wrh-lane:hover { background: var(--fill); }
.wrh-tr { position: relative; height: 100%; }
.wrh-dot { position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; border: 2.5px solid var(--surface); box-shadow: 0 0 0 1.5px var(--c), 0 2px 6px oklch(0 0 0 / 0.18); background: var(--c); transition: transform 160ms var(--ease-out); z-index: 2; }
.wrh-dot:hover { transform: scale(1.35); z-index: 5; }
.wrh-gap { position: absolute; bottom: 8px; border-radius: 6px 6px 3px 3px; transition: filter 160ms; }
.wrh-gap:hover { filter: saturate(1.3) brightness(1.08); }

/* Coming up */
.wcm-row { display: grid; grid-template-columns: 44px minmax(0,1fr) auto; gap: 12px; align-items: center; padding: 9px 8px; margin: 0 -8px; border-radius: 14px; transition: background 160ms, opacity 260ms; }
.wcm-row:hover { background: var(--fill); }
.wcm-d { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 44px; height: 46px; border-radius: 13px; background: var(--fill); line-height: 1.1; }
.wcm-d b { font-size: 16px; font-weight: 800; } .wcm-d small { font-size: 9.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); }
.wcm-empty { flex: 1 1 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; color: var(--muted); font-size: 13px; font-weight: 600; padding: 12px 20px; min-height: 120px; }

@media (prefers-reduced-motion: reduce) { .wmo-bar, .wmo-col .b, .wmx .sg, .wfr-row .ch, .wrg-tile, .wrg-tk, .wrw-pin, .wtr-row .ch, .wrh-dot { transition: none !important; } }
</style>`;

// =====================================================================================================================
// Month over month: what each account moved. A step switch (this month / 3 months / this year); All shows a row per
// account (a bar either side of zero), one account shows its own bars, a step at a time.
// =====================================================================================================================
const STEP = { m: { label: "This month", from: "2026-09", at: "Sep 30" }, q: { label: "3 months", from: "2026-07", at: "Jul 31" }, y: { label: "This year", from: "2025-12", at: "Dec 31" } };
const dlt = (id, k0, k1 = NOW) => { const a = balAt(id, k0) ?? firstBal(id), b = balAt(id, k1) ?? 0; return { from: a, to: b, d: b - a }; };
const stepBars = (id, s, ph = false) => {
  if (s === "m") return (ph ? L.LAST12.slice(-6) : L.LAST12).map((k) => ({ ...dlt(id, pkey(k), k), name: monYear(k), ax: monName(k), sub: k === NOW ? `since Sep 30` : `since ${fmt(L.monthEnd(pkey(k)))}` }));
  if (s === "q") return [["2025-10", "2026-01", "Nov–Jan"], ["2026-01", "2026-04", "Feb–Apr"], ["2026-04", "2026-07", "May–Jul"], ["2026-07", NOW, "Aug–Oct"]].map(([a, b, ax]) => ({ ...dlt(id, a, b), name: ax, ax, sub: `since ${fmt(L.monthEnd(a))}` }));
  return [["2024-12", "2025-12", "2025"], ["2025-12", NOW, "2026 so far"]].map(([a, b, ax]) => ({ ...dlt(id, a, b), name: ax, ax, sub: `since ${fmtY(L.monthEnd(a))}` }));
};
function momAll(prefix, t, { ph, narrow = ph }) {
  const sc = Object.fromEntries(Object.keys(STEP).map((s) => { const ds = ACT.map((a) => dlt(a.id, STEP[s].from).d); const lo = Math.min(0, ...ds), hi = Math.max(0, ...ds); return [s, { lo, span: hi - lo || 1 }]; }));
  const rows = ACT.map((a) => {
    const f = FACTS[a.id];
    const bar = (s) => { const { d } = dlt(a.id, STEP[s].from), { lo, span } = sc[s], z = (-lo / span) * 100, w = (Math.abs(d) / span) * 100; return `<i class="z" style="left:${z}%"></i>${d ? `<i class="wmo-bar" style="left:${d >= 0 ? z : z - w}%;width:${w}%;background:${d >= 0 ? `linear-gradient(90deg, ${soft(a, 60)}, ${up(a)})` : DOWN}"></i>` : `<i class="wmo-bar" style="left:calc(${z}% - 3px);width:6px;background:var(--warning)"></i>`}`; };
    const card = (s) => { const x = dlt(a.id, STEP[s].from); return hc({ h: a.name, hr: f.stale ? `<span class="pill pill-stale" style="padding:2px 8px;font-size:10px">${I.clock(9)} ${fmt(f.asOf)}</span>` : "", t: x.d ? signed(x.d) : "No change", d: x.d ? `${pctTxt(x.d, x.from)} since ${STEP[s].at}` : f.stale ? "No balance recorded since Aug 9, so it's carried" : `Same as on ${STEP[s].at}`, rows: [[`On ${STEP[s].at}`, inr(x.from)], ["Now", inr(x.to)], ["Last balance", fmt(f.asOf)]], f: "Click to look at it in the hero" }); };
    const cells = narrow
      ? `${mono(a, 28)}<span class="wmo-nm"><b>${a.name}</b><small>${L.purposeName(a.purpose)}</small></span><span class="wmo-val">${variants(t, (s) => { const x = dlt(a.id, STEP[s].from); return x.d ? `<span style="color:${tone(x.d)}">${signed(x.d)}</span><span class="wmo-pc" style="display:block;color:${tone(x.d)}">${pctTxt(x.d, x.from)}</span>` : `<span style="color:var(--warning-text)">${I.clock(10)} no change</span>`; }, { d: "block" })}</span><span class="wmo-dv" style="position:relative;grid-column:2 / -1">${variants(t, (s) => bar(s), { style: "position:absolute;inset:0" })}</span>`
      : `${mono(a, 28)}<span class="wmo-nm"><b>${a.name}</b><small>${L.purposeName(a.purpose)}</small></span><span style="color:${up(a)}">${P.spark(a.id, { w: 100, h: 26, stroke: "currentColor", fill: `color-mix(in oklch, ${up(a)} 14%, transparent)`, width: 1.7 })}</span><span class="wmo-dv" style="position:relative">${variants(t, (s) => bar(s), { style: "position:absolute;inset:0" })}</span><span class="wmo-val">${variants(t, (s) => { const x = dlt(a.id, STEP[s].from); return x.d ? `<span style="color:${tone(x.d)}">${signed(x.d)}</span>` : `<span style="color:var(--warning-text)">${I.clock(10)} no change</span>`; }, { d: "block" })}</span><span class="wmo-pc">${variants(t, (s) => { const x = dlt(a.id, STEP[s].from); return `<span style="color:${tone(x.d)}">${x.d ? pctTxt(x.d, x.from) : ""}</span>`; })}</span>`;
    return `<label for="${prefix}-sel-${a.id}" class="wmo-row hov acm ac-${a.id}" tabindex="0" style="cursor:pointer;${narrow ? "grid-template-columns:28px minmax(0,1fr) auto;row-gap:2px" : ""}">${cells}${tip(variants(t, card, { d: "block" }), { w: 240, x: narrow ? "l" : "c", y: "up" })}</label>`;
  }).join("");
  const tot = (s) => { const from = L.totalAtMonth(STEP[s].from), d = L.TOTAL - from; return `<b style="color:${tone(d)}">${signed(d)}</b> <span class="muted" style="font-weight:700">${pctTxt(d, from)} since ${STEP[s].at}</span>`; };
  return `<div class="spread" style="gap:2px;justify-content:space-between">${rows}</div>${foot(`All accounts together ${variants(t, tot, { d: "inline" })}`, `<span class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end">${L.CLOSED.map((a) => `<label for="${prefix}-sel-${a.id}" class="chip" style="cursor:pointer;padding:4px 10px 4px 5px">${mono(a, 16)}${a.name}<em>closed</em></label>`).join("")}</span>`)}`;
}
function momOne(f, t, { ph, narrow = ph }) {
  const a = f.a;
  const render = (s) => {
    const bars = stepBars(a.id, s, ph);
    const hi = Math.max(0, ...bars.map((b) => b.d)), lo = Math.min(0, ...bars.map((b) => b.d)), span = hi - lo || 1, pad = 14;
    const Y = (v) => pad + ((hi - v) / span) * (100 - pad * 2);
    const n = bars.length, slot = 100 / n;
    const cols = bars.map((b, i) => {
      const top = Y(Math.max(b.d, 0)), h = Math.max((Math.abs(b.d) / span) * (100 - pad * 2), b.d ? 0 : 0.8);
      const lab = `<span class="l" style="${b.d >= 0 ? `bottom:calc(${100 - top}% + 4px)` : `top:calc(${top + h}% + 4px)`};color:${b.d ? tone(b.d) : "var(--muted)"}">${b.d ? sg(b.d) : "0"}</span>`;
      const card = hc({ h: b.name, t: b.d ? signed(b.d) : "No change", d: b.d ? `${pctTxt(b.d, b.from)} ${b.sub}` : b.sub, rows: [["Before", inr(b.from)], ["After", inr(b.to)]], w: 210 });
      return `<span class="wmo-col hov" tabindex="0" style="left:${i * slot}%;width:${slot}%">${lab}<i class="b" style="top:${top}%;height:${h}%;background:${b.d >= 0 ? `linear-gradient(180deg, ${soft(a, 55)}, ${up(a)})` : DOWN}${b.d ? "" : ";background:var(--fill-strong)"}"></i>${tip(card, { w: 210, x: i > n * 0.66 ? "r" : i < n * 0.2 ? "l" : "c" })}</span>`;
    }).join("");
    const last = bars.at(-1);
    const sum = `<div class="between" style="font-size:13px;font-weight:600;gap:10px"><span class="muted"><b style="color:var(--fg)">${a.name}</b> · ${STEP[s].label.toLowerCase()}</span><span><b style="font-size:15px;color:${tone(last.d)}">${last.d ? signed(last.d) : "No change"}</b> <span class="muted" style="font-weight:700">${last.d ? pctTxt(last.d, last.from) : f.stale ? "no balance since " + fmt(f.asOf) : ""}</span></span></div>`;
    const ax = `<div class="wmo-ax" style="grid-template-columns:repeat(${n},minmax(0,1fr))">${bars.map((b) => `<span>${ph && n > 6 ? b.ax[0] : b.ax}</span>`).join("")}</div>`;
    return `<div class="wpane" style="gap:10px">${sum}<div class="wmo-chart"><i class="z" style="top:${Y(0)}%"></i>${cols}</div>${ax}</div>`;
  };
  return `<div class="wpane">${variants(t, render, { d: "flex", style: "flex-direction:column;flex:1 1 auto" })}</div>${foot(!f.on ? `Closed ${fmtY(f.closedOn)}: its history stays` : f.stale ? `${I.clock(10)} No balance since ${fmt(f.asOf)}: its months after that are carried` : `${f.snaps} balances since ${fmtY(L.snapsOf(f.id)[0].date)}`, worked("Worked out from balances"))}`;
}
export function mom(prefix, { ph = false, narrow = ph } = {}) {
  const t = tgl(prefix, "mo", [["m", STEP.m.label], ["q", STEP.q.label], ["y", STEP.y.label]], { size: ph ? 11.5 : 12, pad: ph ? "6px 10px" : "6px 13px" });
  const body = panes((f) => (f.all ? momAll(prefix, t, { ph, narrow }) : momOne(f, t, { ph, narrow })), {}, { flex: true });
  return card(`${t.css}${t.radios}${head("Month over month", "what each account moved, from its balances", t.ui, ph)}${body}`, { gap: 12, pad: ph ? "16px" : "" });
}

// =====================================================================================================================
// Mix by purpose: two rings, the accounts outside and what they're for inside. Hover an arc or a legend row to read it.
// =====================================================================================================================
const PURP_ORDER = ["Emergency-Fund", "Spending", "Investment", "Loan-Payments"];
const PCOL = (p) => `var(--card-${L.PURPOSE_COLOR[p]})`;
const purpTotal = (p) => ACT.filter((a) => a.purpose === p).reduce((t, a) => t + bal(a.id), 0);
export function mix(prefix, { size = 250, legend = "grouped", ph = false, layout = "side" } = {}) {
  const R1 = size * 0.42, R2 = size * 0.285, W1 = size * 0.105, W2 = size * 0.075, C = size / 2;
  const accts = PURP_ORDER.flatMap((p) => ACT.filter((a) => a.purpose === p));
  const circ = (r) => 2 * Math.PI * r;
  const seg = (r, w, start, len, cls, color, extra = "") => `<circle class="sg ${cls}" cx="${C}" cy="${C}" r="${r}" stroke="${color}" style="--w:${w}px" stroke-dasharray="${Math.max(len * circ(r) - 3, 1)} ${circ(r)}" stroke-dashoffset="${-(start * circ(r) + 1.5)}" transform="rotate(-90 ${C} ${C})" ${extra}></circle>`;
  let s = 0;
  const outer = accts.map((a) => { const share = bal(a.id) / L.TOTAL, e = seg(R1, W1, s, share, `sg-${a.id} acm ac-${a.id}`, up(a)); s += share; return e; }).join("");
  s = 0;
  const inner = PURP_ORDER.map((p) => { const share = purpTotal(p) / L.TOTAL, ids = ACT.filter((a) => a.purpose === p).map((a) => `ac-${a.id}`).join(" "), e = seg(R2, W2, s, share, `sp-${p} acm ${ids}`, soft({ color: L.PURPOSE_COLOR[p] }, 62)); s += share; return e; }).join("");
  const track = `<circle cx="${C}" cy="${C}" r="${R1}" fill="none" stroke="var(--fill)" stroke-width="${W1}"></circle><circle cx="${C}" cy="${C}" r="${R2}" fill="none" stroke="var(--fill)" stroke-width="${W2}"></circle>`;
  const cenAll = `<b class="v">${inr(L.TOTAL)}</b><span class="s">${ACT.length} accounts</span>`;
  const cen = `<div class="cdw">${panes((f) => (f.all ? cenAll : `<b class="v">${f.on ? inr(f.balance) : "₹0"}</b><span class="s">${f.on ? `${L.pct(f.balance, L.TOTAL)} of the total` : "closed: not in the mix"}</span>${f.on ? `<span class="s" style="margin-top:0">${L.purposeName(f.purpose)}</span>` : ""}`))}</div>`;
  const cenHover = accts.map((a) => `<div class="c-${a.id}"><b class="v">${inr(bal(a.id))}</b><span class="s">${a.name}</span><span class="s" style="margin-top:0">${L.pct(bal(a.id), L.TOTAL)} of the total</span></div>`).join("") + PURP_ORDER.map((p) => `<div class="c-p-${p}"><b class="v">${inr(purpTotal(p))}</b><span class="s">${L.purposeName(p)}</span><span class="s" style="margin-top:0">${L.pct(purpTotal(p), L.TOTAL)} of the total</span></div>`).join("");
  const hov = `<style>${[...accts.map((a) => [`.sg-${a.id}`, `.lg-${a.id}`, `.c-${a.id}`]), ...PURP_ORDER.map((p) => [`.sp-${p}`, `.lgp-${p}`, `.c-p-${p}`])].map(([sg1, lg, c]) => `.${prefix}mx:has(${sg1}:hover) .cen > .cdw, .${prefix}mx:has(${lg}:hover) .cen > .cdw { display: none; } .${prefix}mx:has(${sg1}:hover) .cen > ${c}, .${prefix}mx:has(${lg}:hover) .cen > ${c} { display: block; } .${prefix}mx:has(${lg}:hover) ${sg1} { stroke-width: calc(var(--w) + 9px); } .${prefix}mx:has(${sg1}:hover) ${lg} { background: var(--fill); }`).join("\n")}</style>`;
  const ring = `<div class="wmx" style="width:${size}px;height:${size}px;align-self:center"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Where the money sits, by account and by purpose">${track}${inner}${outer}</svg><div class="cen">${cen}${cenHover}</div></div>`;
  const acctRow = (a) => `<label for="${prefix}-sel-${a.id}" class="wmx-lg lg-${a.id} acm ac-${a.id}"><i style="width:10px;height:10px;border-radius:3px;background:${up(a)}"></i><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}${FACTS[a.id].stale ? ` <span style="color:var(--warning-text)">${I.clock(10)}</span>` : ""}</span><b>${inrS(bal(a.id))}</b><span class="p">${L.pct(bal(a.id), L.TOTAL)}</span></label>`;
  const lg = legend === "accounts"
    ? `<div class="spread" style="gap:0">${accts.map(acctRow).join("")}</div>`
    : `<div class="spread" style="gap:0">${PURP_ORDER.map((p) => { const ids = ACT.filter((a) => a.purpose === p); return `<div class="wmx-gh lgp-${p} acm ${ids.map((a) => `ac-${a.id}`).join(" ")}">${L.purposeIcon(p, 13)}${L.purposeName(p)}${ids.length > 1 ? `<span class="r">${inrS(purpTotal(p))} · ${L.pct(purpTotal(p), L.TOTAL)}</span>` : ""}</div>${ids.map(acctRow).join("")}`; }).join("")}</div>`;
  const closed = `<span class="row" style="gap:6px;flex-wrap:wrap">${L.CLOSED.map((a) => `<label for="${prefix}-sel-${a.id}" class="chip" style="cursor:pointer;padding:4px 10px 4px 5px">${mono(a, 16)}${a.name}<em>closed, ₹0</em></label>`).join("")}</span>`;
  const body = layout === "side" ? `<div style="display:flex;gap:26px;align-items:center;flex:1 1 auto;flex-wrap:${ph ? "wrap" : "nowrap"}">${ring}<div style="flex:1 1 200px;min-width:0;display:flex;flex-direction:column;justify-content:center">${lg.replace('class="spread" style="gap:0"', 'style="display:flex;flex-direction:column;gap:2px"')}</div></div>` : `<div style="display:flex;flex-direction:column;gap:12px;flex:1 1 auto">${ring}${lg}</div>`;
  return `<section class="card glass ${prefix}mx" style="gap:12px;${ph ? "padding:16px" : ""}">${hov}${head("The mix", "outside the accounts, inside what they're for · the latest balances", "", ph)}${body}${foot("Latest balances of active accounts", closed)}</section>`;
}

// =====================================================================================================================
// What's coming (from the loan schedule, income and cards). The list is at most the next 45 days: the usual monthly
// amounts, repeated. A card bill is "about" the card's last bill. Everything here is worked out, not a statement.
// =====================================================================================================================
const lastBill = (ref) => L.FLOWS.filter((x) => x.ref === ref && x.kind === "card").at(-1).amount;
export const UPCOMING = [
  { d: "2026-11-01", acct: "hdfc", kind: "income", label: "Salary", amt: 138500, note: "the usual monthly amount" },
  { d: "2026-11-05", acct: "axis", kind: "emi", label: "Car loan EMI", amt: 22450, note: "from your loan schedule" },
  { d: "2026-11-06", acct: "hdfc", kind: "card", ref: "cor", label: "Coral bill", amt: lastBill("cor"), about: true, note: "usually paid from here" },
  { d: "2026-11-12", acct: "hdfc", kind: "card", ref: "mil", label: "Millennia bill", amt: lastBill("mil"), about: true, note: "usually paid from here" },
  { d: "2026-11-18", acct: "kotak", kind: "card", ref: "ace", label: "Ace bill", amt: lastBill("ace"), about: true, note: "usually paid from here" },
  { d: "2026-12-01", acct: "hdfc", kind: "income", label: "Salary", amt: 138500, note: "the usual monthly amount" },
  { d: "2026-12-01", acct: "kotak", kind: "sub", ref: "swiggy", label: "Swiggy One", amt: 549, note: "charged every 3 months" },
  { d: "2026-12-05", acct: "axis", kind: "emi", label: "Car loan EMI", amt: 22450, note: "from your loan schedule" },
];
const evSign = (e) => (e.kind === "income" ? 1 : -1);
const evColor = (e) => (e.kind === "income" ? "var(--positive)" : L.KINDS[e.kind].color);
const evIcon = (e, s = 12) => (e.kind === "income" ? I.down(s) : e.kind === "emi" ? I.loans(s) : e.kind === "card" ? I.cards(s) : I.subs(s));
const within = (days, id) => UPCOMING.filter((e) => e.d <= L.addDays(L.TODAY, days) && (!id || e.acct === id));
const amt = (e) => `${e.about ? "about " : ""}${evSign(e) > 0 ? "+" : ""}${e.about ? inrS(e.amt) : inr(e.amt)}`;
/** What each account would hold after each event in the next `days`, if nothing else lands (no top-ups, no transfers). */
function runwayOf(id, days) {
  let b = bal(id);
  const steps = within(days, id).map((e) => { b += evSign(e) * e.amt; return { e, after: b }; });
  return { start: bal(id), steps, end: b, low: Math.min(bal(id), ...steps.map((s) => s.after)) };
}
const worstShort = (days) => ACT.map((a) => ({ a, r: runwayOf(a.id, days) })).filter((x) => x.r.low < 0);

/** For one account whose history is short: under its rows, its balance over the years, growing to fill what's left of the card. */
export const trendFill = (f) => {
  if (!f.on && !L.snapsOf(f.id).length) return "";
  const keys = L.HISTORY, vals = keys.map((k) => (L.atMonth(f.id, k) ?? null));
  const known = vals.map((v, i) => [i, v]).filter(([, v]) => v != null), lo = Math.min(...known.map(([, v]) => v)), hi = Math.max(...known.map(([, v]) => v)), span = hi - lo || 1;
  const X = (i) => (i / (keys.length - 1)) * 100, Y = (v) => 6 + (1 - (v - lo) / span) * 28;
  const d = known.map(([i, v], k) => `${k ? "L" : "M"}${X(i).toFixed(2)},${Y(v).toFixed(2)}`).join(" ");
  const c = `var(--card-${f.color})`, first = known[0], last = known.at(-1);
  return `<div style="position:relative;flex:1 1 auto;min-height:0;margin-top:12px"><svg viewBox="0 0 100 40" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible" aria-hidden="true"><path d="${d} L${X(last[0])},40 L${X(first[0])},40 Z" fill="color-mix(in oklch, ${c} 16%, transparent)"></path><path d="${d}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path></svg><span class="th" style="position:absolute;left:0;top:0">${f.name}'s balance since ${monYear(keys[known[0][0]])}</span><span style="position:absolute;left:0;bottom:2px;font-size:11px;font-weight:700;color:var(--muted)">${inr(first[1])}</span><span style="position:absolute;right:0;bottom:2px;font-size:11px;font-weight:700;color:var(--muted)">${inr(last[1])} now</span></div>`;
};
export function coming(prefix, { ph = false, days = 30 } = {}) {
  const t = tgl(prefix, "cm", [["all", "All"], ["in", "Money in"], ["out", "Money out"]], { size: ph ? 11.5 : 12, pad: ph ? "5px 10px" : "6px 12px" });
  const row = (e) => {
    const a = L.acc(e.acct), r = runwayOf(e.acct, days), st = r.steps.find((s) => s.e === e), short = e.kind !== "income" && st.after < 0;
    const dow = fmtDowShort(e.d);
    return `<div class="wcm-row hov acm ac-${e.acct}" tabindex="0"><span class="wcm-d"><b>${Number(e.d.slice(8))}</b><small>${monName(e.d.slice(0, 7))}</small></span><span style="min-width:0;font-size:13px;font-weight:600;line-height:1.4"><b style="font-weight:800">${e.label}</b> ${evSign(e) > 0 ? "lands in" : "goes out of"} ${a.name}<span class="sub2" style="white-space:normal">${dow} · ${short ? `<span style="color:var(--negative);font-weight:700">${a.name} would be ${inr(-st.after)} short</span>` : e.note}</span></span><b class="num" style="font-size:13px;color:${evSign(e) > 0 ? "var(--positive)" : "var(--fg)"}">${amt(e)}</b>${tip(hc({ h: fmtDowShort(e.d), hr: `<span class="pill ${evSign(e) > 0 ? "pill-on" : "pill-off"}" style="padding:2px 8px;font-size:10px">${evSign(e) > 0 ? "Money in" : "Money out"}</span>`, t: `${evSign(e) > 0 ? "+" : "−"}${inr(e.amt)}`, d: `${e.label}${e.about ? " · about, the card's last bill" : ""}`, rows: [[`${a.name} now`, inr(r.start)], ["After it lands", `<span style="color:${st.after < 0 ? "var(--negative)" : "var(--fg)"}">${inr(st.after)}</span>`]], f: "If nothing else lands in between" }), { w: 250, x: "r", y: "up" })}</div>`;
  };
  const rowsFor = (f, k) => within(days, f.all ? null : f.id).filter((e) => k === "all" || (k === "in" ? evSign(e) > 0 : evSign(e) < 0));
  const sums = (f) => { const l = rowsFor(f, "all"); const i = l.filter((e) => evSign(e) > 0).reduce((s, e) => s + e.amt, 0), o = l.filter((e) => evSign(e) < 0).reduce((s, e) => s + e.amt, 0); return `Next ${days} days: <b style="color:var(--positive)">${inrS(i)} in</b> · <b style="color:var(--fg)">${inrS(o)} out</b>`; };
  const body = panes((f) => {
    if (!f.all && !f.on) return `<div class="wpane" style="gap:0"><div class="wcm-empty" style="flex:0 0 auto;min-height:0;padding:6px 20px 4px"><span class="dlg-ic" style="width:48px;height:48px;border-radius:16px">${I.lock(22)}</span><b style="font-size:15px;color:var(--fg)">${f.name} is closed</b><span style="max-width:270px;line-height:1.5">It closed on ${fmtY(f.closedOn)}, so nothing is due from it.</span>${btn("Reopen", { kind: "soft", cls: "btn-sm", icon: I.play(10) })}</div>${ph ? "" : trendFill(f)}</div>${foot("Nothing due", worked("Worked out"))}`;
    const lists = variants(t, (k) => { const list = rowsFor(f, k); return list.length ? `<div class="${f.all ? "spread" : ""}" style="gap:0;${f.all ? "" : "display:flex;flex-direction:column"}">${list.map(row).join("")}</div>` : `<div class="wcm-empty" style="${f.all ? "" : "min-height:0;padding:10px 0"}">${I.check(f.all ? 20 : 14)}<span>${f.all ? "Nothing recorded" : `Nothing for ${f.name}`} ${k === "in" ? "comes in" : k === "out" ? "goes out" : "is due"} in the next ${days} days.</span></div>`; }, { d: "flex", style: f.all ? "flex-direction:column;flex:1 1 auto" : "flex-direction:column" });
    // One account: under its rows, its balance stepping after each one, which grows to fill the card.
    const after = f.all || ph ? "" : `<div style="display:flex;flex-direction:column;gap:6px;flex:1 1 auto;margin-top:10px;min-height:${ph ? 110 : 130}px"><span class="th">${f.on ? `${f.name}'s balance after each one` : `${f.name} is closed`}</span>${f.on ? laneParts(f.a, days, { style: "flex:1 1 auto;height:auto;min-height:96px" }).cv : ""}</div>`;
    return `<div class="wpane" style="gap:0">${lists}${after}</div>${foot(sums(f), worked("Worked out"))}`;
  }, {}, { flex: true });
  return card(`${t.css}${t.radios}${head("Coming up", "from your loan schedule, income and cards", t.ui, ph)}${body}`, { gap: 10, pad: ph ? "16px" : "" });
}
const fmtDowShort = (iso) => L.fmtDow(iso);

// =====================================================================================================================
// How fresh each balance is: days since it was recorded, against the 30 after which it goes stale. A sort switch; a row
// opens in place to show its last balances.
// =====================================================================================================================
const ageOf = (a) => (L.latest(a.id) ? L.daysBetween(L.latest(a.id).date, L.TODAY) : 999);
export function fresh(prefix, { ph = false, narrow = ph } = {}) {
  const rowsAcc = [...ACT, ...L.CLOSED];
  const ids = rowsAcc.map((a) => a.id);
  const t = sortBy(prefix, "fr", [["age", "Oldest first"], ["bal", "Biggest"], ["az", "A to Z"]], {
    age: rankOrder(ids, (id) => (L.isOn(L.acc(id)) ? -ageOf(L.acc(id)) : 1e6)),
    bal: rankOrder(ids, (id) => -(L.isOn(L.acc(id)) ? bal(id) : -1)),
    az: rankOrder(ids, (id) => 0),
  });
  const MAX = 60, w = (d) => Math.min(d, MAX) / MAX * 100;
  const row = (a) => {
    const f = FACTS[a.id], l = L.latest(a.id), p = L.previous(a.id), age = ageOf(a), stale = f.stale, on = L.isOn(a);
    const track = !on ? `<div class="wfr-tr"><span class="f" style="width:100%;background:repeating-linear-gradient(135deg,var(--fill-strong) 0 4px,transparent 4px 8px)"></span></div>`
      : `<div class="wfr-tr"><span class="f" style="width:${w(Math.min(age, 30))}%;background:linear-gradient(90deg, ${soft(a, 55)}, ${up(a)})${age > 30 ? ";border-radius:999px 0 0 999px" : ""}"></span>${age > 30 ? `<span class="f" style="left:${w(30)}%;width:${w(age) - w(30)}%;background:repeating-linear-gradient(135deg,var(--warning) 0 3px,var(--warning-tint) 3px 6px);border-radius:0 999px 999px 0"></span>` : ""}<span class="m" style="left:${w(30)}%"></span></div>`;
    const when = !on ? `<span class="muted" style="font-weight:700">Closed ${fmt(f.closedOn)}</span>` : `<b style="color:${stale ? "var(--warning-text)" : "var(--fg)"}">${age === 0 ? "today" : age === 1 ? "yesterday" : `${age} days`}</b><span class="sub2">${fmt(l.date)}</span>`;
    const card = hc({ h: a.name, hr: !on ? `<span class="pill pill-off" style="padding:2px 8px;font-size:10px">Closed</span>` : stale ? `<span class="pill pill-stale" style="padding:2px 8px;font-size:10px">${I.clock(9)} Stale</span>` : `<span class="pill pill-on" style="padding:2px 8px;font-size:10px">Fresh</span>`, t: on ? inr(l.balance) : "₹0", d: on ? `Recorded ${fmtY(l.date)}, ${age} days ago` : `Closed ${fmtY(f.closedOn)}`, rows: p ? [["Balance before", inr(p.balance)], ["Gap between them", `${L.daysBetween(p.date, l.date)} days`]] : [], f: on ? (stale ? "Still counts in your total, carried forward" : "Stale after 30 days") : "Its history stays", w: 240 });
    const body = `<div class="wfr-body"><div class="snap">${L.snapsOf(a.id).slice(-3).reverse().map((s, i, arr) => { const prev = L.snapsOf(a.id).at(-(i + 2)); return `<div><small>${fmtY(s.date)}</small><b>${inr(s.balance)}</b><small style="color:${prev ? tone(s.balance - prev.balance) : "var(--muted)"}">${prev ? signed(s.balance - prev.balance) : "first balance"}</small></div>`; }).join("")}</div><div class="between" style="gap:8px"><label for="${prefix}-sel-${a.id}" class="link" style="cursor:pointer">Look at ${a.name} in the hero ${I.arrowR()}</label>${on ? btn("Update balance", { kind: stale ? "primary" : "soft", cls: "btn-xs", icon: I.check(10) }) : ""}</div></div>`;
    const sumStyle = narrow ? `grid-template-columns:28px minmax(0,1fr) auto 14px;grid-template-areas:'m n w c' '. t t t';gap:8px 10px` : "";
    return `<details class="wfr-row o-fr-${a.id} acm ac-${a.id}" name="${prefix}-fr"><summary class="hov" style="${sumStyle}">${narrow ? `<span style="grid-area:m;display:flex">${mono(a, 28)}</span>` : mono(a, 28)}<span style="min-width:0;${narrow ? "grid-area:n" : ""}"><b style="display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</b><span class="sub2">${L.purposeName(a.purpose)}</span></span>${narrow ? `<div style="grid-area:t">${track}</div>` : track}<span style="text-align:right;font-size:12.5px;line-height:1.25;${narrow ? "grid-area:w" : ""}">${when}</span><span class="ch" style="${narrow ? "grid-area:c" : ""}">${I.chevR(12)}</span>${tip(card, { w: 240, x: narrow ? "l" : "c", y: "up" })}</summary>${body}</details>`;
  };
  const axis = narrow ? "" : `<div class="wfr-ax"><span></span><span></span><span class="t"><span>0</span><span>15</span><span>30 days</span><span>45</span><span>60+</span></span><span></span><span></span></div>`;
  const body = `${axis}<div class="spread" style="gap:2px;display:flex;flex-direction:column;justify-content:flex-start;flex:1 1 auto">${rowsAcc.map(row).join("")}</div>${panes((f) => foot(f.all ? `${f.fresh} of ${f.count} up to date${f.staleList.length ? ` · <b style="color:var(--warning-text)">${f.staleList[0].name}</b> is ${ageOf(f.staleList[0])} days behind and still counts in your total` : ""}` : !f.on ? `${f.name} closed ${fmtY(f.closedOn)}` : `${f.name}: ${f.stale ? `<b style="color:var(--warning-text)">${ageOf(f.a)} days</b> since its last balance` : `updated ${ageOf(f.a) === 0 ? "today" : ageOf(f.a) + " days ago"}`} · ${f.snaps} balances`, `<span class="card-note">Stale after ${L.STALE_DAYS} days</span>`))}`;
  return card(`${t.css}${t.radios}${head("How fresh", "days since each balance was recorded", t.ui, ph)}${body}`, { gap: 10, pad: ph ? "16px" : "" });
}

// =====================================================================================================================
// Check-in rings: a ring a month for each account, filled when you recorded a balance that month. Hover a tick to read it.
// =====================================================================================================================
const hasSnap = (id, k) => L.snapsOf(id).some((s) => L.monthKey(s.date) === k);
const snapIn = (id, k) => L.snapsOf(id).filter((s) => L.monthKey(s.date) === k).at(-1);
const streakOf = (id) => { let n = 0, k = NOW; while (hasSnap(id, k)) { n++; k = pkey(k); } return n; };
export function rings(prefix, { ph = false, both = true } = {}) {
  const t = tgl(prefix, "rg", both ? [["y", "This year"], ["a", "Last 24 months"]] : [["y", "This year"]], { size: ph ? 11.5 : 12, pad: ph ? "5px 10px" : "6px 13px" });
  const S = ph ? 118 : 150;
  const keysFor = (v) => (v === "y" ? upTo("2026-01", "2026-12") : upTo("2024-11", NOW));
  const tile = (a) => {
    const f = FACTS[a.id], l = L.latest(a.id), firstK = L.monthKey(L.snapsOf(a.id)[0].date), lastK = L.monthKey(l.date), on = L.isOn(a);
    const ringOf = (v) => {
      const keys = keysFor(v), n = keys.length, tw = n === 12 ? (ph ? 9 : 11) : ph ? 4.5 : 5.5, th = n === 12 ? (ph ? 22 : 28) : ph ? 17 : 22;
      return keys.map((k, i) => {
        const st = k > NOW ? "future" : k < firstK ? "pre" : hasSnap(a.id, k) ? "rec" : !on && k > lastK ? "closed" : on && k > lastK ? "late" : "gap";
        const bg = { rec: `linear-gradient(180deg, ${soft(a, 50)}, ${up(a)})`, gap: "var(--fill-strong)", late: "repeating-linear-gradient(135deg,var(--warning) 0 2px,var(--warning-tint) 2px 4px)", future: "transparent", pre: "transparent", closed: "var(--fill)" }[st];
        const border = st === "future" ? "1.5px dashed var(--fill-strong)" : st === "pre" ? "1px dotted var(--fill-strong)" : st === "late" ? "1px solid oklch(0.72 0.14 75 / 0.6)" : "none";
        const sn = snapIn(a.id, k);
        const read = st === "rec" ? `<b>${inr(sn.balance)}</b><span>${monYear(k)} · recorded ${fmt(sn.date)}</span>` : st === "late" ? `<b style="color:var(--warning-text)">Not yet</b><span>${monYear(k)} · nothing since ${fmt(l.date)}</span>` : st === "future" ? `<b>${monName(k)}</b><span>still to come</span>` : st === "gap" ? `<b>Missed</b><span>${monYear(k)} · no balance</span>` : st === "pre" ? `<b>${monName(k)}</b><span>before it was opened</span>` : `<b>Closed</b><span>after ${fmt(l.date)}</span>`;
        const cur = k === NOW;
        return `<i class="wrg-tk" style="margin-left:-${tw / 2}px;width:${tw}px;height:${cur ? th + 5 : th}px;top:${cur ? -3 : 0}px;transform-origin:50% ${S / 2 + (cur ? 3 : 0)}px;background:${bg};border:${border};transform:rotate(${(i * 360) / n}deg);${cur ? `box-shadow:0 0 0 2px var(--surface), 0 0 0 3.5px ${st === "rec" ? up(a) : "var(--warning)"};` : ""}"></i><span class="wrg-tp">${read}</span>`;
      }).join("");
    };
    const age = ageOf(a);
    const centre = !on ? `<b style="color:var(--muted);font-size:15px">Closed</b><span>${fmt(f.closedOn)}</span>` : `<b style="color:${f.stale ? "var(--warning-text)" : "var(--fg)"}">${age === 0 ? "Today" : `${age}d`}</b><span>since update</span>`;
    const streak = streakOf(a.id);
    const missed = on && lastK < NOW ? upTo(L.addMonthsUTC(`${lastK}-01`, 1).slice(0, 7), NOW) : [];
    const pill = !on ? `<span class="pill pill-off">${I.lock(10)} Closed ${fmt(f.closedOn)}</span>` : streak === 0 ? `<span class="pill pill-stale">${I.clock(10)} Missed ${missed.map((k) => monName(k)).join(", ")}</span>` : `<span class="pill pill-on">${streak} months in a row</span>`;
    return `<label for="${prefix}-sel-${a.id}" class="wrg-tile acm ac-${a.id}"><div class="wrg-ring" style="--rs:${S}px">${variants(t, (v) => `<div style="position:absolute;inset:0">${ringOf(v)}</div>`)}<div class="wrg-c">${centre}</div></div><div style="display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0;max-width:100%"><span class="row" style="gap:7px;max-width:100%">${mono(a, 20)}<b style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</b></span>${pill}</div></label>`;
  };
  const legend = `<span class="legend" style="gap:6px 16px"><span><i style="background:${up({ color: "sapphire" })}"></i>Recorded that month</span><span><i style="background:var(--fill-strong)"></i>Missed</span><span><i style="background:repeating-linear-gradient(135deg,var(--warning) 0 2px,var(--warning-tint) 2px 4px);border:1px solid oklch(0.72 0.14 75 / 0.6)"></i>Overdue</span><span><i style="border:1.5px dashed var(--fill-strong)"></i>Still to come</span></span>`;
  const sumPane = panes((f) => `<span class="card-note">${f.all ? `${L.ACTIVE.length - L.STALE.length} of ${L.ACTIVE.length} recorded this month` : !f.on ? `${f.name} closed ${fmtY(f.closedOn)}` : `${f.name}: ${streakOf(f.id) ? `${streakOf(f.id)} months in a row` : "its streak was broken"}`}</span>`);
  const cells = ph ? "repeat(2,minmax(0,1fr))" : `repeat(${ORDER.length},minmax(0,1fr))`;
  return card(`${t.css}${t.radios}${head("Check-in", "a tick a month · filled when you recorded a balance · hover one to read it", both ? t.ui : "", ph)}<div class="wrg-grid" style="grid-template-columns:${cells};flex:1 1 auto">${ORDER.map(tile).join("")}</div>${foot(sumPane, legend)}`, { gap: 12, pad: ph ? "16px" : "" });
}

// =====================================================================================================================
// A column chart that grows with its card: columns are placed in percent, so it fills whatever height it's given.
// =====================================================================================================================
const niceTicks = (lo, hi, n = 4) => {
  const steps = [2000, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000, 1000000];
  const step = steps.find((s) => (hi - lo) / s <= n) ?? 1000000, out = [];
  for (let v = Math.floor(lo / step) * step; v <= hi + 1e-6; v += step) out.push(v);
  if (out.at(-1) < hi) out.push(out.at(-1) + step);
  return out;
};
function colChart({ n, lo = 0, hi, ticks, col, card, labels, ph = false, minH = 260, avg = null, gap = 0.28, zero = false, fy = null }) {
  const slot = 100 / n, Pc = (v) => ((v - lo) / (hi - lo)) * 100;
  const grid = ticks.filter((v) => v !== 0 || !zero).map((v) => `<i class="wk-g" style="bottom:${Pc(v)}%"></i>`).join("") + (zero ? `<i class="wk-z" style="bottom:${Pc(0)}%"></i>` : "");
  const ylab = ticks.map((v) => `<span style="bottom:${Pc(v)}%">${fy ? fy(v) : v ? (v < 0 ? "−" : "") + inrS(Math.abs(v)) : "0"}</span>`).join("");
  const cols = Array.from({ length: n }, (_, i) => `<span class="wk-slot" style="left:${i * slot + (slot * gap) / 2}%;width:${slot * (1 - gap)}%">${col(i, Pc)}</span>`).join("");
  const hits = Array.from({ length: n }, (_, i) => `<span class="wk-hit hov" tabindex="0" style="left:${i * slot}%;width:${slot}%">${tip(card(i), { w: 236, x: i >= n / 2 ? "side-l" : "side-r" })}</span>`).join("");
  const avgLine = avg ? `<i class="wk-avg" style="bottom:${Pc(avg.v)}%"><span>${avg.label}</span></i>` : "";
  return `<div class="wk" style="min-height:${minH}px;${ph ? "--g:40px" : ""}"><div class="wk-y">${ylab}</div><div class="wk-plot">${grid}${cols}${avgLine}${hits}</div><div class="wk-x" style="grid-template-columns:repeat(${n},minmax(0,1fr))">${labels.map((l) => `<span>${l}</span>`).join("")}</div></div>`;
}

// =====================================================================================================================
// Runway: for every account, its balance stepping down (or up) at each date something is due in the next 15, 30 or 45 days.
// =====================================================================================================================
function laneParts(a, H, { style = "", down = false } = {}) {
  const r = runwayOf(a.id, H), levels = [r.start, ...r.steps.map((s) => s.after)];
  const CH = 64, top = 9, bottom = 9, ymax = Math.max(...levels, 1) * 1.08, ymin = Math.min(0, ...levels) * 1.02;
  const Y = (v) => top + ((ymax - v) / (ymax - ymin)) * (CH - top - bottom);
  const X = (d) => (L.daysBetween(L.TODAY, d) / H) * 100;
  const xs = [0, ...r.steps.map((s) => X(s.e.d)), 100];
  const neg = "oklch(0.55 0.18 25)";
  const rects = levels.map((v, i) => { const y0 = Y(0), y1 = Y(v); return `<rect x="${xs[i]}" width="${xs[i + 1] - xs[i]}" y="${Math.min(y0, y1)}" height="${Math.abs(y1 - y0)}" fill="${v >= 0 ? `color-mix(in oklch, ${up(a)} 17%, transparent)` : "oklch(0.7 0.16 25 / 0.3)"}"></rect>`; }).join("");
  const hl = levels.map((v, i) => `<line x1="${xs[i]}" x2="${xs[i + 1]}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v >= 0 ? up(a) : neg}" stroke-width="2.6" stroke-linecap="round" vector-effect="non-scaling-stroke"></line>`).join("");
  const vl = levels.slice(1).map((v, i) => `<line x1="${xs[i + 1]}" x2="${xs[i + 1]}" y1="${Y(levels[i])}" y2="${Y(v)}" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="2 3" vector-effect="non-scaling-stroke"></line>`).join("");
  const zero = ymin < 0 ? `<line x1="0" x2="100" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--negative)" stroke-width="1.2" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"></line>` : `<line x1="0" x2="100" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--divider)" stroke-width="1.2" vector-effect="non-scaling-stroke"></line>`;
  const grid = Array.from({ length: 5 }, (_, i) => `<i class="wrw-vg" style="left:${((i + 1) * 100) / 5}%"></i>`).join("");
  const pins = r.steps.map((s, i) => { const x = Math.min(97, Math.max(3, X(s.e.d))); return `<span class="wrw-pin hov" tabindex="0" style="left:${x}%;top:${(Y(s.after) / CH) * 100}%;background:${evColor(s.e)}">${evIcon(s.e, 11)}${tip(hc({ h: L.fmtDow(s.e.d), hr: `<span class="pill ${evSign(s.e) > 0 ? "pill-on" : "pill-off"}" style="padding:2px 8px;font-size:10px">${evSign(s.e) > 0 ? "In" : "Out"}</span>`, t: `${evSign(s.e) > 0 ? "+" : "−"}${inr(s.e.amt)}`, d: `${s.e.label}${s.e.about ? ", about (the card's last bill)" : ""}`, rows: [[`${a.name} before`, inr(levels[i])], ["After", `<span style="color:${s.after < 0 ? "var(--negative)" : "var(--fg)"}">${inr(s.after)}</span>`]], f: s.after < 0 ? `${inr(-s.after)} short, unless you top it up` : "If nothing else lands in between", w: 236 }), { w: 236, x: x > 70 ? "r" : x < 20 ? "l" : "c", y: down ? "down" : "up" })}</span>`; }).join("");
  const end = !r.steps.length ? `<span class="muted" style="font-weight:700">Nothing due</span><span class="sub2">in ${H} days</span>` : r.low < 0 ? `<span class="pill" style="background:var(--negative-tint);color:var(--negative)">${I.alert(11)} ${inr(-r.low)} short</span><span class="sub2">from ${fmt(r.steps.find((s) => s.after < 0).e.d)}</span>` : `<b style="font-size:14px">${inrS(r.end)}</b><span class="sub2">left after ${H} days</span>`;
  const cv = `<div class="wrw-cv"${style ? ` style="${style}"` : ""}>${grid}<svg viewBox="0 0 100 ${CH}" preserveAspectRatio="none" aria-hidden="true">${rects}${zero}${vl}${hl}</svg>${pins}</div>`;
  return { r, cv, end };
}

export function runway(prefix, { ph = false } = {}) {
  const t = tgl(prefix, "rw", [["15", "15 days"], ["30", "30 days"], ["45", "45 days"]], { def: "30", size: ph ? 11.5 : 12, pad: ph ? "5px 10px" : "6px 13px" });
  const lanesOrder = ACT.slice().sort((a, b) => (within(45, b.id).length > 0) - (within(45, a.id).length > 0));
  const lane = (a, H) => {
    const { r, cv, end } = laneParts(a, H, { down: a.id === lanesOrder[0].id });
    const who = `<span class="row" style="gap:10px;min-width:0">${mono(a, 30)}<span style="min-width:0"><b style="display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</b><span class="sub2">${inr(r.start)} now${FACTS[a.id].stale ? ` · <span style="color:var(--warning-text)">from ${fmt(FACTS[a.id].asOf)}</span>` : ""}</span></span></span>`;
    const e2 = `<span style="display:flex;flex-direction:column;align-items:${ph ? "flex-start" : "flex-end"};text-align:${ph ? "left" : "right"}">${end}</span>`;
    return ph ? `<div class="wrw-lane acm ac-${a.id}" style="grid-template-columns:minmax(0,1fr) auto;gap:6px 10px"><span>${who}</span>${e2}<span style="grid-column:1 / -1">${cv}</span></div>` : `<div class="wrw-lane acm ac-${a.id}">${who}${cv}${e2}</div>`;
  };
  const axis = (H) => `<div class="wrw-axis" style="${ph ? "" : "margin-left:186px;margin-right:144px"}">${Array.from({ length: 6 }, (_, i) => { const off = Math.round((H / 5) * i); return `<span style="left:${(i * 100) / 5}%;${i === 0 ? "transform:none" : i === 5 ? "transform:translateX(-100%)" : ""}">${i === 0 ? "Today" : fmt(L.addDays(L.TODAY, off))}</span>`; }).join("")}</div>`;
  const foot2 = (H) => panes((f) => { const list = within(H, f.all ? null : f.id), o = list.filter((e) => evSign(e) < 0).reduce((s, e) => s + e.amt, 0), i = list.filter((e) => evSign(e) > 0).reduce((s, e) => s + e.amt, 0); const shorts = (f.all ? worstShort(H) : worstShort(H).filter((x) => x.a.id === f.id)); const sh = shorts.length ? ` · <b style="color:var(--negative)">${shorts[0].a.name} would be ${inr(-shorts[0].r.low)} short on ${fmt(shorts[0].r.steps.find((s) => s.after < 0).e.d)}</b>` : ""; return `<span class="card-note">${list.length ? `${list.length} ${list.length === 1 ? "thing" : "things"} due in ${H} days: <b style="color:var(--fg)">${inrS(o)} out</b>, <b style="color:var(--positive)">${inrS(i)} in</b>${sh}` : `${f.all ? "Nothing" : `Nothing for ${f.name}`} recorded is due in ${H} days`}</span>`; });
  const legend = `<span class="legend" style="gap:6px 14px"><span><i style="background:var(--positive);border-radius:50%"></i>Money in</span><span><i style="background:var(--card-copper);border-radius:50%"></i>EMI</span><span><i style="background:var(--card-sapphire);border-radius:50%"></i>Card bill</span><span><i style="background:var(--card-ruby);border-radius:50%"></i>Subscription</span><span><i style="background:oklch(0.7 0.16 25 / 0.5)"></i>Would be short</span></span>`;
  const body = `<div style="display:flex;flex-direction:column;flex:1 1 auto;gap:2px">${variants(t, (H) => `${axis(H)}<div class="spread" style="gap:0">${lanesOrder.map((a) => lane(a, Number(H))).join("")}</div>`, { d: "flex", style: "flex-direction:column;flex:1 1 auto;gap:0" })}</div>`;
  const footer = `<div class="between foot" style="padding-top:10px;border-top:1px solid var(--divider);gap:12px"><span style="flex:1;min-width:0">${variants(t, (H) => foot2(Number(H)))}</span>${ph ? "" : legend}${worked("Worked out")}</div>`;
  return card(`${t.css}${t.radios}${head("Runway", "what each account would hold after what's due · if nothing else lands", t.ui, ph)}${body}${footer}`, { gap: 10, pad: ph ? "16px" : "" });
}

// =====================================================================================================================
// Money out, month by month: by kind, by item, or in and out. A hovered legend chip lifts its part of every column.
// =====================================================================================================================
const ITEMS = [
  { k: "mil", name: "Millennia", color: "teal", is: (x) => x.ref === "mil" }, { k: "cor", name: "Coral", color: "copper", is: (x) => x.ref === "cor" }, { k: "ace", name: "Ace", color: "violet", is: (x) => x.ref === "ace" },
  { k: "swiggy", name: "Swiggy One", color: "ruby", is: (x) => x.ref === "swiggy" }, { k: "cult", name: "Cult.fit", color: "onyx", is: (x) => x.ref === "cult" },
  { k: "emi", name: "Car loan EMI", color: "sapphire", is: (x) => x.kind === "emi" }, { k: "buy", name: "Shares bought", color: "emerald", is: (x) => x.kind === "invest" },
];
const KIND_KEYS = ["card", "sub", "emi", "invest"];
export function outKinds(prefix, { ph = false, views = ["kind", "item", "net"] } = {}) {
  const NAME = { kind: "By kind", item: "By item", net: "In and out" };
  const t = tgl(prefix, "ok", views.map((v) => [v, NAME[v]]), { size: ph ? 11.5 : 12, pad: ph ? "5px 10px" : "6px 13px" });
  const keys = ph ? L.YEAR.slice(-6) : L.YEAR;
  const segs = (m, view) => (view === "kind" ? KIND_KEYS.map((k) => ({ k, name: L.KINDS[k].name, color: L.KINDS[k].color, v: L.sumKind(m.list, k) })) : ITEMS.map((it) => ({ k: it.k, name: it.name, color: `var(--card-${it.color})`, v: m.list.filter(it.is).reduce((s, x) => s + x.amount, 0) })));
  const chart = (f, view) => {
    const ms = keys.map((k) => L.monthFlows(k, f.all ? null : f.id));
    const totals = ms.map((m) => (view === "net" ? Math.max(m.in, m.out) : m.out));
    const hi = niceTicks(0, Math.max(...totals, 1000)).at(-1), ticks = niceTicks(0, Math.max(...totals, 1000));
    const avg = view === "net" ? null : { v: ms.reduce((s, m) => s + m.out, 0) / ms.length, label: `Usual month ${inrS(ms.reduce((s, m) => s + m.out, 0) / ms.length)}` };
    const col = (i, Pc) => {
      const m = ms[i];
      if (view === "net") return `<span class="wk-stack" style="bottom:0;left:0;right:52%;height:${Pc(m.in)}%;flex-direction:column"><i style="background:var(--heat-3);flex:1"></i></span><span class="wk-stack" style="bottom:0;left:52%;right:0;height:${Pc(m.out)}%"><i style="background:${up({ color: "sapphire" })};flex:1"></i></span>`;
      return `<span class="wk-stack" style="bottom:0;height:${Pc(m.out)}%">${segs(m, view).filter((x) => x.v).map((x) => `<i class="sg-${x.k}" style="flex:${x.v} 1 0;background:linear-gradient(180deg, color-mix(in oklch, ${x.color} 78%, white), ${x.color})"></i>`).join("")}</span>`;
    };
    const card2 = (i) => { const m = ms[i], kk = keys[i]; const rows = view === "net" ? [["Came in", `+${inr(m.in)}`, "var(--heat-3)"], ["Went out", `−${inr(m.out)}`, up({ color: "sapphire" })], ["Everything else", signed(m.other), "var(--muted)"]] : segs(m, view).filter((x) => x.v).map((x) => [x.name, inr(x.v), x.color]); return hc({ h: monYear(kk), hr: kk === NOW ? `<span class="pill pill-off" style="padding:2px 8px;font-size:10px">so far</span>` : "", t: view === "net" ? signed(m.in - m.out) : inr(m.out), d: view === "net" ? "in minus recorded money out" : `${m.out >= avg.v ? "+" : "−"}${inrS(Math.abs(m.out - avg.v))} on a usual month`, rows, f: "Worked out from card bills, subscriptions, EMIs and trades" }); };
    return colChart({ n: keys.length, hi, ticks, col, card: card2, labels: keys.map((k) => (ph ? monName(k)[0] : monName(k))), ph, minH: ph ? 210 : 250, avg, gap: view === "net" ? 0.2 : 0.3 });
  };
  const legendFor = (view) => (view === "net" ? `<span class="wok-lg"><i style="background:var(--heat-3)"></i>Came in</span><span class="wok-lg"><i style="background:${up({ color: "sapphire" })}"></i>Went out</span>` : (view === "kind" ? KIND_KEYS.map((k) => ({ k, name: L.KINDS[k].name, color: L.KINDS[k].color })) : ITEMS.map((it) => ({ k: it.k, name: it.name, color: `var(--card-${it.color})` }))).map((x) => `<span class="wok-lg lk lk-${x.k}"><i style="background:${x.color}"></i>${x.name}</span>`).join(""));
  const dim = `<style>${[...KIND_KEYS, ...ITEMS.map((i) => i.k)].map((k) => `.${prefix}ok:has(.lk-${k}:hover) .wk-stack > i:not(.sg-${k}) { opacity: 0.2; }`).join("\n")}</style>`;
  const body = panes((f) => `<div class="wpane" style="gap:12px">${variants(t, (v) => `<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px">${legendFor(v)}</div>${chart(f, v)}`, { d: "flex", style: "flex-direction:column;flex:1 1 auto" })}</div>${foot(f.all ? "Between your own accounts, transfers cancel out" : `Paid from ${f.name}`, worked("Worked out, not a statement"))}`, {}, { flex: true });
  return `<section class="card glass ${prefix}ok" style="gap:12px;${ph ? "padding:16px" : ""}">${dim}${t.css}${t.radios}${head("Money out, month by month", "this year · from your card bills, subscriptions, EMIs and trades", t.ui, ph)}${body}</section>`;
}

// =====================================================================================================================
// Emergency buffer: the balance divided by what the recorded bills cost a month. An open decision (what counts as usual bills).
// =====================================================================================================================
export const USUAL = (() => { const ms = ["2026-07", "2026-08", "2026-09"].map((k) => L.monthFlows(k, null)); return ms.reduce((s, m) => s + L.sumKind(m.list, "card") + L.sumKind(m.list, "sub") + L.sumKind(m.list, "emi"), 0) / ms.length; })();
const months1 = (v) => (v / USUAL).toFixed(1);
export function buffer(prefix, { ph = false } = {}) {
  const cellsOf = (v, color) => `<span class="wbf-cells">${Array.from({ length: 12 }, (_, i) => `<i><b style="width:${Math.max(0, Math.min(1, v / USUAL - i)) * 100}%;background:${color}"></b></i>`).join("")}</span>`;
  const row = (a) => {
    const f = FACTS[a.id], m = bal(a.id) / USUAL, ef = a.purpose === "Emergency-Fund";
    const card2 = hc({ h: a.name, hr: ef ? `<span class="pill pill-on" style="padding:2px 8px;font-size:10px">${I.shield(9)} Emergency fund</span>` : "", t: `${months1(bal(a.id))} months`, d: `${inr(bal(a.id))} ÷ ${inr(USUAL)}`, rows: [["Card bills", inr(P_AVG.card), "var(--card-sapphire)"], ["Subscriptions", inr(P_AVG.sub), "var(--card-ruby)"], ["Loan EMIs", inr(P_AVG.emi), "var(--card-copper)"]], f: f.stale ? `Its balance is from ${fmt(f.asOf)}` : "Average of Jul, Aug and Sep", w: 240 });
    return `<div class="wbf-row hov acm ac-${a.id}" tabindex="0">${mono(a, 26)}<span style="display:flex;flex-direction:column;gap:5px;min-width:0"><span class="between" style="gap:8px"><span style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}${ef ? ` <span style="color:var(--accent-text)">${I.shield(11)}</span>` : ""}</span><b style="font-size:12.5px;color:${f.stale ? "var(--warning-text)" : "var(--fg)"}">${months1(bal(a.id))} mo${f.stale ? ` ${I.clock(10)}` : ""}</b></span>${cellsOf(bal(a.id), f.stale ? `repeating-linear-gradient(135deg, ${up(a)} 0 4px, ${soft(a, 55)} 4px 8px)` : `linear-gradient(90deg, ${soft(a, 60)}, ${up(a)})`)}</span>${tip(card2, { w: 240, x: "c", y: "up" })}</div>`;
  };
  const all = `<div class="wbf-row hov" style="margin-top:2px;border-top:1px solid var(--divider);padding-top:10px;border-radius:0 0 12px 12px" tabindex="0">${allMono(26)}<span style="display:flex;flex-direction:column;gap:5px"><span class="between"><b style="font-size:12.5px">Everything you hold</b><b style="font-size:12.5px">${months1(L.TOTAL)} mo</b></span>${cellsOf(L.TOTAL, "linear-gradient(90deg, var(--card-emerald-from), var(--card-emerald))")}</span>${tip(hc({ h: "All accounts", t: `${months1(L.TOTAL)} months`, d: `${inr(L.TOTAL)} ÷ ${inr(USUAL)}`, f: "Counts every active account's latest balance" }), { w: 240, x: "c", y: "up" })}</div>`;
  const axis = `<div style="display:grid;grid-template-columns:26px minmax(0,1fr);gap:10px;padding:0 8px;margin:0 -8px"><span></span><span style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:4px;font-size:10px;font-weight:700;color:var(--muted);text-align:center">${Array.from({ length: 12 }, (_, i) => `<span>${(i + 1) % 3 === 0 ? i + 1 : ""}</span>`).join("")}</span></div>`;
  const note = panes((f) => `<span class="card-note">${f.all ? `Emergency fund alone: <b style="color:var(--fg)">${months1(bal("sbi"))} months</b>` : !f.on ? `${f.name} is closed` : `${f.name} alone: <b style="color:var(--fg)">${months1(f.balance)} months</b>`}</span>`);
  const open = `<span class="pill pill-warn" title="Open decision">${I.info(10)} Open decision</span>`;
  return card(`${head("Emergency buffer", "months of bills the balance would cover", open, ph)}<div class="spread" style="gap:0">${axis}${ACT.map(row).join("")}${all}</div>${foot(note, `<span class="card-note">1 month = ${inrS(USUAL)}</span>`)}`, { gap: 12, pad: ph ? "16px" : "" });
}
const P_AVG = (() => { const ms = ["2026-07", "2026-08", "2026-09"].map((k) => L.monthFlows(k, null)); const avg = (kind) => ms.reduce((s, m) => s + L.sumKind(m.list, kind), 0) / 3; return { card: avg("card"), sub: avg("sub"), emi: avg("emi") }; })();

// =====================================================================================================================
// Money out, by account: a bar per account split into what it pays, for the year so far. Amount or share.
// =====================================================================================================================
export function outSplit(prefix, { ph = false } = {}) {
  const t = tgl(prefix, "os", [["amt", "Amount"], ["pct", "Share"]], { size: ph ? 11.5 : 12, pad: ph ? "5px 10px" : "6px 13px" });
  const data = ACT.map((a) => { const list = L.YEAR.flatMap((k) => L.monthFlows(k, a.id).list); const parts = ITEMS.map((it) => ({ ...it, v: list.filter(it.is).reduce((s, x) => s + x.amount, 0) })).filter((x) => x.v); return { a, parts, total: parts.reduce((s, x) => s + x.v, 0) }; });
  const max = Math.max(...data.map((d) => d.total));
  const row = (d) => {
    const a = d.a, bar = (mode) => `<span class="wos-trk"><span class="wos-bar" style="width:${mode === "amt" ? (d.total / max) * 100 : 100}%;${d.total ? "" : "width:100%"}">${d.parts.map((x) => `<span class="hov" tabindex="0" style="flex:${x.v} 1 0">${`<i style="background:linear-gradient(180deg, color-mix(in oklch, var(--card-${x.color}) 75%, white), var(--card-${x.color}))"></i>`}${tip(hc({ h: a.name, t: inr(x.v), d: `${x.name} · ${L.pct(x.v, d.total)} of what it pays`, rows: d.parts.map((y) => [y.name, inr(y.v), `var(--card-${y.color})`]), f: "This year so far, worked out", w: 230 }), { w: 230, x: "c", y: "up" })}</span>`).join("") || `<i style="flex:1;border-radius:9px;background:repeating-linear-gradient(135deg,var(--fill) 0 5px,transparent 5px 10px)"></i>`}</span></span>`;
    return `<label for="${prefix}-sel-${a.id}" class="wos-row acm ac-${a.id}" style="cursor:pointer;${ph ? "grid-template-columns:minmax(0,1fr) auto;gap:6px 10px" : ""}"><span class="row" style="gap:10px;min-width:0">${mono(a, 28)}<span style="min-width:0"><b style="display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</b><span class="sub2">${d.parts.length ? d.parts.map((x) => x.name).slice(0, 2).join(", ") + (d.parts.length > 2 ? ` +${d.parts.length - 2}` : "") : "pays nothing recorded"}</span></span></span>${ph ? "" : `<span style="min-width:0">${variants(t, bar)}</span>`}<b class="num" style="text-align:right;font-size:13px;${d.total ? "" : "color:var(--muted)"}">${d.total ? inr(d.total) : "—"}</b>${ph ? `<span style="grid-column:1 / -1">${variants(t, bar)}</span>` : ""}</label>`;
  };
  const note = panes((f) => `<span class="card-note">${f.all ? `${data.filter((d) => d.total).length} of ${ACT.length} accounts pay something recorded` : !f.on ? `${f.name} is closed` : (() => { const d = data.find((x) => x.a.id === f.id); return d.total ? `${f.name} pays ${inr(d.total)}: ${d.parts.map((x) => `${x.name} ${L.pct(x.v, d.total)}`).join(" · ")}` : `Nothing recorded is paid from ${f.name}`; })()}</span>`);
  return card(`${t.css}${t.radios}${head("Who pays what", "money out of each account this year · worked out", t.ui, ph)}<div class="spread" style="gap:2px">${data.map(row).join("")}</div>${foot(note, worked("Worked out, not a statement"))}`, { gap: 12, pad: ph ? "16px" : "" });
}

// =====================================================================================================================
// Each account's trend: twelve small columns on the account's own scale, the balance, and how it moved since last month.
// A sort switch; a row opens in place to show its last six months.
// =====================================================================================================================
export function trendRows(prefix, { ph = false } = {}) {
  const ids = ORDER.map((a) => a.id);
  const mv = (id) => { const a = balAt(id, NOW) ?? 0, b = balAt(id, pkey(NOW)) ?? 0; return { d: a - b, from: b, to: a }; };
  const t = sortBy(prefix, "tr", [["bal", "Biggest"], ["chg", "Biggest move"], ["az", "A to Z"]], {
    bal: rankOrder(ids, (id) => -(L.isOn(L.acc(id)) ? bal(id) : -1)),
    chg: rankOrder(ids, (id) => -Math.abs(mv(id).d) + (L.isOn(L.acc(id)) ? 0 : 1e9)),
    az: rankOrder(ids, () => 0),
  });
  const row = (a) => {
    const f = FACTS[a.id], on = L.isOn(a), vals = L.LAST12.map((k) => balAt(a.id, k)), known = vals.filter((v) => v != null), lo = Math.min(...known), hi = Math.max(...known), m = mv(a.id);
    const lastK = L.monthKey(L.latest(a.id).date);
    const cols = L.LAST12.map((k, i) => {
      const v = vals[i];
      if (v == null) return `<span class="hov"><i style="height:3px;background:var(--fill-strong);opacity:0.6"></i></span>`;
      const h = known.length < 2 || hi === lo ? 55 : 16 + (84 * (v - lo)) / (hi - lo), rec = hasSnap(a.id, k), late = on && k > lastK;
      const bg = late ? `repeating-linear-gradient(135deg,var(--warning) 0 3px,var(--warning-tint) 3px 6px)` : rec ? `linear-gradient(180deg, ${soft(a, 50)}, ${up(a)})` : soft(a, 38);
      const prev = balAt(a.id, pkey(k));
      return `<span class="hov" tabindex="0"><i style="height:${h}%;background:${bg};${k === NOW ? `box-shadow:0 0 0 2px var(--surface), 0 0 0 3.5px ${late ? "var(--warning)" : up(a)}` : ""}"></i>${tip(hc({ h: monYear(k), t: inr(v), d: prev != null ? `${signed(v - prev)} on ${monName(pkey(k))}` : "its first month", f: late ? `Not recorded since ${fmt(L.latest(a.id).date)}: carried` : rec ? `Recorded ${fmt(snapIn(a.id, k).date)}` : "No balance that month: carried from the one before", w: 220 }), { w: 220, x: i > 8 ? "r" : i < 2 ? "l" : "c" })}</span>`;
    }).join("");
    const body = `<div class="wtr-body">${upTo(L.addMonthsUTC(`${NOW}-01`, -5).slice(0, 7), NOW).reverse().map((k) => { const v = balAt(a.id, k), pv = balAt(a.id, pkey(k)); return `<div><small>${monYear(k)}</small><b>${v == null ? "—" : inr(v)}</b><small style="color:${v != null && pv != null ? tone(v - pv) : "var(--muted)"}">${v != null && pv != null ? signed(v - pv) : ""}</small></div>`; }).join("")}</div>`;
    return `<details class="wtr-row o-tr-${a.id} acm ac-${a.id}" name="${prefix}-tr"><summary>${`<span class="row" style="gap:10px;min-width:0">${mono(a, 30)}<span style="min-width:0"><b style="display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</b><span class="sub2">${L.purposeName(a.purpose)}${!on ? " · closed" : f.stale ? ` · <span style="color:var(--warning-text)">${fmt(f.asOf)}</span>` : ""}</span></span></span>`}<span class="wtr-cols">${cols}</span><b class="num" style="text-align:right;font-size:14px">${on ? inr(bal(a.id)) : "₹0"}</b><span style="text-align:right;font-size:13px;font-weight:800;color:${tone(m.d)}">${m.d ? signed(m.d) : f.stale ? `<span style="color:var(--warning-text)">${I.clock(10)} no change</span>` : "no change"}</span><span style="text-align:right;font-size:12px;font-weight:700;color:${tone(m.d)}">${m.d ? pctTxt(m.d, m.from) : ""}</span><span class="ch">${I.chevR(12)}</span></summary>${body}</details>`;
  };
  const head2 = `<div class="wtr-hd" style="display:grid;grid-template-columns:190px minmax(0,1fr) 112px 106px 66px 14px;gap:18px;padding:0 10px"><span class="th">Account</span><span class="th">Last 12 months · each on its own scale</span><span class="th" style="text-align:right">Balance</span><span class="th" style="text-align:right">Since Sep 30</span><span class="th" style="text-align:right">%</span><span></span></div>`;
  const note = panes((f) => { if (f.all) { const d = L.TOTAL - L.totalAtMonth(pkey(NOW)); return `<span class="card-note">All accounts together <b style="color:${tone(d)}">${signed(d)}</b> ${pctTxt(d, L.totalAtMonth(pkey(NOW)))} since Sep 30</span>`; } const r = f.range; return `<span class="card-note">${f.name}: highest <b style="color:var(--fg)">${inr(r.hi.v)}</b> in ${monName(r.hi.k)} · lowest <b style="color:var(--fg)">${inr(r.lo.v)}</b> in ${monName(r.lo.k)}</span>`; });
  return card(`${t.css}${t.radios}${head("Each account's trend", "balance month by month, and how it moved since last month", t.ui, ph)}${ph ? "" : head2}<div class="spread" style="gap:2px;display:flex;flex-direction:column;justify-content:flex-start;flex:1 1 auto">${ORDER.map(row).join("")}</div>${foot(note, worked("Worked out from balances"))}`, { gap: 10, pad: ph ? "16px" : "" });
}

// =====================================================================================================================
// The over-time chart: a full-width card with a switch between views, every account a colour in each column.
// =====================================================================================================================
const SERIES = ORDER.slice().reverse(); // stacked from the bottom: the smallest on top
export function overTime(prefix, { views = ["stack", "change", "share"], ph = false, minH = 340 } = {}) {
  const NAMES = { stack: "Stacked", change: "Change", share: "Share" };
  const t = tgl(prefix, "ot", views.map((v) => [v, NAMES[v]]), { size: ph ? 11.5 : 12.5, pad: ph ? "5px 10px" : "6px 14px" });
  const keys = ph ? L.LAST12.slice(-6) : L.LAST12;
  const val = (a, k) => (L.isOn(a) || k <= L.monthKey(L.closedOn(a) ?? NOW) ? balAt(a.id, k) ?? 0 : 0);
  const seg = (a, v, extra = "", inner = "") => `<i class="acm ac-${a.id}" style="flex:${v} 1 0;background:linear-gradient(180deg, ${soft(a, 70)}, ${up(a)});${extra}">${inner}</i>`;
  const chart = (view) => {
    if (view === "stack") {
      const totals = keys.map((k) => SERIES.reduce((s, a) => s + val(a, k), 0)), ticks = niceTicks(0, Math.max(...totals) * 1.02, 4), hi = ticks.at(-1);
      const col = (i, Pc) => `<span class="wk-stack" style="bottom:0;height:${Pc(totals[i])}%">${SERIES.filter((a) => val(a, keys[i]) > 0).map((a) => seg(a, val(a, keys[i]))).join("")}</span>`;
      const card2 = (i) => hc({ h: monYear(keys[i]), hr: keys[i] === NOW ? `<span class="pill pill-off" style="padding:2px 8px;font-size:10px">so far</span>` : "", t: inr(totals[i]), d: `${signed(totals[i] - (i ? totals[i - 1] : L.totalAtMonth(pkey(keys[0]))))} on ${monName(pkey(keys[i]))}`, rows: ORDER.filter((a) => val(a, keys[i]) > 0).map((a) => [a.name, inr(val(a, keys[i])), up(a)]), f: "Each at its latest balance by then" });
      return colChart({ n: keys.length, hi, ticks, col, card: card2, labels: keys.map((k) => (ph ? monName(k)[0] : monName(k))), ph, minH, gap: 0.26 });
    }
    if (view === "change") {
      const dl = (a, k) => val(a, k) - val(a, pkey(k));
      const pos = keys.map((k) => SERIES.reduce((s, a) => s + Math.max(0, dl(a, k)), 0)), neg = keys.map((k) => SERIES.reduce((s, a) => s + Math.max(0, -dl(a, k)), 0));
      const ticks = niceTicks(-Math.max(...neg) * 1.05, Math.max(...pos) * 1.05, 5), lo = ticks[0], hi = ticks.at(-1);
      const col = (i, Pc) => `<span class="wk-stack" style="bottom:${Pc(0)}%;height:${Pc(pos[i]) - Pc(0)}%">${SERIES.filter((a) => dl(a, keys[i]) > 0).map((a) => seg(a, dl(a, keys[i]))).join("")}</span><span class="wk-stack dn" style="bottom:${Pc(-neg[i])}%;height:${Pc(0) - Pc(-neg[i])}%">${SERIES.filter((a) => dl(a, keys[i]) < 0).map((a) => seg(a, -dl(a, keys[i]), `background:linear-gradient(180deg, ${DOWN}, color-mix(in oklch, ${DOWN} 70%, ${up(a)}))`)).join("")}</span>`;
      const card2 = (i) => { const net = pos[i] - neg[i]; return hc({ h: monYear(keys[i]), t: signed(net), d: `${signed(pos[i])} up · ${signed(-neg[i])} down`, rows: ORDER.filter((a) => dl(a, keys[i]) !== 0).map((a) => [a.name, signed(dl(a, keys[i])), dl(a, keys[i]) > 0 ? up(a) : DOWN]), f: "Each account's balance against the month before" }); };
      return colChart({ n: keys.length, lo, hi, ticks, col, card: card2, labels: keys.map((k) => (ph ? monName(k)[0] : monName(k))), ph, minH, gap: 0.26, zero: true });
    }
    const totals = keys.map((k) => SERIES.reduce((s, a) => s + val(a, k), 0));
    const col = (i, Pc) => `<span class="wk-stack" style="bottom:0;height:100%">${SERIES.filter((a) => val(a, keys[i]) > 0).map((a) => seg(a, val(a, keys[i]), "display:flex;align-items:center;justify-content:center;color:white;font-size:10.5px;font-weight:800;text-shadow:0 1px 2px oklch(0 0 0 / 0.3)", val(a, keys[i]) / totals[i] > (ph ? 0.14 : 0.08) ? `${Math.round((val(a, keys[i]) / totals[i]) * 100)}%` : "")).join("")}</span>`;
    const card2 = (i) => hc({ h: monYear(keys[i]), t: inr(totals[i]), d: "share of the total", rows: ORDER.filter((a) => val(a, keys[i]) > 0).map((a) => [a.name, `${L.pct(val(a, keys[i]), totals[i])}`, up(a)]), f: "Each at its latest balance by then" });
    return colChart({ n: keys.length, hi: 100, ticks: [0, 25, 50, 75, 100], fy: (v) => `${v}%`, col: (i, Pc) => col(i, (v) => v), card: card2, labels: keys.map((k) => (ph ? monName(k)[0] : monName(k))), ph, minH, gap: 0.26 });
  };
  const chips = `<span class="row" style="gap:6px;flex-wrap:wrap">${ORDER.map((a) => `<label for="${prefix}-sel-${a.id}" class="chip acm ac-${a.id}" style="cursor:pointer;padding:4px 10px 4px 5px;gap:6px"><i style="width:9px;height:9px;border-radius:3px;background:${up(a)}"></i>${ph ? a.name.split(" ")[0] : a.name}</label>`).join("")}</span>`;
  const subs = { stack: "month-end balances, every account stacked", change: "how much each account moved that month, up and down", share: "each account's share of the total" };
  return card(`${t.css}${t.radios}${head("Over time", ph ? "" : "the last 12 months · pick an account to lift it out", t.ui, ph)}${ph ? "" : `<div class="between" style="gap:12px;flex-wrap:wrap">${chips}<span class="muted" style="font-size:12px;font-weight:600">${variants(t, (v) => subs[v], { d: "inline" })}</span></div>`}${variants(t, chart, { d: "flex", style: "flex-direction:column;flex:1 1 auto" })}`, { gap: 12, pad: ph ? "16px" : "" });
}

// =====================================================================================================================
// Update rhythm: when each balance was recorded over the last year, and how long between them.
// =====================================================================================================================
export function rhythm(prefix, { ph = false } = {}) {
  const t = tgl(prefix, "rh", [["when", "When"], ["gap", "Days between"]], { size: ph ? 11.5 : 12.5, pad: ph ? "5px 10px" : "6px 14px" });
  const START = "2025-11-01", END = "2026-10-31", span = L.daysBetween(START, END);
  const X = (d) => (L.daysBetween(START, d) / span) * 100, xt = X(L.TODAY);
  const mkeys = upTo("2025-11", NOW);
  const snaps = (a) => L.snapsOf(a.id).map((s, i, all) => ({ ...s, prev: all[i - 1] ?? null, gap: all[i - 1] ? L.daysBetween(all[i - 1].date, s.date) : null })).filter((s) => s.date >= START);
  const gridv = mkeys.map((k) => `<i class="wrw-vg" style="left:${X(`${k}-01`)}%"></i>`).join("");
  const lane = (a, view) => {
    const f = FACTS[a.id], list = snaps(a), on = L.isOn(a), col = up(a), age = ageOf(a);
    const tipFor = (s, x) => tip(hc({ h: fmtY(s.date), t: inr(s.balance), d: s.prev ? `${signed(s.balance - s.prev.balance)} · ${s.gap} days after the one before` : "its first balance", f: s.gap > 30 ? "A gap longer than 30 days" : "On time", w: 220 }), { w: 220, x: x > 78 ? "r" : x < 14 ? "l" : "c" });
    let inner;
    if (view === "when") {
      const first = list[0] ? X(list[0].date) : 0, last = list.at(-1) ? X(list.at(-1).date) : 0;
      inner = `${gridv}${list.length ? `<i style="position:absolute;left:${first}%;width:${last - first}%;top:50%;border-top:2px solid color-mix(in oklch, ${col} 38%, transparent)"></i>` : ""}${f.stale ? `<i style="position:absolute;left:${last}%;width:${xt - last}%;top:50%;border-top:2px dashed var(--warning)"></i><span class="pill pill-stale" style="position:absolute;left:${(last + xt) / 2}%;top:50%;transform:translate(-50%,-50%);font-size:10.5px">${I.clock(9)} ${age} days</span>` : ""}${list.map((s) => `<span class="wrh-dot hov" tabindex="0" style="left:${X(s.date)}%;top:50%;--c:${on ? col : "var(--muted)"}">${tipFor(s, X(s.date))}</span>`).join("")}`;
    } else {
      inner = `${gridv}<i style="position:absolute;left:0;right:0;bottom:calc(8px + (100% - 12px) * ${30 / 62});border-top:1.5px dashed var(--warning);opacity:0.7"></i>${list.filter((s) => s.gap != null).map((s) => `<span class="wrh-gap hov" tabindex="0" style="left:${X(s.date)}%;width:${ph ? 8 : 12}px;margin-left:-${ph ? 4 : 6}px;height:calc((100% - 12px) * ${Math.min(s.gap, 62) / 62});background:${s.gap > 30 ? `linear-gradient(to top, ${col} 0, ${col} ${(30 / s.gap) * 100}%, var(--warning) ${(30 / s.gap) * 100}%, oklch(0.8 0.13 80) 100%)` : `linear-gradient(180deg, ${soft(a, 55)}, ${col})`};${on ? "" : "filter:grayscale(1);opacity:0.6"}">${tipFor(s, X(s.date))}</span>`).join("")}`;
    }
    const gaps = list.filter((s) => s.gap != null).map((s) => s.gap), avg = gaps.length ? Math.round(gaps.reduce((x, y) => x + y, 0) / gaps.length) : null;
    const who = `<span class="row" style="gap:10px;min-width:0">${mono(a, 28)}<span style="min-width:0"><b style="display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.name}</b><span class="sub2">${!on ? `closed ${fmt(f.closedOn)}` : avg ? `about every ${avg} days` : "no balances yet"}</span></span></span>`;
    const right = view === "when" ? `<span style="text-align:right;font-size:12px;line-height:1.3;font-weight:700;color:${f.stale ? "var(--warning-text)" : "var(--muted)"}">${on ? `Last ${fmt(L.latest(a.id).date)}` : "closed"}<span class="sub2" style="margin-top:0">${list.length} balances</span></span>` : `<span style="text-align:right;font-size:12px;line-height:1.3;font-weight:700;color:var(--muted)">${gaps.length ? `longest ${Math.max(...gaps)} d` : ""}<span class="sub2" style="margin-top:0">${gaps.filter((g) => g > 30).length} over 30</span></span>`;
    return ph ? `<label for="${prefix}-sel-${a.id}" class="wrh-lane acm ac-${a.id}" style="grid-template-columns:minmax(0,1fr) auto;height:auto;padding:8px;gap:6px 10px;cursor:pointer"><span>${who}</span>${right}<span class="wrh-tr" style="grid-column:1 / -1;height:46px">${inner}</span></label>` : `<label for="${prefix}-sel-${a.id}" class="wrh-lane acm ac-${a.id}" style="cursor:pointer">${who}<span class="wrh-tr">${inner}</span>${right}</label>`;
  };
  const month = `<div style="position:relative;height:18px;${ph ? "" : "margin-left:190px;margin-right:106px"}">${mkeys.map((k) => `<span style="position:absolute;left:${(X(`${k}-01`) + X(L.monthEnd(k))) / 2}%;transform:translateX(-50%);font-size:10.5px;font-weight:700;color:${k === NOW ? "var(--fg)" : "var(--muted)"}">${ph ? monName(k)[0] : monName(k)}</span>`).join("")}</div>`;
  const body = variants(t, (v) => `${month}<div class="spread" style="gap:0">${ORDER.map((a) => lane(a, v)).join("")}</div>`, { d: "flex", style: "flex-direction:column;flex:1 1 auto;gap:2px" });
  const legend = `<span class="legend" style="gap:6px 14px"><span class="v-rh-when" style="--d:inline-flex"><i style="background:var(--card-sapphire);border-radius:50%"></i>A balance recorded</span><span class="v-rh-gap" style="--d:inline-flex"><i style="background:var(--card-sapphire)"></i>Days since the one before</span><span class="v-rh-gap" style="--d:inline-flex"><i style="background:var(--warning)"></i>Beyond 30 days</span><span><i style="border-top:2px dashed var(--warning);height:0;width:14px;border-radius:0"></i>${ph ? "30 days" : "30 days: stale after"}</span></span>`;
  return card(`${t.css}${t.radios}${head("Update rhythm", "when you recorded each balance over the last year", t.ui, ph)}${body}${foot(panes((f) => `<span class="card-note">${f.all ? `${L.SNAPSHOTS.filter((s) => s.date >= START).length} balances in a year · ${L.ACTIVE.length - L.STALE.length} of ${L.ACTIVE.length} accounts recorded this month` : `${f.name}: ${snaps(f.a).length} balances in the last year`}</span>`), legend)}`, { gap: 12, pad: ph ? "16px" : "" });
}

// Round 11 (2026-10-22) builds on the helpers above (r11.mjs).
export { card, head, foot, worked, colChart, niceTicks, up, soft, balAt, sg, tone };
