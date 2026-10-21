"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { CycleRead } from "@/app/subscriptions/views";
import { cycleDays, cycleReadout, readCycleAt, readCycleDay, type CycleReading } from "./cycleGeometry";

// The readout snaps when the pointer is this close, in px, to today or the renewal.
const SNAP_PX = 10;
// Page Up and Page Down move a week.
const PAGE_DAYS = 7;

/**
 * The bar under the hero's name: how far through its cycle the pick is. A
 * subscription's bar can be read (#148, 2B): moving along it with a mouse, a pen, a
 * finger or the arrow keys shows the date at that point and how far it is from today,
 * snapping to today and to the renewal, which says what it will charge and where. It's
 * a slider, so screen readers announce each date. All's bar is the month's spend, not a
 * cycle, so it's only drawn.
 */
export function CycleBar({ pickId, fraction, cycle }: { pickId: string; fraction: number | null; cycle: CycleRead | null }) {
  const area = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  // A reading belongs to the cycle it was made on: turning the carousel, or a payment moving the cycle on, drops it.
  const key = cycle ? `${pickId}:${cycle.from}:${cycle.to}:${cycle.today}` : null;
  const [read, setRead] = useState<{ key: string; reading: CycleReading; touch: boolean } | null>(null);
  const days = cycle ? cycleDays(cycle) : null;
  const reading = read && read.key === key ? read.reading : null;
  // At rest the slider's value is today, or the start when today comes before it.
  const rest = days ? readCycleDay(days.today ?? 0, days) : null;

  function readAt(clientX: number, touch: boolean) {
    const box = track.current?.getBoundingClientRect();
    if (!key || !days || !box || box.width <= 0) return;
    setRead({ key, reading: readCycleAt((clientX - box.left) / box.width, days, SNAP_PX / box.width), touch });
  }
  function onPointer(e: PointerEvent) {
    // A mouse or pen reads it as it moves over it; a finger, while it's down.
    if (e.pointerType === "touch" && e.buttons === 0) return;
    readAt(e.clientX, e.pointerType === "touch");
  }
  function onKeyDown(e: KeyboardEvent) {
    if (!key || !days || !rest) return;
    const from = reading ?? rest;
    const STEPS: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: PAGE_DAYS, PageDown: -PAGE_DAYS };
    let day: number;
    if (e.key === "Home") day = 0;
    else if (e.key === "End") day = days.days;
    else if (e.key in STEPS) day = from.day + STEPS[e.key];
    else return;
    e.preventDefault();
    setRead({ key, reading: readCycleDay(day, days), touch: false });
  }

  // A finger's reading stays after it lifts, until a tap somewhere else.
  const touchShown = !!reading && !!read?.touch;
  useEffect(() => {
    if (!touchShown) return;
    const away = (e: Event) => {
      if (!area.current?.contains(e.target as Node)) setRead(null);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [touchShown]);

  // The readout centres on its point, but never past the bar's ends.
  useLayoutEffect(() => {
    const box = track.current;
    const label = pill.current;
    if (!box || !label || !reading) return;
    const half = label.offsetWidth / 2;
    label.style.left = `${Math.min(box.offsetWidth - half, Math.max(half, reading.at * box.offsetWidth))}px`;
  }, [reading]);

  const text = reading && cycle ? cycleReadout(reading, cycle) : null;
  const restText = rest && cycle ? cycleReadout(rest, cycle) : null;
  const shown = text ?? restText;
  // One tree for every pick, so the fill stays the same element and slides to the next pick's width.
  const slider =
    cycle && days && rest
      ? {
          tabIndex: 0,
          role: "slider",
          "aria-label": cycle.label,
          "aria-valuemin": 0,
          "aria-valuemax": days.days,
          "aria-valuenow": (reading ?? rest).day,
          "aria-valuetext": shown ? `${shown.date}, ${shown.note}` : undefined,
          onPointerMove: onPointer,
          onPointerDown: onPointer,
          onPointerLeave: (e: PointerEvent) => e.pointerType !== "touch" && setRead(null),
          // A finger that starts scrolling the page lets go of the bar.
          onPointerCancel: () => setRead(null),
          onFocus: () => key && setRead((r) => (r?.key === key ? r : { key, reading: rest, touch: false })),
          onBlur: () => setRead(null),
          onKeyDown,
        }
      : {};

  return (
    // The bar is 8px; the area that reads it is 28px tall (44px on a phone) and runs a little past its ends, without moving anything around it.
    <div
      ref={area}
      {...slider}
      className={`relative z-[1] -mx-2 -mt-1 -mb-2.5 rounded-lg px-2 py-2.5 max-md:-mt-[12px] max-md:-mb-[18px] max-md:py-[18px] ${cycle ? "cursor-ew-resize touch-pan-y focus-visible:outline-2 focus-visible:outline-[var(--pick-soft)]" : ""}`}
    >
      <div className="relative">
        <div ref={track} className="h-2 overflow-hidden rounded-full bg-fill">
          <span
            className="block h-full rounded-[inherit] bg-[var(--pick-soft)] transition-[width,background-color] duration-500 motion-reduce:transition-none"
            style={{ width: `${(fraction ?? 0) * 100}%` }}
          />
        </div>
        {reading && text && days && (
          <>
            {days.today !== null && (
              <span aria-hidden="true" className="pointer-events-none absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-[1px] bg-fg" style={{ left: `${(days.today / days.days) * 100}%` }} />
            )}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg shadow-[0_0_0_4px_oklch(1_0_0/0.25)] motion-safe:transition-[left] motion-safe:duration-100"
              style={{ left: `${reading.at * 100}%` }}
            />
            {/* Light, like the page's other readouts, with the date first. Never wider than the bar, so a long card name can't push it off the card. */}
            <span
              ref={pill}
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[calc(100%+9px)] max-w-full -translate-x-1/2 truncate rounded-[9px] bg-[oklch(0.995_0_0)] px-[9px] py-1 text-[11px] font-extrabold whitespace-nowrap text-[oklch(0.19_0.008_260)] tabular-nums shadow-[var(--pop-shadow)] [--pop-from:4px] motion-safe:animate-pop-in"
            >
              {text.date} · <span className="font-semibold text-[oklch(0.46_0.01_260)]">{text.note}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
