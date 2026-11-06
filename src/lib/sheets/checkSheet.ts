import "server-only";
import { getSheetsClient, getSpreadsheetId } from "./client";
import { compareSpreadsheet, type TabCheck } from "./tableStructure";
import { accountsRepository } from "./accounts";
import { balanceSnapshotsRepository } from "./balanceSnapshots";
import { cardsRepository } from "./cards";
import { statementsRepository } from "./statements";
import { subscriptionsRepository } from "./subscriptions";
import { subscriptionPaymentsRepository } from "./subscriptionPayments";
import { incomeSourcesRepository } from "./incomeSources";
import { incomeEntriesRepository } from "./incomeEntries";
import { loansRepository } from "./loans";
import { loanInstallmentsRepository } from "./loanInstallments";
import { loanPrepaymentsRepository } from "./loanPrepayments";
import { policiesRepository } from "./policies";
import { policyPaymentsRepository } from "./policyPayments";
import { goalsRepository } from "./goals";
import { goalContributionsRepository } from "./goalContributions";
import { investmentTransactionsRepository } from "./investmentTransactions";
import { fixedDepositsRepository } from "./fixedDeposits";
import { epfAccountsRepository } from "./epfAccounts";
import { epfEntriesRepository } from "./epfEntries";
import { epfRatesRepository } from "./epfRates";
import { statementEmailsRepository } from "./statementEmails";
import { syncRunsRepository } from "./syncRuns";
import { accountStatementEmailsRepository } from "./accountStatementEmails";
import { balanceReviewsRepository } from "./balanceReviews";
import { lentLoansRepository } from "./lentLoans";
import { lentRepaymentsRepository } from "./lentRepayments";
import { instrumentsRepository } from "./instruments";
import { priceSnapshotsRepository } from "./priceSnapshots";

/** Every repository, in the Sheet's tab order. A new entity's repository goes here too (entities.test.ts checks). */
export const checkedRepositories = [
  accountsRepository,
  balanceSnapshotsRepository,
  cardsRepository,
  statementsRepository,
  subscriptionsRepository,
  subscriptionPaymentsRepository,
  incomeSourcesRepository,
  incomeEntriesRepository,
  loansRepository,
  loanInstallmentsRepository,
  loanPrepaymentsRepository,
  policiesRepository,
  policyPaymentsRepository,
  goalsRepository,
  goalContributionsRepository,
  investmentTransactionsRepository,
  fixedDepositsRepository,
  epfAccountsRepository,
  epfEntriesRepository,
  epfRatesRepository,
  statementEmailsRepository,
  syncRunsRepository,
  accountStatementEmailsRepository,
  balanceReviewsRepository,
  lentLoansRepository,
  lentRepaymentsRepository,
  instrumentsRepository,
  priceSnapshotsRepository,
];

export interface SheetCheck {
  /** True when every tab matches the code. */
  ok: boolean;
  tabs: TabCheck[];
  /** The Sheet's tabs no repository reads. Not a problem on their own (the Prices tab is one). */
  otherTabs: string[];
}

/**
 * Compares the real Sheet's Tables with every repository (tableStructure.ts).
 * One metadata read, which asks only for tab titles and Table structure: no
 * cell values, so nothing it returns can hold a password or an amount.
 */
export async function checkSheet(): Promise<SheetCheck> {
  const res = await getSheetsClient().spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: "sheets(properties(title),tables(range,columnProperties))",
  });
  const result = compareSpreadsheet(checkedRepositories, res.data.sheets ?? []);
  return { ok: result.tabs.every((tab) => tab.problems.length === 0), ...result };
}
