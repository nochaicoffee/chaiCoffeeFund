"use client";

import { useEffect, useRef, useState } from "react";
import type { WeightBubble, WeightView } from "@/app/investments/understandViews";
import { WidgetCard } from "../shell/WidgetCard";

const ML = 48;
const MR = 20;
const MT = 20;
const MB = 40;
const TONE = { gain: "text-positive", loss: "text-negative", plain: "text-muted" } as const;

/** The plot's size in pixels: it fills whatever room the card leaves it, so the card ends level with its neighbour. */
interface Box {
  w: number;
  h: number;
}
const FIRST: Box = { w: 640, h: 380 };

const place = ({ w, h }: Box) => ({
  px: (x: number) => ML + x * (w - ML - MR),
  py: (y: number) => MT + (h - MT - MB) * (1 - y),
  radius: (size: number) => (8 + size * 30) * Math.min(1, w / 560),
});

/**
 * Weight against return (docs/design/investments.md, Understand it): a bubble per holding, its share of what he holds up the side against its
 * return on cost across the bottom, bigger meaning worth more. Hovering or focusing one says what it is. A map, never a suggestion.
 */
export function WeightCard({ view }: { view: WeightView }) {
  const [active, setActive] = useState<string | null>(null);
  const [box, setBox] = useState<Box>(FIRST);
  const wrap = useRef<HTMLDivElement>(null);
  const on = view.bubbles.find((b) => b.key === active);
  const { px, py } = place(box);
  const { w: W, h: H } = box;
  const PW = W - ML - MR;
  const PH = H - MT - MB;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => setBox((b) => (b.w === el.clientWidth && b.h === el.clientHeight ? b : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  return (
    <WidgetCard label="Weight against return" title="Weight against return" note="each bubble is a holding: the bigger, the more it's worth">
      <div ref={wrap} className="relative min-h-[320px] flex-1">
        <svg width={W} height={H} className="absolute inset-0 overflow-visible" role="group" aria-label="Each holding as a bubble, its share of what you hold against its return on cost">
          {view.yTicks.map((t) => (
            <g key={`y${t.at}`}>
              <line x1={ML} x2={ML + PW} y1={py(t.at)} y2={py(t.at)} stroke="var(--divider)" />
              <text x={ML - 8} y={py(t.at) + 4} textAnchor="end" className="fill-muted text-[11px] font-semibold">{t.label}</text>
            </g>
          ))}
          {view.xTicks.map((t) => (
            <g key={`x${t.at}`}>
              <line x1={px(t.at)} x2={px(t.at)} y1={MT} y2={MT + PH} stroke="var(--divider)" />
              <text x={px(t.at)} y={H - 18} textAnchor="middle" className="fill-muted text-[11px] font-semibold">{t.label}</text>
            </g>
          ))}
          {view.zeroAt !== null && <line x1={px(view.zeroAt)} x2={px(view.zeroAt)} y1={MT} y2={MT + PH} stroke="var(--muted)" strokeWidth={1.6} opacity={0.7} />}
          <text x={ML + PW / 2} y={H - 2} textAnchor="middle" className="fill-muted text-[11px] font-extrabold">Return on what it cost →</text>
          <text transform={`translate(12 ${MT + PH / 2}) rotate(-90)`} textAnchor="middle" className="fill-muted text-[11px] font-extrabold">Share of what you hold →</text>
          {view.bubbles.map((b) => (
            <Bubble key={b.key} b={b} box={box} on={active === b.key} dim={active !== null && active !== b.key} onActive={setActive} />
          ))}
        </svg>
        {on && <Tip b={on} box={box} />}
      </div>
      <p className="text-xs font-semibold text-muted">
        Where the weight sits, and how each holding is doing on what it cost. A big holding that is behind isn&apos;t a signal to sell: the map only shows.
        {view.leftOut.length > 0 && ` Not drawn, for having cost nothing: ${view.leftOut.join(", ")}.`}
      </p>
    </WidgetCard>
  );
}

function Bubble({ b, box, on, dim, onActive }: { b: WeightBubble; box: Box; on: boolean; dim: boolean; onActive: (key: string | null) => void }) {
  const { px, py, radius } = place(box);
  const r = radius(b.size);
  return (
    <g
      tabIndex={0}
      role="img"
      aria-label={`${b.name}: ${b.weight}, ${b.ret}`}
      onMouseEnter={() => onActive(b.key)}
      onMouseLeave={() => onActive(null)}
      onFocus={() => onActive(b.key)}
      onBlur={() => onActive(null)}
      onKeyDown={(e) => e.key === "Escape" && onActive(null)}
      className="cursor-default outline-none [&:focus-visible>circle]:stroke-[var(--ink)]"
      style={{ opacity: dim ? 0.45 : 1, transition: "opacity 150ms" }}
    >
      <circle cx={px(b.x)} cy={py(b.y)} r={r} fill={`var(--card-${b.colorKey})`} fillOpacity={0.85} stroke={on ? "var(--ink)" : "var(--surface)"} strokeWidth={on ? 3 : 2} />
      {r > 18 && <text x={px(b.x)} y={py(b.y) + 4} textAnchor="middle" className="pointer-events-none fill-white text-[11px] font-extrabold">{b.symbol.slice(0, 5)}</text>}
    </g>
  );
}

/** The hover card, laid over the plot beside the bubble. */
function Tip({ b, box }: { b: WeightBubble; box: Box }) {
  const { px, py, radius } = place(box);
  const gap = radius(b.size) + 8;
  const flip = b.x > 0.6;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 w-[220px] rounded-xl border border-surface-line bg-surface p-3 text-xs shadow-[var(--card-shadow)]"
      style={{ left: px(b.x), top: py(b.y), transform: `translate(${flip ? `calc(-100% - ${gap}px)` : `${gap}px`}, -50%)` }}
    >
      <b className="block text-[13px] font-extrabold">{b.name}</b>
      <span className="block font-semibold text-muted">{b.weight}</span>
      <span className={`block font-extrabold ${TONE[b.retTone]}`}>{b.ret}</span>
    </div>
  );
}
