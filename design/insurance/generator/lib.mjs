// Sample data, money math, formatting and the shell for the Insurance canvas.
// The policies are Prathik's own, read from his emailed PDFs on 2026-10-29 (identifiers cut to their last digits). "Today" is Oct 29, 2026.
// The shapes are the proposed ones (docs/design/insurance.md): a Policy, and a PolicyPayment for each term. The sums are what
// lib/aggregate/insurance.ts will hold, written here only so every figure on a board agrees with every other.

export const TODAY = "2026-10-29";

// ---------- Dates ----------
export function addMonthsUTC(iso, months) {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() !== day) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}
export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
export const monthKey = (iso) => iso.slice(0, 7);
export function monthsFrom(startKey, n) {
  const out = [];
  let d = `${startKey}-01`;
  for (let i = 0; i < n; i++) { out.push(d.slice(0, 7)); d = addMonthsUTC(d, 1); }
  return out;
}
export const YEAR = monthsFrom("2026-01", 12);
export const NOW_KEY = monthKey(TODAY);
export const dayOfYear = (iso) => daysBetween("2026-01-01", iso);

// ---------- Formatting ----------
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dt = (iso) => new Date(`${iso}T00:00:00Z`);
export const inr = (n) => `${n < 0 ? "−" : ""}₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
export const signed = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
export const inrL = (n) => (Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(2).replace(/\.?0+$/, "")}L` : Math.abs(n) >= 1000 ? `₹${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : inr(n));
export const inrS = (n) => (Math.abs(n) >= 100000 ? `₹${(n / 100000).toFixed(1).replace(/\.0$/, "")}L` : Math.abs(n) >= 1000 ? `₹${Math.round(n / 1000)}k` : inr(n));
export const fmt = (iso) => `${MON[dt(iso).getUTCMonth()]} ${dt(iso).getUTCDate()}`;
export const fmtY = (iso) => `${fmt(iso)}, ${dt(iso).getUTCFullYear()}`;
export const fmtDow = (iso) => `${DOW[dt(iso).getUTCDay()]}, ${fmt(iso)}`;
export const dow = (iso) => DOW[dt(iso).getUTCDay()];
export const monName = (key) => MON[Number(key.slice(5, 7)) - 1];
export const monFull = (key) => MONTH[Number(key.slice(5, 7)) - 1];
export const monYear = (key) => `${monName(key)} ${key.slice(0, 4)}`;
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
export const pctOf = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const inDays = (iso) => { const n = daysBetween(TODAY, iso); return n === 0 ? "today" : n === 1 ? "tomorrow" : n > 0 ? `in ${n} days` : `${-n} days ago`; };



// ---------- Policies: Prathik's own, read from the PDFs in his Gmail "Insurance" label on 2026-10-29 ----------
// Only what the schedules say, with identifiers cut to their last digits. Two things are assumed and flagged: the day the health
// and car premiums were paid (taken as the day cover began; the PDFs don't say), and where any premium was paid from (unknown).
/** The accounts and cards premiums are paid from (a subset of the Accounts and Cards pages' samples). None is known yet. */
export const ACCOUNTS = {
  hdfc: { name: "HDFC Salary", initial: "H", color: "sapphire" },
  icici: { name: "ICICI Invest", initial: "I", color: "violet" },
  regalia: { name: "HDFC Regalia (card)", initial: "R", color: "ruby" },
};

/**
 * What a policy protects. The page groups policies by this, not by kind: "You" holds a health and an accident policy.
 * `loan` links a protectee to a Loans-page loan, so the page can say when something financed has no policy recorded.
 * A proposed link, worked out from the loan's category, never stored. Home is not in his data: it only shows in the States board.
 */
export const WHO = {
  you: { id: "you", name: "You", sub: "Self", icon: "user" },
  car: { id: "car", name: "Car", sub: "Honda City · …1843", icon: "car" },
  bike: { id: "bike", name: "Bike", sub: "Gixxer SF 250 · …2906", icon: "bike" },
  home: { id: "home", name: "Home", sub: "The flat", icon: "home", loan: { name: "Home loan", lender: "SBI" } },
};
export const WHO_ORDER = ["you", "car", "bike"];

/**
 * Policy (the proposed `Policies` tab): name, kind (Health | Life | Motor | Home | Accident), insurer, policyNumber, who it covers,
 * sumInsured (the IDV for a vehicle), cycle (Yearly | Single: one premium for a multi-year term), status (Active | Cancelled),
 * color, addOns. Each term is a `PolicyPayment` row: periodStart, years (the length of the cover it bought), amount, paidOn,
 * and for a vehicle the IDV and no-claim step of that term. A single premium is spread over its years for "a year".
 */
const RAW = [
  { id: "health", name: "Health · Lifetime Health", kind: "Health", insurer: "ManipalCigna", who: "you", number: "…3850", sumInsured: 5000000, cycle: "Single", color: "teal", icon: "heart", paidFrom: null, insured: "You", addOns: ["Health 360 Shield", "Health 360 OPD", "Cumulative bonus 15%", "Worldwide emergency ₹25L"], facts: [["Plan", "India Plan, individual"], ["Waiting periods", "30 days; 24 months for pre-existing"], ["Deductible", "None"], ["Claims helpline", "1800-102-4461"]], terms: [{ start: "2026-07-05", years: 3, amount: 38427.59, paidOn: "2026-07-05", assumed: true }] },
  { id: "accident", name: "Accident · Owner-driver cover", kind: "Accident", insurer: "Digit", who: "you", number: "…9756", sumInsured: 1500000, cycle: "Yearly", color: "violet", icon: "shield", paidFrom: null, insured: "You, as the bike's owner-driver", addOns: [], facts: [["Pays", "100% for death or total disablement"], ["The bike's policy relies on it", "Owner-driver cover is exempted there"], ["Claims helpline", "1800-103-4448"]], terms: [{ start: "2026-03-21", years: 1, amount: 451, paidOn: "2026-03-18" }] },
  { id: "car", name: "Car · Comprehensive Platinum", kind: "Motor", insurer: "Acko", who: "car", number: "…5104", sumInsured: 442000, cycle: "Yearly", color: "copper", icon: "car", paidFrom: null, insured: "Honda City · …1843", addOns: ["Consumables", "Rat bite", "Consequential damage"], facts: [["Deductible", "₹1,000 a claim"], ["No zero depreciation", "Plastic and rubber parts at 50%"], ["Claims helpline", "1800-266-2256"]], terms: [{ start: "2026-08-06", years: 1, amount: 5504, paidOn: "2026-08-06", assumed: true, idv: 442000, ncb: 50 }] },
  { id: "bike", name: "Bike · Long-term package", kind: "Motor", insurer: "Bajaj General", who: "bike", number: "…0322", sumInsured: 73545, cycle: "Single", color: "ruby", icon: "bike", paidFrom: null, insured: "Gixxer SF 250 · …2906", addOns: ["24x7 spot assistance"], facts: [["Deductible", "₹100 a claim"], ["Own-damage premium", "₹343, liability ₹4,098"], ["Claims helpline", "1800-102-5858"]], terms: [{ start: "2026-03-21", years: 3, amount: 5241, paidOn: "2026-03-18", idv: 73545, ncb: 0 }] },
];
export const NCB_STEPS = [0, 20, 25, 35, 45, 50];

export const POLICIES = RAW.map((p) => {
  const terms = p.terms.map((t, k) => ({ policyId: p.id, n: k + 1, periodStart: t.start, years: t.years, periodEnd: addDays(addMonthsUTC(t.start, 12 * t.years), -1), amount: t.amount, paidOn: t.paidOn, assumed: t.assumed, status: "Paid", paidFrom: p.paidFrom, idv: t.idv, ncb: t.ncb }));
  const last = terms.at(-1), renewOn = addMonthsUTC(last.periodStart, 12 * last.years);
  return { ...p, status: "Active", terms, payments: terms, renewOn, periodStart: last.periodStart, periodEnd: last.periodEnd, years: last.years, paid: last.amount, premium: last.amount / last.years, ncb: last.ncb, ncbNext: last.ncb != null ? NCB_STEPS[Math.min(NCB_STEPS.indexOf(last.ncb) + 1, NCB_STEPS.length - 1)] : undefined, lastPaid: last.paidOn };
});
/** `premium` is the cost of a year of cover: what was paid over the years it bought. `paid` is the cash that left, once. */
export const policy = (id) => POLICIES.find((p) => p.id === id);
export const polsOf = (who, list = POLICIES) => list.filter((p) => p.who === who);

// ---------- What a policy is today ----------
/** Renewals inside this many days are "renew soon" (an insurer's reminder comes about a month ahead; a lapse is the thing to avoid). */
export const SOON = 30;
export const daysLeft = (p, today = TODAY) => daysBetween(today, p.renewOn);
/** In force, Renew soon, Lapsed (the term ended and no renewal is recorded) or Cancelled. */
export function stateOf(p, today = TODAY) {
  if (p.status === "Cancelled") return "Cancelled";
  const d = daysLeft(p, today);
  return d < 0 ? "Lapsed" : d <= SOON ? "Renew soon" : "In force";
}
export const termDays = (p) => daysBetween(p.periodStart, p.renewOn);
/** How much of the current term has gone by, 0 to 1. */
export const elapsed = (p, today = TODAY) => Math.min(1, Math.max(0, daysBetween(p.periodStart, today) / termDays(p)));
export const rateOf = (p) => p.premium / p.sumInsured;
/** Change of a term's cost of a year against the one before (null for the first). */
export const change = (p, k) => (k === 0 ? null : (p.terms[k].amount / p.terms[k].years - p.terms[k - 1].amount / p.terms[k - 1].years) / (p.terms[k - 1].amount / p.terms[k - 1].years));
export const yearsTxt = (n) => (n === 1 ? "1 year" : `${n} years`);

// ---------- The sums lib/aggregate/insurance.ts will hold ----------
const sum = (xs) => xs.reduce((t, x) => t + x, 0);
export const IN_FORCE = POLICIES.filter((p) => stateOf(p) === "In force" || stateOf(p) === "Renew soon");
/** What a year of cover costs, spread evenly: the single premiums over their years. */
export const YEARLY = sum(IN_FORCE.map((p) => p.premium));
export const MONTHLY = YEARLY / 12;
const yr = TODAY.slice(0, 4);
/** Cash that left this calendar year. It's more than YEARLY when multi-year premiums were bought. */
export const PAID_YTD = sum(POLICIES.flatMap((p) => p.payments).filter((x) => x.paidOn.startsWith(yr) && x.paidOn <= TODAY).map((x) => x.amount));
/** Renewals still to come this calendar year, at the last premium. */
export const TO_PAY = sum(IN_FORCE.filter((p) => p.renewOn.startsWith(yr)).map((p) => p.paid));
export const NEXT12 = sum(IN_FORCE.filter((p) => daysBetween(TODAY, p.renewOn) <= 365).map((p) => p.paid));
export const COVER = {
  health: sum(IN_FORCE.filter((p) => p.kind === "Health").map((p) => p.sumInsured)),
  accident: sum(IN_FORCE.filter((p) => p.kind === "Accident").map((p) => p.sumInsured)),
  car: policy("car").sumInsured, bike: policy("bike").sumInsured,
};
export const BY_RENEWAL = IN_FORCE.slice().sort((a, b) => (a.renewOn < b.renewOn ? -1 : 1));
export const NEXT = BY_RENEWAL[0];
export const SOONEST = BY_RENEWAL.filter((p) => daysLeft(p) <= SOON);
/** Something that has a loan against it and no policy recorded. Nothing in his data does today. */
export const GAPS = WHO_ORDER.filter((w) => WHO[w].loan && !polsOf(w).length).map((w) => WHO[w]);
/** Every premium of every policy in a calendar year, paid or still to come (the to-come ones at the last amount). */
export const premiumsIn = (year) => POLICIES.flatMap((p) => [...p.payments, ...(p.renewOn.startsWith(String(year)) ? [{ policyId: p.id, paidOn: p.renewOn, amount: p.paid, status: "Pending" }] : [])]).filter((x) => x.paidOn.startsWith(String(year)));
export const yearTotal = (y) => sum(premiumsIn(y).map((x) => x.amount));
/** Premiums by month: the paid ones from the payments, the rest from each policy's renewal day stepping its own term. */
export function monthsRunway(fromKey = "2026-01", n = 43) {
  const keys = monthsFrom(fromKey, n), out = keys.map((k) => ({ key: k, items: [] }));
  for (const p of POLICIES) {
    for (const x of p.payments) { const m = out.find((o) => o.key === monthKey(x.paidOn)); if (m) m.items.push({ p, amount: x.amount, paid: true, on: x.paidOn }); }
    for (let d = p.renewOn; monthKey(d) <= keys.at(-1); d = addMonthsUTC(d, 12 * p.years)) { const m = out.find((o) => o.key === monthKey(d)); if (m) m.items.push({ p, amount: p.paid, paid: false, on: d }); }
  }
  return out;
}

// ---------- Icons ----------
const ic = (d, s = 16, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const I = {
  overview: (s) => ic('<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect>', s ?? 17),
  accounts: (s) => ic('<path d="M3 21h18"></path><path d="M5 21V10"></path><path d="M19 21V10"></path><path d="M3 10l9-6 9 6"></path><path d="M9 21v-6"></path><path d="M15 21v-6"></path>', s ?? 17),
  cards: (s) => ic('<rect x="2" y="6" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line>', s ?? 17),
  subs: (s) => ic('<path d="M17 2l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 22l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>', s ?? 17),
  income: (s) => ic('<polyline points="3 17 9 11 13 15 21 7"></polyline><polyline points="14 7 21 7 21 14"></polyline>', s ?? 17),
  loans: (s) => ic('<line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle>', s ?? 17),
  fixed: (s) => ic('<rect x="4" y="10" width="16" height="10" rx="2"></rect><path d="M7 10V7a5 5 0 0 1 10 0v3"></path>', s ?? 17),
  invest: (s) => ic('<line x1="4" y1="20" x2="4" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="20" y1="20" x2="20" y2="14"></line>', s ?? 17),
  x: (s) => ic('<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>', s ?? 14, 2.2),
  plus: (s) => ic('<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>', s ?? 14, 2.5),
  refresh: (s) => ic('<path d="M21 12a9 9 0 1 1-2.64-6.36"></path><polyline points="21 3 21 9 15 9"></polyline>', s ?? 15),
  chev: (s) => ic('<polyline points="6 9 12 15 18 9"></polyline>', s ?? 12, 2.5),
  chevR: (s) => ic('<polyline points="9 6 15 12 9 18"></polyline>', s ?? 12, 2.5),
  chevL: (s) => ic('<polyline points="15 6 9 12 15 18"></polyline>', s ?? 12, 2.5),
  arrowR: (s) => ic('<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="13 6 19 12 13 18"></polyline>', s ?? 13, 2.5),
  check: (s) => ic('<polyline points="20 6 9 17 4 12"></polyline>', s ?? 12, 3),
  up: (s) => ic('<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="6 11 12 5 18 11"></polyline>', s ?? 11, 2.6),
  down: (s) => ic('<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="6 13 12 19 18 13"></polyline>', s ?? 11, 2.6),
  search: (s) => ic('<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>', s ?? 13, 2.2),
  cal: (s) => ic('<rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>', s ?? 14),
  info: (s) => ic('<circle cx="12" cy="12" r="9"></circle><line x1="12" y1="11" x2="12" y2="16"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>', s ?? 12, 2.2),
  alert: (s) => ic('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>', s ?? 14, 2.2),
  clock: (s) => ic('<circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 14"></polyline>', s ?? 12, 2.2),
  menu: (s) => ic('<line x1="4" y1="7" x2="20" y2="7"></line><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="17" x2="20" y2="17"></line>', s ?? 20),
  more: (s) => ic('<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>', s ?? 16, 2.6),
  link: (s) => ic('<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"></path><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"></path>', s ?? 13),
  lock: (s) => ic('<rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>', s ?? 12),
  pencil: (s) => ic('<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>', s ?? 13, 2.2),
  briefcase: (s) => ic('<rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="3" y1="13" x2="21" y2="13"></line>', s ?? 14),
  trend: (s) => ic('<polyline points="3 17 9 11 13 15 21 7"></polyline><polyline points="14 7 21 7 21 14"></polyline>', s ?? 14),
  sprout: (s) => ic('<path d="M12 21v-8"></path><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6Z"></path><path d="M12 15c0-3-2-5-6-5 0 3 2 5 6 5Z"></path>', s ?? 14),
  pie: (s) => ic('<path d="M21 12A9 9 0 1 1 12 3v9Z"></path><path d="M15 3.5A9 9 0 0 1 20.5 9H15Z"></path>', s ?? 14),
  receipt: (s) => ic('<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z"></path><line x1="9" y1="8" x2="15" y2="8"></line><line x1="9" y1="12" x2="15" y2="12"></line>', s ?? 14),
};

// Icons for the policies
I.home = (s) => ic('<path d="M3 11 12 4l9 7"></path><path d="M5 10v10h14V10"></path><path d="M10 20v-6h4v6"></path>', s ?? 14);
I.car = (s) => ic('<path d="M5 16V11l2-5h10l2 5v5"></path><path d="M3 16h18v3H3z"></path><circle cx="7.5" cy="16" r="0.6"></circle><circle cx="16.5" cy="16" r="0.6"></circle>', s ?? 14);
I.user = (s) => ic('<circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"></path>', s ?? 14);
I.flag = (s) => ic('<path d="M5 21V4"></path><path d="M5 4h12l-2 4 2 4H5"></path>', s ?? 12);
I.heart = (s) => ic('<path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21.8l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z"></path>', s ?? 14);
I.users = (s) => ic('<circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"></path><circle cx="17.5" cy="9" r="2.5"></circle><path d="M17.5 14c2.6 0 4.5 1.8 4.5 4.5"></path>', s ?? 14);
I.shield = (s) => ic('<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.4 7.5 9.5 4.4-1.1 7.5-4.9 7.5-9.5V6Z"></path><polyline points="8.8 12 11.2 14.4 15.4 10"></polyline>', s ?? 14);
I.bike = (s) => ic('<circle cx="5.5" cy="16.5" r="3.5"></circle><circle cx="18.5" cy="16.5" r="3.5"></circle><path d="M5.5 16.5 9 9h5l4.5 7.5"></path><path d="M9 9 7.5 6H5"></path><path d="M14 9l-2.5 7.5"></path>', s ?? 14);
I.copy = (s) => ic('<rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path>', s ?? 13);
I.file = (s) => ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"></path><polyline points="14 3 14 8 19 8"></polyline>', s ?? 13);
I.phone = (s) => ic('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"></path>', s ?? 13);
I.insurance = (s) => I.shield(s ?? 17);
I.umbrella = (s) => ic('<path d="M3 12a9 9 0 0 1 18 0Z"></path><path d="M12 12v6a2 2 0 0 0 4 0"></path>', s ?? 14);
export const polIcon = (p, size = 14) => I[p.icon](size);

// ---------- Small parts ----------
export const grad = (c, a = 155) => `linear-gradient(${a}deg,var(--card-${c}-from),var(--card-${c}-to))`;
/** A mark's fill (bars, ribbons): the colour, a touch lighter on top. */
export const fill = (s, a = 180) => `linear-gradient(${a}deg,color-mix(in oklch,var(--card-${typeof s === "string" ? s : s.color}) 80%,white),var(--card-${typeof s === "string" ? s : s.color}))`;
export const col = (s) => `var(--card-${typeof s === "string" ? s : s.color})`;
/** A policy's tile: its icon on its card gradient. */
export const mono = (p, size = 32) => `<span class="mono" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;background:${grad(p.color)};${p.status === "Cancelled" ? "filter:grayscale(.85);opacity:.6" : ""}">${polIcon(p, Math.round(size * 0.5))}</span>`;
/** A protectee's tile: its icon on a quiet fill, since a person or a vehicle has no colour of its own. */
export const whoMono = (w, size = 32, c = "onyx") => `<span class="mono" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.3)}px;background:${grad(c)}">${I[w.icon](Math.round(size * 0.5))}</span>`;
export const via = (id) => { if (!id) return `<span class="via" style="color:var(--muted)">Not recorded</span>`; const a = ACCOUNTS[id]; return `<span class="via"><span class="minibank" style="background:${grad(a.color)}">${a.initial}</span>${a.name}</span>`; };
export const sampleTag = (extra = "") => `<span class="sample">His real policies, from Gmail${extra}</span>`;
export const derivedTag = (t = "Worked out") => `<span class="pill pill-derived">${I.link(10)} ${t}</span>`;

