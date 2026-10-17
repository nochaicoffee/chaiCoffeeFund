import type { CSSProperties } from "react";
import type { HeatCell, HeatRow, MonthAmount, MonthKey, YearTotal } from "@/lib/aggregate/cardSpend";
import { formatMonthShort, formatMonthYear } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";

const MONTHS = Array.from({ length: 12 }, (_, i) => `2000-${String(i + 1).padStart(2, "0")}`);
// Month columns never shrink below 46px, so every amount fits; the table scrolls inside its card instead.
const GRID = "grid grid-cols-[44px_repeat(12,minmax(46px,1fr))_104px] items-center gap-1.5";
const NO_DATA_STRIPES = "repeating-linear-gradient(135deg, var(--heat-no-data) 0 5px, transparent 5px 11px)";

function Swatch({ style, className = "" }: { style?: CSSProperties; className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-3 rounded-[4px] ${className}`} style={style} />;
}

function Cell({ cell, isPeak, isCurrent }: { cell: HeatCell; isPeak: boolean; isCurrent: boolean }) {
  const label = formatMonthYear(cell.month);
  if (cell.state === "upcoming") {
    return <div role="cell" aria-label={`${label}: upcoming`} className="h-[52px] rounded-control border-[1.5px] border-dashed border-heat-upcoming" />;
  }
  if (cell.state === "no-data" || cell.amount === null) {
    // The current month is still marked before its statements arrive, so it reads as "in progress", not "missed".
    return (
      <div
        role="cell"
        aria-label={`${label}: no statements${isCurrent ? " yet, this month" : ""}`}
        className={`flex h-[52px] flex-col items-center justify-center rounded-control text-xs font-semibold text-muted ${
          isCurrent ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""
        }`}
        style={{ background: NO_DATA_STRIPES }}
      >
        <span>–</span>
        {isCurrent && <span className="mt-px text-[9px] font-semibold">This month</span>}
      </div>
    );
  }
  const dark = cell.level >= 4;
  const caption = isCurrent ? "This month" : isPeak ? "Peak" : null;
  return (
    <div
      role="cell"
      aria-label={`${label}: ${formatInr(cell.amount)}${caption ? `, ${caption.toLowerCase()}` : ""}`}
      title={`${label}: ${formatInr(cell.amount)}`}
      className={`relative isolate flex h-[52px] flex-col items-center justify-center overflow-hidden rounded-control text-[11px] font-bold tabular-nums ${
        dark ? "text-on-accent" : "text-heat-ink"
      } ${isPeak ? "-translate-y-0.5 shadow-heat-peak" : ""} ${isCurrent ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
      style={{ background: `var(--heat-${cell.level})` }}
    >
      <span aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: "radial-gradient(circle at 90% 8%, var(--heat-glow), transparent 58%)" }} />
      <span>{formatInrCompact(cell.amount)}</span>
      {caption && <span className="mt-px text-[9px] font-semibold opacity-85">{caption}</span>}
    </div>
  );
}

/**
 * The design's spending heatmap: one row of twelve months per year, shaded from
 * the card-spend math, with the peak and the current month marked, and each
 * year's total and monthly average on the right.
 */
export function SpendHeatmap({
  title,
  rows,
  yearTotals,
  peak,
  currentMonth,
}: {
  title: string;
  rows: HeatRow[];
  yearTotals: YearTotal[];
  peak: MonthAmount | null;
  currentMonth: MonthKey;
}) {
  const totals = new Map(yearTotals.map((t) => [t.year, t]));
  const currentMonthNumber = currentMonth.slice(5, 7);
  const showsCurrentYear = rows.some((r) => String(r.year) === currentMonth.slice(0, 4));

  return (
    <section aria-labelledby="heatmap-heading" className="flex flex-col gap-3 rounded-[24px] border border-surface-line bg-surface p-[22px] shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 id="heatmap-heading" className="text-sm font-bold text-fg">
          Spending heatmap <span className="text-muted">· {title}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-[7px] text-[11px] text-muted" aria-hidden="true">
          <Swatch style={{ background: "repeating-linear-gradient(135deg, var(--fill-strong) 0 2px, transparent 2px 4px)" }} />
          <span>No data</span>
          <Swatch className="ml-2 border-[1.5px] border-dashed border-heat-upcoming" />
          <span>Upcoming</span>
          <span className="ml-3">Low</span>
          {[1, 2, 3, 4, 5].map((level) => (
            <Swatch key={level} style={{ background: `var(--heat-${level})` }} />
          ))}
          <span>High</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No statements yet. The heatmap fills in as statements arrive.</p>
      ) : (
        <div className="-mx-[22px] overflow-x-auto px-[22px] pt-1 pb-1">
          <div role="table" aria-label={`Spending by month, ${title}`} className="flex w-max min-w-full flex-col gap-2">
            <div role="row" className={GRID}>
              {/* A real grid cell, so the month labels line up; the text is for screen readers only. */}
              <span role="columnheader">
                <span className="sr-only">Year</span>
              </span>
              {MONTHS.map((m) => {
                const isCurrent = showsCurrentYear && m.slice(5, 7) === currentMonthNumber;
                return (
                  <span
                    role="columnheader"
                    key={m}
                    className={`text-center text-[10px] font-bold tracking-[0.02em] uppercase ${isCurrent ? "text-fg" : "text-muted"}`}
                  >
                    {formatMonthShort(m)}
                    {isCurrent && <span aria-hidden="true" className="ml-1 inline-block size-[5px] rounded-full bg-accent align-middle" />}
                  </span>
                );
              })}
              <span role="columnheader" className="text-right text-[10px] font-bold tracking-[0.02em] text-muted uppercase">
                Year
              </span>
            </div>
            {rows.map((row) => {
              const total = totals.get(row.year);
              return (
                <div role="row" key={row.year} className={GRID}>
                  <span role="rowheader" className="text-xs font-extrabold text-fg">
                    {row.year}
                  </span>
                  {row.cells.map((cell) => (
                    <Cell key={cell.month} cell={cell} isPeak={peak?.month === cell.month} isCurrent={cell.month === currentMonth} />
                  ))}
                  <div role="cell" className="text-right leading-tight">
                    <div className="text-sm font-extrabold tabular-nums">{formatInr(total?.total ?? 0)}</div>
                    {!total || total.total === 0 ? (
                      <div className="text-[10px] font-semibold text-muted">No statements</div>
                    ) : (
                      <div className="text-[10px] font-semibold text-muted tabular-nums">
                        {total.months} {total.months === 1 ? "month" : "months"} · avg {formatInr(total.average)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
