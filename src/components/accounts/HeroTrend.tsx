"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { CheckInsView, FactView, PickView } from "@/app/accounts/views";
import { flows, flowsOverStretch, type FlowItem } from "@/lib/aggregate/accountFlows";
import { trendStats } from "@/lib/aggregate/accountTrend";
import { formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { CheckInCalendar } from "./CheckInCalendar";
import { blur, nearestIndex, normalise, smoothPath } from "./trendChart";

/**
 * The hero's right section (docs/design/accounts.md, round 24: Trend on a pale tint of the
 * pick). Two views of the open account: its Trend, and when its balance was read (the
 * check-in calendar). The Trend is the line over the page's period (the pill in the header
 * decides it; there is no picker here), drawn smooth in the account's colour. Move along it
 * to read a week; drag across it to measure a stretch, and the facts above become that
 * stretch. The facts are the money that moved through the account: what came in, what was
 * spent (card bills, subscriptions, EMIs), what was invested, and everything that left the
 * bank. They are worked out from the records kept elsewhere, not read from the bank.
 */

const W = 600;
const H = 300;
const PAD = 22;

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatInr(Math.abs(n))}`;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const REDUCED = "(prefers-reduced-motion: reduce)";
const watchReduced = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** The values easing from where they were to where they now are, when the account or period changes and the line keeps its length. Reduced motion goes straight to the new line. */
function useMorph(target: number[]): number[] {
  const reduced = useSyncExternalStore(watchReduced, () => window.matchMedia(REDUCED).matches, () => false);
  const [s, setS] = useState({ target, values: target });
  if (s.target !== target) setS({ target, values: !reduced && s.values.length === target.length ? s.values : target });
  useEffect(() => {
    if (s.values === s.target) return;
    const start = s.values;
    const goal = s.target;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 760);
      const e = ease(k);
      setS({ target: goal, values: k >= 1 ? goal : goal.map((v, i) => start[i] + (v - start[i]) * e) });
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // Only a new target starts a morph; the frames it sets must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.target]);
  return s.values;
}

export function HeroTrend({ pick, checkIns, flowItems, periodLabel, today, onPick }: { pick: PickView; checkIns: CheckInsView; flowItems: FlowItem[]; periodLabel: string; today: string; onPick: (id: string) => void }) {
  const [mode, setMode] = useState<"trend" | "checkins">("trend");
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold tracking-wider text-muted uppercase">{mode === "trend" ? `Balance · ${periodLabel}` : "Balance · when it was read"}</div>
          <h2 className="mt-0.5 truncate text-xl font-extrabold">{pick.name}</h2>
        </div>
        <div role="group" aria-label="Show" className="flex shrink-0 rounded-full bg-fill p-[3px]">
          {(
            [
              ["trend", "Trend"],
              ["checkins", "Check-ins"],
            ] as const
          ).map(([key, label]) => (
            <button key={key} type="button" aria-pressed={mode === key} onClick={() => setMode(key)} className={`min-h-8 rounded-full px-3 text-xs font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-accent ${mode === key ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {mode === "trend" ? <Trend pick={pick} flowItems={flowItems} today={today} /> : <CheckInCalendar view={checkIns} pickId={pick.id} onPick={onPick} />}
    </div>
  );
}

