import { describe, expect, it } from "vitest";
import { generateInstallments } from "../schedule/generateInstallments";
import {
  computeLoanSummaries,
  nextDueInstallment,
  outstandingBalance,
  totalDueThisMonth,
  totalLoanOutstanding,
  totalPaid,
} from "./loans";
import type { Loan } from "../sheets/types";

const loan: Omit<Loan, "id"> = {
  name: "Test Loan",
  lenderName: "Test Bank",
  category: "Personal",
  repaymentStructure: "Standard-Emi",
  principalAmount: 120000,
  annualInterestRate: 10,
  tenureMonths: 6,
  paymentFrequency: "Monthly",
  processingFee: 500,
  disbursementDate: "2026-08-01",
  accountId: "acc-1",
  status: "Active",
};
const loanWithId: Loan = { ...loan, id: "loan-1" };

function withLoanId(schedule: ReturnType<typeof generateInstallments>) {
  return schedule.map((i, index) => ({ ...i, id: `installment-${index + 1}`, loanId: "loan-1" }));
}

describe("outstandingBalance / totalPaid", () => {
  it("treats a freshly-generated schedule as fully outstanding, nothing paid", () => {
    const installments = withLoanId(generateInstallments(loan));
    expect(outstandingBalance("loan-1", installments)).toBeCloseTo(120000, 1);
    expect(totalPaid("loan-1", installments)).toBe(0);
  });

  it("reduces outstanding and increases paid as installments get marked Paid", () => {
    const installments = withLoanId(generateInstallments(loan));
    installments[0].status = "Paid";
    installments[0].amountPaid = installments[0].totalDue;

    expect(totalPaid("loan-1", installments)).toBeCloseTo(installments[0].totalDue, 2);
    // Outstanding balance is now the remaining principal only (installment 1's already paid).
    const expectedRemaining = installments.slice(1).reduce((sum, i) => sum + i.principalDue, 0);
    expect(outstandingBalance("loan-1", installments)).toBeCloseTo(expectedRemaining, 1);
  });
});

describe("nextDueInstallment", () => {
  it("picks the earliest still-pending installment", () => {
    const installments = withLoanId(generateInstallments(loan));
    installments[0].status = "Paid";
    const next = nextDueInstallment("loan-1", installments);
    expect(next?.installmentNumber).toBe(2);
  });

  it("returns null once every installment is paid", () => {
    const installments = withLoanId(generateInstallments(loan)).map((i) => ({ ...i, status: "Paid" as const }));
    expect(nextDueInstallment("loan-1", installments)).toBeNull();
  });
});

describe("computeLoanSummaries", () => {
  it("bundles outstanding, paid, and next-due together per loan", () => {
    const installments = withLoanId(generateInstallments(loan));
    const [summary] = computeLoanSummaries([loanWithId], installments);
    expect(summary.loan.id).toBe("loan-1");
    expect(summary.outstandingBalance).toBeCloseTo(120000, 1);
    expect(summary.nextDueInstallment?.installmentNumber).toBe(1);
  });
});

describe("totalLoanOutstanding", () => {
  it("excludes closed loans", () => {
    const installments = withLoanId(generateInstallments(loan));
    const closedLoan: Loan = { ...loanWithId, id: "loan-2", status: "Closed" };
    const closedInstallments = installments.map((i) => ({ ...i, loanId: "loan-2" }));
    expect(totalLoanOutstanding([loanWithId, closedLoan], [...installments, ...closedInstallments])).toBeCloseTo(
      120000,
      1,
    );
  });
});

describe("totalDueThisMonth", () => {
  it("sums pending installments due within the given month", () => {
    const installments = withLoanId(generateInstallments(loan));
    // The schedule's first installment is due 2026-09-01.
    expect(totalDueThisMonth([loanWithId], installments, "2026-09")).toBeCloseTo(installments[0].totalDue, 2);
  });
});
