"use client";

import { useState } from "react";
import type { FormResult } from "@/lib/forms/fields";
import type { FormState } from "@/lib/forms/formState";

/**
 * Which errors a form shows (docs/design/cards-forms.md, "Validation"): a
 * field's own error once it has been left (on blur), every error once the form
 * is submitted, and what the server action sent back, for as long as that field
 * still holds what was submitted. The form's own check runs on every keystroke,
 * so a fixed field's error clears as soon as it's fixed.
 */
export function useFieldErrors(check: FormResult<unknown>, state: FormState, values: Record<string, string>) {
  const [shown, setShown] = useState<Set<string> | "all">(() => new Set());
  const [submitted, setSubmitted] = useState<Record<string, string>>({});
  const client = check.ok ? {} : check.errors;
  const visible = shown === "all" ? client : Object.fromEntries(Object.entries(client).filter(([field]) => shown.has(field)));
  const server = state.status === "invalid" ? Object.fromEntries(Object.entries(state.errors).filter(([field]) => !(field in values) || values[field] === submitted[field])) : {};
  const errors: Record<string, string> = { ...server, ...visible };
  return {
    errors,
    count: Object.keys(errors).length,
    reveal: (field: string) => setShown((previous) => (previous === "all" || previous.has(field) ? previous : new Set(previous).add(field))),
    revealAll: () => setShown("all"),
    /** Call as the form is sent, so the server's errors can be matched to what it was sent. */
    markSubmitted: () => setSubmitted(values),
  };
}
