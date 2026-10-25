import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { LoanInstallment } from "./types";

/** A row as read back from the Sheet: an installment from createLoanWithSchedule(), plus any payment marked on it. */
export const loanInstallmentRowSchema = z.object({
  id: nonEmptyString,
  loanId: nonEmptyString,
  installmentNumber: z.number(),
  dueDate: isoDate,
  openingBalance: z.number(),
  principalDue: z.number(),
  interestDue: z.number(),
  totalDue: z.number(),
  status: z.enum(["Pending", "Paid"]),
  amountPaid: nonNegativeNumber.optional(),
  paidDate: isoDate.optional(),
  overdueCharge: nonNegativeNumber.optional(),
  paidFromAccountId: nonEmptyString.optional(),
  paidFromCardId: nonEmptyString.optional(),
});

// No create schema — installment rows are only ever produced in bulk by
// createLoanWithSchedule() in loans.ts, never created one at a time via the
// API. Updates are for marking an installment paid (or correcting it).
export const updateLoanInstallmentSchema = loanInstallmentRowSchema.omit({ id: true }).partial();

/** The LoanInstallments tab's columns, in order. */
export const LOAN_INSTALLMENT_COLUMNS: (keyof LoanInstallment)[] = [
  "id",
  "loanId",
  "installmentNumber",
  "dueDate",
  "openingBalance",
  "principalDue",
  "interestDue",
  "totalDue",
  "status",
  "amountPaid",
  "paidDate",
  "overdueCharge",
  "paidFromAccountId",
  "paidFromCardId",
];

export const loanInstallmentsRepository = createRepository<LoanInstallment>({
  sheetName: "LoanInstallments",
  columns: LOAN_INSTALLMENT_COLUMNS,
  dateColumns: ["dueDate", "paidDate"],
  schema: loanInstallmentRowSchema,
});
