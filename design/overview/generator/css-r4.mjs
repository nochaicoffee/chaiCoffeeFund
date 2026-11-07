// Round 4's styles: V1 Capsules, V2 Warm bento, V3 Bubbles. Picks work with no script.
import { pick } from "./css-ov.mjs";
import * as H from "./history.mjs";
import { BKEYS, BUB, bubD } from "./r4.mjs";

const key = (p, k) => `#${p}-${k}:checked`;
const tileH = (v) => Math.round(66 + (v / 3100000) * 190);
const monthRules = H.HIST.map((r, i) => {
  const d = [["invest", 0], ["fixed", 1], ["lent", 2], ["bank", 3]].map(([k, j]) => `--t${j}: ${tileH(r[k])}px`);
  H.TYPES.forEach((t) => d.push(`--bd-${t.k}: ${bubD(r, t.k)}`));
  return `.chai-app:has(${key("m", i)}) { ${d.join("; ")}; }`;
}).join("\n");
const groupFilter = H.GROUPS.map((g) => `.chai-app:has(${key("g", g.k)}) .tr2:not(.th):not(.g-${g.k}) { display: none; }`).join("\n");

const R4A = String.raw`
/* ---- shared ---- */
.pg { position: relative; display: grid; grid-template-columns: 36px minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 9px 14px 9px 9px; border-radius: 16px; background: oklch(1 0 0 / 0.12); border: 1px solid oklch(1 0 0 / 0.16); color: #fff; transition: transform 200ms var(--ease-out, ease); }
.pg:hover, .pg:focus-visible { transform: translateX(3px); outline: 0; }
.pg-ic { width: 36px; height: 36px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: #fff; }
.pg-n b { display: block; font-size: 14px; font-weight: 800; } .pg-n small { display: block; font-size: 12px; font-weight: 600; opacity: 0.72; }
.pg-v { font-size: 17px; font-weight: 800; text-align: right; } .pg-v small { display: block; font-size: 11px; font-weight: 700; opacity: 0.7; } .pg-v.owe { color: oklch(0.88 0.1 25); }
.pg .hc-wrap { z-index: 40; }

/* ---- V1 Capsules ---- */
.chai-app:has(.stg2[data-b="v1"]) { --h1: oklch(0.36 0.13 285); --h2: oklch(0.15 0.05 275); --hc: oklch(0.5 0.13 285); }
.stg2.v1 { background: radial-gradient(70% 50% at 85% 8%, oklch(0.5 0.17 290 / 0.55), transparent 70%), radial-gradient(60% 60% at 5% 95%, oklch(0.42 0.16 300 / 0.5), transparent 70%), radial-gradient(110% 130% at 0% 0%, color-mix(in oklch, var(--h1) 82%, white), transparent 62%), linear-gradient(140deg, var(--h1), var(--h2)); overflow: visible; padding: 34px 38px 38px; gap: 26px; }
.stg2.v1::after { border-radius: inherit; }
.v1-chips { display: flex; justify-content: flex-end; gap: 14px; flex-wrap: wrap; }
.v1-chip { display: inline-flex; align-items: center; gap: 10px; padding: 15px 26px; border-radius: 999px; background: #fff; color: oklch(0.22 0.04 275); font-size: 16px; font-weight: 600; box-shadow: 0 10px 30px oklch(0 0 0 / 0.25); transition: transform 220ms var(--ease-out, ease); } .v1-chip:hover { transform: translateY(-2px); }
.v1-chip b { font-weight: 600; }
.v1-g { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr); gap: 28px; align-items: stretch; }
.v1-l { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.v1-t b { display: block; font-size: 40px; font-weight: 400; letter-spacing: -0.02em; } .v1-t small { font-size: 14px; font-weight: 500; opacity: 0.75; }
.v1-ks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.v1-k { padding: 16px 18px; border-radius: 18px; background: oklch(0 0 0 / 0.22); display: grid; gap: 4px; } .v1-k small { font-size: 14px; font-weight: 500; opacity: 0.85; } .v1-k b { font-size: 34px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.05; } .v1-k span { font-size: 12px; font-weight: 500; opacity: 0.68; }
.caps { position: relative; display: grid; grid-template-columns: repeat(13, 1fr); flex: 1; min-height: 400px; padding: 0 6px; border-radius: 24px; background: oklch(0 0 0 / 0.16); }
.cap { position: relative; cursor: pointer; border-radius: 18px; background: oklch(1 0 0 / calc(var(--sel, 0) * 0.13)); transition: background 220ms; }
.cap:hover { background: oklch(1 0 0 / 0.08); }
.cap-o, .cap-d { position: absolute; bottom: 38px; border-radius: 999px; display: block; transform-origin: bottom; animation: grow 900ms cubic-bezier(0.3, 0.9, 0.3, 1) both; }
.cap-o { left: 12%; width: 50%; background: linear-gradient(180deg, oklch(0.78 0.07 290), oklch(0.58 0.09 285)); }
.cap-d { left: 34%; width: 50%; background: linear-gradient(180deg, oklch(0.27 0.04 275), oklch(0.2 0.03 275)); box-shadow: 0 6px 18px oklch(0 0 0 / 0.35), inset 0 0 0 1px oklch(1 0 0 / 0.06); animation-delay: 120ms; }
@keyframes grow { from { transform: scaleY(0); } }
.cap-m { position: absolute; bottom: 8px; left: 0; right: 0; text-align: center; font-size: 13px; font-weight: 600; opacity: calc(0.62 + var(--sel, 0) * 0.38); line-height: 1.05; } .cap-m em { display: block; font-style: normal; font-size: 9.5px; opacity: 0.8; }
.cap-tag { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); padding: 4px 9px; border-radius: 999px; background: #fff; color: oklch(0.22 0.04 275); font-size: 12px; font-weight: 700; white-space: nowrap; opacity: var(--sel, 0); transition: opacity 220ms; }
.v1-nw { border-radius: 28px; padding: 26px 28px 24px; background: oklch(0 0 0 / 0.2); display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.v1-nh { display: flex; align-items: center; gap: 14px; } .v1-nh b { font-size: 38px; font-weight: 400; letter-spacing: -0.02em; } .v1-nh em { margin-left: auto; font-style: normal; font-size: 18px; font-weight: 500; opacity: 0.7; }
.v1-ic { color: #fff; display: inline-flex; }
.v1-pill { display: inline-flex; align-items: center; gap: 18px; align-self: flex-start; padding: 14px 34px 14px 14px; border-radius: 999px; background: oklch(1 0 0 / 0.13); }
.v1-up { width: 54px; height: 54px; border-radius: 50%; background: oklch(1 0 0 / 0.16); display: inline-flex; align-items: center; justify-content: center; }
.v1-pill .nwc { font-size: 68px; font-weight: 500; letter-spacing: -0.03em; }
.tms { display: flex; align-items: flex-end; gap: 10px; margin-top: auto; min-height: 280px; }
.tm { position: relative; border-radius: 16px; padding: 14px 14px 12px; background: oklch(0.27 0.035 275 / 0.92); display: flex; flex-direction: column; justify-content: space-between; min-width: 0; box-shadow: inset 0 3px 0 var(--tc), 0 8px 20px oklch(0 0 0 / 0.2); transition: height 750ms cubic-bezier(0.3, 0.9, 0.3, 1); }
.tm-n { font-size: 14px; font-weight: 500; opacity: 0.88; line-height: 1.15; } .tm-v { font-size: 28px; font-weight: 400; letter-spacing: -0.02em; } .tm-invest .tm-v { font-size: 44px; }
.v1-of { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; } .v1-of small { display: block; font-size: 14px; font-weight: 500; opacity: 0.75; } .v1-of b { font-size: 24px; font-weight: 500; } .v1-as { text-align: right; } .v1-as b { font-size: 46px; font-weight: 400; letter-spacing: -0.03em; }
.ob { display: flex; gap: 3px; height: 8px; width: 220px; margin-top: 8px; } .ob i { display: block; border-radius: 4px; }
.v1-b { display: grid; gap: 16px; } .v1-tabs { display: flex; gap: 10px; flex-wrap: wrap; }
.v1-tab { padding: 12px 26px; border-radius: 999px; font-size: 16px; font-weight: 600; background: color-mix(in oklch, #fff calc(10% + var(--sel, 0) * 90%), transparent); color: color-mix(in oklch, oklch(0.22 0.04 275) calc(var(--sel, 0) * 100%), #fff); } .v1-tab em { font-style: normal; font-size: 12px; opacity: 0.7; margin-left: 6px; }
.v1-pane { grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); gap: 20px; align-items: start; }
.v1-pg, .v1-wk { display: grid; gap: 8px; align-content: start; }

/* ---- V2 Warm bento ---- */
.wb { --bg: #1b1715; --cd: #2a2421; --cd2: #342d29; --mu: #a89c93; --tx: #f3ece6; border-radius: 30px; padding: 20px; background: var(--bg); color: var(--tx); display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.55fr) minmax(0, 1fr); gap: 18px; align-items: stretch; box-shadow: var(--card-shadow); }
.wb-c1, .wb-c2, .wb-c3 { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.wbc { background: var(--cd); border-radius: 26px; padding: 22px 24px; display: flex; flex-direction: column; }
.wb-h { display: flex; justify-content: space-between; align-items: center; font-size: 22px; font-weight: 400; margin-bottom: 12px; color: #ece3dc; } .wb-sel { font-size: 12.5px; padding: 6px 12px; border-radius: 10px; background: var(--cd2); color: var(--mu); display: inline-flex; gap: 6px; align-items: center; }
.wb-cards { flex: 1.25; } .wbs { position: relative; flex: 1; min-height: 240px; margin-top: 8px; }
.cdf { position: absolute; left: 0; right: 0; top: 0; bottom: 44px; border-radius: 22px; padding: 20px 22px; color: #fff; display: flex; flex-direction: column; justify-content: space-between; z-index: 3; box-shadow: 0 14px 30px oklch(0 0 0 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.25); }
.cdf::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient(120% 90% at 100% 0%, oklch(1 0 0 / 0.2), transparent 60%); }
.cdf-t { display: flex; justify-content: space-between; align-items: center; font-size: 17px; } .cdf-t b { font-weight: 500; } .cdf-n { font-size: 22px; letter-spacing: 0.04em; font-weight: 500; }
.cdf-f { display: flex; justify-content: space-between; } .cdf-f small { display: block; font-size: 10.5px; opacity: 0.75; } .cdf-f b { font-size: 15px; font-weight: 600; }
.ghost { position: absolute; display: block; border-radius: 20px; } .g1 { left: 7%; right: 7%; bottom: 22px; height: 60px; z-index: 2; opacity: 0.9; } .g2 { left: 14%; right: 14%; bottom: 6px; height: 56px; z-index: 1; background: oklch(0.45 0.1 40); }
.wb-note { font-size: 12.5px; color: var(--mu); margin-top: 10px; }
.wb-eq { flex: 1.6; gap: 12px; } .eq { flex: 1; border-radius: 20px; background: var(--cd2); padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; }
.eq-t { display: flex; justify-content: space-between; align-items: center; color: var(--mu); font-size: 17px; } .eq-ic { width: 40px; height: 40px; border-radius: 12px; border: 1.5px solid oklch(0.62 0.2 45 / 0.6); background: oklch(0.3 0.05 45 / 0.5); color: oklch(0.75 0.17 50); display: inline-flex; align-items: center; justify-content: center; }
.eq-v { font-size: 46px; font-weight: 400; letter-spacing: -0.03em; margin-top: 18px; } .eq-s { font-size: 14px; color: var(--mu); display: flex; align-items: center; gap: 8px; } .chp { font-style: normal; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 8px; background: oklch(0.38 0.09 150 / 0.55); color: oklch(0.86 0.15 150); }
.wb-tb { flex: 1.5; padding-bottom: 14px; }
.gts { display: grid; grid-template-columns: 0.7fr repeat(4, 1fr); gap: 8px; margin: 2px 0 12px; }
.gt { position: relative; padding: 11px 12px 10px; border-radius: 14px; background: var(--cd2); border-top: 3px solid var(--gc, #7a6e66); cursor: pointer; display: grid; gap: 1px; box-shadow: 0 0 0 calc(var(--sel, 0) * 2px) var(--tx); transition: box-shadow 200ms, transform 200ms; } .gt:hover { transform: translateY(-2px); }
.gt b { font-size: 13px; font-weight: 600; } .gt > span:not(.gt-d) { font-size: 16px; font-weight: 500; } .gt small { font-size: 10.5px; color: var(--mu); line-height: 1.25; } .gt-d { position: absolute; top: 10px; right: 10px; display: inline-flex; gap: 3px; } .gt-all { border-top-color: var(--tx); }
.tr2 { display: grid; grid-template-columns: 1.7fr 0.75fr 0.85fr 1.7fr 0.8fr; gap: 12px; align-items: center; padding: 10px 14px; border-radius: 12px; font-size: 13px; transition: background 160ms; } .tr2 b { font-weight: 500; } .tr2:not(.th):hover { background: var(--cd2); }
.tr2 .nt { font-size: 11.5px; color: var(--mu); line-height: 1.3; } .th { background: var(--cd2); color: var(--mu); font-size: 11.5px; margin-bottom: 4px; }
.st { font-style: normal; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 8px; white-space: nowrap; } .st-red { background: oklch(0.4 0.14 28 / 0.7); color: oklch(0.88 0.13 30); } .st-amber { background: oklch(0.42 0.09 85 / 0.6); color: oklch(0.9 0.13 90); } .st-info { background: oklch(0.38 0.05 255 / 0.7); color: oklch(0.85 0.07 250); }
.wb-pr { flex: 1.2; } .pr-top { display: flex; gap: 26px; align-items: flex-end; margin: 4px 0 16px; } .pr-top small { display: block; font-size: 17px; color: var(--mu); } .pr-top b { font-size: 32px; font-weight: 400; letter-spacing: -0.02em; } .pr-nw { margin-left: auto; text-align: right; } .nwc-wb { font-size: 38px; font-weight: 500; justify-content: flex-end; }
.pr-bl { display: grid; grid-template-columns: 1fr 1.6fr; gap: 12px; align-items: end; height: 250px; }
.pb { position: relative; border-radius: 18px; transform-origin: bottom; animation: grow 1100ms cubic-bezier(0.3, 0.9, 0.3, 1) both; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.35), 0 14px 30px oklch(0 0 0 / 0.3); }
.pb-t { position: absolute; top: 18px; left: 50%; transform: translateX(-50%); padding: 4px 11px; border-radius: 9px; background: oklch(0.28 0.02 50 / 0.85); color: #f3ece6; font-size: 12px; font-weight: 500; white-space: nowrap; }
.wb-act { flex: 1.15; } .pls { display: grid; grid-template-columns: repeat(13, 1fr); gap: 5px; flex: 1; min-height: 300px; margin-top: 6px; }
.pl { position: relative; cursor: pointer; display: block; } .pl i { position: absolute; left: 0; right: 0; bottom: 26px; border-radius: 999px; background: oklch(0.36 0.02 50); transition: background 260ms, transform 260ms; transform-origin: bottom; animation: grow 900ms cubic-bezier(0.3, 0.9, 0.3, 1) both; }
.pl:hover i { background: oklch(0.44 0.03 55); } .pl em { position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); font-style: normal; font-size: 10.5px; color: var(--mu); } .pl-t { position: absolute; left: 50%; transform: translateX(-50%); font-size: 11px; padding: 3px 7px; border-radius: 8px; background: var(--tx); color: #2a2421; font-weight: 700; white-space: nowrap; opacity: var(--sel, 0); }
.wb-tg { flex: 1.15; } .arcw { display: grid; gap: 10px; flex: 1; align-content: space-evenly; }
.arcs { width: 100%; } .at { fill: none; stroke: #39312d; stroke-linecap: round; } .av { fill: none; stroke-linecap: round; animation: arc 1500ms cubic-bezier(0.3, 0.8, 0.2, 1) both; } @keyframes arc { from { stroke-dasharray: 0 100; } }
.at-t { fill: #fff; font-size: 30px; font-weight: 500; } .at-s { fill: #a89c93; font-size: 12px; }
.al { display: grid; grid-template-columns: 10px 1fr auto; column-gap: 10px; align-items: center; font-size: 13.5px; } .al i { width: 10px; height: 10px; border-radius: 50%; } .al b { font-weight: 500; } .al small { grid-column: 2 / 4; font-size: 11.5px; color: var(--mu); margin-bottom: 6px; }
.wb-lm { gap: 4px; } .lm b { font-size: 30px; font-weight: 400; } .lm span { color: var(--mu); font-size: 15px; } .lm-b { height: 12px; border-radius: 8px; background: #3a322e; margin-top: 10px; } .lm-b i { display: block; height: 100%; border-radius: 8px; background: linear-gradient(90deg, oklch(0.62 0.22 35), oklch(0.85 .15 85)); animation: grow 1000ms both; transform-origin: left; animation-name: growx; } @keyframes growx { from { transform: scaleX(0); } }
.lm-f { display: flex; justify-content: space-between; font-size: 13px; color: var(--mu); margin-top: 6px; } .lm-f b { font-weight: 500; color: var(--tx); }
.wb .wk-p { color: #fff; } .wb .wd-red, .wb .wd-amber { animation: none; }

/* ---- V3 Bubbles ---- */
.chai-app:has(.stg2[data-b="v3"]) { --h1: oklch(0.31 0.09 225); --h2: oklch(0.13 0.04 240); --hc: oklch(0.5 0.1 225); }
.stg2.v3 { overflow: visible; padding: 32px 34px; gap: 22px; } .stg2.v3::after { border-radius: inherit; }
.pool { container-type: inline-size; position: relative; aspect-ratio: 900 / 540; border-radius: 28px; background: radial-gradient(70% 90% at 30% 35%, oklch(1 0 0 / 0.07), transparent 70%), repeating-radial-gradient(circle at 50% 120%, oklch(1 0 0 / 0.045) 0 1px, transparent 1px 46px), oklch(0 0 0 / 0.2); overflow: hidden; }
.pool-lab { position: absolute; top: 16px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.6; } .pl-own { left: 22px; } .pl-owe { right: 22px; }
.orb { position: absolute; transform: translate(-50%, -50%); width: calc(var(--bd) / 900 * 100cqw); height: calc(var(--bd) / 900 * 100cqw); border-radius: 50%; display: flex; align-items: center; justify-content: center; text-align: center; cursor: pointer; color: #fff;
  transition: width 750ms cubic-bezier(0.3, 0.9, 0.3, 1), height 750ms cubic-bezier(0.3, 0.9, 0.3, 1), box-shadow 300ms, filter 300ms; animation: bob 7s ease-in-out infinite; }
.orb:nth-of-type(2) { animation-delay: -1.4s; } .orb:nth-of-type(3) { animation-delay: -2.8s; } .orb:nth-of-type(4) { animation-delay: -4.2s; } .orb:nth-of-type(5) { animation-delay: -5.6s; } .orb:nth-of-type(6) { animation-delay: -0.7s; }
@keyframes bob { 0%, 100% { translate: 0 -5px; } 50% { translate: 0 6px; } }
.orb-own { background: radial-gradient(circle at 32% 26%, color-mix(in oklch, var(--oc) 50%, white), var(--oc) 52%, color-mix(in oklch, var(--oc) 55%, black)); box-shadow: 0 0 0 calc(var(--sel, 0) * 4px) #fff, 0 0 70px color-mix(in oklch, var(--oc) 55%, transparent), inset 0 -12px 30px oklch(0 0 0 / 0.3), inset 0 7px 16px oklch(1 0 0 / 0.35); }
.orb-owe { background: radial-gradient(circle at 50% 40%, oklch(0 0 0 / 0.28), oklch(0 0 0 / 0.5)); border: 2.5px dashed var(--oc); box-shadow: 0 0 0 calc(var(--sel, 0) * 4px) #fff, inset 0 0 36px color-mix(in oklch, var(--oc) 45%, transparent), 0 0 34px color-mix(in oklch, var(--oc) 25%, transparent); }
.orb:hover { filter: brightness(1.12); }
.orb-i b { display: block; font-size: 13px; font-weight: 800; line-height: 1.1; } .orb-i > span { display: block; font-size: 19px; font-weight: 800; letter-spacing: -0.01em; }
.orb-cards .orb-i { position: absolute; top: calc(100% + 6px); left: 50%; transform: translateX(-50%); white-space: nowrap; } .orb-cards .orb-i > span { font-size: 14px; }
.orb-w { position: absolute; top: 4%; right: 6%; min-width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-style: normal; font-size: 12px; font-weight: 800; color: #1a1a1a; box-shadow: 0 0 0 3px oklch(0 0 0 / 0.25); }
.od-w { margin-top: -4px; }
.od { padding: 18px 22px; border-radius: 22px; background: oklch(0 0 0 / 0.26); grid-template-columns: 1.1fr 1fr 1.3fr; gap: 24px; align-items: center; } .od-l { display: grid; gap: 8px; } .od-m small { display: block; font-size: 11px; font-weight: 700; opacity: 0.7; margin-bottom: 4px; } .od-r { display: grid; gap: 6px; }
.od-h { display: flex; align-items: center; gap: 8px; } .od-h i { width: 11px; height: 11px; border-radius: 4px; } .od-h b { font-size: 15px; font-weight: 800; } .od-h span { margin-left: auto; font-size: 11px; opacity: 0.7; font-weight: 700; }
.od-v { font-size: 34px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; } .od-s { font-size: 12px; font-weight: 600; opacity: 0.8; } .od .spark { height: 60px; width: 100%; }
.od-hint { display: block; } .od-hint b { display: block; font-size: 17px; margin-bottom: 4px; } .od-hint span { font-size: 12.5px; font-weight: 600; opacity: 0.78; line-height: 1.4; }
`;

export const R4 = [R4A, monthRules, groupFilter, pick("b", BKEYS)].join("\n");
void BUB;
