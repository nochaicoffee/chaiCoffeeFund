// Round 3's data: the last 12 months of net worth by type (made up, but every end point is today's real sample figure), the groups the
// ten pages sit in, and every warning the pages raise (the Overview's "keep in mind" list). Checks stop the build if they drift.
import * as D from "./data.mjs";
import * as L from "./lib.mjs";

// ---------- The months ----------
export const KEYS = L.monthsFrom("2025-11", 13); // Nov 2025 .. Nov 2026; the last one is today (7 Nov)
export const N = KEYS.length;
export const TODAY_I = N - 1;
export const mlabel = (i) => L.monName(KEYS[i]);
export const mfull = (i) => `${L.monFull(KEYS[i])} ${KEYS[i].slice(0, 4)}`;
export const mshort = (i) => `${L.monName(KEYS[i])}${KEYS[i].slice(2, 4) === "26" ? "" : ` ’${KEYS[i].slice(2, 4)}`}`;

// ---------- Loans run backwards from today: balance_before = (balance_after + EMI) / (1 + rate/12) ----------
const back = (end, emi, pct) => { const out = [end]; for (let i = 1; i < N; i++) out.unshift(Math.round((out[0] + emi) / (1 + pct / 100 / 12))); return out; };
export const RATES = { home: 8.75, car: 9.4, epf: 8.25, epfMonthly: 8000 };
const home = back(D.LOANS[0].out, D.LOANS[0].emi, RATES.home);
const car = back(D.LOANS[1].out, D.LOANS[1].emi, RATES.car);
// EPF backwards: balance_before = (balance_after − monthly contribution) / (1 + rate/12)
const epf = (() => { const out = [D.EPF]; for (let i = 1; i < N; i++) out.unshift(Math.round((out[0] - RATES.epfMonthly) / (1 + RATES.epf / 100 / 12))); return out; })();
const fd = [760, 760, 760, 760, 760, 760, 760, 800, 840, 840, 840, 840, 840].map((x) => x * 1000); // a deposit added in Jun
const cards = [52, 61, 48, 70, 45, 58, 66, 49, 73, 55, 62, 59].map((x) => x * 1000).concat(D.CARD_OUT);
const bank = [720, 702, 735, 690, 668, 645, 702, 690, 628, 641, 622, 598].map((x) => x * 1000).concat(D.BANK);
const invest = [2700, 2790, 2860, 2790, 2830, 2640, 2560, 2700, 2810, 2850, 2900, 2985].map((x) => x * 1000).concat(D.INVEST);
const lent = [1050, 1050, 1050, 1050, 1050, 1050, 1070, 1090, 1130, 1190, 1240, 1262].map((x) => x * 1000).concat(D.LENT);

/** One row per month, every type, plus the sums. */
export const HIST = KEYS.map((k, i) => {
  const r = { k, i, bank: bank[i], invest: invest[i], fixed: fd[i] + epf[i], lent: lent[i], home: home[i], car: car[i], cards: cards[i] };
  r.owned = r.bank + r.invest + r.fixed + r.lent;
  r.owed = r.home + r.car + r.cards;
  r.net = r.owned - r.owed;
  return r;
});
export const NOW = HIST[TODAY_I];
export const THEN = HIST[0];
export const PREV = HIST[TODAY_I - 1];

/** The seven types, in stacking order: owned from the zero line upward, owed from the zero line downward. */
export const TYPES = [
  { k: "bank", name: "Bank and brokers", side: "own", c: "sapphire", page: "Accounts" },
  { k: "fixed", name: "Fixed income", side: "own", c: "forest", page: "Fixed income" },
  { k: "lent", name: "Lent out", side: "own", c: "copper", page: "Lent out" },
  { k: "invest", name: "Investments", side: "own", c: "indigo", page: "Investments" },
  { k: "home", name: "Home loan", side: "owe", c: "teal", page: "Loans" },
  { k: "car", name: "Car loan", side: "owe", c: "sky", page: "Loans" },
  { k: "cards", name: "Card bills", side: "owe", c: "ruby", page: "Cards" },
];

/** Net worth when one type is left out (what the page's "without" reading says). */
export const without = (r, k) => r.net - (TYPES.find((t) => t.k === k).side === "own" ? r[k] : -r[k]);

// ---------- Groups: how the ten pages gather ----------
export const GROUPS = [
  { k: "assets", name: "Assets", c: "sapphire", pages: ["accounts", "invest", "fixed", "lent"], line: `what you own, ${L.inrL(D.OWNED)} across four pages` },
  { k: "debts", name: "Debts", c: "ruby", pages: ["loans", "cards"], line: `what you owe, ${L.inrL(D.OWED)}; ${L.inr(D.OBLIGATIONS)} falls due this month` },
  { k: "flow", name: "Cash flow", c: "emerald", pages: ["income", "subs"], line: `${L.inr(D.SALARY)} comes in a month, ${L.inr(D.SUBS_MONTH)} goes on subscriptions` },
  { k: "plans", name: "Plans and cover", c: "gold", pages: ["goals", "ins"], line: `2 goals, ${L.inrL(D.COVER)} of cover` },
];
export const SEC = Object.fromEntries(D.SECTIONS.map((s) => [s.key, s]));
export const groupOf = (page) => GROUPS.find((g) => g.pages.includes(page));

