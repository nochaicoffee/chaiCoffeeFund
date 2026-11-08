// The sample for the Expenses canvas: twelve months, Nov 2025 to Oct 2026, made up but shaped like Prathik's real money
// (salary around ₹1.5L to ₹1.8L with a bonus in Feb and Jul, card bills, a car loan from Aug 2026, the two loans he lent).
// "Today" is Sun Nov 8, 2026, so October is the last whole month.
//
// The calculation is the one agreed in docs/design/expenses.md:
//   spent = came in + came back − invested − lent out − kept      (kept = the bank balances' change over the month)
//   and spent splits into card bills (paid that month) + subscriptions off cards + EMIs + insurance + cash and UPI (the rest).
// Here the cash and UPI figure is chosen and `kept` is worked back from it; the checks at the bottom stop the build if a sum drifts.

export const TODAY = "2026-11-08";

/** One month. Every amount in rupees. */
const M = (key, o) => ({ key, inc: 0, back: 0, inv: 0, lent: 0, card: 0, subs: 0, emi: 0, ins: 0, cash: 0, ...o });
export const MONTHS = [
  M("2025-11", { inc: 143338, inv: 25000, lent: 300000, card: 97940, subs: 584, cash: 21400 }),
  M("2025-12", { inc: 150126, inv: 20000, card: 43280, subs: 584, cash: 34800 }),
  M("2026-01", { inc: 172329, inv: 30000, lent: 182000, card: 5353, subs: 584, cash: 16900 }),
  M("2026-02", { inc: 321621, inv: 120000, card: 122228, subs: 584, cash: 41200 }),
  M("2026-03", { inc: 290527, inv: 115000, card: 46923, subs: 584, ins: 24600, cash: 22700 }),
  M("2026-04", { inc: 167349, inv: 45000, card: 138196, subs: 4982, cash: 19800 }),
  M("2026-05", { inc: 150161, inv: 40000, card: 95757, subs: 584, cash: 52300 }),
  M("2026-06", { inc: 151720, inv: 60000, card: 39471, subs: 584, cash: 23600 }),
  M("2026-07", { inc: 383304, inv: 70000, card: 123105, subs: 1583, cash: 236400 }),
  M("2026-08", { inc: 181677, inv: 55000, card: 72565, subs: 2074, emi: 22450, cash: 31200 }),
  M("2026-09", { inc: 181677, inv: 50000, card: 58300, subs: 584, emi: 22450, cash: 27900 }),
  M("2026-10", { inc: 183526, inv: 45000, card: 75655, subs: 2973, emi: 22450, cash: 29800 }),
].map((m) => {
  const spent = m.card + m.subs + m.emi + m.ins + m.cash;
  const kept = m.inc + m.back - m.inv - m.lent - spent;
  return { ...m, spent, kept, named: spent - m.cash };
});
export const MKEYS = MONTHS.map((m) => m.key);
export const LAST = MKEYS.at(-1);
export const byKey = Object.fromEntries(MONTHS.map((m) => [m.key, m]));

/** Bank balances (the savings and salary accounts) at each month end, worked forward from a made-up start. */
export const BANK_START = 612400; // 31 Oct 2025
let bal = BANK_START;
export const BANK_END = Object.fromEntries(MONTHS.map((m) => [m.key, (bal += m.kept)]));
export const bankBefore = (key) => (key === MKEYS[0] ? BANK_START : BANK_END[MKEYS[MKEYS.indexOf(key) - 1]]);

/** The parts of a month's spending, in the order every board draws them. */
export const PARTS = [
  { k: "card", name: "Card bills", short: "Cards", color: "ruby", note: "statements paid this month" },
  { k: "emi", name: "EMIs", short: "EMIs", color: "teal", note: "interest and principal" },
  { k: "subs", name: "Subscriptions", short: "Subs", color: "plum", note: "not charged to a card" },
  { k: "ins", name: "Insurance", short: "Insurance", color: "gold", note: "premiums from the bank" },
  { k: "cash", name: "Cash and UPI", short: "Cash, UPI", color: "copper", note: "worked out: what's left", worked: true },
];

