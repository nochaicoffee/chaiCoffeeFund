// Overview's own styles, after the shared base. Everything interactive works with no script: hidden radios, labels and :has().
const tok = (n, h, c = 0.09) => `--card-${n}-from: oklch(0.34 ${c} ${h}); --card-${n}-to: oklch(0.17 ${c * 0.6} ${h}); --card-${n}: oklch(0.55 ${c * 1.2} ${h});`;

const key = (p, k) => `#${p}-${k}:checked`;
/** A pick named p: shows .vw-p-k for the checked key, sets --sel on its label, and recolours the stage. */
export const pick = (p, keys, colours = {}) =>
  `.chai-app .vw-${p} { display: none; }\n` +
  keys.map((k) => `.chai-app:has(${key(p, k)}) .vw-${p}-${k} { display: block; }\n.chai-app:has(${key(p, k)}) .vw-${p}-${k}.vw-flex { display: flex; }\n.chai-app:has(${key(p, k)}) .vw-${p}-${k}.vw-grid { display: grid; }\n.chai-app:has(${key(p, k)}) label[for="${p}-${k}"] { --sel: 1; }` + (colours[k] ? `\n.chai-app:has(${key(p, k)}) { --h1: var(--card-${colours[k]}-from); --h2: var(--card-${colours[k]}-to); --hc: var(--card-${colours[k]}); }` : "")).join("\n") + "\n";

