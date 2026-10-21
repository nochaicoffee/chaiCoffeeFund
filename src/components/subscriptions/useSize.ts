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
  // Whether it's been measured, and laid out at that size, yet: until then the size is only the
  // fallback, so a chart can hold its transitions back rather than animate from the fallback's layout.
  const [measured, setMeasured] = useState(false);
  const sizedTo = useRef<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      sizedTo.current = { w: el.clientWidth, h: el.clientHeight };
      setSize(sizedTo.current);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // Measured only once a render at the real size has been committed: reading a layout value then
  // makes the browser settle its styles there, so a transition switched on next starts from the
  // real layout. Turned on in the same render as the size, it ran from the fallback's (#145 review).
  useLayoutEffect(() => {
    const real = sizedTo.current;
    if (measured || !real || real.w !== size.w || real.h !== size.h) return;
    void ref.current?.offsetWidth;
    setMeasured(true);
  }, [measured, size.w, size.h]);
  return [ref, size, measured] as const;
}
