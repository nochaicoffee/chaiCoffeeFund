"use client";

import { useState } from "react";
import type { ComingUpView, LoansTableView, MoneyBackView } from "@/app/lent/widgetsView";
import type { PayoutVerdict } from "@/lib/aggregate/lentPromises";
import { colorGradient } from "@/lib/format/colors";
import { CloseIcon, MenuAction, RowMenu } from "../RowMenu";
import { AlertIcon, CheckIcon, PlusIcon } from "../cards/forms/icons";
import { WidgetCard } from "../shell/WidgetCard";
import { useLentForms } from "./forms/LentForms";

const SMALL_LINK = "text-xs font-extrabold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent";
const COLS = "lg:grid-cols-[minmax(0,2.2fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1.2fr)]";

function Initial({ name, colorKey }: { name: string; colorKey: Parameters<typeof colorGradient>[0] }) {
  return (
    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-[11px] text-[12px] font-extrabold text-on-card" style={{ background: colorGradient(colorKey) }}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

const DOT: Record<PayoutVerdict, string> = {
  "On time": "bg-positive",
  "Paid late": "bg-warning",
  Overdue: "border-2 border-warning",
  Missing: "bg-negative",
  Waiting: "border border-dashed border-muted",
};
const DOTS_MAX = 24;

/** One dot for each payout promised, the last 24. */
function Dots({ verdicts }: { verdicts: PayoutVerdict[] }) {
  const shown = verdicts.slice(-DOTS_MAX);
  const arrived = verdicts.filter((v) => v === "On time" || v === "Paid late").length;
  return (
    <span className="mt-1 flex flex-wrap gap-1" role="img" aria-label={`Promised against arrived: ${arrived} of ${verdicts.length} arrived`}>
      {shown.map((v, i) => (
        <i key={i} title={v} className={`block size-2 rounded-full ${DOT[v]}`} />
      ))}
    </span>
  );
}

function Cell({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col text-[13px] tabular-nums ${className}`}>
      <span className="text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase lg:hidden">{label}</span>
      {children}
    </div>
  );
}

/** The loans as a table (a card for each on a phone): rate, what was lent, what came back, interest, what is owed and when the next payout is due. */
export function LoansTable({ view }: { view: LoansTableView }) {
  const { open } = useLentForms();
  return (
    <WidgetCard label="Loans" title="Loans" note="money you've lent, outside any bank">
      <div className="flex flex-col">
        <div className={`hidden gap-3 px-1 pb-2 text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase lg:grid ${COLS}`} aria-hidden="true">
          <span>Loan</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Lent</span>
          <span className="text-right">Back so far</span>
          <span className="text-right">Interest</span>
          <span className="text-right">Owed today</span>
          <span className="text-right">Next due</span>
        </div>
        {view.rows.map((r) => (
          <div key={r.id} className={`grid items-start gap-x-3 gap-y-3 border-t border-divider px-1 py-3.5 max-lg:grid-cols-2 ${COLS} ${r.repaid || r.settled ? "opacity-60" : ""}`}>
            <div className="flex min-w-0 items-start gap-3 max-lg:col-span-2">
              <Initial name={r.name} colorKey={r.colorKey} />
              <span className="min-w-0 flex-1">
                <b className="block text-[13px] font-extrabold">
                  {r.name}
                  <span className={`ml-2 rounded-full px-2 py-0.5 align-middle text-[10px] font-bold whitespace-nowrap ${r.repaid || r.settled ? "bg-fill text-muted" : r.kind === "Accruing" ? "bg-warning-tint text-warning-text" : "bg-accent-tint text-accent-text"}`}>{r.repaid ? "Repaid" : r.settled ? "Paid back" : r.kind}</span>
                </b>
                <span className="block text-[11px] font-medium text-muted">{r.lent}</span>
                {r.verdicts && <Dots verdicts={r.verdicts} />}
              </span>
              <RowMenu triggerLabel={`More for ${r.name}`} menuLabel={r.name}>
                {!r.repaid && !r.settled && <MenuAction icon={<PlusIcon />} label="Record a repayment" onSelect={() => open({ kind: "repay", id: r.id })} />}
                <MenuAction icon={<CheckIcon />} label="Edit loan" onSelect={() => open({ kind: "edit", id: r.id })} />
                {r.repaid ? <MenuAction icon={<AlertIcon />} label="Reopen" onSelect={() => open({ kind: "reopen", id: r.id })} /> : <MenuAction icon={<CheckIcon />} label="Mark repaid" onSelect={() => open({ kind: "repaid", id: r.id })} />}
                <MenuAction icon={<CloseIcon />} label="Delete loan" danger onSelect={() => open({ kind: "delete", id: r.id })} />
              </RowMenu>
            </div>
            <Cell label="Rate" className="lg:text-right">
              <b>{r.rate}</b>
              <small className="text-[11px] font-medium text-muted">{r.rateNote}</small>
            </Cell>
            <Cell label="Lent" className="lg:text-right">
              <b>{r.lentAmount}</b>
              <small className="text-[11px] font-medium text-muted">{r.lentNote}</small>
            </Cell>
            <Cell label="Back so far" className="lg:text-right">
              <b>{r.back}</b>
              <small className="text-[11px] font-medium text-muted">{r.backNote}</small>
            </Cell>
            <Cell label="Interest" className="lg:text-right">
              <b>{r.interest}</b>
              <small className={`text-[11px] font-medium ${r.interestWarn ? "font-extrabold text-negative" : "text-muted"}`}>{r.interestNote}</small>
            </Cell>
            <Cell label="Owed today" className="lg:text-right">
              <b>{r.owed}</b>
              <small className="text-[11px] font-medium text-muted">{r.owedNote}</small>
            </Cell>
            <Cell label="Next due" className="lg:text-right">
              <b>{r.next}</b>
              <small className="text-[11px] font-medium text-muted">{r.nextNote}</small>
            </Cell>
          </div>
        ))}
        <div className={`grid items-start gap-x-3 gap-y-1 border-t-2 border-divider px-1 pt-3.5 max-lg:grid-cols-2 ${COLS}`}>
          <b className="text-[11px] font-extrabold tracking-[0.06em] text-muted uppercase max-lg:col-span-2">All loans</b>
          <span className="max-lg:hidden" />
          <Cell label="Lent" className="lg:text-right"><b>{view.total.lent}</b></Cell>
          <Cell label="Back so far" className="lg:text-right"><b>{view.total.back}</b></Cell>
          <Cell label="Interest" className="lg:text-right">
            <b>{view.total.interest}</b>
            <small className="text-[11px] font-medium text-muted">{view.total.interestNote}</small>
          </Cell>
          <Cell label="Owed today" className="lg:text-right"><b>{view.total.owed}</b></Cell>
          <span className="max-lg:hidden" />
        </div>
      </div>
    </WidgetCard>
  );
}

const SHOWN = 6;

/** Interest coming up: an overdue payout leads, then the 12% pile that builds each day, then the dated payouts. */
export function ComingUpCard({ view }: { view: ComingUpView }) {
  const [all, setAll] = useState(false);
  const rows = all ? view.rows : view.rows.slice(0, SHOWN);
  return (
    <WidgetCard
      label="Interest coming up"
      title="Interest coming up"
      note="dated payouts, and the one that piles up"
      right={view.rows.length > SHOWN && <button type="button" aria-expanded={all} onClick={() => setAll(!all)} className={SMALL_LINK}>{all ? "Fewer dates" : "All dates"} →</button>}
    >
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.key} className={`grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-3 py-2.5 ${r.overdue ? "bg-warning-tint" : r.daily ? "bg-fill" : ""}`}>
            <span aria-hidden="true" className="flex h-12 flex-col items-center justify-center rounded-[12px] bg-fill leading-none">
              {r.daily ? (
                <>
                  <b className="text-xl font-extrabold">∞</b>
                  <small className="mt-0.5 text-[9px] font-extrabold tracking-[0.06em] text-muted">DAILY</small>
                </>
              ) : (
                <>
                  <b className="text-lg font-extrabold tabular-nums">{r.day}</b>
                  <small className="mt-0.5 text-[9px] font-extrabold tracking-[0.06em] text-muted">{r.month}</small>
                </>
              )}
            </span>
            <span className="min-w-0">
              <b className="block truncate text-[13px] font-extrabold">{r.title}</b>
              <span className="block text-[11px] font-medium text-muted">{r.note}</span>
            </span>
            <span className="text-right text-[13px] tabular-nums">
              <b className="block font-extrabold">{r.amount}</b>
              <span className={`block text-[11px] font-medium ${r.overdue ? "font-extrabold text-warning-text" : "text-muted"}`}>{r.when}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-auto text-[11px] font-medium text-muted">{view.note}</p>
    </WidgetCard>
  );
}

const TAG: Record<string, string> = { "on time": "bg-accent-tint text-accent-text", late: "bg-warning-tint text-warning-text", principal: "bg-fill text-fg", interest: "bg-fill text-fg" };

/** Money back: what has reached you, newest first, from Income's matched credits and from the repayments you recorded. */
export function MoneyBackCard({ view }: { view: MoneyBackView }) {
  const { open } = useLentForms();
  const [all, setAll] = useState(false);
  const rows = all ? view.rows : view.rows.slice(0, SHOWN);
  return (
    <WidgetCard
      label="Money back"
      title="Money back"
      note="interest from Income, and repayments you record"
      right={view.rows.length > SHOWN && <button type="button" aria-expanded={all} onClick={() => setAll(!all)} className={SMALL_LINK}>{all ? "Fewer" : "Everything"} →</button>}
    >
      {rows.length > 0 && (
        <ul className="flex flex-col">
          {rows.map((r) => (
            <li key={r.key} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-t border-divider py-3 first:border-t-0 first:pt-0">
              <span aria-hidden="true" className="flex h-12 flex-col items-center justify-center rounded-[12px] bg-fill leading-none">
                <b className="text-lg font-extrabold tabular-nums">{r.day}</b>
                <small className="mt-0.5 text-[9px] font-extrabold tracking-[0.06em] text-muted">{r.month}</small>
              </span>
              <span className="min-w-0">
                <b className="block truncate text-[13px] font-extrabold">
                  {r.title} <span className={`ml-1 rounded-full px-2 py-0.5 align-middle text-[10px] font-bold ${TAG[r.tag]}`}>{r.tag}</span>
                </b>
                <span className="block text-[11px] font-medium text-muted">{r.note}</span>
              </span>
              <span className="text-right text-[13px] tabular-nums">
                <b className="block font-extrabold">{r.amount}</b>
                <span className="block text-[11px] font-medium text-muted">{r.when}</span>
                {r.repaymentId && (
                  <button type="button" onClick={() => open({ kind: "delete-repayment", id: r.repaymentId! })} className="mt-0.5 text-[11px] font-bold text-negative hover:underline focus-visible:outline-2 focus-visible:outline-accent" aria-label={`Delete the ${r.amount} repayment from ${r.title}`}>
                    Delete
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {view.empty && <p className="mt-auto rounded-[14px] bg-accent-tint px-4 py-3 text-[12px] font-semibold text-accent-text">{view.empty}</p>}
    </WidgetCard>
  );
}
