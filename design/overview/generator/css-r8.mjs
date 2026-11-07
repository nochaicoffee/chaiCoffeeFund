// Round 8's styles: five icon styles for the tiles, the rate setter, and the four versions of the last section.
import { pick } from "./css-ov.mjs";
import * as M from "./model.mjs";
import { IK, KV, CAL_KEYS } from "./r8.mjs";

const key = (p, k) => `#${p}-${k}:checked`;
const HZ = M.HORIZONS;
// the rate setter: every whole rate has its chart and its panes; the track fills up to the pick
const rates = M.RATES.map((r, i) => `.chai-app:has(${key("rt", r)}) label[for="rt-${r}"] { --sel: 1; }\n.chai-app:has(${key("rt", r)}) .q1svg-${r} { display: block; }\n.chai-app:has(${key("rt", r)}) .rs-k:nth-child(-n+${i + 1}) i { background: #fff; }`).join("\n");
const combos = M.RATES.flatMap((r) => HZ.map((h) => `.chai-app:has(${key("hz", h)}):has(${key("rt", r)}) .q1p-${h}-${r}, .chai-app:has(${key("hz", h)}):has(${key("rt", r)}) .mk-${h}-${r} { display: block; }`)).join("\n");
const ik = IK.map((k) => `.chai-app:has(${key("ik", k)}) .ik-s${k} { display: initial; }`).join("\n");

