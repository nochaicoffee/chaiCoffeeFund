"use client";

import { useState } from "react";
import type { RunwayView } from "@/app/insurance/widgetsView";
import { formatInr, formatInrCompact } from "@/lib/format/money";
import { niceTop } from "../income/chartScale";
import { WidgetCard } from "../shell/WidgetCard";
import { Tip, TipBody } from "../shell/Tip";
import { Segmented } from "../subscriptions/Segmented";

const CHART = 190;

/**
 * Premium runway (InsFinal): what leaves each month, stacked by policy. Money that left is solid, a renewal still to come at the
 * last premium is a dashed outline, and a premium paid once for three years is one tall bar. The dashed line is a year of cover
 * spread evenly. Each month has a hover card; the switch shows the whole span or the next twelve months.
 */
export function RunwayCard({ view }: { view: RunwayView }) {
  const [range, setRange] = useState<"all" | "next">("all");
  const { months, top: rawTop } = view.ranges[range];
  const top = niceTop(Math.max(rawTop, view.monthly));
  const ticks = [top / 4, top / 2, (3 * top) / 4, top];
  const n = months.length;
  const lineAt = (view.monthly / top) * CHART;
  const nowAt = months.findIndex((m) => m.now);
  return (
    <WidgetCard
      label="Premium runway"
      title="Premium runway"
      note="what leaves, month by month · hover a month"
      right={<Segmented label="Span" options={[{ value: "all", label: view.allLabel }, { value: "next", label: "Next 12" }]} value={range} onChange={setRange} small />}
    >
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] font-semibold text-muted" aria-hidden="true">
        {view.legend.map((l) => (
          <span key={l.id} className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-[3px]" style={{ background: `var(--card-${l.colorKey})` }} />
            {l.name}
          </span>
        ))}
        <span className="ml-auto inline-flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-extrabold whitespace-nowrap text-on-ink">{view.monthlyText}</span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-[3px] bg-fg/70" />
            Paid
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-[3px] border-[1.5px] border-dashed border-fg/60" />
            To come, at the last premium
          </span>
        </span>
      </div>
      <div className="relative flex-1" style={{ minHeight: CHART + 52 }}>
        {ticks.map((t) => (
          <div key={t} aria-hidden="true" className="absolute right-0 left-10 border-t border-dashed border-divider" style={{ bottom: (t / top) * CHART + 28 }}>
            <span className="absolute -top-2.5 -left-10 w-9 text-right text-[10px] font-bold text-muted">{formatInrCompact(t)}</span>
          </div>
        ))}
        <div aria-hidden="true" className="absolute right-0 left-10 border-t-[1.5px] border-dashed border-fg/70" style={{ bottom: lineAt + 28 }} />
        <div className="absolute top-0 right-0 bottom-7 left-10 flex items-end">
          {months.map((m, k) => {
            // The card is 270 wide, so on a phone only the middle columns can centre it.
            const tipAlign = k / n > 0.65 ? "right" : k / n < 0.35 ? "left" : "center";
            const body = m.items.length ? (
              <TipBody
                head={m.label}
                aside={<span className={m.items.every((i) => i.paid) ? "text-positive" : "text-warning-text"}>{m.items.every((i) => i.paid) ? "paid" : "to come"}</span>}
                total={formatInr(m.total)}
                detail={m.items.length > 1 ? `${m.items.length} premiums` : m.items[0].name}
                rows={m.items.map((i) => ({ name: `${i.name} · ${i.on}${i.note ? ` · ${i.note}` : ""}`, amount: formatInr(i.amount), mark: <i aria-hidden="true" className="size-2 shrink-0 rounded-[3px]" style={{ background: `var(--card-${i.colorKey})` }} /> }))}
                foot={m.items.some((i) => !i.paid) ? "At the last premium, until the insurer's quote is entered" : undefined}
              />
            ) : null;
            const column = (
              <span className="relative flex h-full w-full flex-col-reverse items-center justify-start gap-px">
                {m.items.map((i) => (
                  <i
                    key={`${i.policyId}-${i.on}`}
                    className="block w-[64%] max-w-[26px] rounded-[4px]"
                    style={{ height: Math.max(3, (i.amount / top) * CHART - 1), background: i.paid ? `var(--card-${i.colorKey})` : `color-mix(in oklch, var(--card-${i.colorKey}) 26%, white)`, border: i.paid ? undefined : `1.5px dashed var(--card-${i.colorKey})` }}
                  />
                ))}
                {m.total > 0 && n <= 24 && (
                  <b className="absolute text-[10px] font-extrabold whitespace-nowrap" style={{ bottom: (m.total / top) * CHART + 3 }}>
                    {formatInrCompact(m.total)}
                  </b>
                )}
              </span>
            );
            return (
              <span key={m.key} className="relative flex h-full min-w-0 flex-1">
                {body ? (
                  <Tip className="flex h-full w-full" align={tipAlign} width={270} label={`${m.label}: ${formatInr(m.total)}`} card={body}>
                    {column}
                  </Tip>
                ) : (
                  column
                )}
              </span>
            );
          })}
        </div>
        {nowAt >= 0 && (
          <div aria-hidden="true" className="absolute top-0 bottom-7 border-l-[1.5px] border-dashed border-muted" style={{ left: `calc(40px + (100% - 40px) * ${(nowAt + view.monthShare) / n})` }}>
            <span className="absolute -top-1 left-1.5 rounded-full border border-surface-line bg-surface px-2 py-0.5 text-[10.5px] font-extrabold whitespace-nowrap shadow-soft">Today</span>
          </div>
        )}
        <div aria-hidden="true" className="absolute right-0 bottom-0 left-10 flex h-7 text-[10.5px] font-extrabold text-muted">
          {months.map((m) => (
            <span key={m.key} className={`relative min-w-0 flex-1 text-center ${Number(m.key.slice(5)) % 3 === 1 ? "" : "max-sm:invisible"}`}>
              {m.letter}
              {m.year && <span className="absolute top-3.5 left-0 text-[10.5px] whitespace-nowrap text-muted">{m.year}</span>}
            </span>
          ))}
        </div>
      </div>
      <p className="border-t border-divider pt-3 text-xs font-semibold text-muted">{view.note}</p>
    </WidgetCard>
  );
}
