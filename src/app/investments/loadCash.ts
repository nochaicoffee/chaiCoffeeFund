import "server-only";
import { cashByBroker } from "@/lib/aggregate/brokerCash";
import type { RupeeSnapshot } from "@/lib/aggregate/accountCurrency";
import { rupeeBalances, unpricedForPage } from "@/lib/prices/rupeeBalances";
import { getCachedAccountsTab, getCachedBalanceSnapshotsTab } from "@/lib/sheets/cached";
import { cashView, unpricedCash, type CashView } from "./cashView";

type CashRead = Pick<Parameters<typeof cashView>[0], "cash" | "usdInr" | "unpriced" | "reason">;

/**
 * Reads the cash at his brokers from the Accounts and balance tabs (ADR 0012: a dollar account is counted in rupees at today's rate right
 * here). Start it with the page's other reads: it needs nothing from them. The cash is a side card, so if it can't be read the page still
 * shows the holdings and this gives null (and says why in the server log).
 */
export async function readCash(today: string): Promise<CashRead | null> {
  try {
    const [accounts, snapshots] = await Promise.all([getCachedAccountsTab(), getCachedBalanceSnapshotsTab()]);
    const rupee = await rupeeBalances(accounts.records, snapshots.records);
    const cash = cashByBroker(rupee.accounts, rupee.snapshots as RupeeSnapshot[], today);
    const unpriced = unpricedCash(unpricedForPage(rupee)?.accounts ?? []);
    return { cash, usdInr: rupee.usdInr, unpriced, reason: unpriced.length > 0 ? rupee.rateProblem : null };
  } catch (error) {
    console.error("Investments: the cash at the brokers couldn't be read", error);
    return null;
  }
}

/** The card once the holdings' worth is known: null with no cash to show. */
export function cashFrom(read: CashRead | null, holdingsInr: number, today: string): CashView | null {
  return read ? cashView({ ...read, holdingsInr, today }) : null;
}
