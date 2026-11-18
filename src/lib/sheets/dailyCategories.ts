import "server-only";
import { z } from "zod";
import { CATEGORY_NAME_MAX } from "../daily/categories";
import { createRepository } from "./repository";
import { nonEmptyString } from "./validation";
import { COLORS, DAILY_CATEGORY_STATUSES, type DailyCategory } from "./types";

/** A category's fields (docs/design/daily.md, round 3): a name and a colour, whether it's offered, and which built-in one a row changes (blank on one he added). */
const dailyCategoryFields = z.object({
  name: z.string().trim().min(1).max(CATEGORY_NAME_MAX),
  color: z.enum(COLORS),
  status: z.enum(DAILY_CATEGORY_STATUSES),
  builtIn: nonEmptyString.optional(),
});

export const createDailyCategorySchema = dailyCategoryFields;

/** A partial update. A rename, a colour, or Hidden/Active; which built-in a row changes is fixed when it's made. */
export const updateDailyCategorySchema = dailyCategoryFields.omit({ builtIn: true }).partial();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const dailyCategoryRowSchema = dailyCategoryFields.extend({ id: nonEmptyString });

/** The DailyCategories tab's columns, in order. The tab is created by `/api/dev/sheet-columns?tab=DailyCategories`. */
export const DAILY_CATEGORY_COLUMNS: (keyof DailyCategory)[] = ["id", "name", "color", "status", "builtIn"];

export const dailyCategoriesRepository = createRepository<DailyCategory>({
  sheetName: "DailyCategories",
  columns: DAILY_CATEGORY_COLUMNS,
  schema: dailyCategoryRowSchema,
});
