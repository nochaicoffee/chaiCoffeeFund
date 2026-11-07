import type { SentencePart } from "@/app/cards/summarySentence";
import { formatLakh } from "@/lib/format/lakh";
import type { GreetingRowData } from "@/components/shell/GreetingParts";
import type { HoldingLens, LensMarker, LensPoint } from "@/lib/aggregate/holdingLens";
import type { HoldingRow, Overview } from "@/lib/aggregate/investmentOverview";
import { formatDate, formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrExact, formatMoney } from "@/lib/format/money";
import type { Instrument, InvestmentTransaction } from "@/lib/sheets/types";

/**
 * What the Investments page shows (docs/design/investments.md, L1 Giant), as plain, already-formatted data: the greeting's sentence and
 * the cards its figures point at, the returns row, the holdings table and the recent trades. The numbers come from
 * lib/aggregate/investmentOverview.ts; nothing here works anything out that isn't shown.
 */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const MINUS = "−";
/** 12.4% from a fraction, with a sign when asked. */
export const pct = (fraction: number, digits = 1, signed = false) => `${fraction < 0 ? MINUS : signed && fraction > 0 ? "+" : ""}${Math.abs(fraction * 100).toFixed(digits)}%`;
export const signedLakh = (n: number) => `${n < 0 ? MINUS : "+"}${formatLakh(Math.abs(n))}`;
const years = (days: number) => (days / 365).toFixed(1);

// ---------- The greeting ----------
export type InvestmentsPoint = "worth" | "gain" | "top" | "day" | "yearly" | "gap";
export interface GreetingCard {
  title: string;
  total: string;
  rows: GreetingRowData[];
  note?: string;
}
export type InvestmentsGreetingCards = Partial<Record<InvestmentsPoint, GreetingCard>>;

const COLORS = ["sapphire", "teal", "emerald", "violet", "amber", "copper", "ocean", "rose"] as const;
const colorOf = (i: number) => COLORS[i % COLORS.length];

function top(o: Overview): HoldingRow | undefined {
  return o.holdings[0];
}

function gapSentence(o: Overview): SentencePart[] {
  if (o.gapToNifty === null) return [];
  return [{ text: ", " }, { text: `${pct(Math.abs(o.gapToNifty))} a year ${o.gapToNifty >= 0 ? "ahead of" : "behind"} Nifty 50`, strong: true, point: "gap" }];
}

/** Which day the prices are from, what the day did, and the dollar's rate: "Prices are from Nov 5, down ₹10,463 on the day, with USD/INR at ₹90.15. " */
function pricesSentence(o: Overview): SentencePart[] {
  const old = o.pricesFrom !== null && o.pricesFrom < o.today;
  const day = o.dayChangeInr;
  const bits: SentencePart[][] = [];
  if (day !== null && day !== 0) bits.push([{ text: day < 0 ? "down " : "up " }, { text: formatInr(Math.abs(day)), strong: true, point: "day" }, { text: " on the day" }]);
  // First in a sentence of its own it can't read "With USD/INR at ...", so it says "USD/INR is at ...".
  if (o.usdInr !== null) bits.push([{ text: !old && bits.length === 0 ? "USD/INR is at " : "with USD/INR at " }, { text: formatInrExact(o.usdInr), strong: true }]);
  if (!old && bits.length === 0) return [];
  const parts: SentencePart[] = [];
  if (old) parts.push({ text: `Prices are from ${formatShortDate(o.pricesFrom!)}` });
  bits.forEach((bit, i) => {
    if (i === 0 && !old) {
      const [first, ...rest] = bit;
      parts.push({ ...first, text: first.text.charAt(0).toUpperCase() + first.text.slice(1) }, ...rest);
    } else parts.push({ text: ", " }, ...bit);
  });
  parts.push({ text: ". " });
  return parts;
}

