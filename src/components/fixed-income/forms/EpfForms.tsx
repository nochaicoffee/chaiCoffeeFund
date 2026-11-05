"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { deleteEpfEntry, undoEpfEntry } from "@/app/fixed-income/epfFormActions";
import type { EpfFormsData } from "@/app/fixed-income/epfFormsData";
import { formatDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { wageMonthLabel } from "@/lib/epfStatement/reviewView";
import type { EpfEntry } from "@/lib/sheets/types";
import { AlertIcon } from "../../cards/forms/icons";
import { FormTriggerButton, HEADER_GHOST_CLASS } from "../../shell/FormTriggerButton";
import { useUndoToast } from "../../shell/UndoToast";
import { ConfirmDialog } from "../../subscriptions/forms/ConfirmDialog";
import { AddEpfStatementButton } from "../AddEpfStatementButton";
import { ContributionDialog } from "./ContributionDialog";
import { CreditedDialog } from "./CreditedDialog";
import { SettingsDialog } from "./SettingsDialog";

/**
 * Opens the EPF forms from anywhere on the page: Add a contribution, Add what EPFO credited, EPF settings, and Edit and Delete a
 * row (a row read from a passbook is deleted, not edited). A row just added gets a toast with Undo for six seconds.
 */

type Open = { kind: "contribution"; entry?: EpfEntry } | { kind: "credited"; entry?: EpfEntry } | { kind: "settings" } | { kind: "delete"; id: string };

interface Controls {
  forms: EpfFormsData;
  disabledReason?: string;
  open: (open: Open) => void;
}

const FormsContext = createContext<Controls | null>(null);

export function useEpfForms(): Controls {
  const controls = useContext(FormsContext);
  if (!controls) throw new Error("useEpfForms needs an EpfFormsProvider");
  return controls;
}

export function EpfFormsProvider({ forms, children }: { forms: EpfFormsData; children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const { saved, view } = useUndoToast(undoEpfEntry);
  const disabledReason = forms.accounts.length === 0 ? "Add an EPF statement first: it sets up the account" : undefined;
  // The button that opened the form, so focus goes back to it on close (also after Edit → Delete).
  const opener = useRef<HTMLElement | null>(null);
  const show = (next: Open) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(next);
  };
  const close = () => {
    setOpen(null);
    const back = opener.current;
    setTimeout(() => back?.isConnected && back.focus(), 0);
  };
  const doomed = open?.kind === "delete" ? forms.entries.find((e) => e.id === open.id) : undefined;
  const label = (e: EpfEntry) => (e.kind === "Contribution" ? `the credit for ${wageMonthLabel(e.wageMonth ?? "")}` : e.kind === "Interest" ? `the interest credited ${formatDate(e.date)}` : `the opening balance as at ${formatDate(e.date)}`);

  return (
    <FormsContext.Provider value={{ forms, disabledReason, open: (o) => !disabledReason && show(o) }}>
      {children}
      {open?.kind === "contribution" && (
        <ContributionDialog forms={forms} entry={open.entry} onClose={close} onSaved={(undo) => saved(undo, "Saved.")} onDelete={open.entry ? () => setOpen({ kind: "delete", id: open.entry!.id }) : undefined} />
      )}
      {open?.kind === "credited" && (
        <CreditedDialog forms={forms} entry={open.entry} onClose={close} onSaved={(undo) => saved(undo, "Saved.")} onDelete={open.entry ? () => setOpen({ kind: "delete", id: open.entry!.id }) : undefined} />
      )}
      {open?.kind === "settings" && <SettingsDialog forms={forms} onClose={close} onSaved={() => saved(undefined, "Settings saved.")} />}
      {open?.kind === "delete" && doomed && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title="Delete this row?"
          body={`${label(doomed)} (${formatInr(doomed.employee + doomed.employer + doomed.pension)}) is removed from the Sheet, and that can't be undone.${doomed.source === "Passbook" ? " It was read from a passbook: importing that passbook again brings it back." : ""}`}
          hidden={{ id: doomed.id }}
          keepLabel="Keep it"
          confirmLabel="Delete"
          action={deleteEpfEntry}
          today={forms.today}
          onClose={close}
          onSaved={() => saved(undefined, "Deleted.")}
        />
      )}
      {view}
    </FormsContext.Provider>
  );
}

/** A button that opens a form. With no account yet it stays focusable but disabled, with the reason as a tooltip. */
function FormTrigger({ label, onClick }: { label: string; onClick: () => void }) {
  const { disabledReason } = useEpfForms();
  return <FormTriggerButton className={HEADER_GHOST_CLASS} label={label} onClick={onClick} disabledReason={disabledReason} />;
}

/** The page header's buttons: the import first, then the typed ways in. */
export function EpfHeaderButtons() {
  const { open } = useEpfForms();
  return (
    <div className="flex flex-wrap gap-2">
      <AddEpfStatementButton />
      <FormTrigger label="Add contribution" onClick={() => open({ kind: "contribution" })} />
      <FormTrigger label="Add what EPFO credited" onClick={() => open({ kind: "credited" })} />
      <FormTrigger label="EPF settings" onClick={() => open({ kind: "settings" })} />
    </div>
  );
}

const SMALL = "min-h-8 rounded-full bg-fill px-3 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent";

/** Every EPF row, newest first, with Edit (a typed row) and Delete. The page's own widgets (#268 and on) replace this list. */
export function EpfEntriesList() {
  const { forms, open } = useEpfForms();
  if (forms.entries.length === 0) return null;
  return (
    <section aria-label="EPF entries" className="flex flex-col gap-2">
      <h2 className="text-[11px] font-bold tracking-[0.04em] text-muted uppercase">Every row · {forms.entries.length}</h2>
      <ul className="flex flex-col divide-y divide-divider rounded-[14px] border border-surface-line">
        {forms.entries.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3.5 py-2.5 text-sm">
            <span className="w-28 font-bold">{e.kind === "Contribution" ? wageMonthLabel(e.wageMonth ?? "") : e.kind === "Interest" ? "Interest" : "Opening balance"}</span>
            <span className="w-28 text-muted tabular-nums">{formatDate(e.date)}</span>
            <span className="font-semibold tabular-nums">{formatInr(e.employee + e.employer + e.pension)}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${e.source === "Typed" ? "bg-warning-tint text-warning-text" : "bg-fill text-muted"}`}>{e.source === "Typed" ? "typed" : "passbook"}</span>
            <span className="ml-auto flex gap-2">
              {e.source === "Typed" && (
                <button type="button" onClick={() => open(e.kind === "Contribution" ? { kind: "contribution", entry: e } : { kind: "credited", entry: e })} className={SMALL} aria-label={`Edit ${e.kind === "Contribution" ? wageMonthLabel(e.wageMonth ?? "") : e.kind}`}>
                  Edit
                </button>
              )}
              <button type="button" onClick={() => open({ kind: "delete", id: e.id })} className={SMALL} aria-label={`Delete ${e.kind === "Contribution" ? wageMonthLabel(e.wageMonth ?? "") : e.kind} ${e.date}`}>
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
