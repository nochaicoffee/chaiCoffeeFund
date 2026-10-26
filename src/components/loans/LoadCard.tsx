"use client";

import type { LoadView } from "@/app/loans/widgetsView";
import { ColorMark, LoanCard, fillOf } from "./parts";

const ZONE = { Comfortable: "bg-accent-tint text-accent-text", Stretched: "bg-warning-tint text-warning-text", Heavy: "bg-negative-tint text-negative" } as const;

/**
 * EMI load (LoansN1, Prathik's pick G1): the salary as a bar, a segment per loan's EMI, with marks at 30% and 40% and
 * what's left over. The share is the pick's. The salary is Income's (active salary sources), and the zones are
 * placeholders (docs/design/loans.md).
 */
export function LoadCard({ load, picked }: { load: LoadView | null; picked: string | null }) {
  // EMIs above the salary fill the bar rather than spill out of it.
  const fit = load ? Math.max(1, load.segments.reduce((t, s) => t + s.share, 0)) : 1;
  return (
    <LoanCard label="EMI load" title="EMI load" note="share of salary · zones are placeholders">
      {!load ? (
        <p className="flex flex-1 items-center justify-center py-10 text-center text-sm font-semibold text-muted">Add your salary on the Income page to see how much of it goes to EMIs.</p>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-[46px] leading-none font-extrabold tracking-[-0.03em] tabular-nums">
              {Math.round(load.share * 100)}
              <small className="text-xl opacity-70">%</small>
            </span>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${ZONE[load.zone]}`}>{load.zone}</span>
            <span className="text-[13px] font-semibold text-muted">
              {load.emi} of your {load.salary} salary
            </span>
          </div>
          <div className="pt-6">
            <div className="relative flex h-12 gap-[3px] rounded-[14px] bg-fill p-[3px]">
              {load.segments.map((s) => (
                <div key={s.loan.id} title={`${s.loan.name} ${s.amount}`} className="rounded-[10px] motion-safe:transition-opacity" style={{ width: `${(s.share / fit) * 100}%`, background: fillOf(s.loan.colorKey, 180), opacity: picked && picked !== s.loan.id ? 0.2 : 1 }} />
              ))}
              {[30, 40].map((p) => (
                <span key={p} aria-hidden="true">
                  <span className="absolute -top-2 -bottom-2 border-l-[1.5px] border-dashed border-fg/45" style={{ left: `${p}%` }} />
                  <span className="absolute -top-6 -translate-x-1/2 text-[10.5px] font-extrabold text-muted" style={{ left: `${p}%` }}>
                    {p}%
                  </span>
                </span>
              ))}
              {fit === 1 && <span className="ml-auto self-center pr-3 text-xs font-bold text-muted max-sm:hidden">left over {load.leftOver}</span>}
            </div>
            <div className="mt-2 flex justify-between text-xs font-semibold text-muted">
              <span>₹0</span>
              <span>your salary, {load.salary}</span>
            </div>
          </div>
          <ul className="flex flex-col">
            {load.segments.map((s) => (
              <li key={s.loan.id} className={`grid grid-cols-[12px_minmax(0,1fr)_auto_56px] items-center gap-3 border-b border-divider py-2.5 text-[13px] ${picked && picked !== s.loan.id ? "opacity-35" : ""}`}>
                <ColorMark colorKey={s.loan.colorKey} />
                <b className="truncate font-extrabold">{s.loan.name}</b>
                <b className="font-extrabold tabular-nums">{s.amount}</b>
                <span className="text-right text-xs font-semibold text-muted tabular-nums">{(s.share * 100).toFixed(1)}%</span>
              </li>
            ))}
            <li className="grid grid-cols-[12px_minmax(0,1fr)_auto_56px] items-center gap-3 py-2.5 text-[13px]">
              <i aria-hidden="true" className="size-[9px] rounded-[3px] bg-fill-strong" />
              <b className="font-extrabold">Left over</b>
              <b className="font-extrabold tabular-nums">{load.leftOver}</b>
              <span className="text-right text-xs font-semibold text-muted tabular-nums">{(load.leftShare * 100).toFixed(1)}%</span>
            </li>
          </ul>
        </div>
      )}
    </LoanCard>
  );
}
