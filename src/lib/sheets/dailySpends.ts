import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, isoDate, nonEmptyString, positiveNumber } from "./validation";
import { DAILY_SPEND_METHODS, type DailySpend } from "./types";

/** A daily spend's fields (docs/design/daily.md): the day, what it cost, UPI or card, and optionally a category (its id) and what it was. */
const dailySpendFields = z.object({
  date: isoDate,
  amount: positiveNumber,
  method: z.enum(DAILY_SPEND_METHODS),
  category: nonEmptyString.optional(),
  note: nonEmptyString.optional(),
});

export const createDailySpendSchema = dailySpendFields;

/** A partial update. "" clears the category or the note. */
export const updateDailySpendSchema = dailySpendFields.partial().extend({ category: clearable(nonEmptyString).optional(), note: clearable(nonEmptyString).optional() });

/** A row as read back from the Sheet: a valid create, plus its id. */
export const dailySpendRowSchema = dailySpendFields.extend({ id: nonEmptyString });

/** The DailySpends tab's columns, in order. The tab is created by `/api/dev/sheet-columns?tab=DailySpends`. */
export const DAILY_SPEND_COLUMNS: (keyof DailySpend)[] = ["id", "date", "amount", "method", "category", "note"];

export const dailySpendsRepository = createRepository<DailySpend>({
  sheetName: "DailySpends",
  columns: DAILY_SPEND_COLUMNS,
  dateColumns: ["date"],
  schema: dailySpendRowSchema,
});
