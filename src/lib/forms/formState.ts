import type { FieldErrors } from "./fields";

/**
 * What a form's server action returns to its dialog (#51). The dialogs keep
 * their own input in React state, so nothing typed is lost on any of these.
 */
export type FormState =
  | { status: "idle" }
  /** Some fields need fixing; nothing was sent to the Sheet. */
  | { status: "invalid"; errors: FieldErrors; duplicate?: DuplicateStatement }
  /** The Sheet write failed; nothing was written. The dialog offers Try again, with the reason when there is one (lib/sheets/errors.ts). */
  | { status: "failed"; message?: string }
  /** Saved; `at` makes every save a new state, so the dialog can close on it. */
  | { status: "saved"; at: number };

/** An existing statement for the same card and statement date (the duplicate check warns, it doesn't block). */
export interface DuplicateStatement {
  id: string;
  cardId: string;
  statementDate: string;
  totalAmountDue: number;
  status: "Pending" | "Paid";
}

export const IDLE: FormState = { status: "idle" };
