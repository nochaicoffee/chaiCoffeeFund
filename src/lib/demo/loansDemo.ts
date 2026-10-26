import type { LoansData } from "@/app/loans/views";
import { addDays } from "../aggregate/subscriptionRenewals";
import { generateInstallments, round2 } from "../schedule/generateInstallments";
import type { Loan, LoanInstallment } from "../sheets/types";

/**
 * Sample loans from the final design (design/loans/LoansN1.dc.html), for previewing the Loans page in development
 * with `/loans?demo` before any real loans exist. Every name, amount and date is made up: a 20-year home loan, a car
 * loan, a personal loan with HDFC's prepayment rules whose EMI is charged to a card, and a laptop loan that's closed.
 * Every EMI due by `today` is paid, a few of them late with a charge. Never used in production (see isDemoAllowed in
 * cardsDemo.ts), and never written to the Sheet.
 */
const LOANS: Loan[] = [
  { id: "demo-home", name: "Home loan", lenderName: "SBI", category: "Home", repaymentStructure: "Standard-Emi", principalAmount: 2800000, annualInterestRate: 8.7, tenureMonths: 240, paymentFrequency: "Monthly", processingFee: 14000, disbursementDate: "2023-06-02", accountId: "demo-hdfc", status: "Active", firstEmiDate: "2023-07-12", stampDuty: 3500, preEmiInterest: 6674, prepaymentEffect: "Reduce-Tenure", color: "Sapphire", emiPaidFromAccountId: "demo-hdfc" },
  { id: "demo-car", name: "Car loan", lenderName: "ICICI Bank", category: "Auto", repaymentStructure: "Standard-Emi", principalAmount: 700000, annualInterestRate: 9.2, tenureMonths: 60, paymentFrequency: "Monthly", processingFee: 7000, disbursementDate: "2024-03-01", accountId: "demo-hdfc", status: "Active", firstEmiDate: "2024-04-05", stampDuty: 500, preEmiInterest: 706, prepaymentEffect: "Reduce-Tenure", color: "Copper", emiPaidFromAccountId: "demo-hdfc", prepaymentChargePercent: 3 },
  { id: "demo-personal", name: "Personal loan", lenderName: "HDFC Bank", category: "Personal", repaymentStructure: "Standard-Emi", principalAmount: 300000, annualInterestRate: 11.5, tenureMonths: 36, paymentFrequency: "Monthly", processingFee: 4500, disbursementDate: "2025-02-24", accountId: "demo-hdfc", status: "Active", firstEmiDate: "2025-03-28", stampDuty: 400, preEmiInterest: 0, prepaymentEffect: "Reduce-Emi", color: "Violet", emiPaidFromCardId: "demo-regalia", prepaymentChargePercent: 4, prepaymentMaxPercent: 25, prepaymentsPerYear: 1, prepaymentsInLoan: 2, prepaymentAfterEmis: 1 },
  { id: "demo-laptop", name: "Laptop loan", lenderName: "Axis Bank", category: "Other", repaymentStructure: "Standard-Emi", principalAmount: 120000, annualInterestRate: 13, tenureMonths: 12, paymentFrequency: "Monthly", processingFee: 1200, disbursementDate: "2025-04-10", accountId: "demo-icici", status: "Closed", firstEmiDate: "2025-05-15", stampDuty: 0, preEmiInterest: 0, prepaymentEffect: "Reduce-Tenure", color: "Teal", emiPaidFromAccountId: "demo-icici" },
];

/** Which EMIs were paid late, by how many days, and the bank's charge for it. */
const LATE: Record<string, { late: (n: number) => boolean; days: number; charge: number }> = {
  "demo-home": { late: (n) => n % 13 === 0, days: 3, charge: 400 },
  "demo-car": { late: (n) => n % 9 === 0, days: 2, charge: 250 },
  "demo-personal": { late: (n) => n === 7, days: 4, charge: 300 },
  "demo-laptop": { late: () => false, days: 0, charge: 0 },
};

export function demoLoansData(today: string): LoansData {
  const installments: LoanInstallment[] = LOANS.flatMap((loan) =>
    generateInstallments(loan).map((row, k): LoanInstallment => {
      const base = { ...row, id: `${loan.id}-${k + 1}`, loanId: loan.id };
      // A closed loan is all paid, whatever today is.
      if (row.dueDate > today && loan.status === "Active") return base;
      const { late, days, charge } = LATE[loan.id];
      const isLate = late(row.installmentNumber);
      const overdueCharge = isLate ? charge : 0;
      return {
        ...base,
        status: "Paid",
        paidDate: isLate ? addDays(row.dueDate, days) : row.dueDate,
        amountPaid: round2(row.totalDue + overdueCharge),
        ...(overdueCharge && { overdueCharge }),
        ...(loan.emiPaidFromCardId ? { paidFromCardId: loan.emiPaidFromCardId } : { paidFromAccountId: loan.emiPaidFromAccountId }),
      };
    }),
  );
  return {
    loans: LOANS,
    installments,
    prepayments: [],
    accounts: [
      { id: "demo-hdfc", name: "HDFC Salary" },
      { id: "demo-icici", name: "ICICI Invest" },
    ],
    cards: [{ id: "demo-regalia", name: "HDFC Regalia", color: "ruby" }],
    salary: 138500,
  };
}
