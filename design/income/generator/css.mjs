// One stylesheet for every Income artboard: the shared base (css-base.mjs) plus Income's own pieces.
import { CSS as BASE, FONT_LINK } from "./css-base.mjs";
export { FONT_LINK };

const INCOME = String.raw`
/* ===================== Income additions ===================== */
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

/* Pay rhythm */
.rhy { display: grid; grid-template-columns: 130px 1fr 96px; gap: 14px; align-items: center; padding: 9px 0; }
.rhy .rt-axis { position: relative; height: 26px; }
.rhy .band { position: absolute; top: 3px; bottom: 3px; left: 0; border-radius: 8px; background: var(--accent-tint); opacity: 0.8; }
.rhy .base { position: absolute; left: 0; right: 0; top: 50%; border-top: 1px solid var(--divider); }
.rdot { position: absolute; top: 50%; width: 11px; height: 11px; border-radius: 50%; transform: translate(-50%, -50%); background: var(--c); box-shadow: 0 0 0 2px var(--surface); }
.rdot.late { box-shadow: 0 0 0 2px var(--surface), 0 0 0 3.5px oklch(0.72 0.14 75); }
.rdot.pend { width: 13px; height: 13px; background: var(--warning-tint); border: 2px dashed oklch(0.72 0.14 75); box-shadow: none; animation: due-pulse 2.2s ease-in-out infinite; }
.rhy-ticks { display: grid; grid-template-columns: 130px 1fr 96px; gap: 14px; }
.rhy-ticks > div { position: relative; height: 16px; font-size: 10px; font-weight: 700; color: var(--muted); }
.rhy-ticks span { position: absolute; transform: translateX(-50%); }

/* Pay calendar */
.pcal { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.pcal .dh { font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); text-align: center; padding-bottom: 2px; }
.pcal .dc { position: relative; min-height: 64px; border-radius: 12px; background: var(--fill); padding: 6px 7px; display: flex; flex-direction: column; gap: 3px; }
.pcal .dc.out { background: transparent; border: 1px dashed var(--divider); }
.pcal .dc.out .n { color: var(--muted); opacity: 0.6; }
.pcal .dc.today { box-shadow: inset 0 0 0 2px var(--ink); background: var(--surface); }
.pcal .dc .n { font-size: 11px; font-weight: 800; color: var(--muted); }
.pcal .dc.has { background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--soft-shadow); }
.pcal .chip2 { display: flex; align-items: center; gap: 5px; padding: 2px 7px; border-radius: 7px; font-size: 10.5px; font-weight: 800; color: var(--on-card); white-space: nowrap; overflow: hidden; }
.pcal .chip2.pend { background: var(--warning-tint) !important; color: var(--warning-text); border: 1.5px dashed oklch(0.72 0.14 75); }
.pcal .chip2.soon { background: oklch(1 0 0) !important; color: var(--fg); border: 1.5px dashed var(--c); }

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

/* Matrix (E2) */
.mx { display: grid; gap: 8px; align-items: stretch; }
.mx .mh { font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); text-align: center; align-self: end; padding-bottom: 4px; }
.mx .mh.now { color: var(--fg); }
.mx .mc { position: relative; border-radius: 12px; min-height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; gap: 1px; }
.mx .mc small { font-size: 10px; font-weight: 700; opacity: 0.85; }
.mx .mc.none { background: repeating-linear-gradient(135deg, var(--heat-no-data) 0 6px, transparent 6px 12px); color: var(--muted); font-weight: 700; }
.mx .mc.late { box-shadow: inset 0 0 0 2px oklch(0.72 0.14 75); }
.mx .mc.pend { background: repeating-linear-gradient(135deg, oklch(0.9 0.08 85) 0 5px, oklch(0.96 0.04 85) 5px 10px); border: 1.5px dashed oklch(0.72 0.14 75); color: var(--warning-text); }
.mx .mc.soon { border: 1.5px dashed var(--c); color: var(--fg); background: color-mix(in oklch, var(--c) 8%, transparent); }
.mx .mc.sel { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--ink); }
.mx .rl { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 800; min-width: 0; }
.mx .rl small { display: block; font-size: 11px; font-weight: 600; color: var(--muted); }
.mx .rt2 { text-align: right; font-size: 13px; font-weight: 800; align-self: center; }

/* Timeline (E3) */
.tl { position: relative; padding-left: 28px; }
.tl::before { content: ""; position: absolute; left: 9px; top: 8px; bottom: 8px; width: 2px; background: var(--divider); }
.tl .it { position: relative; display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; padding: 12px 0; }
.tl .it::before { content: ""; position: absolute; left: -26px; top: 50%; width: 12px; height: 12px; margin-top: -6px; border-radius: 50%; background: var(--c, var(--positive)); box-shadow: 0 0 0 4px var(--surface); }
.tl .it.pend::before { background: var(--warning-tint); border: 2px dashed oklch(0.72 0.14 75); }
.tl .it.soon::before { background: var(--surface); border: 2px dashed var(--c); }
.tl .it .mo { position: absolute; left: -28px; top: -2px; font-size: 10px; }
.srcpick { display: flex; flex-direction: column; gap: 6px; }
.srcpick .sp { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 16px; border: 1.5px solid transparent; }
.srcpick .sp.on { background: var(--surface); border-color: var(--c); box-shadow: var(--soft-shadow); }
.srcpick .sp b { display: block; font-size: 13px; font-weight: 800; } .srcpick .sp small { font-size: 11.5px; font-weight: 600; color: var(--muted); }

/* Dialog helpers for the forms board */
.sw { display: inline-flex; gap: 8px; }
.sw i { width: 26px; height: 26px; border-radius: 9px; display: inline-block; }
.sw i.on { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--ink); }
`;
export const CSS = BASE + INCOME;
