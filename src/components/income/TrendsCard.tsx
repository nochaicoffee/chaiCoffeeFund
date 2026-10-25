"use client";

import { useState } from "react";
import type { TrendsCard as TrendsData } from "@/app/income/lowerView";
import { formatInrCompact } from "@/lib/format/money";
import { niceTop } from "./chartScale";
import { Segmented } from "../subscriptions/Segmented";
import { useSize } from "../subscriptions/useSize";

type View = "year" | "monthly" | "rhythm";

const PAD = { l: 52, r: 16, t: 18, b: 28 };


/**
 * The wide Trends card (IncomeZ1): money received adding up through the year against last year, with what's still
 * expected dotted to December; the same months side by side; or the pay rhythm, a dot per payment by how many days
 * after its expected day it landed. Under it, the sources that moved most against last year.
 */
export function TrendsCard({ trends }: { trends: TrendsData }) {
  const [view, setView] = useState<View>("year");
  const [box, size] = useSize<HTMLDivElement>({ w: 1100, h: 280 });
  const w = Math.max(280, size.w);
  const h = 280;
  const innerW = w - PAD.l - PAD.r;
  const innerH = h - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (innerW * (i + 0.5)) / 12;

  return (
    <section aria-label="Trends" className="flex min-w-0 flex-col gap-4 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)] md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold">
          Trends <small className="ml-2 text-xs font-semibold text-muted">{view === "rhythm" ? "days after the expected day, a dot per payment" : "money received"}</small>
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {trends.change && view !== "rhythm" && (
            <span className={`text-xs font-extrabold ${trends.change.up ? "text-accent-text" : "text-negative"}`}>
              {trends.change.up ? "↑" : "↓"} {trends.change.text}
            </span>
          )}
          <Segmented label="Show" value={view} onChange={setView} options={[{ value: "year", label: "This year and last" }, { value: "monthly", label: "Month by month" }, { value: "rhythm", label: "Pay rhythm" }]} small />
        </div>
      </div>

      <div ref={box} className="w-full overflow-hidden">
        <svg width={w} height={h} role="img" aria-label={label(trends, view)} className="block max-w-full overflow-visible">
          {view === "rhythm" ? <Rhythm trends={trends} w={w} innerH={innerH} x={x} /> : view === "year" ? <Year trends={trends} innerH={innerH} x={x} w={w} /> : <Monthly trends={trends} innerW={innerW} innerH={innerH} x={x} w={w} />}
          {trends.months.map((m, i) => (
            <text key={m} x={x(i)} y={h - 8} textAnchor="middle" className={`text-[10.5px] font-bold ${i === trends.nowIndex ? "fill-fg" : "fill-muted"}`}>
              {w < 520 ? m[0] : m}
            </text>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] font-semibold text-muted" aria-hidden="true">
        {view === "rhythm" ? (
          <>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-4 rounded-[3px] bg-accent-tint" />
              Within 3 days: on time
            </span>
            <span>{trends.rhythmNote}</span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2.5 rounded-[3px] bg-accent" />
              {trends.year}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2.5 rounded-[3px] bg-fill-strong" />
              {trends.year - 1}
            </span>
            {view === "year" && trends.labels.projected && (
              <span className="inline-flex items-center gap-1.5">
                <i className="size-2.5 rounded-[3px] border border-dashed border-accent" />
                Still expected this year ({trends.labels.projected})
              </span>
            )}
          </>
        )}
      </div>

      {trends.movers.length > 0 && view !== "rhythm" && (
        <dl className="grid grid-cols-1 gap-4 border-t border-divider pt-4 sm:grid-cols-3">
          {trends.movers.map((m) => (
            <div key={m.name} className="flex flex-col gap-0.5">
              <dt className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">{m.name}</dt>
              <dd className={`text-lg font-extrabold tabular-nums ${m.up ? "text-accent-text" : "text-negative"}`}>{m.change}</dd>
              <dd className="text-[11.5px] font-semibold text-muted">{trends.moversNote}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );

  function label(t: TrendsData, v: View) {
    if (v === "rhythm") return `Pay rhythm: ${t.rhythmNote}`;
    return `${t.labels.now}; ${t.labels.then}${t.labels.projected ? `; ${t.labels.projected}` : ""}`;
  }
}

function Axis({ top, innerH, w }: { top: number; innerH: number; w: number }) {
  return (
    <g aria-hidden="true">
      {[0, top / 2, top].map((t) => {
        const y = PAD.t + innerH - (t / top) * innerH;
        return (
          <g key={t}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y} y2={y} className="stroke-divider" strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={PAD.l - 8} y={y + 3.5} textAnchor="end" className="fill-muted text-[10px] font-bold">
              {formatInrCompact(t)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Year({ trends, innerH, x, w }: { trends: TrendsData; innerH: number; x: (i: number) => number; w: number }) {
  const top = niceTop(Math.max(...trends.thisYear, ...trends.lastYear, ...trends.projected.map((v) => v ?? 0)));
  const y = (v: number) => PAD.t + innerH - (v / top) * innerH;
  const path = (values: (number | null)[], from = 0) =>
    values
      .map((v, i) => (v === null || i < from ? null : `${x(i)},${y(v)}`))
      .filter(Boolean)
      .join(" L");
  const now = trends.thisYear.length - 1;
  return (
    <>
      <Axis top={top} innerH={innerH} w={w} />
      <path d={`M${path(trends.lastYear)}`} fill="none" className="stroke-muted" strokeWidth={2} strokeDasharray="5 4" />
      {now >= 0 && <path d={`M${x(0)},${y(0)} L${path(trends.thisYear)} L${x(now)},${y(0)} Z`} className="fill-accent/12" />}
      {now >= 0 && <path d={`M${path(trends.thisYear)}`} fill="none" className="stroke-accent" strokeWidth={3} strokeLinejoin="round" />}
      {trends.projected.length > 0 && now >= 0 && <path d={`M${x(now)},${y(trends.thisYear[now])} L${path(trends.projected, now)}`} fill="none" className="stroke-accent" strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" />}
      {now >= 0 && <circle cx={x(now)} cy={y(trends.thisYear[now])} r={5} className="fill-accent stroke-surface" strokeWidth={2} />}
    </>
  );
}

function Monthly({ trends, innerW, innerH, x, w }: { trends: TrendsData; innerW: number; innerH: number; x: (i: number) => number; w: number }) {
  const top = niceTop(Math.max(...trends.monthly.thisYear, ...trends.monthly.lastYear));
  const bar = Math.max(4, Math.min(22, innerW / 12 / 2 - 3));
  const height = (v: number) => (v / top) * innerH;
  return (
    <>
      <Axis top={top} innerH={innerH} w={w} />
      {trends.months.map((m, i) => {
        const last = trends.monthly.lastYear[i] ?? 0;
        const now = trends.monthly.thisYear[i];
        return (
          <g key={m}>
            <rect x={x(i) - bar - 1} y={PAD.t + innerH - height(last)} width={bar} height={height(last)} rx={4} className="fill-fill-strong" />
            {now !== undefined && <rect x={x(i) + 1} y={PAD.t + innerH - height(now)} width={bar} height={height(now)} rx={4} className="fill-accent" />}
          </g>
        );
      })}
    </>
  );
}

function Rhythm({ trends, w, innerH, x }: { trends: TrendsData; w: number; innerH: number; x: (i: number) => number }) {
  const late = Math.max(8, ...trends.rhythm.map((r) => r.days));
  const early = Math.min(-2, ...trends.rhythm.map((r) => r.days));
  const y = (d: number) => PAD.t + ((late - d) / (late - early)) * innerH;
  const step = (x(1) - x(0)) / 31;
  return (
    <>
      <rect x={PAD.l} width={w - PAD.l - PAD.r} y={y(3)} height={y(0) - y(3)} className="fill-accent-tint" />
      {[early, 0, 3, late].map((d) => (
        <text key={d} x={PAD.l - 8} y={y(d) + 3.5} textAnchor="end" className="fill-muted text-[10px] font-bold">
          {d === 0 ? "on the day" : d > 0 ? `+${d}d` : `${d}d`}
        </text>
      ))}
      <line x1={PAD.l} x2={w - PAD.r} y1={y(0)} y2={y(0)} className="stroke-divider" />
      {trends.rhythm.map((r) => (
        <circle key={r.key} cx={x(r.month) - (x(1) - x(0)) / 2 + r.day * step} cy={y(r.days)} r={6} style={{ fill: `var(--card-${r.colorKey})` }} className="stroke-surface" strokeWidth={2}>
          <title>{`${r.name} · ${r.amount} · ${r.days <= 0 ? "on the day" : `${r.days} days after expected`}`}</title>
        </circle>
      ))}
    </>
  );
}
