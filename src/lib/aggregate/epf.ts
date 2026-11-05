import { addMonthsUTC } from "./recurring";
import { daysBetween } from "./cardSpend";
import type { EpfEntry, EpfRate } from "../sheets/types";

/**
 * EPF, worked out from contributions plus yearly interest (ADR 0011). Pure: no Sheets calls. The rules, each checked
 * against his four EPFO passbooks:
 * - **The balance is never stored**: opening + contributions + credited interest up to a day, per share. The pension
 *   share (EPS) is kept apart and earns no interest here.
 * - **Interest** is credited once a year on 31 March. Worked out as each month's interest on the balance at the START of
 *   the month (a credit counts from the month after it is credited), at the year's rate ÷ 12, summed over the year and
 *   rounded to the rupee for each share. For his FY 24-25 and FY 25-26 that is exactly what EPFO credited.
 * - **The rate for a year** is Declared or Assumed if someone entered it, otherwise Implied by the year's own credited
 *   interest (worked out, never stored), otherwise the latest known rate, marked Assumed.
 * - **Each wage month** is Confirmed (a credit from a passbook), Typed (entered by hand, counted), Expected (nothing yet,
 *   worked out, never counted) or Late (its usual day is on or before the latest passbook's print date and it is still
 *   missing). Only a passbook printed after that day can make a month Late.
 */

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const round = (n: number) => Math.round(n);

/** One account's entries. Every function here works on a single account: two accounts' balances, interest and credit days are never meant to be added together. */
export const entriesOfAccount = (entries: EpfEntry[], epfAccountId: string): EpfEntry[] => entries.filter((e) => e.epfAccountId === epfAccountId);
function assertOneAccount(entries: EpfEntry[]): void {
  if (new Set(entries.map((e) => e.epfAccountId)).size > 1) throw new Error("EPF functions take the entries of one account: filter with entriesOfAccount first");
}

export interface EpfBalance {
  employee: number;
  employer: number;
  pension: number;
  /** Employee + employer: what earns interest. */
  total: number;
}

