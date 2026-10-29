import { addMonthsUTC } from "./recurring";
import { daysBetween, monthOf, monthRange, percentChange, type MonthKey } from "./cardSpend";
import { addDays } from "./subscriptionRenewals";
import { NCB_STEPS, type Loan, type Policy, type PolicyKind, type PolicyPayment } from "../sheets/types";

/**
 * What the Insurance page shows, worked out from the Policies and PolicyPayments tabs (#210). Pure: no
 * Sheets calls, tested against fixtures. Definitions decided with Prathik 2026-10-29 (docs/design/insurance.md):
 * - A policy is a master row plus a payment for each term. A term buys `years` of cover from its start
 *   (its last day is the day before start + years), so a single premium for three years is one payment.
 * - Only Paid terms count. A Pending one is a quote, not cover.
 * - The renewal date is the end of the latest recorded term, so renewing early moves it as soon as the
 *   new term is recorded. The term "in force" is the latest one that has started.
 * - Calendar years, as on the other dashboards. A term with no paid-on day is dated by its start and
 *   marked assumed, and every figure that depends on the day says how much of it was assumed. One whose
 *   start is still to come was paid by today, so it's dated today.
 * - Lapsed is worked out from the dates, never stored: from the renewal date on, with no later term.
 * - A year of cover is a term's premium over its years; a month is that over 12.
 */

/** Renewals inside this many days are "renew soon": an insurer's reminder comes about a month ahead, and a lapse is what to avoid. */
export const RENEW_SOON_DAYS = 30;

export type PolicyState = "In force" | "Renew soon" | "Lapsed" | "Cancelled" | "Not started" | "No term";

/** A paid term with the dates and amounts worked out from it. */
export interface Term {
  payment: PolicyPayment;
  /** The first day of cover. */
  start: string;
  /** The last day of cover. */
  end: string;
  /** The day the next term would start: the renewal date if no later term is recorded. */
  renewsOn: string;
  /** The day the money left: the paid-on day, or the start when the day isn't known. */
  cashDay: string;
  /** True when the paid-on day wasn't known and `cashDay` is the start. */
  assumed: boolean;
  /** A year of cover: the premium over the years it bought. */
  perYear: number;
}

export interface PolicyView {
  policy: Policy;
  /** Paid terms, earliest start first. */
  terms: Term[];
  /** The latest term that has started: the one in force, or the one that just ended. */
  current: Term | null;
  /** The recorded term that ends last, even one that starts after today (an early renewal). */
  latest: Term | null;
  /** The end of the latest term, plus a day. Null when no term is recorded. */
  renewsOn: string | null;
  /** Days from today to the renewal date: negative once it has passed, and 0 on the day. */
  daysLeft: number | null;
  state: PolicyState;
  /** How much of the term in force has gone by, 0 to 1. A lapsed term is 1; none started is 0. */
  elapsed: number;
  /** A year of cover and a month of it, from the term in force. Null when it isn't cover you hold today. */
  yearly: number | null;
  monthly: number | null;
}

const isBlank = (value: string | undefined) => value === undefined || value === "";

export function termOf(payment: PolicyPayment): Term {
  const renewsOn = addMonthsUTC(payment.periodStart, 12 * payment.years);
  const assumed = isBlank(payment.paidOn);
  return { payment, start: payment.periodStart, end: addDays(renewsOn, -1), renewsOn, cashDay: assumed ? payment.periodStart : (payment.paidOn as string), assumed, perYear: payment.amount / payment.years };
}

