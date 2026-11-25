"use server";

import { updateTag } from "next/cache";
import { resolveCategories } from "@/lib/daily/categories";
import { todayIso } from "@/lib/format/date";
import { readCategoryForm } from "@/lib/forms/dailyCategoryForms";
import { readLimitsForm } from "@/lib/forms/dailyLimitForms";
import { readDailySpendForm } from "@/lib/forms/dailySpendForms";
import type { FormState } from "@/lib/forms/formState";
import { planCategoryLimits, planCategorySave, planCategoryStatus, planLimit } from "@/lib/daily/writes";
import { CACHE_TAGS, getCachedDailyCategoriesTab } from "@/lib/sheets/cached";
import { dailyBudgetsRepository } from "@/lib/sheets/dailyBudgets";
import { dailyCategoryLimitsRepository } from "@/lib/sheets/dailyCategoryLimits";
import { createDailyCategorySchema, dailyCategoriesRepository, updateDailyCategorySchema } from "@/lib/sheets/dailyCategories";
import { createDailySpendSchema, dailySpendsRepository, updateDailySpendSchema } from "@/lib/sheets/dailySpends";
import { isQuotaError, isTimeoutError, sheetsFailureMessage } from "@/lib/sheets/errors";
import { InvalidRowError, NotFoundError } from "@/lib/sheets/repository";
import { formatInrExact } from "@/lib/format/money";

/**
 * The Daily page's server actions (docs/design/daily.md), used with useActionState like the other dashboards'. A spend names a category by its id, which has
 * to be one that exists; a category, or a change to one, never deletes anything; the limit is one row per change.
 */

const fields = (formData: FormData) => Object.fromEntries(formData.entries());
const idOf = (formData: FormData, key = "id") => {
  const value = formData.get(key);
  return typeof value === "string" && value !== "" ? value : undefined;
};
const gone: FormState = { status: "invalid", errors: { form: "This isn't in the Sheet any more. Close this and refresh." } };

function failed(action: string, error: unknown): FormState {
  console.error(`[daily] ${action} failed:`, error instanceof Error ? error.message : String(error));
  // A quota or a timeout has its own words (a timeout may have written the row, so it says to check before trying again).
  return isQuotaError(error) || isTimeoutError(error) ? { status: "failed", message: sheetsFailureMessage(error) } : { status: "failed" };
}

/** Add a spend, or edit one when the form carries an id. Adding hands back a token the toast's Undo takes the new row away with. */
export async function saveDailySpend(_previous: FormState, formData: FormData): Promise<FormState> {
  const editing = idOf(formData);
  let categoryIds: string[];
  try {
    // The page already holds the categories (cached, and refreshed by every category save), so an add costs one Sheet call, not two.
    categoryIds = resolveCategories((await getCachedDailyCategoriesTab()).records).map((c) => c.id);
  } catch (error) {
    return failed("saveDailySpend", error);
  }
  const result = readDailySpendForm(fields(formData), { categoryIds }, todayIso());
  if (!result.ok) return { status: "invalid", errors: result.errors };
  try {
    if (editing) {
      const { input } = result;
      await dailySpendsRepository.update(editing, updateDailySpendSchema.parse({ ...input, category: input.category ?? "", note: input.note ?? "" }));
      updateTag(CACHE_TAGS.dailySpends);
      return { status: "saved", at: Date.now() };
    }
    const created = await dailySpendsRepository.create(createDailySpendSchema.parse(result.input));
    updateTag(CACHE_TAGS.dailySpends);
    return { status: "saved", at: Date.now(), id: created.id, undo: { id: created.id, message: `Added ${formatInrExact(result.input.amount)} ${result.input.method === "Cash" ? "in cash" : `on ${result.input.method === "UPI" ? "UPI" : "card"}`}` } };
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveDailySpend", error);
  }
}

export async function deleteDailySpend(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = idOf(formData);
  if (!id) return gone;
  try {
    await dailySpendsRepository.remove(id);
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    return failed("deleteDailySpend", error);
  }
  updateTag(CACHE_TAGS.dailySpends);
  return { status: "saved", at: Date.now() };
}