const BASE0 = String.raw`
.chai-app { ${tok("gold", 82, 0.1)} ${tok("indigo", 275, 0.11)} ${tok("sky", 232, 0.09)} ${tok("forest", 148, 0.08)} ${tok("rose", 355, 0.1)} ${tok("plum", 325, 0.09)} --gain: oklch(0.42 0.14 145); --loss: oklch(0.55 0.16 25); --gain-tint: oklch(0.94 0.05 150); --loss-tint: oklch(0.95 0.035 30); --paper: oklch(0.975 0.014 90); --paper-line: oklch(0.86 0.025 85); }
.pgcol { display: flex; flex-direction: column; gap: 20px; }
.g12 { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 20px; align-items: stretch; }
.g12 > * { display: flex; flex-direction: column; min-width: 0; }
.g12 > * > .card { flex: 1 1 auto; }
.pk-in { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
.pkl { cursor: pointer; transition: transform 220ms var(--ease-out, ease), opacity 200ms, box-shadow 220ms, background 200ms; }

/* ---- The greeting that points ---- */
.lede .pt { position: relative; display: inline-block; outline: none; }
.lede .pt > b { cursor: help; border-bottom: 1.5px dotted var(--accent-text); padding-bottom: 1px; transition: background 160ms; border-radius: 4px; }
.lede .pt:hover > b, .lede .pt:focus-visible > b, .lede .pt:focus > b { background: var(--accent-tint); }
.hov:focus > .hc-wrap, .hov:focus-within > .hc-wrap { opacity: 1; transform: none; }
.lede .hc-wrap { font-weight: 500; font-size: 13px; line-height: 1.4; color: var(--fg); }
.lede .hc b { font-weight: 800; }
.hc .t small { font-size: 14px; font-weight: 700; opacity: 0.7; }
.sample-tag { vertical-align: 2px; margin-left: 10px; text-transform: none; letter-spacing: 0; }

/* ---- Small parts ---- */
.up { color: var(--gain); } .dn { color: var(--loss); }
.r { text-align: right; } .r small, .nm2 small { display: block; font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 2px; }
.nm2 b { font-size: 13.5px; font-weight: 800; display: block; white-space: nowrap; }
.btile { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--on-card, #fff); font-weight: 800; letter-spacing: 0.01em; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.2); }
.tagb { display: inline-flex; padding: 1px 7px; border-radius: 999px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.03em; background: oklch(0.94 0.03 258); color: oklch(0.42 0.1 258); margin-left: 5px; vertical-align: 1px; white-space: nowrap; }
.tagb.warn { background: var(--warning-tint); color: var(--warning-text); } .tagb.gain { background: var(--gain-tint); color: var(--gain); } .tagb.loss { background: var(--loss-tint); color: var(--loss); } .tagb.grey { background: var(--fill); color: var(--muted); }
.hrow { display: grid; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--divider); }
.hrow:last-child { border-bottom: 0; }
.prog { height: 8px; border-radius: 999px; background: var(--fill); overflow: hidden; margin-top: 5px; } .prog > span { display: block; height: 100%; border-radius: inherit; }
.ev { display: grid; grid-template-columns: 54px 1fr auto; gap: 14px; align-items: center; padding: 11px 0; border-bottom: 1px solid var(--divider); } .ev:last-child { border-bottom: 0; }
.ev .dt { text-align: center; line-height: 1.05; border-radius: 12px; padding: 6px 0; background: var(--fill); } .ev .dt b { display: block; font-size: 18px; font-weight: 800; } .ev .dt small { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.ev .nm b { font-size: 13.5px; font-weight: 800; display: block; } .ev .nm small { font-size: 11.5px; font-weight: 600; color: var(--muted); }
.ev .am { text-align: right; } .ev .am b { font-size: 14px; font-weight: 800; display: block; } .ev .am small { font-size: 11px; font-weight: 700; color: var(--muted); }
.ev.soft { background: var(--fill); border-radius: 14px; padding: 11px 12px; border-bottom: 0; margin-bottom: 4px; }
.ev.soft .dt { background: var(--surface); }
.notes { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.notice.err { background: var(--loss-tint); color: var(--loss); } .notice.err b, .notice.err .grow { color: var(--loss); }
.notice.ok { background: var(--gain-tint); color: var(--gain); } .notice.ok b, .notice.ok .grow { color: var(--gain); }
.notice.info { background: oklch(0.95 0.025 258); color: oklch(0.4 0.09 258); } .notice.info b, .notice.info .grow { color: oklch(0.34 0.1 258); }
.mini-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 800; white-space: nowrap; background: var(--surface); border: 1px solid var(--surface-line); color: var(--fg); box-shadow: var(--soft-shadow); }
.mini-btn.ok { background: var(--gain-tint); color: var(--gain); border-color: transparent; box-shadow: none; }
.kv { display: grid; gap: 3px; } .kv .k { font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); } .kv .v { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; } .kv .s { font-size: 12px; font-weight: 600; color: var(--muted); }
.statrow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; } .statrow > div { padding: 14px 16px; border-radius: 16px; background: var(--fill); }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.hatch { background-image: repeating-linear-gradient(135deg, oklch(1 0 0 / 0.5) 0 3px, transparent 3px 7px); }

/* ---- A promised payout: one dot, one state ---- */
.pd { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; font-size: 9px; font-weight: 800; font-style: normal; color: #fff; flex-shrink: 0; vertical-align: middle; }
.pd-ok { background: oklch(0.58 0.14 150); } .pd-lp { background: oklch(0.72 0.14 75); color: oklch(0.25 0.06 70); } .pd-ms { background: oklch(0.55 0.17 25); } .pd-wt { background: oklch(0.95 0.05 85); border: 2px dashed oklch(0.72 0.14 75); color: oklch(0.4 0.08 70); } .pd-up { background: transparent; border: 2px dashed var(--fill-strong); color: var(--muted); }
.pds { display: inline-flex; gap: 3px; align-items: center; margin-top: 5px; flex-wrap: wrap; }
.pds .pd { width: 11px; height: 11px; font-size: 0; }
.pds .pd-wt, .pds .pd-up { border-width: 1.5px; }

/* ---- The stage (the hero): takes the colour of the pick ---- */
@property --h1 { syntax: "<color>"; inherits: true; initial-value: oklch(0.32 0.09 258); }
@property --h2 { syntax: "<color>"; inherits: true; initial-value: oklch(0.16 0.05 258); }
@property --hc { syntax: "<color>"; inherits: true; initial-value: oklch(0.48 0.1 258); }
.chai-app { --h1: var(--card-sapphire-from); --h2: var(--card-sapphire-to); --hc: var(--card-sapphire); transition: --h1 520ms ease, --h2 520ms ease, --hc 520ms ease; }
.stg2 { position: relative; isolation: isolate; border-radius: 28px; overflow: hidden; color: #fff; padding: 30px 32px; display: flex; flex-direction: column; gap: 24px; background: radial-gradient(110% 130% at 0% 0%, color-mix(in oklch, var(--h1) 82%, white), transparent 62%), linear-gradient(140deg, var(--h1), var(--h2)); box-shadow: var(--card-shadow); }
.stg2::after { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; background: repeating-radial-gradient(circle at calc(100% + 10px) calc(100% + 18px), oklch(1 0 0 / 0.1) 0 1px, transparent 1px 15px); }
.stg2 svg text { font-family: inherit; }
.s-grid { display: grid; grid-template-columns: 5fr 7fr; gap: 36px; align-items: stretch; }
.s-grid > * { min-width: 0; }
.s-eb { display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.8; }
.s-name { margin: 8px 0 0; font-size: 26px; font-weight: 800; letter-spacing: -0.01em; }
.s-big { font-size: 66px; font-weight: 800; letter-spacing: -0.035em; line-height: 1; margin-top: 10px; }
.s-big small { font-size: 28px; font-weight: 700; margin-right: 3px; opacity: 0.75; letter-spacing: 0; }
.s-sub { font-size: 14px; font-weight: 600; opacity: 0.82; margin-top: 8px; }
.s-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.s-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; background: oklch(1 0 0 / 0.16); font-size: 12px; font-weight: 700; } .s-chip b { font-weight: 800; }
.s-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
.s-tile { padding: 12px 14px; border-radius: 16px; background: oklch(1 0 0 / 0.13); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.14); }
.s-tile .k { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.72; }
.s-tile .v { font-size: 21px; font-weight: 800; letter-spacing: -0.01em; margin-top: 3px; }
.s-tile .s { font-size: 11.5px; font-weight: 600; opacity: 0.72; margin-top: 1px; }
.s-acts { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
.s-act { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; background: oklch(1 0 0 / 0.18); font-size: 12.5px; font-weight: 700; } .s-act.solid { background: #fff; color: oklch(0.2 0.02 260); }
.s-ct { font-size: 13px; font-weight: 800; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 8px; } .s-ct small { font-size: 11.5px; font-weight: 600; opacity: 0.75; }
.s-note { font-size: 12px; font-weight: 500; opacity: 0.78; line-height: 1.5; margin-top: 8px; }
.s-chart { background: oklch(1 0 0 / 0.08); border-radius: 20px; padding: 18px; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.1); }
.chip-b { cursor: pointer; display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 999px; font-size: 13.5px; font-weight: 800; box-shadow: 0 0 0 calc(var(--sel, 0) * 2px) #fff; background: color-mix(in oklch, #fff calc(14% + var(--sel, 0) * 70%), transparent); color: color-mix(in oklch, #fff calc(100% - var(--sel, 0) * 100%), oklch(0.2 0.03 260)); transition: all 200ms; }
.chip-b small { font-size: 11px; font-weight: 700; opacity: 0.7; }
.on-stage-hint { font-size: 12px; font-weight: 600; opacity: 0.75; display: inline-flex; align-items: center; gap: 6px; }
/* a dot on the stage */
.stg2 .pd-ok { background: #fff; color: oklch(0.35 0.12 150); } .stg2 .pd-lp { background: oklch(0.82 0.15 85); color: oklch(0.3 0.08 70); } .stg2 .pd-ms { background: oklch(0.62 0.2 25); border: 2px solid #fff; } .stg2 .pd-wt { background: oklch(1 0 0 / 0.12); border: 2px dashed oklch(0.85 0.14 85); color: oklch(0.92 0.1 85); } .stg2 .pd-up { border: 2px dashed oklch(1 0 0 / 0.5); color: oklch(1 0 0 / 0.7); }
`;
