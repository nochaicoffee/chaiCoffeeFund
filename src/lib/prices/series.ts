import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import { priceSnapshotsRepository } from "@/lib/sheets/priceSnapshots";
import type { PricePoint } from "./history";

/**
 * The saved closes, by ticker, oldest first. Three layers, because the tab is big (10,000 rows today, a Sheets read of 1.3 to 1.8 seconds):
 *
 * 1. A small in-memory copy that lives five minutes in each server instance.
 * 2. Next's data cache, shared by every instance, holding a compact form ([date, close] pairs per ticker, about 20 bytes a row, so a
 *    30,000-row backfill is well under the 2 MB an entry may hold; the raw rows were over it, which is why this tab can't go through
 *    cachedTab). A fresh instance reads it from there instead of from the Sheet. If an entry ever is refused, the read falls back to the Sheet.
 * 3. The Sheet.
 *
 * Callers that arrive while a read is still running share it (the Overview asked twice at once and paid for two reads). The refresh drops
 * the memory copy and, through the tag, the shared one, so a new close shows at once.
 */
const TTL_MS = 5 * 60 * 1000;
const REVALIDATE_SECONDS = 60 * 60;

type CompactSeries = [ticker: string, points: [date: string, close: number][]][];

let copy: { at: number; byTicker: Map<string, PricePoint[]> } | null = null;
let inFlight: Promise<Map<string, PricePoint[]>> | null = null;
/** Bumped by every invalidation, so a read that began before it is never kept as the current copy. */
let generation = 0;

export function invalidatePriceSeries(): void {
  generation++;
  copy = null;
  inFlight = null;
}

/** The closes grouped by ticker and sorted by date, in the form the data cache keeps. Pure, so it is tested. */
export function compactSeries(rows: { ticker: string; date: string; close: number }[]): CompactSeries {
  const byTicker = new Map<string, [string, number][]>();
  for (const row of rows) {
    const points = byTicker.get(row.ticker) ?? [];
    points.push([row.date, row.close]);
    byTicker.set(row.ticker, points);
  }
  for (const points of byTicker.values()) points.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return [...byTicker.entries()];
}

export function expandSeries(compact: CompactSeries): Map<string, PricePoint[]> {
  return new Map(compact.map(([ticker, points]) => [ticker, points.map(([date, close]) => ({ date, close }))]));
}

const readCompact = unstable_cache(async (): Promise<CompactSeries> => compactSeries(await priceSnapshotsRepository.list()), ["priceSeries"], {
  tags: [CACHE_TAGS.priceSnapshots],
  revalidate: REVALIDATE_SECONDS,
});

export async function getPriceSeries(now: number = Date.now()): Promise<Map<string, PricePoint[]>> {
  if (copy && now - copy.at < TTL_MS) return copy.byTicker;
  if (inFlight) return inFlight;
  const startedIn = generation;
  const read = readCompact()
    .then((compact) => {
      const byTicker = expandSeries(compact);
      if (generation === startedIn) copy = { at: now, byTicker };
      return byTicker;
    })
    .finally(() => {
      if (inFlight === read) inFlight = null;
    });
  inFlight = read;
  return read;
}
