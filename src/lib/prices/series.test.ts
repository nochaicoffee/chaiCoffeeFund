import { beforeEach, describe, expect, it, vi } from "vitest";

const repo = vi.hoisted(() => ({ reads: 0, rows: [] as { ticker: string; date: string; close: number }[], fail: false, gate: null as null | Promise<void> }));

vi.mock("server-only", () => ({}));
// unstable_cache needs a Next runtime; here it just runs the read, so each call is one Sheets read.
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => Promise<unknown>) => fn }));
vi.mock("@/lib/sheets/priceSnapshots", () => ({
  priceSnapshotsRepository: {
    list: async () => {
      repo.reads++;
      const rows = repo.rows; // what the Sheet held when the read began
      if (repo.gate) await repo.gate;
      if (repo.fail) throw new Error("Sheets is down");
      return rows;
    },
  },
}));
vi.mock("@/lib/sheets/cached", () => ({ CACHE_TAGS: { priceSnapshots: "priceSnapshots" } }));

const { compactSeries, expandSeries, getPriceSeries, invalidatePriceSeries } = await import("./series");

beforeEach(() => {
  invalidatePriceSeries();
  repo.reads = 0;
  repo.fail = false;
  repo.gate = null;
  repo.rows = [
    { ticker: "AAA", date: "2026-01-03", close: 12 },
    { ticker: "BBB", date: "2026-01-02", close: 50 },
    { ticker: "AAA", date: "2026-01-02", close: 10 },
  ];
});

describe("the compact form", () => {
  it("groups by ticker, oldest first, and expands back to the same points", () => {
    const compact = compactSeries(repo.rows);
    expect(compact).toEqual([
      ["AAA", [["2026-01-02", 10], ["2026-01-03", 12]]],
      ["BBB", [["2026-01-02", 50]]],
    ]);
    expect(expandSeries(compact).get("AAA")).toEqual([
      { date: "2026-01-02", close: 10 },
      { date: "2026-01-03", close: 12 },
    ]);
  });

  it("survives the JSON round trip the data cache puts it through", () => {
    const compact = compactSeries(repo.rows);
    expect(expandSeries(JSON.parse(JSON.stringify(compact)))).toEqual(expandSeries(compact));
  });
});

describe("getPriceSeries", () => {
  it("shares one read between callers that arrive while it is running", async () => {
    let release!: () => void;
    repo.gate = new Promise<void>((resolve) => (release = resolve));
    const first = getPriceSeries();
    const second = getPriceSeries();
    release();
    const [a, b] = await Promise.all([first, second]);
    expect(repo.reads).toBe(1);
    expect(a).toBe(b);
  });

  it("keeps the copy for five minutes, then reads again", async () => {
    await getPriceSeries(1_000);
    await getPriceSeries(1_000 + 4 * 60_000);
    expect(repo.reads).toBe(1);
    await getPriceSeries(1_000 + 5 * 60_000);
    expect(repo.reads).toBe(2);
  });

  it("reads again after an invalidation", async () => {
    await getPriceSeries(1_000);
    invalidatePriceSeries();
    await getPriceSeries(2_000);
    expect(repo.reads).toBe(2);
  });

  it("does not keep a read that began before an invalidation", async () => {
    let release!: () => void;
    repo.gate = new Promise<void>((resolve) => (release = resolve));
    const old = getPriceSeries(1_000);
    invalidatePriceSeries(); // a refresh saved new closes while that read was running
    repo.gate = null;
    repo.rows = [{ ticker: "AAA", date: "2026-01-04", close: 99 }];
    release();
    await old;
    const fresh = await getPriceSeries(1_500);
    expect(fresh.get("AAA")).toEqual([{ date: "2026-01-04", close: 99 }]);
  });

  it("does not keep a failed read: the next call tries again", async () => {
    repo.fail = true;
    await expect(getPriceSeries()).rejects.toThrow("Sheets is down");
    repo.fail = false;
    const series = await getPriceSeries();
    expect(series.size).toBe(2);
    expect(repo.reads).toBe(2);
  });
});
