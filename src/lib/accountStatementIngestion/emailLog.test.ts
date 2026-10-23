import { describe, expect, it } from "vitest";
import type { AccountStatementEmail } from "../sheets/types";
import { accountLogEntry, planAccountEmails } from "./emailLog";
import type { EmailOutcome, StatementOutcome } from "./types";

const row = (messageId: string, result: AccountStatementEmail["result"], attempts = 1): AccountStatementEmail => ({ id: `row-${messageId}`, messageId, result, attempts, lastTriedAt: "2026-10-01T00:00:00Z" });

describe("planAccountEmails", () => {
  it("reads new emails first, then failures again, and leaves done ones alone", () => {
    const plan = planAccountEmails(["a", "b", "c", "d"], [row("a", "Imported"), row("b", "Failed"), row("c", "Duplicate")]);
    expect(plan.map((p) => p.messageId)).toEqual(["d", "b"]);
    expect(plan[1].logged?.attempts).toBe(1);
  });
  it("takes an email listed twice once, and the first row of one logged twice", () => {
    expect(planAccountEmails(["x", "x"], []).map((p) => p.messageId)).toEqual(["x"]);
    expect(planAccountEmails(["x"], [row("x", "Imported"), row("x", "Failed")])).toEqual([]);
  });
});

describe("accountLogEntry", () => {
  const statement = (overrides: Partial<StatementOutcome> = {}): StatementOutcome => ({ result: "imported", accountId: "acc", accountName: "Slice Bank Account", periodStart: "2026-09-01", periodEnd: "2026-09-30", created: 2, unchanged: 0, reviews: [], notes: [], ...overrides });
  const email = (statements: StatementOutcome[], overrides: Partial<EmailOutcome> = {}): EmailOutcome => ({ messageId: "m", subject: "Sep statement", result: "imported", statements, ...overrides });

  it("logs an imported email with its account, period and a count-only summary", () => {
    const entry = accountLogEntry(email([statement()]), undefined, "2026-10-23T10:00:00Z");
    expect(entry).toMatchObject({ messageId: "m", accountId: "acc", periodStart: "2026-09-01", periodEnd: "2026-09-30", result: "Imported", attempts: 1, lastTriedAt: "2026-10-23T10:00:00Z" });
    expect(entry.details).toBe("Slice Bank Account: 2 added, 0 already there");
  });

  it("names the dates of the balances to review, never their amounts", () => {
    const entry = accountLogEntry(email([statement({ reviews: [{ date: "2026-09-30", recordedBalance: 13691.8, statementBalance: 13678.8, bigDrop: false }] })]), undefined, "t");
    expect(entry.details).toContain("1 to review (2026-09-30)");
    expect(entry.details).not.toMatch(/13[,.]?6/);
  });

  it("logs unchanged as Duplicate and a skip as Failed with its reason, counting a retry", () => {
    expect(accountLogEntry(email([statement({ result: "unchanged", created: 0, unchanged: 2 })], { result: "unchanged" }), undefined, "t").result).toBe("Duplicate");
    const failed = accountLogEntry(email([], { result: "skipped", reason: "none of the saved passwords opens it", problem: "locked" }), row("m", "Failed", 2), "t");
    expect(failed).toMatchObject({ result: "Failed", details: "none of the saved passwords opens it", attempts: 3 });
  });

  it("with several accounts in one PDF leaves the single account blank, and keeps an earlier sync's date and subject", () => {
    const entry = accountLogEntry(email([statement(), statement({ accountId: "b", accountName: "Other" })], { subject: "" }), { ...row("m", "Failed"), receivedDate: "2026-10-02", subject: "Old subject" }, "t");
    expect(entry.accountId).toBeUndefined();
    expect(entry).toMatchObject({ receivedDate: "2026-10-02", subject: "Old subject" });
  });
});
