import { allCardsUtilization, pendingStatements, remainingDue, usableStatements, type CardData } from "./cardSpend";
import { minimumLeft, paymentVariance, type Variance } from "./cardStatements";
import type { Statement, StatementStatus } from "../sheets/types";

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

/** A payment as Mark paid and Edit payment save it: the total paid on the bill, and the status that leaves it in. */
export interface Payment {
  amountPaid: number;
  status: StatementStatus;
}

/**
 * Everything the Mark paid preview needs apart from the payment: today's
 * figures, the figures without this bill, and the bill itself. The page works
 * it out per row with `paymentContext`, and the dialog applies what's typed
 * with `afterPayment`, since a bill that stays Pending (#84) changes the
 * numbers with every amount.
 */
export interface PaymentContext {
  /** Today's outstanding and utilization, with the bill as it's saved now. */
  before: { outstanding: number; utilization: number | null };
  /** Every other pending bill: what's still due on them (on active cards too), and how many there are. */
  others: { outstanding: number; activeOutstanding: number; pendingCount: number };
  /** Active cards' limit, utilization's denominator. */
  limit: number;
  /** This bill's total due, and whether its card is active, so it counts towards utilization. */
  bill: { totalAmountDue: number; onActiveCard: boolean };
}

export function paymentContext(data: CardData, today: string, statementId: string): PaymentContext {
  const before = allCardsUtilization(data);
  const others: CardData = { ...data, statements: data.statements.filter((s) => s.id !== statementId) };
  const without = allCardsUtilization(others);
  const bill = usableStatements(data).find((s) => s.id === statementId);
  const card = data.cards.find((c) => c.id === bill?.cardId);
  return {
    before: { outstanding: before.outstanding, utilization: before.utilization },
    others: { outstanding: without.outstanding, activeOutstanding: without.activeOutstanding, pendingCount: pendingStatements(others, today).length },
    limit: without.limit,
    bill: { totalAmountDue: bill?.totalAmountDue ?? 0, onActiveCard: card?.status === "Active" },
  };
}

export interface PaymentPreview {
  outstandingBefore: number;
  outstandingAfter: number;
  /** Active cards' outstanding ÷ their limit (the All Cards figure); null when no active card has a limit. */
  utilizationBefore: number | null;
  utilizationAfter: number | null;
  /** What's left pending once it's saved. */
  pendingAfter: { count: number; total: number };
}

/**
 * Outstanding and utilization before and after saving a payment, by the
 * dashboard's rules (PRD §8). A bill saved as Paid stops counting towards
 * outstanding whatever was paid on it: an underpayment shows as its variance.
 * One that stays Pending still counts what's left on it, total − paid.
 */
export function afterPayment(context: PaymentContext, payment: Payment): PaymentPreview {
  const left = payment.status === "Pending" ? remainingDue({ totalAmountDue: context.bill.totalAmountDue, amountPaid: payment.amountPaid }) : 0;
  const outstanding = context.others.outstanding + left;
  const activeOutstanding = context.others.activeOutstanding + (context.bill.onActiveCard ? left : 0);
  return {
    outstandingBefore: context.before.outstanding,
    outstandingAfter: outstanding,
    utilizationBefore: context.before.utilization,
    utilizationAfter: context.limit > 0 ? activeOutstanding / context.limit : null,
    pendingAfter: { count: context.others.pendingCount + (payment.status === "Pending" ? 1 : 0), total: outstanding },
  };
}

/** The bill once a payment is saved: Paid with its variance, or still Pending with what's left of its total and of its minimum. */
export type BillAfterPayment = { status: "Paid"; variance: Variance } | { status: "Pending"; left: number; minimumLeft: number };

export function billAfterPayment(statement: Statement, payment: Payment): BillAfterPayment {
  const saved = { ...statement, ...payment };
  if (payment.status === "Paid") return { status: "Paid", variance: paymentVariance(saved) };
  return { status: "Pending", left: remainingDue(saved), minimumLeft: minimumLeft(saved) };
}
