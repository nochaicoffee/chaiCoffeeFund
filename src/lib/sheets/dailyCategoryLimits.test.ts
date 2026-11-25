import { describe, expect, it } from "vitest";
import { createDailyCategoryLimitSchema, dailyCategoryLimitRowSchema, updateDailyCategoryLimitSchema } from "./dailyCategoryLimits";

describe("daily category limit schemas", () => {
  it("accepts a category, a month and a limit, and 0 as no limit", () => {
    expect(createDailyCategoryLimitSchema.safeParse({ category: "food", month: "2026-11", limit: 6000 }).success).toBe(true);
    expect(createDailyCategoryLimitSchema.safeParse({ category: "c-4f2a9", month: "2026-11", limit: 0 }).success).toBe(true);
  });
  it("refuses a negative limit, a month that isn't one, an empty category or a missing field", () => {
    expect(createDailyCategoryLimitSchema.safeParse({ category: "food", month: "2026-11", limit: -1 }).success).toBe(false);
    expect(createDailyCategoryLimitSchema.safeParse({ category: "food", month: "2026-13", limit: 100 }).success).toBe(false);
    expect(createDailyCategoryLimitSchema.safeParse({ category: "", month: "2026-11", limit: 100 }).success).toBe(false);
    expect(createDailyCategoryLimitSchema.safeParse({ category: "food", limit: 100 }).success).toBe(false);
  });
  it("lets an update change any one field, and a row carries its id", () => {
    expect(updateDailyCategoryLimitSchema.parse({ limit: 0 })).toEqual({ limit: 0 });
    expect(dailyCategoryLimitRowSchema.safeParse({ id: "r1", category: "food", month: "2026-11", limit: 6000 }).success).toBe(true);
    expect(dailyCategoryLimitRowSchema.safeParse({ category: "food", month: "2026-11", limit: 6000 }).success).toBe(false);
  });
});
