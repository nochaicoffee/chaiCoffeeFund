// One stylesheet for every Goals artboard: the shared base (css-base.mjs) plus the pieces copied from Income/Loans that Goals reuses, then Goals' own.
import { CSS as BASE, FONT_LINK } from "./css-base.mjs";
export { FONT_LINK };

const SHARED = String.raw`
/* ===================== Shared with Income ===================== */
.pill-late { background: var(--warning-tint); color: var(--warning-text); }
.pill-derived { background: oklch(0.94 0.03 258); color: oklch(0.42 0.1 258); }
.minibank { width: 18px; height: 18px; border-radius: 6px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; color: var(--on-card); font-size: 9.5px; font-weight: 800; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.2); }
.pk-in { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
label.pk, label.sx { cursor: pointer; }
.lede .pt { position: relative; display: inline-block; }
.lede .pt > b { cursor: help; border-bottom: 1.5px dotted var(--accent-text); padding-bottom: 1px; transition: background 160ms; border-radius: 4px; }
.lede .pt:hover > b, .lede .pt:focus-visible > b { background: var(--accent-tint); }
.lede .hc-wrap { font-weight: 500; font-size: 13px; line-height: 1.4; color: var(--fg); }
.lede .warn-b { color: var(--warning-text); }

/* Ring texture on marks (the app's RingTexture, as CSS) */
.rt { position: relative; overflow: hidden; }
.rt::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: repeating-radial-gradient(circle at calc(100% + 10px) calc(100% + 18px), oklch(1 0 0 / 0.26) 0 1px, transparent 1px 15px); }
.rt.rt-dark::after { background: repeating-radial-gradient(circle at calc(100% + 10px) calc(100% + 18px), oklch(0 0 0 / 0.14) 0 1px, transparent 1px 15px); }

/* Hero furniture shared by the four variations */
.hero { position: relative; isolation: isolate; border-radius: 28px; overflow: hidden; }
.hk { font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); }
.hbig { font-size: 64px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.02; }
.hbig small { font-size: 28px; font-weight: 700; letter-spacing: -0.01em; margin-right: 2px; opacity: 0.8; }
.hsub { font-size: 13px; font-weight: 600; color: var(--muted); }
.hfig { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.hfig .k { font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
.hfig .v { font-size: 20px; font-weight: 800; white-space: nowrap; letter-spacing: -0.01em; }
.hfig .s { font-size: 12px; font-weight: 600; color: var(--muted); white-space: nowrap; }
.hfig .v.warn { color: var(--warning-text); }
.delta { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; background: oklch(1 0 0 / 0.6); color: var(--positive); }

/* Payday river (I1) */
.river { display: grid; grid-template-columns: 150px 1fr 96px; align-items: stretch; }
.river .ax { grid-column: 2; position: relative; height: 38px; }
.river .ax span { position: absolute; top: 20px; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); }
.river .ax span.now { color: var(--fg); }
.lane { display: contents; }
.lane > * { transition: opacity 240ms; }
.lane .ll { display: flex; align-items: center; gap: 10px; height: var(--lh, 54px); cursor: pointer; border-radius: 14px; padding-right: 6px; }
.lane .ll b { font-size: 13px; font-weight: 800; display: block; line-height: 1.2; }
.lane .ll small { font-size: 11px; font-weight: 600; color: var(--muted); display: block; }
.lane .lp { position: relative; height: var(--lh, 54px); }
.lane .lp::before { content: ""; position: absolute; left: 0; width: var(--now, 81%); top: var(--ly, 50%); height: 0; border-top: 1.5px solid var(--lane, var(--muted)); opacity: 0.3; }
.lane .lp::after { content: ""; position: absolute; left: var(--now, 81%); right: 0; top: var(--ly, 50%); height: 0; border-top: 1.5px dashed var(--lane, var(--muted)); opacity: 0.5; }
.lane .lt { display: flex; align-items: center; justify-content: flex-end; font-size: 13px; font-weight: 800; height: var(--lh, 54px); }
.bead { position: absolute; border-radius: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center; color: var(--on-card); font-size: 9.5px; font-weight: 800; box-shadow: 0 2px 6px oklch(0.3 0.09 155 / 0.28), inset 0 1px 0 oklch(1 0 0 / 0.28); }
.bead.late { box-shadow: 0 0 0 2px var(--surface), 0 0 0 3.5px oklch(0.72 0.14 75), 0 2px 6px oklch(0.3 0.09 155 / 0.28); }
.bead.pend { background: var(--warning-tint) !important; border: 2px dashed oklch(0.72 0.14 75); color: var(--warning-text); box-shadow: none; animation: due-pulse 2.2s ease-in-out infinite; }
.bead.soon { background: oklch(1 0 0 / 0.5) !important; border: 1.5px dashed var(--lane); color: var(--fg); box-shadow: none; }
.bead-l { position: absolute; transform: translate(0, -50%); font-size: 11px; font-weight: 800; white-space: nowrap; color: var(--fg); pointer-events: none; }
.bead-l.soon { color: var(--muted); font-weight: 700; }
.bead-wrap { position: absolute; top: 50%; left: 0; width: 0; height: 0; }
.bead-wrap.hov > .hc-wrap { left: 50%; margin-left: -125px; bottom: calc(100% + 20px); }
.todayline { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1.5px solid var(--ink); z-index: 4; pointer-events: none; }
.todaytag { position: absolute; top: -2px; transform: translateX(-50%); z-index: 5; padding: 3px 9px; border-radius: 999px; background: var(--ink); color: var(--on-ink); font-size: 10px; font-weight: 800; white-space: nowrap; letter-spacing: 0.02em; }
@keyframes due-pulse { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 0 5px oklch(0.72 0.14 75 / 0.25); } }

/* Month columns (stacked bars) */
.mb { display: flex; align-items: flex-end; gap: 14px; position: relative; padding-left: 40px; }
.mcol { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-end; position: relative; }
.mstack { display: flex; flex-direction: column-reverse; gap: 2px; justify-content: flex-start; }
.mseg { border-radius: 4px; min-height: 3px; transition: opacity 260ms, filter 260ms; }
.mseg:last-child { border-top-left-radius: 9px; border-top-right-radius: 9px; }
.mseg.ghost { border: 1.5px dashed var(--c); background: color-mix(in oklch, var(--c) 12%, transparent); }
.mseg.pend { background: repeating-linear-gradient(135deg, oklch(0.9 0.08 85) 0 5px, oklch(0.96 0.04 85) 5px 10px); border: 1.5px dashed oklch(0.72 0.14 75); }
.mval { text-align: center; font-size: 11px; font-weight: 800; padding-bottom: 6px; white-space: nowrap; }
.mval.muted { color: var(--muted); font-weight: 700; }
.mlab { text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); padding-top: 9px; }
.mlab.now { color: var(--fg); }
.mcol.nowcol .mstack { filter: drop-shadow(0 0 0 transparent); }
.mcol.nowcol::before { content: ""; position: absolute; left: -7px; right: -7px; top: -4px; bottom: -6px; border-radius: 14px; background: var(--fill); z-index: -1; }
.mline { position: absolute; left: 0; right: 0; border-top: 1.5px dashed oklch(0.45 0.1 152 / 0.55); pointer-events: none; z-index: 3; }
.mline span { position: absolute; right: 0; top: -22px; font-size: 11px; font-weight: 800; color: var(--positive); background: var(--surface); padding: 1px 8px; border-radius: 999px; border: 1px solid var(--surface-line); }
.mgrid { position: absolute; left: 0; right: 0; z-index: 0; border-top: 1px dashed var(--divider); pointer-events: none; }
.mgrid span { position: absolute; left: 0; top: -17px; font-size: 10px; font-weight: 700; color: var(--muted); }
.mcol.hov > .hc-wrap { bottom: auto; top: 0; }

/* Source rows */
.srow { display: grid; align-items: center; gap: 16px; padding: 13px 0; border-bottom: 1px solid var(--divider); }
.srow:last-child { border-bottom: 0; }
.srow.off { opacity: 0.55; }
.spark { display: flex; align-items: flex-end; gap: 3px; height: 28px; }
.spark i { flex: 1; min-width: 4px; border-radius: 2px; background: var(--c); min-height: 2px; }
.spark i.z { background: var(--fill-strong); height: 2px !important; }
.spark i.f { background: transparent; border: 1px dashed var(--c); opacity: 0.6; }

/* Coming up rows */
.cu { display: grid; grid-template-columns: 46px 1fr auto; gap: 14px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--divider); }
.cu:last-of-type { border-bottom: 0; }
.cu .dd { width: 46px; border-radius: 12px; padding: 5px 0; background: var(--fill); text-align: center; line-height: 1.1; }
.cu .dd b { display: block; font-size: 17px; font-weight: 800; }
.cu .dd span { font-size: 10px; font-weight: 800; color: var(--muted); letter-spacing: 0.05em; }
.cu .dd.late { background: var(--warning-tint); } .cu .dd.late span { color: var(--warning-text); }
.cu .tt { font-size: 13.5px; font-weight: 700; } .cu .ss { font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.cu .amt { font-size: 15px; font-weight: 800; color: var(--positive); text-align: right; }
.cu .amt small { display: block; font-size: 11px; font-weight: 700; color: var(--muted); }

/* Bars with ring texture */
.hbar { height: 10px; border-radius: 999px; background: var(--fill); overflow: hidden; }
.hbar > span { display: block; height: 100%; border-radius: inherit; }

/* Legend dots */
.lg { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--muted); }
.lg i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.lg i.dash { border: 1.5px dashed var(--muted); background: transparent; }
.lg i.hat { background: repeating-linear-gradient(135deg, oklch(0.9 0.08 85) 0 3px, oklch(0.96 0.04 85) 3px 6px); border: 1px dashed oklch(0.72 0.14 75); }

/* Round 3 visuals: pickable blocks, tiles and bubbles keep their hover cards (the ring texture needs no clipping) */
.pickable.rt { overflow: visible !important; }
.bt { position: relative; isolation: isolate; display: flex; flex-direction: column; padding: 16px; border-radius: 22px; color: var(--on-card); min-width: 0; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.22); }
.dt-pill { display: inline-flex; align-items: center; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: oklch(1 0 0 / 0.18); white-space: nowrap; color: var(--on-card); }
/* Dark stage for the wheel (I3) */
.stage-deep { background: linear-gradient(155deg, var(--card-emerald-from), var(--card-emerald-to)); color: var(--on-card); --fg: oklch(0.97 0.004 260); --muted: oklch(1 0 0 / 0.62); --divider: oklch(1 0 0 / 0.14); --fill: oklch(1 0 0 / 0.1); --fill-strong: oklch(1 0 0 / 0.2); --surface: oklch(0.22 0.04 160); --surface-line: oklch(1 0 0 / 0.14); --accent-text: var(--on-card-lime); --accent-tint: oklch(1 0 0 / 0.14); }
.stage-deep .btn-primary { background: var(--on-card-lime); color: var(--ink); }
.stage-deep .btn-ghost { background: oklch(1 0 0 / 0.14); color: var(--fg); border-color: transparent; box-shadow: none; }
.stage-deep .hc { --fg: oklch(0.19 0.008 260); --muted: oklch(0.52 0.012 260); --divider: oklch(0 0 0 / 0.08); }
.stage-deep .hc * { color: inherit; }
.stage-deep .hc .h, .stage-deep .hc .d, .stage-deep .hc li .nm, .stage-deep .hc .f { color: var(--muted); }
.stage-deep .pill-on { background: oklch(0.88 0.12 145 / 0.22); color: var(--on-card-lime); }
.stage-deep .pill-late { background: oklch(0.85 0.12 85 / 0.25); color: oklch(0.94 0.09 88); }
.stage-deep .pill-due { background: oklch(0.7 0.14 35 / 0.45); color: oklch(0.97 0.04 60); }
.mchip { display: inline-flex; flex-direction: column; align-items: center; gap: 4px; padding: 7px 0; width: 54px; border-radius: 14px; font-size: 11px; font-weight: 800; letter-spacing: 0.03em; color: var(--muted); cursor: pointer; transition: background 160ms, color 160ms; text-transform: uppercase; }
.mchip i { width: 20px; height: 4px; border-radius: 2px; background: currentColor; opacity: 0.35; }
.mchip:hover { background: var(--fill); }
.mpane { display: none; }
.pbar { height: 8px; border-radius: 999px; background: var(--fill); overflow: hidden; }

/* Entries ledger */
.erow { display: grid; align-items: center; gap: 14px; padding: 11px 0; border-bottom: 1px solid var(--divider); }
.erow:last-child { border-bottom: 0; }
.erow .dim { color: var(--muted); font-weight: 600; }
.tag { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 800; background: var(--fill); color: var(--muted); }
.tag.bonus { background: oklch(0.94 0.04 300); color: oklch(0.42 0.12 300); }
.tag.other { background: var(--fill); color: var(--muted); }
.toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.search { height: 40px; min-width: 250px; border-radius: 999px; background: var(--fill); display: flex; align-items: center; gap: 8px; padding: 0 16px; font-size: 13px; font-weight: 600; color: var(--muted); }
.pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 6px; font-size: 12px; font-weight: 600; color: var(--muted); }
.pager .pgb { display: inline-flex; align-items: center; gap: 8px; }
.pager .pgb i { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--surface-line); display: flex; align-items: center; justify-content: center; background: var(--surface); color: var(--fg); font-style: normal; box-shadow: var(--soft-shadow); }
.mgrp { display: flex; align-items: center; justify-content: space-between; padding: 16px 0 8px; border-bottom: 1px solid var(--divider); font-size: 13px; font-weight: 800; }
.mgrp span { font-size: 12px; font-weight: 600; color: var(--muted); }
.menu { position: absolute; z-index: 20; right: 0; top: calc(100% + 6px); width: 190px; padding: 6px; border-radius: 16px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--pop-shadow); display: flex; flex-direction: column; }
.menu span { padding: 9px 12px; border-radius: 10px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 9px; }
.menu span.on { background: var(--fill); } .menu span.dng { color: var(--negative); }
.mini-btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; min-height: 30px; border-radius: 999px; font-size: 12px; font-weight: 800; }
.mini-btn.ok { background: var(--accent-tint); color: var(--accent-text); }
.mini-btn.warn { background: var(--warning-tint); color: var(--warning-text); }
.mini-btn.ghost { background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--soft-shadow); }

/* Dialog helpers for the forms board */
.sw { display: inline-flex; gap: 8px; }
.sw i { width: 26px; height: 26px; border-radius: 9px; display: inline-block; }
.sw i.on { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--ink); }
`;

