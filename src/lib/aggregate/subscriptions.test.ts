import { describe, expect, it } from "vitest";
import {
  computeSubscriptionSummaries,
  monthlyEquivalent,
  monthlySpendOffCards,
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

  it("leaves out cancelled subscriptions too", () => {
    const subs = [
      subscription({ id: "s1", amount: 500 }),
      subscription({ id: "s2", amount: 800, status: "Cancelled", endDate: "2026-09-14" }),
    ];
    expect(totalMonthlySubscriptionSpend(subs)).toBe(500);
  });
});

describe("monthlySpendOffCards", () => {
  // Count once, by context (#124): a card-charged subscription is already in its card's statement.
  const subs = [
    subscription({ id: "bank", amount: 549, billingCycle: "Quarterly", defaultPaidFromAccountId: "acc-1" }),
    subscription({ id: "card", amount: 649, defaultPaidFromCardId: "card-1" }),
    subscription({ id: "unknown", amount: 119 }),
    subscription({ id: "paused", amount: 299, status: "Paused", defaultPaidFromAccountId: "acc-1" }),
  ];

  const cards = [{ id: "card-1", status: "Active" as const }];

  it("counts bank-charged and unset subscriptions, but not ones on an active card", () => {
    expect(monthlySpendOffCards(subs, cards)).toBeCloseTo(549 / 3 + 119, 6);
  });

  it("plus the part on active cards equals the page's full monthly total, so nothing is lost or counted twice", () => {
    const onCards = totalMonthlySubscriptionSpend(subs.filter((s) => s.defaultPaidFromCardId));
    expect(monthlySpendOffCards(subs, cards) + onCards).toBeCloseTo(totalMonthlySubscriptionSpend(subs), 6);
  });

  it("counts one on a closed, inactive or missing card, since no bill the Overview adds covers it", () => {
    expect(monthlySpendOffCards(subs, [{ id: "card-1", status: "Closed" }])).toBeCloseTo(549 / 3 + 119 + 649, 6);
    expect(monthlySpendOffCards(subs, [{ id: "card-1", status: "Inactive" }])).toBeCloseTo(549 / 3 + 119 + 649, 6);
    expect(monthlySpendOffCards(subs, [])).toBeCloseTo(549 / 3 + 119 + 649, 6);
  });
});

describe("subscriptionSpendByCategory", () => {
  it("groups active subscriptions by category", () => {
    const subs = [
      subscription({ id: "s1", category: "Software", amount: 500 }),
      subscription({ id: "s2", category: "Streaming", amount: 200 }),
      subscription({ id: "s3", category: "Software", amount: 300 }),
      subscription({ id: "s4", category: "Software", amount: 999, status: "Paused" }),
    ];
    expect(subscriptionSpendByCategory(subs)).toEqual({ Software: 800, Streaming: 200 });
  });
});
