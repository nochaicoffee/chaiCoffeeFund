import type { Overview } from "@/lib/aggregate/investmentOverview";
import { allocateNewMoney, bucketStates, limitChecks, type Bucket, type LimitName } from "@/lib/aggregate/targets";
import { formatLakh } from "@/lib/format/lakh";
import type { InvestmentTarget } from "@/lib/sheets/types";
import { shareText } from "./views";

/**
 * "Your targets" and "your limits" (docs/design/investments.md, Understand it), as plain already-formatted data. Both are numbers he sets in the
 * InvestmentTargets tab; the app only compares them with what he holds and suggests nothing. With none set the cards say so and offer the form.
 */

const LABEL: Record<Bucket, string> = { "India-Equity": "India equity", "US-Equity": "US equity", Debt: "Debt", Gold: "Gold" };
const COLOUR: Record<Bucket, string> = { "India-Equity": "emerald", "US-Equity": "sapphire", Debt: "amber", Gold: "copper" };
const NEW_MONEY = [{ key: "50k", amount: 50_000, label: "₹50,000", short: "₹50k" }, { key: "1l", amount: 100_000, label: "₹1,00,000", short: "₹1L" }, { key: "2l", amount: 200_000, label: "₹2,00,000", short: "₹2L" }, { key: "5l", amount: 500_000, label: "₹5,00,000", short: "₹5L" }];

const percents = (rows: InvestmentTarget[], kind: "Target" | "Limit") => Object.fromEntries(rows.filter((r) => r.kind === kind).map((r) => [r.name, r.percent]));

export interface TargetRowView {
  bucket: Bucket;
  label: string;
  colour: string;
  /** Its share of everything held now, 0 to 1, and in words. */
  share: number;
  shareText: string;
  worth: string;
  /** His target as a share 0 to 1 (the tick on the bar), and in words; null when not set. */
  target: number | null;
  targetText: string | null;
  /** "₹1.0L below" or "on target": in rupees how far it is from the target. */
  drift: string | null;
}

export interface NewMoneyView {
  key: string;
  label: string;
  /** For the chip: "₹1L". */
  short: string;
  rows: { bucket: Bucket; label: string; colour: string; add: string; after: number; afterText: string; share: number; target: number | null }[];
}

export interface TargetsView {
  /** True when at least one target is set. */
  anySet: boolean;
  total: string;
  rows: TargetRowView[];
  /** Worth in none of the four buckets: "₹50,000 is in none of these". */
  otherNote: string | null;
  /** "Buy ₹1.0L" or "Sell ₹1.0L" for each bucket with a target, to land exactly on them with no new money. */
  moves: { bucket: Bucket; label: string; text: string; sell: boolean }[];
  /** Said when the targets set don't add up to all of it. */
  sumNote: string | null;
  newMoney: NewMoneyView[];
}

export function targetsView(o: Overview, saved: InvestmentTarget[]): TargetsView | null {
  const targets = percents(saved, "Target") as Partial<Record<Bucket, number>>;
  const states = bucketStates(o.holdings, targets);
  if (!states) return null;
  const anySet = states.buckets.some((b) => b.target !== null);
  const rows = states.buckets.map((b): TargetRowView => {
    const short = b.shortInr;
    const level = short !== null && Math.abs(short) < 1;
    return {
      bucket: b.bucket,
      label: LABEL[b.bucket],
      colour: COLOUR[b.bucket],
      share: b.share,
      shareText: shareText(b.share),
      worth: formatLakh(b.valueInr),
      target: b.target,
      targetText: b.target === null ? null : `${Math.round(b.target * 1000) / 10}% target`,
      drift: short === null ? null : level ? "on target" : short > 0 ? `${formatLakh(short)} below` : `${formatLakh(-short)} above`,
    };
  });
  const setTotal = states.buckets.reduce((s, b) => s + (b.target ?? 0), 0) * 100;
  const moves = states.buckets.flatMap((b) => (b.shortInr === null || Math.abs(b.shortInr) < 1 ? [] : [{ bucket: b.bucket, label: LABEL[b.bucket], text: `${b.shortInr > 0 ? "Buy" : "Sell"} ${formatLakh(Math.abs(b.shortInr))}`, sell: b.shortInr < 0 }]));
  const newMoney = anySet
    ? NEW_MONEY.flatMap(({ key, amount, label, short }): NewMoneyView[] => {
        const parts = allocateNewMoney(states, amount);
        if (!parts) return [];
        const after = states.totalInr + amount;
        return [{
          key,
          label,
          short,
          rows: states.buckets.map((b) => {
            const add = parts.find((p) => p.bucket === b.bucket)?.addInr ?? 0;
            const afterShare = (b.valueInr + add) / after;
            return { bucket: b.bucket, label: LABEL[b.bucket], colour: COLOUR[b.bucket], add: add < 1 ? "—" : `+${formatLakh(add)}`, after: afterShare, afterText: shareText(afterShare), share: b.share, target: b.target };
          }),
        }];
      })
    : [];
  return {
    anySet,
    total: formatLakh(states.totalInr),
    rows,
    otherNote: states.otherInr > 0 ? `${formatLakh(states.otherInr)} is in none of these (an asset marked Other): it counts in the whole, so the shares are of everything.` : null,
    moves,
    sumNote: anySet && Math.round(setTotal * 100) / 100 !== 100 ? `Your targets add up to ${Math.round(setTotal * 100) / 100}%, so landing exactly on them leaves the rest where it is.` : null,
    newMoney,
  };
}

// ---------- Limits ----------
const LIMIT_LABEL: Record<LimitName, string> = {
  "One-Holding": "One holding at most",
  Dollars: "Dollars at most",
  "Debt-Floor": "Debt at least",
  "Single-Companies": "Single companies at most",
};

export interface LimitView {
  name: LimitName;
  /** "One holding at most 30%". */
  label: string;
  /** What he holds now and his limit, as shares 0 to 1 for the bar and its tick. */
  now: number;
  limit: number;
  breached: boolean;
  /** "Over by 29.0 pts", "Under by 5.0 pts" or "Within". */
  chip: string;
  detail: string;
}

export function limitViews(o: Overview, saved: InvestmentTarget[]): LimitView[] {
  const limits = percents(saved, "Limit") as Partial<Record<LimitName, number>>;
  const checks = limitChecks(o.holdings.map((h) => ({ symbol: h.symbol, name: h.name, market: h.market, assetType: h.assetType, valueInr: h.valueInr })), limits);
  return checks.map((c) => ({
    name: c.name,
    label: `${LIMIT_LABEL[c.name]} ${c.limitPercent % 1 === 0 ? c.limitPercent : c.limitPercent.toFixed(1)}%`,
    now: c.nowPercent / 100,
    limit: c.limitPercent / 100,
    breached: c.breached,
    chip: c.breached ? `${c.kind === "max" ? "Over" : "Under"} by ${c.byPoints.toFixed(1)} pts` : "Within",
    detail: c.detail,
  }));
}
