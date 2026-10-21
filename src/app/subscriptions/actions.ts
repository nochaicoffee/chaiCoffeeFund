"use server";

import { updateTag } from "next/cache";
import { renewalAction, renewalsFor } from "@/lib/aggregate/subscriptionRenewals";
import { formatShortDate, todayIso } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import type { FormState } from "@/lib/forms/formState";
import { anchorToSave, markPaidPayment, offPlan, readDateForm, readPaymentForm, readSubscriptionForm, type PaymentInput } from "@/lib/forms/subscriptionForms";
import { CACHE_TAGS, getCachedAccounts, getCachedCards, getCachedSubscriptionPayments, getCachedSubscriptions } from "@/lib/sheets/cached";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";
import { createSubscriptionPaymentSchema, subscriptionPaymentsRepository } from "@/lib/sheets/subscriptionPayments";
import { createSubscriptionSchema, subscriptionsRepository, updateSubscriptionSchema } from "@/lib/sheets/subscriptions";
import type { Subscription } from "@/lib/sheets/types";

/**
 * The Subscriptions forms' server actions (#128), used with useActionState, as the Cards
 * forms' are (src/app/cards/actions.ts): each checks the input with lib/forms (plain-word
 * errors by field), checks it again with the entity's zod schema, then writes. Nothing
 * reaches the Sheet until both pass, and a failed write returns { status: "failed" } so
 * the dialog keeps the input for Try again.
 */

const fields = (formData: FormData) => Object.fromEntries(formData.entries());

/** Logs a failed read or write without the form's values, and says why in words when it's the quota. */
function failed(action: string, error: unknown): FormState {
  console.error(`[subscriptions] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
}

const GONE: FormState = { status: "invalid", errors: { form: "This subscription isn't in the Subscriptions tab any more. Close this and refresh." } };

function refreshed(...tags: string[]): FormState {
  for (const tag of tags) updateTag(tag);
  return { status: "saved", at: Date.now() };
}

/**
 * Add subscription, or Edit subscription when the form carries an id. On edit, a blank
 * charged-to or cancelled-on date clears it, and moving a paused or cancelled one back to
 * Active starts it again today, so the renewals missed meanwhile aren't flagged.
 */
export async function saveSubscription(_previous: FormState, formData: FormData): Promise<FormState> {
  let cards: Awaited<ReturnType<typeof getCachedCards>>, accounts: Awaited<ReturnType<typeof getCachedAccounts>>;
  try {
    [cards, accounts] = await Promise.all([getCachedCards(), getCachedAccounts()]);
  } catch (error) {
    return failed("saveSubscription", error);
  }
  const id = formData.get("id");
  const editing = typeof id === "string" && id !== "";
  let existing: Subscription | null = null;
  try {
    existing = editing ? await subscriptionsRepository.get(id) : null;
  } catch (error) {
    return failed("saveSubscription", error);
  }
  if (editing && !existing) return GONE;
  const result = readSubscriptionForm(fields(formData), { cardIds: cards.map((c) => c.id), accountIds: accounts.map((a) => a.id) }, editing, {
    endDateOptional: existing?.status === "Cancelled" && !existing.endDate,
  });
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    if (existing) {
      const startsAgain = existing.status !== "Active" && result.input.status === "Active";
      await subscriptionsRepository.update(
        existing.id,
        updateSubscriptionSchema.parse({
          ...result.input,
          billingAnchorDate: anchorToSave(existing, result.input),
          endDate: result.input.endDate ?? "",
          defaultPaidFromCardId: result.input.defaultPaidFromCardId ?? "",
          defaultPaidFromAccountId: result.input.defaultPaidFromAccountId ?? "",
          ...(startsAgain && { resumedOn: todayIso() }),
        }) as Partial<Omit<Subscription, "id">>,
      );
    } else {
      await subscriptionsRepository.create(createSubscriptionSchema.parse(result.input));
    }
  } catch (error) {
    if (error instanceof NotFoundError) return GONE;
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveSubscription", error);
  }
  return refreshed(CACHE_TAGS.subscriptions);
}

/** Delete subscription: its payments first, then it, so a delete that fails half way leaves it there to delete again. */
export async function deleteSubscription(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return GONE;
  try {
    await subscriptionPaymentsRepository.removeWhere((payment) => payment.subscriptionId === id);
    await subscriptionsRepository.remove(id);
  } catch (error) {
    return failed("deleteSubscription", error);
  }
  return refreshed(CACHE_TAGS.subscriptions, CACHE_TAGS.subscriptionPayments);
}

/**
 * Record a payment. With "update the price" ticked (offered when it's 2% or more off the
 * plan), the plan's price is updated first, then the payment saved: if the save fails, Try
 * again updates the price again (harmless) rather than saving the payment twice.
 */
export async function recordPayment(_previous: FormState, formData: FormData): Promise<FormState> {
  let subscriptions: Subscription[], cards: Awaited<ReturnType<typeof getCachedCards>>, accounts: Awaited<ReturnType<typeof getCachedAccounts>>;
  try {
    [subscriptions, cards, accounts] = await Promise.all([getCachedSubscriptions(), getCachedCards(), getCachedAccounts()]);
  } catch (error) {
    return failed("recordPayment", error);
  }
  const result = readPaymentForm(fields(formData), { subscriptionIds: subscriptions.map((s) => s.id), cardIds: cards.map((c) => c.id), accountIds: accounts.map((a) => a.id) });
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const { payment, updatePlan } = result.input;
  const subscription = subscriptions.find((s) => s.id === payment.subscriptionId)!;
  try {
    if (updatePlan && offPlan(payment.amount, subscription.amount)) await subscriptionsRepository.update(subscription.id, { amount: payment.amount });
    await subscriptionPaymentsRepository.create(createSubscriptionPaymentSchema.parse(payment));
  } catch (error) {
    if (error instanceof NotFoundError) return GONE;
    return failed("recordPayment", error);
  }
  return refreshed(CACHE_TAGS.subscriptions, CACHE_TAGS.subscriptionPayments);
}

/**
 * Pause, Cancel (with the date it was cancelled), Resume and Restart (with the date it
 * starts again: the renewals missed meanwhile aren't expected). Restart also clears the
 * cancelled-on date.
 */
export async function changeSubscriptionStatus(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const change = formData.get("change");
  let existing: Subscription | null;
  try {
    existing = id ? await subscriptionsRepository.get(id) : null;
  } catch (error) {
    return failed("changeSubscriptionStatus", error);
  }
  if (!existing) return GONE;
  // Each change only from the status it's offered in, so a stale page can't, say, resume an active one.
  const from: Record<string, Subscription["status"][]> = { pause: ["Active"], cancel: ["Active", "Paused"], resume: ["Paused"], restart: ["Cancelled"] };
  if (typeof change === "string" && from[change] && !from[change].includes(existing.status)) {
    return { status: "invalid", errors: { form: `It's ${existing.status.toLowerCase()} now, so nothing was changed. Close this and refresh.` } };
  }
  let patch: Record<string, string>;
  if (change === "pause") patch = { status: "Paused" };
  else if (change === "cancel") {
    const date = readDateForm(fields(formData), "endDate", existing.startDate);
    if (!date.ok) return { status: "invalid", errors: date.errors };
    patch = { status: "Cancelled", endDate: date.input };
  } else if (change === "resume" || change === "restart") {
    const date = readDateForm(fields(formData), "resumedOn", existing.startDate);
    if (!date.ok) return { status: "invalid", errors: date.errors };
    patch = { status: "Active", resumedOn: date.input, ...(change === "restart" && { endDate: "" }) };
  } else return { status: "invalid", errors: { form: "Choose what to do with it." } };
  try {
    await subscriptionsRepository.update(id, updateSubscriptionSchema.parse(patch) as Partial<Omit<Subscription, "id">>);
  } catch (error) {
    if (error instanceof NotFoundError) return GONE;
    return failed("changeSubscriptionStatus", error);
  }
  return refreshed(CACHE_TAGS.subscriptions);
}

