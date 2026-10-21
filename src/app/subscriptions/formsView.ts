import { firstRenewalAfter, renewalAction } from "@/lib/aggregate/subscriptionRenewals";
import { allFacts, nextRenewal, subscriptionFacts, usableSubscriptionData, type SubscriptionData } from "@/lib/aggregate/subscriptionPage";
import { monthlyEquivalent } from "@/lib/aggregate/subscriptions";
import { renewalToRecord } from "@/lib/forms/subscriptionForms";
import { cardColorKey, type ColorKey } from "@/lib/format/subscriptionLabels";
import type { Subscription, SubscriptionPayment } from "@/lib/sheets/types";

/**
 * What the Subscriptions forms (#128) need, worked out on the server: the subscriptions
 * to edit, the cards and accounts to charge, and for each subscription the renewal a
 * payment would be for and what it changes, for the forms' live previews.
 */

export interface PaymentContext {
  /** The renewal Record a payment starts on: the oldest not recorded, or the next to come. */
  renewalDate: string | null;
  /** The renewal after that one, for "Next renewal" once it's paid. */
  after: string | null;
  /** Mark paid's renewal, when one is due within 3 days. */
  markPaid: string | null;
  plan: number;
  monthly: number;
  paid: number;
  /** Charged payments. */
  payments: number;
  /** Every payment row, Skipped and Pending ones too: what Delete removes. */
  rows: number;
  /** The latest charged payment's date: a payment back-dated before it doesn't offer to change the plan's price. */
  lastCharged: string | null;
  /** For Cancel's "It won't renew on …". */
  nextRenewal: string | null;
}

/** A recorded payment, as Edit payment and Delete payment on the Renewals page (#130) need it. */
export interface PaymentRef {
  id: string;
  subscriptionId: string;
  alias: string;
  /** The renewal it's for, which can differ from when it was paid. */
  renewalDate: string;
  paymentDate: string;
  amount: number;
  status: SubscriptionPayment["status"];
  /** Where it was charged, as the Charged to field's value: "card:<id>", "account:<id>" or "". */
  chargedTo: string;
  /** That card or account by name, in case the forms no longer list it (a closed card). */
  place: { kind: "card" | "account"; name: string; color: ColorKey } | null;
}

export interface FormsData {
  today: string;
  /** With sample data the forms show disabled: it never reaches the Sheet. */
  demo: boolean;
  subscriptions: Subscription[];
  /** The active cards and accounts, plus any one a subscription is still charged to, marked as no longer active. */
  cards: { id: string; name: string; color: ColorKey; inactive?: boolean }[];
  accounts: { id: string; name: string; inactive?: boolean }[];
  context: Record<string, PaymentContext>;
  /** What everything active costs a month, for "You pay a month now → with this one". */
  monthlyTotal: number;
}

export function formsView(sheetData: SubscriptionData, today: string, demo: boolean): FormsData {
  const data = usableSubscriptionData(sheetData);
  const context: Record<string, PaymentContext> = {};
  const used = new Set(data.subscriptions.flatMap((s) => [s.defaultPaidFromCardId, s.defaultPaidFromAccountId].filter((x): x is string => Boolean(x))));
  for (const s of data.subscriptions) {
    const facts = subscriptionFacts(s, data.payments, today);
    const renewal = renewalToRecord(s, data.payments, today);
    const next = nextRenewal(s, data.payments, today);
    const due = next && renewalAction(next, today) === "mark-paid" ? next.date : null;
    // A renewal not recorded is Record payment's to catch up on, not Mark paid's.
    const missing = renewal?.status === "missing";
    context[s.id] = {
      renewalDate: renewal?.date ?? null,
      after: renewal ? firstRenewalAfter(s, renewal.date) : null,
      markPaid: missing ? null : due,
      plan: s.amount,
      monthly: monthlyEquivalent(s),
      paid: facts.paid,
      payments: facts.payments,
      rows: data.payments.filter((p) => p.subscriptionId === s.id).length,
      lastCharged: facts.lastCharged?.paymentDate ?? null,
      nextRenewal: next?.date ?? null,
    };
  }
  return {
    today,
    demo,
    subscriptions: data.subscriptions,
    // A subscription on a card that's since been closed can still be edited without picking another.
    cards: data.cards
      .filter((c) => c.status === "Active" || used.has(c.id))
      .map((c) => ({ id: c.id, name: c.alias || c.name, color: cardColorKey(c.color), ...(c.status !== "Active" && { inactive: true }) })),
    accounts: data.accounts.filter((a) => a.status === "Active" || used.has(a.id)).map((a) => ({ id: a.id, name: a.name, ...(a.status !== "Active" && { inactive: true }) })),
    context,
    monthlyTotal: allFacts(data.subscriptions, data.payments, today).monthly,
  };
}
