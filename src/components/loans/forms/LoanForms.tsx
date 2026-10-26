"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { deleteLoan, deletePrepayment, undoAddLoan, undoMarkPaid, undoPrepayment } from "@/app/loans/actions";
import type { LoanFormsData } from "@/app/loans/views";
import { formatShortDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { AlertIcon } from "../../cards/forms/icons";
import { ConfirmDialog } from "../../subscriptions/forms/ConfirmDialog";
import { FormTriggerButton, HEADER_GHOST_CLASS, HEADER_PRIMARY_CLASS } from "../../shell/FormTriggerButton";
import { LoanFormDialog } from "./LoanFormDialog";
import { MarkPaidDialog } from "./MarkPaidDialog";
import { PrepaymentDialog } from "./PrepaymentDialog";

/**
 * Opens the Loans forms (docs/design/loans.md, LoansForms) from anywhere on the page: Add and Edit loan, Delete loan,
 * Mark paid (on an EMI), Add prepayment (on a loan) and Delete prepayment. Something just saved gets a toast with
 * Undo for six seconds. With sample data every button shows disabled: it never reaches the Sheet.
 */

type Open =
  | { kind: "add-loan" }
  | { kind: "edit-loan"; id: string }
  | { kind: "delete-loan"; id: string }
  | { kind: "mark-paid"; installmentId?: string }
  | { kind: "prepay"; loanId?: string }
  | { kind: "delete-prepayment"; id: string };

type Toast = { kind: "saved"; undoId: string; message: string; key: number } | { kind: "done" | "error"; message: string; key: number };

interface Controls {
  forms: LoanFormsData;
  disabledReason?: string;
  open: (open: Open) => void;
}

const FormsContext = createContext<Controls | null>(null);
const TOAST_MS = 6000;

export function useLoanForms(): Controls {
  const controls = useContext(FormsContext);
  if (!controls) throw new Error("useLoanForms needs a LoanFormsProvider");
  return controls;
}

/** Which undo an id is for: "loan:<id>", "paid:<installment>:<prepayment or blank>:<paid date>:<amount>" or "prepay:<id>". */
function undoFor(undoId: string) {
  return undoId.startsWith("loan:") ? undoAddLoan : undoId.startsWith("paid:") ? undoMarkPaid : undoPrepayment;
}

export function LoanFormsProvider({ forms, children }: { forms: LoanFormsData; children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [, startTransition] = useTransition();
  const disabledReason = forms.demo ? "Sample data can't be changed" : undefined;
  // The button that opened the form, so focus goes back to it on close.
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
  const saved = (undo: { id: string; message: string }) => setToast({ kind: "saved", undoId: undo.id, message: undo.message, key: Date.now() });

  function undo() {
    if (toast?.kind !== "saved") return;
    const { undoId } = toast;
    setToast(null);
    startTransition(async () => {
      const result = await undoFor(undoId)(undoId).catch(() => ({ ok: false, message: "Couldn't reach the app, so nothing was undone. Check the connection and try again." }));
      setToast({ kind: result.ok ? "done" : "error", message: result.message, key: Date.now() });
    });
  }

  // Each toast closes itself after a while; a newer one replaces it.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.kind === "saved" ? TOAST_MS : 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loanOf = (id: string) => forms.loans.find((l) => l.loan.id === id);
  const editing = open?.kind === "edit-loan" || open?.kind === "delete-loan" ? loanOf(open.id) : undefined;
  const prepayment = open?.kind === "delete-prepayment" ? forms.loans.flatMap((l) => l.prepayments.map((p) => ({ p, l }))).find((x) => x.p.id === open.id) : undefined;

  return (
    <FormsContext.Provider value={{ forms, disabledReason, open: (o) => !disabledReason && show(o) }}>
      {children}
      {open?.kind === "add-loan" && <LoanFormDialog forms={forms} onClose={close} onSaved={saved} />}
      {open?.kind === "edit-loan" && editing && <LoanFormDialog forms={forms} editing={editing} onClose={close} onSaved={saved} onDelete={() => setOpen({ kind: "delete-loan", id: editing.loan.id })} />}
      {open?.kind === "mark-paid" && <MarkPaidDialog forms={forms} installmentId={open.installmentId} onClose={close} onSaved={saved} />}
      {open?.kind === "prepay" && <PrepaymentDialog forms={forms} loanId={open.loanId} onClose={close} onSaved={saved} />}
      {open?.kind === "delete-loan" && editing && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title={`Delete ${editing.loan.name}?`}
          body={`It's removed from the Sheet with its ${editing.installments.length} EMIs${editing.prepayments.length ? ` and ${editing.prepayments.length === 1 ? "its prepayment" : `${editing.prepayments.length} prepayments`}` : ""}, and that can't be undone. A loan you've paid off can stay: it shows as closed.`}
          hidden={{ id: editing.loan.id }}
          keepLabel="Keep it"
          confirmLabel="Delete loan"
          action={deleteLoan}
          today={forms.today}
          onClose={close}
        />
      )}
      {open?.kind === "delete-prepayment" && prepayment && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title="Delete this prepayment?"
          body={`${formatInr(prepayment.p.amount)} on the ${prepayment.l.loan.name}, ${formatShortDate(prepayment.p.date)}, is removed, and the EMIs after it are worked out again without it.${prepayment.p.effect === "Close" ? " The loan is active again." : ""}`}
          hidden={{ id: prepayment.p.id }}
          keepLabel="Keep it"
          confirmLabel="Delete prepayment"
          action={deletePrepayment}
          today={forms.today}
          onClose={close}
        />
      )}
      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3.5 rounded-full bg-ink py-2.5 pr-2.5 pl-5 text-[13px] font-bold text-on-ink shadow-card max-md:bottom-20" key={toast.key}>
          <span className={toast.kind === "error" ? "text-[var(--negative-tint)]" : ""}>{toast.message}</span>
          {toast.kind === "saved" && (
            <button type="button" onClick={undo} className="min-h-9 rounded-full bg-[var(--on-card-fill)] px-4 text-xs font-extrabold text-[var(--on-card-lime)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[var(--on-ink)]">
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
  const { disabledReason } = useLoanForms();
  return <FormTriggerButton className={className} label={label} onClick={onClick} disabledReason={disabledReason} />;
}

/** The page header's Add loan and Mark EMI paid, as in the design. */
export function HeaderFormButtons() {
  const { open, forms } = useLoanForms();
  const anyPending = forms.loans.some((l) => l.loan.status === "Active" && l.installments.some((i) => i.status === "Pending"));
  return (
    <>
      <FormTrigger className={HEADER_GHOST_CLASS} label="+ Add loan" onClick={() => open({ kind: "add-loan" })} />
      {anyPending && <FormTrigger className={HEADER_PRIMARY_CLASS} label="✓ Mark EMI paid" onClick={() => open({ kind: "mark-paid" })} />}
    </>
  );
}
