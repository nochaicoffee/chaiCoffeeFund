import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Each tab's rows below the header, by range, and how many times the Sheet was read. */
const sheet = vi.hoisted(() => ({ rows: {} as Record<string, unknown[][]>, reads: 0 }));

// unstable_cache needs a Next runtime; here it just runs the read, so each call is one Sheets read.
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => Promise<unknown>) => fn }));
vi.mock("./client", () => ({
  getSpreadsheetId: () => "spreadsheet",
  getSheetsClient: () => ({
    spreadsheets: {
      values: {
        get: async ({ range }: { range: string }) => {
          sheet.reads++;
          return { data: { values: sheet.rows[range] ?? [] } };
        },
      },
    },
  }),
}));

const { getCachedCardsTab } = await import("./cached");

// Columns: id, name, alias, issuer, cardType, creditLimit, statementDay, dueDayBuffer, status, password, keywords, last4, color.
const goodCard = ["c1", "Regalia", "regalia", "HDFC-Bank", "Reward-Points", 300000, 16, 20, "Active", "", "", "4242", "Sapphire"];
// A blank credit limit, and a PDF password that must never reach a page.
const badCard = ["c2", "Coral", "coral", "ICICI-Bank", "Cashback", "", 13, 18, "Active", "FAKE-PDF-PASSWORD", "", "1111", "Ruby"];

beforeEach(() => {
  sheet.reads = 0;
  sheet.rows = { "Cards!A2:N": [goodCard, badCard] };
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("a cached tab", () => {
  it("gives the records and the skipped rows from one Sheets read", async () => {
    const tab = await getCachedCardsTab();
    expect(sheet.reads).toBe(1);
    expect(tab.records.map((c) => c.id)).toEqual(["c1"]);
    expect(tab.skipped).toEqual({ tab: "Cards", rows: [{ rowNumber: 3, problems: [{ field: "creditLimit", message: "is blank" }] }] });
  });

  it("keeps no cell of a skipped row, so its password can't reach a page", async () => {
    const tab = await getCachedCardsTab();
    expect(JSON.stringify(tab.skipped)).not.toContain("FAKE-PDF-PASSWORD");
    expect(Object.keys(tab.skipped.rows[0])).toEqual(["rowNumber", "problems"]);
  });
});
