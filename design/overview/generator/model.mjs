// Round 2's model: pure functions over data.mjs for the four bold boards (Future you, What if, Things I noticed, Where a month goes).
// Every rate and habit here is an ASSUMPTION made up for the mockup and shown on the board as one; the build reads the real ones
// (loan rates from Loans, FD rates from Fixed income, EPF rates from the EPF tab) and tests the maths (principal repays to exactly zero,
// interest strictly falls, a prepayment never makes a loan cost more).
import * as D from "./data.mjs";
import { addMonthsUTC } from "./lib.mjs";

export const ASSUME = {
  homeRate: 8.75, // % a year on the SBI home loan
  carRate: 9.4, // % a year on the HDFC car loan
  fdRate: 7, // % a year a deposit earns
  epfRate: 8.25, // % a year EPF credits
  epfAdd: 8000, // a month into EPF, his share and the employer's
  sip: 30000, // a month he adds to investments
  lentAccrual: 6500, // a month the Friend 12% loan piles up (₹6,50,000 × 12% ÷ 12)
  usdShare: 204000, // the US part of "Eight others"
};
export const RETURNS = [4, 8, 12];
export const RATES = Array.from({ length: 13 }, (_, i) => i + 2); // 2% to 14%, for the setter on the refined page
export const HORIZONS = [1, 3, 5, 10, 20]; // years

// ---------- A loan's schedule ----------
/** Balances month by month: balance × (1 + r) − EMI each month, until it reaches zero. Interest paid in total. */
export function schedule(principal, emi, annualPct, upfront = 0) {
  const r = annualPct / 100 / 12;
  let bal = Math.max(0, principal - upfront), months = 0, interest = 0;
  const balances = [bal];
  while (bal > 0.5 && months < 600) {
    const i = bal * r;
    interest += i;
    bal = bal + i - emi;
    months += 1;
    if (bal < 0) bal = 0;
    balances.push(bal);
  }
  return { balances, months, interest };
}
export const HOME = schedule(D.LOANS[0].out, D.LOANS[0].emi, ASSUME.homeRate);
export const CAR = schedule(D.LOANS[1].out, D.LOANS[1].emi, ASSUME.carRate);
const at = (arr, t) => (t < arr.length ? arr[t] : 0);

// ---------- Future you ----------
/** The month-by-month projection at a yearly return on investments (0 for "what you add alone"). */
export function project(ret, months = 240) {
  const out = [];
  let inv = D.INVEST, fd = D.FD, epf = D.EPF;
  for (let t = 0; t <= months; t++) {
    if (t) {
      inv = inv * (1 + ret / 100 / 12) + ASSUME.sip;
      fd = fd * (1 + ASSUME.fdRate / 100 / 12);
      epf = epf * (1 + ASSUME.epfRate / 100 / 12) + ASSUME.epfAdd;
    }
    const lent = D.LENT + ASSUME.lentAccrual * t, bank = D.BANK;
    const loans = at(HOME.balances, t) + at(CAR.balances, t), cards = D.CARD_OUT;
    const owned = bank + inv + fd + epf + lent, owed = loans + cards;
    out.push({ t, bank, inv, fd, epf, lent, loans, cards, owned, owed, net: owned - owed });
  }
  return out;
}
export const PROJ = Object.fromEntries([...new Set([0, ...RETURNS, ...RATES])].map((r) => [r, project(r)]));
export const dateAt = (t) => addMonthsUTC(D.TODAY, t);
export const monthYear = (iso) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+iso.slice(5, 7) - 1] + " " + iso.slice(0, 4);
/** The first month a series passes a mark, or null. */
export const firstPast = (series, key, mark) => series.find((p) => p[key] >= mark)?.t ?? null;
export function milestones(ret) {
  const s = PROJ[ret];
  const list = [
    { t: CAR.months, label: "Car loan cleared", c: "copper" },
    { t: HOME.months, label: "Home loan cleared", c: "teal" },
    { t: firstPast(s, "net", 5000000), label: "Net worth passes ₹50L", c: "emerald" },
    { t: firstPast(s, "net", 10000000), label: "Net worth passes ₹1 Cr", c: "gold" },
    { t: firstPast(s, "inv", 10000000), label: "Investments pass ₹1 Cr", c: "indigo" },
  ].filter((m) => m.t != null && m.t <= 240).sort((a, b) => a.t - b.t);
  return list;
}
/** At a horizon (years) and return: the net worth, how it splits into growth and what's added, and the stack. */
export function future(years, ret) {
  const t = years * 12, p = PROJ[ret][t], flat = PROJ[0][t], now = PROJ[0][0];
  const added = ASSUME.sip * t + ASSUME.epfAdd * t;
  return { t, p, now, net: p.net, change: p.net - now.net, growth: p.net - flat.net, added, loansLeft: p.loans, owned: p.owned };
}

