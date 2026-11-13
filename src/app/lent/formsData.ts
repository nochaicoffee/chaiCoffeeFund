import { lentLoanColor } from "@/lib/aggregate/lentOut";
import type { LinkableSource } from "@/lib/forms/lentForms";
import type { Color, LentInterestMode, LentLoan, LentRepaymentKind, RecurrenceCycle } from "@/lib/sheets/types";
import type { LentModel } from "./views";

/**
 * What the Lent forms need (docs/design/lent-out.md, C5), as plain data a client dialog can read: the loans with the terms they were
 * entered with, each loan's recorded repayments, the accounts a payout can land in, the income sources a loan could use, and today. The forms' own reading and warnings
 * are in lib/forms/lentForms.ts and the actions in loanActions.ts; this only hands them what to show.
 */

export interface LentLoanForm {
  id: string;
  borrowerName: string;
  principalAmount: number;
  startDate: string;
  interestMode: LentInterestMode;
  interestRate?: number;
  payoutFrequency?: RecurrenceCycle;
  payoutAmount?: number;
  status: "Active" | "Repaid";
  closedDate?: string;
  /** The colour it has now: the one it was given, else the one worked out from its id. */
  color: Color;
  /** True when the colour was chosen, not worked out. */
  colorChosen: boolean;
  /** A payout loan with an income source. */
  linked: boolean;
  /** The account the money left, when set. */
  paidFromAccountId?: string;
}

export interface LentRepaymentForm {
  id: string;
  loanId: string;
  date: string;
  amount: number;
  kind: LentRepaymentKind;
}

export interface LentFormsData {
  today: string;
  loans: LentLoanForm[];
  repayments: LentRepaymentForm[];
  accounts: { id: string; name: string }[];
  /** Income sources a Paid-out loan could use: switched on, repeating (monthly to yearly) and not another loan's. */
  sources: LinkableSource[];
}

const toForm = (loan: LentLoan): LentLoanForm => ({
  id: loan.id,
  borrowerName: loan.borrowerName,
  principalAmount: loan.principalAmount,
  startDate: loan.startDate,
  interestMode: loan.interestMode,
  ...(loan.interestRate !== undefined && { interestRate: loan.interestRate }),
  ...(loan.payoutFrequency && { payoutFrequency: loan.payoutFrequency }),
  ...(loan.payoutAmount !== undefined && { payoutAmount: loan.payoutAmount }),
  status: loan.status,
  ...(loan.closedDate && { closedDate: loan.closedDate }),
  color: lentLoanColor(loan),
  colorChosen: Boolean(loan.color),
  linked: Boolean(loan.incomeSourceId),
  ...(loan.paidFromAccountId && { paidFromAccountId: loan.paidFromAccountId }),
});

function linkableSources(m: LentModel): LinkableSource[] {
  const taken = new Set(m.data.loans.map((l) => l.incomeSourceId).filter(Boolean));
  return m.data.sources
    .filter((s) => s.status === "Active" && s.frequency !== "One-Time" && !taken.has(s.id))
    .map((s) => ({ id: s.id, name: s.name, frequency: s.frequency, expectedAmount: s.expectedAmount, status: s.status }));
}

export function lentFormsData(m: LentModel, accounts: { id: string; name: string }[]): LentFormsData {
  return {
    today: m.today,
    loans: m.data.loans.map(toForm),
    repayments: m.data.repayments.map((r) => ({ id: r.id, loanId: r.lentLoanId, date: r.date, amount: r.amount, kind: r.kind })),
    accounts,
    sources: linkableSources(m),
  };
}
