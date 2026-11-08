import Link from "next/link";
import type { MonthStatementView } from "@/app/expenses/statements/statementsView";
import { formatMonthYear } from "@/lib/format/date";
import { HATCH } from "../hatch";
import { BigTag, LooseTags } from "./StatementsLedger";

const NAV = "inline-flex min-h-9 items-center gap-1 rounded-full bg-fill px-3.5 text-[12.5px] font-extrabold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent";

/** One month as a statement (ExS2): every payment under its part with subtotals and the total, stepping through the months, with How it adds up beside it. */
export function MonthStatement({ view }: { view: MonthStatementView }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <section aria-label={view.title} className="flex min-w-0 flex-col gap-1.5 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)] md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-extrabold">
            {view.title} <small className="ml-1.5 text-xs font-semibold text-muted">{view.span}</small>
          </h2>
          <nav aria-label="Months" className="flex items-center gap-2">
            {view.prev ? <Link href={`/expenses/statements?month=${view.prev}`} className={NAV} aria-label={`Previous month, ${formatMonthYear(view.prev)}`}>‹ {formatMonthYear(view.prev).slice(0, 3)}</Link> : <span className={`${NAV} opacity-35`}>‹</span>}
            {view.next ? <Link href={`/expenses/statements?month=${view.next}`} className={NAV} aria-label={`Next month, ${formatMonthYear(view.next)}`}>{formatMonthYear(view.next).slice(0, 3)} ›</Link> : <span className={`${NAV} opacity-35`}>›</span>}
          </nav>
        </div>
        {view.notice && <p className="mt-2 rounded-[12px] bg-warning-tint px-3.5 py-2.5 text-xs font-semibold text-warning-text">{view.notice}</p>}
        {view.sections.length === 0 && <p className="py-6 text-sm font-semibold text-muted">No payments recorded this month.</p>}
        {view.sections.map((s) => (
          <div key={s.part} className="grid pt-1 pb-2.5">
            <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-baseline gap-2.5 border-b-[1.5px] border-fg pt-2.5 pb-2">
              <i aria-hidden="true" className="size-2.5 self-center rounded-[3px]" style={{ background: s.part === "cash" ? `${HATCH}, var(--card-${s.colorKey})` : `var(--card-${s.colorKey})` }} />
              <b className="text-[13px] font-extrabold tracking-[0.04em] uppercase">{s.name}</b>
              <small className="text-xs font-semibold text-muted">{s.note}</small>
              <span className="text-[15px] font-extrabold tabular-nums">{s.total}</span>
            </div>
            {s.lines.map((l) => (
              <div key={l.key} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-start gap-3.5 border-b border-dashed border-divider py-2.5 text-[13.5px]">
                <span className="pt-px text-[12.5px] font-bold text-muted">{l.day} {l.mon}</span>
                <span className="grid min-w-0 gap-0.5">
                  <b className="font-extrabold">{l.label}</b>
                  <small className="text-[11.5px] font-semibold text-muted">{[l.detail, l.from.charAt(0).toLowerCase() + l.from.slice(1)].filter(Boolean).join(" · ")}</small>
                  {l.tags.length > 0 && (
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {l.tags.map((t) => (
                        <BigTag key={t.key} tag={t} />
                      ))}
                    </span>
                  )}
                </span>
                <b className={`text-right text-[14.5px] font-extrabold tabular-nums ${l.amount.startsWith("−") ? "text-negative" : ""}`}>{l.amount}</b>
              </div>
            ))}
          </div>
        ))}
        {view.loose.length > 0 && <LooseTags tags={view.loose} />}
        <div className="mt-auto flex items-baseline justify-between border-t-2 border-fg pt-3.5 text-[15px] font-extrabold tracking-[0.04em] uppercase">
          {view.total.label} <b className="text-[22px] tracking-tight tabular-nums">{view.total.amount}</b>
        </div>
      </section>

      <section aria-label="How it adds up" className="flex min-w-0 flex-col gap-4 rounded-[22px] border border-surface-line bg-surface p-5 shadow-[var(--card-shadow)] md:p-6">
        <h2 className="text-[15px] font-extrabold">How it adds up</h2>
        {view.addsUp ? (
          <dl className="grid">
            {view.addsUp.map((a) => (
              <div key={a.key} className="flex items-center justify-between gap-3.5 border-b border-divider py-2.5 text-[13.5px] font-semibold">
                <dt className="grid">
                  {a.label}
                  {a.note && <small className="text-[11.5px] text-muted">{a.note}</small>}
                </dt>
                <dd className={`font-extrabold whitespace-nowrap tabular-nums ${a.tone === "in" ? "text-positive" : ""}`}>{a.amount}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3.5 border-t-2 border-fg pt-3 text-[15px] font-extrabold">
              <dt>In your accounts at the end</dt>
              <dd className="tabular-nums">{view.end}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-[13px] font-semibold text-muted">The sum from the start of the month to its end needs every account&apos;s balance at both ends. {view.status === "progress" ? "It comes when the month ends." : "This month doesn't have them."}</p>
        )}
        {view.split.length > 0 && (
          <>
            <div aria-hidden="true" className="flex h-4 gap-[3px] overflow-hidden rounded-full">
              {view.split.map((s) => (
                <span key={s.key} className="block" style={{ flexGrow: s.share, background: s.key === "cash" ? `${HATCH}, var(--card-${s.colorKey})` : `var(--card-${s.colorKey})` }} />
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs font-semibold text-muted">
              {view.split.map((s) => (
                <li key={s.key} className="inline-flex items-center gap-1.5">
                  <i aria-hidden="true" className="size-2 rounded-[3px]" style={{ background: `var(--card-${s.colorKey})` }} />
                  {s.label} <b className="text-fg">{s.pct}</b>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-1.5 grid gap-2.5">
          <div className="flex items-baseline justify-between">
            <b className="text-xs font-extrabold tracking-[0.05em] text-muted uppercase">Every month</b>
            {view.usualLabel && <small className="text-xs font-semibold text-muted">{view.usualLabel}</small>}
          </div>
          <nav aria-label="Every month" className="relative grid h-[220px] grid-cols-12 gap-1.5">
            {view.usualLevel !== null && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t-[1.5px] border-dashed border-muted opacity-60" style={{ bottom: `calc(18px + (100% - 18px) * ${view.usualLevel})` }} />}
            {view.bars.map((b) => (
              <Link key={b.month} href={`/expenses/statements?month=${b.month}`} aria-current={b.picked ? "true" : undefined} aria-label={`${formatMonthYear(b.month)}: ${b.amount}`} className="group grid grid-rows-[1fr_18px] justify-items-center focus-visible:outline-2 focus-visible:outline-accent">
                <span className="flex w-full items-end">
                  <i className={`block w-full rounded-[6px] ${b.picked ? "bg-[var(--card-indigo)]" : "bg-fill-strong group-hover:bg-[color-mix(in_oklch,var(--card-indigo)_45%,var(--fill))]"} ${b.done ? "" : "opacity-50"}`} style={{ height: b.done ? `${Math.max(3, b.level * 100)}%` : "3px" }} />
                </span>
                <small className={`self-end text-[10.5px] font-extrabold ${b.picked ? "text-fg" : "text-muted"}`}>{b.label}</small>
              </Link>
            ))}
          </nav>
        </div>
        {view.versus && (
          <p className="mt-auto rounded-[16px] bg-fill px-4 py-3.5 text-[13px] leading-relaxed font-semibold">
            {view.versus.map((p, i) => (p.strong ? <b key={i} className="font-extrabold">{p.text}</b> : <span key={i}>{p.text}</span>))}
          </p>
        )}
      </section>
    </div>
  );
}
