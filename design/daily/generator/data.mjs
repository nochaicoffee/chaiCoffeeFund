// The Daily canvas's sample data: made up, shaped like his spending (small UPI spends all month, a few big card spends). "Today" is Wed 18 Nov 2026.
// A month is a list of spends; every figure on every board is worked out from them here, and the build stops if a sum drifts.
import { TODAY, monthKey, addDays } from "./lib.mjs";

export { TODAY };
export const NOV = "2026-11";
export const OCT = "2026-10";
/** The monthly limit used on the boards that show one (a proposal: nothing sets it in the app yet). */
export const LIMIT = 30000;

export const CATS = {
  Food: { color: "copper", icon: "fork" },
  Groceries: { color: "olive", icon: "basket" },
  Transport: { color: "azure", icon: "bus" },
  Shopping: { color: "raspberry", icon: "bag" },
  Bills: { color: "amber", icon: "bolt" },
  Health: { color: "coral", icon: "heart" },
  Fun: { color: "indigo", icon: "ticket" },
  Other: { color: "slate", icon: "dot" },
};
export const CAT_KEYS = Object.keys(CATS);
/** A category he adds himself (round 3): not in the built-in list the chips start with, but known to every month. */
CATS.Pets = { color: "violet", icon: "paw" };
export const METHODS = { UPI: { name: "UPI", color: "teal" }, Card: { name: "Credit card", color: "ruby" } };

let n = 0;
const s = (date, amount, method, category, note) => ({ id: `s${++n}`, date, amount, method, category, note });
const nov = (d, ...rows) => rows.map(([amount, method, category, note]) => s(`2026-11-${String(d).padStart(2, "0")}`, amount, method, category, note));

/** November so far, to Wed 18. 17 spends days out of 18 (the 11th is quiet). */
export const NOV_SPENDS = [
  ...nov(1, [2400, "Card", "Groceries", "BigBasket"], [180, "UPI", "Food", "Breakfast"]),
  ...nov(2, [120, "UPI", "Transport", "Auto"], [340, "UPI", "Food", "Lunch"]),
  ...nov(3, [90, "UPI", "Transport", "Metro"], [260, "UPI", "Food", "Dinner"]),
  ...nov(4, [4999, "Card", "Shopping", "Running shoes"], [150, "UPI", "Food", "Coffee"]),
  ...nov(5, [410, "UPI", "Food", "Lunch"]),
  ...nov(6, [620, "UPI", "Fun", "Movie"], [280, "UPI", "Food", "Snacks"]),
  ...nov(7, [1850, "Card", "Bills", "Electricity"], [720, "UPI", "Food", "Dinner out"]),
  ...nov(8, [3200, "Card", "Groceries", "Weekly shop"]),
  ...nov(9, [100, "UPI", "Transport", "Auto"]),
  ...nov(10, [310, "UPI", "Food", "Lunch"]),
  ...nov(12, [899, "Card", "Health", "Pharmacy"], [95, "UPI", "Transport", "Metro"]),
  ...nov(13, [540, "UPI", "Food", "Lunch with the team"]),
  ...nov(14, [1299, "Card", "Shopping", "Books"], [480, "UPI", "Fun", "Bowling"]),
  ...nov(15, [760, "UPI", "Food", "Brunch"]),
  ...nov(16, [110, "UPI", "Transport", "Auto"]),
  ...nov(17, [420, "UPI", "Food", "Dinner"], [200, "UPI", "Other", "Barber"]),
  ...nov(18, [150, "UPI", "Food", "Tea"]),
];

