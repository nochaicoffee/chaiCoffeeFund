import { daysBetween, monthOf, type SpendPeriod } from "@/lib/aggregate/cardSpend";
import { periodLabel, periodPhrase } from "@/lib/aggregate/period";
import { carouselOrder, priceHistory, subscriptionFacts, usableSubscriptionData, type SubscriptionData } from "@/lib/aggregate/subscriptionPage";
import {
  COMING_UP_DAYS,
  emptyPeriodReason,
  filterRenewals,
  groupRenewals,
  pageOfGroups,
  periodDates,
  placeKey,
  placesIn,
  renewalCounts,
  renewalOverview,
  renewalRows,
  renewalTiles,
  type Place,
  type RenewalFilter,
  type RenewalGroup,
  type RenewalQuery,
  type RenewalRow,
} from "@/lib/aggregate/subscriptionRenewalList";
import { MARK_PAID_DAYS_BEFORE, addDays, priceChanges, renewalAction, type RenewalAction } from "@/lib/aggregate/subscriptionRenewals";
import { formatDate, formatDayDate, formatMonthShort, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { cardName, optionLabel } from "@/lib/format/labels";
import { formatInr } from "@/lib/format/money";
import { cardColorKey, categoryLabel, subscriptionMark, whenFrom, type Mark } from "@/lib/format/subscriptionLabels";
import type { Subscription } from "@/lib/sheets/types";
import type { SentencePart } from "../../cards/summarySentence";
import type { ChargedToChip } from "../views";
import { formsView, type FormsData, type PaymentContext, type PaymentRef } from "../formsView";
import { chargedToValue } from "@/lib/forms/subscriptionForms";

/**
 * Everything the Renewals page (#130, layout R1) shows, in the design's words
 * (docs/design/subscriptions.md, "The Renewals page"): the sentence under the title,
 * the four tiles, the filters with their counts, the strip for one subscription, and
 * one page of the table in its groups. Worked out on the server from lib/aggregate;
 * the components only lay it out.
 */

/** Rows a page holds, in whole groups, as many as fit (the Statements page shows 25). */
export const PAGE_SIZE = 25;

export interface TileView {
  label: string;
  value: string;
  /** Small text after the value: "this year". */
  unit?: string;
  caption: SentencePart[];
  /** Not recorded, when there are some. */
  warning?: boolean;
}

export type PillTone = "paid" | "off" | "soon" | "due" | "warning";

export interface RenewalRowView {
  key: string;
  subscriptionId: string;
  /** The renewal's date, as an ISO date; `date` is how it's shown. */
  renewalDate: string;
  mark: Mark;
  detail: string;
  date: string;
  dateNote: { text: string; tone: "due" | "warning" | "muted" } | null;
  amount: string;
  /** "the plan's price" for one not paid yet, "not charged" for one that won't renew. */
  amountNote: string | null;
  /** Not paid yet: the plan's price, muted. */
  amountMuted: boolean;
  status: { label: string; tone: PillTone; stopped?: boolean };
  paidOn: string | null;
  chargedTo: ChargedToChip | null;
  /** The usual card or account, for one still to come: drawn faded. */
  chargedToExpected: boolean;
  change: { text: string; up: boolean; plan: boolean } | null;
  /**
   * What its row offers: Mark paid only on the renewal the forms' Mark paid pays (the next
   * one due within 3 days, and none while an earlier one isn't recorded), Record payment
   * and It didn't charge on one not recorded, and the payment's menu once one is recorded.
   */
  action: RenewalAction | null;
  /** The recorded payment, for Edit payment and Delete payment. */
  payment: PaymentRef | null;
  /** Won't renew: struck through and faded. */
  stopped: boolean;
  /** The phone's second line: "Fri, Oct 23 · in 3 days", "Oct 10 · Kotak Savings". */
  phoneLine: string;
  phoneChange: { text: string; up: boolean } | null;
}

export interface GroupView {
  key: string;
  title: string;
  phoneTitle: string;
  summary: { text: string; warning?: boolean }[];
  phoneSummary: string;
  rows: RenewalRowView[];
  /** Later renewals folded away: the link that shows them. */
  more: string | null;
  /** Later renewals shown: the link that folds them away again. */
  less: string | null;
}

export interface StripView {
  mark: Mark;
  name: string;
  detail: string;
  figures: { label: string; value: string; unit?: string }[];
  points: { date: string; amount: number }[];
  /** The latest price change: "₹150 (30%) on Jul 23, 2026". */
  lastChange: { text: string; up: boolean } | null;
  /** Each price change, for its mark on the line. */
  changes: { date: string; from: number; to: number }[];
}

export interface FilterOption {
  value: string;
  label: string;
  meta?: string;
}

export interface EmptyView {
  title: string;
  body: string;
  /** Null when there's nowhere better to go: already on all time. */
  action: "clear-filters" | "show-all-time" | "add-subscription" | null;
}

export interface RenewalsPageView {
  lede: SentencePart[];
  tiles: TileView[];
  statuses: { value: RenewalFilter; label: string; count: number }[];
  subscriptions: FilterOption[];
  places: FilterOption[];
  /** The picked subscription, for the chip that clears it. */
  picked: (Mark & { id: string }) | null;
  strip: StripView | null;
  groups: GroupView[];
  page: { page: number; pages: number };
  /** Under the table; empty with nothing to show. */
  footer: SentencePart[];
  empty: EmptyView | null;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const thisYear = (iso: string, today: string) => iso.slice(0, 4) === today.slice(0, 4);
/** "Oct 10", with its year when that isn't this year. */
const smartDate = (iso: string, today: string) => (thisYear(iso, today) ? formatShortDate(iso) : formatDate(iso));
/** "Fri, Oct 23", with its year when that isn't this year. */
const dayDate = (iso: string, today: string) => (thisYear(iso, today) ? formatDayDate(iso) : `${formatDayDate(iso)}, ${iso.slice(0, 4)}`);
const CYCLE_SHORT = { Monthly: "/mo", Quarterly: "/qtr", Yearly: "/yr" } as const;

/** "in 2026", "in the last 3 months", "since December 2022" (all time, from the first subscription). */
function periodText(period: SpendPeriod, today: string, data: SubscriptionData): string {
  if (period.kind === "year") return `in ${period.year}`;
  if (period.kind === "all") return data.subscriptions.length ? `since ${formatMonthYear(monthOf(periodDates(period, today, data.subscriptions).from))}` : "so far";
  return periodPhrase(period, today);
}

/** "from Jan to Mar 2022", "in 2025", "in the last 3 months": the empty state's period, in short months. */
function periodSpan(period: SpendPeriod, today: string): string {
  if (period.kind !== "range" || period.last) return period.kind === "all" ? "yet" : period.kind === "year" ? `in ${period.year}` : `in ${periodLabel(period, today)}`;
  const year = (m: string) => m.slice(0, 4);
  if (period.from === period.to) return `in ${formatMonthShort(period.from)} ${year(period.from)}`;
  if (year(period.from) === year(period.to)) return `from ${formatMonthShort(period.from)} to ${formatMonthShort(period.to)} ${year(period.to)}`;
  return `from ${formatMonthShort(period.from)} ${year(period.from)} to ${formatMonthShort(period.to)} ${year(period.to)}`;
}

function placeName(place: Place, data: SubscriptionData): string {
  if (place.kind === "card") {
    const card = data.cards.find((c) => c.id === place.id);
    return card ? cardName(card) : "Unknown card";
  }
  return data.accounts.find((a) => a.id === place.id)?.name ?? "Unknown account";
}

const placeExists = (place: Place, data: SubscriptionData) => (place.kind === "card" ? data.cards : data.accounts).some((x) => x.id === place.id);

function chip(place: Place, data: SubscriptionData): ChargedToChip {
  if (place.kind === "card") return { kind: "card", name: placeName(place, data), color: cardColorKey(data.cards.find((c) => c.id === place.id)?.color) };
  return { kind: "account", name: placeName(place, data), color: "emerald" };
}

function lede(data: SubscriptionData, rows: RenewalRow[], period: SpendPeriod, today: string): SentencePart[] {
  if (data.subscriptions.length === 0) return [{ text: "Every renewal in one place, once you add a subscription." }];
  const o = renewalOverview(rows);
  const when = periodText(period, today, data);
  if (o.count === 0) return [{ text: `Every renewal in one place: none ${when}.` }];
  const parts: SentencePart[] = [{ text: "Every renewal in one place: " }, { text: `${o.count} ${when}`, strong: true }, { text: ` across ${plural(o.subscriptions, "subscription")}. ` }];
  const toCome = (lead: string): SentencePart[] => [{ text: lead }, { text: String(o.toCome), strong: true }, { text: ` ${o.toCome === 1 ? "is" : "are"} still to come.` }];
  if (o.notRecorded > 0) {
    parts.push({ text: `${o.notRecorded} ${o.notRecorded === 1 ? "isn't" : "aren't"} recorded`, strong: true });
    parts.push(...(o.toCome > 0 ? toCome(", and ") : [{ text: "." }]));
  } else {
    parts.push(...(o.toCome > 0 ? toCome("Every one that's passed is recorded, and ") : [{ text: "Every one is recorded." }]));
  }
  return parts;
}

function names(ids: string[], byId: Map<string, Subscription>): string {
  const aliases = ids.map((id) => byId.get(id)?.alias ?? "Unknown");
  return aliases.length > 3 ? `${aliases.slice(0, 3).join(", ")} and ${aliases.length - 3} more` : aliases.join(", ");
}

function tiles(data: SubscriptionData, rows: RenewalRow[], period: SpendPeriod, today: string): TileView[] {
  const t = renewalTiles(data, rows, period, today);
  const byId = new Map(data.subscriptions.map((s) => [s.id, s]));
  const { next30, notRecorded, paid, changes } = t;
  const nextText = next30.next ? `next ${dayDate(next30.next.date, today)}` : "";
  const missed = notRecorded.renewals.map((r) => `${byId.get(r.subscriptionId)?.alias ?? "Unknown"} on ${smartDate(r.date, today)}`);
  const unit =
    period.kind === "all" ? "so far" : period.kind === "year" ? (period.year === Number(today.slice(0, 4)) ? "this year" : `in ${period.year}`) : `in ${period.last ? "the " : ""}${periodLabel(period, today)}`;
  const paidLabel =
    period.kind === "all" ? "Paid so far" : period.kind === "year" ? (period.year === Number(today.slice(0, 4)) ? "Paid this year" : `Paid in ${period.year}`) : `Paid in ${period.last ? "the " : ""}${periodLabel(period, today)}`;
  const more = Math.round(changes.monthlyMore);
  return [
    {
      label: "Next 30 days",
      value: formatInr(next30.total),
      caption: [{ text: next30.count ? `${plural(next30.count, "renewal")}${nextText ? ` · ${nextText}` : ""}` : nextText ? `none due · ${nextText}` : "nothing coming up" }],
    },
    {
      label: "Not recorded",
      value: formatInr(notRecorded.total),
      caption: [{ text: notRecorded.count === 0 ? "every renewal is recorded" : `${plural(notRecorded.count, "renewal")} · ${notRecorded.count > 2 ? `latest ${missed[0]}` : missed.join(", ")}` }],
      warning: notRecorded.count > 0,
    },
    {
      label: paidLabel,
      value: formatInr(paid.total),
      caption: [{ text: paid.payments === 0 ? "no payments yet" : `${plural(paid.payments, "payment")} · ${formatInr(paid.monthlyAverage)} a month on average` }],
    },
    {
      label: "Price changes",
      value: String(changes.count),
      unit,
      caption:
        changes.count === 0
          ? [{ text: "no price changes" }]
          : more === 0
            ? [{ text: `no change a month overall: ${names(changes.subscriptionIds, byId)}` }]
            : [{ text: formatInr(Math.abs(more)), strong: true }, { text: ` ${more > 0 ? "more" : "less"} a month: ${names(changes.subscriptionIds, byId)}` }],
    },
  ];
}

function statusPill(r: RenewalRow, today: string): RenewalRowView["status"] {
  switch (r.status) {
    case "paid":
      return { label: "Paid", tone: "paid" };
    case "skipped":
      return { label: "Didn't charge", tone: "off" };
    case "pending":
      return { label: "Pending", tone: "warning" };
    case "missing":
      return { label: "Not recorded", tone: "warning" };
    case "wont-renew":
      return { label: "Won't renew", tone: "off", stopped: true };
  }
  const days = daysBetween(today, r.date);
  if (days <= MARK_PAID_DAYS_BEFORE) return { label: days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`, tone: "due" };
  if (days <= 7) return { label: `In ${days} days`, tone: "soon" };
  return { label: "Upcoming", tone: "off" };
}

function rowView(r: RenewalRow, s: Subscription, data: SubscriptionData, today: string, markPaidOn: string | null): RenewalRowView {
  const ahead = r.date >= today;
  const paidOn = r.status === "paid" && r.payment ? smartDate(r.payment.paymentDate, today) : null;
  let dateNote: RenewalRowView["dateNote"] = null;
  if (r.status === "upcoming") dateNote = { text: whenFrom(today, r.date), tone: daysBetween(today, r.date) <= MARK_PAID_DAYS_BEFORE ? "due" : "muted" };
  else if (r.status === "missing") dateNote = { text: whenFrom(today, r.date), tone: "warning" };
  else if (r.status === "wont-renew") dateNote = { text: s.endDate ? `cancelled ${smartDate(s.endDate, today)}` : "cancelled", tone: "muted" };
  const unpaid = !r.payment;
  const change = r.change ? { text: `${formatInr(Math.abs(r.change.amount))} ${r.change.kind === "off-plan" ? `${r.change.amount > 0 ? "over" : "under"} plan` : "vs last"}`, up: r.change.amount > 0, plan: r.change.kind === "off-plan" } : null;
  const second: Record<RenewalRow["status"], string> = {
    paid: r.place ? placeName(r.place, data) : "",
    skipped: "didn't charge",
    pending: "pending",
    missing: "no payment",
    upcoming: whenFrom(today, r.date),
    "wont-renew": "cancelled",
  };
  const phoneDate = r.status === "upcoming" ? dayDate(r.date, today) : smartDate(r.date, today);
  const action = renewalAction(r, today);
  return {
    key: `${r.subscriptionId}:${r.date}`,
    subscriptionId: r.subscriptionId,
    renewalDate: r.date,
    mark: subscriptionMark(s),
    detail: `${categoryLabel(s.category)} · ${s.billingCycle}`,
    date: ahead ? dayDate(r.date, today) : formatDate(r.date),
    dateNote,
    amount: formatInr(r.amount),
    amountNote: r.status === "wont-renew" ? "not charged" : unpaid ? "the plan's price" : null,
    amountMuted: unpaid,
    status: statusPill(r, today),
    paidOn,
    chargedTo: r.place ? chip(r.place, data) : null,
    chargedToExpected: r.expectedPlace,
    change,
    action: action === "mark-paid" && markPaidOn !== r.date ? null : action,
    payment: r.payment
      ? {
          id: r.payment.id,
          subscriptionId: s.id,
          alias: s.alias,
          renewalDate: r.date,
          paymentDate: r.payment.paymentDate,
          amount: r.payment.amount,
          status: r.payment.status,
          chargedTo: chargedToValue(r.payment),
          // Only a card or account that still exists: one that's gone can't be saved again, so the form asks for another.
          place: r.place && placeExists(r.place, data) ? { kind: r.place.kind, name: placeName(r.place, data), color: chip(r.place, data).color } : null,
        }
      : null,
    stopped: r.status === "wont-renew",
    phoneLine: second[r.status] ? `${phoneDate} · ${second[r.status]}` : phoneDate,
    phoneChange: change && !change.plan ? { text: formatInr(Math.abs(r.change!.amount)), up: change.up } : null,
  };
}

/** `foldable`: the later renewals were opened under the coming-up ones, so they can be folded away again. */
function groupView(g: RenewalGroup, byId: Map<string, Subscription>, data: SubscriptionData, today: string, period: SpendPeriod, foldable: boolean, markPaid: Record<string, PaymentContext>): GroupView {
  const summary: GroupView["summary"] = [{ text: plural(g.count, "renewal") }];
  if (g.paid) summary.push({ text: `${formatInr(g.paid)} paid` });
  if (g.toCome) summary.push({ text: `${formatInr(g.toCome)} to come` });
  if (g.notRecorded) summary.push({ text: `${g.notRecorded} not recorded`, warning: true });
  const endYear = periodDates(period, today, data.subscriptions).to.slice(0, 4);
  const laterWhen = endYear === today.slice(0, 4) ? "later this year" : `later in ${endYear}`;
  let title: string, phoneTitle: string, phoneSummary: string;
  if (g.key === "coming") {
    // The period can end, or start, inside the next 30 days (a range ends with this month; in December, the year ends): name what's shown.
    const { from, to } = periodDates(period, today, data.subscriptions);
    const soonEnd = addDays(today, COMING_UP_DAYS - 1);
    const start = from > today ? from : today;
    const end = to < soonEnd ? to : soonEnd;
    const span = start === today && end === soonEnd ? null : start === today ? `to ${formatShortDate(end)}` : `${formatShortDate(start)} to ${formatShortDate(end)}`;
    title = span ? `Coming up · ${span}` : "Coming up · next 30 days";
    phoneTitle = span ? `Coming up · ${span}` : "Next 30 days";
    phoneSummary = g.toCome || !g.paid ? formatInr(g.toCome) : `${formatInr(g.paid)} paid`;
  } else if (g.key === "later") {
    title = laterWhen.charAt(0).toUpperCase() + laterWhen.slice(1);
    phoneTitle = title;
    phoneSummary = formatInr(g.toCome);
  } else {
    title = formatMonthYear(g.key);
    phoneTitle = `${formatMonthShort(g.key)} ${g.key.slice(0, 4)}`;
    phoneSummary = g.paid || !g.notRecorded ? `${formatInr(g.paid)} paid` : `${g.notRecorded} not recorded`;
  }
  return {
    key: g.key,
    title,
    phoneTitle,
    summary,
    phoneSummary,
    rows: g.rows.map((r) => rowView(r, byId.get(r.subscriptionId)!, data, today, markPaid[r.subscriptionId]?.markPaid ?? null)),
    more: g.collapsed ? `${g.count} more ${laterWhen}` : null,
    less: g.key === "later" && foldable ? "Show only the next 30 days" : null,
  };
}

function strip(s: Subscription, data: SubscriptionData, today: string): StripView {
  const facts = subscriptionFacts(s, data.payments, today);
  const change = facts.lastChange;
  const now =
    s.status === "Active"
      ? { label: "Now", value: formatInr(s.amount), unit: CYCLE_SHORT[s.billingCycle] }
      : { label: "Now", value: s.status === "Paused" ? "Paused" : s.endDate ? `Cancelled ${smartDate(s.endDate, today)}` : "Cancelled" };
  return {
    mark: subscriptionMark(s),
    name: s.name,
    detail: `${categoryLabel(s.category)} · ${s.billingCycle} · since ${formatDate(s.startDate)}`,
    figures: [{ label: "Paid so far", value: formatInr(facts.paid) }, { label: "Payments", value: String(facts.payments) }, now],
    points: priceHistory(data.payments, s.id),
    lastChange: change ? { text: `${formatInr(Math.abs(change.to - change.from))} (${Math.round((Math.abs(change.to - change.from) / change.from) * 100)}%) on ${formatDate(change.date)}`, up: change.to > change.from } : null,
    changes: priceChanges(data.payments, s.id),
  };
}

/** Under the table: what's shown, and what the muted prices and Change mean when there are some. */
function footer(shown: RenewalRow[], total: number, periodTotal: number, when: string, only: Subscription | undefined, period: SpendPeriod): SentencePart[] {
  if (total === 0) return [];
  // Filtered to one subscription and nothing else, it's that subscription's history, as in the design.
  const parts: SentencePart[] = only
    ? [{ text: `Showing ${shown.length} of ${total}. Every ${only.alias} renewal ${period.kind === "all" ? `since ${formatDate(only.startDate)}` : when}.` }]
    : [{ text: total < periodTotal ? `Showing ${shown.length} of ${plural(total, "renewal")} that match, of ${periodTotal} ${when}.` : `Showing ${shown.length} of ${plural(total, "renewal")} ${when}.` }];
  if (shown.some((r) => r.status === "upcoming")) parts.push({ text: " Upcoming ones come from each subscription's schedule, at the plan's price; nothing is saved until a payment is recorded." });
  if (shown.some((r) => r.change)) parts.push({ text: " " }, { text: "Change", strong: true }, { text: " compares a payment with the one before it, or the latest one with the plan." });
  return parts;
}

/** `forms`: the page's formsView, when it has one, so it isn't worked out twice. */
export function renewalsPageView(sheetData: SubscriptionData, query: RenewalQuery & { page?: number; showLater?: boolean }, today: string, forms?: FormsData): RenewalsPageView {
  const data = usableSubscriptionData(sheetData);
  const byId = new Map(data.subscriptions.map((s) => [s.id, s]));
  const { period } = query;
  const rows = renewalRows(data, period, today);
  const list = filterRenewals(rows, data, query);
  const counts = renewalCounts(rows, data, query);
  const groups = groupRenewals(list, today, { sort: query.sort, showLater: query.showLater });
  const page = pageOfGroups(groups, query.page ?? 1, PAGE_SIZE);
  const foldable = Boolean(query.showLater) && groups.some((g) => g.key === "coming");
  // Which renewal each subscription's Mark paid pays, by the forms' own rule.
  const markPaid = (forms ?? formsView(data, today, false)).context;
  const groupViews = page.groups.map((g) => groupView(g, byId, data, today, period, foldable, markPaid));
  const when = periodText(period, today, data);
  const picked = query.subscriptionId ? byId.get(query.subscriptionId) : undefined;
  const otherFilters = (query.status ?? "all") !== "all" || query.place !== undefined || Boolean(query.search);
  const filtered = otherFilters || query.subscriptionId !== undefined;
  const onlyPicked = picked !== undefined && !otherFilters;

  let empty: EmptyView | null = null;
  if (list.length === 0) {
    if (rows.length > 0 && filtered) empty = { title: "No renewals match these filters", body: `There are ${rows.length} ${when}; clear the filters to see them.`, action: "clear-filters" };
    else {
      const reason = emptyPeriodReason(data, period, today);
      const allTime = period.kind === "all" ? null : "show-all-time";
      if (reason.kind === "no-subscriptions") empty = { title: "No subscriptions yet", body: "Add one on the Subscriptions page, and every renewal shows up here from its schedule.", action: "add-subscription" };
      else if (reason.kind === "not-started") empty = { title: `No renewals ${periodSpan(period, today)}`, body: `None of your subscriptions had started yet. ${reason.oldest.name} is the oldest, from ${formatDate(reason.oldest.startDate)}.`, action: allTime };
      else empty = { title: `No renewals ${periodSpan(period, today)}`, body: period.kind === "all" ? "Nothing has renewed yet." : "Nothing renewed in this period.", action: allTime };
    }
  }

  const order = carouselOrder(data.subscriptions, data.payments, today);
  return {
    lede: lede(data, rows, period, today),
    tiles: tiles(data, rows, period, today),
    statuses: [
      { value: "all", label: "All", count: counts.byStatus.all },
      { value: "upcoming", label: "Upcoming", count: counts.byStatus.upcoming },
      { value: "paid", label: "Paid", count: counts.byStatus.paid },
      { value: "not-recorded", label: "Not recorded", count: counts.byStatus["not-recorded"] },
    ],
    subscriptions: [{ value: "", label: "All subscriptions", meta: String(counts.allSubscriptions) }, ...order.map((s) => ({ value: s.id, label: s.alias, meta: String(counts.bySubscription[s.id] ?? 0) }))],
    places: [
      { value: "", label: "Any card or account" },
      ...[...placesIn(rows, data), ...(query.place && !placesIn(rows, data).some((p) => placeKey(p) === placeKey(query.place!)) ? [query.place] : [])].map((p) => ({
        value: placeKey(p),
        label: placeName(p, data),
        meta: p.kind === "card" ? optionLabel(data.cards.find((c) => c.id === p.id)?.issuer ?? "Card") : "Account",
      })),
    ],
    picked: picked ? { ...subscriptionMark(picked), id: picked.id } : null,
    strip: picked ? strip(picked, data, today) : null,
    groups: groupViews,
    page: { page: page.page, pages: page.pages },
    footer: footer(page.groups.flatMap((g) => g.rows), list.length, rows.length, when, onlyPicked ? picked : undefined, period),
    empty,
  };
}
