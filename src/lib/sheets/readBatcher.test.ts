import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ getSheetsClient: () => ({}), getSpreadsheetId: () => "spreadsheet" }));

const { createBatchReader, isBadRangeError, MAX_RANGES_PER_CALL } = await import("./readBatcher");

type Rows = unknown[][];

/** A reader over a fake Sheet, with a clock the test runs by hand. */
function setup(sheet: Record<string, Rows>, options: { manyFails?: unknown; badRanges?: string[] } = {}) {
  const calls: { kind: "many" | "one"; ranges: string[] }[] = [];
  let pending: (() => void) | null = null;
  const missing = (range: string) => Object.assign(new Error(`Unable to parse range: ${range}`), { code: 400 });
  const reader = createBatchReader(
    {
      readMany: async (ranges) => {
        calls.push({ kind: "many", ranges });
        if (options.manyFails) throw options.manyFails;
        const bad = ranges.find((r) => options.badRanges?.includes(r));
        if (bad) throw missing(bad);
        return ranges.map((r) => sheet[r] ?? []);
      },
      readOne: async (range) => {
        calls.push({ kind: "one", ranges: [range] });
        if (options.badRanges?.includes(range)) throw missing(range);
        return sheet[range] ?? [];
      },
      later: (flush) => {
        pending = flush;
      },
    },
    25,
  );
  const tick = () => {
    const flush = pending;
    pending = null;
    flush?.();
  };
  return { reader, calls, tick };
}

