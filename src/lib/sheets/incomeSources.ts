import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import { CARD_COLORS, INCOME_ICONS, type IncomeSource } from "./types";

export const createIncomeSourceSchema = z.object({
  name: nonEmptyString,
  alias: nonEmptyString,
  category: z.enum(["Salary", "Investment", "Other"]),
  frequency: z.enum(["Monthly", "Quarterly", "Yearly", "One-Time"]),
  expectedAmount: nonNegativeNumber,
  status: z.enum(["Active", "Inactive"]),
  /** Required: pending and upcoming payments are worked out from it, never stored (PRD §8). */
  scheduleDate: isoDate,
  // Optional (#185).
  color: z.enum(CARD_COLORS).optional(),
  icon: z.enum(INCOME_ICONS).optional(),
  accountId: nonEmptyString.optional(),
  statementMatch: nonEmptyString.optional(),
});

/** An update can clear where it lands and the statement text: "" blanks the cell (see `clearable`). */
export const updateIncomeSourceSchema = createIncomeSourceSchema
  .partial()
  .extend({ accountId: clearable(nonEmptyString).optional(), statementMatch: clearable(nonEmptyString).optional() });

/** A row as read back from the Sheet: a valid create, plus its id. */
export const incomeSourceRowSchema = createIncomeSourceSchema.extend({ id: nonEmptyString });

/** The IncomeSources tab's columns, in order. Everything after status was added on the end (#185). */
export const INCOME_SOURCE_COLUMNS: (keyof IncomeSource)[] = [
  "id", "name", "alias", "category", "frequency", "expectedAmount", "status",
  "scheduleDate", "color", "icon", "accountId", "statementMatch",
];

export const incomeSourcesRepository = createRepository<IncomeSource>({
  sheetName: "IncomeSources",
  columns: INCOME_SOURCE_COLUMNS,
  dateColumns: ["scheduleDate"],
  schema: incomeSourceRowSchema,
});
