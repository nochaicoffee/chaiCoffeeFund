import { daysBetween } from "@/lib/aggregate/cardSpend";
import { MARK_PAID_DAYS_BEFORE, yearSummary } from "@/lib/aggregate/subscriptionRenewals";
import {
  allFacts,
  carouselOrder,
  categorySplit,
  chargedToSplit,
  latestPayments,
  priceHistory,
  subscriptionFacts,
  usableSubscriptionData,
  type AllFacts,
  type SubscriptionData,
  type SubscriptionFacts,
} from "@/lib/aggregate/subscriptionPage";
import { formatDate, formatDayDate, formatMonthShort, formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { ALL, cardColorKey, categoryColor, categoryLabel, cycleWord, subscriptionMark, whenFrom, type ColorKey, type Mark } from "@/lib/format/subscriptionLabels";
import { chartView, type ChartView } from "./chartView";
import type { Subscription, SubscriptionPayment } from "@/lib/sheets/types";
import type { SentencePart } from "../cards/summarySentence";

/**
 * Everything the Subscriptions page shows, worked out on the server and handed to the
 * client components as plain data, in the design's words (docs/design/subscriptions.md).
 * Every pick's hero, payments and price history is here at once, so turning the
 * carousel never waits on the server. The numbers come from lib/aggregate.
 */

export { ALL };

export type { Mark };

export interface Stat {
  label: string;
  value: string;
  sub: string;
}

export interface PickView extends Mark {
  id: string;
  name: string;
  status: "All" | Subscription["status"];
  /** The cover: its corner ("10 active", "Monthly", "Paused") and its price line. */
  cover: { corner: string; price: string };
  eyebrow: string;
  /** The bar under the name: its two ends and the line over it. No fraction: an empty bar. */
  bar: { start: string; middle: string; end: string; fraction: number | null };
  stats: Stat[];
  /** Renews within 3 days: the renewal line leads. */
  dueSoon: boolean;
}

export interface ChargedToChip {
  kind: "card" | "account" | "none";
  name: string;
  color: ColorKey;
}

export interface PaymentRowView {
  key: string;
  mark: Mark;
  date: string;
  amount: string;
  change: { text: string; up: boolean } | null;
  chargedTo: ChargedToChip | null;
  status: SubscriptionPayment["status"];
}

export interface PaymentsView {
  rows: PaymentRowView[];
  /** Under the table; empty when there are no payments. */
  footer: string;
  /** What each payment cost, for Price history; null for All. */
  history: { points: { date: string; amount: number }[]; changes: string[] } | null;
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
}

export interface CategoryBlock {
  key: string;
  label: string;
  color: ColorKey;
  monthly: number;
  share: number;
  aliases: string[];
}

export interface ChargedToRow {
  key: string;
  chip: ChargedToChip;
  count: number;
  monthly: number;
  /** Against the biggest, for its bar. */
  fraction: number;
}

export interface SubscriptionsPageView {
  /** All first, then the carousel's order. */
  picks: PickView[];
  payments: Record<string, PaymentsView>;
  blocks: MapBlock[];
  categories: CategoryBlock[];
  /** Paused and cancelled ones, as chips under the map. */
  stopped: (Mark & { id: string; label: string })[];
  chargedTo: ChargedToRow[];
  monthlyTotal: number;
  chart: ChartView;
}

const mark = subscriptionMark;
const ALL_MARK: Mark = { alias: "All", initial: "", color: "emerald", muted: false };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** "Fri, Oct 23", with its year when that isn't this year: "Sat, Oct 23, 2027". */
const dayDate = (iso: string, today: string) => (iso.slice(0, 4) === today.slice(0, 4) ? formatDayDate(iso) : `${formatDayDate(iso)}, ${iso.slice(0, 4)}`);

function allPick(facts: AllFacts, byId: Map<string, Subscription>, today: string): PickView {
  const nextSub = facts.next && byId.get(facts.next.subscriptionId);
  return {
    ...ALL_MARK,
    id: ALL,
    name: "All subscriptions",
    status: "All",
    cover: { corner: `${facts.active} active`, price: `${formatInr(facts.monthly)} / month` },
    eyebrow: "Everything",
    bar: {
      start: formatShortDate(facts.month.from),
      middle: facts.next && nextSub ? `Next is ${nextSub.alias}, ${dayDate(facts.next.date, today)}` : "Nothing renews this month",
      end: formatShortDate(facts.month.to),
      fraction: facts.month.fraction,
    },
    stats: [
      { label: "A month", value: formatInr(facts.monthly), sub: `${facts.active} active` },
      { label: "Renews next", value: nextSub?.alias ?? "Nothing yet", sub: facts.next ? dayDate(facts.next.date, today) : "" },
      { label: "Paid this year", value: formatInr(facts.yearPaid), sub: plural(facts.yearPayments, "payment") },
      facts.rises.count
        ? { label: "Prices", value: `${facts.rises.count} went up`, sub: `${formatInr(facts.rises.monthlyMore)} more a month` }
        : { label: "Prices", value: "No rises", sub: "this year" },
    ],
    dueSoon: false,
  };
}

const smartDate = (iso: string, today: string) => (iso.slice(0, 4) === today.slice(0, 4) ? formatShortDate(iso) : formatDate(iso));

function subscriptionPick(s: Subscription, f: SubscriptionFacts, today: string): PickView {
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
  // A yearly plan's cycle runs across two years, so both ends say which.
  const end = (iso: string) => (f.bar && f.bar.from.slice(0, 4) !== f.bar.to.slice(0, 4) ? formatDate(iso) : formatShortDate(iso));
  return {
    ...mark(s),
    id: s.id,
    name: s.name,
    status: s.status,
    cover: { corner: active ? s.billingCycle : s.status, price: `${formatInr(s.amount)} / ${cycleWord(s.billingCycle)}` },
    eyebrow: `${categoryLabel(s.category)} · since ${formatDate(s.startDate)}`,
    bar: {
      start: active && f.bar ? end(f.bar.from) : "",
      middle,
      end: active && f.bar ? end(f.bar.to) : "",
      fraction: active && f.bar ? f.bar.fraction : null,
    },
    stats: [
      { label: s.billingCycle, value: formatInr(s.amount), sub: `${formatInr(f.monthly)} a month` },
      active && f.next
        ? { label: "Renews", value: dayDate(f.next.date, today), sub: whenFrom(today, f.next.date) }
        : { label: "Status", value: s.status, sub: middle },
      { label: "Paid so far", value: formatInr(f.paid), sub: plural(f.payments, "payment") },
      change
        ? { label: "Price", value: `${change.to > change.from ? "↑" : "↓"} ${formatInr(Math.abs(change.to - change.from))}`, sub: `${formatInr(change.from)} → ${formatInr(change.to)} on ${formatShortDate(change.date)}` }
        : { label: "Price", value: "Same", sub: "Never changed" },
    ],
    dueSoon: active && !!f.next && daysBetween(today, f.next.date) <= MARK_PAID_DAYS_BEFORE,
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


function paymentsView(data: SubscriptionData, today: string, s?: Subscription): PaymentsView {
  const byId = new Map(data.subscriptions.map((x) => [x.id, x]));
  const shown = 6;
  const { rows, count, paid } = latestPayments(data.payments, shown, s?.id);
  const view: PaymentsView = {
    rows: rows.map(({ payment, change }) => {
      const owner = byId.get(payment.subscriptionId);
      const kind = payment.paidFromCardId ? "card" : payment.paidFromAccountId ? "account" : null;
      return {
        key: payment.id,
        mark: owner ? mark(owner) : { alias: "Unknown", initial: "?", color: "onyx", muted: true },
        date: s ? formatDate(payment.paymentDate) : smartDate(payment.paymentDate, today),
        amount: formatInr(payment.amount),
        change: change === null ? null : { text: `${formatInr(Math.abs(change))} ${change > 0 ? "more" : "less"}`, up: change > 0 },
        chargedTo: kind ? chipFor(kind, payment.paidFromCardId ?? payment.paidFromAccountId, data) : null,
        status: payment.status,
      };
    }),
    // Nothing under an empty table, which already says there are no payments.
    footer: !count ? "" : s ? `Showing ${Math.min(shown, count)} of ${count} · ${formatInr(paid)} paid since ${smartDate(s.startDate, today)}` : `The ${Math.min(shown, count)} most recent of ${count}`,
    history: null,
  };
  if (s) {
    const points = priceHistory(data.payments, s.id);
    const steps = latestPayments(data.payments, Infinity, s.id).rows.filter((r) => r.change !== null).reverse();
    view.history = {
      points,
      changes: steps.map((r) => `${formatInr(r.payment.amount - r.change!)} → ${formatInr(r.payment.amount)} on ${formatDate(r.payment.paymentDate)}`),
    };
  }
  return view;
}

export function subscriptionsPageView(sheetData: SubscriptionData, today: string): SubscriptionsPageView {
  const data = usableSubscriptionData(sheetData);
  const byId = new Map(data.subscriptions.map((s) => [s.id, s]));
  const facts = new Map(data.subscriptions.map((s) => [s.id, subscriptionFacts(s, data.payments, today)]));
  const order = carouselOrder(data.subscriptions, data.payments, today);
  const all = allFacts(data.subscriptions, data.payments, today);
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
    };
  });

  const split = chargedToSplit(data.subscriptions);
  const biggest = Math.max(0, ...split.map((p) => p.monthly));

  return {
    picks: [allPick(all, byId, today), ...order.map((s) => subscriptionPick(s, facts.get(s.id)!, today))],
    payments: Object.fromEntries([[ALL, paymentsView(data, today)], ...data.subscriptions.map((s) => [s.id, paymentsView(data, today, s)])]),
    blocks,
    categories: categorySplit(data.subscriptions).map((c) => ({
      key: c.category,
      label: categoryLabel(c.category),
      color: categoryColor(c.category),
      monthly: c.monthly,
      share: total > 0 ? c.monthly / total : 0,
      aliases: active.filter((s) => s.category === c.category).map((s) => s.alias),
    })),
    stopped: order.filter((s) => s.status !== "Active").map((s) => ({ ...mark(s), id: s.id, label: s.status === "Paused" ? "paused" : "cancelled" })),
    chargedTo: split.map((p) => ({ key: `${p.kind}:${p.id}`, chip: chipFor(p.kind, p.id, data), count: p.count, monthly: p.monthly, fraction: biggest > 0 ? p.monthly / biggest : 0 })),
    monthlyTotal: total,
    chart: chartView(data, today),
  };
}

