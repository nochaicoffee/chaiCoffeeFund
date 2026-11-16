// Styles for the Overview "Month by month" boards: the app's base tokens (the Overview generator's css-base.mjs) plus these.
// Every measure keeps one hue (--H) and gets its own five shades from it, the way the app's heatmap shades one green.
import { CSS as BASE, FONT_LINK } from "../../overview/generator/css-base.mjs";
export { FONT_LINK };

const MO = String.raw`
.mo { padding: 28px 32px 40px; display: flex; flex-direction: column; gap: 18px; }
.mo .cap { display: flex; align-items: baseline; gap: 14px; padding: 0 4px; }
.mo .cap b { font-size: 15px; font-weight: 800; } .mo .cap span { color: var(--muted); font-size: 13px; font-weight: 600; }
.mo .sec-h { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 8px 24px; padding: 0 4px; }
.mo .sec-h .eyebrow { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.mo .sec-h h2 { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; margin-top: 2px; }
.mo .sec-h .sub { color: var(--muted); font-size: 12.5px; font-weight: 600; }
.mo .mleg { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--muted); }
.mo .mleg i { display: inline-block; width: 12px; height: 12px; border-radius: 4px; }
.mo .mleg .st { background: repeating-linear-gradient(135deg, var(--fill-strong) 0 2px, transparent 2px 4px); }
.mo .mleg .sh { margin-left: 8px; }

/* one hue per measure, five shades each */
.m-inc { --H: 150; --g1: var(--card-emerald-from); --g2: var(--card-emerald-to); }
.m-inv { --H: 258; --g1: var(--card-sapphire-from); --g2: var(--card-sapphire-to); }
.m-emi { --H: 200; --g1: var(--card-teal-from); --g2: var(--card-teal-to); }
.m-card { --H: 22; --g1: var(--card-ruby-from); --g2: var(--card-ruby-to); }
.m-cash { --H: 50; --g1: var(--card-copper-from); --g2: var(--card-copper-to); }
.mo [class*="m-"] { --s1: oklch(0.95 0.03 var(--H)); --s2: oklch(0.87 0.07 var(--H)); --s3: oklch(0.76 0.11 var(--H)); --s4: oklch(0.6 0.12 var(--H)); --s5: oklch(0.42 0.1 var(--H)); --ink: oklch(0.24 0.05 var(--H)); --pill: oklch(0.93 0.05 var(--H)); --pill-ink: oklch(0.38 0.1 var(--H)); }

.mo .icn { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; background: linear-gradient(145deg, var(--g1), var(--g2)); color: oklch(0.97 0.01 var(--H)); flex-shrink: 0; }
.mo .icn svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
.mo .icn.sm { width: 28px; height: 28px; border-radius: 9px; } .mo .icn.sm svg { width: 14px; height: 14px; }
.mo .nm { font-size: 14px; font-weight: 800; line-height: 1.15; } .mo .nm small { display: block; margin-top: 2px; font-size: 11px; font-weight: 600; color: var(--muted); }
.mo .go { margin-left: auto; font-size: 11px; font-weight: 700; color: var(--muted); display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.mo .go::after { content: "→"; } .mo .go.ar { font-size: 15px; color: var(--fg); opacity: 0.45; }

/* the heatmap cell (the app's Cell: shade, rings, caption) */
.mh { position: relative; height: 52px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; background: var(--s1); color: var(--ink); isolation: isolate; cursor: default; transition: translate 0.2s var(--ease-out), box-shadow 0.2s; }
.mh .rg { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; z-index: -1; background: repeating-radial-gradient(circle at 100% 100%, transparent 0 10px, oklch(0.42 0.1 var(--H) / 0.11) 10px 11px), radial-gradient(circle at 90% 8%, oklch(1 0 0 / 0.26), transparent 58%); }
.mh.l1 { background: var(--s1); } .mh.l2 { background: var(--s2); } .mh.l3 { background: var(--s3); }
.mh.l4 { background: var(--s4); color: var(--on-accent); } .mh.l5 { background: var(--s5); color: var(--on-accent); }
.mh.l4 .rg, .mh.l5 .rg { background: repeating-radial-gradient(circle at 100% 100%, transparent 0 10px, oklch(1 0 0 / 0.1) 10px 11px), radial-gradient(circle at 90% 8%, oklch(1 0 0 / 0.2), transparent 58%); }
.mh i { font-style: normal; font-size: 9px; font-weight: 700; opacity: 0.85; margin-top: 1px; }
.mh.now { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent); }
.mh.none { background: repeating-linear-gradient(135deg, var(--heat-no-data) 0 5px, transparent 5px 11px); color: var(--muted); font-weight: 600; font-size: 12px; }
.mh.none .rg, .mh.out .rg, .mh.up .rg { display: none; }
.mh.up { background: transparent; border: 1.5px dashed var(--heat-upcoming); } .mh.out { background: transparent; }
.mh.sm { height: 30px; border-radius: 7px; }
.mh:not(.none):not(.out):not(.up):hover { translate: 0 -3px; box-shadow: var(--soft-shadow); z-index: 4; }
.mh[data-tip]::after, .bar[data-tip]::after { content: attr(data-tip); position: absolute; bottom: calc(100% + 9px); left: 50%; transform: translateX(-50%); white-space: pre; text-align: left; background: var(--surface); color: var(--fg); border: 1px solid var(--surface-line); box-shadow: var(--pop-shadow); border-radius: 12px; padding: 8px 11px; font-size: 11px; font-weight: 600; line-height: 1.45; opacity: 0; pointer-events: none; transition: opacity 0.15s; z-index: 20; }
.mh[data-tip]:hover::after, .bar[data-tip]:hover::after { opacity: 1; }

.b-grid > div > .mc, .d-grid > div > .mc, .e-grid > div > .mc { height: 100%; }
.mo .mc { background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--soft-shadow); border-radius: 24px; padding: 18px 22px; }
.mo .delta { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.mo .delta.good { background: oklch(0.94 0.06 150); color: oklch(0.38 0.12 150); } .mo .delta.bad { background: var(--negative-tint); color: oklch(0.45 0.14 25); } .mo .delta.flat { background: var(--fill); color: var(--muted); }
.mo .big { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
.mo .big small { font-size: 12px; font-weight: 700; color: var(--muted); letter-spacing: 0; margin-left: 4px; }
.mo .mfoot { font-size: 11.5px; font-weight: 600; color: var(--muted); } .mo .mfoot b { color: var(--fg); font-weight: 800; }

/* A · five heatmaps */
.a-head, .a-row { display: grid; grid-template-columns: 210px repeat(12, minmax(0, 1fr)) 156px; gap: 6px; align-items: center; }
.a-head { padding: 0 23px; margin-bottom: -6px; }
.a-head span { text-align: center; font-size: 10px; font-weight: 800; letter-spacing: 0.02em; text-transform: uppercase; color: var(--muted); }
.a-head span.now { color: var(--fg); } .a-head span.now::after { content: ""; display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--accent); margin-left: 4px; vertical-align: middle; }
.a-head span:last-child { text-align: right; }
.a-row.mc { padding: 14px 22px; } .a-row .lh { display: flex; align-items: center; gap: 10px; }
.a-row .tot { text-align: right; line-height: 1.2; } .a-row .tot b { display: block; font-size: 15px; font-weight: 800; } .a-row .tot span { font-size: 10px; font-weight: 600; color: var(--muted); }
.a-stack { display: flex; flex-direction: column; gap: 12px; }

/* B · five tiles with a strip */
.b-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
.b-tile { display: flex; flex-direction: column; gap: 12px; padding: 18px 20px 16px; }
.b-tile .top { display: flex; align-items: center; gap: 10px; }
.b-tile .fig { display: flex; flex-direction: column; gap: 8px; }
.b-tile .mon { font-size: 11px; font-weight: 700; color: var(--muted); }
.strip { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 3px; }
.strip.big .mh { height: 34px; }
.strip-m { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 3px; margin-top: -6px; }
.strip-m span { text-align: center; font-size: 8.5px; font-weight: 800; color: var(--muted); text-transform: uppercase; } .strip-m span.now { color: var(--fg); }
.mh.mini { height: 30px; border-radius: 6px; } .mh.mini .rg { background: radial-gradient(circle at 90% 8%, oklch(1 0 0 / 0.26), transparent 58%); }

/* C · one heatmap, five tabs */
.c-tabs { display: flex; gap: 10px; } .c-tabs input, .e-chips input, .c-panel { }
.mo input[type=radio] { position: absolute; opacity: 0; pointer-events: none; }
.c-tab { flex: 1; display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 20px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--soft-shadow); cursor: pointer; transition: all 0.25s var(--ease-out); }
.c-tab .v { margin-left: auto; text-align: right; font-size: 15px; font-weight: 800; line-height: 1.1; } .c-tab .v small { display: block; font-size: 10px; font-weight: 700; color: var(--muted); }
.c-tab .nm small { display: none; }
.c-panel { display: none; }
.c-grid { display: grid; grid-template-columns: 56px repeat(12, minmax(0, 1fr)) 170px; gap: 6px; align-items: center; }
.c-grid .yr { font-size: 12px; font-weight: 800; } .c-grid .hdr { text-align: center; font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--muted); }
.c-grid .tot { text-align: right; line-height: 1.2; } .c-grid .tot b { display: block; font-size: 14px; font-weight: 800; } .c-grid .tot span { font-size: 10px; font-weight: 600; color: var(--muted); }
.c-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)) auto; gap: 14px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--divider); align-items: center; }
.c-stats div b { display: block; font-size: 17px; font-weight: 800; } .c-stats div span { font-size: 11px; font-weight: 600; color: var(--muted); }

/* D · bar cards */
.d-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; } .d-grid .mc { grid-column: span 2; } .d-grid .mc.w { grid-column: span 3; }
.d-card { display: flex; flex-direction: column; gap: 14px; }
.d-card .hd { display: flex; align-items: center; gap: 10px; }
.d-card .hd .t { margin-left: auto; text-align: right; line-height: 1.15; } .d-card .hd .t b { display: block; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; } .d-card .hd .t span { font-size: 10.5px; font-weight: 700; color: var(--muted); }
.bars { position: relative; height: 128px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px; align-items: end; border-bottom: 1px solid var(--divider); }
.bar { position: relative; border-radius: 8px 8px 3px 3px; background: var(--s3); min-height: 5px; transition: filter 0.2s; }
.bar.pk { background: var(--s5); } .bar.nw { background: var(--s4); box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent); }
.bar.none { background: repeating-linear-gradient(135deg, var(--fill-strong) 0 3px, transparent 3px 6px); height: 6px !important; }
.bar:hover { filter: brightness(1.07); }
.bar .blab { position: absolute; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: 800; white-space: nowrap; color: var(--fg); }
.avg { position: absolute; left: 0; right: 0; border-top: 1.5px dashed oklch(0.3 0.03 var(--H) / 0.5); pointer-events: none; }
.bars-m { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px; margin-top: -8px; }
.bars-m span { text-align: center; font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: var(--muted); } .bars-m span.now { color: var(--fg); }

/* E · pick a month */
.e-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.e-chips label { padding: 8px 15px; border-radius: 999px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--soft-shadow); font-size: 12px; font-weight: 800; cursor: pointer; color: var(--muted); transition: all 0.2s; }
.e-chips label:hover { color: var(--fg); }
.e-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
.e-card { display: flex; flex-direction: column; gap: 14px; padding: 18px 20px 16px; }
.e-card .v { display: none; flex-direction: column; gap: 10px; }
.e-card .rank { font-size: 11.5px; font-weight: 600; color: var(--muted); } .e-card .rank b { color: var(--fg); font-weight: 800; }
.e-bars { position: relative; height: 70px; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 3px; align-items: end; border-bottom: 1px solid var(--divider); }
.e-bars .bar { background: var(--s2); border-radius: 4px 4px 2px 2px; min-height: 4px; } .e-bars .bar.none { height: 5px !important; }
.e-bars .bar::after { display: none; }

/* the page around it (board X) */
.ghost { border-radius: 24px; background: var(--fill); border: 1.5px dashed var(--fill-strong); display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 12px; font-weight: 700; }
.ghost.stage { background: linear-gradient(135deg, oklch(0.4 0.1 280), oklch(0.26 0.08 275)); border: 0; color: oklch(1 0 0 / 0.55); }
.ghost.tile { border-radius: 20px; }
.slot { position: relative; margin-top: 30px; border-radius: 28px; outline: 2px dashed var(--accent); outline-offset: 10px; }
.slot-tag { position: absolute; top: -34px; left: 6px; font-size: 11px; font-weight: 800; background: var(--accent); color: var(--on-accent); padding: 3px 10px; border-radius: 999px; z-index: 5; }
`;


