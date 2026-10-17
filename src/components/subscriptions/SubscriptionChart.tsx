"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { ChartView, LifetimeRowView, LifetimeSort, RunningView, TrendMonthView } from "@/app/subscriptions/chartView";
import type { PickView } from "@/app/subscriptions/views";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { ALL } from "@/lib/format/subscriptionLabels";
import { RingTexture } from "../RingTexture";
import { CARD_WIDTH, PHONE, cardLeft } from "./chartGeometry";
import { DayByDay } from "./DayByDay";
import { Mono, Segmented } from "./parts";
import { useSize } from "./useSize";

/**
 * The full-width chart at the end of the Subscriptions page (#127), with a switch:
 * Day by day (the default), Payment trend and Lifetime cost. Each follows the pick:
 * its days and its part of each month take its colour, and the rest fade. What each
 * does when you touch it (#149) is in docs/design/subscriptions.md, "Built: the chart's
 * interactions"; Day by day's is in DayByDay.tsx.
 */

type View = "days" | "trend" | "lifetime";

/** The three views, worded for the page's period (chart.copy): the third is "Lifetime cost" for all time, otherwise what was paid in it. */
const views = ({ copy }: ChartView): { value: View; label: string; short: string; note: string }[] => [
  { value: "days", label: "Day by day", short: "Day by day", note: copy.days },
  { value: "trend", label: "Payment trend", short: "Trend", note: copy.trend },
  { value: "lifetime", label: copy.lifetimeLabel, short: copy.lifetimeShort, note: copy.lifetime },
];

/** The design's ease-out, for motion set from script (the Lifetime rows' slide). */
const EASE_OUT = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function LegendDot({ style }: { style: CSSProperties }) {
  return <i aria-hidden="true" className="inline-block size-[9px] rounded-[3px]" style={style} />;
}

function Legend({ view }: { view: View }) {
  if (view === "lifetime") return <span className="text-xs font-semibold text-muted">The line shows what each payment cost</span>;
  const expected = <LegendDot style={{ border: "1.5px dashed var(--heat-4)" }} />;
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted">
      {view === "days" ? (
        <>
          <span className="inline-flex items-center gap-1.5">
            Less {[2, 3, 4, 5].map((l) => <LegendDot key={l} style={{ background: `var(--heat-${l})` }} />)} More
          </span>
          <span className="inline-flex items-center gap-1.5">{expected}Expected</span>
          <span className="inline-flex items-center gap-1.5">
            <LegendDot style={{ background: "var(--warning-tint)", border: "1.5px solid var(--warning)" }} />
            Not recorded
          </span>
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-1.5">
            <LegendDot style={{ background: "var(--heat-3)" }} />
            Paid
          </span>
          <span className="inline-flex items-center gap-1.5">{expected}Expected</span>
        </>
      )}
    </span>
  );
}

// ---------- Payment trend ----------

const niceMax = (v: number, step = 2000) => Math.max(step, Math.ceil(v / step) * step);


