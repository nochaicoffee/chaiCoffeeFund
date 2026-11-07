import type { InvestmentAssetType, InvestmentMarket, InvestmentSource } from "../sheets/types";

/**
 * How what he holds is split (docs/design/investments.md, "How it's split"): the same holdings sliced by asset class, market, company or
 * fund, or one slice each. Worth is in rupees as the page counts it; a holding with no worth is left out. This is a measure, not advice.
 */

export type SplitBy = "assetClass" | "market" | "kind" | "holding" | "source";

export interface SplitHolding {
  symbol: string;
  market: InvestmentMarket;
  name: string;
  assetType: InvestmentAssetType;
  valueInr: number;
  costInr: number;
  /** For the "how it came in" cut: the part of the holding that came in this way (its worth is that part's). */
  source?: InvestmentSource;
}

export interface SplitMember {
  symbol: string;
  market: InvestmentMarket;
  name: string;
  valueInr: number;
  /** What it cost, in rupees. */
  costInr: number;
  /** Its share of its slice, 0 to 1. */
  fractionOfSlice: number;
}

export interface Slice {
  key: string;
  label: string;
  valueInr: number;
  costInr: number;
  /** Its share of everything held, 0 to 1. */
  fraction: number;
  /** What it has gained over what it cost; null when it cost nothing. */
  gainFraction: number | null;
  /** The holdings in it, biggest first. */
  members: SplitMember[];
}

/**
 * An ETF or a fund of shares counts as equity, as the design draws it (NIFTYBEES and the PPFAS fund sit under Equity): the asset type says
 * what it holds and these are all shares. A debt fund is Debt, gold is Gold and anything else is Other.
 */
export function assetClassOf(type: InvestmentAssetType): string {
  switch (type) {
    case "Equity":
    case "ETF":
    case "Mutual-Fund":
      return "Equity";
    case "Debt-Fund":
      return "Debt";
    case "Gold":
      return "Gold";
    default:
      return "Other";
  }
}

/** A share in a single company, or a fund (an ETF, a mutual fund, a debt fund, gold). */
export const kindOf = (type: InvestmentAssetType): string => (type === "Equity" ? "Single companies" : "Funds");

const MARKET_LABEL: Record<InvestmentMarket, string> = { IND: "India", US: "United States" };
/** How shares came in: bought with cash (the market), an ESPP purchase, an RSU vest. */
export const SOURCE_LABEL: Record<InvestmentSource, string> = { Market: "Cash", ESPP: "ESPP purchases", RSU: "RSU vests" };

function sliceOf(by: SplitBy, h: SplitHolding): { key: string; label: string } {
  switch (by) {
    case "assetClass": {
      const label = assetClassOf(h.assetType);
      return { key: label, label };
    }
    case "market":
      return { key: h.market, label: MARKET_LABEL[h.market] };
    case "kind": {
      const label = kindOf(h.assetType);
      return { key: label, label };
    }
    case "holding":
      return { key: `${h.market}:${h.symbol}`, label: h.symbol };
    case "source":
      return { key: h.source ?? "Market", label: SOURCE_LABEL[h.source ?? "Market"] };
  }
}

/** The holdings cut into slices, biggest first; the slices' shares add up to 1. Holdings worth nothing (or less) are left out. */
export function splitHoldings(holdings: SplitHolding[], by: SplitBy): Slice[] {
  const counted = holdings.filter((h) => Number.isFinite(h.valueInr) && h.valueInr > 0);
  const total = counted.reduce((sum, h) => sum + h.valueInr, 0);
  if (total <= 0) return [];
  const slices = new Map<string, { label: string; holdings: SplitHolding[] }>();
  for (const h of counted) {
    const { key, label } = sliceOf(by, h);
    const slice = slices.get(key) ?? { label, holdings: [] };
    slice.holdings.push(h);
    slices.set(key, slice);
  }
  return [...slices.entries()]
    .map(([key, { label, holdings: own }]): Slice => {
      const valueInr = own.reduce((sum, h) => sum + h.valueInr, 0);
      const costInr = own.reduce((sum, h) => sum + h.costInr, 0);
      return {
        key,
        label,
        valueInr,
        costInr,
        fraction: valueInr / total,
        gainFraction: costInr > 0 ? valueInr / costInr - 1 : null,
        members: [...own].sort((a, b) => b.valueInr - a.valueInr).map((h) => ({ symbol: h.symbol, market: h.market, name: h.name, valueInr: h.valueInr, costInr: h.costInr, fractionOfSlice: h.valueInr / valueInr })),
      };
    })
    .sort((a, b) => b.valueInr - a.valueInr);
}
