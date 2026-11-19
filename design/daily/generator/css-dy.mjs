// The Daily canvas's own styles, on top of the shared app base (css-base.mjs). Light only, like the app today.
export const DY = String.raw`
.chai-app {
  --card-azure-from: oklch(0.42 0.11 235); --card-azure-to: oklch(0.24 0.07 240); --card-azure: oklch(0.6 0.12 235);
  --card-raspberry: oklch(0.57 0.17 5); --card-olive: oklch(0.62 0.12 125); --card-amber: oklch(0.74 0.14 80);
  --card-coral: oklch(0.66 0.15 35); --card-indigo-from: oklch(0.36 0.12 275); --card-indigo-to: oklch(0.2 0.08 275); --card-indigo: oklch(0.52 0.15 275); --card-slate: oklch(0.56 0.03 255);
}
.pgcol { display: flex; flex-direction: column; gap: 20px; }
.g12 { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 20px; align-items: stretch; }
.g12 > * { min-width: 0; display: flex; flex-direction: column; } .g12 > .card, .g12 > section, .g12 > aside { flex: 1; }
.g12 > div > .card, .g12 > div > aside, .g12 > div > section { flex: 1 1 auto; }
.g12 > .stack-col > .card { flex: 0 0 auto; } .g12 > .stack-col > .card:last-child { flex: 1 1 auto; }
.c3x { grid-column: span 3; } .c4x { grid-column: span 4; } .c5x { grid-column: span 5; } .c6x { grid-column: span 6; } .c7x { grid-column: span 7; } .c8x { grid-column: span 8; } .c9x { grid-column: span 9; } .c12x { grid-column: span 12; }
.neg { color: var(--negative); } .pos { color: var(--positive); }
.sample-tag { vertical-align: 2px; margin-left: 10px; text-transform: none; letter-spacing: 0; }
.foot { margin-top: auto; }

/* greeting that points */
.lede .pt { position: relative; display: inline-block; outline: none; }
.lede .pt > b { cursor: help; border-bottom: 1.5px dotted var(--accent-text); padding-bottom: 1px; transition: background 160ms; border-radius: 4px; }
.lede .pt:hover > b, .lede .pt:focus > b { background: var(--accent-tint); }
.hov:focus > .hc-wrap, .hov:focus-within > .hc-wrap { opacity: 1; transform: none; }
.lede .hc-wrap { font-weight: 500; font-size: 13px; line-height: 1.4; color: var(--fg); }
.ph .lede .hc-wrap { display: none; }

/* method dots, category tiles */
.md { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; vertical-align: 1px; }
.md-u { background: var(--card-teal); } .md-c { background: var(--card-ruby); }
.ci { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0; color: #fff; background: linear-gradient(155deg, color-mix(in oklch, var(--cc) 80%, white), var(--cc)); }

/* month switcher */
.mnav { display: inline-flex; align-items: center; gap: 10px; }
.mnav b { min-width: 150px; text-align: center; font-size: 16px; font-weight: 800; }
.mn-b { width: 36px; height: 36px; border-radius: 50%; background: var(--fill); display: inline-flex; align-items: center; justify-content: center; color: var(--fg); }
.mn-b.off { opacity: 0.35; }

/* ---- the calendar ---- */
.cal { display: flex; flex-direction: column; gap: 8px; }
.cal-hd, .cal-r { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }
.cal-wk .cal-hd, .cal-wk .cal-r { grid-template-columns: repeat(7, minmax(0, 1fr)) 108px; }
.cal-hd { font-size: 11px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; text-align: center; padding-bottom: 2px; }
.cd { position: relative; min-height: 96px; border-radius: 16px; padding: 10px 12px; display: flex; flex-direction: column; justify-content: space-between; background: var(--fill); color: var(--fg); min-width: 0; }
.cd.blank { background: transparent; }
.cd.quiet { background: oklch(0 0 0 / 0.03); }
.cd.future { background: transparent; border: 1.5px dashed var(--fill-strong); color: var(--muted); }
.cd.lv1 { background: var(--heat-1); } .cd.lv2 { background: var(--heat-2); } .cd.lv3 { background: var(--heat-3); } .cd.lv4 { background: var(--heat-4); color: #fff; }
.cd.lv4 .cd-n, .cd.lv4 .cd-c { color: oklch(1 0 0 / 0.78); }
.cd-n { font-size: 12.5px; font-weight: 800; color: var(--muted); }
.cd.lv1 .cd-n, .cd.lv2 .cd-n, .cd.lv3 .cd-n { color: var(--heat-ink); opacity: 0.7; }
.cd-dots { position: absolute; top: 11px; right: 11px; display: flex; gap: 4px; }
.cd-dots .md { width: 9px; height: 9px; box-shadow: 0 0 0 1.5px var(--surface); }
.cd-t { font-size: 16px; font-weight: 800; letter-spacing: -0.01em; min-height: 20px; display: block; }
.cd-c { display: block; font-size: 10.5px; font-weight: 700; color: var(--muted); margin-top: 1px; }
.cd.lv1 .cd-c, .cd.lv2 .cd-c, .cd.lv3 .cd-c { color: var(--heat-ink); opacity: 0.65; }
.cd-add { display: inline-flex; width: 22px; height: 22px; border-radius: 50%; background: var(--accent-tint); color: var(--accent-text); align-items: center; justify-content: center; }
.cd.today { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent); }
.cd.sel { outline: 2.5px solid var(--ink); outline-offset: 2px; }
.cd-tag { position: absolute; top: 9px; left: 34px; font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; padding: 2px 7px; border-radius: 999px; background: var(--accent); color: var(--on-accent); }
.cd.over::after { content: ""; position: absolute; left: 12px; right: 12px; bottom: 6px; height: 3px; border-radius: 3px; background: var(--negative); }
.cd.over .cd-t { margin-bottom: 4px; }
.cw { border-radius: 16px; background: var(--surface); border: 1px solid var(--surface-line); display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 2px; padding: 8px 12px; min-width: 0; }
.cw b { font-size: 15px; font-weight: 800; } .cw small { font-size: 10.5px; font-weight: 700; color: var(--muted); }
.cw.now { border-color: var(--accent-edge); background: var(--accent-tint); }
.cw-h { color: var(--muted); }
.legend .lg-n { margin-left: auto; font-weight: 600; }
.lg-lim { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--muted); } .lg-lim i { width: 2px; height: 13px; border-radius: 2px; background: var(--fg); opacity: 0.55; }

/* ---- the day panel and its add form ---- */
.dp { display: flex; flex-direction: column; gap: 14px; padding: 22px; border-radius: 22px; min-width: 0; position: relative; }
.dp-h { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.dp-h h3 { font-size: 21px; font-weight: 800; margin-top: 4px; }
.dp-tot { text-align: right; } .dp-tot b { display: block; font-size: 26px; font-weight: 800; letter-spacing: -0.01em; line-height: 1.15; }
.dp-tot small { display: inline-flex; gap: 8px; align-items: center; font-size: 11.5px; font-weight: 700; color: var(--muted); margin-top: 2px; } .dp-tot small .md { margin-right: -4px; }
.dp-l { display: flex; flex-direction: column; gap: 2px; flex: 1; min-height: 0; }
.dp-l.scroll { max-height: 330px; overflow: hidden; -webkit-mask-image: linear-gradient(#000 82%, transparent); mask-image: linear-gradient(#000 82%, transparent); }
.dp-more { align-self: center; display: inline-flex; gap: 6px; align-items: center; margin-top: -8px; padding: 4px 12px; border-radius: 999px; background: var(--fill); font-size: 11.5px; font-weight: 800; color: var(--muted); }
.dp-r { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 8px; border-radius: 14px; }
.dp-r:hover { background: var(--fill); }
.dp-n { min-width: 0; } .dp-n b { display: block; font-size: 13.5px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dp-n small { display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: var(--muted); white-space: nowrap; margin-top: 1px; }
.dp-a { font-size: 14.5px; font-weight: 800; }
.dp-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 6px; padding: 26px 16px; border-radius: 16px; border: 1.5px dashed var(--fill-strong); color: var(--muted); flex: 1; }
.dp-empty svg { color: var(--accent-text); } .dp-empty b { font-size: 13.5px; color: var(--fg); } .dp-empty small { font-size: 12px; font-weight: 500; line-height: 1.5; }
.dp-add { justify-content: center; margin-top: auto; width: 100%; }
.dp-form { gap: 16px; justify-content: space-between; }
.fld { display: flex; flex-direction: column; gap: 7px; }
.fl { font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); } .fl small { font-size: 10.5px; font-weight: 700; text-transform: none; letter-spacing: 0; margin-left: 4px; opacity: 0.8; }
.amt { display: flex; align-items: center; gap: 8px; height: 58px; padding: 0 18px; border-radius: 16px; border: 2px solid var(--accent); box-shadow: 0 0 0 4px var(--accent-ring); background: var(--surface); }
.amt em { font-style: normal; font-size: 22px; font-weight: 700; color: var(--muted); } .amt b { font-size: 30px; font-weight: 800; letter-spacing: -0.01em; }
.caret { display: inline-block; width: 2px; height: 30px; background: var(--accent); border-radius: 2px; animation: blink 1.1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }
.seg-m { display: flex; width: 100%; } .seg-m .seg-i { flex: 1; justify-content: center; padding: 9px 12px; font-size: 13px; }
.fcs { display: flex; flex-wrap: wrap; gap: 7px; }
.fc { display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 999px; background: var(--fill); font-size: 12.5px; font-weight: 700; } .fc i { width: 8px; height: 8px; border-radius: 50%; }
.fc.on { background: var(--ink); color: var(--on-ink); }
.inp { display: flex; align-items: center; height: 44px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--surface-line); background: var(--surface); font-size: 14px; font-weight: 600; }
.dp-act { display: flex; gap: 10px; } .dp-act .btn-primary { flex: 1; justify-content: center; }
.dp-hint { font-size: 11.5px; font-weight: 600; color: var(--muted); text-align: center; margin-top: -6px; }
.toast { display: flex; align-items: center; gap: 9px; padding: 11px 14px; border-radius: 14px; background: var(--ink); color: var(--on-ink); font-size: 13px; font-weight: 700; }
.toast svg { color: var(--on-card-lime); } .toast .undo { margin-left: auto; text-decoration: underline; text-underline-offset: 3px; opacity: 0.85; }
.dlg-x { margin-left: auto; width: 34px; height: 34px; border-radius: 50%; background: var(--fill); display: flex; align-items: center; justify-content: center; color: var(--fg); flex-shrink: 0; }

/* ---- where it went, months ---- */
.ww { display: flex; flex-direction: column; gap: 14px; flex: 1; justify-content: space-between; }
.ww-r { display: grid; grid-template-columns: 34px 96px minmax(0, 1fr) auto; align-items: center; gap: 14px; }
.ww-n { font-size: 13.5px; font-weight: 800; }
.ww-bar { height: 11px; border-radius: 999px; background: var(--fill); overflow: hidden; } .ww-bar > span { display: block; height: 100%; border-radius: 999px; }
.ww-v { text-align: right; font-size: 14.5px; font-weight: 800; min-width: 96px; } .ww-v small { margin-left: 8px; font-size: 11px; font-weight: 700; color: var(--muted); }
.ww-t { font-size: 20px; font-weight: 800; }
.empty-box { border: 1.5px dashed var(--fill-strong); border-radius: 16px; padding: 28px 20px; text-align: center; display: flex; flex-direction: column; gap: 5px; color: var(--muted); flex: 1; justify-content: center; } .empty-box b { color: var(--fg); font-size: 14px; } .empty-box small { font-size: 12.5px; font-weight: 500; line-height: 1.5; }
.mo { display: flex; flex-direction: column; gap: 6px; flex: 1; justify-content: space-between; }
.mo-r { display: grid; grid-template-columns: 82px minmax(0, 1fr) auto; align-items: center; gap: 4px 16px; padding: 9px 12px; border-radius: 14px; }
.mo-r.on { background: var(--accent-tint); }
.mo-r > b:first-child { font-size: 13px; font-weight: 800; } .mo-t { font-size: 14.5px; font-weight: 800; text-align: right; }
.mo-r small { grid-column: 2 / 4; font-size: 11.5px; font-weight: 600; color: var(--muted); }
.mo-bar { position: relative; display: flex; height: 11px; border-radius: 999px; background: var(--fill); }
.mo-bar > span:not(.mo-lim) { display: block; height: 100%; } .mo-bar > span:first-child { border-radius: 999px 0 0 999px; } .mo-bar > span:nth-child(2) { border-radius: 0 999px 999px 0; }
.mo-lim { position: absolute; top: -4px; bottom: -4px; width: 2px; margin-left: -1px; border-radius: 2px; background: var(--fg); opacity: 0.5; }
.mo.v .mo-r { grid-template-columns: minmax(0, 1fr) auto; } .mo.v .mo-bar { grid-column: 1 / 3; grid-row: 2; } .mo.v .mo-r small { grid-column: 1 / 3; grid-row: 3; }

/* ---- ring, weeks, streak, feed, bars, keypad ---- */
.ring { position: relative; flex-shrink: 0; margin: 0 auto; }
.ring-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 2px; }
.ring-c small { font-size: 12px; font-weight: 700; color: var(--muted); } .ring-c b { font-size: 34px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; } .ring-c span { font-size: 12px; font-weight: 700; color: var(--muted); }
.ring-pace { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--muted); } .ring-pace i { width: 3px; height: 14px; border-radius: 2px; background: var(--fg); } .ring-pace b { color: var(--fg); font-weight: 800; } .ring-pace b.neg { color: var(--negative); } .ring-pace b.pos { color: var(--positive); }
.wk-r { display: grid; grid-template-columns: 112px minmax(0, 1fr) 170px; align-items: center; gap: 16px; padding: 12px 14px; border-radius: 16px; }
.wk-r.now { background: var(--accent-tint); }
.wk-l b { display: block; font-size: 13.5px; font-weight: 800; } .wk-l small { font-size: 11.5px; font-weight: 600; color: var(--muted); }
.wk-bar { position: relative; display: flex; height: 14px; border-radius: 999px; background: var(--fill); } .wk-bar > span { display: block; height: 100%; } .wk-bar > span:first-child { border-radius: 999px 0 0 999px; } .wk-bar > span:nth-child(2) { border-radius: 0 999px 999px 0; }
.wk-tick { position: absolute; top: -5px; bottom: -5px; width: 3px; margin-left: -1.5px; border-radius: 2px; background: var(--fg); }
.wk-v { text-align: right; } .wk-v b { display: block; font-size: 15px; font-weight: 800; } .wk-v small { font-size: 11.5px; font-weight: 700; }
.sks { display: grid; grid-template-columns: repeat(15, minmax(0, 1fr)); gap: 7px; }
.sks.fill { flex: 1; grid-auto-rows: minmax(44px, 1fr); } .sks.fill .sk { height: auto; }
.sk { height: 44px; border-radius: 13px; display: flex; align-items: center; justify-content: center; font-size: 12.5px; font-weight: 800; background: var(--fill); color: var(--muted); }
.sk.ok { background: var(--accent-tint); color: var(--accent-text); } .sk.hi { background: var(--warning-tint); color: var(--warning-text); } .sk.bad { background: var(--negative-tint); color: var(--negative); }
.sk.fut { background: transparent; border: 1.5px dashed var(--fill-strong); } .sk.today { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent); }
.sk.none { background: repeating-linear-gradient(135deg, var(--fill) 0 5px, transparent 5px 10px); }
.legend i.sk-ok, .legend i.sk-hi, .legend i.sk-bad, .legend i.sk-none { width: 12px; height: 12px; border-radius: 4px; display: inline-block; }
.sk-ok { background: var(--accent-tint); outline: 1px solid var(--accent-edge); } .sk-hi { background: var(--warning-tint); outline: 1px solid var(--warning); } .sk-bad { background: var(--negative-tint); outline: 1px solid var(--negative); } .sk-none { background: var(--fill-strong); }
.fd-d { display: flex; flex-direction: column; gap: 2px; margin-bottom: 14px; }
.fd-h { display: flex; align-items: baseline; gap: 10px; padding: 0 8px 7px; border-bottom: 1px solid var(--divider); margin-bottom: 4px; } .fd-h b { font-size: 13.5px; font-weight: 800; } .fd-h small { font-size: 11.5px; font-weight: 600; color: var(--muted); } .fd-t { margin-left: auto; font-size: 13px; font-weight: 800; }
.spark { display: flex; align-items: flex-end; gap: 4px; } .sp { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; border-radius: 4px 4px 2px 2px; overflow: hidden; background: linear-gradient(var(--fill), var(--fill)) bottom/100% 3px no-repeat; }
.sp i { display: block; width: 100%; } .sp i.u { background: var(--card-teal); } .sp i.c { background: var(--card-ruby); } .sp.today { box-shadow: 0 0 0 2px var(--accent); }
.kp { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; } .kk { height: 58px; border-radius: 18px; background: var(--fill); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; } .kk-b { color: var(--muted); }
.big { font-size: 40px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; } .big small { font-size: 22px; color: var(--muted); font-weight: 700; margin-right: 3px; }
.composer { display: grid; grid-template-columns: 190px auto 180px minmax(0, 1fr) auto; gap: 12px; align-items: center; }
.composer .amt { height: 48px; padding: 0 14px; box-shadow: none; border-width: 1.5px; } .composer .amt b { font-size: 22px; }
.composer .seg-m { width: auto; }
.note-p { font-size: 12.5px; font-weight: 600; color: var(--muted); line-height: 1.55; }

/* ---- hero calendar (dark) ---- */
.hero { position: relative; isolation: isolate; border-radius: 28px; padding: 26px; display: flex; gap: 26px; color: #fff; background: linear-gradient(155deg, oklch(0.32 0.07 205), oklch(0.17 0.04 218)); box-shadow: var(--card-shadow); overflow: hidden; }
.hero::before { content: ""; position: absolute; z-index: -1; right: -120px; top: -140px; width: 520px; height: 520px; border-radius: 50%; border: 1.5px solid oklch(1 0 0 / 0.07); box-shadow: 0 0 0 60px oklch(1 0 0 / 0.025), 0 0 0 120px oklch(1 0 0 / 0.02); }
.hero-l { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 18px; } .hero-r { width: 390px; flex-shrink: 0; display: flex; flex-direction: column; }
.hero-h { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.hero h2 { font-size: 22px; font-weight: 800; } .hero h2 small { display: block; font-size: 12.5px; font-weight: 600; color: oklch(1 0 0 / 0.62); margin-top: 3px; }
.hero .mn-b { background: oklch(1 0 0 / 0.14); color: #fff; } .hero .mnav b { color: #fff; } .hero .legend { color: oklch(1 0 0 / 0.7); } .hero .legend b { color: #fff; }
.hero .cal-hd { color: oklch(1 0 0 / 0.55); }
.hero .cd { background: oklch(1 0 0 / 0.07); color: #fff; min-height: 104px; }
.hero .cd.blank { background: transparent; } .hero .cd.quiet { background: oklch(1 0 0 / 0.04); }
.hero .cd.future { background: transparent; border-color: oklch(1 0 0 / 0.16); color: oklch(1 0 0 / 0.4); }
.hero .cd.lv1 { background: oklch(0.8 0.12 190 / 0.14); } .hero .cd.lv2 { background: oklch(0.8 0.12 190 / 0.26); } .hero .cd.lv3 { background: oklch(0.8 0.12 190 / 0.4); } .hero .cd.lv4 { background: oklch(0.8 0.12 190 / 0.58); }
.hero .cd .cd-n, .hero .cd.lv1 .cd-n, .hero .cd.lv2 .cd-n, .hero .cd.lv3 .cd-n, .hero .cd.lv4 .cd-n { color: oklch(1 0 0 / 0.65); opacity: 1; }
.hero .cd .cd-c, .hero .cd.lv1 .cd-c, .hero .cd.lv2 .cd-c, .hero .cd.lv3 .cd-c, .hero .cd.lv4 .cd-c { color: oklch(1 0 0 / 0.6); opacity: 1; }
.hero .cd-dots .md { box-shadow: 0 0 0 1.5px oklch(0.2 0.04 215); } .hero .md-u { background: oklch(0.82 0.13 190); } .hero .md-c { background: oklch(0.74 0.16 25); }
.hero .cd.today { box-shadow: 0 0 0 2px oklch(0.2 0.04 215), 0 0 0 4px var(--on-card-lime); } .hero .cd-tag { background: var(--on-card-lime); color: oklch(0.25 0.06 140); }
.hero .cd.sel { outline-color: #fff; } .hero .cd-add { background: oklch(1 0 0 / 0.16); color: #fff; }
.dp-dark { background: oklch(1 0 0 / 0.08); border: 1px solid oklch(1 0 0 / 0.14); color: #fff; backdrop-filter: blur(6px); }
.dp-dark .eyebrow { color: oklch(1 0 0 / 0.6); } .dp-dark .dp-tot small, .dp-dark .dp-n small { color: oklch(1 0 0 / 0.65); } .dp-dark .dp-r:hover { background: oklch(1 0 0 / 0.08); }
.dp-dark .btn-primary { background: #fff; color: oklch(0.2 0.04 215); } .dp-dark .btn-primary::after { display: none; }
.dp-dark .dp-empty { border-color: oklch(1 0 0 / 0.22); color: oklch(1 0 0 / 0.65); } .dp-dark .dp-empty b { color: #fff; } .dp-dark .dp-empty svg { color: var(--on-card-lime); }
.dp-dark .dp-more { background: oklch(1 0 0 / 0.14); color: oklch(1 0 0 / 0.8); }
.dp-dark.dp-form .amt { background: oklch(1 0 0 / 0.08); border-color: var(--on-card-lime); box-shadow: 0 0 0 4px oklch(0.88 0.17 138 / 0.18); } .dp-dark .amt em { color: oklch(1 0 0 / 0.6); } .dp-dark .caret { background: var(--on-card-lime); }
.dp-dark .fl { color: oklch(1 0 0 / 0.6); } .dp-dark .seg { background: oklch(1 0 0 / 0.12); } .dp-dark .seg-i { color: oklch(1 0 0 / 0.7); } .dp-dark .seg-i.on { background: #fff; color: oklch(0.2 0.04 215); }
.dp-dark .fc { background: oklch(1 0 0 / 0.12); } .dp-dark .fc.on { background: #fff; color: oklch(0.2 0.04 215); } .dp-dark .inp { background: oklch(1 0 0 / 0.08); border-color: oklch(1 0 0 / 0.16); }
.dp-dark .btn-soft { background: oklch(1 0 0 / 0.14); color: #fff; } .dp-dark .dp-hint { color: oklch(1 0 0 / 0.55); } .dp-dark .dlg-x { background: oklch(1 0 0 / 0.14); color: #fff; }
.dp-dark .toast { background: #fff; color: oklch(0.2 0.04 215); } .dp-dark .toast svg { color: oklch(0.45 0.14 145); }

/* ---- the Calendar view (its own tab) ---- */
.c3v { display: grid; grid-template-columns: 270px minmax(0, 1fr) 350px; gap: 20px; align-items: stretch; } .c3v > * { min-width: 0; display: flex; flex-direction: column; }
.biggest { display: flex; flex-direction: column; gap: 6px; flex: 1; justify-content: space-between; } .bg-r { display: grid; grid-template-columns: 56px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 9px 10px; border-radius: 14px; } .bg-r:hover { background: var(--fill); }
.bg-r > b:first-child { font-size: 12.5px; font-weight: 800; color: var(--muted); } .bg-n b { display: block; font-size: 13.5px; font-weight: 800; } .bg-n small { font-size: 11.5px; font-weight: 600; color: var(--muted); }
.view-seg { display: inline-flex; }

/* ---- budget proposal board ---- */
.bd-pop { border-radius: 22px; padding: 22px; display: flex; flex-direction: column; gap: 16px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--pop-shadow); }
.bd-pop h3 { font-size: 17px; font-weight: 800; } .bd-pop p { font-size: 12.5px; font-weight: 500; color: var(--muted); line-height: 1.55; }
.tgl { display: flex; align-items: center; gap: 12px; } .tgl .sw { width: 40px; height: 24px; border-radius: 999px; background: var(--accent); position: relative; flex-shrink: 0; } .tgl .sw::after { content: ""; position: absolute; right: 3px; top: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px oklch(0 0 0 / 0.3); } .tgl .sw.off { background: var(--fill-strong); } .tgl .sw.off::after { right: auto; left: 3px; }
.tgl b { font-size: 13px; font-weight: 800; display: block; } .tgl small { font-size: 11.5px; font-weight: 500; color: var(--muted); }
.tab-mock { border-radius: 14px; border: 1px solid var(--surface-line); overflow: hidden; font-size: 12px; } .tab-mock table { width: 100%; border-collapse: collapse; } .tab-mock th { text-align: left; font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); background: var(--fill); padding: 8px 12px; } .tab-mock td { padding: 8px 12px; border-top: 1px solid var(--divider); font-weight: 600; font-variant-numeric: tabular-nums; }
.qa { display: flex; flex-direction: column; gap: 10px; flex: 1; justify-content: space-between; } .qa-i { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 12px; padding: 12px 14px; border-radius: 14px; background: var(--fill); } .qa-i > b { width: 26px; height: 26px; border-radius: 50%; background: var(--ink); color: var(--on-ink); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; } .qa-i span { font-size: 13px; font-weight: 600; line-height: 1.5; } .qa-i span b { font-weight: 800; }
.mini-page { border-radius: 18px; border: 1px dashed var(--fill-strong); padding: 14px; display: flex; flex-direction: column; gap: 12px; background: var(--page); }
.mini-lbl { font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); }
.diff-r { display: grid; grid-template-columns: 100px minmax(0, 1fr) auto; gap: 12px; align-items: center; font-size: 12.5px; font-weight: 700; } .diff-r .bar { height: 10px; border-radius: 999px; background: var(--fill); overflow: hidden; } .diff-r .bar span { display: block; height: 100%; border-radius: 999px; }

/* ---- phone ---- */
.ph .card { padding: 18px; border-radius: 20px; } .ph .stile { padding: 14px 16px; } .ph .stile .v { font-size: 22px; } .ph .tiles { gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
.ph .cal-hd, .ph .cal-r { gap: 4px; } .ph .cal-hd { font-size: 10px; }
.ph .cd { min-height: 54px; padding: 5px 4px 4px; border-radius: 11px; align-items: center; } .ph .cd-n { font-size: 10.5px; align-self: flex-start; padding-left: 3px; }
.ph .cd-dots { position: static; gap: 3px; margin-top: 1px; } .ph .cd-dots .md { width: 6px; height: 6px; box-shadow: none; }
.ph .cd-t { font-size: 9.5px; font-weight: 800; min-height: 11px; letter-spacing: -0.02em; } .ph .cd-tag { display: none; } .ph .cd-add { width: 16px; height: 16px; } .ph .cd.over::after { bottom: 3px; left: 8px; right: 8px; height: 2px; }
.ph .cd.today { box-shadow: 0 0 0 1.5px var(--surface), 0 0 0 3px var(--accent); } .ph .cd.sel { outline-width: 2px; outline-offset: 1px; }
.ph .hero .cd.today { box-shadow: 0 0 0 1.5px oklch(0.2 0.04 215), 0 0 0 3px var(--on-card-lime); }
.ph .hero { flex-direction: column; padding: 18px; border-radius: 24px; gap: 18px; } .ph .hero-r { width: auto; } .ph .hero .cd { min-height: 54px; } .ph .hero h2 { font-size: 19px; }
.ph .mnav b { min-width: 0; flex: 1; font-size: 15px; } .ph .mnav { display: flex; width: 100%; }
.ph .dp { padding: 16px; } .ph .dp-h h3 { font-size: 18px; } .ph .dp-tot b { font-size: 22px; }
.ph .ww-r { grid-template-columns: 30px 78px minmax(0, 1fr) auto; gap: 10px; } .ph .ww-v { min-width: 0; font-size: 13.5px; } .ph .ww-v small { display: none; } .ph .ci { width: 30px; height: 30px; border-radius: 10px; }
.ph .mo-r { grid-template-columns: 66px minmax(0, 1fr) auto; gap: 4px 10px; padding: 8px; } .ph .mo-r small { font-size: 10.5px; }
.ph .wk-r { grid-template-columns: minmax(0, 1fr) auto; gap: 8px 10px; padding: 10px; } .ph .wk-bar { grid-column: 1 / 3; grid-row: 2; }
.ph .sks { grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; } .ph .sk { height: 36px; }
.ph .ring-c b { font-size: 30px; } .ph .big { font-size: 34px; } .ph .kk { height: 52px; font-size: 20px; border-radius: 16px; }
.ph .composer { grid-template-columns: 1fr; } .ph .composer .seg-m { width: 100%; }
.ph .amt { height: 52px; } .ph .amt b { font-size: 26px; }
.ph .legend { gap: 6px 12px; font-size: 11.5px; } .ph .legend .lg-n { margin-left: 0; width: 100%; }
.ph .card-h { gap: 8px; } .ph .card-t small { display: block; margin: 2px 0 0; }
.sheet { position: relative; margin: 0 -16px -28px; padding: 16px 16px 24px; border-radius: 28px 28px 0 0; background: var(--surface); box-shadow: 0 -10px 30px oklch(0 0 0 / 0.16); display: flex; flex-direction: column; gap: 14px; }
.sheet::before { content: ""; align-self: center; width: 42px; height: 5px; border-radius: 3px; background: var(--fill-strong); }
.sheet .dp, .sheet .dp.card { padding: 0; box-shadow: none; border: 0; background: transparent; }
.dim { opacity: 0.45; pointer-events: none; display: flex; flex-direction: column; gap: 16px; }
.bd-pop-flat { display: flex; flex-direction: column; gap: 16px; } .bd-pop-flat h3 { font-size: 17px; font-weight: 800; } .bd-pop-flat p { font-size: 12.5px; font-weight: 500; color: var(--muted); line-height: 1.55; }
`;
export const R2 = String.raw`
/* ---- round 2: the budget strip, the glance widgets, the quick-add bar ---- */
.bstrip { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px 12px; border-radius: 20px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--card-shadow); }
.bs-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.bs-lv small { display: block; font-size: 11.5px; font-weight: 700; color: var(--muted); } .bs-lv b { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; } .bs-lv em { font-style: normal; font-size: 12.5px; font-weight: 700; color: var(--muted); margin-left: 6px; }
.bs-lv b.neg { color: var(--negative); }
.bs-bar { position: relative; display: block; height: 10px; border-radius: 999px; background: var(--fill); } .bs-bar i { display: block; height: 100%; border-radius: 999px; background: var(--accent); } .bs-bar.warn i { background: var(--warning); } .bs-bar.neg i { background: var(--negative); }
.bs-bar u, .gl-bar u { position: absolute; top: -4px; bottom: -4px; width: 3px; margin-left: -1.5px; border-radius: 2px; background: var(--fg); }
.bs-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12.5px; font-weight: 600; color: var(--muted); } .bs-foot b { color: var(--fg); font-weight: 800; } .bs-foot b.neg { color: var(--negative); }
.bs-t { display: inline-block; width: 3px; height: 13px; border-radius: 2px; background: var(--fg); margin-right: 8px; vertical-align: -2px; }
.bstrip.compact { flex-direction: row; align-items: center; gap: 12px; padding: 9px 14px; border-radius: 16px; } .bstrip.compact .bs-bar { flex: 1; height: 8px; min-width: 40px; } .bs-c { font-size: 12px; font-weight: 700; color: var(--muted); white-space: nowrap; } .bs-c b { font-size: 15px; font-weight: 800; color: var(--fg); } .bs-c b.neg { color: var(--negative); }
.bstrip.wide { flex-direction: row; align-items: center; gap: 28px; padding: 16px 22px; border-radius: 22px; position: relative; }
.bstrip.wide .bs-l { white-space: nowrap; } .bstrip.wide .bs-l small { display: block; font-size: 12px; font-weight: 700; color: var(--muted); } .bstrip.wide .bs-l b { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; } .bstrip.wide .bs-l b.neg { color: var(--negative); } .bstrip.wide .bs-l em { font-style: normal; font-size: 13px; font-weight: 700; color: var(--muted); margin-left: 8px; }
.bstrip.wide .bs-m { flex: 1; display: flex; flex-direction: column; gap: 9px; } .bstrip.wide .bs-r { display: flex; align-items: center; gap: 16px; } .bs-d { display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; font-weight: 600; color: var(--muted); text-align: right; white-space: nowrap; } .bs-d b { color: var(--fg); font-weight: 800; } .bs-d b.neg { color: var(--negative); }
.pin-tag { position: absolute; top: -9px; right: 22px; display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px; border-radius: 999px; background: var(--ink); color: var(--on-ink); font-size: 10.5px; font-weight: 800; }
.glance { display: grid; gap: 12px; } .glance.g2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } .glance.g4 { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.gl { position: relative; display: flex; flex-direction: column; gap: 5px; padding: 14px 16px 15px; border-radius: 20px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--card-shadow); min-width: 0; }
.gl-k { font-size: 12px; font-weight: 700; color: var(--muted); } .gl-v { font-size: 25px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; } .gl-v.neg { color: var(--negative); } .gl-v.warn { color: var(--warning-text); }
.gl-s { font-size: 11.5px; font-weight: 600; color: var(--muted); line-height: 1.4; } .gl-s b { color: var(--fg); font-weight: 800; } .gl-s b.neg { color: var(--negative); } .gl-s b.pos { color: var(--positive); }
.gl-bar { position: relative; display: flex; height: 8px; border-radius: 999px; background: var(--fill); margin-top: auto; } .gl-bar i { display: block; height: 100%; } .gl-bar i:first-child { border-radius: 999px 0 0 999px; } .gl-bar i:last-child { border-radius: 0 999px 999px 0; } .gl-bar i:only-child { border-radius: 999px; }
.gl-n { font-size: 11.5px; font-weight: 600; color: var(--warning-text); background: var(--warning-tint); padding: 6px 9px; border-radius: 10px; line-height: 1.4; } .gl-n b { font-weight: 800; }
.glance.g4 .gl { padding: 18px 20px; } .glance.g4 .gl-v { font-size: 30px; }
.glance.g1 { grid-template-columns: 1fr; }
.hero-r { gap: 14px; } .hero-r .dp { flex: none; } .hero-r .glance { flex: 1; grid-auto-rows: 1fr; gap: 10px; }
.glance.dark .gl { background: oklch(1 0 0 / 0.08); border-color: oklch(1 0 0 / 0.14); box-shadow: none; color: #fff; padding: 12px 16px 13px; }
.glance.dark .gl-k, .glance.dark .gl-s { color: oklch(1 0 0 / 0.66); } .glance.dark .gl-s b { color: #fff; } .glance.dark .gl-s b.neg { color: oklch(0.8 0.14 25); } .glance.dark .gl-s b.pos { color: var(--on-card-lime); }
.glance.dark .gl-v { font-size: 24px; } .glance.dark .gl-v.neg { color: oklch(0.8 0.14 25); } .glance.dark .gl-v.warn { color: oklch(0.88 0.13 85); }
.glance.dark .gl-bar { background: oklch(1 0 0 / 0.16); } .glance.dark .gl-bar u { background: #fff; }
.glance.dark .gl-n { background: oklch(0.8 0.13 85 / 0.2); color: oklch(0.92 0.1 85); }
.btn-lime { background: var(--on-card-lime); color: oklch(0.25 0.06 140); }
.hq { display: grid; grid-template-columns: 190px auto 150px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 12px; border-radius: 20px; background: oklch(1 0 0 / 0.07); border: 1px solid oklch(1 0 0 / 0.12); }
.hq .amt { height: 48px; padding: 0 14px; background: oklch(1 0 0 / 0.08); border: 1.5px solid var(--on-card-lime); box-shadow: none; } .hq .amt b { font-size: 22px; color: #fff; } .hq .amt em { color: oklch(1 0 0 / 0.6); font-size: 18px; } .hq .caret { background: var(--on-card-lime); height: 24px; }
.hq .seg { background: oklch(1 0 0 / 0.12); width: auto; } .hq .seg-i { color: oklch(1 0 0 / 0.7); } .hq .seg-i.on { background: #fff; color: oklch(0.2 0.04 215); }
.hq-sel { display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 14px; border-radius: 12px; background: oklch(1 0 0 / 0.08); border: 1px solid oklch(1 0 0 / 0.16); font-size: 13px; font-weight: 700; color: #fff; } .hq-sel svg { margin-left: auto; opacity: 0.7; }
.hq .inp { background: oklch(1 0 0 / 0.08); border-color: oklch(1 0 0 / 0.16); color: oklch(1 0 0 / 0.55); font-weight: 500; }
/* the phone: strip pinned under the app bar, quick-add bar pinned at the bottom */
.pin { position: relative; overflow: hidden; }
.pin-strip { flex-shrink: 0; padding: 10px 16px 8px; background: var(--page); position: relative; z-index: 2; box-shadow: 0 8px 14px -12px oklch(0 0 0 / 0.25); }
.pin-scroll { flex: 1; min-height: 0; overflow: hidden; padding: 14px 16px 0; } .pin-in { display: flex; flex-direction: column; gap: 16px; }
.qbar { position: relative; z-index: 3; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; padding: 10px 14px 26px; background: var(--surface); border-top: 1px solid var(--surface-line); box-shadow: 0 -10px 26px oklch(0 0 0 / 0.12); }
.qb-hint { font-size: 11.5px; font-weight: 600; color: var(--muted); padding-left: 4px; } .qb-hint b { color: var(--fg); font-weight: 800; }
.qb-row { display: flex; align-items: center; gap: 8px; }
.qb-amt { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; height: 52px; padding: 0 14px; border-radius: 16px; border: 2px solid var(--accent); background: var(--surface); } .qb-amt em { font-style: normal; font-size: 18px; font-weight: 700; color: var(--muted); } .qb-amt b { font-size: 24px; font-weight: 800; letter-spacing: -0.01em; } .qb-amt b.ph-t { font-size: 17px; font-weight: 600; color: var(--muted); opacity: 0.7; } .qb-amt.empty { border-color: var(--fill-strong); }
.seg-q { flex-shrink: 0; } .seg-q .seg-i { padding: 9px 11px; font-size: 12.5px; min-height: 40px; }
.qb-more { width: 44px; height: 44px; border-radius: 50%; background: var(--fill); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--fg); }
.qb-add { width: 52px; height: 52px; border-radius: 50%; background: var(--ink); color: var(--on-ink); display: flex; align-items: center; justify-content: center; flex-shrink: 0; } .qb-add.off { background: var(--fill-strong); color: var(--muted); }
.scrim { position: absolute; inset: 0; z-index: 4; background: oklch(0 0 0 / 0.38); }
.sheetx { position: absolute; z-index: 5; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; gap: 14px; padding: 10px 16px 28px; border-radius: 28px 28px 0 0; background: var(--surface); box-shadow: 0 -12px 34px oklch(0 0 0 / 0.2); }
.sheetx .grab { align-self: center; width: 42px; height: 5px; border-radius: 3px; background: var(--fill-strong); } .sheetx h3 { font-size: 19px; font-weight: 800; }
.pin .toast { margin: 0 0 2px; }
`;
export const R3 = String.raw`
/* ---- round 3 ---- */
.hh { display: flex; align-items: flex-end; gap: 34px; flex-wrap: wrap; }
.hh small { display: block; font-size: 12px; font-weight: 700; color: oklch(1 0 0 / 0.62); } .hh b { display: block; font-size: 30px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; color: #fff; } .hh em { display: block; font-style: normal; font-size: 12px; font-weight: 700; color: oklch(1 0 0 / 0.6); margin-top: 1px; }
.hh-d b { font-size: 24px; } .hh-s b { font-size: 34px; }
.hero-hd { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.hero-r { gap: 14px; } .hero-r .dp:last-child { flex: 1; }
.qa-card { gap: 14px; } .qa-card .dp-h h3 { font-size: 19px; } .qa-day { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; background: oklch(1 0 0 / 0.12); font-size: 12.5px; font-weight: 700; color: #fff; }
.fc-new { border: 1.5px dashed oklch(0.5 0.02 255 / 0.5); background: transparent; color: var(--accent-text); } .dp-dark .fc-new { background: transparent; border-color: oklch(1 0 0 / 0.4); color: var(--on-card-lime); }
.fc-link { display: inline-flex; align-items: center; padding: 7px 4px; font-size: 12.5px; font-weight: 800; color: var(--accent-text); text-decoration: underline; text-underline-offset: 3px; } .dp-dark .fc-link { color: oklch(1 0 0 / 0.75); }
.ncat { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 16px; border: 1.5px solid var(--on-card-lime); background: oklch(1 0 0 / 0.06); margin-top: 4px; }
.ncat-i { height: 42px; gap: 10px; } .ncat-i .md { width: 12px; height: 12px; } .ncat-i .caret { height: 20px; background: var(--on-card-lime); margin-left: -4px; }
.swatches { display: flex; flex-wrap: wrap; gap: 8px; } .sw-c { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #fff; box-shadow: inset 0 0 0 1.5px oklch(1 0 0 / 0.25); } .sw-c.on { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px currentColor; outline: 0; } .dp-dark .sw-c.on { box-shadow: 0 0 0 2px oklch(0.22 0.04 215), 0 0 0 4px #fff; }
.ncat-act { display: flex; gap: 8px; justify-content: flex-end; }
.sec { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: -6px; } .sec-t { display: flex; align-items: baseline; gap: 12px; } .sec h2 { font-size: 20px; font-weight: 800; } .sec small { font-size: 13px; font-weight: 600; color: var(--muted); }
.w { padding: 18px 20px 16px; gap: 6px; } .w-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.w-tag { font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; background: var(--fill); color: var(--muted); } .w-tag.now { background: var(--accent-tint); color: var(--accent-text); }
.w .gl-v { font-size: 30px; } .tc { display: inline-flex; align-items: center; gap: 10px; }
.gl-vis { margin-top: auto; min-height: 66px; display: flex; flex-direction: column; justify-content: flex-end; padding-top: 10px; }
.g12 > div > .gl { flex: 1; }
.mb { display: flex; flex-direction: column; gap: 4px; } .mb-plot { position: relative; display: flex; align-items: flex-end; gap: 4px; height: 46px; } .mb-plot .mbar { flex: 1; border-radius: 3px 3px 1px 1px; background: var(--card-teal); } .mb-plot .mbar.cur { background: var(--accent); } .mb-plot .mbar.fut { background: var(--fill-strong); } .mb-plot .mbar.q { background: var(--card-indigo); opacity: 0.85; }
.mb-plot u { position: absolute; left: 0; right: 0; height: 0; border-top: 2px dashed var(--fg); opacity: 0.5; } .mb-l { display: flex; gap: 4px; font-size: 10px; font-weight: 800; color: var(--muted); } .mb-l span { flex: 1; text-align: center; }
.sp2 { display: flex; flex-direction: column; gap: 9px; } .sp2-b { display: flex; gap: 2px; height: 14px; border-radius: 999px; overflow: hidden; background: var(--fill); } .sp2-b i { display: block; height: 100%; }
.sp2-l { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 11.5px; font-weight: 600; color: var(--muted); } .sp2-l b { color: var(--fg); font-weight: 800; } .sp2-l .md { margin-right: 4px; }
.bl { display: flex; flex-direction: column; gap: 6px; } .bl-r { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 10px; align-items: center; font-size: 12px; } .bl-r b { font-weight: 800; } .bl-r span b { display: block; font-size: 12.5px; } .bl-r small { font-size: 11px; font-weight: 600; color: var(--muted); } .ci-s { width: 22px !important; height: 22px !important; border-radius: 7px !important; }
.pills { display: flex; gap: 4px; flex-wrap: wrap; } .pl { flex: 1; min-width: 20px; height: 30px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; background: var(--fill); color: var(--muted); }
.pl.ok { background: var(--accent-tint); color: var(--accent-text); } .pl.bad { background: var(--negative-tint); color: var(--negative); } .pl.mid { background: var(--warning-tint); color: var(--warning-text); } .pl.cur { background: var(--ink); color: var(--on-ink); } .pl.fut { background: transparent; border: 1.5px dashed var(--fill-strong); } .pl.none { background: repeating-linear-gradient(135deg, var(--fill) 0 4px, transparent 4px 8px); }
.wdays { display: flex; gap: 6px; height: 56px; } .wd { flex: 1; display: grid; grid-template-rows: 1fr 14px; gap: 3px; } .wd i { align-self: end; display: block; border-radius: 4px 4px 1px 1px; background: var(--card-teal); } .wd.cur i { background: var(--accent); } .wd.fut i { background: var(--fill-strong); } .wd em { font-style: normal; font-size: 10px; font-weight: 800; color: var(--muted); text-align: center; }
.my { display: flex; flex-direction: column; gap: 2px; flex: 1; justify-content: space-between; } .my-r { display: grid; grid-template-columns: 38px minmax(0, 1fr) 88px 96px; align-items: center; gap: 14px; padding: 7px 12px; border-radius: 12px; } .my-r.on { background: var(--accent-tint); } .my-r.fut { opacity: 0.5; } .my-r > b:first-child { font-size: 13px; font-weight: 800; } .my-r small { font-size: 11.5px; font-weight: 700; color: var(--muted); text-align: right; } .my-r small.neg { color: var(--negative); }
.mg { display: flex; flex-direction: column; gap: 2px; } .mg-r { display: grid; grid-template-columns: 34px minmax(0, 1fr) 30px 30px 30px; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 12px; } .mg-r:hover { background: var(--fill); } .mg-r.off { opacity: 0.55; } .mg-r.off .mg-n b { text-decoration: line-through; }
.mg-n b { font-size: 13.5px; font-weight: 800; } .mg-n em { font-style: normal; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; background: var(--accent-tint); color: var(--accent-text); padding: 2px 7px; border-radius: 999px; margin-left: 8px; }
.mg-a { width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); background: var(--fill); } .mg-a i { width: 14px; height: 14px; border-radius: 50%; } .mg-a.eye { background: var(--accent-tint); color: var(--accent-text); } .mg-a.eye.off { background: var(--fill); color: var(--muted); }
.mg-i { height: 34px; padding: 0 10px; font-size: 13.5px; } .mg-i .caret { height: 16px; }
.ph .hh { gap: 14px 20px; } .ph .hh b { font-size: 24px; } .ph .hh-d { flex-basis: 100%; } .ph .hh-d b { font-size: 20px; } .ph .hh-s b { font-size: 26px; } .ph .hero-hd { align-items: flex-start; }
.ph .w { padding: 14px 14px 13px; } .ph .w .gl-v { font-size: 24px; } .ph .gl-vis { min-height: 54px; } .ph .mb-plot { height: 38px; } .ph .gl.wide { grid-column: 1 / -1; }
.ph .sec h2 { font-size: 18px; } .ph .sec { flex-wrap: wrap; } .ph .my-r { grid-template-columns: 34px minmax(0, 1fr) 72px; gap: 10px; padding: 6px 8px; } .ph .my-r small { display: none; }
.ph .ncat { padding: 10px; } .ph .sw-c { width: 30px; height: 30px; }
`;

