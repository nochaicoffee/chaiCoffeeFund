import { growthPath } from "@/lib/aggregate/growthPath";
import type { Overview } from "@/lib/aggregate/investmentOverview";
import { runScenario, scenarios, type WhatIfHolding } from "@/lib/aggregate/whatIf";
import { formatLakh } from "@/lib/format/lakh";
import { colorOf, holdingKey, pct, shareText, signedLakh, symbolTile, tone, type Tone } from "./views";

/**
 * Two more "Understand it" cards (docs/design/investments.md), as plain already-formatted data: What if (a shock to today's prices) and
 * Where it could go in ten years (today's worth at a return he assumes). Both are sums on his holdings, never a forecast or a suggestion.
 */

// ---------- What if ----------

export interface WhatIfRowView {
  key: string;
  symbol: string;
  tile: string;
  colorKey: string;
  /** The holding's change, "−₹1.2L", or "no change". */
  change: string;
  changeTone: Tone;
  /** How far its bar runs from the middle, 0 to 1 of the biggest change; negative to the left. */
  bar: number;
}

export interface WhatIfScenarioView {
  key: string;
  label: string;
  why: string;
  total: string;
  /** "−₹1.6L · −16% from today". */
  change: string;
  changeTone: Tone;
  /** "takes 47% of today's gain" or "adds 11% to today's gain"; null when today has no gain to compare with. */
  ofGain: string | null;
  /** "you'd still be up ₹1.4L on what it cost". */
  still: string;
  rows: WhatIfRowView[];
}

export interface WhatIfView {
  /** Today, before any shock: the worth, how much of it is gain, and each holding's share. */
  today: { total: string; gainLine: string; rows: { key: string; symbol: string; tile: string; colorKey: string; share: string; bar: number }[] };
  scenarios: WhatIfScenarioView[];
}

export function whatIfView(o: Overview): WhatIfView | null {
  if (o.holdings.length === 0 || o.valueInr <= 0) return null;
  const holdings: WhatIfHolding[] = o.holdings.map((h) => ({ key: holdingKey(h), market: h.market, assetType: h.assetType, employer: h.plans.length > 0, valueInr: h.valueInr }));
  const employers = o.holdings.filter((h) => h.plans.length > 0);
  // "NetApp −30%" when his plans are in one company, otherwise the plain name.
  const employerName = employers.length === 1 ? employers[0].name : "Employer shares";
  const info = new Map(o.holdings.map((h, i) => [holdingKey(h), { symbol: h.symbol, tile: symbolTile(h.symbol), colorKey: colorOf(i) }]));

  const out = scenarios(employerName).flatMap((s): WhatIfScenarioView[] => {
    const run = runScenario(holdings, s.factor, o.costInr);
    if (run.touchesNothing) return [];
    const biggest = Math.max(...run.changes.map((c) => Math.abs(c.changeInr)));
    const rows = run.changes
      .map((c): WhatIfRowView => {
        const i = info.get(c.key)!;
        const flat = Math.abs(c.changeInr) < 1;
        return { key: c.key, symbol: i.symbol, tile: i.tile, colorKey: i.colorKey, change: flat ? "no change" : signedLakh(c.changeInr), changeTone: flat ? "plain" : tone(c.changeInr), bar: flat ? 0 : c.changeInr / biggest };
      })
      .sort((a, b) => a.bar - b.bar);
    return [{
      key: s.key,
      label: s.label,
      why: s.why,
      total: formatLakh(run.valueInr),
      change: `${signedLakh(run.changeInr)}${run.changeFraction === null ? "" : ` · ${pct(run.changeFraction, 1, true)} from today`}`,
      changeTone: tone(run.changeInr),
      ofGain: run.shareOfTodaysGain === null ? null : `${run.changeInr < 0 ? "takes" : "adds"} ${pct(run.shareOfTodaysGain, 0)} ${run.changeInr < 0 ? "of" : "to"} today's gain`,
      still: `you'd be ${run.gainAfterInr >= 0 ? "up" : "down"} ${formatLakh(Math.abs(run.gainAfterInr))} on what it cost`,
      rows,
    }];
  });

  // A portfolio no shock touches has nothing to pick.
  if (out.length === 0) return null;
  return {
    today: {
      total: formatLakh(o.valueInr),
      gainLine: o.gainInr > 0 ? `${pct(o.gainInr / o.valueInr, 0)} of it is gain · ${formatLakh(o.gainInr)} on ${formatLakh(o.costInr)} put in` : `${formatLakh(o.costInr)} put in`,
      rows: o.holdings.map((h, i) => ({ key: holdingKey(h), symbol: h.symbol, tile: symbolTile(h.symbol), colorKey: colorOf(i), share: shareText(h.share), bar: h.share })),
    },
    scenarios: out,
  };
}

