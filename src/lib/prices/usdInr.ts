import "server-only";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/sheets/cached";

/**
 * Today's USD to INR rate (ADR 0012, PRD Q14): Frankfurter's latest rate, read through the same
 * kind of cache as the Sheet tabs (ADR 0005) and refreshed by the global Refresh button.
 *
 * A dollar account is counted in rupees at this rate and nowhere else. When it can't be had the
 * result says so, and the caller leaves the dollar account out of its totals and tells the user:
 * never a rate the app made up, and never an old one kept quietly.
 */
export type UsdInr = { ok: true; rate: number; date: string } | { ok: false; reason: string };

export const USD_INR_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR";

/** Frankfurter's body: `{ amount, base, date, rates: { INR } }`. Anything that isn't a positive, finite rate with a date is a failure. */
export function parseUsdInr(body: unknown): UsdInr {
  if (typeof body !== "object" || body === null) return { ok: false, reason: "the rate service sent something that isn't a rate" };
  const { rates, date } = body as { rates?: unknown; date?: unknown };
  const rate = typeof rates === "object" && rates !== null ? (rates as { INR?: unknown }).INR : undefined;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return { ok: false, reason: "the rate service sent no USD to INR rate" };
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, reason: "the rate service sent no date for the rate" };
  return { ok: true, rate, date };
}

/** A failure whose message is already plain language for the page; anything else (a network error, a timeout) becomes a generic reason. */
class RateError extends Error {}

/** One live read. Throws on a failure, so the cache below never keeps one. */
async function fetchUsdInr(): Promise<{ rate: number; date: string }> {
  const response = await fetch(USD_INR_URL, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new RateError(`the rate service answered ${response.status}`);
  const parsed = parseUsdInr(await response.json());
  if (!parsed.ok) throw new RateError(parsed.reason);
  return { rate: parsed.rate, date: parsed.date };
}

/** Cached for 12 hours (it is a daily rate) and tagged, so Refresh re-reads it. A throw isn't cached, so a failure is retried on the next read. */
const cachedRate = unstable_cache(fetchUsdInr, ["usdInr"], { tags: [CACHE_TAGS.usdInr], revalidate: 12 * 60 * 60 });

/** Today's rate, or why there isn't one. Callers only ask when a dollar account exists. */
export async function getUsdInr(): Promise<UsdInr> {
  try {
    return { ok: true, ...(await cachedRate()) };
  } catch (error) {
    return { ok: false, reason: error instanceof RateError ? error.message : "the rate service couldn't be reached" };
  }
}
