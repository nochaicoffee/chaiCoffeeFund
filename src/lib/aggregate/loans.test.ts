import { describe, expect, it } from "vitest";
import { generateInstallments } from "../schedule/generateInstallments";
import {
  bookFacts,
  computeLoanSummaries,
  currentEmi,
  excessOverEmi,
  financialYear,
  loadZone,
  loanColor,
  loanFacts,
  prepaymentLimits,
  timeUntil,
  whatIfPrepayment,
  netDisbursedAmount,
  nextDueInstallment,
  outstandingBalance,
  totalDueThisMonth,
  totalLoanOutstanding,
  totalPaid,
} from "./loans";
import type { Loan, LoanPrepayment } from "../sheets/types";

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
  firstEmiDate: "2026-09-01",
  stampDuty: 0,
  preEmiInterest: 0,
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

describe("netDisbursedAmount", () => {
  it("takes the fee, stamp duty and pre-EMI interest out of the loan amount (HDFC loan of 2026-07-04)", () => {
    // The agreement's Key Fact Statement: ₹11,10,000 − ₹7,669 − ₹500 − ₹911 = ₹11,00,920.
    expect(netDisbursedAmount({ principalAmount: 1110000, processingFee: 7669, stampDuty: 500, preEmiInterest: 911 })).toBe(1100920);
  });

  it("is the whole loan amount when nothing is deducted", () => {
    expect(netDisbursedAmount({ principalAmount: 50000, processingFee: 0, stampDuty: 0, preEmiInterest: 0 })).toBe(50000);
  });
});

describe("the Loans page's sums", () => {
  // Two EMIs paid, the second 3 days late with a ₹300 charge, and a ₹10,000 prepayment of its own.
  const installments = withLoanId(generateInstallments(loan));
  installments[0] = { ...installments[0], status: "Paid", paidDate: installments[0].dueDate, amountPaid: installments[0].totalDue };
  installments[1] = { ...installments[1], status: "Paid", paidDate: "2026-10-04", amountPaid: installments[1].totalDue + 300, overdueCharge: 300 };
  const prepayment: LoanPrepayment = { id: "p1", loanId: "loan-1", date: "2026-10-04", amount: 10000, charge: 472, effect: "Reduce-Tenure", source: "Manual" };
  const facts = loanFacts(loanWithId, installments, [prepayment]);

  it("splits the schedule into what's paid and what's left, and their interest", () => {
    expect(facts.paidCount).toBe(2);
    expect(facts.left).toBe(4);
    expect(facts.outstanding).toBeCloseTo(installments.slice(2).reduce((t, i) => t + i.principalDue, 0), 2);
    expect(facts.principalRepaid + facts.outstanding).toBeCloseTo(120000, 2);
    expect(facts.repaidShare).toBeCloseTo(facts.principalRepaid / 120000, 6);
    expect(facts.termShare).toBeCloseTo(2 / 6, 6);
    expect(facts.interestPaid + facts.interestLeft).toBeCloseTo(facts.interestTotal, 2);
    expect(facts.interestPaid).toBe(installments[0].interestDue + installments[1].interestDue);
  });

  it("counts late EMIs and their charges, and the charges beside interest", () => {
    expect(facts.lateCount).toBe(1);
    expect(facts.lateCharges).toBe(300);
    expect(facts.charges).toBe(500 + 472);
    expect(facts.prepaid).toBe(10000);
  });

  it("has the next pending EMI, the EMI, and the last due date", () => {
    expect(facts.next?.installmentNumber).toBe(3);
    expect(facts.emi).toBe(installments[2].totalDue);
    expect(facts.end).toBe("2027-02-01");
  });

  it("saves no interest while the schedule is the original one", () => {
    expect(facts.interestSaved).toBe(0);
  });

  it("adds up the active loans only", () => {
    const closed = loanFacts({ ...loanWithId, id: "loan-2", status: "Closed" }, installments.map((i) => ({ ...i, loanId: "loan-2" })), []);
    const book = bookFacts([facts, closed]);
    expect(book.loans).toHaveLength(1);
    expect(book.owed).toBe(facts.outstanding);
    expect(book.borrowed).toBe(120000);
    expect(book.debtFree).toBe("2027-02-01");
    expect(book.next?.installmentNumber).toBe(3);
    expect(book.netDisbursed).toBe(119500);
  });
});

