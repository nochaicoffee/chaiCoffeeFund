"use client";

import { METHOD_COLORS, METHOD_NAMES } from "@/app/daily/views";
import type { NoteSuggestion } from "@/lib/daily/often";
import { formatInr } from "@/lib/format/money";
import { useDaily } from "./context";

/**
 * The type-ahead under "What it was" (docs/design/daily.md, round 6, Q2): the notes he has used that match what he's typed, each with what he usually
 * paid, how and for what. Choosing one fills those in (the amount only if he hasn't typed one). Tab takes the highlighted one once an arrow key has moved to it; the arrow keys move; Esc closes.
 * Taps use pointerdown so the box doesn't lose focus before the tap lands.
 */
export function NoteSuggest({ id, items, active, onPick }: { id: string; items: NoteSuggestion[]; active: number; onPick: (s: NoteSuggestion) => void }) {
  const daily = useDaily();
  if (items.length === 0) return null;
  const name = (category?: string) => daily.categories.find((c) => c.id === category)?.name ?? "No category";
  const color = (category?: string) => daily.categories.find((c) => c.id === category)?.colorKey ?? "slate";
  return (
    <div className="ta-pop" role="listbox" id={id} aria-label="From your diary">
      <div className="ta-h">From your diary</div>
      {items.map((s, i) => (
        <div key={s.note} role="option" aria-selected={i === active} className={`ta-i${i === active ? " hl" : ""}`} onPointerDown={(e) => { e.preventDefault(); onPick(s); }}>
          <span className="tile s" style={{ ["--cc" as string]: `var(--card-${color(s.category)})` }} aria-hidden="true">
            {name(s.category).slice(0, 1).toUpperCase()}
          </span>
          <span className="ta-n">
            <b>{s.note}</b>
            <small>
              {name(s.category)} · <i className="md" style={{ background: `var(--card-${METHOD_COLORS[s.method]})` }} aria-hidden="true" /> {METHOD_NAMES[s.method]} · {s.count} {s.count === 1 ? "time" : "times"}
            </small>
          </span>
          <span className="ta-a">{formatInr(s.amount)}</span>
        </div>
      ))}
      <div className="ta-f">Tab (after an arrow) or a tap fills the amount, how you paid and the category. You can still change them.</div>
    </div>
  );
}
