import type { EpfAccount, EpfEntry, EpfRate, FixedDeposit } from "../sheets/types";
import { daysBetween } from "./cardSpend";
import { entriesOfAccount, epfBalance, epfMonthStates, epfRateForYear, financialYearEnd, financialYearOf, financialYearStart, interestNotYetCredited, type EpfMonth, type EpfRateKind, type InterestEstimate } from "./epf";
import { compoundedValue, estimatedCurrentValue } from "./fixedDeposits";
import { addMonthsUTC } from "./recurring";

/**
 * Everything the Fixed Income page says, worked out from the rows and never stored (ADR 0011): EPF (contributions plus credited
 * interest, per account), the deposits (worth today by quarterly compounding), and the two together. Pure, so it is tested against
 * his real passbooks and deposits. Nothing here is advice: it is what he holds, what it earns at today's rates, and when.
 */

export interface FixedIncomeInput {
  epfAccounts: EpfAccount[];
  epfEntries: EpfEntry[];
  epfRates: EpfRate[];
  deposits: FixedDeposit[];
}

export interface EpfHolding {
  accountId: string;
  name: string;
  employee: number;
  employer: number;
  pension: number;
  /** Employee + employer: what earns interest and what the page calls the balance. */
  total: number;
  /** The rate in use for this financial year, and where it came from. */
  ratePercent: number | null;
  rateSource: EpfRateKind | null;
  /** Interest credited in all years, both shares. */
  creditedInterest: number;
  /** The interest built up this year and not credited yet: an estimate. */
  estimate: InterestEstimate;
  /**
   * The year that ended last 31 March and whose interest EPFO hasn't credited yet (it declares the rate and credits it weeks or months
   * later), worked out the same way. Null when it is credited, or there was no money in it.
   */
  pendingPrior: { financialYear: string; amount: number; ratePercent: number; rateSource: EpfRateKind } | null;
  /** The next credit expected (or the one that is late), and whether it is late. */
  nextCredit: { wageMonth: string; due: string; amount: number; late: boolean } | null;
  /** Wage months that are late: their usual day has passed by a passbook printed after it, and no credit is there. */
  lateMonths: EpfMonth[];
  /** How far the balance is confirmed by a passbook, as the account says. */
  confirmedThrough: string | null;
  /** The latest interest EPFO credited (both shares) and the day. */
  lastInterest: { date: string; amount: number } | null;
  /** The latest credit that arrived (both shares) and the day. */
  lastCredit: { date: string; amount: number } | null;
  /** What went in during the financial year of `today`: credits that arrived in it. */
  putInThisYear: { amount: number; count: number };
}

export interface DepositsSummary {
  held: FixedDeposit[];
  /** What each held deposit is worth today, by id. */
  worthOf: Record<string, number>;
  worth: number;
  placed: number;
  /** Worth minus placed: the interest built up so far (a payout deposit's is paid out, so it counts nothing here). */
  accrued: number;
  /** The soonest to mature of those held, and how many whole months away it is. */
  nextMaturity: { deposit: FixedDeposit; months: number } | null;
  /** Held and past the maturity day: waiting to be closed. */
  due: FixedDeposit[];
  /** Held with no bank and no maturity amount (everything his app doesn't show). */
  incomplete: FixedDeposit[];
}

export interface FixedIncome {
  /** `estimate` is the interest built up and not credited: this year's, and last year's if EPFO hasn't credited it yet. */
  epf: { holdings: EpfHolding[]; total: number; employee: number; employer: number; pension: number; creditedInterest: number; estimate: number; perDay: number };
  deposits: DepositsSummary;
  /** EPF (employee + employer) and deposits at what they are worth today. */
  total: number;
  /** What he has put in: the balance less what EPFO credited as interest, plus what the deposits were placed at. */
  putIn: number;
  /** Interest credited by EPFO plus what the deposits have built up. Not the estimate for the year in progress. */
  earned: number;
  /** What it earns at today's rates, for a day and for an average month. */
  perDay: number;
  perMonth: number;
}

