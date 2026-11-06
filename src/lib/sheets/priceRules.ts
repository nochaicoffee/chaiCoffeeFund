import type { Instrument, PriceSnapshot } from "./types";

/**
 * Rules across rows for the price tabs, pure so they can be tested without a Sheet. A rule returns
 * the message to refuse a write with, or null.
 */

/**
 * A symbol is how a holding appears on his trades, which are upper case (NTAP), so an instrument is
 * too: a lower-case one would never be found by a trade's symbol. The price ticker is one word.
 */
export function instrumentProblem(candidate: Pick<Instrument, "symbol" | "priceTicker">): string | null {
  if (candidate.symbol !== candidate.symbol.trim().toUpperCase()) return `Write the symbol in upper case, as it is on your trades (${candidate.symbol.trim().toUpperCase()})`;
  if (/\s/.test(candidate.priceTicker.trim())) return "A price ticker is one word, such as NTAP, NIFTYBEES.NS or an AMFI scheme code";
  return null;
}

/** An instrument is one symbol in one market: a second NTAP in the US would split a holding's price in two. */
export function instrumentConflict(all: Instrument[], candidate: Pick<Instrument, "symbol" | "market">, ignoreId?: string): string | null {
  const clash = all.find((i) => i.id !== ignoreId && i.market === candidate.market && i.symbol.toUpperCase() === candidate.symbol.toUpperCase());
  return clash ? `${candidate.symbol} (${candidate.market}) is already an instrument` : null;
}

/** One close per ticker per day: a second one would make the price of that day depend on which row is read. */
export function snapshotConflict(all: PriceSnapshot[], candidate: Pick<PriceSnapshot, "ticker" | "date">, ignoreId?: string): string | null {
  const clash = all.find((s) => s.id !== ignoreId && s.ticker === candidate.ticker && s.date === candidate.date);
  return clash ? `${candidate.ticker} already has a close for ${candidate.date}` : null;
}
