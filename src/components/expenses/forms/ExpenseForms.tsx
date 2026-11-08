"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { deleteBigSpend } from "@/app/expenses/actions";
import { formatDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { AlertIcon } from "../../cards/forms/icons";
import { FormTriggerButton, HEADER_PRIMARY_CLASS } from "../../shell/FormTriggerButton";
import { useUndoToast } from "../../shell/UndoToast";
import { ConfirmDialog } from "../../subscriptions/forms/ConfirmDialog";
import { BigSpendDialog, type ExpenseFormsData } from "./BigSpendDialog";

type Open = { kind: "add" } | { kind: "edit"; id: string } | { kind: "delete"; id: string };

interface Controls {
  forms: ExpenseFormsData;
  open: (open: Open) => void;
}

const FormsContext = createContext<Controls | null>(null);

export function useExpenseForms(): Controls {
  const controls = useContext(FormsContext);
  if (!controls) throw new Error("useExpenseForms needs an ExpenseFormsProvider");
  return controls;
}

/** Nothing here offers Undo, so the toast's undo is never called. */
const NO_UNDO = async () => ({ ok: false, message: "Nothing to undo." });

/** Opens the Expenses forms from anywhere on the page: Add a big spend, Edit one, Delete one. A save says so in a toast. */
export function ExpenseFormsProvider({ forms, children }: { forms: ExpenseFormsData; children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const { saved, view } = useUndoToast(NO_UNDO);
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
  const spend = open && "id" in open ? forms.spends.find((s) => s.id === open.id) : undefined;

  return (
    <FormsContext.Provider value={{ forms, open: show }}>
      {children}
      {open?.kind === "add" && <BigSpendDialog forms={forms} onClose={close} onSaved={() => saved(undefined, "Big spend added.")} />}
      {open?.kind === "edit" && spend && <BigSpendDialog forms={forms} spend={spend} onClose={close} onSaved={() => saved(undefined, "Saved.")} onDelete={() => setOpen({ kind: "delete", id: spend.id })} />}
      {open?.kind === "delete" && spend && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title="Delete this big spend?"
          body={`${spend.name} (${formatInr(spend.amount)}, ${formatDate(spend.date)}) is removed from the Sheet, and that can't be undone. What the month spent doesn't change: a big spend only explains it.`}
          hidden={{ id: spend.id }}
          keepLabel="Keep it"
          confirmLabel="Delete big spend"
          action={deleteBigSpend}
          today={forms.today}
          onClose={close}
          onSaved={() => saved(undefined, "Deleted.")}
        />
      )}
      {view}
    </FormsContext.Provider>
  );
}

/** Add a big spend, in the header and on the Big spends card. */
export function AddBigSpendButton({ className = HEADER_PRIMARY_CLASS, label = "Add a big spend" }: { className?: string; label?: string }) {
  const { open } = useExpenseForms();
  return <FormTriggerButton className={className} label={label} onClick={() => open({ kind: "add" })} />;
}

/** A row that opens its big spend for editing. */
export function EditBigSpend({ id, className, children, label }: { id: string; className: string; children: ReactNode; label: string }) {
  const { open } = useExpenseForms();
  return (
    <button type="button" aria-label={label} onClick={() => open({ kind: "edit", id })} className={className}>
      {children}
    </button>
  );
}
