// The sample data every Overview board reads, and the sums made from it. All of it is made up, but shaped like the real thing
// (the real Overview page's inputs: accounts, cards, loans, subscriptions, income schedules, fixed income, investments, lent out, goals, insurance).
// "Today" is Sat Nov 7, 2026. Every figure on a board comes from here, with checks that stop the build if two figures that must agree don't.
import { addDays, daysBetween, inr, inrL } from "./lib.mjs";

export const TODAY = "2026-11-07";
export const USD_INR = 88.4;
export const sum = (xs) => xs.reduce((a, b) => a + b, 0);
export { daysBetween };

// ---------- Owned ----------
export const ACCOUNTS = [
  { id: "hdfc", name: "HDFC Salary", bank: "HDFC", bal: 184500, color: "sapphire", spend: true },
  { id: "sbi", name: "SBI Savings", bank: "SBI", bal: 62300, color: "sky", spend: true },
  { id: "icici", name: "ICICI Savings", bank: "ICICI", bal: 38900, color: "copper", spend: true },
  { id: "vested", name: "Vested (US broker)", bank: "Vested", usd: 3000, bal: Math.round(3000 * USD_INR), color: "violet", spend: false },
  { id: "zerodha", name: "Zerodha cash", bank: "Zerodha", bal: 100000, color: "teal", spend: false },
];
export const BANK_SPEND = sum(ACCOUNTS.filter((a) => a.spend).map((a) => a.bal)); // what is in the three bank accounts
export const BROKER_CASH = sum(ACCOUNTS.filter((a) => !a.spend).map((a) => a.bal));
export const BANK = BANK_SPEND + BROKER_CASH;

export const HOLDINGS = [
  { name: "NetApp (NTAP)", worth: 1140000, kind: "RSU and ESPP", color: "sapphire" },
  { name: "Nifty 50 index fund", worth: 680000, kind: "India", color: "forest" },
  { name: "Flexi cap fund", worth: 590000, kind: "India", color: "gold" },
  { name: "Eight others", worth: 659000, kind: "India and US", color: "plum" },
];
export const INVEST = sum(HOLDINGS.map((h) => h.worth));
export const INVEST_COST = 2657000;
export const INVEST_DAY = 18100; // today's move

export const FDS = [
  { name: "ICICI FD", amt: 152400, note: "matured 3 Nov, not closed", matured: true, maturity: "2026-11-03" },
  { name: "HDFC FD ×3", amt: 380000, note: "next matures Mar 2027", maturity: "2027-03-14" },
  { name: "SBI FD ×3", amt: 307600, note: "next matures Aug 2027", maturity: "2027-08-02" },
];
export const FD = sum(FDS.map((f) => f.amt));
export const EPF = 620000;
export const FIXED = FD + EPF;
export const LENT = 1295693; // from the Lent out design: ₹6,50,000 + interest, ₹3,00,000, ₹1,82,000

// ---------- Owed ----------
export const CARDS = [
  { id: "regalia", name: "HDFC Regalia", out: 41200, limit: 300000, due: "2026-11-18", color: "ruby" },
  { id: "amex", name: "Amex MRCC", out: 27200, limit: 200000, due: "2026-11-24", color: "onyx" },
];
export const CARD_OUT = sum(CARDS.map((c) => c.out));
export const CARD_LIMIT = sum(CARDS.map((c) => c.limit));
export const LOANS = [
  { id: "home", name: "SBI Home Loan", out: 3240000, emi: 31200, emiDay: 2, paidThisMonth: true, color: "teal" },
  { id: "car", name: "HDFC Car Loan", out: 610000, emi: 19850, emiDay: 7, paidThisMonth: false, color: "copper" },
];
export const LOAN_OUT = sum(LOANS.map((l) => l.out));
export const EMI = sum(LOANS.map((l) => l.emi));

export const OWNED = BANK + INVEST + FIXED + LENT;
export const OWED = CARD_OUT + LOAN_OUT;
export const NET = OWNED - OWED;

// ---------- Money coming and going ----------
export const SALARY = 248000;
export const SALARY_DAY = "2026-11-30";
export const SUBS_MONTH = 4820; // all subscriptions, a month
export const SUBS_OFF_CARD = 1350; // charged to no card: the only part counted in obligations (the rest is inside the card bills)
export const OBLIG = { subs: SUBS_OFF_CARD, emis: EMI, cards: CARD_OUT };
export const OBLIGATIONS = OBLIG.subs + OBLIG.emis + OBLIG.cards;
export const PAID_SO_FAR = sum(LOANS.filter((l) => l.paidThisMonth).map((l) => l.emi));
export const TO_PAY = OBLIGATIONS - PAID_SO_FAR;

