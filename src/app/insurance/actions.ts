"use server";

import { updateTag } from "next/cache";
import type { FormState } from "@/lib/forms/formState";
import { policyEditPatch, readCancelForm, readPolicyForm, readRenewForm } from "@/lib/forms/insuranceForms";
import { addPolicy, cancelPolicy, deletePolicy, parseRenewalUndo, renewPolicy, renewalUndoToken, restartPolicy, undoRenewal, type InsuranceRepos } from "@/lib/insurance/policyWrites";
import { CACHE_TAGS, getCachedAccounts, getCachedCards } from "@/lib/sheets/cached";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { policiesRepository, updatePolicySchema } from "@/lib/sheets/policies";
import { policyPaymentsRepository } from "@/lib/sheets/policyPayments";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";
import type { Policy } from "@/lib/sheets/types";
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
      await addPolicy(repos, { ...policy, status: "Active" }, term!);
    }
  } catch (error) {
    return written("savePolicy", error);
  }
  return refreshed();
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
    await cancelPolicy(repos, result.input.policyId, result.input);
  } catch (error) {
    return written("cancelPolicyForm", error);
  }
  return refreshed();
}

/** Restart a cancelled policy. */
export async function restartPolicyAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const policyId = String(formData.get("policyId") ?? "");
  if (!policyId) return GONE;
  try {
    await restartPolicy(repos, policyId);
  } catch (error) {
    return written("restartPolicyAction", error);
  }
  return refreshed();
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
