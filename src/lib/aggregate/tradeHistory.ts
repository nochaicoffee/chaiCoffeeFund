import type { InvestmentCurrency, InvestmentMarket, InvestmentTransaction } from "../sheets/types";
import { totalInInr, tradeSteps, type TradeStep } from "./investments";

/**
 * The Trades page's history (docs/design/investments.md, "The Trades page"): his trades as entries, newest first, with what went in and
 * came out, what each sale made and where the holding stood after it. Pure: no Sheets, no prices.
 *
 * An RSU vest and the shares sold to cover its tax on the same day are one entry (as Recent trades and the vest form treat them). Money
 * in is a Buy's total in rupees (an ESPP purchase at what he paid, an RSU vest at its value on the day, PRD Q12); money out is a Sell's.
 */

export type TradeKind = "buy" | "sell" | "rsu" | "espp";

export interface TradeEntry {
  /** The entry's own id: a vest's for a vest and its cover, otherwise the trade's. Editing opens this one. */
  id: string;
  /** Every trade in it (a vest and its cover are two). */
  ids: string[];
  date: string;
  market: InvestmentMarket;
  symbol: string;
  currency: InvestmentCurrency;
  kind: TradeKind;
  /** The shares bought, sold or vested. */
  quantity: number;
  /** For a vest, the shares sold to cover tax; 0 otherwise. */
  coverQuantity: number;
  price: number;
  /** The trade's `total` in its own currency (a vest's is the vest's, not the cover's). */
  totalNative: number;
  /** USD to INR on the day, for a US trade. */
  fxRateToInr?: number;
  broker: string;
  /** Rupees that went in (a buy, ESPP, a vest) and came out (a sale, a sell-to-cover). */
  inInr: number;
  outInr: number;
  /** What a sale (or a sell-to-cover) made over its average cost; null with no sale in it. */
  gainInr: number | null;
  /** Where the holding stood after the entry's last trade. */
  after: TradeStep;
  /** For a sell of more than was held, the shares beyond what was there. */
  oversoldBy: number;
}

/**
 * Which sell-to-cover goes with which RSU vest: on one day, in one holding, the first vest takes the first cover, the second the second
 * (two grants can vest on the same day). An RSU sale with no vest that day is a sale. The vest form (editTarget) uses the same pairing.
 */
export function vestCovers(transactions: InvestmentTransaction[]): Map<string, InvestmentTransaction> {
  const pairs = new Map<string, InvestmentTransaction>();
  const groups = new Map<string, { vests: InvestmentTransaction[]; covers: InvestmentTransaction[] }>();
  for (const t of transactions) {
    if (t.source !== "RSU") continue;
    const key = `${t.market}:${t.symbol}:${t.tradeDate}`;
    const g = groups.get(key) ?? { vests: [], covers: [] };
    (t.tradeType === "Buy" ? g.vests : g.covers).push(t);
    groups.set(key, g);
  }
  for (const g of groups.values()) g.vests.forEach((v, i) => g.covers[i] && pairs.set(v.id, g.covers[i]));
  return pairs;
}

