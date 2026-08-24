import { describe, expect, it } from "vitest";
import {
  computeSubscriptionSummaries,
  monthlyEquivalent,
  subscriptionSpendByCategory,
  totalMonthlySubscriptionSpend,
} from "./subscriptions";
import type { Subscription } from "../sheets/types";

const subscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: "sub-1",
  name: "Test Subscription",
  alias: "TS",
  category: "Software",
  amount: 1200,
  billingCycle: "Monthly",
  billingAnchorDate: "2026-08-10",
  startDate: "2026-01-10",
  status: "Active",
  ...overrides,
});

describe("monthlyEquivalent", () => {
  it("passes monthly amounts through as-is", () => {
    expect(monthlyEquivalent(subscription({ amount: 199, billingCycle: "Monthly" }))).toBe(199);
  });

  it("divides yearly amounts by 12, matching Apple Creator Studio's real numbers", () => {
    expect(monthlyEquivalent(subscription({ amount: 3999, billingCycle: "Yearly" }))).toBeCloseTo(333.25, 2);
  });

  it("divides quarterly amounts by 3", () => {
    expect(monthlyEquivalent(subscription({ amount: 900, billingCycle: "Quarterly" }))).toBe(300);
  });
});

describe("computeSubscriptionSummaries", () => {
  it("predicts the next billing date from the anchor", () => {
    // 2026-08-10 has already passed relative to "from", so it should step to September.
    const [summary] = computeSubscriptionSummaries(
      [subscription({ billingAnchorDate: "2026-07-10" })],
      "2026-08-25",
    );
    expect(summary.nextBillingDate).toBe("2026-09-10");
  });
});

describe("totalMonthlySubscriptionSpend", () => {
  it("only sums active subscriptions", () => {
    const subs = [
      subscription({ id: "s1", amount: 500, status: "Active" }),
      subscription({ id: "s2", amount: 800, status: "Paused" }),
    ];
    expect(totalMonthlySubscriptionSpend(subs)).toBe(500);
  });
});

describe("subscriptionSpendByCategory", () => {
  it("groups active subscriptions by category", () => {
    const subs = [
      subscription({ id: "s1", category: "Software", amount: 500 }),
      subscription({ id: "s2", category: "Entertainment", amount: 200 }),
      subscription({ id: "s3", category: "Software", amount: 300 }),
      subscription({ id: "s4", category: "Software", amount: 999, status: "Paused" }),
    ];
    expect(subscriptionSpendByCategory(subs)).toEqual({ Software: 800, Entertainment: 200 });
  });
});
