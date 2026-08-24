import { addMonthsUTC, CYCLE_STEP_MONTHS } from "../aggregate/recurring";
import type { Loan, LoanInstallment } from "../sheets/types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * True reducing-balance EMI: a fixed total payment per period, where the
 * interest portion is computed on the shrinking outstanding balance (so
 * interest decreases and principal increases each period). The final
 * installment absorbs any rounding residue so the balance lands exactly on
 * zero.
 */
function generateStandardEmiSchedule(loan: Omit<Loan, "id">): Omit<LoanInstallment, "id">[] {
  const monthlyRate = loan.annualInterestRate / 12 / 100;
  const n = loan.tenureMonths;
  const stepMonths = CYCLE_STEP_MONTHS[loan.paymentFrequency];

  const emi =
    monthlyRate === 0
      ? loan.principalAmount / n
      : (loan.principalAmount * monthlyRate * (1 + monthlyRate) ** n) /
        ((1 + monthlyRate) ** n - 1);

  const installments: Omit<LoanInstallment, "id">[] = [];
  let openingBalance = loan.principalAmount;
  let dueDate = loan.disbursementDate;

  for (let installmentNumber = 1; installmentNumber <= n; installmentNumber++) {
    dueDate = addMonthsUTC(dueDate, stepMonths);

    const interestDue = round2(openingBalance * monthlyRate);
    const isLast = installmentNumber === n;
    const principalDue = isLast ? round2(openingBalance) : round2(emi - interestDue);
    const totalDue = round2(principalDue + interestDue);

    installments.push({
      loanId: "", // filled in by the caller once the parent Loan's id exists
      installmentNumber,
      dueDate,
      openingBalance: round2(openingBalance),
      principalDue,
      interestDue,
      totalDue,
      status: "Pending",
    });

    openingBalance = round2(openingBalance - principalDue);
  }

  return installments;
}

export function generateInstallments(loan: Omit<Loan, "id">): Omit<LoanInstallment, "id">[] {
  switch (loan.repaymentStructure) {
    case "Standard-Emi":
      return generateStandardEmiSchedule(loan);
  }
}
