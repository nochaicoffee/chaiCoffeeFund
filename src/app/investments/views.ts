import type { SentencePart } from "@/app/cards/summarySentence";
import { formatLakh } from "@/lib/format/lakh";
import type { GreetingRowData } from "@/components/shell/GreetingParts";
import type { HoldingRow, Overview } from "@/lib/aggregate/investmentOverview";
import { formatDate, formatShortDate } from "@/lib/format/date";
import { formatInr, formatMoney } from "@/lib/format/money";
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
const signedLakh = (n: number) => `${n < 0 ? MINUS : "+"}${formatLakh(Math.abs(n))}`;
const years = (days: number) => (days / 365).toFixed(1);

// ---------- The greeting ----------
export type InvestmentsPoint = "worth" | "gain" | "top" | "yearly" | "gap";
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
  if (o.pricesFrom && o.pricesFrom < o.today) parts.push({ text: `Prices are from ${formatShortDate(o.pricesFrom)}. ` });
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
