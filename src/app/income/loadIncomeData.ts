import { isDemoAllowed } from "@/lib/demo/cardsDemo";
import { demoIncomeData } from "@/lib/demo/incomeDemo";
import { getCachedAccounts, getCachedIncomeEntriesTab, getCachedIncomeSourcesTab } from "@/lib/sheets/cached";
import type { SkippedRows } from "@/lib/sheets/rowReading";
import type { IncomeData } from "./views";

/**
 * What the Income page reads (#188). With `?demo` in development it's the sample data, which never reads from or
 * writes to the Sheet; otherwise the IncomeSources and IncomeEntries tabs, and the accounts for where income
 * lands, read in parallel. `skipped` is the rows that failed validation.
 */
export async function loadIncomeData(params: Record<string, string | string[] | undefined>, today: string): Promise<{ demo: boolean; data: IncomeData; skipped: SkippedRows[] }> {
  const demo = isDemoAllowed() && params.demo !== undefined;
  if (demo) return { demo, data: demoIncomeData(today), skipped: [] };
  const [sources, entries, accounts] = await Promise.all([getCachedIncomeSourcesTab(), getCachedIncomeEntriesTab(), getCachedAccounts()]);
  return {
    demo,
    data: { sources: sources.records, entries: entries.records, accounts: accounts.map((a) => ({ id: a.id, name: a.name })) },
    skipped: [sources.skipped, entries.skipped],
  };
}
