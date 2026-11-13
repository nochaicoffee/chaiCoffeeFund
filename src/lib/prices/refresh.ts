import "server-only";
import { revalidateTag } from "next/cache";
import { instrumentsRepository } from "@/lib/sheets/instruments";
import { investmentTransactionsRepository } from "@/lib/sheets/investmentTransactions";
import { priceSnapshotsRepository } from "@/lib/sheets/priceSnapshots";
import { CACHE_TAGS } from "@/lib/sheets/cached";
import {
  AMFI_NAV_URL, frankfurterRangeUrl, parseAmfiNavAll, parseFrankfurterRange, parseYahooChart, yahooChartUrl,
  type PricePoint, type PriceSeries,
} from "./history";
import { priceDrift, refreshJobs, snapshotsToAdd, yahooRangeFor, type NewSnapshot, type TickerJob } from "./refreshPlan";
import { invalidatePriceSeries } from "./series";

export interface TickerReport {
  ticker: string;
  source: string;
  /** Days the source returned that are wanted (from the job's first day). */
  fetched: number;
  added: number;
  /** Why this ticker was left as it was, in plain words. The other tickers are unaffected. */
  error?: string;
  /** Days the source now prices differently from what was saved (a split, usually). Saved days are left as they were. */
  drift?: { days: number; worst: number; firstDay: string };
}

/** Thrown when a refresh is asked for while another is running: two at once would both save the same missing days. */
export class RefreshBusyError extends Error {}
let running = false;

const FETCH_TIMEOUT_MS = 20_000;
const CONCURRENCY = 4;
const WRITE_CHUNK = 2_000;
const USER_AGENT = { "User-Agent": "Mozilla/5.0" };

/** One source answer as a series, or why not. A network error becomes a reason rather than a throw. */
async function fetchSeries(job: TickerJob, today: string, amfi: () => Promise<PriceSeries | { ok: true; byCode: Map<string, { nav: number; date: string }> } | { ok: false; reason: string }>): Promise<PriceSeries> {
  try {
    if (job.source === "Yahoo") {
      const response = await fetch(yahooChartUrl(job.ticker, yahooRangeFor(job.from, today)), { headers: USER_AGENT, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" });
      if (!response.ok) return { ok: false, reason: `Yahoo answered ${response.status}` };
      const series = parseYahooChart(await response.json());
      if (series.ok && series.currency !== job.currency) return { ok: false, reason: `Yahoo prices ${job.ticker} in ${series.currency}, not ${job.currency}` };
      return series;
    }
    if (job.source === "Frankfurter") {
      const response = await fetch(frankfurterRangeUrl(job.from, today), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" });
      if (!response.ok) return { ok: false, reason: `Frankfurter answered ${response.status}` };
      return parseFrankfurterRange(await response.json());
    }
    const nav = await amfi();
    if (!("byCode" in nav)) return { ok: false, reason: "reason" in nav ? nav.reason : "AMFI sent nothing usable" };
    const scheme = nav.byCode.get(job.ticker);
    return scheme ? { ok: true, currency: "INR", points: [{ date: scheme.date, close: scheme.nav }] } : { ok: false, reason: `AMFI has no scheme ${job.ticker}` };
  } catch (error) {
    return { ok: false, reason: error instanceof Error && error.name === "TimeoutError" ? "the source took too long" : "the source couldn't be reached" };
  }
}

async function inBatches<T, R>(items: T[], size: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(run))));
  return out;
}

/**
 * Brings every price in PriceSnapshots up to date (ADR 0013): for each instrument, the two
 * indices and USD to INR, fetch the source and save the days not saved yet. A saved day is never
 * overwritten. A source that is down leaves its ticker as it was and says why; the others are
 * saved. `dryRun` reports what would be saved without writing.
 */
export async function refreshPrices(options: { today: string; dryRun?: boolean }): Promise<TickerReport[]> {
  if (running) throw new RefreshBusyError("A price refresh is already running");
  running = true;
  try {
    return await runRefresh(options);
  } finally {
    running = false;
  }
}

async function runRefresh(options: { today: string; dryRun?: boolean }): Promise<TickerReport[]> {
  const [instruments, trades, saved] = await Promise.all([instrumentsRepository.list(), investmentTransactionsRepository.list(), priceSnapshotsRepository.list()]);
  const savedCloses = new Map<string, Map<string, number>>();
  for (const row of saved) {
    const closes = savedCloses.get(row.ticker) ?? new Map<string, number>();
    closes.set(row.date, row.close);
    savedCloses.set(row.ticker, closes);
  }
  const jobs = refreshJobs(instruments, trades, options.today);

  let amfiOnce: ReturnType<typeof getAmfi> | null = null;
  async function getAmfi() {
    const response = await fetch(AMFI_NAV_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" });
    if (!response.ok) return { ok: false as const, reason: `AMFI answered ${response.status}` };
    return parseAmfiNavAll(await response.text());
  }
  const amfi = () => (amfiOnce ??= getAmfi().catch(() => ({ ok: false as const, reason: "AMFI couldn't be reached" })));

  const results = await inBatches(jobs, CONCURRENCY, async (job) => {
    const series = await fetchSeries(job, options.today, amfi);
    if (!series.ok) return { job, report: { ticker: job.ticker, source: job.source, fetched: 0, added: 0, error: series.reason } as TickerReport, rows: [] as NewSnapshot[] };
    const wanted: PricePoint[] = series.points.filter((p) => p.date >= job.from);
    const closes = savedCloses.get(job.ticker) ?? new Map<string, number>();
    const rows = snapshotsToAdd(job, series.points, new Set(closes.keys()));
    const drift = priceDrift(wanted, closes);
    const report: TickerReport = { ticker: job.ticker, source: job.source, fetched: wanted.length, added: rows.length };
    if (drift.days > 0 && drift.firstDay) report.drift = { days: drift.days, worst: drift.worst, firstDay: drift.firstDay };
    return { job, report, rows };
  });

  const allRows = results.flatMap((r) => r.rows);
  if (!options.dryRun && allRows.length > 0) {
    try {
      // One tab, so one write at a time (concurrent writes to a tab race).
      for (let i = 0; i < allRows.length; i += WRITE_CHUNK) await priceSnapshotsRepository.createMany(allRows.slice(i, i + WRITE_CHUNK));
    } finally {
      // Even when a later chunk fails (the quota, say): the earlier chunks are saved, and the page that redraws next must show them.
      revalidateTag(CACHE_TAGS.priceSnapshots, "max");
      invalidatePriceSeries();
    }
  }
  return results.map((r) => r.report);
}
