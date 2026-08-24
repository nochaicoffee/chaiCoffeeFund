import { describe, expect, it } from "vitest";
import { estimatedCurrentValue, totalEstimatedFixedDepositValue } from "./fixedDeposits";
import type { FixedDeposit } from "../sheets/types";

const fd = (overrides: Partial<FixedDeposit> = {}): FixedDeposit => ({
  id: "fd-1",
  name: "Test FD",
  bankName: "Test Bank",
  principalAmount: 100000,
  interestRate: 7,
  compoundingType: "Cumulative",
  startDate: "2026-01-01",
  maturityDate: "2027-01-01",
  maturityAmount: 107000,
  status: "Active",
  ...overrides,
});

describe("estimatedCurrentValue", () => {
  it("returns exactly the principal at the start date", () => {
    expect(estimatedCurrentValue(fd(), "2026-01-01")).toBe(100000);
  });

  it("returns exactly the maturity amount at (or past) the maturity date", () => {
    expect(estimatedCurrentValue(fd(), "2027-01-01")).toBe(107000);
    expect(estimatedCurrentValue(fd(), "2027-06-01")).toBe(107000);
  });

  it("interpolates linearly, proportional to elapsed calendar days", () => {
    // 2026-01-01 to 2027-01-01 is 365 days; 2026-07-02 is 182 days in (not
    // exactly half — 365 doesn't divide evenly), so the expected value is
    // principal + growth * (182/365), not a round "halfway" number.
    const expected = 100000 + 7000 * (182 / 365);
    expect(estimatedCurrentValue(fd(), "2026-07-02")).toBeCloseTo(expected, 5);
  });

  it("clamps to principal before the start date", () => {
    expect(estimatedCurrentValue(fd(), "2025-12-01")).toBe(100000);
  });
});

describe("totalEstimatedFixedDepositValue", () => {
  it("excludes closed deposits", () => {
    const deposits = [
      fd({ id: "fd-1", status: "Active" }),
      fd({ id: "fd-2", status: "Closed", principalAmount: 50000, maturityAmount: 53000 }),
    ];
    expect(totalEstimatedFixedDepositValue(deposits, "2026-01-01")).toBe(100000);
  });

  it("includes matured deposits at their maturity value", () => {
    const deposits = [fd({ status: "Matured" })];
    expect(totalEstimatedFixedDepositValue(deposits, "2027-06-01")).toBe(107000);
  });
});
