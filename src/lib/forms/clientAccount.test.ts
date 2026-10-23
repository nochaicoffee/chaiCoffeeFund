import { describe, expect, it } from "vitest";
import type { Account } from "../sheets/types";
import { toClientAccount } from "./clientAccount";

const account: Account = { id: "a", name: "HDFC", bank: "HDFC Bank", accountType: "Savings", purpose: "Spending", startDate: "2026-01-01", status: "Active", last4: "3840" };

describe("toClientAccount", () => {
  it("drops the password and says whether one is saved", () => {
    const client = toClientAccount({ ...account, statementPdfPassword: "s3cret-Pw" });
    expect(JSON.stringify(client)).not.toContain("s3cret-Pw");
    expect(client).toMatchObject({ id: "a", name: "HDFC", last4: "3840", hasPdfPassword: true });
    expect("statementPdfPassword" in client).toBe(false);
  });
  it("says none is saved when there isn't one", () => {
    expect(toClientAccount(account).hasPdfPassword).toBe(false);
  });
});
