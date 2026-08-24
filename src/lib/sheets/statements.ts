import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { Statement } from "./types";

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
});

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
