"use client";

import { useEffect, useRef, useState } from "react";
import { PERIODS, PERIOD_COLOR, type ChartView, type ClockPeriod, type ClockPeriodView, type ClockView } from "@/app/lent/clockView";
import { colorGradient, type ColorKey } from "@/lib/format/colors";
import { usePickInAddress } from "../usePickInAddress";

/**
 * The interest clock (docs/design/lent-out.md, L2, split in two on 2026-11-07): the clock card on the left (a dial, the day / month / year /
 * all-time switch and what each loan earns) and the "Interest adding up" card beside it (the 12% pot, the payouts in lumps, and the chart). The
 * two share one pick and its colour, and neither follows the hero's. The pick is kept in the address as `?clock=`; on a phone they stack.
 */
export function InterestClock({ view, initialPick }: { view: ClockView; initialPick: ClockPeriod }) {
  const [pick, choose] = usePickInAddress("clock", initialPick, PERIODS, (id) => id === "day");
  const period = (PERIODS as readonly string[]).includes(pick) ? (pick as ClockPeriod) : "day";
  const p = view.periods[period];
  const style = { background: colorGradient(PERIOD_COLOR[period]) };
  const card = "flex min-w-0 flex-col gap-4 rounded-[26px] p-5 text-on-card transition-[background] duration-300 md:p-6";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-12">
      <section aria-label="Interest clock" className={`${card} xl:col-span-5`} style={style}>
        <div>
          <h2 className="text-[15px] font-extrabold">Interest clock</h2>
          <p className="mt-0.5 text-xs font-semibold text-on-card-muted">what the money earns</p>
        </div>
        <Dial p={p} />
        <div role="group" aria-label="Period" className="flex flex-wrap justify-center gap-2">
          {PERIODS.map((id) => (
            <button key={id} type="button" aria-pressed={period === id} onClick={() => choose(id)} className={`min-h-9 rounded-full px-4 text-[13px] font-extrabold focus-visible:outline-2 focus-visible:outline-on-card ${period === id ? "bg-on-card text-ink" : "bg-on-card-fill"}`}>
              {view.periods[id].label}
            </button>
          ))}
        </div>
        <ul className="flex flex-col gap-2">
          {p.rows.map((r) => (
            <li key={r.key} className="flex items-center gap-3 rounded-[14px] bg-on-card-fill px-3 py-2.5">
              <Swatch colorKey={r.colorKey} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13px] font-extrabold">{r.name}</b>
                <small className="block truncate text-[11px] font-semibold text-on-card-muted">{r.note}</small>
                <i className="mt-1.5 block h-1 rounded-full bg-on-card-line" aria-hidden="true">
                  <i className="block h-full rounded-full bg-on-card" style={{ width: `${r.fraction * 100}%` }} />
                </i>
              </span>
              <span className="text-right">
                <b className="block text-[14px] font-extrabold tabular-nums">{r.amount}</b>
                <small className="block text-[11px] font-semibold text-on-card-muted tabular-nums">{r.share}</small>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-auto text-[11px] font-semibold text-on-card-muted">{p.note}</p>
      </section>

      <section aria-label="Interest adding up" className={`${card} xl:col-span-7`} style={style}>
        <div>
          <h2 className="text-[15px] font-extrabold">Interest adding up</h2>
          <p className="mt-0.5 text-xs font-semibold text-on-card-muted">the pot and the payouts, and how they got here</p>
        </div>
        {(view.pot || view.lumps) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {view.pot && <Tile title={view.pot.title} amount={view.pot.amount} note={view.pot.note} />}
            {view.lumps && <Tile title={view.lumps.title} amount={view.lumps.amount} note={view.lumps.note} />}
          </div>
        )}
        <Chart chart={view.chart} band={view.chart.bands[period]} all={period === "all"} />
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-bold text-on-card-muted">
          {view.chart.lines.map((l) => (
            <li key={l.key} className="flex items-center gap-1.5">
              <Swatch colorKey={l.colorKey} small />
              {l.name}
            </li>
          ))}
          {view.chart.marks.length > 0 && (
            <li className="flex items-center gap-1.5">
              <i aria-hidden="true" className="block size-2.5 rounded-full bg-negative" />a payout that isn&apos;t here
            </li>
          )}
          <li>the shaded stretch is the period picked</li>
        </ul>
      </section>
    </div>
  );
}