const MO2 = String.raw`
.mh.h40 { height: 40px; border-radius: 10px; font-size: 10.5px; } .mh.h46 { height: 46px; border-radius: 11px; } .mh.h16 { height: 17px; border-radius: 5px; }
.mh.h16 .rg { background: radial-gradient(circle at 90% 8%, oklch(1 0 0 / 0.26), transparent 58%); }
.seg { display: inline-flex; padding: 3px; gap: 2px; border-radius: 999px; background: var(--fill); }
.seg label { padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 800; color: var(--muted); cursor: pointer; transition: all 0.2s; } .seg label.off { opacity: 0.55; cursor: default; }
.rangechip { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 999px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--soft-shadow); font-size: 12px; font-weight: 800; } .rangechip small { color: var(--muted); font-weight: 600; } .rangechip::after { content: "▾"; color: var(--muted); }
.y-head { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 6px; padding: 0 23px; margin-bottom: -6px; }
.y-inner { display: grid; grid-template-columns: 38px repeat(12, minmax(0, 1fr)) 156px; gap: 6px; align-items: center; }
.y-head .y-inner span { text-align: center; font-size: 10px; font-weight: 800; letter-spacing: 0.02em; text-transform: uppercase; color: var(--muted); } .y-head .y-inner span:last-child { text-align: right; }
.y-card { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 6px; align-items: center; padding: 14px 22px; }
.y-rows { display: flex; flex-direction: column; gap: 6px; }
.y-inner .yl { font-size: 11px; font-weight: 800; color: var(--muted); }
.y-inner .tot { text-align: right; line-height: 1.2; } .y-inner .tot b { display: block; font-size: 13px; font-weight: 800; } .y-inner .tot span { font-size: 10px; font-weight: 600; color: var(--muted); }
.y-stack { display: flex; flex-direction: column; gap: 12px; }
.mo .yr-r12, .mo .yr-r24, .mo .yr-r36 { display: none; }
.yrow { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 6px; align-items: center; } .yrow > span { font-size: 9px; font-weight: 800; color: var(--muted); }
.yrow .strip { gap: 2px; } .yrows { display: flex; flex-direction: column; gap: 3px; }
.yoy { display: flex; gap: 10px; flex-wrap: wrap; }
.yoy div { background: var(--fill); border-radius: 14px; padding: 8px 14px; line-height: 1.2; } .yoy b { display: block; font-size: 15px; font-weight: 800; } .yoy span { font-size: 10.5px; font-weight: 700; color: var(--muted); } .yoy em { font-style: normal; font-size: 10.5px; font-weight: 800; margin-left: 6px; }
.yoy em.good { color: oklch(0.38 0.12 150); } .yoy em.bad { color: oklch(0.45 0.14 25); } .yoy em.flat { color: var(--muted); }
.long-bars { position: relative; height: 128px; display: grid; grid-template-columns: repeat(36, minmax(0, 1fr)); gap: 2px; align-items: end; border-bottom: 1px solid var(--divider); }
.long-bars .bar { border-radius: 4px 4px 2px 2px; } .long-bars .bar .blab { font-size: 9.5px; }
.yavg { position: absolute; border-top: 1.5px dashed oklch(0.3 0.03 var(--H) / 0.55); pointer-events: none; }
.ylabels { display: grid; grid-template-columns: repeat(36, minmax(0, 1fr)); gap: 2px; margin-top: -8px; } .ylabels span { text-align: center; font-size: 10px; font-weight: 800; color: var(--muted); border-left: 1px solid var(--divider); padding-top: 3px; overflow: hidden; white-space: nowrap; }
.mfoot em { font-style: normal; }
`;

