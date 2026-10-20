import type { PendingSummary, SpendPeriod, SpendSummary } from "@/lib/aggregate/cardSpend";
import { isPastPeriod, periodPhrase } from "@/lib/aggregate/period";
import { formatMonthYear, formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";

/** A piece of the greeting sentence; `strong` pieces are the figures the design sets in bold. */
export interface SentencePart {
  text: string;
  strong?: boolean;
}

/**
 * The summary under the greeting, as in the design: what was spent in the period,
 * the monthly average, the highest month, then the pending line (PRD §8). A
 * custom range of one month leaves out the average and the highest month, which
 * would only repeat its total (#113); the years read as they always have.
 */
export function summarySentence({
  summary,
  pending,
  period,
  today,
  cardName,
}: {
  summary: SpendSummary;
  pending: PendingSummary;
  period: SpendPeriod;
  today: string;
  cardName?: string;
}): SentencePart[] {
  const on = cardName ? ` on ${cardName}` : "";
  const when = periodPhrase(period, today, summary.months[0]?.month);
  const past = isPastPeriod(period, today);
  const oneMonth = period.kind === "range" && summary.months.length === 1;
  const parts: SentencePart[] = [];

  if (summary.monthsWithStatements === 0) {
    parts.push({ text: `No statements${on} ${period.kind === "all" ? "yet" : when.replace("so far ", "")}. ` });
  } else {
    parts.push({ text: `${past ? "You spent" : "You've spent"} ` }, { text: formatInr(summary.total), strong: true });
    if (oneMonth) parts.push({ text: `${on} ${when}. ` });
    else parts.push({ text: `${on} ${when}, averaging ` }, { text: formatInr(summary.average), strong: true }, { text: " a month. " });
    if (summary.highest && !oneMonth) {
      parts.push(
        { text: formatMonthYear(summary.highest.month), strong: true },
        { text: ` ${past ? "was" : "has been"} your highest month at ` },
        { text: formatInr(summary.highest.amount), strong: true },
        { text: ". " },
      );
    }
  }

  if (pending.count === 0 || pending.nextDueDate === null) {
    parts.push({ text: "No bills are pending." });
  } else {
    const overdue = pending.nextDueDate < today;
    const due = overdue ? `overdue since ${formatShortDate(pending.nextDueDate)}` : `${pending.count === 1 ? "due" : "next due"} ${formatShortDate(pending.nextDueDate)}`;
    parts.push(
      { text: pending.count === 1 ? "1 bill" : `${pending.count} bills`, strong: true },
      { text: ` ${pending.count === 1 ? "is" : "are"} pending, totalling ` },
      { text: formatInr(pending.total), strong: true },
      { text: `, ${due}.` },
    );
  }
  return parts;
}

/** The sentence as plain text, for tests and screen-reader-only use. */
export function sentenceText(parts: SentencePart[]): string {
  return parts.map((p) => p.text).join("");
}
