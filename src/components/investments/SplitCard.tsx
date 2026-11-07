"use client";

import { useState } from "react";
import { drawnLength, spinTo, type SplitDimensionView, type SplitSliceView } from "@/app/investments/splitView";
import { WidgetCard } from "../shell/WidgetCard";

const TONE = { gain: "text-positive", loss: "text-negative", plain: "text-muted" } as const;
const SIZE = 200;
const MID = SIZE / 2;
const INNER_R = 66;
const INNER_W = 30;
const OUTER_R = 94;
const OUTER_W = 8;
const GAP = 0.004;

/** An arc of a ring, drawn as a dashed circle: from `start` for `length` (both 0 to 1 of the way round). */
function Arc({ r, width, start, length, colour, opacity = 1 }: { r: number; width: number; start: number; length: number; colour: string; opacity?: number }) {
  const c = 2 * Math.PI * r;
  const len = drawnLength(length, GAP) * c;
  return <circle cx={MID} cy={MID} r={r} fill="none" stroke={colour} strokeWidth={width} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-start * c} style={{ opacity }} />;
}

/**
 * How it's split (docs/design/investments.md, Understand it): the wheel cut one of four ways. Picking a slice, from its chip or by clicking it, spins it
 * to the pointer at the top and lists the holdings in it; an outer ring splits that slice by holding. A measure, never a suggestion.
 */
export function SplitCard({ dimensions }: { dimensions: SplitDimensionView[] }) {
  const [dimKey, setDimKey] = useState(dimensions[0].key);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const dim = dimensions.find((d) => d.key === dimKey) ?? dimensions[0];
  const slice = dim.slices.find((s) => s.key === picked[dim.key]) ?? dim.slices[0];
  // Turn the wheel so the middle of the picked slice sits under the pointer.
  const spin = spinTo(slice.start, slice.fraction);
  const colourOf = (s: SplitSliceView) => `var(--card-${s.colour})`;
  const pick = (s: SplitSliceView) => setPicked((p) => ({ ...p, [dim.key]: s.key }));

  return (
    <WidgetCard label="How it's split" title="How it's split" note="slice it four ways" right={
      <div role="group" aria-label="Slice it by" className="flex max-w-full flex-wrap rounded-full bg-fill p-1">
        {dimensions.map((d) => (
          <button key={d.key} type="button" aria-pressed={d.key === dim.key} onClick={() => setDimKey(d.key)} className={`min-h-8 rounded-full px-3 text-[12px] font-extrabold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 ${d.key === dim.key ? "bg-ink text-on-ink" : "text-muted hover:text-fg"}`}>
            {d.label}
          </button>
        ))}
      </div>
    }>
      <div className="flex flex-wrap gap-2" role="group" aria-label={`The ${dim.label.toLowerCase()} slices`}>
        {dim.slices.map((s) => (
          <button key={s.key} type="button" aria-pressed={s.key === slice.key} onClick={() => pick(s)} className={`flex min-h-8 items-center gap-2 rounded-full px-3 text-[12px] font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 ${s.key === slice.key ? "bg-ink text-on-ink" : "bg-fill hover:bg-divider"}`}>
            <i aria-hidden="true" className="block size-2.5 rounded-[3px]" style={{ background: colourOf(s) }} />
            {s.label}
            <span className="font-bold opacity-70">{s.percent}</span>
          </button>
        ))}
      </div>

      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,230px)_minmax(0,1fr)]">
        <div className="relative mx-auto aspect-square w-full max-w-[230px]">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full overflow-visible" aria-hidden="true">
            <g style={{ transform: `rotate(${spin - 90}deg)`, transformOrigin: "50% 50%", transition: "transform 650ms cubic-bezier(0.3, 0.7, 0.2, 1)" }} className="motion-reduce:transition-none">
              {dim.slices.map((s) => (
                <g key={s.key} onClick={() => pick(s)} className="cursor-pointer">
                  <Arc r={INNER_R} width={INNER_W} start={s.start} length={s.fraction} colour={colourOf(s)} opacity={s.key === slice.key ? 1 : 0.55} />
                </g>
              ))}
              {slice.members.map((m, i) => {
                const before = slice.members.slice(0, i).reduce((sum, x) => sum + x.fraction, 0);
                return <Arc key={m.key} r={OUTER_R} width={OUTER_W} start={slice.start + before * slice.fraction} length={m.fraction * slice.fraction} colour={colourOf(slice)} opacity={i % 2 === 0 ? 0.95 : 0.6} />;
              })}
            </g>
            <path d={`M ${MID - 7} 3 L ${MID + 7} 3 L ${MID} 15 Z`} fill="currentColor" />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <b className="text-[26px] leading-none font-extrabold tracking-tight tabular-nums">{slice.percent}</b>
            <span className="mt-1 max-w-[88px] text-[11px] leading-tight font-bold text-muted">{slice.label}</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2.5" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="flex items-center gap-2 text-base font-extrabold">
              <i aria-hidden="true" className="block size-3 rounded-[4px]" style={{ background: colourOf(slice) }} />
              {slice.label}
            </span>
            <span className="text-[12.5px] font-bold text-muted">
              {slice.value}
              {slice.gain && <> · <span className={TONE[slice.gainTone]}>{slice.gain}</span></>}
            </span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {slice.members.map((m) => (
              <li key={m.key} className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_3rem_4.5rem] items-center gap-2.5 text-[12px] font-bold">
                <span className="truncate" title={m.name}>{m.symbol}</span>
                <span aria-hidden="true" className="block h-2 overflow-hidden rounded-full bg-fill">
                  <i className="block h-full rounded-full" style={{ width: `${m.fraction * 100}%`, background: colourOf(slice) }} />
                </span>
                <b className="text-right font-extrabold tabular-nums">{m.percent}</b>
                <span className="text-right text-[11px] text-muted tabular-nums">{m.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="border-t border-divider pt-2.5 text-[11px] font-semibold text-muted">The pointer reads the slice at the top. Pick one from its chip or click it on the wheel: the wheel turns to it and the holdings in it show beside. An ETF or a fund of shares counts as equity. A measure, never a suggestion.</p>
    </WidgetCard>
  );
}
