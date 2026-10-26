"use client";

import type { AnatomyRow } from "@/app/loans/widgetsView";
import { InterestMark, LoanCard, LoanIcon, PrincipalMark } from "./parts";

/**
 * Cost anatomy (LoansN1): each loan in multiples of what was borrowed, with a line at 1×. Principal repaid and still
 * owed, then interest paid and still to come (dashed, P6). The end of each bar is the multiple: what every ₹1
 * borrowed costs by the end.
 */
export function AnatomyCard({ rows, scale, picked }: { rows: AnatomyRow[]; scale: number; picked: string | null }) {
  const w = (v: number) => `${(v / scale) * 100}%`;
  const ticks = Array.from({ length: Math.floor(scale / 0.5) + 1 }, (_, k) => k * 0.5);
  return (
    <LoanCard label="Cost anatomy" title="Cost anatomy" note="in multiples of what you borrowed">
      <div className="flex flex-1 flex-col">
        <div className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_92px] gap-4 max-sm:grid-cols-[minmax(0,1fr)_64px]" aria-hidden="true">
          <span className="max-sm:hidden" />
          <span className="relative h-4 text-[10px] font-bold text-muted">
            {ticks.map((t) => (
              <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: w(t) }}>
                {t === 1 ? "1× borrowed" : `${t}×`}
              </span>
            ))}
          </span>
        </div>
        {rows.map((r) => (
          <div key={r.loan.id} className={`grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_92px] items-center gap-4 border-t border-divider py-3 first-of-type:border-t-0 max-sm:grid-cols-[minmax(0,1fr)_64px] ${picked && picked !== r.loan.id ? "opacity-25" : r.loan.closed ? "opacity-55" : ""}`}>
            <span className="flex min-w-0 items-center gap-2.5 max-sm:col-span-2">
              <LoanIcon category={r.loan.category} colorKey={r.loan.colorKey} size={28} closed={r.loan.closed} />
              <span className="min-w-0">
                <b className="block truncate text-[13px] font-extrabold">{r.loan.name}</b>
                <small className="block text-[11px] font-semibold text-muted">{r.borrowed}</small>
              </span>
            </span>
            <span className="relative block h-7" role="img" aria-label={`${r.loan.name}: ${r.multiple} of what was borrowed`}>
              <span className="absolute inset-y-0 border-l border-dashed border-fg/40" style={{ left: w(1) }} />
              <span className="absolute inset-y-[2px] left-0 flex overflow-hidden rounded-[8px]" style={{ width: w(r.repaid + r.owed + r.interestPaid + r.interestLeft) }}>
                <i className="block bg-[var(--loan-principal)]" style={{ flex: r.repaid }} />
                <i className="block bg-[color-mix(in_oklch,var(--loan-principal)_28%,transparent)]" style={{ flex: r.owed }} />
                <i className="block border-[1.5px] border-dashed border-[var(--loan-interest)] bg-[var(--loan-interest-tint)]" style={{ flex: r.interestPaid }} />
                <i className="block border-[1.5px] border-dashed border-[var(--loan-interest)]/55 bg-[var(--loan-interest-tint)]/50" style={{ flex: r.interestLeft }} />
              </span>
              <b className="absolute top-1/2 -translate-y-1/2 pl-2 text-xs font-extrabold" style={{ left: w(r.repaid + r.owed + r.interestPaid + r.interestLeft) }}>
                {r.multiple}
              </b>
            </span>
            <span className="text-right">
              <b className="block text-[13px] font-extrabold tabular-nums">{r.interestLeftText}</b>
              <small className="block text-[10.5px] font-semibold whitespace-nowrap text-muted">interest to come</small>
            </span>
          </div>
        ))}
      </div>
      <span className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] font-semibold text-muted" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          <PrincipalMark />
          Principal repaid
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] bg-[color-mix(in_oklch,var(--loan-principal)_28%,transparent)]" />
          Principal owed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <InterestMark />
          Interest paid
        </span>
        <span className="inline-flex items-center gap-1.5 opacity-60">
          <InterestMark />
          Interest to come
        </span>
      </span>
    </LoanCard>
  );
}