/**
 * The sentence under the greeting, as in the design: paid so far this year, the monthly
 * average, the biggest month, and the renewals in the next 30 days.
 */
export function summarySentence(sheetData: SubscriptionData, today: string): SentencePart[] {
  const data = usableSubscriptionData(sheetData);
  const year = today.slice(0, 4);
  if (data.subscriptions.length === 0) return [{ text: "No subscriptions yet. Add one and it shows up here, with what it costs and when it renews." }];
  const summary = yearSummary(data.subscriptions, data.payments, today);
  const parts: SentencePart[] = [];
  if (summary.paid > 0) {
    parts.push(
      { text: "You've paid " },
      { text: formatInr(summary.paid), strong: true },
      { text: ` for subscriptions so far in ${year}, about ` },
      { text: formatInr(summary.monthlyAverage), strong: true },
      { text: " a month. " },
    );
    if (summary.biggestMonth) {
      const { month, paid } = summary.biggestMonth;
      parts.push({ text: `${formatMonthShort(month)} ${month.slice(0, 4)}`, strong: true }, { text: " was the biggest month at " }, { text: formatInr(paid), strong: true }, { text: ". " });
    }
  } else {
    parts.push({ text: `Nothing paid for subscriptions yet in ${year}. ` });
  }
  const { count, total } = summary.next30;
  if (count === 0) parts.push({ text: "No renewals come up in the next 30 days." });
  else parts.push({ text: plural(count, "renewal"), strong: true }, { text: ` ${count === 1 ? "comes" : "come"} up in the next 30 days, totalling ` }, { text: formatInr(total), strong: true }, { text: "." });
  return parts;
}
