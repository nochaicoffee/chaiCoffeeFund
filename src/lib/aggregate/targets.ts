import { assetClassOf, kindOf } from "./investmentSplit";
import type { InvestmentAssetType, InvestmentMarket } from "../sheets/types";

/**
 * Your targets and your limits (docs/design/investments.md, Understand it): numbers he sets, only ever compared with what he holds. The app
 * suggests no split and no limit: this does the sums against his numbers and nothing else. Pure.
 */

export type Bucket = "India-Equity" | "US-Equity" | "Debt" | "Gold";
export const BUCKETS: readonly Bucket[] = ["India-Equity", "US-Equity", "Debt", "Gold"];

export interface TargetHolding {
  symbol: string;
  market: InvestmentMarket;
  assetType: InvestmentAssetType;
  valueInr: number;
}

/** Which of the four buckets a holding is in: shares and funds of shares by their market, debt funds, gold. Anything else is in none of them. */
export function bucketOf(h: Pick<TargetHolding, "market" | "assetType">): Bucket | null {
  switch (assetClassOf(h.assetType)) {
    case "Equity":
      return h.market === "IND" ? "India-Equity" : "US-Equity";
    case "Debt":
      return "Debt";
    case "Gold":
      return "Gold";
    default:
      return null;
  }
}

export interface BucketState {
  bucket: Bucket;
  valueInr: number;
  /** Its share of everything held, 0 to 1. */
  share: number;
  /** His target, as a share 0 to 1, or null when he hasn't set one. */
  target: number | null;
  /** What it would take to land on the target: positive when it is below it, negative above; null with no target. */
  shortInr: number | null;
}

export interface BucketStates {
  totalInr: number;
  buckets: BucketState[];
  /** Worth in none of the four buckets (an asset he has typed Other): counted in the total, so shares are of everything. */
  otherInr: number;
}

/** `targets` are his percents (35 for 35%) by bucket; a bucket without one has none. Holdings worth nothing are left out. */
export function bucketStates(holdings: TargetHolding[], targets: Partial<Record<Bucket, number>>): BucketStates | null {
  const counted = holdings.filter((h) => Number.isFinite(h.valueInr) && h.valueInr > 0);
  const totalInr = counted.reduce((s, h) => s + h.valueInr, 0);
  if (totalInr <= 0) return null;
  const value = new Map<Bucket, number>();
  let otherInr = 0;
  for (const h of counted) {
    const b = bucketOf(h);
    if (b) value.set(b, (value.get(b) ?? 0) + h.valueInr);
    else otherInr += h.valueInr;
  }
  return {
    totalInr,
    otherInr,
    buckets: BUCKETS.map((bucket): BucketState => {
      const valueInr = value.get(bucket) ?? 0;
      const percent = targets[bucket];
      const target = percent === undefined ? null : percent / 100;
      return { bucket, valueInr, share: valueInr / totalInr, target, shortInr: target === null ? null : target * totalInr - valueInr };
    }),
  };
}

/**
 * Where new money would go, as the design has it: only to buckets below their target, in proportion to how far below; whatever is left once
 * they are all level goes by target weight. It never sells. Only buckets with a target take any. Null when no bucket has a target.
 */
export function allocateNewMoney(states: BucketStates, amountInr: number): { bucket: Bucket; addInr: number }[] | null {
  const set = states.buckets.filter((b) => b.target !== null);
  if (set.length === 0 || !(amountInr > 0)) return null;
  const under = set.filter((b) => (b.shortInr ?? 0) > 0);
  const shortfall = under.reduce((s, b) => s + (b.shortInr ?? 0), 0);
  const weights = set.reduce((s, b) => s + (b.target ?? 0), 0);
  const first = Math.min(amountInr, shortfall);
  const rest = Math.max(0, amountInr - shortfall);
  return set.map((b) => ({
    bucket: b.bucket,
    addInr: (shortfall > 0 && (b.shortInr ?? 0) > 0 ? first * ((b.shortInr ?? 0) / shortfall) : 0) + (weights > 0 ? rest * ((b.target ?? 0) / weights) : 0),
  }));
}

// ---------- Limits ----------
export type LimitName = "One-Holding" | "Dollars" | "Debt-Floor" | "Single-Companies";

export interface LimitCheck {
  name: LimitName;
  /** A ceiling (most) or a floor (least). */
  kind: "max" | "min";
  /** His limit and what he holds now, both in percent of everything held. */
  limitPercent: number;
  nowPercent: number;
  breached: boolean;
  /** How far past the limit, in percentage points; 0 when within. */
  byPoints: number;
  /** What the figure is, in his words: "NetApp is 59%". */
  detail: string;
}

/**
 * Each limit he has set against today's figures, in the design's order. `limits` are his percents by name. A breach of his own limit is a
 * fact about today, not a call to act.
 */
export function limitChecks(holdings: (TargetHolding & { name: string })[], limits: Partial<Record<LimitName, number>>): LimitCheck[] {
  const counted = holdings.filter((h) => Number.isFinite(h.valueInr) && h.valueInr > 0);
  const total = counted.reduce((s, h) => s + h.valueInr, 0);
  if (total <= 0) return [];
  const pct = (v: number) => (v / total) * 100;
  const top = [...counted].sort((a, b) => b.valueInr - a.valueInr)[0];
  const share = (pick: (h: TargetHolding) => boolean) => pct(counted.filter(pick).reduce((s, h) => s + h.valueInr, 0));
  const dollars = share((h) => h.market === "US");
  const debt = share((h) => bucketOf(h) === "Debt");
  const singles = share((h) => kindOf(h.assetType) === "Single companies");
  const fmt = (n: number) => `${n.toFixed(n < 10 ? 1 : 0)}%`;

  const defs: { name: LimitName; kind: "max" | "min"; now: number; detail: string }[] = [
    { name: "One-Holding", kind: "max", now: pct(top.valueInr), detail: `${top.name} is ${fmt(pct(top.valueInr))}` },
    { name: "Dollars", kind: "max", now: dollars, detail: `${fmt(dollars)} of what you hold is in dollars` },
    { name: "Debt-Floor", kind: "min", now: debt, detail: `${fmt(debt)} is in debt` },
    { name: "Single-Companies", kind: "max", now: singles, detail: `${fmt(singles)} is in single companies` },
  ];
  return defs.flatMap((d): LimitCheck[] => {
    const limit = limits[d.name];
    if (limit === undefined) return [];
    const breached = d.kind === "max" ? d.now > limit : d.now < limit;
    return [{ name: d.name, kind: d.kind, limitPercent: limit, nowPercent: d.now, breached, byPoints: breached ? Math.abs(d.now - limit) : 0, detail: d.detail }];
  });
}
