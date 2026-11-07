import { assetClassOf } from "./investmentSplit";
import type { InvestmentAssetType, InvestmentMarket } from "../sheets/types";

/**
 * What if (docs/design/investments.md, Understand it): today's holdings with one shock to prices, and what that would do to the total and to
 * each holding. A shock to today's prices only: nothing sold, nothing added, not a forecast and never a suggestion. Pure.
 */

export interface WhatIfHolding {
  key: string;
  market: InvestmentMarket;
  assetType: InvestmentAssetType;
  /** True for shares from his employer's plans (an RSU vest or an ESPP purchase). */
  employer: boolean;
  valueInr: number;
}

export interface Scenario {
  key: string;
  label: string;
  /** One line on what it means. */
  why: string;
  /** What a holding's rupee worth is multiplied by: 1 for one the shock doesn't touch. */
  factor: (h: WhatIfHolding) => number;
}

const US_ONLY = (f: number) => (h: WhatIfHolding) => (h.market === "US" ? f : 1);
const INDIA_EQUITY = (h: WhatIfHolding) => (h.market === "IND" && assetClassOf(h.assetType) === "Equity" ? 0.8 : 1);
const ALL_EQUITY = (h: WhatIfHolding) => (assetClassOf(h.assetType) === "Equity" ? 0.85 : 1);
const GOLD = (h: WhatIfHolding) => (assetClassOf(h.assetType) === "Gold" ? 0.9 : 1);
const EMPLOYER = (h: WhatIfHolding) => (h.employer ? 0.7 : 1);

/**
 * The shocks the design lists. `employerName` words the employer one ("NetApp −30%"). Dollars are counted in rupees, so a move in the rupee
 * moves a US holding by the same fraction.
 */
export function scenarios(employerName: string): Scenario[] {
  return [
    { key: "usdn", label: "USD/INR −5%", why: "the rupee gets stronger", factor: US_ONLY(0.95) },
    { key: "usup", label: "USD/INR +5%", why: "the rupee gets weaker", factor: US_ONLY(1.05) },
    { key: "us20", label: "US prices −20%", why: "every US holding falls a fifth", factor: US_ONLY(0.8) },
    { key: "in20", label: "India equity −20%", why: "Indian stocks and funds fall a fifth", factor: INDIA_EQUITY },
    { key: "emp30", label: `${employerName} −30%`, why: "the employer's shares fall", factor: EMPLOYER },
    { key: "eq15", label: "All equity −15%", why: "a broad fall everywhere", factor: ALL_EQUITY },
    { key: "gold10", label: "Gold −10%", why: "gold falls a tenth", factor: GOLD },
  ];
}

export interface ScenarioRun {
  /** What everything would be worth after the shock. */
  valueInr: number;
  changeInr: number;
  changeFraction: number | null;
  /** What each holding would gain or lose, in the order given. */
  changes: { key: string; changeInr: number }[];
  /** What he'd still have over what it cost: the gain after the shock. */
  gainAfterInr: number;
  /** The size of the change as a share of today's gain; null when today has no gain to compare with. */
  shareOfTodaysGain: number | null;
  /** True when no holding is touched, so the shock changes nothing. */
  touchesNothing: boolean;
}

export function runScenario(holdings: WhatIfHolding[], factor: Scenario["factor"], costInr: number): ScenarioRun {
  const changes = holdings.map((h) => ({ key: h.key, changeInr: h.valueInr * (factor(h) - 1) }));
  const value = holdings.reduce((s, h) => s + h.valueInr, 0);
  const changeInr = changes.reduce((s, c) => s + c.changeInr, 0);
  const gain = value - costInr;
  return {
    valueInr: value + changeInr,
    changeInr,
    changeFraction: value > 0 ? changeInr / value : null,
    changes,
    gainAfterInr: value + changeInr - costInr,
    shareOfTodaysGain: gain > 0 ? Math.abs(changeInr) / gain : null,
    touchesNothing: changes.every((c) => c.changeInr === 0),
  };
}
