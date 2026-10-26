"use client";

import Link from "next/link";
import type { ScheduleRow, ScheduleView } from "@/app/loans/widgetsView";
import { FormTrigger, useLoanForms } from "./forms/LoanForms";
import { LINK, LoanCard, LoanIcon, SMALL_OK, SMALL_SOFT, StatusPill } from "./parts";

/**
 * Schedule (LoansN1): the picked loan's installments around the next one (with All loans, the loan due next): three
 * before it and five after, each with its opening balance, principal, interest and EMI, and whether it's paid, due or
 * later. The next one can be marked paid from here, and a paid one edited.
 */
export function ScheduleCard({ schedule, allHref }: { schedule: ScheduleView; allHref: string }) {
  return (
    <LoanCard
      label="Schedule"
      title="Schedule"
      note={schedule.note}
      right={
        <span className="flex items-center gap-2 text-[13px] font-extrabold">
          <LoanIcon category={schedule.loan.category} colorKey={schedule.loan.colorKey} size={22} />
          {schedule.loan.name}
        </span>
      }
      className="scroll-mt-24"
    >
      <span id="loan-schedule" className="sr-only">
        The {schedule.loan.name}&apos;s schedule
      </span>
      <ScheduleTable rows={schedule.rows} />
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3 text-xs font-semibold text-muted">
        <span>{schedule.foot}</span>
        <Link href={allHref} className={LINK}>
          All {schedule.count} installments →
        </Link>
      </div>
    </LoanCard>
  );
}

export function ScheduleTable({ rows, wide = false }: { rows: ScheduleRow[]; wide?: boolean }) {
  const { open } = useLoanForms();
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className={`w-full border-collapse text-left text-[13px] ${wide ? "min-w-[720px]" : "min-w-[600px]"}`}>
        <thead>
          <tr className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">
            <th className="pb-2 font-extrabold">#</th>
            <th className="pb-2 font-extrabold">Due</th>
            <th className="pb-2 font-extrabold">Opening</th>
            <th className="pb-2 font-extrabold">Principal</th>
            <th className="pb-2 font-extrabold">Interest</th>
            <th className="pb-2 font-extrabold">EMI</th>
            <th className="pb-2 text-right font-extrabold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={`h-[42px] border-t border-divider tabular-nums ${r.paid ? "text-muted" : ""} ${r.next ? "bg-warning-tint/60 shadow-[inset_3px_0_0_var(--warning)]" : ""}`}>
              <td className="pr-2 pl-1 font-extrabold">{r.number}</td>
              <td className="pr-3 font-semibold whitespace-nowrap">{r.due}</td>
              <td className="pr-3 font-semibold">{r.opening}</td>
              <td className="pr-3 font-semibold">{r.principal}</td>
              <td className="pr-3 font-semibold">{r.interest}</td>
              <td className="pr-3 font-extrabold">{r.emi}</td>
              <td className="pr-1 text-right">
                {r.next && (r.status.tone === "due" || r.status.tone === "overdue") ? (
                  <span className="inline-flex items-center gap-1.5">
                    <StatusPill tone={r.status.tone}>{r.status.text}</StatusPill>
                    <FormTrigger className={SMALL_OK} label="Mark paid" onClick={() => open({ kind: "mark-paid", installmentId: r.id })} />
                  </span>
                ) : r.paid ? (
                  <span className="inline-flex items-center gap-1.5">
                    <StatusPill tone={r.status.tone}>{r.status.text}</StatusPill>
                    <FormTrigger className={SMALL_SOFT} label="Edit" onClick={() => open({ kind: "edit-payment", installmentId: r.id })} />
                  </span>
                ) : (
                  <StatusPill tone={r.status.tone}>{r.status.text}</StatusPill>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
