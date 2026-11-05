import type { InvestmentMarket } from "../sheets/types";
import type { Holding } from "./investments";

/** A holding's gain, in rupees, split into what the price did and what the rupee did. */
export interface RupeeSplit {
  valueNative: number;
  valueInr: number;
  /** Value less cost, in rupees: the sum of the two parts below, exactly. */
  gainInr: number;
  /** What the shares' price did: (value − cost) in the trade's currency, at the rate he paid. */
  pricePartInr: number;
  /** What the rupee did: the value in the trade's currency × (today's rate − the rate he paid). Zero for an Indian holding. */
  rupeePartInr: number;
  /** His average rate paid, in rupees to a dollar (cost in rupees ÷ cost in dollars). 1 for an Indian holding. */
  avgRateInr: number;
}

/**
 * Splits a holding's gain into price and rupee, so a US gain doesn't hide how much of it is the
 * dollar's rise. With r the average rate he paid and R today's: gain = V·R − C·r, which is
 * (V − C)·r + V·(R − r). The two parts add up to the gain exactly, and the order matters (the
 * other way round gives different halves), which is why it is fixed here (decided 2026-11-05).
 *
 * A holding with no dollar cost (shares that cost nothing) paid no rate, so all of it is price.
 */
export function rupeeSplit(holding: Holding, priceNative: number, fxToday: number): RupeeSplit {
  const valueNative = priceNative * holding.quantity;
  if (holding.market === "IND") {
    const gainInr = valueNative - holding.totalCostInr;
    return { valueNative, valueInr: valueNative, gainInr, pricePartInr: gainInr, rupeePartInr: 0, avgRateInr: 1 };
  }
  const valueInr = valueNative * fxToday;
  const avgRateInr = holding.totalCostNative > 0 ? holding.totalCostInr / holding.totalCostNative : fxToday;
  return {
    valueNative,
    valueInr,
    gainInr: valueInr - holding.totalCostInr,
    pricePartInr: (valueNative - holding.totalCostNative) * avgRateInr,
    rupeePartInr: valueNative * (fxToday - avgRateInr),
    avgRateInr,
  };
}

export interface DayChangeInput {
  market: InvestmentMarket;
  /** Shares held at the previous close: shares bought today didn't move with the day. */
  quantityAtPrevClose: number;
  priceToday: number;
  pricePrevClose: number;
  /** USD to INR now and at the previous close. Ignored for an Indian holding. */
  fxToday: number;
  fxPrevClose: number;
}

export interface DayChange {
  prevValueInr: number;
  changeInr: number;
  /** The share price's move, at the previous close's rate. */
  pricePartInr: number;
  /** The rupee's move, on today's value in dollars. Zero for an Indian holding. */
  rupeePartInr: number;
  /** The change as a fraction of the previous close's value; null when that was nothing. */
  changeFraction: number | null;
}

/**
 * The day's change: value now less value at the previous close, each with its own day's
 * USD/INR, so a US holding's move includes the rupee's (decided 2026-11-05). Only the shares held
 * at the previous close move with the day. The price and rupee parts add up to the change exactly.
 */
export function dayChange(input: DayChangeInput): DayChange {
  const { quantityAtPrevClose: q, priceToday: p1, pricePrevClose: p0 } = input;
  const fx0 = input.market === "US" ? input.fxPrevClose : 1;
  const fx1 = input.market === "US" ? input.fxToday : 1;
  const prevValueInr = q * p0 * fx0;
  const pricePartInr = q * (p1 - p0) * fx0;
  const rupeePartInr = q * p1 * (fx1 - fx0);
  const changeInr = q * p1 * fx1 - prevValueInr;
  return { prevValueInr, changeInr, pricePartInr, rupeePartInr, changeFraction: prevValueInr === 0 ? null : changeInr / prevValueInr };
}
