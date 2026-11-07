import { splitHoldings, type SplitBy, type SplitHolding, type Slice } from "@/lib/aggregate/investmentSplit";
import { sourceMix, SOURCES } from "@/lib/aggregate/sourceMix";
import type { InvestmentSource, InvestmentTransaction } from "@/lib/sheets/types";
import type { Overview } from "@/lib/aggregate/investmentOverview";
import { formatLakh } from "@/lib/format/lakh";
import { colorOf, holdingKey, pct, shareText, type Tone } from "./views";

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
  /** What it is worth and cost, in rupees, for the treemap's "try without" sums. */
  valueInr: number;
  costInr: number;
  /** Its colour in the card palette: the one it has on the rest of the page. */
  colorKey: string;
  /** "+57%" on what it cost, with its colour; empty when it cost nothing. */
  gain: string;
  gainTone: Tone;
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
  /** Something to say about the cut: how it was worked out where it had to be guessed. */
  note?: string;
}

const DIMENSIONS: { key: SplitBy; label: string }[] = [
  { key: "assetClass", label: "Asset class" },
  { key: "market", label: "Market" },
  { key: "kind", label: "Company or fund" },
  { key: "holding", label: "Holding" },
  { key: "source", label: "How it came in" },
];
/** How shares came in keeps the colours the page already gives them: cash teal, an ESPP purchase violet, an RSU vest blue (Money in). */
const SOURCE_COLOUR: Record<InvestmentSource, string> = { Market: "teal", ESPP: "violet", RSU: "sapphire" };
const COLOURS = ["teal", "sapphire", "amber", "violet", "rose", "emerald", "copper", "ocean"] as const;


function sliceView(slice: Slice, index: number, start: number, colours: ReadonlyMap<string, string>, colour: string = COLOURS[index % COLOURS.length]): SplitSliceView {
  const gain = slice.gainFraction;
  return {
    key: slice.key,
    label: slice.label,
    colour,
    value: formatLakh(slice.valueInr),
    percent: shareText(slice.fraction),
    fraction: slice.fraction,
    start,
    gain: gain === null ? "" : pct(gain, 0, true),
    gainTone: gain === null || Math.abs(gain * 100) < 0.5 ? "plain" : gain > 0 ? "gain" : "loss",
    members: slice.members.map((m) => {
      const gainFraction = m.costInr > 0 ? m.valueInr / m.costInr - 1 : null;
      return {
        key: holdingKey(m), symbol: m.symbol, name: m.name, value: formatLakh(m.valueInr), percent: shareText(m.fractionOfSlice), fraction: m.fractionOfSlice,
        valueInr: m.valueInr, costInr: m.costInr, colorKey: colours.get(holdingKey(m)) ?? "slate",
        gain: gainFraction === null ? "" : pct(gainFraction, 0, true), gainTone: gainFraction === null || Math.abs(gainFraction * 100) < 0.5 ? "plain" : gainFraction > 0 ? "gain" : "loss",
      };
    }),
  };
}

/** How far to turn the wheel, in degrees, so the middle of a slice sits under the pointer at the top. */
export const spinTo = (start: number, fraction: number): number => -(start + fraction / 2) * 360;

/**
 * How much of the wheel an arc is drawn along, 0 to 1: a small gap is left between neighbours, but never so much that a thin slice
 * disappears (it keeps at least half its length).
 */
export const drawnLength = (length: number, gap: number): number => (length > 2 * gap ? length - gap : length / 2);

/** What to say where the cut had to guess: sales not marked (counted in proportion) and holdings the log couldn't trace (counted as cash). */
function guessNote(unmarked: { name: string; sales: number }[], untraced: string[]): string | undefined {
  const parts: string[] = [];
  const sales = unmarked.reduce((sum, u) => sum + u.sales, 0);
  if (sales > 0) {
    const where = unmarked.map((u) => `${u.sales} ${u.sales === 1 ? "sale" : "sales"} of ${u.name}`).join(" and ");
    parts.push(`${where} ${sales === 1 ? "isn't marked with which shares it took, so it is" : "aren't marked with which shares they took, so they are"} counted in proportion. Edit the sale and say which.`);
  }
  if (untraced.length > 0) parts.push(`${untraced.join(" and ")} couldn't be traced through your trades, so ${untraced.length === 1 ? "it is" : "they are"} counted as cash.`);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

/**
 * Each holding cut into the parts that came in each way, with its worth in proportion to the shares left from each. Cost is left out
 * (nothing is said of a source's gain: the page counts one average cost for a holding, so a part of it has no cost of its own).
 */
function bySource(o: Overview, trades: InvestmentTransaction[]): { holdings: SplitHolding[]; unmarked: { name: string; sales: number }[]; untraced: string[] } {
  const mix = sourceMix(trades, o.today);
  const holdings: SplitHolding[] = [];
  const unmarked: { name: string; sales: number }[] = [];
  const untraced: string[] = [];
  for (const h of o.holdings) {
    const found = mix.get(holdingKey(h));
    const total = found ? SOURCES.reduce((s, k) => s + found.pools[k], 0) : 0;
    if (!found || total <= 0) {
      holdings.push({ ...h, costInr: 0, source: "Market" });
      untraced.push(h.name);
      continue;
    }
    for (const source of SOURCES) if (found.pools[source] > 0) holdings.push({ ...h, valueInr: (h.valueInr * found.pools[source]) / total, costInr: 0, source });
    if (found.unmarkedSales > 0) unmarked.push({ name: h.name, sales: found.unmarkedSales });
  }
  return { holdings, unmarked, untraced };
}

export function splitView(o: Overview, trades: InvestmentTransaction[] = []): { dimensions: SplitDimensionView[]; total: string; totalInr: number; costInr: number } | null {
  // A holding keeps the colour it has on the rest of the page, whichever way it is sliced.
  const colours = new Map(o.holdings.map((h, i) => [holdingKey(h), colorOf(i)]));
  const dimensions = DIMENSIONS.flatMap(({ key, label }): SplitDimensionView[] => {
    const cut = key === "source" ? bySource(o, trades) : null;
    const slices = splitHoldings(cut ? cut.holdings : o.holdings, key);
    // One way of coming in is no cut at all.
    if (slices.length === 0 || (key === "source" && slices.length < 2)) return [];
    let start = 0;
    return [{ key, label, slices: slices.map((s, i) => { const view = sliceView(s, i, start, colours, key === "source" ? SOURCE_COLOUR[s.key as InvestmentSource] : undefined); start += s.fraction; return view; }), ...(cut && guessNote(cut.unmarked, cut.untraced) && { note: guessNote(cut.unmarked, cut.untraced) }) }];
  });
  return dimensions.length === 0 ? null : { dimensions, total: formatLakh(o.valueInr), totalInr: o.valueInr, costInr: o.costInr };
}
