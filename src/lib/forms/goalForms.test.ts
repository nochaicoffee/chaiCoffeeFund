import { describe, expect, it } from "vitest";
import { goalEditPatch, readBoughtForm, readEntryForm, readGoalForm, readPartsField } from "./goalForms";

const goal = { name: "Goa trip", category: "Travel", necessity: "Want", scale: "Minor", amount: "85,000", startDate: "2026-08-01" };

describe("the goal form", () => {
  it("reads a plain goal, and a dated one with a plan", () => {
    const plain = readGoalForm(goal, []);
    expect(plain).toEqual({ ok: true, input: { name: "Goa trip", category: "Travel", necessity: "Want", scale: "Minor", amount: 85000, startDate: "2026-08-01", parts: [] } });
    const dated = readGoalForm({ ...goal, targetDate: "2027-06-10", dateType: "Fixed", plannedMonthly: "8,000", color: "Ruby", notes: "Four nights" }, []);
    expect(dated).toMatchObject({ ok: true, input: { targetDate: "2027-06-10", dateType: "Fixed", plannedMonthly: 8000, color: "Ruby", notes: "Four nights" } });
  });
  it("a date with no type is Flexible, and a type with no date is dropped", () => {
    expect(readGoalForm({ ...goal, targetDate: "2027-06-10" }, [])).toMatchObject({ input: { dateType: "Flexible" } });
    const noDate = readGoalForm({ ...goal, dateType: "Flexible" }, []);
    expect(noDate.ok && "dateType" in noDate.input).toBe(false);
  });
  it("says what's wrong in plain words, by field", () => {
    const bad = readGoalForm({ name: " ", category: "Boat", necessity: "", scale: "", amount: "0", startDate: "" }, []);
    expect(bad).toMatchObject({ ok: false, errors: { name: "Name the goal", category: "Choose a category", necessity: "Is it a Need or a Want?", scale: "Is it a Minor or a Major goal?", amount: "Enter an amount above ₹0", startDate: "Enter when saving began" } });
  });
  it("a Fixed date needs a date, a link must be a link, and a sub-goal's parent must be one of the goals", () => {
    expect(readGoalForm({ ...goal, dateType: "Fixed" }, [])).toMatchObject({ ok: false, errors: { targetDate: "A Fixed date needs a date" } });
    expect(readGoalForm({ ...goal, link: "javascript:alert(1)" }, [])).toMatchObject({ ok: false, errors: { link: expect.stringContaining("http") } });
    expect(readGoalForm({ ...goal, parentId: "nope" }, ["car"])).toMatchObject({ ok: false, errors: { parentId: expect.any(String) } });
    expect(readGoalForm({ ...goal, parentId: "car" }, ["car"])).toMatchObject({ ok: true, input: { parentId: "car" } });
  });
  it("an edit clears a blank optional box", () => {
    const read = readGoalForm(goal, []);
    expect(read.ok && goalEditPatch(read.input)).toMatchObject({ targetDate: "", dateType: "", plannedMonthly: "", color: "", link: "", notes: "", amount: 85000 });
  });
});

describe("review findings", () => {
  it("allows ₹0 only for a goal whose cost is in its sub-goals", () => {
    expect(readGoalForm({ ...goal, amount: "0" }, [])).toMatchObject({ ok: false, errors: { amount: expect.any(String) } });
    expect(readGoalForm({ ...goal, amount: "0" }, [], { allowZeroAmount: true })).toMatchObject({ ok: true, input: { amount: 0 } });
    expect(readGoalForm({ ...goal, amount: "-5" }, [], { allowZeroAmount: true })).toMatchObject({ ok: false });
  });
  it("refuses saving to begin after the date it's for", () => {
    expect(readGoalForm({ ...goal, startDate: "2027-07-01", targetDate: "2027-06-10" }, [])).toMatchObject({ ok: false, errors: { startDate: "Saving can't begin after the date it's for" } });
    expect(readGoalForm({ ...goal, startDate: "2027-06-10", targetDate: "2027-06-10" }, [])).toMatchObject({ ok: true });
  });
});

