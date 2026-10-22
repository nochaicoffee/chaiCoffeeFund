"use client";

import type { ComponentProps, PointerEvent } from "react";

/**
 * The card tile row. A tile marked `data-tilt` tilts towards the pointer, with
 * a light that follows it (#102): the tile reads --tilt-x, --tilt-y, --glare-x
 * and --glare-y, and `data-tilting` while the pointer is on it. Mouse and pen
 * only, and not for reduced motion.
 */
export function CardRow({ children, ...props }: ComponentProps<"div">) {
  function tile(event: PointerEvent<HTMLDivElement>) {
    return (event.target as HTMLElement).closest<HTMLElement>("[data-tilt]");
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = tile(event);
    if (!el || event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = el.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    el.dataset.tilting = "";
    el.style.setProperty("--tilt-x", `${((0.5 - y) * 10).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${((x - 0.5) * 12).toFixed(2)}deg`);
    el.style.setProperty("--glare-x", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--glare-y", `${(y * 100).toFixed(1)}%`);
  }

  function onPointerOut(event: PointerEvent<HTMLDivElement>) {
    const el = tile(event);
    // Moving onto something inside the same tile isn't leaving it.
    if (!el || el.contains(event.relatedTarget as Node | null)) return;
    delete el.dataset.tilting;
    for (const name of ["--tilt-x", "--tilt-y", "--glare-x", "--glare-y"]) el.style.removeProperty(name);
  }

  return (
    <div {...props} onPointerMove={onPointerMove} onPointerOut={onPointerOut}>
      {children}
    </div>
  );
}
