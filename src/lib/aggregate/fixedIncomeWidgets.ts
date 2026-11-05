import type { EpfEntry, EpfRate, FixedDeposit } from "../sheets/types";
import { daysBetween } from "./cardSpend";
import { creditLagDays, creditedInterest, epfBalance, epfRateForYear, epfMonthStates, financialYearEnd, financialYearOf, financialYearStart, projectEpf, usualCreditDay, yearEndInterestEstimate, type EpfMonth, type EpfMonthState, type EpfProjection } from "./epf";
import { expectedAtMaturity, type FixedIncome } from "./fixedIncome";
import { addMonthsUTC } from "./recurring";

/**
 * What the Fixed Income page's widgets say (docs/design/fixed-income.md, J1), worked out from the rows and never stored: money in
 * each month, when credits arrive, the passbook check, what is coming up, and where EPF gets to if nothing changes. Pure, so it is
 * tested against his real passbooks. The EPF widgets read one account (the first), as he has one.
 */

const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0);
const nextMonth = (month: string): string => addMonthsUTC(`${month}-01`, 1).slice(0, 7);
const lastDayOfMonth = (month: string): string => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
const median = (xs: number[]): number => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
};

// ---------- Money in each month ----------
export interface MonthMoney {
  month: string;
  /** EPF credits that arrived this month, both shares. */
  epf: number;
  /** Deposits placed this month. */
  deposits: number;
  depositCount: number;
  total: number;
}

/** What went into EPF and the deposits in each month, from the first month there is money to this month (the empty ones are zero). */
export function moneyInByMonth(entries: EpfEntry[], deposits: FixedDeposit[], today: string): MonthMoney[] {
  const credits = entries.filter((e) => e.kind === "Contribution");
  const firsts = [...credits.map((e) => e.date), ...deposits.map((d) => d.startDate)].sort();
  if (firsts.length === 0) return [];
  const months: MonthMoney[] = [];
  for (let month = firsts[0].slice(0, 7); month <= today.slice(0, 7); month = nextMonth(month)) {
    const epf = sum(credits.filter((e) => e.date.slice(0, 7) === month).map((e) => e.employee + e.employer + e.pension));
    const placed = deposits.filter((d) => d.startDate.slice(0, 7) === month);
    const placedTotal = sum(placed.map((d) => d.principalAmount));
    months.push({ month, epf, deposits: placedTotal, depositCount: placed.length, total: epf + placedTotal });
  }
  return months;
}

export interface MoneyInStats {
  /** The average of this year's finished months. */
  perMonth: { amount: number; from: string; to: string } | null;
  /** How many months since the first deposit had one placed, and the ones that didn't. */
  depositMonths: { count: number; of: number; since: string; without: string[] } | null;
  biggest: MonthMoney | null;
}

export function moneyInStats(months: MonthMoney[], today: string): MoneyInStats {
  const year = today.slice(0, 4);
  const finished = months.filter((m) => m.month.startsWith(year) && m.month < today.slice(0, 7));
  const firstDeposit = months.find((m) => m.depositCount > 0);
  const since = firstDeposit ? months.filter((m) => m.month >= firstDeposit.month) : [];
  const biggest = months.reduce<MonthMoney | null>((best, m) => (best === null || m.total > best.total ? m : best), null);
  return {
    perMonth: finished.length > 0 ? { amount: sum(finished.map((m) => m.total)) / finished.length, from: finished[0].month, to: finished.at(-1)!.month } : null,
    depositMonths: firstDeposit ? { count: since.filter((m) => m.depositCount > 0).length, of: since.length, since: firstDeposit.month, without: since.filter((m) => m.depositCount === 0).map((m) => m.month) } : null,
    biggest: biggest && biggest.total > 0 ? biggest : null,
  };
}

// ---------- Credits on time ----------
export interface CreditDot {
  wageMonth: string;
  state: EpfMonthState;
  /** Days from the end of the wage month to the day it was credited, for a credit that is there. */
  lagDays: number | null;
}
export interface CreditYear {
  financialYear: string;
  dots: CreditDot[];
}

