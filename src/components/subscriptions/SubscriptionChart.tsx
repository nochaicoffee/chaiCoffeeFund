"use client";

import { useState, type CSSProperties } from "react";
import type { ChartView, GridView, TrendMonthView } from "@/app/subscriptions/chartView";
import type { PickView } from "@/app/subscriptions/views";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { ALL } from "@/lib/format/subscriptionLabels";
import { RingTexture } from "../RingTexture";
import { CARD_WIDTH, cardLeft } from "./chartGeometry";
import { Mono, Segmented } from "./parts";
import { useSize } from "./useSize";

/**
 * The full-width chart at the end of the Subscriptions page (#127), with a switch:
 * Day by day (the default), Payment trend and Lifetime cost. Each follows the pick:
 * its days and its part of each month take its colour, and the rest fade.
 */

type View = "days" | "trend" | "lifetime";

const VIEWS: { value: View; label: string; short: string; note: string }[] = [
  { value: "days", label: "Day by day", short: "Day by day", note: "Every renewal on its day · darker costs more · the pick lights up." },
  { value: "trend", label: "Payment trend", short: "Trend", note: "The last 12 months paid and the next 6 expected · the pick is drawn in its colour." },
  { value: "lifetime", label: "Lifetime cost", short: "Lifetime", note: "Everything you've paid each one, since it started." },
];

const nextDay = (iso: string) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

/** Narrower than this, a chart draws its phone layout. */
const PHONE = 640;

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

// ---------- Day by day ----------

