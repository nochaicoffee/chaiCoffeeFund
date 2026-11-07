import type { Overview } from "@/lib/aggregate/investmentOverview";
import { concentration } from "@/lib/aggregate/concentration";
import { gainParts } from "@/lib/aggregate/gainShare";
import { formatLakh } from "@/lib/format/lakh";
import { colorOf, holdingKey, pct, shareText, signedLakh, symbolTile, tone, type Tone } from "./views";

/**
 * Two of the "Understand it" cards (docs/design/investments.md), as plain already-formatted data: where the weight sits against how each
 * holding is doing, and who made the gain. Arithmetic on his holdings, never a suggestion.
 */

// ---------- Weight against return ----------

export interface WeightBubble {
  key: string;
  symbol: string;
  name: string;
  colorKey: string;
  /** Where it sits across the plot (its return on cost) and up it (its share of what he holds), each 0 to 1. */
  x: number;
  y: number;
  /** Its size, 0 to 1: the square root of its worth against the biggest, so the area follows the worth. */
  size: number;
  /** "26% of what you hold · ₹5.2L". */
  weight: string;
  /** "+28% on what it cost". */
  ret: string;
  retTone: Tone;
}

export interface AxisTick {
  at: number;
  label: string;
}

export interface WeightView {
  bubbles: WeightBubble[];
  xTicks: AxisTick[];
  yTicks: AxisTick[];
  /** Where a return of nothing sits across the plot, or null when it is off it. */
  zeroAt: number | null;
  /** Holdings with no return to plot: they cost nothing, or have no price so are counted at cost. */
  leftOut: string[];
}

const STEPS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10];
/** The smallest tidy step that gives at most about five gridlines over the span. */
export const niceStep = (span: number): number => STEPS.find((s) => span / s <= 5) ?? STEPS[STEPS.length - 1];

/** A tidy axis over `lo` to `hi`: the range, padded half a step each side so a bubble at the edge isn't cut, and its ticks (multiples of the step). */
export function niceAxis(lo: number, hi: number): { min: number; max: number; ticks: number[] } {
  const step = niceStep(hi - lo || 0.1);
  const min = Math.floor(lo / step) * step - step / 2;
  const max = Math.ceil(hi / step) * step + step / 2;
  const first = Math.ceil(min / step - 1e-9);
  const last = Math.floor(max / step + 1e-9);
  const ticks = Array.from({ length: Math.max(0, last - first + 1) }, (_, k) => (first + k) * step);
  return { min, max, ticks };
}

export function weightView(o: Overview): WeightView | null {
  const plotted = o.holdings.flatMap((h, i) => (h.gainFraction === null || h.valueInr <= 0 || h.price === null ? [] : [{ h, i, gain: h.gainFraction }]));
  if (plotted.length === 0) return null;
  const x = niceAxis(Math.min(0, ...plotted.map((p) => p.gain)), Math.max(0, ...plotted.map((p) => p.gain)));
  // The share axis starts at nothing; only its top is padded.
  const y = niceAxis(0, Math.max(...plotted.map((p) => p.h.share)));
  const biggest = Math.max(...plotted.map((p) => p.h.valueInr));
  const bubbles = plotted
    .map(({ h, i, gain }): WeightBubble => ({
      key: holdingKey(h),
      symbol: h.symbol,
      name: h.name,
      colorKey: colorOf(i),
      x: (gain - x.min) / (x.max - x.min),
      y: h.share / y.max,
      size: Math.sqrt(h.valueInr / biggest),
      weight: `${shareText(h.share)} of what you hold · ${formatLakh(h.valueInr)}`,
      ret: `${pct(gain, 0, true)} on what it cost`,
      retTone: tone(gain),
    }))
    // Biggest first, so a small bubble is drawn over a big one and stays reachable.
    .sort((a, b) => b.size - a.size);
  return {
    bubbles,
    xTicks: x.ticks.map((t) => ({ at: (t - x.min) / (x.max - x.min), label: pct(t, 0, true).replace("+0%", "0%") })),
    yTicks: y.ticks.filter((t) => t >= 0).map((t) => ({ at: t / y.max, label: pct(t, 0) })),
    zeroAt: x.min < 0 && x.max > 0 ? (0 - x.min) / (x.max - x.min) : null,
    leftOut: o.holdings.filter((h) => h.gainFraction === null || h.valueInr <= 0 || h.price === null).map((h) => h.symbol),
  };
}

// ---------- Who made the gain ----------

