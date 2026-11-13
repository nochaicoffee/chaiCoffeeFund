import "server-only";
import type { z } from "zod";
import * as accountsList from "@/app/api/accounts/route";
import * as accountsItem from "@/app/api/accounts/[id]/route";
import * as balanceSnapshotsList from "@/app/api/balance-snapshots/route";
import * as balanceSnapshotsItem from "@/app/api/balance-snapshots/[id]/route";
import * as bigSpendsList from "@/app/api/big-spends/route";
import * as bigSpendsItem from "@/app/api/big-spends/[id]/route";
import * as cardsList from "@/app/api/cards/route";
import * as cardsItem from "@/app/api/cards/[id]/route";
import * as epfAccountsList from "@/app/api/epf-accounts/route";
import * as epfAccountsItem from "@/app/api/epf-accounts/[id]/route";
import * as epfEntriesList from "@/app/api/epf-entries/route";
import * as epfEntriesItem from "@/app/api/epf-entries/[id]/route";
import * as epfRatesList from "@/app/api/epf-rates/route";
import * as epfRatesItem from "@/app/api/epf-rates/[id]/route";
import * as fixedDepositsList from "@/app/api/fixed-deposits/route";
import * as fixedDepositsItem from "@/app/api/fixed-deposits/[id]/route";
import * as goalContributionsList from "@/app/api/goal-contributions/route";
import * as goalContributionsItem from "@/app/api/goal-contributions/[id]/route";
import * as goalsList from "@/app/api/goals/route";
import * as goalsItem from "@/app/api/goals/[id]/route";
import * as incomeEntriesList from "@/app/api/income-entries/route";
import * as incomeEntriesItem from "@/app/api/income-entries/[id]/route";
import * as incomeSourcesList from "@/app/api/income-sources/route";
import * as incomeSourcesItem from "@/app/api/income-sources/[id]/route";
import * as instrumentsList from "@/app/api/instruments/route";
import * as instrumentsItem from "@/app/api/instruments/[id]/route";
import * as investmentTargetsList from "@/app/api/investment-targets/route";
import * as investmentTargetsItem from "@/app/api/investment-targets/[id]/route";
import * as investmentTransactionsList from "@/app/api/investment-transactions/route";
import * as investmentTransactionsItem from "@/app/api/investment-transactions/[id]/route";
import * as lentLoansList from "@/app/api/lent-loans/route";
import * as lentLoansItem from "@/app/api/lent-loans/[id]/route";
import * as lentRepaymentsList from "@/app/api/lent-repayments/route";
import * as lentRepaymentsItem from "@/app/api/lent-repayments/[id]/route";
import * as loanInstallmentsList from "@/app/api/loan-installments/route";
import * as loanInstallmentsItem from "@/app/api/loan-installments/[id]/route";
import * as loansList from "@/app/api/loans/route";
import * as loansItem from "@/app/api/loans/[id]/route";
import * as policiesList from "@/app/api/policies/route";
import * as policiesItem from "@/app/api/policies/[id]/route";
import * as policyPaymentsList from "@/app/api/policy-payments/route";
import * as policyPaymentsItem from "@/app/api/policy-payments/[id]/route";
import * as priceSnapshotsList from "@/app/api/price-snapshots/route";
import * as priceSnapshotsItem from "@/app/api/price-snapshots/[id]/route";
import * as statementsList from "@/app/api/statements/route";
import * as statementsItem from "@/app/api/statements/[id]/route";
import * as subscriptionPaymentsList from "@/app/api/subscription-payments/route";
import * as subscriptionPaymentsItem from "@/app/api/subscription-payments/[id]/route";
import * as subscriptionsList from "@/app/api/subscriptions/route";
import * as subscriptionsItem from "@/app/api/subscriptions/[id]/route";
import * as transfersList from "@/app/api/transfers/route";
import * as transfersItem from "@/app/api/transfers/[id]/route";
import { createAccountSchema, updateAccountSchema } from "@/lib/sheets/accounts";
import { createBalanceSnapshotSchema, updateBalanceSnapshotSchema } from "@/lib/sheets/balanceSnapshots";
import { createBigSpendSchema, updateBigSpendSchema } from "@/lib/sheets/bigSpends";
import { createCardSchema, updateCardSchema } from "@/lib/sheets/cards";
import { createEpfAccountSchema, updateEpfAccountSchema } from "@/lib/sheets/epfAccounts";
import { createEpfEntrySchema, updateEpfEntrySchema } from "@/lib/sheets/epfEntries";
import { createEpfRateSchema, updateEpfRateSchema } from "@/lib/sheets/epfRates";
import { createFixedDepositSchema, updateFixedDepositSchema } from "@/lib/sheets/fixedDeposits";
import { createGoalContributionSchema, updateGoalContributionSchema } from "@/lib/sheets/goalContributions";
import { createGoalSchema, updateGoalSchema } from "@/lib/sheets/goals";
import { createIncomeEntrySchema, updateIncomeEntrySchema } from "@/lib/sheets/incomeEntries";
import { createIncomeSourceSchema, updateIncomeSourceSchema } from "@/lib/sheets/incomeSources";
import { createInstrumentSchema, updateInstrumentSchema } from "@/lib/sheets/instruments";
import { createInvestmentTargetSchema, updateInvestmentTargetSchema } from "@/lib/sheets/investmentTargets";
import { createInvestmentTransactionSchema, updateInvestmentTransactionSchema } from "@/lib/sheets/investmentTransactions";
import { createLentLoanSchema, updateLentLoanSchema } from "@/lib/sheets/lentLoans";
import { createLentRepaymentSchema, updateLentRepaymentSchema } from "@/lib/sheets/lentRepayments";
import { updateLoanInstallmentSchema } from "@/lib/sheets/loanInstallments";
import { createLoanSchema, updateLoanSchema } from "@/lib/sheets/loans";
import { createPolicySchema, updatePolicySchema } from "@/lib/sheets/policies";
import { createPolicyPaymentSchema, updatePolicyPaymentSchema } from "@/lib/sheets/policyPayments";
import { createPriceSnapshotSchema, updatePriceSnapshotSchema } from "@/lib/sheets/priceSnapshots";
import { createStatementSchema, updateStatementSchema } from "@/lib/sheets/statements";
import { createSubscriptionPaymentSchema, updateSubscriptionPaymentSchema } from "@/lib/sheets/subscriptionPayments";
import { createSubscriptionSchema, updateSubscriptionSchema } from "@/lib/sheets/subscriptions";
import { createTransferSchema, updateTransferSchema } from "@/lib/sheets/transfers";

