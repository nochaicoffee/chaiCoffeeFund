"use client";

import { useEffect, useState, useTransition } from "react";
import { saveLook } from "@/app/actions/look";
import { dataLookOf } from "@/lib/look/look";
import { LOOKS, type Look } from "@/lib/sheets/types";
import { icons } from "./icons";

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const LABEL: Record<Look, string> = { Classic: "Classic", Neubrutalism: "Neubrutalism" };

/** Puts a look on the page at once (ADR 0018): only `<html>`'s data-look changes, and every token follows it. */
function show(look: Look) {
  const value = dataLookOf(look);
  if (value) document.documentElement.dataset.look = value;
  else delete document.documentElement.dataset.look;
}

/**
 * "Look: Classic | Neubrutalism" (ADR 0018). Picking one shows it at once, then saves it to the Settings tab so every
 * device follows; if the save fails, the old look comes back and a line says why. `variant`: the expanded sidebar's
 * foot (two buttons), the collapsed rail (one icon button that switches), or the phone's More sheet (a row).
 */
export function LookSwitch({ look: saved, variant }: { look: Look; variant: "rail" | "rail-expanded" | "sheet" }) {
  const [look, setLook] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A save from another device reaches here as a new `saved` on the next render: follow it.
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setLook(saved);
  }

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  function pick(next: Look) {
    if (next === look || pending) return;
    const before = look;
    setLook(next);
    setError(null);
    show(next);
    startTransition(async () => {
      const result = await saveLook(next).catch(() => ({ ok: false as const, message: "Couldn't reach the app, so the look wasn't saved." }));
      if (!result.ok) {
        setLook(before);
        show(before);
        setError(result.message);
      }
      // On success saveLook's updateTag re-renders the page with the saved look; nothing more to do here.
    });
  }

  const status = error ? (
    <p role="status" className="text-[11.5px] leading-snug font-semibold text-negative">
      {error}
    </p>
  ) : null;

  if (variant === "rail") {
    const next: Look = look === "Classic" ? "Neubrutalism" : "Classic";
    return (
      <div className="relative flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => pick(next)}
          aria-label={`Look: ${LABEL[look]}. Switch to ${LABEL[next]}`}
          title={`Look: ${LABEL[look]}. Switch to ${LABEL[next]}`}
          className={`flex size-[30px] items-center justify-center rounded-full text-muted hover:bg-fill hover:text-fg ${FOCUS_RING}`}
        >
          {icons.look}
        </button>
        {error && (
          <p role="status" className="absolute bottom-0 left-full z-40 ml-3 w-56 rounded-[12px] bg-ink px-3 py-2 text-[11.5px] leading-snug font-semibold text-on-ink shadow-pop">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={variant === "sheet" ? "mt-3 flex flex-col gap-1.5 px-1" : "flex flex-col gap-1.5 px-1"}>
      <div role="group" aria-label="Look" className="flex items-center gap-2">
        <span aria-hidden="true" className="flex text-muted">
          {icons.look}
        </span>
        <span className="flex min-w-0 flex-1 rounded-[var(--btn-radius,calc(infinity*1px))] btn-edge bg-[var(--btn-soft-bg,var(--fill))] p-0.5">
          {LOOKS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={look === option}
              onClick={() => pick(option)}
              className={`min-h-8 flex-auto rounded-full px-2 text-[11.5px] font-extrabold whitespace-nowrap ${look === option ? "bg-surface text-fg shadow-[var(--raised-shadow)]" : "text-muted hover:text-fg"} ${FOCUS_RING}`}
            >
              {LABEL[option]}
            </button>
          ))}
        </span>
      </div>
      {status}
    </div>
  );
}
