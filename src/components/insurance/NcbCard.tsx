"use client";

import type { NcbView } from "@/app/insurance/widgetsView";
import { WidgetCard } from "../shell/WidgetCard";
import { TileMark } from "./parts";

/** The no-claim bonus (InsFinal): a ladder for each motor policy, with the step it's on and the step it moves to at renewal. */
export function NcbCard({ view }: { view: NcbView }) {
  return (
    <WidgetCard label="No-claim bonus" title="No-claim bonus" note="the discount on the own-damage premium" gap="gap-4" right={<span className="rounded-full bg-fill px-2.5 py-1 text-[11px] font-extrabold">From each term</span>}>
      <div className="flex flex-1 flex-col justify-around gap-5">
        {view.rows.map((r) => (
          <div key={r.id} className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="flex items-center gap-2.5">
                <TileMark icon={r.icon} colorKey={r.colorKey} size={26} />
                <b className="text-[13.5px] font-extrabold">{r.name}</b>
              </span>
              <span className="text-xs font-bold text-muted">{r.text}</span>
            </div>
            <ol className="flex items-center py-1" aria-label={`${r.name}: ${r.text}`}>
              {r.steps.map((s, k) => (
                <li key={s.pct} className={`relative flex flex-1 flex-col items-center gap-1.5 text-[11px] font-extrabold ${s.state === "now" ? "text-fg" : "text-muted"}`}>
                  {k > 0 && <span aria-hidden="true" className="absolute top-[7px] right-1/2 left-[-50%] h-[3px]" style={{ background: s.state === "done" || s.state === "now" ? `var(--card-${r.colorKey})` : s.state === "next" ? `repeating-linear-gradient(90deg, var(--card-${r.colorKey}) 0 4px, transparent 4px 8px)` : "var(--fill-strong)" }} />}
                  <i
                    aria-hidden="true"
                    className="relative z-10 size-3.5 rounded-full"
                    style={{
                      background: s.state === "done" || s.state === "now" ? `var(--card-${r.colorKey})` : s.state === "next" ? "var(--surface)" : "var(--fill-strong)",
                      boxShadow: s.state === "now" ? `0 0 0 4px color-mix(in oklch, var(--card-${r.colorKey}) 28%, transparent)` : s.state === "next" ? `inset 0 0 0 2px var(--card-${r.colorKey})` : undefined,
                    }}
                  />
                  {s.pct}%
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <p className="border-t border-divider pt-3 text-xs font-semibold text-muted">{view.note}</p>
    </WidgetCard>
  );
}
