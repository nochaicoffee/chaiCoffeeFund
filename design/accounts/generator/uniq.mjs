// Helpers for directions E–N: amounts in words, polar and isometric geometry, circle packing, dials,
// and the passbook-style entries worked out from snapshots and the rest of the app.
import * as L from "./lib.mjs";
import * as P from "./parts.mjs";

// ---------- Amount in words, Indian style (lakh, crore) ----------
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const two = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`);
export function inWords(amount) {
  let n = Math.round(Math.abs(amount));
  if (!n) return "Rupees Zero only";
  const parts = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  const hundred = Math.floor(n / 100); n %= 100;
  if (crore) parts.push(`${two(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (n) parts.push(two(n));
  return `Rupees ${parts.join(" ")} only`;
}

// ---------- Geometry ----------
export const polar = (cx, cy, r, deg) => [cx + r * Math.cos(((deg - 90) * Math.PI) / 180), cy + r * Math.sin(((deg - 90) * Math.PI) / 180)];
export const arc = (cx, cy, r, a0, a1) => { const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1); return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`; };
/** Greedy circle packing: biggest first, each placed as close to the centre as it fits. */
export function pack(items, gap = 8) {
  const placed = [];
  for (const it of items.slice().sort((a, b) => b.r - a.r)) {
    if (!placed.length) { placed.push({ ...it, x: 0, y: 0 }); continue; }
    let best = null;
    for (let d = 0; d < 900 && !best; d += 3) for (let a = 0; a < 360; a += 6) {
      const x = d * Math.cos((a * Math.PI) / 180) * 1.35, y = d * Math.sin((a * Math.PI) / 180) * 0.82;
      if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + it.r + gap)) { best = { ...it, x, y }; break; }
    }
    placed.push(best);
  }
  return placed;
}
/** An isometric prism: the footprint's front corner at (x, y), width w along x, depth d, height h. */
export function prism(x, y, w, d, h, { top, left, right, cls = "", stroke = "none", bands = 0 } = {}) {
  const c = 0.5, s = 0.866;
  const p = (dx, dy, dz) => [x + dx * s - dy * s, y + dx * c + dy * c - dz];
  const pts = (arr) => arr.map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
  const A = p(0, 0, h), B = p(w, 0, h), C = p(w, d, h), D = p(0, d, h), A0 = p(0, 0, 0), B0 = p(w, 0, 0), D0 = p(0, d, 0);
  const lines = bands && h > 6 ? Array.from({ length: Math.floor(h / bands) }, (_, i) => { const z = (i + 1) * bands; const a = p(0, 0, z), b = p(w, 0, z), e = p(0, d, z); return `<polyline points="${pts([e, a, b])}" fill="none" stroke="oklch(1 0 0 / 0.16)" stroke-width="0.8"></polyline>`; }).join("") : "";
  return `<g class="${cls}"><polygon points="${pts([D0, A0, A, D])}" fill="${left}" stroke="${stroke}"></polygon><polygon points="${pts([A0, B0, B, A])}" fill="${right}" stroke="${stroke}"></polygon>${lines}<polygon points="${pts([A, B, C, D])}" fill="${top}" stroke="${stroke}"></polygon></g>`;
}

// ---------- Entries, passbook style ----------
/**
 * One account's entries between two dates, as a passbook would print them: what was brought forward,
 * the recorded income and bills in date order with a running balance (worked out), "not recorded" to
 * close each gap, and every balance you recorded (the only figures that are facts).
 */
export function entries(id, from, to = L.TODAY) {
  const snaps = L.snapsOf(id).filter((s) => s.date > from && s.date <= to);
  const start = L.balanceOn(id, from) ?? 0;
  const flows = L.FLOWS.filter((f) => f.account === id && f.date > from && f.date <= to);
  const rows = [{ kind: "bf", date: from, text: "Brought forward", bal: start, fact: true }];
  let run = start, lastSnap = { date: from, balance: start };
  const events = [...flows.map((f) => ({ ...f, t: "flow" })), ...snaps.map((s) => ({ ...s, t: "snap" }))].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.t === "flow" ? -1 : 1));
  for (const e of events) {
    if (e.t === "flow") { const inn = L.KINDS[e.kind].dir === "in"; run += inn ? e.amount : -e.amount; rows.push({ kind: e.kind, date: e.date, text: e.label, dep: inn ? e.amount : null, wd: inn ? null : e.amount, bal: run, ref: e.ref }); continue; }
    const gap = e.balance - run;
    if (Math.abs(gap) >= 1) rows.push({ kind: "other", date: e.date, text: gap > 0 ? "Not recorded, in" : "Not recorded, out", dep: gap > 0 ? gap : null, wd: gap < 0 ? -gap : null, bal: e.balance });
    rows.push({ kind: "snap", date: e.date, text: "Balance recorded", bal: e.balance, fact: true });
    run = e.balance; lastSnap = e;
  }
  return { rows, start, end: run, lastSnap };
}

// ---------- A dial (gauge) ----------
/** An arc gauge from a0 to a1 degrees (0 = up), with ticks, a coloured track to the value and a needle. */
export function dial({ cx, cy, r, frac, a0 = -120, a1 = 120, ticks = 10, color = "var(--accent)", track = "oklch(1 0 0 / 0.12)", tickColor = "oklch(1 0 0 / 0.5)", labels = [], needle = "var(--on-card)", width = 10, cls = "" }) {
  const f = Math.max(0, Math.min(1, frac)), av = a0 + (a1 - a0) * f;
  const tk = Array.from({ length: ticks + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / ticks, [x0, y0] = polar(cx, cy, r - width - 4, a), [x1, y1] = polar(cx, cy, r - width - (i % 5 === 0 ? 14 : 9), a); return `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${tickColor}" stroke-width="${i % 5 === 0 ? 2 : 1.2}"></line>`; }).join("");
  const lb = labels.map(([t, txt]) => { const a = a0 + (a1 - a0) * t, [x, y] = polar(cx, cy, r - width - 28, a); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="${Math.max(9, r / 13)}" font-weight="800" fill="${tickColor}">${txt}</text>`; }).join("");
  const [nx, ny] = polar(cx, cy, r - width - 10, av);
  return `<g class="${cls}"><path d="${arc(cx, cy, r - width / 2, a0, a1)}" fill="none" stroke="${track}" stroke-width="${width}" stroke-linecap="round"></path>${f > 0.005 ? `<path d="${arc(cx, cy, r - width / 2, a0, av)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"></path>` : ""}${tk}${lb}<g class="needle" style="transform-origin:${cx}px ${cy}px"><line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="${needle}" stroke-width="${Math.max(2.5, r / 40)}" stroke-linecap="round"></line></g><circle cx="${cx}" cy="${cy}" r="${Math.max(5, r / 16)}" fill="${needle}"></circle></g>`;
}

/** The accounts a direction shows, in order: active by balance, then closed. */
export const ACCTS = P.ORDER;
export const F = (id) => P.FACTS[id];