// ---------- Financial years ----------
/** "2026-27" for any date from 1 April 2026 to 31 March 2027. */
export function financialYearOf(date: string): string {
  const year = Number(date.slice(0, 4));
  const start = Number(date.slice(5, 7)) >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
export const financialYearStart = (fy: string): string => `${fy.slice(0, 4)}-04-01`;
export const financialYearEnd = (fy: string): string => `${Number(fy.slice(0, 4)) + 1}-03-31`;
const dayBefore = (iso: string): string => new Date(Date.parse(`${iso}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
const lastDayOfMonth = (monthStart: string): string => dayBefore(addMonthsUTC(monthStart, 1));

// ---------- The balance ----------
/** The balance on a day: opening + contributions + credited interest dated on or before it, per share. */
export function epfBalance(entries: EpfEntry[], asOf: string): EpfBalance {
  assertOneAccount(entries);
  let employee = 0, employer = 0, pension = 0;
  for (const e of entries) {
    if (e.date > asOf) continue;
    employee += e.employee;
    employer += e.employer;
    pension += e.pension;
  }
  return { employee, employer, pension, total: employee + employer };
}

// ---------- Interest ----------
export interface EpfInterest {
  employee: number;
  employer: number;
  total: number;
}

/**
 * The year's interest by the monthly rule. `extra` adds credits that are not entries yet (a projection); `through`
 * stops after the last month that has fully passed by that day (the interest built up so far, not yet credited).
 */
export function epfInterestForYear(entries: EpfEntry[], fy: string, ratePercent: number, options: { through?: string; extra?: EpfEntry[] } = {}): EpfInterest {
  assertOneAccount(entries);
  const start = financialYearStart(fy);
  const all = options.extra ? [...entries, ...options.extra] : entries;
  let employee = 0, employer = 0;
  for (let m = 0; m < 12; m++) {
    const monthStart = addMonthsUTC(start, m);
    if (options.through && lastDayOfMonth(monthStart) > options.through) break;
    // Everything dated before the month: the year's opening balance, an opening balance or credit dated earlier in the year, and
    // last year's interest. This year's own interest is dated 31 March, after every month starts, so it never counts.
    const before = all.filter((e) => e.date < monthStart);
    employee += (sum(before.map((e) => e.employee)) * ratePercent) / 100 / 12;
    employer += (sum(before.map((e) => e.employer)) * ratePercent) / 100 / 12;
  }
  const e = round(employee), r = round(employer);
  return { employee: e, employer: r, total: e + r };
}

/** The interest EPFO credited for a year, from its Interest entries (or null when none is recorded). */
export function creditedInterest(entries: EpfEntry[], fy: string): EpfInterest | null {
  const rows = entries.filter((e) => e.kind === "Interest" && financialYearOf(e.date) === fy);
  if (rows.length === 0) return null;
  const employee = sum(rows.map((e) => e.employee)), employer = sum(rows.map((e) => e.employer));
  return { employee, employer, total: employee + employer };
}

// ---------- Rates ----------
export type EpfRateKind = "Declared" | "Assumed" | "Implied";
export interface EpfRateInfo {
  ratePercent: number;
  source: EpfRateKind;
}

/**
 * The rate to use for a year, and where it came from. An entered rate wins. Otherwise a credited year is Implied by its own
 * interest. Otherwise the latest earlier rate, marked Assumed. `null` when nothing is known at all (the page asks for one).
 */
export function epfRateForYear(entries: EpfEntry[], rates: EpfRate[], fy: string): EpfRateInfo | null {
  const entered = rates.find((r) => r.financialYear === fy);
  if (entered) return { ratePercent: entered.ratePercent, source: entered.source };
  const implied = impliedRatePercent(entries, fy);
  if (implied !== null) return { ratePercent: implied, source: "Implied" };
  const earlier = [...new Set([...rates.map((r) => r.financialYear), ...entries.filter((e) => e.kind === "Interest").map((e) => financialYearOf(e.date))])]
    .filter((y) => y < fy)
    .sort()
    .at(-1);
  if (!earlier) return null;
  const info = epfRateForYear(entries, rates, earlier);
  return info ? { ratePercent: info.ratePercent, source: "Assumed" } : null;
}

/** A year with at least this much credited interest pins the rate to the hundredth of a percent; a tiny year (his first was ₹116) only to a tenth. */
const PRECISE_ABOVE_INTEREST = 1000;

/**
 * The rate a year's credited interest implies. Interest is linear in the rate, so it is the credited interest over what the
 * rule gives at 1%. `null` when the year has no credited interest, or when it is missing a credit (a wage month that should be
 * there is Expected): an incomplete year would imply a rate that is too low, and it would then become next year's assumed rate.
 */
export function impliedRatePercent(entries: EpfEntry[], fy: string): number | null {
  const credited = creditedInterest(entries, fy);
  if (!credited || credited.total === 0) return null;
  if (epfMonthStates(entries, fy, null).some((m) => m.state === "Expected")) return null;
  const atOne = epfInterestForYear(entries, fy, 1);
  if (atOne.total === 0) return null;
  const raw = credited.total / atOne.total;
  return credited.total >= PRECISE_ABOVE_INTEREST ? Math.round(raw * 100) / 100 : Math.round(raw * 10) / 10;
}

export interface InterestEstimate {
  /** Rupees, both shares. 0 when the year's interest is already credited. */
  amount: number;
  source: EpfRateKind | null;
  ratePercent: number | null;
  /** Whole months counted so far. */
  months: number;
  credited: boolean;
}

/** The interest built up so far this financial year and not credited yet: the months that have fully passed, from the confirmed balance. */
export function interestNotYetCredited(entries: EpfEntry[], rates: EpfRate[], asOf: string): InterestEstimate {
  const fy = financialYearOf(asOf);
  if (creditedInterest(entries, fy)) return { amount: 0, source: null, ratePercent: null, months: 0, credited: true };
  const rate = epfRateForYear(entries, rates, fy);
  if (!rate) return { amount: 0, source: null, ratePercent: null, months: 0, credited: false };
  const start = financialYearStart(fy);
  let months = 0;
  for (let m = 0; m < 12 && lastDayOfMonth(addMonthsUTC(start, m)) <= asOf; m++) months++;
  const { total } = epfInterestForYear(entries, fy, rate.ratePercent, { through: asOf });
  return { amount: total, source: rate.source, ratePercent: rate.ratePercent, months, credited: false };
}

// ---------- Months ----------
/** Days from the last day of a wage month to the day it was credited. */
export function creditLagDays(entry: Pick<EpfEntry, "wageMonth" | "date">): number | null {
  if (!entry.wageMonth) return null;
  return daysBetween(lastDayOfMonth(`${entry.wageMonth}-01`), entry.date);
}

/** The day of the month credits usually arrive: the middle one of the latest three. */
export function usualCreditDay(entries: EpfEntry[]): number | null {
  const days = entries
    .filter((e) => e.kind === "Contribution")
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-3)
    .map((e) => Number(e.date.slice(8, 10)))
    .sort((a, b) => a - b);
  return days.length === 0 ? null : days[Math.floor(days.length / 2)];
}

/** "Before" is a wage month earlier than the account's first credit: nothing is expected of it. */
export type EpfMonthState = "Confirmed" | "Typed" | "Expected" | "Late" | "Before";
export interface EpfMonth {
  wageMonth: string;
  state: EpfMonthState;
  /** The day credited, for Confirmed and Typed. */
  date?: string;
  /** About the day it should arrive, for Expected and Late. */
  due?: string;
  /** Both shares. The credit, or the last one's size for an expected month. */
  amount: number;
}

/**
 * The twelve wage months of a financial year (March to February: a year's wages are credited from April to March), each
 * Confirmed, Typed, Expected or Late. `confirmedThrough` is the print date of the latest imported passbook.
 */
export function epfMonthStates(entries: EpfEntry[], fy: string, confirmedThrough: string | null): EpfMonth[] {
  const contributions = entries.filter((e) => e.kind === "Contribution");
  const lastCredit = [...contributions].sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1);
  const expectedAmount = lastCredit ? lastCredit.employee + lastCredit.employer + lastCredit.pension : 0;
  const day = usualCreditDay(entries) ?? 18;
  const first = contributions.map((e) => e.wageMonth).filter((w): w is string => !!w).sort()[0];
  const firstWageMonth = `${fy.slice(0, 4)}-03-01`;
  return Array.from({ length: 12 }, (_, i) => {
    const wageMonth = addMonthsUTC(firstWageMonth, i).slice(0, 7);
    const credit = contributions.find((e) => e.wageMonth === wageMonth);
    if (credit) return { wageMonth, state: credit.source === "Typed" ? "Typed" : "Confirmed", date: credit.date, amount: credit.employee + credit.employer + credit.pension } satisfies EpfMonth;
    if (first !== undefined && wageMonth < first) return { wageMonth, state: "Before", amount: 0 } satisfies EpfMonth;
    const due = `${addMonthsUTC(`${wageMonth}-01`, 1).slice(0, 8)}${String(Math.min(day, 28)).padStart(2, "0")}`;
    // Late only once a passbook was printed AFTER the usual day: one printed on the day itself may be a few hours early.
    return { wageMonth, state: confirmedThrough !== null && due < confirmedThrough ? "Late" : "Expected", due, amount: expectedAmount } satisfies EpfMonth;
  });
}

/** What went in, by the month it was credited (both shares, contributions only). */
export function contributionsByMonth(entries: EpfEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) {
    if (e.kind !== "Contribution") continue;
    const key = e.date.slice(0, 7);
    out[key] = (out[key] ?? 0) + e.employee + e.employer + e.pension;
  }
  return out;
}

// ---------- Estimates ----------
/**
 * The credits still to come this year, each the size of the last one. A month that is due but missing still counts (it is a
 * credit he expects, and the page flags it as late separately), dated today if its usual day has passed.
 */
function futureCredits(entries: EpfEntry[], fy: string, asOf: string): EpfEntry[] {
  const states = epfMonthStates(entries, fy, null).filter((m) => m.state === "Expected");
  const last = [...entries.filter((e) => e.kind === "Contribution")].sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1);
  if (!last) return [];
  return states.map((m) => ({ id: `expected-${m.wageMonth}`, epfAccountId: last.epfAccountId, kind: "Contribution", date: m.due! > asOf ? m.due! : asOf, wageMonth: m.wageMonth, employee: last.employee, employer: last.employer, pension: 0, source: "Typed" }));
}

/** The year's interest if every month still to come brings a credit the size of the last one. An estimate. */
export function yearEndInterestEstimate(entries: EpfEntry[], rates: EpfRate[], asOf: string): InterestEstimate {
  const fy = financialYearOf(asOf);
  const credited = creditedInterest(entries, fy);
  if (credited) return { amount: credited.total, source: null, ratePercent: null, months: 12, credited: true };
  const rate = epfRateForYear(entries, rates, fy);
  if (!rate) return { amount: 0, source: null, ratePercent: null, months: 0, credited: false };
  const { total } = epfInterestForYear(entries, fy, rate.ratePercent, { extra: futureCredits(entries, fy, asOf) });
  return { amount: total, source: rate.source, ratePercent: rate.ratePercent, months: 12, credited: false };
}

export interface EpfProjection {
  years: number;
  total: number;
  contributed: number;
  interest: number;
}

/**
 * Arithmetic, never a forecast: EPF in `years` if every month brings `perCredit` (both shares) and the rate stays what the
 * year in progress uses. A month's interest is the start-of-month balance × rate ÷ 12, credited each 31 March; a credit
 * counts from the month after it. Starts from today's balance and the interest already built up this year.
 */
export function projectEpf(entries: EpfEntry[], rates: EpfRate[], asOf: string, years: number, perCredit: number): EpfProjection | null {
  const rate = epfRateForYear(entries, rates, financialYearOf(asOf));
  if (!rate) return null;
  const now = epfBalance(entries, asOf).total;
  let balance = now;
  let pot = interestNotYetCredited(entries, rates, asOf).amount;
  let contributed = 0;
  for (let i = 0; i < years * 12; i++) {
    const month = addMonthsUTC(`${asOf.slice(0, 8)}01`, i);
    pot += (balance * rate.ratePercent) / 100 / 12;
    balance += perCredit;
    contributed += perCredit;
    if (month.slice(5, 7) === "03") {
      balance += pot;
      pot = 0;
    }
  }
  const total = round(balance + pot);
  return { years, total, contributed, interest: total - now - contributed };
}

// ---------- Checks (the import runs these before it accepts a year) ----------
export interface EpfYearCheckInput {
  opening: number;
  contributions: number;
  interest: number;
  closing: number;
}
/** Opening + credits + interest = closing, for one share. */
export const epfYearReconciles = (y: EpfYearCheckInput): boolean => y.opening + y.contributions + y.interest === y.closing;

/**
 * Typed credits a later passbook contradicts: dated within the days it covers (up to its print date) but with a wage month
 * the passbook doesn't have. They are listed for him to keep or remove, never left in the balance silently.
 */
export function contradictedTypedEntries(entries: EpfEntry[], passbook: EpfEntry[], coveredFrom: string, printedOn: string): EpfEntry[] {
  const inPassbook = new Set(passbook.filter((e) => e.kind === "Contribution").map((e) => e.wageMonth));
  return entries.filter((e) => e.kind === "Contribution" && e.source === "Typed" && e.date >= coveredFrom && e.date <= printedOn && !inPassbook.has(e.wageMonth));
}
