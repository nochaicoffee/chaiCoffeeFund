import { describe, expect, it } from "vitest";
import { checkSubscriptionPayment, createSubscriptionPaymentSchema, subscriptionPaymentRowSchema, updateSubscriptionPaymentSchema } from "./subscriptionPayments";

const valid = { subscriptionId: "sub-1", paymentDate: "2026-09-23", amount: 649, status: "Paid", paidFromCardId: "card-1" };

describe("createSubscriptionPaymentSchema", () => {
  it("accepts a payment charged to a card or to an account", () => {
    expect(createSubscriptionPaymentSchema.safeParse(valid).success).toBe(true);
    expect(createSubscriptionPaymentSchema.safeParse({ ...valid, paidFromCardId: undefined, paidFromAccountId: "acc-1" }).success).toBe(true);
  });

  it("rejects one charged to both", () => {
    const result = createSubscriptionPaymentSchema.safeParse({ ...valid, paidFromAccountId: "acc-1" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Charge it to a card or a bank account, not both");
  });

  it("records a renewal that didn't charge as a ₹0 Skipped payment", () => {
    expect(createSubscriptionPaymentSchema.safeParse({ ...valid, amount: 0, status: "Skipped", paidFromCardId: undefined }).success).toBe(true);
    const charged = createSubscriptionPaymentSchema.safeParse({ ...valid, status: "Skipped" });
    expect(charged.success).toBe(false);
    expect(charged.error?.issues[0]?.path).toEqual(["amount"]);
  });

  it("still reads Pending", () => {
    expect(createSubscriptionPaymentSchema.safeParse({ ...valid, status: "Pending" }).success).toBe(true);
  });
});

describe("updateSubscriptionPaymentSchema", () => {
  it("checks the fields it's given", () => {
    expect(updateSubscriptionPaymentSchema.safeParse({ status: "Skipped", amount: 649 }).success).toBe(false);
    expect(updateSubscriptionPaymentSchema.parse({ amount: 799 })).toEqual({ amount: 799 });
  });

  it("records ₹0 when a payment is marked Skipped, so the merged row isn't Skipped with an amount", () => {
    expect(updateSubscriptionPaymentSchema.parse({ status: "Skipped" })).toEqual({ status: "Skipped", amount: 0 });
  });

  it("clears the other place when it's charged somewhere else, and \"\" clears one", () => {
    expect(updateSubscriptionPaymentSchema.parse({ paidFromAccountId: "acc-1" })).toEqual({ paidFromAccountId: "acc-1", paidFromCardId: "" });
    expect(updateSubscriptionPaymentSchema.parse({ paidFromCardId: "card-1" })).toEqual({ paidFromCardId: "card-1", paidFromAccountId: "" });
    expect(updateSubscriptionPaymentSchema.parse({ paidFromCardId: "" })).toEqual({ paidFromCardId: "" });
  });
});

describe("subscriptionPaymentRowSchema", () => {
  it("is a plain object the repository can read column types from", () => {
    expect(Object.keys(subscriptionPaymentRowSchema.shape)).toEqual(["subscriptionId", "paymentDate", "amount", "status", "paidFromAccountId", "paidFromCardId", "id"]);
  });
});

describe("checkSubscriptionPayment", () => {
  it("catches a whole row that an update of only some fields would leave broken", () => {
    // A stored Skipped row with only its amount edited.
    expect(checkSubscriptionPayment({ status: "Skipped", amount: 649 })).toBe("A renewal that didn't charge is recorded as ₹0");
    expect(checkSubscriptionPayment({ status: "Paid", amount: 649, paidFromAccountId: "acc-1", paidFromCardId: "card-1" })).toBe("Charge it to a card or a bank account, not both");
    expect(checkSubscriptionPayment({ status: "Skipped", amount: 0 })).toBeNull();
    expect(checkSubscriptionPayment({ status: "Paid", amount: 649, paidFromCardId: "card-1" })).toBeNull();
  });
});
