import { describe, expect, it } from "vitest";
import { createDailyCategorySchema, updateDailyCategorySchema } from "./dailyCategories";

describe("daily category schemas", () => {
  it("accepts a name and a colour from the shared list, and a row that changes a built-in one", () => {
    expect(createDailyCategorySchema.safeParse({ name: "Pets", color: "Violet", status: "Active" }).success).toBe(true);
    expect(createDailyCategorySchema.safeParse({ name: "Eating out", color: "Copper", status: "Hidden", builtIn: "food" }).success).toBe(true);
  });
  it("refuses an empty or too long name, a colour that isn't one, or a status off the list", () => {
    expect(createDailyCategorySchema.safeParse({ name: "  ", color: "Violet", status: "Active" }).success).toBe(false);
    expect(createDailyCategorySchema.safeParse({ name: "x".repeat(25), color: "Violet", status: "Active" }).success).toBe(false);
    expect(createDailyCategorySchema.safeParse({ name: "Pets", color: "Purple", status: "Active" }).success).toBe(false);
    expect(createDailyCategorySchema.safeParse({ name: "Pets", color: "Violet", status: "Deleted" }).success).toBe(false);
  });
  it("lets an update change any of the three, but not which built-in a row changes", () => {
    expect(updateDailyCategorySchema.parse({ status: "Hidden" })).toEqual({ status: "Hidden" });
    expect(updateDailyCategorySchema.parse({ name: " Pets & co ", builtIn: "food" })).toEqual({ name: "Pets & co" });
  });
});
