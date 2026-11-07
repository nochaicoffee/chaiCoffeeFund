"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import type { LentFormsData } from "@/app/lent/formsData";
import { deleteLentLoan, deleteLentRepayment, reopenLentLoan } from "@/app/lent/loanActions";
import { formatDate } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { AlertIcon } from "../../cards/forms/icons";
import { FormTriggerButton, HEADER_GHOST_CLASS, HEADER_PRIMARY_CLASS } from "../../shell/FormTriggerButton";
import { useUndoToast } from "../../shell/UndoToast";
import { ConfirmDialog } from "../../subscriptions/forms/ConfirmDialog";
import { LoanDialog } from "./LoanDialog";
import { RepaidDialog } from "./RepaidDialog";
import { RepaymentDialog } from "./RepaymentDialog";

/**
 * Opens the Lent forms from anywhere on the page (docs/design/lent-out.md, LeForms): Add a loan, Edit, Record a repayment, Mark repaid,
 * Reopen and Delete (a loan, with its repayments, or one repayment). A save says so in a toast.
 */
type Open =
  | { kind: "add" }
  | { kind: "edit"; id: string }
  | { kind: "repay"; id?: string }
  | { kind: "repaid"; id: string }
  | { kind: "reopen"; id: string }
  | { kind: "delete"; id: string }
  | { kind: "delete-repayment"; id: string };

interface Controls {
  forms: LentFormsData;
  open: (open: Open) => void;
}

const FormsContext = createContext<Controls | null>(null);

export function useLentForms(): Controls {
  const controls = useContext(FormsContext);
  if (!controls) throw new Error("useLentForms needs a LentFormsProvider");
  return controls;
}

/** Nothing here offers Undo, so the toast's undo is never called. */
const NO_UNDO = async () => ({ ok: false, message: "Nothing to undo." });

export function LentFormsProvider({ forms, children }: { forms: LentFormsData; children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const { saved, view } = useUndoToast(NO_UNDO);
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
  const loan = open && "id" in open && open.id && open.kind !== "delete-repayment" ? forms.loans.find((l) => l.id === open.id) : undefined;
  const repayment = open?.kind === "delete-repayment" ? forms.repayments.find((r) => r.id === open.id) : undefined;
  const repaymentsOfLoan = loan ? forms.repayments.filter((r) => r.loanId === loan.id).length : 0;

  return (
    <FormsContext.Provider value={{ forms, open: show }}>
      {children}
      {open?.kind === "add" && <LoanDialog forms={forms} onClose={close} onSaved={() => saved(undefined, "Loan added.")} />}
      {open?.kind === "edit" && loan && <LoanDialog forms={forms} loan={loan} onClose={close} onSaved={() => saved(undefined, "Saved.")} onDelete={() => setOpen({ kind: "delete", id: loan.id })} />}
      {open?.kind === "repay" && <RepaymentDialog forms={forms} loanId={open.id} onClose={close} onSaved={() => saved(undefined, "Repayment recorded.")} />}
      {open?.kind === "repaid" && loan && <RepaidDialog forms={forms} loan={loan} onClose={close} onSaved={() => saved(undefined, "Marked repaid.")} />}
      {open?.kind === "reopen" && loan && (
        <ConfirmDialog
          tone="neutral"
          icon={<AlertIcon />}
          title="Reopen this loan?"
          body={`${loan.borrowerName} goes back to the loans still out, and the day it was repaid is forgotten.`}
          hidden={{ id: loan.id }}
          keepLabel="Leave it repaid"
          confirmLabel="Reopen"
          action={reopenLentLoan}
          today={forms.today}
          onClose={close}
          onSaved={() => saved(undefined, "Reopened.")}
        />
      )}
      {open?.kind === "delete" && loan && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title="Delete this loan?"
          body={`${loan.borrowerName} (${formatInr(loan.principalAmount)}, lent ${formatDate(loan.startDate)}) is removed from the Sheet${repaymentsOfLoan > 0 ? `, with its ${repaymentsOfLoan === 1 ? "repayment" : `${repaymentsOfLoan} repayments`}` : ""}, and that can't be undone.${loan.linked ? " Its income source stays in Income, with the payouts that arrived." : ""} To keep a record of it, mark it repaid instead.`}
          hidden={{ id: loan.id }}
          keepLabel="Keep it"
          confirmLabel="Delete loan"
          action={deleteLentLoan}
          today={forms.today}
          onClose={close}
          onSaved={() => saved(undefined, "Deleted.")}
          alternative={loan.status === "Active" ? { label: "Mark it repaid instead", onClick: () => setOpen({ kind: "repaid", id: loan.id }) } : undefined}
        />
      )}
      {open?.kind === "delete-repayment" && repayment && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title="Delete this repayment?"
          body={`${formatInr(repayment.amount)} of ${repayment.kind.toLowerCase()} on ${formatDate(repayment.date)} is removed from the Sheet. The loan owes (and earns) as if it hadn't come back.`}
          hidden={{ id: repayment.id }}
          keepLabel="Keep it"
          confirmLabel="Delete repayment"
          action={deleteLentRepayment}
          today={forms.today}
          onClose={close}
          onSaved={() => saved(undefined, "Deleted.")}
        />
      )}
      {view}
    </FormsContext.Provider>
  );
}

/** The page header's two buttons. */
export function HeaderButtons() {
  const { forms, open } = useLentForms();
  const anyOpen = forms.loans.some((l) => l.status === "Active");
  return (
    <>
      <FormTriggerButton className={HEADER_GHOST_CLASS} label="Record a repayment" onClick={() => open({ kind: "repay" })} disabledReason={anyOpen ? undefined : "There is no loan still out to record a repayment on"} />
      <FormTriggerButton className={HEADER_PRIMARY_CLASS} label="Add a loan" onClick={() => open({ kind: "add" })} />
    </>
  );
}

/** The empty state's Add a loan. */
export function AddFirstLoanButton() {
  const { open } = useLentForms();
  return <FormTriggerButton className={HEADER_PRIMARY_CLASS} label="Add a loan" onClick={() => open({ kind: "add" })} />;
}
