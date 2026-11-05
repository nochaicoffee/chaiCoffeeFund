"use client";

import type { InterestView } from "@/app/fixed-income/widgetsView";
import { WidgetCard } from "../../shell/WidgetCard";
import { useEpfForms } from "../forms/EpfForms";

/** The year's interest arriving against its estimate (FiStates D): what the rule said, what EPFO credited and the difference, never hidden; and the rate in use. */
export function InterestCard({ view }: { view: InterestView }) {
  const epf = useEpfForms();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-12">
      <div className="xl:col-span-7">
        <WidgetCard label="The year's interest" title="The year's interest" note={`FY ${view.financialYear}`}>
          <dl className="grid grid-cols-3 gap-2.5 max-md:grid-cols-1">
            {view.tiles.map((t) => (
              <div key={t.label} className="rounded-[14px] bg-fill p-3.5">
                <dt className="text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase">{t.label}</dt>
                <dd className="mt-1 text-xl font-extrabold tabular-nums">{t.value}</dd>
                <dd className="mt-0.5 text-[11px] font-medium text-muted">{t.note}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[11px] font-medium text-muted">{view.note}</p>
        </WidgetCard>
      </div>
      <div className="xl:col-span-5">
        <WidgetCard label="EPF settings" title="EPF settings" note="what the estimates use">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase">Rate for this year</p>
            <p className="mt-1 text-2xl font-extrabold">{view.rate.value}</p>
            <p className="mt-1 text-xs font-medium text-muted">{view.rate.note}</p>
          </div>
          <div>
            <button type="button" onClick={() => epf.open({ kind: "settings" })} className="min-h-9 rounded-full bg-fill px-4 text-xs font-bold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent">
              EPF settings
            </button>
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}
