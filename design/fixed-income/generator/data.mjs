// REAL data for the Fixed Income canvas (round 3), from what Prathik shared on 2026-11-04:
//  - a screenshot of his FD app (7 active deposits, all 7.75%, the interest accrued so far as the app shows it), and
//  - his EPFO member passbooks for FY 23-24 to FY 26-27.
// Left out on purpose: his UAN and date of birth. The deposits' bank is not shown on his screenshot, so it is "not set".
// "Today" is Wed Nov 4, 2026. The older sample data (rounds 1 and 2) is in data-sample.mjs.
import { addMonthsUTC, addDays, daysBetween } from "./lib.mjs";
export { daysBetween, addDays, addMonthsUTC };

export const TODAY = "2026-11-04";
export const FY_START = "2026-04-01";
export const FY_END = "2027-03-31";
export const SETTINGS = { slab: 0.3, inflation: 0.05, epfRate: 0.0825 };
export const sum = (a) => a.reduce((s, x) => s + x, 0);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso) => `${+iso.slice(8, 10)} ${MON[+iso.slice(5, 7) - 1]}`;

// ---------- Fixed deposits (as his app shows them) ----------
const RATE = 7.75;
/** What a bank-style quarterly-compounded deposit grows to. Matches his app's accrued interest to within about ₹2 on each deposit. */
export const grow = (p, rate, days) => p * (1 + rate / 100 / 4) ** (4 * (days / 365));
const fd = (id, start, principal, months, extraDays, shown, color, tenure) => {
  const maturityDate = addDays(addMonthsUTC(start, months), extraDays);
  return { id, kind: "FD", name: `₹${principal.toLocaleString("en-IN")} FD · ${day(start)}`, bank: "FD", principalAmount: principal, interestRate: RATE, compoundingType: "Cumulative", startDate: start, maturityDate, maturityAmount: Math.round(grow(principal, RATE, daysBetween(start, maturityDate))), shown, status: "Active", color, tenure };
};
export const FDS = [
  fd("f1", "2026-03-13", 15000, 18, 1, 763.88, "sapphire", "18 months 1 day"),
  fd("f2", "2026-04-01", 15000, 18, 1, 700.54, "sky", "18 months 1 day"),
  fd("f3", "2026-05-02", 15000, 18, 1, 599.86, "teal", "18 months 1 day"),
  fd("f4", "2026-07-01", 15000, 18, 1, 403.5, "emerald", "18 months 1 day"),
  fd("f5", "2026-08-26", 30000, 24, 0, 447.28, "gold", "2 years"),
  fd("f6", "2026-10-05", 15000, 24, 0, 95.4, "copper", "2 years"),
  fd("f7", "2026-11-01", 15000, 18, 1, 9.54, "violet", "18 months 1 day"),
];
/** Worth today is principal plus what his app says has accrued; on another day it is the same convention worked forward. */
export const accrued = (x, asOf = TODAY) => (asOf === TODAY ? x.shown : asOf <= x.startDate ? 0 : asOf >= x.maturityDate ? x.maturityAmount - x.principalAmount : grow(x.principalAmount, x.interestRate, daysBetween(x.startDate, asOf)) - x.principalAmount);
export const fdWorth = (x, asOf = TODAY) => Math.round(x.principalAmount + accrued(x, asOf));
export const fdPerDay = (x) => (fdWorth(x) * x.interestRate) / 100 / 365;
export const FD_PUT = sum(FDS.map((x) => x.principalAmount));
export const FD_ACCRUED = Math.round(sum(FDS.map((x) => x.shown)) * 100) / 100;
export const FD_VALUE = FD_PUT + FD_ACCRUED;
export const FD_PER_DAY = sum(FDS.map(fdPerDay));
export const NEXT_FD = [...FDS].sort((a, b) => a.maturityDate.localeCompare(b.maturityDate))[0];

