// Helpers shared by the round 4 boards (dash4.mjs), the picked sky (orbit.mjs) and the final page (final.mjs): the pieces of every goal and how a piece is read.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { piecesOf } from "./dash.mjs";
const { inr } = L;
const { tile, needBadge } = P;
export const gr = (c, a = 155) => `linear-gradient(${a}deg,var(--card-${c}-from),var(--card-${c}-to))`;
export const PIECES = L.TOPS.flatMap((x) => piecesOf(x).map((p) => ({ ...p, top: x, color: L.gColor(x) })));
export const exp = (p) => { if (!p.due) return null; const a = L.daysBetween(p.startDate, L.TODAY), b = L.daysBetween(p.startDate, p.due); return b <= 0 ? 1 : Math.max(0, Math.min(1, a / b)); };
export const pct = (p) => (p.amount ? Math.min(1, p.saved / p.amount) : 0);
export const plan = (p) => p.plannedMonthly ?? 0;
export const needPer = (p) => (p.left && p.due ? Math.ceil(p.left / Math.max(1, L.monthsLeft(p.due))) : 0);
export const byDue = (a, b) => (a.due ?? "9") .localeCompare(b.due ?? "9") || b.amount - a.amount;
export const state = (p) => { const n = needPer(p), q = plan(p); return !n ? ["Funded", "pill-on"] : !q ? ["No plan", "pill-off"] : q >= n ? ["On track", "pill-on"] : ["Behind", "pill-warn"]; };
export const pieceTile = (p, s) => tile({ ...p, status: "Active" }, s);
export const nm = (p) => p.label.replace(/^The rest$/, "The rest of the car");
export const tipOf = (p, w = 230) => P.tip(P.hc({ h: nm(p), hr: needBadge(p), t: `${inr(p.saved)} of ${inr(p.amount)}`, d: p.due ? `due ${L.fmtY(p.due)}` : "no date", rows: [["Planned a month", plan(p) ? inr(plan(p)) : "none", ""], ["Needed a month", needPer(p) ? inr(needPer(p)) : "–", ""], ["Left to set aside", inr(p.left), ""]], f: "The white tick is where saving should be by now" }), { w, y: "down" });
