import { NextResponse } from "next/server";
import { handleRouteErrors } from "@/lib/api/createCrudRoutes";
import { getSheetsClient, getSpreadsheetId } from "@/lib/sheets/client";
import { ACCOUNT_COLUMNS, accountRowSchema } from "@/lib/sheets/accounts";
import { CARD_COLUMNS, cardRowSchema } from "@/lib/sheets/cards";
import { INCOME_ENTRY_COLUMNS, incomeEntryRowSchema } from "@/lib/sheets/incomeEntries";
import { INCOME_SOURCE_COLUMNS, incomeSourceRowSchema } from "@/lib/sheets/incomeSources";
import { SUBSCRIPTION_PAYMENT_COLUMNS, subscriptionPaymentRowSchema } from "@/lib/sheets/subscriptionPayments";
import { SUBSCRIPTION_COLUMNS, subscriptionRowSchema } from "@/lib/sheets/subscriptions";
import { columnSpecs, planTableColumns } from "@/lib/sheets/tableColumns";

/** The tabs this can bring in line with their repository. Add one here when its columns change. */
const TABS = {
  Cards: () => columnSpecs(CARD_COLUMNS as string[], cardRowSchema),
  Accounts: () => columnSpecs(ACCOUNT_COLUMNS as string[], accountRowSchema),
  Subscriptions: () => columnSpecs(SUBSCRIPTION_COLUMNS as string[], subscriptionRowSchema),
  SubscriptionPayments: () => columnSpecs(SUBSCRIPTION_PAYMENT_COLUMNS as string[], subscriptionPaymentRowSchema),
  IncomeSources: () => columnSpecs(INCOME_SOURCE_COLUMNS as string[], incomeSourceRowSchema),
  IncomeEntries: () => columnSpecs(INCOME_ENTRY_COLUMNS as string[], incomeEntryRowSchema),
};

type Plan = { error: string } | ({ tab: string; spreadsheetId: string; table: { rows: number; columns: string[] } } & ReturnType<typeof planTableColumns>);

async function plan(request: Request): Promise<Plan> {
  const tab = new URL(request.url).searchParams.get("tab") ?? "";
  if (!Object.hasOwn(TABS, tab)) return { error: `Unknown tab "${tab}". It can change: ${Object.keys(TABS).join(", ")}` };
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const { data } = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets(properties(title),tables)" });
  const table = data.sheets?.find((s) => s.properties?.title === tab)?.tables?.[0];
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
    return NextResponse.json({ tab: result.tab, table: result.table, changes: result.changes, refused: result.refused ?? null, wouldSend: result.request ?? null });
  });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  return handleRouteErrors(async () => {
    const result = await plan(request);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    if (result.refused) return NextResponse.json({ refused: result.refused }, { status: 409 });
    if (!result.request) return NextResponse.json({ tab: result.tab, changes: [], applied: false });
    await getSheetsClient().spreadsheets.batchUpdate({ spreadsheetId: result.spreadsheetId, requestBody: { requests: [result.request] } });
    return NextResponse.json({ tab: result.tab, changes: result.changes, applied: true });
  });
}
