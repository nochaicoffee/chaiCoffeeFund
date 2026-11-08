import Link from "next/link";
import type { BigSpendsView, MonthsView, WhereView } from "@/app/expenses/views";
import { PART_COLORS } from "@/app/expenses/views";
import { WidgetCard } from "@/components/shell/WidgetCard";
import { CategoryIcon } from "./CategoryIcon";
import { AddBigSpendButton, EditBigSpend } from "./forms/ExpenseForms";

import { HATCH } from "./hatch";
const SMALL = "inline-flex min-h-8 items-center gap-1.5 rounded-full bg-fill px-3.5 text-xs font-extrabold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent";
const tone = (t: "good" | "bad" | "plain") => (t === "good" ? "text-positive" : t === "bad" ? "text-negative" : "text-muted");

/** Where the month went (ExF1): each part as a bar, its big spends as the light end of it, and the month against a usual one. */
export function WhereWentCard({ view }: { view: WhereView }) {
  return (
    <WidgetCard label={view.title} title={view.title} right={<b className="text-xl font-extrabold tabular-nums">{view.total}</b>}>
      <ul className="flex flex-col gap-3.5">
        {view.rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]">
            <span className="flex min-w-0 items-start gap-2">
              <i aria-hidden="true" className="mt-1 size-2.5 shrink-0 rounded-[3px]" style={{ background: `var(--card-${PART_COLORS[r.key]})` }} />
              <span className="min-w-0">
                <b className="block text-[13.5px] font-extrabold">{r.name}</b>
                <small className="block text-[11.5px] font-semibold text-muted">{r.note}</small>
              </span>
            </span>
            <span aria-hidden="true" className="col-span-2 row-start-2 h-3 overflow-hidden rounded-full bg-fill md:col-span-1 md:row-start-auto">
              <span className="flex h-full" style={{ width: `${r.fraction * 100}%` }}>
                <i className="block h-full" style={{ flexGrow: 1 - r.bigFraction, background: r.key === "cash" ? `${HATCH}, var(--card-${PART_COLORS[r.key]})` : `var(--card-${PART_COLORS[r.key]})` }} />
                {r.bigFraction > 0 && <i className="block h-full" style={{ flexGrow: r.bigFraction, background: `color-mix(in oklch, var(--card-${PART_COLORS[r.key]}) 40%, white)` }} />}
              </span>
            </span>
            <span className="text-right">
              <b className={`block text-[15px] font-extrabold tabular-nums ${r.negative ? "text-negative" : ""}`}>{r.amount}</b>
              {r.share && <small className="text-[11px] font-semibold text-muted">{r.share}</small>}
            </span>
            {r.bigs.length > 0 && (
              <span className="col-span-2 flex flex-wrap gap-1.5 md:col-start-2 md:col-end-4">
                {r.bigs.map((b) => (
                  <span key={b.key} className="inline-flex items-center gap-1.5 rounded-full bg-warning-tint px-2.5 py-1 text-[11.5px] font-bold text-warning-text">
                    <CategoryIcon category={b.category} size={12} />
                    {b.name} <b className="font-extrabold">{b.amount}</b>
                  </span>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
      {view.usual && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-extrabold tracking-[0.05em] text-muted uppercase">
            Against your usual month <small className="ml-1 font-semibold tracking-normal normal-case">the average of the months worked out</small>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {view.usual.map((u) => (
              <div key={u.key} className="rounded-[14px] bg-fill px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-muted">
                  <i aria-hidden="true" className="size-2 rounded-[3px]" style={{ background: `var(--card-${PART_COLORS[u.key]})` }} />
                  {u.name}
                </span>
                <b className="block text-[16px] font-extrabold tabular-nums">{u.amount}</b>
                <small className={`text-[10.5px] font-bold ${tone(u.tone)}`}>{u.diff}</small>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted">{view.foot}</p>
        <Link href={view.statement.href} className="text-[13px] font-extrabold whitespace-nowrap text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          {view.statement.label} →
        </Link>
      </div>
    </WidgetCard>
  );
}

/** Big spends (ExF1): a strip by category, the newest five (one in a card bill not paid yet says so), each opening Edit. */
export function BigSpendsCard({ view }: { view: BigSpendsView | null }) {
  return (
    <WidgetCard label="Big spends" title="Big spends" note={view?.note} right={<AddBigSpendButton className={SMALL} label="Add" />}>
      {!view ? (
        <p className="text-sm font-semibold text-muted">Log a large purchase here (flights, a phone, a sofa) and the month it counts in can say what made it high. A big spend never adds to what was spent: it&apos;s already inside a card bill or cash and UPI.</p>
      ) : (
        <>
          <div aria-hidden="true" className="flex h-3 gap-1 overflow-hidden rounded-full">
            {view.strip.map((s) => (
              <i key={s.category} className="block h-full" style={{ flexGrow: s.share, background: `var(--card-${s.colorKey})` }} />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs font-semibold text-muted">
            {view.strip.map((s) => (
              <li key={s.category} className="inline-flex items-center gap-1.5">
                <i aria-hidden="true" className="size-2 rounded-full" style={{ background: `var(--card-${s.colorKey})` }} />
                {s.category} <b className="text-fg">{s.amount}</b>
              </li>
            ))}
          </ul>
          <ul className="flex flex-col">
            {view.rows.map((r) => (
              <li key={r.id}>
                <EditBigSpend id={r.id} label={`Edit ${r.name}`} className={`grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent ${r.picked ? "bg-accent-tint" : ""}`}>
                  <span className="flex size-9 items-center justify-center rounded-[10px] text-white" style={{ background: `var(--card-${r.colorKey})` }}>
                    <CategoryIcon category={r.category} size={16} />
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate text-[13.5px] font-extrabold">{r.name}</b>
                    <small className="block truncate text-[11.5px] font-semibold text-muted">{r.sub}</small>
                  </span>
                  <span className="text-right">
                    <b className="block text-[14.5px] font-extrabold tabular-nums">{r.amount}</b>
                    <small className={`text-[11px] font-bold ${r.waiting ? "rounded-full bg-warning-tint px-2 py-0.5 text-warning-text" : "text-muted"}`}>{r.when}</small>
                  </span>
                </EditBigSpend>
              </li>
            ))}
          </ul>
          {view.more > 0 && <p className="mt-auto text-xs font-semibold text-muted">{view.more} more in these 12 months.</p>}
        </>
      )}
    </WidgetCard>
  );
}

/** Month by month (ExF1): a row per month, newest first; came in = invested + lent out + kept + spent on every worked-out row. */
export function MonthsTable({ view }: { view: MonthsView }) {
  const head = ["Month", "Came in", "Invested", "Lent out", "Kept", "Spent", "Cards", "EMIs", "Subs + insurance", "Cash and UPI"];
  return (
    <WidgetCard
      label="Month by month"
      title="Month by month"
      note="came in = invested + lent out + kept + spent, every month worked out"
      right={
        <Link href="/expenses/statements" className="text-[13px] font-extrabold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          Every payment, month by month →
        </Link>
      }
    >
      <div className="-mx-2 overflow-x-auto px-2">
        <table className="w-full min-w-[960px] border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b border-divider text-[11px] font-extrabold tracking-[0.05em] text-muted uppercase">
              {head.map((h, i) => (
                <th key={h} scope="col" className={`px-2.5 py-2.5 ${i === 0 ? "text-left" : "text-right"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r) => (
              <tr key={r.month} className={`border-b border-divider ${r.picked ? "bg-accent-tint" : "hover:bg-fill"}`}>
                <th scope="row" className="px-2.5 py-2.5 text-left">
                  <Link href={`/expenses?month=${r.month}`} scroll={false} aria-current={r.picked ? "true" : undefined} className="font-extrabold hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                    {r.label}
                  </Link>
                  {r.bigLabel && <small className="block text-[11px] font-semibold text-muted">★ {r.bigLabel}</small>}
                </th>
                <td className="px-2.5 text-right tabular-nums">{r.cameIn}</td>
                <td className="px-2.5 text-right tabular-nums">{r.invested}</td>
                <td className="px-2.5 text-right tabular-nums">{r.lentOut}</td>
                <td className={`px-2.5 text-right font-bold tabular-nums ${tone(r.keptTone)}`}>{r.kept}</td>
                <td className={`px-2.5 text-right tabular-nums ${r.status === "done" ? "font-extrabold" : "text-xs font-semibold text-muted"}`}>{r.spent}</td>
                <td className="px-2.5 text-right tabular-nums">{r.card}</td>
                <td className="px-2.5 text-right tabular-nums">{r.emi}</td>
                <td className="px-2.5 text-right tabular-nums">{r.subsIns}</td>
                <td className="px-2.5 text-right tabular-nums">{r.cash}</td>
              </tr>
            ))}
          </tbody>
          {view.doneCount > 0 && (
            <tfoot>
              <tr className="bg-fill font-extrabold">
                <th scope="row" className="rounded-l-[12px] px-2.5 py-3 text-left">{view.total.label}</th>
                <td className="px-2.5 text-right tabular-nums">{view.total.cameIn}</td>
                <td className="px-2.5 text-right tabular-nums">{view.total.invested}</td>
                <td className="px-2.5 text-right tabular-nums">{view.total.lentOut}</td>
                <td className={`px-2.5 text-right tabular-nums ${tone(view.total.keptTone)}`}>{view.total.kept}</td>
                <td className="px-2.5 text-right tabular-nums">{view.total.spent}</td>
                <td className="px-2.5 text-right tabular-nums">{view.total.card}</td>
                <td className="px-2.5 text-right tabular-nums">{view.total.emi}</td>
                <td className="px-2.5 text-right tabular-nums">{view.total.subsIns}</td>
                <td className="rounded-r-[12px] px-2.5 text-right tabular-nums">{view.total.cash}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </WidgetCard>
  );
}
