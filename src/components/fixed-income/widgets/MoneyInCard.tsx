"use client";

import type { MoneyInView } from "@/app/fixed-income/widgetsView";
import { WidgetCard } from "../../shell/WidgetCard";
import { useDepositForms } from "../forms/DepositForms";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TIER = ["", "bg-heat-2 text-heat-ink", "bg-heat-3 text-heat-ink", "bg-heat-5 text-on-accent"];

/** Money in each month (J1): a grid of what went into EPF and the deposits, a dot where a deposit was placed, and three figures beside it. */
export function MoneyInCard({ view }: { view: MoneyInView }) {
  const deposits = useDepositForms();
  return (
    <WidgetCard
      label="Money in each month"
      title="Money in each month"
      note="what went into EPF and the deposits, month by month"
      right={
        <button type="button" onClick={() => deposits.open({ kind: "add" })} className="text-xs font-extrabold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          Add a deposit →
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="grid grid-cols-[34px_repeat(12,minmax(0,1fr))] gap-1.5 text-[10px] font-bold text-muted" aria-hidden="true">
            <span />
            {MONTHS.map((m) => (
              <span key={m} className="text-center uppercase max-md:hidden">
                {m}
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {view.years.map((y) => (
              <div key={y.year} role="group" aria-label={y.year} className="grid grid-cols-[34px_repeat(12,minmax(0,1fr))] items-center gap-1.5">
                <span className="text-[11px] font-bold text-muted">{y.year}</span>
                {y.cells.map((c) => (
                  <span
                    key={c.month}
                    title={c.title}
                    {...(c.title ? { role: "img", "aria-label": c.title } : {})}
                    className={`relative flex h-9 items-center justify-center rounded-[8px] text-[10.5px] font-extrabold tabular-nums max-md:h-7 max-md:text-[9px] ${c.blank ? "bg-heat-no-data" : c.tier === 0 ? "bg-heat-no-data text-muted" : TIER[c.tier]} ${c.now ? "ring-2 ring-heat-4" : ""}`}
                  >
                    {c.label}
                    {c.dot && <i aria-hidden="true" className="absolute top-1 right-1 size-1.5 rounded-full bg-[var(--card-amber,#f5b942)]" />}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-muted">
            {view.legend.map((l) => (
              <span key={l.tier} className="flex items-center gap-1.5">
                <i aria-hidden="true" className={`size-3 rounded-[4px] ${["", "bg-heat-2", "bg-heat-3", "bg-heat-5"][l.tier]}`} />
                {l.text}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <i aria-hidden="true" className="size-2 rounded-full bg-[var(--card-amber,#f5b942)]" />a deposit was placed
            </span>
          </div>
        </div>
        <dl className="flex flex-col gap-4 border-divider lg:border-l lg:pl-6">
          {view.stats.map((s) => (
            <div key={s.label}>
              <dt className="text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase">{s.label}</dt>
              <dd className="mt-1 text-xl font-extrabold tabular-nums">{s.value}</dd>
              <dd className="mt-0.5 text-[11px] font-medium text-muted">{s.note}</dd>
            </div>
          ))}
        </dl>
      </div>
    </WidgetCard>
  );
}
