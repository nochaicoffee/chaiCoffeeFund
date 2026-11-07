// Round 2's styles: the dock, and the four boards (Future you, What if, Things I noticed, Where a month goes). Picks work with no script.
import { pick } from "./css-ov.mjs";
import { Q1_H, Q1_R, Q1_COL, Q2_KEYS, Q2_COL, Q3_TAGS, Q4_KEYS, Q4_COL } from "./r2.mjs";
const key = (p, k) => `#${p}-${k}:checked`;
const Q3_COL = { all: "indigo", cash: "sapphire", debt: "copper", risk: "ruby", growth: "emerald", habits: "plum" };

const R0 = String.raw`
/* ---- The dock ---- */
.dock { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 16px; border-radius: 22px; background: var(--fill); }
.dock-t { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); margin-right: 4px; }
.dk { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border-radius: 999px; background: var(--surface); border: 1px solid var(--surface-line); box-shadow: var(--soft-shadow); }
.dk-ic { width: 26px; height: 26px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #fff; }
.dk-n b { display: block; font-size: 12px; font-weight: 800; line-height: 1.1; } .dk-n small { font-size: 11px; font-weight: 700; color: var(--muted); }
.dk-f { position: absolute; top: -2px; right: -2px; width: 9px; height: 9px; border-radius: 50%; background: var(--warning); box-shadow: 0 0 0 2px var(--surface); }
.stg2.q1, .stg2.q2, .stg2.q3, .stg2.q4 { padding: 32px 34px; }
.stg2 .dn { color: oklch(0.84 0.12 25); }

/* ---- Q1 Future you ---- */
.q1 { display: grid; grid-template-columns: 300px 1fr; gap: 34px; }
.q1-l { display: flex; flex-direction: column; gap: 10px; } .q1-r { min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.q1-q { font-size: 12px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.75; margin-top: 10px; }
.q1-chips { display: flex; flex-wrap: wrap; gap: 8px; } .q1-chips .chip-b { padding: 9px 16px; } .q1-chips .chip-b small { margin-left: -2px; }
.q1-as { margin-top: auto; padding: 14px 16px; border-radius: 18px; background: oklch(1 0 0 / 0.1); font-size: 12px; font-weight: 600; line-height: 1.45; }
.q1-as ul { margin: 6px 0 8px; padding-left: 16px; display: grid; gap: 3px; } .q1-as small { opacity: 0.72; font-weight: 600; display: block; }
.q1p { display: none; } .q1-tiles { grid-template-columns: repeat(4, 1fr); margin-top: 16px; } .q1-tiles .s-tile .v { font-size: 20px; }
.q1-chart { padding: 14px 14px 10px; } .q1-keys { display: flex; gap: 20px; font-size: 11.5px; font-weight: 700; opacity: 0.85; margin-top: 4px; padding-left: 40px; }
.q1-key { display: inline-flex; align-items: center; gap: 7px; } .q1-key i { width: 14px; height: 8px; border-radius: 3px; display: inline-block; }
.q1svg, .mk { display: none; }
.q1-chart svg text { font-family: inherit; }

/* ---- Q2 What if ---- */
.q2 { display: grid; grid-template-columns: 330px 1fr; gap: 32px; }
.q2-l { display: flex; flex-direction: column; gap: 8px; } .q2-r { min-width: 0; }
.q2-i { display: grid; grid-template-columns: 8px 1fr auto; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 16px; background: oklch(1 0 0 / calc(0.08 + var(--sel, 0) * 0.14)); box-shadow: 0 0 0 calc(var(--sel, 0) * 2px) #fff; }
.q2-i > i { width: 6px; height: 34px; border-radius: 4px; background: var(--ic); box-shadow: 0 0 0 1px oklch(1 0 0 / 0.3); }
.q2-i b { display: block; font-size: 13.5px; font-weight: 800; } .q2-i small { font-size: 11.5px; font-weight: 600; opacity: 0.72; } .q2-i em { font-style: normal; font-size: 12px; font-weight: 800; opacity: 0.9; white-space: nowrap; }
.q2-p.vw-flex { flex-direction: column; justify-content: space-between; gap: 18px; min-height: 100%; }
.q2-h { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
.q2-nw { text-align: right; } .q2-nw small { display: block; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.75; } .q2-nw b { display: block; font-size: 46px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; } .q2-nw b small { font-size: 22px; display: inline; letter-spacing: 0; opacity: 0.75; text-transform: none; } .q2-nw span { font-size: 13px; font-weight: 800; opacity: 0.85; }
.rw { margin-top: 4px; } .rw-bar { position: relative; height: 66px; border-radius: 16px; background: oklch(1 0 0 / 0.1); }
.rw-s { position: absolute; top: 0; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 0 10px; overflow: hidden; border-right: 2px solid oklch(0 0 0 / 0.22); } .rw-s:first-child { border-radius: 16px 0 0 16px; }
.rw-s b { font-size: 12px; font-weight: 800; white-space: nowrap; } .rw-s span { font-size: 13px; font-weight: 800; opacity: 0.9; }
.rw-bar em { position: absolute; top: -8px; bottom: -8px; width: 3px; background: #fff; border-radius: 2px; font-style: normal; } .rw-bar em b { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 12.5px; font-weight: 800; }
.rw-ax { position: relative; height: 22px; margin-top: 12px; } .rw-ax span { position: absolute; transform: translateX(-50%); font-size: 11px; font-weight: 700; opacity: 0.7; } .rw-ax span:first-child { transform: none; }
.rw-key { display: flex; flex-wrap: wrap; gap: 8px 22px; font-size: 12px; font-weight: 700; margin-top: 8px; } .rw-key span { display: inline-flex; align-items: center; gap: 7px; } .rw-key i { width: 10px; height: 10px; border-radius: 3px; } .rw-key b { font-weight: 800; } .rw-key small { opacity: 0.65; font-weight: 600; }
.q2-b { display: grid; grid-template-columns: 1fr 1.5fr; gap: 16px; align-items: stretch; } .q2-t { grid-template-columns: repeat(3, 1fr); margin-top: 0; } .q2-t .s-tile .v { font-size: 16px; line-height: 1.25; }
.ib { height: 100%; display: flex; flex-direction: column; gap: 10px; justify-content: center; padding: 14px 16px; border-radius: 16px; background: oklch(1 0 0 / 0.1); }
.ib-r { display: grid; grid-template-columns: 96px 1fr auto; align-items: center; gap: 10px; font-size: 11.5px; font-weight: 700; } .ib-r > div { height: 10px; border-radius: 6px; background: oklch(1 0 0 / 0.12); } .ib-r i { display: block; height: 100%; border-radius: 6px; } .ib-r b { font-weight: 800; }
.ib-n { font-size: 13px; font-weight: 800; } .ib-n.neg { color: oklch(0.86 0.12 25); } .ib-n.pos { color: oklch(0.9 0.12 150); }
.q2-line { display: flex; gap: 10px; align-items: flex-start; padding: 14px 16px; border-radius: 16px; background: oklch(1 0 0 / 0.12); font-size: 13px; font-weight: 600; line-height: 1.55; } .q2-line svg { margin-top: 3px; flex-shrink: 0; }

/* ---- Q3 Things I noticed ---- */
.q3 { display: flex; flex-direction: column; gap: 22px; }
.q3-top { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; } .q3-f { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; } .q3-f .chip-b { padding: 8px 16px; }
.q3-g { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: stretch; }
.ins { position: relative; border-radius: 22px; background: var(--surface); color: var(--fg); display: flex; min-height: 330px; box-shadow: var(--card-shadow); min-width: 0; }
.ins.star { box-shadow: 0 0 0 2.5px oklch(0.82 0.15 85), var(--card-shadow); }
.ins-f, .ins-k { display: flex; flex-direction: column; gap: 9px; padding: 18px 20px; flex: 1; min-width: 0; } .ins-k { display: none; background: var(--fill); border-radius: 22px; }
.ins:has(.pk-in:checked) .ins-f { display: none; } .ins:has(.pk-in:checked) .ins-k { display: flex; }
.ins-h { display: flex; align-items: center; gap: 8px; }
.ins-tag { display: inline-flex; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 10px; border-radius: 999px; background: var(--fill); }
.tg-cash { background: oklch(0.93 0.04 258); color: oklch(0.4 0.1 258); } .tg-debt { background: oklch(0.94 0.05 60); color: oklch(0.45 0.1 55); } .tg-risk { background: oklch(0.94 0.04 20); color: oklch(0.48 0.14 22); } .tg-growth { background: oklch(0.94 0.05 150); color: oklch(0.4 0.12 150); } .tg-habits { background: oklch(0.94 0.04 320); color: oklch(0.42 0.1 320); }
.ins-t { font-size: 16.5px; font-weight: 700; line-height: 1.32; letter-spacing: -0.005em; } .ins-t b { font-weight: 800; }
.ins-b { font-size: 12.5px; color: var(--muted); font-weight: 500; line-height: 1.5; } .ins-v { margin-top: auto; }
.ins-a { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 4px; }
.ins-how { font-size: 12px; font-weight: 700; color: var(--accent-text); cursor: pointer; border-bottom: 1.5px dotted var(--accent-text); }
.ins-sum { background: oklch(1 0 0 / 0.14); color: #fff; flex-direction: column; gap: 10px; padding: 22px 24px; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.16); }
.ins-n { font-size: 72px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; } .ins-n small { font-size: 22px; letter-spacing: 0; opacity: 0.75; }
.ins-sum ul { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 7px; } .ins-sum li { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 800; } .ins-sum .ins-tag { background: oklch(1 0 0 / 0.2); color: #fff; }
.ins-sum .s-note { margin-top: auto; }

/* ---- Q4 Where a month goes ---- */
.q4-g { display: grid; grid-template-columns: 350px 1fr; gap: 30px; align-items: start; } .q4-l { display: flex; flex-direction: column; gap: 4px; min-height: 100%; } .q4-r { min-width: 0; }
.q4-l .s-acts { margin-top: 18px; } .q4-l .s-sub { margin-bottom: 4px; }
.sk { position: relative; width: 100%; margin-top: 8px; } .sk svg { position: absolute; inset: 0; width: 100%; height: 100%; } .sk svg path { transition: opacity 260ms; }
.lk { opacity: 0.5; }
.fp { position: absolute; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 12px; border-radius: 12px; color: #fff; font-size: 12px; font-weight: 800; overflow: hidden; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.18), 0 0 0 calc(var(--sel, 0) * 2.5px) #fff; opacity: calc(0.74 + var(--sel, 0) * 0.26); transition: opacity 200ms; }
.fp-g { font-size: 13px; } .fp-l i { width: 8px; height: 8px; border-radius: 3px; flex-shrink: 0; } .fp-l b { flex: 1; min-width: 0; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .fp-l span { font-weight: 800; }
.fp-in { display: block; padding: 16px 18px; background: oklch(1 0 0 / 0.14); cursor: default; opacity: 1; } .fp-in b { display: block; font-size: 13px; } .fp-in span { display: block; font-size: 19px; font-weight: 800; margin-top: 2px; } .fp-in small { display: block; font-size: 11px; font-weight: 600; opacity: 0.75; margin-top: 8px; line-height: 1.4; padding-right: 22px; } .fp-in i { position: absolute; right: 0; width: 10px; }
.chai-app:has(#p-all:checked) .fp { opacity: 1; } .chai-app:has(#p-all:checked) .lk { opacity: 0.5; }
`;