// ---------- Shell ----------
export function rail() {
  const items = ["overview", "accounts", "cards", "subs", "income", "loans", "insurance", "fixed", "invest"];
  return `<nav class="rail glass-strong">${items.map((k) => `<span class="rail-item${k === "insurance" ? " active" : ""}">${I[k]()}</span>`).join("")}<span class="rail-me">P</span></nav>`;
}
export function desktop({ w = 1600, h, body, note = "" }) {
  return `<div class="chai-app desk" style="width:${w}px;height:${h === "auto" ? "__H__" : h === "fit" ? "auto" : `${h}px`}">${rail()}<main class="main glass">${body}</main>${note}</div>`;
}
export function header({ eyebrow = "Insurance · Today", title = "Good afternoon, Prathik", lede, actions, back }) {
  return `<header class="pg-head"><div class="pg-text"><div class="eyebrow">${back ? `<span style="display:inline-flex;align-items:center;gap:6px">${I.chevL(11)}${eyebrow}</span>` : eyebrow}</div><h1>${title}</h1>${lede ? `<div class="lede">${lede}</div>` : ""}</div>${actions ? `<div class="pg-actions">${actions}</div>` : ""}</header>`;
}
export const btn = (label, { kind = "ghost", icon = "", cls = "", style = "" } = {}) => `<span class="btn btn-${kind} ${cls}"${style ? ` style="${style}"` : ""}>${icon}${label}</span>`;
export function select({ value, options = [], open = false, kind = "pill", icon = "", align = "", width = "" }) {
  const opts = options.map((o) => (o === "-" ? `<div class="lb-divider"></div>` : o.group ? `<div class="lb-group">${o.group}</div>` : `<div class="opt" ${o.on ? 'aria-selected="true"' : ""}><span class="opt-label">${o.label}</span>${o.meta ? `<span class="opt-meta">${o.meta}</span>` : ""}<span class="opt-check">${I.check(12)}</span></div>`)).join("");
  return `<details class="sel sel--${kind}"${open ? " open" : ""}${width ? ` style="width:${width}"` : ""}><summary class="sel-trigger">${icon ? `<span class="sel-icon">${icon}</span>` : ""}<span class="sel-value">${value}</span><span class="sel-chev">${I.chev()}</span></summary><div class="pop${align ? ` ${align}` : ""}"><div class="lb">${opts}</div></div></details>`;
}
export function seg(items, { cls = "" } = {}) {
  return `<span class="seg ${cls}">${items.map((it) => `<span class="seg-i${it.on ? " on" : ""}">${it.label}${it.count != null ? `<em>${it.count}</em>` : ""}</span>`).join("")}</span>`;
}
export const greetingActions = () => `${btn("Add policy", { icon: I.plus() })}${btn("Renew a policy", { kind: "primary", icon: I.refresh(14) })}`;


export function phone({ h, body, label = "" }) {
  return `<div class="chai-app ph" style="width:390px;height:${h === "auto" ? "__H__" : h === "fit" ? "auto" : `${h}px`}"><div class="ph-status"><span>9:41</span><span class="ph-icons"><i></i><i></i><i></i></span></div><header class="ph-bar"><span>chaiCoffeeFund</span><span class="ph-menu">${I.menu()}</span></header><div class="ph-body">${body}</div>${label}</div>`;
}
