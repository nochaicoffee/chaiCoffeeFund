import { BalanceTrendChart } from "@/components/BalanceTrendChart";
import { RefreshButton } from "@/components/RefreshButton";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatTile } from "@/components/StatTile";
import { todayIso } from "@/lib/format/date";
import { formatInr } from "@/lib/format/money";
import { balanceTrend } from "@/lib/aggregate/accounts";
import { computeCardSummaries } from "@/lib/aggregate/cards";
import { cardName } from "@/lib/format/labels";
import { totalEstimatedFixedDepositValue } from "@/lib/aggregate/fixedDeposits";
import { totalPendingForMonth } from "@/lib/aggregate/income";
import { totalCostBasisInr } from "@/lib/aggregate/investments";
import { computeLoanSummaries, totalDueThisMonth } from "@/lib/aggregate/loans";
import { computeNetWorth } from "@/lib/aggregate/netWorth";
import { totalMonthlySubscriptionSpend } from "@/lib/aggregate/subscriptions";
import {
  getCachedAccounts,
  getCachedBalanceSnapshots,
  getCachedCards,
  getCachedFixedDeposits,
  getCachedIncomeEntries,
  getCachedInvestmentTransactions,
  getCachedLoanInstallments,
  getCachedLoans,
  getCachedStatements,
  getCachedSubscriptions,
} from "@/lib/sheets/cached";

export default async function OverviewPage() {
  const [
    accounts,
    balanceSnapshots,
    cards,
    statements,
    subscriptions,
    loans,
    loanInstallments,
    investmentTransactions,
    fixedDeposits,
    incomeEntries,
  ] = await Promise.all([
    getCachedAccounts(),
    getCachedBalanceSnapshots(),
    getCachedCards(),
    getCachedStatements(),
    getCachedSubscriptions(),
    getCachedLoans(),
    getCachedLoanInstallments(),
    getCachedInvestmentTransactions(),
    getCachedFixedDeposits(),
    getCachedIncomeEntries(),
  ]);

  const today = todayIso();
  const yearMonth = today.slice(0, 7);

  const netWorth = computeNetWorth({
    accounts,
    balanceSnapshots,
    cards,
    statements,
    loans,
    loanInstallments,
    investmentTransactions,
    fixedDeposits,
    asOfDate: today,
  });

  const cardSummaries = computeCardSummaries(cards, statements, today);
  const loanSummaries = computeLoanSummaries(loans, loanInstallments);
  const trend = balanceTrend(accounts, balanceSnapshots);

  const monthlyObligations =
    totalMonthlySubscriptionSpend(subscriptions) +
    totalDueThisMonth(loans, loanInstallments, yearMonth) +
    cardSummaries.reduce((sum, s) => sum + (s.card.status === "Active" ? s.outstandingBalance : 0), 0);

  const pendingIncomeThisMonth = totalPendingForMonth(incomeEntries, yearMonth);

  const attention: { label: string; detail: string }[] = [];
  for (const summary of cardSummaries) {
    if (summary.card.status === "Active" && summary.outstandingBalance > 0) {
      attention.push({
        label: `${cardName(summary.card)} statement due`,
        detail: `${formatInr(summary.outstandingBalance)} — next statement ~${summary.nextStatementDate}`,
      });
    }
  }
  for (const summary of loanSummaries) {
    if (summary.nextDueInstallment) {
      attention.push({
        label: `${summary.loan.name} installment #${summary.nextDueInstallment.installmentNumber}`,
        detail: `${formatInr(summary.nextDueInstallment.totalDue)} due ${summary.nextDueInstallment.dueDate}`,
      });
    }
  }
  if (pendingIncomeThisMonth > 0) {
    attention.push({
      label: "Pending income this month",
      detail: formatInr(pendingIncomeThisMonth),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader section="Overview" title="Overview" actions={<RefreshButton />} />

      <div className="rounded-lg border border-divider p-6">
        <div className="text-sm text-foreground/60">Net worth</div>
        <div className="mt-1 text-4xl font-bold">{formatInr(netWorth.netWorth)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-foreground/60 sm:grid-cols-5">
          <span>Bank {formatInr(netWorth.bankBalances)}</span>
          <span>Investments {formatInr(netWorth.investmentValueInr)}</span>
          <span>Fixed deposits {formatInr(netWorth.fixedDepositValueInr)}</span>
          <span>− Cards {formatInr(netWorth.cardOutstanding)}</span>
          <span>− Loans {formatInr(netWorth.loanOutstanding)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Cards outstanding" value={formatInr(netWorth.cardOutstanding)} tone="negative" />
        <StatTile label="Loans outstanding" value={formatInr(netWorth.loanOutstanding)} tone="negative" />
        <StatTile
          label="Subscriptions / month"
          value={formatInr(totalMonthlySubscriptionSpend(subscriptions))}
        />
        <StatTile label="Investments (cost basis)" value={formatInr(totalCostBasisInr(investmentTransactions))} />
        <StatTile
          label="Fixed deposits (est.)"
          value={formatInr(totalEstimatedFixedDepositValue(fixedDeposits, today))}
        />
        <StatTile label="Monthly obligations" value={formatInr(monthlyObligations)} tone="negative" />
      </div>

      <div className="rounded-lg border border-divider p-4">
        <div className="mb-2 text-sm font-medium">Bank balance trend</div>
        <BalanceTrendChart data={trend} />
      </div>

      <div className="rounded-lg border border-divider p-4">
        <div className="mb-2 text-sm font-medium">What needs attention</div>
        {attention.length === 0 ? (
          <div className="text-sm text-foreground/50">Nothing outstanding right now.</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {attention.map((item, index) => (
              <li key={index} className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="text-foreground/60">{item.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