const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0);
const lastDayOfMonth = (month: string): string => {
  const date = new Date(`${month}-01T00:00:00Z`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
};
/** Whole months from `from` to `to` (a day short of a month is not one). */
const wholeMonths = (from: string, to: string): number => {
  let months = 0;
  while (addMonthsUTC(from, months + 1) <= to) months++;
  return months;
};

function epfHolding(account: EpfAccount, entries: EpfEntry[], rates: EpfRate[], today: string): EpfHolding {
  const own = entriesOfAccount(entries, account.id);
  const fy = financialYearOf(today);
  const balance = epfBalance(own, today);
  const rate = epfRateForYear(own, rates.filter((r) => r.epfAccountId === account.id), fy);
  const confirmedThrough = account.confirmedThrough ?? null;
  const ownRates = rates.filter((r) => r.epfAccountId === account.id);
  const priorFy = financialYearOf(addMonthsUTC(financialYearStart(fy), -1));
  const priorEnd = financialYearEnd(priorFy);
  const prior = own.some((e) => e.date <= priorEnd) ? interestNotYetCredited(own, ownRates, priorEnd) : null;
  // This year's months, then next year's: the Feb wages are credited in March, and the next one may belong to the following year.
  const states = [fy, financialYearOf(addMonthsUTC(`${today.slice(0, 7)}-01`, 12))].flatMap((year) => epfMonthStates(own, year, confirmedThrough));
  // A closed account (an old employer's) keeps its balance but is not expected to receive anything more.
  const open = account.status !== "Closed";
  const next = open ? states.find((m) => m.state === "Late" || m.state === "Expected") : undefined;
  return {
    accountId: account.id,
    name: account.name,
    employee: balance.employee,
    employer: balance.employer,
    pension: balance.pension,
    total: balance.total,
    ratePercent: rate?.ratePercent ?? null,
    rateSource: rate?.source ?? null,
    creditedInterest: sum(own.filter((e) => e.kind === "Interest").map((e) => e.employee + e.employer)),
    estimate: interestNotYetCredited(own, ownRates, today),
    pendingPrior: prior && !prior.credited && prior.amount > 0 && prior.ratePercent !== null && prior.source !== null ? { financialYear: priorFy, amount: prior.amount, ratePercent: prior.ratePercent, rateSource: prior.source } : null,
    nextCredit: next?.due ? { wageMonth: next.wageMonth, due: next.due, amount: next.amount, late: next.state === "Late" } : null,
    lateMonths: open ? states.filter((m) => m.state === "Late") : [],
    confirmedThrough,
    lastInterest: lastOf(own.filter((e) => e.kind === "Interest")),
    lastCredit: lastOf(own.filter((e) => e.kind === "Contribution")),
    putInThisYear: (() => {
      const year = own.filter((e) => e.kind === "Contribution" && financialYearOf(e.date) === fy);
      return { amount: sum(year.map((e) => e.employee + e.employer + e.pension)), count: year.length };
    })(),
  };
}

const lastOf = (rows: EpfEntry[]): { date: string; amount: number } | null => {
  const last = [...rows].sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1);
  return last ? { date: last.date, amount: last.employee + last.employer + last.pension } : null;
};

function depositsSummary(deposits: FixedDeposit[], today: string): DepositsSummary {
  const held = deposits.filter((d) => d.status !== "Closed").sort((a, b) => (a.maturityDate < b.maturityDate ? -1 : a.maturityDate > b.maturityDate ? 1 : a.startDate < b.startDate ? -1 : 1));
  const worthOf = Object.fromEntries(held.map((d) => [d.id, estimatedCurrentValue(d, today)]));
  const worth = sum(Object.values(worthOf));
  const placed = sum(held.map((d) => d.principalAmount));
  const upcoming = held.find((d) => d.maturityDate > today);
  return {
    held,
    worthOf,
    worth,
    placed,
    accrued: worth - placed,
    nextMaturity: upcoming ? { deposit: upcoming, months: wholeMonths(today, upcoming.maturityDate) } : null,
    due: held.filter((d) => d.maturityDate <= today),
    incomplete: held.filter((d) => !d.bankName && d.maturityAmount === undefined),
  };
}

/** What a deposit earns in a day at today's value: a payout deposit earns on what was placed, an added-to one on what it has grown to. */
const depositPerDay = (d: FixedDeposit, today: string): number => ((d.compoundingType === "Cumulative" ? estimatedCurrentValue(d, today) : d.principalAmount) * d.interestRate) / 100 / 365;

export function fixedIncome(input: FixedIncomeInput, today: string): FixedIncome {
  const holdings = input.epfAccounts.map((a) => epfHolding(a, input.epfEntries, input.epfRates, today));
  const deposits = depositsSummary(input.deposits, today);
  const epfTotal = sum(holdings.map((h) => h.total));
  const epfCredited = sum(holdings.map((h) => h.creditedInterest));
  const epfPerDay = sum(holdings.map((h) => (h.total * (h.ratePercent ?? 0)) / 100 / 365));
  const perDay = epfPerDay + sum(deposits.held.filter((d) => d.maturityDate > today).map((d) => depositPerDay(d, today)));
  return {
    epf: {
      holdings,
      total: epfTotal,
      employee: sum(holdings.map((h) => h.employee)),
      employer: sum(holdings.map((h) => h.employer)),
      pension: sum(holdings.map((h) => h.pension)),
      creditedInterest: epfCredited,
      estimate: sum(holdings.map((h) => h.estimate.amount + (h.pendingPrior?.amount ?? 0))),
      perDay: epfPerDay,
    },
    deposits,
    total: epfTotal + deposits.worth,
    putIn: epfTotal - epfCredited + deposits.placed,
    earned: epfCredited + deposits.accrued,
    perDay,
    perMonth: (perDay * 365) / 12,
  };
}

