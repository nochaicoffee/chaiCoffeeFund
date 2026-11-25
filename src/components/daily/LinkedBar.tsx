"use client";

import { useState, type CSSProperties } from "react";

interface Part {
  name: string;
  /** Its share of the bar, 0 to 100. */
  width: number;
  colorKey: string;
  tip: string;
}
interface LegendItem {
  name: string;
  percent: string;
  colorKey: string;
}

/**
 * A bar made of parts with its legend under it (Top category, How you paid). Pointing at a part, or at its name in the legend, lifts that part and
 * softens the rest, and a tap or Tab does the same; the part's hover card says what it is. The legend can name fewer parts than the bar has.
 */
export function LinkedBar({ parts, legend }: { parts: Part[]; legend: LegendItem[] }) {
  const [active, setActive] = useState<string | null>(null);
  const on = (name: string) => ({
    onMouseEnter: () => setActive(name),
    onMouseLeave: () => setActive((a) => (a === name ? null : a)),
    onFocus: () => setActive(name),
    onBlur: () => setActive((a) => (a === name ? null : a)),
  });
  // The legend only follows the pointer: the segments are the tab stops, so a keyboard user gets each part once.
  const hover = (name: string) => ({ onMouseEnter: on(name).onMouseEnter, onMouseLeave: on(name).onMouseLeave });
  return (
    <div className={`sp2${active ? " has-active" : ""}`}>
      <span className="sp2-b">
        {parts.map((s, i) => (
          <i
            key={s.name}
            role="img"
            tabIndex={0}
            aria-label={s.tip}
            data-tip={s.tip}
            className={active === s.name ? "act" : ""}
            style={{ width: `${s.width}%`, backgroundColor: `var(--card-${s.colorKey})`, "--i": i } as CSSProperties}
            {...on(s.name)}
          />
        ))}
      </span>
      <span className="sp2-l">
        {legend.map((l) => (
          <span key={l.name} className={active === l.name ? "act" : ""} {...hover(l.name)}>
            <i className="md" style={{ background: `var(--card-${l.colorKey})` }} />
            {l.name} <b>{l.percent}</b>
          </span>
        ))}
      </span>
    </div>
  );
}
