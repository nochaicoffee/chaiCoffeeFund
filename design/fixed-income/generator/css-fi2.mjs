// Round 2: coloured stages that take on the colour of what you pick. Everything works with no script: hidden radios, labels and :has().
import * as D from "./data-sample.mjs";
const key = (p, k) => `#${p}-${k}:checked`;
/** A pick named p: shows .vw-p-k for the checked key, sets --sel on its label, and (optionally) recolours the whole board. */
export const pick = (p, keys, colours = {}) =>
  `.chai-app .vw-${p} { display: none; }\n` +
  keys.map((k) => `.chai-app:has(${key(p, k)}) .vw-${p}-${k} { display: block; }\n.chai-app:has(${key(p, k)}) .vw-${p}-${k}.s-grid { display: grid; }\n.chai-app:has(${key(p, k)}) label[for="${p}-${k}"] { --sel: 1; }` + (colours[k] ? `\n.chai-app:has(${key(p, k)}) { --h1: var(--card-${colours[k]}-from); --h2: var(--card-${colours[k]}-to); --hc: var(--card-${colours[k]}); }` : "")).join("\n") + "\n";
const col = (x) => D.BANKS[x.bank].color;
export const IDS = D.HELD.map((x) => x.id);
export const A_KEYS = ["all", ...IDS];
export const A_COL = Object.fromEntries([["all", "emerald"], ...D.HELD.map((x) => [x.id, col(x)])]);
export const B_KEYS = ["all", ...Object.keys(D.BANKS)];
export const B_COL = Object.fromEntries([["all", "emerald"], ...Object.entries(D.BANKS).map(([k, b]) => [k, b.color])]);
export const C_KEYS = ["all", ...IDS, "p1", "p2"];
export const C_COL = Object.fromEntries([["all", "emerald"], ...D.HELD.map((x) => [x.id, col(x)]), ["p1", "teal"], ["p2", "forest"]]);
export const E_KEYS = ["day", "month", "fy", "ever"];
export const E_COL = { day: "gold", month: "teal", fy: "indigo", ever: "forest" };

