"use client";

import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { AlertIcon, CloseIcon } from "./icons";

const COUNT_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/**
 * The shared shell of the Cards forms (docs/design/cards-forms.md, "Shared
 * pattern"). On desktop it's a dialog with the live preview on the left and the
 * fields on the right. Below 768px it's a full-screen sheet: close on the left,
 * the title centred, the preview as a strip on top, and the primary button
 * pinned at the bottom.
 *
 * It's a native modal <dialog>, so focus stays inside, Esc closes it and focus
 * goes back to the button that opened it. The parent mounts it to open it, and
 * unmounts it on `onClose`.
 */
export function FormDialog({
  icon,
  title,
  subtitle,
  preview,
  children,
  footerNote,
  primaryLabel,
  pending,
  errorCount,
  saveFailed,
  close,
  onClose,
  formProps,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  preview: ReactNode;
  children: ReactNode;
  footerNote: ReactNode;
  primaryLabel: string;
  pending: boolean;
  /** Fields that need fixing; two or more show the summary line. */
  errorCount: number;
  saveFailed: boolean;
  /** Set to true to close the dialog (after a save). */
  close: boolean;
  onClose: () => void;
  formProps: ComponentProps<"form">;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    // React's autoFocus runs before the dialog is shown, so focus the first field here.
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, []);

  useEffect(() => {
    if (close) ref.current?.close();
  }, [close]);

  const shut = () => ref.current?.close();
  const label = pending ? "Saving…" : saveFailed ? "Try again" : primaryLabel;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="form-dialog-title"
      className="m-auto max-h-[calc(100dvh-48px)] w-[min(1000px,calc(100vw-48px))] max-w-none overflow-y-auto rounded-[28px] border border-surface-line bg-surface p-0 text-fg shadow-card backdrop:bg-ink/35 max-md:h-dvh max-md:max-h-dvh max-md:w-screen max-md:rounded-none"
    >
      <form {...formProps} noValidate className="flex min-h-full flex-col">
        <header className="flex items-center gap-3.5 px-7 pt-7 pb-1 max-md:sticky max-md:top-0 max-md:z-10 max-md:gap-2 max-md:border-b max-md:border-divider max-md:bg-surface max-md:px-3 max-md:py-2.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-accent-tint text-accent-text max-md:hidden" aria-hidden="true">
            {icon}
          </span>
          <button
            type="button"
            onClick={shut}
            aria-label="Close"
            className="order-last flex size-9 shrink-0 items-center justify-center rounded-full bg-fill text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent max-md:order-first max-md:size-11"
          >
            <CloseIcon />
          </button>
          <div className="min-w-0 flex-1 max-md:text-center">
            <h2 id="form-dialog-title" className="text-lg font-extrabold max-md:text-base">
              {title}
            </h2>
            <p className="truncate text-xs font-semibold text-muted">{subtitle}</p>
          </div>
          {/* Balances the close button on phone, so the title sits in the middle. */}
          <span className="hidden size-11 shrink-0 max-md:block" aria-hidden="true" />
        </header>

        {(saveFailed || errorCount > 1) && (
          <div role="alert" className="mx-7 mt-4 flex items-start gap-2 rounded-[14px] bg-negative-tint px-4 py-3 text-xs font-semibold text-negative max-md:mx-4">
            <AlertIcon />
            {saveFailed
              ? "Couldn't save to the Sheet, so nothing was written. Everything you entered is still here: try again."
              : `${COUNT_WORDS[errorCount] ?? errorCount} fields need fixing before this can be saved.`}
          </div>
        )}

        <div className="grid flex-1 gap-6 px-7 py-5 md:grid-cols-[320px_minmax(0,1fr)] max-md:gap-5 max-md:px-4">
          <aside aria-label="Live preview">{preview}</aside>
          <div className="flex min-w-0 flex-col gap-4">{children}</div>
        </div>

        <footer className="flex items-center gap-2.5 border-t border-divider px-7 py-5 max-md:sticky max-md:bottom-0 max-md:bg-surface max-md:px-4 max-md:py-3">
          <p className="mr-auto text-xs font-semibold text-muted max-md:hidden">{footerNote}</p>
          <button
            type="button"
            onClick={shut}
            className="min-h-11 rounded-full bg-fill px-5 text-[13px] font-bold text-fg hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent max-md:hidden md:min-h-10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-full bg-ink px-6 text-[13px] font-bold text-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 max-md:w-full max-md:min-h-12 md:min-h-10"
          >
            {label}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
