import { monthlySpendOffCards } from "./subscriptions";
import { totalDueThisMonth } from "./loans";
import type { CardSummary } from "./cards";
import type { Card, Loan, LoanInstallment, Statement, Subscription } from "../sheets/types";

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

/**
 * What has already gone out this month toward the obligations above: every loan installment and every card statement paid in the month
 * (by the day it was paid). `monthlyObligations` is what is still to pay; this plus it is what the month asks of him in all.
 */
export function paidThisMonth({ loanInstallments, statements, yearMonth }: { loanInstallments: LoanInstallment[]; statements: Statement[]; yearMonth: string }): number {
  const emis = loanInstallments.filter((i) => i.status === "Paid" && i.paidDate?.startsWith(yearMonth)).reduce((sum, i) => sum + (i.amountPaid ?? i.totalDue), 0);
  const bills = statements.filter((s) => s.status === "Paid" && s.paidDate?.startsWith(yearMonth)).reduce((sum, s) => sum + (s.amountPaid ?? s.totalAmountDue), 0);
  return emis + bills;
}
