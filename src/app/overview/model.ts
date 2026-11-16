import { computeNetWorth, type NetWorthBreakdown } from "@/lib/aggregate/netWorth";
import { investmentOverview, type Overview } from "@/lib/aggregate/investmentOverview";
import { worthChange, worthSeries, type WorthChange, type WorthInputs, type WorthSeriesPoint } from "@/lib/aggregate/netWorthOn";
import { lastDayOfMonth } from "@/lib/aggregate/accounts";
import { monthOf, type MonthKey } from "@/lib/aggregate/cardSpend";
import type { PricePoint } from "@/lib/prices/history";
import type { AccountsData } from "@/lib/aggregate/accountFlows";
import type {
  Account, BalanceSnapshot, Card, EpfAccount, EpfEntry, EpfRate, FixedDeposit, Goal, GoalContribution, IncomeEntry, IncomeSource, Instrument,
  InvestmentTransaction, LentLoan, LentRepayment, Loan, LoanInstallment, LoanPrepayment, Policy, PolicyPayment, Statement, Subscription, SubscriptionPayment,
} from "@/lib/sheets/types";

/** Everything the Overview reads (loadOverviewData.ts), as plain records, so every view below is a pure function of it. A source that couldn't be read is empty with `failed` set. */
export interface OverviewData {
  accounts: Account[];
  balanceSnapshots: BalanceSnapshot[];
  /** Dollar accounts left out of the rupee figures because no rate could be had (ADR 0012). */
  unpriced: AccountsData["unpriced"];
  cards: Card[];
  statements: Statement[];
  subscriptions: Subscription[];
  subscriptionPayments: SubscriptionPayment[];
  loans: Loan[];
  loanInstallments: LoanInstallment[];
  loanPrepayments: LoanPrepayment[];
  trades: InvestmentTransaction[];
  instruments: Instrument[];
  closes: ReadonlyMap<string, PricePoint[]>;
  pricesFailed: boolean;
  fixedDeposits: FixedDeposit[];
  incomeEntries: IncomeEntry[];
  incomeSources: IncomeSource[];
  epf: { accounts: EpfAccount[]; entries: EpfEntry[]; rates: EpfRate[]; failed: boolean };
  lent: { loans: LentLoan[]; repayments: LentRepayment[]; failed: boolean };
  goals: { goals: Goal[]; contributions: GoalContribution[]; failed: boolean };
  insurance: { policies: Policy[]; payments: PolicyPayment[]; failed: boolean };
}

/** The numbers every part of the Overview reads, worked out once. */
export interface OverviewModel {
  today: string;
  data: OverviewData;
  /** The Investments page's own working: holdings at market value (cost where unpriced). */
  investments: Overview;
  /** Net worth now and its parts, with investments at market value. */
  worth: NetWorthBreakdown;
  /** Net worth at each of the last 13 month-ends, the last being today. Months with nothing recorded are left out. */
  series: WorthSeriesPoint[];
  change: WorthChange;
  /** The inputs the past-date functions take, kept so a view can ask about a date. */
  worthInputs: WorthInputs;
  /**
   * The period the page follows (docs/design/overview.md, MzB), when it was given one: its months up to today, whether it runs to today, and
   * how net worth moved over it, against the month-end before it began (or the first month the series has). Null on the default series.
   */
  range: { months: MonthKey[]; includesToday: boolean; change: { from: string; amount: number; fraction: number | null } | null } | null;
}

/** What the holdings were worth on a day, from the Investments page's own daily series: nothing before his first trade, the nearest earlier day after it. */
export function investmentsOnFrom(series: Overview["series"], today: string): (date: string) => number | null {
  return (date) => {
    if (series.length === 0 || date < series[0].date) return 0;
    const day = date > today ? today : date;
    let found = series[0];
    for (const point of series) {
      if (point.date > day) break;
      found = point;
    }
    return found.value;
  };
}

/**
 * With `rangeMonths` the series covers those months, plus the month-end before them as the base to measure the change from, and ends at the
 * range's last month-end (today when the range runs to this month). Without it, the last 13 month-ends, as before.
 */
export function overviewModel(data: OverviewData, today: string, rangeMonths?: MonthKey[]): OverviewModel {
  const investments = investmentOverview({ trades: data.trades, instruments: data.instruments, closes: data.closes, today });
  const worth = computeNetWorth({
    accounts: data.accounts,
    balanceSnapshots: data.balanceSnapshots,
    cards: data.cards,
    statements: data.statements,
    loans: data.loans,
    loanInstallments: data.loanInstallments,
    investmentTransactions: data.trades,
    investmentValueInr: investments.valueInr,
    fixedDeposits: data.fixedDeposits,
    epfEntries: data.epf.entries,
    lentLoans: data.lent.loans,
    lentRepayments: data.lent.repayments,
    asOfDate: today,
  });
  const worthInputs: WorthInputs = {
    accounts: data.accounts,
    balanceSnapshots: data.balanceSnapshots,
    cards: data.cards,
    statements: data.statements,
    loans: data.loans,
    loanInstallments: data.loanInstallments,
    loanPrepayments: data.loanPrepayments,
    fixedDeposits: data.fixedDeposits,
    epfEntries: data.epf.entries,
    lentLoans: data.lent.loans,
    lentRepayments: data.lent.repayments,
    investmentsOn: investmentsOnFrom(investments.series, today),
  };
  // The last point is today, and must be the figure the page headlines (computeNetWorth), so "the change on last month" is against the number shown.
  const months = rangeMonths && rangeMonths.length > 0 ? rangeMonths : null;
  const includesToday = !months || months[months.length - 1] === monthOf(today);
  const asOf = includesToday ? today : lastDayOfMonth(months![months!.length - 1]);
  const rebuilt = worthSeries(worthInputs, asOf, months ? months.length + 1 : 13);
  const series = rebuilt.map((p, i) => (includesToday && i === rebuilt.length - 1 && p.month === today.slice(0, 7) ? { ...p, net: worth.netWorth, owed: worth.cardOutstanding + worth.loanOutstanding, owned: worth.netWorth + worth.cardOutstanding + worth.loanOutstanding } : p));
  const first = series[0];
  const last = series[series.length - 1];
  const range = months ? { months, includesToday, change: series.length >= 2 ? { from: first.month, amount: last.net - first.net, fraction: first.net > 0 ? (last.net - first.net) / first.net : null } : null } : null;
  return { today, data, investments, worth, series, change: worthChange(series), worthInputs, range };
}
