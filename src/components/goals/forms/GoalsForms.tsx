"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { deleteGoalAction, dropGoalAction, pauseGoalAction, reopenGoalAction, restoreGoalAction, resumeGoalAction, undoAction } from "@/app/goals/actions";
import type { GoalsFormsData } from "@/app/goals/formsView";
import { formatInr } from "@/lib/format/money";
import type { GoalCategory } from "@/lib/sheets/types";
import { AlertIcon, CheckIcon } from "../../cards/forms/icons";
import { FormTriggerButton, HEADER_GHOST_CLASS, HEADER_PRIMARY_CLASS } from "../../shell/FormTriggerButton";
import { ConfirmDialog } from "../../subscriptions/forms/ConfirmDialog";
import { BoughtDialog } from "./BoughtDialog";
import { EntryDialog } from "./EntryDialog";
import { GoalFormDialog } from "./GoalFormDialog";

/**
 * Opens the Goals forms (docs/design/goals.md, GoalsForms and GoalsForms2) from anywhere on the page: Add goal and sub-goal, Set aside and Take back,
 * Edit, Pause and Resume, Drop and Restore, Mark bought and Reopen, and Delete. What was just saved gets a toast with Undo for six seconds (an added
 * goal is removed, an entry taken out, statuses put back, an edit undone, a delete restored). With sample data every button shows disabled: it never
 * reaches the Sheet.
 */
export type GoalsFormAction =
  | { kind: "add-goal"; category?: GoalCategory }
  | { kind: "add-sub-goal"; goalId: string }
  | { kind: "set-aside"; goalId?: string; amount?: number }
  | { kind: "take-back"; goalId: string }
  | { kind: "edit"; goalId: string }
  | { kind: "pause"; goalId: string }
  | { kind: "resume"; goalId: string }
  | { kind: "drop"; goalId: string }
  | { kind: "restore"; goalId: string }
  | { kind: "bought"; goalId: string }
  | { kind: "reopen"; goalId: string }
  | { kind: "delete"; goalId: string };

type Toast = { kind: "saved"; undoId: string; message: string; key: number } | { kind: "done" | "error"; message: string; key: number };

interface Controls {
  forms: GoalsFormsData | null;
  disabledReason?: string;
  open: (action: GoalsFormAction) => void;
}

const FormsContext = createContext<Controls>({ forms: null, open: () => undefined });
const TOAST_MS = 6000;

export const useGoalsForms = () => useContext(FormsContext);

