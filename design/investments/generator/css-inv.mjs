// Investments' own styles, after the shared base and the pieces Goals reuses.
import * as D from "./data.mjs";
const tok = (n, h, c = 0.09) => `--card-${n}-from: oklch(0.34 ${c} ${h}); --card-${n}-to: oklch(0.17 ${c * 0.6} ${h}); --card-${n}: oklch(0.55 ${c * 1.2} ${h});`;

/** A "pick": radios named <name> with ids <name>-<key>; shows the view with that key, and marks the chip. */
const pick = (name, keys) => `.v-${name} { display: none; } .vi-${name} { display: none; }\n` + keys.map((k) => `.chai-app:has(#${name}-${k}:checked) .v-${name}[data-k="${k}"] { display: block; }\n.chai-app:has(#${name}-${k}:checked) .vi-${name}[data-k="${k}"] { display: inline; }\n.chai-app:has(#${name}-${k}:checked) label[for="${name}-${k}"] { background: var(--chip-on-bg); color: var(--chip-on-fg); box-shadow: var(--chip-on-sh, none); }`).join("\n");
const LINEKEYS = ["you", "nifty", "spx", "gold", "fd"];
const lines = LINEKEYS.map((k) => `.chai-app:has(#lg-${k}:not(:checked)) .ln-${k}, .chai-app:has(#lg-${k}:not(:checked)) .dt-${k}, .chai-app:has(#lg-${k}:not(:checked)) .tr-${k}, .chai-app:has(#lg-${k}:not(:checked)) .lb-${k} { display: none; }\n.chai-app:has(#lg-${k}:not(:checked)) label[for="lg-${k}"] { opacity: 0.42; } .chai-app:has(#lg-${k}:checked) label[for="lg-${k}"] i { box-shadow: 0 0 0 2px var(--surface), 0 0 0 3.5px var(--lc); }`).join("\n");
const SRC = ["all", "market", "espp", "rsu"].map((k) => k === "all" ? "" : `.chai-app:has(#sf-${k}:checked) .rings .sg:not(.sg-${k}) { opacity: 0.08; }\n.chai-app:has(#sf-${k}:checked) label[for="sf-${k}"] { background: var(--chip-on-bg); color: var(--chip-on-fg); }`).join("\n") + `\n.chai-app:has(#sf-all:checked) label[for="sf-all"] { background: var(--chip-on-bg); color: var(--chip-on-fg); }`;
const SYMKEYS = ["all", ...D.SYMBOLS.map((s) => s.toLowerCase())];
const MK = ["all", "ind", "us"].map((k) => `.chai-app:has(#mk-${k}:checked) label[for="mk-${k}"] { background: var(--chip-on-bg); color: var(--chip-on-fg); }`).join("\n") + "\n.chai-app:has(#mk-ind:checked) .mk-us { display: none; }\n.chai-app:has(#mk-us:checked) .mk-ind { display: none; }";
const pickKeys = { sp: ["asset", "market", "kind", "sector", "holding", "source"], nm: ["50k", "1l", "2l", "5l"], st: ["base", "usdn", "usup", "us20", "in20", "ntap30", "eq15", "gold10"], gr: ["6", "9", "12"] };
const pickKeys2 = { zm: ["root", "eq", "debt", "gold", "eq-in", "eq-us"], fr: ["market", "asset", "kind", "sector"], to: ["market", "asset", "kind", "sector"], pl: Array.from({ length: 10 }, (_, i) => String(i)) };
const PL_ACTIVE = Array.from({ length: 10 }, (_, i) => `.chai-app:has(#pl-${i}:checked) label[for="pl-${i}"] { box-shadow: inset 0 0 0 3px oklch(1 0 0 / 0.9), 0 0 0 2.5px var(--ink); transform: translateX(8px); }`).join("\n");
const WIDGET_PICKS = [...Object.entries(pickKeys), ...Object.entries(pickKeys2)].map(([n, k]) => pick(n, k)).join("\n") + "\n" + PL_ACTIVE;
const GA = ["0", "25", "50"].map((k) => `.chai-app:has(#ga-${k}:not(:checked)) .gl-${k} { display: none; }\n.chai-app:has(#ga-${k}:not(:checked)) label[for="ga-${k}"] { opacity: 0.42; }`).join("\n");
const HILITE = Array.from({ length: 10 }, (_, i) => ["spw", "spx"].map((w) => `.${w}:has(.sl-row[data-i="${i}"]:hover) .sl-arc:not([data-i="${i}"]) { opacity: 0.16; }\n.${w}:has(.sl-arc[data-i="${i}"]:hover) .sl-arc:not([data-i="${i}"]) { opacity: 0.16; }\n.${w}:has(.sl-arc[data-i="${i}"]:hover) .sl-row:not([data-i="${i}"]) { opacity: 0.35; }\n.${w}:has(.sl-row[data-i="${i}"]:hover) .sl-row:not([data-i="${i}"]) { opacity: 0.4; }`).join("\n")).join("\n");
export const PICKS = [WIDGET_PICKS, GA, HILITE, pick("rg", ["1m", "3m", "6m", "1y", "3y", "all"]), pick("ln", SYMKEYS), pick("vw", ["worth", "race"]), pick("as", ["now", "1m", "6m", "1y", "2y"]), MK, lines, SRC].join("\n");
export const INV = PICKS + String.raw`
.chai-app { ${tok("gold", 82, 0.1)} ${tok("indigo", 275, 0.11)} ${tok("sky", 232, 0.09)} ${tok("forest", 148, 0.08)} ${tok("rose", 355, 0.1)} ${tok("plum", 325, 0.09)} --gain: oklch(0.42 0.14 145); --loss: oklch(0.55 0.16 25); --gain-tint: oklch(0.94 0.05 150); --loss-tint: oklch(0.95 0.035 30); }
.up { color: var(--gain); } .dn { color: var(--loss); }
.symt { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--on-card); font-weight: 800; letter-spacing: 0.01em; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.2); }
.srcb { display: inline-flex; padding: 1px 7px; border-radius: 999px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.03em; background: oklch(0.94 0.03 258); color: oklch(0.42 0.1 258); margin-left: 5px; vertical-align: 1px; }
.srcb.espp { background: oklch(0.94 0.04 300); color: oklch(0.42 0.12 300); }
.srcb.stale { background: var(--warning-tint); color: var(--warning-text); }
.dchip { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 800; white-space: nowrap; }
.dchip.up { background: var(--gain-tint); } .dchip.dn { background: var(--loss-tint); }
.hrow { display: grid; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--divider); }
.hrow:last-child { border-bottom: 0; }
.hgrp { display: flex; justify-content: space-between; align-items: baseline; padding: 14px 0 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--divider); }
.hgrp b { color: var(--fg); font-size: 12.5px; letter-spacing: 0; text-transform: none; }
.r { text-align: right; } .r small, .nm2 small { display: block; font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 2px; }
.nm2 b { font-size: 13.5px; font-weight: 800; display: block; }
.shbar { height: 8px; border-radius: 999px; background: var(--fill); overflow: hidden; margin-top: 5px; } .shbar > span { display: block; height: 100%; border-radius: inherit; }
.tradeln { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--divider); }
.tradeln:last-child { border-bottom: 0; }
.tradeln b { font-size: 13px; font-weight: 700; display: block; } .tradeln small { font-size: 11px; font-weight: 600; color: var(--muted); display: block; margin-top: 2px; }
.tradeln .a { text-align: right; font-size: 12.5px; font-weight: 800; } .tradeln .a small { font-weight: 600; }
.bsb { display: inline-flex; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.bsb.buy { background: var(--gain-tint); color: var(--gain); } .bsb.sell { background: var(--loss-tint); color: var(--loss); } .bsb.vest { background: oklch(0.94 0.03 258); color: oklch(0.42 0.1 258); }
.mvr { display: grid; grid-template-columns: 30px 1fr 90px; gap: 10px; align-items: center; padding: 7px 0; font-size: 12.5px; font-weight: 700; }
.mvr .bar { height: 10px; border-radius: 999px; background: var(--fill); position: relative; } .mvr .bar > i { position: absolute; top: 0; bottom: 0; border-radius: 999px; }
.strip { display: flex; height: 22px; border-radius: 999px; overflow: hidden; gap: 2px; }
.strip > span { display: block; height: 100%; min-width: 3px; }
.legend2 { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 11.5px; font-weight: 700; } .legend2 span { display: inline-flex; align-items: center; gap: 6px; } .legend2 i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }

/* I1 Bridge */
.wf { position: relative; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 8px; height: 330px; padding-top: 6px; }
.wf-c { position: relative; display: flex; flex-direction: column; align-items: center; min-width: 0; }
.wf-plot { position: relative; width: 100%; flex: 1; }
.wf-bar { position: absolute; left: 12%; right: 12%; border-radius: 8px; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.22); }
.wf-v { position: absolute; left: -10px; right: -10px; text-align: center; font-size: 11.5px; font-weight: 800; white-space: nowrap; }
.wf-l { height: 36px; padding-top: 8px; font-size: 11px; font-weight: 800; color: var(--muted); text-align: center; line-height: 1.15; } .wf-l small { display: block; font-size: 10px; font-weight: 600; margin-top: 2px; }
.wf-link { font-style: normal; position: absolute; height: 0; border-top: 1.5px dashed oklch(0 0 0 / 0.22); }
.wf-grid { font-style: normal; position: absolute; left: 0; right: 0; border-top: 1px solid var(--divider); } .wf-grid span { position: absolute; left: 0; top: -9px; font-size: 10px; font-weight: 700; color: var(--muted); background: var(--surface); padding-right: 6px; }
.wf-break { position: absolute; left: 12%; right: 12%; height: 8px; bottom: -4px; background: repeating-linear-gradient(135deg, var(--surface) 0 3px, transparent 3px 6px); }
.kvbig { display: flex; flex-direction: column; gap: 3px; } .kvbig .k { font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); } .kvbig .v { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; } .kvbig .s { font-size: 12px; font-weight: 600; color: var(--muted); }

/* I2 Strata */
.strata { width: 100%; height: auto; display: block; overflow: visible; }
.strata text { font-family: inherit; font-weight: 700; fill: var(--muted); font-size: 11px; }
.yrbars { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; align-items: end; height: 150px; }
.yrb { display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; gap: 6px; font-size: 11px; font-weight: 800; }
.yrb .stk { width: 56%; display: flex; flex-direction: column-reverse; border-radius: 8px; overflow: hidden; } .yrb .stk span { display: block; }

/* I3 Exposure */
.donut { display: block; } .donut text { font-family: inherit; }
.exrow { display: grid; grid-template-columns: 34px 1fr auto; gap: 12px; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--divider); }
.exrow:last-child { border-bottom: 0; }
.employer { display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px; border-radius: 999px; font-size: 10px; font-weight: 800; letter-spacing: 0.03em; background: oklch(0.94 0.05 85); color: oklch(0.45 0.1 70); margin-left: 6px; vertical-align: 1px; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.pair > div { padding: 14px 16px; border-radius: 16px; background: var(--fill); } .pair .k { font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); } .pair .v { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; margin-top: 2px; } .pair .s { font-size: 12px; font-weight: 600; color: var(--muted); margin-top: 2px; }

/* I4 Board */
.fb { background: oklch(0.16 0.012 250); color: oklch(0.96 0.01 250); border-radius: 24px; padding: 22px 26px 26px; display: flex; flex-direction: column; gap: 14px; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.07), 0 18px 44px oklch(0 0 0 / 0.22); }
.fb-top { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; }
.fb-top h3 { margin: 0; font-size: 13px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: oklch(0.82 0.1 85); }
.fb-top small { font-size: 12px; font-weight: 600; color: oklch(0.72 0.01 250); display: block; margin-top: 3px; }
.fb-mk { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.fb-mk > div { background: oklch(0.21 0.014 250); border-radius: 14px; padding: 10px 14px; } .fb-mk .k { font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: oklch(0.7 0.01 250); } .fb-mk .v { font-family: "JetBrains Mono", monospace; font-size: 17px; font-weight: 700; margin-top: 3px; } .fb-mk .c { font-family: "JetBrains Mono", monospace; font-size: 11.5px; font-weight: 700; }
.fb-h, .fb-r { display: grid; grid-template-columns: 112px minmax(0, 1.5fr) 92px 112px 98px 138px 98px 64px; gap: 10px; align-items: center; }
.fb-h { font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: oklch(0.66 0.01 250); padding: 0 4px; }
.fb-grp { font-size: 11px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: oklch(0.82 0.1 85); display: flex; justify-content: space-between; padding: 8px 4px 0; border-top: 1px solid oklch(1 0 0 / 0.1); }
.fb-r { background: oklch(0.2 0.012 250); border-radius: 12px; padding: 8px 4px; }
.fb-n b { font-size: 13.5px; font-weight: 700; display: block; color: oklch(0.96 0.01 250); } .fb-n small { font-size: 11px; font-weight: 600; color: oklch(0.68 0.01 250); }
.fl { display: inline-flex; gap: 2px; font-family: "JetBrains Mono", monospace; }
.fl.r { justify-content: flex-end; }
.fl i { font-style: normal; width: 14px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; background: linear-gradient(180deg, oklch(0.27 0.014 250) 0 49%, oklch(0.12 0.01 250) 49% 51%, oklch(0.24 0.014 250) 51%); border-radius: 3px; color: oklch(0.96 0.01 250); }
.fl.sm i { width: 12px; height: 21px; font-size: 12px; }
.fl.up i { color: oklch(0.82 0.17 150); } .fl.dn i { color: oklch(0.72 0.17 25); } .fl.am i { color: oklch(0.85 0.13 85); }
.fb-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; } .fb-dot.ok { background: oklch(0.78 0.17 150); box-shadow: 0 0 8px oklch(0.78 0.17 150 / 0.7); } .fb-dot.st { background: oklch(0.82 0.14 85); box-shadow: 0 0 8px oklch(0.82 0.14 85 / 0.7); }
.fb-f { display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 600; color: oklch(0.7 0.01 250); }

/* I5 Rulers */
.rl-row { display: grid; grid-template-columns: 260px minmax(0, 1fr) 150px; gap: 26px; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--divider); }
.rl-row:last-child { border-bottom: 0; }
.rl { position: relative; height: 54px; }
.rl-track { position: absolute; left: 0; right: 0; top: 30px; height: 10px; border-radius: 999px; background: var(--fill); }
.rl-seg { position: absolute; top: 30px; height: 10px; border-radius: 999px; }
.rl-cost { position: absolute; top: 24px; width: 2px; height: 22px; background: var(--ink); border-radius: 2px; }
.rl-cost span { position: absolute; top: -17px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: 800; color: var(--muted); white-space: nowrap; }
.rl-px { position: absolute; top: 28px; width: 14px; height: 14px; margin-left: -7px; transform: rotate(45deg); border-radius: 3px; box-shadow: 0 0 0 3px var(--surface); }
.rl-px span { position: absolute; transform: rotate(-45deg); top: 24px; left: -14px; font-size: 11px; font-weight: 800; white-space: nowrap; }
.rl-ends { position: absolute; left: 0; right: 0; top: 46px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: var(--muted); }
.rl-axis { display: flex; justify-content: space-between; gap: 18px; padding: 0 0 4px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); }
.lgd { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 700; color: var(--muted); }
`;

