import type { CardData } from "@/lib/aggregate/cardSpend";
import { demoCardData, isDemoAllowed } from "@/lib/demo/cardsDemo";
import { getCachedAccounts, getCachedCards, getCachedStatements } from "@/lib/sheets/cached";
import type { Account } from "@/lib/sheets/types";

/**
 * What the Cards pages show. With `?demo` in development it's the sample data,
 * which never reads from or writes to the Sheet; otherwise the cards, statements
 * and accounts are read from the Sheet in parallel.
 */
export async function loadCardData(
  params: Record<string, string | string[] | undefined>,
  today: string,
): Promise<{ demo: boolean; data: CardData; accounts: Account[] }> {
  const demo = isDemoAllowed() && params.demo !== undefined;
  if (demo) return { demo, data: demoCardData(today), accounts: [] };
  const [cards, statements, accounts] = await Promise.all([getCachedCards(), getCachedStatements(), getCachedAccounts()]);
  return { demo, data: { cards, statements }, accounts };
}