function TrendCard({ month, running, lineColor }: { month: TrendMonthView; running?: RunningView["months"][string]; lineColor: string }) {
  const { card } = month;
  return (
    <div style={{ width: CARD_WIDTH }} className="rounded-[16px] border border-surface-line bg-surface p-3.5 text-left text-fg shadow-[var(--pop-shadow)]">
      <div className="flex items-center justify-between gap-2 text-xs font-bold">
        <span>{card.title}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${card.pill === "Expected" ? "bg-fill text-muted" : "bg-accent-tint text-accent-text"}`}>{card.pill}</span>
      </div>
      <div className="mt-0.5 text-2xl leading-tight font-extrabold tabular-nums">{card.total}</div>
      {card.diff && <div className={`text-[11px] font-bold ${card.diff.up ? "text-negative" : "text-positive"}`}>{card.diff.text}</div>}
      {card.rows.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {card.rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2 text-xs font-semibold">
              <Mono mark={r.mark} size={18} />
              <span className="min-w-0 flex-1 truncate text-muted">
                {r.label}
                {r.note && <span className="text-[10.5px] text-warning-text"> · {r.note}</span>}
              </span>
              <b className={`font-extrabold tabular-nums ${r.muted ? "text-muted" : ""}`}>{r.amount}</b>
            </li>
          ))}
        </ul>
      )}
      {card.more > 0 && <div className="mt-2 border-t border-divider pt-2 text-[11px] font-semibold text-muted">and {card.more} more {card.more === 1 ? "renewal" : "renewals"}</div>}
      {running && (
        <div className="mt-2 flex items-start gap-2 border-t border-divider pt-2">
          <span aria-hidden="true" className="mt-[7px] h-[2.5px] w-3 shrink-0 rounded-full" style={{ background: lineColor }} />
          <span className="min-w-0 text-[11.5px] leading-snug font-extrabold tabular-nums">
            {running.label}
            <span className="block text-[10.5px] font-semibold text-muted">{running.note}</span>
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * The running total over the trend (6B): a faint line through all of the months shown, and the line drawn up to the hovered one, which draws itself
 * again each time. It has its own scale, the period's figure at the top, since it adds
 * up far past any one month; the card says what it's at.
 */
function RunningLine({ points, upTo, color, width, height }: { points: [number, number][]; upTo: number; color: string; width: number; height: number }) {
  const d = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [cx, cy] = points[upTo];
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute top-0 left-0 overflow-visible" width={width} height={height}>
      <path d={d(points)} fill="none" stroke="var(--fill-strong)" strokeWidth={2} strokeDasharray="4 4" />
      {upTo > 0 && (
        <path key={upTo} d={d(points.slice(0, upTo + 1))} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} className="motion-safe:animate-draw" />
      )}
      <circle cx={cx} cy={cy} r={4.5} fill="var(--surface)" stroke={color} strokeWidth={2.5} />
    </svg>
  );
}

function Trend({ chart, pick }: { chart: ChartView; pick: PickView }) {
  const [box, size, measured] = useSize<HTMLDivElement>({ w: 1300, h: 0 });
  const [hovered, setHovered] = useState<number | null>(null);
  const phone = size.w < PHONE;
  // A phone fits the latest twelve months.
  const months = phone ? chart.trend.months.slice(-12) : chart.trend.months;
  const h = phone ? 200 : 330;
  const left = phone ? 0 : 50;
  // Room above the tallest bar for its label and, on a desktop, the Peak tag over it.
  const top = phone ? 40 : 62;
  const bottom = 30;
  const plot = h - top - bottom;
  const gap = phone ? 5 : 14;
  const n = months.length;
  const bw = Math.max(4, (size.w - left - gap * (n - 1)) / n);
  const max = niceMax(Math.max(0, ...months.map((m) => m.total)));
  const Y = (v: number) => (v / max) * plot;
  const all = pick.id === ALL;
  const tint = (p: number) => `color-mix(in oklch, var(--card-${pick.color}) ${p}%, var(--surface))`;
  const radius = phone ? "7px 7px 3px 3px" : "13px 13px 5px 5px";
  const usual = chart.usual[pick.id] ?? 0;
  const lineColor = all ? "var(--accent-text)" : `var(--card-${pick.color})`;
  // The running total (6B), through the months shown, on its own scale.
  const running = chart.running[pick.id] ?? chart.running[ALL];
  const yearMonths = months.map((m, i) => ({ m, i })).filter(({ m }) => running.months[m.month]);
  const points = yearMonths.map(({ m, i }): [number, number] => [left + i * (bw + gap) + bw / 2, h - bottom - (running.months[m.month].cumulative / running.total) * plot]);
  const upTo = hovered === null ? -1 : yearMonths.findIndex(({ i }) => i === hovered);

  return (
    <div ref={box} className="relative" style={{ height: h }} onMouseLeave={() => setHovered(null)}>
      {!phone &&
        [0, max / 2, max].map((v) => (
          <span key={v} aria-hidden="true">
            <span className={`absolute right-0 border-t border-divider ${v ? "border-dashed" : ""}`} style={{ left, bottom: bottom + Y(v) }} />
            <span className="absolute left-0 text-[10.5px] font-bold text-muted" style={{ bottom: bottom + Y(v) - 6 }}>
              {formatInrCompact(v)}
            </span>
          </span>
        ))}
      {months.map((m, i) => {
        const x = left + i * (bw + gap);
        const bh = Math.max(5, Y(m.total));
        const level = 2 + Math.min(3, Math.floor((m.total / max) * 4));
        const part = all ? 0 : (m.parts[pick.id] ?? 0);
        const peak = all && m.month === chart.trend.peak;
        const on = hovered === i;
        const body: CSSProperties = m.future
          ? { border: `1.5px dashed ${all ? "var(--heat-4)" : tint(70)}`, background: all ? "color-mix(in oklch, var(--heat-1) 40%, transparent)" : tint(6) }
          : { background: all ? `var(--heat-${level})` : tint(20), boxShadow: peak ? "0 12px 24px var(--trend-peak-shadow)" : undefined };
        return (
          // The other months step back while one is hovered.
          <div key={m.month} className="motion-safe:transition-opacity motion-safe:duration-200" style={{ opacity: hovered !== null && !on ? 0.3 : 1 }}>
            <div
              aria-hidden="true"
              className={`absolute isolate overflow-hidden motion-reduce:transition-none ${measured ? "transition-[height,background-color] duration-500" : ""}`}
              style={{ left: x, bottom, width: bw, height: bh, borderRadius: radius, ...body, outline: m.current ? `2.5px solid ${all ? "var(--accent)" : `var(--card-${pick.color})`}` : undefined, outlineOffset: 3 }}
            >
              {!m.future && <RingTexture width={60} height={200} dx={10} dy={20} first={22} step={14} stroke={level >= 4 && all ? "var(--rings-light)" : all ? "var(--rings-ink)" : `var(--card-${pick.color})`} opacity={0.14} />}
              {part > 0 && (
                <div
                  className="absolute inset-x-0 bottom-0 isolate overflow-hidden"
                  style={{ height: Math.max(4, Y(part)), borderRadius: radius, background: `linear-gradient(160deg, var(--card-${pick.color}), var(--card-${pick.color}-from))`, opacity: m.future ? 0.55 : 1 }}
                >
                  <RingTexture width={60} height={120} dx={10} dy={20} first={18} step={12} stroke="var(--rings-light)" opacity={0.14} />
                </div>
              )}
              {/* Hovered, the bar splits into its subscriptions, biggest at the bottom (6A); with a pick, the rest stay faint. */}
              <div className="absolute inset-0 flex flex-col-reverse gap-px motion-safe:transition-opacity motion-safe:duration-200" style={{ opacity: on ? 1 : 0 }}>
                {m.stack.map((p) => (
                  <i
                    key={p.id}
                    className="block shrink-0 origin-bottom motion-safe:transition-transform motion-safe:duration-[380ms] motion-safe:ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                    style={{
                      height: `calc(${(p.amount / m.total) * 100}% - 1px)`,
                      background: `var(--card-${p.color})`,
                      opacity: (m.future ? 0.6 : 1) * (all || p.id === pick.id ? 1 : 0.3),
                      transform: on ? "none" : "scaleY(0.2)",
                    }}
                  />
                ))}
              </div>
            </div>
            {!phone && (
              <span aria-hidden="true" className="absolute text-center leading-[1.2]" style={{ left: x - 14, width: bw + 28, bottom: bottom + bh + 7 }}>
                <b className={`block text-xs font-extrabold tabular-nums ${m.future ? "text-muted" : "text-fg"}`}>{all ? formatInrCompact(m.total) : part ? formatInr(part) : ""}</b>
                {!all && part > 0 && <span className="text-[10px] font-bold text-muted">of {formatInrCompact(m.total)}</span>}
              </span>
            )}
            {peak && !phone && (
              <span aria-hidden="true" className="absolute -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[9.5px] font-bold text-on-ink" style={{ left: x + bw / 2, bottom: bottom + bh + 40 }}>
                Peak
              </span>
            )}
            <span aria-hidden="true" className={`absolute bottom-1.5 text-center ${phone ? "text-[10px]" : "text-xs"} ${m.current ? "font-extrabold text-fg" : "font-semibold text-muted"}`} style={{ left: x, width: bw }}>
              {phone ? m.name[0] : m.name}
            </span>
            {/* A column you can hover, focus or tap for the month's card. */}
            <button
              type="button"
              aria-label={`${m.card.title}: ${m.card.total}, ${m.card.pill.toLowerCase()}${running.months[m.month] ? `. ${running.months[m.month].label}, ${running.months[m.month].note}` : ""}`}
              onMouseEnter={() => setHovered(i)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              className="absolute top-0 bottom-0 rounded-md focus-visible:outline-2 focus-visible:outline-accent"
              style={{ left: x - gap / 2, width: bw + gap }}
            />
          </div>
        );
      })}
      {usual > 0 && (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute right-0 border-t-2 border-dashed opacity-70" style={{ left, bottom: bottom + Y(usual), borderColor: all ? "var(--accent-text)" : `var(--card-${pick.color})` }} />
          {!phone && (
            <span
              className={`pointer-events-none absolute rounded-full border border-surface-line bg-surface px-[9px] py-0.5 text-[11px] font-extrabold ${all ? "text-accent-text" : "text-fg"}`}
              style={{ left: left + 6, bottom: bottom + Y(usual) + 5 }}
            >
              {all ? "A usual month" : `${pick.alias} a month`} {formatInr(usual)}
            </span>
          )}
        </>
      )}
      {upTo >= 0 && <RunningLine points={points} upTo={upTo} color={lineColor} width={size.w} height={h} />}
      {hovered !== null && months[hovered] && (
        <div className="pointer-events-none absolute z-10" style={{ top: -8, left: cardLeft(left + hovered * (bw + gap), bw, size.w, phone) }}>
          <TrendCard month={months[hovered]} running={running.months[months[hovered].month]} lineColor={lineColor} />
        </div>
      )}
    </div>
  );
}

// ---------- Lifetime cost ----------

function Spark({ amounts, color }: { amounts: number[]; color: string }) {
  if (amounts.length < 2) return null;
  const W = 96;
  const H = 22;
  const hi = Math.max(...amounts);
  const lo = Math.min(...amounts);
  const pts = amounts.map((a, i) => [(i / (amounts.length - 1)) * W, H - 3 - ((a - lo) / (hi - lo || 1)) * (H - 8)]);
  const d = pts.map(([x, y], i) => (i ? `H${x.toFixed(1)} V${y.toFixed(1)}` : `M${x},${y}`)).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

const SORTS: { value: LifetimeSort; label: string }[] = [
  { value: "paid", label: "Most paid" },
  { value: "held", label: "Longest held" },
  { value: "newest", label: "Newest" },
];

/** What a row cost each calendar year, opened under it on hover or focus (6C). */
function Years({ row }: { row: LifetimeRowView }) {
  const top = Math.max(0, ...row.years.map((y) => y.paid));
  return (
    <div className="flex flex-col gap-1.5 pt-2 md:flex-row md:items-end md:gap-4 md:pl-[206px]">
      <div className="flex h-[58px] items-end gap-2">
        {row.years.map((y) => (
          <span key={y.year} className="flex w-9 min-w-0 flex-col items-center gap-[3px] text-[10px] font-bold text-muted">
            <b className="text-fg tabular-nums">{y.amount}</b>
            <i className="block w-7 rounded-[5px_5px_2px_2px]" style={{ height: Math.max(3, top ? (y.paid / top) * 28 : 0), background: y.paid ? `var(--card-${row.mark.color})` : "var(--fill-strong)" }} />
            {y.year}
          </span>
        ))}
      </div>
      {row.each && <span className="text-xs font-semibold text-muted md:pb-[15px]">{row.each}</span>}
    </div>
  );
}

function Lifetime({ chart, pick }: { chart: ChartView; pick: PickView }) {
  const { rows, captions, order } = chart.lifetime;
  const [sort, setSort] = useState<LifetimeSort>("paid");
  const picked = pick.id !== ALL;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const sorted = order[sort].map((id) => byId.get(id)!).filter(Boolean);
  const els = useRef(new Map<string, HTMLElement>());
  // Where each row was before a sort, so it can slide from there to its new place (FLIP).
  const before = useRef<Map<string, number> | null>(null);

  function sortBy(next: LifetimeSort) {
    if (next === sort) return;
    before.current = new Map([...els.current].map(([id, el]) => [id, el.getBoundingClientRect().top]));
    setSort(next);
  }

  useLayoutEffect(() => {
    const was = before.current;
    before.current = null;
    if (!was || reducedMotion()) return;
    for (const [id, el] of els.current) {
      const dy = (was.get(id) ?? 0) - el.getBoundingClientRect().top;
      if (!dy) continue;
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px)`;
      void el.offsetWidth;
      el.style.transition = `transform 480ms ${EASE_OUT}`;
      el.style.transform = "";
      // Only the slide's own end: the row's opened years have a transition of their own, whose end bubbles up here.
      const done = (e: TransitionEvent) => {
        if (e.target !== el || e.propertyName !== "transform") return;
        el.style.transition = "";
        el.removeEventListener("transitionend", done);
      };
      el.addEventListener("transitionend", done);
    }
  }, [sort]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="min-w-0 flex-1 basis-[420px] text-[13.5px] leading-relaxed font-medium text-muted">{captions[pick.id] ?? captions[ALL]}</p>
        {rows.length > 1 && <Segmented label="Sort" small value={sort} onChange={sortBy} options={SORTS} />}
      </div>
      {/* Each row has room round it for its hover fill, so the list sits out by as much to keep the bars where they were. */}
      <div className="-mx-2 flex flex-col md:gap-0.5">
        {sorted.map((r) => {
          const inside = r.fraction > 0.22;
          const width = `${Math.max(6, r.fraction * 100)}%`;
          return (
            <div
              key={r.id}
              ref={(el) => {
                if (el) els.current.set(r.id, el);
                else els.current.delete(r.id);
              }}
              tabIndex={0}
              className="group/row rounded-xl px-2 py-1 hover:bg-fill focus:bg-fill focus-visible:outline-2 focus-visible:outline-accent motion-safe:transition-[opacity,background-color] motion-safe:duration-300"
              style={{ opacity: picked && r.id !== pick.id ? 0.22 : r.mark.muted ? 0.75 : 1 }}
            >
              <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-2 md:grid-cols-[190px_minmax(0,1fr)_230px_110px] md:gap-4">
                <span className="flex min-w-0 items-center gap-1.5 md:gap-2.5">
                  <Mono mark={r.mark} size={22} />
                  <b className="truncate text-[11.5px] md:text-[13px]">{r.mark.alias}</b>
                </span>
                <div className="relative h-5 rounded-full bg-fill md:h-7">
                  <div
                    className="absolute inset-y-0 left-0 isolate flex items-center justify-end overflow-hidden rounded-full pr-1.5 md:pr-2.5"
                    style={{ width, background: `linear-gradient(90deg, var(--card-${r.mark.color}-from), var(--card-${r.mark.color}))`, filter: r.mark.muted ? "grayscale(0.7)" : undefined }}
                  >
                    <RingTexture width={400} height={28} dx={10} dy={20} first={14} step={10} stroke="var(--rings-light)" opacity={0.12} />
                    {inside && <b className="text-[10px] text-on-card tabular-nums md:text-xs">{formatInr(r.paid)}</b>}
                  </div>
                  {!inside && (
                    <b className="absolute top-1/2 -translate-y-1/2 text-[10px] tabular-nums md:text-xs" style={{ left: `calc(${width} + 8px)` }}>
                      {formatInr(r.paid)}
                    </b>
                  )}
                </div>
                <span className="text-xs font-semibold text-muted max-md:hidden">{r.detail}</span>
                <span className="flex justify-end max-md:hidden">
                  <Spark amounts={r.amounts} color={`var(--card-${r.mark.color})`} />
                </span>
              </div>
              {r.years.length > 0 && (
                <div className="grid grid-rows-[0fr] group-hover/row:grid-rows-[1fr] group-focus/row:grid-rows-[1fr] motion-safe:transition-[grid-template-rows] motion-safe:duration-300 motion-safe:ease-out">
                  <div className="min-h-0 overflow-hidden">
                    <Years row={r} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SubscriptionChart({ chart, pick, empty }: { chart: ChartView; pick: PickView; empty: boolean }) {
  const [view, setView] = useState<View>("days");
  const VIEWS = views(chart);
  const current = VIEWS.find((v) => v.value === view)!;
  return (
    <section aria-labelledby="chart-title" className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-surface-line bg-surface p-4 shadow-[var(--card-shadow)] md:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-3.5">
          <h2 id="chart-title" className="text-[15px] font-extrabold text-fg max-md:sr-only">
            Over time
          </h2>
          <span className="md:hidden">
            <Segmented label="Chart" small value={view} onChange={setView} options={VIEWS.map((v) => ({ value: v.value, label: v.short }))} />
          </span>
          <span className="max-md:hidden">
            <Segmented label="Chart" value={view} onChange={setView} options={VIEWS.map((v) => ({ value: v.value, label: v.label }))} />
          </span>
        </span>
        <span className="flex items-center gap-4 max-md:hidden">
          <Legend view={view} />
          <span className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Showing</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-fill px-3 py-1.5 text-xs font-bold whitespace-nowrap text-fg">
              <Mono mark={pick} size={18} />
              {pick.alias}
            </span>
          </span>
        </span>
      </div>
      <p className="text-xs font-medium text-muted max-md:hidden">{current.note}</p>
      {view === "days" ? <DayByDay chart={chart} pick={pick} empty={empty} /> : view === "trend" ? <Trend chart={chart} pick={pick} /> : <Lifetime chart={chart} pick={pick} />}
    </section>
  );
}
