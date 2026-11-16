"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * The month card the heatmaps share (#104, and the Overview's Month by month): hovering, focusing or tapping a month opens one light card
 * over it, which glides from cell to cell rather than reappearing. Cells opt in with `data-month`; the active one gets `data-active`, which
 * lifts it and ripples its rings. `resolve` says what the cell is (null for a cell with nothing to show) and `render` draws the card's
 * content for it, so each page keeps its own words and figures.
 */
export function MonthCardHover({
  resolve,
  render,
  children,
}: {
  /** The key for a cell, or null when it has no card. */
  resolve: (cell: HTMLElement) => string | null;
  render: (key: string) => ReactNode;
  children: ReactNode;
}) {
  const tipId = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLElement | null>(null);
  const [key, setKey] = useState<string | null>(null);

  function show(target: EventTarget | null) {
    const cell = (target as HTMLElement | null)?.closest<HTMLElement>("[data-month]");
    if (!cell || !wrap.current?.contains(cell)) return;
    const next = resolve(cell);
    if (next === null) return;
    if (active.current !== cell) {
      active.current?.removeAttribute("data-active");
      active.current?.removeAttribute("aria-describedby");
      cell.setAttribute("data-active", "");
      cell.setAttribute("aria-describedby", tipId);
      active.current = cell;
    }
    setKey(next);
  }

  function hide() {
    active.current?.removeAttribute("data-active");
    active.current?.removeAttribute("aria-describedby");
    active.current = null;
    setKey(null);
  }

  // Placed after its content renders, so its own size is known: above the cell, or below it near the top of the window.
  useLayoutEffect(() => {
    const box = wrap.current, card = tip.current, cell = active.current;
    if (!box || !card) return;
    if (!key || !cell) {
      delete card.dataset.open;
      return;
    }
    const outer = box.getBoundingClientRect(), target = cell.getBoundingClientRect();
    const width = card.offsetWidth, height = card.offsetHeight;
    const centre = target.left - outer.left + target.width / 2;
    const x = Math.min(Math.max(centre - width / 2, 0), Math.max(0, outer.width - width));
    const below = target.top - height - 12 < 8;
    const y = below ? target.bottom - outer.top + 12 : target.top - outer.top - height - 12;
    // It glides between cells once open; when it opens, it appears where it is.
    const opening = card.dataset.open === undefined;
    if (opening) card.style.transition = "none";
    card.style.setProperty("--x", `${x}px`);
    card.style.setProperty("--y", `${y}px`);
    card.style.setProperty("--arrow", `${Math.min(Math.max(centre - x, 16), width - 16)}px`);
    card.dataset.below = String(below);
    if (opening) {
      void card.offsetWidth;
      card.style.transition = "";
    }
    card.dataset.open = "";
  }, [key]);

  return (
    <div
      ref={wrap}
      className="relative"
      onPointerOver={(e) => e.pointerType !== "touch" && show(e.target)}
      onPointerDown={(e) => e.pointerType === "touch" && show(e.target)}
      onPointerLeave={(e) => e.pointerType !== "touch" && hide()}
      onFocus={(e) => show(e.target)}
      onBlur={(e) => !wrap.current?.contains(e.relatedTarget as Node | null) && hide()}
      onKeyDown={(e) => e.key === "Escape" && hide()}
      onScrollCapture={hide}
    >
      {children}
      <div
        ref={tip}
        id={tipId}
        role="tooltip"
        className="pointer-events-none absolute top-0 left-0 z-20 w-[256px] rounded-[16px] border border-surface-line bg-surface p-3.5 text-fg opacity-0 shadow-pop [transform:translate(var(--x,0px),var(--y,0px))_scale(0.96)] data-open:opacity-100 data-open:[transform:translate(var(--x,0px),var(--y,0px))] motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out"
      >
        {key && render(key)}
        {/* Its two outer sides carry the card's edge round the point: bottom and right when the card is above the cell, top and left when it's below. */}
        <span
          aria-hidden="true"
          className="absolute -bottom-1.5 left-[var(--arrow,50%)] size-3 -translate-x-1/2 rotate-45 rounded-[2px] border-r border-b border-surface-line bg-surface in-data-[below=true]:top-[-6px] in-data-[below=true]:bottom-auto in-data-[below=true]:border-r-0 in-data-[below=true]:border-b-0 in-data-[below=true]:border-t in-data-[below=true]:border-l"
        />
      </div>
    </div>
  );
}
