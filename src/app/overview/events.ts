import { daysBetween } from "@/lib/aggregate/cardSpend";
import { expectedAtMaturity } from "@/lib/aggregate/fixedIncome";
import { upcomingPayments } from "@/lib/aggregate/incomeSchedule";
import { upcomingRenewals, viewPolicies } from "@/lib/aggregate/insurance";
import { nextRenewalsFrom } from "@/lib/aggregate/subscriptionNextCharges";
import { addDays } from "@/lib/aggregate/subscriptionRenewals";
import { cardName } from "@/lib/format/labels";
import type { OverviewData } from "./model";
import type { OverviewWarning, WarningPage } from "./warnings";

/**
 * Coming up (F-OV-05): every dated thing in the next 30 days, from the same helpers each page uses, so a date here is the date the page shows.
 * `cash` says whether it moves the money in the bank that day: a card's subscription charge is inside that card's bill, and a deposit that
 * has matured lands only when it is closed. Both are shown, softer, and never added to a cash figure.
 */
export type EventKind = "emi" | "card" | "deposit" | "premium" | "income" | "subscription";

export interface OverviewEvent {
  id: string;
  date: string;
  label: string;
  sub: string;
  /** Rupees: negative leaves, positive arrives. */
  amount: number;
  kind: EventKind;
  page: WarningPage;
  cash: boolean;
  /** What it is, in the words a warning uses to point at it ("installment:<id>"), so the two can be joined. */
  ref?: string;
}

export const WINDOW_DAYS = 30;

export function overviewEvents(data: OverviewData, today: string, days = WINDOW_DAYS): OverviewEvent[] {
  const until = addDays(today, days);
  const events: OverviewEvent[] = [];
  const within = (date: string) => date >= today && date <= until;

  // EMIs: the first pending installment of each active loan inside the window (later ones in the window too).
  const active = new Map(data.loans.filter((l) => l.status === "Active").map((l) => [l.id, l]));
  for (const i of data.loanInstallments) {
    const loan = active.get(i.loanId);
    if (!loan || i.status !== "Pending" || !within(i.dueDate)) continue;
    events.push({ id: `installment:${i.id}`, date: i.dueDate, label: `${loan.name} EMI`, sub: `installment #${i.installmentNumber}`, amount: -i.totalDue, kind: "emi", page: "loans", cash: true, ref: `installment:${i.id}` });
  }

  // Card statements still to pay.
  const cards = new Map(data.cards.map((c) => [c.id, c]));
  for (const s of data.statements) {
    const card = cards.get(s.cardId);
    const left = s.totalAmountDue - (s.amountPaid ?? 0);
    if (!card || s.status !== "Pending" || left <= 0 || !within(s.dueDate)) continue;
    events.push({ id: `statement:${s.id}`, date: s.dueDate, label: `${cardName(card)} bill`, sub: `statement ${s.statementDate}`, amount: -left, kind: "card", page: "cards", cash: true, ref: `statement:${s.id}` });
  }

  // Insurance premiums at each live policy's renewal.
  if (!data.insurance.failed) {
    const views = viewPolicies(data.insurance.policies, data.insurance.payments, today);
    const names = new Map(data.insurance.policies.map((p) => [p.id, p.name]));
    for (const r of upcomingRenewals(views, until)) {
      if (!within(r.on)) continue;
      events.push({ id: `policy:${r.policyId}:${r.on}`, date: r.on, label: `${names.get(r.policyId) ?? "Policy"} premium`, sub: "renewal", amount: -r.amount, kind: "premium", page: "ins", cash: true, ref: `policy:${r.policyId}` });
    }
  }

  // Deposits maturing: the money lands only when the deposit is closed, so it is shown but not counted as cash.
  for (const d of data.fixedDeposits) {
    if (d.status === "Closed" || !within(d.maturityDate)) continue;
    const e = expectedAtMaturity(d);
    events.push({ id: `deposit:${d.id}`, date: d.maturityDate, label: `${d.name} matures`, sub: "lands when you close it", amount: e.amount, kind: "deposit", page: "fixed", cash: false });
  }

  // Income expected inside the window, at each source's usual amount.
  const sources = new Map(data.incomeSources.map((s) => [s.id, s]));
  for (const p of upcomingPayments(data.incomeSources, data.incomeEntries, today, until)) {
    const source = sources.get(p.sourceId);
    if (!source) continue;
    events.push({ id: `income:${p.sourceId}:${p.expectedDate}`, date: p.expectedDate, label: source.alias || source.name, sub: "expected", amount: p.amount, kind: "income", page: "income", cash: true });
  }

  // Subscription charges: off a card they leave the bank that day; on a card they are inside its bill.
  const subs = new Map(data.subscriptions.map((s) => [s.id, s]));
  for (const c of nextRenewalsFrom(data.subscriptions, data.subscriptionPayments, today, 40)) {
    const s = subs.get(c.subscriptionId);
    if (!s || !within(c.date)) continue;
    const onCard = Boolean(s.defaultPaidFromCardId);
    events.push({ id: `subscription:${c.key}`, date: c.date, label: s.name, sub: onCard ? "on a card, inside its bill" : "paid from the bank", amount: -c.amount, kind: "subscription", page: "subs", cash: !onCard });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/** Each warning that has a day, joined to the event it is about (by `ref`), so the Timeline can say "needs a look" on that day. */
export function eventWarning(event: OverviewEvent, warnings: OverviewWarning[]): OverviewWarning | null {
  return event.ref ? (warnings.find((w) => w.ref === event.ref) ?? null) : null;
}

/** The warnings with no day of their own, or whose day has no event inside the window (overdue things): these head the Timeline as "needs a look now". */
export function warningsWithoutDay(warnings: OverviewWarning[], events: OverviewEvent[]): OverviewWarning[] {
  const joined = new Set(events.map((e) => e.ref).filter((r): r is string => Boolean(r)));
  return warnings.filter((w) => !w.ref || !joined.has(w.ref));
}

/** Money out and in over the window, cash events only: what leaves and what arrives in the bank. */
export function windowTotals(events: OverviewEvent[]): { out: number; in: number } {
  return {
    out: -events.filter((e) => e.cash && e.amount < 0).reduce((s, e) => s + e.amount, 0),
    in: events.filter((e) => e.cash && e.amount > 0).reduce((s, e) => s + e.amount, 0),
  };
}

/** Days until a date, for the "in 11 days" lines. */
export const daysUntil = (today: string, date: string): number => daysBetween(today, date);