// ---------- EPF (as his EPFO passbooks show it) ----------
// One row per credit: [wage month, credit date, employee amount]. The employer's amount is the same every month (and EPS wages are 0).
const C = (rows) => rows.map(([wage, date, each]) => ({ wage, date, each }));
export const EPF_CREDITS = C([
  ["2024-01", "2024-02-01", 8482], ["2024-02", "2024-03-01", 11952],
  ["2024-03", "2024-04-01", 11952], ["2024-04", "2024-05-01", 11952], ["2024-05", "2024-06-01", 11952], ["2024-06", "2024-07-01", 11952],
  ["2024-07", "2024-08-01", 12456], ["2024-08", "2024-09-01", 12456], ["2024-09", "2024-10-01", 12456], ["2024-10", "2024-11-01", 12456], ["2024-11", "2024-12-01", 12456], ["2024-12", "2025-01-01", 12456], ["2025-01", "2025-02-01", 12456], ["2025-02", "2025-03-01", 12456],
  ["2025-03", "2025-04-01", 12456], ["2025-04", "2025-05-01", 12456], ["2025-05", "2025-06-01", 12456], ["2025-06", "2025-07-01", 12456],
  ["2025-07", "2025-08-01", 14323], ["2025-08", "2025-09-01", 14323], ["2025-09", "2025-10-01", 14323], ["2025-10", "2025-11-01", 14323], ["2025-11", "2025-12-01", 14323], ["2025-12", "2026-01-01", 14323], ["2026-01", "2026-02-01", 14323], ["2026-02", "2026-03-01", 14323],
  ["2026-03", "2026-04-01", 14323], ["2026-04", "2026-05-01", 14323], ["2026-05", "2026-06-01", 14323], ["2026-06", "2026-07-26", 14323],
  ["2026-07", "2026-08-18", 19654], ["2026-08", "2026-09-17", 19654], ["2026-09", "2026-10-18", 19654],
]);
/** Interest credited at each financial year's end, per share (employee and employer each). */
export const EPF_INTEREST = [
  { fy: "FY 23-24", date: "2024-03-31", each: 58 },
  { fy: "FY 24-25", date: "2025-03-31", each: 7211 },
  { fy: "FY 25-26", date: "2026-03-31", each: 20462 },
];
export const epfBalance = (asOf = TODAY) => {
  const c = sum(EPF_CREDITS.filter((x) => x.date <= asOf).map((x) => x.each)), i = sum(EPF_INTEREST.filter((x) => x.date <= asOf).map((x) => x.each));
  return { each: c + i, total: 2 * (c + i), contributions: 2 * c, interest: 2 * i };
};
/**
 * EPF interest for a financial year, worked out the way his credited interest reproduces to the rupee (FY 24-25 and FY 25-26):
 * each month, the balance at the START of the month times rate / 12 (a contribution counts from the month after it is credited), summed.
 * `through` stops the year early, for the interest that has built up but isn't credited yet.
 */
export function epfInterest(fyStart, rate = SETTINGS.epfRate, through = null, credits = EPF_CREDITS) {
  const open = epfBalance(addDays(fyStart, -1)).total;
  let total = 0;
  for (let m = 0; m < 12; m++) {
    const start = addMonthsUTC(fyStart, m);
    if (through && addDays(addMonthsUTC(start, 1), -1) > through) break; // only months that have fully passed
    const bal = open + 2 * sum(credits.filter((c) => c.date >= fyStart && c.date < start).map((c) => c.each));
    total += (bal * rate) / 12;
  }
  return Math.round(total);
}
/** The year's interest if each remaining month's contribution is the same as the last one (about the 17th): an estimate. */
const FUTURE = ["2026-11-17", "2026-12-17", "2027-01-17", "2027-02-17", "2027-03-17"].map((date) => ({ wage: "", date, each: EPF_CREDITS.at(-1).each }));
export const EPF = (() => {
  const b = epfBalance();
  const pending = epfInterest(FY_START, SETTINGS.epfRate, TODAY); // months already started this year, not yet credited
  const thisYear = EPF_CREDITS.filter((c) => c.date >= FY_START);
  return {
    each: b.each, total: b.total, pending,
    contributedThisYear: 2 * sum(thisYear.map((c) => c.each)), creditsThisYear: thisYear.length,
    lastMonthly: 2 * EPF_CREDITS.at(-1).each, // ₹39,308 a month after the July 2026 wage rise
    creditedTotal: 2 * sum(EPF_INTEREST.map((i) => i.each)),
    lastCredit: EPF_CREDITS.at(-1).date,
    perDay: (b.total * SETTINGS.epfRate) / 365,
    openingFy: epfBalance("2026-03-31").each,
    yearEnd: epfInterest(FY_START, SETTINGS.epfRate, null, [...EPF_CREDITS, ...FUTURE]),
  };
})();
// A check the design stands on: the formula reproduces his credited interest for the last two years, to the rupee.
export const EPF_CHECK = [["2024-04-01", 2 * 7211], ["2025-04-01", 2 * 20462]].map(([fy, want]) => ({ fy, want, got: epfInterest(fy) }));
/** The next credit is expected around the 17th to 18th of the month, as the last three were. */
export const NEXT_EPF_CREDIT = (() => { const d = new Date(`${TODAY}T00:00:00Z`); const iso = `${TODAY.slice(0, 8)}17`; return iso > TODAY ? iso : addMonthsUTC(iso, 1); })();

