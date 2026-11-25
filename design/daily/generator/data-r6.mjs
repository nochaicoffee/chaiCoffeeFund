// Round 6 (2026-11-25): sample data for quick entry (often-used spends, cash), category limits, and the all-spends page. Made up, shaped like his spending.
import * as D from "./data.mjs";
import * as L from "./lib.mjs";

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const must = (ok, msg) => { if (!ok) throw new Error(`Daily round 6 sample data: ${msg}`); };

/** The spends he writes most, worked out from the diary: the same note, amount, method and category, newest habits first. (Made up: a diary this young has few repeats, so these are what a few months would show.) */
export const OFTEN = [
  { note: "Chai", amount: 40, method: "UPI", category: "Food", n: 23 },
  { note: "Auto", amount: 120, method: "UPI", category: "Transport", n: 14 },
  { note: "Lunch", amount: 340, method: "UPI", category: "Food", n: 12 },
  { note: "Metro", amount: 90, method: "UPI", category: "Transport", n: 9 },
  { note: "Coffee", amount: 150, method: "UPI", category: "Food", n: 8 },
  { note: "Weekly shop", amount: 3200, method: "Card", category: "Groceries", n: 4 },
];
/** What the type-ahead offers after "ch": notes he has used, with what he usually paid and how often. */
export const SUGGEST = [
  { note: "Chai", amount: 40, method: "UPI", category: "Food", n: 23 },
  { note: "Chai and snacks", amount: 110, method: "UPI", category: "Food", n: 5 },
  { note: "Chemist", amount: 260, method: "UPI", category: "Health", n: 3 },
];
/** Repeats, kept so a daily chai or a monthly gym fee doesn't have to be typed. They only ever offer: nothing is written until he taps Add. */
export const REPEATS = [
  { note: "Chai", amount: 40, method: "UPI", category: "Food", every: "Every weekday", due: true },
  { note: "Gym", amount: 1500, method: "Card", category: "Health", every: "Monthly on the 18th", due: true },
  { note: "Maid", amount: 2000, method: "Cash", category: "Bills", every: "Monthly on the 1st", due: false, next: "1 Dec" },
];

/** November's mix if part of it had been cash (round 6's Cash board): UPI ₹5,415, card ₹14,647, cash ₹920, the same ₹20,982. */
export const PAID = { upi: 5415, card: 14647, cash: 920 };
must(PAID.upi + PAID.card + PAID.cash === D.NOVM.total, `the cash mix should still add to ₹${D.NOVM.total}`);

// ---------- Category limits ----------
/** A made-up limit per category for November. Other has none; the rest add up to ₹24,000 of the ₹30,000 monthly limit. */
export const CAT_LIMITS = { Food: 6000, Groceries: 6000, Shopping: 5000, Bills: 3000, Health: 1500, Fun: 1500, Transport: 1000 };
export const GIVEN = sum(Object.values(CAT_LIMITS));
export const catSpent = (m, c) => m.cats.find((x) => x.cat === c)?.amount ?? 0;
/** One row per category: spent, its limit, how far through, last month's figure. */
export function limitRows(m = D.NOVM, last = D.OCTM) {
  // Last month's figure is October up to the same day (the 18th), so a month part-way through isn't set against a whole one.
  const same = (c) => sum(D.ALL_SPENDS.filter((x) => x.date.startsWith(D.OCT) && x.date <= "2026-10-18" && x.category === c).map((x) => x.amount));
  return D.CAT_KEYS.map((c) => {
    const spent = catSpent(m, c), limit = CAT_LIMITS[c] ?? null, prev = same(c);
    const used = limit ? spent / limit : null;
    const state = limit == null ? "none" : spent > limit ? "over" : used >= 0.8 ? "near" : "ok";
    return { cat: c, spent, limit, prev, used, state, left: limit == null ? null : limit - spent, diff: spent - prev };
  });
}
export const LIMITS = limitRows();
must(GIVEN === 24000, "category limits add up to ₹24,000");
must(LIMITS.find((r) => r.cat === "Shopping").state === "over" && LIMITS.find((r) => r.cat === "Groceries").state === "near", "Shopping is over and Groceries near its limit");
must(LIMITS.find((r) => r.cat === "Food").state === "ok", "Food is inside its limit");
export const ATTENTION = LIMITS.filter((r) => r.state === "over" || r.state === "near").sort((a, b) => b.used - a.used);

// ---------- The all-spends page ----------
/** Every spend, newest day first (and the later one first inside a day, as the diary shows them). */
export const ALL = [...D.ALL_SPENDS].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : Number(b.id.slice(1)) - Number(a.id.slice(1))));
export const NOV_ALL = ALL.filter((x) => x.date.startsWith(D.NOV));
export const OCT_ALL = ALL.filter((x) => x.date.startsWith(D.OCT));
export const biggest = (list) => [...list].sort((a, b) => b.amount - a.amount)[0];
export const avgOf = (list) => Math.round(sum(list.map((x) => x.amount)) / (list.length || 1));
/** Group spends by day, newest first. */
export function byDay(list) {
  const out = [];
  for (const x of list) { const g = out.at(-1); if (g && g.date === x.date) g.list.push(x); else out.push({ date: x.date, list: [x] }); }
  return out.map((g) => ({ ...g, total: sum(g.list.map((x) => x.amount)) }));
}
/** A category's spends in a month, and the figures its page shows: this month and last, its limit, its weekdays, its average spend. */
export function categoryPage(cat, m = D.NOVM, last = D.OCTM) {
  const list = NOV_ALL.filter((x) => x.category === cat), prev = OCT_ALL.filter((x) => x.category === cat);
  const total = sum(list.map((x) => x.amount)), prevTotal = sum(prev.map((x) => x.amount));
  const dows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => ({ d, amount: 0 }));
  for (const x of list) { const i = (new Date(`${x.date}T00:00:00Z`).getUTCDay() + 6) % 7; dows[i].amount += x.amount; }
  // Same point last month: October up to the 18th.
  const prevSame = sum(prev.filter((x) => x.date <= "2026-10-18").map((x) => x.amount));
  return { cat, list, prev, total, prevTotal, prevSame, dows, avg: avgOf(list), n: list.length, limit: CAT_LIMITS[cat] ?? null, biggest: biggest(list) };
}
export const FOOD = categoryPage("Food");
must(FOOD.total === 4520 && FOOD.n === 12, `Food in November is ₹4,520 over 12 spends (got ${FOOD.total} / ${FOOD.n})`);
must(NOV_ALL.length === 26 && sum(NOV_ALL.map((x) => x.amount)) === 20982, "November has 26 spends adding to ₹20,982");
must(Math.abs(sum(LIMITS.map((r) => r.spent)) - D.NOVM.total) < 1, "category rows add up to the month");
export { L };