describe("a batch reader", () => {
  it("reads the ranges asked for in one window with one call, each caller getting its own rows", async () => {
    const { reader, calls, tick } = setup({ "A!A2:B": [["a1"]], "B!A2:C": [["b1"], ["b2"]], "C!A2:D": [] });
    const a = reader.read("A!A2:B");
    const b = reader.read("B!A2:C");
    const c = reader.read("C!A2:D");
    tick();
    expect(await a).toEqual([["a1"]]);
    expect(await b).toEqual([["b1"], ["b2"]]);
    expect(await c).toEqual([]);
    expect(calls).toEqual([{ kind: "many", ranges: ["A!A2:B", "B!A2:C", "C!A2:D"] }]);
  });

  it("reads a range asked for twice once, and hands each caller a separate array", async () => {
    const { reader, calls, tick } = setup({ "A!A2:B": [["a1"]], "B!A2:C": [["b1"]] });
    const first = reader.read("A!A2:B");
    const other = reader.read("B!A2:C");
    const second = reader.read("A!A2:B");
    tick();
    const [one, , two] = await Promise.all([first, other, second]);
    expect(calls).toHaveLength(1);
    expect(calls[0].ranges).toEqual(["A!A2:B", "B!A2:C"]);
    expect(one).toEqual(two);
    expect(one).not.toBe(two);
    expect(one[0]).not.toBe(two[0]); // the rows inside are separate too, so one reader editing a row can't change another's
  });

  it("uses a plain single read when only one range is asked for", async () => {
    const { reader, calls, tick } = setup({ "A!A2:B": [["a1"]] });
    const a = reader.read("A!A2:B");
    tick();
    expect(await a).toEqual([["a1"]]);
    expect(calls).toEqual([{ kind: "one", ranges: ["A!A2:B"] }]);
  });

  it("starts a new window for reads that arrive after a flush", async () => {
    const { reader, calls, tick } = setup({ "A!A2:B": [["a1"]], "B!A2:C": [["b1"]] });
    const a = reader.read("A!A2:B");
    tick();
    await a;
    const b = reader.read("B!A2:C");
    tick();
    await b;
    expect(calls.map((c) => c.ranges)).toEqual([["A!A2:B"], ["B!A2:C"]]);
  });

  it("when one range is refused as bad, halves the batch until it is alone and fails only that one", async () => {
    const sheet = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`T${i}!A2:B`, [[`row ${i}`]]]));
    const { reader, calls, tick } = setup(sheet, { badRanges: ["Gone!A2:C"] });
    const ranges = ["T0!A2:B", "T1!A2:B", "T2!A2:B", "Gone!A2:C", "T3!A2:B", "T4!A2:B", "T5!A2:B", "T6!A2:B", "T7!A2:B"];
    const reads = ranges.map((r) => reader.read(r));
    tick();
    const settled = await Promise.allSettled(reads);
    settled.forEach((result, index) => {
      if (ranges[index] === "Gone!A2:C") {
        expect(result.status).toBe("rejected");
        expect((result as PromiseRejectedResult).reason.message).toContain("Gone!A2:C");
      } else {
        expect(result).toMatchObject({ status: "fulfilled", value: [[`row ${ranges[index].slice(1, 2)}`]] });
      }
    });
    // 9 ranges: not 1 + 9 calls. The bad one is found by halving, and the good ones are never re-read one at a time.
    expect(calls.length).toBeLessThan(9);
    expect(calls.filter((c) => c.kind === "one").some((c) => c.ranges[0] === "Gone!A2:C")).toBe(true);
  });

  it("fails every caller with the same error on a quota refusal, without re-asking as separate calls", async () => {
    const quota = Object.assign(new Error("Quota exceeded"), { code: 429 });
    const { reader, calls, tick } = setup({}, { manyFails: quota });
    const a = reader.read("A!A2:B");
    const b = reader.read("B!A2:C");
    tick();
    const settled = await Promise.allSettled([a, b]);
    expect(settled.map((s) => s.status)).toEqual(["rejected", "rejected"]);
    expect((settled[0] as PromiseRejectedResult).reason).toBe(quota);
    expect(calls).toHaveLength(1);
  });

  it("fails every caller on a timeout, without re-asking", async () => {
    const timeout = Object.assign(new Error("The operation was aborted"), { name: "AbortError" });
    const { reader, calls, tick } = setup({}, { manyFails: timeout });
    const a = reader.read("A!A2:B");
    const b = reader.read("B!A2:C");
    tick();
    await expect(Promise.all([a, b])).rejects.toBe(timeout);
    expect(calls).toHaveLength(1);
  });

  it("splits a very large window into calls of at most the limit, started together", async () => {
    const ranges = Array.from({ length: MAX_RANGES_PER_CALL + 5 }, (_, i) => `T${i}!A2:B`);
    const { reader, calls, tick } = setup(Object.fromEntries(ranges.map((r) => [r, [[r]]])));
    const reads = ranges.map((r) => reader.read(r));
    tick();
    const rows = await Promise.all(reads);
    expect(rows.map((r) => r[0][0])).toEqual(ranges);
    expect(calls.map((c) => c.ranges.length)).toEqual([MAX_RANGES_PER_CALL, 5]);
  });

  it("reads a range that is missing from the answer's count one by one rather than trusting a short answer", async () => {
    let pending: (() => void) | null = null;
    const readOne = vi.fn(async (range: string) => [[`own ${range}`]]);
    const reader = createBatchReader({ readMany: async () => [[["only one"]]], readOne, later: (flush) => (pending = flush) }, 25);
    const a = reader.read("A!A2:B");
    const b = reader.read("B!A2:C");
    (pending as unknown as () => void)();
    expect(await a).toEqual([["own A!A2:B"]]);
    expect(await b).toEqual([["own B!A2:C"]]);
  });
});

describe("isBadRangeError", () => {
  it("is true for Google's 400 and 404 however the library spells them, and false for a quota refusal or a timeout", () => {
    expect(isBadRangeError({ code: 400 })).toBe(true);
    expect(isBadRangeError({ code: "400" })).toBe(true);
    expect(isBadRangeError({ status: 404 })).toBe(true);
    expect(isBadRangeError({ response: { status: 400 } })).toBe(true);
    expect(isBadRangeError({ code: 429 })).toBe(false);
    expect(isBadRangeError({ name: "AbortError" })).toBe(false);
    expect(isBadRangeError(new Error("boom"))).toBe(false);
    expect(isBadRangeError(null)).toBe(false);
  });
});
