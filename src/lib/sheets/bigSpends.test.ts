import { describe, expect, it } from "vitest";
import { checkBigSpend, createBigSpendSchema, updateBigSpendSchema } from "./bigSpends";

const flights = { date: "2026-10-03", amount: 18600, name: "Flights home", category: "Travel", paidFromCardId: "c1" } as const;

describe("big spend schemas", () => {
  it("accepts one paid from a card, from an account, or from neither", () => {
    expect(createBigSpendSchema.safeParse(flights).success).toBe(true);
    expect(createBigSpendSchema.safeParse({ ...flights, paidFromCardId: undefined, paidFromAccountId: "hdfc" }).success).toBe(true);
    expect(createBigSpendSchema.safeParse({ ...flights, paidFromCardId: undefined }).success).toBe(true);
  });
  it("refuses one paid from both, a category not on the list, or nothing spent", () => {
    expect(createBigSpendSchema.safeParse({ ...flights, paidFromAccountId: "hdfc" }).success).toBe(false);
    expect(createBigSpendSchema.safeParse({ ...flights, category: "Food" }).success).toBe(false);
    expect(createBigSpendSchema.safeParse({ ...flights, amount: 0 }).success).toBe(false);
  });
  it("clears the card when an update moves it to an account, and the whole-row check catches both set", () => {
    expect(updateBigSpendSchema.parse({ paidFromAccountId: "hdfc" })).toEqual({ paidFromAccountId: "hdfc", paidFromCardId: "" });
    expect(checkBigSpend({ ...flights, paidFromAccountId: "hdfc" })).toMatch(/not both/);
    expect(checkBigSpend({ ...flights, paidFromAccountId: "" })).toBeNull();
  });
});
