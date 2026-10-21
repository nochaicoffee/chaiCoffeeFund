import { CYCLE_STEP_MONTHS, addMonthsUTC } from "../aggregate/recurring";
import { PRICE_CHANGE_THRESHOLD, renewalsFor, scheduleDates, type Renewal } from "../aggregate/subscriptionRenewals";
import { SUBSCRIPTION_CATEGORIES, type RecurrenceCycle, type Subscription, type SubscriptionCategory, type SubscriptionPayment, type SubscriptionStatus } from "../sheets/types";
import { FieldReader, type FormFields, type FormResult } from "./fields";

/**
 * The Subscriptions forms (#128), as designed in design/subscriptions/SubsForms.dc.html:
 * Add and Edit subscription, Record a payment, and Cancel and Resume. Each one's fields
 * read into the input its repository expects, or plain-word errors by field. The
 * wording here is the source of truth for the forms' messages.
 */

const CYCLES: readonly RecurrenceCycle[] = ["Monthly", "Quarterly", "Yearly"];
const STATUSES: readonly SubscriptionStatus[] = ["Active", "Paused", "Cancelled"];

/** Where something's charged, as one form value: "card:<id>", "account:<id>", or "" for not set. */
export type ChargedToValue = string;

export function chargedToValue(place: { defaultPaidFromCardId?: string; defaultPaidFromAccountId?: string; paidFromCardId?: string; paidFromAccountId?: string }): ChargedToValue {
  const card = place.defaultPaidFromCardId ?? place.paidFromCardId;
  const account = place.defaultPaidFromAccountId ?? place.paidFromAccountId;
  return card ? `card:${card}` : account ? `account:${account}` : "";
}

/** A charged-to value as a card or an account, never both; blank is neither. */
function readChargedTo(f: FieldReader, name: string, known: { accountIds: string[]; cardIds: string[] }): { cardId?: string; accountId?: string } {
  const value = f.raw(name).trim();
  if (value === "") return {};
  const at = value.indexOf(":");
  const kind = value.slice(0, at);
  const id = value.slice(at + 1);
  if (kind === "card" && known.cardIds.includes(id)) return { cardId: id };
  if (kind === "account" && known.accountIds.includes(id)) return { accountId: id };
  f.fail(name, "Choose one of your cards or accounts");
  return {};
}

export interface SubscriptionInput {
  name: string;
  alias: string;
  category: SubscriptionCategory;
  amount: number;
  billingCycle: RecurrenceCycle;
  /** The form's "Next renewal": any renewal date works, since the schedule counts from it both ways. */
  billingAnchorDate: string;
  startDate: string;
  status: SubscriptionStatus;
  endDate?: string;
  defaultPaidFromAccountId?: string;
  defaultPaidFromCardId?: string;
}

/**
 * Add subscription, and Edit subscription when `editing`, which adds Status (and, for a
 * cancelled one, its cancelled-on date). The short name falls back to the name. A new
 * subscription is Active. `endDateOptional`: a subscription already cancelled without a
 * date can stay that way, rather than an edit stamping it with today.
 */
export function readSubscriptionForm(
  fields: FormFields,
  known: { accountIds: string[]; cardIds: string[] },
  editing: boolean,
  { endDateOptional = false }: { endDateOptional?: boolean } = {},
): FormResult<SubscriptionInput> {
  const f = new FieldReader(fields);
  const name = f.text("name", "Enter the subscription's name");
  const alias = f.text("alias") ?? name;
  const category = f.choice("category", SUBSCRIPTION_CATEGORIES, "Choose a category");
  const amount = f.amount("amount", { required: "Enter what it costs each time it renews", label: "price" });
  const billingCycle = f.choice("billingCycle", CYCLES, "Choose how often it's billed");
  const billingAnchorDate = f.date("nextRenewal", "Enter its next renewal date");
  const startDate = f.date("startDate", "Enter when it started");
  if (startDate && billingAnchorDate && startDate > billingAnchorDate) f.fail("startDate", "It can't start after its next renewal");
  const status = editing ? f.choice("status", STATUSES, "Choose whether it's active, paused or cancelled") : "Active";
  const endDate = status === "Cancelled" ? f.date("endDate", endDateOptional ? undefined : "Enter when it was cancelled") : undefined;
  if (endDate && startDate && endDate < startDate) f.fail("endDate", "It can't be cancelled before it started");
  const charged = readChargedTo(f, "chargedTo", known);
  return f.result({
    name: name!,
    alias: alias!,
    category: category!,
    amount: amount!,
    billingCycle: billingCycle!,
    billingAnchorDate: billingAnchorDate!,
    startDate: startDate!,
    status: status!,
    ...(endDate && { endDate }),
    ...(charged.accountId && { defaultPaidFromAccountId: charged.accountId }),
    ...(charged.cardId && { defaultPaidFromCardId: charged.cardId }),
  });
}

