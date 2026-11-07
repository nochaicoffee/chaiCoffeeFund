import type { CashView } from "./cashView";
import type { SentencePart } from "@/app/cards/summarySentence";
import { formatLakh } from "@/lib/format/lakh";
import type { GreetingRowData } from "@/components/shell/GreetingParts";
import { moneyIn, type MoneySource } from "@/lib/aggregate/moneyIn";
import { DEPOSIT_RATE } from "@/lib/aggregate/raceLines";
import type { HoldingLens, LensMarker, LensPoint } from "@/lib/aggregate/holdingLens";
import type { HoldingRow, Overview } from "@/lib/aggregate/investmentOverview";
import { formatDate, formatMonthShort, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrExact, formatMoney } from "@/lib/format/money";
import type { Instrument, InvestmentMarket, InvestmentTransaction } from "@/lib/sheets/types";

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
export type InvestmentsPoint = "worth" | "gain" | "top" | "day" | "yearly" | "gap" | "cash";
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

export function summarySentence(o: Overview, cash: CashView | null = null): SentencePart[] {
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
  if (cash && cash.tiles.length > 0) parts.push({ text: cash.total, strong: true, point: "cash" }, { text: ` waits as cash at ${plural(cash.brokers, "broker", "brokers")}. ` });
  if (o.unpriced.length > 0) parts.push({ text: `${plural(o.unpriced.length, "holding has", "holdings have")} no price and ${o.unpriced.length === 1 ? "is" : "are"} counted at cost. ` });
  if (!o.xirr.tooEarly && o.xirr.rate !== null) {
    parts.push({ text: `Over ${years(o.xirr.days)} years your money has earned ` }, { text: `${pct(o.xirr.rate)} a year`, strong: true, point: "yearly" }, ...gapSentence(o), { text: "." });
  } else if (o.xirr.tooEarly) {
    parts.push({ text: "It is too early for a yearly return: it needs a year of history." });
  }
  return parts;
}

const row = (key: string, name: string, colorKey: string, amount: string, note?: string, fraction?: number): GreetingRowData => ({ key, name, colorKey, amount, note, fraction });

