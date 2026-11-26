"use client";

import { useState } from "react";
import type { MonthAmount, MonthKey, HeatRow, YearTotal } from "@/lib/aggregate/cardSpend";
import { ledgerYears, type LedgerRow } from "@/lib/aggregate/heatLedger";
import { formatMonthShort, formatMonthYear } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { RingTexture } from "../RingTexture";
import { NO_DATA_STRIPES } from "./heatStripes";


/** The bar length, in percent of the track, from which a bar is wide enough to hold its own "This month" label. */
const LABEL_ROOM = 45;

/**
 * The heatmap on a phone (docs/design/phone-heatmap.md, option D): a ledger, a row per month with a bar the length of its amount and the
 * heat shade on it, because twelve months and a total are too wide for a phone and a sideways scroll hides most of them. A chip per year
 * picks which year's months show, newest first. The row opens the same month card as a heatmap cell (`data-month`, see MonthCardHover),
 * and carries the same marks: this month's ring, the peak, hatching for no data and a dashed row for a month still to come.
 */
export function HeatmapLedger({
  rows,
  yearTotals,
  peak,
  currentMonth,
  noData,
  tableLabel,
  title,
  className = "",
}: {
  rows: HeatRow[];
  yearTotals: YearTotal[];
  peak: MonthAmount | null;
  currentMonth: MonthKey;
  /** What a month with nothing is: "No statements", "Nothing". */
  noData: string;
  tableLabel: string;
  title: string;
  className?: string;
}) {
  const years = ledgerYears(rows);
  const [picked, setPicked] = useState<number | null>(null);
  const year = years.find((y) => y.year === picked) ?? years[0];
  if (!year) return null;
  const totals = new Map(yearTotals.map((t) => [t.year, t]));
  const total = totals.get(year.year);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {years.length > 1 && (
        <div role="group" aria-label="Year" className="flex gap-1.5">
          {years.map((y) => {
            const on = y.year === year.year;
            const t = totals.get(y.year);
            return (
              <button
                key={y.year}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(y.year)}
                className={`min-w-0 flex-1 cursor-pointer rounded-[14px] border-[length:var(--heat-edge,0px)] border-[color:var(--chart-edge-color,currentColor)] px-1 py-1.5 text-center text-[13px] leading-tight font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${on ? "bg-ink text-on-ink" : "bg-fill"}`}
              >
                {y.year}
                <small className={`block truncate text-[10px] font-bold tabular-nums ${on ? "opacity-70" : "text-muted"}`}>{formatInrCompact(t?.total ?? 0)}</small>
              </button>
            );
          })}
        </div>
      )}
      <div role="list" aria-label={`${tableLabel}, ${title}, ${year.year}`} className="flex flex-col gap-[5px]">
        {year.rows.map((row) => (
          <Row key={row.month} row={row} isPeak={peak?.month === row.month} isCurrent={row.month === currentMonth} noData={noData} />
        ))}
      </div>
      <p className="text-[11px] font-semibold text-muted tabular-nums">
        {!total || total.total === 0 ? noData : `${total.months} ${total.months === 1 ? "month" : "months"} · ${formatInr(total.total)} · avg ${formatInrCompact(total.average)}`}
      </p>
    </div>
  );
}

function Row({ row, isPeak, isCurrent, noData }: { row: LedgerRow; isPeak: boolean; isCurrent: boolean; noData: string }) {
  const label = formatMonthYear(row.month);
  const month = (
    <span className={`text-[10px] font-extrabold tracking-[0.03em] whitespace-nowrap uppercase label-face ${isCurrent ? "text-fg" : "text-muted"}`}>
      {formatMonthShort(row.month)}
      {isCurrent && <span aria-hidden="true" className="ml-[3px] inline-block size-[5px] rounded-full bg-accent align-[1px]" />}
    </span>
  );
  const ring = isCurrent ? "shadow-[0_0_0_1.5px_var(--surface),0_0_0_3px_var(--accent)]" : "";
  const grid = "grid grid-cols-[36px_minmax(0,1fr)_60px] items-center gap-2";

  if (row.state === "upcoming") {
    return (
      <div role="listitem" aria-label={`${label}: upcoming${row.amount ? `, ${formatInr(row.amount)} expected` : ""}`} className={grid}>
        {month}
        <div className="flex h-6 items-center rounded-[9px] border-[1.5px] border-dashed border-heat-upcoming pl-2 text-[10px] font-bold text-muted">{row.amount ? "expected" : ""}</div>
        <span className="text-right text-xs font-semibold text-muted tabular-nums">{row.amount ? formatInrCompact(row.amount) : ""}</span>
      </div>
    );
  }
  if (row.state === "no-data" || row.amount === null) {
    return (
      <div role="listitem" aria-label={`${label}: ${noData.toLowerCase()}${isCurrent ? " yet, this month" : ""}`} className={grid}>
        {month}
        <div className={`flex h-6 items-center rounded-[9px] border-[length:var(--heat-edge,0px)] border-[color:var(--chart-edge-color,currentColor)] pl-2.5 text-[10px] font-bold text-muted ${ring}`} style={{ background: NO_DATA_STRIPES }}>
          {isCurrent ? "This month" : ""}
        </div>
        <span className="text-right text-xs font-semibold text-muted">–</span>
      </div>
    );
  }
  const dark = row.level >= 4;
  const mark = isCurrent ? "This month" : isPeak ? "Peak" : null;
  const inside = row.width >= LABEL_ROOM;
  return (
    <div
      role="listitem"
      aria-label={`${label}: ${formatInr(row.amount)}${isCurrent ? ", this month" : isPeak ? ", peak" : ""}`}
      // Tapping it opens the month card, as a cell does (MonthCardHover).
      data-month={row.month}
      tabIndex={0}
      className={`group/cell ${grid} cursor-default rounded-[9px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      {month}
      <div className={`flex h-6 items-center rounded-[9px] border-[length:var(--heat-edge,0px)] border-[color:var(--chart-edge-color,currentColor)] bg-fill ${ring}`}>
        <div className="relative isolate flex h-full shrink-0 items-center overflow-hidden rounded-[9px] pl-2 transition-[box-shadow] duration-200 group-data-active/cell:shadow-card" style={{ width: `${row.width}%`, background: `var(--heat-${row.level})` }}>
          <RingTexture
            width={120}
            height={24}
            dx={6}
            dy={8}
            first={8}
            step={9}
            stroke={dark ? "var(--rings-light)" : "var(--rings-ink)"}
            opacity={dark ? 0.1 : 0.11}
            sheen="radial-gradient(circle at 96% 0%, var(--heat-glow), transparent 60%)"
            ringsClassName="origin-bottom-right motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out group-data-active/cell:scale-[1.18]"
          />
          {mark && inside && <span className={`relative text-[9.5px] font-extrabold ${dark ? "text-on-accent" : "text-heat-ink"}`}>{mark}</span>}
        </div>
        {/* A short bar (this month, part-way through) has no room for its label, so it goes beside it. */}
        {mark && !inside && <span className="pl-1.5 text-[9.5px] font-extrabold whitespace-nowrap text-muted">{mark}</span>}
      </div>
      <span className="text-right text-xs font-extrabold tabular-nums">{formatInrCompact(row.amount)}</span>
    </div>
  );
}
