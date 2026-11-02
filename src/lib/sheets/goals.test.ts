import { describe, expect, it } from "vitest";
import { checkGoal, createGoalSchema, goalRowSchema, updateGoalSchema } from "./goals";
import { createGoalContributionSchema, goalContributionRowSchema, updateGoalContributionSchema } from "./goalContributions";

const base = { name: "Fridge", category: "Appliance", necessity: "Need", scale: "Minor", amount: 62000, startDate: "2026-08-15", status: "Active" } as const;

describe("a goal's schema", () => {
  it("accepts a plain goal and a goal with a date and a plan", () => {
    expect(createGoalSchema.safeParse(base).success).toBe(true);
    expect(createGoalSchema.safeParse({ ...base, targetDate: "2026-12-20", dateType: "Fixed", plannedMonthly: 15000 }).success).toBe(true);
  });
  it("needs a date for a Fixed date", () => {
    const result = createGoalSchema.safeParse({ ...base, dateType: "Fixed" });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("A Fixed date needs a date");
  });
  it("needs the day it was bought for a bought goal, and refuses one on a goal that isn't", () => {
    expect(createGoalSchema.safeParse({ ...base, status: "Done" }).success).toBe(false);
    expect(createGoalSchema.safeParse({ ...base, status: "Done", doneOn: "2026-09-12", actualCost: 26499 }).success).toBe(true);
    expect(createGoalSchema.safeParse({ ...base, doneOn: "2026-09-12" }).success).toBe(false);
    expect(createGoalSchema.safeParse({ ...base, actualCost: 100 }).success).toBe(false);
  });
  it("never pays from a card and an account both", () => {
    expect(createGoalSchema.safeParse({ ...base, status: "Done", doneOn: "2026-09-12", paidFromAccountId: "a", paidFromCardId: "c" }).success).toBe(false);
  });
  it("takes only a real link, and only the listed categories and colours", () => {
    expect(createGoalSchema.safeParse({ ...base, link: "javascript:alert(1)" }).success).toBe(false);
    expect(createGoalSchema.safeParse({ ...base, link: "https://example.com/p" }).success).toBe(true);
    expect(createGoalSchema.safeParse({ ...base, category: "Boat" }).success).toBe(false);
    expect(createGoalSchema.safeParse({ ...base, color: "Chartreuse" }).success).toBe(false);
  });
  it("reads a row back with its id, and checks the same rules on a merged row", () => {
    expect(goalRowSchema.safeParse({ ...base, id: "g1" }).success).toBe(true);
    expect(checkGoal({ ...base, dateType: "Fixed" })).toBe("A Fixed date needs a date");
    expect(checkGoal({ ...base })).toBeNull();
  });
});

describe("an update", () => {
  it("is partial, and \"\" clears an optional field to unset", () => {
    const parsed = updateGoalSchema.parse({ targetDate: "", plannedMonthly: "", dateType: "" });
    expect(parsed.targetDate).toBe("");
    expect(parsed.plannedMonthly).toBeUndefined();
    expect(parsed.dateType).toBeUndefined();
    expect("plannedMonthly" in parsed).toBe(true);
  });
  it("setting where it was paid from clears the other", () => {
    expect(updateGoalSchema.parse({ paidFromAccountId: "a" }).paidFromCardId).toBe("");
    expect(updateGoalSchema.parse({ paidFromCardId: "c" }).paidFromAccountId).toBe("");
    expect(updateGoalSchema.safeParse({ paidFromAccountId: "a", paidFromCardId: "c" }).success).toBe(false);
  });
});

describe("a set-aside's schema", () => {
  const entry = { goalId: "g1", date: "2026-10-20", amount: 15000, kind: "Set-aside" } as const;
  it("needs an amount above 0 and a kind from the list", () => {
    expect(createGoalContributionSchema.safeParse(entry).success).toBe(true);
    expect(createGoalContributionSchema.safeParse({ ...entry, amount: 0 }).success).toBe(false);
    expect(createGoalContributionSchema.safeParse({ ...entry, kind: "Refund" }).success).toBe(false);
    expect(goalContributionRowSchema.safeParse({ ...entry, id: "c1", accountId: "hdfc", note: "bonus" }).success).toBe(true);
  });
  it("clears the account and the note with \"\"", () => {
    expect(updateGoalContributionSchema.parse({ accountId: "", note: "" })).toEqual({ accountId: "", note: "" });
  });
});
