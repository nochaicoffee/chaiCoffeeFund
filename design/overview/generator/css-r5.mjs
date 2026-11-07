// Round 5's styles: the borrowed illustrations and cup in our language, and the Town board.
import * as H from "./history.mjs";
import { TOWN, upH, downH } from "./r5.mjs";

const key = (p, k) => `#${p}-${k}:checked`;
const monthRules = H.HIST.map((r, i) => {
  const d = [...TOWN.up.map((b) => `--uh-${b.k}: ${upH(r, b.k)}`), ...TOWN.down.map((b) => `--dh-${b.k}: ${downH(r, b.k)}`)];
  return `.chai-app:has(${key("m", i)}) { ${d.join("; ")}; }`;
}).join("\n");

const R5A = String.raw`
/* ---- Borrowed from the neubrutalism exploration, in our language ---- */
.pg-lead { display: flex; align-items: center; gap: 20px; min-width: 0; }
.mascot { flex-shrink: 0; width: 88px; height: 88px; display: inline-flex; animation: sip 5s ease-in-out infinite; transform-origin: 50% 90%; } .mascot svg { width: 100%; height: 100%; }
@keyframes sip { 0%, 100% { transform: rotate(-3deg) translateY(0); } 50% { transform: rotate(3deg) translateY(-4px); } }
.spt { padding: 0; overflow: hidden; } .spt:has(.art) { background: linear-gradient(160deg, oklch(1 0 0 / 0.97), oklch(0.93 0.03 270 / 0.95)) !important; box-shadow: inset 0 -3px 6px oklch(0 0 0 / 0.07), 0 4px 10px oklch(0 0 0 / 0.16); }
.icf { width: 100%; height: 100%; display: inline-flex; align-items: center; justify-content: center; border-radius: inherit; color: #fff; }
.spt svg.art { width: 80%; height: 80%; filter: drop-shadow(0 2px 2px rgba(10, 12, 40, 0.22)) !important; }
.lc-ic.spt, .pg-ic.spt { width: 42px; height: 42px; border-radius: 14px; } .lc, .lc-s { grid-template-columns: 42px minmax(0, 1fr) auto auto; } .pg { grid-template-columns: 42px minmax(0, 1fr) auto auto; }
.mc-ic.spt { width: 34px; height: 34px; border-radius: 12px; } .c-inv .mc-ic.sptt { width: 44px; height: 44px; }
.s-eb .mc-ic.sptt { width: 30px; height: 30px; }
.eq-ic { border: 0 !important; background: transparent !important; width: 48px !important; height: 48px !important; } .eq-ic svg { width: 48px; height: 48px; }
.ux-a, .tm-a, .orb-a { display: none !important; } .ux-a { display: block; margin: 0 auto 4px; width: 34px; height: 34px; } .ux-a svg { width: 100%; height: 100%; }
.tm-fixed .tm-a, .tm-lent .tm-a, .tm-bank .tm-a { display: none; } .tm-a { position: absolute; top: 10px; right: 10px; opacity: 0.95; } .tm-invest .tm-a svg { width: 64px; height: 64px; }
.orb-a { display: block; margin: 0 auto 2px; height: 30px; } .orb-a svg { height: 30px; width: 30px; } .orb-cards .orb-a, .orb-bank .orb-a { display: none; }

/* ---- I1 Town ---- */
.town { container-type: inline-size; position: relative; aspect-ratio: 1000 / 700; border-radius: 28px; overflow: hidden; box-shadow: 0 18px 40px oklch(0 0 0 / 0.3); }
.town-in { --u: calc(100cqw / 1000); position: absolute; inset: 0; }
.sky { position: absolute; left: 0; right: 0; top: 0; height: calc(402 * var(--u)); background: radial-gradient(60% 70% at 12% 8%, oklch(0.95 0.1 95 / 0.55), transparent 60%), linear-gradient(180deg, oklch(0.62 0.1 225), oklch(0.82 0.07 215) 78%, oklch(0.9 0.06 200)); }
.soil { position: absolute; left: 0; right: 0; top: calc(430 * var(--u)); bottom: 0; background: repeating-linear-gradient(0deg, oklch(0 0 0 / 0.06) 0 calc(2 * var(--u)), transparent calc(2 * var(--u)) calc(34 * var(--u))), linear-gradient(180deg, oklch(0.36 0.06 55), oklch(0.2 0.04 45)); }
.road { position: absolute; left: 0; right: 0; top: calc(400 * var(--u)); height: calc(34 * var(--u)); background: linear-gradient(180deg, oklch(0.52 0.12 150) 0 calc(8 * var(--u)), oklch(0.34 0.02 260) calc(8 * var(--u))); z-index: 3; }
.dashes { position: absolute; left: 0; right: 0; bottom: calc(8 * var(--u)); height: calc(4 * var(--u)); background: repeating-linear-gradient(90deg, oklch(1 0 0 / 0.75) 0 calc(34 * var(--u)), transparent calc(34 * var(--u)) calc(68 * var(--u))); animation: slide 5s linear infinite; } @keyframes slide { to { background-position: calc(68 * var(--u)) 0; } }
.drive { position: absolute; top: calc(352 * var(--u)); left: 0; z-index: 4; animation: drive 28s linear infinite; } @keyframes drive { from { transform: translateX(calc(-80 * var(--u))); } to { transform: translateX(calc(1060 * var(--u))); } }
.sunny { position: absolute; left: calc(28 * var(--u)); top: calc(26 * var(--u)); animation: spin 40s linear infinite; } .sunny svg { width: calc(96 * var(--u)); height: calc(96 * var(--u)); } @keyframes spin { to { transform: rotate(360deg); } }
.cl { position: absolute; opacity: 0.85; animation: drift 60s linear infinite; } .cl1 { top: calc(46 * var(--u)); left: 22%; } .cl2 { top: calc(130 * var(--u)); left: 48%; animation-duration: 80s; animation-delay: -30s; } .cl3 { top: calc(24 * var(--u)); left: 66%; animation-duration: 70s; animation-delay: -12s; opacity: 0.7; } .cl svg { width: calc(110 * var(--u)); height: auto; } @keyframes drift { from { transform: translateX(-12%); } to { transform: translateX(14%); } }
.bb { position: absolute; right: calc(34 * var(--u)); top: calc(40 * var(--u)); width: calc(330 * var(--u)); padding: calc(18 * var(--u)) calc(22 * var(--u)); border-radius: calc(22 * var(--u)); background: oklch(0.2 0.05 250 / 0.82); color: #fff; box-shadow: 0 16px 34px oklch(0 0 0 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.25); backdrop-filter: blur(6px); z-index: 2; }
.bb-t { font-size: calc(15 * var(--u)); font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.8; } .bb .nwc { font-size: calc(50 * var(--u)); margin-top: calc(6 * var(--u)); } .bb-d { margin-top: calc(10 * var(--u)); } .bb .dpill { font-size: calc(14 * var(--u)); padding: calc(5 * var(--u)) calc(10 * var(--u)); } .bb .dpill small { font-size: calc(12 * var(--u)); }
.bb-p { position: absolute; top: 100%; width: calc(12 * var(--u)); height: calc(150 * var(--u)); background: linear-gradient(90deg, oklch(0.42 0.03 250), oklch(0.3 0.03 250)); } .bb-p1 { left: calc(46 * var(--u)); } .bb-p2 { right: calc(46 * var(--u)); }
.bu { position: absolute; width: calc(var(--w) * var(--u)); transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; cursor: pointer; z-index: 2; filter: drop-shadow(0 0 calc(var(--sel, 0) * 14px) #fff); transition: filter 250ms, transform 250ms; } .bu:hover { transform: translateX(-50%) translateY(-3px); }
.bu-up { bottom: calc(300 * var(--u)); } .bu-down { top: calc(434 * var(--u)); z-index: 1; }
.bu-body { outline: calc(var(--sel, 0) * 3px) solid #fff; outline-offset: calc(var(--sel, 0) * 2px); }
.bu-shape { display: flex; flex-direction: column; align-items: center; width: 100%; }
.bu-body { position: relative; width: 100%; display: block; border-radius: calc(8 * var(--u)) calc(8 * var(--u)) 0 0; background: linear-gradient(180deg, var(--bch), var(--bcl)); box-shadow: inset 0 calc(3 * var(--u)) 0 oklch(1 0 0 / 0.3), inset calc(-10 * var(--u)) 0 calc(18 * var(--u)) oklch(0 0 0 / 0.18); transition: height 750ms cubic-bezier(0.3, 0.9, 0.3, 1); }
.bu-up .bu-body { height: calc(var(--bh) * var(--u)); }
.bu-bank { --bh: var(--uh-bank); } .bu-invest { --bh: var(--uh-invest); } .bu-fixed { --bh: var(--uh-fixed); } .bu-lent { --bh: var(--uh-lent); } .bu-home { --bh: var(--dh-home); } .bu-car { --bh: var(--dh-car); } .bu-cards { --bh: var(--dh-cards); }
.bu-down .bu-body { height: calc(var(--bh) * var(--u)); border-radius: 0 0 calc(8 * var(--u)) calc(8 * var(--u)); background: linear-gradient(0deg, oklch(0 0 0 / 0.38), color-mix(in oklch, var(--bch) 70%, black)); box-shadow: inset 0 0 0 calc(2 * var(--u)) color-mix(in oklch, var(--bch) 60%, white); }
.bu-invest .bu-body, .bu-home .bu-body { background-image: radial-gradient(oklch(1 0 0 / 0.6) 0 calc(5 * var(--u)), transparent calc(6 * var(--u))), linear-gradient(180deg, var(--bch), var(--bcl)); background-size: calc(26 * var(--u)) calc(32 * var(--u)), auto; background-position: calc(6 * var(--u)) calc(10 * var(--u)), 0 0; }
.bu-bank .bu-body { background-image: repeating-linear-gradient(90deg, oklch(1 0 0 / 0.5) 0 calc(11 * var(--u)), transparent calc(11 * var(--u)) calc(27 * var(--u))), linear-gradient(180deg, oklch(0.8 0.12 80), oklch(0.6 0.12 75)); }
.bu-down.bu-home .bu-body, .bu-down.bu-car .bu-body, .bu-down.bu-cards .bu-body { background-image: radial-gradient(oklch(1 0 0 / 0.35) 0 calc(5 * var(--u)), transparent calc(6 * var(--u))), linear-gradient(0deg, oklch(0 0 0 / 0.38), color-mix(in oklch, var(--bch) 70%, black)); background-size: calc(26 * var(--u)) calc(32 * var(--u)), auto; background-position: calc(6 * var(--u)) calc(8 * var(--u)), 0 0; }
.bu-art { position: absolute; left: 50%; bottom: calc(10 * var(--u)); transform: translateX(-50%); } .bu-art svg { width: calc(54 * var(--u)); height: calc(54 * var(--u)); } .bu-invest .bu-art, .bu-down .bu-art { display: none; } .bu-down.bu-home .bu-art, .bu-down.bu-car .bu-art, .bu-down.bu-cards .bu-art { display: none; }
.bu-down .bu-art { top: calc(8 * var(--u)); bottom: auto; }
.bu-roof { display: flex; justify-content: center; width: 100%; } .bu-roof .tri { display: block; width: 112%; height: calc(46 * var(--u)); clip-path: polygon(50% 0, 100% 100%, 0 100%); background: linear-gradient(180deg, oklch(0.9 0.1 85), oklch(0.7 0.14 75)); }
.bu-down .bu-roof .tri { transform: scaleY(-1); width: 100%; background: linear-gradient(180deg, color-mix(in oklch, var(--bch) 70%, white), var(--bch)); opacity: 0.7; }
.bu-roof .awn { display: block; width: 108%; height: calc(24 * var(--u)); border-radius: calc(8 * var(--u)) calc(8 * var(--u)) 0 0; background: repeating-linear-gradient(90deg, oklch(0.94 0.02 90) 0 calc(14 * var(--u)), var(--bch) calc(14 * var(--u)) calc(28 * var(--u))); } .bu-down .bu-roof .awn { border-radius: 0 0 calc(8 * var(--u)) calc(8 * var(--u)); opacity: 0.75; }
.bu-roof .dome { display: block; width: 74%; height: calc(34 * var(--u)); border-radius: 999px 999px 0 0; background: linear-gradient(180deg, oklch(0.88 0.1 160), var(--bch)); }
.bu-roof svg { width: calc(64 * var(--u)); height: calc(64 * var(--u)); margin-bottom: calc(-6 * var(--u)); }
.sign { position: relative; z-index: 4; margin: 0 0 calc(10 * var(--u)); padding: calc(6 * var(--u)) calc(12 * var(--u)); border-radius: calc(12 * var(--u)); background: oklch(1 0 0 / 0.94); color: oklch(0.2 0.04 260); text-align: center; white-space: nowrap; box-shadow: 0 6px 16px oklch(0 0 0 / 0.25); }
.bu-down .sign { margin: calc(8 * var(--u)) 0 calc(8 * var(--u)); } .sign small { display: block; font-size: calc(12 * var(--u)); font-weight: 700; opacity: 0.7; } .sign b { display: block; font-size: calc(17 * var(--u)); font-weight: 800; letter-spacing: -0.01em; } .sign .orb-w { top: calc(-9 * var(--u)); right: calc(-9 * var(--u)); }
.bu .ov { color: oklch(0.2 0.04 260); }
.ground-l, .ground-r { position: absolute; top: calc(446 * var(--u)); font-size: calc(12 * var(--u)); font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: oklch(1 0 0 / 0.5); } .ground-l { left: calc(24 * var(--u)); display: none; } .ground-r { right: calc(24 * var(--u)); display: none; }
.eqn { position: absolute; left: calc(24 * var(--u)); top: calc(486 * var(--u)); width: calc(560 * var(--u)); display: flex; align-items: center; justify-content: space-between; gap: calc(10 * var(--u)); padding: calc(18 * var(--u)) calc(22 * var(--u)); border-radius: calc(22 * var(--u)); background: oklch(0 0 0 / 0.3); color: #fff; }
.eq-i small { display: block; font-size: calc(13 * var(--u)); font-weight: 700; opacity: 0.75; } .eq-i b { font-size: calc(34 * var(--u)); font-weight: 800; letter-spacing: -0.02em; } .eq-i b.owe { color: oklch(0.88 0.1 25); } .eq-k b { color: oklch(0.9 0.14 150); } .eq-o { font-size: calc(34 * var(--u)); font-weight: 700; opacity: 0.6; }
.town-stg .od-w { margin-top: 0; }
`;

export const R5 = [R5A, monthRules].join("\n");
