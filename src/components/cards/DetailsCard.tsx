import type { ReactNode } from "react";
import type { CardDetails, MonthAmount } from "@/lib/aggregate/cardSpend";
import type { Card } from "@/lib/sheets/types";
import { formatMonthShort, formatMonthYear } from "@/lib/format/date";
import { cardName, optionLabel } from "@/lib/format/labels";
import { CrossfadeBackground } from "../motion/CrossfadeBackground";
import { RollingNumber } from "../motion/RollingNumber";
import { RingTexture } from "../RingTexture";
import { cardGradient, cardSwatch } from "./CardTile";
import { DetailsFigureProvider, MonthsChart, PointingFigure, type DetailsFigure } from "./DetailsFigures";
import { DetailsHeader } from "./DetailsHeader";
import { LimitBar } from "./LimitBar";
import { NextDue } from "./NextDue";

const ALL_CARDS_BACKGROUND =
  "radial-gradient(circle at 92% 6%, var(--card-emerald-glow), transparent 42%), linear-gradient(150deg, var(--card-emerald-from), var(--card-emerald-to))";

function Stat({ figure, label, value, marker, suffix }: { figure: DetailsFigure; label: string; value: ReactNode; marker?: "up" | "down"; suffix?: string }) {
  return (
    <PointingFigure figure={figure} className="flex min-w-0 items-center justify-between gap-3">
      <span className="text-xs font-semibold whitespace-nowrap text-muted">
        {marker === "up" && <span className="text-negative" aria-hidden="true">▲ </span>}
        {marker === "down" && <span className="text-positive" aria-hidden="true">▼ </span>}
        {label}
      </span>
      <span className="text-sm font-bold whitespace-nowrap tabular-nums">
        {value} {suffix && <span className="text-[11px] font-semibold text-muted">{suffix}</span>}
      </span>
    </PointingFigure>
  );
}

/**
 * The details card from the final design: the selected tile's colour as an inset
 * header with outstanding, utilization and the average on the limit bar; a 2×2 of
 * available, highest, total and lowest; and the Next due bar split by pending bill.
 * Its interactions (#117, chosen from design/cards-interactions): the limit bar
 * reads out any point on it, the numbers roll to new values, a light follows the
 * pointer on the header, the figures point at where they come from, and Next due
 * focuses a bill, switches to a due-date timeline, and folds paid bills away.
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
  const label = card
    ? `${optionLabel(card.issuer)}${card.last4 ? ` · •••• ${card.last4}` : ""}`
    : `All Cards · ${cardCount} ${cardCount === 1 ? "card" : "cards"}`;
  const background = card ? cardGradient(card.color) : ALL_CARDS_BACKGROUND;
  // The average's pill is kept off the bar's very ends, so its text stays inside the card.
  const averageAt = details.averageOnLimit !== null && details.average > 0 ? Math.min(0.92, Math.max(0.08, details.averageOnLimit)) : null;
  const bills = details.due.map((d) => {
    const owner = cardsById.get(d.statement.cardId);
    return {
      id: d.statement.id,
      name: cardName(owner ?? { name: "Card" }),
      swatch: cardSwatch(owner?.color),
      remaining: d.remaining,
      dueDate: d.statement.dueDate,
      daysUntilDue: d.daysUntilDue,
    };
  });

  return (
    <DetailsFigureProvider>
      <section aria-label={`${card ? cardName(card) : "All Cards"} details`} className="flex flex-col gap-4 rounded-[24px] border border-surface-line bg-surface p-[22px] shadow-soft">
        <DetailsHeader
          className="relative isolate -mx-3 -mt-3 flex flex-col gap-4 rounded-[18px] border border-on-card-line px-3 pt-3 pb-3.5 text-on-card shadow-tile"
          style={{ background }}
        >
          {/* Selecting another card fades this one's colour into the next, and its numbers roll to theirs (#102, #117). */}
          <CrossfadeBackground background={background} />
          <RingTexture
            width={596}
            height={200}
            dx={20}
            dy={44}
            first={26}
            step={26}
            stroke="var(--rings-light)"
            opacity={0.07}
            ringsClassName="origin-bottom-right ease-out motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-data-lit/head:scale-[1.08]"
          />
          {/* As tall as the Edit card button even without it, so the header doesn't grow when a card is selected. */}
          <div className="flex min-h-11 items-center justify-between gap-3 md:min-h-[26px]">
            <span className="min-w-0 truncate text-xs font-semibold text-on-card-muted">{card ? `${cardName(card)} · ${label}` : label}</span>
            {action}
          </div>
          <div className="text-[26px] leading-none font-extrabold tabular-nums">
            <RollingNumber value={details.outstanding} format="inr" />{" "}
            <span className="text-xs font-bold text-on-card-muted">
              outstanding · {details.utilization === null ? "no limit" : <RollingNumber value={details.utilization} format="percent" />}
            </span>
          </div>
          {details.limit > 0 && (
            <LimitBar
              limit={details.limit}
              used={(details.utilization ?? 0) * details.limit}
              available={details.available}
              average={details.average}
              averageAt={averageAt}
              allCards={!card}
            />
          )}
        </DetailsHeader>

        <div className="relative">
          <div className="grid grid-cols-1 gap-x-[18px] gap-y-2.5 sm:grid-cols-[1fr_1px_1fr]">
            <Stat figure="available" label="Available" value={<RollingNumber value={details.available} format="inr" />} />
            <div className="hidden bg-divider sm:row-span-2 sm:block" aria-hidden="true" />
            <Stat figure="highest" label="Highest month" marker="up" value={details.highest ? <RollingNumber value={details.highest.amount} format="inr" /> : "—"} suffix={month(details.highest)} />
            <Stat figure="total" label={`Total spent (${periodLabel})`} value={<RollingNumber value={details.total} format="inr" />} />
            <Stat figure="lowest" label="Lowest month" marker="down" value={details.lowest ? <RollingNumber value={details.lowest.amount} format="inr" /> : "—"} suffix={month(details.lowest)} />
          </div>
          <MonthsChart months={details.months} highest={details.highest} lowest={details.lowest} />
        </div>

        <NextDue bills={bills} card={card?.id ?? "all"} />
      </section>
    </DetailsFigureProvider>
  );
}
