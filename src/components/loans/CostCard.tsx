"use client";

import type { CostView } from "@/app/loans/widgetsView";
import { InterestMark, LoanCard, LoanIcon, PrincipalMark, fillOf } from "./parts";

/**
 * Cost of borrowing (LoansN1 and LoansForms 4): what was borrowed (and what reached the accounts), the interest
 * (pre-EMI interest included) and the charges (processing fees, stamp duty, prepayment charges) apart and totalled, if
 * every EMI is on time; how much of it is paid, and each loan's share.
 */
export function CostCard({ cost }: { cost: CostView | null }) {
  return (
    <LoanCard label="Cost of borrowing" title="Cost of borrowing" note="interest and charges, if every EMI is on time" right={<span className="rounded-full bg-accent-tint px-2.5 py-1 text-[11px] font-extrabold text-accent-text">Worked out</span>}>
      {!cost ? (
        <p className="flex flex-1 items-center justify-center py-10 text-sm font-semibold text-muted">No active loans.</p>
      ) : (
        <>
          <dl className="flex flex-col text-[13px]">
            <Line mark={<PrincipalMark size={9} />} label="You borrowed" note={cost.netDisbursed} value={cost.borrowed} />
            <Line mark={<InterestMark size={9} />} label="Interest" note={cost.interestNote} value={cost.interest} />
            <Line mark={<i aria-hidden="true" className="inline-block size-[9px] rounded-[3px] bg-fill-strong" />} label="Charges" note="processing fees, stamp duty, prepayment charges" value={cost.charges} />
            <Line label="Interest and charges" value={cost.total} strong />
          </dl>
          <div className="flex flex-col gap-1.5">
            <span aria-hidden="true" className="block h-3.5 overflow-hidden rounded-full bg-fill">
              <i className="block h-full rounded-full" style={{ width: `${Math.max(2, cost.paidShare * 100)}%`, background: fillOf("emerald") }} />
            </span>
            <span className="flex flex-wrap justify-between gap-2 text-[11.5px] font-semibold text-muted">
              <span>{cost.paidText}</span>
              <span>{cost.toGo}</span>
            </span>
          </div>
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">
                <th className="pb-1.5 font-extrabold">By loan</th>
                <th className="pb-1.5 font-extrabold">Interest</th>
                <th className="pb-1.5 font-extrabold">Charges</th>
                <th className="pb-1.5 text-right font-extrabold">Repay</th>
              </tr>
            </thead>
            <tbody>
              {cost.rows.map((r) => (
                <tr key={r.loan.id} className="border-t border-divider font-bold">
                  <td className="py-2.5">
                    <span className="flex items-center gap-2">
                      <LoanIcon category={r.loan.category} colorKey={r.loan.colorKey} size={22} />
                      {r.loan.name.replace(/ loan$/, "")}
                    </span>
                  </td>
                  <td className="py-2.5 tabular-nums">{r.interest}</td>
                  <td className="py-2.5 tabular-nums">{r.charges}</td>
                  <td className="py-2.5 text-right font-extrabold tabular-nums">{r.multiple}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-auto text-xs font-semibold text-muted">{cost.note}</p>
        </>
      )}
    </LoanCard>
  );
}

function Line({ mark, label, note, value, strong = false }: { mark?: React.ReactNode; label: string; note?: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 border-b border-dashed border-divider py-2.5 ${strong ? "text-sm font-extrabold" : "font-semibold"}`}>
      <dt className="flex min-w-0 flex-wrap items-center gap-x-2">
        {mark}
        {label}
        {note && <small className="text-[11px] font-semibold text-muted">{note}</small>}
      </dt>
      <dd className="font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}