export function greetingView(o: Overview, cash: CashView | null = null): InvestmentsGreetingCards {
  const cards: InvestmentsGreetingCards = {};
  if (o.holdings.length === 0) return cards;
  if (cash && cash.tiles.length > 0) cards.cash = cash.greeting;
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
/** A figure's colour: a gain, a loss or neither. */
export type Tone = "gain" | "loss" | "plain";
const tone = (n: number | null): Tone => (n === null || n === 0 ? "plain" : n > 0 ? "gain" : "loss");

export interface ReturnTip {
  head: string;
  total: string;
  detail: string;
  rows: { name: string; amount: string }[];
  foot: string;
}
export interface ReturnCard {
  key: "xirr" | "gap" | "total" | "realised" | "dividends" | "fall";
  /** Which small icon sits beside the title. */
  icon: "calendar" | "trend" | "check" | "coins" | "down";
  label: string;
  value: string;
  /** The grey words after the value: "a year · XIRR". */
  small: string;
  /** A dark pill after them: "S&P +28.6%", or the total return's percent. */
  pill?: string;
  /** A figure that isn't there yet (too early, not recorded): drawn quieter. */
  muted: boolean;
  /** What the hover card says; none when there is nothing behind the figure. */
  tip: ReturnTip | null;
}

const signedPct = (fraction: number, digits = 1) => pct(fraction, digits, true);
/** "2026-04-04" → "Apr 2026", from the app's own month names (a locale formatter spells September "Sept" in some builds). */
export const monthYear = (iso: string) => `${formatMonthShort(iso.slice(0, 7))} ${iso.slice(0, 4)}`;

/** The six cards of the Returns row (the design's "key metrics"): the yearly return, the gap to the index, the total return, what sales made, dividends and the deepest fall. */
export function returnsView(o: Overview): ReturnCard[] {
  if (o.holdings.length === 0) return [];
  const tooEarly = "needs a year of history";
  const cards: ReturnCard[] = [];

  const rate = o.xirr.rate;
  cards.push({
    key: "xirr", icon: "calendar", label: "Yearly return", value: rate === null ? "Too early" : pct(rate), small: rate === null ? tooEarly : "a year · XIRR", muted: rate === null,
    tip: rate === null ? null : {
      head: "Yearly return (XIRR)", total: `${pct(rate)} a year`, detail: `what your money earned, over ${years(o.xirr.days)} years`,
      rows: [{ name: "RSU vest", amount: "cash in at fair value" }, { name: "ESPP purchase", amount: "cash in at what you paid" }, { name: "Sale, and shares sold to cover tax", amount: "cash out" }, { name: "Worth today", amount: formatLakh(o.valueInr) }],
      foot: "When money went in matters: a late buy weighs less than an early one. The ESPP discount shows as return, because you paid less than the market.",
    },
  });

  const you = o.twr.yearlyRate;
  const gap = o.gapToNifty;
  cards.push({
    key: "gap", icon: "trend", label: "Against the index", value: gap === null ? "Too early" : signedPct(gap), small: gap === null ? tooEarly : "a year · vs Nifty 50", pill: o.gapToSp500 === null ? undefined : `S&P ${signedPct(o.gapToSp500)}`, muted: gap === null,
    tip: gap === null || you === null ? null : {
      head: "Against the index", total: `${gap >= 0 ? "ahead of" : "behind"} Nifty 50 by ${pct(Math.abs(gap))} a year`, detail: `your time-weighted yearly return less the index's, over the same ${years(o.twr.days)} years`,
      rows: [
        { name: "You", amount: pct(you) },
        ...(o.niftyYearly === null ? [] : [{ name: "Nifty 50", amount: `${pct(o.niftyYearly)} · ${signedPct(you - o.niftyYearly)}` }]),
        ...(o.sp500Yearly === null ? [] : [{ name: "S&P 500 in rupees", amount: `${pct(o.sp500Yearly)} · ${signedPct(you - o.sp500Yearly)}` }]),
        { name: `A ${Math.round(DEPOSIT_RATE * 100)}% deposit`, amount: `${pct(DEPOSIT_RATE)} · ${signedPct(you - DEPOSIT_RATE)}` },
      ],
      foot: "A comparison, never advice. It is the Race in one figure. Time-weighted, so it ignores when you added money: it says how the holdings did, not what your money earned.",
    },
  });

  const allIn = o.gainInr + o.realisedInr;
  const allInFraction = o.moneyBoughtInr > 0 ? allIn / o.moneyBoughtInr : null;
  cards.push({
    key: "total", icon: "trend", label: "Total return", value: signedLakh(allIn), small: "", pill: allInFraction === null ? undefined : signedPct(allInFraction), muted: false,
    tip: {
      head: "Total return, all in", total: `${signedLakh(allIn)}${allInFraction === null ? "" : ` · ${signedPct(allInFraction)}`}`, detail: `on ${formatLakh(o.moneyBoughtInr)} bought over the years`,
      rows: [{ name: "Still held: price", amount: signedLakh(o.gainInr - o.rupeeGainInr) }, { name: "Still held: the rupee", amount: signedLakh(o.rupeeGainInr) }, { name: "Made on shares sold", amount: signedLakh(o.realisedInr) }],
      foot: `What is still held is ${signedLakh(o.gainInr)}${o.gainFraction === null ? "" : ` (${signedPct(o.gainFraction)} on its cost)`}. The % here is on every buy, an RSU vest at its fair value. Net worth counts only what you hold. Dividends aren't recorded yet, so they aren't in it.`,
    },
  });

  const sold = o.realised;
  cards.push({
    key: "realised", icon: "check", label: "Made on shares sold", value: sold.sales === 0 ? "None" : signedLakh(o.realisedInr), small: sold.sales === 0 ? "no sales yet" : `from ${plural(sold.sales, "sale", "sales")}`, muted: sold.sales === 0,
    tip: sold.sales === 0 ? null : {
      head: "Made on shares sold", total: signedLakh(o.realisedInr), detail: "proceeds less the average cost of the shares sold",
      rows: [
        { name: "Shares sold to cover tax at a vest", amount: signedLakh(sold.coverInr) },
        { name: "Every other sale", amount: signedLakh(o.realisedInr - sold.coverInr) },
        ...sold.bySymbol.slice(0, 3).map((h) => ({ name: h.name, amount: signedLakh(h.gainInr) })),
      ],
      foot: "Not in net worth, and not what you hold. It is in the total return beside it. A US sale is at its own day's rate, so the rupee's part is in it.",
    },
  });

  cards.push({ key: "dividends", icon: "coins", label: "Dividends", value: "—", small: "not recorded yet", muted: true, tip: null });

  const fall = o.twr.deepestFall;
  cards.push({
    key: "fall", icon: "down", label: "Deepest fall", value: fall ? pct(-fall.fraction) : "None", small: fall ? `in ${monthYear(fall.to)}` : "it has only risen", muted: !fall,
    tip: fall ? { head: "Deepest fall", total: pct(-fall.fraction), detail: `the worst peak-to-trough drop, from ${formatDate(fall.from)} to ${formatDate(fall.to)}`, rows: [], foot: "Of the time-weighted return, so buying more doesn't hide it." } : null,
  });
  return cards;
}

// ---------- The holdings table ----------
export interface HoldingTableRow {
  key: string;
  market: InvestmentMarket;
  name: string;
  /** Small tags beside the name: "RSU", "ESPP", "Stale price". */
  tags: string[];
  /** "NTAP · Equity · since 2023". */
  kind: string;
  /** The tile's letters. */
  tile: string;
  colorKey: string;
  quantity: string;
  /** What he paid a share on average, in its own currency; for a US holding the note says the rate: "at ₹87.20". */
  avgCost: string;
  avgCostNote?: string;
  price: string;
  /** Where the price is from, or why there is none. */
  priceNote?: string;
  /** The last day's move in the price, as "▲ 0.24%", and the move in rupees under it. */
  day: string;
  dayTone: Tone;
  dayInr?: string;
  /** The rupee move's own colour: it has the rupee in it, so it can differ from the price's. */
  dayInrTone: Tone;
  worth: string;
  /** The worth in dollars for a US holding. */
  worthNote?: string;
  /** The worth in rupees, to add up a group. */
  worthInr: number;
  gain: string;
  gainNote: string;
  gainTone: Tone;
  share: string;
  shareFraction: number;
}

export interface HoldingGroup {
  market: "IND" | "US";
  title: string;
  /** "2 holdings · ₹34,963". */
  summary: string;
  rows: HoldingTableRow[];
}

/** The rows under India and the United States headings, each with its count and what it is worth in all; a group with none is left out. */
export function holdingGroups(rows: HoldingTableRow[]): HoldingGroup[] {
  return ([["IND", "India · INR"], ["US", "United States · USD"]] as const).flatMap(([market, title]) => {
    const own = rows.filter((r) => r.market === market);
    return own.length === 0 ? [] : [{ market, title, summary: `${plural(own.length, "holding", "holdings")} · ${formatLakh(own.reduce((sum, r) => sum + r.worthInr, 0))}`, rows: own }];
  });
}

/** "Mutual-Fund" read as "Mutual Fund". */
const assetTypeText = (type: string) => type.replaceAll("-", " ");

const quantityText = (q: number) => (Number.isInteger(q) ? String(q) : String(Math.round(q * 10_000) / 10_000));

export function holdingsView(o: Overview): HoldingTableRow[] {
  return o.holdings.map((h, i) => {
    const currency = h.market === "US" ? "USD" : "INR";
    const move = h.dayFraction;
    return {
      key: `${h.market}:${h.symbol}`,
      market: h.market,
      name: h.name,
      tags: [...h.plans, ...(h.stale ? ["Stale price"] : [])],
      kind: `${h.symbol} · ${assetTypeText(h.assetType)} · since ${h.since.slice(0, 4)}`,
      tile: h.symbol.slice(0, 4),
      colorKey: colorOf(i),
      quantity: quantityText(h.quantity),
      avgCost: h.avgCostNative === null ? "—" : formatMoney(currency, h.avgCostNative),
      avgCostNote: h.avgRateInr === null ? undefined : `at ${formatInrExact(h.avgRateInr)}`,
      price: h.price === null ? "No price" : formatMoney(currency, h.price),
      priceNote: h.price === null ? "counted at cost" : h.stale ? `from ${formatShortDate(h.priceDate!)}, out of date` : (h.priceSource ?? undefined),
      day: arrow(move, "").trim(),
      dayTone: moveTone(move),
      dayInrTone: tone(h.dayChangeInr),
      dayInr: h.dayChangeInr === null || h.dayChangeInr === 0 ? undefined : `${h.dayChangeInr < 0 ? MINUS : "+"}${formatInr(Math.abs(h.dayChangeInr))}`,
      worth: formatInr(h.valueInr),
      worthNote: h.market === "US" && h.valueNative !== null ? formatMoney("USD", h.valueNative) : undefined,
      worthInr: h.valueInr,
      gain: `${h.gainInr < 0 ? MINUS : "+"}${formatInr(Math.abs(h.gainInr))}`,
      gainNote: h.gainFraction === null ? "" : pct(h.gainFraction, 1, true),
      gainTone: tone(h.gainInr),
      share: pct(h.share),
      shareFraction: h.share,
    };
  });
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
  tone: Tone;
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
  /** The holding's own header on the stage (design: tile, name, share-plan tags, one line about it). */
  header: LensHeader;
  stats: LensStat[];
}

export interface LensHeader {
  tile: string;
  colorKey: string;
  /** "RSU", "ESPP" (the share plans it came through) and "Stale price" when its price feed has stopped. */
  tags: string[];
  /** "NTAP · Equity · United States · 30 trades since 2023". */
  kind: string;
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

/** The shares sold at a vest to cover tax are not his trades to count. */
const isCoverSell = (m: { tradeType: "Buy" | "Sell"; source: "Market" | "RSU" | "ESPP" }) => m.tradeType === "Sell" && m.source === "RSU";

function lensHeader(l: HoldingLens, h: HoldingRow, index: number): LensHeader {
  const trades = l.markers.filter((m) => !isCoverSell(m)).length;
  return {
    tile: h.symbol.slice(0, 4),
    colorKey: colorOf(index),
    tags: [...h.plans, ...(h.stale ? ["Stale price"] : [])],
    kind: [h.symbol, assetTypeText(h.assetType), h.market === "US" ? "United States" : "India", `${plural(trades, "trade", "trades")} since ${h.since.slice(0, 4)}`].join(" · "),
  };
}

export function lensViews(o: Overview): LensView[] {
  return o.lenses.flatMap((l) => {
    // Matched on the holding's own market and symbol, never by position, so a filtered or reordered list can't give a lens another's header.
    const i = o.holdings.findIndex((h) => h.market === l.market && h.symbol === l.symbol);
    if (i < 0) return [];
    return [{ key: l.key, name: l.name, symbol: l.symbol, currency: l.currency, points: l.points, markers: l.markers, avgCost: l.avgCost, header: lensHeader(l, o.holdings[i], i), stats: lensStats(l) }];
  });
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
  dayTone: Tone;
}

const SPARK_DAYS = 90;
/** A move that rounds to 0.00% is no move: no arrow up or down, and no gain or loss colour. */
const flat = (fraction: number) => Math.abs(fraction * 100).toFixed(2) === "0.00";
const arrow = (fraction: number | null, when: string) => (fraction === null ? "—" : `${flat(fraction) ? "–" : fraction < 0 ? "▼" : "▲"} ${Math.abs(fraction * 100).toFixed(2)}% ${when}`);
const moveTone = (fraction: number | null): Tone => (fraction === null || flat(fraction) ? "plain" : tone(fraction));

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
    price: formatLakh(o.valueInr), day: arrow(dayAll, whenOf(o.pricesFrom)), dayTone: moveTone(dayAll),
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
      price: h.price === null ? "No price" : formatMoney(h.market === "US" ? "USD" : "INR", h.price), day: h.price === null ? "counted at cost" : arrow(dayPct, whenOf(h.priceDate)), dayTone: moveTone(dayPct),
    });
  });
  return cards;
}