const pastel = (key: ColorKey) => `color-mix(in oklch, var(--card-${key}) 55%, white)`;

function Swatch({ colorKey, small }: { colorKey: ColorKey; small?: boolean }) {
  return <i aria-hidden="true" className={`block shrink-0 rounded-[4px] ${small ? "size-2.5" : "size-3"}`} style={{ background: pastel(colorKey) }} />;
}

function Tile({ title, amount, note }: { title: string; amount: string; note: string }) {
  return (
    <div className="rounded-[16px] bg-on-card-fill p-4">
      <p className="text-[10px] font-extrabold tracking-[0.06em] text-on-card-muted uppercase">{title}</p>
      <p className="mt-1 text-[26px] leading-tight font-extrabold tabular-nums max-md:text-[22px]">{amount}</p>
      <p className="mt-1 text-[11px] font-semibold text-on-card-muted">{note}</p>
    </div>
  );
}

const R = 142;
const C = 2 * Math.PI * R;

/** An arc for each loan round a dial, with the figure for the picked period in the middle and a hand sweeping the minute. */
function Dial({ p }: { p: ClockPeriodView }) {
  const gap = p.arcs.length > 1 ? 6 : 0;
  // Where each arc begins: the parts before it.
  const starts = p.arcs.map((_, i) => p.arcs.slice(0, i).reduce((t, a) => t + a.fraction, 0));
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[320px]">
      <svg viewBox="0 0 360 360" role="img" aria-label={`Interest by loan: ${p.rows.map((r) => `${r.name} ${r.amount}`).join(", ") || "nothing"}`} className="size-full">
        <circle cx="180" cy="180" r="172" fill="var(--on-card-line)" />
        <circle cx="180" cy="180" r={R} fill="none" stroke="var(--on-card-line)" strokeWidth="30" />
        {p.arcs.map((a, i) => {
          const len = Math.max(0, a.fraction * C - gap);
          const rotate = starts[i] * 360 + (gap / 2 / C) * 360 - 90;
          return <circle key={a.key} cx="180" cy="180" r={R} fill="none" stroke={pastel(a.colorKey)} strokeWidth="30" strokeDasharray={`${len.toFixed(1)} ${(C - len).toFixed(1)}`} transform={`rotate(${rotate.toFixed(2)} 180 180)`} />;
        })}
        {Array.from({ length: 60 }, (_, i) => {
          const long = i % 5 === 0;
          const a = ((i * 6 - 90) * Math.PI) / 180;
          // Rounded: the server and the browser don't agree on the last digits of cos and sin, and React would warn of a mismatch.
          const at = (r: number, f: (n: number) => number) => (180 + r * f(a)).toFixed(2);
          return <line key={i} x1={at(166, Math.cos)} y1={at(166, Math.sin)} x2={at(long ? 156 : 160, Math.cos)} y2={at(long ? 156 : 160, Math.sin)} stroke="var(--on-card)" strokeOpacity={long ? 0.5 : 0.25} strokeWidth={long ? 2 : 1} />;
        })}
        <g className="origin-center motion-safe:animate-[spin_60s_linear_infinite]" style={{ transformOrigin: "180px 180px" }} aria-hidden="true">
          <line x1="180" y1="26" x2="180" y2="60" stroke="var(--on-card)" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[10px] font-extrabold tracking-[0.06em] text-on-card-muted uppercase">Interest earned</p>
        <p className="mt-1 flex items-baseline gap-1 leading-none">
          <span className="text-xl font-bold text-on-card-muted">₹</span>
          <b className={`font-extrabold tabular-nums ${p.big.length >= 8 ? "text-[34px]" : "text-[44px]"}`}>{p.big}</b>
        </p>
        <p className="mt-1 text-[13px] font-extrabold">{p.unit}</p>
        <p className="text-[11px] font-semibold text-on-card-muted">{p.basis}</p>
      </div>
    </div>
  );
}

