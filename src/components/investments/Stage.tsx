"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { pct, signedLakh, type LensView, type PickCard } from "@/app/investments/views";
import { asOfReading, goBackIndex, goBackMark, GO_BACK, inRange, lensWindow, linePath, moneyBars, offeredGoBack, offeredLensRanges, offeredRanges, readingAt, scaleOf, type GoBackKey, type RangeKey, type StagePoint } from "@/app/investments/stageView";
import { formatLakh } from "@/lib/format/lakh";
import { formatDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { nearestIndex } from "../accounts/trendChart";
import { PickCarousel } from "./PickCarousel";
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

export function Stage({ series, lenses = [], picks = [], holdingCount = 0 }: { series: StagePoint[]; lenses?: LensView[]; picks?: PickCard[]; holdingCount?: number }) {
  const [pick, setPick] = useState<string>("all");
  // Kept here, not in the stage, so looking at a holding and coming back to Everything leaves the range and the day as he set them.
  const [range, setRange] = useState<RangeKey | null>(null);
  const [goBack, setGoBack] = useState<GoBackKey>("now");
  const lens = lenses.find((l) => l.key === pick);
  return (
    <>
      {picks.length > 0 && <PickCarousel cards={picks} pick={lens ? pick : "all"} onPick={setPick} />}
      {lens ? <LensStage key={lens.key} lens={lens} /> : <WorthStage series={series} holdingCount={holdingCount} range={range} onRange={setRange} goBack={goBack} onGoBack={setGoBack} />}
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

const rangeItems = (keys: RangeKey[]) => keys.map((key) => ({ key, label: key }));

function WorthStage({ series, holdingCount, range: chosen, onRange, goBack, onGoBack }: { series: StagePoint[]; holdingCount: number; range: RangeKey | null; onRange: (key: RangeKey) => void; goBack: GoBackKey; onGoBack: (key: GoBackKey) => void }) {
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
  if (points.length < 2) return null;

  const n = points.length;
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
  const heading = hover !== null ? `Portfolio · ${formatDate(reading.date)}` : goBack !== "now" ? `Portfolio · as of ${formatDate(reading.date)}` : `Portfolio · ${holdingCount === 1 ? "1 holding" : `${holdingCount} holdings`}`;

  return (
    <section aria-label="Worth over time" className={STAGE} style={STAGE_STYLE}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
          <span className="text-xs font-extrabold" style={{ color: MUTED }}>Go back to</span>
          <Chips label="Go back to" items={GO_BACK.filter((g) => goBacks.includes(g.key))} value={goBack} onChange={(key) => { onGoBack(key); setHover(null); }} />
        </span>
        <Chips label="How far back" items={rangeItems(offered)} value={range} onChange={(key) => { onRange(key); setHover(null); }} />
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
        scale={scale}
        dates={points.map((p) => p.date)}
        bars={bars}
        plotRef={chartRef}
        plot={{
          role: "img",
          tabIndex: 0,
          "aria-label": `Worth from ${formatLakh(points[0].value)} on ${formatDate(points[0].date)} to ${formatLakh(points[n - 1].value)} on ${formatDate(points[n - 1].date)}, against what it cost, with the money added along the foot. Use the arrow keys to read a day.`,
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
          <path d={`${valuePath} L ${W} ${H} L 0 ${H} Z`} fill="url(#stage-worth)" />
          <path d={costPath} fill="none" stroke={AMBER} strokeWidth="1.6" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
          <path d={valuePath} fill="none" stroke={MINT} strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
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
        {hover !== null && (
          <span aria-hidden="true" className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" style={{ left: `${(hover / (n - 1)) * 100}%`, top: `${y(reading.value) * 100}%`, background: MINT }} />
        )}
      </PlotFrame>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] font-bold" style={{ color: "oklch(0.8 0.01 250)" }}>
        <Key colour={MINT}>Worth</Key>
        <Key colour={AMBER}>Put in</Key>
        <Key colour="oklch(0.72 0.1 258)">Money added</Key>
        <span className="ml-auto text-[11px]" style={{ color: MUTED }}>Move across the chart for any day</span>
      </div>
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
  const costPath = useMemo(() => {
    const runs: string[] = [];
    let run: { i: number; v: number }[] = [];
    const flush = () => {
      if (run.length > 0) runs.push(run.map((r, k) => `${k === 0 ? "M" : "L"} ${((r.i / (pts.length - 1)) * W).toFixed(1)} ${(H - ((r.v - scale.min) / (scale.max - scale.min)) * H).toFixed(1)}`).join(" "));
      run = [];
    };
    pts.forEach((p, i) => {
      if (p.avgCost === null) flush();
      else run.push({ i, v: p.avgCost });
    });
    flush();
    return runs.join(" ");
  }, [pts, scale]);
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
        <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase" style={{ color: MUTED }}>
          {lens.name} · {hover === null ? "latest price" : `price on ${formatDate(at.date)}`}
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
