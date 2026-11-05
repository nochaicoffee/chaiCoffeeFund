"use server";

import { updateTag } from "next/cache";
import { formatDate, todayIso } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { readCloseForm, readDepositForm } from "@/lib/forms/depositForms";
import type { FormState } from "@/lib/forms/formState";
import { accountsRepository } from "@/lib/sheets/accounts";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { createFixedDepositSchema, fixedDepositsRepository, updateFixedDepositSchema } from "@/lib/sheets/fixedDeposits";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";
import type { FixedDeposit } from "@/lib/sheets/types";

/**
 * The deposit forms' server actions (#262), used with useActionState like the other dashboards': each reads the fields with lib/forms
 * (plain-word errors by field), then writes. Closing records what reached his account and the day; it doesn't change any account's
 * balance (balances are updated on the Accounts page). A new or closed deposit comes back with what Undo takes back.
 */

const fields = (formData: FormData) => Object.fromEntries(formData.entries());
const id = (formData: FormData) => {
  const value = formData.get("id");
  return typeof value === "string" && value !== "" ? value : undefined;
};
const gone: FormState = { status: "invalid", errors: { form: "This deposit isn't in the Sheet any more. Close this and refresh." } };

function failed(action: string, error: unknown): FormState {
  console.error(`[fixed-income] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
}
function refreshed(undo?: { id: string; message: string }): FormState {
  updateTag(CACHE_TAGS.fixedDeposits);
  return { status: "saved", at: Date.now(), ...(undo && { undo }) };
}

/** What Undo is handed: which kind of change, the row, and what the form wrote, so a row changed since isn't taken back. */
type UndoToken = { op: "added"; id: string; principalAmount: number; interestRate: number; startDate: string; maturityDate: string } | { op: "closed"; id: string; closedDate: string; receivedAmount: number };
const token = (value: UndoToken): string => JSON.stringify(value);

/** Add a deposit, or Edit one that isn't closed when the form carries an id. */
export async function saveDeposit(_previous: FormState, formData: FormData): Promise<FormState> {
  const editing = id(formData);
  let accountIds: string[];
  let stored: FixedDeposit | null = null;
  try {
    accountIds = (await accountsRepository.list()).map((a) => a.id);
    if (editing) stored = await fixedDepositsRepository.get(editing);
  } catch (error) {
    return failed("saveDeposit", error);
  }
  if (editing && !stored) return gone;
  if (stored?.status === "Closed") return { status: "invalid", errors: { form: "A closed deposit can't be edited. Reopen it first." } };
  const result = readDepositForm(fields(formData), { accountIds }, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const input = result.input;
  try {
    if (editing) {
      // "" clears an optional field; switching to Cumulative clears the payout frequency with it.
      await fixedDepositsRepository.update(
        editing,
        updateFixedDepositSchema.parse({ ...input, bankName: input.bankName ?? "", payoutFrequency: input.payoutFrequency ?? "", maturityAmount: input.maturityAmount ?? "" }) as Partial<Omit<FixedDeposit, "id">>,
      );
      return refreshed();
    }
    const { accountId, ...rest } = input;
    const created = await fixedDepositsRepository.create(createFixedDepositSchema.parse({ ...rest, ...(accountId && { accountId }), status: "Active" }));
    return refreshed({ id: token({ op: "added", id: created.id, principalAmount: input.principalAmount, interestRate: input.interestRate, startDate: input.startDate, maturityDate: input.maturityDate }), message: `Added · ${formatInr(input.principalAmount)} at ${input.interestRate}%, matures ${formatDate(input.maturityDate)}` });
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveDeposit", error);
  }
}

/** Close a deposit: what reached his account, the day, and (from the day) whether it matured or was closed early. */
export async function closeDeposit(_previous: FormState, formData: FormData): Promise<FormState> {
  const depositId = id(formData);
  if (!depositId) return gone;
  let stored: FixedDeposit | null;
  try {
    stored = await fixedDepositsRepository.get(depositId);
  } catch (error) {
    return failed("closeDeposit", error);
  }
  if (!stored) return gone;
  if (stored.status === "Closed") return { status: "invalid", errors: { form: "This deposit is already closed. Refresh to see it." } };
  const result = readCloseForm(fields(formData), stored, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    await fixedDepositsRepository.update(depositId, updateFixedDepositSchema.parse({ status: "Closed", ...result.input }) as Partial<Omit<FixedDeposit, "id">>);
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("closeDeposit", error);
  }
  const how = result.input.closeKind === "Matured" ? "matured" : "closed early";
  return refreshed({ id: token({ op: "closed", id: depositId, closedDate: result.input.closedDate, receivedAmount: result.input.receivedAmount }), message: `Closed · ${formatInr(result.input.receivedAmount)} received ${formatDate(result.input.closedDate)} (${how})` });
}

/** Put a closed deposit back as held: the day, the amount and how it closed are cleared. */
export async function reopenDeposit(_previous: FormState, formData: FormData): Promise<FormState> {
  const depositId = id(formData);
  if (!depositId) return gone;
  try {
    await fixedDepositsRepository.update(depositId, updateFixedDepositSchema.parse({ status: "Active" }) as Partial<Omit<FixedDeposit, "id">>);
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    return failed("reopenDeposit", error);
  }
  return refreshed();
}

/** Delete a deposit and its row. */
export async function deleteDeposit(_previous: FormState, formData: FormData): Promise<FormState> {
  const depositId = id(formData);
  if (!depositId) return gone;
  try {
    await fixedDepositsRepository.remove(depositId);
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    return failed("deleteDeposit", error);
  }
  return refreshed();
}

/** Undo for a deposit just added (removed) or closed (reopened), only while it is still what the form wrote. */
export async function undoDeposit(raw: string): Promise<{ ok: boolean; message: string }> {
  let written: UndoToken;
  try {
    written = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Couldn't undo it. Change it from the list instead." };
  }
  try {
    const deposit = await fixedDepositsRepository.get(written.id);
    if (written.op === "added") {
      if (!deposit) return { ok: true, message: "Already removed." };
      if (deposit.principalAmount !== written.principalAmount || deposit.interestRate !== written.interestRate || deposit.startDate !== written.startDate || deposit.maturityDate !== written.maturityDate || deposit.status === "Closed") return { ok: false, message: "That deposit has changed since, so it wasn't removed. Delete it from the list if you want it gone." };
      await fixedDepositsRepository.remove(written.id);
    } else {
      if (!deposit) return { ok: false, message: "That deposit isn't in the Sheet any more." };
      if (deposit.status !== "Closed") return { ok: true, message: "Already open." };
      if (deposit.closedDate !== written.closedDate || deposit.receivedAmount !== written.receivedAmount) return { ok: false, message: "That deposit has changed since, so it wasn't reopened." };
      await fixedDepositsRepository.update(written.id, updateFixedDepositSchema.parse({ status: "Active" }) as Partial<Omit<FixedDeposit, "id">>);
    }
  } catch (error) {
    console.error("[fixed-income] undoDeposit failed:", error instanceof Error ? error.message : String(error));
    return { ok: false, message: isQuotaError(error) ? sheetsFailureMessage(error) : "Couldn't undo it. Change it from the list instead." };
  }
  updateTag(CACHE_TAGS.fixedDeposits);
  return { ok: true, message: "Put back as it was." };
}