/** Take back a spend that was just added (the toast's Undo). */
export async function undoAddedSpend(id: string): Promise<{ ok: boolean; message: string }> {
  try {
    await dailySpendsRepository.remove(id);
    updateTag(CACHE_TAGS.dailySpends);
    return { ok: true, message: "Undone." };
  } catch (error) {
    failed("undoAddedSpend", error);
    return { ok: false, message: "Couldn't undo it. Delete it from the day's list." };
  }
}

/**
 * Add a category (no `id`), or rename or recolour one (its `id`: a built-in one's, or one he added). A built-in one is changed by a row that names it,
 * made the first time (lib/daily/writes.ts decides). Hands back the category's id, so the form that asked can pick it.
 */
export async function saveCategory(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = idOf(formData);
  try {
    const rows = await dailyCategoriesRepository.list();
    const result = readCategoryForm(fields(formData), resolveCategories(rows), id);
    if (!result.ok) return { status: "invalid", errors: result.errors };
    const write = planCategorySave(rows, id, result.input);
    if (write.kind === "gone") return gone;
    let categoryId: string;
    if (write.kind === "update") {
      await dailyCategoriesRepository.update(write.rowId, updateDailyCategorySchema.parse(write.data));
      categoryId = write.categoryId;
    } else {
      const created = await dailyCategoriesRepository.create(createDailyCategorySchema.parse(write.data));
      categoryId = write.data.builtIn ?? created.id;
    }
    updateTag(CACHE_TAGS.dailyCategories);
    return { status: "saved", at: Date.now(), id: categoryId };
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("saveCategory", error);
  }
}

/** Hide a category from the chips, or show it again. Its spends keep it. */
export async function setCategoryStatus(_previous: FormState, formData: FormData): Promise<FormState> {
  const id = idOf(formData);
  const status = formData.get("status") === "Hidden" ? "Hidden" : "Active";
  if (!id) return gone;
  try {
    const write = planCategoryStatus(await dailyCategoriesRepository.list(), id, status);
    if (write.kind === "gone") return gone;
    let categoryId: string;
    if (write.kind === "update") {
      await dailyCategoriesRepository.update(write.rowId, updateDailyCategorySchema.parse(write.data));
      categoryId = write.categoryId;
    } else {
      const created = await dailyCategoriesRepository.create(createDailyCategorySchema.parse(write.data));
      categoryId = write.data.builtIn ?? created.id;
    }
    updateTag(CACHE_TAGS.dailyCategories);
    return { status: "saved", at: Date.now(), id: categoryId };
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    return failed("setCategoryStatus", error);
  }
}

/**
 * Set the monthly limit and the category limits from a month on (docs/design/daily.md, round 6, L1): the month's own row if it has one, else a new row
 * (lib/daily/writes.ts decides, for both). The category rows are written one at a time, since the Sheet can't take two writes to one tab at once.
 */
export async function setLimits(_previous: FormState, formData: FormData): Promise<FormState> {
  try {
    const categoryIds = resolveCategories((await getCachedDailyCategoriesTab()).records).map((c) => c.id);
    const result = readLimitsForm(fields(formData), categoryIds);
    if (!result.ok) return { status: "invalid", errors: result.errors };
    const { month, limit, categories } = result.input;
    // A blank monthly box leaves the monthly limit as it is.
    if (limit !== null) {
      const write = planLimit(await dailyBudgetsRepository.list(), month, limit);
      if (write.kind === "update") await dailyBudgetsRepository.update(write.id, { limit });
      else await dailyBudgetsRepository.create({ month, limit });
      updateTag(CACHE_TAGS.dailyBudgets);
    }
    for (const w of planCategoryLimits(await dailyCategoryLimitsRepository.list(), month, categories)) {
      if (w.kind === "update") await dailyCategoryLimitsRepository.update(w.id, { limit: w.limit });
      else await dailyCategoryLimitsRepository.create({ category: w.category, month: w.month, limit: w.limit });
    }
    updateTag(CACHE_TAGS.dailyCategoryLimits);
    return { status: "saved", at: Date.now() };
  } catch (error) {
    if (error instanceof NotFoundError) return gone;
    if (error instanceof InvalidRowError) return { status: "invalid", errors: { form: error.message } };
    return failed("setLimits", error);
  }
}
