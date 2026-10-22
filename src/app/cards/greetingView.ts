import { monthRange, pendingStatements, spendSeries, type CardData, type MonthDetail, type MonthKey, type SpendPeriod, type SpendSummary } from "@/lib/aggregate/cardSpend";
import { periodPhrase } from "@/lib/aggregate/period";
import { formatMonthYear, formatShortDate, MONTH_NAMES } from "@/lib/format/date";
import { cardName } from "@/lib/format/labels";
import { formatInr } from "@/lib/format/money";
import { whenFrom } from "@/lib/format/subscriptionLabels";
import { cardSwatch } from "@/components/cards/CardTile";

/**
 * What the Cards greeting's figures explain (Prathik's pick A, 2026-10-22; the same pointing
 * sentence as Subscriptions' 7A, design/cards-greeting): the period's months stacked by card,
 * the average across them, what made up the highest month, and the pending bills. Built from
 * the same summary as the sentence, so the cards always agree with it, and handed to the
 * client as plain data, keyed as the sentence's `point`s are.
 */

/** A slice of a month's bar: what one card spent, in its colour. */
export interface StripSegment {
  cardId: string;
  /** A CSS colour for the card's swatch. */
  color: string;
  amount: number;
}

/** One month in a card's strip: what was spent, split by card in the Sheet's order. */
export interface StripMonth {
  key: string;
  /** "J", "F", … */
  initial: string;
  total: number;
  /** A month this year that hasn't come yet: drawn dashed. */
  future: boolean;
  segments: StripSegment[];
}

export interface GreetingRow {
  key: string;
  name: string;
  swatch: string;
  initial: string;
  amount: string;
  /** Under the name, for a bill: "Due Nov 4 · in 13 days". */
  note?: string;
  /** Due within 3 days or overdue, as the tiles' pills show it. */
  urgent?: boolean;
  /** A bar's length for a row in a split, 0 to 1. */
  fraction?: number;
}

export interface GreetingCards {
  spent?: { title: string; total: string; months: StripMonth[]; legend: { name: string; swatch: string }[]; note: string };
  average?: { title: string; total: string; months: StripMonth[]; average: number; note: string };
  highest?: { title: string; total: string; months: StripMonth[]; /** The month's key, which is the lit one. */ lit: string; rows: GreetingRow[] };
  pending?: { title: string; total: string; rows: GreetingRow[]; more: string | null };
}

/** The most bills a card lists before it says "and N more". */
const BILLS_SHOWN = 6;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The period's months as a strip, with the rest of this year's months after them, dashed. */
function stripMonths(data: CardData, summary: SpendSummary, period: SpendPeriod, today: string, cardId?: string): StripMonth[] {
  const keys = summary.months.map((m) => m.month);
  const todayYear = Number(today.slice(0, 4));
  const last = keys[keys.length - 1];
  const upcoming = period.kind === "year" && period.year === todayYear && last ? monthRange(last, `${period.year}-12`).slice(1) : [];
  const series = new Map(spendSeries(data, keys).map((p) => [p.month, p]));
  const swatchOf = new Map(data.cards.map((c) => [c.id, cardSwatch(c.color)]));
  const month = (key: string, future: boolean): StripMonth => {
    const byCard = series.get(key)?.byCard ?? {};
    const segments = data.cards
      .filter((c) => (cardId === undefined || c.id === cardId) && (byCard[c.id] ?? 0) > 0)
      .map((c) => ({ cardId: c.id, color: swatchOf.get(c.id)!, amount: byCard[c.id] }));
    return { key, initial: MONTH_NAMES[Number(key.slice(5, 7)) - 1][0], total: segments.reduce((sum, s) => sum + s.amount, 0), future, segments };
  };
  return [...keys.map((key) => month(key, false)), ...upcoming.map((key) => month(key, true))];
}

