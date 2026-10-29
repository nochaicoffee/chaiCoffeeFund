"use client";

import type { PaymentsPageSection } from "@/app/insurance/widgetsView";
import { FormTrigger, SMALL_SOFT, useInsuranceForms } from "./forms/InsuranceForms";
import { TileMark } from "./parts";

const GRID = "grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.9fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.5fr)_auto] gap-x-3";
const CHANGE = { up: "text-negative", down: "text-positive", flat: "text-muted", first: "text-muted" } as const;

/** The premium payments page's sections: a policy each, every term it has bought with what it cost, where it was paid from, and Edit and Delete. */
export function PaymentSections({ sections }: { sections: PaymentsPageSection[] }) {
  const { open } = useInsuranceForms();
  return (
    <div className="flex flex-col gap-4">
      {sections.map((s) => (
        <details key={s.id} open={s.open} className="group rounded-[22px] border border-surface-line bg-surface shadow-[var(--card-shadow)]">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 rounded-[22px] p-5 focus-visible:outline-2 focus-visible:outline-accent md:p-6 [&::-webkit-details-marker]:hidden">
            <TileMark icon={s.icon} colorKey={s.colorKey} size={36} />
            <span className="min-w-0 flex-1">
              <b className="block text-[15px] font-extrabold">{s.name}</b>
              <span className="block text-xs font-semibold text-muted">{s.sub}</span>
            </span>
            <span className="text-xs font-bold text-muted">{s.summary}</span>
            <svg className="shrink-0 text-muted transition-transform group-open:rotate-180" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <div className="px-5 pb-5 md:px-6 md:pb-6">
            <div className={`${GRID} hidden pb-2 text-[10.5px] font-extrabold tracking-[0.05em] text-muted uppercase md:grid`} aria-hidden="true">
              <span>Paid on</span>
              <span>Cover period</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Change</span>
              <span>Paid from</span>
              <span className="w-[130px]" />
            </div>
            <ul>
              {s.rows.map((r) => (
                <li key={r.id} className="border-t border-divider py-3">
                  <div className={`${GRID} items-center max-md:flex max-md:flex-wrap max-md:gap-x-4 max-md:gap-y-1`}>
                    <b className="text-[12.5px] font-extrabold">
                      {r.day}, {r.year}
                      {r.assumed && <small className="ml-1.5 text-[10.5px] font-semibold text-muted">assumed</small>}
                    </b>
                    <span className="text-xs font-semibold">
                      {r.period}
                      <small className="block text-[10.5px] text-muted">
                        {r.years}
                        {r.ncb ? ` · no-claim bonus ${r.ncb}` : ""}
                      </small>
                    </span>
                    <b className="text-right text-[13px] font-extrabold tabular-nums max-md:ml-auto">{r.amount}</b>
                    <span className={`text-right text-xs font-extrabold ${CHANGE[r.change.tone]}`}>{r.change.text}</span>
                    <span className={`truncate text-xs font-semibold ${r.from ? "" : "text-muted"}`}>{r.from ?? "Not recorded"}</span>
                    <span className="flex w-[130px] justify-end gap-1.5 max-md:w-full">
                      <FormTrigger className={SMALL_SOFT} label="Edit" onClick={() => open({ kind: "edit-payment", id: r.id })} />
                      <FormTrigger className="inline-flex min-h-8 items-center rounded-full px-3 text-xs font-bold text-negative hover:bg-negative-tint focus-visible:outline-2 focus-visible:outline-accent" label="Delete" onClick={() => open({ kind: "delete-payment", id: r.id })} />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ))}
    </div>
  );
}
