import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { LoanInstallment } from "./types";

export const loanInstallmentsRepository = createRepository<LoanInstallment>({
  sheetName: "LoanInstallments",
  columns: [
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
  ],
  dateColumns: ["dueDate", "paidDate"],
});

// No create schema — installment rows are only ever produced in bulk by
// createLoanWithSchedule() in loans.ts, never created one at a time via the
// API. Updates are for marking an installment paid (or correcting it).
export const updateLoanInstallmentSchema = z.object({
  loanId: nonEmptyString.optional(),
  installmentNumber: z.number().optional(),
  dueDate: isoDate.optional(),
  openingBalance: z.number().optional(),
  principalDue: z.number().optional(),
  interestDue: z.number().optional(),
  totalDue: z.number().optional(),
  status: z.enum(["Pending", "Paid"]).optional(),
  amountPaid: nonNegativeNumber.optional(),
  paidDate: isoDate.optional(),
  overdueCharge: nonNegativeNumber.optional(),
  paidFromAccountId: nonEmptyString.optional(),
  paidFromCardId: nonEmptyString.optional(),
});
