import { describe, expect, it } from "vitest";
import { lentFormsData } from "./formsData";
import { lentModel } from "./views";
import type { LentLoan, LentRepayment } from "@/lib/sheets/types";

const a: LentLoan = { id: "a", borrowerName: "Friend", principalAmount: 650000, startDate: "2024-10-01", interestMode: "Accruing", interestRate: 12, status: "Active", color: "Copper" };
const b: LentLoan = { id: "b", borrowerName: "B", principalAmount: 300000, startDate: "2025-11-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000, status: "Repaid", closedDate: "2026-06-01", incomeSourceId: "src" };
const r: LentRepayment = { id: "r1", lentLoanId: "a", date: "2026-01-01", amount: 5000, kind: "Interest" };

describe("lentFormsData", () => {
  const f = lentFormsData(lentModel({ loans: [a, b], repayments: [r], sources: [], entries: [] }, "2026-11-06"), [{ id: "hdfc", name: "HDFC" }]);

  it("hands over today, the accounts and each repayment with the loan it names", () => {
    expect(f.today).toBe("2026-11-06");
    expect(f.accounts).toEqual([{ id: "hdfc", name: "HDFC" }]);
    expect(f.repayments).toEqual([{ id: "r1", loanId: "a", date: "2026-01-01", amount: 5000, kind: "Interest" }]);
  });
  it("hands over each loan as it was entered, with its colour and whether that was chosen", () => {
    expect(f.loans[0]).toMatchObject({ id: "a", interestMode: "Accruing", interestRate: 12, color: "Copper", colorChosen: true, linked: false });
    expect(f.loans[0]).not.toHaveProperty("payoutAmount");
    expect(f.loans[1]).toMatchObject({ id: "b", status: "Repaid", closedDate: "2026-06-01", payoutFrequency: "Monthly", payoutAmount: 6000, colorChosen: false, linked: true });
    expect(typeof f.loans[1].color).toBe("string");
  });
});
