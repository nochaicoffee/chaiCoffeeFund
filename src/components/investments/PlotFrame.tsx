import type { HTMLAttributes, ReactNode, Ref } from "react";
import { axisDate, axisTicks, dateTickIndexes, tickLabel, type StageScale } from "@/app/investments/stageView";

/**
 * The frame round a stage chart (design: gridlines with their values down the left, the dates under it, and, if asked for, money added as
 * bars along the foot). The lines themselves are the children, drawn over the plot area from 0 to 1 in both directions. `plot` goes on the
 * whole area to the right of the values, bars and dates included, so a pointer anywhere along the chart reads a day.
 */
export function PlotFrame({ scale, dates, plot, plotRef, bars, formatTick = tickLabel, endGutter = 0, className = "h-56 md:h-[270px]", children }: {
  scale: StageScale;
  dates: string[];
  plot: HTMLAttributes<HTMLDivElement>;
  plotRef: Ref<HTMLDivElement>;
  /** Heights from 0 to 1, one bar each, drawn along the foot. */
  bars?: number[];
  formatTick?: (v: number) => string;
  /** Room in pixels to the right of the plot, for labels at the end of the lines. */
  endGutter?: number;
  className?: string;
  children: ReactNode;
}) {
  const ticks = axisTicks(scale.min, scale.max);
  const top = (v: number) => `${(1 - (v - scale.min) / (scale.max - scale.min)) * 100}%`;
  const spanDays = dates.length > 1 ? (Date.parse(`${dates.at(-1)}T00:00:00Z`) - Date.parse(`${dates[0]}T00:00:00Z`)) / 86_400_000 : 0;
  const marks = dateTickIndexes(dates.length, 5);
  const muted = { color: "oklch(0.72 0.01 250)" } as const;
  return (
    <div className="flex gap-2">
      <div aria-hidden="true" className={`relative w-9 shrink-0 text-right text-[10.5px] font-bold tabular-nums ${className}`} style={muted}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: top(t) }}>{formatTick(t)}</span>
        ))}
      </div>
      <div ref={plotRef} {...plot} style={{ marginRight: endGutter, ...plot.style }} className={`min-w-0 flex-1 rounded-[10px] focus-visible:outline-2 focus-visible:outline-white ${plot.className ?? ""}`}>
        <div className={`relative ${className}`}>
          {ticks.map((t) => (
            <i key={t} aria-hidden="true" className="absolute inset-x-0 block h-px" style={{ top: top(t), background: "oklch(1 0 0 / 0.09)" }} />
          ))}
          {children}
        </div>
        {bars && bars.length > 0 && (
          <div aria-hidden="true" className="mt-2 flex h-[34px] items-end gap-[2px]">
            {bars.map((b, i) => (
              <i key={i} className="block flex-1 rounded-[2px]" style={{ height: `${Math.max(b > 0 ? 6 : 0, b * 100)}%`, background: "oklch(0.72 0.1 258 / 0.8)" }} />
            ))}
          </div>
        )}
        <div aria-hidden="true" className="relative mt-1.5 h-4 text-[10.5px] font-bold" style={muted}>
          {marks.map((i, k) => (
            <span key={i} className="absolute whitespace-nowrap" style={{ left: `${(i / Math.max(1, dates.length - 1)) * 100}%`, transform: k === 0 ? "none" : k === marks.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}>
              {axisDate(dates[i], spanDays)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
