import { addMonthsUTC } from "../aggregate/recurring";
import type { Loan, LoanInstallment } from "../sheets/types";

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The reducing-balance EMI on `principal` over `n` monthly installments, to the paisa; an equal split when interest-free. */
export function standardEmi(principal: number, annualInterestRate: number, n: number): number {
  const r = annualInterestRate / 12 / 100;
  return round2(r === 0 ? principal / n : (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1));
}

/**
 * True reducing-balance EMI, rounded the way HDFC's own repayment schedule is
 * (checked against a real HDFC personal loan in the test): the EMI to the
 * paisa, each month's interest to the whole rupee on the outstanding balance,
 * and the principal is the rest. The final installment repays whatever
 * balance is left, so the principals add up to exactly the loan amount.
 *
 * The first EMI is a full month's interest, wherever the disbursement fell in
 * the month: the bank collects the odd days before the EMI cycle up front, as
 * the loan's preEmiInterest. Every due date counts from firstEmiDate itself,
 * not from the previous due date, so an EMI on the 31st comes back to the 31st
 * after a short month.
 */
function generateStandardEmiSchedule(loan: Omit<Loan, "id">): Omit<LoanInstallment, "id">[] {
  const monthlyRate = loan.annualInterestRate / 12 / 100;
  const n = loan.tenureMonths;

  const emi = standardEmi(loan.principalAmount, loan.annualInterestRate, n);

  const installments: Omit<LoanInstallment, "id">[] = [];
  let openingBalance = round2(loan.principalAmount);

  for (let installmentNumber = 1; installmentNumber <= n; installmentNumber++) {
    const interestDue = Math.round(openingBalance * monthlyRate);
    const isLast = installmentNumber === n;
    const principalDue = isLast ? openingBalance : round2(emi - interestDue);

    installments.push({
      loanId: "", // filled in by the caller once the parent Loan's id exists
      installmentNumber,
      dueDate: addMonthsUTC(loan.firstEmiDate, installmentNumber - 1),
      openingBalance,
      principalDue,
      interestDue,
      totalDue: round2(principalDue + interestDue),
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
