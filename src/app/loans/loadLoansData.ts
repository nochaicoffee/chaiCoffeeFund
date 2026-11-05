import { balancesOn } from "@/lib/aggregate/accounts";
import { monthlyEquivalentIncome } from "@/lib/aggregate/income";
import { isDemoAllowed } from "@/lib/demo/cardsDemo";
import { demoLoansData } from "@/lib/demo/loansDemo";
import { cardColorKey } from "@/lib/format/colors";
import { getCachedAccounts, getCachedBalanceSnapshots, getCachedCards, getCachedIncomeSources, getCachedLoanInstallmentsTab, getCachedLoanPrepaymentsTab, getCachedLoansTab } from "@/lib/sheets/cached";
import type { SkippedRows } from "@/lib/sheets/rowReading";
import type { LoansData } from "./views";

/** The balances are only for the "can't cover this" warning, so a failed read leaves the page without it rather than without the page. */
async function loadBalanceSnapshots() {
  try {
    return await getCachedBalanceSnapshots();
  } catch (error) {
    console.error("Loans: couldn't read BalanceSnapshots, so no EMI is checked against its account's balance.", error);
    return [];
  }
}

/**
 * What the Loans page reads. With `?demo` in development it's the sample data, which never reads from or writes to
 * the Sheet; otherwise the Loans, LoanInstallments and LoanPrepayments tabs, the accounts (with what each holds) and cards EMIs are paid
 * from, and Income's salary (for the EMI load), read in parallel. `skipped` is the rows that failed validation.
 */
export async function loadLoansData(params: Record<string, string | string[] | undefined>, today: string): Promise<{ demo: boolean; data: LoansData; skipped: SkippedRows[] }> {
  const demo = isDemoAllowed() && params.demo !== undefined;
  if (demo) return { demo, data: demoLoansData(today), skipped: [] };
  const [loans, installments, prepayments, accounts, snapshots, cards, sources] = await Promise.all([getCachedLoansTab(), getCachedLoanInstallmentsTab(), getCachedLoanPrepaymentsTab(), getCachedAccounts(), loadBalanceSnapshots(), getCachedCards(), getCachedIncomeSources()]);
  const salaries = sources.filter((s) => s.category === "Salary" && s.status === "Active");
  return {
    demo,
    data: {
      loans: loans.records,
      installments: installments.records,
      prepayments: prepayments.records,
      accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
      cards: cards.map((c) => ({ id: c.id, name: c.alias || c.name, color: cardColorKey(c.color) })),
      salary: salaries.length ? salaries.reduce((t, s) => t + monthlyEquivalentIncome(s), 0) : null,
      balances: balancesOn(accounts, snapshots, today).map((h) => ({ accountId: h.account.id, balance: h.balance, date: h.date })),
    },
    skipped: [loans.skipped, installments.skipped, prepayments.skipped],
  };
}