export const INV2 = String.raw`
/* Round 2: chips, charts, stage */
.chips { --chip-on-bg: var(--ink); --chip-on-fg: var(--on-ink); display: inline-flex; gap: 2px; padding: 4px; border-radius: 999px; background: var(--fill); }
.chip2 { cursor: pointer; padding: 7px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 800; color: var(--muted); user-select: none; transition: background 140ms, color 140ms; }
.chip2:hover { color: var(--fg); }
.chips.dk { background: oklch(1 0 0 / 0.09); --chip-on-bg: oklch(0.99 0 0); --chip-on-fg: oklch(0.18 0.01 260); }
.chips.dk .chip2 { color: oklch(0.8 0.01 250); } .chips.dk .chip2:hover { color: white; }
.chsvg { display: block; overflow: visible; }
.chsvg text { font-family: inherit; fill: var(--muted); font-size: 11px; font-weight: 700; }
.chsvg .gl { stroke: var(--divider); stroke-width: 1; }
.ch-dark .gl { stroke: oklch(1 0 0 / 0.09); } .ch-dark text { fill: oklch(0.72 0.01 250); }
.hc2 .hit { fill: transparent; cursor: crosshair; } .hc2 .hv { opacity: 0; pointer-events: none; transition: opacity 80ms; } .hc2:hover .hv { opacity: 1; }
.xh { stroke: var(--ink); stroke-width: 1.2; opacity: 0.45; stroke-dasharray: 3 3; } .ch-dark .xh { stroke: white; }
.dt { r: 4.6px; stroke: var(--surface); stroke-width: 2.2; } .ch-dark .dt { stroke: oklch(0.18 0.01 260); }
.tt .bb { font-weight: 800; } .tt .dm { opacity: 0.7; }
.tt rect { fill: var(--surface); stroke: var(--surface-line); filter: drop-shadow(0 6px 14px oklch(0 0 0 / 0.18)); } .tt text { fill: var(--fg); font-weight: 600; font-size: 11.5px; }
.ch-dark .tt rect { fill: oklch(0.99 0 0); stroke: none; } .ch-dark .tt text { fill: oklch(0.2 0.01 260); }
.sx { position: relative; border-radius: 28px; padding: 22px 24px 18px; display: flex; flex-direction: column; gap: 14px; }
.sx-dk { background: radial-gradient(120% 90% at 10% 0%, oklch(0.27 0.02 255), oklch(0.15 0.01 260) 60%); color: oklch(0.97 0.005 250); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.08), 0 22px 50px oklch(0 0 0 / 0.22); }
.sx-dk .sub2, .stg-dk .hk { color: oklch(0.74 0.01 250); }
.sx-h { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.sx-t { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
.bigv { font-size: 40px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; } .bigv small { font-size: 14px; font-weight: 700; letter-spacing: 0; opacity: 0.7; margin-left: 8px; }
.kpi { position: relative; border-radius: 22px; padding: 18px 20px 20px; background: var(--surface); box-shadow: var(--soft-shadow); border: 1px solid var(--surface-line); display: flex; flex-direction: column; gap: 22px; }
.kpi .kh { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 800; } .kpi .kh i { width: 28px; height: 28px; border-radius: 9px; background: var(--fill); display: inline-flex; align-items: center; justify-content: center; }
.kpi .kv2 { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; font-size: 30px; font-weight: 800; letter-spacing: -0.02em; } .kpi .kv2 small { font-size: 13px; font-weight: 700; color: var(--muted); letter-spacing: 0; }
.kpi .pillk { font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 999px; background: var(--ink); color: var(--on-ink); letter-spacing: 0; }
.kpi .ptag { position: absolute; top: 16px; right: 16px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; background: var(--warning-tint); color: var(--warning-text); }
.kpi .hc-wrap { font-weight: 500; }
.col2 { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.col2 > .sx, .col2 > .card { flex: 1 1 auto; }
.pf-allo { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--divider); font-size: 13px; font-weight: 700; } .pf-allo:last-of-type { border-bottom: 0; } .pf-allo span.n { display: inline-flex; align-items: center; gap: 9px; } .pf-allo i { width: 11px; height: 11px; border-radius: 4px; display: inline-block; } .pf-allo em { font-style: normal; font-size: 11px; color: var(--muted); font-weight: 700; margin-left: 3px; }
.btn-wide { display: flex; justify-content: center; width: 100%; min-height: 48px; border-radius: 999px; background: var(--ink); color: var(--on-ink); font-weight: 800; font-size: 14px; align-items: center; gap: 8px; }
/* money-in matrix */
.mx2 { display: grid; grid-template-columns: 38px repeat(12, 1fr); gap: 5px; align-items: center; }
.mx2 .yl { font-size: 11px; font-weight: 800; color: var(--muted); } .mx2 .ml { font-size: 10px; font-weight: 800; color: var(--muted); text-align: center; }
.mc { position: relative; height: var(--mh, 26px); border-radius: 8px; background: var(--fill); } .mc.on { cursor: help; } .mc.fut { background: transparent; border: 1.5px dashed oklch(0 0 0 / 0.12); }
.mc.sell::after { content: ""; position: absolute; right: 3px; top: 3px; width: 7px; height: 7px; border-radius: 50%; background: var(--card-ruby); box-shadow: 0 0 0 1.5px var(--surface); }
.mc .hc-wrap { font-weight: 500; z-index: 20; }
.mc:hover { outline: 2px solid var(--ink); outline-offset: 1px; }
/* holdings carousel */
.crs { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 2px 0 6px; scrollbar-width: none; margin-right: -24px; } .crs::-webkit-scrollbar { display: none; }
.hcard { flex: 0 0 196px; scroll-snap-align: start; border-radius: 22px; padding: 14px; color: oklch(0.97 0.005 250); background: linear-gradient(160deg, oklch(0.24 0.015 255), oklch(0.13 0.01 260)); display: flex; flex-direction: column; gap: 10px; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.08); transition: transform 160ms; } .hcard:hover { transform: translateY(-3px); }
.hcard .t { display: flex; align-items: center; gap: 10px; } .hcard .t b { font-size: 13.5px; font-weight: 800; display: block; } .hcard .t small { font-size: 11px; color: oklch(0.72 0.01 250); font-weight: 600; }
.hcard .p { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; } .hcard .c { font-size: 11.5px; font-weight: 800; } .hcard .c.up { color: oklch(0.82 0.17 150); } .hcard .c.dn { color: oklch(0.74 0.16 25); }
.txr { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; padding: 11px 0; border-bottom: 1px solid var(--divider); } .txr:last-child { border-bottom: 0; }
.txr b { font-size: 14px; font-weight: 800; display: block; } .txr small { font-size: 11.5px; color: var(--muted); font-weight: 600; } .txr .a { text-align: right; font-size: 13.5px; font-weight: 800; } .txr .a small { display: block; margin-top: 2px; }
.txr .logo { width: 40px; height: 40px; }
`;
export const INV3 = String.raw`
.lnrow { --chip-on-bg: var(--ink); --chip-on-fg: var(--on-ink); --chip-on-sh: 0 8px 18px oklch(0 0 0 / 0.22); display: grid; grid-template-columns: repeat(11, 1fr); gap: 10px; }
.lnc { cursor: pointer; display: flex; flex-direction: column; gap: 5px; padding: 11px 12px 12px; border-radius: 18px; background: var(--fill); transition: transform 140ms, background 140ms; } .lnc:hover { transform: translateY(-2px); background: var(--fill-strong); }
.lnc b { font-size: 12.5px; font-weight: 800; letter-spacing: -0.01em; margin-top: 4px; } .lnc small { font-size: 11.5px; font-weight: 800; opacity: 0.7; }
`;