import { FLOW } from "./r2.mjs";
const leafGroup = Object.fromEntries(FLOW.groups.flatMap((g) => g.leaves.map((l) => [l.k, g.k])));
const q4final = Q4_KEYS.filter((k) => k !== "all").map((k) => {
  const grp = ["fixed", "cards", "subs", "saving", "left"].includes(k);
  return `.chai-app:has(${key("p", k)}) .lk { opacity: 0.07; }\n.chai-app:has(${key("p", k)}) ${grp ? `.lk.g-${k}` : `.lk.l-${k}, .chai-app:has(${key("p", k)}) .lk.to-group.g-${leafGroup[k]}`} { opacity: ${grp ? 0.85 : 0.7}; }`;
}).join("\n");

const hz = Q1_H.map((h) => `.chai-app:has(${key("hz", h)}) label[for="hz-${h}"] { --sel: 1; }`).join("\n");
const rt = Q1_R.map((r) => `.chai-app:has(${key("rt", r)}) label[for="rt-${r}"] { --sel: 1; }\n.chai-app:has(${key("rt", r)}) .q1svg-${r} { display: block; }\n.chai-app:has(.stg2[data-b="q1"]):has(${key("rt", r)}) { --h1: var(--card-${Q1_COL[r]}-from); --h2: var(--card-${Q1_COL[r]}-to); --hc: var(--card-${Q1_COL[r]}); }`).join("\n");
const combos = Q1_R.flatMap((r) => Q1_H.map((h) => `.chai-app:has(${key("hz", h)}):has(${key("rt", r)}) .q1p-${h}-${r}, .chai-app:has(${key("hz", h)}):has(${key("rt", r)}) .mk-${h}-${r} { display: block; }`)).join("\n");
const scoped = (id, keys, colours) => keys.filter((k) => colours[k]).map((k) => `.chai-app:has(.stg2[data-b="${id}"]):has(${key("p", k)}) { --h1: var(--card-${colours[k]}-from); --h2: var(--card-${colours[k]}-to); --hc: var(--card-${colours[k]}); }`).join("\n");
const q3f = Q3_TAGS.filter((t) => t !== "all").map((t) => `.chai-app:has(${key("p", t)}) .ins:not(.t-${t}):not(.ins-sum) { display: none; }`).join("\n");
const ALL = [...Q2_KEYS, ...Q3_TAGS, ...Q4_KEYS];
export const R2 = R0 + pick("p", ALL) + hz + "\n" + rt + "\n" + combos + "\n" + scoped("q2", Q2_KEYS, Q2_COL) + "\n" + scoped("q3", Q3_TAGS, Q3_COL) + "\n" + scoped("q4", Q4_KEYS, Q4_COL) + "\n" + q3f + "\n" + q4final + "\n";