/** A policy's Paid terms, earliest start first. Pending terms are quotes and are left out. */
export function paidTerms(policyId: string, payments: PolicyPayment[]): Term[] {
  return payments
    .filter((payment) => payment.policyId === policyId && payment.status === "Paid")
    .map(termOf)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

/**
 * The state of a policy today. Cancelled wins; a policy with no term has nothing to be in force. Covered means
 * today falls inside the term in force, so a next term recorded for a later start doesn't hide a gap in between.
 */
function stateFor(policy: Policy, terms: Term[], current: Term | null, covered: boolean, daysLeft: number | null): PolicyState {
  if (policy.status === "Cancelled") return "Cancelled";
  if (terms.length === 0) return "No term";
  if (!current) return "Not started";
  if (!covered) return "Lapsed";
  return (daysLeft as number) <= RENEW_SOON_DAYS ? "Renew soon" : "In force";
}

export function viewPolicy(policy: Policy, payments: PolicyPayment[], today: string): PolicyView {
  const terms = paidTerms(policy.id, payments);
  const started = terms.filter((term) => term.start <= today);
  // Covered means a term has started and not yet ended, so a term that ends sooner inside a longer one can't make it lapse.
  const covering = started.filter((term) => today < term.renewsOn);
  const current = covering.at(-1) ?? started.at(-1) ?? null;
  // The latest end of any term, so an overlapping or duplicate term that ends sooner can't shorten the policy.
  const latest = terms.reduce<Term | null>((best, term) => (best === null || term.renewsOn >= best.renewsOn ? term : best), null);
  const renewsOn = latest?.renewsOn ?? null;
  const daysLeft = renewsOn === null ? null : daysBetween(today, renewsOn);
  const state = stateFor(policy, terms, current, covering.length > 0, daysLeft);
  const span = current ? daysBetween(current.start, current.renewsOn) : 0;
  const elapsed = current ? Math.min(1, Math.max(0, daysBetween(current.start, today) / span)) : 0;
  const holding = state === "In force" || state === "Renew soon";
  return { policy, terms, current, latest, renewsOn, daysLeft, state, elapsed, yearly: holding && current ? current.perYear : null, monthly: holding && current ? current.perYear / 12 : null };
}

export const viewPolicies = (policies: Policy[], payments: PolicyPayment[], today: string): PolicyView[] => policies.map((policy) => viewPolicy(policy, payments, today));

/** Cover you hold today: in force, or in force and due to renew within a month. */
export const isLive = (view: PolicyView) => view.state === "In force" || view.state === "Renew soon";

/** The policies that renew soonest first, among those you hold. */
export function byRenewal(views: PolicyView[]): PolicyView[] {
  return views.filter(isLive).sort((a, b) => ((a.renewsOn as string) < (b.renewsOn as string) ? -1 : (a.renewsOn as string) > (b.renewsOn as string) ? 1 : 0));
}

export const nextRenewal = (views: PolicyView[]): PolicyView | null => byRenewal(views)[0] ?? null;

/** The policies you hold that renew within `days` (the "renew soon" window by default). */
export const renewingWithin = (views: PolicyView[], days: number = RENEW_SOON_DAYS): PolicyView[] => byRenewal(views).filter((view) => (view.daysLeft as number) <= days);

/** A year of cover across everything you hold: single premiums spread over the years they bought. */
export const yearlyCover = (views: PolicyView[]): number => views.reduce((total, view) => total + (view.yearly ?? 0), 0);
export const monthlyCover = (views: PolicyView[]): number => yearlyCover(views) / 12;

/**
 * Cash that left in a calendar year, up to `today`, and how much of it is dated by a guess. A three-year
 * premium is all in the year it was paid, so this can be far more than a year of cover.
 */
export function cashPaidIn(year: number, payments: PolicyPayment[], today: string): { total: number; assumed: number } {
  let total = 0;
  let assumed = 0;
  for (const payment of payments) {
    if (payment.status !== "Paid") continue;
    const term = termOf(payment);
    // A Paid term recorded with no paid-on day whose cover starts later (an early renewal) has been paid by today, whatever its start.
    const day = term.assumed && term.cashDay > today ? today : term.cashDay;
    if (!day.startsWith(String(year)) || day > today) continue;
    total += payment.amount;
    if (term.assumed) assumed += payment.amount;
  }
  return { total, assumed };
}

/** A renewal still to come: the date a held policy's next term would start, and what the last term cost. */
export interface UpcomingRenewal {
  policyId: string;
  on: string;
  amount: number;
}

/**
 * Every renewal of the policies you hold from each one's renewal date up to `through` (inclusive), stepping on by the latest
 * term's own years from that date and at that term's amount. One rule for both the year's total and the runway, so they can't disagree.
 */
export function upcomingRenewals(views: PolicyView[], through: string): UpcomingRenewal[] {
  const renewals: UpcomingRenewal[] = [];
  for (const view of views) {
    if (!isLive(view) || !view.latest) continue;
    const step = 12 * view.latest.payment.years;
    for (let i = 0; i < 1000; i++) {
      const on = addMonthsUTC(view.latest.renewsOn, step * i);
      if (on > through) break;
      renewals.push({ policyId: view.policy.id, on, amount: view.latest.payment.amount });
    }
  }
  return renewals;
}

/** What the renewals still to come in a calendar year will cost, at each policy's last premium. Policies you no longer hold aren't expected to renew. */
export function renewalsToComeIn(year: number, views: PolicyView[], today: string): number {
  return upcomingRenewals(views, `${year}-12-31`)
    .filter((renewal) => renewal.on > today && renewal.on.startsWith(String(year)))
    .reduce((total, renewal) => total + renewal.amount, 0);
}

export interface RunwayItem {
  policyId: string;
  amount: number;
  /** True for money that left, false for a renewal still to come at the last premium. */
  paid: boolean;
  /** The day it left, or the renewal date. */
  on: string;
  /** True when the paid-on day wasn't known and `on` is the start of the cover. A renewal still to come is never assumed. */
  assumed: boolean;
}
export interface RunwayMonth {
  month: MonthKey;
  items: RunwayItem[];
  total: number;
}

/**
 * Premiums by month: the Paid terms by the day the money left, then each policy you hold stepping on from its
 * renewal date by its latest term's years, at that term's amount. Every renewal appears once, and a policy you
 * no longer hold has its history but no future bars.
 */
export function premiumRunway(views: PolicyView[], from: MonthKey, to: MonthKey): RunwayMonth[] {
  const months = monthRange(from, to).map((month): RunwayMonth => ({ month, items: [], total: 0 }));
  const byMonth = new Map(months.map((entry) => [entry.month, entry]));
  for (const view of views) {
    for (const term of view.terms) byMonth.get(monthOf(term.cashDay))?.items.push({ policyId: view.policy.id, amount: term.payment.amount, paid: true, on: term.cashDay, assumed: term.assumed });
  }
  for (const renewal of upcomingRenewals(views, `${to}-31`)) byMonth.get(monthOf(renewal.on))?.items.push({ ...renewal, paid: false, assumed: false });
  for (const entry of months) entry.total = entry.items.reduce((total, item) => total + item.amount, 0);
  return months;
}

/** A stretch of days with no cover between two terms, because the next was recorded late. */
export interface CoverGap {
  from: string;
  to: string;
  days: number;
}

/** The days with no cover between one term's end and the next start, measured from the latest end so far. An overlap or a renewal on the day is no gap. */
export function coverGaps(terms: Term[]): CoverGap[] {
  const gaps: CoverGap[] = [];
  let coveredUntil = terms[0]?.renewsOn;
  for (const term of terms.slice(1)) {
    const days = daysBetween(coveredUntil, term.start);
    if (days > 0) gaps.push({ from: coveredUntil, to: addDays(term.start, -1), days });
    if (term.renewsOn > coveredUntil) coveredUntil = term.renewsOn;
  }
  return gaps;
}

/** How each term's cost of a year compares with the term before it, as a fraction (0.1 is 10% more). The first has none. */
export function priceChanges(terms: Term[]): (number | null)[] {
  return terms.map((term, i) => (i === 0 ? null : percentChange(term.perYear, terms[i - 1].perYear)));
}

/** What a year of cover costs against the cover it buys, or null when there's no cover figure (third party only). */
export const premiumOverCover = (view: PolicyView): number | null => (view.yearly === null || view.policy.sumInsured <= 0 ? null : view.yearly / view.policy.sumInsured);

/** The no-claim step a motor policy moves to at renewal if the term has no claim: the next step up, and the top step stays. */
export function nextNcb(current: number): number {
  return NCB_STEPS.find((step) => step > current) ?? NCB_STEPS[NCB_STEPS.length - 1];
}

/** The cover you hold, added up by kind. Unlike things are never added into one grand total: the page shows a vehicle's cover on its own. */
export function coverByKind(views: PolicyView[]): Record<PolicyKind, number> {
  const totals: Record<PolicyKind, number> = { Health: 0, Life: 0, Motor: 0, Home: 0, Accident: 0 };
  for (const view of views) if (isLive(view)) totals[view.policy.kind] += view.policy.sumInsured;
  return totals;
}

/**
 * Active loans on something with no policy you hold: an Auto loan with no motor policy in force, a Home loan
 * with no home policy in force. Worked out from the loans, never stored. It can't say which vehicle a loan
 * financed, and it says nothing about whether a policy is needed.
 */
export function uninsuredLoans<L extends Pick<Loan, "category" | "status">>(loans: L[], views: PolicyView[]): L[] {
  const held = new Set(views.filter(isLive).map((view) => view.policy.kind));
  return loans.filter((loan) => loan.status === "Active" && ((loan.category === "Auto" && !held.has("Motor")) || (loan.category === "Home" && !held.has("Home"))));
}
