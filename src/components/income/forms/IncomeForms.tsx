"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { deleteEntry, deleteSource, setSourceStatus, undoEntry } from "@/app/income/actions";
import type { IncomeFormsData } from "@/app/income/views";
import { formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { AlertIcon } from "../../cards/forms/icons";
import { ConfirmDialog } from "../../subscriptions/forms/ConfirmDialog";
import { RenewIcon } from "../../subscriptions/icons";
import { EntryFormDialog, type EntryStart } from "./EntryFormDialog";
import { SourceFormDialog } from "./SourceFormDialog";
import { FormTriggerButton, HEADER_GHOST_CLASS, HEADER_PRIMARY_CLASS } from "../../shell/FormTriggerButton";

/**
 * Opens the Income forms (#190) from anywhere on the page: Add and Edit source, Record income, Mark received (on a
 * payment that's owed), Edit and delete a payment, Mark inactive, and Delete source (which offers Mark inactive
 * instead). A payment just recorded gets a toast with Undo for six seconds. With sample data every button shows
 * disabled: it never reaches the Sheet.
 */

type Open =
  | { kind: "add-source" }
  | { kind: "edit-source"; id: string }
  | { kind: "entry"; start: EntryStart }
  | { kind: "status"; id: string; status: "Active" | "Inactive" }
  | { kind: "delete-source"; id: string }
  | { kind: "delete-entry"; id: string };

type Toast = { kind: "recorded"; id: string; written: { incomeSourceId: string; receivedDate: string; amount: number }; message: string; key: number } | { kind: "done" | "error"; message: string; key: number };

interface Controls {
  forms: IncomeFormsData;
  disabledReason?: string;
  open: (open: Open) => void;
  /** Mark received on a source's payment owed on `expectedDate` (its oldest when not given), or Record income on it when nothing is owed. */
  receive: (sourceId: string, expectedDate?: string) => void;
}

const FormsContext = createContext<Controls | null>(null);
const TOAST_MS = 6000;

export function useIncomeForms(): Controls {
  const controls = useContext(FormsContext);
  if (!controls) throw new Error("useIncomeForms needs an IncomeFormsProvider");
  return controls;
}

export function IncomeFormsProvider({ forms, children }: { forms: IncomeFormsData; children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [, startTransition] = useTransition();
  const disabledReason = forms.demo ? "Sample data can't be changed" : undefined;
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
  const receive = (sourceId: string, expectedDate?: string) => {
    const owed = forms.pending.find((p) => p.sourceId === sourceId && (!expectedDate || p.expectedDate === expectedDate)) ?? forms.pending.find((p) => p.sourceId === sourceId);
    show({ kind: "entry", start: owed ? { kind: "receive", sourceId, expectedDate: owed.expectedDate, amount: owed.amount } : { kind: "record", sourceId } });
  };

  function undo() {
    if (toast?.kind !== "recorded") return;
    const { id, written } = toast;
    setToast(null);
    startTransition(async () => {
      const result = await undoEntry(id, written).catch(() => ({ ok: false, message: "Couldn't reach the app, so nothing was undone. Check the connection and try again." }));
      setToast({ kind: result.ok ? "done" : "error", message: result.message, key: Date.now() });
    });
  }

  // Each toast closes itself after a while; a newer one replaces it.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.kind === "recorded" ? TOAST_MS : 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const source = open && "id" in open && (open.kind === "edit-source" || open.kind === "status" || open.kind === "delete-source") ? forms.sources.find((s) => s.id === open.id) : undefined;
  const entry = open?.kind === "delete-entry" ? forms.entries[open.id] : undefined;
  const entrySource = entry && forms.sources.find((s) => s.id === entry.incomeSourceId);

  return (
    <FormsContext.Provider value={{ forms, disabledReason, open: (o) => !disabledReason && show(o), receive: (id, date) => !disabledReason && receive(id, date) }}>
      {children}
      {open?.kind === "add-source" && <SourceFormDialog forms={forms} onClose={close} />}
      {open?.kind === "edit-source" && source && <SourceFormDialog source={source} forms={forms} onClose={close} onDelete={() => setOpen({ kind: "delete-source", id: source.id })} />}
      {open?.kind === "entry" && (
        <EntryFormDialog
          start={open.start}
          forms={forms}
          onClose={close}
          onRecorded={(u, written) => setToast({ kind: "recorded", id: u.id, written, message: u.message, key: Date.now() })}
          onDelete={open.start.kind === "edit" ? () => setOpen({ kind: "delete-entry", id: (open.start as Extract<EntryStart, { kind: "edit" }>).entry.id }) : undefined}
        />
      )}
      {open?.kind === "status" && source && (
        <ConfirmDialog
          tone="neutral"
          icon={<RenewIcon size={16} />}
          title={open.status === "Inactive" ? `Mark ${source.alias || source.name} inactive?` : `Make ${source.alias || source.name} active again?`}
          body={open.status === "Inactive" ? "It stays, with its payments, but nothing more is expected from it: no pending, no next payday, and it leaves a usual month." : "It's expected again from its next expected day, at its usual amount."}
          hidden={{ id: source.id, status: open.status }}
          keepLabel="Not now"
          confirmLabel={open.status === "Inactive" ? "Mark inactive" : "Make active"}
          action={setSourceStatus}
          today={forms.today}
          onClose={close}
        />
      )}
      {open?.kind === "delete-source" && source && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title={`Delete ${source.alias || source.name}?`}
          body={`It's removed from the Sheet with its ${source.entries} ${source.entries === 1 ? "payment" : "payments"}, and that can't be undone. To keep them, mark it inactive instead.`}
          hidden={{ id: source.id }}
          keepLabel="Keep it"
          confirmLabel="Delete source"
          action={deleteSource}
          today={forms.today}
          onClose={close}
          alternative={source.status === "Active" ? { label: "Mark inactive instead", onClick: () => setOpen({ kind: "status", id: source.id, status: "Inactive" }) } : undefined}
        />
      )}
      {open?.kind === "delete-entry" && entry && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title="Delete this payment?"
          body={`${formatInr(entry.amount)} from ${entrySource?.alias || entrySource?.name || "a source"} on ${formatShortDate(entry.receivedDate)} is removed from the Sheet, and can't be undone.${entry.fromStatement ? " It was read from a statement, and a statement read again won't bring it back." : ""}`}
          hidden={{ id: entry.id }}
          keepLabel="Keep it"
          confirmLabel="Delete payment"
          action={deleteEntry}
          today={forms.today}
          onClose={close}
        />
      )}
      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3.5 rounded-full bg-ink py-2.5 pr-2.5 pl-5 text-[13px] font-bold text-on-ink shadow-card max-md:bottom-20" key={toast.key}>
          <span className={toast.kind === "error" ? "text-[oklch(0.8_0.12_40)]" : ""}>{toast.kind === "recorded" ? `Recorded · ${toast.message}` : toast.message}</span>
          {toast.kind === "recorded" && (
            <button type="button" onClick={undo} className="min-h-9 rounded-full bg-[oklch(1_0_0/0.14)] px-4 text-xs font-extrabold hover:bg-[oklch(1_0_0/0.22)] focus-visible:outline-2 focus-visible:outline-white">
              Undo
            </button>
          )}
        </div>
      )}
    </FormsContext.Provider>
  );
}

