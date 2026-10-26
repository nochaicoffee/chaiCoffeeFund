"use client";

import Link from "next/link";
import { useState } from "react";
import type { PaymentsView } from "@/app/loans/widgetsView";
import { Segmented } from "../subscriptions/Segmented";
import { FormTrigger, useLoanForms } from "./forms/LoanForms";
import { LINK, LoanCard, LoanIcon, SMALL_SOFT, StatusPill } from "./parts";

/**
 * Payments (LoansN1): Subscriptions' Payments card for EMIs. The title carries the pick, a Payments / Prepayments
 * switch, the six most recent EMIs paid (room is kept for six, so the card never changes height), and View all
 * installments. Prepayments lists the pick's, each with Delete, and Add prepayment.
 */
export function PaymentsCard({ card, pickName, picked, allHref }: { card: PaymentsView; pickName: string; picked: string | null; allHref: string }) {
  const [view, setView] = useState<"emis" | "prep">("emis");
  const { open } = useLoanForms();
  return (
    <LoanCard
      label="Payments"
      title={
        <>
          {view === "emis" ? "Payments" : "Prepayments"}
          <span className="mx-2 text-muted">·</span>
          {pickName}
        </>
      }
      right={<Segmented label="Show" options={[{ value: "emis", label: "Payments" }, { value: "prep", label: "Prepayments" }]} value={view} onChange={setView} small />}
      gap="gap-2"
    >
      {view === "emis" ? (
        <>
          <div className="-mx-1 flex-1 overflow-x-auto px-1">
            <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">
                  <th className="pb-2 font-extrabold">Loan</th>
                  <th className="pb-2 font-extrabold">Paid on</th>
                  <th className="pb-2 font-extrabold">Amount</th>
                  <th className="pb-2 font-extrabold">Paid from</th>
                  <th className="pb-2 text-right font-extrabold">Status</th>
                </tr>
              </thead>
              <tbody>
                {card.rows.map((r) => (
                  <tr key={r.id} className="h-[58px] border-t border-divider">
                    <td className="pr-3">
                      <span className="flex items-center gap-2.5">
                        <LoanIcon category={r.loan.category} colorKey={r.loan.colorKey} size={32} closed={r.loan.closed} />
                        <span className="min-w-0">
                          <b className="block truncate font-extrabold">{r.loan.name}</b>
                          <span className="block text-[11px] font-semibold text-muted">{r.title}</span>
                        </span>
                      </span>
                    </td>
                    <td className="pr-3 font-semibold">{r.paidOn}</td>
                    <td className="pr-3 font-extrabold tabular-nums">{r.amount}</td>
                    <td className="max-w-[160px] truncate pr-3 font-semibold">{r.from ?? <span className="text-muted">—</span>}</td>
                    <td className="text-right">
                      <span className="inline-flex items-center gap-1.5">
                        {r.late ? <StatusPill tone="late" title={r.late}>Paid late</StatusPill> : <StatusPill tone="paid">Paid</StatusPill>}
                        <FormTrigger className="min-h-8 rounded-full px-3 text-xs font-bold text-muted hover:bg-fill hover:text-fg focus-visible:outline-2 focus-visible:outline-accent" label="Edit" onClick={() => open({ kind: "edit-payment", installmentId: r.id })} />
                      </span>
                    </td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 6 - card.rows.length) }, (_, k) => (
                  <tr key={`pad-${k}`} aria-hidden="true" className="h-[58px] border-t border-divider">
                    <td colSpan={5} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[13px] font-semibold text-muted">
            <span>{card.count}</span>
            <Link href={allHref} className={LINK}>
              View all installments →
            </Link>
          </div>
          <p className="text-xs font-semibold text-muted">{picked ? `Only the ${pickName}. Pick All loans for every EMI.` : "Pick a loan tile for one loan's payments."}</p>
        </>
      ) : card.prepayments.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <b className="text-sm font-extrabold">No prepayments yet</b>
          <span className="max-w-[340px] text-xs font-semibold text-muted">Anything you pay above an EMI, or add yourself, shows here with its effect and its charge.</span>
          <FormTrigger className={`${SMALL_SOFT} mt-2`} label="Add prepayment" onClick={() => open({ kind: "prepay", loanId: picked ?? undefined })} />
        </div>
      ) : (
        <>
          <ul className="flex flex-1 flex-col">
            {card.prepayments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 border-t border-divider py-3 first:border-t-0">
                <LoanIcon category={p.loan.category} colorKey={p.loan.colorKey} size={32} closed={p.loan.closed} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13px] font-extrabold">
                    {p.loan.name} · {p.amount}
                  </b>
                  <span className="block text-[11px] font-semibold text-muted">
                    {p.date} · {p.effect} · {p.source} · charge {p.charge}
                  </span>
                </span>
                <FormTrigger className="min-h-8 rounded-full px-3 text-xs font-bold text-negative hover:bg-negative-tint focus-visible:outline-2 focus-visible:outline-accent" label="Delete" onClick={() => open({ kind: "delete-prepayment", id: p.id })} />
              </li>
            ))}
          </ul>
          <div className="flex justify-end pt-1">
            <FormTrigger className={SMALL_SOFT} label="+ Add prepayment" onClick={() => open({ kind: "prepay", loanId: picked ?? undefined })} />
          </div>
        </>
      )}
    </LoanCard>
  );
}
