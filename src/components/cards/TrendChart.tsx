"use client";

import { useCallback, useEffect, useId, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Bar,
  BarStack,
  CartesianGrid,
  Cell,
  ComposedChart,
  DefaultZIndexes,
  Line,
  Rectangle,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ZIndexLayer,
  useActiveTooltipCoordinate,
  useActiveTooltipLabel,
  useChartWidth,
  useXAxisScale,
  useYAxisScale,
  type BarShapeProps,
} from "recharts";
import { heatLevel, type MonthDetail } from "@/lib/aggregate/cardSpend";
import { trendSummary, type TrendPoint } from "@/lib/aggregate/cardTrend";
import type { CardColor } from "@/lib/sheets/types";
import { formatMonthShort, formatMonthYear } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { RingCircles } from "../RingTexture";
import { ringRadii } from "../rings";
import { cardSwatch } from "./CardTile";

export interface TrendCard {
  id: string;
  name: string;
  color?: CardColor;
}

// The design's bars: 14px top corners and 5px bottom ones, rounding a whole stack as one bar in By card.
const BAR_RADIUS: [number, number, number, number] = [14, 14, 5, 5];
// By card, the design leaves a 2px gap between one card's segment and the one above it.
const SEGMENT_GAP = 2;
// A month with no statements gets a 6px striped stub on the baseline, as wide as a bar.
const STUB_HEIGHT = 6;
// BarStack clips each stack to its rounded outline, so the marks around a bar are drawn in their own layers:
// the stubs and the peak's shadow above the hover band and under the bars, and the current month's ring
// over the bars but under the line and the average.
const UNDER_BARS = (DefaultZIndexes.cursorRectangle + DefaultZIndexes.bar) / 2;
const OVER_BARS = (DefaultZIndexes.bar + DefaultZIndexes.line) / 2;

/** The bar's corner radii grown by `by`, for a ring that follows its corners `by` px outside it. */
const grow = (by: number) => BAR_RADIUS.map((r) => r + by) as [number, number, number, number];

interface TrendIds {
  sheen: string;
  stripes: string;
  shadow: string;
}

interface BarMarks {
  /** Draw the no-data stub (once per month, by its first series). */
  stub: boolean;
  peak: boolean;
  current: boolean;
  /** Another month is hovered, so this one steps back (#105). */
  dim: boolean;
}

/**
 * One bar, or one card's segment of a stacked bar, with the design's texture:
 * a sheen in the bar's top-right corner, and faint rings centred just past its
 * bottom-right. Both are laid out on the whole stack and clipped to the
 * segment, so they run on across the segments as if the stack were one bar.
 *
 * It also draws the design's marks: a striped stub for a month with no
 * statements, and the peak's shadow and the current month's ring around the
 * whole stack, from its top segment. With `showBar` off (the line alone), only
 * the stub is drawn.
 */