export function summarySentence(o: Overview): SentencePart[] {
  if (o.holdings.length === 0) return [{ text: "Nothing here yet. Add a trade, and this page shows what you hold, what it is worth and how it has done." }];
  const parts: SentencePart[] = [
    { text: `Your ` },
    { text: o.holdings.length === 1 ? "1 holding" : `${o.holdings.length} holdings`, strong: true },
    { text: o.holdings.length === 1 ? " is worth " : " are worth " },
    { text: formatLakh(o.valueInr), strong: true, point: "worth" },
  ];
  if (o.gainFraction !== null) parts.push({ text: o.gainInr >= 0 ? ", up " : ", down " }, { text: `${formatLakh(Math.abs(o.gainInr))} (${pct(Math.abs(o.gainFraction))})`, strong: true, point: "gain" }, { text: " on what they cost" });
  parts.push({ text: ". " });
  const t = top(o);
  if (t && o.holdings.length > 1) parts.push({ text: t.name, strong: true, point: "top" }, { text: " is " }, { text: pct(t.share), strong: true, point: "top" }, { text: " of it. " });
  parts.push(...pricesSentence(o));
  if (o.unpriced.length > 0) parts.push({ text: `${plural(o.unpriced.length, "holding has", "holdings have")} no price and ${o.unpriced.length === 1 ? "is" : "are"} counted at cost. ` });
  if (!o.xirr.tooEarly && o.xirr.rate !== null) {
    parts.push({ text: `Over ${years(o.xirr.days)} years your money has earned ` }, { text: `${pct(o.xirr.rate)} a year`, strong: true, point: "yearly" }, ...gapSentence(o), { text: "." });
  } else if (o.xirr.tooEarly) {
    parts.push({ text: "It is too early for a yearly return: it needs a year of history." });
  }
  return parts;
}

const row = (key: string, name: string, colorKey: string, amount: string, note?: string, fraction?: number): GreetingRowData => ({ key, name, colorKey, amount, note, fraction });

export function greetingView(o: Overview): InvestmentsGreetingCards {
  const cards: InvestmentsGreetingCards = {};
  if (o.holdings.length === 0) return cards;
  const shown = o.holdings.slice(0, 5);
  const rest = o.holdings.slice(5);
  cards.worth = {
    title: "What it is worth today",
    total: formatLakh(o.valueInr),
    rows: [
      ...shown.map((h, i) => row(h.symbol, h.name, colorOf(i), formatLakh(h.valueInr), `${pct(h.share)} of the whole`, h.share)),
      ...(rest.length > 0 ? [row("rest", `${rest.length} more`, "slate", formatLakh(rest.reduce((s, h) => s + h.valueInr, 0)), undefined, rest.reduce((s, h) => s + h.share, 0))] : []),
    ],
    note: `${o.pricesFrom ? `Prices from ${formatDate(o.pricesFrom)}. ` : ""}${o.unpriced.length > 0 ? `${o.unpriced.join(", ")} counted at cost, with no price. ` : ""}US holdings are at today's dollar rate.`,
  };
  if (o.gainFraction !== null) {
    cards.gain = {
      title: o.gainInr >= 0 ? "What it has made" : "What it has lost",
      total: signedLakh(o.gainInr),
      rows: [row("worth", "Worth today", "sapphire", formatLakh(o.valueInr)), row("cost", "What it cost", "slate", formatLakh(o.costInr), "fees included")],
      note: `Made on shares already sold: ${signedLakh(o.realisedInr)}. That is counted beside this, never in it.`,
    };
  }
  const t = top(o);
  if (t && o.holdings.length > 1) {
    cards.top = {
      title: `${t.name} is ${pct(t.share)} of it`,
      total: formatLakh(t.valueInr),
      rows: [row("value", "Worth", "sapphire", formatLakh(t.valueInr)), row("cost", "Cost", "slate", formatLakh(t.costInr)), row("gain", t.gainInr >= 0 ? "Gain" : "Loss", t.gainInr >= 0 ? "emerald" : "ruby", `${signedLakh(t.gainInr)}${t.gainFraction === null ? "" : ` (${pct(t.gainFraction, 0, true)})`}`)],
      note: "A plain fact about today's value: the page suggests no split.",
    };
  }
  const moved = o.holdings.filter((h) => h.dayChangeInr !== null && h.dayChangeInr !== 0).sort((a, b) => Math.abs(b.dayChangeInr!) - Math.abs(a.dayChangeInr!));
  if (o.dayChangeInr !== null && o.dayChangeInr !== 0 && moved.length > 0) {
    const biggest = Math.abs(moved[0].dayChangeInr!);
    cards.day = {
      title: o.dayChangeInr < 0 ? "What it lost on the day" : "What it made on the day",
      total: signedLakh(o.dayChangeInr),
      rows: moved.slice(0, 5).map((h) => row(h.symbol, h.name, h.dayChangeInr! < 0 ? "ruby" : "emerald", `${h.dayChangeInr! < 0 ? MINUS : "+"}${formatInr(Math.abs(h.dayChangeInr!))}`, undefined, Math.abs(h.dayChangeInr!) / biggest)),
      note: `The last close against the one before it${o.pricesFrom ? ` (${formatDate(o.pricesFrom)})` : ""}, with the rupee's move on each US holding.${moved.length > 5 ? ` ${moved.length - 5} smaller moves aren't listed.` : ""}`,
    };
  }
  if (!o.xirr.tooEarly && o.xirr.rate !== null) {
    cards.yearly = {
      title: "What your money earned a year",
      total: pct(o.xirr.rate),
      rows: [
        row("xirr", "Yearly return (XIRR)", "sapphire", pct(o.xirr.rate), "counts when each rupee went in"),
        ...(o.twr.yearlyRate !== null ? [row("twr", "Time-weighted", "teal", pct(o.twr.yearlyRate), "money added later doesn't flatter it")] : []),
        ...(o.twr.deepestFall ? [row("fall", "Deepest fall", "ruby", pct(-o.twr.deepestFall.fraction), `${formatShortDate(o.twr.deepestFall.from)} to ${formatShortDate(o.twr.deepestFall.to)}`)] : []),
      ],
      note: "An RSU vest counts as money in at its fair value that day, an ESPP purchase at what you paid, and a sale as money out.",
    };
  }
  if (o.gapToNifty !== null && o.twr.yearlyRate !== null) {
    cards.gap = {
      title: "Against the indices, a year",
      total: `${pct(Math.abs(o.gapToNifty))} ${o.gapToNifty >= 0 ? "ahead" : "behind"}`,
      rows: [
        row("you", "You (time-weighted)", "sapphire", pct(o.twr.yearlyRate)),
        ...(o.niftyYearly !== null ? [row("nifty", "Nifty 50", "slate", pct(o.niftyYearly))] : []),
        ...(o.sp500Yearly !== null ? [row("sp", "S&P 500 in rupees", "slate", pct(o.sp500Yearly), o.gapToSp500 === null ? undefined : `you are ${pct(Math.abs(o.gapToSp500))} ${o.gapToSp500 >= 0 ? "ahead" : "behind"}`)] : []),
      ],
      note: `Over the same days, from ${formatDate(o.twr.startDate!)}.`,
    };
  }
  return cards;
}

