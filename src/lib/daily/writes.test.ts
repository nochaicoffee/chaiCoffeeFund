import { describe, expect, it } from "vitest";
import type { DailyBudget, DailyCategory, DailyCategoryLimit } from "../sheets/types";
import { planCategoryLimits, planCategorySave, planCategoryStatus, planLimit } from "./writes";

const row = (r: Partial<DailyCategory> & { id: string }): DailyCategory => ({ name: "X", color: "Violet", status: "Active", ...r });

describe("planCategorySave", () => {
  it("adds a category with no id as an Active row of its own", () => {
    expect(planCategorySave([], undefined, { name: "Pets", color: "Violet" })).toEqual({ kind: "create", data: { name: "Pets", color: "Violet", status: "Active" } });
  });
  it("the first change to a built-in category makes a row naming it", () => {
    expect(planCategorySave([], "food", { name: "Eating out", color: "Ruby" })).toEqual({ kind: "create", data: { name: "Eating out", color: "Ruby", status: "Active", builtIn: "food" } });
  });
  it("later changes update that row, and a rename keeps a hidden category hidden", () => {
    const rows = [row({ id: "r1", builtIn: "food", name: "Eating out", status: "Hidden" })];
    expect(planCategorySave(rows, "food", { name: "Dining", color: "Ruby" })).toEqual({ kind: "update", rowId: "r1", categoryId: "food", data: { name: "Dining", color: "Ruby" } });
    const first = planCategorySave([row({ id: "r2", builtIn: "bills", status: "Hidden", name: "Bills", color: "Amber" })], "bills", { name: "Bills", color: "Ruby" });
    expect(first.kind === "update" && first.data.status).toBeUndefined();
  });
  it("updates a category he added by its own row, and says gone for one that isn't there", () => {
    expect(planCategorySave([row({ id: "c-1", name: "Pets" })], "c-1", { name: "Pets", color: "Olive" })).toEqual({ kind: "update", rowId: "c-1", categoryId: "c-1", data: { name: "Pets", color: "Olive" } });
    expect(planCategorySave([], "nope", { name: "A", color: "Olive" })).toEqual({ kind: "gone" });
  });
});

describe("planCategoryStatus", () => {
  it("hides a built-in category with a row that carries its own name and colour", () => {
    expect(planCategoryStatus([], "health", "Hidden")).toEqual({ kind: "create", data: { name: "Health", color: "Coral", status: "Hidden", builtIn: "health" } });
  });
  it("shows it again by updating that row, never by adding a second", () => {
    expect(planCategoryStatus([row({ id: "r1", builtIn: "health", name: "Health", color: "Coral", status: "Hidden" })], "health", "Active")).toEqual({ kind: "update", rowId: "r1", categoryId: "health", data: { status: "Active" } });
  });
  it("is gone for a category that isn't there", () => {
    expect(planCategoryStatus([], "nope", "Hidden")).toEqual({ kind: "gone" });
  });
});

describe("planLimit", () => {
  const rows: DailyBudget[] = [{ id: "b1", month: "2026-01", limit: 24000 }];
  it("updates the month's own row", () => {
    expect(planLimit(rows, "2026-01", 25000)).toEqual({ kind: "update", id: "b1", limit: 25000 });
  });
  it("adds a row for a month without one, even when the limit is what it inherits", () => {
    expect(planLimit(rows, "2026-11", 24000)).toEqual({ kind: "create", month: "2026-11", limit: 24000 });
    expect(planLimit([], "2026-11", 30000)).toEqual({ kind: "create", month: "2026-11", limit: 30000 });
  });
});

describe("planCategoryLimits", () => {
  const lim = (id: string, category: string, month: string, limit: number): DailyCategoryLimit => ({ id, category, month, limit });
  const rows = [lim("a", "food", "2026-09", 5000), lim("b", "fun", "2026-11", 1500)];
  it("writes nothing for a category already at what's wanted, or with none and none wanted", () => {
    expect(planCategoryLimits(rows, "2026-11", { food: 5000, fun: 1500, bills: null })).toEqual([]);
  });
  it("adds a row for a new limit, and for a changed one when the month has no row of its own yet", () => {
    expect(planCategoryLimits(rows, "2026-11", { bills: 3000, food: 6000 })).toEqual([
      { kind: "create", category: "bills", month: "2026-11", limit: 3000 },
      { kind: "create", category: "food", month: "2026-11", limit: 6000 },
    ]);
  });
  it("updates the month's own row instead of adding a second", () => {
    expect(planCategoryLimits(rows, "2026-11", { fun: 2000 })).toEqual([{ kind: "update", id: "b", limit: 2000 }]);
  });
  it("takes a limit off with a row of 0 (never a delete), in the month's own row when there is one", () => {
    expect(planCategoryLimits(rows, "2026-11", { food: null, fun: null })).toEqual([
      { kind: "create", category: "food", month: "2026-11", limit: 0 },
      { kind: "update", id: "b", limit: 0 },
    ]);
  });
  it("leaves alone a category it wasn't asked about", () => {
    expect(planCategoryLimits(rows, "2026-11", {})).toEqual([]);
  });
});
