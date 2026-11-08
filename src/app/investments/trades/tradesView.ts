import type { HoldingRow } from "@/lib/aggregate/investmentOverview";
import { financialYear, howItCameIn, tradeTotals, type TradeEntry, type TradeKind, type TradeTotals } from "@/lib/aggregate/tradeHistory";
import { formatDate, formatMonthYear, formatShortDate, WEEKDAY_NAMES } from "@/lib/format/date";
import { formatLakh } from "@/lib/format/lakh";
import { formatInr, formatInrExact, formatMoney } from "@/lib/format/money";
import type { Instrument, InvestmentMarket, InvestmentTransaction } from "@/lib/sheets/types";
import { colorOf, quantityText, signedLakh, symbolTile } from "../views";

/**
 * What the Trades page shows (docs/design/investments.md, "The Trades page": T1 Tape, and T2 Book with a holding picked), as plain,
 * already-formatted data. The numbers come from lib/aggregate/tradeHistory.ts; nothing here works anything out that isn't shown.
 */

const MINUS = "−";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const signedInr = (n: number) => `${n < 0 ? MINUS : "+"}${formatInr(Math.abs(n))}`;
/** A share's average cost in rupees, always with paise: ₹8,469.40. */
export const perShare = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const weekday = (iso: string) => WEEKDAY_NAMES[new Date(`${iso}T00:00:00Z`).getUTCDay()].slice(0, 3);

export const KIND_LABEL: Record<TradeKind, string> = { buy: "Buy", sell: "Sell", rsu: "RSU vest", espp: "ESPP" };
export const fyLabel = (year: number) => `FY ${year}-${String(year + 1).slice(2)}`;

export interface Part {
  text: string;
  strong?: boolean;
}

export interface Tile {
  label: string;
  value: string;
  caption: string;
  tone?: "up" | "down";
}

/** A holding on this page: how it's named in the link (`?holding=`), its name and its tile. */
export interface HoldingRef {
  /** The `?holding=` value: the symbol, or market and symbol when the symbol is in both markets. */
  id: string;
  market: InvestmentMarket;
  symbol: string;
  name: string;
  tile: string;
  colorKey: string;
  /** Trades in it (a vest and its cover count once). */
  count: number;
  soldOut: boolean;
}

/** The holdings his trades are in: what he holds, in the Investments page's order (so the colours match), then what he has sold out of. */
export function holdingRefs(entries: TradeEntry[], instruments: Instrument[], held: HoldingRow[]): HoldingRef[] {
  const names = new Map(instruments.map((i) => [`${i.market}:${i.symbol}`, i.name]));
  const keys = [...new Set(entries.map((e) => `${e.market}:${e.symbol}`))];
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(`${e.market}:${e.symbol}`, (counts.get(`${e.market}:${e.symbol}`) ?? 0) + 1);
  const order = new Map(held.map((h, i) => [`${h.market}:${h.symbol}`, i]));
  const symbolCount = new Map<string, number>();
  for (const k of keys) symbolCount.set(k.split(":")[1], (symbolCount.get(k.split(":")[1]) ?? 0) + 1);
  const ranked = [...keys].sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity) || (names.get(a) ?? a).localeCompare(names.get(b) ?? b));
  let others = 0;
  return ranked.map((key) => {
    const [market, symbol] = key.split(":") as [InvestmentMarket, string];
    const position = order.get(key);
    const last = entries.find((e) => e.market === market && e.symbol === symbol);
    return {
      id: (symbolCount.get(symbol) ?? 0) > 1 ? key : symbol,
      market,
      symbol,
      name: names.get(key) ?? symbol,
      tile: symbolTile(symbol),
      // Held ones take the Investments page's colour; the rest follow on after them.
      colorKey: colorOf(position ?? held.length + others++),
      count: counts.get(key) ?? 0,
      soldOut: position === undefined && (last?.after.quantityAfter ?? 0) === 0,
    };
  });
}

