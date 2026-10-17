import { allCardsUtilization, pendingStatements, type CardData } from "./cardSpend";
import type { Statement } from "../sheets/types";

/**
 * The live previews in the Add statement and Mark paid dialogs (#51,
 * docs/design/cards-forms.md). They use the dashboard's own rules (cardSpend.ts),
 * so a preview always matches what the dashboard shows once the form is saved.
 */

export interface DueSegment {
  cardId: string;
  /** What's still due on it, never below ₹0. */
  amount: number;
  /** The statement being added, drawn as the outlined "New" segment. */
  isNew: boolean;
}

/** The Next due bar after saving a new pending statement: every pending bill, plus the new one (soonest due first). */
export function nextDueAfterAdding(
  data: CardData,
  today: string,
  added: Pick<Statement, "cardId" | "dueDate" | "totalAmountDue"> | null,
): { segments: DueSegment[]; count: number; total: number } {
  const existing = pendingStatements(data, today).map((d) => ({ cardId: d.statement.cardId, amount: d.remaining, isNew: false, dueDate: d.statement.dueDate }));
  const all = added ? [...existing, { cardId: added.cardId, amount: Math.max(0, added.totalAmountDue), isNew: true, dueDate: added.dueDate }] : existing;
  const segments = all.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(({ cardId, amount, isNew }) => ({ cardId, amount, isNew }));
  return { segments, count: segments.length, total: segments.reduce((sum, s) => sum + s.amount, 0) };
}

export interface PaymentPreview {
  outstandingBefore: number;
  outstandingAfter: number;
  /** Active cards' outstanding ÷ their limit (the All Cards figure); null when no active card has a limit. */
  utilizationBefore: number | null;
  utilizationAfter: number | null;
  /** What's left pending once it's paid. */
  pendingAfter: { count: number; total: number };
}

/**
 * Outstanding and utilization before and after marking one statement paid. A
 * statement marked Paid stops counting towards outstanding whatever was paid on
 * it: an underpayment shows as its variance, as on the Statements page.
 */
export function afterPayment(data: CardData, today: string, statementId: string): PaymentPreview {
  const before = allCardsUtilization(data);
  const paid: CardData = { ...data, statements: data.statements.map((s) => (s.id === statementId ? { ...s, status: "Paid" as const } : s)) };
  const after = allCardsUtilization(paid);
  const pending = pendingStatements(paid, today);
  return {
    outstandingBefore: before.outstanding,
    outstandingAfter: after.outstanding,
    utilizationBefore: before.utilization,
    utilizationAfter: after.utilization,
    pendingAfter: { count: pending.length, total: pending.reduce((sum, d) => sum + d.remaining, 0) },
  };
}
