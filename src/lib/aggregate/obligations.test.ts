import { describe, expect, it } from "vitest";
import { paidThisMonth } from "./obligations";
import type { LoanInstallment, Statement } from "../sheets/types";

describe("paidThisMonth", () => {
  const inst = (id: string, status: "Paid" | "Pending", paidDate: string | undefined, total: number, amountPaid?: number) => ({ id, loanId: "l", installmentNumber: 1, dueDate: "2026-11-02", openingBalance: 0, principalDue: total, interestDue: 0, totalDue: total, status, paidDate, amountPaid }) as LoanInstallment;
  const st = (id: string, status: "Paid" | "Pending", paidDate: string | undefined, total: number, amountPaid?: number) => ({ id, cardId: "c", statementDate: "2026-10-01", dueDate: "2026-10-20", totalAmountDue: total, minimumAmountDue: 1, status, paidDate, amountPaid }) as Statement;
  it("adds the installments and statements paid in the month, by the day they were paid", () => {
    const total = paidThisMonth({
      yearMonth: "2026-11",
      loanInstallments: [inst("a", "Paid", "2026-11-02", 31200, 31200), inst("b", "Paid", "2026-10-30", 5000), inst("c", "Pending", undefined, 19850)],
      statements: [st("x", "Paid", "2026-11-03", 20000, 19000), st("y", "Paid", "2026-10-25", 9000), st("z", "Pending", undefined, 41200)],
    });
    expect(total).toBe(31200 + 19000);
  });
  it("counts the amount due when no amount paid was recorded, and nothing for an empty month", () => {
    expect(paidThisMonth({ yearMonth: "2026-11", loanInstallments: [inst("a", "Paid", "2026-11-02", 7000)], statements: [] })).toBe(7000);
    expect(paidThisMonth({ yearMonth: "2026-11", loanInstallments: [], statements: [] })).toBe(0);
  });
});
