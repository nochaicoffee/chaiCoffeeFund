// Round 3's styles: the count-up net worth, the warnings, the lanes, and the three boards (River, Map, Bridge). Picks work with no script.
import { pick } from "./css-ov.mjs";
import * as H from "./history.mjs";
import * as D from "./data.mjs";
import { MKEYS, CELLS, RANGES, GKEYS, LAYERS, BARS, barGeom, NETY } from "./r3.mjs";

const key = (p, k) => `#${p}-${k}:checked`;
const SECCOL = Object.fromEntries(D.SECTIONS.map((s) => [s.key, s.color]));
const pct = (n) => `${n.toFixed(2)}%`;

// One rule per month: the number to count to, where the cursor sits, and where every bridge bar starts and ends.
const monthRules = H.HIST.map((r, i) => {
  const g = barGeom(r);
  const decl = [`--nw: ${r.net}`, `--ci: ${i}`, `--cy: ${NETY[i].toFixed(2)}%`];
  BARS.forEach((b, j) => { decl.push(`--s${j}: ${pct(g[b.k][0])}`, `--h${j}: ${pct(g[b.k][1])}`); });
  const lv = [g.bank, g.fixed, g.lent, g.invest].map(([s, h]) => s + h).concat([g.owned[0] + g.owned[1], g.home[0], g.car[0], g.cards[0]]);
  lv.slice(0, 8).forEach((v, j) => decl.push(`--l${j}: ${pct(v)}`));
  return `.chai-app:has(${key("m", i)}) { ${decl.join("; ")}; }`;
}).join("\n");

const layerRules = LAYERS.filter((k) => k !== "all").map((k) => `.chai-app:has(${key("ly", k)}) .rl:not(.rl-${k}) { opacity: 0.16; }\n.chai-app:has(${key("ly", k)}) .tr:not(.tr-${k}) { opacity: 0.4; }\n.chai-app:has(${key("ly", k)}) .tr-${k} { background: oklch(1 0 0 / 0.16); }`).join("\n");
const dimRules = H.SEC && D.SECTIONS.map((s) => `.chai-app:has(${key("c", s.key)}) .kw .wk:not(.wk-pg-${s.key}) { opacity: 0.28; filter: saturate(0.6); }\n.chai-app:has(${key("c", s.key)}) .kw .wk-pg-${s.key} { background: oklch(1 0 0 / 0.2); box-shadow: 0 0 0 1.5px oklch(1 0 0 / 0.7); }`).join("\n");