/** The holding a `?holding=` value names, or undefined. */
export function findHolding(refs: HoldingRef[], param: string | undefined): HoldingRef | undefined {
  if (!param) return undefined;
  const wanted = param.trim().toUpperCase();
  return refs.find((r) => r.id.toUpperCase() === wanted) ?? refs.find((r) => `${r.market}:${r.symbol}`.toUpperCase() === wanted) ?? refs.find((r) => r.symbol.toUpperCase() === wanted);
}

export function tradeTiles(t: TradeTotals): Tile[] {
  return [
    { label: "Put in", value: formatLakh(t.inInr), caption: "buys, ESPP, and RSU vests at their value on the day" },
    { label: "Taken out", value: formatLakh(t.outInr), caption: t.outInr === 0 ? "nothing sold yet" : "sales and shares sold to cover tax" },
    { label: "Net put in", value: formatLakh(t.netInr), caption: plural(t.trades, "trade") },
    t.sales + t.covers === 0
      ? { label: "Made on shares sold", value: "—", caption: "no sales yet" }
      : { label: "Made on shares sold", value: signedLakh(t.gainInr), caption: `${plural(t.sales, "sale")} and ${plural(t.covers, "sell-to-cover")}, at average cost`, tone: t.gainInr < 0 ? "down" : "up" },
  ];
}

// ---------- T1: every trade ----------
export interface TradeRowView {
  id: string;
  kind: TradeKind;
  kindLabel: string;
  month: string;
  fy: number;
  market: InvestmentMarket;
  holdingId: string;
  broker: string;
  date: string;
  weekday: string;
  name: string;
  /** "NTAP · US". */
  sub: string;
  tile: string;
  colorKey: string;
  /** "14 vested at $116.40 · 5 sold to cover tax · 9 kept", or "200 × ₹281.00 · ₹89.90 a dollar". */
  detail: string;
  /** In its own currency, a sale with a minus. */
  amount: string;
  /** A US trade's rupees at its day's rate. */
  amountInr?: string;
  made?: { text: string; tone: "up" | "down" };
  /** A sell of more than was held: "asks for 60 · only 40 held". */
  problem?: string;
  /** Lower-case text the search box matches. */
  search: string;
  /** Rupees in and out, for the month's line (which adds up only the rows the filters leave). */
  inInr: number;
  outInr: number;
}

export interface MonthView {
  key: string;
  title: string;
}

/** A month's line from the rows shown in it: "in ₹2,02,701 · out ₹52,322". */
export function monthNote(rows: { inInr: number; outInr: number }[]): string {
  const inInr = rows.reduce((s, r) => s + r.inInr, 0), outInr = rows.reduce((s, r) => s + r.outInr, 0);
  return [inInr > 0 ? `in ${formatInr(inInr)}` : "", outInr > 0 ? `out ${formatInr(outInr)}` : ""].filter(Boolean).join(" · ");
}

export interface TradesListView {
  rows: TradeRowView[];
  months: MonthView[];
  /** Financial years with trades, newest first, as values and labels. */
  years: { value: string; label: string }[];
  /** The four tiles for every year ("") and for each one. */
  tiles: Record<string, Tile[]>;
  brokers: string[];
  counts: Record<"all" | TradeKind, number>;
}

function detailText(e: TradeEntry): string {
  const price = formatMoney(e.currency, e.price);
  if (e.kind === "rsu") return `${quantityText(e.quantity)} vested at ${price} · ${e.coverQuantity > 0 ? `${quantityText(e.coverQuantity)} sold to cover tax · ${quantityText(e.quantity - e.coverQuantity)} kept` : "none sold"}`;
  return `${quantityText(e.quantity)} × ${price}${e.market === "US" && e.fxRateToInr !== undefined ? ` · ${formatInrExact(e.fxRateToInr)} a dollar` : ""}`;
}

