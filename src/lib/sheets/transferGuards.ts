import "server-only";
import type { WriteGuards } from "@/lib/api/createCrudRoutes";
import { accountsRepository } from "./accounts";
import { transfersRepository } from "./transfers";
import type { Account, Transfer } from "./types";

/**
 * What a transfer needs that its own row can't check: both accounts are in Accounts, and one between currencies (a US broker's dollars
 * back to a rupee bank) says what arrived, so it's never counted as if dollars were rupees. Pure, so it's tested without the Sheet.
 */
export function transferProblem(accounts: Pick<Account, "id" | "name" | "currency">[], row: Pick<Transfer, "fromAccountId" | "toAccountId" | "receivedAmount">): string | null {
  const from = accounts.find((a) => a.id === row.fromAccountId);
  const to = accounts.find((a) => a.id === row.toAccountId);
  if (!from) return "The account it left isn't in Accounts";
  if (!to) return "The account it went to isn't in Accounts";
  if ((from.currency ?? "INR") !== (to.currency ?? "INR") && row.receivedAmount === undefined) return `${from.name} and ${to.name} are in different currencies: say what arrived in ${to.name} (receivedAmount)`;
  return null;
}

export const transferGuards: WriteGuards<Transfer> = {
  async beforeCreate(input) {
    return transferProblem(await accountsRepository.list(), input);
  },
  async beforeUpdate(id, patch) {
    const stored = (await transfersRepository.list()).find((t) => t.id === id);
    if (!stored) return null; // the repository answers a missing row with its own 404
    return transferProblem(await accountsRepository.list(), { ...stored, ...patch });
  },
};
