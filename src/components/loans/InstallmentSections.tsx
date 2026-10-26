"use client";

import type { InstallmentsSection } from "@/app/loans/widgetsView";
import { FormTrigger, useLoanForms } from "./forms/LoanForms";
import { LoanIcon, SMALL_SOFT } from "./parts";
import { ScheduleTable } from "./ScheduleCard";

/** The Installments page's sections: a loan each, its whole schedule, and its prepayments with Delete. */
export function InstallmentSections({ sections }: { sections: InstallmentsSection[] }) {
  const { open } = useLoanForms();
  return (
    <div className="flex flex-col gap-4">
      {sections.map((s) => (
        <details key={s.loan.id} open={s.open} className="group rounded-[22px] border border-surface-line bg-surface shadow-[var(--card-shadow)]">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 rounded-[22px] p-5 focus-visible:outline-2 focus-visible:outline-accent md:p-6 [&::-webkit-details-marker]:hidden">
            <LoanIcon category={s.loan.category} colorKey={s.loan.colorKey} size={36} closed={s.loan.closed} />
            <span className="min-w-0 flex-1">
              <b className="block text-[15px] font-extrabold">{s.loan.name}</b>
              <span className="block text-xs font-semibold text-muted">{s.sub}</span>
            </span>
            <span className="text-xs font-bold text-muted">{s.summary}</span>
            <svg className="shrink-0 text-muted transition-transform group-open:rotate-180" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <div className="flex flex-col gap-4 px-5 pb-5 md:px-6 md:pb-6">
            <ScheduleTable rows={s.rows} wide />
            {s.prepayments.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-divider pt-3">
                <b className="text-[13px] font-extrabold">Prepayments</b>
                {s.prepayments.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 text-[12.5px] font-semibold">
                    <span className="min-w-0 flex-1">
                      <b className="font-extrabold">{p.amount}</b> on {p.date} · {p.effect} · {p.source} · charge {p.charge}
                    </span>
                    <FormTrigger className="min-h-8 rounded-full px-3 text-xs font-bold text-negative hover:bg-negative-tint focus-visible:outline-2 focus-visible:outline-accent" label="Delete" onClick={() => open({ kind: "delete-prepayment", id: p.id })} />
                  </div>
                ))}
              </div>
            )}
            {!s.loan.closed && (
              <div className="flex flex-wrap justify-end gap-2">
                <FormTrigger className={SMALL_SOFT} label="Edit loan" onClick={() => open({ kind: "edit-loan", id: s.loan.id })} />
                <FormTrigger className={SMALL_SOFT} label="+ Add prepayment" onClick={() => open({ kind: "prepay", loanId: s.loan.id })} />
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
