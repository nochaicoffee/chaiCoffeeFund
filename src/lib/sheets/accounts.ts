import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { clearable, isoDate, nonEmptyString } from "./validation";
import { CARD_COLORS, type Account } from "./types";

const last4Schema = z.string().regex(/^\d{4}$/, "Enter the last 4 digits of the account number");

export const createAccountSchema = z.object({
  name: nonEmptyString,
  bank: nonEmptyString,
  accountType: z.enum(["Savings", "Current"]),
  purpose: z.enum(["Spending", "Investment", "Emergency-Fund", "Loan-Payments"]),
  startDate: isoDate,
  status: z.enum(["Active", "Inactive"]),
  // Both optional: rows from before these columns existed have neither (#160).
  color: z.enum(CARD_COLORS).optional(),
  last4: last4Schema.optional(),
});

/** An update can clear the last 4: "" blanks the cell (see `clearable`). A colour is changed, not cleared. */
export const updateAccountSchema = createAccountSchema.partial().extend({ last4: clearable(last4Schema).optional() });

/** A row as read back from the Sheet: a valid create, plus its id. */
export const accountRowSchema = createAccountSchema.extend({ id: nonEmptyString });

/** The Accounts tab's columns, in order. color and last4 were added on the end (#160). */
export const ACCOUNT_COLUMNS: (keyof Account)[] = ["id", "name", "bank", "accountType", "purpose", "startDate", "status", "color", "last4"];

export const accountsRepository = createRepository<Account>({
  sheetName: "Accounts",
  columns: ACCOUNT_COLUMNS,
  dateColumns: ["startDate"],
  schema: accountRowSchema,
});