// ---------- Totals ----------
export const TOTAL = EPF.total + FD_VALUE; // the passbook figure plus the deposits; the uncredited EPF interest is shown beside it
export const PER_DAY = EPF.perDay + FD_PER_DAY;
export const EARNED_SO_FAR = EPF.creditedTotal + FD_ACCRUED;
export const SHARE_EPF = EPF.total / TOTAL;
export const pct = (x, d = 2) => `${(x * 100).toFixed(d)}%`;
export const effectiveYield = (rate, perYear = 4) => (1 + rate / 100 / perYear) ** perYear - 1;

/** Money held, month by month, for the "worth over time" chart: EPF as the passbook shows it (credits and each March's interest) and the deposits. */
export const monthEnds = (from, to) => { const out = []; let d = `${from}-01`; while (d.slice(0, 7) <= to) { out.push(addDays(addMonthsUTC(d, 1), -1)); d = addMonthsUTC(d, 1); } return out; };
export const WORTH_OVER_TIME = monthEnds("2024-01", "2026-11").map((date) => ({ date: date > TODAY ? TODAY : date, epf: epfBalance(date > TODAY ? TODAY : date).total, fd: sum(FDS.filter((x) => x.startDate <= date).map((x) => fdWorth(x, date > TODAY ? TODAY : date))) }));

// ---------- Round 4: growth path, time snapshots, money in each month, credit lag ----------
/**
 * Arithmetic only, never a forecast: EPF if every month's credit stays what the last one was and the rate stays 8.25%.
 * Same rule as epfInterest: a month's interest is the start-of-month balance x rate / 12, added up and credited each 31 March;
 * a contribution counts from the month after. Starts from today's passbook balance and the interest already built up this year.
 */
export function projectEpf(years, perCredit = EPF_CREDITS.at(-1).each * 2, rate = SETTINGS.epfRate) {
  let bal = EPF.total, pot = EPF.pending, contributed = 0;
  for (let i = 0; i < years * 12; i++) {
    const month = addMonthsUTC(`${TODAY.slice(0, 7)}-01`, i);
    pot += (bal * rate) / 12;
    bal += perCredit; contributed += perCredit;
    if (month.slice(5, 7) === "03") { bal += pot; pot = 0; }
  }
  const total = Math.round(bal + pot);
  return { years, total, contributed, interest: total - EPF.total - contributed, perCredit };
}
/** The pillars as they stood on a day: EPF split into what you put in, what NetApp put in and interest, and each deposit's worth. */
export const SNAPS = [["now", "Today", TODAY], ["y1", "A year ago", "2025-11-04"], ["m26", "Mar 2026", "2026-03-12"], ["m25", "Mar 2025", "2025-03-31"], ["m24", "Mar 2024", "2024-03-31"]];
export const snapshot = (date) => {
  const c = sum(EPF_CREDITS.filter((x) => x.date <= date).map((x) => x.each)), i = 2 * sum(EPF_INTEREST.filter((x) => x.date <= date).map((x) => x.each));
  const fds = FDS.map((x) => (x.startDate <= date ? fdWorth(x, date) : 0));
  return { date, you: c, netapp: c, interest: i, epf: 2 * c + i, fds, fd: sum(fds), count: fds.filter(Boolean).length, total: 2 * c + i + sum(fds) };
};
/** What went in each calendar month: EPF credits (by credit date) and deposits placed (by start date). */
export const MONEY_IN = (() => {
  const out = {};
  for (const c of EPF_CREDITS) { const k = c.date.slice(0, 7); (out[k] ||= { epf: 0, fd: 0 }).epf += 2 * c.each; }
  for (const x of FDS) { const k = x.startDate.slice(0, 7); (out[k] ||= { epf: 0, fd: 0 }).fd += x.principalAmount; }
  return out;
})();
/** Days from the end of the wage month to the credit date, per credit. */
export const CREDIT_LAG = EPF_CREDITS.map((c) => ({ ...c, lag: daysBetween(addDays(addMonthsUTC(`${c.wage}-01`, 1), -1), c.date) }));
/** Opening + credits + interest = closing, for each passbook year (what an import would check before accepting a file). */
export const PASSBOOK_CHECKS = [["FY 23-24", "2023-04-01", "2024-03-31"], ["FY 24-25", "2024-04-01", "2025-03-31"], ["FY 25-26", "2025-04-01", "2026-03-31"], ["FY 26-27", "2026-04-01", TODAY]].map(([fy, from, to]) => {
  const open = epfBalance(addDays(from, -1)).total, closing = epfBalance(to).total;
  const put = 2 * sum(EPF_CREDITS.filter((c) => c.date >= from && c.date <= to).map((c) => c.each)), int = 2 * sum(EPF_INTEREST.filter((i) => i.date >= from && i.date <= to).map((i) => i.each));
  return { fy, open, put, int, closing, ok: open + put + int === closing };
});
