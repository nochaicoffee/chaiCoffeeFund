"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { formatShortDate } from "@/lib/format/date";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { RollingNumber } from "../motion/RollingNumber";
import { RingTexture } from "../RingTexture";
import { addDays, dueBarLayout, dueTimeline, nextSlots, type Slot } from "./detailsGeometry";

export interface NextDueBill {
  /** The statement's id. */
  id: string;
  /** The card's short name. */
  name: string;
  /** The card's swatch, a CSS colour. */
  swatch: string;
  remaining: number;
  dueDate: string;
  /** Negative when overdue. */
  daysUntilDue: number;
}

// The bar's width in the design, less its gaps: each bill's rings are drawn at its share of it, and its label judged by it until the bar's own width is known.
const DESIGN_WIDTH = 547;
const GAP = 3;
const BAR_HEIGHT = 26;
const TIMELINE_HEIGHT = 54;
// The timeline's line, from the top of the box.
const AXIS_Y = 32;
const PAID_MS = 550;
const FOLD_MS = 500;
// How wide a bill's part of the bar must be for its amount to show, for "amount · date", and for its card's name too.
const LABEL_MIN = 54;
const SHORT_MIN = 110;
const NAME_MIN = 230;

const signature = (bills: NextDueBill[]) => bills.map((b) => `${b.id}:${b.remaining}`).join("|");
const dueWords = (bill: NextDueBill) => (bill.daysUntilDue < 0 ? `overdue since ${formatShortDate(bill.dueDate)}` : formatShortDate(bill.dueDate));
const dueIn = (bill: NextDueBill) => (bill.daysUntilDue < 0 ? "overdue" : bill.daysUntilDue === 0 ? "due today" : `in ${bill.daysUntilDue}d`);

/**
 * The details card's Next due: what's left to pay, as a bar split by bill (or
 * a timeline), and the bills by name.
 * - Bill focus (#117, E): hovering a bill or its name, or clicking a name to
 *   pin it (a tap on a phone), widens it to show its amount and due date while
 *   the others step back.
 * - By due date (F): the switch turns the bar into a timeline from today, each
 *   bill a dot at its due date sized by its amount. The same elements morph.
 * - Paid bills fold away (G): a bill marked paid, from the Statements panel or
 *   Mark paid, turns green and folds away while the others close up, and the
 *   totals roll down. A new bill, or one put back with Undo, grows in.
 */
