"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { changeSubscriptionStatus, deleteSubscription, markRenewalPaid, undoMarkPaid } from "@/app/subscriptions/actions";
import type { FormsData } from "@/app/subscriptions/formsView";
import { formatShortDate } from "@/lib/format/date";
import type { PaymentInput } from "@/lib/forms/subscriptionForms";
import { AlertIcon } from "../../cards/forms/icons";
import { PlayIcon, RenewIcon } from "../icons";
import { ConfirmDialog } from "./ConfirmDialog";
import { PaymentFormDialog } from "./PaymentFormDialog";
import { SubscriptionFormDialog } from "./SubscriptionFormDialog";

/**
 * Opens the Subscriptions forms (#128) from anywhere on the page, and runs one-click Mark
 * paid: the plan's price on the renewal date, with a toast offering Undo for six seconds,
 * as QuickPay does on the Cards page. With sample data every button shows disabled: it
 * never reaches the Sheet.
 */

export type StatusChange = "pause" | "cancel" | "resume" | "restart";
type Open = { kind: "add" } | { kind: "edit"; id: string } | { kind: "record"; id?: string } | { kind: "status"; id: string; change: StatusChange } | { kind: "delete"; id: string };

type Toast = { kind: "paid"; paymentId: string; written: PaymentInput; message: string; key: number } | { kind: "done" | "error"; message: string; key: number };

interface Controls {
  forms: FormsData;
  /** Why the forms can't be used here, when they can't: with sample data. */
  disabledReason?: string;
  open: (open: Open) => void;
  markPaid: (subscriptionId: string) => void;
  /** The subscription whose Mark paid is saving. */
  saving: string | null;
}

const FormsContext = createContext<Controls | null>(null);

export function useSubscriptionForms(): Controls {
  const controls = useContext(FormsContext);
  if (!controls) throw new Error("useSubscriptionForms needs a SubscriptionFormsProvider");
  return controls;
}

const TOAST_MS = 6000;
const UNREACHABLE = "Couldn't reach the app, so nothing was saved. Check the connection and try again.";

export function SubscriptionFormsProvider({ forms, children }: { forms: FormsData; children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const disabledReason = forms.demo ? "Sample data can't be changed" : undefined;
  // The button that opened the form, so focus goes back to it on close, even after Edit → Delete
  // or a menu, whose own buttons are gone by then (a native dialog would send focus to the page).
  const opener = useRef<HTMLElement | null>(null);
  const show = (next: Open) => {
    if (next.kind !== "delete") opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(next);
  };

  const markPaid = useCallback(
    (subscriptionId: string) => {
      const date = forms.context[subscriptionId]?.markPaid;
      if (!date) return;
      setSaving(subscriptionId);
      startTransition(async () => {
        // The action reports Sheet failures itself; this catches the app being unreachable, so the button never just stops.
        const result = await markRenewalPaid(subscriptionId, date).catch(() => ({ ok: false as const, message: UNREACHABLE }));
        setSaving(null);
        setToast(result.ok ? { kind: "paid", paymentId: result.paymentId, written: result.written, message: result.message, key: Date.now() } : { kind: "error", message: result.message, key: Date.now() });
      });
    },
    [forms.context],
  );

  function undo() {
    if (toast?.kind !== "paid") return;
    const { paymentId, written } = toast;
    setToast(null);
    startTransition(async () => {
      const result = await undoMarkPaid(paymentId, written).catch(() => ({ ok: false, message: UNREACHABLE }));
      setToast({ kind: result.ok ? "done" : "error", message: result.message, key: Date.now() });
    });
  }

  // Each toast closes itself after a while; a newer one replaces it.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.kind === "paid" ? TOAST_MS : 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const close = () => {
    setOpen(null);
    const back = opener.current;
    setTimeout(() => back?.isConnected && back.focus(), 0);
  };
  const subscription = open && "id" in open && open.id ? forms.subscriptions.find((s) => s.id === open.id) : undefined;
  const context = subscription ? forms.context[subscription.id] : undefined;
  const payments = context ? `${context.rows} ${context.rows === 1 ? "payment" : "payments"}` : "payments";

  return (
    <FormsContext.Provider value={{ forms, disabledReason, open: (o) => !disabledReason && show(o), markPaid: (id) => !disabledReason && markPaid(id), saving }}>
      {children}
      {open?.kind === "add" && <SubscriptionFormDialog forms={forms} onClose={close} />}
      {open?.kind === "edit" && subscription && <SubscriptionFormDialog subscription={subscription} forms={forms} onDelete={() => setOpen({ kind: "delete", id: subscription.id })} onClose={close} />}
      {open?.kind === "record" && <PaymentFormDialog subscriptionId={open.id} forms={forms} onClose={close} />}
      {open?.kind === "delete" && subscription && (
        <ConfirmDialog
          tone="danger"
          icon={<AlertIcon />}
          title={`Delete ${subscription.alias}?`}
          body={`This removes it and its ${payments} from the Sheet, and can't be undone. To keep the history, cancel it instead.`}
          hidden={{ id: subscription.id }}
          keepLabel="Keep it"
          confirmLabel="Delete"
          action={deleteSubscription}
          today={forms.today}
          onClose={close}
        />
      )}
      {open?.kind === "status" && subscription && (
        <ConfirmDialog
          {...statusDialog(open.change, subscription.alias, payments, context?.nextRenewal ?? null, forms.today)}
          hidden={{ id: subscription.id, change: open.change }}
          action={changeSubscriptionStatus}
          today={forms.today}
          onClose={close}
        />
      )}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
        {toast && (
          <div key={toast.key} role="status" className="pointer-events-auto relative flex max-w-full items-center gap-3 overflow-hidden rounded-[14px] bg-ink py-2.5 pr-2.5 pl-4 text-[13px] font-semibold text-on-ink shadow-card motion-safe:animate-toast-in">
            <span className="min-w-0">{toast.message}</span>
            {toast.kind === "paid" && (
              <button type="button" onClick={undo} className="shrink-0 rounded-[9px] bg-on-card-fill px-3 py-1.5 font-extrabold hover:bg-on-card-line-top focus-visible:outline-2 focus-visible:outline-accent">
                Undo
              </button>
            )}
            {toast.kind === "paid" && <span aria-hidden="true" className="absolute inset-x-2.5 bottom-1 h-0.5 origin-left rounded-full bg-on-card-fill motion-safe:animate-toast-drain" />}
          </div>
        )}
      </div>
    </FormsContext.Provider>
  );
}

