"use client";

import { useMemo, useState } from "react";
import { layoutTreemap, withoutHolding, type Box } from "@/app/investments/treemapLayout";
import type { SplitDimensionView, SplitMemberView } from "@/app/investments/splitView";
import { shareText } from "@/app/investments/views";
import { formatLakh } from "@/lib/format/lakh";
import { RingTexture } from "../RingTexture";
import { useSize } from "../subscriptions/useSize";

const TONE = { gain: "text-positive", loss: "text-negative", plain: "text-muted" } as const;
/** Blocks glide to their new places once the map has been measured, so the first layout doesn't fly in from a guess. */
const GLIDE = "motion-safe:[transition:left_500ms_cubic-bezier(0.2,0.8,0.2,1),top_500ms_cubic-bezier(0.2,0.8,0.2,1),width_500ms_cubic-bezier(0.2,0.8,0.2,1),height_500ms_cubic-bezier(0.2,0.8,0.2,1),opacity_250ms_ease-out,filter_200ms_ease-out,translate_200ms_ease-out]";
const STILL = "motion-safe:[transition:opacity_200ms_ease-out,filter_200ms_ease-out,translate_200ms_ease-out]";
const PICKED_RING = "0 0 0 2.5px var(--surface), 0 0 0 5px var(--accent)";
const gradient = (colour: string) => `linear-gradient(155deg, var(--card-${colour}-from), var(--card-${colour}-to))`;
const at = (b: Box) => ({ left: b.x, top: b.y, width: b.w, height: b.h });

/**
 * "How it's split" as a treemap (docs/design/investments.md, picked 2026-11-04), in the Subscriptions cost map's style: a block for each holding,
 * its area its worth. Cut by asset class, market or company or fund, the blocks glide into their slice's tile; cut by holding it is one flat map.
 * Hovering or focusing a block lifts it and says what it is; picking one names it below; "Try without" (the holding cut only) folds it away so
 * the rest grow, with what is left: nothing is changed or saved. A measure, never a suggestion.
 */
export function SplitTreemap({ dimension }: { dimension: SplitDimensionView }) {
  const [ref, size, measured] = useSize<HTMLDivElement>({ w: 640, h: 380 });
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [without, setWithout] = useState<string | null>(null);

  const flat = dimension.key === "holding";
  const members = useMemo(() => dimension.slices.flatMap((s) => s.members.map((m) => ({ ...m, group: s.colour }))), [dimension]);
  const folded = flat ? without : null;
  const layout = useMemo(() => layoutTreemap(dimension, size.w, size.h, folded ?? undefined), [dimension, size.w, size.h, folded]);

  const total = members.reduce((s, m) => s + m.valueInr, 0);
  const pick = members.find((m) => m.key === picked);
  const gone = members.find((m) => m.key === folded);
  const left = folded ? withoutHolding(members, folded) : null;
  const active = hover ?? null;
  const hovered = members.find((m) => m.key === active);
  const hoveredBox = hovered ? layout.blocks.get(hovered.key) : undefined;

  const select = (key: string) => setPicked((cur) => (cur === key ? null : key));

  return (
    <div className="flex flex-col gap-3">
      <div ref={ref} className="relative h-[360px] w-full md:h-[420px]" onPointerLeave={() => setHover(null)} data-hovering={active ? "" : undefined}>
        {layout.groups.map((g) => (
          <div key={`${dimension.key}:${g.key}`} aria-hidden="true" className="absolute rounded-[18px] motion-safe:animate-tip-in" style={{ ...at(g), background: gradient(g.colour) }}>
            {g.header > 0 && (
              <div className="flex items-baseline justify-between gap-2 px-3 pt-2 text-on-card">
                <b className="truncate text-[12.5px] font-extrabold">{g.label}</b>
                <span className="text-[11.5px] font-bold text-on-card-muted tabular-nums">{g.value}</span>
              </div>
            )}
          </div>
        ))}
        {members.map((m) => {
          const box = layout.blocks.get(m.key) ?? { x: size.w / 2, y: size.h / 2, w: 0, h: 0 };
          const isGone = m.key === folded;
          const dim = active !== null && active !== m.key;
          return (
            <Block
              key={m.key}
              m={m}
              share={shareText(m.valueInr / total)}
              box={box}
              grouped={!flat}
              gone={isGone}
              picked={picked === m.key && !isGone}
              dim={dim}
              lifted={active === m.key}
              glide={measured}
              onPick={() => select(m.key)}
              onActive={(on) => setHover((cur) => (on ? m.key : cur === m.key ? null : cur))}
            />
          );
        })}
        {hovered && hoveredBox && hoveredBox.w > 0 && <HoverCard m={hovered} box={hoveredBox} total={total} width={size.w} height={size.h} />}
      </div>

      <div aria-live="polite" className="flex min-h-[2.75rem] flex-col gap-2 rounded-[14px] bg-fill px-3.5 py-2.5 text-[12.5px] font-semibold">
        {gone && left && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span>
              Without <b className="font-extrabold">{gone.name}</b>: {formatLakh(left.leftInr)} left, {left.gainInr < 0 ? "a loss of" : "a gain of"} {formatLakh(Math.abs(left.gainInr))}. <span className="text-muted">Nothing is changed or saved.</span>
            </span>
            <button type="button" onClick={() => setWithout(null)} className="rounded-full bg-ink px-3 py-1 text-xs font-extrabold text-on-ink focus-visible:outline-2 focus-visible:outline-offset-2">Put it back</button>
          </div>
        )}
        {pick && pick.key !== folded && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span>
              <b className="font-extrabold">{pick.name}</b> · {pick.value} · {shareText(pick.valueInr / total)} of what you hold{pick.gain && <> · <span className={TONE[pick.gainTone]}>{pick.gain} on what it cost</span></>}
            </span>
            {flat && members.length > 1 && (
              <button type="button" onClick={() => setWithout(pick.key)} className="rounded-full bg-ink px-3 py-1 text-xs font-extrabold text-on-ink focus-visible:outline-2 focus-visible:outline-offset-2">Try without {pick.symbol}</button>
            )}
          </div>
        )}
        {!gone && !pick && <span className="text-muted">Area is worth. Hover a block for what it is; press one to pick it{flat ? ", then try the rest without it" : ""}.</span>}
      </div>
    </div>
  );
}