/** A route handler's shape: what the app's own API routes export, called here in-process. */
export type ListHandler = (request: Request) => Promise<Response>;
export type ItemHandler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;

/**
 * One kind of record Claude can read and change. Writes go through the app's own API
 * routes (called in-process, not over HTTP), so the validation, the cross-row guards, the
 * cache invalidation and the removal of secrets from responses are exactly what the pages
 * get. Nothing here has its own rules.
 */
export interface McpEntity {
  /** The name Claude uses. */
  key: string;
  label: string;
  /** One sentence on what a record is, for Claude to pick the right entity. */
  about: string;
  list: ListHandler;
  /** Absent when rows are never added one at a time (loan installments come with their loan). */
  create?: ListHandler;
  createSchema?: z.ZodType;
  update?: ItemHandler;
  updateSchema?: z.ZodType;
}

interface ListModule {
  GET: ListHandler;
  POST?: ListHandler;
}
interface ItemModule {
  PATCH: ItemHandler;
}

function entity(
  key: string,
  label: string,
  about: string,
  list: ListModule,
  item: ItemModule,
  createSchema: z.ZodType | undefined,
  updateSchema: z.ZodType,
): McpEntity {
  return {
    key,
    label,
    about,
    list: list.GET,
    create: list.POST,
    createSchema: list.POST ? createSchema : undefined,
    update: item.PATCH,
    updateSchema,
  };
}

/**
 * Every record type with an API route, except the ones nothing should write by hand: the sync
 * logs, the email logs and balance reviews are written only by the Gmail syncs. Deleting is
 * left out on purpose: Claude adds and corrects, and a row is removed in the app.
 */
