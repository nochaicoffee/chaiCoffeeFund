"use server";

import { updateTag } from "next/cache";
import { wageMonthLabel } from "@/lib/epfStatement/reviewView";
import { todayIso, formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { readContributionForm, readCreditedForm, readSettingsForm } from "@/lib/forms/epfForms";
import type { FormState } from "@/lib/forms/formState";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { epfAccountsRepository } from "@/lib/sheets/epfAccounts";
import { createEpfEntrySchema, epfEntriesRepository, updateEpfEntrySchema } from "@/lib/sheets/epfEntries";
import { createEpfRateSchema, epfRatesRepository, updateEpfRateSchema } from "@/lib/sheets/epfRates";
import { rateConflict } from "@/lib/sheets/epfRules";
import { isQuotaError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";
import type { EpfEntry } from "@/lib/sheets/types";
import { epfFormsData } from "./epfFormsData";

/**
 * The EPF forms' server actions (#265), used with useActionState like the other dashboards': each reads the fields with lib/forms
 * (plain-word errors by field), then writes. Everything written here is Typed: the passbook's rows come only from the import
 * (ADR 0011), and a row read from a passbook can't be edited here, only deleted (importing the file again brings it back).
 */

const fields = (formData: FormData) => Object.fromEntries(formData.entries());
const id = (formData: FormData) => {
  const value = formData.get("id");
  return typeof value === "string" && value !== "" ? value : undefined;
};

function failed(action: string, error: unknown): FormState {
  console.error(`[fixed-income] ${action} failed:`, error instanceof Error ? error.message : String(error));
  return isQuotaError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
}
const gone = (what: string): FormState => ({ status: "invalid", errors: { form: `This ${what} isn't in the Sheet any more. Close this and refresh.` } });

function refreshed(tags: string[], undo?: { id: string; message: string }): FormState {
  for (const tag of tags) updateTag(tag);
  return { status: "saved", at: Date.now(), ...(undo && { undo }) };
}
const ENTRY_TAGS = [CACHE_TAGS.epfEntries];

async function load() {
  const [accounts, entries] = await Promise.all([epfAccountsRepository.list(), epfEntriesRepository.list()]);
  return { accountIds: accounts.map((a) => a.id), entries };
}

/** An edit is only for rows he typed: a passbook's row is EPFO's record, so changing it would make it disagree with the file. */
function notEditable(entries: EpfEntry[], editing: string): FormState | null {
  const stored = entries.find((e) => e.id === editing);
  if (!stored) return gone("entry");
  return stored.source === "Passbook" ? { status: "invalid", errors: { form: "This row was read from a passbook, so it can't be changed here. Delete it and import the passbook again, or add a typed one." } } : null;
}

/** Add a contribution, or Edit one (typed) when the form carries an id. A new one comes back with what Undo takes back. */
export async function saveEpfContribution(_previous: FormState, formData: FormData): Promise<FormState> {
  const editing = id(formData);
  let known;
  try {
    known = await load();
  } catch (error) {
    return failed("saveEpfContribution", error);
  }
  if (editing) {
    const blocked = notEditable(known.entries, editing);
    if (blocked) return blocked;
  }
  const today = todayIso();
  const result = readContributionForm(fields(formData), { ...known, editingId: editing }, today);
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const { kind, ...row } = result.input;
  try {
    if (editing) {
      await epfEntriesRepository.update(editing, updateEpfEntrySchema.parse(row) as Partial<Omit<EpfEntry, "id">>);
      return refreshed(ENTRY_TAGS);
    }
    const created = await epfEntriesRepository.create(createEpfEntrySchema.parse({ ...row, kind, source: "Typed" }));
    return refreshed(ENTRY_TAGS, { id: undoToken(created), message: `Added · ${wageMonthLabel(row.wageMonth)}: ${formatInr(row.employee + row.employer + row.pension)} on ${formatShortDate(row.date)}` });
  } catch (error) {
    if (error instanceof NotFoundError) return gone("entry");
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveEpfContribution", error);
  }
}

/** Add what EPFO credited (a year's interest or an opening balance), or Edit it when the form carries an id. */
export async function saveEpfCredited(_previous: FormState, formData: FormData): Promise<FormState> {
  const editing = id(formData);
  let known;
  try {
    known = await load();
  } catch (error) {
    return failed("saveEpfCredited", error);
  }
  if (editing) {
    const blocked = notEditable(known.entries, editing);
    if (blocked) return blocked;
  }
  const result = readCreditedForm(fields(formData), { ...known, editingId: editing }, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    if (editing) {
      const { epfAccountId, date, employee, employer, pension } = result.input;
      await epfEntriesRepository.update(editing, updateEpfEntrySchema.parse({ epfAccountId, date, employee, employer, pension }) as Partial<Omit<EpfEntry, "id">>);
      return refreshed(ENTRY_TAGS);
    }
    const created = await epfEntriesRepository.create(createEpfEntrySchema.parse({ ...result.input, source: "Typed" }));
    const what = result.input.kind === "Interest" ? "Interest" : "Opening balance";
    return refreshed(ENTRY_TAGS, { id: undoToken(created), message: `Added · ${what}: ${formatInr(result.input.employee + result.input.employer + result.input.pension)}` });
  } catch (error) {
    if (error instanceof NotFoundError) return gone("entry");
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveEpfCredited", error);
  }
}

/** What Undo is handed: the row's id and what the form wrote, so a row changed since isn't taken back. */
const undoToken = (row: EpfEntry): string => JSON.stringify({ id: row.id, date: row.date, employee: row.employee, employer: row.employer, pension: row.pension });

/** Undo for a row just added: removed only if it is still the one this form wrote. */
export async function undoEpfEntry(token: string): Promise<{ ok: boolean; message: string }> {
  let written: { id: string; date: string; employee: number; employer: number; pension: number };
  try {
    written = JSON.parse(token);
  } catch {
    return { ok: false, message: "Couldn't undo it. Delete it from the list instead." };
  }
  const entryId = written.id;
  try {
    const entry = await epfEntriesRepository.get(entryId);
    if (!entry) return { ok: true, message: "Already removed." };
    // A row an import has since replaced with the passbook's, or one edited since, is no longer the one this form wrote.
    if (entry.source !== "Typed") return { ok: false, message: "That row has been replaced by a passbook's since, so it wasn't removed." };
    if (entry.date !== written.date || entry.employee !== written.employee || entry.employer !== written.employer || entry.pension !== written.pension) return { ok: false, message: "That row has changed since, so it wasn't removed. Delete it from the list if you want it gone." };
    await epfEntriesRepository.remove(entryId);
  } catch (error) {
    console.error("[fixed-income] undoEpfEntry failed:", error instanceof Error ? error.message : String(error));
    return { ok: false, message: isQuotaError(error) ? sheetsFailureMessage(error) : "Couldn't undo it. Refresh and delete it from the list instead." };
  }
  for (const tag of ENTRY_TAGS) updateTag(tag);
  return { ok: true, message: "Put back as it was." };
}

/** Delete one row, typed or from a passbook (importing the passbook again brings its rows back). */
export async function deleteEpfEntry(_previous: FormState, formData: FormData): Promise<FormState> {
  const entryId = id(formData);
  if (!entryId) return gone("entry");
  try {
    await epfEntriesRepository.remove(entryId);
  } catch (error) {
    if (error instanceof NotFoundError) return gone("entry");
    return failed("deleteEpfEntry", error);
  }
  return refreshed(ENTRY_TAGS);
}

/**
 * EPF settings: a rate for each year that isn't credited yet (a blank one removes what was entered) and the monthly credit
 * for the growth path. A credited year's rate is worked out from its interest and is never stored, so it isn't editable here.
 */
export async function saveEpfSettings(_previous: FormState, formData: FormData): Promise<FormState> {
  const data = fields(formData);
  const accountId = String(data.epfAccountId ?? "");
  let accountIds: string[];
  let editableYears: string[];
  let storedRates;
  let storedCredit: number | undefined;
  try {
    const [accounts, entries, rates] = await Promise.all([epfAccountsRepository.list(), epfEntriesRepository.list(), epfRatesRepository.list()]);
    accountIds = accounts.map((a) => a.id);
    storedRates = rates;
    storedCredit = accounts.find((a) => a.id === accountId)?.projectionCredit;
    // The years that can be set are worked out here, as the form's own list is: never taken from the request.
    editableYears = (epfFormsData({ accounts, entries, rates }, todayIso()).accounts.find((a) => a.id === accountId)?.years ?? []).filter((y) => y.editable).map((y) => y.financialYear);
  } catch (error) {
    return failed("saveEpfSettings", error);
  }
  const result = readSettingsForm(data, { accountIds, editableYears });
  if (!result.ok) return { status: "invalid", errors: result.errors };
  const { rates, cleared, projectionCredit } = result.input;
  try {
    const ofAccount = storedRates.filter((r) => r.epfAccountId === accountId);
    for (const rate of rates) {
      const stored = ofAccount.find((r) => r.financialYear === rate.financialYear);
      if (stored) {
        if (stored.ratePercent !== rate.ratePercent || stored.source !== rate.source) await epfRatesRepository.update(stored.id, updateEpfRateSchema.parse({ ratePercent: rate.ratePercent, source: rate.source }));
      } else {
        const row = createEpfRateSchema.parse({ epfAccountId: accountId, ...rate });
        const clash = rateConflict(storedRates, row);
        if (clash) return { status: "invalid", errors: { form: clash } };
        await epfRatesRepository.create(row);
      }
    }
    for (const year of cleared) {
      const stored = ofAccount.find((r) => r.financialYear === year);
      if (stored) await epfRatesRepository.remove(stored.id);
    }
    // undefined blanks the cell: the growth path then uses the last credit.
    if (projectionCredit !== storedCredit) await epfAccountsRepository.update(accountId, { projectionCredit });
  } catch (error) {
    if (error instanceof NotFoundError) return gone("account");
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveEpfSettings", error);
  }
  return refreshed([CACHE_TAGS.epfRates, CACHE_TAGS.epfAccounts]);
}
