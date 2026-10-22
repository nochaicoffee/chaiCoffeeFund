"use client";

import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";

/**
 * The details card's coloured header. A soft light follows a mouse or pen
 * across it (#117, C), as on the card tiles, and marks it `data-lit` so the
 * rings inside can spread a little (group-data-lit/head). Its content stays
 * server-rendered.
 */
export function DetailsHeader({ className, style, children }: { className: string; style: CSSProperties; children: ReactNode }) {
  const head = useRef<HTMLDivElement>(null);

  function follow(e: PointerEvent<HTMLDivElement>) {
    const el = head.current;
    if (!el || e.pointerType === "touch") return;
    const box = el.getBoundingClientRect();
    el.style.setProperty("--glare-x", `${((e.clientX - box.left) / box.width) * 100}%`);
    el.style.setProperty("--glare-y", `${((e.clientY - box.top) / box.height) * 100}%`);
    el.dataset.lit = "";
  }

  return (
    <div ref={head} className={`group/head ${className}`} style={style} onPointerMove={follow} onPointerLeave={() => head.current?.removeAttribute("data-lit")}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-[5] rounded-[inherit] opacity-0 mix-blend-soft-light transition-opacity duration-300 [background:radial-gradient(circle_at_var(--glare-x,50%)_var(--glare-y,0%),var(--tile-glare),transparent_55%)] group-data-lit/head:opacity-100"
      />
      {children}
    </div>
  );
}
