import { attentionItems as accountsAttention } from "@/app/accounts/attentionView";
import { loadAccountsData } from "@/app/accounts/loadAccountsData";
import { attentionView as fixedAttention } from "@/app/fixed-income/views";
import { loadIncomeData } from "@/app/income/loadIncomeData";
import { attentionView as incomeAttention } from "@/app/income/views";
import { loadInsuranceData } from "@/app/insurance/loadInsuranceData";
import { attentionView as insuranceAttention } from "@/app/insurance/views";
import { attentionView as lentAttention, lentModel } from "@/app/lent/views";
import { loadLoansData } from "@/app/loans/loadLoansData";
import { attentionView as loansAttention } from "@/app/loans/views";
import { latestBalances } from "@/lib/aggregate/accounts";
import { fixedIncome } from "@/lib/aggregate/fixedIncome";
import { attentionItems as goalsAttention } from "@/lib/goals/attention";
import type { OverviewModel } from "./model";
import { collectWarnings, PAGE_HREF, fromAccounts, fromCards, fromFixed, fromGoals, fromIncome, fromInsurance, fromLent, fromLoans, fromProblems, type OverviewWarning, type WarningPage } from "./warnings";

/** Runs one page's attention read; a page that fails is logged and named, never taking the list down. */
async function page<T>(name: WarningPage, read: () => T | Promise<T>, empty: T, failed: WarningPage[]): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.error(`[overview] ${name} warnings failed:`, error instanceof Error ? error.message : String(error));
    failed.push(name);
    return empty;
  }
}

/**
 * Keep in mind: every page's own attention list, put in one shape (warnings.ts). Each page's items come from its own `attentionView`, from the
 * page's own loader where the page has one, so a warning here is the one the page shows. A page that couldn't be read is named in a warning of its own.
 */
export async function loadWarnings(model: OverviewModel, today: string): Promise<OverviewWarning[]> {
  const { data } = model;
  const failed: WarningPage[] = [];
  const [loans, income, insurance, accounts] = await Promise.all([
    page("loans", async () => loansAttention((await loadLoansData({}, today)).data, today), [], failed),
    page("income", async () => incomeAttention((await loadIncomeData({}, today)).data, today), [], failed),
    page("ins", async () => (data.insurance.failed ? [] : insuranceAttention((await loadInsuranceData({}, today)).data, today)), [], failed),
    page("accounts", async () => accountsAttention((await loadAccountsData({}, today)).data), [], failed),
  ]);
  const lent = await page("lent", () => (data.lent.failed ? [] : lentAttention(lentModel({ loans: data.lent.loans, repayments: data.lent.repayments, sources: data.incomeSources, entries: data.incomeEntries }, today))), [], failed);
  const fixed = await page("fixed", () => fixedAttention(fixedIncome({ epfAccounts: data.epf.accounts, epfEntries: data.epf.entries, epfRates: data.epf.rates, deposits: data.fixedDeposits }, today), today), [], failed);
  const goals = await page(
    "goals",
    () => (data.goals.failed ? [] : goalsAttention({ goals: data.goals.goals, contributions: data.goals.contributions, accounts: data.accounts.map((a) => ({ id: a.id, name: a.name })), balances: latestBalances(data.accounts, data.balanceSnapshots) }, today)),
    [],
    failed,
  );
  const problems = fromProblems({
    epf: data.epf.failed,
    lent: data.lent.failed,
    goals: data.goals.failed,
    insurance: data.insurance.failed,
    prices: data.pricesFailed,
    unpricedAccounts: (data.unpriced?.accounts ?? []).map((a) => ({ name: a.name, reason: data.unpriced?.reason })),
  });
  const pageFailures: OverviewWarning[] = failed.map((p) => ({ id: `problem:page-${p}`, tone: "amber", page: p, text: "Its warnings couldn't be read", detail: "This page's attention list failed to load, so it is missing here until it can.", act: "Refresh", href: PAGE_HREF[p], date: null }));
  return collectWarnings(
    fromLoans(loans, today),
    fromIncome(income),
    fromLent(lent),
    fromFixed(fixed),
    fromInsurance(insurance),
    fromGoals(goals),
    fromAccounts(accounts),
    fromCards(data.cards, data.statements, today),
    problems,
    pageFailures,
  );
}