// ---------- Money in ----------
export interface MoneyCellView {
  key: string;
  /** "March 2025". */
  label: string;
  state: "future" | "empty" | "on";
  /** The colour token behind the cell, from the source that put in the most; null for a month with no buys. */
  colorKey: "teal" | "violet" | "sapphire" | null;
  /** How much of that colour, 0 to 100 (the rest is the card's fill). */
  percent: number;
  sold: boolean;
  /** The hover card: what was put in, a line for a sale, and a row for each buy. Null for a month with nothing in it. */
  tip: { head: string; total: string; detail: string; rows: { name: string; amount: string }[] } | null;
}
export interface MoneyYearView {
  year: number;
  cells: MoneyCellView[];
  total: string;
  /** 0 to 1 against the biggest year. */
  fraction: number;
}
export interface MoneyInView {
  years: MoneyYearView[];
  /** "34 of 62". */
  monthsLine: string;
}

const SOURCE_COLOUR: Record<MoneySource, "teal" | "violet" | "sapphire"> = { Market: "teal", ESPP: "violet", RSU: "sapphire" };

/** The Money in grid: a cell a month for each year since his first trade, deeper for more, coloured by where the money came from. */
export function moneyInView(trades: InvestmentTransaction[], instruments: Instrument[], today: string): MoneyInView | null {
  const m = moneyIn(trades, instruments, today);
  if (m.years.length === 0) return null;
  return {
    monthsLine: `${m.monthsWithBuy} of ${m.monthsSinceFirst}`,
    years: m.years.map((y) => ({
      year: y.year,
      total: formatLakh(y.buyInr),
      fraction: m.biggestYearInr > 0 ? y.buyInr / m.biggestYearInr : 0,
      cells: y.months.map((c) => ({
        key: c.key,
        label: formatMonthYear(c.key),
        state: c.state,
        colorKey: c.dominant === null ? null : SOURCE_COLOUR[c.dominant],
        percent: Math.round(c.strength * 100),
        sold: c.sold,
        tip: c.state !== "on" ? null : {
          head: formatMonthYear(c.key),
          total: c.buyInr > 0 ? formatInr(c.buyInr) : "No buys",
          detail: c.sold ? (c.buyInr > 0 ? "and a sale" : "a sale") : "put in",
          rows: c.items.map((i) => ({ name: i.label, amount: `${i.amountInr < 0 ? MINUS : ""}${formatInr(Math.abs(i.amountInr))}` })),
        },
      })),
    })),
  };
}

