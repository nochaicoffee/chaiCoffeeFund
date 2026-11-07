import { describe, expect, it } from "vitest";
import { investmentsOnFrom, overviewModel, type OverviewData } from "./model";
import type { Account, Card, Instrument, InvestmentTransaction, Loan, LoanInstallment, Statement } from "@/lib/sheets/types";

const account: Account = { id: "a1", name: "A", bank: "B", accountType: "Savings", purpose: "Spending", startDate: "2026-01-01", status: "Active" };
const card: Card = { id: "c1", name: "C", alias: "C", issuer: "Other", cardType: "Cashback", creditLimit: 100000, statementDay: 1, dueDayBuffer: 19, status: "Active" };
const statement: Statement = { id: "st1", cardId: "c1", statementDate: "2026-10-01", dueDate: "2026-10-20", totalAmountDue: 30000, minimumAmountDue: 500, status: "Pending" };
const loan = { id: "l1", name: "Home", lenderName: "Bank", category: "Home", repaymentStructure: "Standard-Emi", principalAmount: 200000, annualInterestRate: 9, tenureMonths: 2, paymentFrequency: "Monthly", processingFee: 0, disbursementDate: "2026-07-01", accountId: "a1", status: "Active", firstEmiDate: "2026-08-02", stampDuty: 0, preEmiInterest: 0 } as Loan;
const installments: LoanInstallment[] = [
  { id: "i1", loanId: "l1", installmentNumber: 1, dueDate: "2026-08-02", openingBalance: 200000, principalDue: 100000, interestDue: 0, totalDue: 100000, status: "Paid", paidDate: "2026-08-02" },
  { id: "i2", loanId: "l1", installmentNumber: 2, dueDate: "2026-12-02", openingBalance: 100000, principalDue: 100000, interestDue: 0, totalDue: 100000, status: "Pending" },
];
const trade: InvestmentTransaction = { id: "t1", tradeDate: "2026-08-10", symbol: "AAA", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 10, price: 1000, total: 10000, assetType: "Equity", broker: "B" };
const instrument = { symbol: "AAA", market: "IND", name: "AAA", priceTicker: "AAA.NS", assetType: "Equity" } as unknown as Instrument;

const data = (over: Partial<OverviewData> = {}): OverviewData => ({
  accounts: [account], balanceSnapshots: [{ id: "s1", accountId: "a1", date: "2026-08-01", balance: 300000 }], unpriced: undefined, cards: [card], statements: [statement], subscriptions: [], subscriptionPayments: [],
  loans: [loan], loanInstallments: installments, loanPrepayments: [], trades: [trade], instruments: [instrument],
  closes: new Map([["AAA.NS", [{ date: "2026-08-10", close: 1000 }, { date: "2026-11-05", close: 1500 }]]]), pricesFailed: false, fixedDeposits: [], incomeEntries: [], incomeSources: [],
  epf: { accounts: [], entries: [], rates: [], failed: false }, lent: { loans: [], repayments: [], failed: false }, goals: { goals: [], contributions: [], failed: false }, insurance: { policies: [], payments: [], failed: false },
  ...over,
});

describe("investmentsOnFrom", () => {
  const series = [{ date: "2026-08-10", value: 10000, cost: 10000, flow: 10000 }, { date: "2026-08-11", value: 10100, cost: 10000, flow: 0 }, { date: "2026-08-12", value: 9900, cost: 10000, flow: 0 }];
  it("is nothing before the first trade, then the nearest day on or before", () => {
    const on = investmentsOnFrom(series, "2026-08-12");
    expect(on("2026-08-01")).toBe(0);
    expect(on("2026-08-11")).toBe(10100);
    expect(on("2026-09-30")).toBe(9900); // later than the series ends: the last day
  });
  it("is nothing when there are no trades at all", () => {
    expect(investmentsOnFrom([], "2026-11-07")("2026-11-01")).toBe(0);
  });
});

describe("overviewModel", () => {
  it("counts investments at market value and the series ends on today's net worth", () => {
    const m = overviewModel(data(), "2026-11-07");
    expect(m.worth.investmentValueInr).toBe(15000); // 10 shares at 1,500, not the 10,000 they cost
    expect(m.worth.netWorth).toBe(300000 + 15000 - 30000 - 100000);
    expect(m.series.at(-1)?.net).toBe(m.worth.netWorth);
    expect(m.series.at(-1)?.month).toBe("2026-11");
  });
  it("leaves out months before anything was recorded and reports a change against last month", () => {
    const m = overviewModel(data(), "2026-11-07");
    expect(m.series[0].month >= "2026-08").toBe(true);
    expect(m.change.month?.from).toBe("2026-10");
  });
  it("counts investments at cost when no price could be read", () => {
    const m = overviewModel(data({ closes: new Map(), pricesFailed: true }), "2026-11-07");
    expect(m.worth.investmentValueInr).toBe(10000);
  });
});
