import { describe, expect, it } from "vitest";
import { incomeMismatches } from "./incomeMismatch";

const ref = (day: string, rupees: number, nth = 1) => `hdfc:${day}:${Math.round(rupees * 100)}:${nth}`;
const entry = (id: string, amount: number, receivedDate: string, statementRef?: string, sourceId = "salary") => ({ id, incomeSourceId: sourceId, amount, receivedDate, status: "Received" as const, statementRef });

describe("incomeMismatches", () => {
  it("finds a hand-typed entry that sits beside the importer's entry with a different amount, so the pay is counted twice", () => {
    const found = incomeMismatches([entry("manual", 177_526.26, "2026-10-30"), entry("stmt", 175_677, "2026-10-30", ref("2026-10-30", 175_677))]);
    expect(found).toEqual([{ sourceId: "salary", date: "2026-10-30", credited: 175_677, entered: 353_203.26, entryIds: ["manual", "stmt"] }]);
  });

  it("accepts a credit entered as several entries that add up to it (a salary and a bonus)", () => {
    expect(incomeMismatches([entry("base", 175_677, "2026-07-31", ref("2026-07-31", 359_304)), entry("bonus", 183_627, "2026-07-31")])).toEqual([]);
  });

  it("finds an entry that is short of the credit, even alone", () => {
    const found = incomeMismatches([entry("stmt", 170_000, "2026-09-30", ref("2026-09-30", 175_677))]);
    expect(found).toMatchObject([{ credited: 175_677, entered: 170_000 }]);
  });

  it("says nothing when the entry is the credit, and nothing for entries with no statement line to compare", () => {
    expect(incomeMismatches([entry("a", 175_677, "2026-09-30", ref("2026-09-30", 175_677))])).toEqual([]);
    expect(incomeMismatches([entry("typed", 175_000, "2026-09-30")])).toEqual([]);
  });

  it("judges each source and each pay day on its own, and ignores money not yet received", () => {
    const entries = [
      entry("s1", 100, "2026-09-30", ref("2026-09-30", 100)),
      entry("s2", 100, "2026-10-30", ref("2026-10-30", 100)),
      entry("other", 50, "2026-10-30", undefined, "rent"),
      { ...entry("pending", 999, "2026-10-30"), status: "Pending" as const },
    ];
    expect(incomeMismatches(entries)).toEqual([]);
  });

  it("takes two credits within three days as one pay day, so neither looks short", () => {
    expect(incomeMismatches([entry("a", 60, "2026-10-29", ref("2026-10-29", 60)), entry("b", 40, "2026-10-30", ref("2026-10-30", 40))])).toEqual([]);
  });

  it("lists the newest first and reports one mismatch once", () => {
    const found = incomeMismatches([
      entry("old", 90, "2026-08-31", ref("2026-08-31", 100)),
      entry("new1", 90, "2026-10-30", ref("2026-10-30", 100)),
      entry("new2", 5, "2026-10-30", ref("2026-10-30", 100, 2)),
    ]);
    expect(found.map((m) => m.date)).toEqual(["2026-10-30", "2026-08-31"]);
  });
});
