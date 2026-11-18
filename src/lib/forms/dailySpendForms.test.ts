import { describe, expect, it } from "vitest";
import { readCategoryForm } from "./dailyCategoryForms";
import { readLimitForm } from "./dailyLimitForms";
import { readDailySpendForm } from "./dailySpendForms";
import { resolveCategories } from "../daily/categories";

const today = "2026-11-18";
const known = { categoryIds: ["food", "shopping", "c-1"] };
const base = { date: "2026-11-18", amount: "1,240.50", method: "UPI" };

describe("readDailySpendForm", () => {
  it("reads a spend with only what's needed, and one with a category and a note", () => {
    expect(readDailySpendForm(base, known, today)).toEqual({ ok: true, input: { date: "2026-11-18", amount: 1240.5, method: "UPI" } });
    expect(readDailySpendForm({ ...base, method: "Card", category: "c-1", note: " Vet " }, known, today)).toEqual({ ok: true, input: { date: "2026-11-18", amount: 1240.5, method: "Card", category: "c-1", note: "Vet" } });
  });
  it("lets today and earlier days through, and says a day to come hasn't come", () => {
    expect(readDailySpendForm({ ...base, date: "2026-10-01" }, known, today).ok).toBe(true);
    expect(readDailySpendForm({ ...base, date: "2026-11-19" }, known, today)).toEqual({ ok: false, errors: { date: "That day hasn't come yet" } });
  });
  it("refuses a category that isn't there, and a note that's too long, field by field", () => {
    const r = readDailySpendForm({ date: "", amount: "0", method: "Cash", category: "nope", note: "x".repeat(81) }, known, today);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["amount", "category", "date", "method", "note"]);
  });
  it("needs an amount and a method, and refuses a negative or unreadable amount", () => {
    expect(readDailySpendForm({ date: today }, known, today)).toMatchObject({ ok: false, errors: { amount: "Enter what you spent", method: "Choose UPI or card" } });
    expect(readDailySpendForm({ ...base, amount: "-5" }, known, today).ok).toBe(false);
    expect(readDailySpendForm({ ...base, amount: "lots" }, known, today).ok).toBe(false);
  });
});

describe("readCategoryForm", () => {
  const all = resolveCategories([{ id: "c-1", name: "Pets", color: "Violet", status: "Hidden" }]);
  it("reads a name and a colour, and tidies the name", () => {
    expect(readCategoryForm({ name: "  Gym  fees ", color: "Olive" }, all)).toEqual({ ok: true, input: { name: "Gym fees", color: "Olive" } });
  });
  it("refuses a name that's there already, hidden or not and whatever the capitals, and a missing or unknown colour", () => {
    expect(readCategoryForm({ name: "pets", color: "Olive" }, all)).toEqual({ ok: false, errors: { name: "Pets is already there" } });
    expect(readCategoryForm({ name: "Gym" }, all)).toEqual({ ok: false, errors: { color: "Pick a colour" } });
    expect(readCategoryForm({ name: "Gym", color: "Purple" }, all).ok).toBe(false);
  });
  it("lets a category keep its own name while it's recoloured", () => {
    expect(readCategoryForm({ name: "Pets", color: "Ruby" }, all, "c-1")).toEqual({ ok: true, input: { name: "Pets", color: "Ruby" } });
  });
});

describe("readLimitForm", () => {
  it("reads the month and the limit as typed", () => {
    expect(readLimitForm({ month: "2026-11", limit: "30,000" })).toEqual({ ok: true, input: { month: "2026-11", limit: 30000 } });
  });
  it("refuses nothing, a negative, a silly figure, and a month that isn't one", () => {
    expect(readLimitForm({ month: "2026-11", limit: "" })).toMatchObject({ ok: false, errors: { limit: expect.any(String) } });
    expect(readLimitForm({ month: "2026-11", limit: "0" })).toMatchObject({ ok: false });
    expect(readLimitForm({ month: "2026-11", limit: "-5" })).toMatchObject({ ok: false });
    expect(readLimitForm({ month: "2026-11", limit: "99,999,999" })).toMatchObject({ ok: false });
    expect(readLimitForm({ month: "November", limit: "30000" })).toMatchObject({ ok: false, errors: { month: "That isn't a month" } });
  });
});
