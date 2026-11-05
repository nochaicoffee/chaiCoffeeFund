/**
 * Reading Frankfurter's USD to INR answer. Pure (no `server-only`, no cache), so the scripts can
 * use it too; `usdInr.ts` adds today's cached rate on top.
 */
export type UsdInr = { ok: true; rate: number; date: string } | { ok: false; reason: string };

/** Frankfurter's body: `{ amount, base, date, rates: { INR } }`. Anything that isn't a positive, finite rate with a date is a failure. */
export function parseUsdInr(body: unknown): UsdInr {
  if (typeof body !== "object" || body === null) return { ok: false, reason: "the rate service sent something that isn't a rate" };
  const { rates, date } = body as { rates?: unknown; date?: unknown };
  const rate = typeof rates === "object" && rates !== null ? (rates as { INR?: unknown }).INR : undefined;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return { ok: false, reason: "the rate service sent no USD to INR rate" };
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, reason: "the rate service sent no date for the rate" };
  return { ok: true, rate, date };
}

/** A weekend or holiday has no rate of its own: Frankfurter answers with the last working day before it. More than this many days back is not that, it is a gap. */
export const MAX_RATE_AGE_DAYS = 7;

export function usdInrOnUrl(date: string): string {
  return `https://api.frankfurter.dev/v1/${date}?base=USD&symbols=INR`;
}

function daysBetween(earlier: string, later: string): number {
  return Math.round((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86_400_000);
}

/**
 * The rate that applies on `asked`. Frankfurter's answer is the rate of the last working day on
 * or before it, so the answer's own date can be earlier, never later and never far back.
 */
export function parseUsdInrOn(body: unknown, asked: string): UsdInr {
  const parsed = parseUsdInr(body);
  if (!parsed.ok) return parsed;
  const age = daysBetween(parsed.date, asked);
  if (age < 0) return { ok: false, reason: `the rate service answered for ${parsed.date}, after the day asked (${asked})` };
  if (age > MAX_RATE_AGE_DAYS) return { ok: false, reason: `the rate service has no rate within ${MAX_RATE_AGE_DAYS} days of ${asked}` };
  return parsed;
}
