import { checkNewTerm, paidTerms } from "../aggregate/insurance";
import { createPolicySchema, updatePolicySchema } from "../sheets/policies";
import { createPolicyPaymentSchema, updatePolicyPaymentSchema } from "../sheets/policyPayments";
import { InvalidRowError, NotFoundError } from "../sheets/repository";
import type { Policy, PolicyPayment } from "../sheets/types";

/**
 * What the Insurance forms write to the Sheet (#211), apart from the server actions that read a form and refresh the cache. Each
 * is a few writes that have to stay together, so a failure half way undoes what it did and the dialog's Try again is clean.
 * They take the two repositories as arguments, so they're tested against in-memory ones; the real ones are passed by
 * app/insurance/actions.ts. The rules are in lib/aggregate/insurance.ts (`checkNewTerm`) and the schemas.
 */

interface Repo<T extends { id: string }> {
  list: () => Promise<T[]>;
  get: (id: string) => Promise<T | null>;
  create: (input: Omit<T, "id">) => Promise<T>;
  update: (id: string, patch: Partial<Omit<T, "id">>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  removeWhere: (match: (values: Partial<Record<keyof T, unknown>>) => boolean) => Promise<number>;
}

export interface InsuranceRepos {
  policies: Repo<Policy>;
  payments: Repo<PolicyPayment>;
}

/** The first or next term as a form sends it, with the policy it belongs to added by the write. */
export type TermInput = Omit<PolicyPayment, "id" | "policyId" | "status">;

const GONE = "This policy isn't in the Policies tab any more. Close this and refresh.";

/** Throws the plain-words problem if a term can't be recorded against the policy's other Paid terms (`exceptId`: the one being changed). */
async function assertTermFits(repos: InsuranceRepos, policy: Policy, term: { periodStart: string; years: number; ncb?: number }, exceptId?: string): Promise<void> {
  const others = (await repos.payments.list()).filter((payment) => payment.id !== exceptId);
  const problem = checkNewTerm(policy, paidTerms(policy.id, others), term);
  if (problem) throw new InvalidRowError(problem);
}

/**
 * Record a term through the API (POST /api/policy-payments): the same guard as Renew, so the routes can't do what the forms refuse.
 * A Pending term is a quote, which can overlap what's there, so only a Paid one is checked.
 */
export async function createTerm(repos: InsuranceRepos, input: Omit<PolicyPayment, "id">): Promise<PolicyPayment> {
  const term = createPolicyPaymentSchema.parse(input);
  const policy = await repos.policies.get(term.policyId);
  if (!policy) throw new NotFoundError(GONE);
  if (term.status === "Paid") await assertTermFits(repos, policy, term);
  return repos.payments.create(term);
}

/**
 * Change a term (PATCH /api/policy-payments/[id], and Edit payment): what it would be once merged must still fit the policy's other terms,
 * checked only when the change moves the term (its start, its years, its no-claim step or its status). Correcting the day paid, the amount
 * or where it came from can't make it overlap anything, so a term that already overlaps another can still be corrected. `known` is what the
 * caller has just read (the term, its policy), so they aren't read again.
 */
export async function updateTerm(repos: InsuranceRepos, id: string, patch: Partial<Omit<PolicyPayment, "id">>, known?: { stored?: PolicyPayment; policy?: Policy }): Promise<PolicyPayment> {
  const stored = known?.stored ?? (await repos.payments.get(id));
  if (!stored) throw new NotFoundError("This term isn't in the PolicyPayments tab any more.");
  const change = updatePolicyPaymentSchema.parse(patch) as Partial<Omit<PolicyPayment, "id">>;
  const merged = { ...stored, ...change };
  const moved = (["periodStart", "years", "ncb", "status"] as const).some((key) => key in change && change[key] !== stored[key]);
  if (merged.status === "Paid" && moved) {
    const policy = known?.policy ?? (await repos.policies.get(stored.policyId));
    if (!policy) throw new NotFoundError(GONE);
    await assertTermFits(repos, policy, merged, id);
  }
  return repos.payments.update(id, change);
}

/** Runs `undo` if `work` throws, then throws what `work` threw: so a failure leaves the Sheet as it was. */
async function orUndo<T>(work: () => Promise<T>, undo: () => Promise<void>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    try {
      await undo();
    } catch (undoError) {
      console.error("[insurance] could not undo a half-finished write:", undoError instanceof Error ? undoError.message : String(undoError));
    }
    throw error;
  }
}

