import type { Card, Statement } from "../sheets/types";

/** The fields a payment writes on a statement: what Mark paid sets, and what Undo puts back. */
export interface PaymentFields {
  status: Statement["status"];
  amountPaid?: number;
  paidDate?: string;
  paidFromAccountId?: string;
  paidFromCardId?: string;
}

/**
 * Every payment field, a missing one as blank (undefined), so writing it clears
 * that cell. Needed on the server: a server action's arguments arrive without
 * their undefined fields, so Undo's "no amount paid" would otherwise leave the
 * amount in the Sheet.
 */
export function completePayment(payment: Pick<PaymentFields, "status"> & Partial<PaymentFields>): PaymentFields {
  return {
    status: payment.status,
    amountPaid: payment.amountPaid,
    paidDate: payment.paidDate,
    paidFromAccountId: payment.paidFromAccountId,
    paidFromCardId: payment.paidFromCardId,
  };
}

/** A statement's payment fields as they are now, every one present (blank as undefined) so writing them back clears what wasn't there. */
export function paymentFields(statement: Statement): PaymentFields {
  return completePayment(statement);
}

/**
 * Mark paid in one click from the dashboard (#103): the bill paid in full
 * today. The amount is the total due, the total paid on the bill as Mark paid
 * records it (₹0 for a credit balance). A part payment already recorded keeps
 * where it was paid from; otherwise it's the card's usual account, if it has one.
 */
export function payInFull(statement: Statement, card: Pick<Card, "defaultPaidFromAccountId"> | undefined, today: string): PaymentFields {
  const source =
    statement.paidFromAccountId || statement.paidFromCardId
      ? { paidFromAccountId: statement.paidFromAccountId, paidFromCardId: statement.paidFromCardId }
      : { paidFromAccountId: card?.defaultPaidFromAccountId, paidFromCardId: undefined };
  return { status: "Paid", amountPaid: Math.max(0, statement.totalAmountDue), paidDate: today, ...source };
}

/** Undo only puts a statement back while it still holds what the one click wrote, so it never overwrites an edit made since. */
export function canUndo(statement: Statement, written: PaymentFields): boolean {
  const now = paymentFields(statement);
  return (Object.keys(written) as (keyof PaymentFields)[]).every((key) => (now[key] ?? undefined) === (written[key] ?? undefined));
}
