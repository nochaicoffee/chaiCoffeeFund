import { describe, expect, it } from "vitest";
import {
  monthlyEquivalentIncome,
  totalMonthlyEquivalentIncome,
  totalPendingForMonth,
  totalReceivedForMonth,
} from "./income";
import type { IncomeEntry, IncomeSource } from "../sheets/types";

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

const entry = (overrides: Partial<IncomeEntry> = {}): IncomeEntry => ({
  id: "entry-1",
  incomeSourceId: "src-1",
  expectedDate: "2026-08-31",
  amount: 100000,
  status: "Received",
  tag: "Regular",
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

describe("totalReceivedForMonth / totalPendingForMonth", () => {
  const entries: IncomeEntry[] = [
    entry({ id: "e1", status: "Received", receivedDate: "2026-08-31", amount: 100000 }),
    entry({ id: "e2", status: "Received", receivedDate: "2026-07-31", amount: 90000 }),
    entry({ id: "e3", status: "Pending", expectedDate: "2026-08-31", amount: 6000 }),
  ];

  it("sums only received entries within the given month", () => {
    expect(totalReceivedForMonth(entries, "2026-08")).toBe(100000);
  });

  it("sums only pending entries expected within the given month", () => {
    expect(totalPendingForMonth(entries, "2026-08")).toBe(6000);
  });
});
