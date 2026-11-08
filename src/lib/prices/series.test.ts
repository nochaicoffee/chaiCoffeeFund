import { beforeEach, describe, expect, it, vi } from "vitest";

/** The PriceSnapshots tab as the repository lists it, and every list() asked for (each one a Sheets read). */
const tab = vi.hoisted(() => ({
  rows: [] as { ticker: string; date: string; close: number }[],
  reads: 0,
  /** When set, the next list() waits until this is called, so a test can hold a read open. */
  hold: null as null | ((release: () => void) => void),
  fail: false,
}));

vi.mock("@/lib/sheets/priceSnapshots", () => ({
  priceSnapshotsRepository: {
    list: async () => {
      tab.reads++;
      const rows = tab.rows.map((r) => ({ ...r }));
      if (tab.hold) {
        const hold = tab.hold;
        tab.hold = null;
        await new Promise<void>((release) => hold(release));
      }
      if (tab.fail) throw new Error("Sheets is down");
      return rows;
    },
  },
}));

const { getPriceSeries, invalidatePriceSeries, FRESH_MS, STALE_MS, RETRY_AFTER_FAILURE_MS } = await import("./series");

const T0 = 1_800_000_000_000;
const closesOf = (series: Map<string, { date: string; close: number }[]>, ticker: string) => series.get(ticker)?.map((p) => p.close);
/** Lets a background read finish. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  invalidatePriceSeries();
  tab.rows = [
    { ticker: "NTAP", date: "2026-11-03", close: 102 },
    { ticker: "NTAP", date: "2026-11-02", close: 101 },
    { ticker: "AMD", date: "2026-11-02", close: 250 },
  ];
  tab.reads = 0;
  tab.hold = null;
  tab.fail = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getPriceSeries", () => {
  it("groups the closes by ticker, oldest first", async () => {
    const series = await getPriceSeries(T0);
    expect(closesOf(series, "NTAP")).toEqual([101, 102]);
    expect(closesOf(series, "AMD")).toEqual([250]);
  });

  it("reads the tab once while the copy is fresh", async () => {
    await getPriceSeries(T0);
    await getPriceSeries(T0 + FRESH_MS - 1);
    expect(tab.reads).toBe(1);
  });

  it("past five minutes, shows the old copy at once and reads a new one in the background", async () => {
    await getPriceSeries(T0);
    tab.rows.push({ ticker: "NTAP", date: "2026-11-04", close: 103 });
    const stale = await getPriceSeries(T0 + FRESH_MS);
    expect(closesOf(stale, "NTAP")).toEqual([101, 102]);
    await settle();
    expect(tab.reads).toBe(2);
    expect(closesOf(await getPriceSeries(T0 + FRESH_MS + 1), "NTAP")).toEqual([101, 102, 103]);
    expect(tab.reads).toBe(2);
  });

  it("past an hour, waits for a new read rather than show closes that old", async () => {
    await getPriceSeries(T0);
    tab.rows.push({ ticker: "NTAP", date: "2026-11-04", close: 103 });
    expect(closesOf(await getPriceSeries(T0 + STALE_MS), "NTAP")).toEqual([101, 102, 103]);
  });

  it("keeps the old copy when the background read fails, and waits a minute before trying again", async () => {
    await getPriceSeries(T0);
    tab.fail = true;
    expect(closesOf(await getPriceSeries(T0 + FRESH_MS), "NTAP")).toEqual([101, 102]);
    await settle();
    expect(console.error).toHaveBeenCalled();
    tab.fail = false;
    expect(closesOf(await getPriceSeries(T0 + FRESH_MS + RETRY_AFTER_FAILURE_MS - 1), "NTAP")).toEqual([101, 102]);
    await settle();
    expect(tab.reads).toBe(2);
    await getPriceSeries(T0 + FRESH_MS + RETRY_AFTER_FAILURE_MS);
    await settle();
    expect(tab.reads).toBe(3);
  });

  it("gives pages asking at the same time one read", async () => {
    const [a, b] = await Promise.all([getPriceSeries(T0), getPriceSeries(T0)]);
    expect(tab.reads).toBe(1);
    expect(a).toBe(b);
  });

  it("fails a page that has no copy to fall back on when the read fails", async () => {
    tab.fail = true;
    await expect(getPriceSeries(T0)).rejects.toThrow("Sheets is down");
    tab.fail = false;
    expect(closesOf(await getPriceSeries(T0), "NTAP")).toEqual([101, 102]);
  });

  it("after a price refresh drops the copy, never keeps closes from a read that started before it", async () => {
    let release = () => {};
    tab.hold = (r) => (release = r);
    const before = getPriceSeries(T0);
    await settle();
    invalidatePriceSeries();
    tab.rows.push({ ticker: "NTAP", date: "2026-11-04", close: 103 });
    const after = getPriceSeries(T0);
    release();
    expect(closesOf(await before, "NTAP")).toEqual([101, 102]);
    expect(closesOf(await after, "NTAP")).toEqual([101, 102, 103]);
    // The copy kept is the one read after the refresh.
    expect(closesOf(await getPriceSeries(T0 + 1), "NTAP")).toEqual([101, 102, 103]);
    expect(tab.reads).toBe(2);
  });
});