describe("the set aside form", () => {
  const known = { goalIds: ["a", "b"], accountIds: ["hdfc"] };
  const entry = { goalId: "a", kind: "Set-aside", amount: "15,000", date: "2026-10-29" };
  it("reads a set-aside and a take-back, with an optional account and note", () => {
    expect(readEntryForm(entry, known)).toEqual({ ok: true, input: { goalId: "a", kind: "Set-aside", amount: 15000, date: "2026-10-29" } });
    expect(readEntryForm({ ...entry, kind: "Take-back", accountId: "hdfc", note: "price came down" }, known)).toMatchObject({ ok: true, input: { kind: "Take-back", accountId: "hdfc", note: "price came down" } });
  });
  it("refuses a goal or account that isn't there, a zero amount, and no day", () => {
    expect(readEntryForm({ ...entry, goalId: "z" }, known)).toMatchObject({ ok: false, errors: { goalId: "Choose the goal" } });
    expect(readEntryForm({ ...entry, accountId: "z" }, known)).toMatchObject({ ok: false, errors: { accountId: expect.any(String) } });
    expect(readEntryForm({ ...entry, amount: "0", date: "" }, known)).toMatchObject({ ok: false, errors: { amount: "Enter an amount above ₹0", date: "Enter the day" } });
  });
});

describe("the bought form", () => {
  const known = { goalIds: ["a"], accountIds: ["hdfc"], cardIds: ["regalia"] };
  it("reads the cost, the day and where it was paid from", () => {
    expect(readBoughtForm({ goalId: "a", actualCost: "26,499", doneOn: "2026-09-12", paidFrom: "card:regalia" }, known)).toEqual({ ok: true, input: { goalId: "a", actualCost: 26499, doneOn: "2026-09-12", paidFromCardId: "regalia" } });
    expect(readBoughtForm({ goalId: "a", actualCost: "100", doneOn: "2026-09-12", paidFrom: "account:hdfc" }, known)).toMatchObject({ input: { paidFromAccountId: "hdfc" } });
  });
  it("needs a cost and a day", () => {
    expect(readBoughtForm({ goalId: "a", actualCost: "", doneOn: "" }, known)).toMatchObject({ ok: false, errors: { actualCost: "Enter what it cost", doneOn: "Enter the day you bought it" } });
  });
});

describe("the parts section", () => {
  const row = { name: "Suspension", amount: "45,000", necessity: "Need", targetDate: "2027-04-15", given: "20,000", id: "g1" };
  it("reads the rows as typed, with what the pot gave each", () => {
    expect(readPartsField(JSON.stringify([row, { name: "Tyres", amount: "38000", necessity: "Want" }]))).toEqual({
      parts: [{ id: "g1", name: "Suspension", amount: 45000, necessity: "Need", targetDate: "2027-04-15", given: 20000 }, { name: "Tyres", amount: 38000, necessity: "Want", given: 0 }],
      error: null,
    });
    expect(readPartsField("")).toEqual({ parts: [], error: null });
  });
  it("says the first problem in words: a name, a cost, Need or Want, a share above the cost", () => {
    expect(readPartsField(JSON.stringify([{ ...row, name: " " }])).error).toBe("Name part 1, or remove it");
    expect(readPartsField(JSON.stringify([{ ...row, amount: "" }])).error).toBe("Enter what Suspension costs");
    expect(readPartsField(JSON.stringify([{ ...row, amount: "0" }])).error).toBe("Enter a cost above ₹0 for Suspension");
    expect(readPartsField(JSON.stringify([{ ...row, necessity: "" }])).error).toBe("Is Suspension a Need or a Want?");
    expect(readPartsField(JSON.stringify([{ ...row, given: "50,000" }])).error).toBe("Suspension costs ₹45,000, so it can't be given more");
    expect(readPartsField("{").error).toMatch(/couldn't be read/);
  });
  it("the goal form carries the parts, and a goal with parts can stand at ₹0", () => {
    const withParts = { ...goal, amount: "0", parts: JSON.stringify([row]) };
    expect(readGoalForm(withParts, [])).toMatchObject({ ok: true, input: { amount: 0, parts: [{ name: "Suspension" }] } });
    expect(readGoalForm({ ...goal, amount: "0" }, [])).toMatchObject({ ok: false, errors: { amount: expect.any(String) } });
    expect(readGoalForm({ ...goal, parts: JSON.stringify([{ ...row, amount: "" }]) }, [])).toMatchObject({ ok: false, errors: { parts: "Enter what Suspension costs" } });
  });
});
