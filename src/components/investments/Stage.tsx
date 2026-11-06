"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { pct, type LensView } from "@/app/investments/views";
import { inRange, lensWindow, linePath, offeredLensRanges, offeredRanges, readingAt, scaleOf, type RangeKey, type StagePoint } from "@/app/investments/stageView";
import { lakhParts } from "@/lib/format/lakh";
import { formatDate } from "@/lib/format/date";
import { formatInr, formatMoney } from "@/lib/format/money";
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

export function Stage({ series, lenses = [], pricesNote }: { series: StagePoint[]; lenses?: LensView[]; pricesNote?: string }) {
  const [pick, setPick] = useState<string>("all");
  const lens = lenses.find((l) => l.key === pick);
  const picker = lenses.length > 0 ? <HoldingPicker lenses={lenses} pick={pick} onPick={setPick} /> : null;
  if (lens) return <LensStage key={lens.key} lens={lens} picker={picker} />;
  return <WorthStage series={series} pricesNote={pricesNote} picker={picker} />;
}

function WorthStage({ series, pricesNote, picker }: { series: StagePoint[]; pricesNote?: string; picker: React.ReactNode }) {
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
      {picker}
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

const SOURCE_COLOUR = { buy: "oklch(0.88 0.17 138)", sell: "oklch(0.78 0.16 25)", rsu: "oklch(0.8 0.12 250)", espp: "oklch(0.8 0.14 310)" } as const;
const markerColour = (m: { tradeType: "Buy" | "Sell"; source: "Market" | "RSU" | "ESPP" }) => (m.tradeType === "Sell" ? SOURCE_COLOUR.sell : m.source === "RSU" ? SOURCE_COLOUR.rsu : m.source === "ESPP" ? SOURCE_COLOUR.espp : SOURCE_COLOUR.buy);
const markerName = (m: { tradeType: "Buy" | "Sell"; source: "Market" | "RSU" | "ESPP" }) => (m.tradeType === "Sell" ? "Sold" : m.source === "RSU" ? "RSU vest" : m.source === "ESPP" ? "ESPP" : "Bought");

/** Everything, or one holding: the stage's picker, so the same card shows the whole portfolio or a holding on its own. */
function HoldingPicker({ lenses, pick, onPick }: { lenses: LensView[]; pick: string; onPick: (key: string) => void }) {
  const chip = (key: string, label: string) => (
    <button key={key} type="button" aria-pressed={pick === key} onClick={() => onPick(key)} className="min-h-8 shrink-0 rounded-full px-3 text-xs font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white" style={pick === key ? { background: "oklch(1 0 0 / 0.92)", color: "oklch(0.2 0.02 260)" } : { background: "var(--on-card-fill)", color: "var(--on-card-muted)" }}>
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="What to look at" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {chip("all", "Everything")}
      {lenses.map((l) => chip(l.key, l.symbol))}
    </div>
  );
}

/** One holding on the stage: its price (a green line), what he paid a share (dashed), and every trade of his marked on the price. */
function LensStage({ lens, picker }: { lens: LensView; picker: React.ReactNode }) {
  const ranges = useMemo(() => offeredLensRanges(lens.points), [lens.points]);
  const [range, setRange] = useState<RangeKey>(ranges.includes("1Y") ? "1Y" : "All");
  const [hover, setHover] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const win = useMemo(() => lensWindow(lens.points, lens.markers, range), [lens.points, lens.markers, range]);
  const pts = win.points;
  const scale = useMemo(() => (pts.length > 0 ? scaleOf(pts.map((p) => ({ date: p.date, value: p.price, cost: p.avgCost ?? p.price }))) : { min: 0, max: 1 }), [pts]);
  const pricePath = useMemo(() => linePath(pts.map((p) => p.price), scale, W, H), [pts, scale]);
  // The cost line only where he held shares; a gap while he held none.
  const costPath = useMemo(() => {
    const runs: string[] = [];
    let run: { i: number; v: number }[] = [];
    pts.forEach((p, i) => {
      if (p.avgCost === null) {
        if (run.length > 0) runs.push(run.map((r, k) => `${k === 0 ? "M" : "L"} ${((r.i / (pts.length - 1)) * W).toFixed(1)} ${(H - ((r.v - scale.min) / (scale.max - scale.min)) * H).toFixed(1)}`).join(" "));
        run = [];
      } else run.push({ i, v: p.avgCost });
    });
    if (run.length > 0) runs.push(run.map((r, k) => `${k === 0 ? "M" : "L"} ${((r.i / (pts.length - 1)) * W).toFixed(1)} ${(H - ((r.v - scale.min) / (scale.max - scale.min)) * H).toFixed(1)}`).join(" "));
    return runs.join(" ");
  }, [pts, scale]);
  if (pts.length < 2) {
    return (
      <section aria-label={`${lens.name} on its own`} className="flex flex-col gap-4 rounded-[26px] p-5 md:p-7" style={{ background: "var(--ink, oklch(0.2 0.02 260))", color: "var(--on-card, oklch(0.95 0.004 260))" }}>
        {picker}
        <p className="text-sm font-semibold" style={{ color: "var(--on-card-muted)" }}>No price history is saved for {lens.name} yet. Refresh prices to fetch it.</p>
      </section>
    );
  }
  const n = pts.length;
  const at = pts[Math.max(0, Math.min(n - 1, hover ?? n - 1))];
  const x = (i: number) => (i / (n - 1)) * 100;
  /** The first point on or after a day: a weekend trade sits on Monday, and one after the last close (today's, before its price is saved) on the last point. */
  const indexOfDate = (date: string) => {
    const i = pts.findIndex((p) => p.date >= date);
    return i < 0 ? n - 1 : i;
  };
  const y = (v: number) => (H - ((v - scale.min) / (scale.max - scale.min)) * H) / H;
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
  const big = formatMoney(lens.currency, at.price);
  // The trades of his on the day under the cursor, said in words (a dot's tooltip doesn't show under a chart that tracks the pointer).
  const here = Math.max(0, Math.min(n - 1, hover ?? n - 1));
  const tradesAt = hover === null ? [] : win.markers.filter((m) => indexOfDate(m.date) === here);

  return (
    <section aria-label={`${lens.name} on its own`} className="flex flex-col gap-4 rounded-[26px] p-5 md:p-7" style={{ background: "var(--ink, oklch(0.2 0.02 260))", color: "var(--on-card, oklch(0.95 0.004 260))" }}>
      {picker}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold tracking-wider uppercase" style={{ color: "var(--on-card-muted)" }}>
            {lens.name} · {hover === null ? "latest price" : `price on ${formatDate(at.date)}`}
          </div>
          <div className="mt-1 text-5xl font-extrabold tracking-tight tabular-nums md:text-7xl">{big}</div>
          <p className="mt-2 text-[13px] font-semibold" style={{ color: "var(--on-card-muted)" }}>
            {at.avgCost === null ? "You held none that day" : <>You paid <b style={{ color: "oklch(0.82 0.12 85)" }}>{formatMoney(lens.currency, at.avgCost)}</b> a share on average: <b style={{ color: at.price >= at.avgCost ? LIME : "var(--negative-tint, #f5a3a3)" }}>{pct(at.price / at.avgCost - 1, 1, true)}</b></>}
          </p>
          {tradesAt.length > 0 && (
            <p className="mt-1 text-[12px] font-bold" style={{ color: "var(--on-card-muted)" }}>
              {tradesAt.map((m) => `${markerName(m)} ${m.quantity} at ${formatMoney(lens.currency, m.price)}`).join(" · ")}
            </p>
          )}
        </div>
        <div role="group" aria-label="How far back" className="flex rounded-full p-[3px]" style={{ background: "var(--on-card-fill)" }}>
          {ranges.map((key) => (
            <button key={key} type="button" aria-pressed={range === key} onClick={() => { setRange(key); setHover(null); }} className="min-h-8 rounded-full px-3 text-xs font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white" style={range === key ? { background: "oklch(1 0 0 / 0.92)", color: "oklch(0.2 0.02 260)" } : { color: "var(--on-card-muted)" }}>
              {key}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={chartRef}
        role="img"
        tabIndex={0}
        aria-label={`${lens.name}'s price from ${formatMoney(lens.currency, pts[0].price)} on ${formatDate(pts[0].date)} to ${formatMoney(lens.currency, pts[n - 1].price)} on ${formatDate(pts[n - 1].date)}, with your ${win.markers.length} trades marked. Use the arrow keys to read a day.`}
        onPointerMove={(e) => setHover(indexAt(e))}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        className="relative h-56 w-full cursor-crosshair touch-pan-y rounded-[14px] focus-visible:outline-2 focus-visible:outline-white md:h-72"
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden="true">
          {costPath && <path d={costPath} fill="none" stroke="oklch(0.82 0.12 85)" strokeWidth="1.6" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />}
          <path d={pricePath} fill="none" stroke="oklch(0.88 0.17 138)" strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {hover !== null && <line x1={(hover / (n - 1)) * W} x2={(hover / (n - 1)) * W} y1={0} y2={H} stroke="oklch(1 0 0 / 0.5)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        </svg>
        {win.markers.map((m) => {
          const i = indexOfDate(m.date);
          return (
            <span key={m.tradeId} title={`${markerName(m)} ${m.quantity} on ${formatDate(m.date)} at ${formatMoney(lens.currency, m.price)}`} className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80" style={{ left: `${x(i)}%`, top: `${y(pts[i].price) * 100}%`, background: markerColour(m) }} />
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 text-[11px] font-bold" style={{ color: "var(--on-card-muted)" }}>
        <span>{formatDate(pts[0].date)}</span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5"><i aria-hidden="true" className="block h-0.5 w-5 rounded-full" style={{ background: "oklch(0.88 0.17 138)" }} />price</span>
          <span className="flex items-center gap-1.5"><i aria-hidden="true" className="block w-5 border-t-2 border-dashed" style={{ borderColor: "oklch(0.82 0.12 85)" }} />what you paid</span>
          {(["Bought", "RSU vest", "ESPP", "Sold"] as const).map((name) => (
            <span key={name} className="flex items-center gap-1.5"><i aria-hidden="true" className="block size-2.5 rounded-full" style={{ background: markerColour(name === "Sold" ? { tradeType: "Sell", source: "Market" } : { tradeType: "Buy", source: name === "RSU vest" ? "RSU" : name === "ESPP" ? "ESPP" : "Market" }) }} />{name}</span>
          ))}
        </span>
        <span>{formatDate(pts[n - 1].date)}</span>
      </div>

      <dl className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-7">
        {lens.stats.map((st) => (
          <div key={st.label} className="flex min-w-0 flex-col gap-0.5 rounded-[14px] p-3" style={{ background: "var(--on-card-fill)" }}>
            <dt className="text-[10px] font-extrabold tracking-wider uppercase" style={{ color: "var(--on-card-muted)" }}>{st.label}</dt>
            <dd className="m-0 text-base font-extrabold tabular-nums" style={{ color: st.tone === "gain" ? LIME : st.tone === "loss" ? "var(--negative-tint, #f5a3a3)" : undefined }}>{st.value}</dd>
            {st.note && <small className="text-[11px] font-medium" style={{ color: "var(--on-card-muted)" }}>{st.note}</small>}
          </div>
        ))}
      </dl>
    </section>
  );
}
