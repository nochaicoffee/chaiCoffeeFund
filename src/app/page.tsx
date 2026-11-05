import { BalanceTrendChart } from "@/components/BalanceTrendChart";
import { RefreshButton } from "@/components/RefreshButton";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatTile } from "@/components/StatTile";
import { todayIso } from "@/lib/format/date";
import { rupeeBalances, unpricedForPage } from "@/lib/prices/rupeeBalances";
import { formatInr, formatUsd } from "@/lib/format/money";
import { balanceTrend, latestBalances } from "@/lib/aggregate/accounts";
import { computeCardSummaries } from "@/lib/aggregate/cards";
import { cardName } from "@/lib/format/labels";
import { totalEstimatedFixedDepositValue } from "@/lib/aggregate/fixedDeposits";
import { pendingPayments, sumAmounts } from "@/lib/aggregate/incomeSchedule";
import { totalCostBasisInr } from "@/lib/aggregate/investments";
import { attentionItems } from "@/lib/goals/attention";
import { computeLoanSummaries } from "@/lib/aggregate/loans";
import { computeNetWorth } from "@/lib/aggregate/netWorth";
import { monthlyObligations } from "@/lib/aggregate/obligations";
import { totalMonthlySubscriptionSpend } from "@/lib/aggregate/subscriptions";
import {
  getCachedAccounts,
  getCachedBalanceSnapshots,
  getCachedCards,
  getCachedFixedDeposits,
  getCachedGoalContributions,
  getCachedGoals,
  getCachedIncomeEntries,
  getCachedIncomeSources,
  getCachedInvestmentTransactions,
  getCachedLoanInstallments,
  getCachedLoans,
  getCachedStatements,
  getCachedSubscriptions,
} from "@/lib/sheets/cached";

export default async function OverviewPage() {
  const [
    allAccounts,
    allBalanceSnapshots,
    cards,
    statements,
    subscriptions,
    loans,
    loanInstallments,
    investmentTransactions,
    fixedDeposits,
    incomeEntries,
    incomeSources,
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
    getCachedIncomeSources(),
  ]);

  // Dollar accounts are counted in rupees at today's rate, once (ADR 0012); with no rate they are left out and flagged below.
  const rupee = await rupeeBalances(allAccounts, allBalanceSnapshots);
  const { accounts, snapshots: balanceSnapshots } = rupee;
  const unpriced = unpricedForPage(rupee);

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

  const monthlyObligationsTotal = monthlyObligations({ subscriptions, cards, loans, loanInstallments, cardSummaries, yearMonth });

  // Pending income is computed from each source's schedule, never stored (PRD §8).
  const pendingIncome = pendingPayments(incomeSources, incomeEntries, today);

  const attention: { label: string; detail: string }[] = [];
  for (const account of unpriced?.accounts ?? []) {
    attention.push({ label: `${account.name} isn't counted`, detail: `${account.dollars === null ? "Its dollars" : formatUsd(account.dollars)} can't be turned into rupees: ${unpriced?.reason}. Net worth leaves it out until the rate is back.` });
  }
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
  for (const source of incomeSources) {
    const pending = pendingIncome.filter((p) => p.sourceId === source.id);
    if (pending.length === 0) continue;
    attention.push({
      label: `${source.alias || source.name} not received`,
      detail: `${formatInr(sumAmounts(pending))} — ${pending.length === 1 ? "expected" : `${pending.length} payments, the first expected`} ${pending[0].expectedDate}`,
    });
  }

  // Goals join the list only for a Fixed date at risk, a date that has passed, or an account that can't cover its earmarks (F-GO-05).
  // A problem reading Goals is logged and mustn't take Overview down with it.
  const goalsAttention = await Promise.all([getCachedGoals(), getCachedGoalContributions()])
    .then(([goals, contributions]) => attentionItems({ goals, contributions, accounts: accounts.map((a) => ({ id: a.id, name: a.name })), balances: latestBalances(accounts, balanceSnapshots) }, today))
    .catch((error) => {
      console.error("[overview] goals failed:", error instanceof Error ? error.message : String(error));
      return [];
    });
  for (const item of goalsAttention) attention.push({ label: item.label, detail: item.detail });

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
        <StatTile label="Monthly obligations" value={formatInr(monthlyObligationsTotal)} tone="negative" />
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
