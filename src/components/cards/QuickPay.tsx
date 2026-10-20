"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { payStatementInFull, undoStatementPayment } from "@/app/cards/actions";
import type { PaymentFields } from "@/lib/forms/quickPay";
import type { StatementStatus } from "@/lib/sheets/types";
import { StatusPill } from "./StatusPill";

/**
 * Mark paid in one click from the Cards page's Statements panel (#103).
 * Hovering or focusing a pending row swaps its Pending pill for Mark paid; a
 * click records the bill as paid in full today, and a toast offers Undo for six
 * seconds. The server actions refresh the page's data, so the row, the tiles
 * and the details card all show it paid.
 */

const TOAST_MS = 6000;

type Toast =
  | { kind: "paid"; id: string; message: string; written: PaymentFields; before: PaymentFields; key: number }
  | { kind: "done" | "error"; message: string; key: number };

interface QuickPayControls {
  saving: string | null;
  justPaid: string | null;
  pay: (id: string, what: string) => void;
}

const QuickPayContext = createContext<QuickPayControls | null>(null);

export function QuickPayProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [justPaid, setJustPaid] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const pay = useCallback((id: string, what: string) => {
    setSaving(id);
    startTransition(async () => {
      const result = await payStatementInFull(id);
      setSaving(null);
      if (!result.ok) {
        setToast({ kind: "error", message: result.message, key: Date.now() });
        return;
      }
      setJustPaid(id);
      setToast({ kind: "paid", id, message: `${what} marked paid in full, today`, written: result.written, before: result.before, key: Date.now() });
    });
  }, []);

  function undo() {
    if (toast?.kind !== "paid") return;
    const { id, written, before } = toast;
    setToast(null);
    startTransition(async () => {
      const result = await undoStatementPayment(id, written, before);
      setJustPaid(null);
      setToast({ kind: result.ok ? "done" : "error", message: result.ok ? "Put back as it was." : result.message, key: Date.now() });
    });
  }

  // Each toast closes itself after a while; a newer one replaces it.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.kind === "paid" ? TOAST_MS : 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <QuickPayContext.Provider value={{ saving, justPaid, pay }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
        {toast && (
          <div key={toast.key} role="status" className="pointer-events-auto relative flex max-w-full items-center gap-3 overflow-hidden rounded-[14px] bg-ink py-2.5 pr-2.5 pl-4 text-[13px] font-semibold text-on-ink shadow-card motion-safe:animate-toast-in">
            <span className="min-w-0">{toast.message}</span>
            {toast.kind === "paid" && (
              <button type="button" onClick={undo} className="shrink-0 rounded-[9px] bg-on-card-fill px-3 py-1.5 font-extrabold hover:bg-on-card-line-top focus-visible:outline-2 focus-visible:outline-accent">
                Undo
              </button>
            )}
            {toast.kind === "paid" && (
              <span aria-hidden="true" className="absolute inset-x-2.5 bottom-1 h-0.5 origin-left rounded-full bg-on-card-fill motion-safe:animate-toast-drain" />
            )}
          </div>
        )}
      </div>
    </QuickPayContext.Provider>
  );
}

/**
 * A row's status cell. Pending: the pill, with Mark paid in its place while the
 * row is hovered or focused (always, on a touch screen). Paid: the pill, which
 * pops in, with a light across the row, just after it's marked paid here.
 */
export function QuickPayStatus({ id, status, what }: { id: string; status: StatementStatus; /** "Regalia Gold's Oct 15 bill" */ what: string }) {
  const controls = useContext(QuickPayContext);
  const cell = useRef<HTMLSpanElement>(null);
  const isJustPaid = controls?.justPaid === id && status === "Paid";

  useEffect(() => {
    const row = cell.current?.closest("tr");
    if (!isJustPaid || !row || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tint = getComputedStyle(row).getPropertyValue("--accent-tint").trim() || "transparent";
    row.animate([{ backgroundColor: tint }, { backgroundColor: "transparent" }], { duration: 1400, easing: "ease-out" });
  }, [isJustPaid]);

  if (!controls || status !== "Pending") {
    return (
      <span ref={cell} className={`inline-flex ${isJustPaid ? "motion-safe:animate-pop" : ""}`}>
        <StatusPill status={status} />
      </span>
    );
  }
  const saving = controls.saving === id;
  return (
    <span ref={cell} className="inline-grid items-center justify-items-end">
      <span className={`[grid-area:1/1] transition-opacity group-focus-within/row:opacity-0 group-hover/row:opacity-0 [@media(hover:none)]:opacity-0 ${saving ? "opacity-0" : ""}`}>
        <StatusPill status={status} />
      </span>
      <button
        type="button"
        onClick={() => controls.pay(id, what)}
        disabled={saving}
        aria-label={`Mark ${what} paid in full, today`}
        title="Paid in full today. For a part payment or another account, use Mark paid on the Statements page."
        className={`[grid-area:1/1] inline-flex h-[30px] items-center gap-1.5 rounded-full bg-ink px-3 text-xs font-extrabold whitespace-nowrap text-on-ink opacity-0 transition-opacity focus-visible:outline-2 focus-visible:outline-accent group-focus-within/row:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100 ${saving ? "bg-accent-text opacity-100" : ""}`}
      >
        {saving && <span aria-hidden="true" className="size-3 rounded-full border-2 border-on-card-line-top border-t-on-ink motion-safe:animate-spin" />}
        {saving ? "Saving" : "Mark paid"}
      </button>
    </span>
  );
}
