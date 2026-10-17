import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { loanInstallmentsRepository } from "./loanInstallments";
import { generateInstallments } from "../schedule/generateInstallments";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { Loan, LoanInstallment } from "./types";

export const createLoanSchema = z.object({
  name: nonEmptyString,
  lenderName: nonEmptyString,
  category: z.enum(["Personal", "Auto", "Home", "Other"]),
  repaymentStructure: z.enum(["Standard-Emi"]),
  principalAmount: nonNegativeNumber,
  annualInterestRate: nonNegativeNumber,
  tenureMonths: z.number().int().positive(),
  paymentFrequency: z.enum(["Monthly", "Quarterly", "Yearly"]),
  processingFee: nonNegativeNumber,
  disbursementDate: isoDate,
  accountId: nonEmptyString,
  status: z.enum(["Active", "Closed"]),
});

// Loan terms (principal, rate, tenure, ...) drive the already-generated
// schedule — changing them here does NOT regenerate LoanInstallments, so
// this is for correcting metadata (name, status, lenderName) rather than
// terms. Revisit if editing terms after creation becomes a real need.
export const updateLoanSchema = createLoanSchema.partial();

/** A row as read back from the Sheet: a valid create, plus its id. */
export const loanRowSchema = createLoanSchema.extend({ id: nonEmptyString });

export const loansRepository = createRepository<Loan>({
  sheetName: "Loans",
  columns: [
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
  ],
  dateColumns: ["disbursementDate"],
  schema: loanRowSchema,
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
