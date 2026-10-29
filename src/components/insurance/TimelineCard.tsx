"use client";

import type { TimelineView } from "@/app/insurance/widgetsView";
import { WidgetCard } from "../shell/WidgetCard";
import { Tip, TipBody } from "../shell/Tip";
import { TileMark } from "./parts";

const LABEL = 150;

/**
 * The cover timeline (InsFinal): every policy's terms on one axis, so a three-year premium reads as one long bar and a gap between
 * terms shows as empty track. The line at the end of a bar is the renewal day; a dashed line is today. Each bar has a hover card.
 */
export function TimelineCard({ view, pickId, onPick }: { view: TimelineView; pickId: string; onPick: (id: string) => void }) {
  return (
    <WidgetCard label="Cover timeline" title="Cover timeline" note="when each policy covers you · hover a bar">
      {view.rows.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-10 text-sm font-semibold text-muted">No term is recorded yet.</p>
      ) : (
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="relative flex min-w-[560px] flex-col justify-center gap-0.5">
            <div className="relative h-5" style={{ marginLeft: LABEL + 12 }} aria-hidden="true">
              {view.years.map((y) => (
                <span key={y.label} className="absolute top-0 text-[11px] font-extrabold text-muted" style={{ left: `${y.left}%` }}>
                  {y.label}
                </span>
              ))}
            </div>
            {view.rows.map((r) => (
              <div key={r.id} className={`grid items-center gap-3 motion-safe:transition-opacity ${pickId !== "all" && pickId !== r.id ? "opacity-40" : ""}`} style={{ gridTemplateColumns: `${LABEL}px minmax(0,1fr)`, height: 46 }}>
                <button type="button" onClick={() => onPick(r.id)} aria-pressed={pickId === r.id} className="flex min-w-0 items-center gap-2 text-left text-[12.5px] font-extrabold focus-visible:outline-2 focus-visible:outline-accent">
                  <TileMark icon={r.icon} colorKey={r.colorKey} size={26} />
                  <span className="truncate">{r.name}</span>
                </button>
                <div className="relative h-full">
                  {r.bars.map((b) => (
                    // Each bar is placed by its own wrapper: `Tip` is `relative`, so it can't also be the absolutely placed element.
                    <div key={b.key} className="absolute top-[9px] h-7" style={{ left: `${b.left}%`, width: `${b.width}%` }}>
                      <Tip
                        className="block h-7 w-full"
                        align={b.left > 60 ? "right" : "left"}
                        width={270}
                        label={`${r.name}: ${b.label}`}
                        card={<TipBody head={b.tip.head} total={b.tip.total} detail={b.tip.detail} rows={b.tip.rows} foot={b.tip.foot} />}
                      >
                        <span className={`flex h-7 items-center overflow-hidden rounded-[9px] px-2.5 text-[11px] font-extrabold whitespace-nowrap text-on-card ${r.off ? "opacity-50" : ""}`} style={{ background: `linear-gradient(90deg, var(--card-${r.colorKey}-from), var(--card-${r.colorKey}-to))` }}>
                          {b.label}
                        </span>
                        <i aria-hidden="true" className="absolute -top-[5px] -right-px -bottom-[5px] border-l-2" style={{ borderColor: `var(--card-${r.colorKey})` }} />
                      </Tip>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div aria-hidden="true" className="pointer-events-none absolute top-0 bottom-0 border-l-2 border-dashed border-fg/50" style={{ left: `calc(${LABEL + 12}px + (100% - ${LABEL + 12}px) * ${view.nowAt / 100})` }}>
              <span className="absolute top-[-2px] left-1.5 rounded-full border border-surface-line bg-surface px-2.5 py-0.5 text-[11px] font-extrabold shadow-soft">Today</span>
            </div>
          </div>
        </div>
      )}
      <p className="border-t border-divider pt-3 text-xs font-semibold text-muted">{view.note}</p>
    </WidgetCard>
  );
}
