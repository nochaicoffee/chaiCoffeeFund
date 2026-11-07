"use client";

import { useMemo, useRef, useState, type Dispatch, type KeyboardEvent, type PointerEvent, type ReactNode, type SetStateAction } from "react";
import { pct, signedLakh, type LensView, type PickCard } from "@/app/investments/views";
import { asOfReading, gappedPath, goBackIndex, goBackMark, GO_BACK, inRange, lensWindow, linePath, moneyBars, offeredGoBack, offeredLensRanges, offeredRanges, racePercent, raceScale, readingAt, rebased, scaleOf, spreadLabels, type GoBackKey, type RangeKey, type StagePoint } from "@/app/investments/stageView";
import type { RaceKey, RaceLine } from "@/lib/aggregate/raceLines";
import { formatLakh } from "@/lib/format/lakh";
import { formatDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { nearestIndex } from "../accounts/trendChart";
import { useAsOf } from "./AsOf";
import { PickCarousel } from "./PickCarousel";
import { PlanTag } from "./PlanTag";
import { PlotFrame } from "./PlotFrame";

/**
 * The stage (docs/design/investments.md, L1 Giant): the row of cards that picks what to look at, and under it one dark card. For everything
 * it is the worth over time against what it cost, with the money he added as bars along the foot; Go back to a day reads the portfolio as
 * it stood then; the range chips pick how far back. Pick one holding and the same card shows its price, what he paid and his trades on it.
 * Move along the chart (or use the arrow keys) to read a day. Race against the indices comes next.
 */

const MINT = "oklch(0.84 0.13 160)";
const AMBER = "oklch(0.82 0.12 85)";
const UP = "oklch(0.82 0.17 150)";
const DOWN = "oklch(0.74 0.16 25)";
const MUTED = "oklch(0.74 0.01 250)";
const W = 800;
const H = 260;
const STAGE_BG = "radial-gradient(120% 90% at 10% 0%, oklch(0.27 0.02 255), oklch(0.15 0.01 260) 60%)";
const STAGE = "flex flex-col gap-4 rounded-[28px] px-5 py-6 text-on-card md:px-[26px]";
const STAGE_STYLE = { background: STAGE_BG, boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.08), 0 22px 50px oklch(0 0 0 / 0.22)" } as const;

export function Stage({ series, race = [], lenses = [], picks = [], holdingCount = 0 }: { series: StagePoint[]; race?: RaceLine[]; lenses?: LensView[]; picks?: PickCard[]; holdingCount?: number }) {
  const [pick, setPick] = useState<string>("all");
  // Kept here, not in the stage, so looking at a holding and coming back to Everything leaves the range and the day as he set them.
  const [range, setRange] = useState<RangeKey | null>(null);
  const { goBack, setGoBack } = useAsOf();
  const [view, setView] = useState<StageView>("worth");
  const [raceOn, setRaceOn] = useState<ReadonlySet<RaceKey>>(() => new Set<RaceKey>(["you", "nifty", "sp500"]));
  const lens = lenses.find((l) => l.key === pick);
  return (
    <>
      {picks.length > 0 && <PickCarousel cards={picks} pick={lens ? pick : "all"} onPick={setPick} />}
      {lens ? <LensStage key={lens.key} lens={lens} /> : <WorthStage series={series} race={race} holdingCount={holdingCount} range={range} onRange={setRange} goBack={goBack} onGoBack={setGoBack} view={view} onView={setView} raceOn={raceOn} onRaceOn={setRaceOn} />}
    </>
  );
}

/** A row of pill chips on the dark stage: one is on. */
function Chips<K extends string>({ label, items, value, onChange }: { label: string; items: readonly { key: K; label: string }[]; value: K; onChange: (key: K) => void }) {
  return (
    <div role="group" aria-label={label} className="flex max-w-full overflow-x-auto rounded-full p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ background: "oklch(1 0 0 / 0.09)" }}>
      {items.map((item) => (
        <button key={item.key} type="button" aria-pressed={value === item.key} onClick={() => onChange(item.key)} className="min-h-8 rounded-full px-3.5 text-[12.5px] font-extrabold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-white" style={value === item.key ? { background: "oklch(0.99 0 0)", color: "oklch(0.18 0.01 260)" } : { color: "oklch(0.8 0.01 250)" }}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

type StageView = "worth" | "race";
const VIEWS = [{ key: "worth", label: "Worth" }, { key: "race", label: "Race" }] as const;
/** How each Race line is drawn (design: him thick and green, the indices thinner, the deposit dashed). */
const RACE_STYLE: Record<RaceKey, { colour: string; width: number; dash?: string }> = {
  you: { colour: "oklch(0.82 0.17 152)", width: 3.4 },
  nifty: { colour: "oklch(0.78 0.1 200)", width: 2 },
  sp500: { colour: "oklch(0.74 0.12 262)", width: 2 },
  deposit: { colour: "oklch(0.72 0.012 260)", width: 2, dash: "4 4" },
};

const rangeItems = (keys: RangeKey[]) => keys.map((key) => ({ key, label: key }));

function WorthStage({ series, race, holdingCount, range: chosen, onRange, goBack, onGoBack, view, onView, raceOn, onRaceOn }: { series: StagePoint[]; race: RaceLine[]; holdingCount: number; range: RangeKey | null; onRange: (key: RangeKey) => void; goBack: GoBackKey; onGoBack: (key: GoBackKey) => void; view: StageView; onView: (view: StageView) => void; raceOn: ReadonlySet<RaceKey>; onRaceOn: Dispatch<SetStateAction<ReadonlySet<RaceKey>>> }) {
  const offered = useMemo(() => offeredRanges(series), [series]);
  const goBacks = useMemo(() => offeredGoBack(series), [series]);
  const range = chosen && offered.includes(chosen) ? chosen : offered.includes("1Y") ? "1Y" : "All";
  const [hover, setHover] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const points = useMemo(() => inRange(series, range), [series, range]);
  const scale = useMemo(() => (points.length > 0 ? scaleOf(points) : { min: 0, max: 1 }), [points]);
  const valuePath = useMemo(() => linePath(points.map((p) => p.value), scale, W, H), [points, scale]);
  const costPath = useMemo(() => linePath(points.map((p) => p.cost), scale, W, H, true), [points, scale]);
  const bars = useMemo(() => moneyBars(points), [points]);
  // The Race: each line from the first day shown, as a percent of that day (a line with no level on it is left out).
  const offset = series.length - points.length;
  const raceRows = useMemo(() => race.flatMap((l) => { const levels = rebased(l.values.slice(offset)); return levels ? [{ key: l.key, label: l.label, levels }] : []; }), [race, offset]);
  const raceDrawn = useMemo(() => {
    const rows = raceRows.filter((r) => raceOn.has(r.key));
    const rscale = raceScale(rows.map((r) => r.levels));
    return { rows, scale: rscale, paths: rows.map((r) => gappedPath(r.levels, rscale, W, H)) };
  }, [raceRows, raceOn]);
  if (points.length < 2) return null;

  const n = points.length;
  const racing = view === "race" && raceRows.length > 0;
  const backIndex = goBackIndex(series, goBack);
  const marked = goBackMark(series, n, goBack);
  const y = (v: number) => (H - ((v - scale.min) / (scale.max - scale.min)) * H) / H;
  const plain = (i: number) => ({ ...readingAt(points, i)!, addedSince: 0, marketSince: 0 });
  const reading = hover !== null ? plain(hover) : goBack !== "now" ? asOfReading(series, backIndex)! : plain(n - 1);
  const gainColour = reading.gain >= 0 ? UP : DOWN;
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
  // A chip at the end of each line drawn, spread so they don't sit on each other.
  const ends = raceDrawn.rows.map((r) => ({ key: r.key, level: r.levels.at(-1) ?? null })).filter((e): e is { key: RaceKey; level: number } => e.level !== null);
  const endTops = spreadLabels(ends.map((e) => 1 - (e.level - raceDrawn.scale.min) / (raceDrawn.scale.max - raceDrawn.scale.min)));
  const endLabels = ends.map((e, i) => ({ ...e, top: endTops[i] }));
  const heading = hover !== null ? `Portfolio · ${formatDate(reading.date)}` : goBack !== "now" ? `Portfolio · as of ${formatDate(reading.date)}` : `Portfolio · ${holdingCount === 1 ? "1 holding" : `${holdingCount} holdings`}`;

  return (
    <section aria-label="Worth over time" className={STAGE} style={STAGE_STYLE}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
          <span className="text-xs font-extrabold" style={{ color: MUTED }}>Go back to</span>
          <Chips label="Go back to" items={GO_BACK.filter((g) => goBacks.includes(g.key))} value={goBack} onChange={(key) => { onGoBack(key); setHover(null); }} />
        </span>
        <span className="flex flex-wrap items-center gap-3">
          {raceRows.length > 0 && <Chips label="What to draw" items={VIEWS} value={racing ? "race" : "worth"} onChange={(key) => { onView(key); setHover(null); }} />}
          <Chips label="How far back" items={rangeItems(offered)} value={range} onChange={(key) => { onRange(key); setHover(null); }} />
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-7 gap-y-2 pt-2">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase" style={{ color: MUTED }}>{heading}</div>
          <div className="mt-1.5 text-[52px] leading-[0.95] font-extrabold tracking-[-0.045em] tabular-nums md:text-[76px]">{formatLakh(reading.value)}</div>
        </div>
        <p className="max-w-[460px] pb-2 text-sm leading-normal font-extrabold md:text-right" style={{ color: gainColour }}>
          {signedLakh(reading.gain)}
          {reading.gainFraction === null ? "" : ` · ${pct(reading.gainFraction, 1, true)}`} on {formatLakh(reading.cost)} put in
          {hover === null && goBack !== "now" && <> · since then {signedLakh(reading.marketSince)} from the market</>}
        </p>
      </div>

      <PlotFrame
        scale={racing ? raceDrawn.scale : scale}
        dates={points.map((p) => p.date)}
        bars={racing ? undefined : bars}
        endGutter={racing ? 56 : 0}
        plotRef={chartRef}
        plot={{
          role: "img",
          tabIndex: 0,
          "aria-label": racing ? `You against Nifty 50, the S&P 500 in rupees and a deposit, each as a percent of ${formatDate(points[0].date)}. Use the arrow keys to read a day.` : `Worth from ${formatLakh(points[0].value)} on ${formatDate(points[0].date)} to ${formatLakh(points[n - 1].value)} on ${formatDate(points[n - 1].date)}, against what it cost, with the money added along the foot. Use the arrow keys to read a day.`,
          onPointerMove: (e) => setHover(indexAt(e)),
          onPointerLeave: () => setHover(null),
          onKeyDown: onKey,
          className: "cursor-crosshair touch-pan-y",
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="stage-worth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MINT} stopOpacity="0.42" />
              <stop offset="100%" stopColor={MINT} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {racing ? (
            raceDrawn.rows.map((r, k) => (
              <path key={r.key} d={raceDrawn.paths[k]} fill="none" stroke={RACE_STYLE[r.key].colour} strokeWidth={RACE_STYLE[r.key].width} strokeDasharray={RACE_STYLE[r.key].dash} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            ))
          ) : (
            <>
              <path d={`${valuePath} L ${W} ${H} L 0 ${H} Z`} fill="url(#stage-worth)" />
              <path d={costPath} fill="none" stroke={AMBER} strokeWidth="1.6" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
              <path d={valuePath} fill="none" stroke={MINT} strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </>
          )}
          {hover !== null && <line x1={(hover / (n - 1)) * W} x2={(hover / (n - 1)) * W} y1={0} y2={H} stroke="oklch(1 0 0 / 0.5)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        </svg>
        {marked !== null && (
          <>
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0" style={{ left: `${(marked / (n - 1)) * 100}%`, background: "oklch(0 0 0 / 0.28)", borderLeft: "1.6px dashed oklch(0.86 0.13 85)" }} />
            <span aria-hidden="true" className="pointer-events-none absolute top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold whitespace-nowrap" style={{ left: `clamp(70px, ${(marked / (n - 1)) * 100}%, calc(100% - 70px))`, background: "oklch(0.86 0.13 85)", color: "oklch(0.25 0.05 70)" }}>
              as of {formatDate(points[marked].date)}
            </span>
          </>
        )}
        {!racing && hover !== null && (
          <span aria-hidden="true" className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" style={{ left: `${(hover / (n - 1)) * 100}%`, top: `${y(reading.value) * 100}%`, background: MINT }} />
        )}
        {racing && endLabels.map((l) => (
          <span key={l.key} aria-hidden="true" className="pointer-events-none absolute left-full ml-1.5 w-[50px] -translate-y-1/2 rounded-full py-px text-center text-[10.5px] font-extrabold" style={{ top: `${l.top * 100}%`, background: RACE_STYLE[l.key].colour, color: "oklch(0.15 0.01 260)" }}>
            {racePercent(l.level)}
          </span>
        ))}
      </PlotFrame>

      {racing ? (
        <div role="group" aria-label="Lines to draw" className="flex flex-wrap items-center gap-2 text-[11.5px] font-bold">
          {raceRows.map((r) => {
            const on = raceOn.has(r.key);
            const level = r.levels[hover ?? n - 1];
            return (
              <button key={r.key} type="button" aria-pressed={on} onClick={() => onRaceOn((prev) => { const next = new Set(prev); if (!next.delete(r.key)) next.add(r.key); return next.size > 0 ? next : prev; })} className="flex min-h-8 items-center gap-1.5 rounded-full px-3 focus-visible:outline-2 focus-visible:outline-white" style={{ background: "oklch(1 0 0 / 0.09)", color: on ? "oklch(0.97 0.005 250)" : "oklch(0.6 0.01 250)", opacity: on ? 1 : 0.7 }}>
                <i aria-hidden="true" className="block size-[9px] rounded-full" style={{ background: RACE_STYLE[r.key].colour }} />
                {r.label}
                {on && level !== null && level !== undefined && <b className="tabular-nums">{racePercent(level, hover === null ? 0 : 1)}</b>}
              </button>
            );
          })}
          <span className="ml-auto text-[11px]" style={{ color: MUTED }}>Each line as a percent of {formatDate(points[0].date)}</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] font-bold" style={{ color: "oklch(0.8 0.01 250)" }}>
          <Key colour={MINT}>Worth</Key>
          <Key colour={AMBER}>Put in</Key>
          <Key colour="oklch(0.72 0.1 258)">Money added</Key>
          <span className="ml-auto text-[11px]" style={{ color: MUTED }}>Move across the chart for any day</span>
        </div>
      )}
    </section>
  );
}

function Key({ colour, children }: { colour: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <i aria-hidden="true" className="block size-[9px] rounded-[3px]" style={{ background: colour }} />
      {children}
    </span>
  );
}

const SOURCE_COLOUR = { buy: "oklch(0.88 0.17 138)", sell: "oklch(0.78 0.16 25)", rsu: "oklch(0.8 0.12 250)", espp: "oklch(0.8 0.14 310)" } as const;
const markerColour = (m: { tradeType: "Buy" | "Sell"; source: "Market" | "RSU" | "ESPP" }) => (m.tradeType === "Sell" ? SOURCE_COLOUR.sell : m.source === "RSU" ? SOURCE_COLOUR.rsu : m.source === "ESPP" ? SOURCE_COLOUR.espp : SOURCE_COLOUR.buy);
const markerName = (m: { tradeType: "Buy" | "Sell"; source: "Market" | "RSU" | "ESPP" }) => (m.tradeType === "Sell" ? "Sold" : m.source === "RSU" ? "RSU vest" : m.source === "ESPP" ? "ESPP" : "Bought");

/** One holding on the stage: its price (a green line), what he paid a share (dashed), and every trade of his marked on the price. */
function LensStage({ lens }: { lens: LensView }) {
  const ranges = useMemo(() => offeredLensRanges(lens.points), [lens.points]);
  const [range, setRange] = useState<RangeKey>(ranges.includes("1Y") ? "1Y" : "All");
  const [hover, setHover] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const win = useMemo(() => lensWindow(lens.points, lens.markers, range), [lens.points, lens.markers, range]);
  const pts = win.points;
  const scale = useMemo(() => (pts.length > 0 ? scaleOf(pts.map((p) => ({ date: p.date, value: p.price, cost: p.avgCost ?? p.price }))) : { min: 0, max: 1 }), [pts]);
  const pricePath = useMemo(() => linePath(pts.map((p) => p.price), scale, W, H), [pts, scale]);
  // The cost line only where he held shares; a gap while he held none.
  const costPath = useMemo(() => gappedPath(pts.map((p) => p.avgCost), scale, W, H), [pts, scale]);
  if (pts.length < 2) {
    return (
      <section aria-label={`${lens.name} on its own`} className={STAGE} style={STAGE_STYLE}>
        <p className="text-sm font-semibold" style={{ color: MUTED }}>No price history is saved for {lens.name} yet. Refresh prices to fetch it.</p>
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
    <section aria-label={`${lens.name} on its own`} className={STAGE} style={STAGE_STYLE}>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Chips label="How far back" items={rangeItems(ranges)} value={range} onChange={(key) => { setRange(key); setHover(null); }} />
      </div>
      <div className="min-w-0 pt-2">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-[44px] shrink-0 items-center justify-center rounded-[13px] text-[11px] font-extrabold text-on-card" style={{ background: `linear-gradient(155deg, var(--card-${lens.header.colorKey}-from), var(--card-${lens.header.colorKey}-to))` }}>
            {lens.header.tile}
          </span>
          <div className="min-w-0">
            <div className="text-[17px] leading-tight font-extrabold">
              {lens.name}
              {lens.header.tags.map((t) => (
                <PlanTag key={t} name={t} />
              ))}
            </div>
            <p className="m-0 mt-0.5 text-[11.5px] font-semibold" style={{ color: MUTED }}>{lens.header.kind}</p>
          </div>
        </div>
        <div className="mt-3 text-[11px] font-extrabold tracking-[0.05em] uppercase" style={{ color: MUTED }}>
          {hover === null ? "Latest price" : `Price on ${formatDate(at.date)}`}
        </div>
        <div className="mt-1.5 text-[52px] leading-[0.95] font-extrabold tracking-[-0.045em] tabular-nums md:text-[76px]">{big}</div>
        <p className="mt-3 text-[13px] font-semibold" style={{ color: MUTED }}>
          {at.avgCost === null ? "You held none that day" : <>You paid <b style={{ color: AMBER }}>{formatMoney(lens.currency, at.avgCost)}</b> a share on average: <b style={{ color: at.price >= at.avgCost ? UP : DOWN }}>{pct(at.price / at.avgCost - 1, 1, true)}</b></>}
        </p>
        {tradesAt.length > 0 && (
          <p className="mt-1 text-[12px] font-bold" style={{ color: MUTED }}>
            {tradesAt.map((m) => `${markerName(m)} ${m.quantity} at ${formatMoney(lens.currency, m.price)}`).join(" · ")}
          </p>
        )}
      </div>

      <PlotFrame
        scale={scale}
        dates={pts.map((p) => p.date)}
        plotRef={chartRef}
        plot={{
          role: "img",
          tabIndex: 0,
          "aria-label": `${lens.name}'s price from ${formatMoney(lens.currency, pts[0].price)} on ${formatDate(pts[0].date)} to ${formatMoney(lens.currency, pts[n - 1].price)} on ${formatDate(pts[n - 1].date)}, with your ${win.markers.length} trades marked. Use the arrow keys to read a day.`,
          onPointerMove: (e) => setHover(indexAt(e)),
          onPointerLeave: () => setHover(null),
          onKeyDown: onKey,
          className: "cursor-crosshair touch-pan-y",
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          {costPath && <path d={costPath} fill="none" stroke={AMBER} strokeWidth="1.6" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />}
          <path d={pricePath} fill="none" stroke={MINT} strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {hover !== null && <line x1={(hover / (n - 1)) * W} x2={(hover / (n - 1)) * W} y1={0} y2={H} stroke="oklch(1 0 0 / 0.5)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        </svg>
        {win.markers.map((m) => {
          const i = indexOfDate(m.date);
          return (
            <span key={m.tradeId} title={`${markerName(m)} ${m.quantity} on ${formatDate(m.date)} at ${formatMoney(lens.currency, m.price)}`} className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80" style={{ left: `${x(i)}%`, top: `${y(pts[i].price) * 100}%`, background: markerColour(m) }} />
          );
        })}
      </PlotFrame>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] font-bold" style={{ color: "oklch(0.8 0.01 250)" }}>
        <Key colour={MINT}>Price</Key>
        <Key colour={AMBER}>What you paid</Key>
        {(["Bought", "RSU vest", "ESPP", "Sold"] as const).map((name) => (
          <span key={name} className="flex items-center gap-1.5"><i aria-hidden="true" className="block size-2.5 rounded-full" style={{ background: markerColour(name === "Sold" ? { tradeType: "Sell", source: "Market" } : { tradeType: "Buy", source: name === "RSU vest" ? "RSU" : name === "ESPP" ? "ESPP" : "Market" }) }} />{name}</span>
        ))}
        <span className="ml-auto text-[11px]" style={{ color: MUTED }}>A dot for each of your trades</span>
      </div>

      <dl className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-7">
        {lens.stats.map((st) => (
          <div key={st.label} className="flex min-w-0 flex-col gap-0.5 rounded-[14px] p-3" style={{ background: "var(--on-card-fill)" }}>
            <dt className="text-[10px] font-extrabold tracking-wider uppercase" style={{ color: MUTED }}>{st.label}</dt>
            <dd className="m-0 text-base font-extrabold tabular-nums" style={{ color: st.tone === "gain" ? UP : st.tone === "loss" ? DOWN : undefined }}>{st.value}</dd>
            {st.note && <small className="text-[11px] font-medium" style={{ color: MUTED }}>{st.note}</small>}
          </div>
        ))}
      </dl>
    </section>
  );
}
