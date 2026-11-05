/**
 * Reading prices from Yahoo's chart API and AMFI's NAV file (ADR 0013). Pure: building the URLs and
 * parsing what comes back, so it can be tested on saved samples. Fetching, saving to the
 * PriceSnapshots tab and what to do when a source is down live elsewhere (#314).
 */

/** One day's closing price in the instrument's own currency. */
export interface PricePoint {
  /** An ISO day, on the exchange's own calendar. */
  date: string;
  close: number;
}

export type PriceSeries = { ok: true; currency: string; points: PricePoint[] } | { ok: false; reason: string };

export type YahooRange = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "10y" | "max";

/** The chart URL for daily closes. A ticker is `NTAP`, `NIFTYBEES.NS`, `^NSEI` or `USDINR=X`. */
export function yahooChartUrl(ticker: string, range: YahooRange = "5y"): string {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=1d`;
}

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/**
 * Yahoo's chart answer as daily closes, oldest first. A day with no close (today's, while the
 * market is open, comes back as null) is left out rather than treated as 0 or carried forward, and a
 * close of zero or below is refused as a bad price. A day is the exchange's own (the timestamp
 * moved by the exchange's UTC offset), so an NSE day is India's and a US day is New York's.
 */
export function parseYahooChart(body: unknown): PriceSeries {
  if (typeof body !== "object" || body === null) return { ok: false, reason: "Yahoo sent something that isn't a chart" };
  const chart = (body as { chart?: { result?: unknown; error?: { description?: unknown } | null } }).chart;
  if (!chart) return { ok: false, reason: "Yahoo sent no chart" };
  if (chart.error) return { ok: false, reason: typeof chart.error.description === "string" ? `Yahoo said: ${chart.error.description}` : "Yahoo reported an error" };
  const result = Array.isArray(chart.result) ? (chart.result[0] as Record<string, unknown> | undefined) : undefined;
  if (!result) return { ok: false, reason: "Yahoo sent no result for this ticker" };

  const meta = (result.meta ?? {}) as { currency?: unknown; gmtoffset?: unknown };
  if (typeof meta.currency !== "string" || meta.currency === "") return { ok: false, reason: "Yahoo sent no currency" };
  const offset = isNumber(meta.gmtoffset) ? meta.gmtoffset : 0;
  const timestamps = result.timestamp;
  const closes = ((result.indicators as { quote?: { close?: unknown }[] } | undefined)?.quote?.[0]?.close ?? undefined) as unknown;
  if (timestamps === undefined || closes === undefined) return { ok: true, currency: meta.currency, points: [] };
  if (!Array.isArray(timestamps) || !Array.isArray(closes) || timestamps.length !== closes.length) return { ok: false, reason: "Yahoo's days and prices don't line up" };

  const points: PricePoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const seconds = timestamps[i];
    const close = closes[i];
    if (!isNumber(seconds)) return { ok: false, reason: "Yahoo sent a day that isn't a time" };
    if (close === null || close === undefined) continue;
    if (!isNumber(close) || close <= 0) return { ok: false, reason: `Yahoo sent a price that isn't one (${String(close)})` };
    const date = new Date((seconds + offset) * 1000).toISOString().slice(0, 10);
    points.push({ date, close });
  }
  // Oldest first whatever order they came in, and a day that came twice (a late correction) keeps the later close.
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const deduped = points.filter((point, i) => i === points.length - 1 || points[i + 1].date !== point.date);
  return { ok: true, currency: meta.currency, points: deduped };
}

export const AMFI_NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt";

export interface AmfiNav {
  code: string;
  name: string;
  nav: number;
  /** An ISO day. */
  date: string;
}

const MONTHS: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

/** "05-Nov-2026" → "2026-11-05", or null. */
function readAmfiDate(raw: string): string | null {
  const match = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(raw.trim());
  const month = match ? MONTHS[match[2]] : undefined;
  return match && month ? `${match[3]}-${month}-${match[1]}` : null;
}

/**
 * AMFI's NAVAll.txt: a header, then category lines and one `;`-separated line per scheme (code,
 * two ISINs, name, plan, option, NAV, date). A scheme with no NAV ("N.A.") or a line that doesn't
 * read is left out. The answer is today's NAV for every scheme, not a history, so the history is
 * what the daily snapshots build up. Fails when no scheme line reads at all, since that means the
 * file isn't the one expected (it also happens when the site answers with a redirect page).
 */
export function parseAmfiNavAll(text: string): { ok: true; byCode: Map<string, AmfiNav> } | { ok: false; reason: string } {
  const byCode = new Map<string, AmfiNav>();
  for (const line of text.split(/\r?\n/)) {
    const fields = line.split(";");
    if (fields.length < 8 || !/^\d+$/.test(fields[0].trim())) continue;
    const nav = Number(fields[6]);
    const date = readAmfiDate(fields[7]);
    if (!Number.isFinite(nav) || nav <= 0 || date === null) continue;
    byCode.set(fields[0].trim(), { code: fields[0].trim(), name: `${fields[3].trim()} ${fields[4].trim()} ${fields[5].trim()}`.replace(/\s+/g, " ").trim(), nav, date });
  }
  if (byCode.size === 0) return { ok: false, reason: "AMFI's file had no scheme lines" };
  return { ok: true, byCode };
}

/** Where an instrument's price comes from: a mutual fund is named by its AMFI scheme code (all digits), anything else by its Yahoo ticker. */
export type PriceSource = { kind: "amfi"; code: string } | { kind: "yahoo"; ticker: string };

export function sourceFor(priceTicker: string): PriceSource {
  const ticker = priceTicker.trim();
  return /^\d+$/.test(ticker) ? { kind: "amfi", code: ticker } : { kind: "yahoo", ticker };
}

export interface PriceOnDay {
  /** The day the close is from: the asked day, or the last day before it that has one. */
  date: string;
  close: number;
  /** Days between the asked day and the close's day. 0 on a trading day, 1 to 3 over a weekend. */
  ageDays: number;
}

/**
 * The latest close on or before a day (a weekend or holiday has none of its own), oldest-first
 * points as returned above. `null` when the series starts after the day: an instrument that
 * didn't exist yet, such as a fund listed in 2024 asked about 2023. Never a price from after the
 * day, since using one would let the future into a past day's value.
 */
export function priceOnOrBefore(points: PricePoint[], day: string): PriceOnDay | null {
  let low = 0;
  let high = points.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (points[mid].date <= day) {
      found = mid;
      low = mid + 1;
    } else high = mid - 1;
  }
  if (found < 0) return null;
  const ageDays = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${points[found].date}T00:00:00Z`)) / 86_400_000);
  return { date: points[found].date, close: points[found].close, ageDays };
}