function TrendBar({ bar, rings, ids, gapAbove, showBar, marks }: { bar: BarShapeProps; rings: string; ids: TrendIds; gapAbove: boolean; showBar: boolean; marks: BarMarks }) {
  const { x, width, fill } = bar;
  const [low, high] = Array.isArray(bar.value) ? bar.value : [0, bar.value];
  const base = bar.stackedBarStart;
  const stub =
    marks.stub && width > 0 ? (
      <ZIndexLayer zIndex={UNDER_BARS}>
        <rect x={x} y={base - STUB_HEIGHT} width={width} height={STUB_HEIGHT} rx={STUB_HEIGHT / 2} fill={`url(#${ids.stripes})`} aria-hidden="true" />
      </ZIndexLayer>
    ) : null;
  // The gap never takes a thin segment's last pixel, so a small amount still shows.
  const top = bar.y + (gapAbove ? Math.min(SEGMENT_GAP, Math.max(0, bar.height - 1)) : 0);
  const height = bar.y + bar.height - top;
  if (!showBar || !(width > 0 && height > 0 && high > low)) return <g>{stub}</g>;
  // The stack's top, in pixels, from this segment's pixels per rupee.
  const stackHeight = ((bar.payload as TrendPoint).total * bar.height) / (high - low);
  const stackTop = base - stackHeight;
  const cx = x + width + 12;
  const cy = base + 14;
  // The segment with nothing above it is the stack's top, so it marks the whole stack.
  const isTop = !gapAbove;
  return (
    <g>
      {stub}
      {isTop && marks.peak && (
        // As the design's box-shadow: 0 10px 22px. The filter paints only the shadow, outside the stack, so the fill
        // never shows and the By card gaps stay clear.
        <ZIndexLayer zIndex={UNDER_BARS}>
          <Rectangle x={x} y={stackTop} width={width} height={stackHeight} radius={BAR_RADIUS} fill="black" filter={`url(#${ids.shadow})`} aria-hidden="true" />
        </ZIndexLayer>
      )}
      <g style={{ opacity: marks.dim ? 0.38 : 1 }} className="motion-safe:transition-opacity motion-safe:duration-200">
        <rect x={x} y={top} width={width} height={height} fill={fill} />
        <svg x={x} y={top} width={width} height={height} viewBox={`${x} ${top} ${width} ${height}`} aria-hidden="true">
          {/* As the design's radial-gradient(circle at 90% 6%, …, transparent 55%): 55% of the way to the far corner. */}
          <circle cx={x + 0.9 * width} cy={stackTop + 0.06 * stackHeight} r={0.55 * Math.hypot(0.9 * width, 0.94 * stackHeight)} fill={`url(#${ids.sheen})`} />
          <RingCircles cx={cx} cy={cy} radii={ringRadii(cx, cy, { x, y: top, width, height }, { first: 12, step: 12 })} stroke={rings} opacity={0.1} />
        </svg>
      </g>
      {isTop && marks.current && (
        // As the design's box-shadow: 0 0 0 2px card background, 0 0 0 4px accent.
        <ZIndexLayer zIndex={OVER_BARS}>
          <g fill="none" strokeWidth={2} aria-hidden="true">
            <Rectangle x={x - 1} y={stackTop - 1} width={width + 2} height={stackHeight + 2} radius={grow(1)} fill="none" stroke="var(--surface)" />
            <Rectangle x={x - 3} y={stackTop - 3} width={width + 6} height={stackHeight + 6} radius={grow(3)} fill="none" stroke="var(--accent)" />
          </g>
        </ZIndexLayer>
      )}
    </g>
  );
}

