import type { ReactNode } from "react";
import type { CardDetails, MonthAmount } from "@/lib/aggregate/cardSpend";
import type { Card } from "@/lib/sheets/types";
import { formatMonthShort, formatMonthYear, formatShortDate } from "@/lib/format/date";
import { cardName, formatPercent, optionLabel } from "@/lib/format/labels";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { cardGradient, cardSwatch } from "./CardTile";

const ALL_CARDS_BACKGROUND =
  "radial-gradient(circle at 92% 6%, var(--card-emerald-glow), transparent 42%), linear-gradient(150deg, var(--card-emerald-from), var(--card-emerald-to))";


function Stat({ label, value, marker, suffix }: { label: string; value: string; marker?: "up" | "down"; suffix?: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="text-xs font-semibold whitespace-nowrap text-muted">
        {marker === "up" && <span className="text-negative" aria-hidden="true">▲ </span>}
        {marker === "down" && <span className="text-positive" aria-hidden="true">▼ </span>}
        {label}
      </span>
      <span className="text-sm font-bold whitespace-nowrap tabular-nums">
        {value} {suffix && <span className="text-[11px] font-semibold text-muted">{suffix}</span>}
      </span>
    </div>
  );
}

/**
 * The details card from the final design: the selected tile's colour as an inset
 * header with outstanding, utilization and the average on the limit bar; a 2×2 of
 * available, highest, total and lowest; and the Next due bar split by pending bill.
 */
export function DetailsCard({
  details,
  card,
  cardsById,
  cardCount,
  periodLabel,
  singleYear,
  action,
}: {
  details: CardDetails;
  /** The selected card, or undefined for All Cards. */
  card?: Card;
  cardsById: Map<string, Card>;
  cardCount: number;
  /** "this year", "2025" or "all time". */
  periodLabel: string;
  /** Whether month labels can drop the year. */
  singleYear: boolean;
  /** A control on the coloured header, such as Edit card for the selected card. */
  action?: ReactNode;
}) {
  const month = (m: MonthAmount | null) => (m ? (singleYear ? formatMonthShort(m.month) : formatMonthYear(m.month)) : undefined);
  const dueTotal = details.due.reduce((sum, d) => sum + d.remaining, 0);
  const label = card
    ? `${optionLabel(card.issuer)}${card.last4 ? ` · •••• ${card.last4}` : ""}`
    : `All Cards · ${cardCount} ${cardCount === 1 ? "card" : "cards"}`;

  return (
    <section aria-label={`${card ? cardName(card) : "All Cards"} details`} className="flex flex-col gap-4 rounded-[24px] border border-surface-line bg-surface p-[22px] shadow-soft">
      <div
        className="-mx-3 -mt-3 flex flex-col gap-4 rounded-[18px] border border-on-card-line px-3 pt-3 pb-3.5 text-on-card shadow-tile"
        style={{ background: card ? cardGradient(card.color) : ALL_CARDS_BACKGROUND }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-xs font-semibold text-on-card-muted">{card ? `${cardName(card)} · ${label}` : label}</span>
          {action}
        </div>
        <div className="text-[26px] leading-none font-extrabold tabular-nums">
          {formatInr(details.outstanding)}{" "}
          <span className="text-xs font-bold text-on-card-muted">outstanding · {details.utilization === null ? "no limit" : formatPercent(details.utilization)}</span>
        </div>
        {details.limit > 0 && (
          <div>
            <div className="relative h-[50px]">
              {details.averageOnLimit !== null && details.average > 0 && (
                <div
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                  style={{ left: `${Math.min(92, Math.max(8, details.averageOnLimit * 100))}%` }}
                >
                  <span className="rounded-full bg-on-card-fill px-[9px] py-[3px] text-[10px] font-bold whitespace-nowrap tabular-nums">
                    Avg · {formatInr(details.average)}
                  </span>
                  <span className="mt-0.5 h-3 w-px bg-on-card opacity-50" aria-hidden="true" />
                </div>
              )}
              <div className="absolute inset-x-0 top-9 h-3.5 overflow-hidden rounded-full bg-on-card-fill" aria-hidden="true">
                <div
                  className={`h-full rounded-full ${card ? "bg-on-card" : "bg-on-card-lime"}`}
                  style={{ width: `${Math.min(100, (details.utilization ?? 0) * 100)}%` }}
                />
              </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-on-card-muted tabular-nums">
              <span>₹0</span>
              <span>{formatInr(details.limit)} limit</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-x-[18px] gap-y-2.5 sm:grid-cols-[1fr_1px_1fr]">
        <Stat label="Available" value={formatInr(details.available)} />
        <div className="hidden bg-divider sm:row-span-2 sm:block" aria-hidden="true" />
        <Stat label="Highest month" marker="up" value={details.highest ? formatInr(details.highest.amount) : "—"} suffix={month(details.highest)} />
        <Stat label={`Total spent (${periodLabel})`} value={formatInr(details.total)} />
        <Stat label="Lowest month" marker="down" value={details.lowest ? formatInr(details.lowest.amount) : "—"} suffix={month(details.lowest)} />
      </div>

      <div className="mt-auto flex flex-col justify-center gap-2 rounded-[14px] bg-fill px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11px] text-muted">
            Next due · {details.due.length === 0 ? "nothing pending" : `${details.due.length} pending`}
          </span>
          <span className="text-[15px] font-extrabold tabular-nums">{formatInr(dueTotal)}</span>
        </div>
        {details.due.length > 0 && (
          <>
            <div className="flex h-[26px] gap-[3px] overflow-hidden rounded-[9px]" role="img" aria-label={`Due: ${details.due.map((d) => `${cardName(cardsById.get(d.statement.cardId) ?? { name: "Card" })} ${formatInr(d.remaining)}`).join(", ")}`}>
              {details.due.map((d) => {
                const share = dueTotal > 0 ? d.remaining / dueTotal : 1 / details.due.length;
                return (
                  <div
                    key={d.statement.id}
                    className="flex items-center overflow-hidden pl-[9px] text-[11px] font-extrabold whitespace-nowrap text-on-accent"
                    style={{ width: `${share * 100}%`, background: cardSwatch(cardsById.get(d.statement.cardId)?.color) }}
                  >
                    {share >= 0.14 && formatInrCompact(d.remaining)}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
              {details.due.map((d) => (
                <span key={d.statement.id} className="inline-flex items-center gap-1.5 text-[11px] font-bold whitespace-nowrap">
                  <span className="size-2 shrink-0 rounded-[3px]" style={{ background: cardSwatch(cardsById.get(d.statement.cardId)?.color) }} aria-hidden="true" />
                  {cardName(cardsById.get(d.statement.cardId) ?? { name: "Card" })} {formatInrCompact(d.remaining)}
                  <span className="font-semibold text-muted">
                    · {d.daysUntilDue < 0 ? `overdue since ${formatShortDate(d.statement.dueDate)}` : formatShortDate(d.statement.dueDate)}
                  </span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
