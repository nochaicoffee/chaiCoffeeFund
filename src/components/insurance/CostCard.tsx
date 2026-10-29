"use client";

import type { CostView } from "@/app/insurance/widgetsView";
import { WidgetCard } from "../shell/WidgetCard";
import { TileMark } from "./parts";

const GRID = "grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-x-3";

/** What cover costs (InsFinal): a year of each policy as a share of the whole, and against the cover it buys. */
export function CostCard({ view }: { view: CostView }) {
  return (
    <WidgetCard label="What cover costs" title="What cover costs" note="a year of each policy against the cover it buys" gap="gap-4" right={<span className="rounded-full bg-fill px-2.5 py-1 text-[11px] font-extrabold">Worked out</span>}>
      <div className="flex flex-col gap-2">
        <div className="flex h-3.5 gap-0.5" aria-hidden="true">
          {view.rows.map((r) => (
            <span key={r.id} className="rounded-md" style={{ width: `${r.share * 100}%`, background: `var(--card-${r.colorKey})` }} />
          ))}
        </div>
        <div className="flex justify-between text-[11.5px] font-semibold text-muted">
          <span>{view.yearText}</span>
          <span>{view.monthText}</span>
        </div>
      </div>
      <div className="min-w-0 overflow-x-auto">
        <div className="min-w-[420px]">
          <div className={`${GRID} pb-1.5 text-[10.5px] font-extrabold tracking-[0.05em] text-muted uppercase`} aria-hidden="true">
            <span>Policy</span>
            <span>A year</span>
            <span>Cover</span>
            <span className="text-right">A year ÷ cover</span>
          </div>
          <ul>
            {view.rows.map((r) => (
              <li key={r.id} className={`${GRID} items-center border-t border-divider py-2.5 text-[13px] font-bold`}>
                <span className="flex min-w-0 items-center gap-2">
                  <TileMark icon={r.icon} colorKey={r.colorKey} size={24} />
                  <b className="truncate text-[12.5px] font-extrabold">{r.name}</b>
                </span>
                <span className="tabular-nums">{r.year}</span>
                <span className="tabular-nums">{r.cover}</span>
                <b className="text-right font-extrabold tabular-nums">{r.rate}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-auto border-t border-divider pt-3 text-xs font-semibold text-muted">{view.note}</p>
    </WidgetCard>
  );
}
