// Round 4 styles: G13 Flow, G14 Orbit, G15 Receipt, G16 Calendar.
export const CSS4 = String.raw`
/* G13 flow */
.fl { display: grid; grid-template-columns: 760px minmax(0, 1fr); align-items: start; }
.fl-svg, .fl-cards { position: relative; }
.fl-lab { position: absolute; display: flex; flex-direction: column; gap: 2px; font-size: 12px; font-weight: 600; pointer-events: none; }
.fl-lab b { font-size: 13px; font-weight: 800; } .fl-lab small { font-size: 11.5px; font-weight: 600; opacity: 0.8; }
.fl-n { font-size: 24px !important; letter-spacing: -0.02em; } .fl-big { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; }
.fl-c { position: absolute; left: 0; right: 0; display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 0 16px; border-radius: 16px; color: var(--on-card); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.16), 0 3px 10px oklch(0 0 0 / 0.1); }
.fl-c b { font-size: 13px; font-weight: 800; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .fl-c small { font-size: 11px; font-weight: 600; opacity: 0.85; display: block; }
.fl-c .cc-gb > b { display: block; } .fl-c .hc-wrap { color: var(--fg); }
.fl-c.hov > .hc-wrap { bottom: auto; top: 100%; left: auto; right: 12px; margin-left: 0; }
.fl-end { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; } .fl-end b { font-size: 13px; }
.fl-end .pill { padding: 2px 9px; font-size: 10.5px; }
/* G14 orbit */
.or-grid { display: grid; grid-template-columns: 780px minmax(0, 1fr); gap: 28px; align-items: stretch; }
.or-sky { position: relative; width: 780px; height: 780px; border-radius: 30px; background: radial-gradient(circle at 50% 50%, oklch(0.27 0.07 262), oklch(0.12 0.035 268) 75%); color: white; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.14); }
.or-stars { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; } .or-stars i { position: absolute; border-radius: 50%; background: white; }
.or-ring { position: absolute; transform: translate(-50%, -50%); font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: oklch(1 0 0 / 0.5); background: oklch(0.17 0.04 265); padding: 1px 8px; border-radius: 999px; }
.or-sun { position: absolute; width: 156px; height: 156px; margin: -78px 0 0 -78px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: radial-gradient(circle at 35% 30%, oklch(0.78 0.16 150), oklch(0.42 0.11 155) 70%); box-shadow: 0 0 60px oklch(0.8 0.17 140 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.3); }
.or-sun b { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; } .or-sun small { font-size: 11.5px; font-weight: 700; opacity: 0.85; }
.or-p { position: absolute; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: default; z-index: 2; }
.or-p:hover, .or-p:focus-visible { z-index: 40; }
.or-core { position: absolute; inset: 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.25); }
.or-core .gtile { background: transparent !important; box-shadow: none; }
.or-flag { position: absolute; right: -4px; top: -4px; width: 18px; height: 18px; border-radius: 50%; background: var(--negative); display: flex; align-items: center; justify-content: center; color: white; }
.or-n { position: absolute; left: 50%; transform: translateX(-50%); white-space: nowrap; text-align: center; pointer-events: none; text-shadow: 0 1px 6px oklch(0 0 0 / 0.7); }
.or-n b { display: block; font-size: 11.5px; font-weight: 800; } .or-n small { display: block; font-size: 10px; font-weight: 600; opacity: 0.8; }
.or-p .hc-wrap { color: var(--fg); text-shadow: none; }
.or-key { position: absolute; left: 22px; top: 18px; display: flex; gap: 16px; font-size: 11px; font-weight: 700; color: oklch(1 0 0 / 0.6); align-items: center; } .or-key span { display: inline-flex; align-items: center; gap: 5px; }
.or-row { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--divider); }
.or-row b { font-size: 13px; font-weight: 800; display: block; } .or-row small { font-size: 11px; color: var(--muted); font-weight: 600; display: block; margin-top: 1px; }
.or-dots { display: flex; gap: 4px; flex-wrap: wrap; }
/* G15 receipt */
.rc-grid { display: grid; grid-template-columns: 620px minmax(0, 1fr); gap: 28px; align-items: stretch; }
.rcpt { --paper: oklch(0.992 0.01 92); position: relative; background: var(--paper); color: oklch(0.26 0.02 80); font-family: ui-monospace, "SF Mono", Menlo, monospace; padding: 28px 28px 30px; border-radius: 6px 6px 0 0; box-shadow: 0 1px 2px oklch(0 0 0 / 0.06), 0 12px 28px oklch(0 0 0 / 0.1); margin-bottom: 10px; display: flex; flex-direction: column; gap: 6px; }
.rcpt::after { content: ""; position: absolute; left: 0; right: 0; bottom: -10px; height: 10px; background: linear-gradient(135deg, var(--paper) 25%, transparent 25%) -10px 0, linear-gradient(225deg, var(--paper) 25%, transparent 25%) -10px 0; background-size: 20px 20px; }
.rc-h { text-align: center; display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px; } .rc-h b { font-size: 17px; letter-spacing: 0.12em; } .rc-h span { font-size: 11px; opacity: 0.7; letter-spacing: 0.06em; }
.rc-cols { display: flex; justify-content: space-between; font-size: 10px; letter-spacing: 0.1em; opacity: 0.6; border-bottom: 1.5px dashed oklch(0.26 0.02 80 / 0.4); padding-bottom: 6px; } .rc-cols span:nth-child(2) { margin-left: auto; width: 96px; text-align: right; } .rc-cols span:nth-child(3) { width: 100px; text-align: right; }
.rc-b { display: flex; flex-direction: column; gap: 2px; padding-top: 6px; }
.rc-l { display: flex; align-items: baseline; gap: 8px; font-size: 13px; font-weight: 700; padding: 5px 0 1px; } .rc-l.sub { font-size: 12px; font-weight: 500; padding: 1px 0 1px 20px; } .rc-l.off { opacity: 0.45; text-decoration: line-through; }
.rc-sw { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; align-self: center; display: inline-block; }
.rc-nm { white-space: nowrap; } .rc-dots { flex: 1; border-bottom: 1.5px dotted oklch(0.26 0.02 80 / 0.45); transform: translateY(-3px); min-width: 12px; }
.rc-sv { width: 96px; text-align: right; opacity: 0.7; font-weight: 500; } .rc-tg { width: 100px; text-align: right; }
.rc-need { font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; background: var(--need); color: white; padding: 1px 5px; border-radius: 3px; vertical-align: 1px; }
.rc-rule { border-top: 1.5px dashed oklch(0.26 0.02 80 / 0.4); margin: 8px 0; } .rc-rule.dbl { border-top: 3px double oklch(0.26 0.02 80 / 0.5); }
.rc-t { display: flex; justify-content: space-between; font-size: 12.5px; } .rc-t.big { font-size: 15px; font-weight: 800; }
.rc-f { text-align: center; font-size: 10.5px; letter-spacing: 0.08em; opacity: 0.65; line-height: 1.6; margin-top: 4px; }
.rc-bar { display: flex; justify-content: center; height: 40px; margin-top: 8px; } .rc-bar i { display: block; height: 100%; background: oklch(0.26 0.02 80); }
.rc-right { display: flex; flex-direction: column; gap: 14px; }
.rc-mini { display: flex; flex-direction: column; gap: 12px; } .rc-mini > div { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto 54px; gap: 6px 10px; align-items: center; font-size: 13px; font-weight: 700; } .rc-mini span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .rc-mini em { font-style: normal; font-size: 11px; opacity: 0.75; text-align: right; }
/* G16 calendar */
.ca-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; align-items: stretch; }
.ca-m { background: var(--fill); border-radius: 22px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.ca-mh { display: flex; justify-content: space-between; align-items: baseline; } .ca-mh b { font-size: 15px; font-weight: 800; } .ca-mh span { font-size: 11.5px; font-weight: 700; color: var(--muted); }
.ca-w, .ca-g { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; } .ca-w span { text-align: center; font-size: 10px; font-weight: 800; color: var(--muted); letter-spacing: 0.04em; }
.ca-d { position: relative; aspect-ratio: 1; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: oklch(1 0 0 / 0.5); } .ca-d.off { background: transparent; }
.ca-d em { position: absolute; left: 5px; top: 3px; font-style: normal; font-size: 9.5px; font-weight: 700; color: var(--muted); }
.ca-d.today { outline: 2px solid var(--ink); outline-offset: -2px; } .ca-d.today em { color: var(--ink); font-weight: 800; }
.ca-due { width: 26px; height: 26px; border-radius: 9px; display: flex; align-items: center; justify-content: center; color: var(--on-card); margin-top: 8px; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.2), 0 2px 5px oklch(0 0 0 / 0.2); } .ca-due b { font-size: 12px; font-weight: 800; }
.ca-set { display: grid; grid-template-columns: repeat(3, 6px); gap: 2px; margin-top: 8px; } .ca-set i { width: 6px; height: 6px; border-radius: 2px; }
.ca-d.has-due { background: color-mix(in oklch, var(--negative) 8%, white); }
.ca-d .hc-wrap { color: var(--fg); } .ca-d.hov > .hc-wrap { left: 50%; margin-left: -125px; }
.ca-f { display: flex; flex-direction: column; gap: 8px; margin-top: auto; padding-top: 6px; } .ca-f .between b { font-size: 13px; }
.ca-due-l { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 12px; border-radius: 14px; color: var(--on-card); } .ca-due-l b { font-size: 12.5px; font-weight: 800; display: block; } .ca-due-l small { font-size: 10.5px; font-weight: 600; opacity: 0.85; display: block; }
.ca-none { font-size: 12px; color: var(--muted); font-weight: 600; padding: 10px 0; }
.ca-later { display: flex; flex-direction: column; gap: 10px; } .ca-lr { display: flex; gap: 10px; flex-wrap: wrap; }
.ca-set.past i { opacity: 0.4; } .ca-lr > .cc { min-width: 0; } .ca-lr .cc b { overflow: hidden; text-overflow: ellipsis; }
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

/* Final page: the picked Orbit */
.or-side { display: none; flex-direction: column; gap: 14px; min-width: 0; } .or-side-all { display: flex; }
.or-list { background: var(--fill); border-radius: 20px; padding: 14px 16px; display: flex; flex-direction: column; flex: 1; gap: 4px; min-height: 0; }
.or-pr { flex: 1; display: grid; grid-template-columns: 28px minmax(0, 1.1fr) minmax(0, 1fr) auto; gap: 12px; align-items: center; border-bottom: 1px solid var(--divider); padding: 6px 0; } .or-pr:last-child { border-bottom: 0; }
.or-pr b { font-size: 13px; font-weight: 800; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .or-pr small { font-size: 11px; color: var(--muted); font-weight: 600; display: block; }
.or-all { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; background: var(--fill); font-size: 12px; font-weight: 800; cursor: pointer; }
.or-p.full { box-shadow: 0 0 22px oklch(1 0 0 / 0.5); } .or-p.off { opacity: 0.55; } .or-p.late { box-shadow: 0 0 24px oklch(0.7 0.2 25 / 0.6); }
.or-over { position: absolute; left: calc(100% - 6px); top: -6px; padding: 2px 7px; border-radius: 999px; background: oklch(0.88 0.17 140); color: oklch(0.2 0.05 150); font-size: 10px; font-weight: 800; white-space: nowrap; }
.or-ring.red { background: oklch(0.3 0.1 20); color: oklch(0.88 0.1 25); }
.or-num { font-size: 11px; font-weight: 800; color: white; }
.notice-red { background: oklch(0.95 0.045 25); color: oklch(0.38 0.14 25); }
.ph-sky { display: flex; justify-content: center; overflow: hidden; border-radius: 22px; } .ph-sky .or-sky { border-radius: 22px; }
.ph-list { display: flex; flex-direction: column; } .ph-li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--divider); } .ph-li:last-child { border-bottom: 0; }
.ph-li b { font-size: 13px; font-weight: 800; display: block; } .ph-li small { font-size: 11px; color: var(--muted); font-weight: 600; display: block; margin-bottom: 4px; }
.ph-n { width: 26px; height: 26px; border-radius: 9px; color: white; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }
.ph .or-pr { grid-template-columns: 28px minmax(0, 1fr) auto; } .ph .or-pr > div:nth-child(3):not(:last-child) { display: none; } .ph .cc { padding: 16px; }
.ph-notice { font-size: 12.5px; flex-wrap: wrap; } .ph-notice .grow { flex-basis: calc(100% - 40px); }
.gmenu { width: 260px; background: var(--surface); border-radius: 18px; box-shadow: var(--pop-shadow); padding: 6px; display: flex; flex-direction: column; border: 1px solid var(--surface-line); }
.gm-i { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; font-size: 13.5px; font-weight: 700; } .gm-i:first-child { background: var(--fill); } .gm-i.bad { color: var(--negative); } .gm-div { height: 1px; background: var(--divider); margin: 4px 8px; }
`;
