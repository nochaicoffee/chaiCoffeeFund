import { describe, expect, it } from "vitest";
import { transferProblem } from "./transferGuards";

const accounts = [
  { id: "hdfc", name: "HDFC" },
  { id: "zerodha", name: "Zerodha", currency: "INR" as const },
  { id: "ibkr", name: "IBKR", currency: "USD" as const },
];

describe("transferProblem", () => {
  it("lets a rupee transfer between two rupee accounts through", () => {
    expect(transferProblem(accounts, { fromAccountId: "hdfc", toAccountId: "zerodha" })).toBeNull();
  });
  it("refuses an account that isn't in Accounts", () => {
    expect(transferProblem(accounts, { fromAccountId: "nope", toAccountId: "zerodha" })).toMatch(/left isn't in Accounts/);
    expect(transferProblem(accounts, { fromAccountId: "hdfc", toAccountId: "nope" })).toMatch(/went to isn't in Accounts/);
  });
  it("needs what arrived when the currencies differ, so dollars are never counted as rupees", () => {
    expect(transferProblem(accounts, { fromAccountId: "ibkr", toAccountId: "hdfc" })).toMatch(/different currencies/);
    expect(transferProblem(accounts, { fromAccountId: "ibkr", toAccountId: "hdfc", receivedAmount: 90_000 })).toBeNull();
  });
});
