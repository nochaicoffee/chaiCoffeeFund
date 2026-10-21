"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CategoryBlock, MapBlock, SubscriptionsPageView } from "@/app/subscriptions/views";
import { formatInr } from "@/lib/format/money";
import { colorGradient } from "@/lib/format/subscriptionLabels";
import { RingTexture } from "../RingTexture";
import { CheckIcon } from "./icons";
import { Mono, Segmented } from "./parts";
import { squarify, type TreemapRect } from "./treemap";

/**
 * "What each one costs" (#126): a treemap of active subscriptions sized by what they
 * cost, in their category's colour, with A month / A year and Each / By category.
 * A block, or a chip for a paused or cancelled one, picks that subscription. The map
 * fills whatever height the card has, so it ends level with the cards beside it.
 */

const GAP = 6;

function Block({ rect, block, per, picked, onPick }: { rect: TreemapRect; block: MapBlock; per: "month" | "year"; picked: boolean; onPick: () => void }) {
  const w = rect.w - GAP;
  const h = rect.h - GAP;
  const big = w > 150 && h > 110;
  const mid = w > 82 && h > 62;
  const tiny = w < 64 || h < 52;
  // A big block on a phone is narrower than on a desktop, so its price steps down a size there.
  const wide = w > 230;
  const value = formatInr(per === "year" ? block.monthly * 12 : block.monthly);
  return (
    <button
      type="button"
      aria-pressed={picked}
      aria-label={`${block.alias}, ${value} a ${per}`}
      onClick={onPick}
      className="group absolute block focus-visible:outline-none"
      style={{ left: rect.x + GAP / 2, top: rect.y + GAP / 2, width: w, height: h }}
    >
      <span
        className={`relative isolate flex size-full flex-col justify-between overflow-hidden border border-on-card-line border-t-on-card-line-top text-left text-on-card transition-[transform,box-shadow] duration-150 ease-out group-hover:-translate-y-0.5 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent ${
          big ? "rounded-[18px] p-4" : tiny ? "items-center justify-center rounded-xl p-1.5" : "rounded-xl p-2.5"
        }`}
        style={{ background: colorGradient(block.color), boxShadow: picked ? "0 0 0 2.5px var(--surface), 0 0 0 5px var(--accent)" : "none" }}
      >
        <RingTexture width={Math.max(1, Math.round(w))} height={Math.max(1, Math.round(h))} dx={10} dy={19} first={40} step={24} count={9} stroke="var(--rings-light)" opacity={0.05} />
        {tiny ? (
          <span className="text-center leading-[1.15]">
            <b className="text-[13px]">{block.initial}</b>
            {h > 40 && w > 40 && <span className="block text-[10px] font-extrabold">{value}</span>}
          </span>
        ) : (
          <>
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className={`block truncate font-extrabold ${big ? "text-[17px]" : "text-xs"}`}>{block.alias}</span>
                {mid && <span className={`mt-[3px] block truncate font-semibold text-on-card-muted ${big ? "text-xs" : "text-[10.5px]"}`}>{big ? block.detail : block.cycle}</span>}
              </span>
              {big && <span className="text-[10px] font-semibold text-on-card-faint">{Math.round(block.share * 100)}%</span>}
            </span>
            <span>
              <span className={`block leading-[1.1] font-extrabold whitespace-nowrap tabular-nums ${big ? (wide ? "text-[26px]" : "text-xl") : "text-[13px]"}`}>
                {value}
                {big && <span className="text-xs font-semibold text-on-card-muted"> a {per}</span>}
              </span>
              {big && (
                <span className="mt-2 flex items-center justify-between gap-2">
                  {block.pill ? <span /> : <span className="truncate text-[10px] font-semibold text-on-card-faint">{block.footnote}</span>}
                  {block.pill && <Pill pill={block.pill} />}
                </span>
              )}
              {!big && mid && block.pill && (
                <span className="mt-[5px] block">
                  <Pill pill={block.pill} />
                </span>
              )}
            </span>
          </>
        )}
      </span>
      {picked && (
        <span aria-hidden="true" className="absolute -top-[7px] -right-[7px] z-[3] flex size-[21px] items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_2px_6px_oklch(0_0_0/0.4)]">
          <CheckIcon />
        </span>
      )}
    </button>
  );
}

function Pill({ pill }: { pill: NonNullable<MapBlock["pill"]> }) {
  return (
    <span className={`inline-block rounded-full px-[9px] py-[3px] text-[10px] font-bold whitespace-nowrap ${pill.due ? "bg-[oklch(0.7_0.14_35/0.55)] motion-safe:animate-due-pulse" : "bg-[oklch(0.8_0.13_80/0.35)]"}`}>{pill.text}</span>
  );
}

