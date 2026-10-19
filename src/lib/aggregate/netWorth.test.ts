import { describe, expect, it } from "vitest";
import { computeNetWorth } from "./netWorth";
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

describe("computeNetWorth", () => {
  it("adds assets and subtracts liabilities correctly", () => {
    const accounts: Account[] = [
      { id: "acc-1", name: "A", bank: "B", accountType: "Savings", purpose: "Spending", startDate: "2026-01-01", status: "Active" },
    ];
    const balanceSnapshots: BalanceSnapshot[] = [{ id: "s1", accountId: "acc-1", date: "2026-08-01", balance: 200000 }];

    const cards: Card[] = [
      { id: "card-1", name: "C", alias: "C", issuer: "Other", cardType: "Cashback", creditLimit: 100000, statementDay: 1, dueDayBuffer: 19, status: "Active" },
    ];
    const statements: Statement[] = [
      { id: "stmt-1", cardId: "card-1", statementDate: "2026-08-01", dueDate: "2026-08-20", totalAmountDue: 15000, minimumAmountDue: 500, status: "Pending" },
    ];

    const loans: Loan[] = [
      { id: "loan-1", name: "L", lenderName: "Bank", category: "Personal", repaymentStructure: "Standard-Emi", principalAmount: 50000, annualInterestRate: 10, tenureMonths: 12, paymentFrequency: "Monthly", processingFee: 0, disbursementDate: "2026-01-01", accountId: "acc-1", status: "Active" },
    ];
    const loanInstallments: LoanInstallment[] = [
      { id: "li-1", loanId: "loan-1", installmentNumber: 1, dueDate: "2026-09-01", openingBalance: 50000, principalDue: 30000, interestDue: 500, totalDue: 30500, status: "Pending" },
    ];

    const investmentTransactions: InvestmentTransaction[] = [
      { id: "tx-1", tradeDate: "2026-01-01", symbol: "AAA", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 10, price: 1000, total: 10000, assetType: "India-Equity", broker: "B" },
    ];

    const fixedDeposits: FixedDeposit[] = [
      { id: "fd-1", name: "FD", bankName: "Bank", principalAmount: 20000, interestRate: 7, compoundingType: "Cumulative", startDate: "2026-01-01", maturityDate: "2027-01-01", maturityAmount: 21400, accountId: "acc-1", status: "Active" },
    ];

    const result = computeNetWorth({
      accounts,
      balanceSnapshots,
      cards,
      statements,
      loans,
      loanInstallments,
      investmentTransactions,
      fixedDeposits,
      asOfDate: "2026-08-25",
    });

    expect(result.bankBalances).toBe(200000);
    expect(result.investmentValueInr).toBe(10000);
    expect(result.cardOutstanding).toBe(15000);
    expect(result.loanOutstanding).toBe(30000);
    // fixedDepositValueInr is interpolated, just sanity-check it's between principal and maturity.
    expect(result.fixedDepositValueInr).toBeGreaterThan(20000);
    expect(result.fixedDepositValueInr).toBeLessThan(21400);

    const expectedNetWorth =
      result.bankBalances +
      result.investmentValueInr +
      result.fixedDepositValueInr -
      result.cardOutstanding -
      result.loanOutstanding;
    expect(result.netWorth).toBeCloseTo(expectedNetWorth, 5);
  });
});
