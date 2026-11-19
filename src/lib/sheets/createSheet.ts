import "server-only";
import { checkedRepositories } from "./checkSheet";
import { getSheetsClient, getSpreadsheetId } from "./client";
import { planMissingTabs, type SheetPlan } from "./tableColumns";

/** What `createMissingTabs` did. */
export interface CreateSheetResult {
  /** The tabs it made, each with its Table, typed columns and dropdowns. */
  created: string[];
  /** The tabs that were already there, left exactly as they were. */
  existing: string[];
  /** Whether it removed the empty "Sheet1" tab a new spreadsheet starts with. */
  removedDefaultTab: boolean;
}

/**
 * Builds every tab the app reads, with its Table, headers, column types and dropdowns, in the
 * Sheet that GOOGLE_SHEETS_SPREADSHEET_ID names (tableColumns.ts `planMissingTabs`). It only ever
 * adds: a tab that's already there is not touched, so it is safe to run again on a Sheet that's
 * part built. All tabs go in one batch, so a refusal leaves the Sheet as it was.
 *
 * The one thing it removes is the new spreadsheet's own empty first tab ("Sheet1", or its name in
 * the account's language), and only when that is the single tab before it starts and holds nothing.
 */
export async function createMissingTabs(): Promise<CreateSheetResult> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const { data } = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets(properties(sheetId,title))" });
  const tabs = data.sheets ?? [];
  const highestId = tabs.reduce((highest, tab) => Math.max(highest, tab.properties?.sheetId ?? 0), 0);
  const plan: SheetPlan = planMissingTabs(checkedRepositories, tabs.map((tab) => tab.properties?.title ?? ""), highestId + 1);
  if (plan.requests.length === 0) return { created: [], existing: plan.existing, removedDefaultTab: false };

  const requests = [...plan.requests];
  let removedDefaultTab = false;
  const onlyTab = tabs.length === 1 ? tabs[0].properties : undefined;
  if (onlyTab && typeof onlyTab.sheetId === "number" && onlyTab.title) {
    // Only an empty one goes: a first tab with anything in it is the person's own. Quoted, since a title may have spaces ("Hoja 1").
    const held = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${onlyTab.title.replace(/'/g, "''")}'` });
    if ((held.data.values ?? []).length === 0) {
      requests.push({ deleteSheet: { sheetId: onlyTab.sheetId } });
      removedDefaultTab = true;
    }
  }

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  return { created: plan.creating, existing: plan.existing, removedDefaultTab };
}
