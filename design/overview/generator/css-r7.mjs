// Round 7's styles: the refined Bento (a trend line in the net worth block, a mark on every tile) and the two sections at the foot of the page.
export const R7 = String.raw`
.stg2.r7-h { --h1: oklch(0.38 0.15 280); --h2: oklch(0.17 0.07 270); --hc: oklch(0.52 0.15 280); flex-direction: row; justify-content: space-between; align-items: stretch; padding: 34px 40px; gap: 40px; }
.r7-l { display: grid; gap: 14px; min-width: 0; flex: 1; align-content: start; } .r7-l .nwc { font-size: 92px; }
.tr7 { position: relative; margin-top: 4px; } .tr7s { width: 100%; display: block; } .tr7l { fill: none; stroke: #fff; stroke-width: 3.4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; animation: draw 1500ms 150ms cubic-bezier(0.3, 0.7, 0.2, 1) both; }
.tr7h { position: absolute; inset: 0; } .th { position: absolute; top: 0; bottom: 0; cursor: pointer; } .th:hover { background: oklch(1 0 0 / 0.07); }
.th-p { position: absolute; left: 50%; width: calc(9px + var(--sel, 0) * 9px); height: calc(9px + var(--sel, 0) * 9px); transform: translate(-50%, -50%); border-radius: 50%; background: #fff; box-shadow: 0 0 0 calc(var(--sel, 0) * 5px) oklch(1 0 0 / 0.3); transition: all 220ms; }
.th-t { position: absolute; left: 50%; transform: translateX(-50%); padding: 4px 9px; border-radius: 9px; background: #fff; color: oklch(0.22 0.05 275); font-size: 11.5px; font-weight: 800; white-space: nowrap; opacity: var(--sel, 0); transition: opacity 200ms; }
.th em { position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%); font-style: normal; font-size: 11px; font-weight: 700; color: oklch(1 0 0 / 0.72); }
.l1-hr { align-self: center; }

/* the marks on the tiles */
.tl-m { min-height: 172px; } .tl-m .tl-h { justify-content: flex-start; gap: 8px; }
.mk { position: absolute; right: 16px; top: 14px; width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(160deg, oklch(1 0 0 / 0.97), oklch(0.92 0.03 270 / 0.95)); box-shadow: inset 0 -3px 6px oklch(0 0 0 / 0.08), 0 8px 18px oklch(0 0 0 / 0.28); display: flex; align-items: center; justify-content: center; transition: transform 240ms var(--ease-out, ease); } .tl-m:hover .mk { transform: rotate(-6deg) scale(1.06); } .mk svg { width: 46px; height: 46px; }
.mk-s { position: absolute; right: 16px; top: 88px; width: 104px; display: block; } .msp { width: 104px; height: 32px; display: block; } .msp path { fill: none; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-dasharray: 1; animation: draw 1300ms both; } .mbs { display: flex; gap: 3px; height: 8px; margin-top: 4px; } .mbs i { display: block; height: 100%; border-radius: 4px; background: #fff; }
.mk-r { position: absolute; right: 16px; top: 14px; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; } .mk-r b { position: absolute; font-size: 14px; font-weight: 800; } .mrg { width: 64px; height: 64px; transform: rotate(-90deg); } .mrg-t { fill: none; stroke: oklch(1 0 0 / 0.24); stroke-width: 5; } .mrg-v { fill: none; stroke: #fff; stroke-width: 5; stroke-linecap: round; }
.mk-cards { position: absolute; right: 12px; top: 12px; width: 138px; height: 104px; }
.cdm { position: absolute; width: 106px; height: 66px; border-radius: 10px; padding: 7px 9px; color: #fff; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 16px oklch(0 0 0 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.3); overflow: hidden; transition: transform 260ms var(--ease-out, ease); }
.cdm::after { content: ""; position: absolute; inset: 0; background: radial-gradient(120% 90% at 100% 0%, oklch(1 0 0 / 0.22), transparent 60%); }
.cdm-0 { right: 0; top: 0; transform: rotate(6deg); z-index: 2; } .cdm-1 { left: 0; top: 34px; transform: rotate(-9deg); z-index: 1; } .tl-m:hover .cdm-0 { transform: rotate(10deg) translateY(-3px); } .tl-m:hover .cdm-1 { transform: rotate(-13deg); }
.cdm b { font-size: 9.5px; font-weight: 700; position: relative; z-index: 1; } .cdm em { font-style: normal; font-size: 8.5px; letter-spacing: 0.06em; opacity: 0.85; position: relative; z-index: 1; } .cdm span { display: block; height: 3px; border-radius: 2px; background: oklch(1 0 0 / 0.75); position: relative; z-index: 1; }

/* the foot of the page */
.r7-b { display: grid; grid-template-columns: 1fr 1.15fr; gap: 20px; align-items: stretch; }
.r7-b > .card:first-child > div:last-child { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
.r7 { display: flex; flex-direction: column; gap: 24px; }
.r7 .ins .btn-ghost { background: var(--fill); color: var(--fg); }
.r7 .stg2[data-b="q3"] { --h1: oklch(0.37 0.13 285); --h2: oklch(0.16 0.06 280); --hc: oklch(0.5 0.13 285); }
.r7 .stg2[data-b="q1"] { --h1: oklch(0.34 0.09 215); --h2: oklch(0.15 0.04 225); --hc: oklch(0.5 0.1 215); }
`;
