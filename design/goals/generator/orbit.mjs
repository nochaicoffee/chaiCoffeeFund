// The picked Orbit sky and the "All goals" side that sits beside it, shared by the final page (final.mjs), its states and phone, and G14 (dash4.mjs).
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";
import { PIECES, exp, pct, plan, needPer, byDue, pieceTile, nm, tipOf, gr } from "./shared4.mjs";
const { I, inr, inrL, inrS, fmt, plural, sum } = L;

// ---------- The sky ----------
// Hand-placed angles (degrees, 0 = right, 90 = down, 270 = up; the ring labels sit at the top so 255 to 285 stays clear).
const ANG = { "New fridge": 10, "New tyres": 190, "The iPad": 235, "Apple Pencil": 70, "Suspension": 320, "Goa trip": 150, "Alloy wheels": 100, "Music system": 200, "The rest of the car": 330, "Masters course": 60, "Mirrorless camera": 30 };
const WHITE = "white", RED = "oklch(0.78 0.17 25)";
/** A piece of a goal as the sky draws it: where its ring is (months left, 0 overdue, 99 someday) and whether it's dimmed. */
export const asPiece = (p, patch = {}) => {
  const q = { ...p, ...patch }; q.left = Math.max(0, q.amount - q.saved);
  q.ring = q.status === "Paused" || !q.due ? 99 : q.due < L.TODAY ? 0 : Math.max(1, L.monthsLeft(q.due));
  return q;
};
const CAMERA = () => { const x = L.goal("camera"); return asPiece({ ...x, piece: x, top: x, label: x.name, color: L.gColor(x), saved: L.savedOwn(x.id), due: null, plannedMonthly: 0 }); };
export const SKY_PIECES = () => [...PIECES.filter((p) => p.due).sort(byDue).map((p) => asPiece(p)), CAMERA()];

export function sky({ pieces = SKY_PIECES(), S = 780, phone = false, pick = true, sun, keys = true, rings = [1, 3, 6, 12, 24, 36], ids = null } = {}) {
  const k = S / 780, C = S / 2, rad = (m) => k * (104 + 38 * Math.sqrt(m === 99 ? 40 : Math.min(m, 36))), pr = (a) => Math.max(phone ? 11 : 7, k * (7 + Math.sqrt(a) / 22) * (phone ? 1.25 : 1));
  const has = (m) => pieces.some((p) => p.ring === m);
  const stars = Array.from({ length: Math.round(70 * k) }, (_, i) => { const a = (i * 2654435761) % 1000, b = (i * 40503 + 977) % 1000; return `<i style="left:${a / 10}%;top:${b / 10}%;width:${1 + (i % 3 === 0 ? 1 : 0)}px;height:${1 + (i % 3 === 0 ? 1 : 0)}px;opacity:${0.25 + (i % 5) * 0.12}"></i>`; }).join("");
  const rl = (r, t, red = false, low = false) => `<span class="or-ring${red ? " red" : ""}" style="left:${C}px;top:${low ? C + r : C - r}px">${t}</span>`;
  const circ = (r, red = false) => `<circle cx="${C}" cy="${C}" r="${r}" fill="none" stroke="${red ? "oklch(0.7 0.18 25 / .6)" : "oklch(1 0 0/.16)"}" stroke-dasharray="${red ? "4 5" : "2 6"}"></circle>`;
  const ringHtml = rings.map((m) => circ(rad(m))).join("") + (has(0) ? circ(rad(0), true) : "") + (has(99) ? circ(rad(99)) : "");
  const ringLabels = rings.filter((m) => !phone || [6, 12, 24].includes(m)).map((m) => rl(rad(m), m < 12 ? `${m} mo` : m === 36 ? "3 yr+" : `${m / 12} yr`)).join("") + (has(0) ? rl(rad(0), "overdue", true) : "") + (has(99) ? rl(rad(99), "someday", false, true) : "");
  const seen = {}, order = pieces;
  const planets = order.map((p, i) => {
    const r = rad(p.ring), n = (seen[p.ring] = (seen[p.ring] ?? 0) + 1) - 1;
    let deg = ANG[nm(p)] ?? ((i * 137.5 + 20 + n * 40) % 360);
    if (!(nm(p) in ANG) && Math.abs(((deg + 90 + 540) % 360) - 180) < 16) deg += 32;
    const ang = (deg * Math.PI) / 180, x = C + r * Math.cos(ang), y = C + r * Math.sin(ang), d = pr(p.amount) * 2, ring = d + (phone ? 8 : 12), pc = pct(p), full = pc >= 1, over = p.saved > p.amount;
    const below = Math.sin(ang) < 0.7, off = p.status === "Paused", late = p.ring === 0 && p.left > 0;
    const num = order.indexOf(p) + 1, tag = pick && p.top ? "label" : "div", forId = pick && p.top ? ` for="po-${p.top.id}"` : "";
    const lab = phone ? "" : `<span class="or-n" style="${below ? "top:calc(100% + 4px)" : "bottom:calc(100% + 4px)"}"><b>${nm(p).replace(/^The rest of the car$/, "Car: the rest")}</b><small>${off ? "paused · " + inrS(p.left) + " to go" : full ? "funded" : `${inrS(p.left)} to go · ${p.due ? fmt(p.due) : ""}`}</small></span>`;
    const core = phone ? `<b class="or-num">${num}</b>` : pieceTile(p, Math.max(14, Math.round(d * 0.55)));
    return `<${tag}${forId} class="or-p hov${full ? " full" : ""}${off ? " off" : ""}${late ? " late" : ""} g-${p.top?.id ?? "x"}"${pick && p.top ? "" : ' tabindex="0"'} style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${ring}px;height:${ring}px;margin:${-ring / 2}px 0 0 ${-ring / 2}px;background:conic-gradient(${late ? RED : WHITE} ${(Math.min(1, pc) * 360).toFixed(1)}deg,oklch(1 0 0/.2) 0)"><span class="or-core rt" style="background:${gr(p.color, 150)}">${core}</span>${p.dateType === "Fixed" && p.status !== "Paused" ? `<span class="or-flag">${I.pin(phone ? 8 : 10)}</span>` : ""}${over ? `<span class="or-over">+${inrS(p.saved - p.amount)}</span>` : ""}${lab}${phone ? "" : tipOf(p, 230)}</${tag}>`;
  }).join("");
  const sunHtml = `<div class="or-sun" style="left:${C}px;top:${C}px;width:${156 * k}px;height:${156 * k}px;margin:${-78 * k}px 0 0 ${-78 * k}px;${sun.done ? "box-shadow:0 0 80px oklch(0.85 0.18 140 / .55), inset 0 1px 0 oklch(1 0 0/.3)" : ""}${sun.empty ? ";background:radial-gradient(circle at 35% 30%, oklch(0.5 0.03 262), oklch(0.28 0.03 262) 70%);box-shadow:inset 0 1px 0 oklch(1 0 0/.2)" : ""}"><span class="hk" style="color:inherit;opacity:.75${phone ? ";font-size:8px" : ""}">${sun.k ?? "Set aside"}</span><b style="${phone ? "font-size:18px" : ""}">${sun.big}</b><small style="${phone ? "font-size:9px" : ""}">${sun.small}</small></div>`;
  const key = keys && !phone ? `<div class="or-key"><span><i class="dot" style="background:white;border-radius:50%"></i> the arc is what's set aside</span><span>${I.pin(10)} Fixed date</span><span>bigger planet, bigger amount</span></div>` : "";
  return `<div class="or-sky" style="width:${S}px;height:${S}px"><div class="or-stars">${stars}</div><svg width="${S}" height="${S}" style="position:absolute;inset:0">${ringHtml}</svg>${ringLabels}${sunHtml}${planets}${key}</div>`;
}