function statusDialog(change: StatusChange, alias: string, payments: string, next: string | null, today: string) {
  const startsAgain = { name: "resumedOn" as const, label: "Starts again on", initial: today, help: "Renewals are expected from this date." };
  switch (change) {
    case "pause":
      return { tone: "neutral" as const, icon: <span className="text-sm font-extrabold">II</span>, title: `Pause ${alias}?`, body: `It's left out of your totals, and no renewals are expected until you resume it. Its ${payments} stay.`, keepLabel: "Keep it active", confirmLabel: "Pause" };
    case "cancel":
      return {
        tone: "danger" as const,
        icon: <AlertIcon />,
        title: `Cancel ${alias}?`,
        body: `It won't renew${next ? ` on ${formatShortDate(next)}` : ""}. It moves to Cancelled with its ${payments}, so your history stays complete.`,
        date: { name: "endDate" as const, label: "Cancelled on", initial: today, help: "It won't renew from this date." },
        keepLabel: "Keep it",
        confirmLabel: "Cancel subscription",
      };
    case "resume":
      return { tone: "neutral" as const, icon: <PlayIcon size={14} />, title: `Resume ${alias}?`, body: "It's counted in your totals again. The renewals that came up while it was paused weren't due, so they won't be flagged.", date: startsAgain, keepLabel: "Not now", confirmLabel: "Resume" };
    case "restart":
      return { tone: "neutral" as const, icon: <RenewIcon size={16} />, title: `Restart ${alias}?`, body: "It's active again and its cancelled-on date is cleared. The renewals that came up while it was cancelled weren't due, so they won't be flagged.", date: startsAgain, keepLabel: "Not now", confirmLabel: "Restart" };
  }
}

/**
 * A button that opens a form or runs Mark paid. With sample data it stays focusable but
 * disabled (aria-disabled), with the reason as a tooltip, as the Cards forms' buttons do.
 */
export function FormTrigger({ className, label, icon, onClick, iconOnly = false, busy = false }: { className: string; label: string; icon?: ReactNode; onClick: () => void; iconOnly?: boolean; busy?: boolean }) {
  const { disabledReason } = useSubscriptionForms();
  return (
    <button
      type="button"
      onClick={disabledReason || busy ? undefined : onClick}
      aria-disabled={disabledReason ? true : undefined}
      aria-label={iconOnly ? label : undefined}
      title={disabledReason}
      className={`${className} ${disabledReason ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {icon}
      {!iconOnly && (busy ? "Saving…" : label)}
      {disabledReason && <span className="sr-only">{` (${disabledReason})`}</span>}
    </button>
  );
}

const HEADER_PRIMARY = "flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold whitespace-nowrap text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:min-h-0";
const HEADER_GHOST = "flex min-h-11 items-center gap-1.5 rounded-full bg-fill px-5 py-2.5 text-[13px] font-bold whitespace-nowrap text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent md:min-h-0";

/** The page header's Record payment and Add subscription, as in the design. */
export function HeaderFormButtons() {
  const { open } = useSubscriptionForms();
  return (
    <>
      <FormTrigger className={HEADER_GHOST} label="Record payment" onClick={() => open({ kind: "record" })} />
      <FormTrigger className={HEADER_PRIMARY} label="Add subscription" onClick={() => open({ kind: "add" })} />
    </>
  );
}
