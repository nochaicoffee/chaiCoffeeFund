import { describe, expect, it } from "vitest";
import type { DailySpend, DailySpendMethod } from "../sheets/types";
import { oftenSpends, suggestNotes } from "./often";

let n = 0;
const spend = (date: string, amount: number, note: string | undefined, method: DailySpendMethod = "UPI", category?: string): DailySpend => ({ id: `s${++n}`, date, amount, method, note, ...(category && { category }) });

describe("oftenSpends", () => {
  it("lists what was written the same way at least twice, the most written first", () => {
    const list = [
      spend("2026-11-01", 40, "Chai", "UPI", "food"),
      spend("2026-11-02", 40, "Chai", "UPI", "food"),
      spend("2026-11-03", 40, "chai", "UPI", "food"),
      spend("2026-11-03", 120, "Auto", "UPI", "transport"),
      spend("2026-11-04", 120, "Auto", "UPI", "transport"),
      spend("2026-11-05", 3200, "Weekly shop", "Card", "groceries"),
    ];
    const often = oftenSpends(list);
    expect(often.map((o) => [o.note, o.count])).toEqual([["chai", 3], ["Auto", 2]]);
    // The note keeps the capitals of its latest use.
    expect(often[0]).toMatchObject({ amount: 40, method: "UPI", category: "food", lastDate: "2026-11-03" });
  });
  it("treats a different amount, method or category as a different habit", () => {
    const list = [spend("2026-11-01", 40, "Chai"), spend("2026-11-02", 45, "Chai"), spend("2026-11-03", 40, "Chai", "Cash"), spend("2026-11-04", 40, "Chai", "UPI", "food")];
    expect(oftenSpends(list)).toEqual([]);
    expect(oftenSpends(list, { minCount: 1 })).toHaveLength(4);
  });
  it("ignores a spend with no note, and breaks a tie by the latest, then the name", () => {
    const list = [spend("2026-11-01", 50, undefined), spend("2026-11-02", 50, undefined), spend("2026-11-01", 90, "Metro"), spend("2026-11-02", 90, "Metro"), spend("2026-11-03", 70, "Bus"), spend("2026-11-04", 70, "Bus")];
    expect(oftenSpends(list).map((o) => o.note)).toEqual(["Bus", "Metro"]);
  });
  it("stops at the limit, and is empty for an empty diary", () => {
    expect(oftenSpends([])).toEqual([]);
    const list = ["A", "B", "C"].flatMap((x, i) => [spend("2026-11-01", 10 + i, x), spend("2026-11-02", 10 + i, x)]);
    expect(oftenSpends(list, { limit: 2 })).toHaveLength(2);
  });
});

describe("suggestNotes", () => {
  const list = [
    spend("2026-11-01", 40, "Chai", "UPI", "food"),
    spend("2026-11-02", 40, "Chai", "UPI", "food"),
    spend("2026-11-03", 60, "Chai", "Cash", "food"),
    spend("2026-11-04", 110, "Chai and snacks", "UPI", "food"),
    spend("2026-11-05", 260, "Chemist", "UPI", "health"),
    spend("2026-11-06", 90, "Office chai", "UPI", "food"),
    spend("2026-11-07", 400, "Lunch", "UPI", "food"),
  ];
  it("offers nothing for an empty box", () => {
    expect(suggestNotes(list, "")).toEqual([]);
    expect(suggestNotes(list, "   ")).toEqual([]);
  });
  it("finds notes that start with what was typed, or have a word that does, starting-with first and then the most used", () => {
    expect(suggestNotes(list, "ch").map((s) => s.note)).toEqual(["Chai", "Chemist", "Chai and snacks", "Office chai"]);
    expect(suggestNotes(list, "CHAI").map((s) => s.note)).toEqual(["Chai", "Chai and snacks", "Office chai"]);
    expect(suggestNotes(list, "x")).toEqual([]);
  });
  it("gives the amount, method and category he paired with a note most often", () => {
    expect(suggestNotes(list, "chai")[0]).toEqual({ note: "Chai", amount: 40, method: "UPI", category: "food", count: 3 });
  });
  it("lets the latest decide between pairings written equally often", () => {
    const tie = [spend("2026-11-01", 50, "Tea"), spend("2026-11-02", 60, "Tea", "Cash")];
    expect(suggestNotes(tie, "tea")[0]).toMatchObject({ amount: 60, method: "Cash", count: 2 });
  });
  it("stops at the limit", () => {
    expect(suggestNotes(list, "c", { limit: 2 })).toHaveLength(2);
  });
});
