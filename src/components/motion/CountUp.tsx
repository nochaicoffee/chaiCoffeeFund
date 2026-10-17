"use client";

import { useEffect, useRef, useState } from "react";
import { formatPercent } from "@/lib/format/labels";
import { formatInr } from "@/lib/format/money";
import { countAt } from "./countAt";

const FORMATS = { inr: formatInr, percent: (fraction: number) => formatPercent(fraction) } as const;

/**
 * A number that counts from what it showed to its new value, as when the
 * details card switches to another card (#102). The first render shows the
 * value as it is, so the server's HTML and the browser's agree, and the page
 * is complete before anything moves. For reduced motion it changes at once.
 */
export function CountUp({ value, format, duration = 650 }: { value: number; format: keyof typeof FORMATS; duration?: number }) {
  const [shown, setShown] = useState(value);
  // Where the count is now, so a change mid-count carries on from there instead of jumping.
  const current = useRef(value);

  useEffect(() => {
    const from = current.current;
    if (from === value) return;
    const ms = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : duration;
    // Timed from the first frame, so a late first frame still counts rather than landing at the end.
    let started: number | undefined;
    let frame = requestAnimationFrame(function step(now) {
      started ??= now;
      const next = countAt(from, value, now - started, ms);
      current.current = next;
      setShown(next);
      if (next !== value) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{FORMATS[format](shown)}</>;
}
