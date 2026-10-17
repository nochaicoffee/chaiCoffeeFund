import { daysBetween, monthOf, monthRange, type MonthKey, type SpendPeriod } from "@/lib/aggregate/cardSpend";
import { isPastPeriod, paidPhrase, periodPhrase, thisYear } from "@/lib/aggregate/period";
import { MARK_PAID_DAYS_BEFORE, isCharged, periodSummary, renewalsFor } from "@/lib/aggregate/subscriptionRenewals";
import { paidWindow, paymentsIn } from "@/lib/aggregate/subscriptionPeriod";
import { monthlyEquivalent } from "@/lib/aggregate/subscriptions";
import { nextRenewalsFrom, nextStatementCharges } from "@/lib/aggregate/subscriptionNextCharges";
import {
  allFacts,
  carouselOrder,
  chargedToSplit,
  latestPayments,
  priceHistory,
  subscriptionFacts,
  usableSubscriptionData,
  type AllFacts,
  type SubscriptionData,
  type SubscriptionFacts,
} from "@/lib/aggregate/subscriptionPage";
import { formatDate, formatDayDate, formatMonthShort, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { ALL, cardColorKey, categoryColor, categoryLabel, cycleWord, shareOfTotal, subscriptionMark, whenFrom, type ColorKey, type Mark } from "@/lib/format/subscriptionLabels";
import { chartView, type ChartView } from "./chartView";
import type { Subscription, SubscriptionPayment } from "@/lib/sheets/types";
import type { SentencePart } from "../cards/summarySentence";

/**
 * Everything the Subscriptions page shows, worked out on the server and handed to the
 * client components as plain data, in the design's words (docs/design/subscriptions.md).
 * Every pick's hero, payments and price history is here at once, so turning the
 * carousel never waits on the server. The numbers come from lib/aggregate.
 *
 * The period pill (`?period=`, as on the Renewals page) decides what was paid: the
 * greeting, the hero's paid figures, the payments table and the chart. What a month costs
 * now, the map and Charged to, are today's plans and never follow it. This year is the
 * default, so a page with no period reads as it always has.
 */


export { ALL };

export type { Mark };

export interface Stat {
  label: string;
  value: string;
  sub: string;
  /** When the value is money: its amount, and the arrow before it if any, so it rolls to the next pick's (#148, 2A). */
  money?: { amount: number; prefix: string };
}

/**
 * What the cycle bar says when it's read (#148, 2B): the cycle's dates, and what happens
 * at each end. Only an active subscription's bar is read; All's is the month's spend, not
 * a cycle.
 */
export interface CycleRead {
  from: string;
  to: string;
  today: string;
  /** A cycle that spans two years dates its points with the year. */
  withYear: boolean;
  /** At its start, the renewal it began with: "paid ₹649", "didn't charge", "not recorded". */
  start: string;
  /** At the renewal: what it will charge and where, "renews ₹649 on the Millennia card". */
  end: string;
  /** The slider's name: "Netflix's cycle, Sep 23 to Oct 23". */
  label: string;
}

export interface PickView extends Mark {
  id: string;
  name: string;
  status: "All" | Subscription["status"];
  /**
   * The cover: its corner ("10 active", "Monthly", "Paused"), its price line, and the line
   * a peek at it adds (#148, 2C): "Renews Oct 23 · in 3 days".
   */
  cover: { corner: string; price: string; next: string };
  eyebrow: string;
  /** The bar under the name: its two ends and the line over it. No fraction: an empty bar. */
  bar: { start: string; middle: string; end: string; fraction: number | null };
  stats: Stat[];
  /** Renews within 3 days: the renewal line leads. */
  dueSoon: boolean;
  /** Days to its next renewal when that's within 3 (#148, 4A): its cover breathes, and on the day says Due today. */
  dueIn: number | null;
  /** What reading the cycle bar says (2B); null for All and for one with no cycle. */
  cycle: CycleRead | null;
}

export interface ChargedToChip {
  kind: "card" | "account" | "none";
  name: string;
  color: ColorKey;
}

export interface PaymentRowView {
  key: string;
  /** Whose payment it is, so the row can point at its block in the map (3A). */
  subscriptionId: string;
  mark: Mark;
  date: string;
  amount: string;
  change: { text: string; up: boolean } | null;
  chargedTo: ChargedToChip | null;
  status: SubscriptionPayment["status"];
}

export interface PaymentsView {
  rows: PaymentRowView[];
  /** What the table says when it has no rows: nothing recorded at all, or nothing in the period. */
  empty: string;
  /** Under the table; empty when there are no payments. */
  footer: string;
  /**
   * What each payment cost, for Price history; null for All. Only the latest few changes
   * are spelled out, so the card keeps its height (PaymentsCard); `earlier` counts the rest.
   */
  history: { points: { date: string; amount: number }[]; changes: string[]; earlier: string | null } | null;
}

export interface MapBlock extends Mark {
  id: string;
  detail: string;
  cycle: string;
  monthly: number;
  share: number;
  /** Under its price on a big block: when it renews, and its price if it isn't monthly. */
  footnote: string;
  /** Renews within 7 days: "Oct 23 · 3d", urgent within 3. */
  pill: { text: string; due: boolean } | null;
  /** What its hover card says. */
  card: BlockCard;
  /** Its category, which By category lays it out in and colours it by. */
  category: string;
  categoryLabel: string;
  categoryColor: ColorKey;
}

/** A block's hover card in the map: what it is, what it costs against the total, and where it stands. */
export interface BlockCard {
  name: string;
  /** What the plan charges: "₹3,999 a year". */
  price: string;
  /** "31% of your ₹1,865 a month". */
  share: string;
  /** "Nov 2 · in 12 days", or "Feb 26, 2027 · in 4 months"; null when nothing is due. */
  renews: string | null;
  chargedTo: ChargedToChip;
  /** "₹20,440 · 35 payments", or "Nothing yet". */
  paid: string;
  /** Its latest price change: "₹100 more since Mar 14". */
  change: { text: string; up: boolean } | null;
}

export interface ChargedToRow {
  key: string;
  chip: ChargedToChip;
  count: number;
  monthly: number;
  /** Against the biggest, for its bar. */
  fraction: number;
  /** Its active subscriptions, biggest first: the bar splits into them and they light up in the map (3B). */
  members: (Mark & { id: string; monthly: number })[];
  /** What lands next there (7B): a card's next statement, or an account's next renewals. */
  next: NextView;
}

/** A Charged to row's hover card: its next statement or next renewals. */
export interface NextView {
  /** "Next statement Nov 2", "Next from Kotak Savings". */
  title: string;
  rows: { key: string; mark: Mark; date: string; amount: string; note: string }[];
  /** A statement's total; null for an account's renewals. */
  total: string | null;
  /** When there's nothing: "Nothing lands on it before then." */
  empty: string;
}

export interface SubscriptionsPageView {
  /** All first, then the carousel's order. */
  picks: PickView[];
  payments: Record<string, PaymentsView>;
  blocks: MapBlock[];
  /**
   * Paused and cancelled ones, as chips under the map. `monthly` is what one would add a
   * month if it started again, for the ghost block its chip shows (`ghost` says how).
   */
  stopped: (Mark & { id: string; label: string; monthly: number; ghost: string })[];
  chargedTo: ChargedToRow[];
  monthlyTotal: number;
  chart: ChartView;
}

const mark = subscriptionMark;
const ALL_MARK: Mark = { alias: "All", initial: "", color: "emerald", muted: false };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** "Fri, Oct 23", with its year when that isn't this year: "Sat, Oct 23, 2027". */
const dayDate = (iso: string, today: string) => (iso.slice(0, 4) === today.slice(0, 4) ? formatDayDate(iso) : `${formatDayDate(iso)}, ${iso.slice(0, 4)}`);

/** A money stat's value, with its amount to roll (2A). */
const money = (amount: number, prefix = "") => ({ value: `${prefix}${formatInr(amount)}`, money: { amount, prefix } });

function allPick(facts: AllFacts, byId: Map<string, Subscription>, today: string, period: SpendPeriod): PickView {
  const nextSub = facts.next && byId.get(facts.next.subscriptionId);
  const middle = facts.next && nextSub ? `Next is ${nextSub.alias}, ${dayDate(facts.next.date, today)}` : "Nothing renews this month";
  return {
    ...ALL_MARK,
    id: ALL,
    name: "All subscriptions",
    status: "All",
    cover: { corner: `${facts.active} active`, price: `${formatInr(facts.monthly)} / month`, next: middle },
    eyebrow: "Everything",
    bar: {
      start: formatShortDate(facts.month.from),
      middle,
      end: formatShortDate(facts.month.to),
      fraction: facts.month.fraction,
    },
    stats: [
      { label: "A month", ...money(facts.monthly), sub: `${facts.active} active` },
      { label: "Renews next", value: nextSub?.alias ?? "Nothing yet", sub: facts.next ? dayDate(facts.next.date, today) : "" },
      { label: `Paid ${paidPhrase(period, today)}`, ...money(facts.periodPaid), sub: plural(facts.periodPayments, "payment") },
      facts.rises.count
        ? { label: "Prices", value: `${facts.rises.count} went up`, sub: `${formatInr(facts.rises.monthlyMore)} more a month` }
        : { label: "Prices", value: "No rises", sub: paidPhrase(period, today) },
    ],
    dueSoon: false,
    dueIn: null,
    cycle: null,
  };
}

const smartDate = (iso: string, today: string) => (iso.slice(0, 4) === today.slice(0, 4) ? formatShortDate(iso) : formatDate(iso));

/** Where a renewal charges, as the cycle bar's readout says it: " on the Millennia card", " from Kotak Savings", or nothing when it isn't set. */
function chargedWhere(s: Subscription, data: SubscriptionData): string {
  const card = s.defaultPaidFromCardId ? data.cards.find((c) => c.id === s.defaultPaidFromCardId) : undefined;
  if (card) return ` on the ${card.alias || card.name} card`;
  const account = s.defaultPaidFromAccountId ? data.accounts.find((a) => a.id === s.defaultPaidFromAccountId) : undefined;
  return account ? ` from ${account.name}` : "";
}

/** What an active subscription's cycle bar says when it's read (2B). */
function cycleRead(s: Subscription, f: SubscriptionFacts, data: SubscriptionData, today: string): CycleRead | null {
  if (s.status !== "Active" || !f.bar) return null;
  const { from, to } = f.bar;
  const withYear = from.slice(0, 4) !== to.slice(0, 4);
  const renews = `renews ${formatInr(s.amount)}${chargedWhere(s, data)}`;
  // The renewal the cycle began with: the one paid ahead, or the schedule's at its start.
  const atStart = f.bar.settledAhead ?? renewalsFor(s, data.payments, from, from, today)[0];
  const START: Record<string, string> = {
    paid: `paid ${formatInr(atStart?.amount ?? 0)}`,
    skipped: "didn't charge",
    pending: `${formatInr(atStart?.amount ?? 0)} pending`,
    missing: "not recorded",
    // It renews today and isn't paid yet.
    upcoming: renews,
  };
  const date = withYear ? formatDate : formatShortDate;
  return { from, to, today, withYear, start: (atStart && START[atStart.status]) ?? "", end: renews, label: `${s.alias}'s cycle, ${date(from)} to ${date(to)}` };
}

/** What a subscription was paid in the period: for its "Paid" stat. */
interface PeriodPaid {
  paid: number;
  payments: number;
}

function subscriptionPick(s: Subscription, f: SubscriptionFacts, data: SubscriptionData, today: string, period: SpendPeriod, inPeriod: PeriodPaid): PickView {
  const active = s.status === "Active";
  let middle: string;
  if (s.status === "Paused") middle = f.lastCharged ? `Paused · last paid ${formatShortDate(f.lastCharged.paymentDate)}` : "Paused";
  else if (s.status === "Cancelled") middle = s.endDate ? `Cancelled ${formatShortDate(s.endDate)} · won't renew` : "Cancelled · won't renew";
  else if (f.bar?.settledAhead) {
    // What was recorded and when: Mark paid records the renewal date, but a payment made earlier keeps its own date.
    const settled = f.bar.settledAhead;
    const on = settled.payment?.paymentDate ?? settled.date;
    middle = `${settled.status === "skipped" ? "Didn't charge" : "Paid"} ${smartDate(on, today)} · next ${dayDate(f.bar.to, today)}`;
  } else if (f.next) middle = `Renews ${dayDate(f.next.date, today)} · ${whenFrom(today, f.next.date)}`;
  else middle = `Starts ${dayDate(s.startDate, today)}`;
  const change = f.lastChange;
  const dueIn = active && f.next ? daysBetween(today, f.next.date) : null;
  // A yearly plan's cycle runs across two years, so both ends say which.
  const end = (iso: string) => (f.bar && f.bar.from.slice(0, 4) !== f.bar.to.slice(0, 4) ? formatDate(iso) : formatShortDate(iso));
  return {
    ...mark(s),
    id: s.id,
    name: s.name,
    status: s.status,
    cover: {
      corner: active ? s.billingCycle : s.status,
      price: `${formatInr(s.amount)} / ${cycleWord(s.billingCycle)}`,
      next: active && f.next ? `Renews ${smartDate(f.next.date, today)} · ${whenFrom(today, f.next.date)}` : middle,
    },
    eyebrow: `${categoryLabel(s.category)} · since ${formatDate(s.startDate)}`,
    bar: {
      start: active && f.bar ? end(f.bar.from) : "",
      middle,
      end: active && f.bar ? end(f.bar.to) : "",
      fraction: active && f.bar ? f.bar.fraction : null,
    },
    stats: [
      { label: s.billingCycle, ...money(s.amount), sub: `${formatInr(f.monthly)} a month` },
      active && f.next
        ? { label: "Renews", value: dayDate(f.next.date, today), sub: whenFrom(today, f.next.date) }
        : { label: "Status", value: s.status, sub: middle },
      { label: `Paid ${paidPhrase(period, today)}`, ...money(inPeriod.paid), sub: plural(inPeriod.payments, "payment") },
      change
        ? { label: "Price", ...money(Math.abs(change.to - change.from), change.to > change.from ? "↑ " : "↓ "), sub: `${formatInr(change.from)} → ${formatInr(change.to)} on ${formatShortDate(change.date)}` }
        : { label: "Price", value: "Same", sub: "Never changed" },
    ],
    dueSoon: dueIn !== null && dueIn <= MARK_PAID_DAYS_BEFORE,
    dueIn: dueIn !== null && dueIn <= MARK_PAID_DAYS_BEFORE ? dueIn : null,
    cycle: cycleRead(s, f, data, today),
  };
}

function chipFor(kind: "card" | "account" | "none", id: string | null | undefined, data: SubscriptionData): ChargedToChip {
  if (kind === "card") {
    const card = data.cards.find((c) => c.id === id);
    return { kind, name: card ? (card.alias || card.name) : "Unknown card", color: cardColorKey(card?.color) };
  }
  if (kind === "account") return { kind, name: data.accounts.find((a) => a.id === id)?.name ?? "Unknown account", color: "emerald" };
  return { kind, name: "Not set", color: "onyx" };
}

/** Where a subscription is usually charged, as `chargedToSplit` keys it. */
const placeOf = (s: Subscription) => (s.defaultPaidFromCardId ? `card:${s.defaultPaidFromCardId}` : s.defaultPaidFromAccountId ? `account:${s.defaultPaidFromAccountId}` : "none:null");

/** A Charged to row's hover card (7B): a card's next statement, or the next renewals from an account (or from nowhere set). */
function nextView(kind: "card" | "account" | "none", id: string | null, chip: ChargedToChip, members: Subscription[], data: SubscriptionData, byId: Map<string, Subscription>, today: string): NextView {
  // A card that isn't active any more has no statement coming, as elsewhere on the page.
  const card = kind === "card" ? data.cards.find((c) => c.id === id && c.status === "Active") : undefined;
  const charges = card ? nextStatementCharges(card, data.subscriptions, data.payments, today) : null;
  const list = charges ? charges.charges : nextRenewalsFrom(members, data.payments, today);
  return {
    title: charges ? `Next statement ${smartDate(charges.closes, today)}` : kind === "card" ? "Next renewals" : kind === "account" ? `Next from ${chip.name}` : "Next renewals",
    rows: list.map((c) => {
      const owner = byId.get(c.subscriptionId);
      return {
        key: c.key,
        mark: owner ? mark(owner) : { alias: "Unknown", initial: "?", color: "onyx", muted: true },
        date: smartDate(c.date, today),
        amount: formatInr(c.amount),
        note: c.paid ? "charged" : whenFrom(today, c.date),
      };
    }),
    total: charges ? formatInr(charges.total) : null,
    empty: charges ? "Nothing lands on it before then." : "Nothing coming up.",
  };
}

/** The hover card of an active subscription's block. */
function blockCard(s: Subscription, f: SubscriptionFacts, total: number, data: SubscriptionData, today: string): BlockCard {
  const change = f.lastChange;
  const kind = s.defaultPaidFromCardId ? "card" : s.defaultPaidFromAccountId ? "account" : "none";
  return {
    name: s.name,
    price: `${formatInr(s.amount)} a ${cycleWord(s.billingCycle)}`,
    share: shareOfTotal(f.monthly, total),
    renews: f.next ? `${smartDate(f.next.date, today)} · ${whenFrom(today, f.next.date)}` : null,
    chargedTo: chipFor(kind, s.defaultPaidFromCardId ?? s.defaultPaidFromAccountId, data),
    paid: f.payments ? `${formatInr(f.paid)} · ${plural(f.payments, "payment")}` : "Nothing yet",
    change: change ? { text: `${formatInr(Math.abs(change.to - change.from))} ${change.to > change.from ? "more" : "less"} since ${smartDate(change.date, today)}`, up: change.to > change.from } : null,
  };
}

/** Price history spells out this many changes, the latest. */
const CHANGES_SHOWN = 3;

function paymentsView(data: SubscriptionData, today: string, period: SpendPeriod, within: { from: MonthKey; to: MonthKey }, s?: Subscription): PaymentsView {
  const byId = new Map(data.subscriptions.map((x) => [x.id, x]));
  const shown = 6;
  const { rows, count, paid } = latestPayments(data.payments, shown, s?.id, within);
  const when = period.kind === "all" ? "" : ` ${paidPhrase(period, today)}`;
  const view: PaymentsView = {
    empty: period.kind === "all" ? "No payments recorded yet." : `No payments${when}.`,
    rows: rows.map(({ payment, change }) => {
      const owner = byId.get(payment.subscriptionId);
      const kind = payment.paidFromCardId ? "card" : payment.paidFromAccountId ? "account" : null;
      return {
        key: payment.id,
        subscriptionId: payment.subscriptionId,
        mark: owner ? mark(owner) : { alias: "Unknown", initial: "?", color: "onyx", muted: true },
        date: s ? formatDate(payment.paymentDate) : smartDate(payment.paymentDate, today),
        amount: formatInr(payment.amount),
        change: change === null ? null : { text: `${formatInr(Math.abs(change))} ${change > 0 ? "more" : "less"}`, up: change > 0 },
        chargedTo: kind ? chipFor(kind, payment.paidFromCardId ?? payment.paidFromAccountId, data) : null,
        status: payment.status,
      };
    }),
    // Nothing under an empty table, which already says there are no payments.
    footer: !count ? "" : s ? `Showing ${Math.min(shown, count)} of ${count} · ${formatInr(paid)} paid ${period.kind === "all" ? `since ${smartDate(s.startDate, today)}` : paidPhrase(period, today)}` : `The ${Math.min(shown, count)} most recent of ${count}${when}`,
    history: null,
  };
  if (s) {
    const points = priceHistory(data.payments, s.id);
    const steps = latestPayments(data.payments, Infinity, s.id).rows.filter((r) => r.change !== null).reverse();
    const changes = steps.map((r) => `${formatInr(r.payment.amount - r.change!)} → ${formatInr(r.payment.amount)} on ${formatDate(r.payment.paymentDate)}`);
    const more = Math.max(0, changes.length - CHANGES_SHOWN);
    view.history = { points, changes: changes.slice(-CHANGES_SHOWN), earlier: more ? `and ${plural(more, "earlier change")}` : null };
  }
  return view;
}

export function subscriptionsPageView(sheetData: SubscriptionData, today: string, period: SpendPeriod = thisYear(today)): SubscriptionsPageView {
  const data = usableSubscriptionData(sheetData);
  const window = paidWindow(period, today, data.subscriptions, data.payments);
  const periodPayments = paymentsIn(data.payments, window).filter(isCharged);
  const paidIn = (id: string): PeriodPaid => {
    const own = periodPayments.filter((p) => p.subscriptionId === id);
    return { paid: own.reduce((t, p) => t + p.amount, 0), payments: own.length };
  };
  const byId = new Map(data.subscriptions.map((s) => [s.id, s]));
  const facts = new Map(data.subscriptions.map((s) => [s.id, subscriptionFacts(s, data.payments, today)]));
  const order = carouselOrder(data.subscriptions, data.payments, today);
  const all = allFacts(data.subscriptions, data.payments, today, window);
  const total = all.monthly;
  const active = order.filter((s) => s.status === "Active");

  const blocks: MapBlock[] = active.map((s) => {
    const f = facts.get(s.id)!;
    const days = f.next ? daysBetween(today, f.next.date) : null;
    return {
      ...mark(s),
      id: s.id,
      detail: `${categoryLabel(s.category)} · ${s.billingCycle}`,
      cycle: s.billingCycle,
      monthly: f.monthly,
      share: total > 0 ? f.monthly / total : 0,
      footnote: f.next ? (s.billingCycle === "Monthly" ? `Renews ${formatShortDate(f.next.date)}` : `${formatInr(s.amount)} a ${cycleWord(s.billingCycle)}, next ${formatShortDate(f.next.date)}`) : "",
      pill: f.next && days !== null && days <= 7 ? { text: `${formatShortDate(f.next.date)} · ${days}d`, due: days <= MARK_PAID_DAYS_BEFORE } : null,
      card: blockCard(s, f, total, data, today),
      category: s.category,
      categoryLabel: categoryLabel(s.category),
      categoryColor: categoryColor(s.category),
    };
  });

  const split = chargedToSplit(data.subscriptions);
  const biggest = Math.max(0, ...split.map((p) => p.monthly));

  return {
    picks: [allPick(all, byId, today, period), ...order.map((s) => subscriptionPick(s, facts.get(s.id)!, data, today, period, paidIn(s.id)))],
    payments: Object.fromEntries([[ALL, paymentsView(data, today, period, window)], ...data.subscriptions.map((s) => [s.id, paymentsView(data, today, period, window, s)])]),
    blocks,
    stopped: order
      .filter((s) => s.status !== "Active")
      .map((s) => ({ ...mark(s), id: s.id, label: s.status === "Paused" ? "paused" : "cancelled", monthly: monthlyEquivalent(s), ghost: s.status === "Paused" ? "if you resume it" : "if you restart it" })),
    chargedTo: split.map((p) => {
      const chip = chipFor(p.kind, p.id, data);
      const members = active.filter((s) => placeOf(s) === `${p.kind}:${p.id}`);
      return {
        key: `${p.kind}:${p.id}`,
        chip,
        count: p.count,
        monthly: p.monthly,
        fraction: biggest > 0 ? p.monthly / biggest : 0,
        members: members.map((s) => ({ ...mark(s), id: s.id, monthly: facts.get(s.id)!.monthly })).sort((a, b) => b.monthly - a.monthly),
        next: nextView(p.kind, p.id, chip, members, data, byId, today),
      };
    }),
    monthlyTotal: total,
    chart: chartView(data, today, period),
  };
}

/** The period's months so far, and the summary over them. */
function summaryOf(data: SubscriptionData, period: SpendPeriod, today: string) {
  const window = paidWindow(period, today, data.subscriptions, data.payments);
  return { window, summary: periodSummary(data.subscriptions, data.payments, monthRange(window.from, window.to), today) };
}

/**
 * The sentence under the greeting, as in the design: paid in the period (this year so far
 * by default), the monthly average, the biggest month, and the renewals in the next 30
 * days, which the period never changes. A period of one month leaves out the average and
 * the biggest month, which would only repeat its total, as on the Cards page.
 */
export function summarySentence(sheetData: SubscriptionData, today: string, period: SpendPeriod = thisYear(today)): SentencePart[] {
  const data = usableSubscriptionData(sheetData);
  if (data.subscriptions.length === 0) return [{ text: "No subscriptions yet. Add one and it shows up here, with what it costs and when it renews." }];
  const { window, summary } = summaryOf(data, period, today);
  const when = periodPhrase(period, today, window.from);
  const single = period.kind === "range" && summary.months.length <= 1;
  const parts: SentencePart[] = [];
  if (summary.paid > 0) {
    parts.push({ text: isPastPeriod(period, today) ? "You paid " : "You've paid " }, { text: formatInr(summary.paid), strong: true, point: "paid" });
    if (single) parts.push({ text: ` for subscriptions ${when}. ` });
    else {
      parts.push({ text: ` for subscriptions ${when}, about ` }, { text: formatInr(summary.monthlyAverage), strong: true, point: "average" }, { text: " a month. " });
      if (summary.biggestMonth) {
        const { month, paid } = summary.biggestMonth;
        parts.push({ text: `${formatMonthShort(month)} ${month.slice(0, 4)}`, strong: true, point: "biggest" }, { text: " was the biggest month at " }, { text: formatInr(paid), strong: true, point: "biggest" }, { text: ". " });
      }
    }
  } else {
    parts.push({ text: `Nothing paid for subscriptions ${when}. ` });
  }
  const { count, total } = summary.next30;
  if (count === 0) parts.push({ text: "No renewals come up in the next 30 days." });
  else parts.push({ text: plural(count, "renewal"), strong: true, point: "next" }, { text: ` ${count === 1 ? "comes" : "come"} up in the next 30 days, totalling ` }, { text: formatInr(total), strong: true, point: "next" }, { text: "." });
  return parts;
}

/** A month in a greeting card's strip of the period: what was paid, and whether the card is pointing at it. */
export interface StripMonth {
  key: string;
  /** "J", "F", … */
  initial: string;
  paid: number;
  future: boolean;
  lit: boolean;
}

/** What the greeting's figures explain (7A), keyed as the sentence's `point`s are. */
export interface GreetingCards {
  paid?: { title: string; total: string; months: StripMonth[]; note: string };
  average?: { title: string; total: string; months: StripMonth[]; average: number; note: string };
  biggest?: { title: string; total: string; months: StripMonth[]; rows: { key: string; mark: Mark; amount: string }[] };
  next?: { title: string; total: string; rows: { key: string; mark: Mark; date: string; amount: string; note: string }[] };
}

/** "January to October", with the years when the months are in different ones. */
function monthSpan(first: MonthKey, last: MonthKey): string {
  const name = (m: MonthKey) => formatMonthYear(m).split(" ")[0];
  return first.slice(0, 4) === last.slice(0, 4) ? `${name(first)} to ${name(last)}` : `${formatMonthYear(first)} to ${formatMonthYear(last)}`;
}

/** The strip shows at most this many months: the latest of a longer period. */
const STRIP_MONTHS = 12;

/**
 * The cards behind the greeting's figures (7A): the period's months with what was paid
 * (a year's twelve, or at most the latest 12 of a longer one), the average across them,
 * what made up the biggest month, and the renewals in the next 30 days. Built from the
 * same summary as the sentence, so they always agree with it.
 */
export function greetingView(sheetData: SubscriptionData, today: string, period: SpendPeriod = thisYear(today)): GreetingCards {
  const data = usableSubscriptionData(sheetData);
  if (data.subscriptions.length === 0) return {};
  const { summary } = summaryOf(data, period, today);
  const byId = new Map(data.subscriptions.map((s) => [s.id, s]));
  const paidIn = new Map(summary.months.map((m) => [m.month, m.paid]));
  // A year shows all twelve months, those still to come dashed; any other period its own, ending at this month at the latest.
  const stripKeys = period.kind === "year" ? monthRange(`${period.year}-01`, `${period.year}-12`) : summary.months.map((m) => m.month).slice(-STRIP_MONTHS);
  const strip = (lit: (key: string) => boolean): StripMonth[] =>
    stripKeys.map((key) => {
      const future = !paidIn.has(key);
      return { key, initial: formatMonthShort(key)[0], paid: paidIn.get(key) ?? 0, future, lit: !future && lit(key) };
    });
  const so = summary.months.length;
  const cards: GreetingCards = {};
  if (summary.paid > 0) {
    const first = summary.months[0].month;
    const last = summary.months[so - 1].month;
    const upToNow = last === monthOf(today);
    const named = so === 1 ? (upToNow ? `${formatMonthYear(first).split(" ")[0]} so far` : formatMonthYear(first)) : `${plural(so, "month")}${upToNow ? " so far" : ""}, ${monthSpan(first, last)}`;
    const note = so > STRIP_MONTHS ? `${named}. The bars show the last ${STRIP_MONTHS}` : named;
    cards.paid = { title: period.kind === "year" ? `Paid in ${period.year}` : `Paid ${paidPhrase(period, today)}`, total: formatInr(summary.paid), months: strip(() => true), note };
    // A period of one month has no average or biggest month to explain: the sentence leaves them out.
    if (!(period.kind === "range" && so <= 1)) cards.average = { title: "A month, on average", total: formatInr(summary.monthlyAverage), months: strip(() => false), average: summary.monthlyAverage, note: `${formatInr(summary.paid)} over ${plural(so, "month")}` };
  }
  if (summary.biggestMonth && !(period.kind === "range" && so <= 1)) {
    const { month, paid } = summary.biggestMonth;
    const parts = new Map<string, number>();
    for (const p of data.payments) if (p.status === "Paid" && p.amount > 0 && monthOf(p.paymentDate) === month) parts.set(p.subscriptionId, (parts.get(p.subscriptionId) ?? 0) + p.amount);
    cards.biggest = {
      title: `${formatMonthShort(month)} ${month.slice(0, 4)}`,
      total: formatInr(paid),
      months: strip((key) => key === month),
      rows: [...parts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id, amount]) => ({ key: id, mark: byId.has(id) ? mark(byId.get(id)!) : { alias: "Unknown", initial: "?", color: "onyx", muted: true }, amount: formatInr(amount) })),
    };
  }
  if (summary.next30.count > 0) {
    cards.next = {
      title: "The next 30 days",
      total: formatInr(summary.next30.total),
      rows: summary.soon.map((r) => {
        const owner = byId.get(r.subscriptionId);
        return { key: `${r.subscriptionId}:${r.date}`, mark: owner ? mark(owner) : { alias: "Unknown", initial: "?", color: "onyx", muted: true }, date: dayDate(r.date, today), amount: formatInr(r.amount), note: r.status === "paid" ? "paid ahead" : whenFrom(today, r.date) };
      }),
    };
  }
  return cards;
}