export const MCP_ENTITIES: McpEntity[] = [
  entity("accounts", "Accounts", "A bank or brokerage account (savings, current or brokerage) with its purpose, start date and status. Its balances over time are balance_snapshots.", accountsList, accountsItem, createAccountSchema, updateAccountSchema),
  entity("balance_snapshots", "Balance snapshots", "An account's balance on one day. The newest one is its current balance.", balanceSnapshotsList, balanceSnapshotsItem, createBalanceSnapshotSchema, updateBalanceSnapshotSchema),
  entity("cards", "Credit cards", "A credit card: issuer, type, credit limit, statement day and the days from statement to due date.", cardsList, cardsItem, createCardSchema, updateCardSchema),
  entity("statements", "Card statements", "One billing statement of a credit card: statement and due dates, total and minimum due, and whether it is paid.", statementsList, statementsItem, createStatementSchema, updateStatementSchema),
  entity("big_spends", "Big spends", "A large one-off purchase worth tracking apart from everyday spending.", bigSpendsList, bigSpendsItem, createBigSpendSchema, updateBigSpendSchema),
  entity("subscriptions", "Subscriptions", "A recurring service (name, cost, billing cycle, renewal date).", subscriptionsList, subscriptionsItem, createSubscriptionSchema, updateSubscriptionSchema),
  entity("subscription_payments", "Subscription payments", "One renewal of a subscription: its date, amount and whether it was paid, skipped or is pending.", subscriptionPaymentsList, subscriptionPaymentsItem, createSubscriptionPaymentSchema, updateSubscriptionPaymentSchema),
  entity("income_sources", "Income sources", "Where money comes from (salary, dividends, rent): its schedule and where it usually lands.", incomeSourcesList, incomeSourcesItem, createIncomeSourceSchema, updateIncomeSourceSchema),
  entity("income_entries", "Income entries", "Money received from an income source on a day.", incomeEntriesList, incomeEntriesItem, createIncomeEntrySchema, updateIncomeEntrySchema),
  entity("loans", "Loans", "A loan taken from a bank. Adding one also builds its instalment schedule.", loansList, loansItem, createLoanSchema, updateLoanSchema),
  entity("loan_installments", "Loan installments", "One scheduled instalment of a loan. Made with the loan, so these can be read and updated (for example marked paid), not added.", { GET: loanInstallmentsList.GET }, loanInstallmentsItem, undefined, updateLoanInstallmentSchema),
  entity("lent_loans", "Lent out", "Money lent to a friend or someone else, to be repaid.", lentLoansList, lentLoansItem, createLentLoanSchema, updateLentLoanSchema),
  entity("lent_repayments", "Lent-out repayments", "One repayment received against money lent out.", lentRepaymentsList, lentRepaymentsItem, createLentRepaymentSchema, updateLentRepaymentSchema),
  entity("fixed_deposits", "Fixed deposits", "A fixed or recurring deposit at a bank.", fixedDepositsList, fixedDepositsItem, createFixedDepositSchema, updateFixedDepositSchema),
  entity("instruments", "Investment instruments", "A stock, fund or other holding that can be traded: symbol, market, asset type and price ticker.", instrumentsList, instrumentsItem, createInstrumentSchema, updateInstrumentSchema),
  entity("investment_transactions", "Investment transactions", "One buy, sell, vest or similar trade of an instrument.", investmentTransactionsList, investmentTransactionsItem, createInvestmentTransactionSchema, updateInvestmentTransactionSchema),
  entity("investment_targets", "Investment targets", "A target share, as a percent, of what is held for an asset group.", investmentTargetsList, investmentTargetsItem, createInvestmentTargetSchema, updateInvestmentTargetSchema),
  entity("price_snapshots", "Price snapshots", "An instrument's price on a day.", priceSnapshotsList, priceSnapshotsItem, createPriceSnapshotSchema, updatePriceSnapshotSchema),
  entity("transfers", "Transfers", "Money moved between the user's own accounts, including to a brokerage.", transfersList, transfersItem, createTransferSchema, updateTransferSchema),
  entity("epf_accounts", "EPF accounts", "A provident fund account.", epfAccountsList, epfAccountsItem, createEpfAccountSchema, updateEpfAccountSchema),
  entity("epf_entries", "EPF entries", "One contribution, interest credit or withdrawal in a provident fund account.", epfEntriesList, epfEntriesItem, createEpfEntrySchema, updateEpfEntrySchema),
  entity("epf_rates", "EPF rates", "The interest rate declared for a provident fund year.", epfRatesList, epfRatesItem, createEpfRateSchema, updateEpfRateSchema),
  entity("policies", "Insurance policies", "An insurance policy: insurer, cover, premium and renewal.", policiesList, policiesItem, createPolicySchema, updatePolicySchema),
  entity("policy_payments", "Policy payments", "One premium term of an insurance policy.", policyPaymentsList, policyPaymentsItem, createPolicyPaymentSchema, updatePolicyPaymentSchema),
  entity("goals", "Goals", "Something being saved for: a target amount and date.", goalsList, goalsItem, createGoalSchema, updateGoalSchema),
  entity("goal_contributions", "Goal contributions", "Money put towards a goal on a day.", goalContributionsList, goalContributionsItem, createGoalContributionSchema, updateGoalContributionSchema),
];

export function findEntity(key: string): McpEntity | undefined {
  return MCP_ENTITIES.find((candidate) => candidate.key === key);
}