// ---------- The same money, somewhere else ----------
export interface SameMoneyRow {
  key: string;
  label: string;
  value: string;
  /** 0 to 1 against the biggest line. */
  fraction: number;
  /** "₹3.2L more than you", or for him "+₹3.40L on ₹27.30L". */
  note: string;
  tone: Tone;
  you: boolean;
  colour: string;
}

const SAME_COLOUR = { you: "oklch(0.82 0.17 152)", nifty: "oklch(0.58 0.11 200)", sp500: "oklch(0.5 0.13 262)", deposit: "oklch(0.6 0.012 260)" } as const;

/** Him as he went, and what the same buys and sales would be worth in each line: a counterfactual, never advice. */
export function sameMoneyView(o: Overview): SameMoneyRow[] {
  if (o.holdings.length === 0 || o.sameMoney.length === 0) return [];
  const biggest = Math.max(o.valueInr, ...o.sameMoney.map((l) => l.valueInr));
  return [
    { key: "you", label: "You, as it went", value: formatLakh(o.valueInr), fraction: o.valueInr / biggest, note: `${signedLakh(o.gainInr)} on ${formatLakh(o.costInr)}`, tone: "plain" as Tone, you: true, colour: SAME_COLOUR.you },
    ...o.sameMoney.map((l) => ({
      key: l.key, label: l.label, value: formatLakh(l.valueInr), fraction: Math.max(0, l.valueInr / biggest),
      note: l.valueInr > o.valueInr ? `${formatLakh(l.valueInr - o.valueInr)} more than you` : `${formatLakh(o.valueInr - l.valueInr)} less than you`,
      tone: (l.valueInr > o.valueInr ? "loss" : "gain") as Tone, you: false, colour: SAME_COLOUR[l.key],
    })),
  ];
}