/** October, a busy month: something written down every day, two to four spends most days. Generated from a fixed seed so a rebuild is the same. */
function octSpends() {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const small = [["Food", "Lunch", 260, 520], ["Food", "Dinner", 300, 700], ["Food", "Coffee", 90, 190], ["Food", "Snacks", 120, 260], ["Transport", "Auto", 90, 180], ["Transport", "Metro", 60, 120], ["Fun", "Movie", 400, 700], ["Other", "Recharge", 199, 299]];
  const out = [];
  for (let d = 1; d <= 31; d++) {
    const date = `2026-10-${String(d).padStart(2, "0")}`;
    const k = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < k; i++) {
      const [cat, note, lo, hi] = pick(small);
      out.push(s(date, Math.round((lo + rnd() * (hi - lo)) / 10) * 10, "UPI", cat, note));
    }
  }
  // The big ones, on a card.
  out.push(s("2026-10-02", 3600, "Card", "Groceries", "BigBasket"), s("2026-10-05", 5200, "Card", "Shopping", "Diwali shopping"), s("2026-10-09", 1700, "Card", "Bills", "Electricity"), s("2026-10-12", 2250, "Card", "Health", "Dental"), s("2026-10-19", 3300, "Card", "Groceries", "Weekly shop"), s("2026-10-28", 1400, "Card", "Bills", "Internet and phone"));
  // Two or three spends on a busy day: five on the 17th, so the day panel has a long list.
  out.push(s("2026-10-17", 230, "UPI", "Food", "Chai"), s("2026-10-17", 640, "UPI", "Food", "Lunch"), s("2026-10-17", 380, "UPI", "Transport", "Cab"));
  return out;
}
export const OCT_SPENDS = octSpends();

/** Earlier months, as totals (the Month by month rows only need these). */
export const EARLIER = [
  { key: "2026-09", upi: 9400, card: 19500 },
  { key: "2026-08", upi: 8700, card: 16100 },
  { key: "2026-07", upi: 9900, card: 16200 },
  { key: "2026-06", upi: 7900, card: 13500 },
];

export const ALL_SPENDS = [...OCT_SPENDS, ...NOV_SPENDS];

// ---------- The math (the same as lib/aggregate/dailySpends.ts, in rupees) ----------
export const daysIn = (key) => new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7), 0)).getUTCDate();
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const totals = (list) => { const upi = sum(list.filter((x) => x.method === "UPI").map((x) => x.amount)), card = sum(list.filter((x) => x.method === "Card").map((x) => x.amount)); return { total: upi + card, upi, card }; };

/** One month: its days (to today in the current month, all of a past one), totals, categories, weeks (Monday first) and the budget. `spends` is every spend. */
export function monthModel(spends, key, { today = TODAY, limit = null } = {}) {
  const inM = spends.filter((x) => monthKey(x.date) === key);
  const cur = key === monthKey(today), future = key > monthKey(today);
  const len = daysIn(key);
  const counted = future ? 0 : cur ? +today.slice(8) : len;
  const days = [];
  for (let d = 1; d <= len; d++) {
    const date = `${key}-${String(d).padStart(2, "0")}`;
    const list = inM.filter((x) => x.date === date);
    days.push({ date, d, spends: list, ...totals(list), counted: d <= counted, today: date === today, future: d > counted });
  }
  const t = totals(inM);
  const cats = Object.keys(CATS).map((c) => ({ cat: c, amount: sum(inM.filter((x) => x.category === c).map((x) => x.amount)) })).filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount).map((c) => ({ ...c, share: c.amount / t.total }));
  const countedDays = days.filter((d) => d.counted);
  const quiet = countedDays.filter((d) => d.spends.length === 0).length;
  const biggest = countedDays.reduce((b, d) => (d.total > (b?.total ?? 0) ? d : b), null);
  const perDay = counted ? t.total / counted : 0;
  // Monday-first weeks: 6 blank cells before Sunday the 1st, and so on.
  const first = new Date(`${key}-01T00:00:00Z`).getUTCDay();
  const lead = (first + 6) % 7;
  const cells = [...Array(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) { const row = cells.slice(i, i + 7); weeks.push({ cells: row, total: sum(row.filter(Boolean).map((c) => c.total)), upi: sum(row.filter(Boolean).map((c) => c.upi)), card: sum(row.filter(Boolean).map((c) => c.card)), from: row.find(Boolean)?.date, to: [...row].reverse().find(Boolean)?.date, inProgress: row.some((c) => c?.today) }); }
  const budget = limit == null ? null : { limit, left: limit - t.total, expected: Math.round((limit * counted) / len), daily: Math.round(limit / len), daysLeft: Math.max(0, len - counted), used: t.total / limit };
  if (budget && cur) {
    // Today's allowance: what's left of the limit before today, spread over the days to go counting today. Left today is that less what's gone today.
    const todayTotal = days.find((d) => d.today)?.total ?? 0;
    budget.todayTotal = todayTotal;
    budget.daysInclToday = len - counted + 1;
    budget.allowToday = Math.round(Math.max(0, limit - (t.total - todayTotal)) / budget.daysInclToday);
    budget.todayLeft = budget.allowToday - todayTotal;
    const wk = weeks.find((w) => w.inProgress);
    budget.week = wk ? { from: wk.from, to: wk.to, total: wk.total, share: Math.round((limit * 7) / len) } : null;
  }
  if (budget) { budget.perDayLeft = budget.daysLeft ? Math.round(Math.max(0, budget.left) / budget.daysLeft) : 0; budget.overPace = t.total - budget.expected; }
  return { key, cur, future, len, counted, days, ...t, count: inM.length, cats, quiet, biggest, perDay, pace: cur && t.total ? Math.round(perDay * len) : null, weeks, budget, spends: inM };
}

