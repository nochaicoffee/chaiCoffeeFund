import { beforeEach, describe, expect, it, vi } from "vitest";

/** How the Sheets were called: each call's kind and ranges. */
const sheet = vi.hoisted(() => ({ calls: [] as { kind: "get" | "batchGet"; ranges: string[] }[] }));

vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({
  getSpreadsheetId: () => "spreadsheet",
  getSheetsClient: () => ({
    spreadsheets: {
      values: {
        get: async ({ range }: { range: string }) => {
          sheet.calls.push({ kind: "get", ranges: [range] });
          return { data: { values: range.startsWith("Cards") ? [] : undefined } };
        },
        batchGet: async ({ ranges }: { ranges: string[] }) => {
          sheet.calls.push({ kind: "batchGet", ranges });
          // An empty range comes back without a `values` field, as Google does it.
          return { data: { valueRanges: ranges.map(() => ({})) } };
        },
      },
    },
  }),
}));

const { cardsRepository } = await import("./cards");
const { goalsRepository } = await import("./goals");
const { priceSnapshotsRepository } = await import("./priceSnapshots");

beforeEach(() => {
  sheet.calls = [];
});

describe("how a repository reads", () => {
  it("joins the reads of different tabs started together into one batchGet, empty tabs coming back as no rows", async () => {
    const [cards, goals] = await Promise.all([cardsRepository.readAll(), goalsRepository.readAll()]);
    expect(cards.records).toEqual([]);
    expect(goals.records).toEqual([]);
    expect(sheet.calls).toHaveLength(1);
    expect(sheet.calls[0].kind).toBe("batchGet");
    expect(sheet.calls[0].ranges.map((r) => r.split("!")[0]).sort()).toEqual(["Cards", "Goals"]);
  });

  it("reads PriceSnapshots on its own, never in a batch, even when read beside another tab", async () => {
    await Promise.all([priceSnapshotsRepository.readAll(), cardsRepository.readAll(), goalsRepository.readAll()]);
    const price = sheet.calls.filter((c) => c.ranges.some((r) => r.startsWith("PriceSnapshots")));
    expect(price).toEqual([{ kind: "get", ranges: [expect.stringMatching(/^PriceSnapshots!/)] }]);
    const batch = sheet.calls.find((c) => c.kind === "batchGet");
    expect(batch?.ranges.some((r) => r.startsWith("PriceSnapshots"))).toBe(false);
  });

  it("reads for a write on their own, so two writes begun together don't act on one shared snapshot", async () => {
    await Promise.all([cardsRepository.remove("a"), goalsRepository.remove("b"), cardsRepository.remove("c")]);
    expect(sheet.calls.every((c) => c.kind === "get")).toBe(true);
    expect(sheet.calls).toHaveLength(3);
  });
});
