import { latestStatementDate, nextStatementDate } from "./cardSchedule";
import { addDays, renewalsFor } from "./subscriptionRenewals";
import type { Card, Subscription, SubscriptionPayment } from "../sheets/types";

/**
 * What lands next where subscriptions are charged (Prathik's pick 7B): for a card, the
 * subscription charges on its next statement; for a bank account (or nowhere set), the
 * next few renewals. Pure, so it's tested.
 *
 * A card's next statement covers the day after its last statement date up to and including
 * its next one (`cardSchedule.ts`; a statement closing today is the next one). On it are:
 * - the payments already charged to that card in that window, whatever subscription they're
 *   for;
 * - and the renewals still to come in it for the active subscriptions usually charged there,
 *   at their plan's price.
 * A renewal that passed without being recorded isn't counted, as nothing was charged (the
 * same rule as the chart's year total, decided with Prathik 2026-10-21). A renewal paid
 * early is its payment, not counted twice. A Pending payment (only ever typed into the
 * Sheet by hand) counts like a payment, by the card it's on and its date, as still to come.
 */

export interface NextCharge {
  /** Unique among the charges: the payment's id, or the subscription and date of a renewal to come. */
  key: string;
  subscriptionId: string;
  date: string;
  amount: number;
  /** Already charged (a payment), or still to come (a renewal at the plan's price). */
  paid: boolean;
}

export type NextCharges =
  | { kind: "card"; opens: string; closes: string; charges: NextCharge[]; total: number }
  | { kind: "account" | "none"; charges: NextCharge[] };

const byDate = (a: NextCharge, b: NextCharge) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
/** Renewals still to come between two dates with nothing recorded for them yet, at the plan's price. A Pending one is its payment (`asCharge`). */
function stillToCome(subscriptions: Subscription[], payments: SubscriptionPayment[], from: string, to: string, today: string): NextCharge[] {
  return subscriptions
    .filter((s) => s.status === "Active")
    .flatMap((s) => renewalsFor(s, payments, from, to, today))
    .filter((r) => r.status === "upcoming" && r.date >= today)
    .map((r) => ({ key: `${r.subscriptionId}:${r.date}`, subscriptionId: r.subscriptionId, date: r.date, amount: r.amount, paid: false }));
}

const asCharge = (p: SubscriptionPayment): NextCharge => ({ key: p.id, subscriptionId: p.subscriptionId, date: p.paymentDate, amount: p.amount, paid: p.status === "Paid" });
const isCharge = (p: SubscriptionPayment) => (p.status === "Paid" || p.status === "Pending") && p.amount > 0;

/** A card's next statement: its window, and the subscription charges on it, oldest first. */
export function nextStatementCharges(card: Pick<Card, "id" | "statementDay" | "dueDayBuffer">, subscriptions: Subscription[], payments: SubscriptionPayment[], today: string): Extract<NextCharges, { kind: "card" }> {
  const closes = nextStatementDate(card, today);
  const opens = addDays(latestStatementDate(card, addDays(closes, -1)), 1);
  const ids = new Set(subscriptions.map((s) => s.id));
  // Paid or Pending, by the card it went on, whatever subscription it's for.
  const charged = payments.filter((p) => ids.has(p.subscriptionId) && p.paidFromCardId === card.id && isCharge(p) && p.paymentDate >= opens && p.paymentDate <= closes).map(asCharge);
  const coming = stillToCome(
    subscriptions.filter((s) => s.defaultPaidFromCardId === card.id),
    payments,
    today > opens ? today : opens,
    closes,
    today,
  );
  const charges = [...charged, ...coming].sort(byDate);
  return { kind: "card", opens, closes, charges, total: charges.reduce((t, c) => t + c.amount, 0) };
}

/** A bank account's (or nowhere's) next few renewals, soonest first, looking a year ahead, with any Pending payment of theirs from today on. */
export function nextRenewalsFrom(subscriptions: Subscription[], payments: SubscriptionPayment[], today: string, count = 3): NextCharge[] {
  const ids = new Set(subscriptions.filter((s) => s.status === "Active").map((s) => s.id));
  const pending = payments.filter((p) => ids.has(p.subscriptionId) && p.status === "Pending" && p.amount > 0 && p.paymentDate >= today).map(asCharge);
  return [...pending, ...stillToCome(subscriptions, payments, today, addDays(today, 366), today)].sort(byDate).slice(0, count);
}
