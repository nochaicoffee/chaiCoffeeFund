import { afterEach, describe, expect, it, vi } from "vitest";
import { loanInstallmentsRepository } from "./loanInstallments";
import { createLoanWithSchedule, loansRepository } from "./loans";
import { isQuotaError } from "./errors";

const input = {
  name: "HDFC personal loan", lenderName: "HDFC Bank", category: "Personal", repaymentStructure: "Standard-Emi", principalAmount: 1110000,
  annualInterestRate: 9.99, tenureMonths: 12, paymentFrequency: "Monthly", processingFee: 7669, disbursementDate: "2026-07-04",
  accountId: "acc-1", status: "Active", firstEmiDate: "2026-08-07", stampDuty: 500, preEmiInterest: 911,
} as Parameters<typeof createLoanWithSchedule>[0];
const quota = Object.assign(new Error("Quota exceeded for quota metric 'Read requests'"), { code: 429 });

afterEach(() => vi.restoreAllMocks());

describe("createLoanWithSchedule when the schedule can't be saved", () => {
  it("rolls the loan back and lets a quota refusal through as it is, so a route can tell it's safe to retry", async () => {
    vi.spyOn(loansRepository, "create").mockResolvedValue({ ...input, id: "loan-1" });
    vi.spyOn(loanInstallmentsRepository, "createMany").mockRejectedValue(quota);
    const remove = vi.spyOn(loansRepository, "remove").mockResolvedValue();
    const error = await createLoanWithSchedule(input).catch((e: unknown) => e);
    expect(remove).toHaveBeenCalledWith("loan-1");
    expect(isQuotaError(error)).toBe(true);
  });

  it("keeps the wrapped message for other failures", async () => {
    vi.spyOn(loansRepository, "create").mockResolvedValue({ ...input, id: "loan-1" });
    vi.spyOn(loanInstallmentsRepository, "createMany").mockRejectedValue(new Error("boom"));
    vi.spyOn(loansRepository, "remove").mockResolvedValue();
    await expect(createLoanWithSchedule(input)).rejects.toThrow(/the loan was rolled back. Original error: boom/);
  });

  it("says the loan is still there when the rollback fails too, and is not mistaken for a quota refusal to retry", async () => {
    vi.spyOn(loansRepository, "create").mockResolvedValue({ ...input, id: "loan-1" });
    vi.spyOn(loanInstallmentsRepository, "createMany").mockRejectedValue(quota);
    vi.spyOn(loansRepository, "remove").mockRejectedValue(quota);
    const error = await createLoanWithSchedule(input).catch((e: unknown) => e);
    expect((error as Error).message).toMatch(/couldn't be rolled back.*still in the Loans tab/);
    expect(isQuotaError(error)).toBe(false);
  });
});
