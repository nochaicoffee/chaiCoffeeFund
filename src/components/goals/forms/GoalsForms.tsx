"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * What the Goals page can ask its forms to open (#243). The page's buttons call `open` with one of these, so the cards and the side know
 * nothing about the dialogs. Until the forms are built the provider's `open` does nothing.
 */
export type GoalsFormAction =
  | { kind: "add-goal" }
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

interface Ctx {
  open: (action: GoalsFormAction) => void;
}

const FormsContext = createContext<Ctx>({ open: () => undefined });

export const useGoalsForms = () => useContext(FormsContext);

export function GoalsFormsProvider({ children, open }: { children: ReactNode; open?: Ctx["open"] }) {
  return <FormsContext.Provider value={{ open: open ?? (() => undefined) }}>{children}</FormsContext.Provider>;
}

/** A small action button, like the other pages'. */
export function ActionButton({ label, onClick, tone = "soft", className = "" }: { label: string; onClick: () => void; tone?: "soft" | "ghost" | "ink"; className?: string }) {
  const tones = { soft: "bg-accent-tint text-accent-text hover:bg-accent/30", ghost: "bg-surface text-fg hover:bg-fill-strong", ink: "bg-ink text-on-ink hover:opacity-90" };
  return (
    <button type="button" onClick={onClick} className={`min-h-8 rounded-full px-3.5 text-xs font-extrabold focus-visible:outline-2 focus-visible:outline-accent ${tones[tone]} ${className}`}>
      {label}
    </button>
  );
}
