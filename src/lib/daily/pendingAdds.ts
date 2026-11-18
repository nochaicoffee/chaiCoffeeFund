import type { DailySpendInput } from "../forms/dailySpendForms";
import type { FormState } from "../forms/formState";
import type { DailySpend } from "../sheets/types";

/**
 * The bookkeeping for a spend that's shown the moment it's added and saved in the background (docs/design/daily.md): its temporary id, how it looks
 * until the Sheet has it, and the list of adds that couldn't be saved. Pure, so the rules are tested apart from the component that runs them.
 */

/** A spend added on this page keeps this id until the Sheet has saved it, so the page can show it at once. */
export const PENDING_PREFIX = "pending-";

export const pendingId = (n: number) => `${PENDING_PREFIX}${n}`;

/** The spend as the page shows it while it's being saved. */
export function pendingSpend(id: string, input: DailySpendInput): DailySpend {
  return { id, date: input.date, amount: input.amount, method: input.method, ...(input.category && { category: input.category }), ...(input.note && { note: input.note }) };
}

/** An add that couldn't be saved: kept (with what was typed) so it can be tried again. */
export interface FailedAdd {
  id: string;
  input: DailySpendInput;
  message: string;
}

/** What to tell him when a save didn't come back as saved. "unreachable" is a request that got no answer: it may have reached the Sheet. */
export function failureMessage(result: FormState | "unreachable"): string {
  if (result === "unreachable") return "Couldn't confirm it was saved: the connection dropped. Check the day's list before you retry, in case it went through.";
  if (result.status === "invalid") return Object.values(result.errors)[0] ?? "That didn't save.";
  if (result.status === "failed") return result.message ?? "Couldn't save to the Sheet, so nothing was written. Try again.";
  return "That didn't save.";
}

/** The failed adds with this one in them (a retry that fails again replaces its earlier entry, it doesn't pile up). */
export const recordFailure = (list: readonly FailedAdd[], entry: FailedAdd): FailedAdd[] => [...list.filter((f) => f.id !== entry.id), entry];

/** The failed adds without this one (it was saved, retried or dismissed). */
export const clearFailure = (list: readonly FailedAdd[], id: string): FailedAdd[] => list.filter((f) => f.id !== id);
