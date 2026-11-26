"use client";

import { useState } from "react";
import type { MonthView, NetWorthView, TypeChip } from "@/app/overview/views";
import { RollingNumber } from "@/components/motion/RollingNumber";
import { colorGradient } from "@/lib/format/colors";
import { formatInrCompact } from "@/lib/format/money";
import { RingTexture, RIPPLE_BASE, whiteSheen } from "../RingTexture";

/** The rings ripple outward while a chip or an arc is pointed at, as on the Cards heatmap (#104). */
const RIPPLE = `${RIPPLE_BASE} group-data-linked/nw:scale-[1.15]`;
const SHEEN = whiteSheen("88% 0%");

const W = 640;
const H = 190;
const PAD = 26;

/** A smooth path through the points (Catmull-Rom turned into curves). */
function smooth(points: [number, number][]): string {
  if (points.length < 2) return "";
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const t = 0.18;
    d += `C${(p1[0] + (p2[0] - p0[0]) * t).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) * t).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) * t).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) * t).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * The Overview's net worth block (docs/design/overview.md, OvT1): the number, how it moved, a trend line you can click (the number rolls to the
 * month), what it is made of, and a ring of what you own against what you owe. The line goes back as far as the records do; one month alone has
 * no line, only the number. Point at a chip and its arc in the ring lifts, the rest step back and the middle says what it is and its share (and
 * the other way round: point at an arc and its chip lights); click either to keep it. Faint rings sit behind the block and ripple while one is
 * pointed at.
 */
export function NetWorthBlock({ view }: { view: NetWorthView }) {
  const [pick, setPick] = useState(view.months.length - 1);
  // The chip or arc pointed at, and the one kept by a click (the way to it on a touch screen). A kept one that this month doesn't have is no one.
  const [over, setOver] = useState<string | null>(null);
  const [kept, setKept] = useState<string | null>(null);
  const month = view.months[pick];
  const hot = month.chips.find((c) => c.key === (over ?? kept)) ?? null;
  const n = view.months.length;
  // A long period has a point for every month: label about a dozen of them (always the last), so they never overprint.
  const labelStep = Math.max(1, Math.ceil(n / 13));
  const nets = view.months.map((m) => m.net);
  const lo = Math.min(...nets);
  const hi = Math.max(...nets);
  const x = (i: number) => PAD + (n === 1 ? (W - 2 * PAD) / 2 : (i * (W - 2 * PAD)) / (n - 1));
  const y = (v: number) => H - 34 - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (H - 66);
  const points = view.months.map((m, i): [number, number] => [x(i), y(m.net)]);
  const line = smooth(points);

  return (
    <section aria-label="Net worth" data-linked={hot ? "" : undefined} className="group/nw relative isolate flex flex-col gap-6 overflow-clip rounded-[26px] p-5 text-on-card md:flex-row md:items-stretch md:justify-between md:gap-10 md:p-9" style={{ background: colorGradient("indigo", 140) }}>
      <RingTexture width={1300} height={680} dx={40} dy={40} first={60} step={30} stroke="var(--rings-light)" opacity={0.08} sheen={SHEEN} ringsClassName={RIPPLE} />
      <div className="flex min-w-0 flex-1 flex-col gap-3.5">
        <div className="text-xs font-extrabold tracking-[0.06em] uppercase opacity-80">Net worth {month.today ? "today" : `at the end of ${month.full}`}</div>
        <div className="flex flex-wrap gap-2.5" aria-live="polite">
          {month.vsPrev && <Move move={month.vsPrev} label={`vs ${month.vsPrev.from}`} />}
          {month.sinceFirst && <Move move={month.sinceFirst} label={`since ${month.sinceFirst.from}`} />}
        </div>
        <div className="text-[clamp(34px,7.4vw,84px)] leading-none font-extrabold tracking-tight whitespace-nowrap tabular-nums">
          <RollingNumber value={month.net} format="inr" />
        </div>
        {n > 1 && (
          <div className="relative mt-1" role="group" aria-label="Net worth by month">
            <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-hidden="true">
              <defs>
                <linearGradient id="nw-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${line}L${x(n - 1)},${H - 34}L${x(0)},${H - 34}Z`} fill="url(#nw-fill)" />
              <path d={line} fill="none" stroke="var(--on-card-mark)" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {view.months.map((m, i) => (
              <button
                key={m.key}
                type="button"
                aria-label={`${m.full}: ${formatInrCompact(m.net)}`}
                aria-pressed={i === pick}
                onClick={() => setPick(i)}
                className="group absolute top-0 bottom-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-on-card"
                style={{ left: `${((x(i) - (W - 2 * PAD) / (2 * Math.max(1, n - 1))) / W) * 100}%`, width: `${((W - 2 * PAD) / Math.max(1, n - 1) / W) * 100}%` }}
              >
                <span aria-hidden="true" className={`absolute top-0 bottom-6 left-1/2 w-px -translate-x-1/2 bg-on-card-mark/35 transition-opacity ${i === pick ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
                <i className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-all duration-200 ${i === pick ? "size-[18px] shadow-[0_0_0_5px_rgba(255,255,255,0.3)]" : "size-[9px] group-hover:size-[13px]"}`} style={{ top: `${(y(m.net) / H) * 100}%` }} />
                <span className={`absolute left-1/2 -translate-x-1/2 -translate-y-full rounded-[9px] bg-white px-2 py-1 text-[11.5px] font-extrabold whitespace-nowrap text-ink transition-opacity ${i === pick ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} style={{ top: `calc(${(y(m.net) / H) * 100}% - 14px)` }}>
                  {formatInrCompact(m.net)}
                </span>
                <span className={`absolute inset-x-0 bottom-1 text-center text-[10.5px] font-bold opacity-75 ${(n - 1 - i) % labelStep !== 0 ? "hidden" : labelStep === 1 && (n - 1 - i) % 2 === 1 ? "max-sm:hidden" : ""}`}>{m.label}</span>
              </button>
            ))}
          </div>
        )}
        <ul className="flex flex-wrap gap-2" aria-label="What it is made of" onPointerLeave={() => setOver(null)}>
          {month.chips.map((c) => {
            const on = hot?.key === c.key;
            return (
              <li key={c.key}>
                <button
                  type="button"
                  aria-pressed={kept === c.key}
                  aria-label={`${c.name} ${c.amountText}, ${Math.round(c.share * 100)}% of what you ${c.owe ? "owe" : "own"}`}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setOver(c.key)}
                  onFocus={(e) => e.currentTarget.matches(":focus-visible") && setOver(c.key)}
                  onBlur={() => setOver(null)}
                  onClick={() => setKept((k) => (k === c.key ? null : c.key))}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-bold motion-safe:transition-[transform,opacity,box-shadow] motion-safe:duration-200 focus-visible:outline-2 focus-visible:outline-on-card ${hot && !on ? "opacity-55" : ""} ${on ? "-translate-y-0.5" : ""}`}
                  style={{ background: `color-mix(in oklch, var(--card-${c.colorKey}) ${on ? 52 : 32}%, transparent)`, boxShadow: `inset 0 0 0 ${on ? 2 : 1}px color-mix(in oklch, var(--card-${c.colorKey}) ${on ? 90 : 60}%, white)` }}
                >
                  <i aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: `var(--card-${c.colorKey})` }} />
                  {c.name}
                  <b className="font-extrabold">{c.amountText}</b>
                </button>
              </li>
            );
          })}
        </ul>
        {view.note && <p className="text-xs font-semibold opacity-80">{view.note}</p>}
      </div>
      <Ring month={month} hot={hot} onOver={setOver} onKeep={(key) => setKept((k) => (k === key ? null : key))} />
    </section>
  );
}