const moneyNote = (e: TradeEntry) => (e.kind === "sell" ? e.outInr : e.inInr);
const made = (gain: number | null) => (gain === null ? undefined : { text: signedInr(gain), tone: gain < 0 ? ("down" as const) : ("up" as const) });
const problem = (e: TradeEntry) => (e.oversoldBy > 0 ? `asks for ${quantityText(e.quantity)} · only ${quantityText(e.quantity - e.oversoldBy)} held` : undefined);

export function tradesListView(entries: TradeEntry[], refs: HoldingRef[]): TradesListView {
  const byKey = new Map(refs.map((r) => [`${r.market}:${r.symbol}`, r]));
  const rows: TradeRowView[] = entries.map((e) => {
    const ref = byKey.get(`${e.market}:${e.symbol}`);
    const name = ref?.name ?? e.symbol;
    const sign = e.kind === "sell" ? MINUS : "";
    return {
      id: e.id,
      kind: e.kind,
      kindLabel: KIND_LABEL[e.kind],
      month: e.date.slice(0, 7),
      fy: financialYear(e.date),
      market: e.market,
      holdingId: ref?.id ?? e.symbol,
      broker: e.broker,
      date: formatShortDate(e.date),
      weekday: weekday(e.date),
      name,
      sub: `${e.symbol} · ${e.market === "US" ? "US" : "India"}`,
      tile: ref?.tile ?? symbolTile(e.symbol),
      colorKey: ref?.colorKey ?? "sapphire",
      detail: detailText(e),
      amount: `${sign}${formatMoney(e.currency, e.totalNative)}`,
      ...(e.market === "US" && { amountInr: `${sign}${formatInr(moneyNote(e))}` }),
      made: made(e.gainInr),
      problem: problem(e),
      search: `${name} ${e.symbol} ${e.broker} ${KIND_LABEL[e.kind]}`.toLowerCase(),
      inInr: e.inInr,
      outInr: e.outInr,
    };
  });
  const monthKeys = [...new Set(entries.map((e) => e.date.slice(0, 7)))];
  const months = monthKeys.map((key) => ({ key, title: formatMonthYear(key) }));
  const fys = [...new Set(entries.map((e) => financialYear(e.date)))].sort((a, b) => b - a);
  const tiles: Record<string, Tile[]> = { "": tradeTiles(tradeTotals(entries)) };
  for (const y of fys) tiles[String(y)] = tradeTiles(tradeTotals(entries.filter((e) => financialYear(e.date) === y)));
  const count = (k: TradeKind) => entries.filter((e) => e.kind === k).length;
  return {
    rows,
    months,
    years: fys.map((y) => ({ value: String(y), label: fyLabel(y) })),
    tiles,
    brokers: [...new Set(entries.map((e) => e.broker))].sort(),
    counts: { all: entries.length, buy: count("buy"), sell: count("sell"), rsu: count("rsu"), espp: count("espp") },
  };
}

/** The sentence under "Trades": "48 trades since Sep 9, 2021 across 4 brokers. You've put in ₹50.78L and taken out ₹9.56L, making +₹2.11L on what you sold." */
export function listSentence(entries: TradeEntry[]): Part[] {
  if (entries.length === 0) return [{ text: "No trades yet. Add your first and it shows here, and on the Investments page." }];
  const t = tradeTotals(entries);
  const brokers = new Set(entries.map((e) => e.broker)).size;
  const parts: Part[] = [
    { text: plural(t.trades, "trade"), strong: true },
    { text: " since " },
    { text: formatDate(entries.at(-1)!.date), strong: true },
    { text: " across " },
    { text: plural(brokers, "broker"), strong: true },
    { text: ". You've put in " },
    { text: formatLakh(t.inInr), strong: true },
  ];
  if (t.outInr > 0) parts.push({ text: " and taken out " }, { text: formatLakh(t.outInr), strong: true });
  if (t.sales + t.covers > 0) parts.push({ text: `, ${t.gainInr < 0 ? "losing" : "making"} ` }, { text: signedLakh(t.gainInr), strong: true }, { text: " on what you sold" });
  parts.push({ text: "." });
  return parts;
}

