import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { IncomeEntry } from "./types";

export const createIncomeEntrySchema = z.object({
  incomeSourceId: nonEmptyString,
  expectedDate: isoDate,
  receivedDate: isoDate.optional(),
  amount: nonNegativeNumber,
  status: z.enum(["Received", "Pending"]),
  accountId: nonEmptyString.optional(),
  tag: z.enum(["Regular", "Bonus", "Other"]),
});

export const updateIncomeEntrySchema = createIncomeEntrySchema.partial();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const incomeEntryRowSchema = createIncomeEntrySchema.extend({ id: nonEmptyString });

export const incomeEntriesRepository = createRepository<IncomeEntry>({
  sheetName: "IncomeEntries",
  columns: ["id", "incomeSourceId", "expectedDate", "receivedDate", "amount", "status", "accountId", "tag"],
  dateColumns: ["expectedDate", "receivedDate"],
  schema: incomeEntryRowSchema,
});
