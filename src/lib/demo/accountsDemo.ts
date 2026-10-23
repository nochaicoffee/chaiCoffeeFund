import type { AccountsData } from "../aggregate/accountFlows";
import { addMonthsUTC } from "../aggregate/recurring";
import type { Account, BalanceReview, BalanceSnapshot, Card, IncomeEntry, LoanInstallment, Statement } from "../sheets/types";

/**
 * Sample accounts from the final design (design/accounts/AccountsFinalPage.dc.html), for
 * previewing the Accounts page in development with `/accounts?demo`, before any real ones
 * exist. Every name, balance and date is made up. Never used in production (see
 * isDemoAllowed in cardsDemo.ts), and never written to the Sheet.
 */

const DEMO_ACCOUNTS: Account[] = [
  { id: "demo-hdfc", name: "HDFC Salary", bank: "HDFC Bank", accountType: "Savings", purpose: "Spending", startDate: "2019-04-01", status: "Active", color: "Sapphire", last4: "4821" },
  { id: "demo-sbi", name: "SBI Rainy Day", bank: "State Bank of India", accountType: "Savings", purpose: "Emergency-Fund", startDate: "2018-06-12", status: "Active", color: "Teal", last4: "0377" },
  { id: "demo-kotak", name: "Kotak Everyday", bank: "Kotak Mahindra Bank", accountType: "Savings", purpose: "Spending", startDate: "2021-02-03", status: "Active", color: "Ruby", last4: "9150" },
  { id: "demo-axis", name: "Axis EMI", bank: "Axis Bank", accountType: "Current", purpose: "Loan-Payments", startDate: "2022-08-20", status: "Active", color: "Copper", last4: "6602" },
  { id: "demo-icici", name: "ICICI Invest", bank: "ICICI Bank", accountType: "Savings", purpose: "Investment", startDate: "2020-11-09", status: "Active", color: "Violet", last4: "2284" },
  { id: "demo-yes", name: "YES Old Salary", bank: "YES Bank", accountType: "Savings", purpose: "Spending", startDate: "2017-01-15", status: "Inactive", color: "Onyx", last4: "7713" },
];

/** Month-end-ish balances, January to October, for each account. The day each is read on differs, as in life. */
const DEMO_BALANCES: Record<string, { day: number; values: number[] }> = {
  "demo-hdfc": { day: 30, values: [182000, 196500, 171000, 205400, 188000, 214000, 232500, 219000, 241000, 252300] },
  "demo-sbi": { day: 2, values: [610000, 610000, 625000, 625000, 640000, 640000, 655000, 655000, 660000, 660000] },
  "demo-kotak": { day: 5, values: [41000, 38500, 44200, 36000, 39800, 42100, 37500, 40600, 35200, 38900] },
  "demo-axis": { day: 1, values: [18000, 21000, 19500, 22000, 20500, 19000, 23000, 21500, 20000, 19200] },
  "demo-icici": { day: 15, values: [96000, 99500, 104000, 101000, 108500, 112000, 109000, 118000, 121500, 124000] },
};

const DEMO_CARDS: Card[] = [
  { id: "demo-millennia", name: "Millennia", alias: "Millennia", issuer: "HDFC-Bank", cardType: "Cashback", creditLimit: 150000, statementDay: 6, dueDayBuffer: 20, status: "Active", last4: "4417", color: "Teal", defaultPaidFromAccountId: "demo-hdfc" },
];

