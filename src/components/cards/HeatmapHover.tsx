"use client";

import type { ReactNode } from "react";
import type { MonthDetail } from "@/lib/aggregate/cardSpend";
import { formatMonthYear } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { MonthCardHover } from "../shell/MonthCardHover";

export interface HeatmapCardInfo {
  name: string;
  /** A CSS colour for the card's swatch. */
  swatch: string;
}

/**
 * The heatmap's month card (#104): hovering, focusing or tapping a month with
 * statements shows a light card with its total, how it compares with that
 * year's monthly average, a split by card, and whether its bills are paid. The
 * hover itself (gliding card, lifted cell) is the shared MonthCardHover.
 */
export function HeatmapHover({
  details,
  cards,
  averages,
  peak,
  current,
  children,
}: {
  details: Record<string, MonthDetail>;
  cards: Record<string, HeatmapCardInfo>;
  /** Each year's monthly average, by year. */
  averages: Record<number, number>;
  peak: string | null;
  current: string;
  children: ReactNode;
}) {
  function card(month: string) {
    const detail = details[month];
    const year = Number(month.slice(0, 4));
    const average = averages[year] ?? 0;
    const versus = average > 0 ? (detail.total - average) / average : null;
    return (
      <>
        <div className="flex items-center justify-between gap-2 text-xs font-bold text-muted">
          <span>{formatMonthYear(month)}</span>
          {month === peak ? (
            <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-extrabold text-accent-text">Peak</span>
          ) : month === current ? (
            <span className="rounded-full bg-fill px-2 py-0.5 text-[10px] font-extrabold">This month</span>
          ) : null}
        </div>
        <div className="mt-0.5 text-2xl leading-tight font-extrabold tabular-nums">{formatInr(detail.total)}</div>
        {versus !== null && (
          <div className={`mt-0.5 text-xs font-semibold ${versus >= 0 ? "text-negative" : "text-positive"}`}>
            {versus >= 0 ? "▲" : "▼"} {Math.round(Math.abs(versus) * 100)}% {versus >= 0 ? "above" : "below"} your {year} average of {formatInr(average)}
          </div>
        )}
        {detail.total > 0 && detail.byCard.length > 1 && (
          <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
            {detail.byCard
              .filter((c) => c.amount > 0)
              .map((c) => (
                <span key={c.cardId} className="h-full" style={{ flexGrow: c.amount, background: cards[c.cardId]?.swatch }} />
              ))}
          </div>
        )}
        <ul className="mt-2.5 flex flex-col gap-1">
          {detail.byCard.map((c) => (
            <li key={c.cardId} className="flex items-center gap-2 text-xs font-semibold">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-[3px]" style={{ background: cards[c.cardId]?.swatch }} />
              <span className="min-w-0 flex-1 truncate text-muted">{cards[c.cardId]?.name ?? "Card"}</span>
              <span className="font-extrabold tabular-nums">{formatInr(c.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2.5 border-t border-divider pt-2 text-[11px] font-semibold text-muted">
          {detail.pending === 0
            ? `${detail.statements} ${detail.statements === 1 ? "statement" : "statements"} · all paid`
            : `${detail.pending} ${detail.pending === 1 ? "bill" : "bills"} pending · ${formatInr(detail.pendingAmount)} left to pay`}
        </div>
      </>
    );
  }

  return (
    <MonthCardHover resolve={(cell) => (cell.dataset.month && details[cell.dataset.month] ? cell.dataset.month : null)} render={card}>
      {children}
    </MonthCardHover>
  );
}
