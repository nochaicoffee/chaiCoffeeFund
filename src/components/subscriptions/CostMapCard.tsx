"use client";

import { useCallback, useEffect, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import type { MapBlock, SubscriptionsPageView } from "@/app/subscriptions/views";
import { formatInr } from "@/lib/format/money";
import { colorGradient } from "@/lib/format/subscriptionLabels";
import { RollingNumber } from "../motion/RollingNumber";
import { RingTexture } from "../RingTexture";
import { categoryCard, mapCategories, mapLayout, whatIf, type Box, type MapCategory } from "./costMap";
import { CostMapHover, type HoverCategory } from "./CostMapHover";
import { CheckIcon, RenewIcon } from "./icons";
import { Mono, Segmented } from "./parts";
import { useSize } from "./useSize";

/**
 * "What each one costs" (#126): a treemap of active subscriptions sized by what they
 * cost, each in its own colour, with A month / A year and Each / By category.
 * A block, or a chip for a paused or cancelled one, picks that subscription. Hovering or
 * focusing a block or a category shows its card (CostMapHover). The map fills whatever
 * height the card has, so it ends level with the cards beside it; that column keeps one
 * height whatever's picked (PaymentsCard), so the blocks stay where they are.
 *
 * Prathik's picks from the interactions mockup (design/subscriptions-interactions/):
 * - 1A: By category moves the same blocks into their category's tile, taking its colour,
 *   and back again; A month and A year roll every number.
 * - 1B: Try without folds a block away and the rest grow, with a line over the map saying
 *   what's left and what it saves. Nothing is saved; it's a what-if.
 * - 7C: hovering a paused or cancelled chip makes room for a dashed ghost of it.
 * The layout is worked out in costMap.ts.
 */

/** The rings ripple outward on the active block, as on the Cards page's heatmap (#104). */
const RIPPLE = "origin-bottom-right motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out group-data-active:scale-[1.18] group-data-pointed:scale-[1.18]";
/**
 * While one is hovered or focused, the rest step back: greyer and a little faded, not washed
 * out to the page. The same while a payment or a Charged to row points at some (3A, 3B).
 */
const DIM =
  "group-data-hovering/map:not-data-active:opacity-75 group-data-hovering/map:not-data-active:saturate-[.55] group-data-pointing/map:not-data-pointed:opacity-75 group-data-pointing/map:not-data-pointed:saturate-[.55]";
/** Blocks glide to their new places, and fade, once the map has been measured (so the first layout doesn't fly in from a guess). */
const GLIDE =
  "motion-safe:[transition:left_500ms_cubic-bezier(0.2,0.8,0.2,1),top_500ms_cubic-bezier(0.2,0.8,0.2,1),width_500ms_cubic-bezier(0.2,0.8,0.2,1),height_500ms_cubic-bezier(0.2,0.8,0.2,1),opacity_250ms_ease-out,filter_200ms_ease-out,translate_200ms_ease-out]";
const STILL = "motion-safe:[transition:opacity_200ms_ease-out,filter_200ms_ease-out,translate_200ms_ease-out]";
const PICKED_RING = "0 0 0 2.5px var(--surface), 0 0 0 5px var(--accent)";

const at = (box: Box) => ({ left: box.x, top: box.y, width: box.w, height: box.h });
const per12 = (monthly: number, per: "month" | "year") => (per === "year" ? monthly * 12 : monthly);

function Block({
  box,
  block,
  per,
  picked,
  grouped,
  gone,
  pointed,
  glide,
  onPick,
  onTryWithout,
}: {
  box: Box;
  block: MapBlock;
  per: "month" | "year";
  picked: boolean;
  /** By category: it's part of its category's tile, which is what's hovered and focused. */
  grouped: boolean;
  /** Tried without: folded away. */
  gone: boolean;
  /** A payment or a Charged to row is pointing at it. */
  pointed: boolean;
  glide: boolean;
  onPick: () => void;
  onTryWithout: () => void;
}) {
  const { w, h } = box;
  const big = w > 150 && h > 110;
  const mid = w > 82 && h > 62;
  const tiny = w < 64 || h < 52;
  // A big block on a phone is narrower than on a desktop, so its price steps down a size there.
  const wide = w > 230;
  const value = per12(block.monthly, per);
  const quiet = grouped || gone;
  const canTry = !quiet && w >= 96 && h >= 64;
  return (
    <div
      data-map-key={quiet ? undefined : block.id}
      data-map-owner={grouped ? block.category : undefined}
      aria-hidden={quiet || undefined}
      data-pointed={pointed || undefined}
      className={`group absolute data-active:-translate-y-[3px] data-pointed:-translate-y-[3px] ${gone ? "overflow-hidden opacity-0" : DIM} ${glide ? GLIDE : STILL} ${quiet ? "pointer-events-none" : ""}`}
      style={at(box)}
    >
      <button
        type="button"
        tabIndex={quiet ? -1 : undefined}
        aria-pressed={picked}
        aria-label={`${block.alias}, ${formatInr(value)} a ${per}`}
        onClick={onPick}
        className={`relative isolate flex size-full flex-col justify-between overflow-hidden border border-on-card-line border-t-on-card-line-top text-left text-on-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          grouped ? "rounded-lg p-2" : big ? "rounded-[18px] p-4" : tiny ? "items-center justify-center rounded-xl p-1.5" : "rounded-xl p-2.5"
        }`}
        style={{ background: colorGradient(block.color), boxShadow: picked && !quiet ? PICKED_RING : "none" }}
      >
        {/* By category it takes its category's colour, fading in over its own. Under the rings, so they still show. */}
        <span aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 motion-safe:transition-opacity motion-safe:duration-500 ${grouped ? "opacity-100" : "opacity-0"}`} style={{ background: colorGradient(block.categoryColor) }} />
        <RingTexture width={Math.max(1, Math.round(w))} height={Math.max(1, Math.round(h))} dx={10} dy={19} first={40} step={24} count={9} stroke="var(--rings-light)" opacity={0.05} ringsClassName={RIPPLE} />
        {grouped ? (
          // Its category's name and total sit at the tile's top, so its own name goes to the bottom.
          w > 44 && h > 26 && <span className="mt-auto truncate text-[10.5px] font-bold text-on-card-muted">{block.alias}</span>
        ) : tiny ? (
          <span className="text-center leading-[1.15]">
            <b className="text-[13px]">{block.initial}</b>
            {h > 40 && w > 40 && (
              <span className="block text-[10px] font-extrabold tabular-nums">
                <RollingNumber value={value} format="inr" />
              </span>
            )}
          </span>
        ) : (
          <>
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className={`block truncate font-extrabold ${big ? "text-[17px]" : "text-xs"}`}>{block.alias}</span>
                {mid && <span className={`mt-[3px] block truncate font-semibold text-on-card-muted ${big ? "text-xs" : "text-[10.5px]"}`}>{big ? block.detail : block.cycle}</span>}
              </span>
              {/* Try without takes this corner while the block is hovered. */}
              {big && <span className="text-[10px] font-semibold text-on-card-faint group-hover:opacity-0 group-has-[:focus-visible]:opacity-0 [@media(hover:none)]:group-hover:opacity-100">{Math.round(block.share * 100)}%</span>}
            </span>
            <span>
              <span className={`block leading-[1.1] font-extrabold whitespace-nowrap tabular-nums ${big ? (wide ? "text-[26px]" : "text-xl") : "text-[13px]"}`}>
                <RollingNumber value={value} format="inr" />
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
      </button>
      {canTry && (
        <button
          type="button"
          onClick={onTryWithout}
          aria-label={`Try the map without ${block.alias}`}
          data-try={block.id}
          // Invisible until the block is hovered or keyboard-focused, and not hit until then either, so a tap
          // near the corner picks the block. Touch screens have no hover, so there's no Try without there.
          className="pointer-events-none absolute top-2 right-2 z-[2] rounded-full bg-[oklch(0_0_0/0.35)] px-2.5 py-1 text-[10px] font-extrabold text-on-card opacity-0 backdrop-blur-sm group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100 hover:bg-[oklch(0_0_0/0.5)] focus-visible:outline-2 focus-visible:outline-accent motion-safe:transition-opacity motion-safe:duration-150 [@media(hover:none)]:hidden"
        >
          Try without
        </button>
      )}
      {picked && !quiet && (
        <span aria-hidden="true" className="absolute -top-[7px] -right-[7px] z-[3] flex size-[21px] items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_2px_6px_oklch(0_0_0/0.4)]">
          <CheckIcon />
        </span>
      )}
    </div>
  );
}

function Pill({ pill }: { pill: NonNullable<MapBlock["pill"]> }) {
  return (
    <span className={`inline-block rounded-full px-[9px] py-[3px] text-[10px] font-bold whitespace-nowrap ${pill.due ? "bg-[oklch(0.7_0.14_35/0.55)] motion-safe:animate-due-pulse" : "bg-[oklch(0.8_0.13_80/0.35)]"}`}>{pill.text}</span>
  );
}

/** By category: a category's name and total over its blocks, and what's hovered and focused for its card. A category isn't something to pick. */
function CategoryTile({ box, category, per, pointed, glide }: { box: Box; category: MapCategory<MapBlock>; per: "month" | "year"; pointed: boolean; glide: boolean }) {
  const roomy = box.w > 110 && box.h > 70;
  const value = per12(category.monthly, per);
  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={`${category.label}, ${formatInr(value)} a ${per}`}
      data-map-key={category.key}
      data-pointed={pointed || undefined}
      className={`group absolute rounded-xl p-2.5 text-on-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-active:-translate-y-[3px] ${DIM} ${glide ? GLIDE : STILL}`}
      style={at(box)}
    >
      <span className="flex flex-col [text-shadow:0_1px_8px_oklch(0_0_0/0.45)] motion-safe:animate-tile-in">
        <span className={`truncate font-extrabold ${roomy ? "text-[15px]" : "text-xs"}`}>{category.label}</span>
        {box.h > 46 && (
          <span className={`font-extrabold tabular-nums ${roomy ? "text-xl" : "text-[13px]"}`}>
            <RollingNumber value={value} format="inr" />
          </span>
        )}
      </span>
    </div>
  );
}

/** 7C: what a paused or cancelled one would take up if it started again, dashed in its colour. */
function Ghost({ box, stopped, per, shown, glide }: { box: Box; stopped: SubscriptionsPageView["stopped"][number]; per: "month" | "year"; shown: boolean; glide: boolean }) {
  const roomy = box.w > 90 && box.h > 60;
  return (
    <div
      aria-hidden="true"
      // The first time it appears it springs in from small; after that it grows and shrinks with the layout.
      className={`pointer-events-none absolute flex flex-col justify-between overflow-hidden rounded-xl border-[1.5px] border-dashed text-fg motion-safe:animate-pop ${roomy ? "p-2.5" : "items-center justify-center p-1"} ${shown ? "opacity-100" : "opacity-0"} ${glide ? GLIDE : STILL}`}
      style={{ ...at(box), borderColor: `var(--card-${stopped.color})`, background: `repeating-linear-gradient(135deg, color-mix(in oklch, var(--card-${stopped.color}) 16%, transparent) 0 8px, transparent 8px 16px)` }}
    >
      {roomy ? (
        <>
          <span className="min-w-0">
            <span className="block truncate text-xs font-extrabold">{stopped.alias}</span>
            <span className="block truncate text-[10.5px] font-semibold text-muted">{stopped.ghost}</span>
          </span>
          <span className="text-[13px] font-extrabold whitespace-nowrap tabular-nums">
            +{formatInr(per12(stopped.monthly, per))}
            <span className="text-[10.5px] font-semibold text-muted"> a {per}</span>
          </span>
        </>
      ) : (
        <b className="text-[11px]">{stopped.initial}</b>
      )}
    </div>
  );
}

export function CostMapCard({
  view,
  picked,
  onPick,
  pointed = null,
  onHover,
}: {
  view: SubscriptionsPageView;
  picked: string;
  onPick: (id: string) => void;
  /** 3A, 3B: what a payment or a Charged to row is pointing at, lit while the rest step back. */
  pointed?: ReadonlySet<string> | null;
  /** The block hovered or focused, for the payments it lights; null for none or a category. */
  onHover?: (id: string | null) => void;
}) {
  const [per, setPer] = useState<"month" | "year">("month");
  const [by, setBy] = useState<"each" | "category">("each");
  // 1B: the ones tried without, in the order they were taken out. Never saved.
  const [without, setWithout] = useState<ReadonlySet<string>>(new Set());
  // 7C: the chip being hovered or focused, and the last one, so its ghost can shrink away.
  const [ghost, setGhost] = useState<{ id: string | null; last: string | null }>({ id: null, last: null });
  // The map is laid out at its real size, so a block knows whether there's room for its details.
  const [box, size, measured] = useSize<HTMLDivElement>({ w: 704, h: 520 });
  const card = useRef<HTMLElement>(null);
  // Where keyboard focus goes after Try without or putting one back, since the button pressed goes away.
  const focusNext = useRef<string | null>(null);

  // A subscription that stops being active (paused, or gone after a refresh) leaves the what-if, so
  // it doesn't come back already taken out if it starts again.
  const live = new Set(view.blocks.map((b) => b.id));
  if ([...without].some((id) => !live.has(id))) setWithout(new Set([...without].filter((id) => live.has(id))));
  const out = new Set([...without].filter((id) => live.has(id)));
  const shownBlocks = view.blocks.filter((b) => !out.has(b.id));
  const ghostOn = view.stopped.find((s) => s.id === ghost.id);
  const ghostOf = view.stopped.find((s) => s.id === (ghost.id ?? ghost.last));
  const layout = mapLayout(view.blocks, { by, without: out, ghost: ghostOn ? ghostOn.monthly : null, width: size.w, height: size.h });
  const categories = mapCategories(shownBlocks);
  const shownTotal = shownBlocks.reduce((t, b) => t + b.monthly, 0);
  const line = whatIf(view.blocks, out);
  const grouped = by === "category";

  const blocks = new Map(view.blocks.map((b) => [b.id, b]));
  // Stable, so the hover card only reports a change of block.
  const reportHover = useCallback((key: string | null) => onHover?.(key && view.blocks.some((b) => b.id === key) ? key : null), [onHover, view.blocks]);
  const hoverCategories = new Map<string, HoverCategory>(categories.map((c) => [c.key, { ...c, card: categoryCard(c, shownTotal) }]));
  // A ghost that's going away shrinks to the middle of where it was, while the blocks grow back.
  // It stays mounted after, so it grows from there next time; the first time, it springs in (Ghost).
  const leaving = !ghostOn && ghostOf ? mapLayout(view.blocks, { by, without: out, ghost: ghostOf.monthly, width: size.w, height: size.h }).ghost : null;
  const ghostBox = leaving ? { x: leaving.x + leaving.w / 2, y: leaving.y + leaving.h / 2, w: 0, h: 0 } : layout.ghost;

  // Blocks are drawn biggest first, as the layout puts them, so Tab moves through the map in order.
  const ordered = [...view.blocks].sort((a, b) => b.monthly - a.monthly);

  useEffect(() => {
    const target = focusNext.current;
    if (!target || !card.current) return;
    focusNext.current = null;
    card.current.querySelector<HTMLElement>(target)?.focus();
  });
  const tryWithout = (id: string) => {
    setWithout((s) => new Set([...s, id]));
    focusNext.current = `[data-put-back="${CSS.escape(id)}"]`;
  };
  const putBack = (ids: string[]) => {
    const left = [...out].filter((x) => !ids.includes(x));
    setWithout(new Set(left));
    // The next chip along, or else the block that came back.
    const after = left.find((x) => [...out].indexOf(x) > [...out].indexOf(ids[0]));
    focusNext.current = left.length ? `[data-put-back="${CSS.escape(after ?? left.at(-1)!)}"]` : `[data-map-key="${CSS.escape(ids[0])}"] > button`;
  };
  const showGhost = (id: string | null) => setGhost((g) => ({ id, last: id ?? g.last }));
  const fromPointer = (id: string | null) => (e: PointerEvent) => e.pointerType !== "touch" && showGhost(id);
  // A tap focuses the chip on some phones; only a keyboard focus shows the ghost.
  const fromFocus = (id: string) => (e: FocusEvent<HTMLElement>) => e.currentTarget.matches(":focus-visible") && showGhost(id);

  return (
    <section ref={card} aria-labelledby="cost-map-title" className="relative flex min-w-0 flex-col gap-4 rounded-[22px] border border-surface-line bg-surface p-4 shadow-[var(--card-shadow)] md:p-[22px]">
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

      {/* 1B: what's left without the ones taken out. The live region is always there, so a change is read out, and takes no room. */}
      <p aria-live="polite" className="sr-only">
        {line ? `Without ${line.names}: ${formatInr(line.monthly)} a month, ${formatInr(line.savedYearly)} a year less.` : ""}
      </p>
      {line && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] bg-fill px-3 py-2 text-xs font-semibold text-muted">
            <span>
              Without {line.names}: <b className="font-extrabold text-fg tabular-nums">{formatInr(line.monthly)}</b> a month ·{" "}
              <b className="font-extrabold text-positive tabular-nums">{formatInr(line.savedYearly)} a year less</b>
            </span>
            {[...out].map((id) => (
              <button
                key={id}
                type="button"
                data-put-back={id}
                onClick={() => putBack([id])}
                aria-label={`Put ${blocks.get(id)!.alias} back`}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface py-1 pr-2.5 pl-1 text-[11px] font-extrabold text-fg shadow-[var(--card-shadow)] hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent"
              >
                <Mono mark={blocks.get(id)!} size={16} />
                {blocks.get(id)!.alias}
                <RenewIcon size={10} />
              </button>
            ))}
            <button type="button" onClick={() => putBack([...out])} className="rounded-full px-2 py-1 text-[11px] font-extrabold text-fg underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              Put all back
            </button>
          </div>
      )}

      <CostMapHover blocks={blocks} categories={hoverCategories} per={per} picked={picked} pointing={!!pointed && [...pointed].some((id) => blocks.has(id) && !out.has(id))} onActive={reportHover}>
        <div ref={box} className="relative min-h-[360px] flex-1 md:min-h-[440px]">
          {view.blocks.length === 0 ? (
            <p className="absolute inset-0 flex items-center justify-center rounded-[18px] border-[1.5px] border-dashed border-divider px-6 text-center text-[13px] font-medium text-muted">
              Each active subscription becomes a block here, sized by what it costs.
            </p>
          ) : (
            <>
              {ordered.map((b) =>
                // A ₹0 subscription has no room in the map, so it isn't drawn.
                !layout.boxes.has(b.id) ? null : (
                <Block
                  key={b.id}
                  box={layout.boxes.get(b.id)!}
                  block={b}
                  per={per}
                  picked={picked === b.id}
                  grouped={grouped}
                  gone={out.has(b.id)}
                  pointed={!!pointed?.has(b.id)}
                  glide={measured}
                  onPick={() => onPick(b.id)}
                  onTryWithout={() => tryWithout(b.id)}
                />
              ))}
              {grouped && categories.map((c) => layout.tiles.get(c.key) && <CategoryTile key={c.key} box={layout.tiles.get(c.key)!} category={c} per={per} pointed={c.members.some((m) => pointed?.has(m.id))} glide={measured} />)}
              {/* One ghost element, so moving from one chip to another moves it rather than swapping it. */}
              {ghostOf && ghostBox && <Ghost key="ghost" box={ghostBox} stopped={ghostOf} per={per} shown={!!ghost.id} glide={measured} />}
              {shownBlocks.length === 0 && <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[13px] font-medium text-muted">Every subscription is taken out. Put them back above.</p>}
            </>
          )}
        </div>
      </CostMapHover>

      {/* The category legend belongs to By category: in Each, every block is in its own subscription's colour. */}
      {grouped && categories.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted">
          {categories.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1.5">
              <i aria-hidden="true" className="inline-block size-[9px] rounded-[3px]" style={{ background: `var(--card-${c.color})` }} />
              {c.label}{" "}
              <b className="font-bold text-fg tabular-nums">
                <RollingNumber value={per12(c.monthly, per)} format="inr" />
              </b>
            </span>
          ))}
        </div>
      )}

      {view.stopped.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-divider pt-2.5" onPointerLeave={fromPointer(null)}>
          <span className="text-xs font-medium text-muted">Not in the map:</span>
          {view.stopped.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={picked === s.id}
              aria-label={`${s.alias}, ${s.label}: ${formatInr(per12(s.monthly, per))} a ${per} ${s.ghost}`}
              onClick={() => onPick(s.id)}
              onPointerEnter={fromPointer(s.id)}
              onFocus={fromFocus(s.id)}
              onBlur={() => showGhost(null)}
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