export const R4 = String.raw`
/* ---- round 4: the hero's top section ---- */
.hero4 { flex-direction: column; gap: 20px; }
.hero4 .hero-main { display: flex; gap: 26px; }
.hero4 .hero-hd4 { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.hero4 .hero-hd4 > :first-child { flex: 1; min-width: 0; }
.h1-top, .h3-top { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.hero4 .strip-in .bstrip { background: oklch(1 0 0 / 0.08); border: 1px solid oklch(1 0 0 / 0.14); box-shadow: none; color: #fff; }
.hero4 .bstrip .bs-l small, .hero4 .bstrip .bs-l em, .hero4 .bs-foot, .hero4 .bs-d { color: oklch(1 0 0 / 0.65); } .hero4 .bstrip .bs-l b, .hero4 .bs-foot b, .hero4 .bs-d b { color: #fff; }
.hero4 .bstrip .bs-bar { background: oklch(1 0 0 / 0.16); } .hero4 .bstrip .bs-bar i { background: var(--on-card-lime); } .hero4 .bstrip .bs-bar.warn i { background: oklch(0.85 0.14 85); } .hero4 .bstrip .bs-bar u { background: #fff; }
.hero4 .pin-tag { display: none; } .hero4 .pill-warn { background: oklch(0.85 0.14 85 / 0.2); color: oklch(0.9 0.12 85); }
.dbadge { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; width: 68px; height: 74px; border-radius: 18px; background: linear-gradient(160deg, oklch(1 0 0 / 0.2), oklch(1 0 0 / 0.07)); border: 1px solid oklch(1 0 0 / 0.2); color: #fff; flex-shrink: 0; line-height: 1; }
.dbadge small { font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--on-card-lime); } .dbadge b { font-size: 30px; font-weight: 800; margin: 3px 0 2px; color: #fff; } .dbadge em { font-style: normal; font-size: 10.5px; font-weight: 700; color: oklch(1 0 0 / 0.6); text-transform: uppercase; letter-spacing: 0.06em; }
.dbadge.sm { width: 46px; height: 50px; border-radius: 13px; } .dbadge.sm b { font-size: 20px; margin: 1px 0 0; } .dbadge.sm small { font-size: 9px; } .dbadge.sm em { display: none; }
.sp-i { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: oklch(1 0 0 / 0.72); } .sp-i .md { box-shadow: 0 0 0 1.5px oklch(0.2 0.04 215); } .hero4 .md-u { background: oklch(0.82 0.13 190); } .hero4 .md-c { background: oklch(0.74 0.16 25); }
/* H1 */
.hh1 { display: flex; flex-direction: column; gap: 14px; } .h1-chips { display: grid; grid-template-columns: auto 1fr; gap: 14px; }
.h1-date { display: flex; align-items: center; gap: 12px; padding-right: 8px; } .h1-date b { display: block; font-size: 18px; font-weight: 800; color: #fff; } .h1-date small { font-size: 12px; font-weight: 700; color: oklch(1 0 0 / 0.62); }
.h1-chip { display: flex; align-items: center; gap: 12px; padding: 10px 16px 10px 12px; min-height: 64px; border-radius: 18px; background: oklch(1 0 0 / 0.08); border: 1px solid oklch(1 0 0 / 0.14); } 
.h1-ic { width: 36px; height: 36px; border-radius: 11px; background: oklch(1 0 0 / 0.14); display: inline-flex; align-items: center; justify-content: center; color: var(--on-card-lime); flex-shrink: 0; }
.h1-v small { display: block; font-size: 11.5px; font-weight: 700; color: oklch(1 0 0 / 0.62); } .h1-v b { display: block; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; color: #fff; }
.h1-sub { display: flex; flex-direction: column; gap: 2px; padding-left: 12px; border-left: 1px solid oklch(1 0 0 / 0.14); }
.h1-meter { flex: 1; min-width: 110px; display: flex; flex-direction: column; gap: 6px; padding-left: 12px; border-left: 1px solid oklch(1 0 0 / 0.14); } .h1-bar { display: block; height: 8px; border-radius: 999px; background: oklch(1 0 0 / 0.16); overflow: hidden; } .h1-bar i { display: block; height: 100%; border-radius: 999px; background: var(--on-card-lime); } .h1-meter em { font-style: normal; font-size: 11.5px; font-weight: 700; color: oklch(1 0 0 / 0.7); }
/* H2 */
.hh2 { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
.h2-today small, .h2-month small { display: block; font-size: 12px; font-weight: 700; color: oklch(1 0 0 / 0.62); } .h2-today b, .h2-month b { display: block; font-size: 32px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; color: #fff; }
.h2-split { display: flex; gap: 14px; margin-top: 4px; } .h2-rule { width: 1px; align-self: stretch; background: oklch(1 0 0 / 0.14); }
.h2-month { display: flex; align-items: center; gap: 14px; } .h2-month em { display: block; font-style: normal; font-size: 12px; font-weight: 700; color: oklch(1 0 0 / 0.62); margin-top: 2px; } .mring { flex-shrink: 0; }
/* H3 */
.hh3 { display: flex; flex-direction: column; gap: 12px; }
.h3-date { display: flex; align-items: baseline; gap: 10px; } .h3-date b { font-size: 20px; font-weight: 800; color: #fff; } .h3-date span { font-size: 12.5px; font-weight: 700; color: oklch(1 0 0 / 0.62); }
.h3-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.h3-tile { display: flex; flex-direction: column; gap: 6px; padding: 14px 18px 14px; border-radius: 18px; background: oklch(1 0 0 / 0.08); border: 1px solid oklch(1 0 0 / 0.14); } .h3-tile small { font-size: 12px; font-weight: 700; color: oklch(1 0 0 / 0.62); } .h3-tile b { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; color: #fff; }
.h3-bar { display: flex; gap: 2px; height: 8px; border-radius: 999px; background: oklch(1 0 0 / 0.16); overflow: hidden; margin-top: 2px; } .h3-bar i { display: block; height: 100%; } .h3-tile em { display: flex; gap: 14px; font-style: normal; font-size: 12px; font-weight: 700; color: oklch(1 0 0 / 0.7); }
/* H4 */
.hh4 { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.h4-main small { display: block; font-size: 12px; font-weight: 700; color: oklch(1 0 0 / 0.62); } .h4-main b { display: block; font-size: 48px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; color: #fff; margin: 2px 0 4px; } .h4-main p { font-size: 14px; font-weight: 600; color: oklch(1 0 0 / 0.72); margin: 0; }
.h4-side { display: flex; gap: 10px; flex-wrap: wrap; } .h4-pill { display: flex; flex-direction: column; gap: 2px; padding: 9px 16px; border-radius: 16px; background: var(--on-card-lime); color: oklch(0.25 0.06 140); min-width: 116px; } .h4-pill small { font-size: 11px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; opacity: 0.8; } .h4-pill b { font-size: 22px; font-weight: 800; line-height: 1.1; } .h4-pill.soft { background: oklch(1 0 0 / 0.1); color: #fff; border: 1px solid oklch(1 0 0 / 0.16); } .h4-pill.soft small { color: oklch(1 0 0 / 0.7); opacity: 1; } .h4-pill.soft b { font-size: 15px; color: #fff; }
/* phone */
.ph .hero4 { padding: 18px; gap: 16px; } .ph .hero4 .hero-main { flex-direction: column; gap: 18px; }
.ph .hero4 .bstrip.wide { flex-direction: column; align-items: stretch; gap: 10px; padding: 14px 16px; } .ph .hero4 .bstrip.wide .bs-r { justify-content: space-between; }
.ph .hh1 { gap: 12px; } .ph .h1-chips { grid-template-columns: 1fr; gap: 10px; } .ph .h1-v b { font-size: 22px; } .ph .h1-sub { margin-left: auto; }
.ph .hh2 { gap: 14px 18px; } .ph .hh2 .dbadge { width: 58px; height: 64px; } .ph .h2-rule { display: none; } .ph .h2-today b, .ph .h2-month b { font-size: 26px; } .ph .h2-month { flex: 1 1 100%; }
.ph .h3-tiles { gap: 10px; } .ph .h3-tile { padding: 12px 14px; } .ph .h3-tile b { font-size: 22px; } .ph .h3-tile em { flex-direction: column; gap: 2px; }
.ph .h4-main b { font-size: 40px; } .ph .h4-side { width: 100%; } .ph .h4-pill { flex: 1; }
`;

