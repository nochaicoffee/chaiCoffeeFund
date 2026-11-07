import type { Instrument, InvestmentTransaction } from "../sheets/types";
import { totalInInr } from "./investments";

export type MoneySource = "Market" | "ESPP" | "RSU";

/** One line in a month's hover card: a buy, an RSU vest (all of a holding's that month together) or a sale. */
export interface MoneyItem {
  label: string;
  /** Rupees: positive for money in, negative for a sale. */
  amountInr: number;
}

export interface MoneyCell {
  /** "2026-03". */
  key: string;
  state: "future" | "empty" | "on";
  /** What was bought that month, every source, in rupees (an RSU vest at its fair value). */
  buyInr: number;
  /** The source that put in the most, which colours the cell; null with no buys. */
  dominant: MoneySource | null;
  /** 0.28 to 1: how deep the colour is, by the square root of what was bought against the biggest month. 0 with no buys. */
  strength: number;
  /** A sale (not the shares sold to cover tax at a vest) in the month. */
  sold: boolean;
  items: MoneyItem[];
}

export interface MoneyYear {
  year: number;
  /** Twelve cells, January first. */
  months: MoneyCell[];
  /** Everything bought that year, in rupees. */
  buyInr: number;
}

export interface MoneyIn {
  years: MoneyYear[];
  monthsWithBuy: number;
  /** Months from his first trade to today, both counted. */
  monthsSinceFirst: number;
  /** The biggest year's buys, to scale the year bars. */
  biggestYearInr: number;
}

const month = (day: string) => day.slice(0, 7);

/**
 * Money in, a cell a month (design: "a cell a month, deeper is more"): what he bought each month of each year since his first trade, which
 * source put in the most (his own buys, an ESPP purchase or an RSU vest) and whether he sold. An RSU vest counts at its fair value; its
 * shares sold to cover tax are not "a sale" here. Months after today are left empty and marked as the future.
 */
export function moneyIn(trades: InvestmentTransaction[], instruments: Instrument[], today: string): MoneyIn {
  const upTo = trades.filter((t) => t.tradeDate <= today);
  if (upTo.length === 0) return { years: [], monthsWithBuy: 0, monthsSinceFirst: 0, biggestYearInr: 0 };
  const names = new Map(instruments.map((i) => [`${i.market}:${i.symbol}`, i.name]));
  const nameOf = (t: InvestmentTransaction) => names.get(`${t.market}:${t.symbol}`) ?? t.symbol;

  const byMonth = new Map<string, InvestmentTransaction[]>();
  for (const t of upTo) {
    const list = byMonth.get(month(t.tradeDate)) ?? [];
    list.push(t);
    byMonth.set(month(t.tradeDate), list);
  }

  const raw = new Map<string, { bySource: Record<MoneySource, number>; sold: boolean; items: MoneyItem[]; buyInr: number }>();
  for (const [key, list] of byMonth) {
    const bySource: Record<MoneySource, number> = { Market: 0, ESPP: 0, RSU: 0 };
    const items: MoneyItem[] = [];
    const vests = new Map<string, number>();
    let sold = false;
    for (const t of list.filter((x) => x.tradeType === "Buy")) {
      const amount = totalInInr(t);
      bySource[t.source] += amount;
      if (t.source === "RSU") vests.set(nameOf(t), (vests.get(nameOf(t)) ?? 0) + amount);
      else items.push({ label: `${nameOf(t)}${t.source === "ESPP" ? " (ESPP)" : ""}`, amountInr: amount });
    }
    for (const [name, amount] of vests) items.push({ label: `${name} RSU vest`, amountInr: amount });
    for (const t of list.filter((x) => x.tradeType === "Sell" && x.source !== "RSU")) {
      sold = true;
      items.push({ label: `Sold ${nameOf(t)}`, amountInr: -totalInInr(t) });
    }
    // Two buys of the same holding in a month are one line: the hover card lists a thing once.
    const merged = new Map<string, number>();
    for (const item of items) merged.set(item.label, (merged.get(item.label) ?? 0) + item.amountInr);
    raw.set(key, { bySource, sold, items: [...merged].map(([label, amountInr]) => ({ label, amountInr })), buyInr: bySource.Market + bySource.ESPP + bySource.RSU });
  }

  const biggestMonth = Math.max(0, ...[...raw.values()].map((r) => r.buyInr));
  const first = month(upTo.reduce((min, t) => (t.tradeDate < min ? t.tradeDate : min), upTo[0].tradeDate));
  const firstYear = Number(first.slice(0, 4));
  const lastYear = Number(today.slice(0, 4));
  const years: MoneyYear[] = [];
  for (let year = firstYear; year <= lastYear; year++) {
    const months = Array.from({ length: 12 }, (_, m): MoneyCell => {
      const key = `${year}-${String(m + 1).padStart(2, "0")}`;
      const r = raw.get(key);
      const blank = { key, buyInr: 0, dominant: null, strength: 0, sold: false, items: [] };
      if (key > month(today)) return { ...blank, state: "future" };
      if (!r || (r.buyInr === 0 && !r.sold)) return { ...blank, state: "empty" };
      const { Market, ESPP, RSU } = r.bySource;
      const dominant: MoneySource | null = r.buyInr === 0 ? null : RSU >= Market && RSU >= ESPP ? "RSU" : ESPP >= Market ? "ESPP" : "Market";
      return { key, state: "on", buyInr: r.buyInr, dominant, strength: r.buyInr > 0 && biggestMonth > 0 ? 0.28 + 0.72 * Math.sqrt(r.buyInr / biggestMonth) : 0, sold: r.sold, items: r.items };
    });
    years.push({ year, months, buyInr: months.reduce((s, c) => s + c.buyInr, 0) });
  }
  return {
    years,
    monthsWithBuy: [...raw.values()].filter((r) => r.buyInr > 0).length,
    monthsSinceFirst: (lastYear - firstYear) * 12 + Number(today.slice(5, 7)) - Number(first.slice(5, 7)) + 1,
    biggestYearInr: Math.max(0, ...years.map((y) => y.buyInr)),
  };
}
