"use client";

import Link from "next/link";
import { useState } from "react";
import type { PaymentRow, PaymentsView } from "@/app/insurance/widgetsView";
import { WidgetCard } from "../shell/WidgetCard";

const SHOWN = 6;
const GRID = "grid grid-cols-[minmax(0,0.8fr)_minmax(0,2.6fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-x-3";
const CHANGE: Record<PaymentRow["change"]["tone"], string> = { up: "text-negative", down: "text-positive", flat: "text-muted", first: "text-muted" };

/**
 * Premiums paid (InsFinal), following the pick: every term paid for, newest first, with what it cost against the term before and
 * where it was paid from. Under a picked policy three tiles say what it has cost in all. Six rows, then Show all.
 */
export function PaymentsCard({ view, pickName, picked, allHref }: { view: PaymentsView; pickName: string; picked: boolean; allHref: string }) {
  const [all, setAll] = useState(false);
  const rows = all ? view.rows : view.rows.slice(0, SHOWN);
  return (
    <WidgetCard label="Premiums paid" title={`Premiums paid${picked ? ` · ${pickName}` : ""}`} note="every term you've paid for">
      {view.rows.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-10 text-sm font-semibold text-muted">No premium is recorded yet.</p>
      ) : (
        <div className="min-w-0">
          <div className={`${GRID} hidden pb-2 text-[10.5px] font-extrabold tracking-[0.05em] text-muted uppercase sm:grid`} aria-hidden="true">
            <span>Paid on</span>
            <span>Policy and cover period</span>
            <span className="text-right">Amount</span>
            <span>Paid from</span>
          </div>
          <ul>
            {rows.map((r) => (
              <li key={r.id} className="border-t border-divider py-2.5">
                <div className="flex items-start justify-between gap-3 sm:hidden">
                  <span className="flex min-w-0 items-start gap-2">
                    <i aria-hidden="true" className="mt-1 size-2.5 shrink-0 rounded-[3px]" style={{ background: `var(--card-${r.colorKey})` }} />
                    <span className="min-w-0">
                      <b className="block text-[13px] font-extrabold">{r.name}</b>
                      <small className="block text-[11px] font-semibold text-muted">
                        {r.period} · {r.years}
                      </small>
                      <small className="block text-[11px] font-semibold text-muted">
                        Paid {r.day}, {r.year}
                        {r.assumed ? " (assumed)" : ""} · {r.from ?? "paid from not recorded"}
                      </small>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <b className="block text-[13px] font-extrabold tabular-nums">{r.amount}</b>
                    <small className={`block text-[10.5px] font-extrabold ${CHANGE[r.change.tone]}`}>{r.change.text}</small>
                  </span>
                </div>
                <div className={`${GRID} hidden items-center sm:grid`}>
                <b className="text-[12.5px] font-extrabold">
                  {r.day}
                  <small className="block text-[10.5px] font-semibold text-muted">
                    {r.year}
                    {r.assumed ? " · assumed" : ""}
                  </small>
                </b>
                <span className="flex min-w-0 items-center gap-2">
                  <i aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ background: `var(--card-${r.colorKey})` }} />
                  <span className="min-w-0">
                    <b className="block truncate text-[12.5px] font-extrabold">
                      {r.name}
                      <span className="font-semibold text-muted"> · {r.insurer}</span>
                    </b>
                    <small className="block truncate text-[10.5px] font-semibold text-muted">
                      {r.period} · {r.years}
                    </small>
                  </span>
                </span>
                <span className="text-right">
                  <b className="block text-[13px] font-extrabold tabular-nums">{r.amount}</b>
                  <small className={`block text-[10.5px] font-extrabold ${CHANGE[r.change.tone]}`}>{r.change.text}</small>
                </span>
                <span className={`truncate text-xs font-semibold ${r.from ? "" : "text-muted"}`}>{r.from ?? "Not recorded"}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {view.tiles && (
        <div className="mt-auto grid grid-cols-3 gap-2.5">
          {view.tiles.map((t) => (
            <div key={t.label} className="rounded-2xl bg-fill px-3.5 py-3">
              <small className="block text-[10.5px] font-extrabold tracking-[0.04em] text-muted uppercase">{t.label}</small>
              <b className="text-lg font-extrabold tabular-nums">{t.value}</b>
            </div>
          ))}
        </div>
      )}
      <div className={`flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3 text-xs font-semibold text-muted ${view.tiles ? "" : "mt-auto"}`}>
        <span>{view.foot}</span>
        <span className="flex items-center gap-4">
          {view.rows.length > SHOWN && (
            <button type="button" onClick={() => setAll((v) => !v)} className="font-extrabold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              {all ? "Show fewer" : `Show all ${view.rows.length}`}
            </button>
          )}
          {view.rows.length > 0 && (
            <Link href={allHref} className="font-extrabold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              Payments page →
            </Link>
          )}
        </span>
      </div>
    </WidgetCard>
  );
}
