import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { nonEmptyString, nonNegativeNumber } from "./validation";
import type { DailyCategoryLimit } from "./types";

const MONTH = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected a month (YYYY-MM)");

/** A category limit's fields (docs/design/daily.md, round 6): the category's id, the first month it applies to, and how much; 0 means no limit from that month on. */
const dailyCategoryLimitFields = z.object({ category: nonEmptyString, month: MONTH, limit: nonNegativeNumber });

export const createDailyCategoryLimitSchema = dailyCategoryLimitFields;
export const updateDailyCategoryLimitSchema = dailyCategoryLimitFields.partial();
export const dailyCategoryLimitRowSchema = dailyCategoryLimitFields.extend({ id: nonEmptyString });

/** The DailyCategoryLimits tab's columns, in order. The tab is created by `/api/dev/sheet-columns?tab=DailyCategoryLimits`. */
export const DAILY_CATEGORY_LIMIT_COLUMNS: (keyof DailyCategoryLimit)[] = ["id", "category", "month", "limit"];

export const dailyCategoryLimitsRepository = createRepository<DailyCategoryLimit>({
  sheetName: "DailyCategoryLimits",
  columns: DAILY_CATEGORY_LIMIT_COLUMNS,
  schema: dailyCategoryLimitRowSchema,
  // Two rows for one category and month would leave categoryLimitFor guessing; the action updates that month's row instead of adding a second.
});
