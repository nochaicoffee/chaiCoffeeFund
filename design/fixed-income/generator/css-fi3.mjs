// Round 3 (his real numbers): pick keys for the three stages, and the bits only they use.
import * as D from "./data.mjs";
import { pick } from "./css-fi2.mjs";
export const P_KEYS = ["all", "epf", "fd"];
export const P_COL = { all: "indigo", epf: "emerald", fd: "teal" };
export const L_KEYS = ["all", "epf", ...D.FDS.map((x) => x.id)];
export const L_COL = { all: "indigo", epf: "emerald", ...Object.fromEntries(D.FDS.map((x) => [x.id, x.color])) };
export const T_KEYS = ["day", "month", "fy", "ever"];
export const T_COL = { day: "gold", month: "teal", fy: "indigo", ever: "emerald" };
export const FI3 = String.raw`
${pick("p", P_KEYS, P_COL)}${pick("l", L_KEYS, L_COL)}${pick("t", T_KEYS, T_COL)}
.doors3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.doors3 .door { min-height: 150px; }
.doors3 .door .dv { font-size: 30px; }
.pbar { height: 8px; border-radius: 999px; background: oklch(1 0 0 / 0.22); overflow: hidden; margin-top: auto; } .pbar i { display: block; height: 100%; border-radius: inherit; background: #fff; }
.book { position: relative; border-radius: 14px; padding: 18px 20px; color: #fff; display: flex; flex-direction: column; gap: 10px; overflow: hidden; grid-column: span 2; min-height: 190px; box-shadow: 0 1px 2px oklch(0 0 0 / 0.05), 0 8px 18px oklch(0 0 0 / 0.1); background: linear-gradient(155deg, var(--card-emerald-from), var(--card-emerald-to)); }
.book::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 12px; background: oklch(0 0 0 / 0.25); }
.book::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: repeating-radial-gradient(circle at calc(100% + 10px) calc(100% + 18px), oklch(1 0 0 / 0.1) 0 1px, transparent 1px 15px); }
.book > * { position: relative; z-index: 1; margin-left: 8px; }
.book .am { font-size: 36px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
.book .ln { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; opacity: 0.85; }
.book .bk { font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.8; display: flex; justify-content: space-between; }
`;