// ---------- Warnings: everything the pages would raise, one list ----------
// tone: red = act now, amber = soon or off, info = worth knowing. `page` is a section key; `from` is its name.
export const WARN = [
  { id: "w-car", amt: "₹19,850", tone: "red", page: "loans", text: "HDFC Car Loan installment #31", detail: "₹19,850 due today", act: "Mark paid", when: "today" },
  { id: "w-pay", amt: "₹6,000", tone: "amber", page: "lent", text: "Friend – ₹3L interest not received", detail: "₹6,000 expected 1 Nov, 6 days over", act: "Match a credit", when: "6 days over" },
  { id: "w-fd", amt: "₹1,52,400", tone: "amber", page: "fixed", text: "ICICI FD matured, not closed", detail: "₹1,52,400 sitting since 3 Nov", act: "Close it", when: "since 3 Nov" },
  { id: "w-goal", amt: "₹7,000 short", tone: "amber", page: "goals", text: "Japan trip is behind", detail: "needs ₹16,000 a month, ₹9,000 set aside", act: "Set aside", when: "30 Jun 2027" },
  { id: "w-c1", amt: "₹41,200", tone: "info", page: "cards", text: "HDFC Regalia statement", detail: "₹41,200 due 18 Nov", act: "Mark paid", when: "in 11 days" },
  { id: "w-c2", amt: "₹27,200", tone: "info", page: "cards", text: "Amex MRCC statement", detail: "₹27,200 due 24 Nov", act: "Mark paid", when: "in 17 days" },
  { id: "w-ins", amt: "₹18,400", tone: "info", page: "ins", text: "Health premium due", detail: "₹18,400 on 28 Nov, the day cash is lowest", act: "Pay", when: "in 21 days" },
  { id: "w-conc", amt: "37%", tone: "info", page: "invest", text: "NetApp is 37% of your investments", detail: "and your salary comes from NetApp too", act: "See holdings", when: "ongoing" },
  { id: "w-inc", amt: "₹6,000", tone: "amber", page: "income", text: "₹6,000 of November income is late", detail: "the Friend loan interest; salary of ₹2,48,000 lands 30 Nov", act: "Match a credit", when: "6 days over" },
  { id: "w-imp", amt: "—", tone: "info", page: "accounts", text: "October statement not imported", detail: "HDFC Salary, last import 31 Oct", act: "Import", when: "since 1 Nov" },
  { id: "w-nflx", amt: "+₹50 a month", tone: "info", page: "subs", text: "Netflix goes up ₹50 a month", detail: "from the 1 Dec charge", act: "Review", when: "1 Dec" },
];
export const warnOf = (page) => WARN.filter((w) => w.page === page);
export const warnIn = (g) => WARN.filter((w) => groupOf(w.page).k === g);
export const TONE_RANK = { red: 0, amber: 1, info: 2 };
export const WARN_SORTED = [...WARN].sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);

// ---------- Checks ----------
const near = (a, b, what) => { if (Math.abs(a - b) > 1) throw new Error(`History drift: ${what}: ${a} vs ${b}`); };
near(NOW.owned, D.OWNED, "owned now");
near(NOW.owed, D.OWED, "owed now");
near(NOW.net, D.NET, "net worth now");
if (!(THEN.net > 0 && THEN.net < NOW.net)) throw new Error("net worth should have grown over the year");
if (!HIST.slice(1).every((r, i) => r.home < HIST[i].home && r.car < HIST[i].car)) throw new Error("loan balances should fall every month");
if (D.SECTIONS.some((s) => !groupOf(s.key))) throw new Error("every section needs a group");
if (WARN.some((w) => !SEC[w.page])) throw new Error("a warning names a page that does not exist");
// every page's flag on its tile must have a warning behind it
for (const s of D.SECTIONS) if (s.flag && !warnOf(s.key).length) throw new Error(`${s.name} is flagged but has no warning`);
export const COUNTS = { red: WARN.filter((w) => w.tone === "red").length, amber: WARN.filter((w) => w.tone === "amber").length, info: WARN.filter((w) => w.tone === "info").length };
export const CHANGE = { month: NOW.net - PREV.net, year: NOW.net - THEN.net, yearPct: ((NOW.net - THEN.net) / THEN.net) * 100, monthPct: ((NOW.net - PREV.net) / PREV.net) * 100 };
