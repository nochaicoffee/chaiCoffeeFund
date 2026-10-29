"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { deletePolicyAction, restartPolicyAction, undoAction } from "@/app/insurance/actions";
import type { InsuranceFormsData } from "@/app/insurance/formsView";
import type { PolicyKind } from "@/lib/sheets/types";
import { AlertIcon, CheckIcon } from "../../cards/forms/icons";
import { FormTriggerButton, HEADER_GHOST_CLASS, HEADER_PRIMARY_CLASS, SMALL_OK } from "../../shell/FormTriggerButton";

export { SMALL_OK };
import { ConfirmDialog } from "../../subscriptions/forms/ConfirmDialog";
import { CancelDialog } from "./CancelDialog";
import { PolicyFormDialog } from "./PolicyFormDialog";
import { RenewDialog } from "./RenewDialog";

/**
 * Opens the Insurance forms (docs/design/insurance.md, InsForms) from anywhere on the page: Add and Edit policy, Renew, Cancel, Restart
 * and Delete. What was just saved gets a toast with Undo for six seconds: a renewal takes its term out and puts the cover back, an added
 * policy is removed, a cancel is restarted, a restart is cancelled again and an edit is put back (Delete asks first instead). With sample data every button shows disabled: it never reaches the Sheet.
 */

type Open =
  /** `start` is what the form begins with: the kind of policy, and what it covers (a loan's tile, an empty page's kind). */
  | { kind: "add"; start?: { policyKind?: PolicyKind; covers?: string } }
  | { kind: "edit"; id: string }
  | { kind: "renew"; policyId?: string }
  | { kind: "cancel"; policyId?: string }
  | { kind: "restart"; id: string }
  | { kind: "delete"; id: string };

type Toast = { kind: "saved"; undoId: string; message: string; key: number } | { kind: "done" | "error"; message: string; key: number };

interface Controls {
  forms: InsuranceFormsData;
  disabledReason?: string;
  open: (open: Open) => void;
}

const FormsContext = createContext<Controls | null>(null);
const TOAST_MS = 6000;

export function useInsuranceForms(): Controls {
  const controls = useContext(FormsContext);
  if (!controls) throw new Error("useInsuranceForms needs an InsuranceFormsProvider");
  return controls;
}

export function InsuranceFormsProvider({ forms, children }: { forms: InsuranceFormsData; children: ReactNode }) {
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
  const saved = (undo: { id: string; message: string } | undefined, message: string) => setToast(undo ? { kind: "saved", undoId: undo.id, message: undo.message, key: Date.now() } : { kind: "done", message, key: Date.now() });

  function undo() {
    if (toast?.kind !== "saved") return;
    const { undoId } = toast;
    setToast(null);
    startTransition(async () => {
      const result = await undoAction(undoId).catch(() => ({ ok: false, message: "Couldn't reach the app, so nothing was undone. Check the connection and try again." }));
      setToast({ kind: result.ok ? "done" : "error", message: result.message, key: Date.now() });
    });
  }

  // Each toast closes itself after a while; a newer one replaces it.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.kind === "saved" ? TOAST_MS : 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const policyOf = (id: string) => forms.policies.find((p) => p.id === id);
  const target = open && "id" in open ? policyOf(open.id) : undefined;

  return (
    <FormsContext.Provider value={{ forms, disabledReason, open: (o) => !disabledReason && show(o) }}>
      {children}
      {open?.kind === "add" && <PolicyFormDialog forms={forms} start={open.start} onClose={close} onSaved={saved} />}
      {open?.kind === "edit" && target && <PolicyFormDialog forms={forms} editing={target} onClose={close} onSaved={saved} />}
      {open?.kind === "renew" && <RenewDialog forms={forms} policyId={open.policyId} onClose={close} onSaved={saved} />}
      {open?.kind === "cancel" && <CancelDialog forms={forms} policyId={open.policyId} onClose={close} onSaved={saved} />}
      {open?.kind === "restart" && target && (
        <ConfirmDialog
          tone="neutral"
          icon={<CheckIcon />}
          title={`Restart ${target.name}?`}
          body="It counts again, with the same terms it had. If its last term has ended it shows as lapsed until you renew it."
          hidden={{ policyId: target.id }}
          keepLabel="Leave it cancelled"
          confirmLabel="Restart policy"
          action={restartPolicyAction}
          today={forms.today}
          onClose={close}
          onSaved={(undo) => saved(undo, `${target.name} restarted`)}
        />
      )}
      {open?.kind === "delete" && target && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title={`Delete ${target.name}?`}
          body="It's removed from the Sheet with every payment on it, and that can't be undone. For a policy that has ended, cancel it instead: it stays on record."
          hidden={{ policyId: target.id }}
          keepLabel="Keep it"
          confirmLabel="Delete policy"
          action={deletePolicyAction}
          today={forms.today}
          onClose={close}
          onSaved={() => saved(undefined, `${target.name} deleted`)}
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
  const { disabledReason } = useInsuranceForms();
  return <FormTriggerButton className={className} label={label} onClick={onClick} disabledReason={disabledReason} />;
}

/** The page header's Add policy and Renew a policy, as in the design. */
export function HeaderFormButtons() {
  const { open, forms } = useInsuranceForms();
  const anyToRenew = forms.policies.some((p) => !p.cancelled);
  return (
    <>
      <FormTrigger className={HEADER_GHOST_CLASS} label="+ Add policy" onClick={() => open({ kind: "add" })} />
      {anyToRenew && <FormTrigger className={HEADER_PRIMARY_CLASS} label="↻ Renew a policy" onClick={() => open({ kind: "renew" })} />}
    </>
  );
}

/** The quiet small button inside a widget (SMALL_OK is the accent one). */
export const SMALL_SOFT = "inline-flex min-h-8 items-center gap-1.5 rounded-full bg-fill px-3.5 text-xs font-extrabold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent";
