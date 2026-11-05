"use client";

import { useState } from "react";
import type { GrowthView } from "@/app/fixed-income/widgetsView";
import { WidgetCard } from "../../shell/WidgetCard";
import { useEpfForms } from "../forms/EpfForms";

/** Growth path (J1): where EPF gets to in 5, 10 or 20 years if nothing changes. Arithmetic with two numbers he can change, never a forecast. */
export function GrowthCard({ view }: { view: GrowthView }) {
  const [years, setYears] = useState(10);
  const epf = useEpfForms();
  const step = view.steps.find((s) => s.years === years) ?? view.steps[1];
  return (
    <WidgetCard
      label="Growth path"
      title="Growth path"
      note="where EPF gets to if nothing changes"
      right={
        <div role="group" aria-label="How many years" className="flex rounded-full bg-fill p-[3px]">
          {view.steps.map((s) => (
            <button key={s.years} type="button" aria-pressed={s.years === step.years} onClick={() => setYears(s.years)} className={`min-h-8 rounded-full px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent ${s.years === step.years ? "bg-surface text-accent-text shadow-soft" : "text-muted"}`}>
              {s.years} years
            </button>
          ))}
        </div>
      }
    >
      <div>
        <p className="text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase">
          In {step.years} years ({step.year})
        </p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums">{step.total}</p>
        <p className="mt-1 text-xs font-medium text-muted">EPF alone, if nothing else changes: no raises, and not adjusted for inflation</p>
      </div>
      <div className="flex h-5 overflow-hidden rounded-[6px]" role="img" aria-label={`${step.now} today, ${step.putIn} put in, ${step.interest} interest`}>
        <i className="block bg-[var(--card-sapphire)]" style={{ width: `${step.split[0] * 100}%` }} />
        <i className="block bg-[var(--card-teal)]" style={{ width: `${step.split[1] * 100}%` }} />
        <i className="block bg-[var(--card-amber,#e0a21a)]" style={{ width: `${step.split[2] * 100}%` }} />
      </div>
      <dl className="grid grid-cols-3 gap-3 text-xs">
        {[
          ["Today", step.now, "var(--card-sapphire)", ""],
          ["Put in", step.putIn, "var(--card-teal)", `${view.perCredit} a month`],
          ["Interest", step.interest, "var(--card-amber,#e0a21a)", `${Math.round(step.interestOfGrowth * 100)}% of the growth`],
        ].map(([label, value, color, note]) => (
          <div key={label}>
            <dt className="flex items-center gap-1.5 font-bold text-muted">
              <i aria-hidden="true" className="size-2 rounded-[3px]" style={{ background: color }} />
              {label}
            </dt>
            <dd className="mt-1 text-lg font-extrabold tabular-nums">{value}</dd>
            {note && <dd className="text-[11px] font-medium text-muted">{note}</dd>}
          </div>
        ))}
      </dl>
      {view.extra && <p className="rounded-[14px] bg-fill px-3.5 py-3 text-xs font-semibold">{view.extra}</p>}
      <p className="text-[11px] font-medium text-muted">
        Arithmetic with two numbers you can change: the monthly credit stays {view.perCredit} and the rate stays {view.rate}. Not a forecast: raises, rate changes and withdrawals are left out.{" "}
        <button type="button" onClick={() => epf.open({ kind: "settings" })} className="font-bold text-accent-text underline">
          EPF settings
        </button>
      </p>
    </WidgetCard>
  );
}
