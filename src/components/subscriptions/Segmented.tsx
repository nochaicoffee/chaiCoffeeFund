"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * The segmented toggle the design uses for Payments / Price history, the map's views and
 * the chart's. Its white pill slides to the chosen option with a small spring (Prathik's
 * pick 7D) instead of jumping. Until it's been measured, and on the server, the chosen
 * button carries the pill itself, so the page is right before anything moves.
 */
export function Segmented<T extends string>({ label, options, value, onChange, small = false }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; small?: boolean }) {
  const group = useRef<HTMLSpanElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  // Measured again whenever the choice changes or the toggle resizes (a font loading, the page reflowing).
  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    const measure = () => {
      const chosen = root.querySelector<HTMLElement>('[aria-checked="true"]');
      // Hidden (a phone-only or desktop-only toggle), it has no pill, so it mounts at its size when shown rather than growing from nothing.
      setPill(chosen && chosen.offsetWidth > 0 ? { left: chosen.offsetLeft, width: chosen.offsetWidth } : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [value]);

  return (
    // Clipped, so the spring's overshoot stays inside the track; a button's focus ring fits in the padding.
    <span ref={group} role="radiogroup" aria-label={label} className="relative inline-flex gap-0.5 overflow-hidden rounded-full bg-fill p-[3px]">
      {pill && (
        <span
          aria-hidden="true"
          className="absolute top-[3px] bottom-[3px] rounded-full bg-surface shadow-[0_1px_3px_oklch(0_0_0/0.14)] motion-safe:transition-[left,width] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`relative inline-flex items-center rounded-full font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent motion-safe:transition-colors motion-safe:duration-200 ${small ? "px-2.5 py-1.5 text-[11.5px]" : "px-[13px] py-1.5 text-xs"} ${
            o.value === value ? `text-accent-text ${pill ? "" : "bg-surface shadow-[0_1px_3px_oklch(0_0_0/0.14)]"}` : "text-muted hover:text-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}