/** Add policy: the policy, then its first term. If the term can't be written the policy is taken back out. */
export async function addPolicy(repos: InsuranceRepos, policy: Omit<Policy, "id">, term: TermInput): Promise<{ policy: Policy; payment: PolicyPayment }> {
  const policyInput = createPolicySchema.parse(policy);
  const problem = checkNewTerm(policyInput, [], term);
  if (problem) throw new InvalidRowError(problem);
  const created = await repos.policies.create(policyInput);
  const payment = await orUndo(
    () => repos.payments.create(createPolicyPaymentSchema.parse({ ...term, policyId: created.id, status: "Paid" })),
    () => repos.policies.remove(created.id),
  );
  return { policy: created, payment };
}

/** What Renew changed, so Undo can put it back. */
export interface Renewal {
  payment: PolicyPayment;
  /** The cover before the renewal, restored by Undo when the renewal changed it. */
  previousSumInsured: number;
}

/**
 * Renew: record the next term, and move the policy's cover to the new term's when the form changed it. A cancelled policy is
 * restarted first. The term is checked against the ones already there (a duplicate, an overlap, a no-claim step on a policy that
 * isn't motor are refused), and a late start is allowed: it leaves a gap in cover that the history keeps.
 */
export async function renewPolicy(repos: InsuranceRepos, policyId: string, term: TermInput, newSumInsured?: number, known?: Policy): Promise<Renewal> {
  // The action has just read the policy to know its kind, so it passes it in rather than have it read again.
  const policy = known ?? (await repos.policies.get(policyId));
  if (!policy) throw new NotFoundError(GONE);
  if (policy.status === "Cancelled") throw new InvalidRowError("This policy is cancelled: restart it before renewing it");
  await assertTermFits(repos, policy, term);
  const payment = await repos.payments.create(createPolicyPaymentSchema.parse({ ...term, policyId, status: "Paid" }));
  const coverChanged = newSumInsured !== undefined && newSumInsured !== policy.sumInsured;
  if (coverChanged) {
    await orUndo(
      () => repos.policies.update(policyId, updatePolicySchema.parse({ sumInsured: newSumInsured }) as Partial<Omit<Policy, "id">>),
      () => repos.payments.remove(payment.id),
    );
  }
  return { payment, previousSumInsured: policy.sumInsured };
}

/** Undo Renew: take the term back out, and put back the cover it changed. */
export async function undoRenewal(repos: InsuranceRepos, policyId: string, renewal: Pick<Renewal, "previousSumInsured"> & { paymentId: string }): Promise<void> {
  // The token comes from the browser, so it only undoes a term that is this policy's. A term already gone leaves nothing to undo.
  const payment = await repos.payments.get(renewal.paymentId);
  if (!payment) return;
  if (payment.policyId !== policyId) throw new InvalidRowError("That term belongs to a different policy");
  await repos.payments.remove(payment.id);
  const policy = await repos.policies.get(policyId);
  if (policy && policy.sumInsured !== renewal.previousSumInsured) {
    await repos.policies.update(policyId, updatePolicySchema.parse({ sumInsured: renewal.previousSumInsured }) as Partial<Omit<Policy, "id">>);
  }
}

/** Cancel: the policy stops counting and keeps every payment. The reason, when there is one, goes on its notes. */
export async function cancelPolicy(repos: InsuranceRepos, policyId: string, cancel: { endedOn?: string; reason?: string }): Promise<void> {
  const policy = await repos.policies.get(policyId);
  if (!policy) throw new NotFoundError(GONE);
  // Cancelling, restarting and cancelling again for the same reason doesn't write the note twice.
  const note = cancel.reason && !(policy.notes ?? "").includes(`Cancelled: ${cancel.reason}`) ? `Cancelled: ${cancel.reason}` : undefined;
  const notes = [policy.notes, note].filter(Boolean).join(" · ");
  await repos.policies.update(
    policyId,
    updatePolicySchema.parse({ status: "Cancelled", endedOn: cancel.endedOn ?? "", ...(notes && { notes }) }) as Partial<Omit<Policy, "id">>,
  );
}

/** Restart a cancelled policy: Active again, with the cancelled-on date cleared (setting it Active implies that). */
export async function restartPolicy(repos: InsuranceRepos, policyId: string): Promise<void> {
  const policy = await repos.policies.get(policyId);
  if (!policy) throw new NotFoundError(GONE);
  await repos.policies.update(policyId, updatePolicySchema.parse({ status: "Active" }) as Partial<Omit<Policy, "id">>);
}

/** Delete a policy: its payments first, then it, so a delete that fails half way leaves it there to delete again. */
export async function deletePolicy(repos: InsuranceRepos, policyId: string): Promise<void> {
  await repos.payments.removeWhere((payment) => payment.policyId === policyId);
  await repos.policies.remove(policyId);
}