// ---------- The returns row ----------
export interface ReturnCard {
  key: string;
  label: string;
  value: string;
  note: string;
  /** Colours the value: a gain, a loss or neither. */
  tone: "gain" | "loss" | "plain";
}

const tone = (n: number | null): ReturnCard["tone"] => (n === null || n === 0 ? "plain" : n > 0 ? "gain" : "loss");

export function returnsView(o: Overview): ReturnCard[] {
  if (o.holdings.length === 0) return [];
  const tooEarly = "needs a year of history";
  return [
    { key: "xirr", label: "Yearly return", value: o.xirr.rate === null ? "Too early" : pct(o.xirr.rate, 1, true), note: o.xirr.rate === null ? tooEarly : "XIRR, on your money as it went in", tone: tone(o.xirr.rate) },
    { key: "twr", label: "Time-weighted", value: o.twr.yearlyRate === null ? "Too early" : pct(o.twr.yearlyRate, 1, true), note: o.twr.yearlyRate === null ? tooEarly : "a year, as if money was never added", tone: tone(o.twr.yearlyRate) },
    { key: "fall", label: "Deepest fall", value: o.twr.deepestFall ? pct(-o.twr.deepestFall.fraction) : "None", note: o.twr.deepestFall ? `${formatShortDate(o.twr.deepestFall.from)} to ${formatShortDate(o.twr.deepestFall.to)}` : "it has only risen", tone: o.twr.deepestFall ? "loss" : "plain" },
    { key: "nifty", label: "Against Nifty 50", value: o.gapToNifty === null ? "Too early" : `${pct(Math.abs(o.gapToNifty), 1, false)} ${o.gapToNifty >= 0 ? "ahead" : "behind"}`, note: o.niftyYearly === null ? tooEarly : `Nifty made ${pct(o.niftyYearly)} a year`, tone: tone(o.gapToNifty) },
    { key: "sp", label: "Against the S&P 500", value: o.gapToSp500 === null ? "Too early" : `${pct(Math.abs(o.gapToSp500), 1, false)} ${o.gapToSp500 >= 0 ? "ahead" : "behind"}`, note: o.sp500Yearly === null ? tooEarly : `the S&P made ${pct(o.sp500Yearly)} a year, in rupees`, tone: tone(o.gapToSp500) },
    { key: "realised", label: "Made on sales", value: signedLakh(o.realisedInr), note: "shares already sold, beside the gain", tone: tone(o.realisedInr) },
  ];
}