export interface PaymentInput {
  subscriptionId: string;
  paymentDate: string;
  amount: number;
  status: "Paid";
  paidFromAccountId?: string;
  paidFromCardId?: string;
}

/**
 * Record a payment. A ₹0 one isn't a payment: a renewal that didn't charge is recorded
 * as Skipped, not here. `updatePlan` is the "update the price from now on" box, which
 * the form offers when the amount is off the plan's price by the price-change rule.
 */
export function readPaymentForm(fields: FormFields, known: { subscriptionIds: string[]; accountIds: string[]; cardIds: string[] }): FormResult<{ payment: PaymentInput; updatePlan: boolean }> {
  const f = new FieldReader(fields);
  const subscriptionId = f.choice("subscriptionId", known.subscriptionIds, "Choose the subscription");
  const paymentDate = f.date("paymentDate", "Enter when it was paid");
  const amount = f.amount("amount", { required: "Enter what was charged", label: "amount" });
  if (amount === 0) f.fail("amount", "Enter what was charged: a payment can't be ₹0");
  const charged = readChargedTo(f, "chargedTo", known);
  return f.result({
    payment: {
      subscriptionId: subscriptionId!,
      paymentDate: paymentDate!,
      amount: amount!,
      status: "Paid" as const,
      ...(charged.accountId && { paidFromAccountId: charged.accountId }),
      ...(charged.cardId && { paidFromCardId: charged.cardId }),
    },
    updatePlan: f.raw("updatePlan") === "1",
  });
}

/** Cancel (the date it was cancelled) and Resume or Restart (the date it starts again). */
export function readDateForm(fields: FormFields, name: "endDate" | "resumedOn", notBefore?: string): FormResult<string> {
  const f = new FieldReader(fields);
  const date = f.date(name, name === "endDate" ? "Enter when it was cancelled" : "Enter when it starts again");
  if (date && notBefore && date < notBefore) f.fail(name, name === "endDate" ? "It can't be cancelled before it started" : "It can't start again before it first started");
  return f.result(date!);
}

/**
 * The billing anchor an edit saves. The form shows the next renewal, but an anchor on the
 * 31st keeps coming back to the 31st while one on Nov 30 never does: so when the date
 * entered is already on the stored schedule (same cycle), the stored anchor stays.
 */
export function anchorToSave(existing: Pick<Subscription, "billingAnchorDate" | "billingCycle" | "startDate">, input: Pick<SubscriptionInput, "billingAnchorDate" | "billingCycle">): string {
  if (existing.billingCycle !== input.billingCycle) return input.billingAnchorDate;
  const onSchedule = scheduleDates({ ...existing, startDate: "0000-01-01" }, input.billingAnchorDate, input.billingAnchorDate).length === 1;
  return onSchedule ? existing.billingAnchorDate : input.billingAnchorDate;
}

// ---------- Where the forms start ----------

/** Whether a payment's amount is off the plan's price enough to offer updating the plan (the 2% price-change rule). */
export function offPlan(amount: number, plan: number): boolean {
  return plan > 0 ? Math.abs(amount - plan) / plan >= PRICE_CHANGE_THRESHOLD : amount > 0;
}

/**
 * The renewal Record a payment starts on, for a subscription: the oldest one not
 * recorded (catching up), or else the next one still to come. Null when there's
 * neither, such as for a paused subscription.
 */
export function renewalToRecord(subscription: Subscription, payments: SubscriptionPayment[], today: string): Renewal | null {
  // Two years back for one not recorded, and two cycles ahead for the next one.
  const renewals = renewalsFor(subscription, payments, addMonthsUTC(today, -24), addMonthsUTC(today, CYCLE_STEP_MONTHS[subscription.billingCycle] * 2), today);
  return renewals.find((r) => r.status === "missing") ?? renewals.find((r) => r.status === "upcoming") ?? null;
}

/** The payment Mark paid records for a renewal: the plan's price on the renewal date, to where it's usually charged. */
export function markPaidPayment(subscription: Subscription, renewalDate: string): PaymentInput {
  return {
    subscriptionId: subscription.id,
    paymentDate: renewalDate,
    amount: subscription.amount,
    status: "Paid",
    ...(subscription.defaultPaidFromCardId && { paidFromCardId: subscription.defaultPaidFromCardId }),
    ...(subscription.defaultPaidFromAccountId && { paidFromAccountId: subscription.defaultPaidFromAccountId }),
  };
}