export const CATS = {
  Travel: { color: "sky", icon: "plane" },
  Shopping: { color: "rose", icon: "bag" },
  Electronics: { color: "indigo", icon: "laptop" },
  Home: { color: "forest", icon: "home" },
  Health: { color: "ruby", icon: "heart" },
  Gifts: { color: "plum", icon: "gift" },
  Vehicle: { color: "teal", icon: "car" },
  Education: { color: "gold", icon: "cap" },
  Other: { color: "onyx", icon: "dots" },
};

/**
 * Big spends, entered by hand. `month` is the month the money counts in (a card spend counts when its bill is paid),
 * `date` the day it was bought, `via` what paid for it, and `part` the slice of the month it sits inside.
 * A big spend explains part of a month; it is never added on top.
 */
export const BIG = [
  { id: "goa", month: "2025-12", date: "2025-11-22", what: "Goa trip", cat: "Travel", amt: 38400, via: "HDFC Regalia", part: "card" },
  { id: "wed", month: "2026-02", date: "2026-02-14", what: "Cousin's wedding gift", cat: "Gifts", amt: 25000, via: "UPI · HDFC Salary", part: "cash" },
  { id: "iph", month: "2026-04", date: "2026-03-14", what: "iPhone 17", cat: "Electronics", amt: 79900, via: "HDFC Regalia", part: "card" },
  { id: "sofa", month: "2026-05", date: "2026-05-09", what: "Sofa", cat: "Home", amt: 42000, via: "Transfer · HDFC Salary", part: "cash" },
  { id: "car", month: "2026-07", date: "2026-07-04", what: "Car down payment", cat: "Vehicle", amt: 210000, via: "Transfer · HDFC Salary", part: "cash" },
  { id: "acc", month: "2026-07", date: "2026-06-28", what: "Car accessories", cat: "Vehicle", amt: 18500, via: "Amex", part: "card" },
  { id: "hosp", month: "2026-08", date: "2026-08-19", what: "Hospital visit", cat: "Health", amt: 14500, via: "UPI · Jupiter", part: "cash" },
  { id: "diw", month: "2026-10", date: "2026-09-28", what: "Diwali shopping", cat: "Shopping", amt: 24500, via: "Amex", part: "card" },
];
/** Bought on a card but its bill isn't paid yet: it counts in November. */
export const PENDING = [{ id: "fly", month: "2026-11", date: "2026-10-03", what: "Flights home", cat: "Travel", amt: 18600, via: "HDFC Regalia", part: "card" }];
export const bigIn = (key) => BIG.filter((b) => b.month === key);

/** What went in and came out of the bank that isn't spending, per month: for the hover cards. */
export const NOTSPEND = {
  "2025-11": ["Lent ₹3,00,000 to Friend (₹3L)"],
  "2026-01": ["Lent ₹1,82,000 to Friend (₹1.82L)"],
  "2026-03": ["₹15,000 into a new FD, inside invested"],
};

export const TOTALS = MONTHS.reduce((t, m) => { for (const k of ["inc", "inv", "lent", "back", "spent", "kept", "card", "subs", "emi", "ins", "cash"]) t[k] = (t[k] ?? 0) + m[k]; return t; }, {});
export const AVG_SPENT = Math.round(TOTALS.spent / MONTHS.length);
export const AVG_CASH = Math.round(TOTALS.cash / MONTHS.length);
/** A month's spending without its big spends: what a usual month looks like. */
export const usual = (m) => m.spent - bigIn(m.key).reduce((s, b) => s + b.amt, 0);

// ---------- Checks: stop the build if a sum drifts ----------
const must = (ok, what) => { if (!ok) throw new Error(`data.mjs check failed: ${what}`); };
for (const m of MONTHS) {
  must(m.inc + m.back === m.spent + m.inv + m.lent + m.kept, `${m.key}: came in = spent + invested + lent + kept`);
  must(m.card + m.subs + m.emi + m.ins + m.cash === m.spent, `${m.key}: the parts add up to spent`);
  for (const p of PARTS) must(bigIn(m.key).filter((b) => b.part === p.k).reduce((s, b) => s + b.amt, 0) <= m[p.k], `${m.key}: big spends fit inside ${p.k}`);
}
must(byKey["2026-10"].spent === 130878 && byKey["2026-10"].kept === 7648, "October: spent ₹1,30,878, kept ₹7,648");
must(BANK_END[LAST] === BANK_START + TOTALS.kept, "the bank's change is the sum of what was kept");

