import { describe, expect, it } from "vitest";
import { goalEditPatch, readBoughtForm, readEntryForm, readGoalForm } from "./goalForms";

const goal = { name: "Goa trip", category: "Travel", necessity: "Want", scale: "Minor", amount: "85,000", startDate: "2026-08-01" };

describe("the goal form", () => {
  it("reads a plain goal, and a dated one with a plan", () => {
    const plain = readGoalForm(goal, []);
    expect(plain).toEqual({ ok: true, input: { name: "Goa trip", category: "Travel", necessity: "Want", scale: "Minor", amount: 85000, startDate: "2026-08-01" } });
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