// ---------- What if ----------
export const OUTGO = D.EMI + D.CARD_OUT + D.SUBS_OFF_CARD + Math.round((18400 + 24600) / 12); // EMIs, what the cards cost a month, off-card subs, both premiums a month
export const US_EXPOSURE = D.ACCOUNTS.find((a) => a.id === "vested").bal + D.HOLDINGS[0].worth + ASSUME.usdShare;
const baseLayers = () => [
  { k: "bank", name: "Bank accounts", v: D.BANK_SPEND, c: "sky", how: "spend it now" },
  { k: "brokers", name: "Brokers' cash", v: D.BROKER_CASH, c: "teal", how: "a day or two" },
  { k: "mfd", name: "Matured FD", v: 152400, c: "gold", how: "close it" },
  { k: "fd", name: "Other deposits", v: D.FD - 152400, c: "forest", how: "break them early" },
  { k: "inv", name: "Investments", v: D.INVEST, c: "indigo", how: "sell them" },
];
export const layerMonths = (layers, outgo = OUTGO) => {
  let cum = 0;
  return layers.map((l) => { const m = l.v / outgo; const out = { ...l, m, from: cum, to: cum + m }; cum += m; return out; });
};
// A loan prepaid with the matured FD, and what the FD would have earned instead
const CAR_PREPAID = schedule(D.LOANS[1].out, D.LOANS[1].emi, ASSUME.carRate, 152400);
export const PREPAY = {
  saved: CAR.interest - CAR_PREPAID.interest,
  sooner: CAR.months - CAR_PREPAID.months,
  fdEarns: 152400 * (Math.pow(1 + ASSUME.fdRate / 100 / 12, CAR.months) - 1),
  months: CAR_PREPAID.months,
};
PREPAY.edge = PREPAY.saved - PREPAY.fdEarns;
PREPAY.baseInterest = CAR.interest;
PREPAY.newInterest = CAR_PREPAID.interest;
// A floating home loan: the rate rises one point and the tenure stays
const emiAt = (P, annual, n) => { const r = annual / 100 / 12; return (P * r) / (1 - Math.pow(1 + r, -n)); };
export const RATE_UP = { newEmi: emiAt(D.LOANS[0].out, ASSUME.homeRate + 1, HOME.months), months: HOME.months };
RATE_UP.more = RATE_UP.newEmi - D.LOANS[0].emi;
RATE_UP.total = RATE_UP.more * HOME.months;