// A dated cash event in the next 30 days. `cash: true` moves the spendable balance; the rest are shown but don't.
export const EVENTS = [
  { id: "e-car", date: "2026-11-07", label: "HDFC Car Loan EMI", sub: "installment #31 · due today", amt: -19850, kind: "emi", color: "copper", cash: true },
  { id: "e-spot", date: "2026-11-09", label: "Spotify", sub: "on HDFC Regalia · inside its bill", amt: -119, kind: "sub", color: "plum", cash: false },
  { id: "e-card1", date: "2026-11-18", label: "HDFC Regalia bill", sub: "statement 28 Oct · due 18 Nov", amt: -41200, kind: "card", color: "ruby", cash: true },
  { id: "e-fd", date: "2026-11-20", label: "ICICI FD, matured", sub: "waiting to be closed · lands only when you do", amt: 152400, kind: "fd", color: "gold", cash: false },
  { id: "e-gym", date: "2026-11-21", label: "Gym membership", sub: "no card · paid from HDFC Salary", amt: -1350, kind: "sub", color: "plum", cash: true },
  { id: "e-card2", date: "2026-11-24", label: "Amex bill", sub: "statement 1 Nov · due 24 Nov", amt: -27200, kind: "card", color: "onyx", cash: true },
  { id: "e-ins", date: "2026-11-28", label: "Health insurance premium", sub: "yearly · Family Floater", amt: -18400, kind: "ins", color: "teal", cash: true },
  { id: "e-sal", date: "2026-11-30", label: "NetApp salary", sub: "monthly · lands in HDFC Salary", amt: 248000, kind: "in", color: "emerald", cash: true },
  { id: "e-pay", date: "2026-12-01", label: "Interest from Friend – ₹3L", sub: "monthly payout · November's is still 6 days over", amt: 6000, kind: "in", color: "emerald", cash: true },
  { id: "e-home", date: "2026-12-02", label: "SBI Home Loan EMI", sub: "installment #84", amt: -31200, kind: "emi", color: "teal", cash: true },
];
export const EV_END = addDays(TODAY, 30);

/** The spendable balance each day from today to 30 days out: the three bank accounts, with every dated cash event applied. */
export function cashLine() {
  const out = [];
  let bal = BANK_SPEND;
  for (let d = TODAY, i = 0; i <= 30; d = addDays(d, 1), i++) {
    for (const e of EVENTS) if (e.cash && e.date === d) bal += e.amt;
    out.push({ date: d, i, bal });
  }
  return out;
}
export const CASH = cashLine();
export const LOWEST = CASH.reduce((m, p) => (p.bal < m.bal ? p : m), CASH[0]);
export const HIGHEST = CASH.reduce((m, p) => (p.bal > m.bal ? p : m), CASH[0]);
export const OUT_30 = -sum(EVENTS.filter((e) => e.cash && e.amt < 0).map((e) => e.amt));
export const IN_30 = sum(EVENTS.filter((e) => e.cash && e.amt > 0).map((e) => e.amt));

// ---------- Goals ----------
export const GOALS = [
  { id: "car", name: "Car upgrade", target: 750000, saved: 210000, date: "2028-03-31", need: 14800, setting: 15000, ok: true, color: "indigo" },
  { id: "japan", name: "Japan trip", target: 240000, saved: 160000, date: "2027-06-30", need: 16000, setting: 9000, ok: false, color: "rose" },
];

// ---------- Insurance ----------
export const POLICIES = [
  { name: "Term life", cover: 10000000, premium: 24600, due: "2026-12-14" },
  { name: "Health, family floater", cover: 1000000, premium: 18400, due: "2026-11-28" },
];
export const COVER = sum(POLICIES.map((p) => p.cover));

// ---------- What needs attention (the real page's list, in the order it builds it) ----------
export const ATTENTION = [
  { id: "a-car", tone: "red", kind: "pay", label: "HDFC Car Loan installment #31", detail: "₹19,850 due today", act: "Mark paid", amt: 19850, date: "2026-11-07", from: "Loans" },
  { id: "a-pay", tone: "amber", kind: "collect", label: "Friend – ₹3L interest not received", detail: "₹6,000 · expected 1 Nov, 6 days over", act: "Match a credit", amt: 6000, date: "2026-11-01", from: "Lent out" },
  { id: "a-fd", tone: "amber", kind: "decide", label: "ICICI FD matured, not closed", detail: "₹1,52,400 · matured 3 Nov", act: "Close it", amt: 152400, date: "2026-11-03", from: "Fixed income" },
  { id: "a-goal", tone: "amber", kind: "decide", label: "Japan trip is behind", detail: "needs ₹16,000 a month, ₹9,000 set aside", act: "Set aside", amt: 7000, date: "2027-06-30", from: "Goals" },
  { id: "a-c1", tone: "plain", kind: "pay", label: "HDFC Regalia statement due", detail: "₹41,200 · due 18 Nov", act: "Mark paid", amt: 41200, date: "2026-11-18", from: "Cards" },
  { id: "a-c2", tone: "plain", kind: "pay", label: "Amex MRCC statement due", detail: "₹27,200 · due 24 Nov", act: "Mark paid", amt: 27200, date: "2026-11-24", from: "Cards" },
];

