import { describe, expect, it } from "vitest";
import { TODAY, goal, sample, set } from "../aggregate/goals.fixture";
import { attentionItems, type AttentionInput } from "./attention";

const input = (data = sample(), balances: Record<string, number> = {}): AttentionInput => ({ ...data, accounts: [{ id: "demo-icici", name: "ICICI Invest" }, { id: "demo-hdfc", name: "HDFC Salary" }], balances });

describe("what needs attention", () => {
  it("is the Fixed fridge in the sample: short of its plan, a Need, 52 days away", () => {
    const items = attentionItems(input(), TODAY);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "fridge", tone: "warning", left: 17000, label: "New fridge · Fixed date Dec 20 (in 52 days)" });
    expect(items[0].detail).toBe("₹17,000 still to set aside, and you plan ₹15,000 a month. It's a Need.");
  });
  it("is nothing when the Fixed date's plan covers it, or its date is far", () => {
    const covered = sample();
    covered.goals.find((g) => g.id === "fridge")!.plannedMonthly = 17000;
    expect(attentionItems(input(covered), TODAY)).toEqual([]);
    const far = sample();
    far.goals.find((g) => g.id === "fridge")!.targetDate = "2027-09-01";
    expect(attentionItems(input(far), TODAY)).toEqual([]);
  });
  it("a date that has passed is red and says it needs it all now, and sorts first", () => {
    const data = sample();
    data.goals.find((g) => g.id === "goa")!.targetDate = "2026-10-20";
    const items = attentionItems(input(data), TODAY);
    expect(items[0]).toMatchObject({ id: "goa", tone: "negative", label: "Goa trip · overdue", left: 64000 });
    expect(items[0].detail).toContain("It needs it all now.");
    expect(items.map((i) => i.tone)).toEqual(["negative", "warning"]);
  });
  it("a Fixed sub-goal counts as much as a Fixed goal, and is named with its parent", () => {
    const data = sample();
    const susp = data.goals.find((g) => g.id === "susp")!;
    susp.dateType = "Fixed";
    susp.targetDate = "2026-12-30";
    susp.plannedMonthly = 100;
    const items = attentionItems(input(data), TODAY);
    expect(items.find((i) => i.id === "car")?.label).toBe("Car upgrade: Suspension · Fixed date Dec 30 (in 62 days)");
  });
  it("a paused or funded piece isn't asked about", () => {
    const data = sample();
    data.goals.find((g) => g.id === "fridge")!.status = "Paused";
    expect(attentionItems(input(data), TODAY)).toEqual([]);
    const funded = sample();
    funded.contributions.push(set("fridge", 17000));
    expect(attentionItems(input(funded), TODAY)).toEqual([]);
  });
  it("flags an account that holds less than goals have earmarked in it", () => {
    const items = attentionItems(input(sample(), { "demo-icici": 150000, "demo-hdfc": 500000 }), TODAY);
    const account = items.find((i) => i.id === "all")!;
    expect(account).toMatchObject({ tone: "warning", left: 0, label: "ICICI Invest earmarks" });
    expect(account.detail).toBe("goals hold ₹1,66,000 of the ₹1,50,000 in the account (₹16,000 more than it has).");
    expect(items.filter((i) => i.id === "all")).toHaveLength(1);
  });
  it("is empty with no goals", () => {
    expect(attentionItems(input({ goals: [], contributions: [] }), TODAY)).toEqual([]);
    expect(goal).toBeDefined();
  });
});
