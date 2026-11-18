import { describe, expect, it } from "vitest";
import { createDailySpendSchema, updateDailySpendSchema } from "./dailySpends";

const lunch = { date: "2026-11-18", amount: 240, method: "UPI", category: "food", note: "Lunch" } as const;

describe("daily spend schemas", () => {
  it("accepts a spend with or without a category and a note", () => {
    expect(createDailySpendSchema.safeParse(lunch).success).toBe(true);
    expect(createDailySpendSchema.safeParse({ date: "2026-11-18", amount: 90, method: "Card" }).success).toBe(true);
  });
  it("takes any category id (a category he added has an id of its own), but not an empty one", () => {
    expect(createDailySpendSchema.safeParse({ ...lunch, category: "c-4f2a9" }).success).toBe(true);
    expect(createDailySpendSchema.safeParse({ ...lunch, category: "" }).success).toBe(false);
  });
  it("refuses a method off the list, nothing spent, or a date that isn't a date", () => {
    expect(createDailySpendSchema.safeParse({ ...lunch, method: "Cash" }).success).toBe(false);
    expect(createDailySpendSchema.safeParse({ ...lunch, amount: 0 }).success).toBe(false);
    expect(createDailySpendSchema.safeParse({ ...lunch, date: "18/11/2026" }).success).toBe(false);
  });
  it("lets an update clear the category and the note with an empty string", () => {
    expect(updateDailySpendSchema.parse({ category: "", note: "" })).toEqual({ category: "", note: "" });
    expect(updateDailySpendSchema.parse({ note: "Dinner" })).toEqual({ note: "Dinner" });
  });
});