export function scenarios() {
  const base = layerMonths(baseLayers());
  const total = (ls) => ls.reduce((a, l) => a + l.v, 0);
  const tail = (ls) => ls.at(-1).to;
  const lay = (f) => layerMonths(f(baseLayers()));
  const sc = [];
  sc.push({ k: "today", name: "As things are", tag: "Today", sub: "if nothing happens", net: D.NET, delta: 0, layers: base, income: D.SALARY + 6000, outgo: OUTGO, c: "sapphire",
    touches: [["Salary", `+₹${D.SALARY.toLocaleString("en-IN")} a month`], ["Bills and EMIs", `−₹${OUTGO.toLocaleString("en-IN")} a month`]],
    line: `You're adding about ₹${Math.round(D.SALARY + 6000 - OUTGO).toLocaleString("en-IN")} a month after bills. If the salary stopped, the bank, brokers' cash and the matured FD would carry you ${(base[2].to).toFixed(1)} months; selling everything liquid, ${tail(base).toFixed(1)}.` });
  sc.push({ k: "job", name: "The salary stops", tag: "Income", sub: "for good, from today", net: D.NET, delta: 0, layers: base, income: 6000, outgo: OUTGO, c: "rose",
    touches: [["Salary", "−₹2,48,000 a month"], ["Left to carry you", `${tail(base).toFixed(1)} months of bills`], ["Without selling investments", `${base[3].to.toFixed(1)} months`]],
    line: `Nothing is lost on paper, but bills of ₹${OUTGO.toLocaleString("en-IN")} a month start eating the cushion: the bank lasts ${base[0].to.toFixed(1)} months, and by month ${base[3].to.toFixed(0)} you'd be selling investments.` });
  const nt = lay((ls) => ls.map((l) => (l.k === "inv" ? { ...l, v: l.v - D.HOLDINGS[0].worth * 0.4 } : l)));
  sc.push({ k: "netapp", name: "NetApp trouble", tag: "Concentration", sub: "shares −40% and the salary stops", net: D.NET - D.HOLDINGS[0].worth * 0.4, delta: -D.HOLDINGS[0].worth * 0.4, layers: nt, income: 6000, outgo: OUTGO, c: "ruby",
    touches: [["NetApp shares", `−₹${Math.round(D.HOLDINGS[0].worth * 0.4).toLocaleString("en-IN")}`], ["Salary", "−₹2,48,000 a month"], ["Left to carry you", `${tail(nt).toFixed(1)} months`]],
    line: `Your salary, your shares and part of your EPF all come from one company, so they can fall together. The shares lose ₹${Math.round(D.HOLDINGS[0].worth * 0.4 / 1000)}k, the salary stops, and the cushion shrinks from ${tail(base).toFixed(1)} to ${tail(nt).toFixed(1)} months.` });
  const usd = Math.round(US_EXPOSURE * 0.08);
  sc.push({ k: "dollar", name: "The dollar falls 8%", tag: "Currency", sub: "against the rupee", net: D.NET - usd, delta: -usd, layers: lay((ls) => ls.map((l) => (l.k === "inv" ? { ...l, v: l.v - (D.HOLDINGS[0].worth + ASSUME.usdShare) * 0.08 } : l.k === "brokers" ? { ...l, v: l.v - D.ACCOUNTS.find((a) => a.id === "vested").bal * 0.08 } : l))), income: D.SALARY + 6000, outgo: OUTGO, c: "violet",
    touches: [["Dollar assets", `₹${Math.round(US_EXPOSURE).toLocaleString("en-IN")}`], ["Share of what you own", `${((US_EXPOSURE / D.OWNED) * 100).toFixed(1)}%`], ["Lost at −8%", `−₹${usd.toLocaleString("en-IN")}`]],
    line: `₹${(US_EXPOSURE / 100000).toFixed(1)}L of what you own is priced in dollars: NetApp, Vested's cash and the US part of your funds. A rupee that gains 8% takes ₹${(usd / 100000).toFixed(2)}L off your net worth without anything being sold.` });
  const surprise = 300000, brokerUse = Math.max(0, surprise - D.BANK_SPEND);
  sc.push({ k: "bill", name: "A ₹3L surprise", tag: "Shock", sub: "a bill that has to be paid this week", net: D.NET - surprise, delta: -surprise, layers: lay((ls) => ls.map((l) => (l.k === "bank" ? { ...l, v: 0 } : l.k === "brokers" ? { ...l, v: l.v - brokerUse } : l))), income: D.SALARY + 6000, outgo: OUTGO, c: "gold",
    touches: [["Bank accounts", `₹${D.BANK_SPEND.toLocaleString("en-IN")} used up`], ["Short by", `₹${brokerUse.toLocaleString("en-IN")}, from brokers' cash`], ["Then the 28 Nov premium", "needs the salary on the 30th"]],
    line: `The bank accounts (₹${(D.BANK_SPEND / 100000).toFixed(2)}L) can't cover it alone: ₹${brokerUse.toLocaleString("en-IN")} would come from brokers' cash, and the Amex bill and premium that follow would wait for the salary on 30 Nov.` });
  sc.push({ k: "prepay", name: "Close the matured FD into the car loan", tag: "Choice", sub: "₹1,52,400 of the ₹6.1L", net: D.NET, delta: 0, layers: lay((ls) => ls.map((l) => (l.k === "mfd" ? { ...l, v: 0 } : l))), income: D.SALARY + 6000, outgo: OUTGO - 0, c: "emerald",
    touches: [["Interest saved", `₹${Math.round(PREPAY.saved).toLocaleString("en-IN")}`], ["Loan ends", `${PREPAY.sooner} months sooner`], ["The FD would have earned", `₹${Math.round(PREPAY.fdEarns).toLocaleString("en-IN")}`]],
    line: `Paying ₹1.52L into the ${ASSUME.carRate}% car loan saves ₹${Math.round(PREPAY.saved / 1000)}k of interest and ends it ${PREPAY.sooner} months sooner. Re-depositing it at ${ASSUME.fdRate}% would earn ₹${Math.round(PREPAY.fdEarns / 1000)}k, so the loan is the better home for it by ₹${Math.round(PREPAY.edge / 1000)}k. Your net worth doesn't change today: cash becomes less debt.` });
  sc.push({ k: "rate", name: "Home loan rate up 1 point", tag: "Rates", sub: `${ASSUME.homeRate}% to ${ASSUME.homeRate + 1}%, tenure unchanged`, net: D.NET, delta: 0, layers: base, income: D.SALARY + 6000, outgo: OUTGO + RATE_UP.more, c: "teal",
    touches: [["EMI", `₹${Math.round(D.LOANS[0].emi).toLocaleString("en-IN")} to ₹${Math.round(RATE_UP.newEmi).toLocaleString("en-IN")}`], ["More every month", `₹${Math.round(RATE_UP.more).toLocaleString("en-IN")}`], ["Over the loan", `₹${Math.round(RATE_UP.total / 100000 * 100) / 100}L`]],
    line: `A floating rate that rises one point adds ₹${Math.round(RATE_UP.more).toLocaleString("en-IN")} to the home EMI for the ${Math.round(HOME.months / 12)} years left: about ₹${(RATE_UP.total / 100000).toFixed(1)}L over the loan. EMI load goes from ${((D.EMI / D.SALARY) * 100).toFixed(1)}% to ${(((D.EMI + RATE_UP.more) / D.SALARY) * 100).toFixed(1)}% of salary.` });
  return sc;
}

