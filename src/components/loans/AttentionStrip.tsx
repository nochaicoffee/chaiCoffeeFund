"use client";

import type { AttentionItem } from "@/app/loans/views";
import { SMALL_OK } from "./parts";
import { FormTrigger, useLoanForms } from "./forms/LoanForms";

/**
 * The strip under the Loans greeting while an EMI is due within a week, or past its due date and not marked paid
 * (docs/design/loans.md): a line per EMI with where it will be paid from, Mark paid, and See schedule (which picks the
 * loan, so the Schedule card shows it).
 */
export function AttentionStrip({ items, onSchedule }: { items: AttentionItem[]; onSchedule: (loanId: string) => void }) {
  const { open } = useLoanForms();
  if (items.length === 0) return null;
  return (
    <section aria-label="EMIs due soon" className="flex flex-col gap-2 rounded-[18px] border border-warning/30 bg-warning-tint px-4 py-3 md:px-5">
      {items.map((item) => (
        <div key={item.installmentId} className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className={`flex min-w-0 flex-1 basis-full items-start gap-2.5 text-[13px] font-semibold sm:basis-auto ${item.overdue ? "text-negative" : "text-warning-text"}`}>
            <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              <b className="font-extrabold">
                {item.name} · {item.amount}
              </b>{" "}
              {item.text}
            </span>
          </p>
          <FormTrigger className={SMALL_OK} label="✓ Mark paid" onClick={() => open({ kind: "mark-paid", installmentId: item.installmentId })} />
          <button
            type="button"
            onClick={() => {
              onSchedule(item.loanId);
              document.getElementById("loan-schedule")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="min-h-8 rounded-full bg-surface px-3.5 text-xs font-extrabold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent"
          >
            See schedule
          </button>
        </div>
      ))}
    </section>
  );
}
