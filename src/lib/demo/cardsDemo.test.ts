import { describe, expect, it } from "vitest";
import { demoCardData } from "./cardsDemo";
import { pendingSummary, spendSummary } from "../aggregate/cardSpend";

describe("demoCardData", () => {
  it("ends at this month once the month's statements are out", () => {
    const data = demoCardData("2026-08-18");
    const months = [...new Set(data.statements.map((s) => s.statementDate.slice(0, 7)))].sort();
    expect(months).toEqual(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]);
  });

  it("ends at last month early in the month, so nothing is dated in the future", () => {
    const data = demoCardData("2026-01-02");
    expect(data.statements.every((s) => s.statementDate <= "2026-01-02")).toBe(true);
    expect(data.statements.map((s) => s.statementDate.slice(0, 7)).sort().at(-1)).toBe("2025-12");
  });

  it("reproduces the design's figures", () => {
    const data = demoCardData("2026-08-18");
    expect(spendSummary(data, { kind: "year", year: 2026 }, "2026-08-18").total).toBe(239700);
    expect(pendingSummary(data, "2026-08-18")).toEqual({ count: 2, total: 50900, nextDueDate: "2026-08-23" });
  });
});
