"use client";

import type { TableRow, TableView } from "@/app/insurance/widgetsView";
import { WidgetCard } from "../shell/WidgetCard";
import { FormTrigger, SMALL_SOFT, useInsuranceForms } from "./forms/InsuranceForms";
import { TileMark, WARN_BAR } from "./parts";

const COLS = "lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,1.9fr)_minmax(0,1.2fr)]";
const HEADS = ["Policy", "Cover", "Paid", "A year", "This term", "Renews"];

const TONE = { soon: "font-bold text-warning-text", lapsed: "font-bold text-negative", off: "", plain: "" } as const;

/** The policies table (InsFinal): every policy with its cover, what was paid, a year of it, how far through its term, and when it renews. A row picks the policy. */
export function PoliciesTableCard({ table, pickId, onPick }: { table: TableView; pickId: string; onPick: (id: string) => void }) {
  const { open } = useInsuranceForms();
  return (
    <WidgetCard label="Policies" title="Policies" note="everything you're insured under" gap="gap-3" right={<FormTrigger className={SMALL_SOFT} label="+ Add policy" onClick={() => open({ kind: "add" })} />}>
      <div className="min-w-0">
        <div className={`hidden gap-4 pb-2 text-[10.5px] font-extrabold tracking-[0.05em] text-muted uppercase lg:grid ${COLS}`} aria-hidden="true">
          {HEADS.map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
        <ul>
          {table.rows.map((r) => (
            <li key={r.id} className="border-t border-divider">
              <Row row={r} on={pickId === r.id} dim={pickId !== "all" && pickId !== r.id} onPick={onPick} />
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-divider pt-3 text-xs font-semibold text-muted">{table.foot}</div>
    </WidgetCard>
  );
}

function Row({ row: r, on, dim, onPick }: { row: TableRow; on: boolean; dim: boolean; onPick: (id: string) => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onPick(r.id)}
      className={`grid w-full grid-cols-2 items-center gap-x-4 gap-y-2 rounded-xl px-2 py-3 text-left hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent motion-safe:transition-opacity lg:px-0 ${COLS} ${on ? "bg-fill" : ""} ${dim ? "opacity-45" : ""} ${r.off ? "opacity-60" : ""}`}
    >
      <span className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
        <TileMark icon={r.icon} colorKey={r.colorKey} size={34} />
        <span className="min-w-0">
          <b className="block truncate text-[13px] font-extrabold">{r.name}</b>
          <small className="block truncate text-[11px] font-semibold text-muted">{r.sub}</small>
        </span>
      </span>
      <span className="flex flex-col">
        <b className="text-[13px] font-extrabold tabular-nums">{r.cover}</b>
        <small className="text-[11px] font-semibold text-muted">{r.coverWord}</small>
      </span>
      <span className="flex flex-col">
        <b className="text-[13px] font-extrabold tabular-nums">{r.paid}</b>
        <small className="text-[11px] font-semibold text-muted">{r.paidSub}</small>
      </span>
      <span className="flex flex-col">
        <b className="text-[13px] font-extrabold tabular-nums">{r.year}</b>
        <small className="text-[11px] font-semibold text-muted">{r.yearSub}</small>
      </span>
      <span className="col-span-2 flex min-w-0 flex-col gap-1.5 lg:col-span-1">
        <span aria-hidden="true" className="relative block h-2 overflow-hidden rounded-full bg-fill-strong">
          <i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${r.off ? 0 : Math.max(2, r.elapsed * 100)}%`, background: r.warn ? WARN_BAR : `var(--card-${r.colorKey})` }} />
        </span>
        <small className={`text-[11px] font-semibold ${r.warn ? "text-warning-text" : "text-muted"}`}>{r.termSub}</small>
      </span>
      <span className="col-span-2 flex flex-col lg:col-span-1">
        {r.off ? <span className="w-fit rounded-full bg-fill px-2.5 py-0.5 text-[11px] font-extrabold text-muted">Cancelled</span> : <b className="text-[13px] font-extrabold">{r.renews}</b>}
        <small className={`text-[11px] font-semibold text-muted ${TONE[r.renewsTone]}`}>{r.renewsSub}</small>
      </span>
    </button>
  );
}
