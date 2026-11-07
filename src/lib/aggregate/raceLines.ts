import { priceOnOrBefore, type PricePoint } from "../prices/history";
import { USD_INR_TICKER } from "../prices/refreshPlan";
import { STALE_AFTER_DAYS } from "./portfolioHistory";

/** The yearly rate of the deposit he is held up against in the Race (design: "A 7% deposit"). */
export const DEPOSIT_RATE = 0.07;

export type RaceKey = "you" | "nifty" | "sp500" | "deposit";

export interface RaceLine {
  key: RaceKey;
  label: string;
  /** One value a day, aligned with the stage's series: a level to be rebased to 100 at whatever day the chart starts. Null on a day with no close yet. */
  values: (number | null)[];
}

const round = (n: number) => Math.round(n * 10_000) / 10_000;
/** A close for the day, or null when the latest is more than a week old: a feed that stopped is a gap in the line, not a flat run that looks like a result. */
const closeOn = (closes: PricePoint[], day: string) => {
  const p = priceOnOrBefore(closes, day);
  return p && p.ageDays <= STALE_AFTER_DAYS ? p.close : null;
};

/**
 * The lines the Race draws on the same days as the stage: the portfolio's time-weighted index, Nifty 50, the S&P 500 in rupees (its close
 * times that day's USD to INR) and a deposit growing at `DEPOSIT_RATE` a year. All are levels, not returns; the chart rebases each to 100 at the
 * first day it shows, so a line that starts later than the chart is left out rather than guessed. A day takes the latest close on or before
 * it, never one from after, and none at all when that close is more than a week old.
 */
export function raceLines({ dates, youIndex, closes }: { dates: string[]; youIndex: number[]; closes: ReadonlyMap<string, PricePoint[]> }): RaceLine[] {
  if (dates.length === 0) return [];
  const nifty = closes.get("^NSEI") ?? [];
  const spx = closes.get("^GSPC") ?? [];
  const usdInr = closes.get(USD_INR_TICKER) ?? [];
  const first = Date.parse(`${dates[0]}T00:00:00Z`);
  return [
    { key: "you", label: "You", values: dates.map((_, i) => round(youIndex[i] ?? 1)) },
    { key: "nifty", label: "Nifty 50", values: dates.map((d) => { const c = closeOn(nifty, d); return c === null ? null : round(c); }) },
    { key: "sp500", label: "S&P 500 in rupees", values: dates.map((d) => { const c = closeOn(spx, d); const fx = closeOn(usdInr, d); return c === null || fx === null ? null : round(c * fx); }) },
    { key: "deposit", label: `A ${Math.round(DEPOSIT_RATE * 100)}% deposit`, values: dates.map((d) => round(Math.pow(1 + DEPOSIT_RATE, (Date.parse(`${d}T00:00:00Z`) - first) / 86_400_000 / 365))) },
  ];
}
