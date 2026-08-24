import { totalAccountBalance } from "./accounts";
import { totalCardOutstanding } from "./cards";
import { totalEstimatedFixedDepositValue } from "./fixedDeposits";
import { totalCostBasisInr } from "./investments";
import { totalLoanOutstanding } from "./loans";
import type {
  Account,
  BalanceSnapshot,
  Card,
  FixedDeposit,
  InvestmentTransaction,
  Loan,
  LoanInstallment,
  Statement,
} from "../sheets/types";

export interface NetWorthInputs {
  accounts: Account[];
  balanceSnapshots: BalanceSnapshot[];
  cards: Card[];
  statements: Statement[];
  loans: Loan[];
  loanInstallments: LoanInstallment[];
  investmentTransactions: InvestmentTransaction[];
  fixedDeposits: FixedDeposit[];
  asOfDate: string;
}

export interface NetWorthBreakdown {
  bankBalances: number;
  /** Cost basis, not market value — see the note on this function below. */
  investmentValueInr: number;
  fixedDepositValueInr: number;
  cardOutstanding: number;
  loanOutstanding: number;
  netWorth: number;
}

/**
 * bank balances + investments + fixed deposits − card debt − loan debt.
 * Subscriptions are deliberately excluded (see the plan: an unbilled future
 * subscription cost isn't a liability the way a loan's remaining principal
 * or a card's outstanding balance is).
 *
 * `investmentValueInr` uses cost basis (totalCostBasisInr), not live market
 * value — the live-price/FX wiring is still an open question in the plan
 * for the investments phase. Once that's wired, swap in a valueHolding-based
 * total here instead; net worth will read as more accurate, not "different."
 */
export function computeNetWorth(inputs: NetWorthInputs): NetWorthBreakdown {
  const bankBalances = totalAccountBalance(inputs.accounts, inputs.balanceSnapshots);
  const investmentValueInr = totalCostBasisInr(inputs.investmentTransactions);
  const fixedDepositValueInr = totalEstimatedFixedDepositValue(inputs.fixedDeposits, inputs.asOfDate);
  const cardOutstanding = totalCardOutstanding(inputs.cards, inputs.statements);
  const loanOutstanding = totalLoanOutstanding(inputs.loans, inputs.loanInstallments);

  return {
    bankBalances,
    investmentValueInr,
    fixedDepositValueInr,
    cardOutstanding,
    loanOutstanding,
    netWorth: bankBalances + investmentValueInr + fixedDepositValueInr - cardOutstanding - loanOutstanding,
  };
}
