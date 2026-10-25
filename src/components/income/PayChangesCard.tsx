"use client";

import { useState } from "react";
import type { PayChangesCard as PayChangesData } from "@/app/income/lowerView";
import { Segmented } from "../subscriptions/Segmented";
import { SourceIcon } from "./SourceIcon";

/**
 * Pay changes (IncomeZ1): each payment 2% or more off the one before it from the same source and tag, as bars by
 * percent or in rupees, with how many there were, the biggest rise, and what they add up to.
 */
export function PayChangesCard({ card }: { card: PayChangesData }) {
  const [by, setBy] = useState<"pct" | "inr">("pct");
  const top = Math.max(0.0001, ...card.bars.map((b) => Math.abs(by === "pct" ? b.ratio : b.change)));
  return (
    <section aria-label="Pay changes" className="flex min-w-0 flex-col gap-4 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold">
          Pay changes <small className="ml-2 text-xs font-semibold text-muted">a payment 2% or more off the one before it</small>
        </h2>
        <Segmented label="Show" value={by} onChange={setBy} options={[{ value: "pct", label: "By %" }, { value: "inr", label: "In ₹" }]} small />
      </div>
      <dl className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">Changes</dt>
          <dd className="text-xl font-extrabold tabular-nums">{card.count}</dd>
          <dd className="text-[11.5px] font-semibold text-muted">{card.countNote}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">Biggest rise</dt>
          <dd className="text-xl font-extrabold text-accent-text tabular-nums">{card.biggest?.value ?? "—"}</dd>
          <dd className="text-[11.5px] font-semibold text-muted">{card.biggest?.note ?? "no rise"}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[10.5px] font-extrabold tracking-[0.06em] text-muted uppercase">Added up</dt>
          <dd className="text-xl font-extrabold tabular-nums">{card.added.value}</dd>
          <dd className="text-[11.5px] font-semibold text-muted">{card.added.note}</dd>
        </div>
      </dl>
      {card.bars.length === 0 ? (
        <p className="flex-1 py-8 text-center text-sm font-semibold text-muted">No payment has moved 2% or more yet.</p>
      ) : (
        <ul className="flex flex-1 flex-col gap-2.5">
          {card.bars.map((b) => {
            const value = Math.abs(by === "pct" ? b.ratio : b.change);
            return (
              <li key={b.key} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 max-sm:grid-cols-[minmax(0,1fr)_auto]">
                <span className="flex min-w-0 items-center gap-2">
                  <SourceIcon icon={b.icon} name={b.name} colorKey={b.colorKey} size={28} />
                  <span className="min-w-0">
                    <b className="block truncate text-[12.5px] font-extrabold">{b.name}</b>
                    <span className="block text-[11px] font-semibold text-muted">{b.when}</span>
                  </span>
                </span>
                <span className="relative h-6 overflow-hidden rounded-full bg-fill max-sm:hidden" aria-hidden="true">
                  <i className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(6, (value / top) * 100)}%`, background: `linear-gradient(90deg, color-mix(in oklch, var(--card-${b.colorKey}) 75%, white), var(--card-${b.colorKey}))` }} />
                  <span className="absolute inset-y-0 left-2.5 flex items-center text-[11px] font-extrabold text-on-card">{by === "pct" ? b.label : b.amountLabel}</span>
                </span>
                <span className={`text-right text-[12px] font-semibold tabular-nums ${b.ratio > 0 ? "text-fg" : "text-negative"}`}>
                  <span className="sm:hidden">{by === "pct" ? b.label : b.amountLabel} · </span>
                  {b.amounts}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="border-t border-divider pt-3 text-[11.5px] font-semibold text-muted">A raise, a bigger payment or a lower dividend, newest first.</p>
    </section>
  );
}
