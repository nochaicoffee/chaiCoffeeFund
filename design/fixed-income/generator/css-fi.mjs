// Fixed Income's own styles, after the shared base and the pieces the other canvases reuse.
const tok = (n, h, c = 0.09) => `--card-${n}-from: oklch(0.34 ${c} ${h}); --card-${n}-to: oklch(0.17 ${c * 0.6} ${h}); --card-${n}: oklch(0.55 ${c * 1.2} ${h});`;
export const FI = String.raw`
.chai-app { ${tok("gold", 82, 0.1)} ${tok("indigo", 275, 0.11)} ${tok("sky", 232, 0.09)} ${tok("forest", 148, 0.08)} ${tok("rose", 355, 0.1)} ${tok("plum", 325, 0.09)} --gain: oklch(0.42 0.14 145); --loss: oklch(0.55 0.16 25); --gain-tint: oklch(0.94 0.05 150); --loss-tint: oklch(0.95 0.035 30); --paper: oklch(0.975 0.014 90); --paper-line: oklch(0.86 0.025 85); }
.up { color: var(--gain); } .dn { color: var(--loss); }
.r { text-align: right; } .r small, .nm2 small { display: block; font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 2px; }
.nm2 b { font-size: 13.5px; font-weight: 800; display: block; }
.btile { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--on-card, #fff); font-weight: 800; letter-spacing: 0.01em; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.2); }
.tagb { display: inline-flex; padding: 1px 7px; border-radius: 999px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.03em; background: oklch(0.94 0.03 258); color: oklch(0.42 0.1 258); margin-left: 5px; vertical-align: 1px; }
.tagb.warn { background: var(--warning-tint); color: var(--warning-text); } .tagb.gain { background: var(--gain-tint); color: var(--gain); } .tagb.loss { background: var(--loss-tint); color: var(--loss); } .tagb.co { background: oklch(0.94 0.04 325); color: oklch(0.42 0.1 325); } .tagb.gov { background: oklch(0.94 0.04 150); color: oklch(0.38 0.09 150); }
.hrow { display: grid; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--divider); }
.hrow:last-child { border-bottom: 0; }
.hgrp { display: flex; justify-content: space-between; align-items: baseline; padding: 14px 0 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--divider); }
.hgrp b { color: var(--fg); font-size: 12.5px; letter-spacing: 0; text-transform: none; }
.prog { height: 8px; border-radius: 999px; background: var(--fill); overflow: hidden; margin-top: 5px; } .prog > span { display: block; height: 100%; border-radius: inherit; }
.ev { display: grid; grid-template-columns: 54px 1fr auto; gap: 14px; align-items: center; padding: 11px 0; border-bottom: 1px solid var(--divider); } .ev:last-child { border-bottom: 0; }
.ev .dt { text-align: center; line-height: 1.05; border-radius: 12px; padding: 6px 0; background: var(--fill); } .ev .dt b { display: block; font-size: 18px; font-weight: 800; } .ev .dt small { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.ev .nm b { font-size: 13.5px; font-weight: 800; display: block; } .ev .nm small { font-size: 11.5px; font-weight: 600; color: var(--muted); }
.ev .am { text-align: right; } .ev .am b { font-size: 14px; font-weight: 800; display: block; } .ev .am small { font-size: 11px; font-weight: 700; color: var(--muted); }
.pbk { display: grid; grid-template-columns: 10px 1fr auto; border-radius: 16px; overflow: hidden; background: var(--fill); }
.pbk .sp { background: linear-gradient(180deg, var(--c1), var(--c2)); } .pbk .bd { padding: 13px 16px; display: flex; flex-direction: column; gap: 4px; } .pbk .ar { padding: 13px 16px; text-align: right; display: flex; flex-direction: column; gap: 2px; justify-content: center; }
.pbk b.t { font-size: 14px; font-weight: 800; } .pbk small { font-size: 11.5px; font-weight: 600; color: var(--muted); } .pbk .v { font-size: 18px; font-weight: 800; letter-spacing: -0.01em; }
.hv .tt { opacity: 0; pointer-events: none; transition: opacity 140ms; } .hv:hover .tt { opacity: 1; } .hv { cursor: default; } .hv:hover .bar { filter: brightness(1.08); }
.chart-svg { display: block; width: 100%; height: auto; overflow: visible; }
.chart-svg text { font-family: inherit; }
.kv { display: grid; gap: 3px; } .kv .k { font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); } .kv .v { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; } .kv .s { font-size: 12px; font-weight: 600; color: var(--muted); }
.statrow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; } .statrow > div { padding: 14px 16px; border-radius: 16px; background: var(--fill); }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; align-items: stretch; } .two > * { min-width: 0; }
.vsep { border-left: 1px solid var(--divider); padding-left: 28px; }
.heroc { padding: 26px; gap: 20px; }
.cert { position: relative; border-radius: 14px; background: var(--paper); border: 1px solid var(--paper-line); padding: 16px 18px 14px 22px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; color: oklch(0.22 0.02 80); box-shadow: 0 1px 2px oklch(0 0 0 / 0.05), 0 8px 18px oklch(0 0 0 / 0.06); min-height: 190px; }
.cert::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 8px; background: linear-gradient(180deg, var(--c1), var(--c2)); }
.cert::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: repeating-radial-gradient(circle at 115% 130%, oklch(0.5 0.05 85 / 0.08) 0 1px, transparent 1px 7px); }
.cert > * { position: relative; z-index: 1; }
.cert .bk { white-space: nowrap; font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: oklch(0.45 0.04 80); display: flex; justify-content: space-between; gap: 8px; }
.cert .am { font-family: Newsreader, Georgia, serif; font-size: 32px; font-weight: 600; letter-spacing: -0.02em; line-height: 1; }
.cert .am small { font-family: inherit; font-size: 12px; letter-spacing: 0; color: oklch(0.45 0.04 80); font-weight: 500; font-style: italic; display: block; margin-top: 4px; }
.cert .ln { display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 700; color: oklch(0.4 0.03 80); }
.cert .rib { height: 6px; border-radius: 999px; background: oklch(0.88 0.02 85); overflow: hidden; } .cert .rib i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--c2), var(--c1)); }
.stamp { transform: rotate(-4deg); white-space: nowrap; flex-shrink: 0; border: 2px solid currentColor; border-radius: 8px; padding: 2px 9px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.82; }
.stamp.ok { color: oklch(0.45 0.12 150); } .stamp.soon { color: oklch(0.52 0.14 70); } .stamp.due { color: oklch(0.5 0.17 25); } .stamp.lock { color: oklch(0.42 0.1 260); }
.addcert { border-radius: 14px; border: 1.5px dashed var(--fill-strong); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--muted); font-size: 13px; font-weight: 700; min-height: 190px; }
.chip-set { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; background: var(--fill); font-size: 12px; font-weight: 700; color: var(--muted); } .chip-set b { color: var(--fg); }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.hatch { background-image: repeating-linear-gradient(135deg, oklch(1 0 0 / 0.55) 0 3px, transparent 3px 7px); }
.notes { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
`;
