// The Expenses canvas's own styles, after the shared base (css-base.mjs). The Overview's stage, big number, pills and pointing
// greeting are copied in (from design/overview/generator: css-ov.mjs, css-r3.mjs), so the page reads as the same family.
// Everything interactive works with no script: hidden radios named "m", labels and :has().
import { MKEYS } from "./data.mjs";

const tok = (n, h, c = 0.09) => `--card-${n}-from: oklch(0.34 ${c} ${h}); --card-${n}-to: oklch(0.17 ${c * 0.6} ${h}); --card-${n}: oklch(0.55 ${c * 1.2} ${h});`;
const key = (p, k) => `#${p}-${k}:checked`;
const pick = (p, keys) => `.chai-app .vw-${p} { display: none; }\n` + keys.map((k) => `.chai-app:has(${key(p, k)}) .vw-${p}-${k} { display: block; }\n.chai-app:has(${key(p, k)}) .vw-${p}-${k}.vw-flexcol { display: flex; }\n.chai-app:has(${key(p, k)}) label[for="${p}-${k}"] { --sel: 1; }\n.chai-app:has(${key(p, k)}) .yr-${k} { --sel: 1; }`).join("\n") + "\n";

const SHARED = String.raw`
.chai-app { ${tok("gold", 82, 0.1)} ${tok("indigo", 275, 0.11)} ${tok("sky", 232, 0.09)} ${tok("forest", 148, 0.08)} ${tok("rose", 355, 0.1)} ${tok("plum", 325, 0.09)} --gain: oklch(0.42 0.14 145); --loss: oklch(0.55 0.16 25); --gain-tint: oklch(0.94 0.05 150); --loss-tint: oklch(0.95 0.035 30); }
.pgcol { display: flex; flex-direction: column; gap: 20px; }
.pk-in { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
.pkl { cursor: pointer; transition: transform 220ms var(--ease-out, ease), opacity 200ms, box-shadow 220ms, background 200ms; }
.lede .pt { position: relative; display: inline-block; outline: none; }
.lede .pt > b { cursor: help; border-bottom: 1.5px dotted var(--accent-text); padding-bottom: 1px; transition: background 160ms; border-radius: 4px; }
.lede .pt:hover > b, .lede .pt:focus-visible > b, .lede .pt:focus > b { background: var(--accent-tint); }
.hov:focus > .hc-wrap, .hov:focus-within > .hc-wrap { opacity: 1; transform: none; }
.lede .hc-wrap { font-weight: 500; font-size: 13px; line-height: 1.4; color: var(--fg); }
.hc .t small { font-size: 14px; font-weight: 700; opacity: 0.7; }
.sample-tag { vertical-align: 2px; margin-left: 10px; text-transform: none; letter-spacing: 0; }
.up { color: var(--gain); } .dn { color: var(--loss); }
.r { text-align: right; }
.tagb { display: inline-flex; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 800; letter-spacing: 0.03em; background: oklch(0.94 0.03 258); color: oklch(0.42 0.1 258); white-space: nowrap; }
.tagb.warn { background: var(--warning-tint); color: var(--warning-text); }
.stg2 { position: relative; isolation: isolate; border-radius: 28px; overflow: hidden; color: #fff; padding: 30px 32px; display: flex; flex-direction: column; gap: 24px; background: radial-gradient(110% 130% at 0% 0%, color-mix(in oklch, var(--h1) 82%, white), transparent 62%), linear-gradient(140deg, var(--h1), var(--h2)); box-shadow: var(--card-shadow); }
.stg2::after { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; background: repeating-radial-gradient(circle at calc(100% + 10px) calc(100% + 18px), oklch(1 0 0 / 0.1) 0 1px, transparent 1px 15px); }
.stg2 svg text { font-family: inherit; }
.nwc { display: flex; align-items: baseline; font-size: 96px; font-weight: 800; letter-spacing: -0.045em; line-height: 0.95; font-variant-numeric: tabular-nums; }
.nwc small { font-size: 0.46em; font-weight: 700; margin-right: 6px; opacity: 0.7; letter-spacing: 0; align-self: flex-start; margin-top: 0.12em; }
.eyebrow-s { font-size: 12px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.78; }
.dpill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; font-size: 14px; font-weight: 800; background: oklch(1 0 0 / 0.16); } .dpill small { font-size: 12px; font-weight: 700; opacity: 0.78; color: #fff; margin-left: 2px; }
.dpill.up { color: oklch(0.93 0.15 150); } .dpill.dn { color: oklch(0.88 0.12 25); }
.hat { background-image: repeating-linear-gradient(135deg, oklch(1 0 0 / 0.32) 0 4px, transparent 4px 9px) !important; }
`;

