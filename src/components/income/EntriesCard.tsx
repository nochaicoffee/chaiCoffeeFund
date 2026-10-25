"use client";

import { useState } from "react";
import type { EntriesCard as EntriesCardData, EntryRow, PayChangeRow } from "@/app/income/widgetsView";
import { Segmented } from "../subscriptions/Segmented";
import { SourceIcon } from "./SourceIcon";
import { useIncomeForms } from "./forms/IncomeForms";

const TONES = {
  good: "bg-accent-tint text-accent-text",
  warn: "bg-warning-tint text-warning-text",
  late: "border border-negative/30 bg-negative-tint text-negative",
} as const;

/**
 * The Entries card beside the income map (IncomeZ1): the latest payments for the pick, anything still owed on top,
 * with a switch to its pay changes (a payment 2% or more off the one before it). An owed one has Mark received; a
 * payment opens Edit payment (#190). "All entries" comes with the Entries page (#191).
 */
export function EntriesCard({ card, pickLabel }: { card: EntriesCardData; pickLabel: string }) {
  const [view, setView] = useState<"entries" | "changes">("entries");
  return (
    <section aria-label="Entries" className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold">
          {view === "entries" ? "Entries" : "Pay changes"} <small className="ml-2 text-xs font-semibold text-muted">{pickLabel} · newest first</small>
        </h2>
        <Segmented label="Show" value={view} onChange={setView} options={[{ value: "entries", label: "Entries" }, { value: "changes", label: "Pay changes" }]} small />
      </div>
      {view === "entries" ? (
        card.rows.length === 0 ? (
          <p className="flex-1 py-10 text-center text-sm font-semibold text-muted">No payments recorded yet.</p>
        ) : (
          <div className="-mx-1 flex-1 overflow-x-auto px-1">
            <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">
                  <th className="pb-2 font-extrabold">Source</th>
                  <th className="pb-2 font-extrabold">Landed on</th>
                  <th className="pb-2 text-right font-extrabold">Amount</th>
                  <th className="pb-2 pl-4 font-extrabold">Status</th>
                </tr>
              </thead>
              <tbody>
                {card.rows.map((row) => (
                  <Entry key={row.key} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : card.changes.length === 0 ? (
        <p className="flex-1 py-10 text-center text-sm font-semibold text-muted">No payment has moved 2% or more from the one before it.</p>
      ) : (
        <ul className="flex flex-1 flex-col divide-y divide-divider">
          {card.changes.map((c) => (
            <Change key={c.key} change={c} />
          ))}
        </ul>
      )}
      <p className="border-t border-divider pt-3 text-[11.5px] font-semibold text-muted">{view === "entries" ? card.note : "A raise, a bigger payment or a lower dividend, newest first."}</p>
    </section>
  );
}

function Entry({ row }: { row: EntryRow }) {
  const { open, receive, forms, disabledReason } = useIncomeForms();
  const entry = forms.entries[row.key];
  const act = disabledReason ? undefined : row.owed ? () => receive(row.sourceId, row.expectedDate) : entry ? () => open({ kind: "entry", start: { kind: "edit", entry } }) : undefined;
  return (
    <tr className="border-t border-divider">
      <td className="py-2 pr-3">
        <button type="button" onClick={act} disabled={!act} aria-label={`${row.owed ? "Mark received" : "Edit payment"}: ${row.name}, ${row.amount}, ${row.when}`} title={disabledReason} className="flex w-full cursor-pointer items-center gap-2.5 rounded-control text-left focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default">
          <SourceIcon icon={row.icon} name={row.name} colorKey={row.colorKey} size={30} />
          <span className="min-w-0">
            <b className="block truncate font-extrabold">{row.name}</b>
            <span className="block text-[11px] font-semibold text-muted">
              {row.frequency}
              {row.fromStatement ? " · from statement" : ""}
            </span>
          </span>
        </button>
      </td>
      <td className="py-2 pr-3">
        <b className="block font-extrabold">{row.when}</b>
        <span className={`block text-[11px] font-semibold ${row.status.tone === "late" ? "text-negative" : "text-muted"}`}>{row.whenNote}</span>
      </td>
      <td className="py-2 text-right font-extrabold tabular-nums">{row.amount}</td>
      <td className="py-2 pl-4">
        <span className="flex items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold whitespace-nowrap ${TONES[row.status.tone]}`}>{row.status.text}</span>
          {row.owed && !disabledReason && (
            <button type="button" onClick={() => receive(row.sourceId, row.expectedDate)} className="min-h-8 rounded-full bg-accent-tint px-3 text-[11px] font-extrabold whitespace-nowrap text-accent-text hover:bg-accent hover:text-on-accent focus-visible:outline-2 focus-visible:outline-accent">
              Mark received
            </button>
          )}
        </span>
      </td>
    </tr>
  );
}

function Change({ change }: { change: PayChangeRow }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <SourceIcon icon={change.icon} name={change.name} colorKey={change.colorKey} size={30} />
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[13px] font-extrabold">{change.name}</b>
        <span className="block text-[11px] font-semibold text-muted">{change.when}</span>
      </span>
      <span className="text-right">
        <b className={`block text-[13px] font-extrabold tabular-nums ${change.up ? "text-accent-text" : "text-negative"}`}>{change.change}</b>
        <span className="block text-[11px] font-semibold text-muted tabular-nums">{change.amounts}</span>
      </span>
    </li>
  );
}
