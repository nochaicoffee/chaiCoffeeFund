import { CYCLE_STEP_MONTHS } from "./recurring";
import { monthOf, monthRange, type MonthKey, type SpendPeriod } from "./cardSpend";
import { allFacts, latestPayments, type SubscriptionData } from "./subscriptionPage";
import { addDays, allRenewals, chargedOffPlan, monthEnd, priceChanges, yearSummary, type Renewal } from "./subscriptionRenewals";
import { categoryLabel } from "../format/subscriptionLabels";
import type { Subscription, SubscriptionPayment } from "../sheets/types";

/**
 * The Renewals page (#130, layout R1): every renewal in a period as one list, like the
 * Statements page, with its filters, groups and tiles. Pure, so it's tested against
 * fixtures and the design's sample data. The renewal rules themselves (which payment
 * settles which renewal, when one is "not recorded") are in subscriptionRenewals.ts.
 */

/** "Coming up": today and the 29 days after it, as "the next 30 days" is on the Subscriptions page. */
export const COMING_UP_DAYS = 30;

/** The status filter: every renewal, the ones still to come, the ones settled, or the ones that passed with no payment. */
export type RenewalFilter = "all" | "upcoming" | "paid" | "not-recorded";
export type RenewalSort = "newest" | "oldest";

/** A card or an account something is charged to. */
export interface Place {
  kind: "card" | "account";
  id: string;
}

export const placeKey = (place: Place) => `${place.kind}:${place.id}`;

/** What the list shows. Left out, status is every renewal and sort is newest first. */
export interface RenewalQuery {
  period: SpendPeriod;
  status?: RenewalFilter;
  subscriptionId?: string;
  place?: Place;
  search?: string;
  sort?: RenewalSort;
}

/** How a renewal's payment compares: with the charge before it (the price-change rule), or for the latest one, with the plan. */
export type RowChange = { kind: "vs-last" | "off-plan"; amount: number };

export interface RenewalRow extends Renewal {
  /** Which status filter shows it. A won't-renew one shows only under All. */
  filter: Exclude<RenewalFilter, "all"> | null;
  /** Where its payment was charged, or for one still to come, where the subscription usually is. */
  place: Place | null;
  /** The place is the usual one, since nothing's been charged yet. */
  expectedPlace: boolean;
  change: RowChange | null;
}

/**
 * The dates a period covers. A year runs Jan 1 to Dec 31, so this year's includes the
 * renewals still to come in it; a range of months runs from its first day to its last.
 * All time runs from the first subscription's start to the end of this year, since the
 * schedule goes on for ever.
 */