/** What a one-click Mark paid did: the payment it wrote, for its toast and Undo. */
export type MarkPaidResult = { ok: true; paymentId: string; written: PaymentInput; message: string } | { ok: false; message: string };

function quickFailed(action: string, error: unknown): MarkPaidResult {
  console.error(`[subscriptions] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return { ok: false, message: sheetsFailureMessage(error) };
}

/**
 * Mark paid in one click (#128): the plan's price on the renewal date, to where it's
 * usually charged. Offered from 3 days before a renewal (renewalAction); one already
 * recorded is refused, so a double click can't pay it twice.
 */
export async function markRenewalPaid(subscriptionId: string, renewalDate: string): Promise<MarkPaidResult> {
  const today = todayIso();
  let subscription: Subscription | null;
  let payments: Awaited<ReturnType<typeof getCachedSubscriptionPayments>>;
  try {
    [subscription, payments] = await Promise.all([subscriptionsRepository.get(subscriptionId), subscriptionPaymentsRepository.list()]);
  } catch (error) {
    return quickFailed("markRenewalPaid", error);
  }
  if (!subscription) return { ok: false, message: "This subscription isn't in the Subscriptions tab any more. Refresh to see what's there." };
  const renewal = renewalsFor(subscription, payments, renewalDate, renewalDate, today)[0];
  if (!renewal || renewalAction(renewal, today) !== "mark-paid") return { ok: false, message: "This renewal is already recorded, or isn't due yet. Refresh to see it." };
  const written = markPaidPayment(subscription, renewalDate);
  let saved;
  try {
    saved = await subscriptionPaymentsRepository.create(createSubscriptionPaymentSchema.parse(written));
  } catch (error) {
    return quickFailed("markRenewalPaid", error);
  }
  updateTag(CACHE_TAGS.subscriptionPayments);
  return { ok: true, paymentId: saved.id, written, message: `${subscription.alias}: ${formatInr(written.amount)} paid on ${formatShortDate(renewalDate)}` };
}

/** Undo for Mark paid: deletes the payment it wrote, unless it's been changed since. */
export async function undoMarkPaid(paymentId: string, written: PaymentInput): Promise<{ ok: boolean; message: string }> {
  let payment;
  try {
    payment = await subscriptionPaymentsRepository.get(paymentId);
  } catch (error) {
    return quickFailed("undoMarkPaid", error);
  }
  if (!payment) return { ok: true, message: "Already removed." };
  if (payment.subscriptionId !== written.subscriptionId || payment.paymentDate !== written.paymentDate || payment.amount !== written.amount) {
    return { ok: false, message: "This payment has changed since, so it wasn't removed." };
  }
  try {
    await subscriptionPaymentsRepository.remove(paymentId);
  } catch (error) {
    return quickFailed("undoMarkPaid", error);
  }
  updateTag(CACHE_TAGS.subscriptionPayments);
  return { ok: true, message: "Put back as it was." };
}