// ---------- The holdings table ----------
export interface HoldingTableRow {
  key: string;
  name: string;
  sub: string;
  colorKey: string;
  quantity: string;
  price: string;
  priceNote?: string;
  worth: string;
  gain: string;
  gainNote: string;
  gainTone: ReturnCard["tone"];
  share: string;
  shareFraction: number;
  day: string;
  dayTone: ReturnCard["tone"];
}

const quantityText = (q: number) => (Number.isInteger(q) ? String(q) : String(Math.round(q * 10_000) / 10_000));

export function holdingsView(o: Overview): HoldingTableRow[] {
  return o.holdings.map((h, i) => ({
    key: `${h.market}:${h.symbol}`,
    name: h.name,
    sub: `${h.symbol} · ${h.market === "US" ? "US" : "India"}`,
    colorKey: colorOf(i),
    quantity: quantityText(h.quantity),
    price: h.price === null ? "No price" : formatMoney(h.market === "US" ? "USD" : "INR", h.price),
    priceNote: h.price === null ? "counted at cost" : h.stale ? `from ${formatShortDate(h.priceDate!)}, out of date` : undefined,
    worth: formatInr(h.valueInr),
    gain: `${h.gainInr < 0 ? MINUS : "+"}${formatInr(Math.abs(h.gainInr))}`,
    gainNote: h.gainFraction === null ? "" : pct(h.gainFraction, 1, true),
    gainTone: tone(h.gainInr),
    share: pct(h.share),
    shareFraction: h.share,
    day: h.dayChangeInr === null ? "—" : `${h.dayChangeInr < 0 ? MINUS : h.dayChangeInr > 0 ? "+" : ""}${formatInr(Math.abs(h.dayChangeInr))}`,
    dayTone: tone(h.dayChangeInr),
  }));
}

// ---------- Recent trades ----------
export interface TradeRow {
  id: string;
  date: string;
  kind: string;
  name: string;
  detail: string;
  total: string;
}

const KIND: Record<string, string> = { "Buy:Market": "Bought", "Sell:Market": "Sold", "Buy:RSU": "RSU vest", "Sell:RSU": "Sold for tax", "Buy:ESPP": "ESPP", "Sell:ESPP": "ESPP sold" };

export function recentTradesView(trades: InvestmentTransaction[], instruments: Instrument[], limit = 8): TradeRow[] {
  const names = new Map(instruments.map((i) => [`${i.market}:${i.symbol}`, i.name]));
  return [...trades]
    .sort((a, b) => (a.tradeDate < b.tradeDate ? 1 : a.tradeDate > b.tradeDate ? -1 : a.tradeType === b.tradeType ? 0 : a.tradeType === "Sell" ? -1 : 1))
    .slice(0, limit)
    .map((t) => ({
      id: t.id,
      date: formatShortDate(t.tradeDate),
      kind: KIND[`${t.tradeType}:${t.source}`] ?? t.tradeType,
      name: names.get(`${t.market}:${t.symbol}`) ?? t.symbol,
      detail: `${quantityText(t.quantity)} × ${formatMoney(t.currency, t.price)}`,
      total: formatMoney(t.currency, t.total),
    }));
}

// ---------- The lens: one holding on its own ----------
export interface LensStat {
  label: string;
  value: string;
  note?: string;
  tone: ReturnCard["tone"];
}

export interface LensView {
  key: string;
  name: string;
  symbol: string;
  currency: "INR" | "USD";
  points: LensPoint[];
  markers: LensMarker[];
  /** What he paid a share now, to draw the line's end; null when he holds none. */
  avgCost: number | null;
  stats: LensStat[];
}