// ---------- Series for the page's charts ----------
export interface BuiltUpPoint {
  /** "2026-10" */
  month: string;
  epf: number;
  deposits: number;
}

/** What he had built up at the end of each month from his first contribution (the last point is today): EPF, and the deposits then held. */
export function builtUpSeries(input: Pick<FixedIncomeInput, "epfEntries" | "deposits">, today: string): BuiltUpPoint[] {
  const firsts = [...input.epfEntries.map((e) => e.date), ...input.deposits.map((d) => d.startDate)].sort();
  if (firsts.length === 0) return [];
  const points: BuiltUpPoint[] = [];
  for (let month = firsts[0].slice(0, 7); month <= today.slice(0, 7); month = addMonthsUTC(`${month}-01`, 1).slice(0, 7)) {
    const asOf = lastDayOfMonth(month) < today ? lastDayOfMonth(month) : today;
    const accounts = new Set(input.epfEntries.map((e) => e.epfAccountId));
    const epf = sum([...accounts].map((id) => epfBalance(entriesOfAccount(input.epfEntries, id), asOf).total));
    const deposits = sum(input.deposits.filter((d) => d.startDate <= asOf && !(d.closedDate && d.closedDate <= asOf)).map((d) => estimatedCurrentValue(d, asOf)));
    points.push({ month, epf, deposits });
  }
  return points;
}

export interface EpfBar {
  month: string;
  /** Credits that arrived this month, both shares. */
  put: number;
  /** Interest EPFO credited this month (March). */
  interest: number;
  /** The next credit, expected and not here yet. */
  expected?: boolean;
}

/** One bar for each month from the first credit: what went in and what EPFO credited as interest, and the next credit expected. */
export function epfBars(entries: EpfEntry[], nextCredit: { due: string; amount: number } | null, today: string): EpfBar[] {
  const credits = entries.filter((e) => e.kind === "Contribution").map((e) => e.date).sort();
  if (credits.length === 0) return [];
  const bars: EpfBar[] = [];
  for (let month = credits[0].slice(0, 7); month <= today.slice(0, 7); month = addMonthsUTC(`${month}-01`, 1).slice(0, 7)) {
    const ofMonth = entries.filter((e) => e.date.slice(0, 7) === month);
    bars.push({ month, put: sum(ofMonth.filter((e) => e.kind === "Contribution").map((e) => e.employee + e.employer + e.pension)), interest: sum(ofMonth.filter((e) => e.kind === "Interest").map((e) => e.employee + e.employer)) });
  }
  if (nextCredit && nextCredit.due.slice(0, 7) >= today.slice(0, 7)) {
    const month = nextCredit.due.slice(0, 7);
    const here = bars.find((b) => b.month === month);
    if (here && here.put === 0) Object.assign(here, { put: nextCredit.amount, expected: true });
    else if (!here) bars.push({ month, put: nextCredit.amount, interest: 0, expected: true });
  }
  return bars;
}

export interface DepositBar {
  id: string;
  name: string;
  startDate: string;
  maturityDate: string;
  principal: number;
  worth: number;
  /** 0–1 through its term today. */
  through: number;
  due: boolean;
}

/** One bar for each deposit held, from the day it started to the day it matures. */
export function depositBars(deposits: FixedDeposit[], today: string): DepositBar[] {
  return deposits
    .filter((d) => d.status !== "Closed")
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))
    .map((d) => {
      const total = daysBetween(d.startDate, d.maturityDate);
      return { id: d.id, name: d.name, startDate: d.startDate, maturityDate: d.maturityDate, principal: d.principalAmount, worth: estimatedCurrentValue(d, today), through: total > 0 ? Math.min(1, Math.max(0, daysBetween(d.startDate, today) / total)) : 1, due: d.maturityDate <= today };
    });
}

/** What a deposit is expected to be worth at maturity: the bank's figure if entered, an estimate otherwise. */
export function expectedAtMaturity(d: FixedDeposit): { amount: number; estimate: boolean } {
  if (d.maturityAmount !== undefined) return { amount: d.maturityAmount, estimate: false };
  return { amount: d.compoundingType === "Non-Cumulative" ? d.principalAmount : compoundedValue(d.principalAmount, d.interestRate, daysBetween(d.startDate, d.maturityDate)), estimate: true };
}
