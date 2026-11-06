import "server-only";
import { priceSnapshotsRepository } from "@/lib/sheets/priceSnapshots";
import type { PricePoint } from "./history";

/**
 * The saved closes, by ticker, oldest first. Read through a small in-memory copy instead of
 * `unstable_cache` like the other tabs: a five-year backfill of 24 tickers is about 30,000 rows,
 * and Next's data cache refuses an entry over 2 MB. The copy lives five minutes and the refresh
 * drops it, so a new close shows at once.
 */
const TTL_MS = 5 * 60 * 1000;
let copy: { at: number; byTicker: Map<string, PricePoint[]> } | null = null;

export function invalidatePriceSeries(): void {
  copy = null;
}

export async function getPriceSeries(now: number = Date.now()): Promise<Map<string, PricePoint[]>> {
  if (copy && now - copy.at < TTL_MS) return copy.byTicker;
  const byTicker = new Map<string, PricePoint[]>();
  for (const row of await priceSnapshotsRepository.list()) {
    const points = byTicker.get(row.ticker) ?? [];
    points.push({ date: row.date, close: row.close });
    byTicker.set(row.ticker, points);
  }
  for (const points of byTicker.values()) points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  copy = { at: now, byTicker };
  return byTicker;
}
