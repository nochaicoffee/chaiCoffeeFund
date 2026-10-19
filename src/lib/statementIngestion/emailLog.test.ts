import { describe, expect, it } from "vitest";
import type { StatementEmail } from "../sheets/types";
import { logEntry, planEmails } from "./emailLog";

const logged = (messageId: string, result: StatementEmail["result"], statementId?: string): StatementEmail => ({
  id: `log-${messageId}`,
  messageId,
  result,
  ...(statementId && { statementId }),
  attempts: 1,
  lastTriedAt: "2026-10-18T10:00:00.000Z",
});

describe("planEmails", () => {
  it("skips emails already imported, or matched to a statement already in the Sheet", () => {
    const log = [logged("m1", "Imported", "s1"), logged("m2", "Duplicate", "s2")];
    expect(planEmails(["m1", "m2"], log, new Set(["s1", "s2"]))).toEqual([]);
  });

  it("reads an imported email again once its statement has been deleted from the Sheet", () => {
    const row = logged("m1", "Imported", "s1");
    expect(planEmails(["m1"], [row], new Set())).toEqual([{ messageId: "m1", logged: row }]);
  });

  it("keeps skipping a duplicate whose statement row had no readable id", () => {
    expect(planEmails(["m1"], [logged("m1", "Duplicate")], new Set())).toEqual([]);
  });

  it("puts new emails first, newest first, then the failures to try again", () => {
    const failed = logged("old", "Failed");
    expect(planEmails(["new1", "old", "new2"], [failed], new Set()).map((e) => e.messageId)).toEqual(["new1", "new2", "old"]);
  });

  it("reads an email listed twice once, and goes by its first row if it was logged twice", () => {
    const log = [logged("m1", "Imported", "s1"), logged("m1", "Failed")];
    expect(planEmails(["m1", "m1"], log, new Set(["s1"]))).toEqual([]);
  });
});

describe("logEntry", () => {
  const AT = "2026-10-19T10:00:00.000Z";

  it("logs a new import, with its notes as the details", () => {
    const outcome = { messageId: "m1", subject: "HDFC statement", receivedDate: "2026-10-17", outcome: "created" as const, statementId: "s1", cardId: "c1", notes: ["filled in the last 4", "x"] };
    expect(logEntry(outcome, undefined, AT)).toEqual({
      messageId: "m1",
      receivedDate: "2026-10-17",
      subject: "HDFC statement",
      cardId: "c1",
      result: "Imported",
      details: "filled in the last 4; x",
      statementId: "s1",
      attempts: 1,
      lastTriedAt: AT,
    });
  });

  it("counts another try of a failed email, and clears its old reason once it imports", () => {
    const before = { ...logged("m1", "Failed"), details: "wrong password", attempts: 3 };
    const entry = logEntry({ messageId: "m1", subject: "S", outcome: "created", statementId: "s9", cardId: "c1" }, before, AT);
    expect(entry).toMatchObject({ result: "Imported", attempts: 4, statementId: "s9" });
    expect(entry.details).toBeUndefined();
  });

  it("keeps the date and subject an earlier sync found when the email can't be read now", () => {
    const before = { ...logged("m1", "Failed"), receivedDate: "2026-09-17", subject: "Axis statement" };
    const entry = logEntry({ messageId: "m1", subject: "", outcome: "skipped", reason: "network error" }, before, AT);
    expect(entry).toMatchObject({ result: "Failed", receivedDate: "2026-09-17", subject: "Axis statement", details: "network error", attempts: 2 });
  });
});
