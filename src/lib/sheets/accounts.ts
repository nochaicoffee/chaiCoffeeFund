import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString } from "./validation";
import type { Account } from "./types";

export const createAccountSchema = z.object({
  name: nonEmptyString,
  bank: nonEmptyString,
  accountType: z.enum(["Savings", "Current"]),
  purpose: z.enum(["Spending", "Investment", "Emergency-Fund", "Loan-Payments"]),
  startDate: isoDate,
  status: z.enum(["Active", "Inactive"]),
});

export const updateAccountSchema = createAccountSchema.partial();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const accountRowSchema = createAccountSchema.extend({ id: nonEmptyString });

export const accountsRepository = createRepository<Account>({
  sheetName: "Accounts",
  columns: ["id", "name", "bank", "accountType", "purpose", "startDate", "status"],
  dateColumns: ["startDate"],
  schema: accountRowSchema,
});
