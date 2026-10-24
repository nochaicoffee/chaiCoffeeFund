"use client";

import { useState } from "react";
import { Field, describedBy, inputClass } from "./fields";
import { EyeIcon, LockIcon } from "./icons";

/**
 * A statement PDF password field, for a card and for a bank account (the Gmail import opens
 * their statements with it). A saved password is never shown back: the field says Saved, with
 * Change and Remove. Removing sends `clearPassword=1`, which the form's action reads; typing
 * a new one sends it as `statementPdfPassword`; leaving a saved one alone sends neither.
 * The typed value is the form's to hold, so the form can check it with the rest.
 */
export function PdfPasswordField({ id, help, saved, value, onChange }: { id: string; help: string; saved: boolean; value: string; onChange: (value: string) => void }) {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<"keep" | "change" | "remove">(saved ? "keep" : "change");
  return (
    <>
      {mode === "remove" && <input type="hidden" name="clearPassword" value="1" />}
      <Field id={id} label="Statement PDF password" help={help}>
        {mode === "change" ? (
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden="true">
              <LockIcon />
            </span>
            <input
              {...describedBy(id, undefined, true)}
              type={show ? "text" : "password"}
              name="statementPdfPassword"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={saved ? "New password" : "The password your bank uses for the PDF"}
              className={`${inputClass(false)} pr-11 pl-9`}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              aria-pressed={show}
              className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
            >
              <EyeIcon off={show} />
            </button>
          </div>
        ) : (
          <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-[12px] border border-surface-line px-3.5 py-2 text-sm font-semibold">
            <LockIcon />
            {mode === "keep" ? "Saved" : "Will be removed"}
            <span className="ml-auto flex gap-1.5">
              <button type="button" onClick={() => setMode("change")} className="rounded-full bg-fill px-3 py-1 text-xs font-bold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent max-md:py-2">
                Change
              </button>
              <button
                type="button"
                onClick={() => setMode(mode === "remove" ? "keep" : "remove")}
                className="rounded-full bg-fill px-3 py-1 text-xs font-bold hover:bg-fill-strong focus-visible:outline-2 focus-visible:outline-accent max-md:py-2"
              >
                {mode === "remove" ? "Keep it" : "Remove"}
              </button>
            </span>
          </div>
        )}
      </Field>
    </>
  );
}