export const INV4 = String.raw`
.lgrow { display: flex; gap: 8px; flex-wrap: wrap; }
.lgc { cursor: pointer; display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px 7px 10px; border-radius: 999px; background: var(--fill); font-size: 12.5px; font-weight: 800; transition: opacity 140ms; user-select: none; } .lgc i { width: 12px; height: 12px; border-radius: 50%; background: var(--lc); display: inline-block; }
.lb { }
.rk { display: grid; grid-template-columns: 28px 1fr auto; gap: 12px; align-items: center; padding: 11px 0; border-bottom: 1px solid var(--divider); } .rk:last-child { border-bottom: 0; }
.rk .n { width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; background: var(--fill); } .rk.first .n { background: var(--ink); color: var(--on-ink); }
.rk b { font-size: 13.5px; font-weight: 800; } .rk .bar { height: 8px; border-radius: 999px; background: var(--fill); margin-top: 6px; overflow: hidden; } .rk .bar i { display: block; height: 100%; border-radius: inherit; }
.rk .a { text-align: right; font-size: 14px; font-weight: 800; } .rk .a small { display: block; font-size: 11px; color: var(--muted); font-weight: 600; margin-top: 1px; }
.same { border-radius: 22px; padding: 18px 18px 16px; background: var(--surface); box-shadow: var(--soft-shadow); border: 1px solid var(--surface-line); display: flex; flex-direction: column; gap: 8px; } .same.me { background: var(--ink); color: var(--on-ink); } .same .k { font-size: 12px; font-weight: 800; display: flex; align-items: center; gap: 8px; } .same .k i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; } .same .v { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; } .same .d { font-size: 12px; font-weight: 700; } .same.me .d { color: oklch(0.82 0.17 150); } .same .bar { height: 8px; border-radius: 999px; background: var(--fill); overflow: hidden; } .same.me .bar { background: oklch(1 0 0 / 0.16); } .same .bar i { display: block; height: 100%; border-radius: inherit; }
.yb { display: grid; grid-template-columns: repeat(5, 1fr); gap: 22px; align-items: end; height: 190px; padding-top: 6px; } .yb > div { display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; } .yb .grp { display: flex; align-items: flex-end; gap: 5px; height: 100%; } .yb .grp i { width: 22px; border-radius: 7px 7px 3px 3px; display: block; position: relative; } .yb .grp i em { position: absolute; top: -17px; left: 50%; transform: translateX(-50%); font-style: normal; font-size: 10.5px; font-weight: 800; white-space: nowrap; } .yb b { font-size: 12.5px; font-weight: 800; }
.rings { display: block; margin: 0 auto; overflow: visible; } .rings text { font-family: inherit; }
.rings .rb { cursor: help; } .rings .rb .trk { fill: oklch(0 0 0 / 0.035); transition: fill 120ms; } .rings .rb:hover .trk { fill: var(--fill-strong); } .rings .rb .ctr { opacity: 0; pointer-events: none; } .rings .rb:hover .ctr { opacity: 1; } .rings:has(.rb:hover) .ctr0 { opacity: 0; } .rings .sg { transition: opacity 160ms; }
.pat { border: 1.5px dashed oklch(0 0 0 / 0.16); border-radius: 18px; padding: 14px 16px; display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; } .pat b { font-size: 13.5px; font-weight: 800; display: block; } .pat small { font-size: 11.5px; color: var(--muted); font-weight: 600; } .pat .dd { text-align: right; font-weight: 800; font-size: 13px; }
.sk-svg { display: block; overflow: visible; } .sk-svg text { font-family: inherit; fill: var(--fg); font-size: 12.5px; font-weight: 700; } .sk-svg .sm { fill: var(--muted); font-size: 11px; font-weight: 600; }
.sk-svg text.hl { paint-order: stroke; stroke: oklch(1 0 0 / 0.85); stroke-width: 4px; stroke-linejoin: round; }
.sk-f { transition: opacity 160ms; cursor: pointer; } .sk-svg:has(.sk-f:hover) .sk-f:not(:hover) { opacity: 0.1; } .sk-f:hover { opacity: 0.85 !important; }
`;
export const INV5 = String.raw`
.h3 { padding: 24px 26px 22px; gap: 16px; }
.tb { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; } .tbr { display: inline-flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.h3head { display: flex; justify-content: space-between; align-items: center; gap: 20px; } .h3pills { display: flex; gap: 8px; }
.h3 .v-ln > * + * { margin-top: 14px; }
.chai-app:not(:has(#ln-all:checked)) .tg-vw, .chai-app:not(:has(#ln-all:checked)) .tg-rg { opacity: 0.32; pointer-events: none; }
.kpidk { background: oklch(1 0 0 / 0.06); border-color: oklch(1 0 0 / 0.1); box-shadow: none; color: oklch(0.97 0.005 250); } .kpidk .kh i { background: oklch(1 0 0 / 0.1); } .kpidk .kv2 small { color: oklch(0.74 0.01 250); } .kpidk .pillk { background: oklch(0.99 0 0); color: oklch(0.18 0.01 260); } .kpidk:hover { background: oklch(1 0 0 / 0.1); }
.kdrow { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; } .kd { background: oklch(1 0 0 / 0.06); border: 1px solid oklch(1 0 0 / 0.1); border-radius: 18px; padding: 14px 16px; } .kd .k { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: oklch(0.72 0.01 250); } .kd .v { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; margin-top: 4px; } .kd .s { font-size: 11.5px; font-weight: 600; color: oklch(0.72 0.01 250); margin-top: 2px; }
.lnrow.dk .lnc { background: oklch(1 0 0 / 0.07); color: oklch(0.97 0.005 250); } .lnrow.dk .lnc:hover { background: oklch(1 0 0 / 0.13); } .lnrow.dk { --chip-on-bg: oklch(0.99 0 0); --chip-on-fg: oklch(0.18 0.01 260); --chip-on-sh: 0 8px 22px oklch(0 0 0 / 0.4); }
.lgrow.dkl .lgc { background: oklch(1 0 0 / 0.09); color: oklch(0.95 0.005 250); }
.wrail { --chip-on-bg: oklch(1 0 0 / 0.15); --chip-on-fg: oklch(0.99 0 0); --chip-on-sh: inset 0 0 0 1.5px oklch(0.84 0.13 160); width: 292px; flex-shrink: 0; display: flex; flex-direction: column; gap: 4px; max-height: 760px; }
.wr-h { display: flex; justify-content: space-between; align-items: baseline; padding: 2px 6px 8px; font-size: 14px; }
.wr { cursor: pointer; display: grid; grid-template-columns: 36px minmax(0, 1fr) 56px 44px; gap: 10px; align-items: center; padding: 8px 10px; border-radius: 16px; transition: background 140ms, transform 140ms; } .wr:hover { background: oklch(1 0 0 / 0.08); transform: translateX(2px); }
.wr b { font-size: 13px; font-weight: 800; display: block; } .wr small { font-size: 11px; font-weight: 600; opacity: 0.65; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .wr em { font-style: normal; font-size: 12px; font-weight: 800; text-align: right; }
.wr em.up { color: oklch(0.82 0.17 150); } .wr em.dn { color: oklch(0.74 0.16 25); }
.h3rail { display: flex; gap: 24px; align-items: flex-start; } .h3main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.dock { --chip-on-bg: linear-gradient(160deg, oklch(0.32 0.03 255), oklch(0.2 0.015 260)); --chip-on-fg: oklch(0.99 0 0); --chip-on-sh: 0 0 0 2px oklch(0.84 0.13 160), 0 14px 30px oklch(0 0 0 / 0.4); border-top: 1px solid oklch(1 0 0 / 0.1); padding-top: 14px; display: flex; flex-direction: column; gap: 10px; }
.dock-h { display: flex; justify-content: space-between; align-items: baseline; font-size: 14px; }
.dock .hcard { cursor: pointer; background: linear-gradient(160deg, oklch(0.22 0.015 255), oklch(0.15 0.01 260)); border: 1px solid oklch(1 0 0 / 0.06); } .dock .crs { margin-right: -26px; }
.crs3 { margin-right: -22px; padding-bottom: 0; } .hcw { flex: 0 0 232px; } .hcard .c.up { color: oklch(0.82 0.17 150); }
.tape { overflow: hidden; border-radius: 999px; background: oklch(1 0 0 / 0.06); mask-image: linear-gradient(90deg, transparent, black 4%, black 96%, transparent); --chip-on-bg: oklch(0.99 0 0); --chip-on-fg: oklch(0.18 0.01 260); }
.tape-in { display: flex; width: max-content; animation: tape 46s linear infinite; } .tape:hover .tape-in { animation-play-state: paused; } @keyframes tape { to { transform: translateX(-50%); } }
.tp { cursor: pointer; display: inline-flex; align-items: center; gap: 10px; padding: 10px 20px; font-size: 13px; font-weight: 700; white-space: nowrap; border-radius: 999px; transition: background 140ms; } .tp:hover { background: oklch(1 0 0 / 0.1); } .tp b { font-weight: 800; letter-spacing: 0.02em; } .tp span { opacity: 0.8; } .tp em { font-style: normal; font-weight: 800; font-size: 12px; } .tp em.up { color: oklch(0.82 0.17 150); } .tp em.dn { color: oklch(0.74 0.16 25); }
.tape .tp[for] { }
.smr { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; align-items: center; padding: 10px 14px; border-radius: 16px; background: var(--fill); } .smr.me { background: var(--ink); color: var(--on-ink); } .smr .n { display: inline-flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 800; } .smr .n i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; } .smr b { font-size: 18px; font-weight: 800; letter-spacing: -0.01em; } .smr .bar { grid-column: 1 / -1; height: 7px; border-radius: 999px; background: oklch(0 0 0 / 0.08); overflow: hidden; } .smr.me .bar { background: oklch(1 0 0 / 0.2); } .smr .bar i { display: block; height: 100%; border-radius: inherit; } .smr small { grid-column: 1 / -1; font-size: 11.5px; font-weight: 700; } .smr.me small { color: oklch(0.82 0.17 150); } .smr small.up { color: var(--gain); } .smr small.dn { color: var(--loss); }
.night .smr .bar { background: oklch(1 0 0 / 0.1); }
.chai-app.night { --page: oklch(0.13 0.01 262); --surface: oklch(0.19 0.012 262); --surface-line: oklch(1 0 0 / 0.08); --fg: oklch(0.96 0.005 250); --muted: oklch(0.72 0.01 250); --fill: oklch(1 0 0 / 0.06); --fill-strong: oklch(1 0 0 / 0.11); --divider: oklch(1 0 0 / 0.09); --ink: oklch(0.97 0 0); --on-ink: oklch(0.16 0.01 262); --gain: oklch(0.82 0.17 150); --loss: oklch(0.74 0.16 25); --gain-tint: oklch(0.3 0.07 150); --loss-tint: oklch(0.3 0.07 25); --positive: oklch(0.82 0.17 150); --negative: oklch(0.74 0.16 25); --accent-text: oklch(0.82 0.17 150); --accent-tint: oklch(0.3 0.07 150); --warning-tint: oklch(0.3 0.06 85); --warning-text: oklch(0.86 0.12 85); --card-shadow: inset 0 1px 0 oklch(1 0 0 / 0.05), 0 14px 34px oklch(0 0 0 / 0.38); --soft-shadow: inset 0 1px 0 oklch(1 0 0 / 0.05), 0 6px 16px oklch(0 0 0 / 0.3); background: var(--page); color: var(--fg); }
.night .main.glass { background: oklch(0.16 0.011 262); }
.night .notice b, .night .notice .grow { color: oklch(0.86 0.12 85); }
.night .btn-ghost { background: oklch(1 0 0 / 0.07); }
.night .same { background: var(--surface); } .night .same.me { background: oklch(0.97 0 0); color: oklch(0.16 0.01 262); } .night .same .bar { background: oklch(1 0 0 / 0.1); } .night .same.me .bar { background: oklch(0 0 0 / 0.12); } .night .same.me .d { color: oklch(0.42 0.14 150); }
.night .rail-item.active { background: var(--ink); color: var(--on-ink); }
.night .mc { background: oklch(1 0 0 / 0.07); } .night .mc.fut { border-color: oklch(1 0 0 / 0.14); }
.night .hrow .dchip.up, .night .dchip.up { background: oklch(0.3 0.07 150); } .night .dchip.dn { background: oklch(0.3 0.07 25); }
.night .symt { box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.18), 0 0 0 1px oklch(1 0 0 / 0.08); }
.night .hcard { border: 1px solid oklch(1 0 0 / 0.08); }
.night .sx-dk { background: radial-gradient(120% 90% at 10% 0%, oklch(0.25 0.025 255), oklch(0.12 0.01 260) 60%); }
.night .seg, .night .chips { background: oklch(1 0 0 / 0.07); }
.night .pill-on { background: oklch(0.3 0.07 150); color: oklch(0.86 0.15 150); }
.night .hc { background: oklch(0.24 0.014 262); }
.night .tt rect { fill: oklch(0.99 0 0); }
`;