const PAGE = String.raw`
/* ---- the stage's colour, per board ---- */
.stg2[data-b="e1"] { --h1: var(--card-indigo-from); --h2: var(--card-indigo-to); }
.stg2[data-b="e2"] { --h1: var(--card-teal-from); --h2: var(--card-teal-to); }
.stg2[data-b="e3"] { --h1: var(--card-sapphire-from); --h2: var(--card-sapphire-to); }
.stg2[data-b="e4"] { --h1: var(--card-onyx-from); --h2: var(--card-onyx-to); }
.ex-h { padding: 34px 40px 30px; }
.hp { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.ex-h .nwc { margin-top: 12px; }

/* ---- month chips ---- */
.mc { display: grid; grid-template-columns: repeat(12, 1fr); gap: 8px; }
.mc-i { position: relative; display: grid; justify-items: center; gap: 3px; padding: 10px 4px 9px; border-radius: 16px; background: oklch(1 0 0 / calc(0.07 + var(--sel, 0) * 0.9)); color: color-mix(in oklch, #fff calc(100% - var(--sel, 0) * 100%), var(--h2)); }
.mc-i:hover { background: oklch(1 0 0 / calc(0.14 + var(--sel, 0) * 0.83)); }
.mc-b { width: 16px; height: 34px; border-radius: 5px; background: oklch(1 0 0 / 0.14); display: flex; align-items: flex-end; overflow: hidden; } .mc-b i { display: block; width: 100%; border-radius: inherit; background: currentColor; opacity: 0.9; }
.mc-i b { font-size: 13px; font-weight: 800; } .mc-i small { font-size: 11px; font-weight: 700; opacity: 0.8; }
.mc-i em { position: absolute; top: 6px; right: 8px; color: oklch(0.88 0.15 85); }

/* ---- E1 split ---- */
.e1 { display: grid; gap: 26px; }
.sp { display: grid; gap: 8px; }
.sp-row { display: flex; gap: 6px; }
.sp-row > div, .sp-p { display: flex; flex-direction: column; justify-content: center; gap: 2px; min-width: 0; height: 64px; padding: 0 16px; border-radius: 16px; overflow: hidden; white-space: nowrap; }
.sp-row span, .sp-p span { font-size: 11.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.85; } .sp-row b, .sp-p b { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
.sp-in { background: oklch(1 0 0 / 0.92); color: var(--h2); }
.sp-sav { background: repeating-linear-gradient(135deg, oklch(0.85 0.12 25 / 0.5) 0 6px, transparent 6px 12px); border: 2px dashed oklch(0.88 0.12 25); color: oklch(0.93 0.08 25); }
.sp-spent { background: oklch(0.72 0.16 35); } .sp-inv { background: oklch(0.72 0.12 250); } .sp-lent { background: oklch(0.7 0.1 60); } .sp-kept { background: oklch(0.72 0.14 150); } .sp-s.tiny { min-width: 96px; }
.sp-fan { width: 100%; height: 26px; display: block; } .sp-fan path { fill: oklch(0.72 0.16 35 / 0.28); }
.sp-parts { display: flex; gap: 6px; } .sp-p { background: var(--pc); padding: 0 12px; } .sp-p b { font-size: 17px; }

/* ---- E2 bridge ---- */
.e2-top { display: grid; grid-template-columns: 1fr auto; gap: 40px; align-items: start; }
.e2-eq { display: grid; gap: 6px; padding: 18px 22px; border-radius: 20px; background: oklch(1 0 0 / 0.1); font-size: 14px; font-weight: 600; min-width: 300px; font-variant-numeric: tabular-nums; }
.e2-eq b { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.75; margin-bottom: 4px; } .e2-eq .eq { margin-top: 6px; padding-top: 8px; border-top: 1px solid oklch(1 0 0 / 0.25); font-size: 17px; font-weight: 800; }
.br { width: 100%; display: block; margin-top: 8px; }
.br-0 { stroke: oklch(1 0 0 / 0.35); } .br-k { stroke: oklch(1 0 0 / 0.4); stroke-dasharray: 3 4; }
.br-v { fill: #fff; font-size: 14px; font-weight: 800; text-anchor: middle; } .br-v.t { font-size: 15px; }
.br-n { fill: #fff; font-size: 12.5px; font-weight: 800; text-anchor: middle; } .br-s { fill: oklch(1 0 0 / 0.65); font-size: 11px; font-weight: 600; text-anchor: middle; }
.br-total rect { filter: drop-shadow(0 6px 14px oklch(0 0 0 / 0.25)); }
.br-br { fill: none; stroke: oklch(1 0 0 / 0.6); stroke-width: 1.5; } .br-bt { fill: #fff; font-size: 12px; font-weight: 800; text-anchor: middle; letter-spacing: 0.04em; text-transform: uppercase; }

/* ---- E3 year ---- */
.e3 { flex-direction: row; gap: 36px; align-items: stretch; }
.e3-l { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.e3-r { width: 380px; flex-shrink: 0; }
.yr { position: relative; } .yr svg { width: 100%; display: block; }
.yr-c { opacity: calc(0.45 + var(--sel, 0) * 0.55); transition: opacity 200ms; }
.yr-m { fill: #fff; font-size: 13px; font-weight: 800; text-anchor: middle; } .yr-v { fill: oklch(1 0 0 / 0.7); font-size: 11.5px; font-weight: 700; text-anchor: middle; }
.yr-a { stroke: oklch(1 0 0 / 0.7); stroke-dasharray: 5 6; stroke-width: 1.5; } .yr-at { fill: #fff; font-size: 12px; font-weight: 800; text-anchor: start; }
.yr-hit { position: absolute; top: 0; bottom: 0; border-radius: 14px; background: oklch(1 0 0 / calc(var(--sel, 0) * 0.08)); }
.yr-hit:hover { background: oklch(1 0 0 / 0.06); }
.yr-key { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; font-weight: 700; opacity: 0.9; } .yr-key span { display: inline-flex; align-items: center; gap: 6px; } .yr-key i { width: 10px; height: 10px; border-radius: 3px; }
.yr-p { display: flex; flex-direction: column; gap: 14px; height: 100%; padding: 24px; border-radius: 22px; background: oklch(1 0 0 / 0.1); }
.yr-p .nwc { font-size: 60px; } .yr-p .hp { margin-top: 4px; } .yr-p .dpill { font-size: 12.5px; padding: 6px 11px; }
.yr-l, .yr-b { display: grid; gap: 8px; } .yr-l div, .yr-b div { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; font-size: 13.5px; font-weight: 600; }
.yr-l i { width: 9px; height: 9px; border-radius: 50%; } .yr-l b, .yr-b b { font-weight: 800; font-variant-numeric: tabular-nums; }
.yr-b { padding-top: 12px; border-top: 1px solid oklch(1 0 0 / 0.2); } .yr-b small { display: block; font-size: 11px; opacity: 0.7; }
.yr-none { padding-top: 12px; border-top: 1px solid oklch(1 0 0 / 0.2); font-size: 13px; opacity: 0.8; line-height: 1.45; }
.yr-s { display: flex; gap: 16px; margin-top: auto; font-size: 12.5px; opacity: 0.85; } .yr-s b { font-weight: 800; }

/* ---- E4 receipt ---- */
.e4 { flex-direction: row; gap: 40px; align-items: flex-start; }
.e4-l { flex: 1; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.rc-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rc-tab { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; align-items: center; padding: 13px 16px; border-radius: 16px; background: oklch(1 0 0 / calc(0.07 + var(--sel, 0) * 0.88)); color: color-mix(in oklch, #fff calc(100% - var(--sel, 0) * 100%), var(--h2)); }
.rc-tab:hover { background: oklch(1 0 0 / calc(0.13 + var(--sel, 0) * 0.82)); }
.rc-tab span:first-child { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; } .rc-tab svg { color: oklch(0.8 0.15 80); }
.rc-tab small { font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; } .rc-tb { grid-column: 1 / -1; height: 5px; border-radius: 999px; background: oklch(1 0 0 / 0.14); overflow: hidden; } .rc-tb i { display: block; height: 100%; background: currentColor; opacity: 0.75; border-radius: inherit; }
.e4-r { width: 470px; flex-shrink: 0; }
.rc { position: relative; padding: 30px 30px 26px; background: oklch(0.985 0.008 90); color: oklch(0.25 0.01 80); font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 13px; box-shadow: 0 24px 50px oklch(0 0 0 / 0.35); transform: rotate(0.6deg); border-radius: 4px 4px 0 0; }
.rc::after { content: ""; position: absolute; left: 0; right: 0; bottom: -10px; height: 10px; background: linear-gradient(-45deg, transparent 7px, oklch(0.985 0.008 90) 0) 0 0 / 14px 10px repeat-x, linear-gradient(45deg, transparent 7px, oklch(0.985 0.008 90) 0) 0 0 / 14px 10px repeat-x; }
.rc-hd { display: grid; justify-items: center; gap: 3px; text-align: center; } .rc-hd b { font-size: 16px; letter-spacing: 0.08em; } .rc-hd span { font-size: 14px; font-weight: 700; letter-spacing: 0.12em; } .rc-hd small { font-size: 11px; opacity: 0.7; }
.rc-cut { margin: 14px 0; border-top: 2px dashed oklch(0.25 0.01 80 / 0.35); }
.rc-l { display: flex; justify-content: space-between; gap: 14px; padding: 4px 0; } .rc-l span { display: grid; } .rc-l small { font-size: 10.5px; opacity: 0.6; } .rc-l b { font-weight: 700; white-space: nowrap; }
.rc-big { padding-left: 16px; color: oklch(0.45 0.12 50); } .rc-big b { font-weight: 600; }
.rc-tot { font-size: 18px; font-weight: 800; } .rc-tot b { font-weight: 800; }
.rc-nt { font-size: 11px; letter-spacing: 0.14em; opacity: 0.6; margin-bottom: 4px; } .rc-not .rc-l { opacity: 0.8; } .rc-in { margin-top: 6px; padding-top: 8px; border-top: 1px solid oklch(0.25 0.01 80 / 0.2); font-weight: 800; }
.rc-bc { height: 38px; margin: 18px 30px 8px; background: repeating-linear-gradient(90deg, oklch(0.25 0.01 80) 0 2px, transparent 2px 4px, oklch(0.25 0.01 80) 4px 7px, transparent 7px 9px, oklch(0.25 0.01 80) 9px 10px, transparent 10px 14px); opacity: 0.8; }
.rc-ft { text-align: center; font-size: 11px; opacity: 0.65; }

/* ---- the shared row: Where the month went beside Big spends ---- */
.ex-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: stretch; }
.ww-t { font-size: 20px; font-weight: 800; }
.ww { display: grid; gap: 14px; }
.ww-r { display: grid; grid-template-columns: 210px 1fr 110px; gap: 6px 16px; align-items: center; }
.ww-n { display: grid; grid-template-columns: auto 1fr; gap: 0 9px; align-items: center; } .ww-n i { width: 10px; height: 10px; border-radius: 3px; grid-row: span 2; } .ww-n b { font-size: 14px; font-weight: 800; } .ww-n small { font-size: 11.5px; color: var(--muted); font-weight: 600; }
.ww-bar { height: 16px; border-radius: 999px; background: var(--fill); overflow: hidden; } .ww-bar span { position: relative; display: block; height: 100%; border-radius: inherit; min-width: 4px; } .ww-bar em { position: absolute; right: 0; top: 0; bottom: 0; background: oklch(1 0 0 / 0.5); border-left: 2px solid #fff; }
.ww-v { text-align: right; font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; } .ww-v small { display: block; font-size: 11px; color: var(--muted); font-weight: 700; }
.ww-b { grid-column: 2 / -1; display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; font-weight: 600; color: var(--muted); margin-top: -2px; } .ww-b span { margin-left: -8px; } .ww-b b { color: var(--fg); }
.ww-u { display: grid; gap: 10px; margin-top: auto; } .ww-u-h { font-size: 12px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); } .ww-u-h small { text-transform: none; letter-spacing: 0; font-weight: 600; margin-left: 6px; }
.ww-u-g { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; } .ww-u-i { display: grid; gap: 3px; padding: 11px 12px; border-radius: 14px; background: var(--fill); } .ww-u-i span { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; color: var(--muted); } .ww-u-i i { width: 7px; height: 7px; border-radius: 50%; } .ww-u-i b { font-size: 16px; font-weight: 800; } .ww-u-i small { font-size: 11px; font-weight: 700; color: var(--muted); } .ww-u-i small.dn { color: var(--loss); } .ww-u-i small.up { color: var(--gain); }
.ww-f { padding-top: 12px; border-top: 1px solid var(--divider); font-size: 12px; color: var(--muted); font-weight: 500; line-height: 1.5; }
.ww-card > .vw-m { flex: 1; flex-direction: column; gap: 18px; }
.ci { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; color: #fff; background: linear-gradient(155deg, color-mix(in oklch, var(--cc) 80%, white), var(--cc)); }
.ww-b .ci, .mt-mo .ci { width: 20px; height: 20px; border-radius: 6px; } .yr-b .ci { width: 26px; height: 26px; border-radius: 8px; }
.bs-strip { display: flex; gap: 3px; height: 12px; border-radius: 999px; overflow: hidden; } .bs-strip span { display: block; }
.bs-key { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; font-weight: 600; color: var(--muted); } .bs-key span { display: inline-flex; align-items: center; gap: 6px; } .bs-key i { width: 8px; height: 8px; border-radius: 50%; } .bs-key b { color: var(--fg); font-weight: 800; }
.bs { display: grid; } .bs-more { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; margin-top: auto; border-top: 1px solid var(--divider); font-size: 12.5px; font-weight: 700; color: var(--muted); } .bs-more b { color: var(--accent-text); }
.bs-r { display: grid; grid-template-columns: auto 1fr auto 100px; gap: 14px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--divider); } .bs-r:last-child { border-bottom: 0; }
.bs-t b { display: block; font-size: 14px; font-weight: 800; } .bs-t small { font-size: 11.5px; color: var(--muted); font-weight: 600; }
.bs-mo { font-size: 11.5px; font-weight: 700; color: var(--muted); } .bs-v { text-align: right; font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
.bs-r.pend { opacity: 0.75; } .bs-r.pend .ci { outline: 2px dashed var(--warning); outline-offset: 2px; }
${MKEYS.map((k) => `.chai-app:has(#m-${k}:checked) .bs-r[data-m="${k}"] { background: var(--accent-tint); margin: 0 -12px; padding: 10px 12px; border-radius: 14px; border-color: transparent; }`).join("\n")}

/* ---- the months table ---- */
.mt { display: grid; }
.mt-r { display: grid; grid-template-columns: 1.6fr repeat(9, 1fr); gap: 12px; align-items: center; padding: 11px 12px; border-bottom: 1px solid var(--divider); font-size: 13.5px; font-weight: 600; font-variant-numeric: tabular-nums; border-radius: 12px; }
.mt-h { font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); } .mt-h .wk { margin-left: 0; margin-top: 3px; }
label.mt-r { background: oklch(0.6 0.12 270 / calc(var(--sel, 0) * 0.1)); } label.mt-r:hover { background: var(--fill); }
.mt-mo b { display: block; font-weight: 800; } .mt-mo small { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--muted); font-weight: 600; margin-top: 3px; }
.mt-f { font-weight: 800; border-bottom: 0; background: var(--fill); }
.wk { display: inline-flex; align-items: center; gap: 4px; margin-left: 6px; padding: 2px 7px; border-radius: 999px; background: var(--fill); font-size: 9.5px; font-weight: 800; letter-spacing: 0.02em; text-transform: none; color: var(--muted); white-space: nowrap; }
`;

export const EX = SHARED + PAGE + pick("m", MKEYS);
