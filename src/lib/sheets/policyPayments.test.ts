import { describe, expect, it } from "vitest";
import { checkPolicyPayment, createPolicyPaymentSchema, policyPaymentRowSchema, updatePolicyPaymentSchema } from "./policyPayments";
import type { PolicyPayment } from "./types";

const valid = {
  policyId: "pol-1",
  periodStart: "2026-07-05",
  years: 3,
  amount: 38427.59,
  paidOn: "2026-07-05",
  status: "Paid",
};

describe("createPolicyPaymentSchema", () => {
  it("accepts a single premium for three years, and one for a single year", () => {
    expect(createPolicyPaymentSchema.safeParse(valid).success).toBe(true);
    expect(createPolicyPaymentSchema.safeParse({ ...valid, years: 1, amount: 451 }).success).toBe(true);
  });

  it("buys one to five whole years, nothing else", () => {
    for (const years of [1, 2, 3, 4, 5]) expect(createPolicyPaymentSchema.safeParse({ ...valid, years }).success).toBe(true);
    for (const years of [0, 6, 2.5, -1]) expect(createPolicyPaymentSchema.safeParse({ ...valid, years }).success).toBe(false);
  });

  it("accepts a term with no paid-on day, which the page shows as assumed", () => {
    expect(createPolicyPaymentSchema.safeParse({ ...valid, paidOn: undefined }).success).toBe(true);
  });

  it("refuses a term that hasn't been paid but has a paid-on day", () => {
    const result = createPolicyPaymentSchema.safeParse({ ...valid, status: "Pending" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["paidOn"]);
    expect(createPolicyPaymentSchema.safeParse({ ...valid, status: "Pending", paidOn: undefined }).success).toBe(true);
  });

  it("takes a no-claim step only from the fixed list", () => {
    for (const ncb of [0, 20, 25, 35, 45, 50]) expect(createPolicyPaymentSchema.safeParse({ ...valid, ncb }).success).toBe(true);
    for (const ncb of [10, 30, 55, -5]) expect(createPolicyPaymentSchema.safeParse({ ...valid, ncb }).success).toBe(false);
  });

  it("refuses a negative amount, and a Skipped status (a lapsed term is no payment, not a ₹0 one)", () => {
    expect(createPolicyPaymentSchema.safeParse({ ...valid, amount: -1 }).success).toBe(false);
    expect(createPolicyPaymentSchema.safeParse({ ...valid, status: "Skipped" }).success).toBe(false);
  });

  it("accepts paid from a card, an account or neither, but not both", () => {
    expect(createPolicyPaymentSchema.safeParse({ ...valid, paidFromCardId: "card-1" }).success).toBe(true);
    expect(createPolicyPaymentSchema.safeParse({ ...valid, paidFromAccountId: "acc-1" }).success).toBe(true);
    expect(createPolicyPaymentSchema.safeParse({ ...valid, paidFromCardId: "card-1", paidFromAccountId: "acc-1" }).success).toBe(false);
  });
});

describe("updatePolicyPaymentSchema", () => {
  it("switching where it was paid from clears the other place", () => {
    expect(updatePolicyPaymentSchema.parse({ paidFromAccountId: "acc-1" })).toEqual({ paidFromAccountId: "acc-1", paidFromCardId: "" });
    expect(updatePolicyPaymentSchema.parse({ paidFromCardId: "card-1" })).toEqual({ paidFromCardId: "card-1", paidFromAccountId: "" });
  });

  it("clears the paid-on day with \"\", and a number field to unset", () => {
    expect(updatePolicyPaymentSchema.parse({ paidOn: "" })).toEqual({ paidOn: "" });
    expect(updatePolicyPaymentSchema.parse({ ncb: "" })).toEqual({ ncb: undefined });
    expect(updatePolicyPaymentSchema.parse({ sumInsured: "" })).toEqual({ sumInsured: undefined });
  });

  it("still refuses a bad number of years and an unknown status", () => {
    expect(updatePolicyPaymentSchema.safeParse({ years: 6 }).success).toBe(false);
    expect(updatePolicyPaymentSchema.safeParse({ status: "Lapsed" }).success).toBe(false);
  });
});

describe("checkPolicyPayment (a whole row, after an update is merged over it)", () => {
  const stored: Omit<PolicyPayment, "id"> = { policyId: "pol-1", periodStart: "2026-07-05", years: 3, amount: 38427.59, paidOn: "2026-07-05", status: "Paid", ncb: 25 };
  const merged = (update: object): Omit<PolicyPayment, "id"> => ({ ...stored, ...(updatePolicyPaymentSchema.parse(update) as Partial<PolicyPayment>) });

  it("catches a pending term with a paid-on day, and a no-claim step off the list", () => {
    expect(checkPolicyPayment({ ...stored, status: "Pending" })).toContain("hasn't been paid");
    expect(checkPolicyPayment({ ...stored, ncb: 30 })).toContain("no-claim bonus");
  });

  it("setting a term Pending implies its paid-on day is cleared, so the merged row is valid", () => {
    expect(updatePolicyPaymentSchema.parse({ status: "Pending" })).toEqual({ status: "Pending", paidOn: "" });
    expect(updatePolicyPaymentSchema.parse({ status: "Paid" })).toEqual({ status: "Paid" });
    expect(checkPolicyPayment(merged({ status: "Pending" }))).toBeNull();
  });

  it("clearing the no-claim step merges to a row with none, which is valid", () => {
    const row = merged({ ncb: "" });
    expect(row.ncb).toBeUndefined();
    expect(checkPolicyPayment(row)).toBeNull();
  });

  it("an update to the years or the amount can't break a row that was valid", () => {
    expect(checkPolicyPayment(merged({ years: 2, amount: 30000 }))).toBeNull();
  });
});

describe("policyPaymentRowSchema", () => {
  it("reads a row with its id and the optional columns blank", () => {
    expect(policyPaymentRowSchema.safeParse({ ...valid, paidOn: undefined, id: "pay-1" }).success).toBe(true);
  });
});
