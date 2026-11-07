import type { InvestmentSource, InvestmentTransaction } from "../sheets/types";

/**
 * How what he holds came in (docs/design/investments.md, "How it came in"): the shares of each holding left from each source, cash (the
 * market), an ESPP purchase or an RSU vest. The page counts by weighted-average cost, so it keeps no lots; this answers a different
 * question and needs to know which shares a sale took. He says so on the sale (`soldFrom`); a sale he hasn't marked took its own source's
 * shares when that is ESPP or RSU (an ESPP sale, an RSU sell-to-cover), and otherwise took a little from each in proportion to what was held.
 * Pure.
 */

export const SOURCES: readonly InvestmentSource[] = ["Market", "ESPP", "RSU"];
export type SourcePool = Record<InvestmentSource, number>;

export interface HoldingSources {
  /** Shares left from each source. */
  pools: SourcePool;
  /** Sales that had to be counted in proportion because several sources were held and none was marked. */
  unmarkedSales: number;
}

const EPS = 1e-9;
const empty = (): SourcePool => ({ Market: 0, ESPP: 0, RSU: 0 });
const keyOf = (t: Pick<InvestmentTransaction, "market" | "symbol">) => `${t.market}:${t.symbol}`;

/** Takes `qty` from the pools in proportion to what each holds, as far as they go. */
function takeProportionally(pools: SourcePool, qty: number): void {
  const total = SOURCES.reduce((s, k) => s + pools[k], 0);
  if (total <= EPS) return;
  const share = Math.min(qty, total) / total;
  for (const k of SOURCES) pools[k] = Math.max(0, pools[k] - pools[k] * share);
}

/**
 * Each holding's shares by source, as of `today` (trades after it are left out). Buys add to their source's pool in date order, buys before
 * sells on the same day. A sale takes from the pool it names; any it can't cover from there comes out of the others in proportion.
 */
export function sourceMix(trades: Pick<InvestmentTransaction, "market" | "symbol" | "tradeDate" | "tradeType" | "source" | "quantity" | "soldFrom">[], today: string): Map<string, HoldingSources> {
  const out = new Map<string, HoldingSources>();
  const ordered = trades
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.tradeDate <= today)
    .sort((a, b) => (a.t.tradeDate < b.t.tradeDate ? -1 : a.t.tradeDate > b.t.tradeDate ? 1 : a.t.tradeType === b.t.tradeType ? a.i - b.i : a.t.tradeType === "Buy" ? -1 : 1));
  for (const { t } of ordered) {
    const held = out.get(keyOf(t)) ?? { pools: empty(), unmarkedSales: 0 };
    out.set(keyOf(t), held);
    if (t.tradeType === "Buy") {
      held.pools[t.source] += t.quantity;
      continue;
    }
    const named = t.soldFrom ?? (t.source === "Market" ? undefined : t.source);
    if (named) {
      const take = Math.min(t.quantity, held.pools[named]);
      held.pools[named] -= take;
      if (t.quantity - take > EPS) takeProportionally(held.pools, t.quantity - take);
    } else {
      // Only counted as a guess when there was more than one source to take from.
      if (SOURCES.filter((k) => held.pools[k] > EPS).length > 1) held.unmarkedSales += 1;
      takeProportionally(held.pools, t.quantity);
    }
  }
  for (const h of out.values()) for (const k of SOURCES) if (h.pools[k] < EPS) h.pools[k] = 0;
  return out;
}