export function GoalsFormsProvider({ forms, children }: { forms: GoalsFormsData; children: ReactNode }) {
  const [open, setOpen] = useState<GoalsFormAction | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [, startTransition] = useTransition();
  const disabledReason = forms.demo ? "Sample data can't be changed" : undefined;
  // The button that opened the form, so focus goes back to it on close.
  const opener = useRef<HTMLElement | null>(null);
  const show = (next: GoalsFormAction) => {
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

  const target = open && "goalId" in open && open.goalId ? forms.goals.find((g) => g.id === open.goalId) : undefined;
  const confirmProps = { today: forms.today, onClose: close, hidden: { goalId: target?.id ?? "" } };

  return (
    <FormsContext.Provider value={{ forms, disabledReason, open: (action) => !disabledReason && show(action) }}>
      {children}
      {open?.kind === "add-goal" && <GoalFormDialog forms={forms} category={open.category} onClose={close} onSaved={saved} />}
      {open?.kind === "add-sub-goal" && target && <GoalFormDialog forms={forms} parent={target} onClose={close} onSaved={saved} />}
      {open?.kind === "edit" && target && <GoalFormDialog forms={forms} editing={target} onClose={close} onSaved={saved} />}
      {open?.kind === "set-aside" && <EntryDialog forms={forms} kind="Set-aside" goalId={open.goalId} amount={open.amount} onClose={close} onSaved={saved} />}
      {open?.kind === "take-back" && <EntryDialog forms={forms} kind="Take-back" goalId={open.goalId} onClose={close} onSaved={saved} />}
      {open?.kind === "bought" && target && <BoughtDialog forms={forms} goal={target} onClose={close} onSaved={saved} />}
      {open?.kind === "pause" && target && <ConfirmDialog {...confirmProps} tone="neutral" icon={<CheckIcon />} title={`Pause ${target.name}?`} body="It leaves the plan and the sky's rings and keeps what's set aside. Resume it any time and it picks up where it was." keepLabel="Keep it going" confirmLabel="Pause" action={pauseGoalAction} onSaved={(undo) => saved(undo, `${target.name} paused`)} />}
      {open?.kind === "resume" && target && <ConfirmDialog {...confirmProps} tone="neutral" icon={<CheckIcon />} title={`Resume ${target.name}?`} body="It counts again, with its date and its plan." keepLabel="Leave it paused" confirmLabel="Resume" action={resumeGoalAction} onSaved={(undo) => saved(undo, `${target.name} resumed`)} />}
      {open?.kind === "drop" && target && (
        <ConfirmDialog
          {...confirmProps}
          tone="neutral"
          icon={<AlertIcon />}
          title={`Drop ${target.name}?`}
          body={`You won't buy it. The ${formatInr(target.totalSaved)} set aside is released (it stops being earmarked), ${target.parentName ? `and ${target.parentName}'s total shrinks by ${formatInr(target.amount)}` : target.hasKids ? "and its open sub-goals are dropped with it" : "and the goal stays in the list, dimmed"}. You can restore it later.`}
          keepLabel="Keep it"
          confirmLabel="Drop goal"
          action={dropGoalAction}
          onSaved={(undo) => saved(undo, `${target.name} dropped`)}
        />
      )}
      {open?.kind === "restore" && target && <ConfirmDialog {...confirmProps} tone="neutral" icon={<CheckIcon />} title={`Restore ${target.name}?`} body="It counts again, and what was set aside in it is earmarked again." keepLabel="Leave it dropped" confirmLabel="Restore" action={restoreGoalAction} onSaved={(undo) => saved(undo, `${target.name} restored`)} />}
      {open?.kind === "reopen" && target && <ConfirmDialog {...confirmProps} tone="neutral" icon={<CheckIcon />} title={`Reopen ${target.name}?`} body="It's active again. The cost and the day you bought it are cleared, and what was set aside in it is earmarked again." keepLabel="Leave it bought" confirmLabel="Reopen" action={reopenGoalAction} onSaved={(undo) => saved(undo, `${target.name} reopened`)} />}
      {open?.kind === "delete" && target && (
        <ConfirmDialog
          {...confirmProps}
          tone="danger"
          icon={<AlertIcon />}
          title={`Delete ${target.name}?`}
          body={`It's removed with ${target.hasKids ? "its sub-goals and " : ""}every set-aside in it (${formatInr(target.totalSaved)}). If you simply won't buy it, drop it instead and keep the history. There's an Undo for six seconds.`}
          keepLabel="Keep it"
          confirmLabel="Delete goal"
          action={deleteGoalAction}
          onSaved={(undo) => saved(undo, `${target.name} deleted`)}
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

/** A small action button, like the other pages'. With sample data it stays focusable but disabled, with the reason as a tooltip. */
export function ActionButton({ label, onClick, tone = "soft", className = "" }: { label: string; onClick: () => void; tone?: "soft" | "ghost" | "ink"; className?: string }) {
  const { disabledReason } = useGoalsForms();
  const tones = { soft: "bg-accent-tint text-accent-text hover:bg-accent/30", ghost: "bg-surface text-fg hover:bg-fill-strong", ink: "bg-ink text-on-ink hover:opacity-90" };
  return (
    <button type="button" onClick={disabledReason ? undefined : onClick} aria-disabled={disabledReason ? true : undefined} title={disabledReason} className={`min-h-8 rounded-full px-3.5 text-xs font-extrabold focus-visible:outline-2 focus-visible:outline-accent ${disabledReason ? "cursor-not-allowed opacity-60" : ""} ${tones[tone]} ${className}`}>
      {label}
    </button>
  );
}

/** The page header's Add goal and Set aside, as in the design. */
export function HeaderFormButtons() {
  const { open, disabledReason, forms } = useGoalsForms();
  const anyOpen = forms?.goals.some((g) => g.status === "Active" || g.status === "Paused") ?? false;
  return (
    <>
      <FormTriggerButton className={HEADER_GHOST_CLASS} label="+ Add goal" onClick={() => open({ kind: "add-goal" })} disabledReason={disabledReason} />
      {anyOpen && <FormTriggerButton className={HEADER_PRIMARY_CLASS} label="Set aside" onClick={() => open({ kind: "set-aside" })} disabledReason={disabledReason} />}
    </>
  );
}