export const INV6 = String.raw`
.sbtw { justify-content: space-between; }
.spw { display: flex; align-items: center; gap: 28px; min-height: 520px; } .spw .donut { flex-shrink: 0; } .sl-list { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.sl-arc { transition: opacity 160ms, transform 160ms; cursor: pointer; } .sl-arc:hover { transform: scale(1.025); transform-origin: 150px 150px; }
.sl-row { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; align-items: center; padding: 8px 10px; border-radius: 12px; transition: opacity 160ms, background 160ms; cursor: default; } .sl-row:hover { background: var(--fill); }
.sl-row .n { display: inline-flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 800; } .sl-row .n i { width: 11px; height: 11px; border-radius: 4px; display: inline-block; } .sl-row b { font-size: 14px; font-weight: 800; text-align: right; }
.sl-row .bar { grid-column: 1 / -1; height: 6px; border-radius: 999px; background: var(--fill); overflow: hidden; } .sl-row .bar i { display: block; height: 100%; border-radius: inherit; } .sl-row small { grid-column: 1 / -1; font-size: 11.5px; font-weight: 600; color: var(--muted); } .sl-row small em { font-style: normal; font-weight: 800; } .sl-row em.up { color: var(--gain); } .sl-row em.dn { color: var(--loss); }
.tg-h { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-size: 13px; } .tg-row { display: grid; grid-template-columns: 170px 1fr 104px; gap: 14px; align-items: center; padding: 6px 0; }
.tg-n { display: grid; grid-template-columns: 11px 1fr; gap: 0 9px; align-items: center; } .tg-n i { width: 11px; height: 11px; border-radius: 4px; grid-row: 1 / 3; display: inline-block; } .tg-n b { font-size: 13px; font-weight: 800; } .tg-n span { font-size: 11px; font-weight: 600; color: var(--muted); }
.tg-bar { position: relative; height: 16px; border-radius: 999px; background: var(--fill); } .tg-bar .now, .tg-bar .aft { position: absolute; top: 0; bottom: 0; border-radius: 999px; display: block; } .tg-bar .now { left: 0; } .tg-bar .aft { background: repeating-linear-gradient(135deg, var(--gain) 0 4px, transparent 4px 8px); border: 1.5px solid var(--gain); border-radius: 999px; opacity: 0.9; } .tg-bar .tick { position: absolute; top: -5px; bottom: -5px; width: 3px; border-radius: 2px; background: var(--ink); }
.tg-v { text-align: right; } .tg-v b { font-size: 14px; font-weight: 800; display: block; } .tg-v small { font-size: 11px; font-weight: 700; color: var(--muted); } .tg-v small.up { color: var(--gain); }
.mvrow { display: flex; flex-wrap: wrap; gap: 8px; } .mvchip { display: inline-flex; gap: 6px; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; } .mvchip em { font-style: normal; font-weight: 600; opacity: 0.8; } .mvchip.buy { background: var(--gain-tint); color: var(--gain); } .mvchip.sell { background: var(--loss-tint); color: var(--loss); }
.wm .bbg { cursor: help; } .wm .bbg circle { transition: fill-opacity 140ms; } .wm .bbg:hover circle { fill-opacity: 1; } .wm .bt { opacity: 0; pointer-events: none; transition: opacity 100ms; } .wm .bbg:hover .bt { opacity: 1; } .wm .bt rect { fill: oklch(0.99 0 0); filter: drop-shadow(0 6px 14px oklch(0 0 0 / 0.2)); } .wm .bt text { fill: oklch(0.25 0.01 260); font-weight: 600; font-size: 11.5px; } .wm .bt text.bb { font-weight: 800; }
.st-top { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding-bottom: 6px; } .st-note { text-align: right; font-size: 13px; } .st-note b { font-size: 22px; font-weight: 800; display: block; } .st-note small { display: block; font-size: 11.5px; color: var(--muted); font-weight: 600; max-width: 190px; margin-left: auto; }
.st-row { display: grid; grid-template-columns: 24px 74px 1fr 84px; gap: 10px; align-items: center; padding: 4px 0; font-size: 12.5px; font-weight: 700; } .st-row .bar { position: relative; height: 12px; border-radius: 999px; background: var(--fill); } .st-row .bar i { position: absolute; top: 0; bottom: 0; border-radius: 999px; display: block; } .st-row .bar i.up { background: var(--gain); opacity: 0.85; } .st-row .bar i.dn { background: var(--loss); opacity: 0.9; } .st-row.mute { opacity: 0.45; } .st-row .zero { position: absolute; left: 50%; top: -3px; bottom: -3px; width: 1.5px; background: var(--ink); opacity: 0.4; } .st-row .v { text-align: right; font-weight: 800; }
.ld { padding-top: 8px; } .ld .strip > span { min-width: 4px; } .ldm { position: absolute; top: -8px; bottom: -8px; width: 2px; background: var(--ink); opacity: 0.55; border-radius: 2px; } .ldm em { position: absolute; top: -16px; left: 50%; transform: translateX(-50%); font-style: normal; font-size: 10px; font-weight: 800; color: var(--muted); }
.rule { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 14px; background: var(--fill); } .rule .rrt { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; } .rule small { font-size: 11.5px; color: var(--muted); font-weight: 600; } .rchip { font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 999px; } .rchip.ok { background: var(--gain-tint); color: var(--gain); } .rchip.bad { background: var(--loss-tint); color: var(--loss); }
.rm { position: relative; height: 8px; border-radius: 999px; background: oklch(0 0 0 / 0.07); } .rm span { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; display: block; opacity: 0.85; } .rm i { position: absolute; top: -4px; bottom: -4px; width: 3px; border-radius: 2px; background: var(--ink); }
.gs-row { display: grid; grid-template-columns: 28px 150px 1fr 120px; gap: 12px; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--divider); } .gs-row:last-of-type { border-bottom: 0; } .gs-bar { display: flex; height: 14px; gap: 2px; } .gs-bar span { display: block; border-radius: 999px; min-width: 3px; }
.night .rm { background: oklch(1 0 0 / 0.1); } .night .wm .bt rect { fill: oklch(0.99 0 0); }
`;