function Block({ m, share, box, grouped, gone, picked, dim, lifted, glide, onPick, onActive }: { m: SplitMemberView & { group: string }; share: string; box: Box; grouped: boolean; gone: boolean; picked: boolean; dim: boolean; lifted: boolean; glide: boolean; onPick: () => void; onActive: (on: boolean) => void }) {
  const { w, h } = box;
  const big = w > 150 && h > 100;
  const mid = w > 80 && h > 56;
  return (
    <div
      className={`absolute ${glide ? GLIDE : STILL} ${gone ? "pointer-events-none overflow-hidden opacity-0" : ""}`}
      style={{ ...at(box), translate: lifted ? "0 -3px" : undefined, opacity: gone ? 0 : dim ? 0.75 : 1, filter: dim ? "saturate(.55)" : undefined }}
      onPointerEnter={() => onActive(true)}
    >
      <button
        type="button"
        tabIndex={gone ? -1 : undefined}
        aria-pressed={picked}
        aria-label={`${m.name}, ${m.value}, ${share} of what you hold${m.gain ? `, ${m.gain} on cost` : ""}`}
        onClick={onPick}
        onFocus={() => onActive(true)}
        onBlur={() => onActive(false)}
        className={`relative isolate flex size-full flex-col justify-between overflow-hidden border border-on-card-line text-left text-on-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${big ? "rounded-[14px] p-3" : mid ? "rounded-xl p-2" : "items-center justify-center rounded-lg p-1"}`}
        style={{ background: gradient(m.colorKey), boxShadow: picked ? PICKED_RING : "none" }}
      >
        {/* Cut into slices, a holding takes its slice's colour, fading in over its own (under the rings). */}
        <span aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 motion-safe:transition-opacity motion-safe:duration-500 ${grouped ? "opacity-100" : "opacity-0"}`} style={{ background: gradient(m.group) }} />
        <RingTexture width={Math.max(1, Math.round(w))} height={Math.max(1, Math.round(h))} dx={10} dy={19} first={40} step={24} count={9} stroke="var(--rings-light)" opacity={0.05} />
        {big ? (
          <>
            <span className="flex flex-col">
              <b className="truncate text-[13px] font-extrabold">{m.symbol}</b>
              <small className="truncate text-[11px] font-semibold text-on-card-muted">{m.name}</small>
            </span>
            <span className="flex items-baseline justify-between gap-2">
              <b className="text-[15px] font-extrabold tabular-nums">{m.value}</b>
              {m.gain && <small className="text-[11px] font-bold text-on-card-muted tabular-nums">{m.gain}</small>}
            </span>
          </>
        ) : mid ? (
          <span className="flex flex-col leading-tight">
            <b className="truncate text-[12px] font-extrabold">{m.symbol}</b>
            <small className="truncate text-[11px] font-bold text-on-card-muted tabular-nums">{m.value}</small>
          </span>
        ) : (
          w > 28 && h > 20 && <b className="text-[10.5px] font-extrabold">{m.symbol.slice(0, 3)}</b>
        )}
        {picked && (
          <span aria-hidden="true" className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-on-accent">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          </span>
        )}
      </button>
    </div>
  );
}

/** What a hovered or focused block is, in a light card over the map beside it. */
function HoverCard({ m, box, total, width, height }: { m: SplitMemberView; box: Box; total: number; width: number; height: number }) {
  const CARD = 210;
  const TALL = 112;
  // Opens to the right of the block when there is room, otherwise to its left, and stays inside the map.
  const left = Math.max(0, Math.min(width - CARD, box.x + box.w + 8 + CARD <= width ? box.x + box.w + 8 : box.x - CARD - 8));
  return (
    <div role="status" className="pointer-events-none absolute z-20 rounded-[14px] border border-[var(--tip-line)] bg-[var(--tip-surface)] p-3 text-[var(--tip-fg)] shadow-[var(--tip-shadow)]" style={{ left, top: Math.max(0, Math.min(box.y, height - TALL)), width: CARD }}>
      <span className="block text-[11px] font-extrabold tracking-[0.04em] text-[var(--tip-muted)] uppercase">{m.symbol}</span>
      <b className="mt-1 block text-[15px] font-extrabold">{m.name}</b>
      <span className="mt-1 block text-lg font-extrabold tabular-nums">{m.value}</span>
      <span className="block text-[11.5px] font-semibold text-[var(--tip-muted)]">{shareText(m.valueInr / total)} of what you hold{m.gain ? ` · ${m.gain} on what it cost` : ""}</span>
    </div>
  );
}