// ---------- T2: one holding's book ----------
export interface BookRowView {
  id: string;
  kind: TradeKind;
  kindLabel: string;
  date: string;
  /** "+14", "−40". */
  shares: string;
  /** A vest's sell-to-cover: "−5". */
  coverShares?: string;
  price: string;
  /** A US trade's rate: "₹89.90". */
  priceNote?: string;
  amount: string;
  heldAfter: string;
  avgAfter: string;
  /** How this trade moved the average ("▲ ₹153.46"), or why it didn't. */
  avgMove?: { text: string; tone: "rise" | "fall" | "quiet" };
  /** A US holding's average in dollars after it. */
  avgUsd?: string;
  made?: { text: string; tone: "up" | "down" };
  /** "over by 20" for a sell of more than was held. */
  problem?: string;
}

export interface StepPoint {
  date: string;
  quantity: number;
  kind: TradeKind;
  label: string;
}

export interface BookView {
  ref: HoldingRef;
  /** "NTAP · US · since May 15, 2023", or the dates it was held for when sold out. */
  kindLine: string;
  tags: string[];
  sentence: Part[];
  figures: { label: string; value: string; note: string }[];
  steps: StepPoint[];
  firstDate: string;
  today: string;
  cameIn: { label: string; quantity: string; source: "Market" | "ESPP" | "RSU" }[];
  sold: string;
  heldToday: string;
  costs: { label: string; value: string }[];
  priceToday?: string;
  average?: string;
  rows: BookRowView[];
}

const SOURCE_LABEL = { Market: "Bought", ESPP: "ESPP", RSU: "RSU vested" } as const;
const COST_LABEL = { Market: "Bought", ESPP: "ESPP, at what you paid", RSU: "RSU, at its value on the day" } as const;

