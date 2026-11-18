import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { nonEmptyString, positiveNumber } from "./validation";
import type { DailyBudget } from "./types";

const MONTH = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected a month (YYYY-MM)");

/** A limit's fields (docs/design/daily.md, round 3): the first month it applies to, and how much. One row per change; see limitFor. */
const dailyBudgetFields = z.object({ month: MONTH, limit: positiveNumber });

export const createDailyBudgetSchema = dailyBudgetFields;
export const updateDailyBudgetSchema = dailyBudgetFields.partial();
export const dailyBudgetRowSchema = dailyBudgetFields.extend({ id: nonEmptyString });

/** The DailyBudgets tab's columns, in order. The tab is created by `/api/dev/sheet-columns?tab=DailyBudgets`. */
export const DAILY_BUDGET_COLUMNS: (keyof DailyBudget)[] = ["id", "month", "limit"];

export const dailyBudgetsRepository = createRepository<DailyBudget>({
  sheetName: "DailyBudgets",
  columns: DAILY_BUDGET_COLUMNS,
  schema: dailyBudgetRowSchema,
  // Two rows for one month would leave limitFor guessing; the action updates the month's row instead of adding a second.
});
