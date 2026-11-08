import "server-only";
import { priceSnapshotsRepository } from "@/lib/sheets/priceSnapshots";
import type { PricePoint } from "./history";

/**
 * The saved closes, by ticker, oldest first. Read through a small in-memory copy instead of
 * `unstable_cache` like the other tabs: a five-year backfill of 24 tickers is about 30,000 rows,
 * and Next's data cache refuses an entry over 2 MB. The refresh drops the copy, so a new close shows at once.
 *
 * PriceSnapshots is the slowest tab to read (about 1.7 s for 10,000 rows), so a page never waits for it
 * just because the copy got old: past five minutes the old copy is still shown while a new one is read in
 * the background. Only past an hour, or with no copy at all, does a page wait. Pages asking at the same
 * time share one read.
 */
export const FRESH_MS = 5 * 60 * 1000;
export const STALE_MS = 60 * 60 * 1000;

type Series = Map<string, PricePoint[]>;
let copy: { at: number; byTicker: Series } | null = null;
let reading: Promise<Series> | null = null;
/** After a background read fails, the next waits this long, so a Sheets outage isn't met with a read on every page load. */
export const RETRY_AFTER_FAILURE_MS = 60 * 1000;
let backgroundFailedAt: number | null = null;
/** Goes up on every invalidate, so a read that started before one never saves its (older) closes as the copy. */
let generation = 0;

export function invalidatePriceSeries(): void {
  copy = null;
  reading = null;
  backgroundFailedAt = null;
  generation++;
}

export async function getPriceSeries(now: number = Date.now()): Promise<Series> {
  if (copy && now - copy.at < FRESH_MS) return copy.byTicker;
  if (copy && now - copy.at < STALE_MS) {
    if (backgroundFailedAt === null || now - backgroundFailedAt >= RETRY_AFTER_FAILURE_MS) {
      readSeries(now).catch((error) => {
        backgroundFailedAt = now;
        console.error("Prices: reading the saved closes in the background failed; the older copy is kept", error);
      });
    }
    return copy.byTicker;
  }
  return readSeries(now);
}

/** One read of the tab at a time: a caller while one is running gets that read. */
function readSeries(now: number): Promise<Series> {
  if (reading) return reading;
  const started = generation;
  const read: Promise<Series> = priceSnapshotsRepository
    .list()
    .then((rows) => {
      const byTicker: Series = new Map();
      for (const row of rows) {
        const points = byTicker.get(row.ticker) ?? [];
        points.push({ date: row.date, close: row.close });
        byTicker.set(row.ticker, points);
      }
      for (const points of byTicker.values()) points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      if (started === generation) {
        copy = { at: now, byTicker };
        backgroundFailedAt = null;
      }
      return byTicker;
    })
    .finally(() => {
      if (reading === read) reading = null;
    });
  reading = read;
  return read;
}