const GOALS = String.raw`
.chai-app { --solid: oklch(0.995 0 0); --grid: oklch(0.3 0.09 155 / 0.18); --need: oklch(0.5 0.14 28); --need-tint: oklch(0.95 0.035 35); --want: oklch(0.45 0.1 258); --want-tint: oklch(0.945 0.03 258); }
.pgcol { display: flex; flex-direction: column; gap: 20px; }
.g12 { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 20px; align-items: stretch; }
.g12 > * { display: flex; flex-direction: column; min-width: 0; }
.g12 > * > .card { flex: 1 1 auto; }

/* Badges: why (Need/Want) and how long (Minor/Major) */
.nb { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.02em; white-space: nowrap; }
.nb-need { background: var(--need-tint); color: var(--need); }
.nb-want { background: var(--want-tint); color: var(--want); }
.sb { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 800; white-space: nowrap; border: 1px solid var(--divider); color: var(--muted); }
.sb-major { background: var(--ink); color: var(--on-ink); border-color: var(--ink); }
.pill-fixed { background: var(--negative-tint); color: var(--negative); }
.gtile { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--on-card); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.18), 0 2px 6px oklch(0 0 0 / 0.18); }
.gtile.off { filter: grayscale(0.85); opacity: 0.6; }
.dot { width: 8px; height: 8px; border-radius: 3px; display: inline-block; flex-shrink: 0; }
.subrow { padding-left: 30px; position: relative; }
.subrow::before { content: ""; position: absolute; left: 14px; top: -14px; bottom: 50%; width: 10px; border-left: 1.5px solid var(--divider); border-bottom: 1.5px solid var(--divider); border-bottom-left-radius: 8px; }
.srow.dropped { opacity: 0.45; } .srow.dropped .cell-name b { text-decoration: line-through; }
.gbar { height: 10px; border-radius: 999px; background: var(--fill); position: relative; overflow: visible; }
.gbar > .f { position: absolute; left: 0; top: 0; bottom: 0; border-radius: inherit; }
.gbar > .e { position: absolute; top: -3px; bottom: -3px; width: 2px; border-radius: 2px; background: var(--ink); opacity: 0.55; }
.gbar.over > .f { background: var(--positive) !important; }

/* G1 Tanks */
.bays { display: grid; gap: 14px; }
.bay { border-radius: 22px; background: color-mix(in oklch, var(--bc) 7%, var(--surface)); border: 1px solid color-mix(in oklch, var(--bc) 24%, transparent); padding: 14px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.bay-h { display: flex; align-items: center; gap: 10px; min-width: 0; min-height: 40px; }
.bay-h b { font-size: 14px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.bay-h small { display: block; font-size: 11px; font-weight: 600; color: var(--muted); }
.tanks { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 10px; flex: 1; align-items: start; }
.tk { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.tk-v { position: relative; height: 210px; border-radius: 18px 18px 14px 14px; background: oklch(0 0 0 / 0.045); overflow: hidden; border: 1px solid var(--surface-line); box-shadow: inset 0 2px 6px oklch(0 0 0 / 0.05); }
.tk-w { position: absolute; left: 0; right: 0; bottom: 0; height: var(--p); background: linear-gradient(180deg, color-mix(in oklch, var(--tc) 78%, white), var(--tc)); }
.tk-w::before { content: ""; position: absolute; top: -7px; left: -12%; width: 124%; height: 14px; border-radius: 50%; background: color-mix(in oklch, var(--tc) 62%, white); opacity: 0.85; }
.tk-pace { position: absolute; left: 0; right: 0; bottom: var(--e); height: 0; border-top: 2px dashed var(--ink); opacity: 0.7; z-index: 2; }
.tk-pace span { position: absolute; right: 4px; top: -17px; font-size: 9px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--fg); background: oklch(1 0 0 / 0.78); padding: 1px 5px; border-radius: 6px; }
.tk-pct { position: absolute; top: 9px; left: 0; right: 0; text-align: center; font-size: 19px; font-weight: 800; z-index: 3; letter-spacing: -0.01em; }
.tk-pct.in { top: auto; bottom: 8px; color: var(--on-card); }
.tk-v.off { filter: grayscale(0.7); opacity: 0.7; }
.tk-n { font-size: 12px; font-weight: 800; line-height: 1.25; min-height: 30px; overflow: hidden; text-overflow: ellipsis; }
.tk-s { min-height: 32px; font-size: 11px; font-weight: 600; color: var(--muted); line-height: 1.35; }
.tk-s b { color: var(--fg); font-weight: 800; }

/* G2 Runway */
.rw { position: relative; display: flex; flex-direction: column; }
.rw-row { display: grid; grid-template-columns: 250px minmax(0, 1fr) 150px; align-items: center; min-height: 42px; border-bottom: 1px solid var(--divider); }
.rw-row:last-child { border-bottom: 0; }
.rw-lab { display: flex; align-items: center; gap: 10px; min-width: 0; padding-right: 10px; }
.rw-lab b { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.rw-lab small { display: block; font-size: 11px; font-weight: 600; color: var(--muted); }
.rw-lab.sub { padding-left: 28px; }
.rw-track { position: relative; height: 42px; }
.rw-bar { position: absolute; top: 12px; height: 18px; border-radius: 999px; background: color-mix(in oklch, var(--tc) 20%, transparent); border: 1px solid color-mix(in oklch, var(--tc) 40%, transparent); }
.rw-bar.par { top: 17px; height: 8px; background: color-mix(in oklch, var(--tc) 14%, transparent); }
.rw-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; background: linear-gradient(90deg, color-mix(in oklch, var(--tc) 80%, white), var(--tc)); }
.rw-proj { position: absolute; top: 7px; width: 0; height: 28px; border-left: 2px dotted var(--ink); z-index: 2; }
.rw-proj::after { content: ""; position: absolute; top: -3px; left: -5px; width: 8px; height: 8px; border-radius: 50%; background: var(--ink); }
.rw-pin { position: absolute; top: 4px; width: 22px; height: 34px; margin-left: -11px; z-index: 3; display: flex; flex-direction: column; align-items: center; color: var(--negative); }
.rw-pin i { width: 3px; flex: 1; background: var(--negative); border-radius: 2px; }
.rw-pin svg { background: var(--negative); color: white; border-radius: 6px; padding: 2px; width: 16px; height: 16px; }
.rw-now { position: absolute; top: 0; bottom: 0; width: 0; border-left: 2px solid var(--accent); z-index: 4; pointer-events: none; }
.rw-now span { position: absolute; top: -22px; left: -18px; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--accent-text); background: var(--accent-tint); padding: 2px 7px; border-radius: 999px; }
.rw-end { text-align: right; padding-left: 10px; font-size: 12px; font-weight: 700; }
.rw-end small { display: block; font-size: 11px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.rw-axis { position: relative; height: 26px; margin-left: 250px; margin-right: 150px; border-bottom: 1px solid var(--divider); }
.rw-axis span { position: absolute; top: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; color: var(--muted); }
.rw-axis i { position: absolute; bottom: 0; height: 7px; border-left: 1px solid var(--divider); }
.rw-grid { position: absolute; top: 26px; bottom: 0; left: 250px; right: 150px; pointer-events: none; }
.rw-grid i { position: absolute; top: 0; bottom: 0; border-left: 1px dashed var(--grid); opacity: 0.6; }

/* G3 Funding plan */
.fp-chips { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.fp-chips label.chip { cursor: pointer; padding: 8px 14px; font-size: 13px; }
.fp-chips label.chip em { font-size: 11px; }
.fp-view { display: none; }
.fp-row { display: grid; grid-template-columns: 210px minmax(0, 1fr) 150px; align-items: center; min-height: 36px; }
.fp-track { position: relative; height: 36px; }
.fp-bar { position: absolute; top: 9px; height: 18px; left: 0; border-radius: 999px; background: linear-gradient(90deg, color-mix(in oklch, var(--tc) 78%, white), var(--tc)); }
.fp-bar.late { background: repeating-linear-gradient(135deg, var(--tc) 0 6px, color-mix(in oklch, var(--tc) 60%, white) 6px 12px); box-shadow: 0 0 0 2px var(--warning); }
.fp-due { position: absolute; top: 3px; height: 30px; width: 2px; background: var(--ink); opacity: 0.6; z-index: 2; }
.fp-due.fx { background: var(--negative); opacity: 1; width: 3px; }
.fp-res { font-size: 12px; font-weight: 800; text-align: right; }
.fp-res small { display: block; font-weight: 600; color: var(--muted); font-size: 11px; margin-top: 1px; }
.fp-stack { display: flex; align-items: flex-end; gap: 3px; height: 130px; }
.fp-stack > div { flex: 1; display: flex; flex-direction: column-reverse; min-width: 0; border-radius: 4px 4px 2px 2px; overflow: hidden; }
.fp-stack > div > i { display: block; }
.fp-big { font-size: 34px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; }
.fp-big small { font-size: 14px; font-weight: 700; color: var(--muted); letter-spacing: 0; margin-left: 4px; }

/* G4 Matrix */
.mx { display: grid; grid-template-columns: 74px minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: auto auto auto; gap: 12px; }
.mx-h { display: flex; flex-direction: column; justify-content: center; gap: 2px; }
.mx-h b { font-size: 14px; font-weight: 800; } .mx-h small { font-size: 11px; font-weight: 600; color: var(--muted); }
.mx-h.row { align-items: flex-start; }
.mx-cell { border-radius: 20px; padding: 12px; display: flex; flex-direction: column; gap: 10px; min-height: 120px; border: 1px solid var(--surface-line); }
.mx-cell.need { background: color-mix(in oklch, var(--need-tint) 70%, var(--surface)); }
.mx-cell.want { background: color-mix(in oklch, var(--want-tint) 70%, var(--surface)); }
.mx-cell .mx-t { display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
.mx-card { background: var(--surface); border-radius: 16px; padding: 12px 14px; box-shadow: var(--soft-shadow); display: flex; flex-direction: column; gap: 9px; border-left: 4px solid var(--tc); }
.mx-card .top { display: flex; align-items: center; gap: 10px; }
.mx-card .top b { font-size: 13.5px; font-weight: 800; display: block; } .mx-card .top small { font-size: 11px; font-weight: 600; color: var(--muted); display: block; }
.mx-card .nums { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; }
.mx-card .nums span:last-child { color: var(--muted); font-weight: 600; }
.mx-sub { display: flex; flex-wrap: wrap; gap: 6px; }
.mx-sub span { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; background: var(--fill); font-size: 11px; font-weight: 700; }
.mx-sub span i { width: 6px; height: 6px; border-radius: 50%; background: var(--tc); }
.mx-sub span.want { color: var(--want); } .mx-sub span.need { color: var(--need); }
.mx-empty { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: var(--muted); text-align: center; padding: 10px; }

/* Small widgets */
.split2 { display: flex; height: 18px; border-radius: 999px; overflow: hidden; gap: 2px; }
.split2 > span { display: block; height: 100%; }
.kv { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 12.5px; font-weight: 600; padding: 7px 0; border-bottom: 1px solid var(--divider); }
.kv:last-child { border-bottom: 0; } .kv span:first-child { color: var(--muted); } .kv b { font-weight: 800; }
.cu { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--divider); }
.cu:last-child { border-bottom: 0; }
.cu b { font-size: 13px; font-weight: 700; display: block; } .cu small { font-size: 11px; font-weight: 600; color: var(--muted); display: block; margin-top: 2px; }
.cu .d { text-align: right; font-size: 12px; font-weight: 800; } .cu .d small { font-weight: 600; }
.cu.risk { background: color-mix(in oklch, var(--negative-tint) 60%, transparent); box-shadow: inset 3px 0 0 var(--negative); margin: 0 -8px; padding-left: 8px; padding-right: 8px; border-radius: 8px; }
.stack3 { display: flex; flex-direction: column; gap: 10px; }
.meter { position: relative; height: 16px; border-radius: 999px; background: var(--fill); }
.meter > i { position: absolute; top: 0; bottom: 0; left: 0; border-radius: inherit; display: block; }
.meter > b { position: absolute; top: -5px; bottom: -5px; width: 2px; background: var(--ink); border-radius: 2px; }
.meter-l { position: relative; height: 16px; font-size: 10.5px; font-weight: 700; color: var(--muted); }
.meter-l span { position: absolute; white-space: nowrap; }
.sw { display: inline-flex; gap: 8px; } .sw i { width: 26px; height: 26px; border-radius: 9px; display: inline-block; } .sw i.on { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--ink); }
.nsec { display: flex; gap: 14px; align-items: flex-start; margin-top: 10px; }
/* G5 This month */
.mt-row { display: grid; grid-template-columns: minmax(0, 2.4fr) 0.9fr minmax(0, 2fr) 1fr 1.4fr; align-items: center; gap: 18px; padding: 12px 0; border-bottom: 1px solid var(--divider); }
.mt-row:last-child { border-bottom: 0; }
/* G6 Skyline */
.sk { position: relative; border-radius: 22px; padding: 30px 30px 0; background: linear-gradient(180deg, oklch(0.27 0.04 265), oklch(0.36 0.06 280) 70%, oklch(0.5 0.09 40)); overflow: hidden; color: oklch(0.97 0 0); }
.sk-stars { position: absolute; inset: 0; background: radial-gradient(1.2px 1.2px at 12% 20%, white, transparent), radial-gradient(1px 1px at 30% 12%, white, transparent), radial-gradient(1.4px 1.4px at 55% 18%, white, transparent), radial-gradient(1px 1px at 78% 10%, white, transparent), radial-gradient(1.2px 1.2px at 91% 26%, white, transparent), radial-gradient(1px 1px at 66% 34%, white, transparent); opacity: 0.7; }
.sk-row { position: relative; display: flex; align-items: flex-end; justify-content: space-around; gap: 26px; min-height: 470px; padding-bottom: 0; }
.sk-ground { position: relative; height: 0; }
.sk-b { position: relative; display: flex; flex-direction: column; justify-content: flex-end; flex-shrink: 0; }
.sk-top { position: relative; height: 34px; display: flex; justify-content: center; align-items: flex-end; }
.sk-spire { position: absolute; bottom: 0; width: 3px; height: 34px; background: oklch(0.85 0.02 260); }
.sk-spire::after { content: ""; position: absolute; top: -3px; left: -3px; width: 9px; height: 9px; border-radius: 50%; background: oklch(0.72 0.19 25); box-shadow: 0 0 10px oklch(0.72 0.19 25); }
.sk-flag { position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 4px; background: var(--negative); color: white; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 8px; white-space: nowrap; }
.sk-body { display: flex; flex-direction: column; border-radius: 6px 6px 0 0; overflow: hidden; border: 1px solid oklch(1 0 0 / 0.12); border-bottom: 0; background: oklch(0.22 0.03 265); }
.sk-f { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; padding: 7px 9px; font-size: 11px; font-weight: 800; border-top: 2px solid oklch(0.16 0.03 265); overflow: hidden;
  background:
    radial-gradient(circle at 6px 6px, oklch(1 0 0 / 0.16) 2px, transparent 2.4px) 0 0 / 14px 14px,
    linear-gradient(to top, color-mix(in oklch, var(--tc) 72%, white) var(--lit), oklch(0.25 0.03 265) var(--lit)); }
.sk-f:first-child { border-top: 0; }
.sk-f::after { content: ""; position: absolute; left: 0; right: 0; bottom: var(--lit); height: 2px; background: white; opacity: 0.6; }
.sk-f span { position: relative; z-index: 1; text-shadow: 0 1px 2px oklch(0 0 0 / 0.5); }
.sk-f em { position: relative; z-index: 1; font-style: normal; opacity: 0.85; text-shadow: 0 1px 2px oklch(0 0 0 / 0.5); }
.sk-l { position: relative; z-index: 1; margin: 0 -6px; padding: 10px 6px 14px; text-align: center; background: oklch(0.15 0.03 265); border-radius: 0 0 8px 8px; }
.sk-l b { display: block; font-size: 13.5px; font-weight: 800; } .sk-l small { display: block; font-size: 11px; opacity: 0.75; font-weight: 600; margin-top: 2px; }
.sk-l .row { justify-content: center; }
.sk .nb-need { background: oklch(0.45 0.12 28 / 0.55); color: oklch(0.92 0.05 30); } .sk .nb-want { background: oklch(0.45 0.1 258 / 0.55); color: oklch(0.92 0.04 258); } .sk .sb { color: oklch(0.9 0 0); border-color: oklch(1 0 0 / 0.25); } .sk .sb-major { background: white; color: var(--ink); }
.sk .hc { background: var(--solid); color: var(--fg); }
/* G7 Queue */
.q-focus { border-radius: 24px; padding: 24px; display: flex; flex-direction: column; gap: 16px; color: var(--on-card); background: linear-gradient(155deg, var(--card-teal-from), var(--card-teal-to)); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.18); }
.q-focus .gbar { background: oklch(1 0 0 / 0.22); } .q-focus .gbar > .e { background: white; opacity: 0.9; }
.q-kv { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; padding: 7px 0; border-bottom: 1px solid oklch(1 0 0 / 0.18); opacity: 0.95; } .q-kv b { font-weight: 800; }
.q-row { display: grid; grid-template-columns: 22px 30px minmax(0, 1fr) 90px 130px; align-items: center; gap: 14px; padding: 11px 0; border-bottom: 1px solid var(--divider); }
.q-row:last-child { border-bottom: 0; }
.q-n { font-size: 12px; font-weight: 800; color: var(--muted); }
/* G8 Staircase */
.st-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; background: var(--surface); padding: 3px 9px; border-radius: 999px; box-shadow: var(--soft-shadow); white-space: nowrap; }

.st-lab.dk { background: oklch(0 0 0 / 0.35); color: white; box-shadow: none; backdrop-filter: blur(6px); }
/* Round 3: coloured cards (the Queue's focus card, Subscriptions' cover, Accounts' cards) */
.cc { position: relative; border-radius: 22px; padding: 16px; color: var(--on-card); display: flex; flex-direction: column; gap: 12px; overflow: hidden; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.16), 0 6px 16px oklch(0 0 0 / 0.12); }
.cc .nb, .cc .sb, .tk2 .nb, .tk2 .sb { background: oklch(1 0 0 / 0.18); color: inherit; border-color: transparent; }
.cc .sb-major, .tk2 .sb-major { background: oklch(1 0 0 / 0.92); color: var(--ink); }
.cc-gb { position: relative; border-radius: 999px; background: oklch(1 0 0 / 0.24); } .cc-gb > i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: inherit; background: oklch(1 0 0 / 0.95); } .cc-gb > b { position: absolute; top: -3px; bottom: -3px; width: 2px; border-radius: 2px; background: oklch(0.95 0.15 90); }
.cc-big { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; } .cc-big small { font-size: 13px; font-weight: 700; opacity: 0.8; margin-left: 5px; letter-spacing: 0; }
.cc .hc-wrap, .tm .hc-wrap { color: var(--fg); }
.cc.hov > .hc-wrap, .tm.hov > .hc-wrap { bottom: auto; top: 12px; left: 50%; margin-left: -115px; }
.q-focus.rt { position: relative; } .q-focus .cc-gb { background: oklch(1 0 0 / 0.22); }
/* G9 cover */
.h9 { border: 1px solid oklch(1 0 0 / 0.12); }
.h9-bg { position: absolute; inset: 0; z-index: -2; opacity: 0; transition: opacity 650ms ease; } .h9-bg-all { opacity: 1; }
.h9-rings { position: absolute; inset: 0; z-index: -1; pointer-events: none; background: repeating-radial-gradient(circle at calc(100% + 40px) calc(100% + 60px), oklch(1 0 0 / 0.09) 0 1px, transparent 1px 30px); }
.h9-fp { border: 1.5px solid oklch(1 0 0 / 0.5); border-radius: 26px; padding: 24px; display: flex; flex-direction: column; background: oklch(0 0 0 / 0.1); min-height: 330px; }
.h9-f { display: none; flex-direction: column; gap: 12px; flex: 1; } .h9-f-all { display: flex; } .h9dir:has(input:checked:not(#p9-all)) .h9-f-all { display: none; }
.h9-big { font-size: 58px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
.h9-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 999px; background: oklch(1 0 0 / 0.18); font-size: 12px; font-weight: 700; color: white; white-space: nowrap; }
.h9-pill { padding: 4px 12px; border-radius: 999px; background: oklch(1 0 0 / 0.18); font-size: 11px; font-weight: 800; }
.vcs { display: flex; gap: 12px; align-items: stretch; }
.vc { position: relative; flex: 1; border-radius: 22px; overflow: hidden; cursor: pointer; display: flex; flex-direction: column; align-items: center; padding: 14px 6px 12px; gap: 6px; color: white; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.2), 0 8px 18px oklch(0 0 0 / 0.25); }
.vc-f { position: absolute; left: 0; right: 0; bottom: 0; background: oklch(1 0 0 / 0.18); border-top: 2px solid oklch(1 0 0 / 0.55); }
.vc-t, .vc-p, .vc-n { position: relative; } .vc-p { font-size: 17px; font-weight: 800; margin-top: 4px; }
.vc-n { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 14px; font-weight: 800; margin-top: auto; white-space: nowrap; }
.h9-chart { border-radius: 20px; padding: 16px 20px 0; background: oklch(0 0 0 / 0.14); }
.h9-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; border-top: 1px solid oklch(1 0 0 / 0.2); padding-top: 18px; }
.h9-stats > div { display: flex; flex-direction: column; gap: 3px; } .h9-stats b { font-size: 21px; font-weight: 800; } .h9-stats small { font-size: 12px; opacity: 0.8; font-weight: 600; }
/* G10 map */
.tmap2 { display: grid; grid-template-columns: 51fr 49fr; grid-template-rows: 56fr 44fr; grid-template-areas: "m c" "m s"; gap: 10px; height: 556px; }
.tmap2 > div { min-height: 0; min-width: 0; } .tmap2 .tm { height: 100%; }
.tm { position: relative; border-radius: 20px; overflow: hidden; color: var(--on-card); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.16); min-width: 0; }
.tm-fill { position: absolute; left: 0; right: 0; bottom: 0; background: oklch(1 0 0 / 0.2); border-top: 2px solid oklch(1 0 0 / 0.5); }
.tm-in { position: relative; z-index: 1; height: 100%; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; }
.tm-n { font-size: 17px; font-weight: 800; display: block; } .tm small { display: block; font-size: 11.5px; font-weight: 600; opacity: 0.85; margin-top: 2px; }
.tm-p { font-size: 13px; font-weight: 800; background: oklch(1 0 0 / 0.18); padding: 3px 10px; border-radius: 999px; }
.tm-foot b { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
.tm .nb { background: oklch(1 0 0 / 0.18); color: inherit; }
.tm-grid { flex: 1; display: grid; grid-template-columns: 1.5fr 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; grid-template-areas: "r s a" "r t m"; min-height: 0; }
.tm.mini { border-radius: 14px; background: oklch(0 0 0 / 0.2); border: 1px solid oklch(1 0 0 / 0.18); }
.tm.mini .tm-in { padding: 10px 12px; } .tm.mini .tm-foot b { font-size: 15px; } .tm.mini .tm-foot small { font-size: 10.5px; }
.q-mini { display: grid; grid-template-columns: 18px 14px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--divider); } .q-mini:last-child { border-bottom: 0; }
.q-mini b { font-size: 12.5px; font-weight: 700; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .q-mini small { font-size: 10.5px; color: var(--muted); font-weight: 600; display: block; }
/* G11 board */
.lanes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: stretch; }
.lane { display: flex; flex-direction: column; gap: 12px; border-radius: 22px; padding: 14px; background: var(--fill); }
.lane-h { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 2px 4px; }
.lane-h b { font-size: 15px; font-weight: 800; display: block; } .lane-h small { display: block; font-size: 11.5px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.lane-b { flex: 1; display: flex; flex-direction: column; gap: 12px; } .lane-b > .cc { flex: 1; justify-content: space-between; }
/* G12 tickets */
.tk2 { position: relative; display: grid; grid-template-columns: 20px 32px minmax(0, 1.5fr) minmax(0, 1.1fr) 90px 130px; align-items: center; gap: 14px; padding: 12px 18px; border-radius: 18px; color: var(--on-card); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.16), 0 3px 10px oklch(0 0 0 / 0.1); }
.tk2-n { font-size: 12px; font-weight: 800; opacity: 0.8; } .tk2-end { text-align: right; border-left: 1.5px dashed oklch(1 0 0 / 0.4); padding-left: 14px; } .tk2-end b { font-size: 14px; font-weight: 800; display: block; } .tk2-end span { font-size: 11px; font-weight: 700; opacity: 0.85; }

.formgrid { display: flex; flex-direction: column; gap: 30px; align-items: center; padding: 40px; }
.formgrid .dlg { width: 1020px; }
`;
import { CSS4 } from "./css4.mjs";
export const CSS = BASE + SHARED + GOALS + CSS4;
