"use client";

import type { ReactNode } from "react";
import { formatDate, formatShortDate } from "@/lib/format/date";
import { formatInrExact } from "@/lib/format/money";
import { listOf } from "@/lib/format/skippedRows";
import type { FailedReportRow, SyncReport, SyncReportRow } from "@/lib/format/syncReport";
import { AlertIcon, CheckIcon, CloseIcon } from "../cards/forms/icons";
import { useSync } from "./SyncContext";

/**
 * The Sync statements report (#54), under the page header's text: progress
 * while it runs, then what was imported, what was already in the Sheet, and
 * what couldn't be imported, with why and what to change. Nothing until a sync starts.
 */
export function SyncReportPanel() {
  const { state, dismiss } = useSync();
  if (state.phase === "idle") return null;

  return (
    <section aria-label="Statement sync" aria-live="polite" className="flex w-full flex-col gap-3.5 rounded-[18px] border border-surface-line bg-surface p-4 shadow-soft">
      {state.phase === "running" && (
        <>
          <Heading
            icon={<Spinner />}
            title="Reading your statement emails…"
            detail={state.remaining === null ? "This can take up to a minute." : `${state.read} read, ${state.remaining} to go.`}
          />
          <div className="h-1 w-full overflow-hidden rounded-full bg-fill" aria-hidden="true">
            <div className="h-full w-full animate-pulse rounded-full bg-accent/50 motion-reduce:animate-none" />
          </div>
        </>
      )}
      {state.phase === "already-running" && (
        <Heading
          icon={<Badge tone="neutral" />}
          title="A sync is already running"
          detail={`It started at ${timeOf(Date.parse(state.since))}. Try again in a minute.`}
          onClose={dismiss}
        />
      )}
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

function ReportBody({ report }: { report: SyncReport }) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Count n={report.imported.length} label="imported" tone="accent" />
        <Count n={report.alreadyIn.length} label="already in the Sheet" tone="neutral" />
        <Count n={report.failed.length} label="couldn't be imported" tone="negative" />
      </div>
      {report.filledLast4.length > 0 && (
        <p className="text-xs font-medium text-muted">Saved the last 4 digits of {listOf(report.filledLast4)} from {report.filledLast4.length === 1 ? "its statement" : "their statements"}.</p>
      )}
      {report.failed.length > 0 && (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-1.5">
            {report.failed.map((row) => (
              <FailedRow key={row.messageId} row={row} />
            ))}
          </ul>
          <p className="text-[11px] font-medium text-muted">These are tried again on every sync.</p>
        </div>
      )}
      {report.imported.length > 0 && <RowList title="Imported" rows={report.imported} />}
      {report.alreadyIn.length > 0 && <RowList title="Already in the Sheet" rows={report.alreadyIn} />}
      {report.remaining > 0 && (
        <p className="text-xs font-semibold text-fg">
          {report.remaining} more {report.remaining === 1 ? "email" : "emails"} to read: sync again.
        </p>
      )}
    </>
  );
}

function FailedRow({ row }: { row: FailedReportRow }) {
  return (
    <li className="flex flex-col gap-0.5 rounded-control bg-negative-tint px-3.5 py-2.5 text-[13px] leading-relaxed">
      <span className="font-bold text-fg">{rowTitle(row)}</span>
      {!row.card && row.subject && <span className="text-xs text-muted">“{row.subject}”</span>}
      <span className="text-fg">{row.reason}</span>
      {row.fix && <span className="font-semibold text-fg">{row.fix}</span>}
    </li>
  );
}

function RowList({ title, rows }: { title: string; rows: SyncReportRow[] }) {
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
        {rows.map((row) => (
          <li key={row.messageId} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5 text-[13px]">
            <span className="font-semibold text-fg">{rowTitle(row)}</span>
            {row.totalAmountDue !== undefined && row.dueDate && (
              <span className="text-xs text-muted tabular-nums">
                {formatInrExact(row.totalAmountDue)} · due {formatShortDate(row.dueDate)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** "Regalia Gold · Oct 15, 2026 statement", or the email's date when the statement wasn't read. */
function rowTitle(row: SyncReportRow): string {
  const card = row.card ?? "No card matched";
  if (row.statementDate) return `${card} · ${formatDate(row.statementDate)} statement`;
  return row.receivedDate ? `${card} · email of ${formatDate(row.receivedDate)}` : card;
}

export function timeOf(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function Heading({ icon, title, detail, onClose }: { icon: ReactNode; title: string; detail: string; onClose?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon}
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-fg">{title}</p>
          <p className="text-xs font-medium text-muted">{detail}</p>
        </div>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close the sync report" className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-fill hover:text-fg focus-visible:outline-2 focus-visible:outline-accent">
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

const TONES = {
  accent: "bg-accent-tint text-accent-text",
  neutral: "bg-fill text-muted",
  negative: "bg-negative-tint text-negative",
} as const;

export function Badge({ tone }: { tone: keyof typeof TONES }) {
  return <span className={`mt-px flex size-6 shrink-0 items-center justify-center rounded-full ${TONES[tone]}`}>{tone === "accent" ? <CheckIcon /> : <AlertIcon />}</span>;
}

export function Spinner() {
  return (
    <span className={`mt-px flex size-6 shrink-0 items-center justify-center rounded-full ${TONES.accent}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true" className="animate-spin motion-reduce:animate-none">
        <path d="M21 12a9 9 0 1 1-6.2-8.6" />
      </svg>
    </span>
  );
}

/** A count, in its tone only when it isn't 0. */
export function Count({ n, label, tone }: { n: number; label: string; tone: keyof typeof TONES }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${TONES[n === 0 ? "neutral" : tone]}`}>
      <span className="tabular-nums">{n}</span>
      {label}
    </span>
  );
}