export const FI2 = String.raw`
@property --h1 { syntax: "<color>"; inherits: true; initial-value: oklch(0.42 0.11 155); }
@property --h2 { syntax: "<color>"; inherits: true; initial-value: oklch(0.24 0.07 162); }
@property --hc { syntax: "<color>"; inherits: true; initial-value: oklch(0.6 0.12 153); }
.chai-app { --h1: var(--card-emerald-from); --h2: var(--card-emerald-to); --hc: var(--card-emerald); transition: --h1 520ms ease, --h2 520ms ease, --hc 520ms ease; }
${pick("a", A_KEYS, A_COL)}${pick("b", B_KEYS, B_COL)}${pick("c", C_KEYS, C_COL)}${pick("e", E_KEYS, E_COL)}
.chai-app:has(#e-day:checked) { }
.pkl { cursor: pointer; transition: transform 220ms var(--ease-out, ease), opacity 200ms, box-shadow 220ms; }
.stg2 { position: relative; isolation: isolate; border-radius: 28px; overflow: hidden; color: #fff; padding: 30px 32px; display: flex; flex-direction: column; gap: 24px; background: radial-gradient(110% 130% at 0% 0%, color-mix(in oklch, var(--h1) 82%, white), transparent 62%), linear-gradient(140deg, var(--h1), var(--h2)); box-shadow: var(--card-shadow); }
.stg2::after { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; background: repeating-radial-gradient(circle at calc(100% + 10px) calc(100% + 18px), oklch(1 0 0 / 0.1) 0 1px, transparent 1px 15px); }
.stg2 svg text { font-family: inherit; }
.s-grid { display: grid; grid-template-columns: 5fr 7fr; gap: 36px; align-items: stretch; }
.s-grid > * { min-width: 0; }
.s-eb { display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.8; }
.s-name { margin: 8px 0 0; font-size: 26px; font-weight: 800; letter-spacing: -0.01em; }
.s-big { font-size: 72px; font-weight: 800; letter-spacing: -0.035em; line-height: 1; margin-top: 10px; }
.s-big small { font-size: 28px; font-weight: 700; margin-right: 3px; opacity: 0.75; }
.s-sub { font-size: 14px; font-weight: 600; opacity: 0.82; margin-top: 8px; }
.s-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.s-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; background: oklch(1 0 0 / 0.16); font-size: 12px; font-weight: 700; }
.s-chip b { font-weight: 800; }
.s-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
.s-tile { padding: 12px 14px; border-radius: 16px; background: oklch(1 0 0 / 0.13); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.14); }
.s-tile .k { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.72; }
.s-tile .v { font-size: 21px; font-weight: 800; letter-spacing: -0.01em; margin-top: 3px; }
.s-tile .s { font-size: 11.5px; font-weight: 600; opacity: 0.72; margin-top: 1px; }
.s-acts { display: flex; gap: 8px; margin-top: 16px; }
.s-act { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; background: oklch(1 0 0 / 0.18); font-size: 12.5px; font-weight: 700; } .s-act.solid { background: #fff; color: oklch(0.2 0.02 260); }
.s-ct { font-size: 13px; font-weight: 800; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 8px; } .s-ct small { font-size: 11.5px; font-weight: 600; opacity: 0.75; }
.s-note { font-size: 12px; font-weight: 500; opacity: 0.75; line-height: 1.5; margin-top: 8px; }
.s-chart { background: oklch(1 0 0 / 0.08); border-radius: 20px; padding: 18px 18px 12px; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.1); }
.ladder { display: flex; align-items: stretch; gap: 4px; padding-top: 6px; }
.ladder .allb { flex: 0 0 auto; align-self: stretch; display: flex; flex-direction: column; justify-content: center; gap: 4px; padding: 10px 16px; border-radius: 16px; background: oklch(1 0 0 / 0.16); font-size: 12.5px; font-weight: 800; margin-right: 8px; opacity: calc(0.6 + 0.4 * var(--sel, 0)); box-shadow: 0 0 0 calc(var(--sel, 0) * 2px) #fff; } .ladder .allb small { font-size: 11px; font-weight: 600; opacity: 0.8; }
.rung, .rung-e { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; position: relative; }
.rb { height: 110px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
.rl { font-size: 10px; font-weight: 800; opacity: 0.75; text-align: center; margin-top: 6px; line-height: 1.15; height: 24px; }
.rung b { font-size: 10.5px; font-weight: 800; margin-bottom: 4px; white-space: nowrap; opacity: calc(0.55 + 0.45 * var(--sel, 0)); }
.rung i { display: block; width: 78%; border-radius: 7px 7px 3px 3px; background: oklch(1 0 0 / 0.4); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.4); transition: background 200ms, transform 200ms; }
.rung:hover i { background: oklch(1 0 0 / 0.7); }
.rung { --sel: 0; } .rung i { background: color-mix(in oklch, #fff calc(40% + var(--sel, 0) * 60%), transparent); }
.rung-e i { height: 3px; width: 40%; border-radius: 3px; background: oklch(1 0 0 / 0.2); }
.lax { display: flex; gap: 4px; padding-left: 0; font-size: 10px; font-weight: 800; opacity: 0.72; text-align: center; margin-top: 6px; } .lax span { flex: 1 1 0; min-width: 0; } .lax .gap0 { flex: 0 0 var(--w0, 100px); }
.doors { display: grid; grid-template-columns: repeat(8, 1fr); gap: 14px; }
.door { position: relative; isolation: isolate; border-radius: 22px; padding: 16px; min-height: 196px; color: #fff; display: flex; flex-direction: column; gap: 10px; overflow: hidden; box-shadow: var(--card-shadow); transform: translateY(calc(var(--sel, 0) * -8px)); box-shadow: 0 0 0 calc(var(--sel, 0) * 3px) var(--surface), 0 0 0 calc(var(--sel, 0) * 6px) var(--dc), var(--card-shadow); }
.door::after { content: ""; position: absolute; inset: 0; z-index: -1; background: repeating-radial-gradient(circle at calc(100% + 10px) calc(100% + 18px), oklch(0 0 0 / 0.14) 0 1px, transparent 1px 15px); pointer-events: none; }
.door:hover { transform: translateY(-5px); }
.door .dnm { font-size: 14px; font-weight: 800; } .door .dv { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; } .door .ds { font-size: 11px; font-weight: 600; opacity: 0.78; }
.door .stack { margin-top: auto; display: flex; flex-direction: column-reverse; gap: 3px; } .door .stack i { display: block; height: 9px; border-radius: 4px; background: oklch(1 0 0 / 0.55); }
.door .over { position: absolute; top: 12px; right: 12px; padding: 2px 8px; border-radius: 999px; background: oklch(0.8 0.15 80); color: oklch(0.3 0.08 70); font-size: 10px; font-weight: 800; }
.row2 { display: grid; grid-template-columns: 1fr auto; gap: 4px 14px; align-items: center; padding: 11px 14px; border-radius: 14px; background: oklch(1 0 0 / 0.12); }
.row2 b { font-size: 13.5px; font-weight: 800; } .row2 small { font-size: 11.5px; font-weight: 600; opacity: 0.78; } .row2 .am { text-align: right; font-weight: 800; font-size: 14px; }
.row2 .mb { grid-column: 1 / -1; height: 5px; border-radius: 999px; background: oklch(1 0 0 / 0.18); overflow: hidden; } .row2 .mb i { display: block; height: 100%; border-radius: inherit; background: #fff; }
.cbar { position: relative; height: 34px; border-radius: 10px; background: oklch(1 0 0 / 0.14); }
.cbar > i { position: absolute; top: 0; height: 34px; display: block; }
.cbar .line { position: absolute; top: -7px; bottom: -7px; border-left: 2px dashed #fff; }
.plot { position: relative; height: 450px; border-radius: 20px; background: oklch(1 0 0 / 0.08); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.1); overflow: hidden; }
.plot .gx { position: absolute; top: 18px; bottom: 44px; border-left: 1px solid oklch(1 0 0 / 0.14); } .plot .gy { position: absolute; left: 54px; right: 20px; border-top: 1px solid oklch(1 0 0 / 0.14); }
.plot .ax { position: absolute; font-size: 11px; font-weight: 700; opacity: 0.75; white-space: nowrap; }
.bub { position: absolute; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 800; border: 2px solid oklch(1 0 0 / 0.85); box-shadow: 0 6px 16px oklch(0 0 0 / 0.25), 0 0 0 calc(var(--sel, 0) * 5px) oklch(1 0 0 / 0.55); transform: translate(-50%, -50%) scale(calc(1 + var(--sel, 0) * 0.1)); text-align: center; line-height: 1.1; z-index: calc(1 + var(--sel, 0) * 5); }
.bub:hover { transform: translate(-50%, -50%) scale(1.1); z-index: 8; }
.bub .nm { pointer-events: none; padding: 0 4px; }
.openband { position: absolute; top: 0; bottom: 0; background: oklch(0 0 0 / 0.12); }
.chip-b { cursor: pointer; display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 999px; font-size: 13.5px; font-weight: 800; background: oklch(1 0 0 / 0.14); opacity: calc(0.7 + 0.3 * var(--sel, 0)); box-shadow: 0 0 0 calc(var(--sel, 0) * 2px) #fff; background: color-mix(in oklch, #fff calc(14% + var(--sel, 0) * 70%), transparent); color: color-mix(in oklch, #fff calc(100% - var(--sel, 0) * 100%), oklch(0.2 0.03 260)); transition: all 200ms; }
.hb2 { display: grid; grid-template-columns: 170px 1fr 92px; gap: 12px; align-items: center; padding: 7px 0; font-size: 12.5px; font-weight: 700; } .hb2 .tr { height: 14px; border-radius: 7px; background: oklch(1 0 0 / 0.14); overflow: hidden; } .hb2 .tr i { display: block; height: 100%; border-radius: inherit; background: #fff; } .hb2 b { text-align: right; font-weight: 800; }
`;
