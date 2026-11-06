"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { pct } from "@/app/investments/views";
import { inRange, linePath, offeredRanges, readingAt, scaleOf, type RangeKey, type StagePoint } from "@/app/investments/stageView";
import { lakhParts } from "@/lib/format/lakh";
import { formatDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { nearestIndex } from "../accounts/trendChart";

/**
 * The stage (docs/design/investments.md, L1 Giant): what he holds worth over time on a dark card. The big number is today's worth, or the
 * worth on the day the cursor is on; the green line is worth and the dashed one what it cost him, so the gap between them is the gain.
 * The range chips pick how far back. Move along the chart (or use the arrow keys) to read a day. Race against the indices comes next.
 */

const W = 800;
const H = 260;
const LIME = "var(--on-card-lime, oklch(0.88 0.17 138))";

const signed = (n: number) => `${n < 0 ? "−" : "+"}${formatInr(Math.abs(n))}`;

export function Stage({ series, pricesNote }: { series: StagePoint[]; pricesNote?: string }) {
  const offered = useMemo(() => offeredRanges(series), [series]);
  const [range, setRange] = useState<RangeKey>(offered.includes("1Y") ? "1Y" : "All");
  const [hover, setHover] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const gradient = useId();
  const points = useMemo(() => inRange(series, range), [series, range]);
  const scale = useMemo(() => (points.length > 0 ? scaleOf(points) : { min: 0, max: 1 }), [points]);
  const valuePath = useMemo(() => linePath(points.map((p) => p.value), scale, W, H), [points, scale]);
  const costPath = useMemo(() => linePath(points.map((p) => p.cost), scale, W, H, true), [points, scale]);
  if (points.length < 2) return null;

  const n = points.length;
  const shown = readingAt(points, hover ?? n - 1)!;
  const first = points[0];
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - ((v - scale.min) / (scale.max - scale.min)) * H;
  const big = lakhParts(shown.value);
  const indexAt = (e: PointerEvent) => {
    const r = chartRef.current!.getBoundingClientRect();
    return nearestIndex((e.clientX - r.left) / r.width, n);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") return void setHover(null);
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setHover(Math.max(0, Math.min(n - 1, (hover ?? n - 1) + (e.key === "ArrowRight" ? 1 : -1))));
  };

  return (
    <section aria-label="Worth over time" className="flex flex-col gap-4 rounded-[26px] bg-ink p-5 text-on-ink shadow-card md:p-7" style={{ background: "var(--ink, oklch(0.2 0.02 260))", color: "var(--on-card, oklch(0.95 0.004 260))" }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold tracking-wider uppercase" style={{ color: "var(--on-card-muted)" }}>
            {hover === null ? "Worth today" : `Worth on ${formatDate(shown.date)}`}
          </div>
          <div className="mt-1 text-5xl font-extrabold tracking-tight tabular-nums md:text-7xl">
            ₹{big.amount}
            <span className="ml-1 text-2xl md:text-4xl" style={{ color: "var(--on-card-muted)" }}>{big.unit}</span>
          </div>
          <p className="mt-2 text-[13px] font-semibold" style={{ color: "var(--on-card-muted)" }}>
            <b style={{ color: shown.gain >= 0 ? LIME : "var(--negative-tint, #f5a3a3)" }}>{signed(shown.gain)}{shown.gainFraction === null ? "" : ` (${pct(shown.gainFraction, 1, true)})`}</b> on the {formatInr(shown.cost)} it cost
            {pricesNote ? ` · ${pricesNote}` : ""}
          </p>
        </div>
        <div role="group" aria-label="How far back" className="flex rounded-full p-[3px]" style={{ background: "var(--on-card-fill)" }}>
          {offered.map((key) => (
            <button key={key} type="button" aria-pressed={range === key} onClick={() => { setRange(key); setHover(null); }} className="min-h-8 rounded-full px-3 text-xs font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-white" style={range === key ? { background: "oklch(1 0 0 / 0.92)", color: "oklch(0.2 0.02 260)" } : { color: "var(--on-card-muted)" }}>
              {key}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={chartRef}
        role="img"
        tabIndex={0}
        aria-label={`Worth from ${formatInr(first.value)} on ${formatDate(first.date)} to ${formatInr(points[n - 1].value)} on ${formatDate(points[n - 1].date)}, against what it cost. Use the arrow keys to read a day.`}
        onPointerMove={(e) => setHover(indexAt(e))}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        className="relative h-56 w-full cursor-crosshair touch-pan-y rounded-[14px] focus-visible:outline-2 focus-visible:outline-white md:h-72"
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.88 0.17 138)" stopOpacity="0.38" />
              <stop offset="100%" stopColor="oklch(0.88 0.17 138)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${valuePath} L ${W} ${H} L 0 ${H} Z`} fill={`url(#${gradient})`} />
          <path d={costPath} fill="none" stroke="oklch(0.82 0.12 85)" strokeWidth="1.6" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
          <path d={valuePath} fill="none" stroke="oklch(0.88 0.17 138)" strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="oklch(1 0 0 / 0.5)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        </svg>
        {hover !== null && (
          <span aria-hidden="true" className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" style={{ left: `${(hover / (n - 1)) * 100}%`, top: `${(y(shown.value) / H) * 100}%`, background: "oklch(0.88 0.17 138)" }} />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 text-[11px] font-bold" style={{ color: "var(--on-card-muted)" }}>
        <span>{formatDate(first.date)}</span>
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><i aria-hidden="true" className="block h-0.5 w-5 rounded-full" style={{ background: "oklch(0.88 0.17 138)" }} />worth</span>
          <span className="flex items-center gap-1.5"><i aria-hidden="true" className="block w-5 border-t-2 border-dashed" style={{ borderColor: "oklch(0.82 0.12 85)" }} />what it cost</span>
        </span>
        <span>{formatDate(points[n - 1].date)}</span>
      </div>
    </section>
  );
}
