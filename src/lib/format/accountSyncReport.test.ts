import { describe, expect, it } from "vitest";
import type { EmailOutcome, StatementOutcome } from "../accountStatementIngestion/types";
import { accountFixFor, buildAccountSyncReport } from "./accountSyncReport";

const statement = (overrides: Partial<StatementOutcome> = {}): StatementOutcome => ({ result: "imported", accountName: "Slice Bank Account", periodStart: "2026-09-01", periodEnd: "2026-09-30", created: 2, unchanged: 0, reviews: [], notes: [], ...overrides });
const email = (statements: StatementOutcome[], overrides: Partial<EmailOutcome> = {}): EmailOutcome => ({ messageId: "m", subject: "Your September statement", result: "imported", statements, ...overrides });

describe("buildAccountSyncReport", () => {
  it("sorts statements into added, already there, and failed, one row for each", () => {
    const report = buildAccountSyncReport(
      [
        email([statement()], { messageId: "a" }),
        email([statement({ result: "unchanged", created: 0, unchanged: 2 })], { messageId: "b", result: "unchanged" }),
        email([], { messageId: "c", result: "skipped", problem: "locked", reason: "none of the saved account PDF passwords opens it", subject: "HDFC statement" }),
      ],
      0,
    );
    expect(report.emails).toBe(3);
    expect(report.imported).toMatchObject([{ messageId: "a", account: "Slice Bank Account", period: "Sep 1, 2026 to Sep 30, 2026", added: 2 }]);
    expect(report.alreadyIn).toMatchObject([{ messageId: "b", alreadyThere: 2 }]);
    expect(report.failed).toEqual([{ messageId: "c", title: "HDFC statement", reason: "None of the saved account PDF passwords opens it.", fix: "Save the account's statement PDF password in Edit account." }]);
  });

  it("lists the balances that need an answer, with the account and both figures", () => {
    const report = buildAccountSyncReport([email([statement({ reviews: [{ date: "2026-09-30", recordedBalance: 13691.8, statementBalance: 13678.8, bigDrop: false }] })])], 0);
    expect(report.reviews).toEqual([{ messageId: "m", account: "Slice Bank Account", date: "2026-09-30", recordedBalance: 13691.8, statementBalance: 13678.8, bigDrop: false }]);
  });

  it("reports a skipped statement inside an email that otherwise imported, as one row among the failures", () => {
    const report = buildAccountSyncReport([email([statement(), statement({ result: "skipped", problem: "no-account", reason: "a HDFC statement for an account ending 9999, which isn't one of your accounts", accountName: undefined, bank: "HDFC" })])], 0);
    expect(report.imported).toHaveLength(1);
    expect(report.failed).toHaveLength(1);
    expect(report.failed[0]).toMatchObject({ title: "HDFC · Sep 1, 2026 to Sep 30, 2026", fix: "Add the account, or fill in its bank name and last 4 digits in Edit account." });
  });

  it("names the accounts whose last 4 was saved from a statement, once each", () => {
    const filled = statement({ notes: ["filled in Slice Bank Account's last 4 (1128) from the statement"] });
    expect(buildAccountSyncReport([email([filled]), email([filled])], 0).filledLast4).toEqual(["Slice Bank Account"]);
  });

  it("carries how many emails are left, and says nothing for none", () => {
    expect(buildAccountSyncReport([], 4)).toMatchObject({ emails: 0, remaining: 4, imported: [], failed: [] });
  });
});

describe("accountFixFor", () => {
  it("has a fix for what's changed in the app, and none for what's simply tried again", () => {
    for (const p of ["locked", "no-account", "several-accounts", "closed-account", "before-account-opened"] as const) expect(accountFixFor(p), p).toBeTruthy();
    for (const p of ["no-pdf", "no-text", "unknown-layout", "unreadable", "numbers", "timeout", "error", "period-in-future"] as const) expect(accountFixFor(p), p).toBeUndefined();
    expect(accountFixFor(undefined)).toBeUndefined();
  });
});