function lensStats(l: HoldingLens): LensStat[] {
  const rateText = (rate: number | null, tooEarly: boolean) => (rate !== null ? pct(rate, 1, true) : tooEarly ? "Too early" : "—");
  const stats: LensStat[] = [
    { label: "Shares", value: quantityText(l.quantity), note: l.firstBuy ? `first bought ${formatDate(l.firstBuy)}` : undefined, tone: "plain" },
    { label: "Average cost", value: l.avgCost === null ? "—" : formatMoney(l.currency, l.avgCost), note: "a share, fees included", tone: "plain" },
    { label: "Worth", value: formatInr(l.valueInr), note: l.price === null ? "no price: counted at cost" : `at ${formatMoney(l.currency, l.price)} a share`, tone: "plain" },
    { label: "Gain", value: `${l.gainInr < 0 ? MINUS : "+"}${formatInr(Math.abs(l.gainInr))}`, note: l.gainFraction === null ? undefined : pct(l.gainFraction, 1, true), tone: tone(l.gainInr) },
    { label: "Yearly return", value: rateText(l.xirr.rate, l.xirr.tooEarly), note: l.xirr.rate === null ? "needs a year of history" : "on this holding alone", tone: tone(l.xirr.rate) },
    { label: "Price a year", value: l.priceCagr === null ? "Too early" : pct(l.priceCagr, 1, true), note: "the share price's own growth", tone: tone(l.priceCagr) },
  ];
  if (l.split) {
    stats.push({ label: "Of the gain", value: `${signedLakh(l.split.pricePartInr)} price`, note: `${signedLakh(l.split.rupeePartInr)} from the rupee`, tone: "plain" });
  }
  if (l.markers.some((m) => m.tradeType === "Sell") && l.realisedInr !== 0) stats.push({ label: "Made on sales", value: signedLakh(l.realisedInr), note: "shares already sold", tone: tone(l.realisedInr) });
  return stats;
}

export function lensViews(o: Overview): LensView[] {
  return o.lenses.map((l) => ({ key: l.key, name: l.name, symbol: l.symbol, currency: l.currency, points: l.points, markers: l.markers, avgCost: l.avgCost, stats: lensStats(l) }));
}

// ---------- Pick what to look at ----------
export interface PickCard {
  /** "all", or the holding's lens key. */
  key: string;
  title: string;
  subtitle: string;
  /** The tile's colour, or null for Everything (a neutral tile). */
  colorKey: string | null;
  /** The sparkline: the last three months, oldest first. */
  spark: number[];
  /** "Put in ₹43.33L · +28% on cost", or "You hold 191 · +26% on cost". */
  detail: string;
  /** Worth for Everything, the price for a holding. */
  price: string;
  /** "▼ 0.96% today". */
  day: string;
  dayTone: ReturnCard["tone"];
}

const SPARK_DAYS = 90;
const arrow = (fraction: number | null, when: string) => (fraction === null ? "—" : `${fraction < 0 ? "▼" : fraction > 0 ? "▲" : "–"} ${Math.abs(fraction * 100).toFixed(2)}% ${when}`);

/** The row of cards that picks what the stage shows: everything, then each holding with its last three months, what he holds and today's move. */
export function pickerView(o: Overview): PickCard[] {
  if (o.holdings.length === 0) return [];
  const cards: PickCard[] = [];
  const tail = o.series.slice(-(SPARK_DAYS + 1));
  const before = o.dayChangeInr === null ? null : o.valueInr - o.dayChangeInr;
  const dayAll = before !== null && before > 0 ? o.dayChangeInr! / before : null;
  const whenOf = (priceDate: string | null) => (priceDate === o.today ? "today" : "last close");
  cards.push({
    key: "all", title: "Everything", subtitle: plural(o.holdings.length, "holding", "holdings"), colorKey: null, spark: tail.map((p) => p.value),
    detail: `Put in ${formatLakh(o.costInr)}${o.gainFraction === null ? "" : ` · ${pct(o.gainFraction, 0, true)} on cost`}`,
    price: formatLakh(o.valueInr), day: arrow(dayAll, whenOf(o.pricesFrom)), dayTone: tone(dayAll),
  });
  o.holdings.forEach((h, i) => {
    const lens = o.lenses[i];
    const last = lens.points.at(-1);
    const from = last ? new Date(Date.parse(`${last.date}T00:00:00Z`) - SPARK_DAYS * 86_400_000).toISOString().slice(0, 10) : "";
    const spark = lens.points.filter((p) => p.date >= from).map((p) => p.price);
    const prev = lens.points.at(-2);
    const dayPct = last && prev && prev.price > 0 ? last.price / prev.price - 1 : null;
    cards.push({
      key: lens.key, title: h.symbol, subtitle: h.name, colorKey: colorOf(i), spark,
      detail: `You hold ${quantityText(h.quantity)}${h.gainFraction === null ? "" : ` · ${pct(h.gainFraction, 0, true)} on cost`}`,
      price: h.price === null ? "No price" : formatMoney(h.market === "US" ? "USD" : "INR", h.price), day: h.price === null ? "counted at cost" : arrow(dayPct, whenOf(h.priceDate)), dayTone: tone(dayPct),
    });
  });
  return cards;
}