/**
 * What Undo needs, as the one string a toast carries (the FormState's `undo.id`): the term to take out, the policy, and the cover
 * to put back. Read back with `parseRenewalUndo`, which refuses anything else.
 */
export interface RenewalUndo {
  paymentId: string;
  policyId: string;
  previousSumInsured: number;
}

export const renewalUndoToken = (undo: RenewalUndo): string => JSON.stringify(undo);

export function parseRenewalUndo(token: string): RenewalUndo | null {
  try {
    const value = JSON.parse(token) as Partial<RenewalUndo>;
    const ok = typeof value.paymentId === "string" && value.paymentId !== "" && typeof value.policyId === "string" && value.policyId !== "" && typeof value.previousSumInsured === "number" && Number.isFinite(value.previousSumInsured) && value.previousSumInsured >= 0;
    return ok ? (value as RenewalUndo) : null;
  } catch {
    return null;
  }
}

/**
 * What Undo needs for the other changes a toast offers to take back, as the one string its `undo.id` carries: an added policy (delete
 * it), a cancel (restart it), a restart (cancel it again, on the day it had been cancelled), and an edit (put its fields back, except
 * the policy number, which the browser never has to send). Read back with `parsePolicyUndo`, which refuses anything else.
 */
export type PolicyUndo =
  | { undo: "add"; policyId: string }
  | { undo: "cancel"; policyId: string }
  | { undo: "restart"; policyId: string; endedOn?: string }
  | { undo: "edit"; policyId: string; previous: Record<string, string | number> }
  /** Edit payment: the term's fields as they were. */
  | { undo: "payment"; policyId: string; paymentId: string; previous: Record<string, string | number> };

export const policyUndoToken = (undo: PolicyUndo): string => JSON.stringify(undo);

export function parsePolicyUndo(token: string): PolicyUndo | null {
  try {
    const value = JSON.parse(token) as Partial<PolicyUndo> & { endedOn?: unknown; previous?: unknown };
    if (typeof value.policyId !== "string" || value.policyId === "") return null;
    if (value.undo === "add" || value.undo === "cancel") return { undo: value.undo, policyId: value.policyId };
    if (value.undo === "restart") return { undo: "restart", policyId: value.policyId, ...(typeof value.endedOn === "string" && value.endedOn !== "" && { endedOn: value.endedOn }) };
    if (value.undo === "payment" && typeof (value as { paymentId?: unknown }).paymentId === "string" && (value as { paymentId: string }).paymentId !== "" && value.previous && typeof value.previous === "object" && !Array.isArray(value.previous)) {
      const entries = Object.entries(value.previous as Record<string, unknown>);
      if (entries.every(([, v]) => typeof v === "string" || typeof v === "number")) return { undo: "payment", policyId: value.policyId, paymentId: (value as { paymentId: string }).paymentId, previous: Object.fromEntries(entries) as Record<string, string | number> };
    }
    if (value.undo === "edit" && value.previous && typeof value.previous === "object" && !Array.isArray(value.previous)) {
      const entries = Object.entries(value.previous as Record<string, unknown>);
      if (entries.every(([, v]) => typeof v === "string" || typeof v === "number")) return { undo: "edit", policyId: value.policyId, previous: Object.fromEntries(entries) as Record<string, string | number> };
    }
    return null;
  } catch {
    return null;
  }
}

/** The editable fields of a policy as they are now, for an Undo of its edit: not the policy number, and with each cleared field as blank so Undo clears it again. */
export function editableFields(policy: Policy): Record<string, string | number> {
  return {
    name: policy.name,
    kind: policy.kind,
    insurer: policy.insurer,
    covers: policy.covers,
    coversDetail: policy.coversDetail ?? "",
    sumInsured: policy.sumInsured,
    addOns: policy.addOns ?? "",
    claimsPhone: policy.claimsPhone ?? "",
    documentUrl: policy.documentUrl ?? "",
    notes: policy.notes ?? "",
    paidFromAccountId: policy.paidFromAccountId ?? "",
    paidFromCardId: policy.paidFromCardId ?? "",
    ...(policy.color !== undefined && { color: policy.color }),
  };
}

/** A term's editable fields as they are now, for an Undo of its edit: a cleared one is blank so Undo clears it again. */
export function paymentFields(payment: PolicyPayment): Record<string, string | number> {
  return {
    periodStart: payment.periodStart,
    years: payment.years,
    amount: payment.amount,
    paidOn: payment.paidOn ?? "",
    ncb: payment.ncb ?? "",
    paidFromAccountId: payment.paidFromAccountId ?? "",
    paidFromCardId: payment.paidFromCardId ?? "",
  };
}
