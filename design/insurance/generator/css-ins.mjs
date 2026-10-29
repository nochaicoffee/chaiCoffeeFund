// The Insurance canvas's own CSS, on top of the shared base (css-base.mjs) and the pieces copied from Loans/Income (css.mjs).
export const INS = String.raw`
/* ===================== Insurance ===================== */
.chai-app { --c-paid: var(--card-sapphire); }
.insdir .nb { display: none; animation: cmb-in 380ms var(--ease-out); }
.hero.feat { background: var(--feature-tile); border: 1px solid var(--feature-tile-line); }
.k-up { color: var(--warning-text); }

/* A protectee's tile on the cover map */
.who { display: flex; flex-direction: column; gap: 14px; padding: 18px; border-radius: 22px; background: oklch(1 0 0 / 0.62); border: 1px solid oklch(0 0 0 / 0.07); box-shadow: 0 1px 2px oklch(0 0 0 / 0.03), 0 8px 20px oklch(0 0 0 / 0.04); min-width: 0; }
.who-h { display: flex; align-items: center; gap: 12px; }
.who-h b { display: block; font-size: 16px; font-weight: 800; line-height: 1.15; } .who-h small { display: block; font-size: 11.5px; font-weight: 600; color: var(--muted); }
.who-body { display: flex; flex-direction: column; gap: 10px; flex: 1; }
.pol { display: flex; flex-direction: column; gap: 9px; padding: 12px 12px 11px; border-radius: 16px; background: var(--surface); border: 1px solid var(--surface-line); border-left: 4px solid var(--c); box-shadow: var(--soft-shadow); cursor: pointer; transition: box-shadow 200ms, transform 200ms; }
.pol:hover { transform: translateY(-1px); box-shadow: var(--card-shadow); }
.pol-t { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.pol-t b { font-size: 13px; font-weight: 800; line-height: 1.2; } .pol-t small { display: block; font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 1px; }
.pol-cover { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; } .pol-cover small { font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); margin-left: 6px; }
.pol-f { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; font-weight: 700; color: var(--muted); }
.pol-f .soon { color: var(--warning-text); }
.tbar { position: relative; height: 8px; border-radius: 999px; background: var(--fill-strong); overflow: hidden; }
.tbar > span { position: absolute; left: 0; top: 0; bottom: 0; border-radius: inherit; background: var(--c); }
.tbar.soon > span { background: repeating-linear-gradient(135deg, oklch(0.72 0.14 75) 0 5px, oklch(0.8 0.12 78) 5px 10px); }
.who.gap { background: transparent; border: 1.5px dashed oklch(0 0 0 / 0.22); box-shadow: none; }
.gapbox { flex: 1; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 10px; padding: 14px; border-radius: 16px; background: oklch(1 0 0 / 0.5); }
.gapbox b { font-size: 14px; font-weight: 800; } .gapbox p { font-size: 12px; font-weight: 600; color: var(--muted); line-height: 1.5; }
label.pol { cursor: pointer; }

/* Runway, creep: charts drawn in SVG with hover zones over them */
.chart-wrap { position: relative; }
.zone { position: absolute; top: 0; bottom: 0; }
.zone:hover, .zone:focus-visible { background: oklch(0 0 0 / 0.035); outline: none; }
.chart-wrap svg text { font-family: 'Manrope', system-ui, sans-serif; }
.exp { stroke-dasharray: 4 3; }
.lg i.exp { background: transparent; border: 1.5px dashed var(--muted); }

/* Policy details */
.kv { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 22px; }
.kv > div { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.kv .k { font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); }
.kv .v { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 7px; }
.kv .nov .v { color: var(--muted); font-weight: 600; }
.kv .v .cp { display: inline-flex; color: var(--muted); }
.kv .full { grid-column: 1 / -1; }
.addon { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; background: var(--fill); font-size: 12px; font-weight: 700; }
.addon svg { color: var(--positive); }
.addons { display: flex; flex-wrap: wrap; gap: 7px; }

/* NCB ladder */
.ladder { display: flex; align-items: center; gap: 0; position: relative; padding: 4px 0; }
.ladder .st { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 7px; position: relative; font-size: 11px; font-weight: 800; color: var(--muted); }
.ladder .st i { width: 14px; height: 14px; border-radius: 50%; background: var(--fill-strong); position: relative; z-index: 1; }
.ladder .st::before { content: ""; position: absolute; top: 10px; left: -50%; right: 50%; height: 3px; background: var(--fill-strong); }
.ladder .st:first-child::before { display: none; }
.ladder .st.done i { background: var(--c); } .ladder .st.done::before { background: var(--c); }
.ladder .st.now i { background: var(--c); box-shadow: 0 0 0 4px color-mix(in oklch, var(--c) 28%, transparent); } .ladder .st.now { color: var(--fg); }
.ladder .st.nx i { background: var(--surface); box-shadow: inset 0 0 0 2px var(--c); } .ladder .st.nx::before { background: repeating-linear-gradient(90deg, var(--c) 0 4px, transparent 4px 8px); }

/* Mini cards */
.mini { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 18px; background: oklch(1 0 0 / 0.62); border: 1px solid oklch(0 0 0 / 0.07); min-width: 0; }
.mini b { font-size: 13px; font-weight: 800; } .mini small { font-size: 11px; font-weight: 600; color: var(--muted); display: block; }
.spark { display: flex; align-items: flex-end; gap: 3px; height: 40px; }
.spark i { flex: 1; border-radius: 3px 3px 1px 1px; background: var(--c); min-height: 3px; opacity: 0.55; } .spark i.l { opacity: 1; }
.chg-up { color: var(--negative); } .chg-dn { color: var(--positive); } .chg-0 { color: var(--muted); }

/* States / forms boards */
.stt { display: flex; flex-direction: column; gap: 10px; }
.stt > .cap { font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
.stt > p { font-size: 13px; color: var(--muted); font-weight: 500; line-height: 1.55; max-width: 720px; }
.stt > p b { color: var(--fg); }
.frame { border-radius: 26px; border: 1px solid var(--surface-line); background: var(--page); padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow: hidden; }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; padding: 44px 24px; border-radius: 22px; border: 1.5px dashed oklch(0 0 0 / 0.2); }
.empty b { font-size: 18px; font-weight: 800; } .empty p { font-size: 13.5px; color: var(--muted); font-weight: 500; max-width: 440px; line-height: 1.55; }
.pill-lapsed { background: var(--negative-tint); color: var(--negative); }
.pill-soon2 { background: var(--warning-tint); color: var(--warning-text); }
.toast { display: inline-flex; align-items: center; gap: 14px; padding: 12px 16px 12px 18px; border-radius: 999px; background: var(--ink); color: var(--on-ink); box-shadow: var(--pop-shadow); font-weight: 700; font-size: 13.5px; align-self: flex-start; }
.toast i { width: 22px; height: 22px; border-radius: 50%; background: oklch(0.88 0.17 125); color: var(--ink); display: inline-flex; align-items: center; justify-content: center; font-style: normal; }
.toast u { color: oklch(0.88 0.17 125); font-weight: 800; text-decoration: none; margin-left: 6px; }
.cell-name b { white-space: normal; }
.gc > .card, .gc > .nb > .card { flex: 1; }
.pol.off { opacity: 0.6; filter: grayscale(0.8); border-left-color: var(--fill-strong); }
`;
