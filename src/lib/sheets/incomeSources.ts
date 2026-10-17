import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { nonEmptyString, nonNegativeNumber } from "./validation";
import type { IncomeSource } from "./types";

export const createIncomeSourceSchema = z.object({
  name: nonEmptyString,
  alias: nonEmptyString,
  category: z.enum(["Salary", "Investment", "Other"]),
  frequency: z.enum(["Monthly", "Quarterly", "Yearly", "One-Time"]),
  expectedAmount: nonNegativeNumber,
  status: z.enum(["Active", "Inactive"]),
});

export const updateIncomeSourceSchema = createIncomeSourceSchema.partial();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const incomeSourceRowSchema = createIncomeSourceSchema.extend({ id: nonEmptyString });

export const incomeSourcesRepository = createRepository<IncomeSource>({
  sheetName: "IncomeSources",
  columns: ["id", "name", "alias", "category", "frequency", "expectedAmount", "status"],
  schema: incomeSourceRowSchema,
});