// ---------- Where it could go in ten years ----------

export interface GrowthLineView {
  key: string;
  label: string;
  /** The line's colour as a CSS value. */
  colour: string;
  /** Points along it, each 0 to 1 across (the months) and 0 to 1 up (the worth against the top of the axis). */
  points: { x: number; y: number }[];
  /** Drawn thicker: the biggest monthly amount. */
  bold: boolean;
  /** What it ends at. */
  end: string;
  /** "of which you add ₹30.00L", or null for the line that adds nothing. */
  added: string | null;
  endY: number;
}

export interface GrowthRateView {
  key: string;
  label: string;
  lines: GrowthLineView[];
  yTicks: { at: number; label: string }[];
}

export interface GrowthView {
  start: string;
  years: { at: number; label: string }[];
  rates: GrowthRateView[];
  note: string;
}

const RATES = [0.06, 0.09, 0.12];
const ADDS = [
  { key: "0", add: 0, label: "Nothing added", colour: "var(--card-slate)" },
  { key: "25", add: 25_000, label: "+₹25,000 a month", colour: "var(--card-ocean)" },
  { key: "50", add: 50_000, label: "+₹50,000 a month", colour: "var(--card-emerald)" },
];
const MONTHS = 120;
/** One point every this many months: enough for a smooth line. */
const EVERY = 3;

/** The smallest of 1, 2, 2.5, 5 or 10 times a power of ten that is at least `raw`: a tidy step for an axis. */
export function tidyStep(raw: number): number {
  const base = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((q) => q * base).find((q) => q >= raw)!;
}

export function growthView(o: Overview): GrowthView | null {
  if (o.valueInr <= 0) return null;
  const startYear = Number(o.today.slice(0, 4));
  const rates = RATES.map((rate): GrowthRateView => {
    const paths = ADDS.map((a) => ({ a, path: growthPath(o.valueInr, rate, a.add, MONTHS) }));
    const top = Math.max(...paths.map((p) => p.path[MONTHS])) * 1.06;
    const step = tidyStep(top / 4);
    const yMax = Math.ceil(top / step) * step;
    const lines = paths.map(({ a, path }): GrowthLineView => ({
      key: a.key,
      label: a.label,
      colour: a.colour,
      bold: a.add === ADDS[ADDS.length - 1].add,
      points: path.flatMap((v, m) => (m % EVERY === 0 || m === MONTHS ? [{ x: m / MONTHS, y: v / yMax }] : [])),
      end: formatLakh(path[MONTHS]),
      added: a.add > 0 ? `of which you add ${formatLakh(a.add * MONTHS)}` : null,
      endY: path[MONTHS] / yMax,
    }));
    return {
      key: String(Math.round(rate * 100)),
      label: `${Math.round(rate * 100)}% a year`,
      lines,
      yTicks: Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => ({ at: (i * step) / yMax, label: i === 0 ? "0" : formatLakh(i * step) })),
    };
  });
  return {
    start: formatLakh(o.valueInr),
    years: [0, 2, 4, 6, 8, 10].map((y) => ({ at: y / 10, label: y === 0 ? "Today" : String(startYear + y) })),
    rates,
    note: `Compounded monthly from today's ${formatLakh(o.valueInr)}, no tax and no fees. The return is a number you pick to see how much a monthly amount matters; the app has no view on what you'll earn.`,
  };
}
