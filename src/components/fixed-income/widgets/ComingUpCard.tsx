"use client";

import { useState } from "react";
import type { ComingUpRow } from "@/app/fixed-income/widgetsView";
import { WidgetCard } from "../../shell/WidgetCard";

const SHOWN = 5;

/** Coming up (J1): the next dates, the next credit and the year's end among them, and each deposit's maturity. */
export function ComingUpCard({ items, note }: { items: ComingUpRow[]; note: string | null }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, SHOWN);
  return (
    <WidgetCard
      label="Coming up"
      title="Coming up"
      note="the next dates"
      right={
        items.length > SHOWN && (
          <button type="button" aria-expanded={all} onClick={() => setAll(!all)} className="text-xs font-extrabold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            {all ? "Fewer dates" : "All dates"} →
          </button>
        )
      }
    >
      <ul className="flex flex-col">
        {shown.map((i) => (
          <li key={i.key} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-t border-divider py-3 first:border-t-0 first:pt-0">
            <span aria-hidden="true" className="flex h-12 flex-col items-center justify-center rounded-[12px] bg-fill leading-none">
              <b className="text-lg font-extrabold tabular-nums">{i.day}</b>
              <small className="mt-0.5 text-[9px] font-extrabold tracking-[0.06em] text-muted">{i.month}</small>
            </span>
            <span className="min-w-0">
              <b className="block truncate text-[13px] font-extrabold">{i.title}</b>
              <span className="block truncate text-[11px] font-medium text-muted">{i.note}</span>
            </span>
            <span className="text-right text-[13px] tabular-nums">
              <b className="block font-extrabold">{i.amount}</b>
              <span className={`block text-[11px] font-medium ${i.late ? "font-extrabold text-warning-text" : "text-muted"}`}>{i.when}</span>
            </span>
          </li>
        ))}
      </ul>
      {note && <p className="text-[11px] font-medium text-muted">{note}</p>}
    </WidgetCard>
  );
}
