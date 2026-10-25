"use server";

import { updateTag } from "next/cache";
import { todayIso, formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import type { FormState } from "@/lib/forms/formState";
import { readEntryForm, readSourceForm } from "@/lib/forms/incomeForms";
import { accountsRepository } from "@/lib/sheets/accounts";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { createIncomeEntrySchema, incomeEntriesRepository, updateIncomeEntrySchema } from "@/lib/sheets/incomeEntries";
import { createIncomeSourceSchema, incomeSourcesRepository, updateIncomeSourceSchema } from "@/lib/sheets/incomeSources";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";
import type { IncomeEntry, IncomeSource } from "@/lib/sheets/types";

/**
 * The Income forms' server actions (#190), used with useActionState as the other dashboards' are: each checks the
 * input with lib/forms (plain-word errors by field), then writes. Nothing reaches the Sheet until it passes, and a
 * failed write returns { status: "failed" } so the dialog keeps the input for Try again. An income entry records
 * money that landed only; pending and upcoming payments are worked out from each source's schedule (PRD §8), and
 * balances are updated on the Accounts page.
 */

const fields = (formData: FormData) => Object.fromEntries(formData.entries());

function failed(action: string, error: unknown): FormState {
  console.error(`[income] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
}

const gone = (what: string): FormState => ({ status: "invalid", errors: { form: `This ${what} isn't in the Sheet any more. Close this and refresh.` } });

function refreshed(undo?: { id: string; message: string }): FormState {
  updateTag(CACHE_TAGS.incomeSources);
  updateTag(CACHE_TAGS.incomeEntries);
  return { status: "saved", at: Date.now(), ...(undo && { undo }) };
}

const id = (formData: FormData) => {
  const value = formData.get("id");
  return typeof value === "string" && value !== "" ? value : undefined;
};

/** Add source, or Edit source when the form carries an id. */
export async function saveSource(_previous: FormState, formData: FormData): Promise<FormState> {
  const editing = id(formData);
  let accountIds: string[];
  try {
    accountIds = (await accountsRepository.list()).map((a) => a.id);
  } catch (error) {
    return failed("saveSource", error);
  }
  const result = readSourceForm(fields(formData), { accountIds }, Boolean(editing));
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const { accountId, statementMatch, ...source } = result.input;
  try {
    if (editing) {
      // "" clears where it lands and the statement text (see `clearable`).
      // An icon taken off is written as undefined, which blanks its cell (as Edit account clears a password).
      await incomeSourcesRepository.update(editing, { ...(updateIncomeSourceSchema.parse({ ...source, accountId, statementMatch }) as Partial<Omit<IncomeSource, "id">>), icon: source.icon });
    } else {
      await incomeSourcesRepository.create(createIncomeSourceSchema.parse({ ...source, ...(accountId && { accountId }), ...(statementMatch && { statementMatch }) }));
    }
  } catch (error) {
    if (error instanceof NotFoundError) return gone("source");
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveSource", error);
  }
  return refreshed();
}

/**
 * Record income, Mark received (the same form, opened on a payment that's owed) and Edit entry when the form
 * carries an id. A new one comes back with what Undo takes back.
 */
export async function saveEntry(_previous: FormState, formData: FormData): Promise<FormState> {
  const editing = id(formData);
  let sources: IncomeSource[];
  let accountIds: string[];
  try {
    const [sourceRows, accounts] = await Promise.all([incomeSourcesRepository.list(), accountsRepository.list()]);
    sources = sourceRows;
    accountIds = accounts.map((a) => a.id);
  } catch (error) {
    return failed("saveEntry", error);
  }
  const result = readEntryForm(fields(formData), { sourceIds: sources.map((s) => s.id), accountIds }, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const { accountId, ...entry } = result.input;
  const source = sources.find((s) => s.id === entry.incomeSourceId)!;
  try {
    if (editing) {
      // An edit is typed in by hand; a statement's line keeps its ref, so it isn't read in again (#187).
      await incomeEntriesRepository.update(editing, updateIncomeEntrySchema.parse({ ...entry, status: "Received", accountId }) as Partial<Omit<IncomeEntry, "id">>);
      return refreshed();
    }
    const created = await incomeEntriesRepository.create(createIncomeEntrySchema.parse({ ...entry, status: "Received", origin: "Manual", ...(accountId && { accountId }) }));
    return refreshed({ id: created.id, message: `${source.alias || source.name}: ${formatInr(entry.amount)} on ${formatShortDate(entry.receivedDate)}` });
  } catch (error) {
    if (error instanceof NotFoundError) return gone("payment");
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveEntry", error);
  }
}

/** Undo for a payment just recorded: removed only if it's still the one this sync of the form wrote. */
export async function undoEntry(entryId: string, written: { incomeSourceId: string; receivedDate: string; amount: number }): Promise<{ ok: boolean; message: string }> {
  try {
    const entry = await incomeEntriesRepository.get(entryId);
    if (!entry) return { ok: true, message: "Already removed." };
    if (entry.incomeSourceId !== written.incomeSourceId || entry.receivedDate !== written.receivedDate || entry.amount !== written.amount) return { ok: false, message: "This payment has changed since, so it wasn't removed." };
    await incomeEntriesRepository.remove(entryId);
  } catch (error) {
    console.error("[income] undoEntry failed:", error instanceof Error ? error.message : String(error));
    return { ok: false, message: isQuotaError(error) ? sheetsFailureMessage(error) : "Couldn't undo it. Refresh and delete it from the entry instead." };
  }
  refreshed();
  return { ok: true, message: "Put back as it was." };
}

/** Delete one payment. */
export async function deleteEntry(_previous: FormState, formData: FormData): Promise<FormState> {
  const entryId = id(formData);
  if (!entryId) return gone("payment");
  try {
    await incomeEntriesRepository.remove(entryId);
  } catch (error) {
    if (error instanceof NotFoundError) return gone("payment");
    return failed("deleteEntry", error);
  }
  return refreshed();
}

/** Mark inactive (or active again): it stays, with its payments, but nothing is expected from it. */
export async function setSourceStatus(_previous: FormState, formData: FormData): Promise<FormState> {
  const sourceId = id(formData);
  const status = formData.get("status");
  if (!sourceId) return gone("source");
  if (status !== "Active" && status !== "Inactive") return { status: "invalid", errors: { form: "Choose active or inactive" } };
  try {
    await incomeSourcesRepository.update(sourceId, { status });
  } catch (error) {
    if (error instanceof NotFoundError) return gone("source");
    return failed("setSourceStatus", error);
  }
  return refreshed();
}

/** Delete a source and its payments: the payments first, so a failure never leaves payments pointing at nothing. */
export async function deleteSource(_previous: FormState, formData: FormData): Promise<FormState> {
  const sourceId = id(formData);
  if (!sourceId) return gone("source");
  try {
    await incomeEntriesRepository.removeWhere((values) => values.incomeSourceId === sourceId);
  } catch (error) {
    return failed("deleteSource", error);
  }
  try {
    await incomeSourcesRepository.remove(sourceId);
  } catch (error) {
    if (error instanceof NotFoundError) return refreshed();
    console.error("[income] deleteSource removed the payments but not the source:", error instanceof Error ? error.message : String(error));
    updateTag(CACHE_TAGS.incomeEntries);
    // Say what happened: Try again finishes it (there are no payments left to remove).
    return { status: "invalid", errors: { form: "Its payments were removed, but the source itself couldn't be. Press Delete source again to finish." } };
  }
  return refreshed();
}
