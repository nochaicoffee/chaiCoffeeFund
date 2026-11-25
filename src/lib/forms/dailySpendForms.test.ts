import { describe, expect, it } from "vitest";
import { readCategoryForm } from "./dailyCategoryForms";
import { readLimitForm } from "./dailyLimitForms";
import { readDailySpendForm } from "./dailySpendForms";
import { readLimitsForm } from "./dailyLimitForms";
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
  it("takes cash as a way to pay, and a cheque is not one", () => {
    expect(readDailySpendForm({ ...base, method: "Cash" }, known, today)).toMatchObject({ ok: true, input: { method: "Cash" } });
    expect(readDailySpendForm({ ...base, method: "Cheque" }, known, today)).toEqual({ ok: false, errors: { method: "Choose how you paid" } });
  });
  it("refuses a category that isn't there, and a note that's too long, field by field", () => {
    const r = readDailySpendForm({ date: "", amount: "0", method: "Cheque", category: "nope", note: "x".repeat(81) }, known, today);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["amount", "category", "date", "method", "note"]);
  });
  it("needs an amount and a method, and refuses a negative or unreadable amount", () => {
    expect(readDailySpendForm({ date: today }, known, today)).toMatchObject({ ok: false, errors: { amount: "Enter what you spent", method: "Choose how you paid" } });
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

describe("readLimitsForm", () => {
  const known = ["food", "shopping", "c-1"];
  const base = { month: "2026-11", limit: "30,000" };
  it("reads the monthly limit and a figure per category, a blank or 0 meaning none", () => {
    expect(readLimitsForm({ ...base, "category-limit:food": "6,000", "category-limit:shopping": "", "category-limit:c-1": "0" }, known)).toEqual({ ok: true, input: { month: "2026-11", limit: 30000, categories: { food: 6000, shopping: null, "c-1": null } } });
  });
  it("is fine with no category fields at all", () => {
    expect(readLimitsForm(base, known)).toEqual({ ok: true, input: { month: "2026-11", limit: 30000, categories: {} } });
  });
  it("refuses a category limit that isn't an amount, is negative or absurd, or names a category that isn't there, field by field", () => {
    const r = readLimitsForm({ ...base, "category-limit:food": "lots", "category-limit:shopping": "-5", "category-limit:c-1": "99999999", "category-limit:gone": "100" }, known);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["category-limit:c-1", "category-limit:food", "category-limit:gone", "category-limit:shopping"]);
  });
  it("leaves the monthly limit alone when its box is blank, so category limits can be set without one", () => {
    expect(readLimitsForm({ month: "2026-11", limit: "", "category-limit:food": "6000" }, known)).toEqual({ ok: true, input: { month: "2026-11", limit: null, categories: { food: 6000 } } });
  });
  it("still refuses a monthly limit that isn't an amount or more than ₹0, and a month that isn't one", () => {
    expect(readLimitsForm({ month: "2026-11", limit: "0" }, known)).toMatchObject({ ok: false, errors: { limit: expect.any(String) } });
    expect(readLimitsForm({ month: "2026-11", limit: "lots" }, known)).toMatchObject({ ok: false, errors: { limit: expect.any(String) } });
    expect(readLimitsForm({ month: "Nov", limit: "" }, known)).toMatchObject({ ok: false, errors: { month: expect.any(String) } });
  });
});
