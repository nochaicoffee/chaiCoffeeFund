import { monthlySpendOffCards } from "./subscriptions";
import { totalDueThisMonth } from "./loans";
import type { CardSummary } from "./cards";
import type { Card, Loan, LoanInstallment, Subscription } from "../sheets/types";

/**
 * What goes out each month: loan EMIs due this month, the subscriptions that aren't on an active card (those are already inside that card's
 * bill), and every active card's outstanding balance. Overview's "Monthly obligations" and the Goals page's "income less obligations" are the
 * same figure, so both read it here (#124 for the subscriptions rule).
 */
export function monthlyObligations({ subscriptions, cards, loans, loanInstallments, cardSummaries, yearMonth }: { subscriptions: Subscription[]; cards: Card[]; loans: Loan[]; loanInstallments: LoanInstallment[]; cardSummaries: CardSummary[]; yearMonth: string }): number {
  return (
    monthlySpendOffCards(subscriptions, cards) +
    totalDueThisMonth(loans, loanInstallments, yearMonth) +
    cardSummaries.reduce((sum, s) => sum + (s.card.status === "Active" ? s.outstandingBalance : 0), 0)
  );
}