describe("currentEmi", () => {
  it("is the next EMI's, but not the last one's, which only repays what's left", () => {
    const rows = withLoanId(generateInstallments(loan)).map((i, k) => (k < 5 ? { ...i, status: "Paid" as const } : i));
    expect(currentEmi(rows)).toBe(rows[5].totalDue);
    const fresh = withLoanId(generateInstallments(loan));
    expect(currentEmi(fresh)).toBe(fresh[0].totalDue);
  });
});

describe("timeUntil", () => {
  it("counts whole months, then the days left", () => {
    expect(timeUntil("2026-10-25", "2043-06-12")).toEqual({ years: 16, months: 7, days: 18, totalMonths: 199 });
    expect(timeUntil("2026-10-25", "2026-10-28")).toEqual({ years: 0, months: 0, days: 3, totalMonths: 0 });
    expect(timeUntil("2026-10-25", "2026-11-25")).toEqual({ years: 0, months: 1, days: 0, totalMonths: 1 });
  });
});

describe("loadZone", () => {
  it("is comfortable under 30%, stretched to 40%, heavy over", () => {
    expect(loadZone(0.29)).toBe("Comfortable");
    expect(loadZone(0.35)).toBe("Stretched");
    expect(loadZone(0.41)).toBe("Heavy");
  });
});

describe("excessOverEmi", () => {
  it("is a prepayment only from ₹1 above the EMI and its overdue charge", () => {
    expect(excessOverEmi({ totalDue: 97581.47 }, 97581)).toBe(0);
    expect(excessOverEmi({ totalDue: 97581.47 }, 97582)).toBe(0);
    expect(excessOverEmi({ totalDue: 9893 }, 30000)).toBe(20107);
    expect(excessOverEmi({ totalDue: 9893 }, 30000, 300)).toBe(19807);
  });
});

describe("whatIfPrepayment", () => {
  it("estimates the saving on today's schedule, with the charge apart", () => {
    const installments = withLoanId(generateInstallments(loan));
    const what = whatIfPrepayment({ ...loanWithId, prepaymentChargePercent: 4 }, installments, 50000, "Reduce-Emi", "2026-09-01");
    expect(what.emiAfter).toBeLessThan(what.emiBefore);
    expect(what.end).toBe(what.endBefore);
    expect(what.charge).toBe(2360);
    expect(what.payToday).toBe(52360);
    expect(what.interestSaved).toBeGreaterThan(0);
  });

  it("pays the odd days' interest with a foreclosure", () => {
    const installments = withLoanId(generateInstallments(loan));
    const what = whatIfPrepayment(loanWithId, installments, 0, "Close", "2026-09-11");
    expect(what.closes).toBe(true);
    expect(what.days).toBe(10);
    expect(what.payToday).toBe(Math.round((what.amount + what.dayInterest) * 100) / 100);
  });
});

describe("prepaymentLimits", () => {
  const hdfcRules = { ...loanWithId, prepaymentAfterEmis: 1, prepaymentMaxPercent: 25, prepaymentsPerYear: 1, prepaymentsInLoan: 2 };
  const earlier: LoanPrepayment = { id: "p1", loanId: "loan-1", date: "2026-05-10", amount: 5000, charge: 0, effect: "Reduce-Emi", source: "Manual" };

  it("checks each limit the loan has, as warnings", () => {
    const checks = prepaymentLimits({ loan: hdfcRules, paidCount: 3, outstanding: 154514, prepayments: [earlier] }, "2026-10-25", 50000);
    expect(checks.map((c) => [c.rule, c.ok])).toEqual([
      ["After the first EMI", true],
      ["At most 25% of what's left", false],
      ["Once a financial year", false],
      ["Twice in the loan's life", true],
    ]);
  });

  it("counts a financial year from April", () => {
    expect(financialYear("2027-03-31")).toBe(2026);
    expect(financialYear("2027-04-01")).toBe(2027);
    const checks = prepaymentLimits({ loan: hdfcRules, paidCount: 3, outstanding: 154514, prepayments: [earlier] }, "2027-04-02", 10000);
    expect(checks.find((c) => c.rule === "Once a financial year")?.ok).toBe(true);
  });

  it("has nothing to check for a loan without limits", () => {
    expect(prepaymentLimits({ loan: loanWithId, paidCount: 0, outstanding: 1000, prepayments: [] }, "2026-10-25", 500)).toEqual([]);
  });
});

describe("loanColor", () => {
  it("is the loan's own, else its category's", () => {
    expect(loanColor({ category: "Home" })).toBe("Sapphire");
    expect(loanColor({ category: "Home", color: "Ruby" })).toBe("Ruby");
  });
});
