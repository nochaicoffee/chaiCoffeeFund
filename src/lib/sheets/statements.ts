import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { Statement } from "./types";

export const createStatementSchema = z.object({
  cardId: nonEmptyString,
  statementDate: isoDate,
  dueDate: isoDate,
  totalAmountDue: nonNegativeNumber,
  minimumAmountDue: nonNegativeNumber,
  status: z.enum(["Pending", "Paid"]),
  amountPaid: nonNegativeNumber.optional(),
  paidFromAccountId: nonEmptyString.optional(),
  paidFromCardId: nonEmptyString.optional(),
  paidDate: isoDate.optional(),
});

export const updateStatementSchema = createStatementSchema.partial();

/**
 * A row as read back from the Sheet: a valid create, plus its id. The total due
 * may be negative there: a credit balance, which the dashboard counts as ₹0 spend (PRD §8).
 */
export const statementRowSchema = createStatementSchema.extend({ id: nonEmptyString, totalAmountDue: z.number() });

export const statementsRepository = createRepository<Statement>({
  sheetName: "CardStatements",
  columns: [
    "id",
    "cardId",
    "statementDate",
    "dueDate",
    "totalAmountDue",
    "minimumAmountDue",
    "status",
    "amountPaid",
    "paidFromAccountId",
    "paidFromCardId",
    "paidDate",
  ],
  dateColumns: ["statementDate", "dueDate", "paidDate"],
  schema: statementRowSchema,
});