function Facts({ facts }: { facts: FactView[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
      {facts.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="truncate text-[10px] font-extrabold tracking-wider text-muted uppercase">{f.label}</dt>
          <dd className={`mt-0.5 truncate text-lg leading-tight font-extrabold tabular-nums ${f.warn ? "text-[var(--card-copper)]" : ""}`}>{f.value}</dd>
          {f.note && <dd className="truncate text-[11px] font-semibold text-muted">{f.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

function Trend({ pick, flowItems, today }: { pick: PickView; flowItems: FlowItem[]; today: string }) {
  const points = pick.line.points;
  const n = points.length;
  const gradientId = useId();
  const chartRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [drag, setDrag] = useState<{ from: number; moved: boolean } | null>(null);

  const target = useMemo(() => normalise(points.map((p) => p.total)), [points]);
  const shown = useMorph(target);
  const curve = useMemo(() => smoothPath(blur(shown, n > 20 ? 2 : 1), W, H, PAD, PAD), [shown, n]);

  // A new account or period starts with nothing measured.
  const [key, setKey] = useState(points);
  if (key !== points) {
    setKey(points);
    setSel(null);
    setHover(null);
  }

  const accountId = pick.kind === "all" ? null : pick.id;
  // A stretch measured on another line (before this render cleared it) is ignored, so it can't index past this one's end.
  const range = sel && Math.max(...sel) < n ? sel : null;
  const stats = trendStats(points, range?.[0], range?.[1]);
  const money = useMemo(() => {
    if (!range || n < 2) return flows(flowItems, accountId);
    return flowsOverStretch(flowItems, accountId, { first: points[0].date, last: points[n - 1].date }, points[Math.min(...range)].date, points[Math.max(...range)].date);
  }, [flowItems, accountId, range, points, n]);

  const facts: FactView[] = [
    { label: "Came in", value: formatInr(money.cameIn), note: "Income received" },
    { label: "Spent", value: formatInr(money.expenses), note: "Bills, subscriptions, EMIs" },
    { label: "Invested", value: formatInr(money.invested), note: "Shares bought" },
    { label: "Left the bank", value: formatInr(money.leftBank), note: "Spent and invested" },
  ];

  if (n < 2) {
    return (
      <div className="flex min-h-56 flex-1 items-center justify-center rounded-[22px] bg-fill px-6 text-center text-sm font-semibold text-muted">
        {n === 1 ? "One balance so far. The line starts with the next." : "No balances in this period yet."}
      </div>
    );
  }

  const last = points[n - 1];
  const over = stats ? `${signed(stats.change)}${stats.changeFraction === null ? "" : ` (${stats.changeFraction >= 0 ? "+" : "−"}${Math.abs(Math.round(stats.changeFraction * 100))}%)`}` : "";
  const sub = stats ? (range ? `${over} from ${formatShortDate(stats.from)} to ${formatShortDate(stats.to)}. Click the chart to clear.` : `${over} over the period, ${formatShortDate(stats.from)} to ${last.date === today ? "today" : formatShortDate(last.date)}.`) : "";

  const indexAt = (e: PointerEvent) => {
    const r = chartRef.current!.getBoundingClientRect();
    return nearestIndex((e.clientX - r.left) / r.width, n);
  };
  const onDown = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ from: indexAt(e), moved: false });
  };
  const onMove = (e: PointerEvent) => {
    const i = indexAt(e);
    if (drag) {
      if (i !== drag.from) {
        setDrag({ from: drag.from, moved: true });
        setSel([Math.min(drag.from, i), Math.max(drag.from, i)]);
      }
      setHover(null);
      return;
    }
    setHover(i);
  };
  const onUp = () => {
    if (drag && !drag.moved) setSel(null);
    setDrag(null);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") return void setSel(null);
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : -1;
    const from = hover ?? n - 1;
    const next = Math.max(0, Math.min(n - 1, from + step));
    if (e.shiftKey) setSel([Math.min(sel?.[0] ?? from, next), Math.max(sel?.[1] ?? from, next)]);
    setHover(next);
  };

  const hp = hover !== null ? points[hover] : null;
  const f = (i: number) => (i / (n - 1)) * 100;
  const thin = Math.max(1, Math.ceil(pick.line.months.length / 8));
  const color = `var(--card-${pick.colorKey})`;
  return (
    <>
      <p className="-mt-2 min-h-5 text-xs font-semibold text-muted">{sub}</p>
      <Facts facts={facts} />
      <div className="flex min-h-56 flex-1 flex-col gap-2">
        <div
          ref={chartRef}
          role="img"
          tabIndex={0}
          aria-label={`${pick.name}'s balance from ${formatInr(points[0].total)} to ${formatInr(last.total)}. Use the arrow keys to read a week, shift and the arrows to measure a stretch.`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
          className="relative min-h-52 flex-1 cursor-crosshair touch-pan-y select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          style={{ "--c": color } as CSSProperties}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: "var(--c)" }} stopOpacity="0.34" />
                <stop offset="1" style={{ stopColor: "var(--c)" }} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${curve.d} L ${W} ${H} L 0 ${H} Z`} fill={`url(#${gradientId})`} />
            <path d={curve.d} fill="none" stroke="var(--fg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {range && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 bg-[color-mix(in_oklab,var(--surface)_62%,transparent)]" style={{ width: `${f(range[0])}%` }} />
              <div className="pointer-events-none absolute inset-y-0 right-0 bg-[color-mix(in_oklab,var(--surface)_62%,transparent)]" style={{ width: `${100 - f(range[1])}%` }} />
              <div className="pointer-events-none absolute inset-y-0 border-x-[1.5px] border-fg bg-[color-mix(in_oklab,var(--c)_9%,transparent)]" style={{ left: `${f(range[0])}%`, width: `${f(range[1]) - f(range[0])}%` }} />
            </>
          )}
          {/* Today's end of the line, with a ring that keeps breathing out. */}
          <i className="pointer-events-none absolute right-[-4px] size-2.5 -translate-y-1/2 rounded-full bg-fg ring-[3px] ring-surface" style={{ top: `${(curve.ys[n - 1] / H) * 100}%` }}>
            <span aria-hidden="true" className="absolute -inset-1.5 rounded-full border-[1.5px] border-[var(--c)] motion-safe:animate-ping" />
          </i>
          {hp && hover !== null && (
            <>
              <i className="pointer-events-none absolute inset-y-2 w-px bg-fg/35" style={{ left: `${f(hover)}%` }} />
              <i className="pointer-events-none absolute size-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg ring-[3px] ring-surface" style={{ left: `${f(hover)}%`, top: `${(curve.ys[hover] / H) * 100}%` }} />
              <span className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl bg-ink px-3 py-1.5 text-center text-[11px] leading-snug font-semibold whitespace-nowrap text-on-ink" style={{ left: `clamp(70px, ${f(hover)}%, calc(100% - 70px))` }}>
                <em className="block font-extrabold not-italic text-on-ink/65">{formatShortDate(hp.date)}</em>
                <b className="font-extrabold tabular-nums">{formatInr(hp.total)}</b>
              </span>
              <span className="sr-only" aria-live="polite">{`${formatShortDate(hp.date)}: ${formatInr(hp.total)}`}</span>
            </>
          )}
        </div>
        <div className="relative h-4 text-[11px] font-bold text-muted" aria-hidden="true">
          {pick.line.months.map((m, i) => {
            const at = points.findIndex((p) => p.date === m.date);
            return at < 0 || i % thin !== 0 ? null : (
              <span key={m.date} className="absolute" style={{ left: `${f(at)}%` }}>
                {m.label}
              </span>
            );
          })}
        </div>
      </div>
      <p className="text-[11px] font-semibold text-muted">Hover to read a week; drag across the chart to measure a stretch. Money figures are worked out from your card bills, subscriptions, EMIs, trades and income, not read from the bank.</p>
    </>
  );
}