export function bookView(trades: InvestmentTransaction[], all: TradeEntry[], ref: HoldingRef, held: HoldingRow | undefined, today: string): BookView {
  const own = trades.filter((t) => t.market === ref.market && t.symbol === ref.symbol);
  const entries = all.filter((e) => e.market === ref.market && e.symbol === ref.symbol);
  const t = tradeTotals(entries);
  const latest = entries[0];
  const first = entries.at(-1)!;
  const us = ref.market === "US";
  const quantity = latest.after.quantityAfter;
  const avg = latest.after.avgCostInrAfter;
  const came = howItCameIn(own);
  const plans = [...new Set(own.map((x) => x.source).filter((s) => s !== "Market"))];
  const lastHeld = entries.find((e) => e.after.quantityAfter > 0);

  const rows: BookRowView[] = entries.map((e, i) => {
    const before = entries[i + 1]?.after;
    const move = before && e.after.quantityAfter > 0 && before.quantityAfter > 0 ? e.after.avgCostInrAfter - before.avgCostInrAfter : 0;
    const avgMove =
      Math.abs(move) >= 0.005
        ? { text: `${move > 0 ? "▲" : "▼"} ${perShare(Math.abs(move))}`, tone: move > 0 ? ("rise" as const) : ("fall" as const) }
        : e.kind === "sell" && e.after.quantityAfter > 0
          ? { text: "a sale doesn't move it", tone: "quiet" as const }
          : !before
            ? { text: "first trade", tone: "quiet" as const }
            : undefined;
    return {
      id: e.id,
      kind: e.kind,
      kindLabel: KIND_LABEL[e.kind],
      date: formatDate(e.date),
      shares: `${e.kind === "sell" ? MINUS : "+"}${quantityText(e.quantity)}`,
      ...(e.coverQuantity > 0 && { coverShares: `${MINUS}${quantityText(e.coverQuantity)}` }),
      price: formatMoney(e.currency, e.price),
      ...(us && e.fxRateToInr !== undefined && { priceNote: formatInrExact(e.fxRateToInr) }),
      amount: formatInr(moneyNote(e)),
      heldAfter: quantityText(e.after.quantityAfter),
      avgAfter: e.after.quantityAfter > 0 ? perShare(e.after.avgCostInrAfter) : "—",
      avgMove,
      ...(us && e.after.quantityAfter > 0 && { avgUsd: formatMoney("USD", e.after.avgCostNativeAfter) }),
      made: made(e.gainInr),
      ...(e.oversoldBy > 0 && { problem: `over by ${quantityText(e.oversoldBy)}` }),
    };
  });

  const steps: StepPoint[] = [...entries].reverse().map((e) => ({ date: e.date, quantity: e.after.quantityAfter, kind: e.kind, label: `${formatDate(e.date)} · ${KIND_LABEL[e.kind]} · ${quantityText(e.after.quantityAfter)} held after` }));
  const priceInr = held && held.price !== null && held.quantity > 0 ? held.valueInr / held.quantity : null;
  const sentence: Part[] =
    quantity > 0
      ? [{ text: plural(t.trades, "trade"), strong: true }, { text: ` in ${ref.name} since ` }, { text: formatDate(first.date), strong: true }, { text: ". You hold " }, { text: quantityText(quantity), strong: true }, { text: " at an average of " }, { text: perShare(avg), strong: true }, { text: " a share." }]
      : [{ text: plural(t.trades, "trade"), strong: true }, { text: ` in ${ref.name}, from ` }, { text: formatDate(first.date), strong: true }, { text: " to " }, { text: formatDate(latest.date), strong: true }, { text: ". You sold out of it" }, ...(t.sales + t.covers > 0 ? [{ text: `, ${t.gainInr < 0 ? "losing" : "making"} ` }, { text: signedInr(t.gainInr), strong: true }] : []), { text: "." }];

  return {
    ref,
    kindLine: quantity > 0 ? `${ref.symbol} · ${us ? "US" : "India"} · since ${formatDate(first.date)}` : `${ref.symbol} · ${us ? "US" : "India"} · ${formatDate(first.date)} to ${formatDate(latest.date)}`,
    tags: quantity > 0 ? plans : ["Sold out"],
    sentence,
    figures: [
      { label: "You hold", value: quantityText(quantity), note: quantity > 0 ? "shares" : `sold out on ${formatDate(latest.date)}` },
      { label: "Average cost", value: quantity > 0 ? perShare(avg) : "—", note: quantity > 0 ? (us ? `${formatMoney("USD", latest.after.avgCostNativeAfter)} a share` : "a share") : lastHeld ? `was ${perShare(lastHeld.after.avgCostInrAfter)} before the sale` : "" },
      { label: "Put in", value: formatLakh(t.inInr), note: t.outInr > 0 ? `out ${formatLakh(t.outInr)}` : "nothing taken out" },
      { label: "Made on sales", value: t.sales + t.covers > 0 ? signedLakh(t.gainInr) : "—", note: t.sales + t.covers > 0 ? [t.sales > 0 ? plural(t.sales, "sale") : "", t.covers > 0 ? plural(t.covers, "sell-to-cover") : ""].filter(Boolean).join(", ") : "no sales yet" },
    ],
    steps,
    firstDate: first.date,
    today,
    cameIn: came.sources.map((s) => ({ label: SOURCE_LABEL[s.source], quantity: quantityText(s.quantity), source: s.source })),
    sold: quantityText(came.sold),
    heldToday: `${quantityText(quantity)} of ${quantityText(came.sources.reduce((s, x) => s + x.quantity, 0))}`,
    costs: came.sources.map((s) => ({ label: COST_LABEL[s.source], value: perShare(s.avgCostInr) })),
    ...(priceInr !== null && { priceToday: perShare(priceInr) }),
    ...(quantity > 0 && { average: perShare(avg) }),
    rows,
  };
}
