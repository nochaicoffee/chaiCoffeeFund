"use client";

import { useMemo, useRef } from "react";
import { METHOD_COLORS, METHOD_NAMES } from "@/app/daily/views";
import { oftenSpends, type OftenSpend } from "@/lib/daily/often";
import { formatDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { useDaily } from "./context";

/**
 * The Often row (docs/design/daily.md, round 6, Q1): the spends he writes the same way again and again, as chips. One tap adds one to the day as it was (same
 * amount, method, category and note), with the toast's Undo. They come from the diary itself, so there is nothing to set up. `card` sits on the dark
 * quick-add card beside the calendar; `bar` scrolls above the phone's pinned quick-add bar. `date` is the day the tap adds to.
 */
export function OftenRow({ variant, date }: { variant: "card" | "bar"; date: string }) {
  const daily = useDaily();
  const often = useMemo(() => oftenSpends(daily.model.spends), [daily.model.spends]);
  // A second tap on the same chip within a moment is ignored, so a double tap doesn't write the spend twice.
  const lastTap = useRef(new Map<string, number>());
  const colorOf = (category?: string) => daily.categories.find((c) => c.id === category)?.colorKey ?? "slate";
  if (often.length === 0) return null;
  const when = date === daily.today ? "today" : formatDate(date);
  const add = (o: OftenSpend, now: number) => {
    const key = [o.note, o.amount, o.method, o.category].join("|");
    if (now - (lastTap.current.get(key) ?? 0) < 1200) return;
    lastTap.current.set(key, now);
    daily.addSpend({ date, amount: o.amount, method: o.method, note: o.note, ...(o.category && { category: o.category }) });
  };
  return (
    <div className={`often often-${variant}`} role="group" aria-label={`Often: tap to add to ${when}`}>
      <p className="often-h">
        <b>Often</b>
        <small>tap to add to {when}</small>
      </p>
      <div className="of-list">
        {often.map((o) => (
          <button key={[o.note, o.amount, o.method, o.category].join("|")} type="button" className="of" onClick={(e) => add(o, e.timeStamp)} aria-label={`Add ${o.note}, ${formatInr(o.amount)}, ${METHOD_NAMES[o.method]}, to ${when}`}>
            <i className="md" style={{ background: `var(--card-${colorOf(o.category)})` }} aria-hidden="true" />
            <b>{o.note}</b>
            <em>{formatInr(o.amount)}</em>
            {o.method !== "UPI" && <i className="md" style={{ background: `var(--card-${METHOD_COLORS[o.method]})` }} title={METHOD_NAMES[o.method]} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
}
