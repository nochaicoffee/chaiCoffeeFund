"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const TIP_ID = "cost-map-card";

/**
 * The map's hover card: hovering or focusing a block shows a light card, like the Cards
 * page's month card (#104), with what it costs against the total, when it renews, where
 * it's charged and what's been paid; a category's tile lists its subscriptions. The card
 * follows the pointer and glides as it goes, or sits over a focused block. Blocks opt in
 * with `data-map-key`; the active one gets `data-active` (it lifts and its rings ripple),
 * and the map gets `data-hovering`, which dims the rest. By category, a category's blocks
 * carry `data-map-owner` with its key, so they light up with its tile. Not on touch, where
 * a tap picks.
 */
export function CostMapHover({
  watch,
  pointing = false,
  onActive,
  renderBlock,
  renderCategory,
  children,
}: {
  /** Anything that changes what the card says without changing which block is active (the A month / A year toggle): the card is placed again when it does. */
  watch?: unknown;
  /** Something outside the map is pointing at some of its blocks (3A, 3B): they stay lit and the rest step back. */
  pointing?: boolean;
  /** The block or category hovered or focused, or null, as it changes. */
  onActive?: (key: string | null) => void;
  /** What the card says for a block's key, or null when the key isn't a block. */
  renderBlock: (key: string) => ReactNode;
  /** What the card says for a category tile's key, or null when the key isn't a category. */
  renderCategory: (key: string) => ReactNode;
  children: ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLElement | null>(null);
  // What carries `aria-describedby`: the focusable control inside the active block, so a screen reader hears the card.
  const described = useRef<HTMLElement | null>(null);
  // The active element's own blocks, By category, lit along with it.
  const owned = useRef<HTMLElement[]>([]);
  // Where the pointer is in the map, or null when a block has keyboard focus.
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const [key, setKey] = useState<string | null>(null);
  // What the card shows: the last block hovered, kept while it fades out so it doesn't empty first.
  const [shown, setShown] = useState<string | null>(null);

  function show(target: EventTarget | null) {
    const el = (target as HTMLElement | null)?.closest<HTMLElement>("[data-map-key]");
    // Over a gap between blocks the card stays as it is, rather than blinking off and on.
    if (!el || !wrap.current?.contains(el)) return place();
    if (active.current !== el) {
      active.current?.removeAttribute("data-active");
      described.current?.removeAttribute("aria-describedby");
      owned.current.forEach((o) => o.removeAttribute("data-active"));
      el.setAttribute("data-active", "");
      described.current = el.matches("button, [tabindex]") ? el : (el.querySelector<HTMLElement>("button, [tabindex]") ?? el);
      described.current.setAttribute("aria-describedby", TIP_ID);
      owned.current = [...wrap.current.querySelectorAll<HTMLElement>(`[data-map-owner="${CSS.escape(el.dataset.mapKey!)}"]`)];
      owned.current.forEach((o) => o.setAttribute("data-active", ""));
      active.current = el;
    }
    wrap.current.dataset.hovering = "";
    setKey(el.dataset.mapKey!);
    setShown(el.dataset.mapKey!);
    place();
  }

  function hide() {
    active.current?.removeAttribute("data-active");
    described.current?.removeAttribute("aria-describedby");
    described.current = null;
    owned.current.forEach((o) => o.removeAttribute("data-active"));
    owned.current = [];
    active.current = null;
    if (wrap.current) delete wrap.current.dataset.hovering;
    setKey(null);
  }

  // Beside the pointer, on whichever side has room; for a focused block, above it or else below it, or over its top edge when neither fits.
  function place() {
    const box = wrap.current, card = tip.current, el = active.current;
    if (!box || !card || !el || card.dataset.key === undefined) return;
    const outer = box.getBoundingClientRect();
    const width = card.offsetWidth, height = card.offsetHeight;
    let x: number, y: number;
    if (pointer.current) {
      const { x: px, y: py } = pointer.current;
      x = px + 18 + width > outer.width ? px - 18 - width : px + 18;
      y = outer.top + py + 18 + height > window.innerHeight - 8 ? py - 18 - height : py + 18;
    } else {
      const target = el.getBoundingClientRect();
      x = target.left - outer.left + target.width / 2 - width / 2;
      if (target.top - height - 10 >= 8) y = target.top - outer.top - height - 10;
      else if (target.bottom + 10 + height <= window.innerHeight - 8) y = target.bottom - outer.top + 10;
      else y = target.top - outer.top + 10;
    }
    x = Math.min(Math.max(x, 0), Math.max(0, outer.width - width));
    // It glides once open; when it opens, it appears where it is.
    const opening = card.dataset.open === undefined;
    if (opening) card.style.transition = "none";
    card.style.setProperty("--x", `${x}px`);
    card.style.setProperty("--y", `${y}px`);
    if (opening) {
      void card.offsetWidth;
      card.style.transition = "";
    }
    card.dataset.open = "";
  }

  // Placed again once its content has rendered, since its size depends on it.
  useLayoutEffect(() => {
    const card = tip.current;
    if (!card) return;
    if (!key) {
      delete card.dataset.open;
      delete card.dataset.key;
      return;
    }
    card.dataset.key = key;
    place();
  }, [key, watch]);

  // The block the card describes can stop being one: tried without, grouped By category (from the
  // keyboard, with the pointer resting on the map), or gone after a refresh. Then the card closes. It
  // checks the element rather than being keyed by the grouping, since remounting the map's box would
  // leave useSize watching the old, detached one.
  useEffect(() => {
    const el = active.current;
    if (el && (!el.isConnected || !el.hasAttribute("data-map-key"))) hide();
  });

  useEffect(() => onActive?.(key), [key, onActive]);

  return (
    <div
      ref={wrap}
      // The map's own hover wins over something pointing at it from outside.
      data-pointing={(pointing && !key) || undefined}
      className="group/map relative flex flex-1 flex-col"
      onPointerMove={(e) => {
        if (e.pointerType === "touch") return;
        const outer = wrap.current!.getBoundingClientRect();
        pointer.current = { x: e.clientX - outer.left, y: e.clientY - outer.top };
        show(e.target);
      }}
      onPointerLeave={(e) => e.pointerType !== "touch" && hide()}
      onFocus={(e) => {
        // Only a keyboard focus places it over the block; a click's focus keeps the pointer's place.
        if (!e.target.matches(":focus-visible")) return;
        pointer.current = null;
        show(e.target);
      }}
      onBlur={(e) => !wrap.current?.contains(e.relatedTarget as Node | null) && hide()}
      onKeyDown={(e) => e.key === "Escape" && hide()}
    >
      {children}
      <div
        ref={tip}
        id={TIP_ID}
        role="tooltip"
        aria-hidden={!key}
        className="pointer-events-none absolute top-0 left-0 z-20 w-[264px] rounded-[16px] border border-surface-line bg-surface p-3.5 text-fg opacity-0 shadow-pop [transform:translate(var(--x,0px),var(--y,0px))_scale(0.96)] data-open:opacity-100 data-open:[transform:translate(var(--x,0px),var(--y,0px))] motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out"
      >
        {shown && renderBlock(shown)}
        {shown && renderCategory(shown)}
      </div>
    </div>
  );
}
