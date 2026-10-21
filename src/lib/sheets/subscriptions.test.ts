import { describe, expect, it } from "vitest";
import { checkSubscription, createSubscriptionSchema, subscriptionRowSchema, updateSubscriptionSchema } from "./subscriptions";

const valid = {
  name: "Netflix Premium",
  alias: "Netflix",
  category: "Streaming",
  amount: 649,
  billingCycle: "Monthly",
  billingAnchorDate: "2024-02-23",
  startDate: "2024-02-23",
  status: "Active",
};

describe("createSubscriptionSchema", () => {
  it("accepts a subscription charged to a card, or to an account, or neither", () => {
    expect(createSubscriptionSchema.safeParse({ ...valid, defaultPaidFromCardId: "card-1" }).success).toBe(true);
    expect(createSubscriptionSchema.safeParse({ ...valid, defaultPaidFromAccountId: "acc-1" }).success).toBe(true);
    expect(createSubscriptionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects one charged to both a card and an account", () => {
    const result = createSubscriptionSchema.safeParse({ ...valid, defaultPaidFromCardId: "card-1", defaultPaidFromAccountId: "acc-1" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Charge it to a card or a bank account, not both");
  });

  it("accepts Cancelled with a cancelled-on date, and without one", () => {
    expect(createSubscriptionSchema.safeParse({ ...valid, status: "Cancelled", endDate: "2026-09-14" }).success).toBe(true);
    expect(createSubscriptionSchema.safeParse({ ...valid, status: "Cancelled" }).success).toBe(true);
  });

  it("only takes a category from the fixed list, with its Sheet spelling", () => {
    expect(createSubscriptionSchema.safeParse({ ...valid, category: "Cloud-Storage" }).success).toBe(true);
    expect(createSubscriptionSchema.safeParse({ ...valid, category: "Cloud storage" }).success).toBe(false);
    expect(createSubscriptionSchema.safeParse({ ...valid, category: "Entertainment" }).success).toBe(false);
  });

  it("rejects the Sheet's old Quaterly spelling", () => {
    expect(createSubscriptionSchema.safeParse({ ...valid, billingCycle: "Quaterly" }).success).toBe(false);
  });
});

describe("updateSubscriptionSchema", () => {
  it("checks the charged-to fields it's given", () => {
    expect(updateSubscriptionSchema.safeParse({ defaultPaidFromCardId: "card-1" }).success).toBe(true);
    expect(updateSubscriptionSchema.safeParse({ defaultPaidFromCardId: "card-1", defaultPaidFromAccountId: "acc-1" }).success).toBe(false);
  });
});

describe("subscriptionRowSchema", () => {
  it("reads a row with its id and the new optional columns blank", () => {
    expect(subscriptionRowSchema.safeParse({ ...valid, id: "sub-1" }).success).toBe(true);
  });
});

describe("updateSubscriptionSchema clearing fields", () => {
  it("switching to an account clears the card, and switching to a card clears the account", () => {
    expect(updateSubscriptionSchema.parse({ defaultPaidFromAccountId: "acc-1" })).toEqual({ defaultPaidFromAccountId: "acc-1", defaultPaidFromCardId: "" });
    expect(updateSubscriptionSchema.parse({ defaultPaidFromCardId: "card-1" })).toEqual({ defaultPaidFromCardId: "card-1", defaultPaidFromAccountId: "" });
  });

  it("clears an optional field with \"\", such as the cancelled-on date when one restarts", () => {
    expect(updateSubscriptionSchema.parse({ status: "Active", endDate: "" })).toEqual({ status: "Active", endDate: "" });
    expect(updateSubscriptionSchema.parse({ defaultPaidFromCardId: "" })).toEqual({ defaultPaidFromCardId: "" });
  });

  it("still rejects both set in one update, and \"\" for a required field", () => {
    expect(updateSubscriptionSchema.safeParse({ defaultPaidFromAccountId: "acc-1", defaultPaidFromCardId: "card-1" }).success).toBe(false);
    expect(updateSubscriptionSchema.safeParse({ name: "" }).success).toBe(false);
    expect(updateSubscriptionSchema.safeParse({ endDate: "soon" }).success).toBe(false);
  });

  it("leaves an update that doesn't touch where it's charged alone", () => {
    expect(updateSubscriptionSchema.parse({ amount: 799 })).toEqual({ amount: 799 });
  });
});

describe("checkSubscription", () => {
  it("catches a whole row charged to both a card and an account", () => {
    expect(checkSubscription({ defaultPaidFromAccountId: "acc-1", defaultPaidFromCardId: "card-1" })).toBe("Charge it to a card or a bank account, not both");
    expect(checkSubscription({ defaultPaidFromCardId: "card-1" })).toBeNull();
  });
});
