import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { nonEmptyString, nonNegativeNumber } from "./validation";
import type { IncomeSource } from "./types";

export const incomeSourcesRepository = createRepository<IncomeSource>({
  sheetName: "IncomeSources",
  columns: ["id", "name", "alias", "category", "frequency", "expectedAmount", "status"],
});

export const createIncomeSourceSchema = z.object({
  name: nonEmptyString,
  alias: nonEmptyString,
  category: z.enum(["Salary", "Investment", "Other"]),
  frequency: z.enum(["Monthly", "Quarterly", "Yearly", "One-Time"]),
  expectedAmount: nonNegativeNumber,
  status: z.enum(["Active", "Inactive"]),
});

export const updateIncomeSourceSchema = createIncomeSourceSchema.partial();
