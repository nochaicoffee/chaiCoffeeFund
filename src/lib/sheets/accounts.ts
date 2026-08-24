import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString } from "./validation";
import type { Account } from "./types";

export const accountsRepository = createRepository<Account>({
  sheetName: "Accounts",
  columns: ["id", "name", "bank", "accountType", "purpose", "startDate", "status"],
  dateColumns: ["startDate"],
});

export const createAccountSchema = z.object({
  name: nonEmptyString,
  bank: nonEmptyString,
  accountType: z.enum(["Savings", "Current"]),
  purpose: z.enum(["Spending", "Investment", "Emergency-Fund", "Loan-Payments"]),
  startDate: isoDate,
  status: z.enum(["Active", "Inactive"]),
});

export const updateAccountSchema = createAccountSchema.partial();
