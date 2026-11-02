import { computeAccountBalances } from "@/lib/aggregate/accounts";
import { computeCardSummaries } from "@/lib/aggregate/cards";
import { totalMonthlyEquivalentIncome } from "@/lib/aggregate/income";
import { monthlyObligations } from "@/lib/aggregate/obligations";
import { cardColorKey } from "@/lib/format/colors";
import { isDemoAllowed } from "@/lib/demo/cardsDemo";
import { DEMO_VARIANTS, demoGoalsData } from "@/lib/demo/goalsDemo";
import { getCachedAccounts, getCachedBalanceSnapshots, getCachedCards, getCachedGoalContributionsTab, getCachedGoalsTab, getCachedIncomeSources, getCachedLoanInstallments, getCachedLoans, getCachedStatements, getCachedSubscriptions } from "@/lib/sheets/cached";
import type { SkippedRows } from "@/lib/sheets/rowReading";
import type { GoalsPageData } from "./views";

/**
 * What the Goals page reads. With `?demo` in development it's the sample data (`?demo=overdue` and the other states are listed in goalsDemo.ts),
 * which never reads from or writes to the Sheet; otherwise the Goals and GoalContributions tabs, with the accounts and their latest balances
 * (for the earmark check) and the figures behind "income less obligations" (Overview's), read in parallel. `demo` is the variant's text, or null
 * for real data. `skipped` is the rows that failed validation.
 */
export async function loadGoalsData(params: Record<string, string | string[] | undefined>, today: string): Promise<{ demo: string | null; data: GoalsPageData; skipped: SkippedRows[] }> {
  if (isDemoAllowed() && params.demo !== undefined) {
    const asked = typeof params.demo === "string" ? params.demo : "";
    const variant = DEMO_VARIANTS.find((v) => v === asked) ?? "";
    return { demo: variant, data: demoGoalsData(today, variant), skipped: [] };
  }
  const [goals, contributions, accounts, snapshots, cards, statements, subscriptions, loans, installments, sources] = await Promise.all([
    getCachedGoalsTab(),
    getCachedGoalContributionsTab(),
    getCachedAccounts(),
    getCachedBalanceSnapshots(),
    getCachedCards(),
    getCachedStatements(),
    getCachedSubscriptions(),
    getCachedLoans(),
    getCachedLoanInstallments(),
    getCachedIncomeSources(),
  ]);
  const balances: Record<string, number> = {};
  for (const b of computeAccountBalances(accounts, snapshots)) if (b.latestBalance !== null) balances[b.account.id] = b.latestBalance;
  return {
    demo: null,
    data: {
      goals: goals.records,
      contributions: contributions.records,
      accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
      cards: cards.map((c) => ({ id: c.id, name: c.alias || c.name, color: cardColorKey(c.color) })),
      balances,
      income: totalMonthlyEquivalentIncome(sources),
      obligations: monthlyObligations({ subscriptions, cards, loans, loanInstallments: installments, cardSummaries: computeCardSummaries(cards, statements, today), yearMonth: today.slice(0, 7) }),
    },
    skipped: [goals.skipped, contributions.skipped],
  };
}
