import { describe, expect, it, vi } from "vitest";

const cardsSkipped = { tab: "Cards", rows: [{ rowNumber: 4, problems: [{ field: "creditLimit", message: "is blank" }] }] };
const statementsSkipped = { tab: "CardStatements", rows: [{ rowNumber: 7, problems: [{ field: "totalAmountDue", message: "is blank" }] }] };

vi.mock("@/lib/sheets/cached", () => ({
  getCachedCardsTab: async () => ({ records: [], skipped: cardsSkipped }),
  getCachedStatementsTab: async () => ({ records: [], skipped: statementsSkipped }),
  getCachedAccounts: async () => [],
}));

const { loadCardData } = await import("./loadCardData");

describe("loadCardData", () => {
  it("passes on the Cards and CardStatements rows the Sheet reads skipped", async () => {
    const { skipped } = await loadCardData({}, "2026-10-18");
    expect(skipped).toEqual([cardsSkipped, statementsSkipped]);
  });

  it("skips nothing for sample data, which never reads the Sheet", async () => {
    const { demo, skipped } = await loadCardData({ demo: "" }, "2026-10-18");
    expect(demo).toBe(true);
    expect(skipped).toEqual([]);
  });
});