function DayByDay({ chart, pick, empty }: { chart: ChartView; pick: PickView; empty: boolean }) {
  const [box, size] = useSize<HTMLDivElement>({ w: 1300, h: 0 });
  const phone = size.w < PHONE;
  const grid: GridView = phone ? chart.phoneGrid : chart.desktopGrid;
  const label = phone ? 0 : 34;
  const gap = phone ? 3 : 4;
  const col = Math.min(phone ? 30 : 25, (size.w - label) / grid.weeks);
  const cell = Math.max(6, Math.floor(col - gap));
  const step = cell + gap;
  const radius = phone ? 3 : 6;
  const byDate = new Map(grid.days.map((d) => [d.date, d]));
  const picked = pick.id !== ALL;
  const pickColor = `var(--card-${pick.color})`;

  const cells = [];
  for (let date = grid.start; date <= grid.last; date = nextDay(date)) {
    if (date < grid.first) {
      cells.push(<span key={date} aria-hidden="true" />);
      continue;
    }
    const day = byDate.get(date);
    const today = date === chart.today;
    const ring = today ? "0 0 0 2px var(--surface), 0 0 0 4px var(--accent)" : undefined;
    if (!day) {
      cells.push(<span key={date} aria-hidden="true" style={{ borderRadius: radius, background: "var(--heat-no-data)", boxShadow: ring }} />);
      continue;
    }
    const mine = picked && day.ids.includes(pick.id);
    // Longhand borders only, so the pick can recolour one without React mixing shorthand and longhand.
    const edge = (style: "solid" | "dashed", color: string): CSSProperties => ({ borderWidth: 1.5, borderStyle: style, borderColor: color });
    let style: CSSProperties =
      day.kind === "missing"
        ? { background: "var(--warning-tint)", ...edge("solid", "var(--warning)") }
        : day.kind === "expected" || day.kind === "pending"
          ? { background: "color-mix(in oklch, var(--heat-1) 50%, transparent)", ...edge("dashed", `var(--heat-${day.level})`) }
          : day.kind === "skipped"
            ? { background: "var(--fill-strong)" }
            : { background: `var(--heat-${day.level})` };
    if (mine) style = { ...style, background: pickColor, ...(style.borderStyle ? { borderColor: pickColor } : {}), opacity: day.kind === "expected" || day.kind === "pending" ? 0.6 : 1 };
    else if (picked) style = { ...style, opacity: 0.18 };
    cells.push(
      <span
        key={date}
        role="img"
        aria-label={day.label}
        title={day.label}
        className="transition-[opacity,background-color] duration-300 motion-reduce:transition-none"
        style={{ ...style, borderRadius: radius, boxShadow: ring }}
      />,
    );
  }

  return (
    <div ref={box} className="relative">
      <div className="relative" style={{ height: 20 + 7 * step }}>
        {grid.months.map((m) => (
          <span key={m.month} className={`absolute top-0 text-[11px] font-extrabold ${m.current ? "text-accent-text" : "text-muted"}`} style={{ left: label + m.week * step }}>
            {m.name}
          </span>
        ))}
        {!phone &&
          ["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) =>
            d ? (
              <span key={d} aria-hidden="true" className="absolute left-0 text-[10px] font-bold text-muted" style={{ top: 20 + i * step + 3 }}>
                {d}
              </span>
            ) : null,
          )}
        <div className="absolute top-5 grid" style={{ left: label, gridTemplateRows: `repeat(7, ${cell}px)`, gridAutoFlow: "column", gridAutoColumns: `${cell}px`, gap }}>
          {cells}
        </div>
        {empty && (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-surface-line bg-surface px-3 py-1.5 text-xs font-bold text-muted shadow-[var(--pop-shadow)]">
            Renewals land on their day here
          </span>
        )}
      </div>
      <div className="relative mt-2" style={{ height: phone ? 22 : 26 }}>
        {grid.months.map((m) => (
          <span
            key={m.month}
            className={`absolute top-0 flex h-full items-center justify-center rounded-lg font-extrabold tabular-nums ${phone ? "text-[9.5px]" : "text-[11.5px]"} ${m.future ? "border-[1.5px] border-dashed border-fill-strong text-muted" : "bg-fill text-fg"}`}
            style={{ left: label + m.week * step, width: Math.max(0, m.weeks * step - gap) }}
          >
            {m.total}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- Payment trend ----------

const niceMax = (v: number, step = 2000) => Math.max(step, Math.ceil(v / step) * step);


function TrendCard({ month }: { month: TrendMonthView }) {
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
    </div>
  );
}

function Trend({ chart, pick }: { chart: ChartView; pick: PickView }) {
  const [box, size, measured] = useSize<HTMLDivElement>({ w: 1300, h: 0 });
  const [hovered, setHovered] = useState<number | null>(null);
  const phone = size.w < PHONE;
  const months = phone ? chart.trend.months.slice(6) : chart.trend.months;
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
        const body: CSSProperties = m.future
          ? { border: `1.5px dashed ${all ? "var(--heat-4)" : tint(70)}`, background: all ? "color-mix(in oklch, var(--heat-1) 40%, transparent)" : tint(6) }
          : { background: all ? `var(--heat-${level})` : tint(20), boxShadow: peak ? "0 12px 24px var(--trend-peak-shadow)" : undefined };
        return (
          <div key={m.month}>
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
              aria-label={`${m.card.title}: ${m.card.total}, ${m.card.pill.toLowerCase()}`}
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
      {hovered !== null && months[hovered] && (
        <div className="pointer-events-none absolute z-10" style={{ top: -8, left: cardLeft(left + hovered * (bw + gap), bw, size.w, phone) }}>
          <TrendCard month={months[hovered]} />
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

function Lifetime({ chart, pick }: { chart: ChartView; pick: PickView }) {
  const { rows, captions } = chart.lifetime;
  const picked = pick.id !== ALL;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] leading-relaxed font-medium text-muted">{captions[pick.id] ?? captions[ALL]}</p>
      <div className="flex flex-col gap-[7px] md:gap-[9px]">
        {rows.map((r) => {
          const inside = r.fraction > 0.22;
          const width = `${Math.max(6, r.fraction * 100)}%`;
          return (
            <div
              key={r.id}
              className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-2 transition-opacity duration-300 md:grid-cols-[190px_minmax(0,1fr)_230px_110px] md:gap-4"
              style={{ opacity: picked && r.id !== pick.id ? 0.22 : r.mark.muted ? 0.75 : 1 }}
            >
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
          );
        })}
      </div>
    </div>
  );
}

export function SubscriptionChart({ chart, pick, empty }: { chart: ChartView; pick: PickView; empty: boolean }) {
  const [view, setView] = useState<View>("days");
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
