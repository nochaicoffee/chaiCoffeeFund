import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { LoanPrepayment } from "./types";

/**
 * Principal paid off beyond the EMIs (system-design.md, Loan, "Prepayments"). Rows are written by the Loans page's
 * actions together with the installments they rebuild (app/loans/actions.ts), never on their own, so there is no API
 * route: a prepayment saved without its rebuild would leave the schedule wrong.
 */
const prepaymentFields = z.object({
  loanId: nonEmptyString,
  date: isoDate,
  amount: z.number().positive(),
  charge: nonNegativeNumber,
  effect: z.enum(["Reduce-Tenure", "Reduce-Emi", "Close"]),
  source: z.enum(["Manual", "Excess-Emi"]),
  installmentId: nonEmptyString.optional(),
  paidFromAccountId: nonEmptyString.optional(),
  paidFromCardId: nonEmptyString.optional(),
  bankEmi: z.number().positive().optional(),
  bankInstallments: z.number().int().positive().optional(),
});

type PrepaymentRules = Pick<LoanPrepayment, "source" | "installmentId" | "paidFromAccountId" | "paidFromCardId">;

/** Rules across a prepayment's fields, as [field, message] when one is broken. */
function brokenPrepaymentRule(row: PrepaymentRules): [keyof PrepaymentRules, string] | null {
  if (row.source === "Excess-Emi" && !row.installmentId) return ["installmentId", "A prepayment from an EMI paid over names that EMI"];
  if (row.paidFromAccountId && row.paidFromCardId) return ["paidFromCardId", "A prepayment is paid from an account or a card, not both"];
  return null;
}

export function checkLoanPrepayment(row: PrepaymentRules): string | null {
  return brokenPrepaymentRule(row)?.[1] ?? null;
}

export const createLoanPrepaymentSchema = prepaymentFields.superRefine((value, ctx) => {
  const broken = brokenPrepaymentRule(value);
  if (broken) ctx.addIssue({ code: "custom", path: [broken[0]], message: broken[1] });
});

/** A row as read back from the Sheet: a valid create, plus its id. */
export const loanPrepaymentRowSchema = prepaymentFields.extend({ id: nonEmptyString });

/** The LoanPrepayments tab's columns, in order. The tab is created by `/api/dev/sheet-columns?tab=LoanPrepayments`. */
export const LOAN_PREPAYMENT_COLUMNS: (keyof LoanPrepayment)[] = [
  "id",
  "loanId",
  "date",
  "amount",
  "charge",
  "effect",
  "source",
  "installmentId",
  "paidFromAccountId",
  "paidFromCardId",
  "bankEmi",
  "bankInstallments",
];

export const loanPrepaymentsRepository = createRepository<LoanPrepayment>({
  sheetName: "LoanPrepayments",
  columns: LOAN_PREPAYMENT_COLUMNS,
  dateColumns: ["date"],
  schema: loanPrepaymentRowSchema,
  check: checkLoanPrepayment,
});
