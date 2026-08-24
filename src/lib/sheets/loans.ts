import "server-only";
import { z } from "zod";
import { createRepository } from "./repository";
import { loanInstallmentsRepository } from "./loanInstallments";
import { generateInstallments } from "../schedule/generateInstallments";
import { isoDate, nonEmptyString, nonNegativeNumber } from "./validation";
import type { Loan, LoanInstallment } from "./types";

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
});

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
  const installments = await loanInstallmentsRepository.list();
  const toDelete = installments.filter((installment) => installment.loanId === loanId);
  // Sequential, not Promise.all — concurrent deletes against the same tab
  // race on row-index computation (see the plan's Verification notes).
  for (const installment of toDelete) {
    await loanInstallmentsRepository.remove(installment.id);
  }
  await loansRepository.remove(loanId);
}