export function periodDates(period: SpendPeriod, today: string, subscriptions: Pick<Subscription, "startDate">[]): { from: string; to: string } {
  if (period.kind === "year") return { from: `${period.year}-01-01`, to: `${period.year}-12-31` };
  if (period.kind === "range") return { from: `${period.from}-01`, to: monthEnd(period.to) };
  const first = subscriptions.map((s) => s.startDate).sort()[0];
  return { from: first ?? `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
}

function paymentPlace(p: SubscriptionPayment): Place | null {
  if (p.paidFromCardId) return { kind: "card", id: p.paidFromCardId };
  if (p.paidFromAccountId) return { kind: "account", id: p.paidFromAccountId };
  return null;
}

function usualPlace(s: Subscription): Place | null {
  if (s.defaultPaidFromCardId) return { kind: "card", id: s.defaultPaidFromCardId };
  if (s.defaultPaidFromAccountId) return { kind: "account", id: s.defaultPaidFromAccountId };
  return null;
}

const FILTER_OF: Record<Renewal["status"], RenewalRow["filter"]> = {
  paid: "paid",
  // It didn't charge: settled, so it's with the paid ones rather than flagged.
  skipped: "paid",
  // Recorded but not paid yet, which the app never writes: still to come.
  pending: "upcoming",
  upcoming: "upcoming",
  missing: "not-recorded",
  "wont-renew": null,
};

/**
 * Every renewal in the period, oldest first, each with where it's charged and how its
 * payment compares. The data should already be usable (usableSubscriptionData).
 */
export function renewalRows(data: SubscriptionData, period: SpendPeriod, today: string): RenewalRow[] {
  const { from, to } = periodDates(period, today, data.subscriptions);
  const byId = new Map(data.subscriptions.map((s) => [s.id, s]));
  const vsLast = new Map(latestPayments(data.payments, Infinity).rows.map((r) => [r.payment, r.change]));
  const offPlan = new Map<SubscriptionPayment, number>();
  for (const s of data.subscriptions) {
    const latest = chargedOffPlan(s, data.payments);
    if (latest) offPlan.set(latest, latest.amount - s.amount);
  }
  return allRenewals(data.subscriptions, data.payments, from, to, today).map((r) => {
    const s = byId.get(r.subscriptionId)!;
    const place = r.payment ? paymentPlace(r.payment) : r.status === "upcoming" ? usualPlace(s) : null;
    let change: RowChange | null = null;
    if (r.payment && offPlan.has(r.payment)) change = { kind: "off-plan", amount: offPlan.get(r.payment)! };
    else if (r.payment && vsLast.get(r.payment) != null) change = { kind: "vs-last", amount: vsLast.get(r.payment)! };
    return { ...r, filter: FILTER_OF[r.status], place, expectedPlace: !r.payment && place !== null, change };
  });
}

/**
 * Every word of the search must match the subscription (its name, alias, category or
 * cycle) or the renewal's amount in whole rupees (what was paid, or the plan's price for
 * one not paid yet), ignoring "₹" and commas: "netflix 649" finds Netflix renewals for
 * ₹649, not the ones paid at an older price.
 */
function matchesSearch(row: RenewalRow, s: Subscription, search: string): boolean {
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const words = [s.name, s.alias, categoryLabel(s.category), s.billingCycle].join(" ").toLowerCase();
  const amount = row.amount > 0 ? String(Math.trunc(row.amount)) : "";
  return terms.every((term) => {
    if (words.includes(term)) return true;
    const rupees = term.replace(/[₹,]/g, "").split(".")[0];
    return /^\d+$/.test(rupees) && amount.includes(rupees);
  });
}

const statusMatches = (row: RenewalRow, status: RenewalFilter = "all") => status === "all" || row.filter === status;
const subscriptionMatches = (row: RenewalRow, id?: string) => id === undefined || row.subscriptionId === id;
const placeMatches = (row: RenewalRow, place?: Place) => !place || (row.place !== null && placeKey(row.place) === placeKey(place));

function searched(rows: RenewalRow[], data: SubscriptionData, search = ""): RenewalRow[] {
  const byId = new Map(data.subscriptions.map((s) => [s.id, s]));
  return rows.filter((r) => matchesSearch(r, byId.get(r.subscriptionId)!, search));
}

/** The period's renewals that match every filter and the search, oldest first. */
export function filterRenewals(rows: RenewalRow[], data: SubscriptionData, query: RenewalQuery): RenewalRow[] {
  return searched(rows, data, query.search).filter((r) => statusMatches(r, query.status) && subscriptionMatches(r, query.subscriptionId) && placeMatches(r, query.place));
}

export interface RenewalCounts {
  /** For the status control: how many each would show, with the other filters. (The Charged to menu shows each card's bank instead, as in the design.) */
  byStatus: Record<RenewalFilter, number>;
  /** For the subscription menu, with the other filters. */
  bySubscription: Record<string, number>;
  allSubscriptions: number;
}

/** The numbers beside each filter, so each says what choosing it would show. All of them respect the search. */
export function renewalCounts(rows: RenewalRow[], data: SubscriptionData, query: RenewalQuery): RenewalCounts {
  const base = searched(rows, data, query.search);
  const forStatus = base.filter((r) => subscriptionMatches(r, query.subscriptionId) && placeMatches(r, query.place));
  const forSubscription = base.filter((r) => statusMatches(r, query.status) && placeMatches(r, query.place));
  const bySubscription: Record<string, number> = Object.fromEntries(data.subscriptions.map((s) => [s.id, 0]));
  for (const r of forSubscription) bySubscription[r.subscriptionId] += 1;
  return {
    byStatus: {
      all: forStatus.length,
      upcoming: forStatus.filter((r) => r.filter === "upcoming").length,
      paid: forStatus.filter((r) => r.filter === "paid").length,
      "not-recorded": forStatus.filter((r) => r.filter === "not-recorded").length,
    },
    bySubscription,
    allSubscriptions: forSubscription.length,
  };
}

/** The cards and accounts the period's renewals are charged to, for the Charged to menu: cards first, in the order the data lists them. */
export function placesIn(rows: RenewalRow[], data: SubscriptionData): Place[] {
  const used = new Set(rows.flatMap((r) => (r.place ? [placeKey(r.place)] : [])));
  return [...data.cards.map((c): Place => ({ kind: "card", id: c.id })), ...data.accounts.map((a): Place => ({ kind: "account", id: a.id }))].filter((p) => used.has(placeKey(p)));
}

export interface RenewalGroup {
  /** Coming up in the next 30 days, later than that, or a past month. */
  key: "coming" | "later" | MonthKey;
  rows: RenewalRow[];
  count: number;
  /** What its paid renewals cost. */
  paid: number;
  /** What's still to come in it: upcoming ones at the plan's price, and any recorded as Pending. */
  toCome: number;
  notRecorded: number;
  /** Later renewals folded away under the coming-up ones; `rows` is empty and the totals still count them. */
  collapsed?: boolean;
}

function group(key: RenewalGroup["key"], rows: RenewalRow[]): RenewalGroup {
  return {
    key,
    rows,
    count: rows.length,
    paid: rows.filter((r) => r.status === "paid").reduce((t, r) => t + r.amount, 0),
    toCome: rows.filter((r) => r.status === "upcoming" || r.status === "pending").reduce((t, r) => t + r.amount, 0),
    notRecorded: rows.filter((r) => r.status === "missing").length,
  };
}

const byDate = (a: RenewalRow, b: RenewalRow) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.subscriptionId.localeCompare(b.subscriptionId));

/**
 * The list in its groups: what's coming up in the next 30 days (soonest first), then
 * each past month, newest first. Renewals after the next 30 days come under the
 * coming-up ones, folded away unless `showLater` (or unless nothing's coming up, so
 * there's something to show). Oldest first runs the other way: past months from the
 * oldest, then what's coming. Groups are by date, not status: a renewal marked paid
 * ahead is still coming up.
 */
export function groupRenewals(rows: RenewalRow[], today: string, { sort = "newest", showLater = false }: { sort?: RenewalSort; showLater?: boolean } = {}): RenewalGroup[] {
  const soonEnd = addDays(today, COMING_UP_DAYS - 1);
  const sorted = [...rows].sort(byDate);
  const coming = sorted.filter((r) => r.date >= today && r.date <= soonEnd);
  const later = sorted.filter((r) => r.date > soonEnd);
  const past = sorted.filter((r) => r.date < today);
  // Newest first within a month too; renewals on one day stay in the same order either way.
  if (sort === "newest") past.sort((a, b) => (a.date === b.date ? a.subscriptionId.localeCompare(b.subscriptionId) : a.date < b.date ? 1 : -1));
  const months: { key: MonthKey; rows: RenewalRow[] }[] = [];
  for (const r of past) {
    const month = monthOf(r.date);
    if (months.at(-1)?.key !== month) months.push({ key: month, rows: [] });
    months.at(-1)!.rows.push(r);
  }
  const ahead: RenewalGroup[] = [];
  if (coming.length) ahead.push(group("coming", coming));
  if (later.length) ahead.push(!showLater && coming.length ? { ...group("later", later), rows: [], collapsed: true } : group("later", later));
  const pastGroups = months.map((m) => group(m.key, m.rows));
  return sort === "newest" ? [...ahead, ...pastGroups] : [...pastGroups, ...ahead];
}

export interface GroupPage {
  groups: RenewalGroup[];
  /** The page shown, clamped into range, from 1. */
  page: number;
  pages: number;
  /** Rows shown on this page. */
  shown: number;
}

/**
 * One page of groups. A page holds whole groups, so a month is never split, as many as
 * fit in `size` rows (at least one). The later renewals always stay on the coming-up
 * ones' page, since they open in place under them; folded away, they take no room.
 */
export function pageOfGroups(groups: RenewalGroup[], page: number, size: number): GroupPage {
  const pages: RenewalGroup[][] = [[]];
  let rows = 0;
  for (const g of groups) {
    const withComing = g.key === "later" && pages.at(-1)!.at(-1)?.key === "coming";
    if (rows > 0 && rows + g.rows.length > size && !withComing) {
      pages.push([]);
      rows = 0;
    }
    pages.at(-1)!.push(g);
    rows += g.rows.length;
  }
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages.length);
  const shown = pages[current - 1];
  return { groups: shown, page: current, pages: pages.length, shown: shown.reduce((t, g) => t + g.rows.length, 0) };
}

// ---------- The header and tiles ----------

export interface RenewalOverview {
  count: number;
  /** How many subscriptions have a renewal in the period. */
  subscriptions: number;
  notRecorded: number;
  /** Still to come (upcoming ones, and any Pending). */
  toCome: number;
}

/** The sentence under the title: the period's renewals, before any filter. */
export function renewalOverview(rows: RenewalRow[]): RenewalOverview {
  return {
    count: rows.length,
    subscriptions: new Set(rows.map((r) => r.subscriptionId)).size,
    notRecorded: rows.filter((r) => r.filter === "not-recorded").length,
    toCome: rows.filter((r) => r.filter === "upcoming").length,
  };
}

const isCharged = (p: SubscriptionPayment) => p.status === "Paid" && p.amount > 0;

export interface PeriodPaid {
  total: number;
  payments: number;
  /** total ÷ the period's months so far (for all time, from the first payment's month). */
  monthlyAverage: number;
}

/**
 * What was paid in the period, up to this month: charged payments, so a second charge
 * in one cycle counts and a ₹0 Skipped one doesn't. As on the Subscriptions page, this
 * month counts in full, including anything marked paid ahead in it.
 */
export function paidInPeriod(data: SubscriptionData, period: SpendPeriod, today: string): PeriodPaid {
  const { from, to } = periodDates(period, today, data.subscriptions);
  const now = monthOf(today);
  const paid = data.payments.filter((p) => isCharged(p) && p.paymentDate >= from && p.paymentDate <= to && monthOf(p.paymentDate) <= now);
  const total = paid.reduce((t, p) => t + p.amount, 0);
  const firstPaid = paid.map((p) => monthOf(p.paymentDate)).sort()[0];
  const start = period.kind === "all" ? firstPaid : monthOf(from);
  const end = monthOf(to) < now ? monthOf(to) : now;
  const months = start && start <= end ? monthRange(start, end).length : 0;
  return { total, payments: paid.length, monthlyAverage: months ? total / months : 0 };
}

export interface RenewalTiles {
  /** Today and the next 29 days, whatever the period, as on the Subscriptions page; `next` is the soonest one not paid yet. */
  next30: { count: number; total: number; next: Renewal | null };
  /** The period's renewals that passed with no payment, newest first, at the plan's price. */
  notRecorded: { count: number; total: number; renewals: Renewal[] };
  paid: PeriodPaid;
  /**
   * Price changes in the period (a charge 2% or more off the one before), newest first,
   * and what they add up to a month: a ₹200 rise on a yearly plan is ₹17 a month.
   */
  changes: { count: number; monthlyMore: number; subscriptionIds: string[] };
}

export function renewalTiles(data: SubscriptionData, rows: RenewalRow[], period: SpendPeriod, today: string): RenewalTiles {
  const { from, to } = periodDates(period, today, data.subscriptions);
  const soon = yearSummary(data.subscriptions, data.payments, today).next30;
  const missing = rows.filter((r) => r.filter === "not-recorded").sort((a, b) => byDate(b, a));
  const changes = data.subscriptions
    .flatMap((s) => priceChanges(data.payments, s.id).map((c) => ({ ...c, monthly: (c.to - c.from) / CYCLE_STEP_MONTHS[s.billingCycle] })))
    // Up to this month, as for what was paid: a payment marked ahead into next month isn't counted yet.
    .filter((c) => c.date >= from && c.date <= to && monthOf(c.date) <= monthOf(today))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return {
    next30: { ...soon, next: allFacts(data.subscriptions, data.payments, today).next },
    notRecorded: { count: missing.length, total: missing.reduce((t, r) => t + r.amount, 0), renewals: missing },
    paid: paidInPeriod(data, period, today),
    changes: { count: changes.length, monthlyMore: changes.reduce((t, c) => t + c.monthly, 0), subscriptionIds: [...new Set(changes.map((c) => c.subscriptionId))] },
  };
}

/**
 * Why a period has no renewals: there are no subscriptions, none had started by its
 * end (and which is the oldest), or none renewed in it (say, every one was paused).
 */
export function emptyPeriodReason(data: SubscriptionData, period: SpendPeriod, today: string): { kind: "no-subscriptions" } | { kind: "not-started"; oldest: Subscription } | { kind: "none" } {
  if (data.subscriptions.length === 0) return { kind: "no-subscriptions" };
  const { to } = periodDates(period, today, data.subscriptions);
  const oldest = [...data.subscriptions].sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0))[0];
  return oldest.startDate > to ? { kind: "not-started", oldest } : { kind: "none" };
}
