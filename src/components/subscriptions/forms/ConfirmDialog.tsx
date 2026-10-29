"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { IDLE, type FormState } from "@/lib/forms/formState";
import { DateInput, Field, describedBy } from "../../cards/forms/fields";
import { AlertIcon } from "../../cards/forms/icons";

/**
 * The small confirm dialogs of the Subscriptions forms (#128, design "Pause and cancel"):
 * Pause, Cancel (with the date it was cancelled), Resume and Restart (with the date it
 * starts again), and Delete. Each asks first, then runs its server action; a failed save
 * says so and keeps the dialog open. A native modal <dialog>, like the form dialogs.
 */
export function ConfirmDialog({
  tone,
  icon,
  title,
  body,
  date,
  hidden,
  keepLabel,
  confirmLabel,
  action,
  today,
  onClose,
  alternative,
  onSaved,
}: {
  tone: "neutral" | "danger";
  icon: ReactNode;
  title: string;
  body: ReactNode;
  /** A date to ask for: the form field's name, its label, and where it starts. */
  date?: { name: "endDate" | "resumedOn"; label: string; initial: string; help: string };
  hidden: Record<string, string>;
  keepLabel: string;
  confirmLabel: string;
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  today: string;
  onClose: () => void;
  /** A gentler way out, on the left: Delete source offers Mark inactive instead (Income, #190). */
  alternative?: { label: string; onClick: () => void };
  /** Told when the action saves, with what a toast can offer to take back (Insurance's Restart). */
  onSaved?: (undo?: { id: string; message: string }) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [value, setValue] = useState(date?.initial ?? "");

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  useEffect(() => {
    if (state.status === "saved") {
      ref.current?.close();
      onSaved?.(state.undo);
    }
    // Only when a save comes back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // The date's own error sits under it; one about the whole change (it's changed since) goes in the alert.
  const error = state.status === "invalid" && date ? state.errors[date.name] : undefined;
  const formError = state.status === "invalid" ? state.errors.form : undefined;
  const failed = state.status === "failed";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(440px,calc(100vw-32px))] max-w-none rounded-[24px] border border-surface-line bg-surface p-0 text-fg shadow-card backdrop:bg-ink/35"
    >
      <form action={formAction} className="flex flex-col gap-4 p-6">
        {Object.entries(hidden).map(([name, v]) => (
          <input key={name} type="hidden" name={name} value={v} />
        ))}
        <div className="flex items-start gap-3.5">
          <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-[13px] ${tone === "danger" ? "bg-negative-tint text-negative" : "bg-fill text-fg"}`}>
            {icon}
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-lg font-extrabold">
              {title}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed font-medium text-muted">{body}</p>
          </div>
        </div>
        {date && (
          <Field id={date.name} label={date.label} required help={date.help} error={error}>
            <DateInput {...describedBy(date.name, error, true)} label={date.label} name={date.name} value={value} onChange={setValue} today={today} invalid={Boolean(error)} />
          </Field>
        )}
        {(failed || formError) && (
          <p role="alert" className="flex items-start gap-2 rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
            <AlertIcon />
            {failed ? (state.message ?? "Couldn't save to the Sheet, so nothing was written. Try again.") : formError}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2.5">
          {alternative && (
            <button type="button" onClick={alternative.onClick} className="mr-auto min-h-11 rounded-full px-1 text-[13px] font-bold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-accent md:min-h-10">
              {alternative.label}
            </button>
          )}
          <button type="button" onClick={() => ref.current?.close()} className="min-h-11 rounded-full bg-fill px-5 text-[13px] font-bold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent md:min-h-10">
            {keepLabel}
          </button>
          <button
            type="submit"
            disabled={pending}
            className={`min-h-11 rounded-full px-5 text-[13px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 md:min-h-10 ${tone === "danger" ? "bg-negative-tint text-negative hover:bg-negative hover:text-on-accent" : "bg-ink text-on-ink hover:opacity-90"}`}
          >
            {pending ? "Saving…" : failed ? "Try again" : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
