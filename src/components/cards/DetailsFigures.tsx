"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { MonthAmount } from "@/lib/aggregate/cardSpend";
import { formatMonthShort, formatMonthYear } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";

/** A figure on the details card that can point at where it comes from (#117, D). */
export type DetailsFigure = "available" | "total" | "highest" | "lowest";

const FigureContext = createContext<{ figure: DetailsFigure | null; pointAt: (figure: DetailsFigure | null) => void }>({
  figure: null,
  pointAt: () => {},
});

// Moving from one figure to the next passes through none for an instant; waiting this long first keeps the chart from blinking.
const LET_GO_MS = 80;

/** Which figure the pointer, a tap or keyboard focus is on, for the parts of the card that light up with it. */
export function DetailsFigureProvider({ children }: { children: ReactNode }) {
  const [figure, setFigure] = useState<DetailsFigure | null>(null);
  const letGo = useRef<number | undefined>(undefined);
  const pointAt = useCallback((next: DetailsFigure | null) => {
    window.clearTimeout(letGo.current);
    if (next === null) letGo.current = window.setTimeout(() => setFigure(null), LET_GO_MS);
    else setFigure(next);
  }, []);
  useEffect(() => () => window.clearTimeout(letGo.current), []);
  return <FigureContext value={{ figure, pointAt }}>{children}</FigureContext>;
}

export function useDetailsFigure() {
  return useContext(FigureContext);
}

/** A figure that points at where it comes from while it's hovered or focused, or after a tap on a phone. */
export function PointingFigure({ figure, className, children }: { figure: DetailsFigure; className: string; children: ReactNode }) {
  const { figure: current, pointAt } = useDetailsFigure();
  return (
    <div
      tabIndex={0}
      data-pointed={current === figure ? "" : undefined}
      className={`-mx-2 -my-1 rounded-[9px] px-2 py-1 transition-colors outline-offset-2 hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent data-pointed:bg-fill ${className}`}
      onPointerEnter={(e) => e.pointerType !== "touch" && pointAt(figure)}
      onPointerLeave={(e) => e.pointerType !== "touch" && pointAt(null)}
      onPointerDown={(e) => e.pointerType === "touch" && pointAt(current === figure ? null : figure)}
      onFocus={() => pointAt(figure)}
      onBlur={() => pointAt(null)}
    >
      {children}
    </div>
  );
}

type MonthFigure = Exclude<DetailsFigure, "available">;

/**
 * The small chart that opens under the figures when a month figure is pointed
 * at: every month of the period as a bar, the highest or lowest one picked out,
 * or all of them for the total. It floats over Next due, like the hover cards,
 * and is decoration: the figures already say the same in words.
 */
export function MonthsChart({ months, highest, lowest }: { months: MonthAmount[]; highest: MonthAmount | null; lowest: MonthAmount | null }) {
  const { figure } = useDetailsFigure();
  const open = figure === "total" || figure === "highest" || figure === "lowest";
  // What it last showed, so it fades out as it was instead of emptying first; and how often it's opened, so the bars grow each time.
  const [shown, setShown] = useState<MonthFigure>("total");
  const [opens, setOpens] = useState(0);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && figure !== shown) setShown(figure);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpens(opens + 1);
  }
  if (months.length === 0) return null;

  const picked = shown === "highest" ? highest : shown === "lowest" ? lowest : null;
  const largest = Math.max(0, ...months.map((m) => m.amount));
  const total = months.reduce((sum, m) => sum + m.amount, 0);
  const first = months[0].month;
  const last = months[months.length - 1].month;
  const title = picked
    ? `${shown === "highest" ? "Highest" : "Lowest"} · ${formatMonthYear(picked.month)}`
    : first === last
      ? formatMonthYear(first)
      : `${formatMonthShort(first)}${first.slice(0, 4) === last.slice(0, 4) ? "" : ` ${first.slice(0, 4)}`} to ${formatMonthYear(last)}`;
  // A label under every month up to a year's worth; beyond that, every few months.
  const every = Math.ceil(months.length / 12);

  return (
    <div
      aria-hidden="true"
      data-open={open ? "" : undefined}
      className="pointer-events-none absolute inset-x-0 top-full z-20 mt-2 origin-top rounded-[16px] border border-surface-line bg-surface px-3.5 pt-3 pb-2.5 opacity-0 shadow-pop [transform:translateY(-4px)_scale(0.98)] data-open:opacity-100 data-open:[transform:none] motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out"
    >
      <div className="flex items-center justify-between gap-3 text-xs font-bold text-muted">
        <span>{title}</span>
        <span className="font-extrabold text-fg tabular-nums">{formatInr(picked ? picked.amount : total)}</span>
      </div>
      <div className="mt-2.5 flex h-[58px] items-end gap-[5px]">
        {months.map((m, i) => (
          <span
            key={`${opens}-${shown}-${m.month}`}
            className={`min-w-0 flex-1 origin-bottom rounded-t-[5px] rounded-b-[2px] motion-safe:animate-bar-grow ${m.month === picked?.month ? "bg-heat-5" : "bg-heat-3"} ${picked && m.month !== picked.month ? "opacity-30" : ""}`}
            style={{ height: `${Math.max(4, largest > 0 ? (m.amount / largest) * 100 : 0)}%`, animationDelay: `${i * 25}ms` }}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-[5px] text-center text-[9.5px] font-bold text-muted">
        {months.map((m, i) => (
          <span key={m.month} className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
            {every === 1 ? formatMonthShort(m.month)[0] : i % every === 0 ? formatMonthShort(m.month) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
