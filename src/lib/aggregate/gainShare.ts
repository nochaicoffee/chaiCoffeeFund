/**
 * Who made the gain (docs/design/investments.md, Understand it): each holding's gain, split into what its price did and what the rupee did,
 * and its share of the whole gain. Pure; a measure, not advice.
 */

export interface GainHolding {
  key: string;
  gainInr: number;
  /** For a US holding the gain split in two (RupeeSplit); null for an Indian one or one with no price, where all of it is the price. */
  split: { pricePartInr: number; rupeePartInr: number } | null;
}

export interface GainPart {
  key: string;
  gainInr: number;
  pricePartInr: number;
  rupeePartInr: number;
  /**
   * Its share of the whole gain, 0 upwards. Null for a holding that lost (it has no share of a gain) and for all of them when the whole is
   * not a gain. The shares of the holdings that gained add up to more than 1 when others lost, since the whole is the net.
   */
  shareOfGain: number | null;
}

/** The holdings' gains, biggest first, each split in two and set against the whole. */
export function gainParts(holdings: GainHolding[], totalGainInr: number): GainPart[] {
  return holdings
    .map((h): GainPart => {
      const price = h.split?.pricePartInr ?? h.gainInr;
      const rupee = h.split?.rupeePartInr ?? 0;
      return { key: h.key, gainInr: h.gainInr, pricePartInr: price, rupeePartInr: rupee, shareOfGain: totalGainInr > 0 && h.gainInr > 0 ? h.gainInr / totalGainInr : null };
    })
    .sort((a, b) => b.gainInr - a.gainInr);
}