const M = { l: 52, r: 16, t: 14, b: 30 };

/** A box's size in pixels, kept up to date, so the chart can be drawn at the size it is shown and fill the card. */
function useBoxSize(fallback: { w: number; h: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Interest earned adding up since the first loan: the 12% pile as a line, each payout loan in steps, the picked period shaded, a red cross for each payout that isn't here. */
function Chart({ chart, band, all }: { chart: ChartView; band: [number, number]; all: boolean }) {
  const [ref, { w: W, h: H }] = useBoxSize({ w: 700, h: 320 });
  const x = (v: number) => M.l + v * (W - M.l - M.r);
  const y = (v: number) => M.t + (1 - v) * (H - M.t - M.b);
  const pts = (points: [number, number][]) => points.map(([px, py]) => `${x(px).toFixed(1)},${y(py).toFixed(1)}`).join(" ");
  const bandWidth = Math.max(8, x(band[1]) - x(band[0]));
  return (
    <div ref={ref} className="relative min-h-[260px] flex-1">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={chart.label} className="absolute inset-0 block">
        {chart.yTicks.map((t) => (
          <g key={t.label}>
            <line x1={M.l} x2={W - M.r} y1={y(t.at)} y2={y(t.at)} stroke="var(--on-card)" strokeOpacity={t.at === 0 ? 0.3 : 0.14} strokeDasharray={t.at === 0 ? undefined : "3 5"} />
            <text x={M.l - 8} y={y(t.at) + 4} textAnchor="end" fontSize="12" fontWeight="700" fill="var(--on-card-muted)">
              {t.label}
            </text>
          </g>
        ))}
        {chart.xTicks.map((t) => (
          <g key={t.label}>
            <line x1={x(t.at)} x2={x(t.at)} y1={M.t} y2={H - M.b} stroke="var(--on-card)" strokeOpacity="0.18" />
            <text x={t.at > 0.9 ? x(t.at) - 6 : x(t.at) + 6} y={H - 10} textAnchor={t.at > 0.9 ? "end" : "start"} fontSize="12" fontWeight="700" fill="var(--on-card-muted)">
              {t.label}
            </text>
          </g>
        ))}
        <rect x={x(band[0])} y={M.t} width={bandWidth} height={H - M.t - M.b} rx="4" fill="var(--on-card)" fillOpacity={all ? 0.05 : 0.14} />
        <line x1={x(chart.today)} x2={x(chart.today)} y1={M.t} y2={H - M.b} stroke="var(--on-card)" strokeOpacity="0.55" strokeWidth="1.5" />
        <text x={x(chart.today)} y={M.t - 2} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--on-card)">
          today
        </text>
        {chart.lines.map((l) => (
          <g key={l.key}>
            <polyline points={pts(l.points)} fill="none" stroke={pastel(l.colorKey)} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {l.projection && <polyline points={pts(l.projection)} fill="none" stroke={pastel(l.colorKey)} strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" opacity="0.7" />}
          </g>
        ))}
        {chart.marks.map((m) => (
          <g key={m.key}>
            <title>{m.label}</title>
            <circle cx={x(m.x)} cy={y(m.y)} r="8" fill="var(--negative)" stroke="var(--on-card)" strokeWidth="1.5" />
            <path d={`M${x(m.x) - 3} ${y(m.y) - 3} l6 6 M${x(m.x) + 3} ${y(m.y) - 3} l-6 6`} stroke="var(--on-card)" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        ))}
      </svg>
    </div>
  );
}
