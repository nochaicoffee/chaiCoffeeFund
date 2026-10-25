import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { loanInstallmentsRepository } from "./loanInstallments";
import { generateInstallments } from "../schedule/generateInstallments";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { Loan, LoanInstallment } from "./types";

/** A loan's fields. The repository reads column types from a plain object, so the cross-field check is added below. */
const loanFields = z.object({
  name: nonEmptyString,
  lenderName: nonEmptyString,
  category: z.enum(["Personal", "Auto", "Home", "Other"]),
  repaymentStructure: z.enum(["Standard-Emi"]),
  principalAmount: nonNegativeNumber,
  annualInterestRate: nonNegativeNumber,
  tenureMonths: z.number().int().positive(),
  paymentFrequency: z.enum(["Monthly"]),
  processingFee: nonNegativeNumber,
  disbursementDate: isoDate,
  accountId: nonEmptyString,
  status: z.enum(["Active", "Closed"]),
  firstEmiDate: isoDate,
  stampDuty: nonNegativeNumber,
  preEmiInterest: nonNegativeNumber,
});

type LoanRules = Pick<Loan, "principalAmount" | "processingFee" | "stampDuty" | "preEmiInterest" | "disbursementDate" | "firstEmiDate">;

/** Rules across a loan's fields, as [field, message] when one is broken. */
function brokenLoanRule(loan: LoanRules): [keyof LoanRules, string] | null {
  if (loan.firstEmiDate <= loan.disbursementDate) return ["firstEmiDate", "The first EMI is due after the loan is disbursed"];
  if (loan.processingFee + loan.stampDuty + loan.preEmiInterest >= loan.principalAmount) {
    return ["processingFee", "The fee, stamp duty and pre-EMI interest add up to more than the loan"];
  }
  return null;
}

/** The same rules on a whole row, which the repository runs after an update is merged over the stored one. */
export function checkLoan(loan: LoanRules): string | null {
  return brokenLoanRule(loan)?.[1] ?? null;
}

export const createLoanSchema = loanFields.superRefine((value, ctx) => {
  const broken = brokenLoanRule(value);
  if (broken) ctx.addIssue({ code: "custom", path: [broken[0]], message: broken[1] });
});

/**
 * A partial update, for correcting a loan's details (name, lender, status, charges).
 * The terms that drive the generated schedule (principal, rate, tenure, dates) can't be
 * changed here: the installments wouldn't be regenerated, so the loan and its schedule
 * would disagree. Sending one is a 400, not silently ignored.
 */
export const updateLoanSchema = loanFields
  .omit({
    repaymentStructure: true,
    principalAmount: true,
    annualInterestRate: true,
    tenureMonths: true,
    paymentFrequency: true,
    disbursementDate: true,
    firstEmiDate: true,
  })
  .partial()
  .strict();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const loanRowSchema = loanFields.extend({ id: nonEmptyString });

/** The Loans tab's columns, in order. firstEmiDate, stampDuty and preEmiInterest were added on the end (2026-10-25). */
export const LOAN_COLUMNS: (keyof Loan)[] = [
  "id",
  "name",
  "lenderName",
  "category",
  "repaymentStructure",
  "principalAmount",
  "annualInterestRate",
  "tenureMonths",
  "paymentFrequency",
  "processingFee",
  "disbursementDate",
  "accountId",
  "status",
  "firstEmiDate",
  "stampDuty",
  "preEmiInterest",
];

export const loansRepository = createRepository<Loan>({
  sheetName: "Loans",
  columns: LOAN_COLUMNS,
  dateColumns: ["disbursementDate", "firstEmiDate"],
  schema: loanRowSchema,
  check: checkLoan,
});

/**
 * Creates a Loan and its full installment schedule together, so a loan
 * never exists without one — unlike the old sheet's amortization tab,
 * which had headers but was never actually populated.
 *
 * Not a real database transaction (Sheets has no such thing) — but a
 * partial failure here (loan created, schedule creation then fails) would
 * recreate that exact bug from a different cause. If generating the
 * schedule fails, the just-created loan is deleted rather than left
 * orphaned with no installments.
 */
export async function createLoanWithSchedule(
  input: z.infer<typeof createLoanSchema>,
): Promise<{ loan: Loan; installments: LoanInstallment[] }> {
  const loan = await loansRepository.create(input);
  try {
    const schedule = generateInstallments(input).map((installment) => ({
      ...installment,
      loanId: loan.id,
    }));
    const installments = await loanInstallmentsRepository.createMany(schedule);
    return { loan, installments };
  } catch (error) {
    await loansRepository.remove(loan.id);
    throw new Error(
      `Failed to generate installment schedule for loan ${loan.id} — the loan was rolled back. Original error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Deletes a Loan and every installment that belongs to it. Without this,
 * deleting a loan through the plain repository would leave its
 * installments behind as orphaned rows pointing at a loanId that no
 * longer exists — the same "the pair should move together" reasoning as
 * createLoanWithSchedule, just for the other end of a loan's lifecycle.
 */
export async function deleteLoanWithSchedule(loanId: string): Promise<void> {
  // readAll, not list: an installment row that fails validation still belongs
  // to the loan and must go with it.
  const { records, invalid } = await loanInstallmentsRepository.readAll();
  const invalidRows = invalid.filter((row) => row.values.loanId === loanId);
  // Checked before deleting anything, so a loan is never left half-deleted.
  const withoutId = invalidRows.filter((row) => typeof row.values.id !== "string");
  if (withoutId.length > 0) {
    throw new Error(
      `Loan ${loanId} wasn't deleted: LoanInstallments ${withoutId.length === 1 ? "row" : "rows"} ${withoutId.map((row) => row.rowNumber).join(", ")} belong to it but have no id, so they couldn't be deleted with it. Fix or delete them in the Sheet first.`,
    );
  }
  const ids = [
    ...records.filter((installment) => installment.loanId === loanId).map((installment) => installment.id),
    ...invalidRows.map((row) => row.values.id as string),
  ];
  // Sequential, not Promise.all — concurrent deletes against the same tab
  // race on row-index computation (see docs/system-design.md).
  for (const id of ids) {
    await loanInstallmentsRepository.remove(id);
  }
  await loansRepository.remove(loanId);
}
