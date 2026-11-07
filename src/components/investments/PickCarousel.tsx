"use client";

import { useId, useRef } from "react";
import type { PickCard } from "@/app/investments/views";
import { WidgetCard } from "../shell/WidgetCard";

/**
 * "Pick what to look at" (docs/design/investments.md, L1 Giant): a row of dark cards, Everything first and then each holding, each with
 * its last three months, what he holds and today's move. Choosing one points the stage below at it. The row scrolls and snaps; the two
 * arrows scroll it by two cards.
 */

const UP = "oklch(0.82 0.17 150)";
const DOWN = "oklch(0.74 0.16 25)";
const SPARK_W = 216;
const SPARK_H = 120;

function sparkPath(values: number[]): { line: string; area: string } | null {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const point = (v: number, i: number) => `${((i / (values.length - 1)) * SPARK_W).toFixed(1)},${(SPARK_H - 3 - ((v - lo) / (hi - lo || 1)) * (SPARK_H - 6)).toFixed(1)}`;
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${point(v, i)}`).join(" ");
  return { line, area: `${line} L${SPARK_W},${SPARK_H} L0,${SPARK_H} Z` };
}

function Sparkline({ values }: { values: number[] }) {
  const id = useId();
  const path = sparkPath(values);
  if (!path) return <div className="flex h-[104px] items-center justify-center rounded-[14px] border border-dashed border-white/20 text-xs font-bold text-white/60">no price yet</div>;
  const colour = values.at(-1)! >= values[0] ? UP : DOWN;
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} preserveAspectRatio="none" className="h-[104px] w-full overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colour} stopOpacity="0.35" />
          <stop offset="1" stopColor={colour} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#${id})`} />
      <path d={path.line} fill="none" stroke={colour} strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Tile({ card }: { card: PickCard }) {
  if (card.colorKey === null) {
    return (
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-[11px]" style={{ background: "linear-gradient(155deg, oklch(0.4 0.03 255), oklch(0.22 0.015 260))" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 20V11M12 20V5M18 20v-6" /></svg>
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-[11px] text-[10px] font-extrabold" style={{ background: `linear-gradient(155deg, var(--card-${card.colorKey}-from), var(--card-${card.colorKey}-to))` }}>
      {card.title.slice(0, 4)}
    </span>
  );
}

export function PickCarousel({ cards, pick, onPick }: { cards: PickCard[]; pick: string; onPick: (key: string) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 480, behavior: "smooth" });
  const arrow = "flex size-[34px] items-center justify-center rounded-full border border-surface-line bg-surface text-fg hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2";
  return (
    <WidgetCard
      label="Pick what to look at"
      title="Pick what to look at"
      note="everything, or one holding · the stage below follows · scroll for more"
      className="overflow-hidden"
      right={
        <span className="flex gap-2">
          <button type="button" aria-label="Scroll back" onClick={() => scrollBy(-1)} className={arrow}>‹</button>
          <button type="button" aria-label="Scroll forward" onClick={() => scrollBy(1)} className={arrow}>›</button>
        </span>
      }
    >
      <div ref={scroller} role="group" aria-label="What to look at" className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1.5 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((c) => {
          const on = c.key === pick;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(c.key)}
              className="flex w-[232px] shrink-0 snap-start flex-col gap-2.5 rounded-[22px] border border-white/[0.06] p-3.5 text-left text-on-card transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                background: on ? "linear-gradient(160deg, oklch(0.34 0.035 255), oklch(0.2 0.018 260))" : "linear-gradient(160deg, oklch(0.22 0.015 255), oklch(0.15 0.01 260))",
                boxShadow: on ? "0 0 0 2.5px oklch(0.84 0.13 160)" : "inset 0 1px 0 oklch(1 0 0 / 0.08)",
              }}
            >
              <span className="flex items-center gap-2.5">
                <Tile card={c} />
                <span className="min-w-0">
                  <b className="block truncate text-[13.5px] font-extrabold">{c.title}</b>
                  <small className="block truncate text-[11px] font-semibold" style={{ color: "oklch(0.72 0.01 250)" }}>{c.subtitle}</small>
                </span>
              </span>
              <Sparkline values={c.spark} />
              <span className="text-[11px] font-semibold" style={{ color: "oklch(0.72 0.01 250)" }}>{c.detail}</span>
              <span>
                <span className="block text-[22px] font-extrabold tracking-tight tabular-nums">{c.price}</span>
                <span className="block text-[11.5px] font-extrabold" style={{ color: c.dayTone === "gain" ? UP : c.dayTone === "loss" ? DOWN : "oklch(0.72 0.01 250)" }}>{c.day}</span>
              </span>
            </button>
          );
        })}
      </div>
    </WidgetCard>
  );
}
