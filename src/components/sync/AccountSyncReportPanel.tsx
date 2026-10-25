"use client";

import { formatDate } from "@/lib/format/date";
import { formatInrExact } from "@/lib/format/money";
import type { AccountSyncReport, AccountSyncRow } from "@/lib/format/accountSyncReport";
import { useAccountSync } from "./AccountSyncContext";
import { Badge, Count, Heading, Spinner, timeOf } from "./SyncReportPanel";

/**
 * The Sync account statements report, under the page header's text: progress while it runs, then what was
 * added, what was already there, which balances disagreed with the Sheet (they need an answer, and the
 * Sheet's own stays until then) and what couldn't be used, with why and what to change.
 */
export function AccountSyncReportPanel() {
  const { state, dismiss } = useAccountSync();
  if (state.phase === "idle") return null;

  return (
    <section aria-label="Account statement sync" aria-live="polite" className="flex w-full flex-col gap-3.5 rounded-[18px] border border-surface-line bg-surface p-4 shadow-soft">
      {state.phase === "running" && (
        <>
          <Heading icon={<Spinner />} title="Reading your bank statement emails…" detail={state.remaining === null ? "This can take up to a minute." : `${state.read} read, ${state.remaining} to go.`} />
          <div className="h-1 w-full overflow-hidden rounded-full bg-fill" aria-hidden="true">
            <div className="h-full w-full animate-pulse rounded-full bg-accent/50 motion-reduce:animate-none" />
          </div>
        </>
      )}
      {state.phase === "already-running" && <Heading icon={<Badge tone="neutral" />} title="A sync is already running" detail={`It started at ${timeOf(Date.parse(state.since))}. Try again in a minute.`} onClose={dismiss} />}
      {state.phase === "failed" && (
        <>
          <Heading icon={<Badge tone="negative" />} title="The sync stopped" detail={state.message} onClose={dismiss} />
          {state.report && <ReportBody report={state.report} />}
        </>
      )}
      {state.phase === "done" && (
        <>
          <Heading
            icon={<Badge tone={state.report.failed.length > 0 ? "negative" : "accent"} />}
            title={state.report.emails === 0 ? "No new statement emails" : `Read ${state.report.emails} statement ${state.report.emails === 1 ? "email" : "emails"}`}
            detail={`Finished at ${timeOf(state.finishedAt)}.`}
            onClose={dismiss}
          />
          {state.report.emails > 0 && <ReportBody report={state.report} />}
        </>
      )}
    </section>
  );
}

function ReportBody({ report }: { report: AccountSyncReport }) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Count n={report.imported.length} label="added" tone="accent" />
        <Count n={report.alreadyIn.length} label="already in the Sheet" tone="neutral" />
        <Count n={report.reviews.length} label="to look at" tone="negative" />
        <Count n={report.failed.length} label="couldn't be used" tone="negative" />
      </div>
      {report.reviews.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-fg">These balances differ from what the Sheet has. The Sheet&apos;s stays until you choose, from the card at the top of this page.</p>
          <ul className="flex flex-col gap-1.5">
            {report.reviews.map((r) => (
              <li key={`${r.messageId}-${r.account}-${r.date}`} className="flex flex-col gap-0.5 rounded-control bg-warning-tint px-3.5 py-2.5 text-[13px] leading-relaxed">
                <span className="font-bold text-fg">
                  {r.account} · {formatDate(r.date)}
                </span>
                <span className="text-fg">
                  Sheet {formatInrExact(r.recordedBalance)}, statement {formatInrExact(r.statementBalance)}
                  {r.bigDrop ? ". That's a big drop from the balance before it" : ""}.
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {report.income > 0 && (
        <p className="text-xs font-semibold text-fg">
          Recorded {report.income} income {report.income === 1 ? "payment" : "payments"} from the statements, on the Income page.
        </p>
      )}
      {report.filledLast4.length > 0 && <p className="text-xs font-medium text-muted">Saved the last 4 digits of {report.filledLast4.join(", ")} from {report.filledLast4.length === 1 ? "its statement" : "their statements"}.</p>}
      {report.failed.length > 0 && (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-1.5">
            {report.failed.map((row, i) => (
              <li key={`${row.messageId}-${i}`} className="flex flex-col gap-0.5 rounded-control bg-negative-tint px-3.5 py-2.5 text-[13px] leading-relaxed">
                <span className="font-bold text-fg">{row.title}</span>
                <span className="text-fg">{row.reason}</span>
                {row.fix && <span className="font-semibold text-fg">{row.fix}</span>}
              </li>
            ))}
          </ul>
          <p className="text-[11px] font-medium text-muted">Emails that couldn&apos;t be read are tried again on every sync.</p>
        </div>
      )}
      {report.imported.length > 0 && <Rows title="Added" rows={report.imported} />}
      {report.alreadyIn.length > 0 && <Rows title="Already in the Sheet" rows={report.alreadyIn} />}
      {report.remaining > 0 && (
        <p className="text-xs font-semibold text-fg">
          {report.remaining} more {report.remaining === 1 ? "email" : "emails"} to read: sync again.
        </p>
      )}
    </>
  );
}

function Rows({ title, rows }: { title: string; rows: AccountSyncRow[] }) {
  return (
    <details className="group rounded-control bg-fill/60 px-3.5 py-2.5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-bold text-fg focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        <span>
          {title} <span className="font-semibold text-muted tabular-nums">({rows.length})</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>
      <ul className="mt-2 flex flex-col divide-y divide-divider">
        {rows.map((row, i) => (
          <li key={`${row.messageId}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5 text-[13px]">
            <span className="font-semibold text-fg">
              {row.account ?? row.subject}
              {row.period ? ` · ${row.period}` : ""}
            </span>
            <span className="text-xs text-muted tabular-nums">
              {row.added} added{row.alreadyThere > 0 ? `, ${row.alreadyThere} already there` : ""}
              {row.income > 0 ? `, ${row.income} income` : ""}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
