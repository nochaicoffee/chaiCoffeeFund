import { NextResponse } from "next/server";
import type { sheets_v4 } from "googleapis";
import { handleRouteErrors } from "@/lib/api/createCrudRoutes";
import { getSheetsClient, getSpreadsheetId } from "@/lib/sheets/client";
import { ACCOUNT_COLUMNS, accountRowSchema } from "@/lib/sheets/accounts";
import { ACCOUNT_STATEMENT_EMAIL_COLUMNS, accountStatementEmailRowSchema } from "@/lib/sheets/accountStatementEmails";
import { BALANCE_REVIEW_COLUMNS, balanceReviewRowSchema } from "@/lib/sheets/balanceReviews";
import { BALANCE_SNAPSHOT_COLUMNS, balanceSnapshotRowSchema } from "@/lib/sheets/balanceSnapshots";
import { CARD_COLUMNS, cardRowSchema } from "@/lib/sheets/cards";
import { FIXED_DEPOSIT_COLUMNS, fixedDepositRowSchema } from "@/lib/sheets/fixedDeposits";
import { INVESTMENT_TRANSACTION_COLUMNS, investmentTransactionRowSchema } from "@/lib/sheets/investmentTransactions";
import { INCOME_ENTRY_COLUMNS, incomeEntryRowSchema } from "@/lib/sheets/incomeEntries";
import { INCOME_SOURCE_COLUMNS, incomeSourceRowSchema } from "@/lib/sheets/incomeSources";
import { LOAN_COLUMNS, loanRowSchema } from "@/lib/sheets/loans";
import { LOAN_INSTALLMENT_COLUMNS, loanInstallmentRowSchema } from "@/lib/sheets/loanInstallments";
import { LOAN_PREPAYMENT_COLUMNS, loanPrepaymentRowSchema } from "@/lib/sheets/loanPrepayments";
import { POLICY_COLUMNS, policyRowSchema } from "@/lib/sheets/policies";
import { POLICY_PAYMENT_COLUMNS, policyPaymentRowSchema } from "@/lib/sheets/policyPayments";
import { SYNC_RUN_COLUMNS, syncRunRowSchema } from "@/lib/sheets/syncRuns";
import { SUBSCRIPTION_PAYMENT_COLUMNS, subscriptionPaymentRowSchema } from "@/lib/sheets/subscriptionPayments";
import { SUBSCRIPTION_COLUMNS, subscriptionRowSchema } from "@/lib/sheets/subscriptions";
import { columnSpecs, planNewTable, planTableColumns } from "@/lib/sheets/tableColumns";

/** The tabs this can bring in line with their repository. Add one here when its columns change. */
const TABS = {
  Cards: () => columnSpecs(CARD_COLUMNS as string[], cardRowSchema),
  Accounts: () => columnSpecs(ACCOUNT_COLUMNS as string[], accountRowSchema),
  AccountStatementEmails: () => columnSpecs(ACCOUNT_STATEMENT_EMAIL_COLUMNS as string[], accountStatementEmailRowSchema),
  BalanceReviews: () => columnSpecs(BALANCE_REVIEW_COLUMNS as string[], balanceReviewRowSchema),
  BalanceSnapshots: () => columnSpecs(BALANCE_SNAPSHOT_COLUMNS as string[], balanceSnapshotRowSchema),
  SyncRuns: () => columnSpecs(SYNC_RUN_COLUMNS as string[], syncRunRowSchema),
  Subscriptions: () => columnSpecs(SUBSCRIPTION_COLUMNS as string[], subscriptionRowSchema),
  SubscriptionPayments: () => columnSpecs(SUBSCRIPTION_PAYMENT_COLUMNS as string[], subscriptionPaymentRowSchema),
  IncomeSources: () => columnSpecs(INCOME_SOURCE_COLUMNS as string[], incomeSourceRowSchema),
  IncomeEntries: () => columnSpecs(INCOME_ENTRY_COLUMNS as string[], incomeEntryRowSchema),
  Loans: () => columnSpecs(LOAN_COLUMNS as string[], loanRowSchema),
  LoanInstallments: () => columnSpecs(LOAN_INSTALLMENT_COLUMNS as string[], loanInstallmentRowSchema),
  LoanPrepayments: () => columnSpecs(LOAN_PREPAYMENT_COLUMNS as string[], loanPrepaymentRowSchema),
  InvestmentTransactions: () => columnSpecs(INVESTMENT_TRANSACTION_COLUMNS as string[], investmentTransactionRowSchema),
  FixedDeposits: () => columnSpecs(FIXED_DEPOSIT_COLUMNS as string[], fixedDepositRowSchema),
  Policies: () => columnSpecs(POLICY_COLUMNS as string[], policyRowSchema),
  PolicyPayments: () => columnSpecs(POLICY_PAYMENT_COLUMNS as string[], policyPaymentRowSchema),
};

