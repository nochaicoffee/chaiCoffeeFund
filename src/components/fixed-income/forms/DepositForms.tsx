"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { deleteDeposit, reopenDeposit, undoDeposit } from "@/app/fixed-income/depositActions";
import type { DepositFormsData } from "@/app/fixed-income/depositFormsData";
import { formatDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { AlertIcon } from "../../cards/forms/icons";
import { FormTriggerButton, HEADER_GHOST_CLASS } from "../../shell/FormTriggerButton";
import { useUndoToast } from "../../shell/UndoToast";
import { ConfirmDialog } from "../../subscriptions/forms/ConfirmDialog";
import { CloseDepositDialog } from "./CloseDepositDialog";
import { DepositDialog } from "./DepositDialog";

/**
 * Opens the deposit forms from anywhere on the page: Add a deposit, Edit, Close (with Undo), Reopen and Delete. A deposit just added or
 * closed gets a toast with Undo for six seconds.
 */

type Open = { kind: "add" } | { kind: "edit"; id: string } | { kind: "close"; id: string } | { kind: "reopen"; id: string } | { kind: "delete"; id: string };

interface Controls {
  forms: DepositFormsData;
  open: (open: Open) => void;
}

const FormsContext = createContext<Controls | null>(null);

export function useDepositForms(): Controls {
  const controls = useContext(FormsContext);
  if (!controls) throw new Error("useDepositForms needs a DepositFormsProvider");
  return controls;
}

export function DepositFormsProvider({ forms, children }: { forms: DepositFormsData; children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const { saved, view } = useUndoToast(undoDeposit);
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
  const deposit = open && "id" in open ? forms.deposits.find((d) => d.id === open.id) : undefined;

  return (
    <FormsContext.Provider value={{ forms, open: show }}>
      {children}
      {open?.kind === "add" && <DepositDialog forms={forms} onClose={close} onSaved={(undo) => saved(undo, "Saved.")} />}
      {open?.kind === "edit" && deposit && <DepositDialog forms={forms} deposit={deposit} onClose={close} onSaved={(undo) => saved(undo, "Saved.")} onDelete={() => setOpen({ kind: "delete", id: deposit.id })} />}
      {open?.kind === "close" && deposit && <CloseDepositDialog forms={forms} deposit={deposit} onClose={close} onSaved={(undo) => saved(undo, "Closed.")} />}
      {open?.kind === "reopen" && deposit && (
        <ConfirmDialog
          tone="neutral"
          icon={<AlertIcon />}
          title="Reopen this deposit?"
          body={`${deposit.name} goes back to the deposits you hold, and the ${formatInr(deposit.receivedAmount ?? 0)} received and the day are forgotten.`}
          hidden={{ id: deposit.id }}
          keepLabel="Leave it closed"
          confirmLabel="Reopen"
          action={reopenDeposit}
          today={forms.today}
          onClose={close}
          onSaved={() => saved(undefined, "Reopened.")}
        />
      )}
      {open?.kind === "delete" && deposit && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title="Delete this deposit?"
          body={`${deposit.name} (${formatInr(deposit.principalAmount)}) is removed from the Sheet, and that can't be undone. To keep a record of it, close it instead.`}
          hidden={{ id: deposit.id }}
          keepLabel="Keep it"
          confirmLabel="Delete deposit"
          action={deleteDeposit}
          today={forms.today}
          onClose={close}
          onSaved={() => saved(undefined, "Deleted.")}
        />
      )}
      {view}
    </FormsContext.Provider>
  );
}

/** The page header's Add deposit. */
export function AddDepositButton() {
  const { open } = useDepositForms();
  return <FormTriggerButton className={HEADER_GHOST_CLASS} label="Add deposit" onClick={() => open({ kind: "add" })} />;
}

const SMALL = "min-h-8 rounded-full bg-fill px-3 text-xs font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent";

/** The deposits that are closed (Matured and pre-closed), each with Reopen and Delete. */
export function ClosedDeposits() {
  const { forms, open } = useDepositForms();
  const closed = forms.deposits.filter((d) => d.status === "Closed");
  if (closed.length === 0) return <p className="text-xs font-medium text-muted">Nothing matured or closed yet.</p>;
  return (
    <section aria-label="Matured and pre-closed" className="flex flex-col gap-2">
      <h3 className="text-[11px] font-bold tracking-[0.04em] text-muted uppercase">Matured and pre-closed · {closed.length}</h3>
      <ul className="flex flex-col divide-y divide-divider rounded-[14px] border border-surface-line">
        {closed.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3.5 py-2.5 text-sm">
            <span className="min-w-40 font-bold">{d.name}</span>
            <span className="font-semibold tabular-nums">
              {formatInr(d.principalAmount)} → {formatInr(d.receivedAmount ?? 0)}
            </span>
            <span className="text-muted">received {d.closedDate ? formatDate(d.closedDate) : "—"}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${d.closeKind === "Matured" ? "bg-accent-tint text-accent-text" : "bg-warning-tint text-warning-text"}`}>{d.closeKind === "Matured" ? "At maturity" : "Pre-closed"}</span>
            <span className="ml-auto flex gap-2">
              <button type="button" onClick={() => open({ kind: "reopen", id: d.id })} className={SMALL} aria-label={`Reopen ${d.name}`}>
                Reopen
              </button>
              <button type="button" onClick={() => open({ kind: "delete", id: d.id })} className={SMALL} aria-label={`Delete ${d.name}`}>
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] font-medium text-muted">A pre-closed deposit pays less than its maturity amount, and the page shows what was actually received.</p>
    </section>
  );
}
