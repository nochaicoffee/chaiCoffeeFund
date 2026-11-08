// Round 2's styles: the statement links on the picked page, ExS1 Statements and ExS2 One month.
import { PARTS } from "./data.mjs";

const KINDS = ["all", ...PARTS.map((p) => p.k)];
const filter = KINDS.map((k) => `.chai-app:has(#f-${k}:checked) label[for="f-${k}"] { --sel: 1; }` + (k === "all" ? "" : `\n.chai-app:has(#f-${k}:checked) .lr:not(.k-${k}) { display: none; }`)).join("\n");

export const ST = String.raw`
.ww-f { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; color: var(--accent-text); white-space: nowrap; cursor: pointer; }
.pg-head .eyebrow svg { vertical-align: -1px; }
.stile .s { font-size: 12px; font-weight: 600; color: var(--muted); line-height: 1.35; }

/* ---- ExS1: filters, month groups, rows ---- */
.lcard { padding: 18px 22px 20px; }
.lf { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding-bottom: 10px; }
.lf-i { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; font-size: 12.5px; font-weight: 700; background: color-mix(in oklch, var(--ink) calc(var(--sel, 0) * 100%), var(--fill)); color: color-mix(in oklch, var(--on-ink) calc(var(--sel, 0) * 100%), var(--fg)); }
.lf-i i { width: 8px; height: 8px; border-radius: 3px; } .lf-i em { font-style: normal; font-size: 11px; opacity: 0.6; }
.lf-sp { flex: 1; }
.lf-s { display: inline-flex; align-items: center; gap: 8px; min-width: 220px; padding: 8px 14px; border-radius: 999px; background: var(--fill); font-size: 12.5px; font-weight: 600; color: var(--muted); }
.lh, .lr { display: grid; grid-template-columns: 50px 36px minmax(0, 1fr) 150px 170px 120px; gap: 14px; align-items: center; }
.lh { padding: 8px 10px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--divider); }
.lg { display: grid; }
.lg-h { display: flex; align-items: baseline; gap: 14px; padding: 18px 10px 8px; border-bottom: 1px solid var(--divider); } .lg-h > b { font-size: 15px; font-weight: 800; } .lg-h > span:not(.link) { flex: 1; font-size: 12.5px; color: var(--muted); font-weight: 600; } .lg-h > span b { color: var(--fg); }
.lr { padding: 11px 10px; border-bottom: 1px solid var(--divider); font-size: 13.5px; } .lr:hover { background: var(--fill); border-radius: 12px; }
.lr-d { display: grid; justify-items: center; line-height: 1; padding: 6px 0; border-radius: 11px; background: var(--fill); } .lr-d b { font-size: 16px; font-weight: 800; } .lr-d small { font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: var(--muted); margin-top: 2px; }
.lr-ic { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 10px; color: #fff; }
.lr-t { display: grid; gap: 2px; min-width: 0; } .lr-t > b { font-weight: 800; display: flex; align-items: center; } .lr-t > small { font-size: 11.5px; color: var(--muted); font-weight: 600; }
.lr-bs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; }
.lr-big { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px 3px 4px; border-radius: 999px; background: var(--warning-tint); color: var(--warning-text); font-size: 11.5px; font-weight: 700; } .lr-big b { font-weight: 800; } .lr-big small { font-weight: 600; opacity: 0.75; } .lr-big .ci { width: 18px; height: 18px; border-radius: 999px; }
.lr-k { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 700; } .lr-k i { width: 8px; height: 8px; border-radius: 3px; }
.lr-v { font-size: 12.5px; color: var(--muted); font-weight: 600; } .lr-a { text-align: right; font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
.lg-more { display: flex; align-items: center; gap: 6px; padding: 14px 10px 2px; color: var(--accent-text); font-weight: 800; font-size: 13px; }
${filter}

/* ---- ExS2: one month ---- */
.sm-v { flex-direction: column; gap: 20px; }
.sm-row { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 20px; align-items: stretch; }
.sm-nav { display: inline-flex; align-items: center; gap: 10px; } .sm-nav b { font-size: 14px; font-weight: 800; min-width: 120px; text-align: center; } .sm-nav .dim { opacity: 0.35; }
.sm { display: grid; gap: 6px; }
.sm-sec { display: grid; padding: 4px 0 10px; }
.sm-sh { display: grid; grid-template-columns: auto auto 1fr auto; gap: 10px; align-items: baseline; padding: 10px 0 8px; border-bottom: 1.5px solid var(--fg); } .sm-sh i { width: 10px; height: 10px; border-radius: 3px; align-self: center; } .sm-sh b { font-size: 13px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; } .sm-sh small { font-size: 12px; color: var(--muted); font-weight: 600; } .sm-sh span { font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
.sm-l { display: grid; grid-template-columns: 64px 1fr auto; gap: 14px; align-items: start; padding: 10px 0; border-bottom: 1px dashed var(--divider); font-size: 13.5px; }
.sm-d { font-size: 12.5px; font-weight: 700; color: var(--muted); padding-top: 1px; } .sm-w { display: grid; gap: 2px; } .sm-w > b { font-weight: 800; } .sm-w > small { font-size: 11.5px; color: var(--muted); font-weight: 600; }
.sm-b { display: grid; grid-template-columns: auto 1fr auto; gap: 2px 8px; align-items: center; margin-top: 6px; padding: 7px 10px; border-radius: 12px; background: var(--warning-tint); color: var(--warning-text); font-size: 12px; font-weight: 700; } .sm-b .ci { grid-row: span 2; width: 22px; height: 22px; border-radius: 7px; } .sm-b small { grid-column: 2; font-weight: 600; opacity: 0.8; font-size: 11px; } .sm-b em { grid-row: 1 / span 2; grid-column: 3; font-style: normal; font-weight: 800; }
.sm-a { font-size: 14.5px; font-weight: 800; font-variant-numeric: tabular-nums; text-align: right; }
.sm-tot { display: flex; justify-content: space-between; align-items: baseline; padding: 14px 0 2px; border-top: 2px solid var(--fg); font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; } .sm-tot b { font-size: 22px; letter-spacing: -0.01em; }
.sm-side { gap: 18px; }
.sm-eq { display: grid; } .sm-eq > div { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 11px 0; border-bottom: 1px solid var(--divider); font-size: 13.5px; font-weight: 600; } .sm-eq span { display: grid; } .sm-eq small { font-size: 11.5px; color: var(--muted); } .sm-eq b { font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; } .sm-eq .eq { border-bottom: 0; border-top: 2px solid var(--fg); font-weight: 800; font-size: 15px; }
.sm-bar { display: flex; gap: 3px; height: 16px; border-radius: 999px; overflow: hidden; } .sm-bar span { display: block; }
.sm-key { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; font-weight: 600; color: var(--muted); } .sm-key span { display: inline-flex; align-items: center; gap: 6px; } .sm-key i { width: 8px; height: 8px; border-radius: 3px; } .sm-key b { color: var(--fg); }
.sm-yr { display: grid; gap: 10px; margin-top: 6px; } .sm-yh { display: flex; justify-content: space-between; align-items: baseline; } .sm-yh b { font-size: 12px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); } .sm-yh small { font-size: 12px; font-weight: 600; color: var(--muted); }
.sm-yb { position: relative; display: grid; grid-template-columns: repeat(12, 1fr); gap: 6px; height: 300px; } .sm-yb::after { content: ""; position: absolute; left: 0; right: 0; bottom: calc(18px + (100% - 18px) * var(--avg) / 100%); border-top: 1.5px dashed var(--muted); opacity: 0.6; pointer-events: none; }
.sm-yc { display: grid; grid-template-rows: 1fr 18px; justify-items: center; } .sm-yc span { width: 100%; display: flex; align-items: flex-end; border-radius: 8px; } .sm-yc i { display: block; width: 100%; border-radius: 6px; background: color-mix(in oklch, var(--card-indigo) calc(var(--sel, 0) * 100%), oklch(0.86 0.02 270)); } .sm-yc small { font-size: 10.5px; font-weight: 800; color: var(--muted); align-self: end; } .sm-yc:hover i { background: color-mix(in oklch, var(--card-indigo) 60%, var(--fill)); }
.sm-vs { margin-top: auto; padding: 14px 16px; border-radius: 16px; background: var(--fill); font-size: 13px; font-weight: 600; line-height: 1.45; }
`;
