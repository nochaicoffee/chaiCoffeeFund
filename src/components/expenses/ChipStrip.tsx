"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** The hero's row of month chips. On a narrow screen it scrolls sideways, so it starts with the picked month in view. */
export function ChipStrip({ children, className, picked }: { children: ReactNode; className: string; picked: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const strip = ref.current;
    const chip = strip?.querySelector<HTMLElement>('[aria-current="true"]');
    if (strip && chip && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = chip.offsetLeft - strip.clientWidth + chip.offsetWidth + 8;
    // Only when the picked month changes, so a re-render never undoes the reader's own scrolling.
  }, [picked]);
  return (
    <nav ref={ref} aria-label="Months" className={className}>
      {children}
    </nav>
  );
}
