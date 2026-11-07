import { splitHoldings, type SplitBy, type Slice } from "@/lib/aggregate/investmentSplit";
import type { Overview } from "@/lib/aggregate/investmentOverview";
import { formatLakh } from "@/lib/format/lakh";
import { pct, shareText, type Tone } from "./views";

/**
 * "How it's split" (docs/design/investments.md, Understand it): what he holds cut four ways, as plain already-formatted data for the wheel
 * and its list. Sector and "how it came in" are in the design but not here yet: the first needs a sector for each holding, the second a
 * rule for which shares a sale took (see the docs).
 */

export interface SplitMemberView {
  key: string;
  symbol: string;
  name: string;
  value: string;
  /** Its share of its slice: "38%". */
  percent: string;
  fraction: number;
}

export interface SplitSliceView {
  key: string;
  label: string;
  /** The colour's name in the card palette: its CSS variable is `--card-<colour>`. */
  colour: string;
  value: string;
  /** Its share of everything: "97%", or "0.4%" when under 10. */
  percent: string;
  fraction: number;
  /** Where it starts round the wheel, 0 to 1. */
  start: number;
  /** "+28%" with its colour. */
  gain: string;
  gainTone: Tone;
  members: SplitMemberView[];
}

export interface SplitDimensionView {
  key: SplitBy;
  label: string;
  slices: SplitSliceView[];
}

const DIMENSIONS: { key: SplitBy; label: string }[] = [
  { key: "assetClass", label: "Asset class" },
  { key: "market", label: "Market" },
  { key: "kind", label: "Company or fund" },
  { key: "holding", label: "Holding" },
];
const COLOURS = ["teal", "sapphire", "amber", "violet", "rose", "emerald", "copper", "ocean"] as const;


function sliceView(slice: Slice, index: number, start: number): SplitSliceView {
  const gain = slice.gainFraction;
  return {
    key: slice.key,
    label: slice.label,
    colour: COLOURS[index % COLOURS.length],
    value: formatLakh(slice.valueInr),
    percent: shareText(slice.fraction),
    fraction: slice.fraction,
    start,
    gain: gain === null ? "" : pct(gain, 0, true),
    gainTone: gain === null || Math.abs(gain * 100) < 0.5 ? "plain" : gain > 0 ? "gain" : "loss",
    members: slice.members.map((m) => ({ key: `${m.market}:${m.symbol}`, symbol: m.symbol, name: m.name, value: formatLakh(m.valueInr), percent: shareText(m.fractionOfSlice), fraction: m.fractionOfSlice })),
  };
}

/** How far to turn the wheel, in degrees, so the middle of a slice sits under the pointer at the top. */
export const spinTo = (start: number, fraction: number): number => -(start + fraction / 2) * 360;

/**
 * How much of the wheel an arc is drawn along, 0 to 1: a small gap is left between neighbours, but never so much that a thin slice
 * disappears (it keeps at least half its length).
 */
export const drawnLength = (length: number, gap: number): number => (length > 2 * gap ? length - gap : length / 2);

export function splitView(o: Overview): { dimensions: SplitDimensionView[]; total: string } | null {
  const dimensions = DIMENSIONS.flatMap(({ key, label }): SplitDimensionView[] => {
    const slices = splitHoldings(o.holdings, key);
    if (slices.length === 0) return [];
    let start = 0;
    return [{ key, label, slices: slices.map((s, i) => { const view = sliceView(s, i, start); start += s.fraction; return view; }) }];
  });
  return dimensions.length === 0 ? null : { dimensions, total: formatLakh(o.valueInr) };
}