/** Rules that switch a tab or a month without script: a hidden radio, and :has() on the board. Built from the boards' own lists. */
export function pickCss({ tabs, months }) {
  let css = "";
  for (const t of tabs) css += `.mo-c:has(#c-${t.k}:checked) .c-panel.p-${t.k} { display: block; } .mo-c:has(#c-${t.k}:checked) .c-tab.t-${t.k} { background: linear-gradient(145deg, var(--g1), var(--g2)); border-color: transparent; color: oklch(0.97 0.01 var(--H)); box-shadow: 0 10px 22px oklch(0.2 0.06 var(--H) / 0.35); } .mo-c:has(#c-${t.k}:checked) .c-tab.t-${t.k} .icn { background: oklch(1 0 0 / 0.18); } .mo-c:has(#c-${t.k}:checked) .c-tab.t-${t.k} .v small { color: oklch(1 0 0 / 0.65); }\n`;
  for (const r of ["12", "24", "36"]) css += `.mo-y:has(#y-${r}:checked) .yr-r${r} { display: flex; } .mo-y:has(#y-${r}:checked) label[for=y-${r}] { background: oklch(0.2 0.01 260); color: var(--on-ink); }\n`;
  for (const k of months) css += `.mo-e:has(#e-${k}:checked) .v-${k} { display: flex; } .mo-e:has(#e-${k}:checked) label[for=e-${k}] { background: var(--ink-chip, oklch(0.2 0.01 260)); color: var(--on-ink); border-color: transparent; } .mo-e:has(#e-${k}:checked) .e-bars .b-${k} { background: var(--s5); box-shadow: 0 0 0 2px var(--surface), 0 0 0 3.5px var(--s4); } .mo-e:has(#e-${k}:checked) .strip .s-${k} { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent); }\n`;
  return css;
}

// Round 3 (the mix): the dashboard's range decides between "all five together" and "one at a time, on tabs".
const MO3 = String.raw`
.pz { display: none; flex-direction: column; gap: 12px; }
.z-chips { display: flex; gap: 10px; } .z-chips .c-tab { cursor: default; pointer-events: none; }
.z-hint { font-size: 12.5px; font-weight: 600; color: var(--muted); padding: 0 4px; display: flex; align-items: center; gap: 8px; }
.z-hint .h-tabs { display: none; } .z-hint b { color: var(--fg); font-weight: 800; }
.z-hint .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
.z-page { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; } .z-page .lbl { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.mo-z .seg label[for^="r-"] { cursor: pointer; }
`;

import { MO3B } from "./cssz.mjs";
export const CSS = BASE + MO + MO2 + MO3 + MO3B;