export const R5 = String.raw`
/* ---- round 5: the strip under the hero ---- */
.under { margin-top: 18px; } .under .pin-tag { display: none; }
.sl { display: flex; align-items: center; gap: 22px; padding: 12px 22px; min-height: 64px; border-radius: 20px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--card-shadow); }
.sl-l small { display: block; font-size: 11.5px; font-weight: 700; color: var(--muted); } .sl-l b { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; white-space: nowrap; } .sl-l b.neg { color: var(--negative); }
.sl-m { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; } .sl-m small { font-size: 12px; font-weight: 600; color: var(--muted); } .sl-m small b { color: var(--fg); font-weight: 800; }
.sl-r { display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; font-weight: 600; color: var(--muted); text-align: right; white-space: nowrap; } .sl-r b { color: var(--fg); font-weight: 800; } .sl-r b.neg { color: var(--negative); }
.s3 { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 0; border-radius: 22px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--card-shadow); overflow: hidden; }
.s3-l { display: flex; flex-direction: column; gap: 12px; padding: 18px 24px; justify-content: center; } .s3-l small { font-size: 12px; font-weight: 700; color: var(--muted); }
.s3-big { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; } .s3-big b { font-size: 32px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; } .s3-big b.neg { color: var(--negative); } .s3-big em { font-style: normal; font-size: 13px; font-weight: 600; color: var(--muted); } .s3-big .pill { align-self: center; margin-left: auto; }
.s3-cells { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-left: 1px solid var(--surface-line); }
.s3-c { display: flex; flex-direction: column; gap: 4px; padding: 18px 20px; justify-content: center; } .s3-c + .s3-c { border-left: 1px solid var(--surface-line); } .s3-c small { font-size: 12px; font-weight: 700; color: var(--muted); } .s3-c b { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; } .s3-c b.neg { color: var(--negative); } .s3-c em { font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--muted); }
.ph .under { margin-top: 14px; }
.ph .sl { flex-wrap: wrap; gap: 10px 14px; padding: 14px 16px; } .ph .sl-m { order: 3; flex: 1 1 100%; } .ph .sl .pill { margin-left: auto; } .ph .sl-r { order: 4; flex: 1 1 100%; flex-direction: row; justify-content: space-between; text-align: left; }
.ph .s3 { grid-template-columns: 1fr; } .ph .s3-cells { border-left: 0; border-top: 1px solid var(--surface-line); } .ph .s3-c { padding: 14px 12px; } .ph .s3-c em { display: none; } .ph .s3-c b { font-size: 19px; } .ph .s3-l { padding: 16px; }
`;
