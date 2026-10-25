"use client";

import { useState } from "react";
import type { IncomeMap, MapBlock } from "@/app/income/widgetsView";
import { colorGradient } from "@/lib/format/colors";
import { RingTexture } from "../RingTexture";
import { mapLayout, type Box, type MapEntry } from "../subscriptions/costMap";
import { Segmented } from "../subscriptions/Segmented";
import { useSize } from "../subscriptions/useSize";

const at = (box: Box) => ({ left: box.x, top: box.y, width: box.w, height: box.h });
const GLIDE = "motion-safe:[transition:left_500ms_cubic-bezier(0.2,0.8,0.2,1),top_500ms_cubic-bezier(0.2,0.8,0.2,1),width_500ms_cubic-bezier(0.2,0.8,0.2,1),height_500ms_cubic-bezier(0.2,0.8,0.2,1),opacity_250ms_ease-out]";
const NONE: ReadonlySet<string> = new Set();
const entry = (b: MapBlock): MapEntry => ({ id: b.id, alias: b.name, color: b.colorKey, monthly: b.value, category: b.id, categoryLabel: b.name, categoryColor: b.colorKey });

/**
 * "What each one pays" (IncomeZ1): the Subscriptions cost map's layout, a block per source sized by what it paid
 * this year (Received) or by its usual month. The blocks glide between the two. Clicking one picks it for the
 * cover; the picked one is ringed. It fills the height its card has, so it ends level with the Entries card.
 */
export function IncomeMapCard({ map, picked, onPick }: { map: IncomeMap; picked: string; onPick: (id: string) => void }) {
  const [by, setBy] = useState<"received" | "usual">("received");
  const [box, size, measured] = useSize<HTMLDivElement>({ w: 560, h: 400 });
  const blocks = by === "received" ? map.received : map.usual;
  const leftOut = by === "received" ? map.leftOut.received : map.leftOut.usual;
  // Every source keeps a box (folded away when it's not in this view), so blocks glide between the two.
  const all = [...map.received, ...map.usual.filter((u) => !map.received.some((r) => r.id === u.id))];
  const hidden = new Set(all.filter((b) => !blocks.some((x) => x.id === b.id)).map((b) => b.id));
  const layout = mapLayout(all.map((b) => entry(blocks.find((x) => x.id === b.id) ?? b)), { by: "each", without: hidden.size ? hidden : NONE, ghost: null, width: size.w, height: size.h });

  return (
    <section aria-label="What each one pays" className="flex min-w-0 flex-col gap-4 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold">
          What each one pays <small className="ml-2 text-xs font-semibold text-muted">sized by what it pays · pick one for the cover</small>
        </h2>
        <Segmented label="Size by" value={by} onChange={setBy} options={[{ value: "received", label: "Received" }, { value: "usual", label: "A usual month" }]} small />
      </div>
      {blocks.length === 0 ? (
        <p className="flex-1 py-10 text-center text-sm font-semibold text-muted">{by === "received" ? "Nothing received this year yet." : "No source pays on a schedule."}</p>
      ) : (
        <div ref={box} className="relative min-h-[320px] flex-1 md:min-h-[380px]">
          {all.map((source) => {
            const b = blocks.find((x) => x.id === source.id) ?? source;
            const rect = layout.boxes.get(b.id);
            if (!rect) return null;
            const off = hidden.has(b.id);
            const small = rect.w < 96 || rect.h < 64;
            return (
              <button
                key={b.id}
                type="button"
                tabIndex={off ? -1 : 0}
                aria-hidden={off || undefined}
                aria-label={`${b.name}, ${b.amount}, ${Math.round(b.share * 100)}%${b.chip ? `, ${b.chip}` : ""}`}
                aria-pressed={picked === b.id}
                onClick={() => onPick(b.id)}
                className={`absolute isolate flex cursor-pointer flex-col justify-between overflow-hidden rounded-[16px] p-3 text-left text-on-card focus-visible:outline-2 focus-visible:outline-accent ${measured ? GLIDE : ""} ${off ? "pointer-events-none opacity-0" : ""}`}
                style={{ ...at(rect), background: colorGradient(b.colorKey), boxShadow: picked === b.id ? "0 0 0 2.5px var(--surface), 0 0 0 5px var(--accent)" : "none" }}
              >
                <RingTexture width={200} height={140} dx={10} dy={14} first={26} step={18} stroke="var(--rings-light)" opacity={0.09} />
                {small ? (
                  <span className="flex h-full flex-col items-center justify-center gap-0.5 text-center">
                    <span className="text-[11px] font-extrabold">{b.name[0]}</span>
                    {rect.h >= 40 && <span className="text-[10px] font-bold tabular-nums">{Math.round(b.share * 100)}%</span>}
                  </span>
                ) : (
                  <>
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <b className="block truncate text-[13px] font-extrabold">{b.name}</b>
                        <span className="block truncate text-[10.5px] font-semibold text-on-card-muted">{b.kind}</span>
                      </span>
                      <span className="text-[10.5px] font-bold text-on-card-muted tabular-nums">{Math.round(b.share * 100)}%</span>
                    </span>
                    <span className="flex flex-col items-start gap-1">
                      <b className="text-base font-extrabold tabular-nums md:text-lg">{b.amount}</b>
                      {b.chip && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${b.late ? "bg-warning-tint text-warning-text" : "bg-[oklch(1_0_0/0.18)]"}`}>{b.chip}</span>}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
      {leftOut.length > 0 && (
        <p className="text-[11.5px] font-semibold text-muted">
          Not in the map: {leftOut.map((l) => `${l.name} (${l.why})`).join(", ")}. Pick it from the cover&apos;s chips.
        </p>
      )}
    </section>
  );
}
