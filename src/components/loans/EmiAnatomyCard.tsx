"use client";

import { useState } from "react";
import type { EmiAnatomyView } from "@/app/loans/widgetsView";
import { Segmented } from "../subscriptions/Segmented";
import { LoanCard, LoanIcon } from "./parts";

type Point = "first" | "next" | "last";

/**
 * Inside an EMI (LoansN1): the picked loan's first, next or last EMI split into principal and interest (₹ of every
 * ₹100 that's interest), and the whole loan's curve of principal against interest with a marker on that EMI.
 */
export function EmiAnatomyCard({ view }: { view: EmiAnatomyView }) {
  const [point, setPoint] = useState<Point>(view.points.next ? "next" : "first");
  const p = view.points[point] ?? view.points.first;
  const W = 1000;
  const H = 90;
  const curve = `M${view.curve.map((c) => `${(c.at * W).toFixed(1)} ${(H - c.principalShare * H).toFixed(1)}`).join("L")}L${W} ${H}L0 ${H}Z`;
  const at = p.of > 1 ? (p.number - view.points.first.number) / (p.of - 1) : 0;
  const first = view.points.first;
  const last = view.points.last;
  const options = [{ value: "first" as const, label: "First EMI" }, ...(view.points.next ? [{ value: "next" as const, label: "Next EMI" }] : []), { value: "last" as const, label: "Last EMI" }];
  return (
    <LoanCard label="Inside an EMI" title="Inside an EMI" note="principal against interest, over the whole loan" right={<Segmented label="EMI" options={options} value={point} onChange={setPoint} small />}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <span className="flex items-center gap-2">
          <LoanIcon category={view.loan.category} colorKey={view.loan.colorKey} size={22} />
          {view.loan.name} · EMI {p.number} of {p.of}
        </span>
        <span className="font-semibold text-muted">due {p.due}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-2.5">
        <b className="text-[34px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">{p.total}</b>
        <span className="text-[13px] font-semibold text-muted">
          <b className="text-fg">₹{Math.round(p.interestShare * 100)}</b> of every ₹100 is interest
        </span>
      </div>
      <div>
        <span className="flex h-[26px] overflow-hidden rounded-[9px]" aria-hidden="true">
          <i className="block bg-[var(--loan-principal)] motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${(1 - p.interestShare) * 100}%` }} />
          <i className="block flex-1 rounded-r-[9px] border-[1.5px] border-dashed border-[var(--loan-interest)] bg-[var(--loan-interest-tint)]" />
        </span>
        <span className="mt-1.5 flex justify-between text-xs font-semibold text-muted">
          <span>Principal {p.principal}</span>
          <span>Interest {p.interest}</span>
        </span>
      </div>
      <div className="relative mt-1 mb-5 min-h-[90px] flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
          <rect width={W} height={H} fill="var(--loan-interest-tint)" stroke="var(--loan-interest)" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          <path d={curve} fill="var(--loan-principal)" />
        </svg>
        <span aria-hidden="true" className="absolute inset-y-0 w-0 border-l-2 border-fg motion-safe:transition-[left] motion-safe:duration-500" style={{ left: `${at * 100}%` }}>
          <i className="absolute -left-[7px] size-3 rounded-full border-2 border-fg bg-surface" style={{ top: `${p.interestShare * 100}%`, transform: "translateY(-50%)" }} />
        </span>
        <span className="absolute top-full left-0 mt-1 text-[10.5px] font-extrabold text-muted">first: {Math.round(first.interestShare * 100)}% interest</span>
        <span className="absolute top-full right-0 mt-1 text-[10.5px] font-extrabold text-muted">last: {Math.round(last.interestShare * 100)}%</span>
      </div>
    </LoanCard>
  );
}
