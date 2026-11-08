import { beforeEach, describe, expect, it, vi } from "vitest";

/** A fake Sheets: each range's rows, ranges that don't exist, and every request it was sent. */
const sheet = vi.hoisted(() => ({
  rows: {} as Record<string, unknown[][]>,
  missing: new Set<string>(),
  /** Set to make every batchGet fail with this error. */
  batchError: null as unknown,
  batches: [] as string[][],
  singles: [] as string[],
  options: [] as Record<string, unknown>[],
}));

const badRange = (range: string) => Object.assign(new Error(`Unable to parse range: ${range}`), { status: 400 });

vi.mock("./client", () => ({
  getSpreadsheetId: () => "spreadsheet",
  getSheetsClient: () => ({
    spreadsheets: {
      values: {
        batchGet: async (params: { ranges: string[] } & Record<string, unknown>) => {
          sheet.batches.push(params.ranges);
          sheet.options.push(params);
          if (sheet.batchError) throw sheet.batchError;
          const bad = params.ranges.find((r) => sheet.missing.has(r));
          if (bad) throw badRange(bad);
          return { data: { valueRanges: params.ranges.map((range) => ({ range, values: sheet.rows[range] })) } };
        },
        get: async ({ range }: { range: string }) => {
          sheet.singles.push(range);
          if (sheet.missing.has(range)) throw badRange(range);
          return { data: { values: sheet.rows[range] } };
        },
      },
    },
  }),
}));

const { readRange, MAX_RANGES_PER_BATCH, READ_BATCH_WINDOW_MS } = await import("./batchedReads");

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  sheet.rows = { "A!A2:C": [["a1"], ["a2"]], "B!A2:D": [["b1"]] };
  sheet.missing = new Set();
  sheet.batchError = null;
  sheet.batches = [];
  sheet.singles = [];
  sheet.options = [];
});

describe("readRange", () => {
  it("sends reads asked for together as one request, each getting its own rows", async () => {
    const [a, b, c] = await Promise.all([readRange("A!A2:C"), readRange("B!A2:D"), readRange("C!A2:B")]);
    expect(sheet.batches).toEqual([["A!A2:C", "B!A2:D", "C!A2:B"]]);
    expect(a).toEqual([["a1"], ["a2"]]);
    expect(b).toEqual([["b1"]]);
    expect(c).toEqual([]); // An empty tab comes back with no values at all.
  });

  it("joins reads that arrive a few milliseconds apart, as a page's cache lookups do", async () => {
    const a = readRange("A!A2:C");
    await wait(READ_BATCH_WINDOW_MS / 2);
    const b = readRange("B!A2:D");
    await Promise.all([a, b]);
    expect(sheet.batches).toEqual([["A!A2:C", "B!A2:D"]]);
  });

  it("reads a range asked for twice in the same window once", async () => {
    const [first, second] = await Promise.all([readRange("A!A2:C"), readRange("A!A2:C")]);
    expect(sheet.batches).toEqual([["A!A2:C"]]);
    expect(first).toEqual(second);
  });

  it("reads again for a read asked for after the batch went out, so it never gets rows from before a write", async () => {
    await readRange("A!A2:C");
    sheet.rows["A!A2:C"] = [["a1"], ["a2"], ["a3"]];
    expect(await readRange("A!A2:C")).toEqual([["a1"], ["a2"], ["a3"]]);
    expect(sheet.batches).toEqual([["A!A2:C"], ["A!A2:C"]]);
  });

  it("reads raw values and date serials, as rowReading expects", async () => {
    await readRange("A!A2:C");
    expect(sheet.options[0]).toMatchObject({ spreadsheetId: "spreadsheet", valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "SERIAL_NUMBER" });
  });

  it("sends a full batch at once rather than waiting", async () => {
    const ranges = Array.from({ length: MAX_RANGES_PER_BATCH + 1 }, (_, i) => `T${i}!A2:B`);
    const reads = ranges.map((r) => readRange(r));
    expect(sheet.batches).toEqual([ranges.slice(0, MAX_RANGES_PER_BATCH)]);
    await Promise.all(reads);
    expect(sheet.batches).toEqual([ranges.slice(0, MAX_RANGES_PER_BATCH), ranges.slice(MAX_RANGES_PER_BATCH)]);
  });

  it("when one tab is missing, reads each range on its own so only that read fails", async () => {
    sheet.missing.add("Gone!A2:C");
    const results = await Promise.allSettled([readRange("A!A2:C"), readRange("Gone!A2:C"), readRange("B!A2:D")]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
    expect(results[0]).toMatchObject({ value: [["a1"], ["a2"]] });
    expect(results[1]).toMatchObject({ reason: { status: 400 } });
    expect(sheet.singles.sort()).toEqual(["A!A2:C", "B!A2:D", "Gone!A2:C"]);
  });

  it("when the quota is used up, fails every read without asking again one by one", async () => {
    sheet.batchError = Object.assign(new Error("Quota exceeded for quota metric 'Read requests'"), { status: 429 });
    const results = await Promise.allSettled([readRange("A!A2:C"), readRange("B!A2:D")]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect(sheet.singles).toEqual([]);
  });

  it("when Sheets doesn't answer in time, reads each range on its own so one slow tab can't fail the rest", async () => {
    sheet.batchError = Object.assign(new Error("The operation was aborted."), { name: "AbortError" });
    const results = await Promise.allSettled([readRange("A!A2:C"), readRange("B!A2:D")]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "fulfilled"]);
    expect(sheet.singles.sort()).toEqual(["A!A2:C", "B!A2:D"]);
  });

  it("when Google is down, fails every read without spending the quota on one request per range", async () => {
    sheet.batchError = Object.assign(new Error("The service is currently unavailable."), { status: 503 });
    const results = await Promise.allSettled([readRange("A!A2:C"), readRange("B!A2:D")]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect(sheet.singles).toEqual([]);
  });

  it("waits only a short window", () => {
    expect(READ_BATCH_WINDOW_MS).toBeLessThanOrEqual(50);
  });
});
