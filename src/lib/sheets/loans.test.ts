import { describe, expect, it } from "vitest";
import { checkLoan, createLoanSchema, updateLoanSchema } from "./loans";

const valid = {
  name: "HDFC personal loan",
  lenderName: "HDFC Bank",
  category: "Personal",
  repaymentStructure: "Standard-Emi",
  principalAmount: 1110000,
  annualInterestRate: 9.99,
  tenureMonths: 12,
  paymentFrequency: "Monthly",
  processingFee: 7669,
  disbursementDate: "2026-07-04",
  accountId: "acc-1",
  status: "Active",
  firstEmiDate: "2026-08-07",
  stampDuty: 500,
  preEmiInterest: 911,
};

describe("createLoanSchema", () => {
  it("accepts a loan whose first EMI falls after it's disbursed", () => {
    expect(createLoanSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a first EMI on or before the disbursement date", () => {
    for (const firstEmiDate of ["2026-07-04", "2026-07-01"]) {
      const result = createLoanSchema.safeParse({ ...valid, firstEmiDate });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(["firstEmiDate"]);
    }
  });

  it("rejects charges that add up to the whole loan or more", () => {
    const result = createLoanSchema.safeParse({ ...valid, principalAmount: 50000, processingFee: 76690 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("The fee, stamp duty and pre-EMI interest add up to more than the loan");
  });

  it("rejects quarterly and yearly loans", () => {
    expect(createLoanSchema.safeParse({ ...valid, paymentFrequency: "Quarterly" }).success).toBe(false);
  });
});

describe("updateLoanSchema", () => {
  it("lets a loan's details and charges be corrected", () => {
    expect(updateLoanSchema.safeParse({ name: "Wedding loan", status: "Closed", stampDuty: 450 }).success).toBe(true);
  });

  it("refuses a change to a term the schedule was generated from", () => {
    for (const change of [{ firstEmiDate: "2026-08-10" }, { principalAmount: 1 }, { annualInterestRate: 11 }, { tenureMonths: 24 }, { disbursementDate: "2026-07-01" }]) {
      expect(updateLoanSchema.safeParse(change).success).toBe(false);
    }
  });
});

describe("checkLoan", () => {
  it("passes a valid row, and catches charges raised past the loan by an update", () => {
    expect(checkLoan(valid)).toBeNull();
    expect(checkLoan({ ...valid, stampDuty: 1110000 })).toBe("The fee, stamp duty and pre-EMI interest add up to more than the loan");
  });
});
