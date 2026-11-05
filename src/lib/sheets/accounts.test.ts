import { describe, expect, it } from "vitest";
import { ACCOUNT_COLUMNS, accountRowSchema, createAccountSchema, updateAccountSchema } from "./accounts";

const savings = { name: "HDFC Salary", bank: "HDFC Bank", accountType: "Savings", purpose: "Spending", startDate: "2019-07-01", status: "Active" };
const vested = { name: "Vested cash", bank: "Vested", accountType: "Brokerage", purpose: "Investment", startDate: "2023-07-01", status: "Active", currency: "USD" };

describe("an account's currency (ADR 0012)", () => {
  it("accepts a Brokerage account in dollars", () => {
    const parsed = createAccountSchema.safeParse(vested);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.currency).toBe("USD");
  });

  it("still accepts an account with no currency, so every existing row reads as before", () => {
    const parsed = accountRowSchema.safeParse({ ...savings, id: "a1" });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.currency).toBeUndefined();
  });

  it("refuses a currency the app doesn't support", () => {
    expect(createAccountSchema.safeParse({ ...vested, currency: "EUR" }).success).toBe(false);
    expect(createAccountSchema.safeParse({ ...vested, currency: "usd" }).success).toBe(false);
  });

  it("refuses an account type that isn't one of the three", () => {
    expect(createAccountSchema.safeParse({ ...savings, accountType: "Demat" }).success).toBe(false);
  });

  it("lets an update change the currency alone", () => {
    expect(updateAccountSchema.parse({ currency: "INR" })).toEqual({ currency: "INR" });
  });

  it("keeps currency as the last column, so an older Sheet only gains a column on the end", () => {
    expect(ACCOUNT_COLUMNS.at(-1)).toBe("currency");
  });
});