function Move({ move, label }: { move: { amount: number; text: string }; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-on-card-fill px-3 py-1.5 text-[13px] font-extrabold">
      <span className={move.amount >= 0 ? "text-[var(--on-card-up,oklch(0.9_0.15_150))]" : "text-[var(--on-card-down,oklch(0.86_0.12_25))]"}>{move.amount >= 0 ? "▲" : "▼"} {move.text}</span>
      <small className="text-xs font-bold opacity-75">{label}</small>
    </span>
  );
}

const clip = (name: string) => (name.length > 15 ? `${name.slice(0, 14)}…` : name);

/** What you own outside, what you owe inside, and the share you keep in the middle; the middle says what an arc is while one is lit. */
function Ring({ month, hot, onOver, onKeep }: { month: MonthView; hot: TypeChip | null; onOver: (key: string | null) => void; onKeep: (key: string) => void }) {
  const own = month.chips.filter((c) => !c.owe);
  const owe = month.chips.filter((c) => c.owe);
  const keep = month.owned > 0 ? Math.round((month.net / month.owned) * 100) : 0;
  const ring = (items: TypeChip[], r: number) => {
    let at = 0;
    return items.map((c) => {
      const len = c.share * 100;
      const on = hot?.key === c.key;
      const el = (
        <circle
          key={c.key}
          cx={110}
          cy={110}
          r={r}
          fill="none"
          stroke={`var(--card-${c.colorKey})`}
          strokeWidth={on ? 26 : 20}
          strokeOpacity={hot && !on ? 0.35 : 1}
          pathLength={100}
          strokeDasharray={`${Math.max(0, len - 1.2)} ${100 - Math.max(0, len - 1.2)}`}
          strokeDashoffset={-at}
          transform="rotate(-90 110 110)"
          pointerEvents="stroke"
          className="cursor-pointer motion-safe:transition-[stroke-width,stroke-opacity] motion-safe:duration-200"
          onPointerEnter={(e) => e.pointerType === "mouse" && onOver(c.key)}
          onPointerLeave={() => onOver(null)}
          onClick={() => onKeep(c.key)}
        />
      );
      at += len;
      return el;
    });
  };
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-2.5 self-center">
      <svg viewBox="0 0 220 220" className="size-[190px] md:size-[240px]" role="img" aria-label={`You keep ${keep}% of what you own`}>
        <circle cx={110} cy={110} r={92} fill="none" stroke="var(--on-card-track, rgba(255,255,255,0.12))" strokeWidth={20} />
        <circle cx={110} cy={110} r={64} fill="none" stroke="var(--on-card-track, rgba(255,255,255,0.12))" strokeWidth={20} />
        {month.owned > 0 && ring(own, 92)}
        {month.owed > 0 && ring(owe, 64)}
        {hot ? (
          <g key={hot.key} className="motion-safe:animate-tip-in" pointerEvents="none">
            <text x={110} y={104} textAnchor="middle" fill="var(--on-card-mark)" fontSize={32} fontWeight={800}>{Math.round(hot.share * 100)}%</text>
            <text x={110} y={123} textAnchor="middle" fill="var(--on-card-mark)" fontSize={12.5} fontWeight={700}>{clip(hot.name)}</text>
            <text x={110} y={140} textAnchor="middle" fill="var(--on-card-mark)" fillOpacity={0.75} fontSize={12} fontWeight={600}>{hot.amountText}</text>
          </g>
        ) : (
          <g pointerEvents="none">
            <text x={110} y={106} textAnchor="middle" fill="var(--on-card-mark)" fontSize={34} fontWeight={800}>{keep}%</text>
            <text x={110} y={128} textAnchor="middle" fill="var(--on-card-mark)" fillOpacity={0.75} fontSize={13} fontWeight={600}>you keep</text>
          </g>
        )}
      </svg>
      <div className="flex gap-4 text-xs font-bold opacity-90" aria-live="polite">
        {hot ? <span>{hot.owe ? `of the ${formatInrCompact(month.owed)} you owe` : `of the ${formatInrCompact(month.owned)} you own`}</span> : (<><span>owned {formatInrCompact(month.owned)}</span><span>owed {formatInrCompact(month.owed)}</span></>)}
      </div>
    </div>
  );
}
