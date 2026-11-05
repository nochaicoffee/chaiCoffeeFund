import "server-only";
import { inRupees, needsRate, type InRupees } from "@/lib/aggregate/accountCurrency";
import type { AccountsData } from "@/lib/aggregate/accountFlows";
import type { Account, BalanceSnapshot } from "@/lib/sheets/types";
import { getUsdInr } from "./usdInr";

/** What a loader gets back: the accounts and snapshots in rupees, and why any dollar account was left out. */
export interface RupeeBalances extends InRupees {
  /** Why today's rate wasn't had, when a dollar account exists and it wasn't. Null otherwise. */
  rateProblem: string | null;
}

/**
 * The loaders' one call (ADR 0012): count every dollar account in rupees at today's rate, right
 * after the Sheet is read. Nothing is fetched when no account is in dollars, so a Sheet with only
 * rupee accounts can't be affected by the rate service being down.
 */
export async function rupeeBalances(accounts: Account[], snapshots: BalanceSnapshot[]): Promise<RupeeBalances> {
  if (!needsRate(accounts)) return { ...inRupees(accounts, snapshots, null), rateProblem: null };
  const rate = await getUsdInr();
  return { ...inRupees(accounts, snapshots, rate.ok ? rate.rate : null), rateProblem: rate.ok ? null : rate.reason };
}

/** Lets the dollars of an unpriced account be shown: its latest balance as typed. */
export function unpricedForPage({ unpriced, rateProblem }: RupeeBalances): AccountsData["unpriced"] {
  if (unpriced.length === 0) return undefined;
  const accounts = unpriced.map(({ account, snapshots }) => {
    const latest = [...snapshots].sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1);
    return { id: account.id, name: account.name, dollars: latest ? latest.balance : null };
  });
  return { accounts, reason: rateProblem ?? "today's USD to INR rate isn't available" };
}
