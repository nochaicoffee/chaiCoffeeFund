// Round 4: the literal pillars with a time scrub, the growth-path chips, and the new widgets' own styles.
import * as D from "./data.mjs";
import { pick } from "./css-fi2.mjs";
const MAXV = 1100000, PX = 300; // the tallest the scene draws: ₹11L = 300px
const px = (v) => `${Math.round((v / MAXV) * PX)}px`;
const SNAP_KEYS = D.SNAPS.map(([k]) => k);
const snapRules = D.SNAPS.map(([k, , date]) => {
  const s = D.snapshot(date);
  const vars = [`--eh: ${px(s.epf)}`, `--fh: ${px(s.fd)}`, `--e1: ${s.you}`, `--e2: ${s.netapp}`, `--e3: ${Math.max(s.interest, 1)}`, ...s.fds.map((v, i) => `--f${i + 1}: ${v}`)].join("; ");
  return `.chai-app:has(#s-${k}:checked) { ${vars}; }`;
}).join("\n");
const defaults = (() => { const s = D.snapshot(D.TODAY); return [`--eh: ${px(s.epf)}`, `--fh: ${px(s.fd)}`, `--e1: ${s.you}`, `--e2: ${s.netapp}`, `--e3: ${s.interest}`, ...s.fds.map((v, i) => `--f${i + 1}: ${v}`)].join("; "); })();
export const FI4 = String.raw`
@property --eh { syntax: "<length>"; inherits: true; initial-value: 260px; }
@property --fh { syntax: "<length>"; inherits: true; initial-value: 30px; }
.chai-app { ${defaults}; transition: --h1 520ms ease, --h2 520ms ease, --hc 520ms ease, --eh 800ms cubic-bezier(0.2, 0.8, 0.2, 1), --fh 800ms cubic-bezier(0.2, 0.8, 0.2, 1); }
${snapRules}
${pick("s", SNAP_KEYS)}${pick("g", ["5", "10", "20"])}
.scene { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: end; }
.pcol { display: flex; flex-direction: column; justify-content: flex-end; min-height: 372px; }
.pcol .ptop { font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.82; margin-bottom: 2px; }
.pcol .pnum { font-size: 34px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; margin-bottom: 8px; }
.pillar { display: flex; flex-direction: column-reverse; gap: 3px; width: 100%; border-radius: 16px 16px 6px 6px; overflow: hidden; cursor: pointer; animation: rise 900ms cubic-bezier(0.2, 0.8, 0.2, 1) both; box-shadow: 0 0 0 calc(var(--sel, 0) * 3px) #fff, 0 12px 28px oklch(0 0 0 / 0.28); transform: translateY(calc(var(--sel, 0) * -4px)); transition: transform 240ms, box-shadow 240ms; }
.pillar:hover { transform: translateY(-5px); }
.pillar.epf { height: var(--eh); } .pillar.fd { height: var(--fh); animation-delay: 140ms; }
.pillar .blk { flex-basis: 0; min-height: 0; transition: flex-grow 800ms cubic-bezier(0.2, 0.8, 0.2, 1); position: relative; }
.pillar .blk:hover { filter: brightness(1.18); }
.pillar .blk::after { content: ""; position: absolute; inset: 0; background: repeating-radial-gradient(circle at 120% 130%, oklch(1 0 0 / 0.12) 0 1px, transparent 1px 13px); }
.pillar .s1 { flex-grow: var(--e1); } .pillar .s2 { flex-grow: var(--e2); } .pillar .s3 { flex-grow: var(--e3); }
.pillar .d1 { flex-grow: var(--f1); } .pillar .d2 { flex-grow: var(--f2); } .pillar .d3 { flex-grow: var(--f3); } .pillar .d4 { flex-grow: var(--f4); } .pillar .d5 { flex-grow: var(--f5); } .pillar .d6 { flex-grow: var(--f6); } .pillar .d7 { flex-grow: var(--f7); }
@keyframes rise { from { clip-path: inset(100% 0 0 0); opacity: 0.4; } to { clip-path: inset(0 0 0 0); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .pillar { animation: none; } }
.plinth { height: 10px; border-radius: 6px; background: oklch(1 0 0 / 0.3); margin-top: 4px; }
.pleg { display: grid; gap: 5px; margin-top: 12px; font-size: 12px; font-weight: 700; }
.pleg div { display: grid; grid-template-columns: 12px 1fr auto; gap: 8px; align-items: center; } .pleg i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; } .pleg b { font-weight: 800; }
.pleg .v { display: block; }
.cstack > * + * { margin-top: 16px; }
.s-tiles4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.moneygrid { display: grid; min-width: 0; grid-template-columns: 54px repeat(12, minmax(0, 1fr)); gap: 6px; align-items: center; }
.moneygrid .yl { font-size: 12px; font-weight: 800; color: var(--muted); } .moneygrid .ml { font-size: 10.5px; font-weight: 800; text-align: center; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
.mcell { min-width: 0; position: relative; height: 46px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11.5px; font-weight: 800; background: var(--fill); color: var(--muted); }
.mcell.on { color: oklch(0.16 0.03 150); } .mcell.h4, .mcell.h5 { color: #fff; }
.mcell .fdd { position: absolute; top: 4px; right: 5px; width: 7px; height: 7px; border-radius: 50%; background: oklch(0.78 0.16 75); box-shadow: 0 0 0 1.5px var(--surface); }
.mcell.future { opacity: 0.45; outline: 1.5px dashed var(--fill-strong); outline-offset: -2px; background: transparent; }
.mcell.now { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent); }
.mcell:hover { transform: translateY(-2px); transition: transform 140ms; }
.dotrow { display: grid; grid-template-columns: 74px repeat(12, minmax(0, 1fr)); gap: 6px; align-items: center; }
.dotrow .yl { font-size: 11.5px; font-weight: 800; color: var(--muted); }
.cdot { position: relative; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 800; color: #fff; width: 30px; justify-self: center; }
.cdot.ok { background: oklch(0.58 0.14 150); } .cdot.mid { background: oklch(0.72 0.14 75); color: oklch(0.25 0.06 70); } .cdot.late { background: oklch(0.55 0.17 25); } .cdot.due { background: transparent; border: 2px dashed var(--fill-strong); color: var(--muted); } .cdot.none { background: var(--fill); }
.cdot:hover { transform: scale(1.18); transition: transform 140ms; }
.gp-bar { display: flex; height: 38px; border-radius: 12px; overflow: hidden; gap: 3px; } .gp-bar i { display: block; height: 100%; }
.gp-chips { display: inline-flex; gap: 6px; padding: 4px; border-radius: 999px; background: var(--fill); } .gp-chips .pkl { padding: 6px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 800; color: var(--muted); background: transparent; box-shadow: none; --sel: 0; } 
.chai-app:has(#g-5:checked) label[for="g-5"], .chai-app:has(#g-10:checked) label[for="g-10"], .chai-app:has(#g-20:checked) label[for="g-20"] { background: var(--surface); color: var(--accent-text); box-shadow: 0 1px 3px oklch(0 0 0 / 0.14); }
.chk { display: grid; grid-template-columns: 70px 1fr auto; gap: 10px; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--divider); font-size: 12px; font-weight: 700; } .chk:last-child { border-bottom: 0; } .chk .tk { color: var(--gain); font-weight: 800; }
.tscrub { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
`;
