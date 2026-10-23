"use server";

import { updateTag } from "next/cache";
import { sameDayBalance } from "@/lib/aggregate/accounts";
import { todayIso } from "@/lib/format/date";
import { readAccountForm, readBalanceForm, readCheckInForm, readCloseForm, readEditBalanceForm } from "@/lib/forms/accountForms";
import type { FormState } from "@/lib/forms/formState";
import { accountsRepository, createAccountSchema, updateAccountSchema } from "@/lib/sheets/accounts";
import { balanceSnapshotsRepository, updateBalanceSnapshotSchema } from "@/lib/sheets/balanceSnapshots";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";
import type { Account, BalanceSnapshot } from "@/lib/sheets/types";

/**
 * The Accounts forms' server actions (#165), used with useActionState as the Cards and
 * Subscriptions forms' are: each checks the input with lib/forms (plain-word errors by field),
 * then writes. Nothing reaches the Sheet until it passes, and a failed write returns
 * { status: "failed" } so the dialog keeps the input for Try again. A balance saved on a day
 * that already has one replaces it (decision 7), and closing an account is a ₹0 balance on
 * the day plus Inactive (decision 5).
 */

const fields = (formData: FormData) => Object.fromEntries(formData.entries());

function failed(action: string, error: unknown): FormState {
  console.error(`[accounts] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
}

const GONE: FormState = { status: "invalid", errors: { form: "This account isn't in the Accounts tab any more. Close this and refresh." } };

function refreshed(...tags: string[]): FormState {
  for (const tag of tags) updateTag(tag);
  return { status: "saved", at: Date.now() };
}

/**
 * Writes balances one at a time (so the Sheet isn't written concurrently): each replaces its
 * day's if there is one, else is added. The tab is read once for all of them, and each write
 * is added to what's known, so two for one account and day in a call still make one row.
 */
async function writeBalances(entries: { accountId: string; date: string; balance: number }[], known?: BalanceSnapshot[]): Promise<void> {
  known ??= await balanceSnapshotsRepository.list();
  for (const { accountId, date, balance } of entries) {
    const same = sameDayBalance(known, accountId, date);
    if (same) {
      await balanceSnapshotsRepository.update(same.id, { balance });
      same.balance = balance;
    } else {
      known.push(await balanceSnapshotsRepository.create({ accountId, date, balance }));
    }
  }
}

/** Add account (with an optional opening balance, today's), or Edit account when the form carries an id. */
export async function saveAccount(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = formData.get("id");
  const editing = typeof id === "string" && id !== "";
  const result = readAccountForm(fields(formData), editing);
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const { balance, last4, ...account } = result.input;
  try {
    if (editing) {
      // A blank password keeps the saved one; "clearPassword" removes it (as Edit card does).
      const patch = updateAccountSchema.parse({ ...account, last4 }) as Partial<Omit<Account, "id">>;
      await accountsRepository.update(id, { ...patch, ...(formData.get("clearPassword") === "1" && { statementPdfPassword: undefined }) });
      return refreshed(CACHE_TAGS.accounts);
    }
    const created = await accountsRepository.create(createAccountSchema.parse({ ...account, status: "Active", ...(last4 && { last4 }) }));
    if (balance !== undefined) {
      try {
        await writeBalances([{ accountId: created.id, date: todayIso(), balance }]);
      } catch (error) {
        // Take the account back out, so Try again doesn't add it a second time. If that fails too (the same quota, say), say so rather than offer a retry that would duplicate it.
        const removed = await accountsRepository.remove(created.id).then(() => true, () => false);
        if (removed) throw error;
        console.error("[accounts] the account was added but its balance wasn't saved, and it couldn't be removed again:", error instanceof Error ? error.message : String(error));
        updateTag(CACHE_TAGS.accounts);
        return { status: "invalid", errors: { form: "The account was added, but its balance couldn't be saved. Close this and use Update balance to add it." } };
      }
    }
  } catch (error) {
    if (error instanceof NotFoundError) return GONE;
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveAccount", error);
  }
  return refreshed(CACHE_TAGS.accounts, CACHE_TAGS.balanceSnapshots);
}

/** Update balance: one balance for one account. */
export async function saveBalance(_previous: FormState, formData: FormData): Promise<FormState> {
  let accountIds: string[];
  try {
    accountIds = (await accountsRepository.list()).map((a) => a.id);
  } catch (error) {
    return failed("saveBalance", error);
  }
  const result = readBalanceForm(fields(formData), { accountIds }, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    await writeBalances([result.input]);
  } catch (error) {
    return failed("saveBalance", error);
  }
  return refreshed(CACHE_TAGS.balanceSnapshots);
}

/** The monthly check-in: every balance typed, for one day, one at a time so the Sheet isn't written concurrently. */
export async function saveCheckIn(_previous: FormState, formData: FormData): Promise<FormState> {
  let accountIds: string[];
  try {
    accountIds = (await accountsRepository.list()).map((a) => a.id);
  } catch (error) {
    return failed("saveCheckIn", error);
  }
  const result = readCheckInForm(fields(formData), { accountIds }, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    await writeBalances(result.input.balances.map((b) => ({ ...b, date: result.input.date })));
  } catch (error) {
    // Some may have been written; saving again replaces them rather than doubling them.
    return failed("saveCheckIn", error);
  }
  return refreshed(CACHE_TAGS.balanceSnapshots);
}

/** Close account: a ₹0 balance on the day, then Inactive. The balance first, so a failure half way leaves it open. */
export async function closeAccount(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return GONE;
  try {
    if (!(await accountsRepository.get(id))) return GONE;
    const known = await balanceSnapshotsRepository.list();
    const latest = known.filter((s) => s.accountId === id).map((s) => s.date).sort().at(-1) ?? null;
    const result = readCloseForm(fields(formData), latest, todayIso());
    if (!result.ok) return { status: "invalid", errors: result.errors };
    await writeBalances([{ accountId: id, date: result.input.endDate, balance: 0 }], known);
    await accountsRepository.update(id, { status: "Inactive" });
  } catch (error) {
    return failed("closeAccount", error);
  }
  return refreshed(CACHE_TAGS.accounts, CACHE_TAGS.balanceSnapshots);
}

/** Reopen a closed account: Active again. Its history, and the ₹0 it closed with, stay until a new balance is added. */
export async function reopenAccount(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return GONE;
  try {
    await accountsRepository.update(id, { status: "Active" });
  } catch (error) {
    if (error instanceof NotFoundError) return GONE;
    return failed("reopenAccount", error);
  }
  return refreshed(CACHE_TAGS.accounts);
}

/** Editing one balance: its day and amount. */
export async function saveBalanceEdit(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = readEditBalanceForm(fields(formData), todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    const all = await balanceSnapshotsRepository.list();
    const mine = all.find((s) => s.id === result.input.id);
    if (!mine) return { status: "invalid", errors: { form: "This balance isn't in the Sheet any more. Close this and refresh." } };
    // One balance per account per day (decision 7): moving it onto a day that has one would make two.
    if (sameDayBalance(all, mine.accountId, result.input.date, mine.id)) return { status: "invalid", errors: { date: "This account already has a balance for that day. Edit or delete that one instead" } };
    await balanceSnapshotsRepository.update(result.input.id, updateBalanceSnapshotSchema.parse({ date: result.input.date, balance: result.input.balance }));
  } catch (error) {
    if (error instanceof NotFoundError) return { status: "invalid", errors: { form: "This balance isn't in the Sheet any more. Close this and refresh." } };
    return failed("saveBalanceEdit", error);
  }
  return refreshed(CACHE_TAGS.balanceSnapshots);
}

export async function deleteBalance(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "invalid", errors: { form: "This balance isn't in the Sheet any more." } };
  try {
    await balanceSnapshotsRepository.remove(id);
  } catch (error) {
    if (error instanceof NotFoundError) return refreshed(CACHE_TAGS.balanceSnapshots);
    return failed("deleteBalance", error);
  }
  return refreshed(CACHE_TAGS.balanceSnapshots);
}
