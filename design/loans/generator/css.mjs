// One stylesheet for every Loans artboard: the shared base (css-base.mjs) plus the pieces copied from Income's that Loans reuses, then Loans' own.
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

const LOANS = String.raw`
.chai-app { --solid: oklch(0.995 0 0); --future-base: white; --grid: oklch(0.3 0.09 155 / 0.18); --c-prin: oklch(0.6 0.12 153); --c-int: oklch(0.72 0.14 62); }
/* ===================== Loans additions ===================== */

/* Stacked charts (L1, L2): the plot is an SVG, everything with text is HTML on top of it */
.sc { position: relative; }
.sc .scp { position: absolute; left: 0; right: 52px; top: 0; bottom: 0; }
.sc svg { position: absolute; left: 0; width: 100%; overflow: visible; }
.sc .gl { position: absolute; left: 0; right: 0; height: 0; border-top: 1px dashed var(--grid); pointer-events: none; }
.sc .gl span { position: absolute; right: 0; top: -15px; text-align: right; font-size: 10px; font-weight: 700; color: var(--muted); }
.sc .yrs { position: absolute; left: 0; right: 0; bottom: 0; height: 22px; }
.sc .yr { position: absolute; bottom: 0; transform: translateX(-50%); font-size: 10px; font-weight: 800; letter-spacing: 0.05em; color: var(--muted); }
.sc .yr.now { color: var(--fg); }
.ys { position: absolute; z-index: 2; border-radius: 8px; }
.ys:hover, .ys:focus-visible { background: oklch(1 0 0 / 0.38); outline: 0; }
.ys.hov > .hc-wrap { bottom: auto !important; top: 30px; }
.flag { position: absolute; z-index: 3; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; pointer-events: none; }
.flag.r { transform: translateX(-100%); align-items: flex-end; }
.flag.l { transform: none; align-items: flex-start; }
.fl-chip { display: inline-flex; align-items: center; gap: 8px; padding: 5px 11px 5px 9px; border-radius: 12px; background: var(--solid); border: 1px solid var(--surface-line); box-shadow: var(--soft-shadow); white-space: nowrap; }
.fl-chip i { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
.fl-chip b { display: block; font-size: 11.5px; font-weight: 800; line-height: 1.2; }
.fl-chip small { display: block; font-size: 10.5px; font-weight: 600; color: var(--muted); line-height: 1.2; }
.flag.past .fl-chip { opacity: 0.72; }
.fl-line { width: 0; border-left: 1.5px dashed color-mix(in oklch, var(--fg) 40%, transparent); }
.fl-dot { width: 9px; height: 9px; border-radius: 50%; box-shadow: 0 0 0 2px var(--solid); margin-top: -1px; }
.peakchip { position: absolute; transform: translateX(-50%); z-index: 3; padding: 4px 11px; border-radius: 999px; background: var(--ink); color: var(--on-ink); pointer-events: none; white-space: nowrap; }
.peakchip b { font-size: 11px; font-weight: 800; } .peakchip small { font-size: 10px; margin-left: 6px; opacity: 0.7; font-weight: 600; }
.pick { transition: opacity 240ms; }
.stepbox { display: flex; flex-direction: column; gap: 2px; padding: 10px 16px; border-radius: 16px; background: oklch(1 0 0 / 0.55); border: 1px solid var(--feature-tile-line); min-width: 150px; }
.stepbox.on { background: var(--surface); box-shadow: var(--soft-shadow); }
.stepbox .k { font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); }
.stepbox b { font-size: 18px; font-weight: 800; } .stepbox small { font-size: 11.5px; color: var(--muted); font-weight: 600; }
.stepar { display: flex; align-items: center; color: var(--muted); }
.tbl { flex: 1; display: flex; flex-direction: column; }
.tbl > .srow:not(:first-child), .tbl > .cu { flex: 1; }
.stage-deep .hfig .v.warn { color: oklch(0.88 0.12 78); }
.mb.fill { align-items: stretch; }
.mb.fill .plot { flex: 1; position: relative; }
.mb.fill .mstack { display: flex; flex-direction: column-reverse; gap: 2px; }
.mb.fill .mseg { min-height: 2px; }
.nb.fill { flex: 1; flex-direction: column; }
.nh-prep { display: none; }
.nhempty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 330px; text-align: center; color: var(--muted); font-weight: 600; } .nhempty b { color: var(--fg); font-size: 15px; }
.nldir.pal-outline { --c-prin: oklch(0.42 0.11 155); --c-int: oklch(0.6 0.14 60); }
.pal-outline .ig.rt::after { display: none; }
.pal-outline .split > .ig, .pal-outline .seg5.ig { background: color-mix(in oklch, var(--c-int) 14%, transparent) !important; border: 1.5px dashed var(--c-int); }
.pal-outline .seg5.igl { opacity: 0.55; }
.pal-outline .lg i.outl { background: color-mix(in oklch, var(--c-int) 14%, transparent) !important; border: 1.5px dashed var(--c-int); }
.pal-outline .igr { fill: color-mix(in oklch, var(--c-int) 14%, transparent); fill-opacity: 1; stroke: var(--c-int); stroke-width: 1.5; stroke-dasharray: 4 3; }
.pal-outline .mseg.ig { background: color-mix(in oklch, var(--c-int) 14%, transparent) !important; border: 1.5px dashed var(--c-int); }
.seg .nc.sg { background: transparent; border: 0; padding: 6px 13px; border-radius: 999px; font-size: 12px; transform: none; } .seg .nc.sg:hover { background: var(--fill-strong); }
.nldir .nbi { display: none; }
.nldir .nwm { flex: 1; flex-direction: column; }
.nldir .nwm .mb.fill { flex: 1; min-height: 250px; }
.pay-hint { font-size: 12.5px; font-weight: 500; color: var(--muted); }
.rl { display: grid; grid-template-columns: 12px 1fr auto auto; gap: 10px; align-items: center; padding: 9px 0; border-bottom: 1px solid oklch(1 0 0 / 0.1); font-size: 13px; } .rl:last-child { border-bottom: 0; }
.rl i { width: 10px; height: 10px; border-radius: 3px; } .rl .rn b { display: block; font-weight: 800; } .rl .rn small { display: block; font-size: 11px; color: var(--muted); font-weight: 600; } .rl > b { font-size: 20px; font-weight: 800; } .rl .ro { color: var(--muted); font-weight: 600; font-size: 12px; text-align: right; min-width: 86px; }
.cap { position: relative; height: 24px; border-radius: 999px; background: var(--fill); } .cap > i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; } .cap > b { position: absolute; top: -5px; bottom: -5px; width: 3px; border-radius: 2px; background: var(--fg); opacity: 0.85; }
.waffle { display: grid; grid-template-columns: repeat(10, 20px); gap: 4px; flex-shrink: 0; } .wf { width: 20px; height: 20px; border-radius: 5px; background: var(--fill); display: block; } .wf.on { box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.25); }
.stp { position: absolute; top: 0; white-space: nowrap; font-size: 11px; font-weight: 600; color: var(--muted); } .stp b { color: var(--fg); font-weight: 800; }
/* Payoff rings (L3) */
.rlabel { position: absolute; font-size: 11.5px; font-weight: 600; color: var(--muted); text-align: right; white-space: nowrap; line-height: 18px; z-index: 2; pointer-events: none; }
.rlabel b { color: var(--fg); font-weight: 800; margin-right: 4px; }
.rcentre { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; }
.rcentre small { font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); }
.rcentre b { font-size: 54px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; }
.rcentre span { font-size: 13px; font-weight: 700; color: var(--muted); }
.lcard { display: flex; flex-direction: column; gap: 12px; padding: 16px 18px; border-radius: 20px; border: 1.5px solid transparent; background: oklch(1 0 0 / 0.55); position: relative; cursor: pointer; transition: opacity 240ms, background 160ms; }
.lcard.off { opacity: 0.6; }
.lbars { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.lbars span { display: block; font-size: 11px; font-weight: 700; color: var(--muted); margin-bottom: 5px; }
.lnote { font-size: 12px; font-weight: 600; color: var(--muted); }
/* EMI tally (L4) */
.tally { position: relative; display: flex; flex-direction: column; gap: 4px; padding-top: 4px; }
.trow { display: grid; grid-template-columns: 190px 1fr; align-items: center; height: 66px; position: relative; z-index: 1; }
.trow.off .tlane { opacity: 0.6; }
.tl-lab { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 6px; border-radius: 14px; margin-right: 8px; }
.tl-lab b { display: block; font-size: 13px; font-weight: 800; line-height: 1.2; } .tl-lab small { display: block; font-size: 10.5px; font-weight: 600; color: var(--muted); line-height: 1.25; }
.tlane { position: relative; height: 66px; }
.tlane::after { content: ""; position: absolute; left: 0; right: 0; bottom: 5px; border-top: 1px solid var(--divider); }
.tkw { position: absolute; bottom: 6px; height: 46px; display: block; z-index: 1; }
.tkw:hover, .tkw:focus-visible { z-index: 6; outline: 0; }
.tkw .tk { position: absolute; left: 0; right: 0; bottom: 0; height: 26px; border-radius: 2px; background: var(--c); }
.tkw .tk.f { background: transparent; box-shadow: inset 0 0 0 1.2px var(--c); opacity: 0.6; }
.tkw .tk.late { border-top: 4px solid oklch(0.72 0.14 75); }
.tkw .tk.next { height: 42px; background: oklch(0.72 0.14 75); box-shadow: none; opacity: 1; animation: due-pulse 2.2s ease-in-out infinite; }
.tkw:hover .tk { height: 40px; }
.tgrid { position: absolute; left: 190px; right: 0; top: 0; bottom: 24px; pointer-events: none; }
.tgrid span { position: absolute; top: 0; bottom: 0; border-left: 1px solid var(--grid); opacity: 0.6; }
.taxis { margin-left: 190px; position: relative; height: 20px; }
.taxis span { position: absolute; transform: translateX(-50%); font-size: 10px; font-weight: 800; letter-spacing: 0.05em; color: var(--muted); }
.tally .todayline { z-index: 3; }
.lg i.latekey { background: var(--card-sapphire); border-top: 4px solid oklch(0.72 0.14 75); border-radius: 2px; }
.lg i.futurekey { background: transparent; box-shadow: inset 0 0 0 1.5px var(--card-sapphire); opacity: 0.7; border-radius: 2px; }
/* Cost anatomy (L5) */
.a5wrap { display: flex; flex-direction: column; position: relative; }
.a5scale, .a5 { display: grid; grid-template-columns: 230px 1fr 120px 120px; gap: 16px; align-items: center; }
.a5scale { padding-bottom: 6px; }
.a5axis { position: relative; height: 18px; }
.a5axis span { position: absolute; transform: translateX(-50%); font-size: 10px; font-weight: 800; letter-spacing: 0.04em; color: var(--muted); white-space: nowrap; }
.a5axis span:first-child { transform: none; }
.a5 { padding: 13px 0; border-top: 1px solid var(--divider); }
.a5.off { opacity: 0.55; }
.a5bar { position: relative; height: 34px; display: flex; align-items: center; }
.a5bar::before { content: ""; position: absolute; left: 43.478%; top: -13px; bottom: -13px; border-left: 1.5px dashed var(--ink); opacity: 0.35; z-index: 2; pointer-events: none; }
.a5track { display: flex; height: 30px; width: 100%; }
.seg5 { display: block; height: 100%; border-right: 2px solid var(--surface); }
.seg5:first-child { border-radius: 9px 0 0 9px; }
.seg5:last-child { border-radius: 0 9px 9px 0; border-right: 0; }
.a5end { position: absolute; top: 50%; transform: translateY(-50%); font-size: 13px; }
.a5f { text-align: right; } .a5f small { display: block; font-size: 11px; color: var(--muted); font-weight: 600; }
/* Debt-free clock (L6) */
.ctile { display: flex; flex-direction: column; align-items: center; padding: 14px 24px 12px; border-radius: 20px; background: oklch(1 0 0 / 0.1); border: 1px solid oklch(1 0 0 / 0.16); border-top-color: oklch(1 0 0 / 0.3); min-width: 128px; }
.ctile b { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 72px; font-weight: 800; line-height: 1; letter-spacing: -0.04em; }
.ctile small { font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin-top: 8px; }
.cwrap { display: flex; flex-direction: column; gap: 12px; position: relative; padding: 18px 20px 14px; border-radius: 20px; background: oklch(1 0 0 / 0.07); border: 1px solid oklch(1 0 0 / 0.12); }
.cbar { display: grid; grid-template-columns: 190px 1fr; gap: 16px; align-items: center; position: relative; }
.ctrack { position: relative; height: 22px; border-radius: 999px; background: oklch(1 0 0 / 0.1); }
.cfill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; background: linear-gradient(180deg, color-mix(in oklch, var(--c) 70%, white), var(--c)); }
.cend { position: absolute; top: 50%; transform: translate(12px, -50%); white-space: nowrap; font-size: 12px; font-weight: 800; }
.cend.in { transform: translate(calc(-100% - 12px), -50%); color: var(--on-card); text-shadow: 0 1px 2px oklch(0 0 0 / 0.4); }
.cyrs { position: relative; margin-left: 206px; height: 16px; }
.cyrs span { position: absolute; transform: translateX(-50%); font-size: 10px; font-weight: 800; letter-spacing: 0.05em; color: var(--muted); }
.miles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.mile { display: flex; flex-direction: column; gap: 14px; padding: 16px 18px; border-radius: 18px; background: oklch(1 0 0 / 0.1); border: 1px solid oklch(1 0 0 / 0.14); }
.mfall span { font-size: 11px; font-weight: 700; color: var(--muted); display: block; margin-bottom: 4px; }
.mfall s { color: var(--muted); font-weight: 700; font-size: 15px; } .mfall b { font-size: 22px; font-weight: 800; }
.srow.nextrow { background: color-mix(in oklch, var(--warning-tint) 55%, transparent); box-shadow: inset 3px 0 0 var(--warning); margin: 0 -8px; padding-left: 8px !important; padding-right: 8px !important; border-radius: 8px; }

/* Round 2: hands-on pages. Chips are labels for hidden radios; the page shows the block for the picked combination. */
@keyframes cmb-in { from { opacity: 0; transform: translateY(6px); } }
@keyframes growx { from { transform: scaleX(0); } }
.kl { display: inline-flex; align-items: center; gap: 10px; padding: 8px 16px; border-radius: 999px; background: oklch(1 0 0 / 0.6); border: 1px solid var(--feature-tile-line); font-size: 13px; font-weight: 700; cursor: pointer; transition: background 160ms, color 160ms, transform 160ms; white-space: nowrap; }
.kl:hover { background: var(--surface); transform: translateY(-1px); }
.kl small { display: block; font-size: 11px; font-weight: 600; opacity: 0.65; }
.kl b { font-weight: 800; }
.kl.lbig { padding: 7px 16px 7px 8px; } .kl.lbig span { display: block; line-height: 1.25; }
.kl.lstack { flex-direction: column; align-items: flex-start; gap: 1px; border-radius: 18px; padding: 10px 18px; } .kl.lstack b { font-size: 14px; } .kl.lstack small { font-size: 11.5px; }
.scrub { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
.kl.sdot { flex-direction: column; align-items: flex-start; gap: 2px; border-radius: 18px; padding: 12px 16px; white-space: normal; }
.kl.sdot i { width: 10px; height: 10px; border-radius: 50%; background: currentColor; opacity: 0.4; margin-bottom: 4px; }
.kl.sdot b { font-size: 15px; } .kl.sdot small { font-size: 11px; line-height: 1.3; }
.wallbox { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 36px; min-height: 216px; align-items: start; }
.wall { display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; max-width: 650px; min-height: 216px; }
.brick { width: 46px; height: 46px; border-radius: 11px; background: linear-gradient(to top, var(--c) var(--f), color-mix(in oklch, var(--c) 14%, transparent) var(--f)); box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--c) 30%, transparent); transition: transform 160ms; }
.brick:hover { transform: translateY(-4px); }
.wallempty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: 100%; min-height: 216px; color: var(--positive); } .wallempty b { font-size: 24px; } .wallempty span { color: var(--muted); font-weight: 600; }
.bls { display: flex; flex-direction: column; } .bl { display: flex; align-items: center; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid var(--divider); font-size: 14px; } .bl.tot { color: var(--muted); font-size: 12px; font-weight: 600; border-bottom: 0; } .bl.tot b { color: var(--fg); }
.wigrid { display: grid; grid-template-columns: 1fr 360px; gap: 28px; align-items: start; }
.wires { display: flex; flex-direction: column; gap: 12px; }
.wibox { display: flex; flex-direction: column; gap: 3px; padding: 14px 18px; border-radius: 18px; background: oklch(1 0 0 / 0.6); border: 1px solid var(--feature-tile-line); }
.wibox.hot { background: var(--ink); color: var(--on-ink); border-color: var(--ink); }
.wibox .k { font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.6; } .wibox b { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; } .wibox small { font-size: 12px; font-weight: 600; opacity: 0.7; }
.limbox { display: flex; flex-direction: column; gap: 3px; padding: 12px 14px; border-radius: 14px; background: var(--fill); }
.wi2 { display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; } .wi2 .wibox b { font-size: 24px; }
.ratio { display: flex; gap: 7px; align-items: flex-start; font-size: 12px; font-weight: 600; color: var(--muted); line-height: 1.45; margin: -2px 2px 0; } .ratio svg { margin-top: 2px; flex-shrink: 0; }
.lim { display: flex; gap: 8px; align-items: flex-start; font-size: 12.5px; font-weight: 700; padding: 3px 0; } .lim small { display: block; font-weight: 600; opacity: 1; } .lim.ok { color: var(--positive); } .lim.bad { color: var(--warning-text); } .lim.bad small { color: var(--warning-text); }
.paytoday { display: flex; flex-direction: column; gap: 6px; padding: 14px 18px; border-radius: 16px; background: oklch(1 0 0 / 0.6); border: 1px solid var(--feature-tile-line); } .paytoday .k { font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); } .paytoday b { font-size: 17px; font-weight: 800; }
.wi { position: relative; height: 230px; margin-bottom: 26px; }
.wi svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.wiflag { position: absolute; z-index: 3; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; pointer-events: none; } .wiflag.r { transform: translateX(-100%); align-items: flex-end; } .wiflag.l { transform: none; align-items: flex-start; }
.wiax { position: absolute; left: 0; right: 0; top: 100%; margin-top: 6px; height: 16px; } .wiax span { position: absolute; transform: translateX(-50%); font-size: 10px; font-weight: 800; letter-spacing: 0.05em; color: var(--muted); } .wiax span:first-child { transform: none; } .wiax span:last-child { transform: translateX(-100%); }
.m3grid { display: grid; grid-template-columns: 430px 1fr; gap: 32px; align-items: start; }
.m3card { display: flex; flex-direction: column; gap: 16px; padding: 24px; border-radius: 22px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--soft-shadow); }
.split { display: flex; height: 36px; gap: 2px; border-radius: 12px; overflow: hidden; } .split span { display: block; height: 100%; transform-origin: left; animation: growx 600ms var(--ease-out); }
.m3say { font-size: 14px; line-height: 1.6; color: var(--muted); font-weight: 500; } .m3say b { color: var(--fg); font-weight: 800; }
.m3grid .wi { margin-top: 34px; }
.m3mark { position: absolute; top: 0; bottom: 0; width: 0; pointer-events: none; }
.m3line { position: absolute; top: 0; bottom: 0; left: -1px; border-left: 2px solid var(--ink); }
.m3dot { position: absolute; left: -8px; width: 16px; height: 16px; margin-top: -8px; border-radius: 50%; background: var(--surface); border: 3.5px solid var(--ink); }
.m3tag { position: absolute; top: -8px; left: 0; transform: translate(-50%, -100%); padding: 3px 10px; border-radius: 999px; background: var(--ink); color: var(--on-ink); font-size: 11px; font-weight: 800; white-space: nowrap; }
.m3end { position: absolute; top: 100%; margin-top: 6px; font-size: 11px; font-weight: 800; color: var(--muted); }
.m4grid { display: grid; grid-template-columns: 480px 1fr; gap: 40px; align-items: center; }
.gauge { position: relative; width: 460px; height: 262px; } .gauge svg { position: absolute; left: 0; top: 0; }
.gt { position: absolute; transform: translate(-50%, -50%); font-size: 11px; font-weight: 800; color: var(--muted); }
.needle { position: absolute; width: 0; height: 0; } .needle span { position: absolute; left: -4px; top: -165px; width: 8px; height: 165px; border-radius: 4px 4px 0 0; background: var(--ink); transform-origin: 50% 100%; transform: rotate(calc(-90deg + var(--p, 0) * 180deg)); transition: transform 900ms cubic-bezier(0.3, 1.35, 0.5, 1); }
.hub { position: absolute; width: 28px; height: 28px; border-radius: 50%; background: var(--ink); box-shadow: 0 0 0 5px var(--surface); }
.gleft { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 18px; border-radius: 14px; background: oklch(1 0 0 / 0.6); max-width: 400px; font-weight: 600; color: var(--muted); } .gleft b { color: var(--fg); font-size: 18px; }
/* ===================== Round 3: one dark page; the pick sets the colour ===================== */
.nldir { --c-prin: var(--lc); --c-int: color-mix(in oklch, var(--lc) 36%, white); --lc: var(--card-emerald); --lcl: color-mix(in oklch, var(--card-emerald) 52%, white); --accent: var(--lc); --accent-tint: color-mix(in oklch, var(--lc) 15%, white); --accent-text: color-mix(in oklch, var(--lc) 62%, black); --accent-edge: color-mix(in oklch, var(--lc) 50%, transparent); --accent-ring: color-mix(in oklch, var(--lc) 25%, transparent); }
.nite {
  --page: oklch(0.1 0.012 260); --solid: oklch(0.21 0.02 260); --future-base: oklch(0.6 0.02 260); --grid: oklch(1 0 0 / 0.13);
  --surface: oklch(1 0 0 / 0.065); --surface-line: oklch(1 0 0 / 0.12); --fg: oklch(0.96 0.004 260); --muted: oklch(1 0 0 / 0.6);
  --fill: oklch(1 0 0 / 0.08); --fill-strong: oklch(1 0 0 / 0.17); --divider: oklch(1 0 0 / 0.11);
  --card-shadow: 0 12px 40px oklch(0 0 0 / 0.32), inset 0 1px 0 oklch(1 0 0 / 0.09); --soft-shadow: 0 4px 14px oklch(0 0 0 / 0.25); --pop-shadow: 0 18px 50px oklch(0 0 0 / 0.55);
  --ink: oklch(0.97 0.004 260); --on-ink: oklch(0.16 0.01 260);
  --accent: var(--lc); --accent-tint: color-mix(in oklch, var(--lc) 28%, transparent); --accent-text: var(--lcl); --accent-edge: color-mix(in oklch, var(--lc) 60%, transparent); --accent-ring: color-mix(in oklch, var(--lc) 35%, transparent); --on-accent: oklch(0.99 0 0);
  --positive: oklch(0.85 0.15 150); --warning: oklch(0.8 0.14 80); --warning-text: oklch(0.88 0.1 82); --warning-tint: oklch(0.8 0.14 80 / 0.16);
  --negative: oklch(0.8 0.13 25); --negative-tint: oklch(0.7 0.16 25 / 0.22); --due-pulse-ring: oklch(0.8 0.13 40 / 0.25);
  --feature-tile: oklch(1 0 0 / 0.06); --feature-tile-line: oklch(1 0 0 / 0.14); --rings-ink: oklch(1 0 0);
  color: var(--fg); isolation: isolate; }
.nbg { position: absolute; inset: 0; z-index: -1; opacity: 0; transition: opacity 700ms ease; pointer-events: none; }
.nite .main { background: oklch(0.1 0.012 260 / 0.42); backdrop-filter: blur(30px) saturate(140%); -webkit-backdrop-filter: blur(30px) saturate(140%); border: 1px solid oklch(1 0 0 / 0.1); box-shadow: 0 30px 80px oklch(0 0 0 / 0.3); }
.nite .glass, .nite .glass-strong { backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); }
.nite .hc, .nite .pop { background: var(--solid); }
.nite .notice b { color: var(--warning-text); } .nite .notice .grow { color: var(--fg); }
.nite .delta { background: oklch(1 0 0 / 0.1); color: var(--positive); }
.nite .pill-derived { background: oklch(1 0 0 / 0.1); color: var(--accent-text); }
.nite .pill-late { background: var(--warning-tint); color: var(--warning-text); }
.nite .btn-primary { background: var(--ink); color: var(--on-ink); }
.nite .mini-btn.ghost { background: var(--fill); border-color: var(--surface-line); }
.nite .hbar { background: var(--fill-strong); }
.nite .seg5 { border-right-color: var(--solid); }
.nite .mcol.nowcol::before { background: var(--fill); }
.nite .hcell.now, .nite .tag { color: var(--fg); }
.nite .link { color: var(--accent-text); }
.nite .lede .pt > b { border-bottom-color: var(--accent-text); }
.nite .cend { color: var(--fg); } .nite .cend.in { color: var(--on-card); }
.nite .wibox { background: oklch(1 0 0 / 0.07); border-color: oklch(1 0 0 / 0.12); }
.nite .wibox.hot { background: var(--ink); color: var(--on-ink); border-color: var(--ink); }
.nite .wi2 { grid-template-columns: 1.2fr 1fr; } .nite .wi2 .wibox b { font-size: 22px; }
.nite .brick { background: linear-gradient(to top, var(--c) var(--f), color-mix(in oklch, var(--c) 18%, transparent) var(--f)); }
.nite .wallempty { color: var(--positive); }
.nite .fl-chip { background: var(--solid); }
/* The widgets */
.nldir .card { flex: 1; }
.nw.bare { background: none; border: 0; box-shadow: none; padding: 0; backdrop-filter: none; -webkit-backdrop-filter: none; }
.nw .ctile { background: var(--fill); border-color: var(--surface-line); } .nite .nw .ctile { background: oklch(1 0 0 / 0.08); border-color: oklch(1 0 0 / 0.16); }
.nw .cbar .ctrack { background: var(--fill-strong); } .nite .nw .cbar .ctrack { background: oklch(1 0 0 / 0.1); }
.nite.hero { color: var(--fg); }
.nw { position: relative; flex: 1; }
.nldir .a5wrap { flex: 1; } .nldir .a5wrap > .a5 { flex: 1; }
.nbody { flex: 1; display: flex; flex-direction: column; justify-content: center; min-height: 0; }
.nc { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 999px; background: var(--fill); border: 1px solid var(--surface-line); font-size: 12.5px; font-weight: 700; cursor: pointer; transition: background 160ms, transform 160ms; white-space: nowrap; }
.nc:hover { background: var(--fill-strong); transform: translateY(-1px); }
.nc.sm { padding: 5px 12px; font-size: 12px; }
.brick.sm { width: 42px; height: 42px; border-radius: 11px; }
.ptile { display: flex; flex-direction: column; gap: 12px; padding: 18px 20px; border-radius: 22px; background: oklch(1 0 0 / 0.045); border: 1px solid oklch(1 0 0 / 0.12); cursor: pointer; transition: background 300ms, border-color 300ms, box-shadow 300ms, transform 200ms; backdrop-filter: blur(20px); }
.ptile:hover { transform: translateY(-2px); background: oklch(1 0 0 / 0.08); }
.ptile b { display: block; font-size: 15px; font-weight: 800; line-height: 1.2; } .ptile small { display: block; font-size: 11.5px; font-weight: 600; color: var(--muted); }
.ptbig { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; } .ptbig small { display: inline; font-size: 12px; margin-left: 8px; letter-spacing: 0; }
.ptfoot { display: flex; justify-content: space-between; gap: 10px; font-size: 11.5px; font-weight: 700; color: var(--muted); }
.ptile.list { padding: 16px 18px; }
.npill { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; background: oklch(1 0 0 / 0.06); border: 1px solid oklch(1 0 0 / 0.14); font-size: 13px; font-weight: 700; cursor: pointer; transition: background 300ms, border-color 300ms, box-shadow 300ms; }
.npill.lt { background: var(--fill); border-color: var(--surface-line); }
.npill i { width: 10px; height: 10px; border-radius: 50%; background: var(--tc); }
.nsec { display: flex; gap: 14px; align-items: flex-start; margin-top: 10px; } .nsn { font-size: 12px; font-weight: 800; letter-spacing: 0.08em; padding: 5px 10px; border-radius: 999px; background: var(--accent-tint); color: var(--accent-text); } .nsec h2 { font-size: 22px; font-weight: 800; } .nsec p { font-size: 13px; color: var(--muted); font-weight: 500; margin-top: 3px; max-width: 760px; }
.nldir .nwc, .nldir .nd { }
`;
export const CSS = BASE + SHARED + LOANS;
