"use client";

import { createContext, useActionState, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { resolveBalanceReview } from "@/app/accounts/reviewActions";
import type { AttentionItem } from "@/app/accounts/attentionView";
import { IDLE } from "@/lib/forms/formState";
import { AlertIcon } from "../cards/forms/icons";

/**
 * Answering a balance a bank statement disagreed with. The two figures sit side by side, the
 * Sheet's and the statement's, and the choice is one of two buttons: keep what the Sheet has, or
 * take the statement's. Either closes the question, so the "needs attention" mark goes. With sample
 * data the buttons are disabled: nothing there reaches the Sheet.
 */
interface ReviewControls {
  open: (item: AttentionItem) => void;
}

const ReviewContext = createContext<ReviewControls | null>(null);

export function ReviewProvider({ demo, children }: { demo: boolean; children: ReactNode }) {
  const [item, setItem] = useState<AttentionItem | null>(null);
  const open = useCallback((next: AttentionItem) => setItem(next), []);
  const controls = useMemo(() => ({ open }), [open]);
  return (
    <ReviewContext.Provider value={controls}>
      {children}
      {item && <ReviewDialog key={item.id} item={item} demo={demo} onClose={() => setItem(null)} />}
    </ReviewContext.Provider>
  );
}

/** Opens the answer dialog for a balance. Where there's no provider (a page without the marks) it does nothing. */
export function useReview(): ReviewControls {
  return useContext(ReviewContext) ?? { open: () => {} };
}

function ReviewDialog({ item, demo, onClose }: { item: AttentionItem; demo: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(resolveBalanceReview, IDLE);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  useEffect(() => {
    if (state.status === "saved") ref.current?.close();
  }, [state]);

  const failed = state.status === "failed";
  const formError = state.status === "invalid" ? state.errors.form : undefined;
  const button = "min-h-11 rounded-full px-5 text-[13px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 md:min-h-10";

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="review-title" className="m-auto w-[min(480px,calc(100vw-32px))] max-w-none rounded-[24px] border border-surface-line bg-surface p-0 text-fg shadow-card backdrop:bg-ink/35">
      <form action={formAction} className="flex flex-col gap-4 p-6">
        <input type="hidden" name="id" value={item.id} />
        <div className="flex items-start gap-3.5">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-warning-tint text-warning-text">
            <AlertIcon />
          </span>
          <div className="min-w-0">
            <h2 id="review-title" className="text-lg font-extrabold">
              Your statement and the Sheet disagree
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed font-medium text-muted">
              <b className="font-bold text-fg">{item.accountName}</b> on {item.dateText}. The Sheet keeps its balance unless you take the statement&apos;s.
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[14px] bg-fill px-3.5 py-3">
            <dt className="text-[11px] font-bold text-muted">On your Sheet</dt>
            <dd className="mt-0.5 text-lg font-extrabold tabular-nums">{item.recordedText}</dd>
          </div>
          <div className="rounded-[14px] bg-fill px-3.5 py-3">
            <dt className="text-[11px] font-bold text-muted">On the statement</dt>
            <dd className="mt-0.5 text-lg font-extrabold tabular-nums">{item.statementText}</dd>
          </div>
        </dl>
        <p className="text-xs font-semibold text-muted">
          The statement is <b className={item.differenceTone === "up" ? "text-positive" : "text-negative"}>{item.differenceText.replace(/^[+−]/, "")}</b> {item.differenceTone === "up" ? "above" : "below"} the Sheet.
        </p>

        {(failed || formError) && (
          <p role="alert" className="flex items-start gap-2 rounded-[12px] bg-negative-tint px-3.5 py-2.5 text-xs font-semibold text-negative">
            <AlertIcon />
            {failed ? (state.message ?? "Couldn't save to the Sheet, so nothing was changed. Try again.") : formError}
          </p>
        )}
        {demo && <p className="text-xs font-semibold text-muted">Sample data: nothing here is saved.</p>}

        <div className="flex flex-wrap justify-end gap-2.5">
          <button type="button" onClick={() => ref.current?.close()} className={`${button} bg-fill hover:bg-fill-strong`}>
            Not now
          </button>
          <button type="submit" name="choice" value="keep" disabled={pending || demo} className={`${button} bg-fill hover:bg-fill-strong`}>
            Keep {item.recordedText}
          </button>
          <button type="submit" name="choice" value="accept" disabled={pending || demo} className={`${button} bg-ink text-on-ink hover:opacity-90`}>
            {pending ? "Saving…" : `Use ${item.statementText}`}
          </button>
        </div>
      </form>
    </dialog>
  );
}
