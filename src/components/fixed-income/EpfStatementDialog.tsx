"use client";

import { useMemo, useRef, useState, useTransition, type DragEvent, type FormEvent } from "react";
import { confirmEpfStatement, readEpfStatement, type ReadEpfStatementResult } from "@/app/fixed-income/epfImportActions";
import { encodeDecisions } from "@/lib/epfStatement/decisions";
import { NO_EDITS, planEpfImport } from "@/lib/epfStatement/importPlan";
import { MAX_PASSBOOK_BYTES } from "@/lib/epfStatement/limits";
import { checkLines, importLabel, summaryRows } from "@/lib/epfStatement/reviewView";
import { IDLE, type FormState } from "@/lib/forms/formState";
import { DocumentIcon } from "../cards/forms/icons";
import { FormDialog } from "../cards/forms/FormDialog";
import { PreviewPanel } from "../cards/forms/fields";
import { SummaryBox } from "../accounts/forms/MiniAccountCard";
import { EpfReview, type ReviewState } from "./EpfReview";

type Read = Extract<ReadEpfStatementResult, { status: "read" }>;
const FRESH: ReviewState = { edits: NO_EDITS, choice: null, resolutions: {}, contradicted: {} };

/**
 * Add EPF statement (ADR 0011): drop the passbook PDF, read it, review every row, confirm. Nothing is saved until the confirm, and
 * the file is read again there by the server, which applies only the corrections made here and checks them again.
 */
export function EpfStatementDialog({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [read, setRead] = useState<Read | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [state, setState] = useState<ReviewState>(FRESH);
  const [saved, setSaved] = useState<FormState>(IDLE);
  const [pending, start] = useTransition();
  const [hot, setHot] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const plan = useMemo(() => (read ? planEpfImport({ original: read.passbook, accounts: read.accounts, entries: read.entries, rates: read.rates, ...state }) : null), [read, state]);

  function choose(next: File | null) {
    setFile(next);
    setProblem(next && next.size > MAX_PASSBOOK_BYTES ? "That file is too big to be an EPF passbook (they are about 120 KB)" : null);
  }
  /** Any change to the review clears an old failure, so the button says what the plan now does. */
  function change(next: ReviewState) {
    setSaved(IDLE);
    setState(next);
  }
  function onDrop(event: DragEvent) {
    event.preventDefault();
    setHot(false);
    choose(event.dataTransfer.files[0] ?? null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!read || !plan) {
      if (!file) return setProblem("Choose the passbook PDF first");
      if (file.size > MAX_PASSBOOK_BYTES) return;
      const data = new FormData();
      data.set("file", file);
      start(async () => {
        try {
          const result = await readEpfStatement(data);
          if (result.status === "read") {
            setRead(result);
            setState(FRESH);
          } else setProblem(result.status === "unreadable" ? result.problem : (result.message ?? "Couldn't read the Sheet just now. Try again."));
        } catch {
          setProblem("Couldn't reach the app to read the file. Try again.");
        }
      });
      return;
    }
    if (plan.blockers.length > 0) return;
    if (importLabel(plan) === "Done") return setSaved({ status: "saved", at: Date.now() });
    const data = new FormData();
    data.set("file", file!);
    data.set("decisions", encodeDecisions(state));
    start(async () => {
      try {
        setSaved(await confirmEpfStatement(data));
      } catch {
        setSaved({ status: "failed", message: "Couldn't reach the app, so nothing was saved." });
      }
    });
  }

  const lines = plan ? checkLines(plan) : [];
  const failMessage = saved.status === "invalid" ? saved.errors.form : saved.status === "failed" ? saved.message : undefined;

  return (
    <FormDialog
      icon={<DocumentIcon />}
      title={plan ? `Review: FY ${plan.passbook.financialYear}` : "Add an EPF statement"}
      subtitle={plan ? `EPF passbook · ${plan.passbook.credits.length} credits${plan.passbook.interest ? " and a year's interest" : ""}. Nothing is saved yet.` : "Drop the passbook PDF you downloaded from the EPFO member portal."}
      preview={
        <div className="md:sticky md:top-4">
        <PreviewPanel caption={plan ? "Nothing is changed until you confirm." : undefined}>
          {plan ? (
            <>
              <ul className="flex flex-col gap-2.5" aria-label="The checks">
                {lines.map((l) => (
                  <li key={l.title} className="flex gap-2 text-xs leading-snug">
                    <span aria-hidden="true" className={`mt-px font-extrabold ${l.ok ? "text-positive" : "text-negative"}`}>{l.ok ? "✓" : "✗"}</span>
                    <span><b className="font-extrabold">{l.title}</b> {l.detail}</span>
                  </li>
                ))}
              </ul>
              <SummaryBox rows={summaryRows(plan)} />
              {plan.unverified && <p className="rounded-[14px] bg-warning-tint px-3.5 py-3 text-xs font-semibold text-warning-text">The rows you typed stay marked as less certain, and the year is marked unverified. A later passbook that has them replaces them.</p>}
            </>
          ) : (
            <>
              <SummaryBox rows={[{ label: "1", value: "The file is sent to the app" }, { label: "2", value: "You see every row" }, { label: "3", value: "Only accepted if it adds up" }, { label: "4", value: "Rows already here are skipped" }]} />
              <p className="text-xs font-medium text-muted">The file is read and not kept. Only the figures are saved, and of the member ID only its last four characters, to find your account. Your UAN, date of birth and name are not saved.</p>
            </>
          )}
        </PreviewPanel>
        </div>
      }
      footerNote={plan ? "Nothing is changed until you confirm." : "One year's passbook at a time."}
      primaryLabel={plan ? (plan.blockers.length > 0 ? "Fix the problems first" : importLabel(plan)) : "Read the file"}
      pending={pending}
      errorCount={0}
      saveFailed={saved.status === "failed" || saved.status === "invalid"}
      failMessage={failMessage}
      close={saved.status === "saved"}
      onClose={onClose}
      formProps={{ onSubmit: submit }}
    >
      {plan && read ? (
        <EpfReview plan={plan} state={state} setState={change} accounts={read.accounts} />
      ) : (
        <div className="flex flex-col gap-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setHot(true); }}
            onDragLeave={() => setHot(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center gap-2 rounded-[18px] border-2 border-dashed px-6 py-10 text-center ${hot ? "border-accent bg-accent-tint" : "border-surface-line bg-fill"}`}
          >
            <b className="text-sm font-extrabold">{file ? file.name : "Drop the passbook PDF here"}</b>
            <button type="button" data-autofocus onClick={() => input.current?.click()} className="min-h-9 rounded-full bg-surface px-4 text-xs font-bold text-fg shadow-soft hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent">
              {file ? "Choose another file" : "or choose a file"}
            </button>
            <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Passbook PDF" onChange={(e) => choose(e.target.files?.[0] ?? null)} />
          </div>
          <p className="text-[11px] font-medium text-muted">EPFO doesn&apos;t email passbooks, so this is where they come in: download one from the member portal and drop it here.</p>
          {problem && <p role="alert" className="rounded-[14px] bg-negative-tint px-4 py-3 text-xs font-semibold text-negative">{problem}</p>}
        </div>
      )}
    </FormDialog>
  );
}
