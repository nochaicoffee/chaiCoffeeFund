"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { MonthDetail } from "@/lib/aggregate/cardSpend";
import { formatMonthYear } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";

const TIP_ID = "heatmap-month-card";

export interface HeatmapCardInfo {
  name: string;
  /** A CSS colour for the card's swatch. */
  swatch: string;
}

/**
 * The heatmap's month card (#104): hovering, focusing or tapping a month with
 * statements shows a dark card with its total, how it compares with that
 * year's monthly average, a split by card, and whether its bills are paid. The
 * card glides from cell to cell rather than reappearing. Cells opt in with
 * `data-month`; the active one gets `data-active`, which lifts it and ripples
 * its rings.
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
  const wrap = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLElement | null>(null);
  const [month, setMonth] = useState<string | null>(null);

  function show(target: EventTarget | null) {
    const cell = (target as HTMLElement | null)?.closest<HTMLElement>("[data-month]");
    if (!cell || !wrap.current?.contains(cell) || !details[cell.dataset.month!]) return;
    if (active.current !== cell) {
      active.current?.removeAttribute("data-active");
      active.current?.removeAttribute("aria-describedby");
      cell.setAttribute("data-active", "");
      cell.setAttribute("aria-describedby", TIP_ID);
      active.current = cell;
    }
    setMonth(cell.dataset.month!);
  }

  function hide() {
    active.current?.removeAttribute("data-active");
    active.current?.removeAttribute("aria-describedby");
    active.current = null;
    setMonth(null);
  }

  // Placed after its content renders, so its own size is known: above the cell, or below it near the top of the window.
  useLayoutEffect(() => {
    const box = wrap.current, card = tip.current, cell = active.current;
    if (!box || !card) return;
    if (!month || !cell) {
      delete card.dataset.open;
      return;
    }
    const outer = box.getBoundingClientRect(), target = cell.getBoundingClientRect();
    const width = card.offsetWidth, height = card.offsetHeight;
    const centre = target.left - outer.left + target.width / 2;
    const x = Math.min(Math.max(centre - width / 2, 0), Math.max(0, outer.width - width));
    const below = target.top - height - 12 < 8;
    const y = below ? target.bottom - outer.top + 12 : target.top - outer.top - height - 12;
    // It glides between cells once open; when it opens, it appears where it is.
    const opening = card.dataset.open === undefined;
    if (opening) card.style.transition = "none";
    card.style.setProperty("--x", `${x}px`);
    card.style.setProperty("--y", `${y}px`);
    card.style.setProperty("--arrow", `${Math.min(Math.max(centre - x, 16), width - 16)}px`);
    card.dataset.below = String(below);
    if (opening) {
      void card.offsetWidth;
      card.style.transition = "";
    }
    card.dataset.open = "";
  }, [month]);

  const detail = month ? details[month] : undefined;
  const year = month ? Number(month.slice(0, 4)) : 0;
  const average = averages[year] ?? 0;
  const versus = detail && average > 0 ? (detail.total - average) / average : null;

  return (
    <div
      ref={wrap}
      className="relative"
      onPointerOver={(e) => e.pointerType !== "touch" && show(e.target)}
      onPointerDown={(e) => e.pointerType === "touch" && show(e.target)}
      onPointerLeave={(e) => e.pointerType !== "touch" && hide()}
      onFocus={(e) => show(e.target)}
      onBlur={(e) => !wrap.current?.contains(e.relatedTarget as Node | null) && hide()}
      onKeyDown={(e) => e.key === "Escape" && hide()}
      onScrollCapture={hide}
    >
      {children}
      <div
        ref={tip}
        id={TIP_ID}
        role="tooltip"
        className="pointer-events-none absolute top-0 left-0 z-20 w-[256px] rounded-[16px] bg-ink p-3.5 text-on-ink opacity-0 shadow-card [transform:translate(var(--x,0px),var(--y,0px))_scale(0.96)] data-open:opacity-100 data-open:[transform:translate(var(--x,0px),var(--y,0px))] motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out"
      >
        {detail && month && (
          <>
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-on-card-muted">
              <span>{formatMonthYear(month)}</span>
              {month === peak ? (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold text-ink">Peak</span>
              ) : month === current ? (
                <span className="rounded-full bg-on-card-fill px-2 py-0.5 text-[10px] font-extrabold">This month</span>
              ) : null}
            </div>
            <div className="mt-0.5 text-2xl leading-tight font-extrabold tabular-nums">{formatInr(detail.total)}</div>
            {versus !== null && (
              <div className={`mt-0.5 text-xs font-semibold ${versus >= 0 ? "text-[var(--tip-up)]" : "text-[var(--tip-down)]"}`}>
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
                  <span className="min-w-0 flex-1 truncate text-on-card-muted">{cards[c.cardId]?.name ?? "Card"}</span>
                  <span className="font-extrabold tabular-nums">{formatInr(c.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2.5 border-t border-on-card-line pt-2 text-[11px] font-semibold text-on-card-muted">
              {detail.pending === 0
                ? `${detail.statements} ${detail.statements === 1 ? "statement" : "statements"} · all paid`
                : `${detail.pending} ${detail.pending === 1 ? "bill" : "bills"} pending · ${formatInr(detail.pendingAmount)} left to pay`}
            </div>
          </>
        )}
        <span
          aria-hidden="true"
          className="absolute -bottom-1.5 left-[var(--arrow,50%)] size-3 -translate-x-1/2 rotate-45 rounded-[2px] bg-ink in-data-[below=true]:top-[-6px] in-data-[below=true]:bottom-auto"
        />
      </div>
    </div>
  );
}
