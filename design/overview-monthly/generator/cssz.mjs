// Round 3b styles and picks (2026-11-16), after Prathik's answers: all five together up to 12 months, a button focuses one measure at
// any range, past a year only one measure at a time (the "All five" button goes dim), and the range drives the whole page.
export const MO3B = String.raw`
.mo-z .z-chips .c-tab { cursor: pointer; pointer-events: auto; } .mo-z .z-chips .c-tab:hover { transform: translateY(-2px); }
.c-tab.t-all { --H: 260; --g1: oklch(0.3 0.012 260); --g2: oklch(0.16 0.01 260); flex: 0.8; }
.c-tab.t-all .icn svg { fill: currentColor; stroke: none; }
.z-hint span { display: none; }
.z-hint .tag { font-size: 10.5px; font-weight: 800; padding: 2px 9px; border-radius: 999px; background: var(--fill); color: var(--muted); display: inline-block; margin-left: 6px; }
.z-page .note { font-size: 11.5px; font-weight: 600; color: var(--muted); max-width: 220px; line-height: 1.3; }
.pg-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.pg-head .eyebrow { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.pg-head h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; margin-top: 2px; }
.pg-head p { color: var(--muted); font-size: 13.5px; font-weight: 600; margin-top: 6px; max-width: 640px; }
.pg-range { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; } .pg-range .lbl { font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.pg-range .seg input:checked + label { background: oklch(0.2 0.01 260); color: var(--on-ink); }
.follows { position: relative; } .follows::after { content: attr(data-tag); position: absolute; top: 10px; right: 12px; font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 999px; background: var(--accent); color: var(--on-accent); }
.rt { position: relative; border-radius: 20px; padding: 14px 16px 12px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--soft-shadow); min-height: 104px; display: flex; flex-direction: column; gap: 3px; } .rt.on { border-color: oklch(0.72 0.19 145 / 0.5); } .rt .n { font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); } .rt .h { font-size: 22px; font-weight: 800; letter-spacing: -0.01em; line-height: 1.15; } .rt .l { font-size: 11.5px; font-weight: 600; color: var(--muted); }
.nowtag { position: absolute; top: 8px; right: 10px; font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 999px; background: var(--fill-strong); color: var(--muted); }
.rt .nowtag.on { background: var(--accent); color: var(--on-accent); }
.ghost.tile { position: relative; flex-direction: column; gap: 2px; } .ghost.tile.rng { border-color: var(--accent); background: oklch(0.95 0.05 145 / 0.5); color: var(--accent-text); } .ghost.tile .nowtag.on { background: var(--accent); color: var(--on-accent); }
`;

/** Picks for the mixed board: a dashboard range (radios r-*) and a measure button (radios t-*, "all" meaning all five together).
 *  Up to 12 months (12, ty) the buttons all work and "all" shows five side by side. Past that (24, 36) "all" is unavailable. */
export function pickZ({ measures }) {
  const on = "background: oklch(0.2 0.01 260); color: var(--on-ink);";
  const chipOn = (sel, k) => `${sel} .c-tab.t-${k} { background: linear-gradient(145deg, var(--g1), var(--g2)); border-color: transparent; color: oklch(0.97 0.01 var(--H)); box-shadow: 0 10px 22px oklch(0.2 0.06 var(--H) / 0.35); } ${sel} .c-tab.t-${k} .icn { background: oklch(1 0 0 / 0.18); } ${sel} .c-tab.t-${k} .v small { color: oklch(1 0 0 / 0.65); }`;
  const ids = ["all", ...measures.map((m) => m.k)];
  let css = "";
  for (const r of ["12", "ty", "24", "36"]) {
    const long = r === "24" || r === "36";
    css += `.mo-z:has(#r-${r}:checked) label[for=r-${r}] { ${on} }\n`;
    if (long) css += `.mo-z:has(#r-${r}:checked) .c-tab.t-all { opacity: 0.4; pointer-events: none; } .mo-z:has(#r-${r}:checked) .z-hint .h-long { display: inline; }\n`;
    for (const t of ids) {
      const eff = long && t === "all" ? measures[0].k : t;
      const sel = `.mo-z:has(#r-${r}:checked):has(#t-${t}:checked)`;
      css += `${sel} .pz-${r}-${eff} { display: flex; } ${chipOn(sel, eff)}\n`;
      if (!long) css += `${sel} .z-hint .${t === "all" ? "h-all" : "h-one"} { display: inline; }\n`;
    }
  }
  return css;
}