/** The six rows of Month by month, newest first, ending in `last`. */
export function monthRows(spends, last = NOV) {
  const keys = [NOV, OCT, "2026-09", "2026-08", "2026-07", "2026-06"];
  return keys.map((k) => { const e = EARLIER.find((x) => x.key === k); const m = e ? { key: k, upi: e.upi, card: e.card, total: e.upi + e.card, count: Math.round((e.upi + e.card) / 410) } : (() => { const mm = monthModel(spends, k); return { key: k, upi: mm.upi, card: mm.card, total: mm.total, count: mm.count }; })(); return m; });
}
export const usual = () => { const past = monthRows(ALL_SPENDS).filter((m) => m.key !== NOV && m.total > 0); return { total: Math.round(sum(past.map((m) => m.total)) / past.length), upi: Math.round(sum(past.map((m) => m.upi)) / past.length), card: Math.round(sum(past.map((m) => m.card)) / past.length) }; };

export const NOVM = monthModel(ALL_SPENDS, NOV, { limit: LIMIT });
export const OCTM = monthModel(ALL_SPENDS, OCT, { limit: LIMIT });
/** A spend just added (the add state), and a month already past its limit (the over state). */
export const ADDED = s("2026-11-18", 349, "UPI", "Food", "Evening snacks");
export const NOV_ADDED = monthModel([...ALL_SPENDS, ADDED], NOV, { limit: LIMIT });
export const NOV_OVER = monthModel([...ALL_SPENDS, s("2026-11-18", 9400, "Card", "Shopping", "Headphones")], NOV, { limit: LIMIT });
export const EMPTYM = monthModel([], NOV, { limit: LIMIT });

