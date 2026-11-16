// The five monthly measures for the Overview's "Month by month" widget, read from the Expenses canvas's made-up year
// (Nov 2025 to Oct 2026, so every figure here matches what /expenses would show). Nothing is invented twice.
//
//   income       what came in (salary and the rest)
//   investments  moved to brokers and new deposits (Expenses' "Invested")
//   emis         loan installments paid (recorded from Aug 2026, so earlier months have none)
//   cards        credit card bills paid that month
//   cash         cash and UPI: the part of the month's spending no record explains
import { MONTHS } from "../../expenses/generator/data.mjs";

export const TODAY = "2026-11-16";
export const KEYS = MONTHS.map((m) => m.key);
export const LAST = KEYS.at(-1);

/** Icons (24px grid, stroke) and colours: each measure keeps one colour everywhere, the Overview tile colours. */
export const MEASURES = [
  { k: "inc", src: "inc", name: "Income", word: "came in", page: "Income", href: "/income", color: "emerald", hue: 150, good: "up", icon: '<path d="M12 4v12m0 0-5-5m5 5 5-5M5 20h14"/>' },
  { k: "inv", src: "inv", name: "Investments", word: "moved to brokers and new FDs", page: "Investments", href: "/investments", color: "sapphire", hue: 258, good: "up", icon: '<path d="m3 17 6-6 4 4 8-8M15 7h6v6"/>' },
  { k: "emi", src: "emi", name: "EMIs", word: "loan installments paid", page: "Loans", href: "/loans", color: "teal", hue: 200, good: "flat", icon: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>' },
  { k: "card", src: "card", name: "Credit card bills", word: "statements paid that month", page: "Cards", href: "/cards", color: "ruby", hue: 22, good: "down", icon: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>' },
  { k: "cash", src: "cash", name: "Cash expenses", word: "cash and UPI, worked out", page: "Expenses", href: "/expenses", color: "copper", hue: 50, good: "down", icon: '<rect x="2" y="6" width="20" height="12" rx="3"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/>' },
];

/** Same rule as the app's heatLevel (cardSpend.ts): 1 to 5, relative to the largest month of that measure. */
export const heatLevel = (amount, max) => (max <= 0 || amount <= 0 ? 1 : Math.min(5, Math.max(1, Math.ceil((amount / max) * 5))));

const ord = (n) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`;

/** Every measure's twelve months, with what a widget needs: level, peak, average over months that have data, rank. */
export const SERIES = MEASURES.map((m) => {
  const cells = MONTHS.map((x) => ({ month: x.key, amount: x[m.src] > 0 ? x[m.src] : null }));
  const have = cells.filter((c) => c.amount !== null);
  const max = Math.max(...have.map((c) => c.amount));
  const total = have.reduce((s, c) => s + c.amount, 0);
  const avg = Math.round(total / have.length);
  const sorted = [...have].sort((a, b) => b.amount - a.amount);
  const min = sorted.at(-1);
  for (const c of cells) {
    c.level = c.amount === null ? 0 : heatLevel(c.amount, max);
    c.rank = c.amount === null ? null : sorted.findIndex((s) => s.month === c.month) + 1;
    c.vsAvg = c.amount === null ? null : (c.amount - avg) / avg;
  }
  const peak = sorted[0];
  const last = cells.at(-1);
  const prev = cells.at(-2);
  return { ...m, cells, max, total, avg, months: have.length, peak, min, last, prev, rankText: (c) => (c.rank ? `${ord(c.rank)} highest of ${have.length}` : "") };
});

// ---------- Checks: stop the build if a figure drifts from the Expenses canvas ----------
const must = (ok, what) => { if (!ok) throw new Error(`data.mjs check failed: ${what}`); };
const by = Object.fromEntries(SERIES.map((s) => [s.k, s]));
must(by.inc.last.amount === 183526, "October income ₹1,83,526");
must(by.card.last.amount === 75655, "October card bills ₹75,655");
must(by.emi.last.amount === 22450 && by.emi.months === 3, "EMIs recorded for Aug to Oct only");
must(by.cash.peak.month === "2026-07", "cash expenses peak in July");
must(by.inc.peak.month === "2026-07", "income peaks in July (bonus)");

// ---------- Several years (round 2): a longer, made-up history behind the same twelve months ----------
// Nov 2023 to Oct 2026. The last twelve months are the Expenses canvas's; the earlier two years are made up
// (the same shape, smaller and with a little wobble). Records start at different times, as the real ones do:
// income and investments go back the whole way, cash expenses to Jan 2025, card bills to Aug 2025 (when his statements begin)
// and EMIs to Aug 2026, so a long range has honest gaps at the start.
export const LONG_KEYS = (() => { const out = []; let y = 2023, m = 11; while (`${y}-${String(m).padStart(2, "0")}` <= LAST) { out.push(`${y}-${String(m).padStart(2, "0")}`); if (++m > 12) { m = 1; y++; } } return out; })();
const recent = Object.fromEntries(MONTHS.map((x) => [x.key, x]));
const START = { inc: "2023-11", inv: "2023-11", emi: "2026-08", card: "2025-08", cash: "2025-01" };
const SCALE = { inc: [0.78, 0.89], inv: [0.42, 0.7], emi: [1, 1], card: [0.8, 0.85], cash: [0.85, 0.9] };
function amountFor(m, key) {
  if (recent[key]) return recent[key][m.src] > 0 ? recent[key][m.src] : null;
  if (key < START[m.k]) return null;
  const i = LONG_KEYS.indexOf(key);
  const slot = key < "2024-11" ? 0 : 1; // SCALE is [older, newer]: 0 is Nov 2023 to Oct 2024, 1 is Nov 2024 to Oct 2025
  const twin = recent[`${Number(key.slice(0, 4)) + (key < "2024-11" ? 2 : 1)}-${key.slice(5)}`];
  const base = twin?.[m.src];
  if (!base) return null;
  const wobble = 1 + 0.14 * Math.sin(i * 2.31 + m.hue);
  return Math.round((base * SCALE[m.k][slot] * wobble) / 100) * 100;
}

/** A measure's cells for any run of months, with everything a widget needs worked out for that run: shades, peak, average, rank. */
export function seriesFor(m, keys) {
  const cells = keys.map((k) => ({ month: k, amount: amountFor(m, k) }));
  const have = cells.filter((c) => c.amount !== null);
  const max = Math.max(1, ...have.map((c) => c.amount));
  const total = have.reduce((s, c) => s + c.amount, 0);
  const avg = have.length ? Math.round(total / have.length) : 0;
  const sorted = [...have].sort((a, b) => b.amount - a.amount);
  for (const c of cells) {
    c.level = c.amount === null ? 0 : heatLevel(c.amount, max);
    c.rank = c.amount === null ? null : sorted.findIndex((s) => s.month === c.month) + 1;
    c.vsAvg = c.amount === null ? null : (c.amount - avg) / avg;
  }
  const last = cells.at(-1);
  return { ...m, cells, max, total, avg, months: have.length, peak: sorted[0], min: sorted.at(-1), last, rankText: (c) => (c.rank ? `${ord(c.rank)} highest of ${have.length}` : "") };
}
export const lastN = (n) => LONG_KEYS.slice(-n);
export const yearsOf = (keys) => [...new Set(keys.map((k) => k.slice(0, 4)))];