export const INV7 = String.raw`
.selcrs { --chip-on-bg: linear-gradient(160deg, oklch(0.34 0.035 255), oklch(0.2 0.018 260)); --chip-on-fg: oklch(0.99 0 0); --chip-on-sh: 0 0 0 2.5px oklch(0.84 0.13 160); padding: 6px 6px 10px; margin-left: -6px; }
.selcrs .hcard { cursor: pointer; border: 1px solid oklch(1 0 0 / 0.06); }
.slim { padding: 26px 30px 24px; gap: 18px; }
.ctl { padding-bottom: 2px; }
.bigv.xl { font-size: 76px; font-weight: 800; letter-spacing: -0.045em; line-height: 0.95; }
.bigv.xxl { font-size: 100px; font-weight: 800; letter-spacing: -0.05em; line-height: 0.92; }
.gh1 { display: flex; justify-content: space-between; align-items: flex-end; gap: 28px; padding: 10px 0 4px; } .gh1 .hk { margin-bottom: 6px; } .gr { text-align: right; max-width: 460px; font-size: 14px; line-height: 1.5; padding-bottom: 10px; } .gr .vi-as, .gr .vi-rg { font-weight: 800; }
.gh2 { position: relative; z-index: 2; margin-bottom: -250px; padding-top: 6px; pointer-events: none; } .gh2 .bigv { text-shadow: 0 10px 50px oklch(0 0 0 / 0.5); } .gr2 { margin-top: 12px; font-size: 14px; max-width: 520px; line-height: 1.5; }
.l2 .v-ln > svg, .l2 .v-vw { position: relative; z-index: 1; }
.gh3 { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 56px; align-items: end; padding: 10px 0 4px; } .gr3 { margin-top: 10px; font-size: 14px; line-height: 1.5; max-width: 560px; }
.gsp { display: flex; flex-direction: column; gap: 12px; padding-bottom: 12px; } .gsp-l { display: flex; justify-content: space-between; gap: 16px; font-size: 13px; font-weight: 700; color: oklch(0.82 0.01 250); } .gsp-l span { display: inline-flex; align-items: center; gap: 8px; } .gsp-l i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; } .gsp-l b { color: oklch(0.98 0 0); font-weight: 800; }
.gsp-b { display: flex; height: 34px; border-radius: 999px; overflow: hidden; gap: 3px; background: oklch(1 0 0 / 0.07); } .gsp-b span { display: block; height: 100%; min-width: 3px; border-radius: 999px; }
.fl.xl { gap: 5px; } .fl.xl i { width: 54px; height: 86px; font-size: 72px; border-radius: 10px; animation: flipin 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both; transform-origin: 50% 50%; } .fl.xl i.dotc { width: 24px; }
.fl.xl i:nth-child(1) { animation-delay: 0s; } .fl.xl i:nth-child(2) { animation-delay: 0.06s; } .fl.xl i:nth-child(3) { animation-delay: 0.12s; } .fl.xl i:nth-child(4) { animation-delay: 0.18s; } .fl.xl i:nth-child(5) { animation-delay: 0.24s; } .fl.xl i:nth-child(6) { animation-delay: 0.3s; } .fl.xl i:nth-child(7) { animation-delay: 0.36s; } .fl.xl i:nth-child(8) { animation-delay: 0.42s; }
@keyframes flipin { from { transform: perspective(500px) rotateX(-90deg); opacity: 0; } to { transform: none; opacity: 1; } }
.flapbox { min-height: 86px; }
.retrow .v-ln > * { }
.retrow .kdrow { grid-template-columns: repeat(6, 1fr); }
.kd.lt { background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--soft-shadow); } .kd.lt .k, .kd.lt .s { color: var(--muted); }
.retrow .kdrow[style*="repeat(4"] { }
`;
export const INV8 = String.raw`
.l2 .chsvg text.ax[text-anchor="end"] { opacity: 0; }
.phret .ptag { display: none; } .phret .kpi .kh { font-size: 13px; gap: 7px; } .phret .kpi .kh i { width: 24px; height: 24px; flex: none; } .phret .kv2 small { font-size: 12px; }
`;

export const INV9 = String.raw`
.notice.err { background: var(--loss-tint); color: var(--loss); } .notice.err b, .notice.err .grow { color: var(--loss); }
.emp { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 8px; } .empc { background: oklch(1 0 0 / 0.07); border: 1px solid oklch(1 0 0 / 0.1); border-radius: 22px; padding: 22px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; } .empc b { font-size: 16px; font-weight: 800; } .empc p { margin: 0; font-size: 13px; line-height: 1.55; color: oklch(0.8 0.01 250); flex: 1; }
.emptyline { margin-top: 28px; max-width: 760px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; } .emptyline b { font-size: 17px; } .emptyline p { margin: 0; font-size: 13.5px; line-height: 1.6; color: oklch(0.8 0.01 250); }
.chips-scroll { display: flex; align-items: center; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 0 -2px; padding: 2px; } .chips-scroll::-webkit-scrollbar { display: none; } .chips-scroll .chip2 { white-space: nowrap; padding: 7px 12px; }
.phsel .hcard { flex: 0 0 150px; padding: 12px; gap: 8px; } .phsel .hcard.sel { background: linear-gradient(160deg, oklch(0.34 0.035 255), oklch(0.2 0.018 260)); box-shadow: 0 0 0 2.5px oklch(0.84 0.13 160); } .phsel { margin-right: -16px; }
.phh { display: grid; grid-template-columns: 38px 1fr auto; gap: 8px 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--divider); } .phh:last-of-type { border-bottom: 0; }
.phstats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.phret .kpi { padding: 14px 16px; gap: 12px; } .ph .kpi .kv2 { font-size: 26px; }
.tsheet { background: var(--surface); border-radius: 26px 26px 0 0; padding: 12px 16px 20px; box-shadow: 0 -14px 40px oklch(0 0 0 / 0.22); display: flex; flex-direction: column; gap: 12px; } .grab { width: 40px; height: 4px; border-radius: 2px; background: var(--fill-strong); margin: 0 auto 4px; }
.toast { display: inline-flex; align-items: center; gap: 8px; align-self: center; padding: 12px 18px; border-radius: 999px; background: var(--ink); color: var(--on-ink); font-size: 13px; font-weight: 700; margin-top: 4px; }
.ph .hc-wrap { display: none; }
.emptyplot { height: 280px; border: 1.5px dashed oklch(1 0 0 / 0.18); border-radius: 22px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: oklch(0.8 0.01 250); font-size: 14px; font-weight: 700; }
`;

