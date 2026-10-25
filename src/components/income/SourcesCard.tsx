"use client";

import type { SourcesTable } from "@/app/income/lowerView";
import { SourceIcon } from "./SourceIcon";
import { FormTrigger, useIncomeForms } from "./forms/IncomeForms";

const STATUS = {
  good: "bg-accent-tint text-accent-text",
  warn: "bg-warning-tint text-warning-text",
  quiet: "bg-fill text-muted",
} as const;

/**
 * Sources (IncomeZ1, F-IN-01): everything that pays you, a row each with its usual amount and what that is a month,
 * what it's paid this year, a year of months (dashed for what's still to come), when it's next, where it lands, and
 * how it's doing. Picking a row picks it for the cover; Add source opens the form (#190).
 */
export function SourcesCard({ table, picked, onPick }: { table: SourcesTable; picked: string; onPick: (id: string) => void }) {
  const { open } = useIncomeForms();
  return (
    <section aria-label="Sources" className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)] md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold">
          Sources <small className="ml-2 text-xs font-semibold text-muted">everything that pays you · a month is what each is worth spread over its cycle</small>
        </h2>
        <FormTrigger className="min-h-9 rounded-full bg-fill px-4 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent" label="+ Add source" onClick={() => open({ kind: "add-source" })} />
      </div>
      {table.rows.length === 0 ? (
        <p className="py-8 text-center text-sm font-semibold text-muted">No income sources yet.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">
                <th className="pb-2 font-extrabold">Source</th>
                <th className="pb-2 font-extrabold">Usual amount</th>
                <th className="pb-2 font-extrabold">Received</th>
                <th className="pb-2 font-extrabold">Month by month</th>
                <th className="pb-2 font-extrabold">Next</th>
                <th className="pb-2 font-extrabold">Lands in</th>
                <th className="pb-2 text-right font-extrabold">Status</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => {
                const top = Math.max(1, ...row.months.map((m) => m.amount));
                return (
                  <tr key={row.id} className={`border-t border-divider ${row.inactive ? "opacity-60" : ""} ${picked === row.id ? "bg-accent-tint/50" : ""}`}>
                    <td className="py-2.5 pr-3">
                      <button type="button" aria-pressed={picked === row.id} onClick={() => onPick(row.id)} className="flex cursor-pointer items-center gap-2.5 rounded-control text-left focus-visible:outline-2 focus-visible:outline-accent">
                        <SourceIcon icon={row.icon} name={row.name} colorKey={row.colorKey} size={32} />
                        <span className="min-w-0">
                          <b className="block truncate font-extrabold">{row.name}</b>
                          <span className="block text-[11px] font-semibold text-muted">{row.kind}</span>
                        </span>
                      </button>
                    </td>
                    <td className="py-2.5 pr-3">
                      <b className="block font-extrabold tabular-nums">{row.usual}</b>
                      <span className="block text-[11px] font-semibold text-muted">{row.usualNote}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <b className="block font-extrabold tabular-nums">{row.received}</b>
                      <span className="block text-[11px] font-semibold text-muted">{row.receivedNote}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span aria-hidden="true" className="flex h-7 w-[132px] items-end gap-[3px]">
                        {row.months.map((m, i) => (
                          <i
                            key={i}
                            className={`block flex-1 rounded-[2px] ${m.expected ? "border border-dashed border-muted/60" : ""}`}
                            style={{ height: m.amount ? Math.max(4, (m.amount / top) * 28) : 2, background: m.expected ? "transparent" : m.amount ? `var(--card-${row.colorKey})` : "var(--fill-strong)" }}
                          />
                        ))}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <b className="block font-extrabold">{row.next}</b>
                      <span className={`block text-[11px] font-semibold ${row.nextLate ? "text-negative" : "text-muted"}`}>{row.nextNote}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-[12.5px] font-semibold">{row.landsIn ?? <span className="text-muted">—</span>}</td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${STATUS[row.status.tone]}`}>{row.status.text}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-divider pt-3 text-[11.5px] font-semibold text-muted">{table.note}</p>
    </section>
  );
}
