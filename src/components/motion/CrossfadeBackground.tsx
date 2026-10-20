"use client";

import { useState } from "react";

/**
 * When an element's background changes, as the details card's colour does
 * when another card is selected (#102), this fades the old background out over
 * the new one. Put it first inside an element with `relative isolate` that has
 * the new background itself. Nothing shows for reduced motion, or before the
 * first change.
 */
export function CrossfadeBackground({ background }: { background: string }) {
  const [current, setCurrent] = useState(background);
  const [previous, setPrevious] = useState<string | null>(null);
  // Adjusting state while rendering, as React suggests for "state from a changed prop".
  if (background !== current) {
    setPrevious(current);
    setCurrent(background);
  }
  if (!previous) return null;
  return (
    <span
      key={previous}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-20 rounded-[inherit] motion-safe:animate-fade-out motion-reduce:hidden"
      style={{ background: previous }}
      onAnimationEnd={() => setPrevious(null)}
    />
  );
}
