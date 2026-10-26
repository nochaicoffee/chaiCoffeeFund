"use client";

import Link from "next/link";
import type { LoansTableView } from "@/app/loans/widgetsView";
import { FormTrigger, useLoanForms } from "./forms/LoanForms";
import { InterestMark, LINK, LoanCard, LoanIcon, PrincipalMark, SMALL_SOFT, StatusPill, Tip, TipBody, fillOf } from "./parts";

/**
 * Loans (LoansN1, full width like Income's Sources): everything borrowed from a bank, a row each with what was
 * borrowed, the EMI, a repaid bar (hover it for paid and still to come), what's still owed, the next EMI and when it
 * ends. A closed loan stays, dimmed (open decision 2's default). Picking a row picks the loan; Edit opens the form.
 */
export function LoansTableCard({ table, picked, onPick, allHref }: { table: LoansTableView; picked: string; onPick: (id: string) => void; allHref: string }) {
  const { open } = useLoanForms();
  return (
    <LoanCard label="Loans" title="Loans" note="everything you borrowed from a bank · hover a bar" right={<FormTrigger className={SMALL_SOFT} label="+ Add loan" onClick={() => open({ kind: "add-loan" })} />}>
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[920px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">
              <th className="pb-2 font-extrabold">Loan</th>
              <th className="pb-2 font-extrabold">Borrowed</th>
              <th className="pb-2 font-extrabold">EMI</th>
              <th className="pb-2 font-extrabold">Repaid</th>
              <th className="pb-2 font-extrabold">Still owed</th>
              <th className="pb-2 font-extrabold">Next EMI</th>
              <th className="pb-2 text-right font-extrabold">Ends</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r) => (
              <tr key={r.loan.id} className={`border-t border-divider ${r.loan.closed ? "opacity-60" : ""} ${picked === r.loan.id ? "bg-accent-tint/50" : ""}`}>
                <td className="py-3 pr-3">
                  <button type="button" disabled={r.loan.closed} aria-pressed={picked === r.loan.id} onClick={() => onPick(r.loan.id)} className="flex items-center gap-2.5 rounded-control text-left enabled:cursor-pointer focus-visible:outline-2 focus-visible:outline-accent">
                    <LoanIcon category={r.loan.category} colorKey={r.loan.colorKey} size={34} closed={r.loan.closed} />
                    <span className="min-w-0">
                      <b className="block truncate font-extrabold">{r.loan.name}</b>
                      <span className="block text-[11px] font-semibold text-muted">{r.sub}</span>
                    </span>
                  </button>
                </td>
                <td className="py-3 pr-3 font-extrabold tabular-nums">{r.borrowed}</td>
                <td className="py-3 pr-3 font-extrabold tabular-nums">{r.emi}</td>
                <td className="w-[26%] py-3 pr-4">
                  <Tip
                    className="block"
                    width={270}
                    label={`${r.loan.name}: ${r.hover.title}`}
                    card={<TipBody head={r.loan.name} total={r.hover.title} detail={r.hover.detail} rows={r.hover.rows.map((x) => ({ name: x.name, amount: x.amount, mark: x.kind === "principal" ? <PrincipalMark size={8} /> : x.kind === "interest" ? <InterestMark size={8} /> : undefined }))} foot={r.hover.note} />}
                  >
                    <span aria-hidden="true" className="block h-2.5 overflow-hidden rounded-full bg-fill">
                      <i className="block h-full rounded-full" style={{ width: `${Math.max(2, r.repaidShare * 100)}%`, background: fillOf(r.loan.colorKey) }} />
                    </span>
                    <span className="mt-1.5 block text-[11px] font-semibold text-muted">{r.repaidText}</span>
                  </Tip>
                </td>
                <td className="py-3 pr-3">
                  <b className="block font-extrabold tabular-nums">{r.owed}</b>
                  <span className="block text-[11px] font-semibold text-muted">{r.owedNote}</span>
                </td>
                <td className="py-3 pr-3">
                  {r.next ? (
                    <>
                      <b className="block font-extrabold">{r.next.date}</b>
                      <span className={`block text-[11px] font-semibold ${r.next.soon ? "font-extrabold text-warning-text" : "text-muted"}`}>{r.next.when}</span>
                    </>
                  ) : (
                    <StatusPill tone="later">{r.closedText ?? "All paid"}</StatusPill>
                  )}
                </td>
                <td className="py-3 pr-3 text-right">
                  <b className="block font-extrabold">{r.ends}</b>
                  <span className="block text-[11px] font-semibold text-muted">{r.endsNote}</span>
                </td>
                <td className="py-3 text-right">
                  <FormTrigger className="min-h-8 rounded-full px-3 text-xs font-bold text-muted hover:bg-fill hover:text-fg focus-visible:outline-2 focus-visible:outline-accent" label="Edit" onClick={() => open({ kind: "edit-loan", id: r.loan.id })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3 text-xs font-semibold text-muted">
        <span>
          {table.foot.active} active {table.foot.active === 1 ? "loan" : "loans"} · <b className="text-fg">{table.foot.owed}</b> still owed · {table.foot.emi} a month
        </span>
        <Link href={allHref} className={LINK}>
          All installments →
        </Link>
      </div>
    </LoanCard>
  );
}