// ---------- Checks: stop the build if a figure drifts ----------
const must = (ok, msg) => { if (!ok) throw new Error(`Daily sample data: ${msg}`); };
must(NOVM.total === 20982 && NOVM.upi === 6335 && NOVM.card === 14647, `November should be ₹20,982 (UPI ₹6,335, card ₹14,647), got ${NOVM.total} / ${NOVM.upi} / ${NOVM.card}`);
must(NOVM.upi + NOVM.card === NOVM.total, "UPI plus card is the total");
must(NOVM.quiet === 1 && NOVM.biggest.date === "2026-11-04", "one quiet day, the 4th the biggest");
must(NOVM.days.length === 30 && NOVM.counted === 18, "30 days, 18 counted");
must(NOVM.weeks.length === 6 && NOVM.weeks[0].cells.findIndex(Boolean) === 6, "Nov 1 is a Sunday, so the Monday-first grid has six rows and opens with six blanks");
must(Math.abs(sum(NOVM.weeks.map((w) => w.total)) - NOVM.total) < 0.01, "week totals add up to the month");
must(Math.abs(sum(NOVM.cats.map((c) => c.amount)) - NOVM.total) < 0.01, "categories add up to the month");
must(NOVM.budget.left === 9018 && NOVM.budget.expected === 18000 && NOVM.budget.overPace === 2982, "budget: ₹9,018 left, ₹18,000 expected by the 18th");
must(OCTM.days.every((d) => d.spends.length >= 1) && OCTM.days.filter((d) => d.spends.length >= 2).length >= 14 && OCTM.total > 28000 && OCTM.total < 42000, `October is busy: every day written, most with 2+ spends, ₹${OCTM.total}`);
must(OCTM.days[16].spends.length >= 5, "Oct 17 has five or more spends");
must(Math.abs(sum(OCTM.weeks.map((w) => w.total)) - OCTM.total) < 0.01, "October's week totals add up");
must(NOVM.budget.allowToday === 705 && NOVM.budget.todayLeft === 555 && NOVM.budget.week.total === 880 && NOVM.budget.week.share === 7000, "left today ₹555 of a ₹705 allowance; the week so far ₹880 of ₹7,000");
must(NOV_ADDED.budget.todayLeft === 206 && NOV_ADDED.total === 21331, "after adding ₹349: ₹21,331 spent, ₹206 left today");
must(NOV_OVER.budget.left === -382 && NOV_OVER.budget.allowToday === 705 && NOV_OVER.budget.todayLeft === 705 - 9550, "the over state: ₹382 over the limit; today is ₹8,845 past its ₹705 allowance");
// ---------- A year (round 3): the widgets cover a year, and later a range ----------
const SHARES = { Food: 0.27, Groceries: 0.2, Shopping: 0.17, Bills: 0.09, Health: 0.06, Fun: 0.09, Transport: 0.08, Other: 0.04 };
/** Jan to Sep, as totals with the month's biggest spend, quiet days and longest run under a daily allowance. Jun to Sep match EARLIER; Oct and Nov come from their spends. */
const EARLY = [
  { key: "2026-01", upi: 8100, card: 15700, quiet: 3, run: 5, big: { note: "Phone and charger", amount: 2400, date: "2026-01-12", category: "Shopping", method: "Card" } },
  { key: "2026-02", upi: 7600, card: 14300, quiet: 4, run: 6, big: { note: "Weekend getaway", amount: 6800, date: "2026-02-14", category: "Fun", method: "Card" } },
  { key: "2026-03", upi: 8800, card: 22400, quiet: 2, run: 3, big: { note: "Sofa", amount: 14999, date: "2026-03-09", category: "Shopping", method: "Card" } },
  { key: "2026-04", upi: 9200, card: 16200, quiet: 2, run: 4, big: { note: "Groceries", amount: 4100, date: "2026-04-04", category: "Groceries", method: "Card" } },
  { key: "2026-05", upi: 8000, card: 14600, quiet: 3, run: 7, big: { note: "Dental", amount: 3600, date: "2026-05-20", category: "Health", method: "Card" } },
  { key: "2026-06", upi: 7900, card: 13500, quiet: 3, run: 5, big: { note: "Weekly shop", amount: 3200, date: "2026-06-13", category: "Groceries", method: "Card" } },
  { key: "2026-07", upi: 9900, card: 16200, quiet: 1, run: 4, big: { note: "Monsoon trip", amount: 5400, date: "2026-07-18", category: "Fun", method: "Card" } },
  { key: "2026-08", upi: 8700, card: 16100, quiet: 2, run: 6, big: { note: "Wedding gift", amount: 6500, date: "2026-08-22", category: "Shopping", method: "Card" } },
  { key: "2026-09", upi: 9400, card: 19500, quiet: 1, run: 3, big: { note: "Flights home", amount: 7800, date: "2026-09-10", category: "Transport", method: "Card" } },
];
const catsOf = (total, big) => {
  const rest = total - big.amount, keys = Object.keys(SHARES), out = {};
  let used = 0;
  keys.forEach((c, i) => { if (i === keys.length - 1) return; const v = Math.round((rest * SHARES[c] * (1 + (((i * 7 + total) % 11) - 5) / 100)) / 10) * 10; out[c] = v; used += v; });
  out[keys.at(-1)] = rest - used;
  out[big.category] += big.amount;
  return out;
};
/** The longest run of counted days under `daily` (a day with nothing written counts as under). */
const longestRun = (m, daily) => { let best = 0, cur = 0; for (const d of m.days.filter((x) => x.counted)) { cur = d.total <= daily ? cur + 1 : 0; best = Math.max(best, cur); } return best; };
const currentRun = (m, daily) => { let n = 0; for (const d of [...m.days].reverse().filter((x) => x.counted)) { if (d.total > daily) break; n++; } return n; };
const fromModel = (m) => { const top = [...m.spends].sort((a, b) => b.amount - a.amount)[0]; return { key: m.key, upi: m.upi, card: m.card, quiet: m.quiet, run: longestRun(m, LIMIT / 30), big: { note: top.note, amount: top.amount, date: top.date, category: top.category, method: top.method }, cats: Object.fromEntries(m.cats.map((c) => [c.cat, c.amount])) }; };
export const YEAR_MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"].map((key) => {
  const e = EARLY.find((x) => x.key === key);
  if (e) return { ...e, total: e.upi + e.card, cats: catsOf(e.upi + e.card, e.big) };
  const m = key === OCT ? OCTM : key === NOV ? NOVM : null;
  if (m) { const r = fromModel(m); return { ...r, total: r.upi + r.card }; }
  return { key, upi: 0, card: 0, total: 0, quiet: 0, run: 0, big: null, cats: {}, future: true };
});
/** What the year-scoped widgets read (a range would build the same thing over its own months). */
export function yearModel(limit = LIMIT) {
  const months = YEAR_MONTHS;
  const live = months.filter((x) => !x.future), full = live.filter((x) => x.key < NOV);
  const total = sum(live.map((x) => x.total)), upi = sum(live.map((x) => x.upi)), card = sum(live.map((x) => x.card));
  const catTotals = {};
  for (const x of live) for (const [c, v] of Object.entries(x.cats)) catTotals[c] = (catTotals[c] ?? 0) + v;
  const cats = Object.entries(catTotals).map(([cat, amount]) => ({ cat, amount, share: amount / total })).sort((a, b) => b.amount - a.amount);
  const bigs = live.map((x) => x.big).filter(Boolean).sort((a, b) => b.amount - a.amount);
  const best = live.reduce((b, x) => (x.run > (b?.run ?? 0) ? x : b), null);
  return { label: "2026", months, live, total, upi, card, avg: Math.round(sum(full.map((x) => x.total)) / full.length), fullCount: full.length, inside: full.filter((x) => x.total <= limit).length, over: full.filter((x) => x.total > limit), cats, bigs, quiet: sum(live.map((x) => x.quiet)), bestRun: best.run, bestRunMonth: best.key, curRun: currentRun(NOVM, limit / 30) };
}
export const YEARM = yearModel();
/** The categories board: a month with a category he added (Pets). */
export const NOV_PETS = monthModel([...ALL_SPENDS, s("2026-11-10", 850, "Card", "Pets", "Vet"), s("2026-11-15", 320, "UPI", "Pets", "Treats")], NOV, { limit: LIMIT });
must(YEARM.total === 281592 && YEARM.fullCount === 10 && YEARM.inside === 8 && YEARM.quiet === 22 && YEARM.curRun === 4, `the year: ₹2,81,592 so far, 8 of 10 full months inside the limit, 22 quiet days, a 4-day run now (got ${YEARM.total}, ${YEARM.inside}/${YEARM.fullCount}, ${YEARM.quiet}, ${YEARM.curRun})`);
must(Math.abs(sum(YEARM.cats.map((c) => c.amount)) - YEARM.total) < 1, "the year's categories add up to the year");
must(YEARM.months.filter((x) => !x.future).every((x) => Math.abs(sum(Object.values(x.cats)) - x.total) < 1 && (!x.big || x.big.amount <= x.total)), "every month's categories add up to it and its biggest spend fits inside it");
must(YEARM.bigs[0].amount === 14999 && YEARM.top === undefined, "the year's biggest spend is the ₹14,999 sofa");
export const SAMPLE = { nov: NOVM, oct: OCTM };
export { addDays };
