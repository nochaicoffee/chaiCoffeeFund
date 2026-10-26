"use client";

import type { ComingUpView } from "@/app/loans/widgetsView";
import { FormTrigger, useLoanForms } from "./forms/LoanForms";
import { LoanCard, SMALL_OK } from "./parts";

/** Coming up (LoansN1): the next EMIs from each schedule, a date block each, with Mark paid on the first. */
export function ComingUpCard({ card, picked }: { card: ComingUpView; picked: string | null }) {
  const { open } = useLoanForms();
  return (
    <LoanCard label="Coming up" title="Coming up" note="the next EMIs, from each schedule" gap="gap-1.5">
      {card.rows.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-10 text-sm font-semibold text-muted">No EMIs left to pay.</p>
      ) : (
        <ul className="flex flex-1 flex-col">
          {card.rows.map((r, k) => (
            <li key={r.id} className={`flex items-center gap-3.5 border-t border-divider py-3.5 first:border-t-0 motion-safe:transition-opacity ${picked && picked !== r.loanId ? "opacity-35" : ""}`}>
              <span className={`flex w-12 shrink-0 flex-col items-center rounded-[12px] py-1.5 ${r.soon ? "bg-warning-tint text-warning-text" : "bg-fill"}`}>
                <b className="text-lg leading-none font-extrabold">{r.day}</b>
                <span className="text-[10px] font-extrabold">{r.month}</span>
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13.5px] font-extrabold">{r.title}</b>
                <span className="block text-[11.5px] font-semibold text-muted">
                  <span className={r.soon ? "font-extrabold text-warning-text" : ""}>{r.when}</span> · {r.detail}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <b className="text-[15px] font-extrabold tabular-nums">{r.amount}</b>
                {k === 0 && <FormTrigger className={SMALL_OK} label="✓ Mark paid" onClick={() => open({ kind: "mark-paid", installmentId: r.id })} />}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3 text-xs font-semibold text-muted">
        <span>{card.foot}</span>
        <span className="rounded-full bg-accent-tint px-2.5 py-1 text-[11px] font-extrabold text-accent-text">From the schedules</span>
      </div>
    </LoanCard>
  );
}