const R8A = String.raw`
/* ---- design-aid switches ---- */
.r8-sw { display: flex; justify-content: flex-end; margin: -6px 0 -4px; }
.swr { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 6px 8px 6px 14px; border-radius: 999px; background: var(--fill); }
.swr-t { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); margin-right: 4px; }
.sw-i { padding: 7px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 700; color: color-mix(in oklch, var(--on-ink) calc(var(--sel, 0) * 100%), var(--fg)); background: color-mix(in oklch, var(--ink) calc(var(--sel, 0) * 100%), transparent); transition: background 200ms; } .sw-i:hover { background: color-mix(in oklch, var(--ink) 10%, transparent); }

/* ---- the glyph, five ways. The tile sets --tc to its own colour. ---- */
.ik-wrap { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; }
.ik { position: absolute; display: flex; align-items: center; justify-content: center; right: 16px; top: 14px; width: 56px; height: 56px; color: #fff; transition: transform 240ms var(--ease-out, ease), opacity 240ms; }
.ik svg { width: 28px; height: 28px; overflow: visible; } .ik .gf { fill: currentColor; fill-opacity: 0; stroke: none; } .ik .gl { fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.tl-m:hover .ik { transform: translateY(-2px) rotate(-4deg); }
.wm-only { display: none; }
/* 1 · Glass chip */
.chai-app:has(#ik-1:checked) .ik { border-radius: 50%; background: oklch(1 0 0 / 0.14); box-shadow: inset 0 0 0 1px oklch(1 0 0 / 0.3), 0 0 0 5px oklch(1 0 0 / 0.07), 0 8px 16px oklch(0 0 0 / 0.18); backdrop-filter: blur(6px); }
.chai-app:has(#ik-1:checked) .ik .gf { fill-opacity: 0.22; }
/* 2 · Duotone */
.chai-app:has(#ik-2:checked) .ik { border-radius: 18px; background: linear-gradient(150deg, oklch(1 0 0 / 0.36), oklch(1 0 0 / 0.1)); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.5), 0 10px 18px oklch(0 0 0 / 0.2); }
.chai-app:has(#ik-2:checked) .ik .gf { fill-opacity: 0.4; } .chai-app:has(#ik-2:checked) .ik .gl { stroke-width: 1.9; }
/* 3 · Watermark: one big glyph, cropped by the tile */
.chai-app:has(#ik-3:checked) .ik-wrap { overflow: hidden; } .chai-app:has(#ik-3:checked) .wm-only { display: block; }
.chai-app:has(#ik-3:checked) .ik { right: -26px; top: -22px; width: 168px; height: 168px; opacity: 0.17; transform: none; } .chai-app:has(#ik-3:checked) .tl-m:hover .ik { transform: scale(1.05); opacity: 0.24; }
.chai-app:has(#ik-3:checked) .ik svg { width: 168px; height: 168px; } .chai-app:has(#ik-3:checked) .ik .gl { stroke-width: 0.8; } .chai-app:has(#ik-3:checked) .ik .gf { fill-opacity: 0.35; }
/* 4 · App badge: solid white, the glyph in the tile's colour */
.chai-app:has(#ik-4:checked) .ik { border-radius: 17px; background: #fff; color: var(--tc); box-shadow: 0 10px 20px oklch(0 0 0 / 0.28), inset 0 -3px 0 oklch(0 0 0 / 0.07); }
.chai-app:has(#ik-4:checked) .ik .gf { fill-opacity: 0.2; } .chai-app:has(#ik-4:checked) .ik .gl { stroke-width: 1.9; }
/* 5 · Orbit */
.chai-app:has(#ik-5:checked) .ik { right: 22px; top: 22px; width: 46px; height: 46px; border-radius: 50%; background: radial-gradient(circle, oklch(1 0 0 / 0.16), transparent 72%); box-shadow: inset 0 0 0 1px oklch(1 0 0 / 0.32), 0 0 0 7px oklch(1 0 0 / 0.07); }
.chai-app:has(#ik-5:checked) .ik::before { content: ""; position: absolute; inset: -14px; border-radius: 50%; border: 1.5px dashed oklch(1 0 0 / 0.34); animation: spin 26s linear infinite; }
.chai-app:has(#ik-5:checked) .ik::after { content: ""; position: absolute; inset: -14px; border-radius: 50%; background: radial-gradient(circle at 50% 0, #fff 0 3px, transparent 3.6px); animation: spin 9s linear infinite; }
.chai-app:has(#ik-5:checked) .ik svg { width: 24px; height: 24px; } .chai-app:has(#ik-5:checked) .ik .gf { fill-opacity: 0.25; }
.tl-m .mk-s { right: 16px; top: 88px; } .chai-app:has(#ik-5:checked) .tl-m .mk-s { top: 96px; } .chai-app:has(#ik-3:checked) .tl-m .mk-s { top: 20px; }
.mk-sr { width: 36px; } .mk-sr .mrg { width: 36px; height: 36px; margin-left: auto; display: block; }

/* ---- the rate setter ---- */
.rs { display: grid; gap: 10px; } .rs-top { display: flex; justify-content: space-between; align-items: baseline; } .rs-top b { font-size: 12px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.75; } .rs-v { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; } .rs-v small { font-size: 13px; font-weight: 700; opacity: 0.75; letter-spacing: 0; }
.rs-tr { position: relative; display: grid; grid-template-columns: repeat(13, 1fr); padding: 10px 0 0; } .rs-tr::before { content: ""; position: absolute; left: 3.8%; right: 3.8%; top: 22px; height: 4px; border-radius: 3px; background: oklch(1 0 0 / 0.22); }
.rs-k { position: relative; z-index: 1; display: grid; justify-items: center; gap: 6px; cursor: pointer; font-size: 10.5px; font-weight: 700; opacity: calc(0.65 + var(--sel, 0) * 0.35); } .rs-k i { width: calc(12px + var(--sel, 0) * 10px); height: calc(12px + var(--sel, 0) * 10px); margin: calc(5px - var(--sel, 0) * 5px) 0 0; border-radius: 50%; background: oklch(1 0 0 / 0.4); box-shadow: 0 0 0 calc(var(--sel, 0) * 5px) oklch(1 0 0 / 0.25); transition: all 220ms var(--ease-out, ease); } .rs-k:hover i { background: #fff; }
.rs-q { display: flex; flex-direction: column; font-size: 11px; font-weight: 600; opacity: 0.7; gap: 1px; } .rs-q span:last-child { display: none; }

/* ---- the last section ---- */
.r8-end { display: flex; flex-direction: column; gap: 18px; padding: 26px 28px 30px; border-radius: 30px; background: var(--fill); }
.r8-eh { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; } .r8-eh h2 { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin: 4px 0 0; }
.it { position: relative; display: grid; align-items: center; gap: 12px; padding: 10px 14px 10px 16px; border-radius: 16px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--soft-shadow), inset 4px 0 0 var(--pc, var(--divider)); }
.it-w { grid-template-columns: 10px minmax(0, 1fr) auto auto; } .it-e { grid-template-columns: 46px minmax(0, 1fr) auto auto; }
.it-d { width: 9px; height: 9px; border-radius: 50%; background: oklch(0.72 0.1 250); } .it.wk-red .it-d { background: oklch(0.62 0.22 25); animation: ping 1.8s infinite; } .it.wk-amber .it-d { background: oklch(0.8 0.16 85); }
.it-t b { display: block; font-size: 13.5px; font-weight: 800; line-height: 1.25; } .it-t small { display: block; font-size: 12px; font-weight: 600; color: var(--muted); line-height: 1.3; margin-top: 1px; }
.it-p { font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 999px; background: color-mix(in oklch, var(--pc) 22%, var(--surface)); white-space: nowrap; } .it-a { font-size: 11.5px; font-weight: 800; padding: 5px 11px; border-radius: 999px; background: var(--ink); color: var(--on-ink); white-space: nowrap; }
.it-dt { display: grid; justify-items: center; line-height: 1; padding: 6px 0; border-radius: 12px; background: var(--fill); } .it-dt b { font-size: 17px; font-weight: 800; } .it-dt small { font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--muted); }
.it-m { text-align: right; font-size: 15px; font-weight: 800; white-space: nowrap; } .it-m.up { color: oklch(0.45 0.15 150); } .it-m small { display: block; font-size: 11px; font-weight: 600; color: var(--muted); }
.it-b { font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 999px; background: oklch(0.93 0.1 85); color: oklch(0.4 0.1 70); white-space: nowrap; } .it.wk-red .it-b { background: oklch(0.92 0.07 25); color: oklch(0.45 0.17 25); }
.it.sm { grid-template-columns: 1fr; gap: 6px; padding: 12px 14px 12px 16px; } .it.sm.it-e { grid-template-columns: 38px minmax(0, 1fr) auto; } .it.sm.it-w { grid-template-columns: minmax(0, 1fr) auto; } .it.sm .it-d { display: none; } .it.sm .it-a, .it.sm .it-p { display: none; } .it.sm .it-b { display: none; } .it.sm .it-dt b { font-size: 15px; } .it.sm .it-m { font-size: 13px; }
.it.sm.it-w::after { content: attr(data-x); }
/* B · one timeline */
.tlv { position: relative; display: grid; gap: 22px; padding-left: 26px; } .tlv::before { content: ""; position: absolute; left: 6px; top: 8px; bottom: 8px; width: 2px; background: var(--divider); }
.tlv-h { display: flex; align-items: baseline; gap: 10px; position: relative; margin-bottom: 8px; } .tlv-h i { position: absolute; left: -26px; top: 4px; width: 14px; height: 14px; border-radius: 50%; background: var(--surface); border: 3px solid var(--ink); } .tlv-now .tlv-h i { border-color: oklch(0.62 0.22 25); } .tlv-h b { font-size: 15px; font-weight: 800; } .tlv-h small { font-size: 12px; font-weight: 600; color: var(--muted); }
.tlv-i { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; } .tlv-i .it:nth-child(odd):last-child { grid-column: span 2; }
/* C · a board by when */
.bd { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; align-items: stretch; } .bd-c { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 22px; background: color-mix(in oklch, var(--ink) 4%, var(--surface)); border: 1px solid var(--surface-line); }
.bd-h { display: flex; justify-content: space-between; align-items: flex-start; } .bd-h b { display: block; font-size: 16px; font-weight: 800; } .bd-h small { font-size: 12px; font-weight: 600; color: var(--muted); } .bd-n { min-width: 28px; height: 28px; border-radius: 50%; background: var(--ink); color: var(--on-ink); display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; }
.bd-s { display: flex; gap: 8px; font-size: 12.5px; font-weight: 800; } .bd-o { color: oklch(0.5 0.17 25); } .bd-i { color: oklch(0.45 0.15 150); } .bd-l { display: grid; gap: 8px; align-content: start; }
/* D · calendar */
.cal { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 22px; align-items: start; } .cal-w { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; padding: 0 4px 8px; font-size: 11.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); } .cal-w span { text-align: center; }
.cal-b { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; } .cal-c { position: relative; min-height: 92px; padding: 8px 10px; border-radius: 16px; background: var(--surface); border: 1px solid var(--surface-line); display: flex; flex-direction: column; gap: 6px; cursor: pointer; transition: transform 160ms, box-shadow 160ms; box-shadow: 0 0 0 calc(var(--sel, 0) * 2.5px) var(--ink); } .cal-c:hover { transform: translateY(-2px); }
.cal-c.off { background: transparent; border-style: dashed; opacity: 0.4; cursor: default; } .cal-c.nx { background: color-mix(in oklch, var(--ink) 4%, var(--surface)); } .cal-c.today b { background: var(--ink); color: var(--on-ink); } .cal-c b { width: fit-content; min-width: 26px; height: 26px; padding: 0 7px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; } .cal-c b em { font-style: normal; font-size: 9.5px; margin-left: 3px; opacity: 0.7; }
.cdots { display: flex; gap: 4px; } .cdot { width: 9px; height: 9px; border-radius: 50%; background: oklch(0.7 0.14 25); } .cdot.in { background: oklch(0.65 0.17 150); } .cdot.w-amber { box-shadow: 0 0 0 2.5px oklch(0.85 0.15 85 / 0.6); } .cdot.w-red { box-shadow: 0 0 0 2.5px oklch(0.64 0.22 25 / 0.45); } .cdot.w-info { box-shadow: 0 0 0 2.5px oklch(0.7 0.1 250 / 0.4); } .cal-c small { font-size: 11px; font-weight: 700; color: var(--muted); margin-top: auto; }
.cal-r { display: grid; gap: 10px; align-content: start; } .cal-ph { display: flex; align-items: baseline; justify-content: space-between; padding: 2px 4px 4px; } .cal-ph b { font-size: 17px; font-weight: 800; } .cal-ph small { font-size: 12px; font-weight: 600; color: var(--muted); } .cal-none { padding: 14px; border-radius: 16px; background: var(--surface); border: 1px dashed var(--divider); font-size: 13px; font-weight: 600; color: var(--muted); }
.cal-f { display: grid; gap: 8px; margin-top: 8px; padding-top: 14px; border-top: 1px solid var(--divider); } .cal-fh { display: flex; justify-content: space-between; align-items: baseline; } .cal-fh b { font-size: 14px; font-weight: 800; } .cal-fh small { font-size: 12px; font-weight: 600; color: var(--muted); }
.cal .vw-cd { display: none; }
.vt { display: inline-flex; align-items: center; gap: 4px; padding: 5px 6px 5px 14px; border-radius: 999px; background: var(--fill); } .vt-t { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); margin-right: 6px; }
.vt-i { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 800; color: color-mix(in oklch, var(--on-ink) calc(var(--sel, 0) * 100%), var(--fg)); background: color-mix(in oklch, var(--ink) calc(var(--sel, 0) * 100%), transparent); transition: background 200ms; } .vt-i:hover { background: color-mix(in oklch, var(--ink) 10%, transparent); }
`;
export const R8 = [R8A, ik, rates, combos, pick("ik", IK), pick("rt", M.RATES.map(String)), pick("kv", KV), pick("cd", CAL_KEYS)].join("\n");