function Toggle({ pressed, onClick, children, label }: { pressed: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-7 min-w-[34px] items-center justify-center rounded-full px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent max-md:h-9 ${
        pressed ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

/** Whether the viewer has asked for reduced motion, for the parts Recharts animates itself. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** The hovered or focused month, and which half of the chart its bar is in, so the breakdown card can sit on the other side. */
interface TrendHover {
  month: string;
  side: "left" | "right";
  width: number;
}

/** Tells the chart which month is hovered or focused (Recharts' own keyboard navigation included), so the rest can follow it. */
function ActiveHover({ onChange }: { onChange: (hover: TrendHover | null) => void }) {
  const label = useActiveTooltipLabel();
  const coordinate = useActiveTooltipCoordinate();
  const width = useChartWidth() ?? 0;
  const month = label === undefined || label === null ? null : String(label);
  const side = coordinate && width > 0 && coordinate.x > width / 2 ? "left" : "right";
  useEffect(() => onChange(month ? { month, side, width } : null), [month, side, width, onChange]);
  return null;
}

/** The breakdown card's width, and the Y axis's, so the card can be pinned beside them. */
const HOVER_CARD_WIDTH = 268;
const Y_AXIS_WIDTH = 56;

const percentOf = (part: number) => `${Math.round(Math.abs(part) * 100)}%`;

/**
 * The hovered month's breakdown (#105, option A): its total, its split by
 * card, and whether it's paid. How it compares sits on the chart itself, on
 * the bracket and the average line (option B), so the card doesn't repeat it.
 */
function TrendHoverCard({
  month,
  shown,
  cards,
  peak,
  currentMonth,
  detail,
}: {
  month: string;
  shown: TrendPoint[];
  cards: TrendCard[];
  peak: string | null;
  currentMonth: string;
  detail: MonthDetail | undefined;
}) {
  const point = shown.find((p) => p.month === month);
  if (!point) return null;
  const split = cards
    .map((c) => ({ card: c, amount: point.byCard[c.id] ?? 0 }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const largest = split[0]?.amount ?? 0;
  return (
    <div className="rounded-[16px] border border-surface-line bg-surface p-3.5 text-fg shadow-pop" style={{ width: HOVER_CARD_WIDTH }}>
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-muted">
        <span>{formatMonthYear(month)}</span>
        {month === peak ? (
          <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-extrabold text-accent-text">Peak</span>
        ) : month === currentMonth ? (
          <span className="rounded-full bg-fill px-2 py-0.5 text-[10px] font-extrabold">This month</span>
        ) : null}
      </div>
      <div className="mt-0.5 text-2xl leading-tight font-extrabold tabular-nums">{point.hasStatements ? formatInr(point.total) : "No statements"}</div>
      {split.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1">
          {split.map(({ card, amount }) => (
            <li key={card.id} className="flex items-center gap-2 text-xs font-semibold">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-[3px]" style={{ background: cardSwatch(card.color) }} />
              <span className="min-w-0 flex-1 truncate text-muted">{card.name}</span>
              <span aria-hidden="true" className="h-[5px] w-[54px] shrink-0 overflow-hidden rounded-full bg-fill">
                <span className="block h-full rounded-full" style={{ width: `${(amount / largest) * 100}%`, background: cardSwatch(card.color) }} />
              </span>
              <span className="w-[64px] shrink-0 text-right font-extrabold tabular-nums">{formatInr(amount)}</span>
            </li>
          ))}
        </ul>
      )}
      {detail && (
        <div className="mt-2.5 border-t border-divider pt-2 text-[11px] font-semibold text-muted">
          {detail.pending === 0
            ? `${detail.statements} ${detail.statements === 1 ? "statement" : "statements"} · all paid`
            : `${detail.pending} ${detail.pending === 1 ? "bill" : "bills"} pending · ${formatInr(detail.pendingAmount)} left to pay`}
        </div>
      )}
    </div>
  );
}

/**
 * The compare bracket (#105, option B): from the month before's bar to the
 * hovered one's, drawing itself, with the change on it. The hovered bar's centre
 * comes from the tooltip, and the one before's is the same distance along the
 * axis as their positions on it, so it holds however the band scale reports them.
 */
function CompareBracket({ shown }: { shown: TrendPoint[] }) {
  const label = useActiveTooltipLabel();
  const coordinate = useActiveTooltipCoordinate();
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (label === undefined || label === null || !coordinate || !xScale || !yScale) return null;
  const index = shown.findIndex((p) => p.month === String(label));
  const current = shown[index];
  const previous = shown[index - 1];
  if (!current || !previous || !current.hasStatements || !previous.hasStatements) return null;
  const [xNow, xBefore, yNow, yBefore] = [xScale(current.month), xScale(previous.month), yScale(current.total), yScale(previous.total)];
  if ([xNow, xBefore, yNow, yBefore].some((v) => typeof v !== "number" || !Number.isFinite(v))) return null;
  const bx = coordinate.x;
  const ax = bx + (Number(xBefore) - Number(xNow));
  const ay = Number(yBefore) - 6;
  const by = Number(yNow) - 6;
  const top = Math.min(ay, by) - 20;
  const diff = current.total - previous.total;
  const change = previous.total > 0 ? diff / previous.total : null;
  return (
    <ZIndexLayer zIndex={OVER_BARS}>
      <g key={current.month} aria-hidden="true">
        <path
          d={`M${ax},${ay} L${ax},${top} L${bx},${top} L${bx},${by}`}
          fill="none"
          stroke="var(--fg)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          className="motion-safe:animate-draw"
        />
        <foreignObject x={(ax + bx) / 2 - 100} y={top - 30} width={200} height={26}>
          <div className="flex h-full items-center justify-center">
            <span className="rounded-full border border-surface-line bg-surface px-2.5 py-1 text-[11px] font-extrabold whitespace-nowrap text-fg tabular-nums">
              <span className={diff >= 0 ? "text-negative" : "text-positive"}>
                {diff >= 0 ? "▲" : "▼"} {formatInrCompact(Math.abs(diff))}
              </span>
              {change !== null && ` · ${percentOf(change)}`} vs {formatMonthShort(previous.month)}
            </span>
          </div>
        </foreignObject>
      </g>
    </ZIndexLayer>
  );
}

/**
 * The design's statement trend: monthly statement totals as bars and/or a line,
 * by card (stacked in card colours) or in total (shaded like the heatmap), with
 * the average, the peak and the current month marked.
 */
export function TrendChart({
  points,
  cards,
  currentMonth,
  monthDetails,
}: {
  points: TrendPoint[];
  cards: TrendCard[];
  currentMonth: string;
  /** Each month's paid status, for the hover card (#105). */
  monthDetails: Record<string, MonthDetail>;
}) {
  const [mode, setMode] = useState<"card" | "total">("total");
  // The hovered or focused month, which the bars, the average line, the peak's label and the breakdown card follow (#105).
  const [hover, setHover] = useState<TrendHover | null>(null);
  const onHover = useCallback((next: TrendHover | null) => setHover(next), []);
  const activeMonth = hover?.month ?? null;
  const reducedMotion = usePrefersReducedMotion();
  const [bars, setBars] = useState(true);
  const [line, setLine] = useState(false);
  const uid = useId().replace(/[^\w-]/g, "");
  const ids: TrendIds = { sheen: `trend-sheen-${uid}`, stripes: `trend-stripes-${uid}`, shadow: `trend-shadow-${uid}` };

  // The chart shows the page's period, so its average is the greeting's monthly average (#113).
  const shown = points;
  const { average, peak } = trendSummary(points);
  const averageLabel = "Monthly average";
  const max = Math.max(0, ...shown.map((p) => p.total));
  const spansYears = new Set(shown.map((p) => p.month.slice(0, 4))).size > 1;
  const latest = shown.at(-1);
  const shownCards = cards.filter((c) => shown.some((p) => (p.byCard[c.id] ?? 0) > 0) || cards.length === 1);
  const marksFor = (p: TrendPoint, firstSeries: boolean): BarMarks => ({
    stub: firstSeries && !p.hasStatements,
    peak: p.month === peak?.month,
    current: p.month === currentMonth,
    dim: activeMonth !== null && p.month !== activeMonth,
  });
  const activeIndex = activeMonth ? shown.findIndex((p) => p.month === activeMonth) : -1;
  const activePoint = activeIndex >= 0 ? shown[activeIndex] : undefined;
  const averageGap = activePoint?.hasStatements ? activePoint.total - average : null;
  // The bracket runs up from the hovered bar and the one before, so the peak's label steps aside when either is the peak.
  const bracketMeetsPeak = !!peak && activeIndex > 0 && (shown[activeIndex].month === peak.month || shown[activeIndex - 1].month === peak.month);

  // At least one of bars and line stays on, so the chart never goes blank.
  const toggleBars = () => setBars((on) => (on && !line ? on : !on));
  const toggleLine = () => setLine((on) => (on && !bars ? on : !on));

  return (
    <section aria-labelledby="trend-heading" className="flex flex-col gap-3 rounded-[24px] border border-surface-line bg-surface p-[22px] shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2">
          <h2 id="trend-heading" className="text-sm font-bold text-fg">
            Statement trend
          </h2>
          {mode === "total" ? (
            <div className="flex flex-wrap items-center gap-[7px] text-[11px] text-muted" aria-hidden="true">
              Low
              {[1, 2, 3, 4, 5].map((l) => (
                <span key={l} className="inline-block size-3 rounded-[4px]" style={{ background: `var(--heat-${l})` }} />
              ))}
              High
              <span className="ml-3 inline-block w-[18px] border-t-[1.5px] border-dashed border-heat-4" />
              {averageLabel} {formatInrCompact(average)}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
              {shownCards.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1.5 text-[11px] font-bold">
                  <span className="size-[9px] rounded-[3px]" style={{ background: cardSwatch(c.color) }} aria-hidden="true" />
                  {c.name}
                  <span className="font-semibold text-muted">{formatInrCompact(latest?.byCard[c.id] ?? 0)}</span>
                </span>
              ))}
              {latest && <span className="text-[10px] text-muted">{formatMonthYear(latest.month).split(" ")[0]}</span>}
              <span className="text-[10px] text-muted">
                · {averageLabel} {formatInrCompact(average)}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full bg-fill p-[3px]" role="group" aria-label="Show">
            <Toggle pressed={mode === "card"} onClick={() => setMode("card")}>
              By card
            </Toggle>
            <Toggle pressed={mode === "total"} onClick={() => setMode("total")}>
              Total
            </Toggle>
          </div>
          <div className="flex rounded-full bg-fill p-[3px]" role="group" aria-label="Chart type">
            <Toggle pressed={line} onClick={toggleLine} label="Line">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 17 9 11 13 15 21 7" />
              </svg>
            </Toggle>
            <Toggle pressed={bars} onClick={toggleBars} label="Bars">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="6" y1="20" x2="6" y2="11" />
                <line x1="12" y1="20" x2="12" y2="5" />
                <line x1="18" y1="20" x2="18" y2="14" />
              </svg>
            </Toggle>
          </div>
        </div>
      </div>

      {max === 0 ? (
        <p className="py-12 text-center text-sm text-muted">No spending in this period yet.</p>
      ) : (
        <div className="h-[280px] w-full" role="img" aria-label={`Monthly statement totals, ${shown.map((p) => `${formatMonthYear(p.month)} ${p.hasStatements ? formatInr(p.total) : "no statements"}`).join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={shown} margin={{ top: 28, right: 28, bottom: 0, left: 0 }}>
              <defs>
                <radialGradient id={ids.sheen}>
                  <stop offset="0" style={{ stopColor: "var(--bar-glow)" }} />
                  <stop offset="1" style={{ stopColor: "var(--bar-glow)", stopOpacity: 0 }} />
                </radialGradient>
                {/* As the design's repeating-linear-gradient(135deg, … 0 3px, transparent 3px 6px). */}
                <pattern id={ids.stripes} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width={3} height={6} style={{ fill: "var(--trend-no-data)" }} />
                </pattern>
                {/* A 22px blur is a Gaussian of 11. The last step keeps only what falls outside the bar. */}
                <filter id={ids.shadow} filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation={11} />
                  <feOffset dy={10} result="blur" />
                  <feFlood style={{ floodColor: "var(--trend-peak-shadow)" }} />
                  <feComposite in2="blur" operator="in" />
                  <feComposite in2="SourceAlpha" operator="out" />
                </filter>
              </defs>
              {/*
               * Keeps both layers registered for the chart's lifetime. Recharts drops a custom layer's
               * element when every mark in it remounts at once (on switching the line, mode or period),
               * and the marks then draw nowhere.
               */}
              <ZIndexLayer zIndex={UNDER_BARS} />
              <ZIndexLayer zIndex={OVER_BARS} />
              <CartesianGrid vertical={false} stroke="var(--divider)" />
              <XAxis
                dataKey="month"
                // The current month's label is set in bold ink with a dot, instead of a second floating label that could collide with the peak's.
                tick={(props) => {
                  const { x, y, payload } = props as { x: number | string; y: number | string; payload: { value: string } };
                  const month = String(payload.value);
                  const isCurrent = month === currentMonth;
                  const text = `${spansYears && month.endsWith("-01") ? `Jan ${month.slice(2, 4)}` : formatMonthShort(month)}${isCurrent ? " •" : ""}`;
                  return (
                    <text x={Number(x)} y={Number(y) + 12} textAnchor="middle" fontSize={11} fontWeight={isCurrent ? 800 : 600} fill={isCurrent ? "var(--fg)" : "var(--muted)"}>
                      {text}
                    </text>
                  );
                }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis tickFormatter={(v: number) => formatInrCompact(v)} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={Y_AXIS_WIDTH} />
              <Tooltip
                cursor={{ fill: "var(--fill)" }}
                // Pinned to the top, on the side away from the hovered bar, so it never covers the bracket between it and the month before.
                position={hover ? { x: hover.side === "left" ? Y_AXIS_WIDTH + 8 : Math.max(Y_AXIS_WIDTH + 8, hover.width - HOVER_CARD_WIDTH - 12), y: 0 } : undefined}
                isAnimationActive={!reducedMotion}
                animationDuration={220}
                wrapperStyle={{ outline: "none", zIndex: 30 }}
                content={({ active, label }) =>
                  active && label !== undefined ? (
                    <TrendHoverCard
                      month={String(label)}
                      shown={shown}
                      cards={shownCards}
                      peak={peak?.month ?? null}
                      currentMonth={currentMonth}
                      detail={monthDetails[String(label)]}
                    />
                  ) : null
                }
              />
              <ActiveHover onChange={onHover} />
              {/* With the line alone the bars stay, drawing only the no-data stubs, as the design has them in every view. */}
              <BarStack radius={BAR_RADIUS}>
                {mode === "total" ? (
                  <Bar
                    dataKey="total"
                    name="Total"
                    maxBarSize={56}
                    isAnimationActive={false}
                    tooltipType={bars ? undefined : "none"}
                    // Ink rings on the light shades (1–3) and light ones on the dark (4–5), as the heatmap's text.
                    shape={(bar: BarShapeProps) => (
                      <TrendBar
                        bar={bar}
                        rings={heatLevel((bar.payload as TrendPoint).total, max) >= 4 ? "var(--rings-light)" : "var(--rings-ink)"}
                        ids={ids}
                        gapAbove={false}
                        showBar={bars}
                        marks={marksFor(bar.payload as TrendPoint, true)}
                      />
                    )}
                  >
                    {shown.map((p) => (
                      <Cell key={p.month} fill={p.total > 0 ? `var(--heat-${heatLevel(p.total, max)})` : "transparent"} />
                    ))}
                  </Bar>
                ) : (
                  shownCards.map((c, i) => (
                    <Bar
                      key={c.id}
                      dataKey={(p: TrendPoint) => p.byCard[c.id] ?? 0}
                      name={c.name}
                      fill={cardSwatch(c.color)}
                      maxBarSize={56}
                      isAnimationActive={false}
                      tooltipType={bars ? undefined : "none"}
                      shape={(bar: BarShapeProps) => (
                        <TrendBar
                          bar={bar}
                          rings="var(--rings-light)"
                          ids={ids}
                          gapAbove={shownCards.slice(i + 1).some((above) => ((bar.payload as TrendPoint).byCard[above.id] ?? 0) > 0)}
                          showBar={bars}
                          marks={marksFor(bar.payload as TrendPoint, i === 0)}
                        />
                      )}
                    />
                  ))
                )}
              </BarStack>
              {line && (
                <Line type="monotone" dataKey="total" name="Total" tooltipType={bars ? "none" : undefined} stroke="var(--accent-text)" strokeWidth={2} dot={{ r: 3, fill: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
              )}
              <ReferenceLine
                y={average}
                stroke="var(--heat-4)"
                strokeOpacity={0.6}
                strokeDasharray="5 4"
                ifOverflow="extendDomain"
                // While a month is hovered, the average line says how far above or below it the month is (#105), at the end away from the breakdown card.
                label={
                  averageGap === null
                    ? undefined
                    : { value: `${formatInrCompact(Math.abs(averageGap))} ${averageGap >= 0 ? "above" : "below"} average`, position: hover?.side === "right" ? "insideTopLeft" : "insideTopRight", fill: "var(--accent-text)", fontSize: 11, fontWeight: 800 }
                }
              />
              <CompareBracket shown={shown} />
              {peak && (
                <ReferenceDot
                  x={peak.month}
                  y={peak.amount}
                  r={0}
                  // 8px up, as the design's labels, so it clears the current month's ring when the peak is this month.
                  label={bracketMeetsPeak ? undefined : { value: `Peak ${formatInrCompact(peak.amount)}`, position: "top", offset: 8, fill: "var(--fg)", fontSize: 11, fontWeight: 800 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
