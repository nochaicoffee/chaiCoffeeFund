import { describe, expect, it } from "vitest";
import { compoundedValue, estimatedCurrentValue, totalEstimatedFixedDepositValue } from "./fixedDeposits";
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

  it("grows at the rate the principal, the maturity amount and the dates imply, so it never jumps at the end", () => {
    // 2026-01-01 to 2027-01-01 is 365 days; 2026-07-02 is 182 days in.
    const expected = 100000 * (107000 / 100000) ** (182 / 365);
    expect(estimatedCurrentValue(fd(), "2026-07-02")).toBeCloseTo(expected, 6);
  });

  it("lands on the maturity amount the day before it as well as on it (no step on the last day)", () => {
    const dayBefore = estimatedCurrentValue(fd(), "2026-12-31");
    expect(107000 - dayBefore).toBeLessThan(25); // one day's interest at 7% on 1L is about ₹19
    expect(dayBefore).toBeLessThan(107000);
  });

  it("only ever rises between the start and the maturity date", () => {
    let last = 100000;
    for (const day of ["2026-02-01", "2026-04-01", "2026-06-01", "2026-09-01", "2026-12-01", "2027-01-01"]) {
      const v = estimatedCurrentValue(fd(), day);
      expect(v).toBeGreaterThan(last);
      last = v;
    }
  });

  it("is below the straight line between principal and maturity, because compounding grows faster later", () => {
    const linear = 100000 + 7000 * (182 / 365);
    expect(estimatedCurrentValue(fd(), "2026-07-02")).toBeLessThan(linear);
  });

  it("uses quarterly compounding at the stated rate when there is no maturity amount, and carries it to the maturity date", () => {
    const noAmount = fd({ maturityAmount: undefined, interestRate: 7.75 });
    expect(estimatedCurrentValue(noAmount, "2026-07-02")).toBeCloseTo(compoundedValue(100000, 7.75, 182), 6);
    expect(estimatedCurrentValue(noAmount, "2027-01-01")).toBeCloseTo(compoundedValue(100000, 7.75, 365), 6);
  });

  it("keeps a payout deposit at its principal even with no maturity amount stored", () => {
    const payout = fd({ compoundingType: "Non-Cumulative", payoutFrequency: "Quarterly", maturityAmount: undefined, interestRate: 7.1 });
    expect(estimatedCurrentValue(payout, "2026-07-02")).toBe(100000);
    expect(estimatedCurrentValue(payout, "2027-01-01")).toBe(100000);
  });

  it("ignores a stored maturity amount that is below the principal, zero or not a number, rather than falling or producing NaN", () => {
    for (const bad of [0, 99000, Number.NaN, Number.POSITIVE_INFINITY]) {
      const v = estimatedCurrentValue(fd({ maturityAmount: bad, interestRate: 7.75 }), "2026-07-02");
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeCloseTo(compoundedValue(100000, 7.75, 182), 6);
    }
  });

  it("returns the principal for a deposit with no principal instead of NaN", () => {
    expect(estimatedCurrentValue(fd({ principalAmount: 0, maturityAmount: 0 }), "2026-07-02")).toBe(0);
  });

  it("keeps a payout deposit at its principal (its interest is paid out, so its maturity amount is the principal)", () => {
    const payout = fd({ compoundingType: "Non-Cumulative", payoutFrequency: "Quarterly", maturityAmount: 100000 });
    expect(estimatedCurrentValue(payout, "2026-07-02")).toBe(100000);
    expect(estimatedCurrentValue(payout, "2027-01-01")).toBe(100000);
  });

  it("clamps to principal before the start date", () => {
    expect(estimatedCurrentValue(fd(), "2025-12-01")).toBe(100000);
  });
});

describe("his seven deposits (the interest his FD app shows on 4 Nov 2026)", () => {
  // All at 7.75%, interest compounding quarterly. The maturity amount is not shown by his app, so it is the compounding carried to the end.
  // The worst of the seven is ₹2.39 (the ₹30,000 one) against a tolerance of ₹2.50: the margin is deliberately small, so a change to the day count is noticed.
  const rows: Array<[string, string, string, number, number]> = [
    ["13 Mar", "2026-03-13", "2027-09-14", 15000, 763.88],
    ["1 Apr", "2026-04-01", "2027-10-02", 15000, 700.54],
    ["2 May", "2026-05-02", "2027-11-03", 15000, 599.86],
    ["1 Jul", "2026-07-01", "2028-01-02", 15000, 403.5],
    ["26 Aug", "2026-08-26", "2028-08-26", 30000, 447.28],
    ["5 Oct", "2026-10-05", "2028-10-05", 15000, 95.4],
    ["1 Nov", "2026-11-01", "2028-05-02", 15000, 9.54],
  ];
  const deposit = (start: string, end: string, principal: number): FixedDeposit =>
    fd({ principalAmount: principal, interestRate: 7.75, startDate: start, maturityDate: end, maturityAmount: undefined });

  it.each(rows)("%s: the interest it works out is within ₹2.50 of his app's", (_label, start, end, principal, shown) => {
    const interest = estimatedCurrentValue(deposit(start, end, principal), "2026-11-04") - principal;
    expect(Math.abs(interest - shown)).toBeLessThan(2.5);
  });

  it("adds up to within ₹10 of the ₹3,020 his app shows in all", () => {
    const total = rows.reduce((sum, [, start, end, principal]) => sum + estimatedCurrentValue(deposit(start, end, principal), "2026-11-04") - principal, 0);
    expect(Math.abs(total - 3020)).toBeLessThan(10);
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