function span(months: StripMonth[]): string {
  const past = months.filter((m) => !m.future);
  const [first, last] = [past[0], past[past.length - 1]];
  if (!first || !last) return "";
  const word = (key: string) => formatMonthYear(key).split(" ")[0];
  const sameYear = first.key.slice(0, 4) === last.key.slice(0, 4);
  return past.length === 1 ? `${formatMonthYear(first.key)} so far` : `${plural(past.length, "month")} so far, ${sameYear ? word(first.key) : formatMonthYear(first.key)} to ${sameYear ? word(last.key) : formatMonthYear(last.key)}`;
}

/** `summary` and `monthDetails` are the page's own (spendSummary, heatmapMonthDetails), so the cards read the very figures the sentence and heatmap do. */
export function greetingView(data: CardData, summary: SpendSummary, monthDetails: Record<MonthKey, MonthDetail>, period: SpendPeriod, today: string, cardId?: string): GreetingCards {
  if (summary.monthsWithStatements === 0) return pendingOnly(data, today, cardId);
  const months = stripMonths(data, summary, period, today, cardId);
  const when = periodPhrase(period, today, summary.months[0]?.month);
  const usedCards = data.cards.filter((c) => months.some((m) => m.segments.some((s) => s.cardId === c.id)));
  const cards: GreetingCards = {
    spent: {
      title: `Spent ${when}`,
      total: formatInr(summary.total),
      months,
      legend: cardId ? [] : usedCards.map((c) => ({ name: cardName(c), swatch: cardSwatch(c.color) })),
      note: span(months),
    },
    average: { title: "A month, on average", total: formatInr(summary.average), months, average: summary.average, note: `${formatInr(summary.total)} over ${plural(summary.months.length, "month")}` },
    ...pendingOnly(data, today, cardId),
  };
  if (summary.highest) {
    const { month, amount } = summary.highest;
    const split = monthDetails[month]?.byCard.filter((c) => c.amount > 0) ?? [];
    const cardsById = new Map(data.cards.map((c) => [c.id, c]));
    cards.highest = {
      title: formatMonthYear(month),
      total: formatInr(amount),
      months,
      lit: month,
      // One card's month would only repeat its total.
      rows: cardId
        ? []
        : split.flatMap((s) => {
            const card = cardsById.get(s.cardId);
            return card ? [{ key: card.id, name: cardName(card), swatch: cardSwatch(card.color), initial: cardName(card)[0], amount: formatInr(s.amount), fraction: s.amount / split[0].amount }] : [];
          }),
    };
  }
  return cards;
}

/** Just the pending bills' card, for a period with no statements: the sentence still has its pending line. */
function pendingOnly(data: CardData, today: string, cardId?: string): Pick<GreetingCards, "pending"> {
  const bills = pendingStatements(data, today, cardId);
  if (bills.length === 0) return {};
  const cardsById = new Map(data.cards.map((c) => [c.id, c]));
  const rows = bills.flatMap(({ statement, remaining, daysUntilDue }): GreetingRow[] => {
    const card = cardsById.get(statement.cardId);
    if (!card) return [];
    const paid = statement.amountPaid ?? 0;
    return [
      {
        key: statement.id,
        name: cardName(card),
        swatch: cardSwatch(card.color),
        initial: cardName(card)[0],
        amount: formatInr(remaining),
        note: `${daysUntilDue < 0 ? `Overdue since ${formatShortDate(statement.dueDate)}` : `Due ${formatShortDate(statement.dueDate)} · ${whenFrom(today, statement.dueDate)}`}${paid > 0 ? ` · ${formatInr(paid)} paid` : ""}`,
        urgent: daysUntilDue <= 3,
      },
    ];
  });
  const left = bills.length - BILLS_SHOWN;
  return {
    pending: {
      title: plural(bills.length, "pending bill"),
      total: formatInr(bills.reduce((sum, b) => sum + b.remaining, 0)),
      rows: rows.slice(0, BILLS_SHOWN),
      more: left > 0 ? `and ${left} more` : null,
    },
  };
}
