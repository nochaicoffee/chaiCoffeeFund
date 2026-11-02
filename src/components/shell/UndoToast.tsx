"use client";

import { useEffect, useState, useTransition } from "react";

type Toast = { kind: "saved"; undoId: string; message: string; key: number } | { kind: "done" | "error"; message: string; key: number };

const SAVED_MS = 6000;
const PLAIN_MS = 4000;

/**
 * The toast the dashboards' forms share (Insurance, Goals): what was just saved, with Undo for six seconds. `undoAction` takes the token the save
 * handed back and says what happened; a failed call (offline) is reported, never swallowed. A newer toast replaces the one showing, and each closes
 * itself. `saved(undo, message)` shows the toast for a save: with an undo it offers Undo, without one it just says it's done.
 */
export function useUndoToast(undoAction: (token: string) => Promise<{ ok: boolean; message: string }>) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [, startTransition] = useTransition();

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

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.kind === "saved" ? SAVED_MS : PLAIN_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const view = toast && (
    <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3.5 rounded-full bg-ink py-2.5 pr-2.5 pl-5 text-[13px] font-bold text-on-ink shadow-card max-md:bottom-20" key={toast.key}>
      <span className={toast.kind === "error" ? "text-[var(--negative-tint)]" : ""}>{toast.message}</span>
      {toast.kind === "saved" && (
        <button type="button" onClick={undo} className="min-h-9 rounded-full bg-[var(--on-card-fill)] px-4 text-xs font-extrabold text-[var(--on-card-lime)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[var(--on-ink)]">
          Undo
        </button>
      )}
    </div>
  );
  return { saved, view };
}