export const INV10 = String.raw`
.spx { flex: 1; display: flex; flex-direction: column; min-height: var(--bh, 440px); } .spx .v-sp { flex: 1; } .spx-in { height: var(--bh, 440px); display: flex; gap: 20px; } .spx-in > * { min-width: 0; }
.spx .sl-arc { transform: none !important; transition: opacity 160ms; cursor: pointer; } .spx .sl-row { transition: opacity 160ms; }
.tilegrid { flex: 1; display: grid; gap: 10px; grid-auto-rows: 1fr; align-content: stretch; } .tg { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; align-content: center; padding: 10px 14px; border-radius: 16px; background: var(--fill); border-left: 4px solid var(--c); }
.tg .n { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 800; } .tg .n i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; } .tg b { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; } .tg .bar { grid-column: 1 / -1; height: 6px; border-radius: 999px; background: oklch(0 0 0 / 0.07); overflow: hidden; } .tg .bar i { display: block; height: 100%; border-radius: inherit; } .tg small { grid-column: 1 / -1; font-size: 11.5px; font-weight: 600; color: var(--muted); } .tg small em { font-style: normal; font-weight: 800; } .tg small em.up { color: var(--gain); } .tg small em.dn { color: var(--loss); }
.night .tg .bar { background: oklch(1 0 0 / 0.1); }
.tm2 { position: relative; flex: 1; border-radius: 18px; overflow: hidden; } .tm2g { position: absolute; padding: 3px; display: flex; flex-direction: column; } .tm2g > .tm2h { display: flex; justify-content: space-between; gap: 6px; padding: 2px 6px 4px; font-size: 11.5px; font-weight: 800; color: var(--fg); white-space: nowrap; overflow: hidden; } .tm2h span { color: var(--muted); } .tm2i { position: relative; flex: 1; border-radius: 12px; overflow: hidden; background: var(--fill); } .tm2t { position: absolute; border: 1.5px solid var(--surface); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 800; color: white; overflow: hidden; }
.wfw { flex: 0 0 52%; display: flex; align-items: center; justify-content: center; } .wf2 { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; width: min(100%, 420px); aspect-ratio: 1; } .wf2 i { border-radius: 6px; display: block; }
.cols2 { flex: 1; display: flex; gap: 12px; align-items: stretch; } .col2c { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; } .col2c .cv { text-align: center; font-size: 13px; font-weight: 800; } .col2c .cb { display: flex; flex-direction: column-reverse; gap: 2px; border-radius: 12px; overflow: hidden; flex-shrink: 0; } .col2c .cb span { display: block; min-height: 3px; }
.col2c { position: relative; } .col2c .cb { max-height: calc(100% - 70px); } .cols2 .col2c { height: 100%; } .col2c .cl { font-size: 11px; font-weight: 800; text-align: center; line-height: 1.25; display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 44px; } .col2c .cl i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; } .col2c .cl small { font-size: 10.5px; color: var(--muted); font-weight: 600; }
.rw4 { flex: 0 0 52%; display: flex; align-items: center; } .ring4 { display: block; }
.rowsin { flex: 1; display: grid; grid-auto-rows: 1fr; gap: 8px; } .ri { display: flex; flex-direction: column; justify-content: center; gap: 6px; padding: 10px 14px; border-radius: 16px; background: var(--fill); } .ri .rih { display: flex; justify-content: space-between; align-items: baseline; } .ri .n { display: inline-flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 800; } .ri .n i { width: 11px; height: 11px; border-radius: 4px; display: inline-block; } .ri b { font-size: 20px; font-weight: 800; } .ri .bar { height: 7px; border-radius: 999px; background: oklch(0 0 0 / 0.07); overflow: hidden; } .ri .bar i { display: block; height: 100%; border-radius: inherit; } .ri .rif { display: flex; flex-direction: column; gap: 6px; } .ri small { font-size: 11.5px; font-weight: 600; color: var(--muted); } .ri small em { font-style: normal; font-weight: 800; } .ri small em.up { color: var(--gain); } .ri small em.dn { color: var(--loss); } .chp { display: flex; flex-wrap: wrap; gap: 5px; } .chp em { font-style: normal; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: var(--surface); border: 1px solid var(--surface-line); }
.night .ri .bar { background: oklch(1 0 0 / 0.1); }
`;
export const INV11 = String.raw`
.spx .sl-row { align-items: stretch; }
.spx .tg.sl-row { align-items: center; }
.tm2g.sl-row { display: flex; flex-direction: column; padding: 3px; gap: 0; grid-template-columns: none; border-radius: 0; background: none; } .tm2g.sl-row:hover { background: none; }
.col2c.sl-row { display: flex; flex-direction: column; justify-content: flex-end; padding: 0; border-radius: 0; background: none; align-items: stretch; } .col2c.sl-row:hover { background: none; }
.ri.sl-row { display: flex; flex-direction: column; align-items: stretch; justify-content: center; }
.tm2g.sl-row .tm2h { align-items: center; }
`;

export const INV12 = String.raw`
.tilegrid { grid-auto-rows: minmax(0, 1fr); min-width: 0; } .tilegrid.dense { gap: 7px; } .tilegrid.dense .tg { padding: 6px 12px; } .tilegrid.dense .tg b { font-size: 19px; } .tilegrid.dense .tg small { font-size: 11px; } .tilegrid.dense .tg .bar { height: 5px; }
.rowsin { grid-auto-rows: minmax(0, 1fr); } .rowsin.dense { gap: 6px; } .rowsin.dense .ri { padding: 6px 14px; gap: 4px; } .rowsin.dense .ri b { font-size: 17px; } .rowsin.dense .ri .n { font-size: 13px; }
.tilegrid .tg .n { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
`;

export const INV13 = String.raw`
.tilegrid.tiny { gap: 4px; } .tilegrid.tiny .tg { padding: 3px 12px; grid-template-columns: 1fr auto auto; } .tilegrid.tiny .tg .bar { display: none; } .tilegrid.tiny .tg b { font-size: 15px; } .tilegrid.tiny .tg small { grid-column: auto; font-size: 11px; white-space: nowrap; }
.rowsin.tiny { gap: 4px; } .rowsin.tiny .ri { padding: 3px 14px; gap: 0; flex-direction: row; align-items: center; } .rowsin.tiny .ri .rih { flex: 1; } .rowsin.tiny .ri .bar { display: none; } .rowsin.tiny .ri .rif { flex-direction: row; } .rowsin.tiny .ri b { font-size: 15px; } .rowsin.tiny .ri { flex-direction: row; }
.ri.sl-row { flex-direction: column; } .rowsin.tiny .ri.sl-row { flex-direction: row; }
`;

