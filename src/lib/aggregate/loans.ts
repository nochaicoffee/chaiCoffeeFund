import type { Loan, LoanInstallment } from "../sheets/types";

export interface LoanSummary {
  loan: Loan;
  outstandingBalance: number;
  totalPaid: number;
  nextDueInstallment: LoanInstallment | null;
}

function installmentsForLoan(loanId: string, installments: LoanInstallment[]): LoanInstallment[] {
  return installments.filter((i) => i.loanId === loanId);
}

/**
 * What actually reached the account: the loan amount less the processing fee,
 * stamp duty and pre-EMI interest the bank takes out of the disbursal. The EMIs
 * are still on the full loan amount.
 */
export function netDisbursedAmount(loan: Pick<Loan, "principalAmount" | "processingFee" | "stampDuty" | "preEmiInterest">): number {
  return Math.round((loan.principalAmount - loan.processingFee - loan.stampDuty - loan.preEmiInterest) * 100) / 100;
}

/** Remaining principal: the sum of principalDue across installments not yet paid. */
export function outstandingBalance(loanId: string, installments: LoanInstallment[]): number {
  return installmentsForLoan(loanId, installments)
    .filter((i) => i.status === "Pending")
    .reduce((sum, i) => sum + i.principalDue, 0);
}

/** What's actually been paid so far, from the real amountPaid on each settled installment. */
export function totalPaid(loanId: string, installments: LoanInstallment[]): number {
  return installmentsForLoan(loanId, installments)
    .filter((i) => i.status === "Paid")
    .reduce((sum, i) => sum + (i.amountPaid ?? 0), 0);
}

export function nextDueInstallment(loanId: string, installments: LoanInstallment[]): LoanInstallment | null {
  const pending = installmentsForLoan(loanId, installments)
    .filter((i) => i.status === "Pending")
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  return pending[0] ?? null;
}

export function computeLoanSummaries(loans: Loan[], installments: LoanInstallment[]): LoanSummary[] {
  return loans.map((loan) => ({
    loan,
    outstandingBalance: outstandingBalance(loan.id, installments),
    totalPaid: totalPaid(loan.id, installments),
    nextDueInstallment: nextDueInstallment(loan.id, installments),
  }));
}

/** Sum of outstanding balances across active loans — the loan liability term in net worth. */
export function totalLoanOutstanding(loans: Loan[], installments: LoanInstallment[]): number {
  return loans
    .filter((l) => l.status === "Active")
    .reduce((sum, l) => sum + outstandingBalance(l.id, installments), 0);
}

/** This month's EMI total across active loans — feeds the "monthly obligations" tile. */
export function totalDueThisMonth(loans: Loan[], installments: LoanInstallment[], yearMonth: string): number {
  const activeLoanIds = new Set(loans.filter((l) => l.status === "Active").map((l) => l.id));
  return installments
    .filter((i) => activeLoanIds.has(i.loanId) && i.status === "Pending" && i.dueDate.startsWith(yearMonth))
    .reduce((sum, i) => sum + i.totalDue, 0);
}
