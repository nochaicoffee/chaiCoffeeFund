import { remainingDue } from "./cardSpend";
import { nextStatementDate } from "./cardSchedule";
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

/** What's still due across a card's Pending statements (each one's total minus anything paid, never below ₹0). */
export function cardOutstandingBalance(cardId: string, statements: Statement[]): number {
  return statements
    .filter((s) => s.cardId === cardId && s.status === "Pending")
    .reduce((sum, s) => sum + remainingDue(s), 0);
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
      nextStatementDate: nextStatementDate(card, from),
    };
  });
}

/**
 * What's still owed across every card, closed ones included: the credit-card
 * liability in net worth. An unpaid bill on a closed card is still owed
 * (decided 2026-10-17, PRD §8), so it counts the same as the Cards page.
 */
export function totalCardOutstanding(cards: Card[], statements: Statement[]): number {
  return cards.reduce((sum, c) => sum + cardOutstandingBalance(c.id, statements), 0);
}
