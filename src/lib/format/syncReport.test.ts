import { describe, expect, it } from "vitest";
import type { IngestionOutcome } from "../statementIngestion/types";
import { buildSyncReport, fixFor } from "./syncReport";

const names = new Map([
  ["regalia", "Regalia Gold"],
  ["axis", "Flipkart Axis"],
]);
const outcome = (o: Partial<IngestionOutcome> & Pick<IngestionOutcome, "messageId" | "outcome">): IngestionOutcome => ({ subject: "A statement", ...o });

describe("buildSyncReport", () => {
  it("sorts the emails into imported, already in the Sheet and couldn't import, by card", () => {
    const statement = { statementDate: "2026-10-15", dueDate: "2026-11-04", totalAmountDue: 5424 };
    const report = buildSyncReport(
      [
        outcome({ messageId: "m1", outcome: "created", cardId: "regalia", statement, filledLast4: "6262", receivedDate: "2026-10-16" }),
        outcome({ messageId: "m2", outcome: "duplicate", cardId: "axis", statement: { ...statement, statementDate: "2026-10-13" } }),
        outcome({ messageId: "m3", outcome: "skipped", cardId: "regalia", problem: "unreadable", reason: "the PDF shows no due date, as nothing is owed on it", receivedDate: "2026-03-16" }),
      ],
      0,
      names,
    );
    expect(report.emails).toBe(3);
    expect(report.imported).toEqual([{ messageId: "m1", card: "Regalia Gold", statementDate: "2026-10-15", dueDate: "2026-11-04", totalAmountDue: 5424, subject: "A statement", receivedDate: "2026-10-16" }]);
    expect(report.alreadyIn.map((r) => [r.card, r.statementDate])).toEqual([["Flipkart Axis", "2026-10-13"]]);
    expect(report.failed).toEqual([
      { messageId: "m3", card: "Regalia Gold", subject: "A statement", receivedDate: "2026-03-16", reason: "The PDF shows no due date, as nothing is owed on it." },
    ]);
    expect(report.filledLast4).toEqual(["Regalia Gold"]);
  });

  it("says what to change for a locked PDF or an email no card matched", () => {
    const report = buildSyncReport(
      [
        outcome({ messageId: "m1", outcome: "skipped", cardId: "regalia", problem: "locked", reason: "none of the saved PDF passwords opens it" }),
        outcome({ messageId: "m2", outcome: "skipped", problem: "no-card", reason: 'no card matched "Your statement"', subject: "Your statement" }),
      ],
      0,
      names,
    );
    expect(report.failed.map((r) => [r.card, r.reason, r.fix])).toEqual([
      ["Regalia Gold", "None of the saved PDF passwords opens it.", "Add Regalia Gold's statement PDF password in Edit card."],
      [undefined, 'No card matched "Your statement".', "Add a word from its subject to the right card's email keywords, in Edit card."],
    ]);
  });

  it("leaves out a card it doesn't know, and lists a card once however many last 4s it saved", () => {
    const report = buildSyncReport(
      [
        outcome({ messageId: "m1", outcome: "created", cardId: "gone", filledLast4: "1111" }),
        outcome({ messageId: "m2", outcome: "created", cardId: "axis", filledLast4: "8720" }),
        outcome({ messageId: "m3", outcome: "created", cardId: "axis", filledLast4: "8720" }),
      ],
      4,
      names,
    );
    expect(report.imported[0].card).toBeUndefined();
    expect(report.filledLast4).toEqual(["Flipkart Axis"]);
    expect(report.remaining).toBe(4);
  });
});

describe("fixFor", () => {
  it("has no fix where the reason already says what to do, or there's nothing to change", () => {
    expect(fixFor("wrong-bank", "Regalia Gold")).toBeUndefined();
    expect(fixFor("card-number", "Regalia Gold")).toBeUndefined();
    expect(fixFor("unreadable", "Regalia Gold")).toBeUndefined();
    expect(fixFor("locked", undefined)).toBe("Add the card's statement PDF password in Edit card.");
  });
});
