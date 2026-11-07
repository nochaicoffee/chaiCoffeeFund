import { totalAccountBalance } from "./accounts";
import { epfBalance } from "./epf";
import { totalCardOutstanding } from "./cards";
import { totalEstimatedFixedDepositValue } from "./fixedDeposits";
import { totalCostBasisInr } from "./investments";
import { totalLentOut } from "./lentOut";
import { totalLoanOutstanding } from "./loans";
import type {
  Account,
  BalanceSnapshot,
  Card,
  EpfEntry,
  FixedDeposit,
  InvestmentTransaction,
  LentLoan,
  LentRepayment,
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
  /** Every EPF entry (ADR 0011), of every account. Optional: a page that has none to give leaves EPF out. */
  epfEntries?: EpfEntry[];
  /** Money lent to people, and what has come back. Optional: a page that has none to give leaves it out. */
  lentLoans?: LentLoan[];
  lentRepayments?: LentRepayment[];
  /**
   * What the holdings are worth today, in rupees, as the Investments page works it out (a holding with no price counted at its cost). Optional:
   * without it investments stay at cost basis, as every caller did before the Overview moved to market value (F-OV-05).
   */
  investmentValueInr?: number;
  asOfDate: string;
}

export interface NetWorthBreakdown {
  bankBalances: number;
  /** Market value when the caller gave it (inputs.investmentValueInr), else cost basis: see the note on this function below. */
  investmentValueInr: number;
  fixedDepositValueInr: number;
  /** EPF at the passbook figure: credits plus interest EPFO has credited, both shares. Never the interest still to come. */
  epfValueInr: number;
  /** Principal still out plus interest still owed, across every loan to a person. Money owed by people, not held by a bank: it can go bad, so it is its own line. */
  lentOutInr: number;
  cardOutstanding: number;
  loanOutstanding: number;
  netWorth: number;
}

/**
 * bank balances + investments + fixed deposits + EPF + money lent out − card debt − loan debt.
 * Subscriptions are deliberately excluded (see the plan: an unbilled future
 * subscription cost isn't a liability the way a loan's remaining principal
 * or a card's outstanding balance is).
 *
 * `investmentValueInr` is the market value the caller passes in (the Overview does, from
 * investmentOverview); without it, cost basis (totalCostBasisInr), as before.
 */
export function computeNetWorth(inputs: NetWorthInputs): NetWorthBreakdown {
  const bankBalances = totalAccountBalance(inputs.accounts, inputs.balanceSnapshots);
  const investmentValueInr = inputs.investmentValueInr ?? totalCostBasisInr(inputs.investmentTransactions);
  const fixedDepositValueInr = totalEstimatedFixedDepositValue(inputs.fixedDeposits, inputs.asOfDate);
  // Each account on its own (the balance functions take one account's entries): a closed account still holds its balance.
  const epfEntries = inputs.epfEntries ?? [];
  const epfValueInr = [...new Set(epfEntries.map((e) => e.epfAccountId))].reduce((total, id) => total + epfBalance(epfEntries.filter((e) => e.epfAccountId === id), inputs.asOfDate).total, 0);
  const lentOutInr = totalLentOut(inputs.lentLoans ?? [], inputs.lentRepayments ?? [], inputs.asOfDate);
  const cardOutstanding = totalCardOutstanding(inputs.cards, inputs.statements);
  const loanOutstanding = totalLoanOutstanding(inputs.loans, inputs.loanInstallments);

  return {
    bankBalances,
    investmentValueInr,
    fixedDepositValueInr,
    epfValueInr,
    lentOutInr,
    cardOutstanding,
    loanOutstanding,
    netWorth: bankBalances + investmentValueInr + fixedDepositValueInr + epfValueInr + lentOutInr - cardOutstanding - loanOutstanding,
  };
}