const R3A = String.raw`
/* ---- The count-up: --nw is a number that transitions, three counters write it as 25,57,193 ---- */
@property --nw { syntax: "<integer>"; inherits: true; initial-value: 2557193; }
@property --nl { syntax: "<integer>"; inherits: true; initial-value: 25; }
@property --nt { syntax: "<integer>"; inherits: true; initial-value: 57; }
@property --nu { syntax: "<integer>"; inherits: true; initial-value: 193; }
@counter-style pad2 { system: numeric; symbols: "0" "1" "2" "3" "4" "5" "6" "7" "8" "9"; pad: 2 "0"; }
@counter-style pad3 { system: numeric; symbols: "0" "1" "2" "3" "4" "5" "6" "7" "8" "9"; pad: 3 "0"; }
@keyframes nwIn { from { --nw: 0; } }
.chai-app { --nw: ${H.NOW.net}; --nl: calc(round(down, var(--nw) / 100000, 1)); --nt: calc(round(down, (var(--nw) - var(--nl) * 100000) / 1000, 1)); --nu: calc(var(--nw) - var(--nl) * 100000 - var(--nt) * 1000);
  transition: --h1 520ms ease, --h2 520ms ease, --hc 520ms ease, --nw 900ms cubic-bezier(0.2, 0.8, 0.2, 1); animation: nwIn 1100ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.nc-l::before { counter-reset: nl var(--nl); content: counter(nl); }
.nc-t::before { counter-reset: nt var(--nt); content: counter(nt, pad2); }
.nc-u::before { counter-reset: nu var(--nu); content: counter(nu, pad3); }
.nwc { display: flex; align-items: baseline; font-size: 104px; font-weight: 800; letter-spacing: -0.045em; line-height: 0.95; font-variant-numeric: tabular-nums; }
.nwc small { font-size: 0.46em; font-weight: 700; margin-right: 6px; opacity: 0.7; letter-spacing: 0; align-self: flex-start; margin-top: 0.12em; } .nwc .sp { opacity: 0.55; margin: 0 0.02em; }
.nwc-m { font-size: 62px; margin-top: 10px; }

/* ---- Shared small parts ---- */
.stg2.n1, .stg2.n2, .stg2.n3 { overflow: visible; padding: 32px 34px; gap: 22px; } .stg2.n1::after, .stg2.n2::after, .stg2.n3::after { border-radius: inherit; }
.chai-app:has(.stg2[data-b="n1"]) { --h1: var(--card-indigo-from); --h2: var(--card-indigo-to); --hc: var(--card-indigo); }
.chai-app:has(.stg2[data-b="n3"]) { --h1: var(--card-teal-from); --h2: var(--card-teal-to); --hc: var(--card-teal); }
.eyebrow-s { font-size: 12px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.78; }
.dpill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; font-size: 14px; font-weight: 800; background: oklch(1 0 0 / 0.16); } .dpill small { font-size: 12px; font-weight: 700; opacity: 0.78; color: #fff; margin-left: 2px; }
.dpill.up { color: oklch(0.93 0.15 150); } .dpill.dn { color: oklch(0.88 0.12 25); }
.up { color: oklch(0.88 0.15 150); } .dn { color: oklch(0.86 0.13 25); }
.owe { color: oklch(0.88 0.1 25); }
.stg2 .btn-ghost { background: oklch(1 0 0 / 0.16); color: #fff; } .stg2 .btn-light { background: #fff; color: oklch(0.25 0.04 260); }
.kd { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin: 0 6px 0 14px; } .kd:first-child { margin-left: 0; }
.wd { display: inline-block; width: 9px; height: 9px; border-radius: 50%; }
.wd-red { background: oklch(0.64 0.22 25); } .wd-amber { background: oklch(0.82 0.16 85); } .wd-info { background: oklch(0.72 0.1 250); }
@keyframes ping { 0% { box-shadow: 0 0 0 0 oklch(0.64 0.22 25 / 0.6); } 70%, 100% { box-shadow: 0 0 0 8px oklch(0.64 0.22 25 / 0); } }
@keyframes pingA { 0% { box-shadow: 0 0 0 0 oklch(0.82 0.16 85 / 0.55); } 70%, 100% { box-shadow: 0 0 0 7px oklch(0.82 0.16 85 / 0); } }
i.wd-red { animation: ping 1.8s infinite; } i.wd-amber { animation: pingA 2.4s infinite; }
@media (prefers-reduced-motion: reduce) { i.wd-red, i.wd-amber, .nl, .chai-app { animation: none !important; } }

/* ---- A warning row ---- */
.wk { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto auto auto; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 14px; background: var(--fill); transition: opacity 240ms, background 240ms, box-shadow 240ms; }
.wk-d { width: 9px; height: 9px; border-radius: 50%; } .wk-red .wk-d { background: oklch(0.64 0.22 25); animation: ping 1.8s infinite; } .wk-amber .wk-d { background: oklch(0.82 0.16 85); animation: pingA 2.4s infinite; } .wk-info .wk-d { background: oklch(0.72 0.1 250); }
.wk-t b { display: block; font-size: 13px; font-weight: 800; line-height: 1.25; } .wk-t small { display: block; font-size: 12px; font-weight: 600; opacity: 0.72; margin-top: 1px; }
.wk-p { font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 999px; background: color-mix(in oklch, var(--pc) 28%, transparent); color: inherit; white-space: nowrap; box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--pc) 60%, transparent); }
.wk-w { font-size: 11.5px; font-weight: 700; opacity: 0.7; white-space: nowrap; min-width: 66px; text-align: right; }
.wk-red { box-shadow: inset 3px 0 0 oklch(0.64 0.22 25); }
.stg2 .wk { background: oklch(1 0 0 / 0.1); color: #fff; }

/* ---- Lanes: every group, its pages, its warnings ---- */
.lanes { border-radius: 28px; padding: 22px 26px 8px; display: grid; }
.lanes-h { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 14px; } .lanes-h b { display: block; font-size: 18px; font-weight: 800; } .lanes-h small { font-size: 13px; font-weight: 600; color: var(--muted); }
.lanes-k { display: inline-flex; align-items: center; font-size: 12px; font-weight: 700; color: var(--muted); } .lanes-k .kd { margin-left: 16px; }
.lane { display: grid; grid-template-columns: 250px minmax(0, 1fr) minmax(0, 1.35fr); gap: 28px; padding: 20px 0; border-top: 1px solid var(--divider); align-items: start; }
.ln-h { display: flex; gap: 14px; } .ln-bar { width: 5px; border-radius: 4px; background: var(--gc); flex-shrink: 0; min-height: 56px; } .ln-h b { display: block; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; } .ln-h small { display: block; margin-top: 4px; font-size: 13px; font-weight: 600; color: var(--muted); line-height: 1.4; }
.ln-p, .gp-p { display: grid; gap: 8px; } .ln-w, .gp-w { display: grid; gap: 8px; }
.ln-ok { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: var(--muted); padding: 12px 4px; }
.lc { position: relative; display: grid; grid-template-columns: 38px minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 9px 14px 9px 9px; border-radius: 16px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--soft-shadow); cursor: default; transition: transform 200ms var(--ease-out, ease), box-shadow 200ms; }
.lc:hover, .lc:focus-visible { transform: translateX(3px); box-shadow: var(--card-shadow); outline: 0; }
.lc-ic { width: 38px; height: 38px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: #fff; }
.lc-n b { display: block; font-size: 14px; font-weight: 800; } .lc-n small { display: block; font-size: 12px; font-weight: 600; color: var(--muted); }
.lc-v { font-size: 17px; font-weight: 800; text-align: right; } .lc-v small { display: block; font-size: 11px; font-weight: 700; color: var(--muted); } .lc-v.owe { color: var(--danger-text, oklch(0.5 0.18 25)); }
.lc-w { display: inline-flex; gap: 4px; }
.lc .hc-wrap { z-index: 40; }
.stg2 .lc-v.owe { color: oklch(0.88 0.1 25); }
.stg2 .lc { background: oklch(1 0 0 / 0.12); border-color: oklch(1 0 0 / 0.16); box-shadow: none; color: #fff; } .stg2 .lc-n small, .stg2 .lc-v small { color: oklch(1 0 0 / 0.72); }

/* ---- N1 River ---- */
.n1-top { display: flex; justify-content: space-between; align-items: flex-end; gap: 30px; } .n1-l { display: grid; gap: 14px; }
.n1-meta { display: grid; gap: 10px; } .n1-d { display: flex; gap: 10px; flex-wrap: wrap; }
.n1-oo { display: flex; gap: 14px; } .n1-oo > div { padding: 12px 20px; border-radius: 18px; background: oklch(1 0 0 / 0.12); min-width: 150px; } .n1-oo small, .n2-oo small { display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.75; } .n1-oo b, .n2-oo b { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
.n1-g { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 28px; align-items: stretch; }
.n1-c { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.rv { display: flex; flex-direction: column; }
.rv-bd { position: relative; aspect-ratio: 1040 / 450; border-radius: 20px; background: oklch(0 0 0 / 0.16); overflow: hidden; }
.rv-svg { display: block; width: 100%; height: 100%; } .rv-svg .gl { stroke: oklch(1 0 0 / 0.07); stroke-width: 1; } .rv-svg .zl { stroke: oklch(1 0 0 / 0.55); stroke-width: 1.5; stroke-dasharray: 3 5; }
.rl { opacity: 0.94; transition: opacity 280ms; } .rl:hover { opacity: 1; }
.nl { fill: none; stroke: #fff; stroke-width: 3.6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; animation: draw 1500ms 200ms cubic-bezier(0.3, 0.7, 0.2, 1) both; }
.nl-glow { fill: none; stroke: oklch(1 0 0 / 0.28); stroke-width: 11; stroke-linecap: round; filter: blur(3px); }
@keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
.rv-lab { position: absolute; left: 14px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7; } .rv-up { top: 12px; } .rv-dn { bottom: 12px; }
.cur { position: absolute; top: 0; bottom: 0; left: calc((var(--ci, 12) + 0.5) / 13 * 100%); width: 0; transition: left 650ms cubic-bezier(0.3, 0.9, 0.3, 1); pointer-events: none; z-index: 2; }
.cur-l { position: absolute; top: 0; bottom: 0; left: -1px; width: 2px; background: #fff; opacity: 0.5; }
.cur-d { position: absolute; left: -9px; top: calc(var(--cy, 40%) - 9px); width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 5px oklch(1 0 0 / 0.3), 0 4px 14px oklch(0 0 0 / 0.35); transition: top 650ms cubic-bezier(0.3, 0.9, 0.3, 1); }
.rv-hit { position: absolute; inset: 0; display: flex; z-index: 3; } .rv-hit label { flex: 1; cursor: pointer; } .rv-hit label:hover { background: oklch(1 0 0 / 0.06); }
.rv-x { position: relative; height: 38px; margin-top: 6px; }
.rv-c { position: absolute; top: 0; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; font-size: 13px; font-weight: 800; background: oklch(1 0 0 / calc(var(--sel, 0) * 0.22)); opacity: calc(0.62 + var(--sel, 0) * 0.38); }
.rv-c:hover { background: oklch(1 0 0 / 0.14); } .rv-t { display: grid; justify-items: center; line-height: 1.1; } .rv-t em { font-style: normal; font-size: 10px; font-weight: 700; opacity: 0.75; }
.n1-lg { display: flex; flex-wrap: wrap; gap: 8px; } .lg { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.n1-r { padding: 18px 18px 14px; border-radius: 22px; background: oklch(1 0 0 / 0.1); display: flex; flex-direction: column; justify-content: space-between; }
.tr-g { display: grid; gap: 4px; }
.tr-h { display: flex; justify-content: space-between; align-items: baseline; font-size: 11px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; opacity: 0.85; padding: 8px 6px 4px; } .tr-h b { font-size: 17px; letter-spacing: -0.01em; text-transform: none; }
.tr { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 9px 8px; border-radius: 12px; transition: opacity 240ms, background 240ms; }
.tr > i { width: 10px; height: 10px; border-radius: 3px; } .tr > span { font-size: 14px; font-weight: 800; } .tr > span small { display: block; font-size: 11.5px; font-weight: 600; opacity: 0.7; }
.tr-v { text-align: right; } .tr-v b { font-size: 16px; font-weight: 800; display: block; } .tr-v small { font-size: 11.5px; font-weight: 800; }

/* ---- N2 Map ---- */
.n2-g { display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 28px; align-items: stretch; }
.mp { display: grid; gap: 14px; align-content: start; } .mp-t { display: grid; grid-template-columns: 64.8fr 39.2fr; gap: 14px; height: 436px; } .mp-b { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; height: 160px; }
.rg { display: flex; flex-direction: column; gap: 8px; min-height: 0; } .rg-b { flex: 1; min-height: 0; }
.rg-h { display: flex; justify-content: space-between; align-items: baseline; font-size: 11px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; opacity: 0.85; padding: 0 4px; } .rg-h b { font-size: 15px; letter-spacing: -0.01em; text-transform: none; }
.ga { display: grid; grid-template-columns: 30.7fr 34.1fr; gap: 8px; height: 100%; } .gb { display: grid; grid-template-rows: 14.6fr 13fr 6.5fr; gap: 8px; min-height: 0; } .gd { display: grid; grid-template-rows: 1fr 96px; gap: 8px; height: 100%; } .gf { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; height: 100%; }
.mc { position: relative; border-radius: 20px; padding: 16px 18px; background: var(--cg); color: #fff; display: flex; flex-direction: column; justify-content: space-between; gap: 6px; min-height: 0; overflow: hidden; cursor: pointer;
  box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.2), 0 0 0 calc(var(--sel, 0) * 3px) #fff, 0 10px 24px oklch(0 0 0 / calc(0.14 + var(--sel, 0) * 0.2)); transition: transform 240ms var(--ease-out, ease), opacity 260ms, box-shadow 240ms, filter 240ms; }
.mc::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(120% 90% at 100% 0%, oklch(1 0 0 / 0.16), transparent 60%); }
.mc:hover { transform: translateY(-3px); filter: brightness(1.08); }
.mc-top { display: flex; align-items: center; gap: 8px; position: relative; z-index: 1; } .mc-top b { font-size: 14px; font-weight: 800; flex: 1; }
.mc-ic { width: 26px; height: 26px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; background: oklch(1 0 0 / 0.2); }
.mc-w { display: inline-flex; gap: 4px; }
.mc-v { font-size: 30px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; position: relative; z-index: 1; } .mc-v small { font-size: 12px; font-weight: 700; opacity: 0.75; margin-left: 5px; letter-spacing: 0; } .mc-v.owe { color: #fff; }
.mc-s { font-size: 12px; font-weight: 600; opacity: 0.8; position: relative; z-index: 1; }
.c-inv .mc-v { font-size: 54px; } .c-inv .mc-s { font-size: 13px; } .c-loans .mc-v { font-size: 46px; }
.mc.sm { flex-direction: row; align-items: center; } .mc.sm .mc-s { display: none; } .mc.sm .mc-top { flex: 1; }
.mc { opacity: calc(0.55 + var(--sel, 0) * 0.45); } .chai-app:has(#c-all:checked) .mc { opacity: 1; }
.mp-n { font-size: 11.5px; font-weight: 600; opacity: 0.68; padding: 0 4px; }
.n2-r { padding: 24px 24px 20px; border-radius: 24px; background: oklch(1 0 0 / 0.1); display: flex; flex-direction: column; } .n2-r .vw-c { flex: 1; flex-direction: column; }
.chai-app:has(#c-all:checked) .vw-c-all { display: flex; flex-direction: column; }
.n2-oo { display: flex; gap: 12px; margin-top: 18px; } .n2-oo > div { flex: 1; padding: 10px 14px; border-radius: 16px; background: oklch(1 0 0 / 0.12); } .n2-oo b { font-size: 22px; }
.n2-bar { display: flex; height: 14px; border-radius: 8px; overflow: hidden; margin-top: 16px; background: oklch(1 0 0 / 0.1); gap: 3px; } .b-net { background: linear-gradient(90deg, oklch(0.85 0.17 160), oklch(0.75 0.17 150)); } .b-owe { background: linear-gradient(90deg, oklch(0.78 0.15 30), oklch(0.65 0.2 25)); }
.n2-bl { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; opacity: 0.85; margin-top: 8px; } .n2-bl span { display: inline-flex; align-items: center; gap: 5px; }
.n2-rg { display: flex; gap: 8px; margin-top: 18px; }
.sp-w { margin-top: 12px; } .spark { display: block; width: 100%; height: 100px; } .sp-l { fill: none; stroke: #fff; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; animation: draw 1200ms cubic-bezier(0.3, 0.7, 0.2, 1) both; }
.sp-k { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; opacity: 0.7; margin-top: 4px; } .sp-c { margin-top: 12px; }
.n2-part { margin-top: 14px; padding: 12px 14px; border-radius: 16px; background: oklch(1 0 0 / 0.12); font-size: 13px; font-weight: 600; display: flex; gap: 6px; flex-wrap: wrap; align-items: baseline; } .n2-part b { font-size: 17px; font-weight: 800; }
.n2-wn { display: grid; gap: 6px; margin-top: 16px; } .mini { display: grid; grid-template-columns: 10px 1fr; gap: 10px; align-items: start; padding: 9px 12px; border-radius: 12px; background: oklch(1 0 0 / 0.12); font-size: 12.5px; font-weight: 600; line-height: 1.4; } .mini .wk-d { margin-top: 5px; } .mini b { font-weight: 800; }
${CELLS.filter((k) => k !== "all").map((k) => `.chai-app:has(#c-${k}:checked) .vw-c-${k}`).join(", ")} { display: flex; flex-direction: column; }
.n2-r .s-acts { margin-top: auto; padding-top: 16px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.n2-sps { margin-top: auto; padding-top: 16px; display: grid; gap: 14px; } .n2-sh { display: flex; justify-content: space-between; align-items: baseline; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.85; } .n2-sh b { font-size: 15px; text-transform: none; letter-spacing: 0; }
.n2-sb { display: flex; gap: 3px; height: 12px; margin-top: 7px; } .n2-sb i { border-radius: 4px; display: block; } .n2-sl { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 7px; font-size: 11.5px; font-weight: 700; opacity: 0.9; } .n2-sl span { display: inline-flex; align-items: center; gap: 5px; } .n2-sl i { width: 8px; height: 8px; border-radius: 3px; display: inline-block; }
.kw { padding: 20px 22px 22px; border-radius: 24px; background: oklch(0 0 0 / 0.14); }
.kw-h { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 14px; } .kw-h b { display: block; font-size: 20px; font-weight: 800; } .kw-h small { font-size: 13px; font-weight: 600; opacity: 0.75; } .kw-k { display: inline-flex; align-items: center; font-size: 12px; font-weight: 700; opacity: 0.85; }
.kw-l { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 22px; grid-auto-flow: row; }
.kw .wk-p { color: #fff; }

/* ---- N3 Bridge ---- */
.n3-g { display: grid; grid-template-columns: minmax(0, 1fr) 500px; gap: 32px; }
.n3-l { display: flex; flex-direction: column; gap: 22px; min-width: 0; }
.bridge { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
.plot { position: relative; display: grid; grid-template-columns: repeat(9, 1fr); height: 500px; border-bottom: 2px solid oklch(1 0 0 / 0.6); margin-top: 26px; background: repeating-linear-gradient(to top, oklch(1 0 0 / 0.08) 0 1px, transparent 1px 14.285%); }
.cl { position: relative; }
.br { position: absolute; left: 15%; right: 15%; display: block; border-radius: 12px 12px 5px 5px; background: var(--bg); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.3), 0 10px 22px oklch(0 0 0 / 0.22); min-height: 6px;
  transition: bottom 750ms cubic-bezier(0.3, 0.9, 0.3, 1), height 750ms cubic-bezier(0.3, 0.9, 0.3, 1); bottom: var(--s0); height: var(--h0); }
.br-tot { background: linear-gradient(180deg, oklch(0.95 0.04 160), oklch(0.78 0.12 160)); }
.br-net { background: linear-gradient(180deg, #fff, oklch(0.9 0.1 85)); box-shadow: 0 0 0 4px oklch(1 0 0 / 0.25), 0 12px 30px oklch(0.8 0.15 85 / 0.5); }
.br .bl { position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(100% + 6px); font-size: 14px; font-weight: 800; white-space: nowrap; color: #fff; }
.br-net .bl { font-size: 16px; }
.gh { position: absolute; left: 11%; right: 11%; border: 1.5px dashed oklch(1 0 0 / 0.38); border-radius: 14px; pointer-events: none; display: block; }
.cn { position: absolute; left: 85%; width: 30%; height: 0; border-top: 1.5px dashed oklch(1 0 0 / 0.5); display: block; transition: bottom 750ms cubic-bezier(0.3, 0.9, 0.3, 1); z-index: 2; }
.ax { display: grid; grid-template-columns: repeat(9, 1fr); } .ux { text-align: center; padding: 0 2px; } .ux b { display: block; font-size: 12.5px; font-weight: 800; line-height: 1.2; } .ux small { display: block; font-size: 11px; font-weight: 600; opacity: 0.7; }
.bk { display: grid; grid-template-columns: repeat(9, 1fr); gap: 0 10px; margin-top: 4px; } .bk span { border-top: 3px solid var(--bk); padding-top: 6px; font-size: 12px; font-weight: 800; text-align: center; border-radius: 2px; }
.sc3 { display: grid; gap: 10px; margin-top: auto; padding: 16px 18px 12px; border-radius: 20px; background: oklch(1 0 0 / 0.1); } .sc3-t { font-size: 11px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; opacity: 0.8; }
.sc3-tr { position: relative; display: grid; grid-template-columns: repeat(13, 1fr); } .sc3-tr::before { content: ""; position: absolute; left: 3.8%; right: 3.8%; top: 11px; height: 3px; border-radius: 2px; background: oklch(1 0 0 / 0.28); }
.sc3-k { position: relative; display: grid; justify-items: center; gap: 6px; cursor: pointer; font-size: 12px; font-weight: 800; opacity: calc(0.6 + var(--sel, 0) * 0.4); }
.sc3-k i { width: calc(14px + var(--sel, 0) * 8px); height: calc(14px + var(--sel, 0) * 8px); margin: calc(4px - var(--sel, 0) * 4px) 0 calc(0px); border-radius: 50%; background: oklch(1 0 0 / calc(0.45 + var(--sel, 0) * 0.55)); box-shadow: 0 0 0 calc(var(--sel, 0) * 5px) oklch(1 0 0 / 0.28); transition: all 260ms var(--ease-out, ease); } .sc3-k:hover i { background: #fff; }
.n3-r { padding: 22px 22px 20px; border-radius: 24px; background: oklch(1 0 0 / 0.1); display: flex; flex-direction: column; gap: 14px; }
.n3-tabs { display: flex; flex-wrap: wrap; gap: 8px; } .cn3 { font-style: normal; font-size: 11px; padding: 1px 7px; border-radius: 999px; background: oklch(1 0 0 / 0.22); margin-left: 2px; }
.n3-r .vw-g { flex-direction: column; gap: 12px; }
.chai-app:has(#g-all:checked) .vw-g-all, ${GKEYS.filter((k) => k !== "all").map((k) => `.chai-app:has(#g-${k}:checked) .vw-g-${k}`).join(", ")} { display: flex; flex-direction: column; gap: 12px; }
.ln-dot { width: 12px; height: 12px; border-radius: 4px; display: inline-block; }
.gp-p { margin-top: 2px; } .gp-w { margin-top: 4px; } .gx { flex: 1; align-content: space-evenly; margin-top: 10px; padding: 14px 16px; border-radius: 16px; background: oklch(1 0 0 / 0.1); display: grid; gap: 8px; } .gx .spark { height: 120px; } .gx-c { font-size: 12px; font-weight: 600; opacity: 0.78; } .gx-g { display: grid; gap: 6px; } .gp-w .wk { grid-template-columns: 10px minmax(0, 1fr) auto auto; } .gp-w .wk-w { display: none; }
.lc-s { grid-template-columns: 34px minmax(0, 1fr) auto auto; } .lc-s .lc-ic { width: 34px; height: 34px; }
`;

export const R3 = [
  R3A, monthRules, layerRules, dimRules,
  pick("m", MKEYS),
  pick("ly", LAYERS),
  pick("c", CELLS, { all: "sapphire", ...SECCOL }),
  pick("r", RANGES),
  pick("g", GKEYS),
].join("\n");
