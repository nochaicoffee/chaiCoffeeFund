import { describe, expect, it } from "vitest";
import { createLentLoanSchema } from "./lentLoans";

const accruing = { borrowerName: "Friend", principalAmount: 650000, startDate: "2024-10-01", interestMode: "Accruing", interestRate: 12, status: "Active" } as const;
const paidOut = { borrowerName: "Friend", principalAmount: 300000, startDate: "2025-01-01", interestMode: "Paid-out", payoutFrequency: "Monthly", payoutAmount: 6000, status: "Active" } as const;

describe("createLentLoanSchema", () => {
  it("accepts an Accruing loan with a rate and a Paid-out loan with a payout", () => {
    expect(createLentLoanSchema.safeParse(accruing).success).toBe(true);
    expect(createLentLoanSchema.safeParse(paidOut).success).toBe(true);
  });
  it("refuses an Accruing loan without a rate, or with a payout", () => {
    expect(createLentLoanSchema.safeParse({ ...accruing, interestRate: undefined }).success).toBe(false);
    expect(createLentLoanSchema.safeParse({ ...accruing, payoutAmount: 6000, payoutFrequency: "Monthly" }).success).toBe(false);
  });
  it("refuses a Paid-out loan without how often or how much, or with a rate of its own", () => {
    expect(createLentLoanSchema.safeParse({ ...paidOut, payoutFrequency: undefined }).success).toBe(false);
    expect(createLentLoanSchema.safeParse({ ...paidOut, payoutAmount: undefined }).success).toBe(false);
    expect(createLentLoanSchema.safeParse({ ...paidOut, interestRate: 24 }).success).toBe(false);
  });
  it("needs a closing day on a repaid loan, not before it was lent, and none on an active one", () => {
    expect(createLentLoanSchema.safeParse({ ...paidOut, status: "Repaid" }).success).toBe(false);
    expect(createLentLoanSchema.safeParse({ ...paidOut, status: "Repaid", closedDate: "2024-12-31" }).success).toBe(false);
    expect(createLentLoanSchema.safeParse({ ...paidOut, status: "Repaid", closedDate: "2026-06-01" }).success).toBe(true);
    expect(createLentLoanSchema.safeParse({ ...paidOut, closedDate: "2026-06-01" }).success).toBe(false);
  });
});
