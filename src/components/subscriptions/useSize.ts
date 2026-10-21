"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * An element's size, kept up to date as it resizes, for charts drawn at their real size
 * so their text stays readable. Starts from `fallback`, which is also what the server
 * renders, until the element is measured.
 */
export function useSize<T extends HTMLElement>(fallback: { w: number; h: number }) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(fallback);
  // Whether it's been measured yet: until then the size is only the fallback, so a chart
  // can hold its transitions back rather than animate from the fallback's layout.
  const [measured, setMeasured] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
      setMeasured(true);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size, measured] as const;
}
