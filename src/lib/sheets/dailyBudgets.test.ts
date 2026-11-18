import { describe, expect, it } from "vitest";
import { createDailyBudgetSchema, updateDailyBudgetSchema } from "./dailyBudgets";

describe("daily budget schemas", () => {
  it("accepts a month and a limit", () => {
    expect(createDailyBudgetSchema.safeParse({ month: "2026-11", limit: 30000 }).success).toBe(true);
    expect(createDailyBudgetSchema.safeParse({ month: "2026-11", limit: 29999.5 }).success).toBe(true);
  });
  it("refuses a limit of nothing, a month that isn't one, or a missing field", () => {
    expect(createDailyBudgetSchema.safeParse({ month: "2026-11", limit: 0 }).success).toBe(false);
    expect(createDailyBudgetSchema.safeParse({ month: "2026-13", limit: 30000 }).success).toBe(false);
    expect(createDailyBudgetSchema.safeParse({ month: "Nov 2026", limit: 30000 }).success).toBe(false);
    expect(createDailyBudgetSchema.safeParse({ limit: 30000 }).success).toBe(false);
  });
  it("lets an update change either", () => {
    expect(updateDailyBudgetSchema.parse({ limit: 32000 })).toEqual({ limit: 32000 });
  });
});
