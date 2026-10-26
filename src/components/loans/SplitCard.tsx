"use client";

import { useState } from "react";
import type { SplitBar, SplitView } from "@/app/loans/widgetsView";
import { formatMonthYear } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { Segmented } from "../subscriptions/Segmented";
import { ColorMark, InterestMark, LoanCard, PrincipalMark, SplitLegend, Tip, TipBody } from "./parts";

const PLOT = 250;

/** A bar's label as the design writes it: "₹49k", "₹2.4L". */
const short = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1).replace(/\.0$/, "")}L` : n >= 1000 ? `₹${Math.round(n / 1000)}k` : `₹${Math.round(n)}`);

/**
 * Principal and interest (LoansN1, beside Payments, as Subscriptions' cost map sits beside its Payments): each EMI
 * split, month by month (the last eleven, this one and the next twelve) or by year to the end. Principal is solid and
 * interest a dashed outline (P6); months still to come are faded. Hover a bar for its split and, with all loans, each
 * loan's EMIs in it.
 */
export function SplitCard({ split }: { split: SplitView }) {
  const [view, setView] = useState<"m" | "y">("m");
  const bars = view === "m" ? split.months : split.years;
  const top = Math.max(1, ...bars.map((b) => b.principal + b.interest));
  const now = view === "m" ? split.thisMonth : split.thisYear;
  const nowTotal = now.principal + now.interest;
  const nowBar = bars.find((b) => b.now);
  return (
    <LoanCard label="Principal and interest" title="Principal and interest" note="each EMI, split · hover a bar" right={<Segmented label="Show" options={[{ value: "m", label: "Month by month" }, { value: "y", label: "By year" }]} value={view} onChange={setView} small />}>
      <SplitLegend />
      <div className="flex flex-1 items-end gap-[3px] sm:gap-1.5" style={{ minHeight: PLOT + 40 }}>
        {bars.map((b, k) => (
          <Bar key={b.key} bar={b} top={top} monthly={view === "m"} align={k < 3 ? "left" : k > bars.length - 4 ? "right" : "center"} />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <span className="text-muted">
          {view === "m" ? `This month, ${nowBar ? formatMonthYear(nowBar.key) : ""}` : "This year"}: <b className="text-fg">{formatInr(nowTotal)}</b> = {formatInr(now.principal)} principal + {formatInr(now.interest)} interest
        </span>
        {nowTotal > 0 && <span className="rounded-full bg-warning-tint px-2.5 py-1 text-[11px] font-extrabold text-warning-text">{Math.round((now.interest / nowTotal) * 100)}% interest</span>}
      </div>
    </LoanCard>
  );
}

function Bar({ bar, top, monthly, align }: { bar: SplitBar; top: number; monthly: boolean; align: "left" | "center" | "right" }) {
  const total = bar.principal + bar.interest;
  const height = (total / top) * PLOT;
  const title = monthly ? formatMonthYear(bar.key) : bar.key;
  return (
    <Tip
      className={`flex min-w-0 flex-1 flex-col items-stretch justify-end gap-1 ${bar.future && monthly ? "opacity-60" : ""}`}
      align={align}
      label={`${title}: ${formatInr(total)}, ${formatInr(bar.principal)} principal and ${formatInr(bar.interest)} interest`}
      card={
        <TipBody
          head={title}
          aside={bar.now ? <span className="rounded-full bg-[var(--tip-fg)] px-2 py-px text-[10px] text-[var(--tip-surface)] normal-case">{monthly ? "this month" : "this year"}</span> : bar.future ? <span className="normal-case">still to come</span> : undefined}
          total={formatInr(total)}
          detail={total ? `${Math.round((bar.interest / total) * 100)}% of it is interest` : "No EMI"}
          rows={[{ name: "Principal", amount: formatInr(bar.principal), mark: <PrincipalMark size={8} /> }, { name: "Interest", amount: formatInr(bar.interest), mark: <InterestMark size={8} /> }, ...bar.byLoan.map((l) => ({ name: l.name, amount: formatInr(l.amount), mark: <ColorMark colorKey={l.colorKey} size={8} /> }))]}
        />
      }
    >
      <span className="block text-center text-[9.5px] font-extrabold whitespace-nowrap text-muted tabular-nums max-sm:hidden" style={{ visibility: total ? "visible" : "hidden" }}>
        {short(total)}
      </span>
      <span className="flex flex-col overflow-hidden rounded-t-[8px] rounded-b-[3px]" style={{ height }} aria-hidden="true">
        <i className="block border-[1.5px] border-b-0 border-dashed border-[var(--loan-interest)] bg-[var(--loan-interest-tint)]" style={{ height: total ? `${(bar.interest / total) * 100}%` : 0 }} />
        <i className="block flex-1 bg-[var(--loan-principal)]" />
      </span>
      <span className={`block text-center text-[10px] leading-tight font-extrabold ${bar.now ? "text-fg" : "text-muted"}`} aria-hidden="true">
        <span className={monthly ? "max-sm:hidden" : ""}>{bar.label.toUpperCase()}</span>
        {monthly && <span className="sm:hidden">{bar.label[0]}</span>}
        {bar.sub && <small className="block text-[9px] font-bold opacity-70">{bar.sub}</small>}
      </span>
    </Tip>
  );
}
