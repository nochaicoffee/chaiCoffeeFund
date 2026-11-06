// Lent out's own styles, after the shared base. Everything interactive works with no script: hidden radios, labels and :has().
import { CROWD } from "./data.mjs";
const tok = (n, h, c = 0.09) => `--card-${n}-from: oklch(0.34 ${c} ${h}); --card-${n}-to: oklch(0.17 ${c * 0.6} ${h}); --card-${n}: oklch(0.55 ${c * 1.2} ${h});`;

const key = (p, k) => `#${p}-${k}:checked`;
/** A pick named p: shows .vw-p-k for the checked key, sets --sel on its label, and recolours the stage. */
export const pick = (p, keys, colours = {}) =>
  `.chai-app .vw-${p} { display: none; }\n` +
  keys.map((k) => `.chai-app:has(${key(p, k)}) .vw-${p}-${k} { display: block; }\n.chai-app:has(${key(p, k)}) .vw-${p}-${k}.vw-flex { display: flex; }\n.chai-app:has(${key(p, k)}) .vw-${p}-${k}.vw-grid { display: grid; }\n.chai-app:has(${key(p, k)}) label[for="${p}-${k}"] { --sel: 1; }` + (colours[k] ? `\n.chai-app:has(${key(p, k)}) { --h1: var(--card-${colours[k]}-from); --h2: var(--card-${colours[k]}-to); --hc: var(--card-${colours[k]}); }` : "")).join("\n") + "\n";

export const L1_KEYS = ["all", "a", "b", "c"];
export const pickScoped = (p, keys, colours, scope) =>
  `.chai-app .vw-${p} { display: none; }\n` +
  keys.map((k) => `.chai-app:has(${key(p, k)}) .vw-${p}-${k} { display: block; }\n.chai-app:has(${key(p, k)}) .vw-${p}-${k}.vw-flex { display: flex; }\n.chai-app:has(${key(p, k)}) label[for="${p}-${k}"] { --sel: 1; }` + (colours[k] ? `\n.chai-app:has(${key(p, k)}) ${scope} { --h1: var(--card-${colours[k]}-from); --h2: var(--card-${colours[k]}-to); --hc: var(--card-${colours[k]}); }` : "")).join("\n") + "\n";
export const L1_COL = { all: "sapphire", a: "copper", b: "teal", c: "violet" };
export const L2_KEYS = ["day", "month", "year", "ever"];
export const L2_COL = { day: "gold", month: "teal", year: "indigo", ever: "forest" };
export const L3_KEYS = ["all", "a", "b", "c", ...CROWD.map((x) => x.id)];
export const L3_COL = { ...L1_COL, ...Object.fromEntries(CROWD.map((x) => [x.id, x.color])) };
export const MONTHS12 = ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"];
export const L4_KEYS = ["all", ...MONTHS12];
// A month's colour is its verdict: all arrived on time, one arrived late, one never came, or one is waiting.
export const L4_COL = { all: "indigo", "2025-12": "forest", "2026-01": "forest", "2026-02": "ruby", "2026-03": "gold", "2026-04": "forest", "2026-05": "forest", "2026-06": "forest", "2026-07": "forest", "2026-08": "forest", "2026-09": "forest", "2026-10": "forest", "2026-11": "gold" };

