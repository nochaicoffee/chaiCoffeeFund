import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import { INCOME_ENTRY_ORIGINS, type IncomeEntry } from "./types";

export const createIncomeEntrySchema = z.object({
  incomeSourceId: nonEmptyString,
  expectedDate: isoDate,
  // Only money that has landed is written: pending and upcoming entries are computed from each source's schedule (PRD §8).
  receivedDate: isoDate,
  amount: nonNegativeNumber,
  status: z.enum(["Received"]),
  accountId: nonEmptyString.optional(),
  tag: z.enum(["Regular", "Bonus", "Other"]),
  // Optional: rows from before these columns existed have neither (#185).
  origin: z.enum(INCOME_ENTRY_ORIGINS).optional(),
  statementRef: nonEmptyString.optional(),
});

export const updateIncomeEntrySchema = createIncomeEntrySchema.partial();

/**
 * A row as read back from the Sheet: a valid create, plus its id. Pending stays readable (and in the Sheet's dropdown)
 * for rows written before pending was computed.
 */
export const incomeEntryRowSchema = createIncomeEntrySchema.extend({
  id: nonEmptyString,
  receivedDate: isoDate.optional(),
  status: z.enum(["Received", "Pending"]),
});

/** The IncomeEntries tab's columns, in order. origin and statementRef were added on the end (#185). */
export const INCOME_ENTRY_COLUMNS: (keyof IncomeEntry)[] = ["id", "incomeSourceId", "expectedDate", "receivedDate", "amount", "status", "accountId", "tag", "origin", "statementRef"];

export const incomeEntriesRepository = createRepository<IncomeEntry>({
  sheetName: "IncomeEntries",
  columns: INCOME_ENTRY_COLUMNS,
  dateColumns: ["expectedDate", "receivedDate"],
  schema: incomeEntryRowSchema,
});