export const INV14 = String.raw`
.zbox { position: relative; width: 480px; height: 480px; flex-shrink: 0; align-self: center; } .zarc { position: absolute; inset: 0; transition: opacity 160ms, transform 160ms, filter 160ms; } .zarc.go { cursor: zoom-in; } .zarc:hover { filter: brightness(1.12); transform: scale(1.015); } .zbox:has(.dm:hover) .dm:not(:hover):not(.zc) { opacity: 0.3; }
.zl { position: absolute; transform: translate(-50%, -50%); font-size: 12px; font-weight: 800; color: white; pointer-events: none; text-shadow: 0 1px 4px oklch(0 0 0 / 0.45); }
.zc { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 150px; text-align: center; pointer-events: none; } .zc .k { font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); } .zc b { display: block; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; margin: 2px 0; } .zc small { font-size: 11px; color: var(--muted); font-weight: 600; }
.zside { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; } .zback { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; padding: 7px 14px; border-radius: 999px; background: var(--ink); color: var(--on-ink); font-size: 12.5px; font-weight: 800; cursor: pointer; } .zback.off { background: var(--fill); color: var(--muted); cursor: default; }
.bubs { position: relative; flex: 1; } .bub { position: absolute; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 800; color: white; box-shadow: inset 0 -6px 12px oklch(0 0 0 / 0.18), inset 0 4px 8px oklch(1 0 0 / 0.25); transition: transform 160ms; cursor: help; } .bub:hover { transform: scale(1.12); z-index: 3; }
.bubg { position: absolute; border-radius: 50%; border: 1.5px dashed var(--c); background: color-mix(in oklch, var(--c) 9%, transparent); padding: 0; display: block; } .bubn.off { display: none; } .bubn.in { font-size: 12px; } .bubn { position: absolute; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 11px; font-weight: 800; color: var(--fg); } .bubs:has(.bubg:hover) .bubg:not(:hover) { opacity: 0.3; }
.flowsel { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; } .spx .v-fr svg { display: block; }
.pil { width: 190px; flex-shrink: 0; display: flex; flex-direction: column; gap: 4px; } .pill2 { cursor: pointer; border-radius: 14px; padding: 8px 14px; display: flex; flex-direction: column; justify-content: center; color: white; min-height: 34px; transition: transform 160ms, box-shadow 160ms; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.22); } .pill2:hover { transform: translateX(4px); } .pill2 b { font-size: 12.5px; font-weight: 800; line-height: 1.15; } .pill2 span { font-size: 11px; font-weight: 700; opacity: 0.88; }
.plpanel { flex: 1; min-width: 0; display: flex; flex-direction: column; } .plpanel > .v-pl { flex: 1; display: none; } .plh { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; padding: 4px 4px 12px; } .plh .n { display: inline-flex; align-items: center; gap: 9px; font-size: 16px; } .plh .n i { width: 12px; height: 12px; border-radius: 4px; display: inline-block; }
.plr { display: grid; grid-auto-rows: minmax(0, 1fr); gap: 8px; height: calc(100% - 44px); } .plrow { display: grid; grid-template-columns: 30px 150px 1fr 70px; gap: 12px; align-items: center; padding: 8px 12px; border-radius: 16px; background: var(--fill); } .plbar { height: 14px; border-radius: 999px; background: oklch(0 0 0 / 0.07); overflow: hidden; } .plbar i { display: block; height: 100%; border-radius: inherit; transform-origin: left; animation: grow 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both; } @keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.chai-app:has(#pl-0:checked) .plpanel > .v-pl[data-k="0"] { display: flex; flex-direction: column; } ${Array.from({ length: 9 }, (_, i) => `.chai-app:has(#pl-${i + 1}:checked) .plpanel > .v-pl[data-k="${i + 1}"] { display: flex; flex-direction: column; }`).join(" ")}
.orbs { display: block; width: 100%; height: 100%; flex: 1; } .spin { animation: spin 60s linear infinite; } .spin.rev { animation-direction: reverse; } @keyframes spin { to { transform: rotate(360deg); } } .orbs:hover .spin { animation-play-state: paused; } .orl { font-family: inherit; font-size: 11px; font-weight: 800; fill: var(--fg); paint-order: stroke; stroke: var(--surface); stroke-width: 3px; } .orbs:has(.plt:hover) .plt:not(:hover) { opacity: 0.3; } .plt circle { cursor: help; }
.night .plbar { background: oklch(1 0 0 / 0.1); }
@media (prefers-reduced-motion: reduce) { .spin, .plbar i { animation: none; } }
`;

const SLK = ["asset", "market", "kind", "sector", "holding", "source"], MORPHK = ["market", "kind", "sector", "holding"], PI = Array.from({ length: 10 }, (_, i) => i);
const PS_PICK = pick("ps", PI.map(String));
const MORPH_CSS = `.morph .arc { transform: rotate(var(--a-asset)); stroke: var(--c-asset); transition: transform 1s cubic-bezier(0.2, 0.8, 0.2, 1), stroke 0.6s; }\n` + MORPHK.map((k) => `.chai-app:has(#sp-${k}:checked) .morph .arc { transform: rotate(var(--a-${k})); stroke: var(--c-${k}); }`).join("\n");
const SPIN_CSS = SLK.flatMap((k) => PI.map((i) => `.chai-app:has(#sp-${k}:checked):has(#ps-${i}:checked) .wheel { transform: rotate(var(--rot-${k}-${i}, 0deg)); }`)).join("\n");
const PS_CSS = PI.map((i) => `.chai-app:has(#ps-${i}:checked) label.pk[for="ps-${i}"] { background: var(--ink); color: var(--on-ink); box-shadow: 0 6px 16px oklch(0 0 0 / 0.22); }\n.chai-app:has(#ps-${i}:checked) .xs[data-i="${i}"] { transform: translate(var(--dx), var(--dy)); filter: brightness(1.08); }\n.chai-app:has(#ps-${i}:checked) .xr[data-i="${i}"] { opacity: 1; transform: none; pointer-events: auto; }\n.chai-app:has(#ps-${i}:checked) .needle { transform: rotate(var(--n-${i}, 0deg)); }`).join("\n");
const DISC_CSS = SLK.map((k) => `.chai-app:has(#sp-${k}:checked) label.disc[for="sp-${k}"] { filter: drop-shadow(0 0 0 var(--ink)) saturate(1.2); } .chai-app:has(#sp-${k}:checked) label.disc[for="sp-${k}"] .dtag { background: var(--ink); color: var(--on-ink); }`).join("\n");
export const INV15 = PS_PICK + "\n" + MORPH_CSS + "\n" + SPIN_CSS + "\n" + PS_CSS + "\n" + DISC_CSS + String.raw`
.mphw { flex: 0 0 52%; display: flex; align-items: center; justify-content: center; } .mphl { flex: 1; min-width: 0; display: flex; flex-direction: column; } .mphl > .v-sp { flex: 1; } .mphh { font-size: 12px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; } .mphl .tilegrid { height: calc(100% - 26px); }
.pkrow { display: flex; flex-wrap: wrap; gap: 8px; } label.pk { cursor: pointer; display: inline-flex; align-items: center; gap: 8px; padding: 7px 13px; border-radius: 999px; background: var(--fill); font-size: 12.5px; font-weight: 800; transition: background 140ms, transform 140ms; } label.pk:hover { transform: translateY(-2px); background: var(--fill-strong); } label.pk i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; } label.pk em { font-style: normal; opacity: 0.65; font-weight: 700; }
.wheelbox { position: relative; flex: 0 0 420px; width: 420px; height: 420px; align-self: center; } .wheel { transition: transform 1.1s cubic-bezier(0.25, 1, 0.3, 1); } .wa { transition: opacity 160ms; } .wheelsvg:has(.wa:hover) .wa:not(:hover) { opacity: 0.4; }
.wcentre { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 150px; text-align: center; pointer-events: none; } .wc b { display: block; font-size: 38px; font-weight: 800; letter-spacing: -0.03em; } .wc span { font-size: 12px; font-weight: 700; color: var(--muted); }
.wside { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; } .phd { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; } .phd .n { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; } .phd .n i { width: 11px; height: 11px; border-radius: 4px; display: inline-block; } .phd small { font-size: 12px; font-weight: 700; color: var(--muted); }
.hl2 { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; } .hlr { display: grid; grid-template-columns: 62px 1fr 34px 56px; gap: 8px; align-items: center; font-size: 12px; font-weight: 700; } .hlr .sy { font-weight: 800; } .hlr .hb { height: 10px; border-radius: 999px; background: oklch(0 0 0 / 0.07); overflow: hidden; } .hlr .hb i { display: block; height: 100%; border-radius: inherit; transform-origin: left; animation: grow 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both; } .hlr b { text-align: right; } .hlr small { color: var(--muted); font-weight: 600; text-align: right; }
.night .hlr .hb { background: oklch(1 0 0 / 0.1); }
.xwrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12px; } .xbox { position: relative; width: 460px; height: 460px; flex-shrink: 0; } .xs { position: absolute; inset: 0; cursor: pointer; transition: transform 0.5s cubic-bezier(0.3, 1.4, 0.4, 1), filter 160ms; } .xs:hover { filter: brightness(1.12); }
.xr { position: absolute; inset: 0; opacity: 0; transform: scale(0.82); transform-origin: 50% 50%; transition: opacity 0.4s, transform 0.55s cubic-bezier(0.3, 1.3, 0.4, 1); pointer-events: none; } .xrp { position: absolute; inset: 0; } .xrl { position: absolute; transform: translate(-50%, -50%); font-size: 9.5px; font-weight: 800; color: white; pointer-events: none; text-shadow: 0 1px 3px oklch(0 0 0 / 0.5); }
.xc { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 130px; text-align: center; pointer-events: none; } .xc b { display: block; font-size: 36px; font-weight: 800; letter-spacing: -0.03em; } .xc span { font-size: 12px; font-weight: 800; display: block; } .xc small { font-size: 11px; color: var(--muted); font-weight: 600; }
.xbox > .v-ps { position: absolute; inset: 0; }
.gwrap { flex: 1; display: flex; flex-direction: column; gap: 10px; } .gsvg { display: block; } .needle { transition: transform 1.1s cubic-bezier(0.3, 1.5, 0.4, 1); } .ga { transition: opacity 160ms; } .gsvg:has(.ga:hover) .ga:not(:hover) { opacity: 0.4; }
.gread { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; padding: 2px 4px; } .gr2b { text-align: right; display: flex; flex-direction: column; gap: 2px; } .gr2b b { font-size: 17px; } .gr2b span { font-size: 12.5px; font-weight: 700; color: var(--muted); } .gr2b span.up { color: var(--gain); } .gr2b span.dn { color: var(--loss); }
.stage3d { flex: 0 0 56%; perspective: 1500px; display: flex; align-items: center; justify-content: center; } .stk3d { position: relative; width: 340px; height: 340px; transform-style: preserve-3d; transform: translateX(-34px) scale(0.8) rotateX(62deg) rotateZ(-30deg) translateY(30px); } label.disc { position: absolute; inset: 0; display: block; cursor: pointer; transform: translateZ(calc(var(--z) * 1px)); transition: transform 0.4s cubic-bezier(0.3, 1.3, 0.4, 1), filter 200ms; } label.disc:hover { transform: translateZ(calc(var(--z) * 1px + 30px)); } .dtag { position: absolute; left: 82%; top: 14%; margin-left: 8px; white-space: nowrap; font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 999px; background: var(--fill-strong); transform: rotateZ(30deg) rotateX(-62deg); transform-origin: left center; }
.rosesvg { display: block; } .pt { animation: petal 0.8s cubic-bezier(0.3, 1.3, 0.4, 1) both; transition: transform 200ms, opacity 160ms; cursor: help; } .pt:hover { transform: scale(1.05); } .rosesvg:has(.pt:hover) .pt:not(:hover) { opacity: 0.45; } @keyframes petal { from { transform: scale(0.1); opacity: 0; } to { transform: scale(1); opacity: 1; } } .rl { font-family: inherit; font-size: 12px; font-weight: 800; fill: var(--fg); paint-order: stroke; stroke: var(--surface); stroke-width: 3px; }
@media (prefers-reduced-motion: reduce) { .wheel, .needle, .morph .arc, .pt, .xs, .xr, label.disc { transition: none; animation: none; } }
`;

const TK = ["asset", "market", "kind", "sector"], TS = ["NTAP", "VOO", "QQQ", "HDFCBANK", "INFY", "RELIANCE", "NIFTYBEES", "PPFAS", "ICICICORP", "GOLDBEES"];
const TREE_POS = TK.map((k) => `.chai-app:has(#sp-${k}:checked) .tile { left: var(--l-${k}); top: var(--t-${k}); width: var(--w-${k}); height: var(--h-${k}); }\n.chai-app:has(#sp-${k}:checked) .tile .tl { background: var(--bg-${k}); }\n.chai-app:has(#sp-${k}:checked) .tgl[data-k="${k}"] { opacity: 1; }\n.chai-app:has(#sp-${k}:checked) .tmx { --grouped: 1; }`).join("\n");
const TREE_PICK = TS.map((s) => `.chai-app:has(#tp-${s}:checked) .tile[data-s="${s}"] .tl { box-shadow: 0 0 0 2.5px var(--surface), 0 0 0 5px var(--accent); }\n.chai-app:has(#tp-${s}:checked) .tile[data-s="${s}"] .chk { display: flex; }\n.chai-app:has(#tw-${s}:checked):has(#sp-holding:checked) .tile[data-s="${s}"] { opacity: 0; transform: scale(0.6); pointer-events: none; }\n.chai-app:has(#tw-${s}:checked):has(#sp-holding:checked) .tile:not([data-s="${s}"]) { left: var(--wl-${s}); top: var(--wt-${s}); width: var(--ww-${s}); height: var(--wh-${s}); }\n.chai-app:has(#tw-${s}:checked):has(#sp-holding:checked) .twv .v-tw[data-k="${s}"] { display: block; }`).join("\n");
const GROUPED = [...TK].map((k) => `.chai-app:has(#sp-${k}:checked)`);
export const INV16 = pick("vz", ["wheel", "tree"]) + "\n" + pick("tp", [...TS, "none"]) + "\n" + pick("tw", ["none", ...TS]) + "\n" + TREE_POS + "\n" + TREE_PICK + "\n" + String.raw`
.slrow { display: flex; }
.vzn .vz1, .vzn .vz2 { display: none; } .chai-app:has(#vz-wheel:checked) .vzn .vz1 { display: inline; } .chai-app:has(#vz-tree:checked) .vzn .vz2 { display: inline; }
.splw .wheelbox { flex-basis: 340px; width: 340px; height: 340px; } .splw .wheelsvg { width: 340px; height: 340px; } .splw .wcentre { width: 120px; } .splw .wc b { font-size: 30px; } .splw .spx-in { gap: 16px; }
.tmw { display: flex; flex-direction: column; gap: 10px; min-height: 520px; } .tmxw { position: relative; width: 100%; aspect-ratio: ${652} / ${440}; } .tmx { position: absolute; inset: 0; }
.tile { position: absolute; left: var(--l-holding); top: var(--t-holding); width: var(--w-holding); height: var(--h-holding); container-type: size; transition: left 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), width 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s, filter 0.2s, translate 0.2s, transform 0.4s; z-index: 1; }
.tile .tl { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 14px; border-radius: 18px; background: var(--bg-holding); color: var(--on-card); border: 1px solid oklch(1 0 0 / 0.14); border-top-color: oklch(1 0 0 / 0.26); cursor: pointer; overflow: hidden; isolation: isolate; text-align: left; }
.tile:hover { translate: 0 -3px; z-index: 5; } .tmx:has(.tile:hover) .tile:not(:hover) { opacity: 0.75; filter: saturate(0.55); }
.tr1 { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; } .tnm { min-width: 0; } .tn { display: block; font-size: 16px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .td { display: block; font-size: 11.5px; font-weight: 600; color: oklch(1 0 0 / 0.62); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .ts { font-style: normal; font-size: 10px; font-weight: 700; color: oklch(1 0 0 / 0.55); } .tile:hover .ts { opacity: 0; }
.tx { display: none; font-size: 13px; font-weight: 800; align-self: center; margin: auto; } .tv { display: block; font-size: 24px; font-weight: 800; letter-spacing: -0.01em; line-height: 1.1; white-space: nowrap; } .tw2 { display: block; font-size: 11px; font-weight: 600; color: oklch(1 0 0 / 0.62); margin-top: 3px; }
@container (max-width: 190px), (max-height: 130px) { .tl { padding: 10px; border-radius: 14px; } .tn { font-size: 12px; } .td, .ts, .tw2 { display: none; } .tv { font-size: 13px; } }
@container (max-width: 90px), (max-height: 66px) { .tl { padding: 6px; border-radius: 11px; } .tn { display: none; } .tx { display: block; } .tv { font-size: 10px; text-align: center; } .tr1 { display: none; } .tl { justify-content: center; } }
@container (max-width: 66px), (max-height: 52px) { .tv { display: none; } }
.chai-app:not(:has(#sp-holding:checked)):not(:has(#sp-source:checked)) .tile .td, .chai-app:not(:has(#sp-holding:checked)):not(:has(#sp-source:checked)) .tile .ts, .chai-app:not(:has(#sp-holding:checked)):not(:has(#sp-source:checked)) .tile .tw2 { display: none; }
.chai-app:not(:has(#sp-holding:checked)):not(:has(#sp-source:checked)) .tile .tl { justify-content: flex-end; padding: 8px; border-radius: 11px; } .chai-app:not(:has(#sp-holding:checked)):not(:has(#sp-source:checked)) .tile .tn { font-size: 10.5px; font-weight: 700; color: oklch(1 0 0 / 0.8); } .chai-app:not(:has(#sp-holding:checked)):not(:has(#sp-source:checked)) .tile .tv { display: none; } .chai-app:not(:has(#sp-holding:checked)):not(:has(#sp-source:checked)) .tile .tr2 { display: none; }
.tgl { position: absolute; inset: 0; opacity: 0; transition: opacity 0.4s; pointer-events: none; } .tgb { position: absolute; border-radius: 16px; border: 1px solid oklch(1 0 0 / 0.14); } .tgh { position: absolute; left: 12px; right: 12px; top: 8px; display: flex; justify-content: space-between; gap: 8px; color: var(--on-card); font-size: 13px; } .tgh b { font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .tgh em { font-style: normal; font-weight: 700; font-size: 11.5px; opacity: 0.8; white-space: nowrap; }
.twl { position: absolute; top: 9px; right: 9px; z-index: 3; padding: 4px 10px; border-radius: 999px; background: oklch(0 0 0 / 0.38); color: var(--on-card); font-size: 10px; font-weight: 800; cursor: pointer; opacity: 0; pointer-events: none; transition: opacity 0.2s; backdrop-filter: blur(4px); } .tile:hover .twl { opacity: 1; pointer-events: auto; } .chai-app:not(:has(#sp-holding:checked)) .twl { display: none; }
.chk { display: none; position: absolute; top: -7px; right: -7px; z-index: 4; width: 21px; height: 21px; border-radius: 50%; background: var(--accent); color: var(--on-accent); align-items: center; justify-content: center; box-shadow: 0 2px 6px oklch(0 0 0 / 0.4); }
.tmstrip { min-height: 44px; display: flex; align-items: center; padding: 6px 4px 0; font-size: 12.5px; font-weight: 600; } .sp1 { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; line-height: 1.5; } .sp1 b { font-weight: 800; } .tmstrip .twv .v-tw, .tmstrip .tpv .v-tp { }
.tpv, .twv { width: 100%; } .chai-app:has(#sp-holding:checked):not(:has(#tw-none:checked)) .tpv { display: none; } .chai-app:not(:has(#sp-holding:checked)) .twv { display: none; }
.twreset { cursor: pointer; display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; background: var(--ink); color: var(--on-ink); font-size: 11px; font-weight: 800; margin-left: 6px; }
.tile .hc-wrap { z-index: 20; font-weight: 500; }
@media (prefers-reduced-motion: reduce) { .tile, .tgl { transition: none; } }
`;

export const INV17 = String.raw`
.ph .card.sbtw { padding: 16px; } .ph .splw .spx-in { flex-direction: column; align-items: center; height: auto; gap: 12px; } .ph .splw { min-height: 0; } .ph .splw .wheelbox { flex-basis: 270px; width: 270px; height: 270px; } .ph .splw .wheelsvg { width: 270px; height: 270px; } .ph .splw .wside { width: 100%; } .ph .splw .wc b { font-size: 24px; } .ph .splw .wcentre { width: 96px; }
.ph .slrow { overflow-x: auto; scrollbar-width: none; margin: 0 -4px; } .ph .slrow .chips { flex-wrap: nowrap; } .ph .slrow .chip2 { white-space: nowrap; padding: 7px 12px; }
.ph .tmw { min-height: 0; } .ph .tmstrip { padding-top: 2px; } .ph .tmstrip .sub2 { white-space: normal; line-height: 1.45; } .ph .tmxw { aspect-ratio: 326 / 420; } .ph .twl { display: none !important; }
`;

export const INV18 = String.raw`
.cashx { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: stretch; } .cashx.ph1 { grid-template-columns: 1fr; gap: 14px; }
.csum { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 20px; border-radius: 20px; background: var(--surface); border: 1px solid var(--surface-line); min-height: 210px; }
.csum .hk { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.cbig { font-size: 42px; font-weight: 800; letter-spacing: -0.035em; line-height: 1; } .csub { font-size: 12.5px; font-weight: 600; color: var(--muted); }
.cbar { margin-top: auto; display: flex; flex-direction: column; gap: 8px; } .cbar .strip { height: 14px; } .cnote { font-size: 12.5px; font-weight: 600; line-height: 1.45; } .cnote b { font-weight: 800; }
.cwrap { position: relative; display: flex; } .cwrap > .cacct { flex: 1; }
.cacct { border-radius: 20px; padding: 18px 20px; color: var(--on-card); display: flex; flex-direction: column; gap: 4px; min-height: 210px; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.25); }
.cacct .ch { display: flex; justify-content: space-between; align-items: center; gap: 8px; } .cbr { display: inline-flex; align-items: center; gap: 10px; font-size: 14px; } .cbr b { font-weight: 800; }
.cbr i { width: 30px; height: 30px; border-radius: 10px; background: oklch(1 0 0 / 0.2); display: grid; place-items: center; font-style: normal; font-weight: 800; font-size: 13px; }
.ccur { padding: 3px 10px; border-radius: 999px; background: oklch(1 0 0 / 0.2); font-size: 11px; font-weight: 800; letter-spacing: 0.05em; }
.cbal { font-size: 34px; font-weight: 800; letter-spacing: -0.03em; margin-top: 12px; line-height: 1.05; } .cinr { font-size: 14px; font-weight: 700; } .cinr small, .cft small { opacity: 0.8; font-weight: 600; font-size: inherit; }
.cft { margin-top: auto; display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 700; border-top: 1.5px dashed oklch(1 0 0 / 0.35); padding-top: 10px; flex-wrap: wrap; }
.cold { font-style: normal; padding: 1px 8px; border-radius: 999px; background: var(--warning-tint); color: var(--warning-text); font-size: 10.5px; font-weight: 800; margin-left: 4px; }
.cup { display: inline-flex; gap: 5px; align-items: center; padding: 3px 10px; border-radius: 999px; background: oklch(1 0 0 / 0.2); font-size: 11px; font-weight: 800; white-space: nowrap; }
.ph .cbig { font-size: 36px; } .ph .cbal { font-size: 30px; } .ph .csum, .ph .cacct { min-height: 0; }
.cwrap .hc-wrap { z-index: 20; } .csum .hc-wrap { z-index: 20; }
`;
