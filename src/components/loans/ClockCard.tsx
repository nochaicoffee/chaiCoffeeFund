"use client";

import type { ClockView } from "@/app/loans/widgetsView";
import { LoanCard, LoanIcon, fillOf } from "./parts";

/** Debt-free clock (LoansN1): years, months and days to the pick's last EMI, and a runway bar per loan to when it ends. */
export function ClockCard({ clock, picked }: { clock: ClockView | null; picked: string | null }) {
  return (
    <LoanCard label="Debt-free clock" title="Debt-free clock" note="a countdown to the last EMI">
      {!clock ? (
        <p className="flex flex-1 items-center justify-center py-10 text-sm font-semibold text-muted">Nothing owed: you&apos;re debt-free.</p>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-5">
          <div className="flex justify-center gap-2.5">
            {(
              [
                [clock.years, "years"],
                [clock.months, "months"],
                [clock.days, "days"],
              ] as const
            ).map(([v, k]) => (
              <span key={k} className="flex min-w-[88px] flex-col items-center rounded-[18px] border border-surface-line bg-fill px-4 pt-3 pb-2.5">
                <b className="text-[48px] leading-none font-extrabold tracking-[-0.03em] tabular-nums">{String(v).padStart(2, "0")}</b>
                <small className="mt-1.5 text-[10.5px] font-extrabold tracking-[0.1em] text-muted uppercase">{k}</small>
              </span>
            ))}
          </div>
          <p className="text-center text-[13px] font-semibold text-muted">{clock.caption}</p>
          <ul className="flex flex-col gap-2.5">
            {clock.bars.map((b) => (
              <li key={b.loan.id} className={`grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 motion-safe:transition-opacity ${picked && picked !== b.loan.id ? "opacity-25" : ""}`}>
                <span className="flex min-w-0 items-center gap-2 text-xs font-extrabold">
                  <LoanIcon category={b.loan.category} colorKey={b.loan.colorKey} size={22} />
                  <span className="truncate">{b.loan.name.replace(/ loan$/, "")}</span>
                </span>
                <span className="relative block h-4 rounded-full bg-fill">
                  <i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${b.share * 100}%`, background: fillOf(b.loan.colorKey) }} />
                  <b className={`absolute top-1/2 -translate-y-1/2 text-[11px] font-extrabold whitespace-nowrap ${b.share > 0.75 ? "-translate-x-[calc(100%+8px)] text-on-card" : "pl-2"}`} style={{ left: `${b.share * 100}%` }}>
                    {b.end}
                  </b>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </LoanCard>
  );
}