function CategoryTile({ rect, category, per }: { rect: TreemapRect; category: CategoryBlock; per: "month" | "year" }) {
  const w = rect.w - GAP;
  const h = rect.h - GAP;
  const roomy = w > 110 && h > 70;
  return (
    <div
      className="absolute isolate flex flex-col justify-between overflow-hidden rounded-xl border border-on-card-line border-t-on-card-line-top p-2.5 text-on-card"
      style={{ left: rect.x + GAP / 2, top: rect.y + GAP / 2, width: w, height: h, background: colorGradient(category.color) }}
    >
      <RingTexture width={Math.max(1, Math.round(w))} height={Math.max(1, Math.round(h))} dx={10} dy={19} first={40} step={24} count={9} stroke="var(--rings-light)" opacity={0.05} />
      <span className="min-w-0">
        <span className={`block truncate font-extrabold ${roomy ? "text-[15px]" : "text-xs"}`}>{category.label}</span>
        {roomy && <span className="mt-[3px] block truncate text-[11px] font-semibold text-on-card-muted">{category.aliases.join(", ")}</span>}
      </span>
      <span className={`font-extrabold tabular-nums ${roomy ? "text-xl" : "text-[13px]"}`}>{formatInr(per === "year" ? category.monthly * 12 : category.monthly)}</span>
    </div>
  );
}

export function CostMapCard({ view, picked, onPick }: { view: SubscriptionsPageView; picked: string; onPick: (id: string) => void }) {
  const [per, setPer] = useState<"month" | "year">("month");
  const [by, setBy] = useState<"each" | "category">("each");
  const box = useRef<HTMLDivElement>(null);
  // The map is laid out at its real size, so a block knows whether there's room for its details.
  const [size, setSize] = useState({ w: 704, h: 520 });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const items = by === "each" ? view.blocks.map((b) => ({ key: b.id, value: b.monthly })) : view.categories.map((c) => ({ key: c.key, value: c.monthly }));
  const rects = squarify(items, size.w, size.h);
  const blocks = new Map(view.blocks.map((b) => [b.id, b]));
  const categories = new Map(view.categories.map((c) => [c.key, c]));

  return (
    <section aria-labelledby="cost-map-title" className="flex min-w-0 flex-col gap-4 rounded-[22px] border border-surface-line bg-surface p-4 shadow-[var(--card-shadow)] md:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="cost-map-title" className="text-[15px] font-extrabold text-fg">
          What each one costs<small className="ml-2 text-xs font-semibold text-muted max-md:hidden">sized by what it costs · pick one for its payments</small>
        </h2>
        <span className="flex flex-wrap items-center gap-2.5">
          <Segmented label="Cost" value={per} onChange={setPer} options={[{ value: "month", label: "A month" }, { value: "year", label: "A year" }]} />
          <span className="max-md:hidden">
            <Segmented label="Group" value={by} onChange={setBy} options={[{ value: "each", label: "Each" }, { value: "category", label: "By category" }]} />
          </span>
        </span>
      </div>

      <div ref={box} className="relative min-h-[360px] flex-1 md:min-h-[440px]">
        {rects.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center rounded-[18px] border-[1.5px] border-dashed border-divider px-6 text-center text-[13px] font-medium text-muted">
            Each active subscription becomes a block here, sized by what it costs.
          </p>
        ) : by === "each" ? (
          rects.map((r) => <Block key={r.key} rect={r} block={blocks.get(r.key)!} per={per} picked={picked === r.key} onPick={() => onPick(r.key)} />)
        ) : (
          rects.map((r) => <CategoryTile key={r.key} rect={r} category={categories.get(r.key)!} per={per} />)
        )}
      </div>

      {view.categories.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted">
          {view.categories.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1.5">
              <i aria-hidden="true" className="inline-block size-[9px] rounded-[3px]" style={{ background: `var(--card-${c.color})` }} />
              {c.label} <b className="font-bold text-fg tabular-nums">{formatInr(per === "year" ? c.monthly * 12 : c.monthly)}</b>
            </span>
          ))}
        </div>
      )}

      {view.stopped.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-divider pt-2.5">
          <span className="text-xs font-medium text-muted">Not in the map:</span>
          {view.stopped.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={picked === s.id}
              onClick={() => onPick(s.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent ${picked === s.id ? "bg-ink text-on-ink" : "bg-fill text-fg hover:bg-fill-strong"}`}
            >
              <Mono mark={s} size={16} />
              {s.alias}
              <em className={`text-[11px] not-italic ${picked === s.id ? "text-[oklch(1_0_0/0.6)]" : "text-muted"}`}>{s.label}</em>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
