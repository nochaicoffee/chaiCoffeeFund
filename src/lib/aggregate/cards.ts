import { nextOccurrence } from "./recurring";
import type { Card, Statement } from "../sheets/types";

export interface CardSummary {
  card: Card;
  outstandingBalance: number;
  utilization: number | null;
  nextStatementDate: string;
}

export interface StatementVariance {
  statement: Statement;
  /** amountPaid − totalAmountDue: positive = overpaid, negative = underpaid. */
  variance: number;
}

/** Sum of unpaid amounts across a card's Pending statements. */
export function cardOutstandingBalance(cardId: string, statements: Statement[]): number {
  return statements
    .filter((s) => s.cardId === cardId && s.status === "Pending")
    .reduce((sum, s) => sum + (s.totalAmountDue - (s.amountPaid ?? 0)), 0);
}

export function statementVariance(statement: Statement): StatementVariance {
  return { statement, variance: (statement.amountPaid ?? 0) - statement.totalAmountDue };
}

export function computeCardSummaries(cards: Card[], statements: Statement[], from: string): CardSummary[] {
  return cards.map((card) => {
    const outstandingBalance = cardOutstandingBalance(card.id, statements);
    return {
      card,
      outstandingBalance,
      utilization: card.creditLimit > 0 ? outstandingBalance / card.creditLimit : null,
      nextStatementDate: nextOccurrence(card.statementAnchorDate, "Monthly", from),
    };
  });
}

/** Sum of outstanding balances across active cards — the credit-card liability term in net worth. */
export function totalCardOutstanding(cards: Card[], statements: Statement[]): number {
  return cards
    .filter((c) => c.status === "Active")
    .reduce((sum, c) => sum + cardOutstandingBalance(c.id, statements), 0);
}
