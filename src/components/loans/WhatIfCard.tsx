"use client";

import { useState } from "react";
import type { WhatIfLoan } from "@/app/loans/widgetsView";
import { whatIfPrepayment } from "@/lib/aggregate/loans";
import { formatDate } from "@/lib/format/date";
import { formatInr, parseAmountText } from "@/lib/format/money";
import type { PrepaymentEffect } from "@/lib/sheets/types";
import { Segmented } from "../subscriptions/Segmented";
import { FormTrigger, useLoanForms } from "./forms/LoanForms";
import { LoanCard, LoanIcon, SMALL_SOFT } from "./parts";

const EFFECTS: { value: PrepaymentEffect; label: string }[] = [
  { value: "Reduce-Tenure", label: "Reduce tenure" },
  { value: "Reduce-Emi", label: "Reduce EMI" },
  { value: "Close", label: "Close" },
];

/**
 * What if (LoansN1): a prepayment today on the picked loan (with All loans, the dearest), worked out in the browser
 * with the same rebuild the app saves with. The balance curve against the scheduled one, interest saved beside the
 * bank's charge (never netted), and what changes. Estimates, since the interest in the month of a prepayment follows a
 * proposed rule. Nothing is saved; Add prepayment records one.
 */
export function WhatIfCard({ what, today, isAll }: { what: WhatIfLoan; today: string; isAll: boolean }) {
  const [effect, setEffect] = useState<PrepaymentEffect>(what.effect);
  const [amountText, setAmountText] = useState(String(what.amount));
  const { open } = useLoanForms();
  const amount = parseAmountText(amountText) ?? 0;
  let result: ReturnType<typeof whatIfPrepayment> | null = null;
  try {
    result = amount > 0 || effect === "Close" ? whatIfPrepayment(what.loan, what.installments, amount, effect, today) : null;
  } catch {
    result = null;
  }

  // The balance after each remaining EMI, as scheduled and after the prepayment.
  const W = 1000;
  const H = 120;
  const before = result ? [result.balanceBefore, ...result.removed.map((r) => r.openingBalance - r.principalDue)] : [];
  const after = result ? [result.balanceAfter, ...result.added.map((r) => r.openingBalance - r.principalDue)] : [];
  const n = Math.max(1, before.length - 1);
  const x = (k: number) => (k / n) * W;
  const y = (b: number) => H - (b / (result?.balanceBefore || 1)) * (H - 8);
  const area = (series: number[]) => `M${series.map((b, k) => `${x(k).toFixed(1)} ${y(b).toFixed(1)}`).join("L")}L${x(series.length - 1).toFixed(1)} ${H}L0 ${H}Z`;
  const line = (series: number[]) => `M${series.map((b, k) => `${x(k).toFixed(1)} ${y(b).toFixed(1)}`).join("L")}`;

  return (
    <LoanCard label="What if" title="What if" note="a prepayment today · estimates" right={<Segmented label="Effect" options={EFFECTS} value={effect} onChange={setEffect} small />}>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
        <span className="flex items-center gap-2">
          <LoanIcon category={what.badge.category} colorKey={what.badge.colorKey} size={22} />
          {what.loan.name} · prepay
          <label className="relative">
            <span className="sr-only">Amount to prepay</span>
            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" aria-hidden="true">
              ₹
            </span>
            <input type="text" inputMode="decimal" value={effect === "Close" ? "" : amountText} placeholder={effect === "Close" ? "all of it" : ""} disabled={effect === "Close"} onChange={(e) => setAmountText(e.target.value)} className="h-8 w-[118px] rounded-full border border-surface-line bg-surface pr-3 pl-6 text-xs font-extrabold tabular-nums focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-accent/25 focus-visible:outline-none disabled:bg-fill" />
          </label>
          today
        </span>
        {isAll && <span className="font-semibold text-muted">pick a loan to try another</span>}
      </div>
      {result ? (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="min-h-[120px] w-full flex-1" role="img" aria-label={`Balance as scheduled, and after prepaying ${formatInr(result.amount)}`}>
            <path d={area(before)} fill="var(--fill)" />
            <path d={line(before)} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
            <path d={area(after)} fill={`var(--card-${what.badge.colorKey})`} fillOpacity="0.9" />
          </svg>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[16px] bg-ink px-4 py-3 text-on-ink">
              <span className="block text-[10.5px] font-extrabold tracking-[0.06em] uppercase opacity-70">Interest saved · estimate</span>
              <b className="mt-1 block text-[22px] font-extrabold tabular-nums">{formatInr(result.interestSaved)}</b>
            </div>
            <div className="rounded-[16px] border border-surface-line px-4 py-3">
              <span className="block text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">Charge · separate</span>
              <b className="mt-1 block text-[22px] font-extrabold tabular-nums">{formatInr(result.charge)}</b>
            </div>
          </div>
          <p className="text-xs font-semibold text-muted">
            {result.closes
              ? `Closes the loan: ${formatInr(result.payToday)} today, with ${result.days} days' interest and the charge.`
              : effect === "Reduce-Emi"
                ? `EMI ${formatInr(result.emiBefore)} → ${formatInr(result.emiAfter)}, still ends ${formatDate(result.end)}.`
                : `${result.removed.length - result.added.length} EMIs fewer at the same ${formatInr(result.emiBefore)}, ends ${formatDate(result.end)} instead of ${formatDate(result.endBefore)}.`}
          </p>
        </>
      ) : (
        <p className="flex flex-1 items-center justify-center py-8 text-sm font-semibold text-muted">{amount > what.outstanding ? `That's more than the ${formatInr(what.outstanding)} left. Choose Close.` : "Enter an amount to see what it saves."}</p>
      )}
      <div className="mt-auto flex justify-end">
        <FormTrigger className={SMALL_SOFT} label="Add prepayment" onClick={() => open({ kind: "prepay", loanId: what.loan.id })} />
      </div>
    </LoanCard>
  );
}