export function demoAccountsData(today: string): AccountsData {
  const year = today.slice(0, 4);
  const snapshots: BalanceSnapshot[] = [];
  for (const [accountId, { day, values }] of Object.entries(DEMO_BALANCES)) {
    values.forEach((balance, month) => {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      // The last reading is the latest one on or before today. SBI Rainy Day is left stale on purpose (the Sheet's note).
      if (date <= today && !(accountId === "demo-sbi" && date > addMonthsUTC(today, -2))) snapshots.push({ id: `${accountId}-${date}`, accountId, date, balance });
    });
  }
  snapshots.push({ id: "demo-yes-open", accountId: "demo-yes", date: `${year}-01-10`, balance: 12000 }, { id: "demo-yes-close", accountId: "demo-yes", date: `${year}-03-04`, balance: 0 });

  const statements: Statement[] = [];
  const installments: LoanInstallment[] = [];
  const incomeEntries: IncomeEntry[] = [];
  for (let month = 1; month <= 10; month++) {
    const mm = String(month).padStart(2, "0");
    const date = (day: number) => `${year}-${mm}-${String(day).padStart(2, "0")}`;
    if (date(25) <= today) {
      statements.push({ id: `demo-st-${mm}`, cardId: "demo-millennia", statementDate: date(6), dueDate: date(26), totalAmountDue: 24000 + month * 900, minimumAmountDue: 1200, status: "Paid", amountPaid: 24000 + month * 900, paidFromAccountId: "demo-hdfc", paidDate: date(25) });
    }
    if (date(5) <= today) {
      installments.push({ id: `demo-emi-${mm}`, loanId: "demo-loan", installmentNumber: month, dueDate: date(5), openingBalance: 500000, principalDue: 12000, interestDue: 4583, totalDue: 16583, status: "Paid", amountPaid: 16583, paidDate: date(5), paidFromAccountId: "demo-axis" });
    }
    if (date(28) <= today) {
      incomeEntries.push({ id: `demo-sal-${mm}`, incomeSourceId: "demo-salary", expectedDate: date(28), receivedDate: date(28), amount: 168000, status: "Received", accountId: "demo-hdfc", tag: "Regular" });
    }
  }
  const next = addMonthsUTC(`${year}-10-28`, 1);
  if (next >= today) incomeEntries.push({ id: "demo-sal-next", incomeSourceId: "demo-salary", expectedDate: today > `${year}-10-28` ? next : `${year}-10-28`, amount: 168000, status: "Pending", accountId: "demo-hdfc", tag: "Regular" });
  installments.push({ id: "demo-emi-next", loanId: "demo-loan", installmentNumber: 11, dueDate: addMonthsUTC(`${year}-10-05`, 1), openingBalance: 440000, principalDue: 12100, interestDue: 4483, totalDue: 16583, status: "Pending" });

  return {
    accounts: DEMO_ACCOUNTS,
    snapshots,
    cards: DEMO_CARDS,
    statements,
    subscriptions: [],
    subscriptionPayments: [],
    loans: [{ id: "demo-loan", name: "Personal loan", lenderName: "Axis Bank", category: "Personal", repaymentStructure: "Standard-Emi", principalAmount: 600000, annualInterestRate: 11, tenureMonths: 48, paymentFrequency: "Monthly", processingFee: 0, disbursementDate: `${year}-01-01`, accountId: "demo-axis", status: "Active" }],
    installments,
    trades: [{ id: "demo-trade", tradeDate: `${year}-05-14`, symbol: "NTAP", market: "IND", currency: "INR", tradeType: "Buy", source: "Market", quantity: 10, price: 1200, total: 12000, assetType: "Equity", broker: "Zerodha", settlementAccountId: "demo-icici" }],
    incomeSources: [{ id: "demo-salary", name: "Salary", alias: "Salary", category: "Salary", frequency: "Monthly", expectedAmount: 168000, status: "Active" }],
    incomeEntries,
  };
}

/**
 * One sample "needs attention" balance for the demo page, so the chip, card and dialog can be seen. Kept apart from
 * demoAccountsData so the figures the other demo tests read don't move.
 */
export function demoReviews(data: AccountsData, today: string): BalanceReview[] {
  const sample = data.snapshots.filter((s) => s.accountId === "demo-hdfc" && s.date <= today).sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1);
  if (!sample) return [];
  return [{ id: "demo-review", accountId: "demo-hdfc", snapshotId: sample.id, date: sample.date, recordedBalance: sample.balance, statementBalance: sample.balance - 13, messageId: "demo", status: "Open", createdAt: `${today}T00:00:00Z` }];
}