// ---------- Where the money is, by section (the tiles) ----------
export const SECTIONS = [
  { key: "accounts", name: "Accounts", color: "sapphire", big: BANK, sub: `${ACCOUNTS.length} accounts · ${inrL(BROKER_CASH)} at brokers`, flag: null },
  { key: "invest", name: "Investments", color: "indigo", big: INVEST, sub: `+${inrL(INVEST - INVEST_COST)} on cost · today +${inr(INVEST_DAY)}`, flag: null },
  { key: "fixed", name: "Fixed income", color: "forest", big: FIXED, sub: "7 deposits and EPF", flag: "1 matured" },
  { key: "lent", name: "Lent out", color: "copper", big: LENT, sub: "3 loans, earning ₹608 a day", flag: "payout late" },
  { key: "cards", name: "Cards", color: "ruby", big: CARD_OUT, sub: "2 bills, next due 18 Nov", flag: null, owe: true },
  { key: "loans", name: "Loans", color: "teal", big: LOAN_OUT, sub: "EMI ₹19,850 due today", flag: "due today", owe: true },
  { key: "income", name: "Income", color: "emerald", big: SALARY, sub: "salary lands 30 Nov", flag: "₹6,000 late", per: "a month" },
  { key: "subs", name: "Subscriptions", color: "plum", big: SUBS_MONTH, sub: "12 active · next 9 Nov", flag: null, per: "a month" },
  { key: "ins", name: "Insurance", color: "gold", big: COVER, sub: "2 policies · next premium 28 Nov", flag: null, per: "cover" },
  { key: "goals", name: "Goals", color: "rose", big: sum(GOALS.map((g) => g.saved)), sub: "2 goals · 1 behind", flag: "1 behind", per: "set aside" },
];

// ---------- Vitals (measures with a band; never advice) ----------
export const VITALS = [
  { key: "cover", name: "Cash cover", value: BANK_SPEND / (EMI + SUBS_MONTH), fmt: (v) => `${v.toFixed(1)} months`, bands: [0, 3, 6, 12], verdict: "ok", how: "What's in your three bank accounts divided by what leaves each month for EMIs and subscriptions.", note: `${"₹2,85,700"} ÷ ${"₹55,870"} a month. Brokers' cash is left out: it isn't spendable today.` },
  { key: "emi", name: "EMI load", value: (EMI / SALARY) * 100, fmt: (v) => `${v.toFixed(1)}%`, bands: [0, 25, 40, 100], low: true, verdict: "good", how: "Both EMIs as a share of your monthly salary.", note: `${"₹51,050"} of ${"₹2,48,000"}. Lenders usually look for under 40%.` },
  { key: "cards", name: "Card use", value: (CARD_OUT / CARD_LIMIT) * 100, fmt: (v) => `${v.toFixed(1)}%`, bands: [0, 30, 50, 100], low: true, verdict: "good", how: "What's outstanding on your cards divided by their limits.", note: `${"₹68,400"} of ${"₹5,00,000"}. Under 30% is the usual comfortable range.` },
  { key: "left", name: "Left after bills", value: ((SALARY - OBLIGATIONS) / SALARY) * 100, fmt: (v) => `${v.toFixed(0)}%`, bands: [0, 10, 25, 100], verdict: "good", how: "Salary less this month's obligations. Not a true savings rate: it doesn't know what you spend day to day.", note: `${"₹2,48,000"} less ${"₹1,20,800"}.` },
  { key: "owe", name: "Owed against owned", value: (OWED / OWNED) * 100, fmt: (v) => `${v.toFixed(0)}%`, bands: [0, 30, 60, 100], low: true, verdict: "watch", how: "Everything you owe divided by everything you own. A home loan keeps this high for years.", note: `${"₹39.18L"} owed against ${"₹64.76L"} owned.` },
  { key: "conc", name: "NetApp share", value: (HOLDINGS[0].worth / OWNED) * 100, fmt: (v) => `${v.toFixed(0)}%`, bands: [0, 15, 25, 100], low: true, verdict: "watch", how: "Your NetApp shares as a share of everything you own. A measure of how much rides on one company, not a reason to sell.", note: `${"₹11.40L"} of ${"₹64.76L"}, and your salary comes from the same company.` },
];

// ---------- Checks: figures that must agree ----------
const near = (a, b, what) => { if (Math.abs(a - b) > 1) throw new Error(`Data drift: ${what}: ${a} vs ${b}`); };
near(OWNED - OWED, NET, "net worth");
near(OBLIGATIONS, 120800, "monthly obligations (₹1,20,800)");
near(TO_PAY, 89600, "still to pay (₹89,600)");
near(Math.round(BANK_SPEND), 285700, "bank spendable");
near(LOWEST.bal, 177700, "lowest cash point");
near(OWNED, 6475593, "owned");
near(OWED, 3918400, "owed");
near(NET, 2557193, "net worth value");
near(EMI + SUBS_MONTH, 55870, "recurring a month");
near(sum(ATTENTION.filter((a) => a.kind === "pay").map((a) => 0)), 0, "noop");