// ---------- Line by line, for the Statements page ----------
// Each month's spending as the payments behind it. Card bills are split across three cards (each card's big spends stay on it,
// the rest goes 55 / 30 / 15); the worked-out cash and UPI is one line at the month's end. Made up, and checked to add up.
export const CARDS = [
  { id: "regalia", name: "HDFC Regalia", color: "ruby", day: 5, share: 0.55 },
  { id: "amex", name: "Amex", color: "onyx", day: 22, share: 0.3 },
  { id: "flip", name: "Flipkart Axis", color: "sky", day: 14, share: 0.15 },
];
const SUB_NAMES = { "2026-04": "Domain and hosting, yearly", "2026-07": "YouTube Premium", "2026-08": "Google One, yearly", "2026-10": "Microsoft 365, yearly" };
const iso = (k, d) => `${k}-${String(d).padStart(2, "0")}`;
const lastDate = (k) => { const [y, m] = k.split("-").map(Number); return iso(k, new Date(Date.UTC(y, m, 0)).getUTCDate()); };
const viaCard = { "HDFC Regalia": "regalia", Amex: "amex" };
export function linesOf(m) {
  const out = [];
  if (m.card) {
    const big = Object.fromEntries(CARDS.map((c) => [c.id, bigIn(m.key).filter((b) => b.part === "card" && viaCard[b.via] === c.id).reduce((s, b) => s + b.amt, 0)]));
    const rest = m.card - Object.values(big).reduce((s, v) => s + v, 0);
    let left = m.card;
    CARDS.forEach((c, i) => {
      const amt = i === CARDS.length - 1 ? left : big[c.id] + Math.round(rest * c.share);
      left -= amt;
      const prev = MKEYS[MKEYS.indexOf(m.key) - 1] ?? "2025-10";
      if (amt > 0) out.push({ date: iso(m.key, c.day), kind: "card", what: `${c.name} bill`, sub: `statement of ${prev.slice(5) === "12" ? "Dec" : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+prev.slice(5) - 1]} ${prev.slice(0, 4)}`, via: "HDFC Salary", amt, color: c.color, bigs: bigIn(m.key).filter((b) => b.part === "card" && viaCard[b.via] === c.id) });
    });
  }
  if (m.emi) out.push({ date: iso(m.key, 7), kind: "emi", what: "HDFC Car Loan EMI", sub: `installment ${MKEYS.indexOf(m.key) - MKEYS.indexOf("2026-08") + 1} of 60 · interest and principal`, via: "HDFC Salary", amt: m.emi, color: "teal" });
  if (m.subs) {
    out.push({ date: iso(m.key, 2), kind: "subs", what: "ACT Fibernet", sub: "monthly", via: "HDFC Salary", amt: Math.min(584, m.subs), color: "plum" });
    if (m.subs > 584) out.push({ date: iso(m.key, 16), kind: "subs", what: SUB_NAMES[m.key] ?? "A yearly renewal", sub: "not on a card", via: "HDFC Salary", amt: m.subs - 584, color: "plum" });
  }
  if (m.ins) out.push({ date: iso(m.key, 18), kind: "ins", what: "Star Health premium", sub: "family floater, 1 year", via: "HDFC Salary", amt: m.ins, color: "gold" });
  if (m.cash) out.push({ date: lastDate(m.key), kind: "cash", what: "Cash and UPI", sub: "worked out: what no record explains", via: "every account", amt: m.cash, color: "copper", worked: true, bigs: bigIn(m.key).filter((b) => b.part === "cash") });
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}
/** What left or stayed that isn't spending, for the bottom of a statement. */
export function notSpentOf(m) {
  return [
    m.inc && { kind: "in", what: "Came in", sub: "salary and other income", amt: m.inc },
    m.inv && { kind: "inv", what: "Moved to investing", sub: "HDFC to brokers, and new FDs", amt: -m.inv },
    m.lent && { kind: "lent", what: "Lent out", sub: NOTSPEND[m.key]?.[0] ?? "", amt: -m.lent },
  ].filter(Boolean);
}
for (const m of MONTHS) {
  must(linesOf(m).reduce((s, l) => s + l.amt, 0) === m.spent, `${m.key}: the statement's lines add up to spent`);
  must(linesOf(m).filter((l) => l.kind === "card").every((l) => l.bigs.reduce((s, b) => s + b.amt, 0) <= l.amt), `${m.key}: a card's big spends fit in its bill`);
}
