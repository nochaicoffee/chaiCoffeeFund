"use client";

import { useState } from "react";
import type { DepositTableRow } from "@/app/fixed-income/widgetsView";
import { WidgetCard } from "../../shell/WidgetCard";
import { ClosedDeposits, useDepositForms } from "../forms/DepositForms";

const CHIPS = ["sapphire", "ocean", "teal", "emerald", "violet", "amber", "copper"] as const;
const SMALL = "min-h-8 rounded-full bg-fill px-3 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent";
const COLS = "lg:grid-cols-[minmax(0,2.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]";

/** The deposits as his FD app shows them (J1): worth today, when each matures and what it pays then (an estimate until the bank's figure is added), and how far through each is. */
export function DepositsTable({ rows }: { rows: DepositTableRow[] }) {
  const { forms, open } = useDepositForms();
  const [showClosed, setShowClosed] = useState(false);
  const closed = forms.deposits.filter((d) => d.status === "Closed").length;
  return (
    <WidgetCard
      label="Fixed deposits"
      title="Fixed deposits"
      note="as your FD app shows them · maturity amounts are estimates until you enter the bank's"
      right={
        <button type="button" aria-expanded={showClosed} onClick={() => setShowClosed(!showClosed)} className="text-xs font-extrabold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          Matured and pre-closed ({closed}) →
        </button>
      }
    >
      <div className="flex flex-col">
        <div className={`hidden gap-3 px-1 pb-2 text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase lg:grid ${COLS}`} aria-hidden="true">
          <span>Deposit</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Placed</span>
          <span className="text-right">Worth today</span>
          <span className="text-right">Matures</span>
          <span className="text-right">Matures at</span>
          <span>How far through</span>
          <span className="w-[116px]" />
        </div>
        {rows.map((r, i) => (
          <div key={r.id} className={`grid items-center gap-x-3 gap-y-2 border-t border-divider py-3.5 max-lg:grid-cols-2 ${COLS} ${r.due ? "rounded-[14px] bg-negative-tint/60 px-3" : "px-1"}`}>
            <div className="flex min-w-0 items-center gap-3 max-lg:col-span-2">
              <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-[11px] text-[11px] font-extrabold text-on-card" style={{ background: `linear-gradient(155deg, var(--card-${CHIPS[i % CHIPS.length]}-from), var(--card-${CHIPS[i % CHIPS.length]}-to))` }}>
                FD
              </span>
              <span className="min-w-0">
                <b className="block truncate text-[13px] font-extrabold">
                  {r.name}
                  {r.due && <span className="ml-2 rounded-full bg-negative-tint px-2 py-0.5 align-middle text-[10px] font-bold text-negative">Matured</span>}
                </b>
                <span className="block truncate text-[11px] font-medium text-muted">{r.sub}</span>
              </span>
            </div>
            <Cell label="Rate" className="lg:text-right">
              <b>{r.rate}</b>
              <small>{r.rateNote}</small>
            </Cell>
            <Cell label="Placed" className="lg:text-right">
              <b>{r.placed}</b>
            </Cell>
            <Cell label="Worth today" className="lg:text-right">
              <b>{r.worth}</b>
              <small>{r.gain}</small>
            </Cell>
            <Cell label="Matures" className="lg:text-right">
              <b>{r.matures}</b>
              <small className={r.due ? "font-extrabold text-warning-text" : ""}>{r.maturesIn}</small>
            </Cell>
            <Cell label="Matures at" className="lg:text-right">
              <b>{r.maturesAt}</b>
              <small>{r.maturesAtNote}</small>
            </Cell>
            <div className="flex flex-col gap-1 max-lg:col-span-2">
              <span className="text-xs font-bold tabular-nums">{Math.round(r.through * 100)}%</span>
              <i className="block h-1.5 overflow-hidden rounded-full bg-fill" role="img" aria-label={`${Math.round(r.through * 100)}% through its term`}>
                <i className="block h-full rounded-full" style={{ width: `${Math.max(1, Math.round(r.through * 100))}%`, background: `var(--card-${CHIPS[i % CHIPS.length]})` }} />
              </i>
            </div>
            <span className="flex w-[116px] gap-1.5 max-lg:col-span-2 max-lg:w-auto">
              <button type="button" onClick={() => open({ kind: "edit", id: r.id })} className={SMALL} aria-label={`Edit ${r.name}`}>
                Edit
              </button>
              <button type="button" onClick={() => open({ kind: "close", id: r.id })} className={r.due ? "min-h-8 rounded-full bg-accent-tint px-3 text-xs font-extrabold text-accent-text hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-accent" : SMALL} aria-label={`Close ${r.name}`}>
                Close
              </button>
            </span>
          </div>
        ))}
      </div>
      {showClosed && <ClosedDeposits />}
    </WidgetCard>
  );
}

/** One figure: on a wide screen a column under its heading, on a narrow one a labelled pair. */
function Cell({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 text-[13px] tabular-nums [&_b]:block [&_b]:font-extrabold [&_small]:block [&_small]:text-[11px] [&_small]:font-medium [&_small]:text-muted ${className}`}>
      <span className="text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase lg:hidden">{label}</span>
      {children}
    </div>
  );
}