const LENT0 = String.raw`
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

/* ---- L1 Promise ledger ---- */
.pcards { display: flex; flex-direction: column; gap: 12px; }
.pcard { position: relative; border-radius: 22px; padding: 16px 18px; display: flex; flex-direction: column; gap: 11px; background: color-mix(in oklch, #fff calc(10% + var(--sel, 0) * 24%), transparent); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.14), 0 0 0 calc(var(--sel, 0) * 2px) #fff; transform: translateX(calc(var(--sel, 0) * 6px)); }
.pcard:hover { background: color-mix(in oklch, #fff calc(18% + var(--sel, 0) * 16%), transparent); }
.pc-h { display: flex; align-items: center; gap: 12px; }
.pc-h .tl { min-width: 0; flex: 1; } .pc-h b { display: block; font-size: 15px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .pc-h small { display: block; font-size: 11.5px; font-weight: 600; opacity: 0.78; margin-top: 1px; white-space: nowrap; }
.pc-h .am { text-align: right; } .pc-h .am b { font-size: 20px; letter-spacing: -0.01em; } .pc-h .am small { font-size: 10.5px; }
.meter { display: flex; height: 12px; border-radius: 999px; overflow: hidden; gap: 2px; background: oklch(0 0 0 / 0.14); }
.meter > i { display: block; height: 100%; min-width: 3px; }
.meter .m-p { background: #fff; } .meter .m-r { background: oklch(1 0 0 / 0.55); } .meter .m-o { background: repeating-linear-gradient(135deg, oklch(0.88 0.14 85) 0 4px, oklch(0.74 0.15 75) 4px 8px); } .meter .m-x { background: repeating-linear-gradient(135deg, oklch(0.7 0.19 25) 0 4px, oklch(0.55 0.19 25) 4px 8px); }
.mleg { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 11px; font-weight: 700; opacity: 0.9; } .mleg span { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; } .mleg i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; } .mleg b { font-weight: 800; }
.mtl { display: flex; align-items: center; gap: 4px; flex-wrap: nowrap; }
.mtl .lbl2 { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.7; margin-right: 6px; white-space: nowrap; }
.mtl .pd { width: 18px; height: 18px; font-size: 10px; }
.ramp { display: block; width: 100%; height: 30px; }
.ledger { background: oklch(1 0 0 / 0.1); border-radius: 20px; padding: 6px 18px; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.1); }
.lrow { display: grid; grid-template-columns: 26px 56px minmax(0, 1fr) auto auto; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid oklch(1 0 0 / 0.12); font-size: 12.5px; font-weight: 700; } .lrow:last-child { border-bottom: 0; }
.lrow .d { font-weight: 800; } .lrow .w { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.78; font-weight: 600; font-size: 12px; } .lrow .a { text-align: right; font-weight: 800; min-width: 60px; } .lrow .st { font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 999px; background: oklch(1 0 0 / 0.16); white-space: nowrap; }
.lrow .st.ms { background: oklch(0.6 0.2 25); } .lrow .st.lp, .lrow .st.wt { background: oklch(0.82 0.15 85); color: oklch(0.3 0.08 70); } .lrow.fut { opacity: 0.62; }
.lrow.h { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.7; padding: 10px 0 6px; }

/* ---- L2 Interest clock ---- */
.dialw { position: relative; display: flex; align-items: center; justify-content: center; }
.dial-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; }
.dial-c .k { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.75; }
.dial-c .v { font-size: 50px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; margin-top: 4px; } .dial-c .v small { font-size: var(--sm, 22px); font-weight: 700; opacity: 0.75; margin-right: 2px; letter-spacing: 0; }
.dial-c .s { font-size: 12.5px; font-weight: 600; opacity: 0.78; margin-top: 4px; }
@keyframes sweep { to { transform: rotate(360deg); } }
.hand { transform-origin: 180px 180px; animation: sweep 60s linear infinite; }
@media (prefers-reduced-motion: reduce) { .hand { animation: none; } }
.lrows { display: grid; gap: 8px; }
.lr2 { display: grid; grid-template-columns: 30px 1fr auto; gap: 4px 12px; align-items: center; padding: 11px 14px; border-radius: 16px; background: oklch(1 0 0 / 0.12); }
.lr2 b { font-size: 13.5px; font-weight: 800; display: block; } .lr2 small { font-size: 11.5px; font-weight: 600; opacity: 0.78; } .lr2 .am { text-align: right; font-weight: 800; font-size: 15px; } .lr2 .am small { display: block; }
.lr2 .bar { grid-column: 2 / -1; height: 5px; border-radius: 999px; background: oklch(1 0 0 / 0.18); overflow: hidden; } .lr2 .bar i { display: block; height: 100%; border-radius: inherit; background: #fff; }
.lr2 .btile, .pcard .btile { border-radius: 10px; }
.potrow { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pot { border-radius: 18px; padding: 14px 16px; background: oklch(1 0 0 / 0.12); display: flex; flex-direction: column; gap: 3px; }
.pot .k { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.75; } .pot .v { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; } .pot .s { font-size: 11.5px; font-weight: 600; opacity: 0.78; }

/* ---- L3 Who owes what ---- */
.owe { display: grid; grid-template-columns: 1.7fr 1fr; grid-template-rows: 1fr 1fr; gap: 10px; height: 480px; }
.oblk { position: relative; isolation: isolate; overflow: hidden; border-radius: 22px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; background: color-mix(in oklch, var(--bc) calc(55% + var(--sel, 0) * 35%), oklch(0.2 0.02 260)); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.18), 0 0 0 calc(var(--sel, 0) * 3px) #fff, 0 6px 16px oklch(0 0 0 / 0.18); color: #fff; }
.oblk::after { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; background: repeating-radial-gradient(circle at calc(100% + 10px) calc(100% + 18px), oklch(0 0 0 / 0.14) 0 1px, transparent 1px 15px); }
.oblk:hover { transform: translateY(-3px); }
.oblk .on { display: flex; align-items: center; gap: 10px; font-size: 15px; padding-right: 54px; min-width: 0; font-weight: 800; } .oblk .on small { display: block; font-size: 11.5px; font-weight: 600; opacity: 0.78; }
.oblk .ov { font-size: 34px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; } .oblk .ov small { font-size: 15px; font-weight: 700; opacity: 0.75; margin-right: 2px; }
.oblk .op { position: absolute; top: 16px; right: 18px; font-size: 18px; font-weight: 800; opacity: 0.9; letter-spacing: -0.01em; }
.oblk .os { font-size: 12px; font-weight: 600; opacity: 0.82; }
.oblk.big { grid-row: 1 / span 2; }
.oblk.small .ov { font-size: 26px; }
.oblk .meter { background: oklch(0 0 0 / 0.2); }
.without { display: grid; gap: 8px; }
.wbar { position: relative; height: 38px; border-radius: 12px; background: oklch(1 0 0 / 0.1); overflow: hidden; display: flex; }
.wbar > i { display: flex; align-items: center; padding: 0 12px; font-style: normal; font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; }
.wbar .keep { background: #fff; color: oklch(0.25 0.04 260); } .wbar .gone { background: repeating-linear-gradient(135deg, oklch(1 0 0 / 0.38) 0 4px, oklch(1 0 0 / 0.14) 4px 8px); }
.wlab { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; opacity: 0.85; }
.wrow { display: grid; grid-template-columns: 30px 1fr auto auto; gap: 12px; align-items: center; padding: 11px 14px; border-radius: 16px; background: oklch(1 0 0 / 0.12); } .wrow b { font-size: 13.5px; font-weight: 800; display: block; } .wrow small { font-size: 11.5px; font-weight: 600; opacity: 0.78; } .wrow .am { text-align: right; font-weight: 800; font-size: 15px; } .wrow .am small { display: block; }
.wrow .pc { font-size: 12px; font-weight: 800; padding: 3px 10px; border-radius: 999px; background: oklch(1 0 0 / 0.16); }

/* ---- L4 Year of promises ---- */
.yr { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 8px; }
.ycol { position: relative; border-radius: 18px; padding: 10px 8px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; min-height: 148px; background: color-mix(in oklch, #fff calc(9% + var(--sel, 0) * 26%), transparent); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.12), 0 0 0 calc(var(--sel, 0) * 2px) #fff; transform: translateY(calc(var(--sel, 0) * -6px)); }
.ycol:hover { background: color-mix(in oklch, #fff calc(16% + var(--sel, 0) * 18%), transparent); }
.ycol .mn { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; text-align: center; line-height: 1.1; } .ycol .mn small { display: block; font-size: 9.5px; opacity: 0.7; letter-spacing: 0.04em; }
.ycol .chipv { width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 4px; border-radius: 12px; font-size: 11.5px; font-weight: 800; background: oklch(1 0 0 / 0.14); white-space: nowrap; }
.ycol .chipv.ok { background: oklch(1 0 0 / 0.9); color: oklch(0.3 0.1 150); } .ycol .chipv.lp { background: oklch(0.82 0.15 85); color: oklch(0.3 0.08 70); } .ycol .chipv.ms { background: oklch(0.58 0.2 25); border: 1.5px solid #fff; } .ycol .chipv.wt { background: oklch(1 0 0 / 0.1); border: 2px dashed oklch(0.85 0.14 85); color: oklch(0.93 0.1 85); }
.ycol .chipv.none { background: transparent; border: 1.5px dashed oklch(1 0 0 / 0.22); opacity: 0.55; font-weight: 700; }
.ycol .vd { margin-top: auto; font-size: 10.5px; font-weight: 800; opacity: 0.9; text-align: center; line-height: 1.2; }
.ycol.now::before { content: "today"; position: absolute; top: -9px; left: 50%; transform: translateX(-50%); font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; padding: 1px 8px; border-radius: 999px; background: #fff; color: oklch(0.25 0.04 260); }
.rampbox { background: oklch(1 0 0 / 0.08); border-radius: 20px; overflow: hidden; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.1); position: relative; }
.rampbox .rl { position: absolute; left: 18px; top: 10px; font-size: 12px; font-weight: 800; } .rampbox .rl small { font-weight: 600; opacity: 0.75; margin-left: 6px; }

/* ---- The page: the L3 hero, the clock as its own widget, the static pick ---- */
.vw-on { display: block !important; } .vw-on.vw-grid { display: grid !important; }
.clk { --h1: var(--card-gold-from); --h2: var(--card-gold-to); --hc: var(--card-gold); transition: --h1 520ms ease, --h2 520ms ease, --hc 520ms ease; }
.g12 > * > .stg2 { flex: 1 1 auto; }
.clk-card { padding: 26px 28px; }
.dialw svg { display: block; width: 100%; max-width: 360px; height: auto; }
 .clk-ph .dial-c .s { font-size: 11px; } .clk-ph .dialw svg { max-width: 300px; } .clk-ph .dial-c { max-width: 300px; margin: 0 auto; }
.oflag { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; padding: 3px 10px; border-radius: 999px; background: oklch(0.82 0.15 85); color: oklch(0.3 0.08 70); font-size: 11px; font-weight: 800; }
.meter .m-b { background: transparent; box-shadow: inset 0 0 0 1.5px oklch(1 0 0 / 0.7); }
.owe.n2 { grid-template-rows: 1fr; } .owe.n2 .oblk.big { grid-row: 1; } .owe.n2 .oblk.tall { grid-row: 1; }
.owe.n1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
.ghostb { display: flex; align-items: center; gap: 12px; margin-top: 10px; padding: 11px 16px; border-radius: 16px; border: 1.5px dashed oklch(1 0 0 / 0.35); font-size: 12.5px; font-weight: 700; opacity: 0.85; } .ghostb b { font-weight: 800; } .ghostb small { opacity: 0.8; font-weight: 600; }
.oscrollw { position: relative; height: 480px; } .oscrollw::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 56px; border-radius: 0 0 22px 22px; pointer-events: none; background: linear-gradient(180deg, transparent, color-mix(in oklch, var(--h2) 82%, transparent)); }
.oscroll { height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px; }
.orow { position: relative; display: grid; grid-template-columns: 30px minmax(0, 1.1fr) minmax(0, 1fr) auto 46px; gap: 12px; align-items: center; padding: 8px 14px; border-radius: 16px; flex-shrink: 0; min-height: 50px; background: color-mix(in oklch, #fff calc(9% + var(--sel, 0) * 24%), transparent); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.12), 0 0 0 calc(var(--sel, 0) * 2px) #fff; }
.orow:hover { background: color-mix(in oklch, #fff 18%, transparent); }
.orow b { font-size: 13px; font-weight: 800; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .orow small { font-size: 11px; font-weight: 600; opacity: 0.78; display: block; white-space: nowrap; }
.orow .obar { height: 8px; border-radius: 999px; background: oklch(0 0 0 / 0.2); overflow: hidden; } .orow .obar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, color-mix(in oklch, var(--bc) 60%, white), #fff); }
.orow .ov2 { font-size: 14px; font-weight: 800; text-align: right; white-space: nowrap; } .orow .op2 { font-size: 12px; font-weight: 800; text-align: right; opacity: 0.9; }
.orow.gone { opacity: 0.55; } .orow.gone .obar { display: none; }
.scrollhint { font-size: 11.5px; font-weight: 700; opacity: 0.8; display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; }

/* ---- Forms, sheets, states ---- */
.tsheet { background: var(--surface); border-radius: 26px 26px 0 0; padding: 12px 16px 20px; box-shadow: 0 -14px 40px oklch(0 0 0 / 0.22); display: flex; flex-direction: column; gap: 12px; color: var(--fg); } .grab { width: 40px; height: 4px; border-radius: 2px; background: var(--fill-strong); align-self: center; }
.toast { display: inline-flex; align-items: center; gap: 8px; align-self: center; padding: 12px 18px; border-radius: 999px; background: var(--ink); color: var(--on-ink); font-size: 13px; font-weight: 700; margin-top: 4px; }
.ico { width: 46px; height: 46px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; color: #fff; }
.empk { border-radius: 22px; padding: 26px; display: flex; flex-direction: column; gap: 12px; color: #fff; align-items: flex-start; }
.empk p { margin: 0; font-size: 13.5px; font-weight: 500; opacity: 0.88; line-height: 1.55; max-width: 560px; }
.sw { display: inline-flex; gap: 8px; } .sw i { width: 26px; height: 26px; border-radius: 9px; display: inline-block; } .sw i.on { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--ink); }
.lcalc { display: grid; gap: 6px; font-size: 12.5px; font-weight: 600; } .lcalc .between span:first-child { color: var(--muted); } .lcalc b { font-weight: 800; }
.formgrid { display: flex; flex-direction: column; gap: 30px; align-items: stretch; padding: 20px 0; }
.dlg.sm .dlg-b { grid-template-columns: 300px 1fr; }
.pill-mode { display: inline-flex; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 800; background: var(--fill); color: var(--muted); }
.srch { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px; border-radius: 999px; background: var(--fill); font-size: 12.5px; font-weight: 600; color: var(--muted); min-width: 220px; }
.hgrp { display: flex; justify-content: space-between; align-items: baseline; padding: 14px 0 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--divider); } .hgrp b { color: var(--fg); font-size: 12.5px; letter-spacing: 0; text-transform: none; }
.hrow.rep { opacity: 0.62; }
.hrow.hl { background: var(--warning-tint); border-radius: 14px; padding-left: 12px; padding-right: 12px; margin: 0 -12px; }

/* ---- On a phone ---- */
.ph .stg2 { padding: 18px 16px; gap: 14px; border-radius: 24px; } .ph .s-big { font-size: 46px; } .ph .s-name { font-size: 20px; } .ph .s-tile .v { font-size: 17px; } .ph .s-grid { grid-template-columns: 1fr !important; gap: 16px !important; } .ph .hhead small { display: none; } .ph .wlab, .ph .s-note { font-size: 11px; }
.ph .notes { grid-template-columns: 1fr; } .ph .notice { flex-wrap: wrap; } .ph .notice .grow { flex: 1 1 200px; }
.ph .owe { height: auto; grid-template-columns: 1fr; grid-template-rows: auto; } .ph .oblk { padding: 14px; min-height: 170px; } .ph .oblk.big { grid-column: 1; grid-row: auto; min-height: 300px; } .ph .owe.n2 .oblk.tall { grid-row: auto; } .ph .wbar > i { font-size: 11px; padding: 0 8px; } .ph .chead small { display: none; } .ph .oblk .ov { font-size: 26px; } .ph .oblk.small .ov { font-size: 20px; } .ph .oscrollw { height: 380px; } .ph .orow { grid-template-columns: 26px minmax(0, 1fr) auto 40px; gap: 8px; padding: 7px 10px; } .ph .orow .obar { display: none; } .ph .wrow { grid-template-columns: 26px 1fr auto auto; gap: 8px; padding: 9px 10px; }
.ph .pcard { padding: 14px; } .ph .pc-h small { white-space: normal; } .ph .mtl { flex-wrap: wrap; row-gap: 6px; gap: 3px; } .ph .mtl .lbl2 { flex-basis: 100%; } .ph .mtl .pd { width: 16px; height: 16px; font-size: 9px; } .ph .mtl i[style] { width: 12px !important; } .ph .pc-h .am b { font-size: 17px; }
.ph .lrow { grid-template-columns: 22px 62px 1fr auto; gap: 8px; } .ph .lrow .st { display: none; }
.ph .ledger { padding: 4px 12px; }
.pph-row { display: grid; grid-template-columns: auto 1fr auto; gap: 4px 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--divider); } .pph-row:last-child { border-bottom: 0; }
.pph-row .full { grid-column: 1 / -1; font-size: 11.5px; font-weight: 600; color: var(--muted); }
.ph .ev { grid-template-columns: 46px 1fr auto; gap: 12px; }
`;

export const LENT = LENT0 + pick("p", L3_KEYS, L3_COL) + pickScoped("e", L2_KEYS, L2_COL, ".clk") + pick("m", L4_KEYS, L4_COL);
