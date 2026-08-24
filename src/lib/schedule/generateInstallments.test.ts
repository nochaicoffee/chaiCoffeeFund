import { describe, expect, it } from "vitest";
import { generateInstallments } from "./generateInstallments";
import type { Loan } from "../sheets/types";

const baseLoan: Omit<Loan, "id"> = {
  name: "Test Loan",
  lenderName: "Test Bank",
  category: "Personal",
  repaymentStructure: "Standard-Emi",
  principalAmount: 100000,
  annualInterestRate: 12,
  tenureMonths: 12,
  paymentFrequency: "Monthly",
  processingFee: 0,
  disbursementDate: "2026-01-01",
  accountId: "acc-1",
  status: "Active",
};

describe("generateInstallments (Standard-Emi, reducing balance)", () => {
  const schedule = generateInstallments(baseLoan);

  it("produces one installment per tenure month", () => {
    expect(schedule).toHaveLength(12);
  });

  it("fully repays the principal, landing on exactly zero balance", () => {
    const totalPrincipal = schedule.reduce((sum, i) => sum + i.principalDue, 0);
    expect(totalPrincipal).toBeCloseTo(100000, 2);

    const last = schedule[schedule.length - 1];
    expect(last.openingBalance - last.principalDue).toBeCloseTo(0, 2);
  });

  it("keeps the total payment roughly constant (true EMI), not flat-rate", () => {
    const totals = schedule.map((i) => i.totalDue);
    for (const total of totals.slice(0, -1)) {
      expect(total).toBeCloseTo(totals[0], 1);
    }
  });

  it("has strictly non-increasing interest as the balance amortizes", () => {
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].interestDue).toBeLessThanOrEqual(schedule[i - 1].interestDue);
    }
    // And it should actually decrease overall, not stay flat like the old sheet's data did.
    expect(schedule[0].interestDue).toBeGreaterThan(schedule[schedule.length - 1].interestDue);
  });

  it("steps due dates forward by the payment frequency from disbursement", () => {
    expect(schedule[0].dueDate).toBe("2026-02-01");
    expect(schedule[1].dueDate).toBe("2026-03-01");
    expect(schedule[11].dueDate).toBe("2027-01-01");
  });

  it("marks every installment pending, with loanId left for the caller to fill in", () => {
    for (const installment of schedule) {
      expect(installment.status).toBe("Pending");
      expect(installment.loanId).toBe("");
    }
  });
});
