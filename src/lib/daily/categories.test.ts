import { describe, expect, it } from "vitest";
import type { DailyCategory } from "../sheets/types";
import { BUILT_IN_CATEGORIES, checkCategoryName, resolveCategories } from "./categories";

const row = (r: Partial<DailyCategory> & { id: string }): DailyCategory => ({ name: "X", color: "Violet", status: "Active", ...r });

describe("resolveCategories", () => {
  it("is the eight built-in ones when nothing is written", () => {
    const all = resolveCategories([]);
    expect(all.map((c) => c.id)).toEqual(BUILT_IN_CATEGORIES.map((b) => b.id));
    expect(all.every((c) => c.builtIn && !c.hidden && c.rowId === undefined)).toBe(true);
  });
  it("applies a row's rename, colour and Hidden to the built-in one it names, and keeps its id", () => {
    const all = resolveCategories([row({ id: "r1", builtIn: "food", name: "Eating out", color: "Ruby", status: "Hidden" })]);
    expect(all[0]).toMatchObject({ id: "food", name: "Eating out", color: "Ruby", hidden: true, builtIn: true, rowId: "r1" });
    expect(all[1].name).toBe("Groceries");
  });
  it("adds the ones he added after the built-in ones, in the order they were added, under their own ids", () => {
    const all = resolveCategories([row({ id: "c-1", name: "Pets" }), row({ id: "c-2", name: "Gym", status: "Hidden" })]);
    expect(all.slice(8).map((c) => [c.id, c.name, c.hidden, c.builtIn])).toEqual([["c-1", "Pets", false, false], ["c-2", "Gym", true, false]]);
  });
  it("ignores a row naming a built-in one that doesn't exist, rather than showing a ghost", () => {
    expect(resolveCategories([row({ id: "r9", builtIn: "nope", name: "Ghost" })])).toHaveLength(8);
  });
});

describe("checkCategoryName", () => {
  const all = resolveCategories([row({ id: "c-1", name: "Pets" })]);
  it("tidies spaces and accepts a fresh name", () => {
    expect(checkCategoryName("  Gym   fees ", all)).toEqual({ ok: true, name: "Gym fees" });
  });
  it("refuses empty, too long, and one that's there already whatever the capitals (a hidden one too)", () => {
    expect(checkCategoryName("   ", all)).toEqual({ ok: false, error: "Give it a name" });
    expect(checkCategoryName("x".repeat(25), all)).toMatchObject({ ok: false });
    expect(checkCategoryName("pets", all)).toEqual({ ok: false, error: "Pets is already there" });
    expect(checkCategoryName("FOOD", all)).toMatchObject({ ok: false });
  });
  it("lets a category keep its own name when it's being renamed or recoloured", () => {
    expect(checkCategoryName("Pets", all, "c-1")).toEqual({ ok: true, name: "Pets" });
  });
});
