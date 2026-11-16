import { describe, expect, it } from "vitest";
import type { GoalContribution, PolicyPayment, SubscriptionPayment } from "../sheets/types";
import { goalsAddedIn, premiumsPaidIn, subscriptionsPaidIn } from "./rangeSums";

const months = new Set(["2026-03", "2026-04"]);

const sub = (id: string, paymentDate: string, amount: number, status: SubscriptionPayment["status"] = "Paid"): SubscriptionPayment => ({ id, subscriptionId: "s", paymentDate, amount, status });
const goal = (id: string, date: string, amount: number, kind: GoalContribution["kind"] = "Set-aside"): GoalContribution => ({ id, goalId: "g", date, amount, kind });
const premium = (id: string, amount: number, over: Partial<PolicyPayment> = {}): PolicyPayment => ({ id, policyId: "p", periodStart: "2026-03-01", years: 1, amount, status: "Paid", ...over });

describe("subscriptionsPaidIn", () => {
  it("adds the payments marked paid on a day inside the range", () => {
    const payments = [sub("a", "2026-03-05", 500), sub("b", "2026-04-30", 200), sub("c", "2026-05-01", 900), sub("d", "2026-02-28", 700)];
    expect(subscriptionsPaidIn(payments, months)).toBe(700);
  });
  it("leaves out a payment that wasn't paid", () => {
    expect(subscriptionsPaidIn([sub("a", "2026-03-05", 500, "Pending")], months)).toBe(0);
  });
  it("is nothing for an empty range", () => {
    expect(subscriptionsPaidIn([sub("a", "2026-03-05", 500)], new Set())).toBe(0);
  });
});

describe("goalsAddedIn", () => {
  it("adds every contribution made inside the range", () => {
    expect(goalsAddedIn([goal("a", "2026-03-31", 1000), goal("b", "2026-04-01", 250), goal("c", "2026-05-02", 9999)], months)).toBe(1250);
  });
  it("counts a take-back against it", () => {
    expect(goalsAddedIn([goal("a", "2026-03-10", 1000), goal("b", "2026-04-10", 300, "Take-back")], months)).toBe(700);
  });
});

describe("premiumsPaidIn", () => {
  it("counts a premium on the day it was paid", () => {
    expect(premiumsPaidIn([premium("a", 24600, { paidOn: "2026-04-10", periodStart: "2026-01-01" })], months)).toBe(24600);
    expect(premiumsPaidIn([premium("a", 24600, { paidOn: "2026-06-10", periodStart: "2026-03-01" })], months)).toBe(0);
  });
  it("counts one with no known day at its term's start", () => {
    expect(premiumsPaidIn([premium("a", 1000, { periodStart: "2026-03-01" })], months)).toBe(1000);
  });
  it("leaves out an unpaid premium", () => {
    expect(premiumsPaidIn([premium("a", 1000, { status: "Pending" })], months)).toBe(0);
  });
});
