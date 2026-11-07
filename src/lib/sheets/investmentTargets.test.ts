import { describe, expect, it } from "vitest";
import { INVESTMENT_TARGET_COLUMNS, createInvestmentTargetSchema, investmentTargetRowSchema, targetConflict, updateInvestmentTargetSchema } from "./investmentTargets";
import { INVESTMENT_TARGET_NAMES, LIMIT_NAMES, TARGET_NAMES } from "./types";

describe("createInvestmentTargetSchema", () => {
  it("takes each target on its bucket and each limit on its limit", () => {
    for (const name of TARGET_NAMES) expect(createInvestmentTargetSchema.safeParse({ kind: "Target", name, percent: 25 }).success).toBe(true);
    for (const name of LIMIT_NAMES) expect(createInvestmentTargetSchema.safeParse({ kind: "Limit", name, percent: 30 }).success).toBe(true);
  });

  it("refuses a target named for a limit and a limit named for a bucket", () => {
    expect(createInvestmentTargetSchema.safeParse({ kind: "Target", name: "Dollars", percent: 50 }).success).toBe(false);
    expect(createInvestmentTargetSchema.safeParse({ kind: "Limit", name: "Gold", percent: 5 }).success).toBe(false);
  });

  it("keeps a share between 0 and 100, and 0 and 100 are allowed", () => {
    expect(createInvestmentTargetSchema.safeParse({ kind: "Target", name: "Gold", percent: 0 }).success).toBe(true);
    expect(createInvestmentTargetSchema.safeParse({ kind: "Target", name: "Gold", percent: 100 }).success).toBe(true);
    expect(createInvestmentTargetSchema.safeParse({ kind: "Target", name: "Gold", percent: -1 }).success).toBe(false);
    expect(createInvestmentTargetSchema.safeParse({ kind: "Target", name: "Gold", percent: 100.5 }).success).toBe(false);
  });
});

describe("a share typed with a percent sign", () => {
  it("is refused, since 35% is stored as 0.35, but 0 and 1 are fine", () => {
    const r = createInvestmentTargetSchema.safeParse({ kind: "Target", name: "Gold", percent: 0.35 });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0].message).toMatch(/1 to 100/);
    expect(createInvestmentTargetSchema.safeParse({ kind: "Target", name: "Gold", percent: 1 }).success).toBe(true);
    expect(createInvestmentTargetSchema.safeParse({ kind: "Target", name: "Gold", percent: 0 }).success).toBe(true);
    expect(investmentTargetRowSchema.safeParse({ id: "t", kind: "Limit", name: "Dollars", percent: 0.7 }).success).toBe(false);
  });
});

describe("targetConflict", () => {
  const all = [{ id: "a", kind: "Target" as const, name: "Gold" as const, percent: 5 }, { id: "b", kind: "Limit" as const, name: "Dollars" as const, percent: 70 }];

  it("refuses a second row for the same kind and name, and names the one already there", () => {
    expect(targetConflict(all, { kind: "Target", name: "Gold" })).toMatch(/Gold already has its target set \(5%\)/);
  });

  it("lets the row itself be changed, and a different name or kind be added", () => {
    expect(targetConflict(all, { kind: "Target", name: "Gold" }, "a")).toBeNull();
    expect(targetConflict(all, { kind: "Target", name: "Debt" })).toBeNull();
    expect(targetConflict(all, { kind: "Limit", name: "Debt-Floor" })).toBeNull();
  });

  it("catches a rename onto a name already set", () => {
    expect(targetConflict(all, { kind: "Limit", name: "Dollars" }, "a")).toMatch(/Dollars already has its limit set/);
  });
});

describe("the tab's shape", () => {
  it("has the four columns, the Sheet's dropdown holding all eight names", () => {
    expect(INVESTMENT_TARGET_COLUMNS).toEqual(["id", "kind", "name", "percent"]);
    expect(INVESTMENT_TARGET_NAMES).toEqual([...TARGET_NAMES, ...LIMIT_NAMES]);
    expect(investmentTargetRowSchema.safeParse({ id: "t", kind: "Limit", name: "Debt-Floor", percent: 5 }).success).toBe(true);
    expect(investmentTargetRowSchema.safeParse({ kind: "Limit", name: "Debt-Floor", percent: 5 }).success).toBe(false);
  });

  it("lets an update change just the share", () => {
    expect(updateInvestmentTargetSchema.safeParse({ percent: 40 }).success).toBe(true);
    expect(updateInvestmentTargetSchema.safeParse({ percent: 140 }).success).toBe(false);
  });
});