/** Every trade as entries, newest first (on one day a sale above the buy it follows, as Recent trades does). */
export function tradeEntries(transactions: InvestmentTransaction[]): TradeEntry[] {
  const steps = tradeSteps(transactions);
  const coverOf = vestCovers(transactions);
  const covers = new Set([...coverOf.values()].map((c) => c.id));
  // Where each holding stood at the end of each day: the fold runs a day's buys before its sells, so a vest's own cover can come after a
  // second vest or a buy that day. Every entry shows the day's end, which is never a state in between.
  const dateOf = new Map(transactions.map((t) => [t.id, `${t.market}:${t.symbol}:${t.tradeDate}`]));
  const dayEnd = new Map<string, TradeStep>();
  for (const step of steps.values()) dayEnd.set(dateOf.get(step.transactionId)!, step);
  const entries: TradeEntry[] = [];
  for (const t of transactions) {
    if (covers.has(t.id)) continue;
    const cover = coverOf.get(t.id);
    const step = dayEnd.get(`${t.market}:${t.symbol}:${t.tradeDate}`)!;
    const kind: TradeKind = t.tradeType === "Sell" ? "sell" : t.source === "RSU" ? "rsu" : t.source === "ESPP" ? "espp" : "buy";
    entries.push({
      id: t.id,
      ids: cover ? [t.id, cover.id] : [t.id],
      date: t.tradeDate,
      market: t.market,
      symbol: t.symbol,
      currency: t.currency,
      kind,
      quantity: t.quantity,
      coverQuantity: cover?.quantity ?? 0,
      price: t.price,
      totalNative: t.total,
      ...(t.fxRateToInr !== undefined && { fxRateToInr: t.fxRateToInr }),
      broker: t.broker,
      inInr: t.tradeType === "Buy" ? totalInInr(t) : 0,
      outInr: t.tradeType === "Sell" ? totalInInr(t) : cover ? totalInInr(cover) : 0,
      gainInr: t.tradeType === "Sell" ? (steps.get(t.id)?.gainInr ?? null) : cover ? (steps.get(cover.id)?.gainInr ?? null) : null,
      after: step,
      oversoldBy: (steps.get(t.id)?.oversoldBy ?? 0) + (cover ? (steps.get(cover.id)?.oversoldBy ?? 0) : 0),
    });
  }
  const rank = (e: TradeEntry) => (e.kind === "sell" ? 0 : 1);
  return entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : rank(a) - rank(b)));
}

/** The Indian financial year a day falls in, by the year it starts: Mar 31, 2026 is 2025 (FY 2025-26), Apr 1, 2026 is 2026. */
export function financialYear(iso: string): number {
  const year = Number(iso.slice(0, 4));
  return Number(iso.slice(5, 7)) >= 4 ? year : year - 1;
}

export interface TradeTotals {
  inInr: number;
  outInr: number;
  netInr: number;
  /** What every sale and sell-to-cover made, together. */
  gainInr: number;
  trades: number;
  /** Sales that aren't a vest's sell-to-cover. */
  sales: number;
  /** Vests that had shares sold to cover tax. */
  covers: number;
}

export function tradeTotals(entries: TradeEntry[]): TradeTotals {
  let inInr = 0, outInr = 0, gainInr = 0, sales = 0, covers = 0;
  for (const e of entries) {
    inInr += e.inInr;
    outInr += e.outInr;
    gainInr += e.gainInr ?? 0;
    if (e.kind === "sell") sales++;
    if (e.kind === "rsu" && e.coverQuantity > 0) covers++;
  }
  return { inInr, outInr, netInr: inInr - outInr, gainInr, trades: entries.length, sales, covers };
}

export interface SourceCost {
  source: "Market" | "ESPP" | "RSU";
  /** Shares that came in this way. */
  quantity: number;
  /** What a share cost on average, in rupees on the day: bought at the price paid, ESPP at what he paid, RSU at its value on the day. */
  avgCostInr: number;
}

export interface CameIn {
  sources: SourceCost[];
  /** Every share sold, sell-to-covers included. */
  sold: number;
}

/** How one holding's shares came in (bought, ESPP, vested), and what a share cost each way. Pass one holding's trades. */
export function howItCameIn(transactions: InvestmentTransaction[]): CameIn {
  const sources: SourceCost[] = [];
  for (const source of ["Market", "ESPP", "RSU"] as const) {
    const buys = transactions.filter((t) => t.tradeType === "Buy" && t.source === source);
    const quantity = buys.reduce((s, t) => s + t.quantity, 0);
    if (quantity > 0) sources.push({ source, quantity, avgCostInr: buys.reduce((s, t) => s + totalInInr(t), 0) / quantity });
  }
  return { sources, sold: transactions.filter((t) => t.tradeType === "Sell").reduce((s, t) => s + t.quantity, 0) };
}
