"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { formatPercent } from "@/lib/format/labels";
import { formatInr } from "@/lib/format/money";
import { RollingNumber } from "../motion/RollingNumber";
import { useDetailsFigure } from "./DetailsFigures";
import { readLimitAt, type LimitReading } from "./detailsGeometry";

// The readout snaps when the pointer is this close, in px, to the fill's end or the average's pill.
const SNAP_PX = 10;
// Each arrow key moves the readout this share of the bar.
const KEY_STEP = 0.02;

function readout(reading: LimitReading): string {
  if (reading.kind === "used") return `${formatInr(reading.amount)} used · ${formatPercent(reading.share)}`;
  if (reading.kind === "average") return `Monthly average · ${formatInr(reading.amount)}`;
  return `${formatInr(reading.amount)} · ${formatPercent(reading.share)} of the limit`;
}

/**
 * The details card's limit bar: what's used of the limit, the period's average
 * on it, and the limit. Moving along it with a mouse, a finger or the arrow
 * keys (#117, A) shows the amount at that point, snapping to what's used and
 * to the average. Pointing at Available (D) lights up the part that's free.
 */
export function LimitBar({
  limit,
  used,
  available,
  average,
  averageAt,
  allCards,
}: {
  limit: number;
  /** What's used of the limit: active cards' outstanding for All Cards. */
  used: number;
  available: number;
  average: number;
  /** Where the average's pill sits (0–1), or null when it doesn't show. */
  averageAt: number | null;
  /** All Cards' fill is lime; a card's is white. */
  allCards: boolean;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const [reading, setReading] = useState<LimitReading | null>(null);
  const { figure } = useDetailsFigure();
  const usedShare = limit > 0 ? Math.min(1, used / limit) : 0;
  const values = { limit, used, average, averageAt };

  function readAt(fraction: number, snapPx = SNAP_PX) {
    const width = bar.current?.offsetWidth ?? 0;
    setReading(readLimitAt(fraction, values, width > 0 ? snapPx / width : 0));
  }
  function readAtPointer(clientX: number) {
    const box = bar.current?.getBoundingClientRect();
    if (box && box.width > 0) readAt((clientX - box.left) / box.width);
  }
  function onKeyDown(e: KeyboardEvent) {
    const step = e.key === "ArrowLeft" ? -KEY_STEP : e.key === "ArrowRight" ? KEY_STEP : 0;
    if (step === 0 && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const to = e.key === "Home" ? 0 : e.key === "End" ? 1 : (reading?.at ?? usedShare) + step;
    // A snap narrower than a key step, so the keys can always move off a snap.
    readAt(to, Math.min(SNAP_PX, ((bar.current?.offsetWidth ?? 0) * KEY_STEP) / 2));
  }
  // The readout's pill centres on its point, but never past the bar's ends.
  useLayoutEffect(() => {
    const box = bar.current;
    const label = pill.current;
    if (!box || !label || !reading) return;
    const half = label.offsetWidth / 2;
    label.style.left = `${Math.min(box.offsetWidth - half, Math.max(half, reading.at * box.offsetWidth))}px`;
  }, [reading]);

  const text = reading ? readout(reading) : "";
  return (
    <div>
      <div
        ref={bar}
        tabIndex={0}
        role="group"
        aria-label={`Limit bar: ${formatInr(used)} of ${formatInr(limit)} used. Use the arrow keys to read other points on it.`}
        className="relative h-[50px] cursor-ew-resize touch-pan-y rounded-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-on-card"
        onPointerMove={(e) => readAtPointer(e.clientX)}
        onPointerDown={(e) => readAtPointer(e.clientX)}
        onPointerLeave={() => setReading(null)}
        onFocus={() => readAt(usedShare)}
        onBlur={() => setReading(null)}
        onKeyDown={onKeyDown}
      >
        {averageAt !== null && (
          <div
            className={`absolute top-0 flex -translate-x-1/2 flex-col items-center ease-out motion-safe:transition-[left,opacity] motion-safe:duration-700 ${reading ? "opacity-0" : ""}`}
            style={{ left: `${averageAt * 100}%` }}
          >
            <span className="rounded-full bg-on-card-fill px-[9px] py-[3px] text-[10px] font-bold whitespace-nowrap tabular-nums">
              Avg · <RollingNumber value={average} format="inr" />
            </span>
            <span className="mt-0.5 h-3 w-px bg-on-card opacity-50" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-x-0 top-9 h-3.5 overflow-hidden rounded-full bg-on-card-fill" aria-hidden="true">
          <div
            className={`h-full rounded-full ${allCards ? "bg-on-card-lime" : "bg-on-card"} ease-out motion-safe:transition-[width,filter] motion-safe:duration-700 ${reading ? "brightness-110" : ""}`}
            style={{ width: `${usedShare * 100}%` }}
          />
        </div>
        {/* D: what's free of the limit, lit while Available is pointed at. */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-9 right-0 grid h-3.5 place-items-center overflow-hidden rounded-full bg-[var(--limit-free)] text-[9.5px] font-extrabold whitespace-nowrap [box-shadow:inset_0_0_0_1.5px_var(--limit-free-edge),0_0_14px_var(--limit-free-glow)] ease-out motion-safe:transition-[opacity,left] motion-safe:duration-300 ${figure === "available" ? "opacity-100" : "opacity-0"}`}
          style={{ left: `${usedShare * 100}%` }}
        >
          {formatInr(available)} available
        </span>
        {reading && (
          <>
            <span aria-hidden="true" className="pointer-events-none absolute top-[22px] h-8 w-[1.5px] -translate-x-1/2 rounded-full bg-on-card" style={{ left: `${reading.at * 100}%` }} />
            <span
              ref={pill}
              aria-hidden="true"
              className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-full bg-surface px-[9px] py-[3px] text-[10.5px] font-extrabold whitespace-nowrap text-fg tabular-nums shadow-[var(--readout-shadow)]"
            >
              {text}
            </span>
          </>
        )}
        <span className="sr-only" aria-live="polite">
          {text}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-on-card-muted tabular-nums">
        <span>₹0</span>
        <span>
          <RollingNumber value={limit} format="inr" /> limit
        </span>
      </div>
    </div>
  );
}