export function NextDue({ bills, card }: { bills: NextDueBill[]; card: string }) {
  const [slots, setSlots] = useState<Slot<NextDueBill>[]>(() => bills.map((bill) => ({ bill, phase: "shown" })));
  const [seen, setSeen] = useState({ signature: signature(bills), card });
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [view, setView] = useState<"amount" | "date">("amount");
  const [width, setWidth] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  // Adjusting state while rendering, as React suggests for "state from a changed prop".
  const now = signature(bills);
  if (now !== seen.signature || card !== seen.card) {
    setSeen({ signature: now, card });
    setSlots(nextSlots(slots, bills, card === seen.card));
    if (card !== seen.card) {
      setHovered(null);
      setPinned(null);
    }
  }

  // A bill that's just arrived grows in from the next frame on.
  useEffect(() => {
    if (!slots.some((s) => s.phase === "entering")) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setSlots((all) => all.map((s) => (s.phase === "entering" ? { ...s, phase: "shown" } : s))));
    });
    return () => cancelAnimationFrame(frame);
  }, [slots]);

  // A paid bill stays green for a moment, then folds away; one that's folded is dropped.
  useEffect(() => {
    const quick = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    if (slots.some((s) => s.phase === "paid")) {
      timers.push(window.setTimeout(() => setSlots((all) => all.map((s) => (s.phase === "paid" ? { ...s, phase: "leaving" } : s))), quick ? 0 : PAID_MS));
    }
    if (slots.some((s) => s.phase === "leaving")) {
      timers.push(window.setTimeout(() => setSlots((all) => all.filter((s) => s.phase !== "leaving")), quick ? 0 : FOLD_MS));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [slots]);

  const hasBar = slots.length > 0;
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasBar]);

  const live = slots.filter((s) => s.phase === "shown" || s.phase === "paid");
  const focusId = hovered ?? pinned;
  const focusAt = live.findIndex((s) => s.bill.id === focusId);
  const focused = focusAt >= 0 ? focusAt : null;
  const bar = dueBarLayout(
    live.map((s) => s.bill.remaining),
    focused,
  );
  const gaps = Math.max(0, live.length - 1) * GAP;
  const room = width > 0 ? width - gaps : DESIGN_WIDTH;
  const timeline = dueTimeline(
    live.map((s) => ({ amount: s.bill.remaining, days: s.bill.daysUntilDue })),
    width,
    focused,
  );
  const dates = view === "date";
  const today = live[0] ? addDays(live[0].bill.dueDate, -live[0].bill.daysUntilDue) : null;
  const total = bills.reduce((sum, b) => sum + b.remaining, 0);

  const billAt = (e: PointerEvent) => (e.target as HTMLElement).closest<HTMLElement>("[data-bill]")?.dataset.bill ?? null;

  let liveBefore = 0;
  const drawn = slots.map((slot) => {
    const isLive = slot.phase === "shown" || slot.phase === "paid";
    const i = liveBefore;
    if (isLive) liveBefore++;
    let geometry: CSSProperties;
    let label = "";
    if (dates) {
      const dot = isLive ? timeline.dots[i] : null;
      const size = dot?.size ?? 0;
      const center = dot?.center ?? Math.min(width, (Math.max(0, slot.bill.daysUntilDue) / timeline.span) * width);
      geometry = { left: Math.min(Math.max(center - size / 2, 0), Math.max(0, width - size)), top: AXIS_Y - size / 2, width: size, height: size, borderRadius: 999 };
    } else {
      // A bill that isn't in the bar sits, at no width, where the next one starts.
      const slotAt = isLive ? bar[i] : { left: bar[i]?.left ?? 1, width: 0 };
      const gapsBefore = Math.min(i, Math.max(0, live.length - 1)) * GAP;
      const first = isLive && i === 0;
      const last = isLive && i === live.length - 1;
      geometry = {
        left: `calc((100% - ${gaps}px) * ${slotAt.left} + ${gapsBefore}px)`,
        width: `calc((100% - ${gaps}px) * ${slotAt.width})`,
        top: 0,
        height: BAR_HEIGHT,
        borderRadius: `${first ? 9 : 0}px ${last ? 9 : 0}px ${last ? 9 : 0}px ${first ? 9 : 0}px`,
      };
      const px = slotAt.width * room;
      const { name, remaining } = slot.bill;
      if (slot.phase === "paid") label = px >= LABEL_MIN ? "✓ Paid" : "";
      else if (isLive && i === focused) label = px >= NAME_MIN ? `${name} · ${formatInr(remaining)} · ${dueWords(slot.bill)}` : px >= SHORT_MIN ? `${formatInrCompact(remaining)} · ${formatShortDate(slot.bill.dueDate)}` : px >= LABEL_MIN ? formatInrCompact(remaining) : "";
      else if (isLive) label = px >= LABEL_MIN ? formatInrCompact(remaining) : "";
    }
    const dim = focused !== null && isLive && i !== focused;
    return (
      <span
        key={slot.bill.id}
        data-bill={slot.bill.id}
        className={`absolute isolate flex items-center overflow-hidden text-[11px] font-extrabold whitespace-nowrap text-on-accent ease-out motion-safe:transition-[left,width,top,height,border-radius,opacity,background-color] motion-safe:duration-450 ${dates ? "justify-center" : "pl-[9px]"} ${!isLive ? "opacity-0" : dim ? "opacity-45" : ""} ${dates && slot.bill.daysUntilDue < 0 ? "outline-2 outline-offset-2 outline-negative" : ""}`}
        style={{ ...geometry, background: slot.phase === "paid" ? "var(--accent)" : slot.bill.swatch }}
      >
        <span className={`absolute inset-0 -z-10 transition-opacity duration-300 ${dates ? "opacity-0" : ""}`}>
          <RingTexture
            width={Math.max(1, (isLive ? bar[i].width : 0) * DESIGN_WIDTH)}
            height={BAR_HEIGHT}
            dx={10}
            dy={30}
            first={8}
            step={8}
            stroke="var(--rings-light)"
            opacity={0.17}
            sheen="radial-gradient(circle at 90% 0%, var(--due-glow), transparent 60%)"
          />
        </span>
        {label}
      </span>
    );
  });

  return (
    <div className="mt-auto flex flex-col justify-center gap-2 rounded-[14px] bg-fill px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-[11px] text-muted">Next due · {bills.length === 0 ? "nothing pending" : `${bills.length} pending`}</span>
        {hasBar && (
          <span role="group" aria-label="Show bills by" className="inline-flex gap-0.5 rounded-[9px] bg-fill p-0.5">
            {(["amount", "date"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className="rounded-[7px] px-2 py-0.5 text-[10.5px] font-bold text-muted transition-colors hover:text-fg aria-pressed:bg-surface aria-pressed:text-fg aria-pressed:shadow-soft"
              >
                {v === "amount" ? "Amount" : "Due date"}
              </button>
            ))}
          </span>
        )}
        <span className="ml-auto text-[15px] font-extrabold tabular-nums">
          <RollingNumber value={total} format="inr" />
        </span>
      </div>
      {hasBar && (
        <>
          <div
            ref={box}
            role="img"
            aria-label={`Due: ${bills.map((b) => `${b.name} ${formatInr(b.remaining)}, ${dueWords(b)}`).join("; ")}`}
            className="relative ease-out motion-safe:transition-[height] motion-safe:duration-450"
            style={{ height: dates ? TIMELINE_HEIGHT : BAR_HEIGHT }}
            onPointerOver={(e) => {
              const id = billAt(e);
              if (e.pointerType !== "touch" && id) setHovered(id);
            }}
            onPointerLeave={(e) => e.pointerType !== "touch" && setHovered(null)}
            onPointerDown={(e) => {
              const id = billAt(e);
              if (e.pointerType === "touch") setPinned(id && pinned !== id ? id : null);
            }}
          >
            <span aria-hidden="true" className={`absolute inset-x-0 h-1 rounded-full bg-fill-strong transition-opacity duration-300 ${dates ? "" : "opacity-0"}`} style={{ top: AXIS_Y - 2 }} />
            <span aria-hidden="true" className={`absolute left-0 text-[9.5px] font-bold text-muted transition-opacity duration-300 ${dates ? "" : "opacity-0"}`} style={{ top: AXIS_Y + 8 }}>
              Today
            </span>
            <span aria-hidden="true" className={`absolute right-0 text-[9.5px] font-bold text-muted transition-opacity duration-300 ${dates ? "" : "opacity-0"}`} style={{ top: AXIS_Y + 8 }}>
              {today ? formatShortDate(addDays(today, timeline.span)) : ""}
            </span>
            {drawn}
            {dates &&
              live.map((slot, i) => {
                const dot = timeline.dots[i];
                if (!dot.label) return null;
                const long = i === focused;
                return (
                  <span
                    key={slot.bill.id}
                    aria-hidden="true"
                    className={`pointer-events-none absolute -translate-x-1/2 text-[10px] font-extrabold whitespace-nowrap ease-out motion-safe:transition-[left,top,opacity] motion-safe:duration-450 ${focused !== null && !long ? "opacity-45" : ""}`}
                    style={{ left: Math.min(Math.max(dot.center, long ? 70 : 24), Math.max(0, width - (long ? 70 : 24))), top: AXIS_Y - dot.size / 2 - 16 }}
                  >
                    {long ? `${slot.bill.name} · ${formatInrCompact(slot.bill.remaining)} · ${dueIn(slot.bill)}` : formatInrCompact(slot.bill.remaining)}
                  </span>
                );
              })}
          </div>
          <div className="-mx-1.5 flex flex-wrap items-center gap-y-1" onPointerLeave={(e) => e.pointerType !== "touch" && setHovered(null)}>
            {slots.map((slot) => {
              const isLive = slot.phase === "shown" || slot.phase === "paid";
              return (
                <button
                  key={slot.bill.id}
                  type="button"
                  tabIndex={isLive ? 0 : -1}
                  aria-pressed={pinned === slot.bill.id}
                  aria-label={`${slot.bill.name} ${formatInr(slot.bill.remaining)}, ${dueWords(slot.bill)}. ${pinned === slot.bill.id ? "Shown in the bar; press again to let go." : "Press to show it in the bar."}`}
                  onClick={() => setPinned(pinned === slot.bill.id ? null : slot.bill.id)}
                  onFocus={() => setHovered(slot.bill.id)}
                  onBlur={() => setHovered(null)}
                  onPointerEnter={(e) => e.pointerType !== "touch" && setHovered(slot.bill.id)}
                  className={`inline-flex items-center gap-1.5 overflow-hidden rounded-[7px] py-0.5 text-[11px] font-bold whitespace-nowrap ease-out outline-offset-1 transition-[background-color,opacity,max-width,padding,margin] duration-300 hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent aria-pressed:bg-fill-strong ${focusId === slot.bill.id ? "bg-fill-strong" : ""} ${isLive ? "mr-0.5 max-w-[22rem] px-1.5" : "mr-0 max-w-0 px-0 opacity-0"}`}
                >
                  <span className="size-2 shrink-0 rounded-[3px]" style={{ background: slot.phase === "paid" ? "var(--accent)" : slot.bill.swatch }} aria-hidden="true" />
                  {slot.bill.name} {formatInrCompact(slot.bill.remaining)}
                  <span className="font-semibold text-muted">· {slot.phase === "paid" ? "paid" : dueWords(slot.bill)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
