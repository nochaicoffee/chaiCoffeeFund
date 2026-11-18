import type { Color, DailyBudget, DailyCategory, DailyCategoryStatus } from "../sheets/types";
import { resolveCategories } from "./categories";

/**
 * What a Daily write should do to the Sheet, worked out from the rows as they are, so the rules are tested apart from the Sheets calls: a built-in
 * category is changed by a row naming it (made the first time it changes), one he added by its own row, and a month's limit by that month's row.
 */

export type CategoryWrite =
  | { kind: "gone" }
  | { kind: "create"; data: { name: string; color: Color; status: DailyCategoryStatus; builtIn?: string } }
  | { kind: "update"; rowId: string; categoryId: string; data: { name?: string; color?: Color; status?: DailyCategoryStatus } };

/** Add a category (no `id`), or rename or recolour the one with `id`. A rename never un-hides one. */
export function planCategorySave(rows: readonly DailyCategory[], id: string | undefined, input: { name: string; color: Color }): CategoryWrite {
  if (!id) return { kind: "create", data: { ...input, status: "Active" } };
  const target = resolveCategories(rows).find((c) => c.id === id);
  if (!target) return { kind: "gone" };
  if (target.rowId) return { kind: "update", rowId: target.rowId, categoryId: target.id, data: input };
  return { kind: "create", data: { ...input, status: target.hidden ? "Hidden" : "Active", builtIn: target.id } };
}

/** Hide a category, or show it again. A built-in one with no row yet gets one carrying its own name and colour. */
export function planCategoryStatus(rows: readonly DailyCategory[], id: string, status: DailyCategoryStatus): CategoryWrite {
  const target = resolveCategories(rows).find((c) => c.id === id);
  if (!target) return { kind: "gone" };
  if (target.rowId) return { kind: "update", rowId: target.rowId, categoryId: target.id, data: { status } };
  return { kind: "create", data: { name: target.name, color: target.color, status, builtIn: target.id } };
}

export type LimitWrite = { kind: "update"; id: string; limit: number } | { kind: "create"; month: string; limit: number };

/** The month's own row is updated; a month without one gets a row, even when the limit is what it already inherits, so it stays what he set if an earlier limit changes. */
export function planLimit(rows: readonly DailyBudget[], month: string, limit: number): LimitWrite {
  const own = rows.find((r) => r.month === month);
  return own ? { kind: "update", id: own.id, limit } : { kind: "create", month, limit };
}
