"use server";

import { updateTag } from "next/cache";
import type { FormState } from "@/lib/forms/formState";
import { policyEditPatch, readCancelForm, readPaymentForm, readPolicyForm, readRenewForm } from "@/lib/forms/insuranceForms";
import { addPolicy, cancelPolicy, deletePolicy, editableFields, paymentFields, parsePolicyUndo, parseRenewalUndo, policyUndoToken, renewPolicy, renewalUndoToken, restartPolicy, undoRenewal, updateTerm, type InsuranceRepos } from "@/lib/insurance/policyWrites";
import { CACHE_TAGS, getCachedAccounts, getCachedCards } from "@/lib/sheets/cached";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { policiesRepository, updatePolicySchema } from "@/lib/sheets/policies";
import { policyPaymentsRepository } from "@/lib/sheets/policyPayments";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";
import type { Policy, PolicyPayment } from "@/lib/sheets/types";
import { formatDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";

/**
 * The Insurance forms' server actions (#211), used with useActionState, as the Subscriptions forms' are: each reads the form with
 * lib/forms/insuranceForms.ts (plain-word errors by field), then writes with lib/insurance/policyWrites.ts, which checks the entity's
 * schemas again and undoes a half-finished write. Nothing reaches the Sheet until the form is valid, and a failed write returns
 * { status: "failed" } so the dialog keeps its input for Try again.
 */

const repos: InsuranceRepos = { policies: policiesRepository, payments: policyPaymentsRepository };
const fields = (formData: FormData) => Object.fromEntries(formData.entries());
const GONE_PAYMENT: FormState = { status: "invalid", errors: { form: "This payment isn't in the PolicyPayments tab any more. Close this and refresh." } };
const GONE: FormState = { status: "invalid", errors: { form: "This policy isn't in the Policies tab any more. Close this and refresh." } };

/** Logs a failed read or write without the form's values, and says why in words when it's the quota. */
function failed(action: string, error: unknown): FormState {
  console.error(`[insurance] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
}

/** What a thrown write means to the dialog: a gone policy, a row the schemas refuse (in words), or a failure. */
function written(action: string, error: unknown): FormState {
  if (error instanceof NotFoundError) return GONE;
  if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
  return failed(action, error);
}

function refreshed(undo?: { id: string; message: string }): FormState {
  updateTag(CACHE_TAGS.policies);
  updateTag(CACHE_TAGS.policyPayments);
  return { status: "saved", at: Date.now(), ...(undo && { undo }) };
}

async function knownPlaces() {
  const [cards, accounts] = await Promise.all([getCachedCards(), getCachedAccounts()]);
  return { cardIds: cards.map((c) => c.id), accountIds: accounts.map((a) => a.id) };
}

/**
 * Add policy, or Edit policy when the form carries an id. Adding writes the policy and its first term together. Editing changes
 * the policy only: a blank optional box clears it, except the policy number, which the browser never has whole, so a blank
 * number is left as it is.
 */
export async function savePolicy(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = formData.get("id");
  const editing = typeof id === "string" && id !== "";
  let known: Awaited<ReturnType<typeof knownPlaces>>;
  let existing: Policy | null = null;
  try {
    known = await knownPlaces();
    existing = editing ? await policiesRepository.get(id) : null;
  } catch (error) {
    return failed("savePolicy", error);
  }
  if (editing && !existing) return GONE;
  const result = readPolicyForm(fields(formData), known, editing);
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const { policy, term } = result.input;
  try {
    if (existing) {
      await policiesRepository.update(existing.id, updatePolicySchema.parse(policyEditPatch(policy)) as Partial<Omit<Policy, "id">>);
    } else {
      const added = await addPolicy(repos, { ...policy, status: "Active" }, term!);
      return refreshed({ id: policyUndoToken({ undo: "add", policyId: added.policy.id }), message: `${added.policy.name} added` });
    }
  } catch (error) {
    return written("savePolicy", error);
  }
  return refreshed(existing ? { id: policyUndoToken({ undo: "edit", policyId: existing.id, previous: editableFields(existing) }), message: `${policy.name} saved` } : undefined);
}

/** Renew: the next term, with Undo for the toast (it takes the term out and puts back the cover it changed). */
export async function renewPolicyForm(_previous: FormState, formData: FormData): Promise<FormState> {
  const policyId = String(formData.get("policyId") ?? "");
  let policy: Policy | null, known: Awaited<ReturnType<typeof knownPlaces>>;
  try {
    [policy, known] = await Promise.all([policyId ? policiesRepository.get(policyId) : Promise.resolve(null), knownPlaces()]);
  } catch (error) {
    return failed("renewPolicyForm", error);
  }
  if (!policy) return GONE;
  const result = readRenewForm(fields(formData), known, policy.kind === "Motor");
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    const renewal = await renewPolicy(repos, policyId, result.input.term, result.input.sumInsured, policy);
    const { periodStart, years, amount } = result.input.term;
    return refreshed({ id: renewalUndoToken({ paymentId: renewal.payment.id, policyId, previousSumInsured: renewal.previousSumInsured }), message: `${policy.name} renewed for ${years === 1 ? "1 year" : `${years} years`} from ${formatDate(periodStart)} · ${formatInr(amount)}` });
  } catch (error) {
    return written("renewPolicyForm", error);
  }
}

/** Undo a renewal from its toast: the term goes, and the cover it changed comes back. */
export async function undoRenewalAction(token: string): Promise<{ ok: boolean; message: string }> {
  const undo = parseRenewalUndo(token);
  if (!undo) return { ok: false, message: "That can't be undone any more." };
  try {
    await undoRenewal(repos, undo.policyId, undo);
  } catch (error) {
    console.error("[insurance] undoRenewal failed:", error instanceof Error ? error.message : String(error));
    return { ok: false, message: "Couldn't undo that. Delete the term from the policy's history." };
  }
  refreshed();
  return { ok: true, message: "Renewal undone" };
}

/** Cancel: the policy stops counting and keeps its payments. */
export async function cancelPolicyForm(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = readCancelForm(fields(formData));
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    const policy = await policiesRepository.get(result.input.policyId);
    if (!policy) return GONE;
    await cancelPolicy(repos, result.input.policyId, result.input);
    return refreshed({ id: policyUndoToken({ undo: "cancel", policyId: policy.id }), message: `${policy.name} cancelled` });
  } catch (error) {
    return written("cancelPolicyForm", error);
  }
}

/** Restart a cancelled policy. */
export async function restartPolicyAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const policyId = String(formData.get("policyId") ?? "");
  if (!policyId) return GONE;
  try {
    const policy = await policiesRepository.get(policyId);
    if (!policy) return GONE;
    await restartPolicy(repos, policyId);
    return refreshed({ id: policyUndoToken({ undo: "restart", policyId, ...(policy.endedOn && { endedOn: policy.endedOn }) }), message: `${policy.name} restarted` });
  } catch (error) {
    return written("restartPolicyAction", error);
  }
}

/** Delete policy (for a mistake: a cancelled one stays on record): its payments first, then it. */
export async function deletePolicyAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const policyId = String(formData.get("policyId") ?? "");
  if (!policyId) return GONE;
  try {
    await deletePolicy(repos, policyId);
  } catch (error) {
    return failed("deletePolicyAction", error);
  }
  return refreshed();
}

/** Edit payment: a recorded term corrected (the day paid, its cost, where it came from, its dates). It goes through the same guard as Renew, and offers Undo. */
export async function savePaymentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const paymentId = String(formData.get("paymentId") ?? "");
  let payment: PolicyPayment | null, policy: Policy | null, known: Awaited<ReturnType<typeof knownPlaces>>;
  try {
    payment = paymentId ? await policyPaymentsRepository.get(paymentId) : null;
    [policy, known] = await Promise.all([payment ? policiesRepository.get(payment.policyId) : Promise.resolve(null), knownPlaces()]);
  } catch (error) {
    return failed("savePaymentAction", error);
  }
  if (!payment || !policy) return GONE_PAYMENT;
  const result = readPaymentForm(fields(formData), known, policy.kind === "Motor");
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    await updateTerm(repos, paymentId, result.input.patch as unknown as Partial<Omit<PolicyPayment, "id">>, { stored: payment, policy });
  } catch (error) {
    return written("savePaymentAction", error);
  }
  return refreshed({ id: policyUndoToken({ undo: "payment", policyId: policy.id, paymentId, previous: paymentFields(payment) }), message: `${policy.name} payment saved` });
}

/** Delete payment: a term recorded by mistake. The policy and its other terms stay; a policy left with no term shows as having none. */
export async function deletePaymentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const paymentId = String(formData.get("paymentId") ?? "");
  if (!paymentId) return GONE_PAYMENT;
  try {
    await policyPaymentsRepository.remove(paymentId);
  } catch (error) {
    return failed("deletePaymentAction", error);
  }
  return refreshed();
}

/**
 * Undo from a toast, for whatever it was offered on: a renewal, an added policy, a cancel, a restart or an edit. The token comes from
 * the browser, so it's parsed and refused when it isn't one of these. An edit puts its fields back through the same schema as any
 * update; it leaves a policy number that was changed, since the old one was never sent.
 */
export async function undoAction(token: string): Promise<{ ok: boolean; message: string }> {
  const change = parsePolicyUndo(token);
  if (!change) return undoRenewalAction(token);
  try {
    if (change.undo === "add") await deletePolicy(repos, change.policyId);
    else if (change.undo === "cancel") await restartPolicy(repos, change.policyId);
    else if (change.undo === "restart") await cancelPolicy(repos, change.policyId, { endedOn: change.endedOn });
    else if (change.undo === "payment") {
      // The token comes from the browser: it only puts back a term that is this policy's.
      const stored = await policyPaymentsRepository.get(change.paymentId);
      if (!stored || stored.policyId !== change.policyId) throw new InvalidRowError("That payment belongs to a different policy");
      await updateTerm(repos, change.paymentId, change.previous as Partial<Omit<PolicyPayment, "id">>);
    }
    else await policiesRepository.update(change.policyId, updatePolicySchema.parse(change.previous) as Partial<Omit<Policy, "id">>);
  } catch (error) {
    console.error("[insurance] undo failed:", error instanceof Error ? error.message : String(error));
    return { ok: false, message: "Couldn't undo that. Change it from the policy's details." };
  }
  refreshed();
  return { ok: true, message: { add: "Policy removed", cancel: "Policy restarted", restart: "Policy cancelled again", edit: "Edit undone", payment: "Payment put back" }[change.undo] };
}