/** One row for each financial year from the first credit: its twelve wage months, each a credit with its lag, or still to come. */
export function creditYears(entries: EpfEntry[], confirmedThrough: string | null, today: string): CreditYear[] {
  const credits = entries.filter((e) => e.kind === "Contribution" && e.wageMonth);
  if (credits.length === 0) return [];
  const firstYear = Number(financialYearOf(credits.map((e) => e.date).sort()[0]).slice(0, 4));
  const rows: CreditYear[] = [];
  for (let start = firstYear; start <= Number(financialYearOf(today).slice(0, 4)); start++) {
    const fy = `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
    rows.push({
      financialYear: fy,
      dots: epfMonthStates(entries, fy, confirmedThrough).map((m: EpfMonth) => ({ wageMonth: m.wageMonth, state: m.state, lagDays: m.date ? daysBetween(lastDayOfMonth(m.wageMonth), m.date) : null })),
    });
  }
  return rows;
}

export interface CreditTiming {
  /** The wage month from which credits come later than they used to, or null when they haven't changed. */
  since: string | null;
  /** The lag (days after the month ends) of the credits since then, or of all of them. */
  lagRange: { min: number; max: number };
  /** The lag before the change. */
  earlierLag: number | null;
  /** The usual day of the month credits arrive now. */
  usualDay: number | null;
}

/** When credits arrive: whether they moved from the first of the month to the middle of it (a lag of a day or two, then 17 or more). */
export function creditTiming(entries: EpfEntry[]): CreditTiming | null {
  const credits = entries.filter((e) => e.kind === "Contribution" && e.wageMonth).sort((a, b) => (a.wageMonth! < b.wageMonth! ? -1 : 1));
  const lags = credits.map((e) => creditLagDays(e)!);
  if (lags.length === 0) return null;
  // The change: everything from one credit on is late (10 days or more) and something before it was on time (5 or fewer).
  let at = -1;
  for (let i = 1; i < lags.length; i++) {
    if (lags.slice(i).every((l) => l >= 10) && lags.slice(0, i).some((l) => l <= 5)) {
      at = i;
      break;
    }
  }
  const recent = at >= 0 ? lags.slice(at) : lags;
  return { since: at >= 0 ? credits[at].wageMonth! : null, lagRange: { min: Math.min(...recent), max: Math.max(...recent) }, earlierLag: at >= 0 ? median(lags.slice(0, at)) : null, usualDay: usualCreditDay(entries) };
}

// ---------- The passbook check ----------
export interface PassbookCheck {
  financialYear: string;
  opening: number;
  credits: number;
  interest: number;
  closing: number;
  /** Rows typed by hand: the year only adds up with them, so it isn't confirmed by a passbook. */
  typed: number;
  /** The year is still running: its closing is today's balance and its interest isn't credited yet. */
  running: boolean;
}

/** For each year: opening + credits + interest = closing (both shares), and how many of its rows were typed rather than read from a passbook. */
export function passbookChecks(entries: EpfEntry[], today: string): PassbookCheck[] {
  if (entries.length === 0) return [];
  const firstYear = Number(financialYearOf(entries.map((e) => e.date).sort()[0]).slice(0, 4));
  const checks: PassbookCheck[] = [];
  for (let start = firstYear; start <= Number(financialYearOf(today).slice(0, 4)); start++) {
    const fy = `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
    const from = financialYearStart(fy);
    const to = financialYearEnd(fy);
    const inYear = entries.filter((e) => e.date >= from && e.date <= to);
    const dayBefore = new Date(Date.parse(`${from}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    checks.push({
      financialYear: fy,
      opening: epfBalance(entries, dayBefore).total,
      credits: sum(inYear.filter((e) => e.kind === "Contribution").map((e) => e.employee + e.employer)),
      interest: sum(inYear.filter((e) => e.kind === "Interest").map((e) => e.employee + e.employer)),
      closing: epfBalance(entries, to < today ? to : today).total,
      typed: inYear.filter((e) => e.source === "Typed").length,
      running: to >= today,
    });
  }
  return checks;
}

// ---------- Coming up ----------
export interface ComingUpItem {
  kind: "epf-credit" | "epf-year-end" | "maturity";
  /** The deposit that matures, for a maturity. */
  depositId?: string;
  /** The wage month the next credit is for, "2026-10". */
  wageMonth?: string;
  date: string;
  title: string;
  note: string;
  amount: number;
  /** An estimate, not a figure anyone has stated. */
  estimate: boolean;
  /** A credit that should have come by now. */
  late?: boolean;
}

/** The next dates: the next EPF credit, the year's end with the interest expected, and each deposit's maturity, soonest first. */
export function comingUp(f: FixedIncome, entries: EpfEntry[], rates: EpfRate[], today: string): ComingUpItem[] {
  const items: ComingUpItem[] = [];
  const holding = f.epf.holdings[0];
  if (holding?.nextCredit) {
    const c = holding.nextCredit;
    items.push({ kind: "epf-credit", wageMonth: c.wageMonth, date: c.due, title: "EPF contribution", note: `${c.wageMonth} wages`, amount: c.amount, estimate: true, late: c.late });
  }
  if (holding) {
    const own = entries.filter((e) => e.epfAccountId === holding.accountId);
    const yearEnd = yearEndInterestEstimate(own, rates, today);
    if (!yearEnd.credited && yearEnd.amount > 0 && !creditedInterest(own, financialYearOf(today))) items.push({ kind: "epf-year-end", date: financialYearEnd(financialYearOf(today)), title: "EPF year ends", note: "interest is declared and credited after", amount: yearEnd.amount, estimate: true });
  }
  for (const d of f.deposits.held.filter((x) => x.maturityDate > today)) {
    const e = expectedAtMaturity(d);
    items.push({ kind: "maturity", depositId: d.id, date: d.maturityDate, title: `${d.name} matures`, note: "interest included", amount: e.amount, estimate: e.estimate });
  }
  return items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.title < b.title ? -1 : 1));
}

// ---------- The growth path ----------
export interface GrowthStep {
  years: number;
  /** "2036" */
  year: string;
  projection: EpfProjection;
}
export interface GrowthPath {
  /** Both shares together, each month: the account's setting, else the last credit. */
  perCredit: number;
  ratePercent: number;
  balanceNow: number;
  steps: GrowthStep[];
  /** What a credit this much higher each month would add by the end of the longest-but-one step. */
  extra: { amount: number; years: number; adds: number } | null;
}

export const GROWTH_YEARS = [5, 10, 20] as const;

/** Arithmetic with two numbers he can change (the monthly credit and the rate), never a forecast: where EPF gets to if nothing changes. */
export function growthPath(entries: EpfEntry[], rates: EpfRate[], projectionCredit: number | undefined, today: string): GrowthPath | null {
  const credits = entries.filter((e) => e.kind === "Contribution").sort((a, b) => (a.date < b.date ? -1 : 1));
  const last = credits.at(-1);
  const perCredit = projectionCredit ?? (last ? last.employee + last.employer : 0);
  if (perCredit <= 0) return null;
  const steps: GrowthStep[] = [];
  for (const years of GROWTH_YEARS) {
    const projection = projectEpf(entries, rates, today, years, perCredit);
    if (!projection) return null;
    steps.push({ years, year: String(Number(today.slice(0, 4)) + years), projection });
  }
  const ten = steps.find((s) => s.years === 10)!;
  const more = projectEpf(entries, rates, today, 10, perCredit + 5000);
  return { perCredit, ratePercent: ratePercentOf(entries, rates, today), balanceNow: epfBalance(entries, today).total, steps, extra: more ? { amount: 5000, years: 10, adds: more.total - ten.projection.total } : null };
}

const ratePercentOf = (entries: EpfEntry[], rates: EpfRate[], today: string): number => epfRateForYear(entries, rates, financialYearOf(today))?.ratePercent ?? 0;