// ---------- Where a month goes (the flow) ----------
export const INCOME_IN = [{ k: "salary", name: "NetApp salary", v: D.SALARY, c: "emerald" }, { k: "interest", name: "Interest from Friend", v: 6000, c: "teal" }];
export const SPEND_CATS = [
  { k: "shop", name: "Shopping", v: 21500, last: 16000 },
  { k: "food", name: "Food and dining", v: 18200, last: 17100 },
  { k: "travel", name: "Travel", v: 9300, last: 4200 },
  { k: "bills", name: "Bills and utilities", v: 7200, last: 7000 },
  { k: "fuel", name: "Fuel", v: 6100, last: 6400 },
  { k: "other", name: "Other", v: 6100, last: 5900 },
];
export const FLOW = {
  groups: [
    { k: "fixed", name: "Fixed commitments", c: "copper", leaves: [
      { k: "home", name: "Home loan EMI", v: 31200, c: "teal" }, { k: "car", name: "Car loan EMI", v: 19850, c: "copper" }, { k: "ins", name: "Insurance premiums", v: 3583, c: "gold" } ] },
    { k: "cards", name: "Card spending", c: "ruby", leaves: SPEND_CATS.map((s, i) => ({ k: s.k, name: s.name, v: s.v, c: ["ruby", "plum", "sky", "indigo", "onyx", "violet"][i] })) },
    { k: "subs", name: "Subscriptions off cards", c: "plum", leaves: [{ k: "gym", name: "Gym", v: 1350, c: "plum" }] },
    { k: "saving", name: "Set aside and invested", c: "forest", leaves: [{ k: "goals", name: "Goals", v: 24000, c: "rose" }, { k: "sip", name: "Investments", v: ASSUME.sip, c: "indigo" }] },
  ],
};
FLOW.total = D.SALARY + 6000;
FLOW.groups.forEach((g) => { g.v = g.leaves.reduce((a, l) => a + l.v, 0); });
FLOW.left = FLOW.total - FLOW.groups.reduce((a, g) => a + g.v, 0);
FLOW.groups.push({ k: "left", name: "Left in the bank", c: "sky", v: FLOW.left, leaves: [{ k: "keep", name: "Stays in the bank", v: FLOW.left, c: "sky" }] });

// ---------- Checks ----------
const eq = (a, b, what, tol = 1) => { if (Math.abs(a - b) > tol) throw new Error(`Model drift: ${what}: ${a} vs ${b}`); };
eq(HOME.balances.at(-1), 0, "home loan repays to zero");
eq(CAR.balances.at(-1), 0, "car loan repays to zero");
if (!(CAR_PREPAID.interest < CAR.interest)) throw new Error("a prepayment must save interest");
if (!(CAR_PREPAID.months < CAR.months)) throw new Error("a prepayment must end the loan sooner");
const intr = []; { let b = D.LOANS[1].out; for (let i = 0; i < CAR.months - 1; i++) { const x = b * (ASSUME.carRate / 1200); intr.push(x); b = b + x - D.LOANS[1].emi; } }
if (!intr.every((x, i) => i === 0 || x < intr[i - 1])) throw new Error("interest must strictly fall month by month");
eq(FLOW.groups.reduce((a, g) => a + g.v, 0), FLOW.total, "flow adds up to income");
eq(SPEND_CATS.reduce((a, s) => a + s.v, 0), D.CARD_OUT, "card categories add up to card bills");
eq(D.EMI + 3583, 54633, "fixed commitments");
