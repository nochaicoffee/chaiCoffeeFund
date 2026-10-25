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
  firstEmiDate: "2026-02-01",
  stampDuty: 0,
  preEmiInterest: 0,
};

describe("generateInstallments (Standard-Emi, reducing balance)", () => {
  const schedule = generateInstallments(baseLoan);

  it("produces one installment per tenure month", () => {
    expect(schedule).toHaveLength(12);
  });

  it("fully repays the principal, landing on exactly zero balance", () => {
    const totalPrincipal = schedule.reduce((sum, i) => sum + i.principalDue, 0);
    expect(Math.round(totalPrincipal * 100)).toBe(100000 * 100);

    const last = schedule[schedule.length - 1];
    expect(last.openingBalance).toBe(last.principalDue);
  });

  it("keeps the EMI exactly constant until the last installment (true EMI, not flat-rate)", () => {
    for (const installment of schedule.slice(0, -1)) {
      expect(installment.totalDue).toBe(schedule[0].totalDue);
    }
  });

  it("has strictly decreasing interest as the balance amortizes", () => {
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].interestDue).toBeLessThan(schedule[i - 1].interestDue);
    }
  });

  it("carries each closing balance into the next installment's opening balance", () => {
    for (let i = 1; i < schedule.length; i++) {
      const closing = schedule[i - 1].openingBalance - schedule[i - 1].principalDue;
      expect(schedule[i].openingBalance).toBeCloseTo(closing, 2);
    }
  });

  it("puts every due date on the first EMI's day, a month apart", () => {
    expect(schedule.map((i) => i.dueDate)).toEqual([
      "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01",
      "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01", "2027-01-01",
    ]);
  });

  it("brings an EMI on the 31st back to the 31st after a short month", () => {
    const dates = generateInstallments({ ...baseLoan, firstEmiDate: "2026-01-31", tenureMonths: 4 }).map((i) => i.dueDate);
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("splits an interest-free loan into equal principal payments", () => {
    const free = generateInstallments({ ...baseLoan, annualInterestRate: 0, principalAmount: 1200 });
    expect(free.every((i) => i.interestDue === 0 && i.totalDue === 100)).toBe(true);
  });

  it("keeps a long loan's last EMI within 0.2% of the EMI, despite rounding interest to the rupee", () => {
    for (const [principalAmount, annualInterestRate, tenureMonths] of [[5000000, 8.5, 240], [2500000, 9, 360], [300000, 14, 60]]) {
      const long = generateInstallments({ ...baseLoan, principalAmount, annualInterestRate, tenureMonths });
      const emi = long[0].totalDue;
      expect(Math.abs(long[long.length - 1].totalDue - emi) / emi).toBeLessThan(0.002);
      expect(Math.round(long.reduce((sum, i) => sum + i.principalDue, 0) * 100)).toBe(principalAmount * 100);
    }
  });

  it("rounds a principal with fractions of a paisa before it reaches the schedule", () => {
    const odd = generateInstallments({ ...baseLoan, principalAmount: 100000.005 });
    expect(odd[0].openingBalance).toBe(100000.01);
    expect(Math.round(odd.reduce((sum, i) => sum + i.principalDue, 0) * 100)).toBe(10000001);
  });

  it("marks every installment pending, with loanId left for the caller to fill in", () => {
    for (const installment of schedule) {
      expect(installment.status).toBe("Pending");
      expect(installment.loanId).toBe("");
    }
  });
});

describe("generateInstallments against a real HDFC personal loan", () => {
  // From Prathik's HDFC loan agreement of 2026-07-04: ₹11,10,000 at 9.99% fixed
  // for 12 months, EMI ₹97,581 from 2026-08-07, due on the 7th.
  const hdfcLoan: Omit<Loan, "id"> = {
    ...baseLoan,
    lenderName: "HDFC Bank",
    principalAmount: 1110000,
    annualInterestRate: 9.99,
    tenureMonths: 12,
    processingFee: 7669,
    disbursementDate: "2026-07-04",
    firstEmiDate: "2026-08-07",
    stampDuty: 500,
    preEmiInterest: 911,
  };
  const schedule = generateInstallments(hdfcLoan);

  // The agreement's "Illustrative Repayment Schedule": opening principal (shown
  // to the rupee), principal, interest and instalment, for each of the 12 EMIs.
  const bank: [number, number, number, number][] = [
    [1110000, 88340.47, 9241, 97581.47],
    [1021660, 89076.47, 8505, 97581.47],
    [932583, 89817.47, 7764, 97581.47],
    [842766, 90565.47, 7016, 97581.47],
    [752200, 91319.47, 6262, 97581.47],
    [660881, 92079.47, 5502, 97581.47],
    [568801, 92846.47, 4735, 97581.47],
    [475955, 93619.47, 3962, 97581.47],
    [382335, 94398.47, 3183, 97581.47],
    [287937, 95184.47, 2397, 97581.47],
    [192752, 95976.47, 1605, 97581.47],
    [96776, 96775.8, 806, 97582],
  ];

  it("matches the bank's schedule to the paisa for EMIs 1 to 11", () => {
    schedule.slice(0, 11).forEach((installment, i) => {
      const [opening, principal, interest, total] = bank[i];
      expect(Math.round(installment.openingBalance)).toBe(opening);
      expect(installment.principalDue).toBe(principal);
      expect(installment.interestDue).toBe(interest);
      expect(installment.totalDue).toBe(total);
    });
  });

  it("matches the bank's last EMI to within a rupee, repaying exactly what's left", () => {
    // The bank keeps more decimals than the Sheet stores, so its last principal is
    // ₹96,775.80 and it rounds the last EMI to ₹97,582. Here the last principal is
    // whatever the stored principals leave (₹96,775.83), so the loan repays exactly.
    const last = schedule[11];
    const [opening, principal, interest, total] = bank[11];
    expect(Math.round(last.openingBalance)).toBe(opening);
    expect(last.interestDue).toBe(interest);
    expect(Math.abs(last.principalDue - principal)).toBeLessThan(0.05);
    expect(Math.abs(last.totalDue - total)).toBeLessThan(1);
    expect(Math.round(schedule.reduce((sum, i) => sum + i.principalDue, 0) * 100)).toBe(1110000 * 100);
  });

  it("falls due on the 7th, from 2026-08-07 to 2027-07-07 (the agreement's EMI start and end dates)", () => {
    expect(schedule.every((i) => i.dueDate.endsWith("-07"))).toBe(true);
    expect(schedule[0].dueDate).toBe("2026-08-07");
    expect(schedule[11].dueDate).toBe("2027-07-07");
  });
});