/** A button that opens a form. With sample data it stays focusable but disabled, with the reason as a tooltip. */
export function FormTrigger({ className, label, onClick }: { className: string; label: string; onClick: () => void }) {
  const { disabledReason } = useIncomeForms();
  return <FormTriggerButton className={className} label={label} onClick={onClick} disabledReason={disabledReason} />;
}

const HEADER_PRIMARY = HEADER_PRIMARY_CLASS;
const HEADER_GHOST = HEADER_GHOST_CLASS;

/** The page header's Add source and Record income, as in the design. */
export function HeaderFormButtons() {
  const { open, forms } = useIncomeForms();
  return (
    <>
      <FormTrigger className={HEADER_GHOST} label="Add source" onClick={() => open({ kind: "add-source" })} />
      {forms.sources.length > 0 && <FormTrigger className={HEADER_PRIMARY} label="Record income" onClick={() => open({ kind: "entry", start: { kind: "record" } })} />}
    </>
  );
}

const SMALL_PRIMARY = "min-h-9 rounded-full bg-ink px-4 text-xs font-extrabold text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const SMALL_SOFT = "min-h-9 rounded-full bg-fill px-4 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent";

/** The cover's actions: Record income and Add source for all sources; Mark received (while one's owed), Record income, Edit and Mark inactive or active for a source. */
export function CoverButtons({ pickId }: { pickId: string }) {
  const { open, receive, forms } = useIncomeForms();
  const source = forms.sources.find((s) => s.id === pickId);
  if (!source) {
    return (
      <div className="flex flex-wrap gap-2">
        {forms.sources.length > 0 && <FormTrigger className={SMALL_PRIMARY} label="Record income" onClick={() => open({ kind: "entry", start: { kind: "record" } })} />}
        <FormTrigger className={SMALL_SOFT} label="Add source" onClick={() => open({ kind: "add-source" })} />
      </div>
    );
  }
  const owed = forms.pending.some((p) => p.sourceId === source.id);
  return (
    <div className="flex flex-wrap gap-2">
      {owed && <FormTrigger className={SMALL_PRIMARY} label="Mark received" onClick={() => receive(source.id)} />}
      <FormTrigger className={owed ? SMALL_SOFT : SMALL_PRIMARY} label="Record income" onClick={() => open({ kind: "entry", start: { kind: "record", sourceId: source.id } })} />
      <FormTrigger className={SMALL_SOFT} label="Edit source" onClick={() => open({ kind: "edit-source", id: source.id })} />
      <FormTrigger className={SMALL_SOFT} label={source.status === "Active" ? "Mark inactive" : "Make active"} onClick={() => open({ kind: "status", id: source.id, status: source.status === "Active" ? "Inactive" : "Active" })} />
    </div>
  );
}