export const allSun = { big: inrL(L.SAVED), small: `of ${inrL(L.TARGET)} · ${Math.round((L.SAVED / L.TARGET) * 100)}%` };

// ---------- The side of the sky ----------
const bands = [["Within 3 months", (m) => m <= 3], ["3 to 12 months", (m) => m > 3 && m <= 12], ["1 to 2 years", (m) => m > 12 && m <= 24], ["Further out", (m) => m > 24 && m < 99]];
function bandRows(ps) {
  return bands.map(([t, f]) => {
    const inB = ps.filter((p) => f(p.ring)), togo = sum(inB.map((p) => p.left)), mo = sum(inB.map(needPer));
    return `<div class="or-row"><div><b>${t}</b><small>${inB.length ? plural(inB.length, "piece") : "nothing yet"}</small></div><div class="or-dots">${inB.map((p) => `<i class="dot" style="background:var(--card-${p.color});width:12px;height:12px;border-radius:50%"></i>`).join("")}</div><div style="text-align:right"><b>${inr(togo)}</b><small>${mo ? `${inr(mo)} a month` : "–"}</small></div></div>`;
  }).join("");
}
const statCard = (k, p, line) => `<div class="cc rt hov" tabindex="0" style="background:${gr(p.color, 150)};flex:1;justify-content:space-between"><div class="between"><span class="hk" style="color:inherit;opacity:.8">${k}</span>${pieceTile(p, 30)}</div><div><b style="font-size:18px;font-weight:800;display:block">${nm(p)}</b><div class="cc-big" style="margin-top:4px">${inr(p.left)}<small>to go</small></div><div style="font-size:12px;font-weight:600;opacity:.85;margin-top:4px">${line}</div></div><div><div class="cc-gb" style="height:8px"><i style="width:${(pct(p) * 100).toFixed(1)}%"></i>${exp(p) != null ? `<b style="left:${(exp(p) * 100).toFixed(1)}%"></b>` : ""}</div><div class="between" style="font-size:11.5px;font-weight:700;margin-top:6px;opacity:.9"><span>${inrS(p.saved)} of ${inrS(p.amount)}</span><span>${plan(p) ? `${inr(plan(p))} planned · ` : "no plan · "}needs ${inr(needPer(p))}</span></div></div>${tipOf(p, 230)}</div>`;
export function sideAll(ps = SKY_PIECES()) {
  const live = ps.filter((p) => p.ring !== 99 && p.left), nx = live.sort((a, b) => a.ring - b.ring)[0], big = [...live].sort((a, b) => b.left - a.left)[0];
  return `<div class="stack3"><b style="font-size:15px;font-weight:800">How far out</b><span class="card-note">Each ring is a distance in months from today. The date picks the ring, so a goal moves inward as it nears. Pick a planet to open its goal.</span></div><div>${bandRows(ps)}</div>${statCard("Closest", nx, `${fmt(nx.due)} · ${nx.dateType === "Fixed" ? "Fixed, " : ""}${L.monthsLeft(nx.due)} month left`)}${statCard("Furthest to go", big, `${inr(big.amount)} in all · ${Math.round(pct(big) * 100)}% saved · due ${fmt(big.due)}`)}`;
}
