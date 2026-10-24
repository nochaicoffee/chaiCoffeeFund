import { describe, expect, it } from "vitest";
import {
  monthlyEquivalentIncome,
  totalMonthlyEquivalentIncome,
} from "./income";
import type { IncomeSource } from "../sheets/types";

const source = (overrides: Partial<IncomeSource> = {}): IncomeSource => ({
  id: "src-1",
  name: "Test Salary",
  alias: "TS",
  category: "Salary",
  frequency: "Monthly",
  expectedAmount: 100000,
  status: "Active",
  ...overrides,
});


describe("monthlyEquivalentIncome", () => {
  it("passes monthly amounts through", () => {
    expect(monthlyEquivalentIncome(source({ frequency: "Monthly", expectedAmount: 100000 }))).toBe(100000);
  });

  it("divides yearly amounts by 12", () => {
    expect(monthlyEquivalentIncome(source({ frequency: "Yearly", expectedAmount: 120000 }))).toBe(10000);
  });

  it("treats one-time income as zero ongoing monthly contribution", () => {
    expect(monthlyEquivalentIncome(source({ frequency: "One-Time", expectedAmount: 166000 }))).toBe(0);
  });
});

describe("totalMonthlyEquivalentIncome", () => {
  it("only sums active sources", () => {
    const sources = [
      source({ id: "s1", expectedAmount: 100000, status: "Active" }),
      source({ id: "s2", expectedAmount: 50000, status: "Inactive" }),
    ];
    expect(totalMonthlyEquivalentIncome(sources)).toBe(100000);
  });
});