/** Tabs the code needs that may not exist yet: the route creates them, with their Table, when they're missing. Existing tabs are never created over. */
const CREATABLE = new Set(["AccountStatementEmails", "BalanceReviews", "LoanPrepayments", "Policies", "PolicyPayments"]);

type Plan =
  | { error: string }
  | { tab: string; spreadsheetId: string; creating: { changes: string[]; requests: sheets_v4.Schema$Request[] } }
  | ({ tab: string; spreadsheetId: string; table: { rows: number; columns: string[] } } & ReturnType<typeof planTableColumns>);

async function plan(request: Request): Promise<Plan> {
  const tab = new URL(request.url).searchParams.get("tab") ?? "";
  if (!Object.hasOwn(TABS, tab)) return { error: `Unknown tab "${tab}". It can change: ${Object.keys(TABS).join(", ")}` };
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const { data } = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets(properties(title),tables)" });
  const existing = data.sheets?.find((s) => s.properties?.title === tab);
  if (!existing && CREATABLE.has(tab)) {
    // A random id, so it can't meet one the Sheet already uses.
    const sheetId = 1_000_000_000 + Math.floor(Math.random() * 1_000_000_000);
    return { tab, spreadsheetId, creating: planNewTable(tab, TABS[tab as keyof typeof TABS](), sheetId) };
  }
  const table = existing?.tables?.[0];
  if (!table) return { error: `The ${tab} tab has no Table` };
  const range = table.range ?? {};
  const columns = (table.columnProperties ?? []).map((c) => c.columnName ?? "");
  return { tab, spreadsheetId, table: { rows: (range.endRowIndex ?? 0) - (range.startRowIndex ?? 0), columns }, ...planTableColumns(TABS[tab as keyof typeof TABS](), table) };
}

/**
 * Dev only (a 404 anywhere but `next dev`): bringing a tab's Table in line with its
 * repository through the Sheets API (lib/sheets/tableColumns.ts). GET shows the Table
 * (its row count, header included, and columns) and what would change; POST makes the
 * change. Only adds columns and sets dropdowns; see tableColumns.ts.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  return handleRouteErrors(async () => {
    const result = await plan(request);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    if ("creating" in result) return NextResponse.json({ tab: result.tab, changes: result.creating.changes, wouldSend: result.creating.requests });
    return NextResponse.json({ tab: result.tab, table: result.table, changes: result.changes, refused: result.refused ?? null, wouldSend: result.request ?? null });
  });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  return handleRouteErrors(async () => {
    const result = await plan(request);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    if ("creating" in result) {
      await getSheetsClient().spreadsheets.batchUpdate({ spreadsheetId: result.spreadsheetId, requestBody: { requests: result.creating.requests } });
      return NextResponse.json({ tab: result.tab, changes: result.creating.changes, applied: true });
    }
    if (result.refused) return NextResponse.json({ refused: result.refused }, { status: 409 });
    if (!result.request) return NextResponse.json({ tab: result.tab, changes: [], applied: false });
    await getSheetsClient().spreadsheets.batchUpdate({ spreadsheetId: result.spreadsheetId, requestBody: { requests: [result.request] } });
    return NextResponse.json({ tab: result.tab, changes: result.changes, applied: true });
  });
}
