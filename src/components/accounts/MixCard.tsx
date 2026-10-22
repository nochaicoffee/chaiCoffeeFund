"use client";

import type { MixBlock } from "@/app/accounts/views";
import { colorGradient } from "@/lib/format/subscriptionLabels";
import { formatInr } from "@/lib/format/money";
import { useState } from "react";
import { RingTexture } from "../RingTexture";
import { mapCategories, mapLayout, type Box } from "../subscriptions/costMap";
import { Segmented } from "../subscriptions/Segmented";
import { useSize } from "../subscriptions/useSize";

const at = (box: Box) => ({ left: box.x, top: box.y, width: box.w, height: box.h });
const GLIDE = "motion-safe:[transition:left_500ms_cubic-bezier(0.2,0.8,0.2,1),top_500ms_cubic-bezier(0.2,0.8,0.2,1),width_500ms_cubic-bezier(0.2,0.8,0.2,1),height_500ms_cubic-bezier(0.2,0.8,0.2,1),opacity_250ms_ease-out]";
const NONE: ReadonlySet<string> = new Set();

/**
 * "Where it sits" (docs/design/accounts.md, the mix): a treemap of balances, the Subscriptions
 * cost map's layout with By account / By purpose. By purpose glides the blocks into a tile per
 * purpose in its colour. Clicking a block picks that account, hovering one steps the rest back.
 * It fills the height its card has, so the card ends level with Balance history beside it.
 */
export function MixCard({ blocks, picked, onPick }: { blocks: MixBlock[]; picked: string; onPick: (id: string) => void }) {
  const [by, setBy] = useState<"each" | "category">("each");
  const [hover, setHover] = useState<string | null>(null);
  const [box, size, measured] = useSize<HTMLDivElement>({ w: 560, h: 380 });
  const total = blocks.reduce((sum, b) => sum + b.monthly, 0);
  const layout = mapLayout(blocks, { by, without: NONE, ghost: null, width: size.w, height: size.h });
  const categories = mapCategories(blocks);
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)]" aria-label="Where it sits">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold">
          Where it sits <small className="ml-2 text-xs font-semibold text-muted">{formatInr(total)}</small>
        </h2>
        <Segmented label="Group" value={by} onChange={setBy} options={[{ value: "each", label: "By account" }, { value: "category", label: "By purpose" }]} />
      </div>
      {blocks.length === 0 ? (
        <p className="py-10 text-center text-sm font-semibold text-muted">No balances to map yet.</p>
      ) : (
        <div ref={box} className="relative min-h-[340px] flex-1 md:min-h-[380px]" data-hovering={hover ? "" : undefined}>
          {by === "category" &&
            categories.map((c) => {
              const tile = layout.tiles.get(c.key);
              return (
                tile && (
                  <div key={c.key} aria-hidden="true" className={`absolute isolate overflow-hidden rounded-[18px] ${measured ? GLIDE : ""}`} style={{ ...at(tile), background: colorGradient(c.color) }}>
                    <span className="absolute top-2 left-3 text-[11px] font-extrabold text-on-card">
                      {c.label} · {formatInr(c.monthly)}
                    </span>
                  </div>
                )
              );
            })}
          {blocks.map((b) => {
            const rect = layout.boxes.get(b.id);
            if (!rect) return null;
            const small = rect.w < 90 || rect.h < 56;
            const active = hover === b.id;
            return (
              <button
                key={b.id}
                type="button"
                aria-label={`${b.alias}, ${b.balanceText}, ${Math.round(b.share * 100)}% of what you hold`}
                aria-pressed={picked === b.id}
                onClick={() => onPick(b.id)}
                onPointerEnter={() => setHover(b.id)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(b.id)}
                onBlur={() => setHover(null)}
                className={`absolute isolate flex cursor-pointer flex-col justify-between overflow-hidden rounded-[14px] p-2.5 text-left text-on-card focus-visible:outline-2 focus-visible:outline-accent ${measured ? GLIDE : ""} ${hover && !active ? "opacity-70 saturate-50" : ""}`}
                style={{ ...at(rect), background: colorGradient(b.color), boxShadow: picked === b.id ? "0 0 0 2.5px var(--surface), 0 0 0 5px var(--accent)" : "none" }}
              >
                <RingTexture width={160} height={100} dx={6} dy={10} first={24} step={18} stroke="var(--rings-light)" opacity={0.08} />
                {small ? (
                  <span className="text-xs font-extrabold">{b.initial}</span>
                ) : (
                  <>
                    <span className="truncate text-xs font-extrabold">{b.alias}</span>
                    <span>
                      <b className="block text-sm font-extrabold tabular-nums">{b.balanceText}</b>
                      <span className="text-[10.5px] font-semibold text-on-card-muted">{Math.round(b.share * 100)}%</span>
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
