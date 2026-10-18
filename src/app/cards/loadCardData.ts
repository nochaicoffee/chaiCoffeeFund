import type { CardData } from "@/lib/aggregate/cardSpend";
import { demoCardData, isDemoAllowed } from "@/lib/demo/cardsDemo";
import { getCachedAccounts, getCachedCardsTab, getCachedStatementsTab } from "@/lib/sheets/cached";
import type { SkippedRows } from "@/lib/sheets/rowReading";
import type { Account } from "@/lib/sheets/types";

/**
 * What the Cards pages show. With `?demo` in development it's the sample data,
 * which never reads from or writes to the Sheet; otherwise the cards, statements
 * and accounts are read from the Sheet in parallel. `skipped` is the Cards and
 * CardStatements rows that failed validation, from the same reads, for the
 * pages to point out.
 */
export async function loadCardData(
  params: Record<string, string | string[] | undefined>,
  today: string,
): Promise<{ demo: boolean; data: CardData; accounts: Account[]; skipped: SkippedRows[] }> {
  const demo = isDemoAllowed() && params.demo !== undefined;
  if (demo) return { demo, data: demoCardData(today), accounts: [], skipped: [] };
  const [cards, statements, accounts] = await Promise.all([getCachedCardsTab(), getCachedStatementsTab(), getCachedAccounts()]);
  return { demo, data: { cards: cards.records, statements: statements.records }, accounts, skipped: [cards.skipped, statements.skipped] };
}