export interface GainRowView {
  key: string;
  symbol: string;
  name: string;
  colorKey: string;
  tile: string;
  /** The gain with its sign: "+₹3.4L". */
  gain: string;
  gainTone: Tone;
  /** "47% of the gain", or "a loss". */
  share: string;
  /** What the price did and what the rupee did, each as a part of the longest bar, 0 to 1 (zero for a loser's rupee part, which has no bar). */
  priceBar: number;
  rupeeBar: number;
  priceText: string;
  rupeeText: string;
}

export interface GainView {
  rows: GainRowView[];
  total: string;
  totalTone: Tone;
  totalFraction: string | null;
  /** What the rupee's part of the whole gain comes to, said in a sentence; null when he holds nothing in dollars (or it nets to nothing). */
  rupeeNote: string | null;
  /** Said when the shares of the gain add up to more than the whole, which happens when some holdings lost: the whole is the net. Null otherwise. */
  sharesNote: string | null;
}

/** What to say in place of a share of the gain: a loser lost; a winner has no share when the whole isn't a gain; a flat one gained nothing. */
const shareless = (gainInr: number, wholeInr: number): string => (gainInr < 0 ? "a loss" : gainInr > 0 && wholeInr <= 0 ? "gained, but the whole is down" : "no gain");

function rupeeNote(rupeeGainInr: number): string | null {
  const amount = formatLakh(Math.abs(rupeeGainInr));
  // Under ₹500 is rounding, not the rupee.
  if (Math.abs(rupeeGainInr) < 500) return null;
  return rupeeGainInr > 0
    ? `${amount} of the whole gain is the rupee's: dollars bought at one rate and worth more at today's. The rest is what the share prices did.`
    : `The rupee took ${amount} off the whole gain: dollars bought at one rate and worth less at today's. The share prices did the rest.`;
}

export function gainView(o: Overview): GainView | null {
  if (o.holdings.length === 0) return null;
  const parts = gainParts(o.holdings.map((h, i) => ({ key: holdingKey(h), gainInr: h.gainInr, split: o.lenses[i]?.split ?? null })), o.gainInr);
  const holdingOf = new Map(o.holdings.map((h, i) => [holdingKey(h), { h, i }]));
  const longest = Math.max(...parts.map((p) => Math.max(Math.abs(p.gainInr), Math.abs(p.pricePartInr) + Math.abs(p.rupeePartInr))), 1);
  const rows = parts.map((p): GainRowView => {
    const { h, i } = holdingOf.get(p.key)!;
    return {
      key: p.key,
      symbol: h.symbol,
      name: h.name,
      colorKey: colorOf(i),
      tile: symbolTile(h.symbol),
      gain: signedLakh(p.gainInr),
      gainTone: tone(p.gainInr),
      share: p.shareOfGain === null ? shareless(p.gainInr, o.gainInr) : `${shareText(p.shareOfGain)} of the gain`,
      priceBar: Math.abs(p.pricePartInr) / longest,
      rupeeBar: Math.abs(p.rupeePartInr) / longest,
      priceText: signedLakh(p.pricePartInr),
      rupeeText: signedLakh(p.rupeePartInr),
    };
  });
  return {
    rows,
    total: signedLakh(o.gainInr),
    totalTone: tone(o.gainInr),
    totalFraction: o.gainFraction === null ? null : pct(o.gainFraction, 0, true),
    rupeeNote: rupeeNote(o.rupeeGainInr),
    sharesNote: parts.reduce((sum, p) => sum + (p.shareOfGain ?? 0), 0) > 1.0001 ? "The shares add up to more than the whole because some holdings lost: the whole gain is what's left after them." : null,
  };
}

// ---------- How concentrated ----------

export interface LadderPiece {
  key: string;
  symbol: string;
  name: string;
  colorKey: string;
  /** Its share of the whole, 0 to 1, as the piece's width. */
  fraction: number;
  percent: string;
  worth: string;
}

export interface ConcentrationView {
  forHalf: number;
  forEighty: number;
  /** "3.1": the holdings it is like having, equal in size. */
  likeHolding: string;
  holdingCount: number;
  /** Every holding, biggest first. */
  ladder: LadderPiece[];
}

export function concentrationView(o: Overview): ConcentrationView | null {
  const c = concentration(o.holdings.map((h) => h.share));
  if (!c) return null;
  const ladder = o.holdings
    .map((h, i): LadderPiece => ({ key: holdingKey(h), symbol: h.symbol, name: h.name, colorKey: colorOf(i), fraction: h.share, percent: shareText(h.share), worth: formatLakh(h.valueInr) }))
    .sort((a, b) => b.fraction - a.fraction);
  return { forHalf: c.forHalf, forEighty: c.forEighty, likeHolding: c.likeHolding.toFixed(1), holdingCount: o.holdings.length, ladder };
}
