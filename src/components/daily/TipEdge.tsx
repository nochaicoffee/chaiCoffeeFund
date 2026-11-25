"use client";

import { useEffect } from "react";
import { tipShift } from "@/lib/daily/tipEdge";

/** Slides the hover card of whatever bar is pointed at or focused so it stays on the screen. The card is placed by CSS (centred, or at an end for a row's first and last bar), which can't know where the bar is on the screen; this adds the sideways nudge as `--dx`. The card is always laid out (just see-through), so the browser already knows its width. */
export function TipEdge() {
  useEffect(() => {
    function place(event: Event) {
      const el = (event.target as Element | null)?.closest?.<HTMLElement>("[data-tip]");
      if (!el || !el.closest(".dy")) return;
      // Moving between a bar's own parts (its fill, its tick) is still the same bar.
      const from = (event as PointerEvent).relatedTarget;
      if (from instanceof Node && el.contains(from)) return;
      const style = getComputedStyle(el);
      const box = (style.position === "static" ? el.offsetParent : el)?.getBoundingClientRect();
      const tl = parseFloat(style.getPropertyValue("--tl")) / 100;
      const tx = parseFloat(style.getPropertyValue("--tx")) / 100;
      const tipWidth = parseFloat(getComputedStyle(el, "::after").width);
      if (!box || Number.isNaN(tl + tx + tipWidth)) return;
      const shift = tipShift({ baseLeft: box.left, baseWidth: box.width, tl, tx, tipWidth, viewport: document.documentElement.clientWidth });
      el.style.setProperty("--dx", `${Math.round(shift)}px`);
    }
    document.addEventListener("pointerover", place);
    document.addEventListener("focusin", place);
    return () => {
      document.removeEventListener("pointerover", place);
      document.removeEventListener("focusin", place);
    };
  }, []);
  return null;
}
